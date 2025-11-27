import { NextRequest } from "next/server";
import { rateLimitMiddleware } from "@/lib/api/rate-limit";
import { handleApiError } from "@/lib/api/errors";
import { successResponse } from "@/lib/api/responses";
import { requireAuth, optionalAuth } from "@/lib/auth";
import { ProfileService } from "@/lib/services/profile-service";
import { profileUpdateSchema } from "@/lib/validation/profile-schemas";

const handler = async (
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) => {
  try {
    const { id } = await context.params;

    if (req.method === "GET") {
      await optionalAuth(req); // Optional auth for future use
      const service = new ProfileService();
      const profile = await service.getProfile(id);

      return successResponse(profile);
    }

    if (req.method === "PATCH") {
      const { userId } = await requireAuth(req);
      const body = await req.json();

      const input = profileUpdateSchema.parse(body);
      const service = new ProfileService();
      const profile = await service.updateProfile(id, input, userId);

      return successResponse(profile);
    }

    return new Response(null, { status: 405 });
  } catch (error) {
    return handleApiError(error, req);
  }
};

export const GET = rateLimitMiddleware(handler);
export const PATCH = rateLimitMiddleware(handler);

