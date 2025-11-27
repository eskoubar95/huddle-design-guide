import { NextRequest } from "next/server";
import { rateLimitMiddleware } from "@/lib/api/rate-limit";
import { handleApiError } from "@/lib/api/errors";
import { successResponse } from "@/lib/api/responses";
import { optionalAuth } from "@/lib/auth";
import { ProfileService } from "@/lib/services/profile-service";

const handler = async (
  req: NextRequest,
  context: { params: Promise<{ username: string }> }
) => {
  try {
    const { username } = await context.params;

    if (req.method === "GET") {
      await optionalAuth(req); // Optional auth for future use
      const service = new ProfileService();
      const profile = await service.getProfileByUsername(username);

      return successResponse(profile);
    }

    return new Response(null, { status: 405 });
  } catch (error) {
    return handleApiError(error, req);
  }
};

export const GET = rateLimitMiddleware(handler);

