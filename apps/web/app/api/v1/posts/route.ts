import { NextRequest } from "next/server";
import { rateLimitMiddleware } from "@/lib/api/rate-limit";
import { handleApiError } from "@/lib/api/errors";
import { paginatedResponse, createdResponse } from "@/lib/api/responses";
import { requireAuth, optionalAuth } from "@/lib/auth";
import { PostService } from "@/lib/services/post-service";
import { postCreateSchema } from "@/lib/validation/post-schemas";

const handler = async (req: NextRequest) => {
  try {
    if (req.method === "GET") {
      await optionalAuth(req); // Optional auth for future use
      const searchParams = req.nextUrl.searchParams;

      const query = {
        limit: searchParams.get("limit")
          ? parseInt(searchParams.get("limit")!, 10)
          : 20,
        cursor: searchParams.get("cursor") || undefined,
        userId: searchParams.get("userId") || undefined,
        jerseyId: searchParams.get("jerseyId") || undefined,
      };

      const service = new PostService();
      const result = await service.listPosts(query);

      return paginatedResponse(result.items, result.nextCursor);
    }

    if (req.method === "POST") {
      const { userId } = await requireAuth(req);
      const body = await req.json();

      const input = postCreateSchema.parse(body);
      const service = new PostService();
      const post = await service.createPost(input, userId);

      return createdResponse(post);
    }

    return new Response(null, { status: 405 });
  } catch (error) {
    return handleApiError(error, req);
  }
};

export const GET = rateLimitMiddleware(handler);
export const POST = rateLimitMiddleware(handler);

