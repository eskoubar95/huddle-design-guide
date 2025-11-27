import { NextRequest } from "next/server";
import { rateLimitMiddleware } from "@/lib/api/rate-limit";
import { handleApiError } from "@/lib/api/errors";
import { successResponse } from "@/lib/api/responses";
import { optionalAuth } from "@/lib/auth";
import { PostService } from "@/lib/services/post-service";

const handler = async (
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) => {
  try {
    const { id } = await context.params;

    if (req.method === "GET") {
      await optionalAuth(req); // Optional auth for future use
      const service = new PostService();
      const post = await service.getPost(id);

      return successResponse(post);
    }

    return new Response(null, { status: 405 });
  } catch (error) {
    return handleApiError(error, req);
  }
};

export const GET = rateLimitMiddleware(handler);

