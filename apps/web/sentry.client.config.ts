// This file configures the initialization of Sentry on the client.
// The config you add here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (!dsn) {
  console.warn("Sentry DSN is not configured. Set NEXT_PUBLIC_SENTRY_DSN in your environment variables.");
} else {
  Sentry.init({
    dsn,

    // Adjust this value in production, or use tracesSampler for greater control
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1,

    // Setting this option to true will print useful information to the console while you're setting up Sentry.
    debug: process.env.NODE_ENV === "development",

    // Session Replay configuration
    replaysOnErrorSampleRate: 1.0,
    replaysSessionSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

    // Integrations
    integrations: [
      Sentry.replayIntegration({
        // Mask all text and block all media to protect PII (per 24-observability_sentry.mdc)
        maskAllText: true,
        blockAllMedia: true,
      }),
      // Send console.log, console.error, and console.warn calls as logs to Sentry
      Sentry.consoleLoggingIntegration({ levels: ["error", "warn"] }),
    ],

    // Environment
    environment: process.env.NODE_ENV || "development",
  });
}

