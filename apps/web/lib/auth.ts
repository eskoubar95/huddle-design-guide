import { verifyToken } from "@clerk/nextjs/server";
import { ApiError } from "@/lib/api/errors";

export interface AuthResult {
  userId: string;
  profileId: string;
}

/**
 * Verificer Clerk JWT token og returner userId + profileId
 * Opretter automatisk profile hvis den ikke eksisterer
 */
export async function requireAuth(req: Request): Promise<AuthResult> {
  const authHeader = req.headers.get("authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    throw new ApiError("UNAUTHORIZED", "Authentication required", 401);
  }

  const token = authHeader.replace("Bearer ", "");

  try {
    const session = await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY!,
    });
    const userId = session.sub;

    // Sync profile i Supabase
    // Use service client to bypass RLS (we handle auth in this layer)
    const { createServiceClient } = await import("@/lib/supabase/server");
    const supabase = await createServiceClient();
    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", userId)
      .single();

    if (!profile) {
      // Opret profile ved første API kald
      const { data: newProfile, error } = await supabase
        .from("profiles")
        .insert({
          id: userId,
          username: session.username || `user_${userId.slice(0, 8)}`,
          avatar_url: session.imageUrl || null,
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

      return { userId, profileId: newProfile.id };
    }

    return { userId, profileId: profile.id };
  } catch (error) {
    if (error instanceof ApiError) throw error;
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

