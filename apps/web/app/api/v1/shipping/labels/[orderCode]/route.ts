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

    const { userId } = await requireAuth(req);

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

    // Get order details (includes label URL if available)
    const orderDetails = await eurosenderService.getOrderDetails(orderCode);

    return Response.json({
      orderCode: orderDetails.orderCode,
      status: orderDetails.status,
      labelUrl: orderDetails.labelUrl,
      trackingNumber: orderDetails.trackingNumber,
      price: orderDetails.price,
      courierId: orderDetails.courierId,
      serviceType: orderDetails.serviceType,
    });
  } catch (error) {
    const { orderCode } = await context.params;
    Sentry.captureException(error, {
      extra: { url: req.url, orderCode },
      tags: {
        component: "shipping-labels-api",
        operation: "get_label",
      },
    });
    return handleApiError(error, req);
  }
};

export const GET = rateLimitMiddleware(handler);

