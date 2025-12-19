import { NextRequest } from "next/server";
import { rateLimitMiddleware } from "@/lib/api/rate-limit";
import { handleApiError } from "@/lib/api/errors";
import { ShippingService } from "@/lib/services/shipping-service";
import * as Sentry from "@sentry/nextjs";

const handler = async (req: NextRequest) => {
  try {
    if (req.method !== "GET") {
      return new Response(null, { status: 405 });
    }

    const searchParams = req.nextUrl.searchParams;
    const zoneId = searchParams.get("zone_id");
    const serviceType = searchParams.get("service_type") as
      | "home_delivery"
      | "pickup_point"
      | null;

    if (!zoneId) {
      return Response.json(
        { error: { code: "BAD_REQUEST", message: "zone_id required" } },
        { status: 400 }
      );
    }

    const service = new ShippingService();
    const methods = await service.getShippingMethods(
      zoneId,
      serviceType || undefined
    );

    return Response.json({ methods });
  } catch (error) {
    Sentry.captureException(error, {
      extra: { url: req.url },
      tags: { component: "shipping-methods-api" },
    });
    return handleApiError(error, req);
  }
};

export const GET = rateLimitMiddleware(handler);

