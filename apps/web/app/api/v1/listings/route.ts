import { NextRequest } from "next/server";
import { rateLimitMiddleware } from "@/lib/api/rate-limit";
import { handleApiError } from "@/lib/api/errors";
import { paginatedResponse, createdResponse } from "@/lib/api/responses";
import { optionalAuth } from "@/lib/auth";
import { requireSellerVerification } from "@/lib/middleware/profile-validation";
import { ListingService } from "@/lib/services/listing-service";
import { listingListQuerySchema } from "@/lib/validation/query-schemas";
import { saleListingCreateSchema } from "@/lib/validation/listing-schemas";

const handler = async (req: NextRequest) => {
  try {
    if (req.method === "GET") {
      await optionalAuth(req);
      const searchParams = req.nextUrl.searchParams;

      const query = listingListQuerySchema.parse({
        limit: searchParams.get("limit"),
        cursor: searchParams.get("cursor"),
        status: searchParams.get("status"),
        club: searchParams.get("club"),
        minPrice: searchParams.get("minPrice"),
        maxPrice: searchParams.get("maxPrice"),
        country: searchParams.get("country"),
        sort: searchParams.get("sort"),
      });

      const service = new ListingService();
      const result = await service.listListings(query);

      return paginatedResponse(result.items, result.nextCursor);
    }

    if (req.method === "POST") {
      // Verify seller has complete profile + verified identity
      const { userId } = await requireSellerVerification(req);
      const body = await req.json();

      const input = saleListingCreateSchema.parse(body);
      const service = new ListingService();
      const listing = await service.createListing(input, userId);

      return createdResponse(listing);
    }

    return new Response(null, { status: 405 });
  } catch (error) {
    return handleApiError(error, req);
  }
};

export const GET = rateLimitMiddleware(handler);
export const POST = rateLimitMiddleware(handler);

