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

  if (!authHeader?.startsWith("Bearer ")) {
    throw new ApiError("UNAUTHORIZED", "Authentication required", 401);
  }

  const token = authHeader.replace("Bearer ", "");

  try {
    // Verify token using @clerk/backend
    const session = await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY!,
    });
    const userId = session.sub;

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
    // Log error for debugging (only in development)
    if (process.env.NODE_ENV === "development") {
      console.error("Token verification failed:", error);
    }
    throw new ApiError("UNAUTHORIZED", "Invalid token", 401);
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

