import { NextRequest } from "next/server";
import { rateLimitMiddleware } from "@/lib/api/rate-limit";
import { requireAuth } from "@/lib/auth";
import { handleApiError } from "@/lib/api/errors";
import { EurosenderService } from "@/lib/services/eurosender-service";
import * as Sentry from "@sentry/nextjs";

const handler = async (
  req: NextRequest,
  context: { params: Promise<{ orderCode: string }> }
) => {
  try {
    if (req.method !== "GET") {
      return new Response(null, { status: 405 });
    }

    await requireAuth(req); // Verify authentication

    const { orderCode } = await context.params;

    if (!orderCode) {
      return Response.json(
        {
          error: {
            code: "BAD_REQUEST",
            message: "orderCode parameter is required",
          },
        },
        { status: 400 }
      );
    }

    const eurosenderService = new EurosenderService();

    // Get tracking information
    const tracking = await eurosenderService.getTracking(orderCode);

    return Response.json({
      orderCode: tracking.orderCode,
      trackingNumber: tracking.trackingNumber,
      trackingUrl: tracking.trackingUrl,
      status: tracking.status,
      events: tracking.events,
    });
  } catch (error) {
    const { orderCode } = await context.params;
    Sentry.captureException(error, {
      extra: { url: req.url, orderCode },
      tags: {
        component: "shipping-tracking-api",
        operation: "get_tracking",
      },
    });
    return handleApiError(error, req);
  }
};

export const GET = rateLimitMiddleware(handler);

