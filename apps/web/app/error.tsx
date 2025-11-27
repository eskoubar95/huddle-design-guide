"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import Link from "next/link";

export default function Error({
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
    <div className="flex min-h-screen items-center justify-center bg-muted">
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold">500</h1>
        <p className="mb-4 text-xl text-muted-foreground">
          Something went wrong!
        </p>
        <p className="mb-4 text-sm text-muted-foreground">
          {error.message || "An unexpected error occurred"}
        </p>
        <div className="flex gap-4 justify-center">
          <button
            onClick={reset}
            className="bg-primary text-primary-foreground px-4 py-2 rounded hover:bg-primary/90"
          >
            Try again
          </button>
          <Link
            href="/"
            className="bg-secondary text-secondary-foreground px-4 py-2 rounded hover:bg-secondary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

