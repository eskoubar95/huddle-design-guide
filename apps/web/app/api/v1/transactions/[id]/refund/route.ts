import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { handleApiError, ApiError } from "@/lib/api/errors";
import { successResponse } from "@/lib/api/responses";
import { createServiceClient } from "@/lib/supabase/server";
import { rateLimitMiddleware } from "@/lib/api/rate-limit";
import { StripeService } from "@/lib/services/stripe-service";
import { z } from "zod";

const refundSchema = z.object({
  amount: z.number().positive().optional(), // Optional: partial refund (in minor units)
  reason: z.enum(["duplicate", "fraudulent", "requested_by_customer"]).optional(),
});

/**
 * POST /api/v1/transactions/[id]/refund
 * Initiate refund for a transaction
 *
 * Refund policy:
 * - Buyer can request refund within 14 days after delivery
 * - Seller can accept/reject (via messaging)
 * - Full refund: entire amount
 * - Partial refund: only if agreed between buyer/seller
 */
const handler = async (
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) => {
  try {
    const { userId } = await requireAuth(req);
    const { id: transactionId } = await context.params;
    const supabase = await createServiceClient();

    // Get transaction
    const { data: transaction, error: txError } = await supabase
      .from("transactions")
      .select("*")
      .eq("id", transactionId)
      .single();

    if (txError || !transaction) {
      throw new ApiError("NOT_FOUND", "Transaction not found", 404);
    }

    // Verify user is buyer
    if (transaction.buyer_id !== userId) {
      throw new ApiError(
        "FORBIDDEN",
        "Only the buyer can request a refund for this transaction",
        403
      );
    }

    // Check if already refunded
    if (transaction.status === "refunded" || transaction.stripe_refund_id) {
      throw new ApiError(
        "CONFLICT",
        "This transaction has already been refunded",
        409
      );
    }

    // Check refund policy: 14 days after delivery
    // Note: This assumes completed_at is when delivery happened
    // In HUD-39, we'll track actual delivery date
    if (transaction.completed_at) {
      const deliveryDate = new Date(transaction.completed_at);
      const daysSinceDelivery = (Date.now() - deliveryDate.getTime()) / (1000 * 60 * 60 * 24);

      if (daysSinceDelivery > 14) {
        throw new ApiError(
          "BAD_REQUEST",
          "Refund request must be made within 14 days of delivery",
          400
        );
      }
    }

    // Parse request body
    const body = await req.json();
    const input = refundSchema.parse(body);

    // Get payment intent ID
    if (!transaction.stripe_payment_intent_id) {
      throw new ApiError(
        "BAD_REQUEST",
        "Transaction does not have a payment intent",
        400
      );
    }

    // Create refund via StripeService
    const stripeService = new StripeService();
    const refund = await stripeService.createRefund({
      paymentIntentId: transaction.stripe_payment_intent_id,
      amount: input.amount, // undefined = full refund
      reason: input.reason || "requested_by_customer",
      metadata: {
        transaction_id: transactionId,
        buyer_id: transaction.buyer_id,
        seller_id: transaction.seller_id,
        refund_type: input.amount ? "partial" : "full",
      },
    });

    // Update transaction
    const { error: updateError } = await supabase
      .from("transactions")
      .update({
        status: "refunded",
        stripe_refund_id: refund.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", transactionId);

    if (updateError) {
      throw new ApiError(
        "INTERNAL_SERVER_ERROR",
        "Failed to update transaction",
        500
      );
    }

    // Create notification for seller
    await supabase.from("notifications").insert({
      user_id: transaction.seller_id,
      type: "refund_requested",
      title: "Refund Requested",
      message: `A refund of ${input.amount ? input.amount / 100 : transaction.amount / 100} ${transaction.currency?.toUpperCase() || "EUR"} has been processed for transaction ${transactionId.slice(0, 8)}...`,
      read: false,
    });

    return successResponse({
      refund_id: refund.id,
      amount: refund.amount,
      status: refund.status,
    });
  } catch (error) {
    return handleApiError(error, req);
  }
};

export const POST = rateLimitMiddleware(handler);
