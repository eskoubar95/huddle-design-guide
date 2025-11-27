import { NextRequest } from "next/server";
import { rateLimitMiddleware } from "@/lib/api/rate-limit";
import { handleApiError } from "@/lib/api/errors";
import { successResponse, noContentResponse } from "@/lib/api/responses";
import { requireAuth, optionalAuth } from "@/lib/auth";
import { JerseyService } from "@/lib/services/jersey-service";
import { jerseyUpdateSchema } from "@/lib/validation/jersey-schemas";

const handler = async (
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) => {
  try {
    const { id } = await context.params;

    if (req.method === "GET") {
      const auth = await optionalAuth(req);
      const service = new JerseyService();
      const jersey = await service.getJersey(id, auth?.userId);

      return successResponse(jersey);
    }

    if (req.method === "PATCH") {
      const { userId } = await requireAuth(req);
      const body = await req.json();

      const input = jerseyUpdateSchema.parse(body);
      const service = new JerseyService();
      const jersey = await service.updateJersey(id, input, userId);

      return successResponse(jersey);
    }

    if (req.method === "DELETE") {
      const { userId } = await requireAuth(req);
      const service = new JerseyService();
      await service.deleteJersey(id, userId);

      return noContentResponse();
    }

    return new Response(null, { status: 405 });
  } catch (error) {
    return handleApiError(error, req);
  }
};

export const GET = rateLimitMiddleware(handler);
export const PATCH = rateLimitMiddleware(handler);
export const DELETE = rateLimitMiddleware(handler);

