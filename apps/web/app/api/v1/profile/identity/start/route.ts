import { NextRequest } from "next/server";
import Stripe from "stripe";
import { requireAuth } from "@/lib/auth";
import { handleApiError, ApiError } from "@/lib/api/errors";
import { successResponse } from "@/lib/api/responses";
import { createServiceClient } from "@/lib/supabase/server";
import * as Sentry from "@sentry/nextjs";

// Lazy-initialize Stripe client to avoid build-time errors when env vars are not set
let stripeClient: Stripe | null = null;

function getStripe(): Stripe {
  if (!stripeClient) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error("STRIPE_SECRET_KEY is not configured");
    }
    stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2025-09-30.clover",
    });
  }
  return stripeClient;
}

/**
 * POST /api/v1/profile/identity/start
 * Start Stripe Identity verification flow
 *
 * Returns:
 * - status: 'already_verified' | 'already_pending' | 'session_created'
 * - clientSecret?: string (for frontend SDK)
 * - url?: string (redirect URL)
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await requireAuth(request);
    const supabase = await createServiceClient();

    // Check current verification status
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("stripe_identity_verification_status, stripe_identity_verification_id")
      .eq("id", userId)
      .single();

    if (profileError) {
      Sentry.captureException(profileError, {
        tags: { component: "identity_verification", operation: "fetch_profile" },
        extra: { userIdPrefix: userId.slice(0, 8) }, // No PII
      });
      throw new ApiError(
        "INTERNAL_SERVER_ERROR",
        "Failed to fetch profile",
        500
      );
    }

    // Already verified
    if (profile?.stripe_identity_verification_status === "verified") {
      return successResponse({ status: "already_verified" });
    }

    // Already pending verification
    if (profile?.stripe_identity_verification_status === "pending") {
      return successResponse({ status: "already_pending" });
    }

    // Check Stripe configuration
    let stripe: Stripe;
    try {
      stripe = getStripe();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes("STRIPE_SECRET_KEY is not configured")) {
        throw new ApiError(
          "SERVICE_UNAVAILABLE",
          "Identity verification is not configured. Please contact support.",
          503,
          {
            reason: "stripe_not_configured",
            configRequired: ["STRIPE_SECRET_KEY"],
          }
        );
      }
      throw error; // Re-throw other errors
    }

    // Create Stripe Identity VerificationSession
    let verificationSession: Stripe.Identity.VerificationSession;
    try {
      verificationSession = await stripe.identity.verificationSessions.create({
      type: "document",
      metadata: {
        user_id: userId,
        source: "huddle_marketplace",
      },
      options: {
        document: {
          require_matching_selfie: true,
        },
      },
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/seller/verify-identity?session_complete=true`,
      });
    } catch (stripeError) {
      // Handle Stripe API errors
      const errorMessage = stripeError instanceof Error ? stripeError.message : String(stripeError);
      Sentry.captureException(stripeError, {
        tags: { component: "identity_verification", operation: "create_stripe_session" },
        extra: {
          userIdPrefix: userId.slice(0, 8),
          errorMessage,
        }, // No PII
      });

      // Return user-friendly error
      throw new ApiError(
        "EXTERNAL_SERVICE_ERROR",
        "Failed to start verification. Please try again later.",
        502,
        {
          reason: "stripe_api_error",
          retryable: true,
        }
      );
    }

    // Update profile with session ID and pending status
    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        stripe_identity_verification_id: verificationSession.id,
        stripe_identity_verification_status: "pending",
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);

    if (updateError) {
      Sentry.captureException(updateError, {
        tags: { component: "identity_verification", operation: "update_profile" },
        extra: {
          userIdPrefix: userId.slice(0, 8),
          sessionIdPrefix: verificationSession.id.slice(0, 8),
        }, // No PII
      });
      throw new ApiError(
        "INTERNAL_SERVER_ERROR",
        "Failed to update profile",
        500
      );
    }

    // Log successful session creation (no PII)
    if (process.env.NODE_ENV === "development") {
      console.log("[IDENTITY] Verification session created", {
        userIdPrefix: userId.slice(0, 8),
        sessionIdPrefix: verificationSession.id.slice(0, 8),
      });
    }

    return successResponse({
      status: "session_created",
      clientSecret: verificationSession.client_secret,
      url: verificationSession.url,
    });
  } catch (error) {
    return handleApiError(error, {
      url: request.url,
      method: request.method,
    });
  }
}
