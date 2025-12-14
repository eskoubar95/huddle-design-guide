import { createClerkClient, verifyToken } from "@clerk/backend";
import { ApiError } from "@/lib/api/errors";

const clerk = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY!,
});

export interface AuthResult {
  userId: string;
  profileId: string;
}

/**
 * Verificer Clerk JWT token og returner userId + profileId
 * Opretter automatisk profile hvis den ikke eksisterer
 * Henter user data fra Clerk API (ikke session claims)
 */
export async function requireAuth(req: Request): Promise<AuthResult> {
  const authHeader = req.headers.get("authorization");
  const requestId = crypto.randomUUID().slice(0, 8);

  if (!authHeader?.startsWith("Bearer ")) {
    // Log missing token (no PII)
    if (process.env.NODE_ENV === "development") {
      console.log("[AUTH] Missing authorization header", {
        requestId,
        endpoint: new URL(req.url).pathname,
      });
    }
    throw new ApiError("UNAUTHORIZED", "Authentication required", 401);
  }

  const token = authHeader.replace("Bearer ", "");

  try {
    // Verify token using @clerk/backend
    const session = await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY!,
    });
    const userId = session.sub;

    // Log successful auth (no PII, only userId prefix)
    if (process.env.NODE_ENV === "development") {
      console.log("[AUTH] Token verified successfully", {
        requestId,
        userIdPrefix: userId.slice(0, 8),
        endpoint: new URL(req.url).pathname,
      });
    }

    // Get user data from Clerk API (not session claims)
    const user = await clerk.users.getUser(userId);
    const username = user.username || user.firstName || `user_${userId.slice(0, 8)}`;
    const avatarUrl = user.imageUrl || null;

    // Sync profile i Supabase
    // Use service client to bypass RLS (we handle auth in this layer)
    const { createServiceClient } = await import("@/lib/supabase/server");
    const supabase = await createServiceClient();
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, medusa_customer_id")
      .eq("id", userId)
      .single();

    if (!profile) {
      // Opret profile ved første API kald
      const { data: newProfile, error } = await supabase
        .from("profiles")
        .insert({
          id: userId,
          username,
          avatar_url: avatarUrl,
        } as {
          id: string;
          username: string;
          avatar_url: string | null;
        })
        .select("id")
        .single();

      if (error) {
        throw new ApiError(
          "INTERNAL_SERVER_ERROR",
          "Failed to create profile",
          500
        );
      }

      // Opret Medusa customer (non-blocking - log errors men throw ikke)
      try {
        const { syncMedusaCustomer } = await import("@/lib/services/medusa-customer-service");
        await syncMedusaCustomer(userId);
      } catch (error) {
        console.error("[AUTH] Failed to sync Medusa customer:", error);
        // Continue - profile er oprettet, customer kan sync'es senere
      }

      return { userId, profileId: newProfile.id };
    }

    // Sync Medusa customer (create eller update)
    // Non-blocking: Logs errors men throw'er ikke
    try {
      const { syncMedusaCustomer } = await import("@/lib/services/medusa-customer-service");
      await syncMedusaCustomer(userId);
    } catch (error) {
      console.error("[AUTH] Failed to sync Medusa customer:", error);
      // Continue - non-blocking
    }

    return { userId, profileId: profile.id };
  } catch (error) {
    if (error instanceof ApiError) throw error;

    // Extract error details for logging (no PII)
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorName = error instanceof Error ? error.name : "UnknownError";
    const isExpired = errorMessage.toLowerCase().includes("expired") || errorMessage.toLowerCase().includes("exp");

    // Log structured error (no PII)
    if (process.env.NODE_ENV === "development") {
      console.error("[AUTH] Token verification failed", {
        requestId,
        errorType: errorName,
        isExpired,
        endpoint: new URL(req.url).pathname,
        // Don't log full error message as it may contain token fragments
      });
    }

    throw new ApiError("UNAUTHORIZED", isExpired ? "Token expired" : "Invalid token", 401);
  }
}

/**
 * Optional auth - returner null hvis ikke autentificeret
 */
export async function optionalAuth(
  req: Request
): Promise<AuthResult | null> {
  try {
    return await requireAuth(req);
  } catch {
    return null;
  }
}

