import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { handleApiError } from "@/lib/api/errors";
import { successResponse } from "@/lib/api/responses";
import { MedusaOrderService } from "@/lib/services/medusa-order-service";
import { createServiceClient } from "@/lib/supabase/server";
import { ApiError } from "@/lib/api/errors";
import { query } from "@/lib/db/postgres-connection";

/**
 * POST /api/v1/orders/[orderId]/cancel
 * Cancel order
 * 
 * Auth: Buyer (before shipped), Seller (before completed), or admin
 */
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ orderId: string }> }
) {
  try {
    const auth = await requireAuth(req);
    const { orderId } = await context.params;

    // Get transaction to check ownership
    const supabase = await createServiceClient();
    const { data: transaction, error: txError } = await supabase
      .from("transactions")
      .select("buyer_id, seller_id")
      .eq("medusa_order_id", orderId)
      .single();

    if (txError || !transaction) {
      throw new ApiError("NOT_FOUND", "Order not found", 404);
    }

    // Get current order status
    const orders = await query<{ status: string }>(
      `
      SELECT status
      FROM medusa.order
      WHERE id = $1
      `,
      [orderId]
    );

    if (!orders || orders.length === 0) {
      throw new ApiError("NOT_FOUND", "Order not found", 404);
    }

    const currentStatus = orders[0].status;
    const isBuyer = transaction.buyer_id === auth.userId;
    const isSeller = transaction.seller_id === auth.userId;
    const isAdmin = auth.userId === process.env.ADMIN_USER_ID; // TODO: Implement proper admin check

    // Check if already cancelled
    if (currentStatus === "cancelled") {
      throw new ApiError(
        "BAD_REQUEST",
        "Order is already cancelled",
        400
      );
    }

    // Authorization rules:
    // - Buyer can cancel before shipped
    // - Seller can cancel before completed
    // - Admin can always cancel
    if (!isAdmin) {
      if (isBuyer && currentStatus === "shipped") {
        throw new ApiError(
          "FORBIDDEN",
          "Buyer cannot cancel order after it has been shipped",
          403
        );
      }
      if (isSeller && currentStatus === "completed") {
        throw new ApiError(
          "FORBIDDEN",
          "Seller cannot cancel order after it has been completed",
          403
        );
      }
      if (!isBuyer && !isSeller) {
        throw new ApiError(
          "FORBIDDEN",
          "Only buyer or seller can cancel order",
          403
        );
      }
    }

    // Cancel order
    const medusaOrderService = new MedusaOrderService();
    await medusaOrderService.cancelOrder(orderId);

    return successResponse({
      message: "Order cancelled successfully",
      orderId,
    });
  } catch (error) {
    return handleApiError(error, req);
  }
}

