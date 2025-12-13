import { NextRequest } from "next/server";
import { rateLimitMiddleware } from "@/lib/api/rate-limit";
import { handleApiError } from "@/lib/api/errors";
import { paginatedResponse, createdResponse } from "@/lib/api/responses";
import { optionalAuth } from "@/lib/auth";
import { requireSellerVerification } from "@/lib/middleware/profile-validation";
import { AuctionService } from "@/lib/services/auction-service";
import { auctionCreateSchema } from "@/lib/validation/auction-schemas";

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
        status: searchParams.get("status") || undefined,
        sellerId: searchParams.get("sellerId") || undefined,
      };

      const service = new AuctionService();
      const result = await service.listAuctions(query);

      return paginatedResponse(result.items, result.nextCursor);
    }

    if (req.method === "POST") {
      // Verify seller has complete profile + verified identity
      const { userId } = await requireSellerVerification(req);
      const body = await req.json();

      const input = auctionCreateSchema.parse(body);
      const service = new AuctionService();
      const auction = await service.createAuction(input, userId);

      return createdResponse(auction);
    }

    return new Response(null, { status: 405 });
  } catch (error) {
    return handleApiError(error, req);
  }
};

export const GET = rateLimitMiddleware(handler);
export const POST = rateLimitMiddleware(handler);

