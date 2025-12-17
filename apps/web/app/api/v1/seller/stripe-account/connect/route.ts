import { NextRequest } from "next/server";
import Stripe from "stripe";
import { requireAuth } from "@/lib/auth";
import { handleApiError, ApiError } from "@/lib/api/errors";
import { successResponse } from "@/lib/api/responses";
import { createServiceClient } from "@/lib/supabase/server";
import { rateLimitMiddleware } from "@/lib/api/rate-limit";
import * as Sentry from "@sentry/nextjs";

// Lazy-initialize Stripe client to avoid build-time errors when env vars are not set
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

/**
 * POST /api/v1/seller/stripe-account/connect
 * Initiate Stripe Connect OAuth flow for seller onboarding
 *
 * Flow:
 * 1. Check if user already has an active Stripe account
 * 2. Create Stripe Express account (or use existing)
 * 3. Create account link for onboarding
 * 4. Return onboarding URL
 *
 * Returns:
 * - url: OAuth authorization URL for seller onboarding
 *
 * MVP: All accounts created in EUR country (DE) for simplicity
 * Future: Can use seller's profile country for multi-currency support
 */
const handler = async (req: NextRequest) => {
  try {
    const { userId } = await requireAuth(req);
    const supabase = await createServiceClient();

    // Check if user already has a Stripe account
    const { data: existingAccount } = await supabase
      .from("stripe_accounts")
      .select("id, stripe_account_id, status")
      .eq("user_id", userId)
      .single();

    if (existingAccount && existingAccount.status === "active") {
      throw new ApiError(
        "CONFLICT",
        "You already have an active Stripe account connected",
        409
      );
    }

    // Get Stripe client
    const stripe = getStripe();

    // Determine account ID - create account FIRST if it doesn't exist
    let accountId: string;

    if (!existingAccount) {
      // Create new Express account FIRST
      // Don't specify country - let user choose their EU country during onboarding
      // This allows all EU countries to be selected (EUR-compatible)
      let account: Stripe.Account;
      try {
        account = await stripe.accounts.create({
          type: "express",
          // No country specified - user can choose any EU country during onboarding
          business_type: "individual", // Explicitly set to individual (not company)
          capabilities: {
            card_payments: { requested: true },
            transfers: { requested: true },
          },
          metadata: {
            user_id: userId,
            source: "huddle_marketplace",
          },
        });
      } catch (stripeError) {
        // Handle Stripe-specific errors
        if (stripeError instanceof Stripe.errors.StripeError) {
          if (stripeError.type === "StripeRateLimitError") {
            throw new ApiError(
              "RATE_LIMIT",
              "Too many requests. Please try again in a moment.",
              429
            );
          }
          if (stripeError.type === "StripeInvalidRequestError") {
            Sentry.captureException(stripeError, {
              tags: { component: "stripe_connect", operation: "create_account" },
              extra: { userIdPrefix: userId.slice(0, 8) },
            });
            throw new ApiError(
              "BAD_REQUEST",
              "Invalid account creation request. Please contact support.",
              400
            );
          }
        }
        // Re-throw other Stripe errors
        const errorMessage = stripeError instanceof Error ? stripeError.message : String(stripeError);
        Sentry.captureException(stripeError, {
          tags: { component: "stripe_connect", operation: "create_account" },
          extra: { userIdPrefix: userId.slice(0, 8), errorMessage },
        });
        throw new ApiError(
          "EXTERNAL_SERVICE_ERROR",
          "Failed to create Stripe account. Please try again later.",
          502
        );
      }

      accountId = account.id;

      // Store account in database
      const { error: insertError } = await supabase
        .from("stripe_accounts")
        .insert({
          user_id: userId,
          stripe_account_id: account.id,
          status: "pending",
          payouts_enabled: account.payouts_enabled || false,
          charges_enabled: account.charges_enabled || false,
        });

      if (insertError) {
        Sentry.captureException(insertError, {
          tags: { component: "stripe_connect", operation: "create_account" },
          extra: { userIdPrefix: userId.slice(0, 8) },
        });
        throw new ApiError(
          "INTERNAL_SERVER_ERROR",
          "Failed to store Stripe account",
          500
        );
      }
    } else {
      // Use existing account
      accountId = existingAccount.stripe_account_id;
    }

    // NOW create account link (account must exist first)
    let accountLink: Stripe.AccountLink;
    try {
      accountLink = await stripe.accountLinks.create({
        account: accountId,
        refresh_url: `${process.env.NEXT_PUBLIC_APP_URL}/seller/connect-stripe?refresh=true`,
        return_url: `${process.env.NEXT_PUBLIC_APP_URL}/seller/connect-stripe?success=true`,
        type: "account_onboarding",
      });
    } catch (stripeError) {
      // Handle Stripe-specific errors for account links
      if (stripeError instanceof Stripe.errors.StripeError) {
        if (stripeError.type === "StripeRateLimitError") {
          throw new ApiError(
            "RATE_LIMIT",
            "Too many requests. Please try again in a moment.",
            429
          );
        }
      }
      Sentry.captureException(stripeError, {
        tags: { component: "stripe_connect", operation: "create_account_link" },
        extra: {
          userIdPrefix: userId.slice(0, 8),
          accountIdPrefix: accountId.slice(0, 8),
          errorMessage: stripeError instanceof Error ? stripeError.message : String(stripeError),
        },
      });
      throw new ApiError(
        "EXTERNAL_SERVICE_ERROR",
        "Failed to create account link. Please try again later.",
        502
      );
    }

    return successResponse({
      url: accountLink.url,
    });
  } catch (error) {
    return handleApiError(error, req);
  }
};

export const POST = rateLimitMiddleware(handler);
