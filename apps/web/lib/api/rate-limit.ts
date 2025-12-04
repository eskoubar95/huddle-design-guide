import { NextRequest } from "next/server";

// Simple in-memory rate limiter (kan opgraderes til Redis senere)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutter
const ANONYMOUS_LIMIT = 100;
const AUTHENTICATED_LIMIT = 300;

function getClientIP(req: NextRequest): string {
  // Try to get IP from various headers (for proxies/load balancers)
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  const realIP = req.headers.get("x-real-ip");
  if (realIP) {
    return realIP;
  }
  // Fallback to a generic identifier
  return "unknown";
}

export async function getRateLimitKey(req: NextRequest): Promise<string> {
  // For authenticated users, use userId from token
  const authHeader = req.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    try {
      const { verifyToken } = await import("@clerk/nextjs/server");
      const token = authHeader.replace("Bearer ", "");
      const session = await verifyToken(token, {
        secretKey: process.env.CLERK_SECRET_KEY!,
      });
      return `auth:${session.sub}`;
    } catch {
      // Invalid token, fallback to IP
      return `anon:${getClientIP(req)}`;
    }
  }
  return `anon:${getClientIP(req)}`;
}

export async function checkRateLimit(req: NextRequest): Promise<{
  allowed: boolean;
  remaining: number;
  resetAt: number;
}> {
  const key = await getRateLimitKey(req);
  const limit = req.headers.get("authorization")
    ? AUTHENTICATED_LIMIT
    : ANONYMOUS_LIMIT;
  const now = Date.now();

  const record = rateLimitMap.get(key);

  if (!record || now > record.resetAt) {
    // Reset window
    rateLimitMap.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return {
      allowed: true,
      remaining: limit - 1,
      resetAt: now + RATE_LIMIT_WINDOW,
    };
  }

  if (record.count >= limit) {
    return { allowed: false, remaining: 0, resetAt: record.resetAt };
  }

  record.count++;
  return {
    allowed: true,
    remaining: limit - record.count,
    resetAt: record.resetAt,
  };
}

// Overload for handlers without params
export function rateLimitMiddleware(
  handler: (req: NextRequest) => Promise<Response>
): (req: NextRequest) => Promise<Response>;

// Overload for handlers with params (Next.js 16 dynamic routes)
export function rateLimitMiddleware<T extends Record<string, string | string[]>>(
  handler: (
    req: NextRequest,
    context: { params: Promise<T> }
  ) => Promise<Response>
): (
  req: NextRequest,
  context: { params: Promise<T> }
) => Promise<Response>;

// Implementation
export function rateLimitMiddleware(
  handler:
    | ((req: NextRequest) => Promise<Response>)
    | ((
        req: NextRequest,
        context: { params: Promise<Record<string, string | string[]>> }
      ) => Promise<Response>)
) {
  return async (
    req: NextRequest,
    context?: { params: Promise<Record<string, string | string[]>> }
  ): Promise<Response> => {
    const { allowed, remaining, resetAt } = await checkRateLimit(req);

    if (!allowed) {
      return Response.json(
        {
          error: {
            code: "RATE_LIMIT_EXCEEDED",
            message: "Too many requests. Please try again later.",
            details: { resetAt },
          },
        },
        {
          status: 429,
          headers: {
            "X-RateLimit-Limit": "300",
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": resetAt.toString(),
          },
        }
      );
    }

    let response: Response;
    try {
      response = context
        ? await (handler as (
            req: NextRequest,
            context: { params: Promise<Record<string, string | string[]>> }
          ) => Promise<Response>)(req, context)
        : await (handler as (req: NextRequest) => Promise<Response>)(req);
    } catch (error) {
      // If handler throws, check if it's an auth error and stop rate limit tracking
      if (error && typeof error === "object" && "statusCode" in error) {
        const statusCode = (error as { statusCode?: number }).statusCode;
        if (statusCode === 401) {
          // Don't spam logs for auth errors - they're expected
          throw error;
        }
      }
      throw error;
    }

    response.headers.set("X-RateLimit-Remaining", remaining.toString());
    response.headers.set("X-RateLimit-Reset", resetAt.toString());
    return response;
  };
}

