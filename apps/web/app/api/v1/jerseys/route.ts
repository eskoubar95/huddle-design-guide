import { NextRequest } from "next/server";
import { rateLimitMiddleware } from "@/lib/api/rate-limit";
import { handleApiError } from "@/lib/api/errors";
import { paginatedResponse, createdResponse } from "@/lib/api/responses";
import { requireAuth, optionalAuth } from "@/lib/auth";
import { JerseyService } from "@/lib/services/jersey-service";
import { jerseyListQuerySchema } from "@/lib/validation/query-schemas";
import { jerseyCreateSchema } from "@/lib/validation/jersey-schemas";

const handler = async (req: NextRequest) => {
  try {
    if (req.method === "GET") {
      const auth = await optionalAuth(req);
      const searchParams = req.nextUrl.searchParams;

      const query = jerseyListQuerySchema.parse({
        limit: searchParams.get("limit"),
        cursor: searchParams.get("cursor"),
        ownerId: searchParams.get("ownerId"),
        visibility: searchParams.get("visibility"),
        club: searchParams.get("club"),
        season: searchParams.get("season"),
      });

      const service = new JerseyService();
      const result = await service.listJerseys(query, auth?.userId);

      return paginatedResponse(result.items, result.nextCursor);
    }

    if (req.method === "POST") {
      const { userId } = await requireAuth(req);
      const body = await req.json();

      const input = jerseyCreateSchema.parse(body);
      const service = new JerseyService();
      const jersey = await service.createJersey(input, userId);

      return createdResponse(jersey);
    }

    return new Response(null, { status: 405 });
  } catch (error) {
    return handleApiError(error, req);
  }
};

export const GET = rateLimitMiddleware(handler);
export const POST = rateLimitMiddleware(handler);

