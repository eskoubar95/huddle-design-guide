import { NextRequest } from "next/server";
import { rateLimitMiddleware } from "@/lib/api/rate-limit";
import { requireAuth } from "@/lib/auth";
import { handleApiError } from "@/lib/api/errors";
import { ShippingLabelService } from "@/lib/services/shipping-label-service";
import { createServiceClient } from "@/lib/supabase/server";
import { query } from "@/lib/db/postgres-connection";
import * as Sentry from "@sentry/nextjs";

const handler = async (
  req: NextRequest,
  context: { params: Promise<{ orderCode: string }> }
) => {
  try {
    if (req.method !== "POST") {
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

    // Get label from database to find transaction_id
    const labels = await query<{ transaction_id: string | null }>(
      `SELECT transaction_id FROM public.shipping_labels 
       WHERE external_order_id = $1 LIMIT 1`,
      [orderCode]
    );

    if (!labels || labels.length === 0) {
      return Response.json(
        {
          error: {
            code: "NOT_FOUND",
            message: "Shipping label not found",
          },
        },
        { status: 404 }
      );
    }

    const label = labels[0];

    if (!label.transaction_id) {
      return Response.json(
        {
          error: {
            code: "BAD_REQUEST",
            message: "Label is not associated with a transaction",
          },
        },
        { status: 400 }
      );
    }

    // Verify user is seller
    const supabase = await createServiceClient();
    const { data: transaction, error: txError } = await supabase
      .from("transactions")
      .select("seller_id")
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

    if (transaction.seller_id !== userId) {
      return Response.json(
        {
          error: {
            code: "FORBIDDEN",
            message: "Access denied: You must be the seller to cancel shipping labels",
          },
        },
        { status: 403 }
      );
    }

    // Cancel label via ShippingLabelService
    const labelService = new ShippingLabelService();
    await labelService.cancelLabel(orderCode, label.transaction_id, userId);

    return Response.json({
      success: true,
      message: "Shipping label cancelled successfully",
    });
  } catch (error) {
    const { orderCode } = await context.params;
    Sentry.captureException(error, {
      extra: { url: req.url, orderCode },
      tags: {
        component: "shipping-labels-api",
        operation: "cancel_label",
      },
    });
    return handleApiError(error, req);
  }
};

export const POST = rateLimitMiddleware(handler);

