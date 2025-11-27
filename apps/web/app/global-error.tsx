"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error to Sentry
    Sentry.captureException(error);
  }, [error]);

  return (
    <html>
      <body>
        <div className="flex min-h-screen items-center justify-center bg-muted">
          <div className="text-center">
            <h1 className="mb-4 text-4xl font-bold">500</h1>
            <p className="mb-4 text-xl text-muted-foreground">
              Something went wrong!
            </p>
            <p className="mb-4 text-sm text-muted-foreground">
              {error.message || "An unexpected error occurred"}
            </p>
            <button
              onClick={reset}
              className="bg-primary text-primary-foreground px-4 py-2 rounded hover:bg-primary/90"
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}

