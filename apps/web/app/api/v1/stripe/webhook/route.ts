import { NextRequest } from "next/server";
import Stripe from "stripe";
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
      apiVersion: "2025-02-24.acacia",
    });
  }
  return stripeClient;
}

/**
 * POST /api/v1/stripe/webhook
 * Handle Stripe webhook events
 *
 * Events handled:
 * - identity.verification_session.verified
 * - identity.verification_session.requires_input
 * - identity.verification_session.canceled
 *
 * Security:
 * - Verifies webhook signature
 * - No PII in logs
 */
export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    Sentry.captureMessage("Stripe webhook missing signature", {
      level: "warning",
      tags: { component: "stripe_webhook" },
    });
    return Response.json({ error: "Missing signature" }, { status: 400 });
  }

  // Verify webhook signature
  const stripe = getStripe();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    Sentry.captureException(err, {
      tags: { component: "stripe_webhook", type: "signature_verification" },
      extra: { errorMessage }, // No PII
    });

    if (process.env.NODE_ENV === "development") {
      console.error("[STRIPE] Webhook signature verification failed:", errorMessage);
    }

    return Response.json({ error: "Invalid signature" }, { status: 400 });
  }

  const supabase = await createServiceClient();

  try {
    // Handle Identity verification events
    if (event.type.startsWith("identity.verification_session.")) {
      const session = event.data.object as Stripe.Identity.VerificationSession;
      const userId = session.metadata?.user_id;

      if (!userId) {
        Sentry.captureMessage("Stripe webhook missing user_id in metadata", {
          level: "warning",
          tags: { component: "stripe_webhook", event_type: event.type },
          extra: { sessionIdPrefix: session.id.slice(0, 8) }, // No PII
        });

        if (process.env.NODE_ENV === "development") {
          console.error(
            `[STRIPE] No user_id in metadata for session ${session.id.slice(0, 8)}...`
          );
        }

        return Response.json({ received: true });
      }

      let newStatus: string | null = null;
      let notificationTitle = "";
      let notificationMessage = "";

      switch (event.type) {
        case "identity.verification_session.verified":
          newStatus = "verified";
          notificationTitle = "Identity Verified";
          notificationMessage =
            "Your identity has been verified. You can now create listings and auctions.";
          break;

        case "identity.verification_session.requires_input":
          newStatus = "rejected";
          notificationTitle = "Identity Verification Issue";
          notificationMessage =
            "There was an issue with your identity verification. Please try again or request a review.";
          break;

        case "identity.verification_session.canceled":
          newStatus = "rejected";
          notificationTitle = "Identity Verification Canceled";
          notificationMessage =
            "Your identity verification was canceled. You can start a new verification or request a review if needed.";
          break;
      }

      if (newStatus) {
        // Update profile status
        const { error: updateError } = await supabase
          .from("profiles")
          .update({
            stripe_identity_verification_status: newStatus,
            updated_at: new Date().toISOString(),
          })
          .eq("id", userId);

        if (updateError) {
          Sentry.captureException(updateError, {
            tags: {
              component: "stripe_webhook",
              operation: "update_profile",
              event_type: event.type,
            },
            extra: {
              userIdPrefix: userId.slice(0, 8),
              sessionIdPrefix: session.id.slice(0, 8),
            }, // No PII
          });
          throw updateError;
        }

        // Create notification for user
        const { error: notifError } = await supabase
          .from("notifications")
          .insert({
            user_id: userId,
            type: "identity_verification",
            title: notificationTitle,
            message: notificationMessage,
            read: false,
          });

        if (notifError) {
          // Notification failure is not critical - log but don't throw
          Sentry.captureException(notifError, {
            level: "warning",
            tags: {
              component: "stripe_webhook",
              operation: "create_notification",
              event_type: event.type,
            },
            extra: {
              userIdPrefix: userId.slice(0, 8),
            }, // No PII
          });

          if (process.env.NODE_ENV === "development") {
            console.error("[STRIPE] Failed to create notification:", notifError);
          }
        }

        // Log successful webhook processing (no PII)
        if (process.env.NODE_ENV === "development") {
          console.log(
            `[STRIPE] Identity verification ${event.type} for session ${session.id.slice(0, 8)}... → status: ${newStatus}`
          );
        }
      }
    }

    return Response.json({ received: true });
  } catch (error) {
    Sentry.captureException(error, {
      tags: { component: "stripe_webhook", event_type: event.type },
      extra: {
        eventIdPrefix: event.id.slice(0, 8),
      }, // No PII
    });

    if (process.env.NODE_ENV === "development") {
      console.error("[STRIPE] Webhook handler failed:", error);
    }

    return Response.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }
}
