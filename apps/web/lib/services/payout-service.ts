import { createServiceClient } from "@/lib/supabase/server";
import { StripeService } from "./stripe-service";
import { ApiError } from "@/lib/api/errors";
import * as Sentry from "@sentry/nextjs";

/**
 * PayoutService - Handles seller payout scheduling
 *
 * Payouts are triggered when order status = "delivered"
 * Payout amount = item price - platform fee (calculated in HUD-37)
 */
export class PayoutService {
  private stripeService: StripeService;

  constructor() {
    this.stripeService = new StripeService();
  }

  /**
   * Schedule payout for seller when order is delivered
   *
   * @param transactionId Transaction ID
   * @param orderStatus Order status (must be "delivered")
   */
  async schedulePayout(transactionId: string, orderStatus: string): Promise<void> {
    if (orderStatus !== "delivered") {
      throw new ApiError(
        "BAD_REQUEST",
        "Payout can only be scheduled when order status is 'delivered'",
        400
      );
    }

    const supabase = await createServiceClient();

    // Get transaction details
    const { data: transaction, error: txError } = await supabase
      .from("transactions")
      .select("*")
      .eq("id", transactionId)
      .single();

    if (txError || !transaction) {
      throw new ApiError("NOT_FOUND", "Transaction not found", 404);
    }

    // Check if payout already exists
    if (transaction.stripe_transfer_id) {
      throw new ApiError(
        "CONFLICT",
        "Payout already processed for this transaction",
        409
      );
    }

    // Get seller's Stripe account
    const { data: sellerAccount, error: accountError } = await supabase
      .from("stripe_accounts")
      .select("stripe_account_id, status, payouts_enabled")
      .eq("user_id", transaction.seller_id)
      .single();

    if (accountError || !sellerAccount) {
      throw new ApiError(
        "BAD_REQUEST",
        "Seller does not have a connected Stripe account",
        400
      );
    }

    if (sellerAccount.status !== "active" || !sellerAccount.payouts_enabled) {
      throw new ApiError(
        "BAD_REQUEST",
        "Seller's Stripe account is not active or payouts not enabled",
        400
      );
    }

    // Calculate payout amount (item price - platform fee)
    // TODO: Platform fee calculation will be in HUD-37
    // For now, use full amount (fee calculation will be added later)
    const payoutAmount = transaction.amount; // in minor units

    try {
      // Create transfer (payout)
      // MVP: All payouts in EUR (hardcoded)
      // Future: Use transaction.currency
      const transfer = await this.stripeService.createTransfer({
        amount: payoutAmount,
        currency: "eur", // MVP: Hardcoded EUR, Future: transaction.currency || "eur"
        sellerStripeAccountId: sellerAccount.stripe_account_id,
        transferGroup: `txn_${transactionId}`,
        metadata: {
          transaction_id: transactionId,
          seller_id: transaction.seller_id,
          buyer_id: transaction.buyer_id,
        },
      });

      // Update transaction with transfer ID
      const { error: updateError } = await supabase
        .from("transactions")
        .update({
          stripe_transfer_id: transfer.id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", transactionId);

      if (updateError) {
        Sentry.captureException(updateError, {
          tags: { component: "payout_service", operation: "update_transaction" },
        });
        throw updateError;
      }

      // Notification will be created by webhook handler (transfer.created event)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      Sentry.captureException(error, {
        tags: { component: "payout_service", operation: "schedule_payout" },
        extra: { transactionIdPrefix: transactionId.slice(0, 8) },
      });
      throw error;
    }
  }
}
