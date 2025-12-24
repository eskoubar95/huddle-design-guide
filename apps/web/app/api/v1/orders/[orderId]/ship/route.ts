import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { handleApiError } from "@/lib/api/errors";
import { successResponse } from "@/lib/api/responses";
import { MedusaOrderService } from "@/lib/services/medusa-order-service";
import { createServiceClient } from "@/lib/supabase/server";
import { ApiError } from "@/lib/api/errors";
import { z } from "zod";
import { query } from "@/lib/db/postgres-connection";

const shipOrderSchema = z.object({
  trackingNumber: z.string().min(1, "Tracking number is required"),
  shippingProvider: z.string().min(1, "Shipping provider is required"),
});

/**
 * POST /api/v1/orders/[orderId]/ship
 * Mark order as shipped with tracking information
 * 
 * Body: { trackingNumber: string, shippingProvider: string }
 * Auth: Seller (must own listing) only
 */
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ orderId: string }> }
) {
  try {
    const auth = await requireAuth(req);
    const { orderId } = await context.params;
    const body = await req.json();

    // Validate input
    const validated = shipOrderSchema.parse(body);
    const { trackingNumber, shippingProvider } = validated;

    // Get transaction to check ownership
    const supabase = await createServiceClient();
    const { data: transaction, error: txError } = await supabase
      .from("transactions")
      .select("seller_id")
      .eq("medusa_order_id", orderId)
      .single();

    if (txError || !transaction) {
      throw new ApiError("NOT_FOUND", "Order not found", 404);
    }

    // Authorization: Seller only
    const isSeller = transaction.seller_id === auth.userId;
    if (!isSeller) {
      throw new ApiError(
        "FORBIDDEN",
        "Only seller can ship order",
        403
      );
    }

    // Verify order is in a shippable state (paid)
    const orders = await query<{ status: string }>(
      `SELECT status FROM medusa.order WHERE id = $1`,
      [orderId]
    );

    if (!orders || orders.length === 0) {
      throw new ApiError("NOT_FOUND", "Order not found in Medusa", 404);
    }

    const currentStatus = orders[0].status;
    if (currentStatus !== "paid") {
      throw new ApiError(
        "BAD_REQUEST",
        `Cannot ship order with status '${currentStatus}'. Order must be paid.`,
        400
      );
    }

    // Update order status to shipped and add tracking
    const medusaOrderService = new MedusaOrderService();
    
    // Update tracking number (also updates shipping_labels if exists)
    await medusaOrderService.updateTrackingNumber(
      orderId,
      trackingNumber,
      shippingProvider
    );

    // Update order status to shipped
    await medusaOrderService.updateOrderStatus(orderId, "shipped");

    return successResponse({
      message: "Order marked as shipped",
      orderId,
      trackingNumber,
      shippingProvider,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.issues[0];
      return handleApiError(
        new ApiError("BAD_REQUEST", firstError?.message || "Validation error", 400),
        req
      );
    }
    return handleApiError(error, req);
  }
}

