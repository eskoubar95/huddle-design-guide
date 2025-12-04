export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 400,
    public details: unknown = null
  ) {
    super(message);
    this.name = "ApiError";
  }

  toJSON() {
    return {
      error: {
        code: this.code,
        message: this.message,
        details: this.details,
      },
    };
  }
}

export function handleApiError(
  error: unknown,
  req?: { url?: string; method?: string }
): Response {
  if (error instanceof ApiError) {
    // Add WWW-Authenticate header for 401 errors
    const headers: HeadersInit = { "Content-Type": "application/json" };
    if (error.statusCode === 401) {
      headers["WWW-Authenticate"] = 'Bearer realm="api", error="invalid_token"';
    }

    return Response.json(error.toJSON(), { 
      status: error.statusCode,
      headers,
    });
  }

  // Capture unexpected errors with Sentry (per 24-observability_sentry.mdc)
  if (typeof window === "undefined") {
    // Server-side only
    import("@sentry/nextjs")
      .then((Sentry) => {
        Sentry.captureException(error, {
          tags: { component: "api", type: "unexpected_error" },
          extra: {
            endpoint: req?.url || "unknown",
            method: req?.method || "unknown",
          }, // No PII
        });
      })
      .catch(() => {
        // Sentry not available, log to console
        console.error("Unexpected API error:", error);
      });
  } else {
    console.error("Unexpected API error:", error);
  }

  return Response.json(
    {
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "An unexpected error occurred",
        details: null,
      },
    },
    { status: 500 }
  );
}

