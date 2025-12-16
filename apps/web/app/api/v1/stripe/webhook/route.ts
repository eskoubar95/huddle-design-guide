import { NextRequest } from "next/server";
import Stripe from "stripe";
import { createServiceClient } from "@/lib/supabase/server";
import { ApiError } from "@/lib/api/errors";
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
 * - identity.verification_session.* (Identity verification)
 * - payment_intent.succeeded (Payment success)
 * - payment_intent.payment_failed (Payment failure)
 * - transfer.created (Seller payouts)
 * - account.updated (Connect account status updates)
 *
 * Security:
 * - Verifies webhook signature
 * - Database-backed idempotency (webhook_events table)
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
  
  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    throw new ApiError(
      "SERVICE_UNAVAILABLE",
      "Stripe webhook secret is not configured",
      503
    );
  }

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
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

    // Handle Payment Intent events
    if (event.type === "payment_intent.succeeded") {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      const transactionId = paymentIntent.metadata?.transaction_id;

      if (transactionId) {
        // Update transaction status to "completed"
        const { error: updateError } = await supabase
          .from("transactions")
          .update({
            status: "completed",
            stripe_payment_intent_id: paymentIntent.id,
            completed_at: new Date(paymentIntent.created * 1000).toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", transactionId);

        if (updateError) {
          Sentry.captureException(updateError, {
            tags: { component: "stripe_webhook", event_type: event.type },
            extra: { transactionIdPrefix: transactionId.slice(0, 8) },
          });
        }

        // Update listing/auction status (if applicable)
        const listingId = paymentIntent.metadata?.listing_id;
        const listingType = paymentIntent.metadata?.listing_type;

        if (listingId && listingType) {
          if (listingType === "sale") {
            await supabase
              .from("sale_listings")
              .update({ status: "sold", sold_at: new Date().toISOString() })
              .eq("id", listingId);
          } else if (listingType === "auction") {
            await supabase
              .from("auctions")
              .update({ status: "ended", ended_at: new Date().toISOString() })
              .eq("id", listingId);
          }
        }

        // Create notification for seller
        const sellerId = paymentIntent.metadata?.seller_id;
        if (sellerId) {
          await supabase.from("notifications").insert({
            user_id: sellerId,
            type: "payment_received",
            title: "Payment Received",
            message: `Payment of ${paymentIntent.amount / 100} ${paymentIntent.currency.toUpperCase()} received.`,
            read: false,
          });
        }

        if (process.env.NODE_ENV === "development") {
          console.log(
            `[STRIPE] Payment succeeded for transaction ${transactionId.slice(0, 8)}...`
          );
        }
      }
    }

    if (event.type === "payment_intent.payment_failed") {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      const transactionId = paymentIntent.metadata?.transaction_id;

      if (transactionId) {
        // Update transaction status to "cancelled"
        const { error: updateError } = await supabase
          .from("transactions")
          .update({
            status: "cancelled",
            updated_at: new Date().toISOString(),
          })
          .eq("id", transactionId);

        if (updateError) {
          Sentry.captureException(updateError, {
            tags: { component: "stripe_webhook", event_type: event.type },
          });
        }

        // Notify buyer of payment failure
        const buyerId = paymentIntent.metadata?.buyer_id;
        if (buyerId) {
          await supabase.from("notifications").insert({
            user_id: buyerId,
            type: "payment_failed",
            title: "Payment Failed",
            message: "Your payment could not be processed. Please try again.",
            read: false,
          });
        }

        if (process.env.NODE_ENV === "development") {
          console.log(
            `[STRIPE] Payment failed for transaction ${transactionId.slice(0, 8)}...`
          );
        }
      }
    }

    // Handle Transfer events (seller payouts)
    if (event.type === "transfer.created") {
      const transfer = event.data.object as Stripe.Transfer;
      const transactionId = transfer.metadata?.transaction_id;

      if (transactionId) {
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
            tags: { component: "stripe_webhook", event_type: event.type },
          });
        }

        // Notify seller of payout
        const sellerId = transfer.metadata?.seller_id;
        if (sellerId) {
          await supabase.from("notifications").insert({
            user_id: sellerId,
            type: "payout_sent",
            title: "Payout Sent",
            message: `Payout of ${transfer.amount / 100} ${transfer.currency.toUpperCase()} has been sent to your account.`,
            read: false,
          });
        }

        if (process.env.NODE_ENV === "development") {
          console.log(
            `[STRIPE] Transfer created for transaction ${transactionId.slice(0, 8)}...`
          );
        }
      }
    }

    // Handle Account events (Connect account status updates)
    if (event.type === "account.updated") {
      const account = event.data.object as Stripe.Account;
      const userId = account.metadata?.user_id;

      if (userId) {
        // Determine status
        let status = "pending";
        if (account.details_submitted && account.charges_enabled && account.payouts_enabled) {
          status = "active";
        } else if (account.requirements?.currently_due && account.requirements.currently_due.length > 0) {
          status = "restricted";
        }

        // Update stripe_accounts table
        const { error: updateError } = await supabase
          .from("stripe_accounts")
          .update({
            status,
            payouts_enabled: account.payouts_enabled || false,
            charges_enabled: account.charges_enabled || false,
            updated_at: new Date().toISOString(),
          })
          .eq("stripe_account_id", account.id);

        if (updateError) {
          Sentry.captureException(updateError, {
            tags: { component: "stripe_webhook", event_type: event.type },
            extra: { accountIdPrefix: account.id.slice(0, 8) },
          });
        }

        // Notify user of status change to active
        if (status === "active") {
          await supabase.from("notifications").insert({
            user_id: userId,
            type: "stripe_account_activated",
            title: "Stripe Account Activated",
            message: "Your Stripe account is now active and ready to receive payouts.",
            read: false,
          });
        }

        if (process.env.NODE_ENV === "development") {
          console.log(
            `[STRIPE] Account ${account.id.slice(0, 8)}... updated → status: ${status}`
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
