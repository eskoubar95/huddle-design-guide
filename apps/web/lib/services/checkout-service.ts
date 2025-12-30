import { createServiceClient } from "@/lib/supabase/server";
import { ApiError } from "@/lib/api/errors";
import * as Sentry from "@sentry/nextjs";
import { FeeService } from "./fee-service";
import { StripeService, CreatePaymentIntentParams } from "./stripe-service";
import { MedusaOrderService, ShippingAddress } from "./medusa-order-service";
import { ShippingService } from "./shipping-service";

/**
 * CheckoutService - Orchestrates the checkout process for sale listings
 *
 * Responsibilities:
 * - Validate listing, buyer/seller, and shipping
 * - Calculate fees and totals
 * - Create transaction record
 * - Integrate with Medusa for order creation
 * - Integrate with Stripe for payment intent
 * - Concurrency guards (double purchase prevention)
 */

// Feature flag for checkout kill switch
const CHECKOUT_SALE_ENABLED = process.env.CHECKOUT_SALE_ENABLED !== "false";

export type ShippingMethod = "home_delivery" | "pickup_point";

export interface ServicePointInfo {
  id: string;
  name: string;
  address: string;
  city: string;
  postal_code: string;
  country: string;
  provider: string;
}

export interface CheckoutInitParams {
  listingId: string;
  buyerId: string;
  shippingMethod: ShippingMethod;
  shippingAddress: {
    street: string;
    city: string;
    postal_code: string;
    country: string;
    state?: string;
    full_name?: string;
    phone?: string;
  };
  servicePoint?: ServicePointInfo;
  preferredTimeWindow?: string;
  shippingQuoteId?: string; // Optional: cached quote ID for freshness check
  shippingCostCents: number; // Pre-calculated shipping cost from frontend
}

export interface CheckoutInitResult {
  transactionId: string;
  orderId: string;
  clientSecret: string;
  publishableKey: string;
  breakdown: {
    itemCents: number;
    shippingCents: number;
    platformFeeCents: number;
    totalCents: number;
    currency: string;
  };
  shippingMethod: ShippingMethod;
  servicePoint?: ServicePointInfo;
}

export class CheckoutService {
  private feeService: FeeService;
  private stripeService: StripeService;
  private medusaOrderService: MedusaOrderService;
  private shippingService: ShippingService;

  constructor() {
    this.feeService = new FeeService();
    this.stripeService = new StripeService();
    this.medusaOrderService = new MedusaOrderService();
    this.shippingService = new ShippingService();
  }

  /**
   * Initialize checkout for a sale listing
   * Creates transaction, Medusa order, and Stripe Payment Intent
   */
  async initCheckout(params: CheckoutInitParams): Promise<CheckoutInitResult> {
    // Check feature flag
    if (!CHECKOUT_SALE_ENABLED) {
      throw new ApiError(
        "SERVICE_UNAVAILABLE",
        "Checkout is temporarily unavailable. Please try again later.",
        503
      );
    }

    const {
      listingId,
      buyerId,
      shippingMethod,
      shippingAddress,
      servicePoint,
      preferredTimeWindow,
      shippingCostCents,
    } = params;

    const supabase = await createServiceClient();

    // 1. Validate listing exists and is active
    const { data: listing, error: listingError } = await supabase
      .from("sale_listings")
      .select("id, price, seller_id, status, jersey_id, currency")
      .eq("id", listingId)
      .single();

    if (listingError || !listing) {
      throw new ApiError(
        "NOT_FOUND",
        "Listing not found or no longer available.",
        404
      );
    }

    if (listing.status !== "active") {
      throw new ApiError(
        "GONE",
        "This listing is no longer available for purchase.",
        410
      );
    }

    // 2. Validate buyer != seller
    if (listing.seller_id === buyerId) {
      throw new ApiError(
        "BAD_REQUEST",
        "You cannot purchase your own listing.",
        400
      );
    }

    // 3. Check for existing pending/completed transaction (double purchase prevention)
    const { data: existingTransaction } = await supabase
      .from("transactions")
      .select("id, status")
      .eq("listing_id", listingId)
      .in("status", ["pending", "completed", "processing"])
      .single();

    if (existingTransaction) {
      throw new ApiError(
        "CONFLICT",
        "This item is already being purchased or has been sold.",
        409
      );
    }

    // 4. Verify seller has active Stripe account
    const { data: sellerStripe } = await supabase
      .from("stripe_accounts")
      .select("stripe_account_id, status, charges_enabled")
      .eq("user_id", listing.seller_id)
      .single();

    if (!sellerStripe || sellerStripe.status !== "active" || !sellerStripe.charges_enabled) {
      throw new ApiError(
        "BAD_REQUEST",
        "Seller's payment account is not ready to receive payments.",
        400
      );
    }

    // 5. Calculate fees
    const itemCents = Math.round((listing.price || 0) * 100);
    const { platformPct } = await this.feeService.getActiveFeePercentages();
    const platformFeeCents = this.feeService.calculatePlatformFeeCents(itemCents, platformPct);
    const totalCents = this.feeService.calculateBuyerTotalCents({
      itemCents,
      shippingCents: shippingCostCents,
      platformFeeCents,
    });

    // 6. Create transaction record (pending)
    const { data: transaction, error: transactionError } = await supabase
      .from("transactions")
      .insert({
        listing_id: listingId,
        listing_type: "sale",
        buyer_id: buyerId,
        seller_id: listing.seller_id,
        amount: listing.price, // Legacy field - item price in major units
        item_amount: itemCents,
        shipping_amount: shippingCostCents,
        platform_fee_amount: platformFeeCents,
        total_amount: totalCents,
        currency: "EUR",
        status: "pending",
      })
      .select("id")
      .single();

    if (transactionError || !transaction) {
      Sentry.captureException(transactionError, {
        tags: { component: "checkout_service", operation: "create_transaction" },
        extra: { listingId, buyerId },
      });
      throw new ApiError(
        "INTERNAL_ERROR",
        "Failed to create transaction. Please try again.",
        500
      );
    }

    try {
      // 7. Create Medusa order
      const medusaShippingAddress: ShippingAddress = {
        street: shippingAddress.street,
        city: shippingAddress.city,
        postal_code: shippingAddress.postal_code,
        country: shippingAddress.country,
        state: shippingAddress.state,
        phone: shippingAddress.phone,
        first_name: shippingAddress.full_name?.split(" ")[0] || "",
        last_name: shippingAddress.full_name?.split(" ").slice(1).join(" ") || "",
      };

      // Build shipping method name for Medusa
      let shippingMethodName = "Eurosender Standard";
      if (shippingMethod === "pickup_point" && servicePoint) {
        shippingMethodName = `Pickup at ${servicePoint.name}`;
      }

      const medusaOrder = await this.medusaOrderService.createOrderFromSale(
        listingId,
        buyerId,
        medusaShippingAddress,
        shippingMethodName,
        shippingCostCents
      );

      // Update transaction with Medusa order ID
      await supabase
        .from("transactions")
        .update({ medusa_order_id: medusaOrder.id })
        .eq("id", transaction.id);

      // 8. Create Stripe Payment Intent
      const paymentIntentParams: CreatePaymentIntentParams = {
        amount: totalCents,
        currency: "eur",
        buyerId,
        sellerId: listing.seller_id,
        metadata: {
          transaction_id: transaction.id,
          listing_id: listingId,
          listing_type: "sale",
          order_id: medusaOrder.id,
          shipping_method: shippingMethod,
          ...(servicePoint && { service_point_id: servicePoint.id }),
          ...(preferredTimeWindow && { preferred_time_window: preferredTimeWindow }),
        },
        breakdown: {
          itemCents,
          shippingCents: shippingCostCents,
          platformFeeCents,
        },
      };

      const paymentIntent = await this.stripeService.createPaymentIntent(paymentIntentParams);

      // Update transaction with Stripe Payment Intent ID
      await supabase
        .from("transactions")
        .update({ stripe_payment_intent_id: paymentIntent.id })
        .eq("id", transaction.id);

      // Log successful checkout initiation
      Sentry.addBreadcrumb({
        category: "checkout",
        message: "Checkout initiated successfully",
        level: "info",
        data: {
          transactionIdPrefix: transaction.id.slice(0, 8),
          listingIdPrefix: listingId.slice(0, 8),
          shippingMethod,
          totalCents,
        },
      });

      return {
        transactionId: transaction.id,
        orderId: medusaOrder.id,
        clientSecret: paymentIntent.client_secret!,
        publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "",
        breakdown: {
          itemCents,
          shippingCents: shippingCostCents,
          platformFeeCents,
          totalCents,
          currency: "EUR",
        },
        shippingMethod,
        servicePoint,
      };
    } catch (error) {
      // Rollback: Mark transaction as failed
      await supabase
        .from("transactions")
        .update({ status: "failed" })
        .eq("id", transaction.id);

      // Re-throw the error
      throw error;
    }
  }

  /**
   * Validate shipping quote freshness
   * Returns true if quote is fresh (< 5 minutes old)
   */
  async validateQuoteFreshness(quoteTimestamp?: string): Promise<boolean> {
    if (!quoteTimestamp) return true; // No timestamp = skip validation

    const quoteTime = new Date(quoteTimestamp).getTime();
    const now = Date.now();
    const fiveMinutes = 5 * 60 * 1000;

    return now - quoteTime < fiveMinutes;
  }

  /**
   * Get listing details for checkout page
   */
  async getListingForCheckout(listingId: string, buyerId: string) {
    // Check feature flag
    if (!CHECKOUT_SALE_ENABLED) {
      throw new ApiError(
        "SERVICE_UNAVAILABLE",
        "Checkout is temporarily unavailable. Please try again later.",
        503
      );
    }

    const supabase = await createServiceClient();

    // Get listing with jersey details
    const { data: listing, error } = await supabase
      .from("sale_listings")
      .select(`
        id,
        price,
        seller_id,
        status,
        jersey_id,
        currency,
        jerseys (
          id,
          club,
          season,
          jersey_type,
          player_name,
          condition_rating,
          owner_id
        )
      `)
      .eq("id", listingId)
      .single();

    if (error || !listing) {
      throw new ApiError("NOT_FOUND", "Listing not found.", 404);
    }

    if (listing.status !== "active") {
      throw new ApiError("GONE", "This listing is no longer available.", 410);
    }

    if (listing.seller_id === buyerId) {
      throw new ApiError("BAD_REQUEST", "You cannot purchase your own listing.", 400);
    }

    return listing;
  }
}

