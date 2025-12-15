import { NextRequest } from "next/server";
import { rateLimitMiddleware } from "@/lib/api/rate-limit";
import { handleApiError, ApiError } from "@/lib/api/errors";
import { successResponse } from "@/lib/api/responses";
import { requireAuth } from "@/lib/auth";

/**
 * GET /api/v1/profile/verification-status
 * Returns identity verification status for the authenticated user
 */
const handler = async (req: NextRequest) => {
  try {
    const { userId } = await requireAuth(req);

    // Get profile with identity verification status
    const { createServiceClient } = await import("@/lib/supabase/server");
    const supabase = await createServiceClient();

    const { data: profile, error } = await supabase
      .from("profiles")
      .select("stripe_identity_verification_status, stripe_identity_verification_id, updated_at")
      .eq("id", userId)
      .single();

    if (error || !profile) {
      throw new ApiError("NOT_FOUND", "Profile not found", 404);
    }

    return successResponse({
      status: profile.stripe_identity_verification_status || null,
      verificationId: profile.stripe_identity_verification_id || null,
      lastUpdated: profile.updated_at,
    });
  } catch (error) {
    return handleApiError(error, req);
  }
};

export const GET = rateLimitMiddleware(handler);
