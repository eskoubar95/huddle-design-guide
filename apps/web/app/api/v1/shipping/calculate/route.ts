import { NextRequest } from "next/server";
import { rateLimitMiddleware } from "@/lib/api/rate-limit";
import { requireAuth } from "@/lib/auth";
import { handleApiError } from "@/lib/api/errors";
import { ShippingService } from "@/lib/services/shipping-service";
import { z } from "zod";
import * as Sentry from "@sentry/nextjs";

const calculateSchema = z.object({
  listingId: z.string().uuid().optional(),
  auctionId: z.string().uuid().optional(),
  shippingAddress: z.object({
    street: z.string().min(1),
    city: z.string().min(1),
    postal_code: z.string().min(1),
    country: z.string().length(2), // ISO 2-letter
    state: z.string().optional(),
  }),
  serviceType: z.enum(["home_delivery", "pickup_point"]).optional(),
  servicePointId: z.string().uuid().optional(),
});

const handler = async (req: NextRequest) => {
  try {
    if (req.method !== "POST") {
      return new Response(null, { status: 405 });
    }

    const { userId } = await requireAuth(req);

    const body = await req.json();
    const validated = calculateSchema.parse(body);

    // Validate: Either listingId or auctionId required
    if (!validated.listingId && !validated.auctionId) {
      return Response.json(
        {
          error: {
            code: "BAD_REQUEST",
            message: "listingId or auctionId required",
          },
        },
        { status: 400 }
      );
    }

    const service = new ShippingService();
    const options = await service.calculateShipping({
      listingId: validated.listingId,
      auctionId: validated.auctionId,
      shippingAddress: validated.shippingAddress,
      serviceType: validated.serviceType,
      servicePointId: validated.servicePointId,
    });

    return Response.json({ options });
  } catch (error) {
    Sentry.captureException(error, {
      extra: { url: req.url },
      tags: { component: "shipping-calculate-api" },
    });
    return handleApiError(error, req);
  }
};

export const POST = rateLimitMiddleware(handler);

