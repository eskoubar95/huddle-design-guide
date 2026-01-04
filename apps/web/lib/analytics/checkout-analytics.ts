/**
 * Checkout Analytics
 * 
 * Placeholder for analytics tracking during checkout flow.
 * Events can be integrated with analytics service (e.g., Mixpanel, PostHog) later.
 * 
 * For now, events are logged to Sentry as breadcrumbs for debugging.
 */

import * as Sentry from "@sentry/nextjs";

export type CheckoutEventName =
  | "checkout_shipping_method_selected"
  | "checkout_service_point_selected"
  | "checkout_initiated"
  | "checkout_payment_started"
  | "checkout_payment_success"
  | "checkout_payment_failed"
  | "checkout_completed";

export interface CheckoutEventData {
  listingIdPrefix?: string;
  shippingMethod?: "home_delivery" | "pickup_point";
  servicePointProvider?: string;
  amountCents?: number;
  currency?: string;
  errorType?: string;
  // No PII - only metadata
}

/**
 * Track checkout event
 * TODO: Integrate with analytics service when available
 */
export function trackCheckoutEvent(
  eventName: CheckoutEventName,
  data?: CheckoutEventData
): void {
  // Log to Sentry as breadcrumb for now
  Sentry.addBreadcrumb({
    category: "analytics.checkout",
    message: eventName,
    level: "info",
    data: data || {},
  });

  // TODO: Send to analytics service (Mixpanel, PostHog, etc.)
  // Example:
  // analytics.track(eventName, {
  //   ...data,
  //   timestamp: new Date().toISOString(),
  // });
}

