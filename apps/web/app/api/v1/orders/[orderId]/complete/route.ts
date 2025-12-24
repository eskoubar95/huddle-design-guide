import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { handleApiError } from "@/lib/api/errors";
import { successResponse } from "@/lib/api/responses";
import { MedusaOrderService } from "@/lib/services/medusa-order-service";
import { createServiceClient } from "@/lib/supabase/server";
import { ApiError } from "@/lib/api/errors";
import { query } from "@/lib/db/postgres-connection";

/**
 * POST /api/v1/orders/[orderId]/complete
 * Mark order as completed
 * 
 * Auth: Buyer (must match transaction.buyer_id) only
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
      .select("buyer_id")
      .eq("medusa_order_id", orderId)
      .single();

    if (txError || !transaction) {
      throw new ApiError("NOT_FOUND", "Order not found", 404);
    }

    // Authorization: Buyer only
    const isBuyer = transaction.buyer_id === auth.userId;
    if (!isBuyer) {
      throw new ApiError(
        "FORBIDDEN",
        "Only buyer can complete order",
        403
      );
    }

    // Verify order is in a completable state (shipped or delivered)
    const orders = await query<{ status: string }>(
      `SELECT status FROM medusa.order WHERE id = $1`,
      [orderId]
    );

    if (!orders || orders.length === 0) {
      throw new ApiError("NOT_FOUND", "Order not found in Medusa", 404);
    }

    const currentStatus = orders[0].status;
    if (currentStatus !== "shipped" && currentStatus !== "delivered") {
      throw new ApiError(
        "BAD_REQUEST",
        `Cannot complete order with status '${currentStatus}'. Order must be shipped or delivered.`,
        400
      );
    }

    // Update order status to completed
    const medusaOrderService = new MedusaOrderService();
    await medusaOrderService.updateOrderStatus(orderId, "completed");

    return successResponse({
      message: "Order marked as completed",
      orderId,
    });
  } catch (error) {
    return handleApiError(error, req);
  }
}

