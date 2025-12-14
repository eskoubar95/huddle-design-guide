// This file configures the initialization of Sentry for edge features (middleware, edge routes, and so on).
// The config you add here will be used whenever one of the edge features is loaded.
// Note that this config is unrelated to the Vercel Edge Runtime and is also required when running locally.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

const dsn = process.env.SENTRY_DSN;

if (!dsn) {
  console.warn("Sentry DSN is not configured. Set SENTRY_DSN in your environment variables.");
} else {
  Sentry.init({
    dsn,

    // Define how likely traces are sampled. Adjust this value in production, or use tracesSampler for greater control.
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1,

    // Enable logs to be sent to Sentry
    enableLogs: true,

    // NEVER send PII (Personally Identifiable Information) - per 24-observability_sentry.mdc
    // https://docs.sentry.io/platforms/javascript/guides/nextjs/configuration/options/#sendDefaultPii
    sendDefaultPii: false,

    // Setting this option to true will print useful information to the console while you're setting up Sentry.
    debug: process.env.NODE_ENV === "development",

    // Environment
    environment: process.env.NODE_ENV || "development",

    // Never send PII (per 24-observability_sentry.mdc)
    beforeSend(event) {
      // Remove any potential PII from event
      if (event.user) {
        // Only include userId, not email or other PII
        event.user = { id: event.user.id };
      }
      return event;
    },
  });
}
