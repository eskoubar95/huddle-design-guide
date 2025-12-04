import { NextRequest } from "next/server";
import { rateLimitMiddleware } from "@/lib/api/rate-limit";
import { handleApiError, ApiError } from "@/lib/api/errors";
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

      // Parse query params with better error handling
      let query;
      try {
        // Build query object - only include defined params
        const queryData: Record<string, unknown> = {};
        
        const limit = searchParams.get("limit");
        if (limit !== null) queryData.limit = limit;
        
        const cursor = searchParams.get("cursor");
        if (cursor !== null) queryData.cursor = cursor;
        
        const ownerId = searchParams.get("ownerId");
        if (ownerId !== null) queryData.ownerId = ownerId;
        
        const visibility = searchParams.get("visibility");
        if (visibility !== null) queryData.visibility = visibility;
        
        const club = searchParams.get("club");
        if (club !== null) queryData.club = club;
        
        const season = searchParams.get("season");
        if (season !== null) queryData.season = season;
        
        query = jerseyListQuerySchema.parse(queryData);
      } catch (error) {
        // Log validation errors for debugging with full details
        console.error("[JERSEYS API] Query validation error:", error);
        if (error instanceof Error && 'issues' in error) {
          console.error("[JERSEYS API] Validation issues:", (error as any).issues);
        }
        throw new ApiError(
          "VALIDATION_ERROR", 
          error instanceof Error ? error.message : "Invalid query parameters", 
          400
        );
      }

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

