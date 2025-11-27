// This file configures the initialization of Sentry on the client.
// The added config here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (!dsn) {
  console.warn("Sentry DSN is not configured. Set NEXT_PUBLIC_SENTRY_DSN in your environment variables.");
} else {
  Sentry.init({
    dsn,

    // Add optional integrations for additional features
    integrations: [
      Sentry.replayIntegration({
        // Mask all text and block all media to protect PII (per 24-observability_sentry.mdc)
        maskAllText: true,
        blockAllMedia: true,
      }),
      // Send console.log, console.error, and console.warn calls as logs to Sentry
      Sentry.consoleLoggingIntegration({ levels: ["error", "warn"] }),
    ],

    // Define how likely traces are sampled. Adjust this value in production, or use tracesSampler for greater control.
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1,

    // Enable logs to be sent to Sentry
    enableLogs: true,

    // Setting this option to true will print useful information to the console while you're setting up Sentry.
    debug: process.env.NODE_ENV === "development",

    // Define how likely Replay events are sampled.
    // This sets the sample rate to be 100% in development and 10% in production
    replaysSessionSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

    // Define how likely Replay events are sampled when an error occurs.
    replaysOnErrorSampleRate: 1.0,

    // NEVER send PII (Personally Identifiable Information) - per 24-observability_sentry.mdc
    // https://docs.sentry.io/platforms/javascript/guides/nextjs/configuration/options/#sendDefaultPii
    sendDefaultPii: false,

    // Environment
    environment: process.env.NODE_ENV || "development",
  });
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;