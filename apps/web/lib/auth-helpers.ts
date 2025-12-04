import { NextRequest } from "next/server";
import { requireAuth, AuthResult } from "./auth";
import { handleApiError } from "./api/errors";

/**
 * Higher-order function to wrap API route handlers with authentication
 * Ensures consistent auth handling across all protected routes
 */
export function withAuth<T extends Record<string, string | string[]>>(
  handler: (
    req: NextRequest,
    auth: AuthResult,
    context?: { params: Promise<T> }
  ) => Promise<Response>
): (
  req: NextRequest,
  context?: { params: Promise<T> }
) => Promise<Response> {
  return async (req: NextRequest, context?: { params: Promise<T> }) => {
    try {
      const auth = await requireAuth(req);
      return await handler(req, auth, context);
    } catch (error) {
      return handleApiError(error, req);
    }
  };
}

/**
 * Higher-order function for optional authentication
 * Passes null if user is not authenticated
 */
export function withOptionalAuth<T extends Record<string, string | string[]>>(
  handler: (
    req: NextRequest,
    auth: AuthResult | null,
    context?: { params: Promise<T> }
  ) => Promise<Response>
): (
  req: NextRequest,
  context?: { params: Promise<T> }
) => Promise<Response> {
  return async (req: NextRequest, context?: { params: Promise<T> }) => {
    try {
      const { optionalAuth } = await import("./auth");
      const auth = await optionalAuth(req);
      return await handler(req, auth, context);
    } catch (error) {
      return handleApiError(error, req);
    }
  };
}

