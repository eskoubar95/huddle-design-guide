import { NextRequest } from "next/server";
import { rateLimitMiddleware } from "@/lib/api/rate-limit";
import { handleApiError, ApiError } from "@/lib/api/errors";
import { successResponse } from "@/lib/api/responses";
import { requireAuth } from "@/lib/auth";
import { reviewRequestSchema } from "@/lib/validation/profile-schemas";

/**
 * POST /api/v1/profile/identity/request-review
 * Request manual review of rejected identity verification
 */
const handler = async (req: NextRequest) => {
  try {
    const { userId } = await requireAuth(req);
    const body = await req.json();

    // Validate input
    const validated = reviewRequestSchema.parse(body);

    const { createServiceClient } = await import("@/lib/supabase/server");
    const supabase = await createServiceClient();

    // Get profile to verify identity verification status
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("stripe_identity_verification_status, stripe_identity_verification_id")
      .eq("id", userId)
      .single();

    if (profileError || !profile) {
      throw new ApiError("NOT_FOUND", "Profile not found", 404);
    }

    // Only allow review requests for rejected verifications
    if (profile.stripe_identity_verification_status !== 'rejected') {
      throw new ApiError(
        "BAD_REQUEST",
        "Review requests are only available for rejected verifications",
        400,
        {
          currentStatus: profile.stripe_identity_verification_status,
        }
      );
    }

    // Create review request record
    const { error: requestError } = await supabase
      .from("identity_verification_review_requests")
      .insert({
        user_id: userId,
        verification_session_id: profile.stripe_identity_verification_id,
        status: 'open',
        message: validated.message || null,
      });

    if (requestError) {
      throw new ApiError(
        "INTERNAL_SERVER_ERROR",
        "Failed to create review request",
        500,
        { details: requestError.message }
      );
    }

    // Create in-app notification for the user
    await supabase
      .from("notifications")
      .insert({
        user_id: userId,
        type: 'system',
        title: 'Review Request Received',
        message: 'We have received your identity verification review request. Our team will review your case and get back to you shortly.',
        read: false,
      });

    // TODO: Email notification hook (Phase 5)
    // When email provider is configured, call sendReviewRequestEmail(userId)

    return successResponse({
      success: true,
      message: "Review request submitted successfully. You will be notified of the outcome.",
    });
  } catch (error) {
    return handleApiError(error, req);
  }
};

export const POST = rateLimitMiddleware(handler);
