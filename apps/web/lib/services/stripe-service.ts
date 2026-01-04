import Stripe from "stripe";
import { createServiceClient } from "@/lib/supabase/server";
import { ApiError } from "@/lib/api/errors";
import * as Sentry from "@sentry/nextjs";
import { FeeService } from "./fee-service";

// Lazy-initialize Stripe client
let stripeClient: Stripe | null = null;

function getStripe(): Stripe {
  if (!stripeClient) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error("STRIPE_SECRET_KEY is not configured");
    }
    stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2025-02-24.acacia",
    });
  }
  return stripeClient;
}

export interface CreatePaymentIntentParams {
  amount: number; // in minor units (cents for EUR) - total amount buyer pays
  currency: string; // MVP: "eur" (hardcoded), Future: from listing currency
  buyerId: string; // Clerk user ID
  sellerId: string; // Clerk user ID
  metadata?: Record<string, string>; // transaction_id, listing_id, etc.
  // Optional breakdown for fee calculation (if not provided, amount is assumed to be total)
  breakdown?: {
    itemCents: number; // Item price in cents
    shippingCents: number; // Shipping cost in cents
    platformFeeCents?: number; // Pre-calculated platform fee (optional, will be calculated if not provided)
  };
}

export interface CreateTransferParams {
  amount: number; // in minor units (cents for EUR)
  currency: string; // MVP: "eur" (hardcoded), Future: from transaction currency
  sellerStripeAccountId: string; // acct_xxx
  transferGroup?: string; // For grouping related transfers
  metadata?: Record<string, string>;
}

export interface CreateRefundParams {
  paymentIntentId: string; // pi_xxx
  amount?: number; // Optional: partial refund (in minor units)
  reason?: "duplicate" | "fraudulent" | "requested_by_customer";
  metadata?: Record<string, string>;
}

/**
 * StripeService - Handles all Stripe payment operations
 *
 * Methods:
 * - Payment Intent creation/retrieval
 * - Transfer creation (seller payouts)
 * - Refund handling
 * - Connect account management
 */
export class StripeService {
  private stripe: Stripe;

  constructor() {
    this.stripe = getStripe();
  }

  /**
   * Create Payment Intent for buyer checkout
   *
   * @param params Payment intent parameters
   * @returns Stripe Payment Intent
   */
  async createPaymentIntent(params: CreatePaymentIntentParams): Promise<Stripe.PaymentIntent> {
    try {
      // Get seller's Stripe account
      const supabase = await createServiceClient();
      const { data: sellerAccount, error } = await supabase
        .from("stripe_accounts")
        .select("stripe_account_id, status, charges_enabled")
        .eq("user_id", params.sellerId)
        .single();

      if (error || !sellerAccount) {
        throw new ApiError(
          "BAD_REQUEST",
          "Seller does not have a connected Stripe account",
          400
        );
      }

      if (sellerAccount.status !== "active" || !sellerAccount.charges_enabled) {
        throw new ApiError(
          "BAD_REQUEST",
          "Seller's Stripe account is not active",
          400
        );
      }

      // Calculate platform fee using FeeService
      // Platform fee (5%) includes Stripe processing fee - no extra "card fee" line item
      const feeService = new FeeService();
      let platformFeeCents: number;

      if (params.breakdown?.platformFeeCents !== undefined) {
        // Use pre-calculated platform fee if provided
        platformFeeCents = params.breakdown.platformFeeCents;
      } else if (params.breakdown) {
        // Calculate platform fee from breakdown
        const { platformPct } = await feeService.getActiveFeePercentages();
        platformFeeCents = feeService.calculatePlatformFeeCents(
          params.breakdown.itemCents,
          platformPct
        );
      } else {
        // Fallback: Calculate from total amount (assumes item + shipping, no fee yet)
        // WARNING: This fallback is inaccurate - callers should provide breakdown
        Sentry.addBreadcrumb({
          message: "Using fallback fee calculation - breakdown not provided",
          level: "warning",
          data: { amount: params.amount },
        });
        const { platformPct } = await feeService.getActiveFeePercentages();
        // Conservative: calculate fee on full amount to avoid undercharging platform
        const estimatedItemCents = params.amount;
        platformFeeCents = feeService.calculatePlatformFeeCents(
          estimatedItemCents,
          platformPct
        );
      }

      // Create Payment Intent with application fee (platform fee)
      // Platform fee (5%) is all-in and includes Stripe processing fee
      // Buyer pays: item + shipping + platform fee (total)
      // MVP: All payments in EUR (hardcoded)
      // Future: Use params.currency from listing
      
      // Check if seller's account has transfers capability (required for Connect)
      // In development, we may need to skip Connect if test account doesn't support transfers
      const isDevelopment = process.env.NODE_ENV === "development";
      let paymentIntent: Stripe.PaymentIntent;
      
      try {
        // Try with Connect (production flow)
        paymentIntent = await this.stripe.paymentIntents.create({
          amount: params.amount, // Total amount buyer pays (item + shipping + platform fee)
          currency: "eur", // MVP: Hardcoded EUR, Future: params.currency
          application_fee_amount: platformFeeCents, // Platform fee (5% all-in)
          transfer_data: {
            destination: sellerAccount.stripe_account_id,
          },
          metadata: {
            buyer_id: params.buyerId,
            seller_id: params.sellerId,
            ...params.metadata,
          },
          automatic_payment_methods: {
            enabled: true,
          },
        });
      } catch (connectError) {
        // If Connect fails due to missing capabilities, fall back in development
        if (
          isDevelopment &&
          connectError instanceof Stripe.errors.StripeError &&
          connectError.message?.includes("capabilities")
        ) {
          console.warn(
            "[STRIPE] Connect not available for seller, using direct payment (dev only):",
            connectError.message
          );
          Sentry.addBreadcrumb({
            message: "Using direct payment fallback (Connect not available)",
            level: "warning",
            data: { sellerIdPrefix: params.sellerId.slice(0, 8) },
          });
          
          // Create payment without Connect (development fallback)
          // WARNING: This means seller won't receive payment automatically!
          paymentIntent = await this.stripe.paymentIntents.create({
            amount: params.amount,
            currency: "eur",
            metadata: {
              buyer_id: params.buyerId,
              seller_id: params.sellerId,
              dev_fallback: "true", // Mark as dev fallback
              ...params.metadata,
            },
            automatic_payment_methods: {
              enabled: true,
            },
          });
        } else {
          // Re-throw in production or for other errors
          throw connectError;
        }
      }

      return paymentIntent;
    } catch (error) {
      // Handle Stripe-specific errors
      if (error instanceof Stripe.errors.StripeError) {
        if (error.type === "StripeRateLimitError") {
          throw new ApiError(
            "RATE_LIMIT",
            "Payment service temporarily unavailable. Please try again in a moment.",
            429
          );
        }
        if (error.type === "StripeInvalidRequestError") {
          console.error("[STRIPE] StripeInvalidRequestError:", {
            message: error.message,
            code: error.code,
            param: error.param,
            sellerIdPrefix: params.sellerId.slice(0, 8),
            amount: params.amount,
          });
          Sentry.captureException(error, {
            tags: { component: "stripe_service", operation: "create_payment_intent" },
            extra: { 
              sellerIdPrefix: params.sellerId.slice(0, 8),
              stripeErrorMessage: error.message,
              stripeErrorCode: error.code,
              stripeErrorParam: error.param,
            },
          });
          throw new ApiError(
            "BAD_REQUEST",
            `Invalid payment request: ${error.message}`,
            400
          );
        }
        if (error.type === "StripeCardError") {
          throw new ApiError(
            "PAYMENT_FAILED",
            "Your card was declined. Please try a different payment method.",
            402
          );
        }
      }
      // Re-throw ApiError as-is
      if (error instanceof ApiError) {
        throw error;
      }
      // Handle other errors
      const errorMessage = error instanceof Error ? error.message : String(error);
      Sentry.captureException(error, {
        tags: { component: "stripe_service", operation: "create_payment_intent" },
        extra: { errorMessage },
      });
      throw new ApiError(
        "EXTERNAL_SERVICE_ERROR",
        "Payment processing temporarily unavailable. Please try again later.",
        502
      );
    }
  }

  /**
   * Get Payment Intent by ID
   */
  async getPaymentIntent(paymentIntentId: string): Promise<Stripe.PaymentIntent> {
    try {
      return await this.stripe.paymentIntents.retrieve(paymentIntentId);
    } catch (error) {
      // Handle Stripe-specific errors with retry logic for transient failures
      if (error instanceof Stripe.errors.StripeError) {
        if (error.type === "StripeRateLimitError") {
          // Retry once after short delay
          await new Promise((resolve) => setTimeout(resolve, 1000));
          try {
            return await this.stripe.paymentIntents.retrieve(paymentIntentId);
          } catch {
            throw new ApiError(
              "RATE_LIMIT",
              "Payment service temporarily unavailable. Please try again in a moment.",
              429
            );
          }
        }
        if (error.type === "StripeInvalidRequestError") {
          throw new ApiError(
            "NOT_FOUND",
            "Payment intent not found",
            404
          );
        }
      }
      Sentry.captureException(error, {
        tags: { component: "stripe_service", operation: "get_payment_intent" },
        extra: { paymentIntentIdPrefix: paymentIntentId.slice(0, 8) },
      });
      throw new ApiError(
        "EXTERNAL_SERVICE_ERROR",
        "Failed to retrieve payment information",
        502
      );
    }
  }

  /**
   * Create Transfer (seller payout)
   *
   * Note: This is called when order status = "delivered"
   * Transfer amount = item price - platform fee (calculated in HUD-37)
   */
  async createTransfer(params: CreateTransferParams): Promise<Stripe.Transfer> {
    // Generate idempotency key once to prevent duplicate transfers on retry
    const idempotencyKey = params.transferGroup || `transfer_${Date.now()}`;

    try {
      // MVP: All transfers in EUR (hardcoded)
      // Future: Use params.currency from transaction
      const transfer = await this.stripe.transfers.create(
        {
          amount: params.amount,
          currency: "eur", // MVP: Hardcoded EUR, Future: params.currency
          destination: params.sellerStripeAccountId,
          transfer_group: params.transferGroup,
          metadata: params.metadata,
        },
        {
          idempotencyKey,
        }
      );

      return transfer;
    } catch (error) {
      // Handle Stripe-specific errors
      if (error instanceof Stripe.errors.StripeError) {
        if (error.type === "StripeRateLimitError") {
          // Retry once after short delay with same idempotency key
          await new Promise((resolve) => setTimeout(resolve, 1000));
          try {
            return await this.stripe.transfers.create(
              {
                amount: params.amount,
                currency: "eur", // MVP: Hardcoded EUR, Future: params.currency
                destination: params.sellerStripeAccountId,
                transfer_group: params.transferGroup,
                metadata: params.metadata,
              },
              {
                idempotencyKey, // Same key ensures no duplicate
              }
            );
          } catch {
            throw new ApiError(
              "RATE_LIMIT",
              "Payout service temporarily unavailable. Please try again in a moment.",
              429
            );
          }
        }
        if (error.type === "StripeInvalidRequestError") {
          Sentry.captureException(error, {
            tags: { component: "stripe_service", operation: "create_transfer" },
            extra: { accountIdPrefix: params.sellerStripeAccountId.slice(0, 8) },
          });
          throw new ApiError(
            "BAD_REQUEST",
            "Invalid payout request. Please contact support.",
            400
          );
        }
      }
      const errorMessage = error instanceof Error ? error.message : String(error);
      Sentry.captureException(error, {
        tags: { component: "stripe_service", operation: "create_transfer" },
        extra: { errorMessage },
      });
      throw new ApiError(
        "EXTERNAL_SERVICE_ERROR",
        "Payout processing temporarily unavailable. Please try again later.",
        502
      );
    }
  }

  /**
   * Create Refund (full or partial)
   */
  async createRefund(params: CreateRefundParams): Promise<Stripe.Refund> {
    try {
      const refundParams: Stripe.RefundCreateParams = {
        payment_intent: params.paymentIntentId,
        amount: params.amount, // undefined = full refund
        reason: params.reason,
        metadata: params.metadata,
      };

      const refund = await this.stripe.refunds.create(refundParams);

      return refund;
    } catch (error) {
      // Handle Stripe-specific errors
      if (error instanceof Stripe.errors.StripeError) {
        if (error.type === "StripeRateLimitError") {
          throw new ApiError(
            "RATE_LIMIT",
            "Refund service temporarily unavailable. Please try again in a moment.",
            429
          );
        }
        if (error.type === "StripeInvalidRequestError") {
          // Check if refund already exists
          if (error.message?.includes("already been refunded")) {
            throw new ApiError(
              "CONFLICT",
              "This payment has already been refunded",
              409
            );
          }
          Sentry.captureException(error, {
            tags: { component: "stripe_service", operation: "create_refund" },
            extra: { paymentIntentIdPrefix: params.paymentIntentId.slice(0, 8) },
          });
          throw new ApiError(
            "BAD_REQUEST",
            "Invalid refund request. Please check the payment details.",
            400
          );
        }
      }
      const errorMessage = error instanceof Error ? error.message : String(error);
      Sentry.captureException(error, {
        tags: { component: "stripe_service", operation: "create_refund" },
        extra: { errorMessage },
      });
      throw new ApiError(
        "EXTERNAL_SERVICE_ERROR",
        "Refund processing temporarily unavailable. Please try again later.",
        502
      );
    }
  }

  /**
   * Get Connect Account status
   */
  async getConnectAccount(accountId: string): Promise<Stripe.Account> {
    try {
      return await this.stripe.accounts.retrieve(accountId);
    } catch (error) {
      Sentry.captureException(error, {
        tags: { component: "stripe_service", operation: "get_connect_account" },
        extra: { accountIdPrefix: accountId.slice(0, 8) },
      });
      throw new ApiError(
        "EXTERNAL_SERVICE_ERROR",
        "Failed to retrieve Stripe account information",
        502
      );
    }
  }

  /**
   * Request transfers capability for a Connect account
   * This is required for destination charges to work
   */
  async requestTransfersCapability(accountId: string): Promise<{
    success: boolean;
    capabilities: Record<string, string>;
  }> {
    try {
      const account = await this.stripe.accounts.update(accountId, {
        capabilities: {
          transfers: { requested: true },
        },
      });

      return {
        success: true,
        capabilities: {
          transfers: account.capabilities?.transfers || "inactive",
          card_payments: account.capabilities?.card_payments || "inactive",
        },
      };
    } catch (error) {
      console.error("[STRIPE] Failed to request transfers capability:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      Sentry.captureException(error, {
        tags: { component: "stripe_service", operation: "request_transfers_capability" },
        extra: { accountIdPrefix: accountId.slice(0, 8), errorMessage },
      });
      throw new ApiError(
        "EXTERNAL_SERVICE_ERROR",
        `Failed to request transfers capability: ${errorMessage}`,
        502
      );
    }
  }

  /**
   * Check if a Connect account has transfers capability active
   */
  async hasTransfersCapability(accountId: string): Promise<boolean> {
    try {
      const account = await this.stripe.accounts.retrieve(accountId);
      return account.capabilities?.transfers === "active";
    } catch (error) {
      // Log for debugging but don't throw - callers expect boolean result
      console.warn("[STRIPE] Failed to check transfers capability:", {
        accountIdPrefix: accountId.slice(0, 8),
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }
}
