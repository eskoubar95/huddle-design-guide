import { NextRequest } from "next/server";
import { rateLimitMiddleware } from "@/lib/api/rate-limit";
import { handleApiError } from "@/lib/api/errors";
import { successResponse, noContentResponse } from "@/lib/api/responses";
import { requireAuth } from "@/lib/auth";
import { ListingService } from "@/lib/services/listing-service";
import { saleListingUpdateSchema } from "@/lib/validation/listing-schemas";

const handler = async (
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) => {
  try {
    const { id } = await context.params;

    if (req.method === "GET") {
      const service = new ListingService();
      const listing = await service.getListing(id);

      return successResponse(listing);
    }

    if (req.method === "PATCH") {
      const { userId } = await requireAuth(req);
      const body = await req.json();

      const input = saleListingUpdateSchema.parse(body);
      const service = new ListingService();
      const listing = await service.updateListing(id, input, userId);

      return successResponse(listing);
    }

    if (req.method === "DELETE") {
      const { userId } = await requireAuth(req);
      const service = new ListingService();
      await service.deleteListing(id, userId);

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

