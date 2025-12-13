import { NextRequest } from "next/server";
import { rateLimitMiddleware } from "@/lib/api/rate-limit";
import { handleApiError } from "@/lib/api/errors";
import { successResponse } from "@/lib/api/responses";
import { requireAuth } from "@/lib/auth";
import { ProfileValidationService } from "@/lib/services/profile-validation-service";

/**
 * GET /api/v1/profile/completeness
 * Returns profile completeness status for the authenticated user
 */
const handler = async (req: NextRequest) => {
  try {
    const { userId } = await requireAuth(req);

    const service = new ProfileValidationService();
    const completeness = await service.getProfileCompleteness(userId);

    return successResponse(completeness);
  } catch (error) {
    return handleApiError(error, req);
  }
};

export const GET = rateLimitMiddleware(handler);
