import { NextRequest } from "next/server";
import { rateLimitMiddleware } from "@/lib/api/rate-limit";
import { requireAuth } from "@/lib/auth";
import { handleApiError } from "@/lib/api/errors";
import { EurosenderService } from "@/lib/services/eurosender-service";
import { createServiceClient } from "@/lib/supabase/server";
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

    // Verify order ownership via shipping_labels -> transaction
    const supabase = await createServiceClient();
    const { data: label, error: dbError } = await supabase
      .from("shipping_labels")
      .select("transaction_id")
      .eq("external_order_id", orderCode)
      .single();

    if (dbError || !label) {
      return Response.json(
        {
          error: {
            code: "NOT_FOUND",
            message: "Order not found",
          },
        },
        { status: 404 }
      );
    }

    // If label has transaction_id, verify the transaction belongs to the user
    if (label.transaction_id) {
      const { data: transaction, error: txError } = await supabase
        .from("transactions")
        .select("seller_id, buyer_id")
        .eq("id", label.transaction_id)
        .single();

      if (txError || !transaction) {
        return Response.json(
          {
            error: {
              code: "NOT_FOUND",
              message: "Transaction not found",
            },
          },
          { status: 404 }
        );
      }

      // Verify user is either seller or buyer
      if (transaction.seller_id !== userId && transaction.buyer_id !== userId) {
        return Response.json(
          {
            error: {
              code: "FORBIDDEN",
              message: "Access denied",
            },
          },
          { status: 403 }
        );
      }
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

