import { NextRequest } from "next/server";
import { rateLimitMiddleware } from "@/lib/api/rate-limit";
import { handleApiError } from "@/lib/api/errors";
import { createdResponse } from "@/lib/api/responses";
import { requireBuyerProfile } from "@/lib/middleware/profile-validation";
import { BidService } from "@/lib/services/bid-service";
import { bidCreateSchema } from "@/lib/validation/auction-schemas";

const handler = async (req: NextRequest) => {
  try {
    if (req.method === "POST") {
      // Verify buyer has complete profile
      const { userId } = await requireBuyerProfile(req);
      const body = await req.json();

      const input = bidCreateSchema.parse(body);
      const service = new BidService();
      const bid = await service.placeBid(input.auctionId, input, userId);

      return createdResponse(bid);
    }

    return new Response(null, { status: 405 });
  } catch (error) {
    return handleApiError(error, req);
  }
};

export const POST = rateLimitMiddleware(handler);

