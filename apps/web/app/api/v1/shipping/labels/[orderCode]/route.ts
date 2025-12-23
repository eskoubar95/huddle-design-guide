import { NextRequest } from "next/server";
import { rateLimitMiddleware } from "@/lib/api/rate-limit";
import { requireAuth } from "@/lib/auth";
import { handleApiError } from "@/lib/api/errors";
import { EurosenderService } from "@/lib/services/eurosender-service";
import { createServiceClient } from "@/lib/supabase/server";
import { query } from "@/lib/db/postgres-connection";
import * as Sentry from "@sentry/nextjs";

/**
 * Map Eurosender order status to our database status values
 * 
 * Database status meanings:
 * - 'pending': Order not yet created/accepted
 * - 'purchased': Order accepted/confirmed by Eurosender (equivalent to "Confirmed")
 * - 'cancelled': Order cancelled
 * - 'error': Order creation failed or error occurred
 * 
 * Eurosender status meanings:
 * - 'Confirmed': Order accepted and being processed (maps to 'purchased')
 * - 'Cancelled': Order cancelled (maps to 'cancelled')
 * - 'Error'/'Failed': Order creation failed (maps to 'error')
 * - Other statuses (e.g., 'In Transit', 'Delivered'): Order is active (maps to 'purchased')
 * 
 * Note: "Confirmed" and "purchased" represent the same concept - order is accepted.
 * The label may still be generated asynchronously, but the order itself is confirmed.
 */
function mapEurosenderStatusToDbStatus(eurosenderStatus: string): "pending" | "purchased" | "cancelled" | "error" {
  const statusLower = eurosenderStatus.toLowerCase();
  
  if (statusLower.includes("cancel")) {
    return "cancelled";
  }
  if (statusLower.includes("error") || statusLower.includes("fail")) {
    return "error";
  }
  // "Confirmed" from Eurosender = order accepted = "purchased" in our database
  if (statusLower.includes("confirm") || statusLower.includes("purchased") || statusLower.includes("active")) {
    return "purchased";
  }
  
  // Default to purchased for any other status (e.g., "In Transit", "Delivered", etc.)
  // since order was successfully created and is active
  return "purchased";
}

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
    // Use direct SQL query since shipping_labels table is not in Supabase types yet
    const labels = await query<{ 
      id: string;
      transaction_id: string | null;
      label_url: string;
      tracking_number: string | null;
      status: string;
      price_gross: number | null;
      price_net: number | null;
      price_vat: number | null;
    }>(
      `SELECT id, transaction_id, label_url, tracking_number, status, price_gross, price_net, price_vat 
       FROM public.shipping_labels 
       WHERE external_order_id = $1 LIMIT 1`,
      [orderCode]
    );

    if (!labels || labels.length === 0) {
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

    const label = labels[0];

    // If label has transaction_id, verify the transaction belongs to the user
    if (label.transaction_id) {
      const supabase = await createServiceClient();
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

    // Map Eurosender status to our database status
    const dbStatus = mapEurosenderStatusToDbStatus(orderDetails.status);

    // Update shipping_labels table with latest data from Eurosender
    // This ensures our database stays in sync, especially for async label generation
    const updates: string[] = [];
    const updateValues: (string | number | null)[] = [];
    let paramIndex = 1;

    // Update status if it changed
    if (label.status !== dbStatus) {
      updates.push(`status = $${paramIndex}`);
      updateValues.push(dbStatus);
      paramIndex++;
    }

    // Update label_url if it became available (was empty/null before)
    if (orderDetails.labelUrl && (!label.label_url || label.label_url === "" || orderDetails.labelUrl !== label.label_url)) {
      updates.push(`label_url = $${paramIndex}`);
      updateValues.push(orderDetails.labelUrl);
      paramIndex++;
    }

    // Update tracking_number if it became available (was null before)
    if (orderDetails.trackingNumber && (!label.tracking_number || orderDetails.trackingNumber !== label.tracking_number)) {
      updates.push(`tracking_number = $${paramIndex}`);
      updateValues.push(orderDetails.trackingNumber);
      paramIndex++;
    }

    // Update price fields if they're missing or changed
    const priceGross = orderDetails.price?.original?.gross;
    const priceNet = orderDetails.price?.original?.net;
    const priceVat = orderDetails.price?.original?.vat;

    if (priceGross !== undefined && priceGross !== null) {
      // Update price_gross if missing or changed
      if (label.price_gross === null || Math.abs(label.price_gross - priceGross) > 0.01) {
        updates.push(`price_gross = $${paramIndex}`);
        updateValues.push(priceGross);
        paramIndex++;
      }
      // Update price_net if missing or changed
      if (priceNet !== undefined && priceNet !== null) {
        if (label.price_net === null || Math.abs((label.price_net || 0) - priceNet) > 0.01) {
          updates.push(`price_net = $${paramIndex}`);
          updateValues.push(priceNet);
          paramIndex++;
        }
      }
      // Update price_vat if missing or changed
      if (priceVat !== undefined && priceVat !== null) {
        if (label.price_vat === null || Math.abs((label.price_vat || 0) - priceVat) > 0.01) {
          updates.push(`price_vat = $${paramIndex}`);
          updateValues.push(priceVat);
          paramIndex++;
        }
      }
    }

    // Only update if there are changes
    if (updates.length > 0) {
      updateValues.push(orderCode); // For WHERE clause
      await query(
        `UPDATE public.shipping_labels 
         SET ${updates.join(", ")}, updated_at = NOW() 
         WHERE external_order_id = $${paramIndex}`,
        updateValues
      );
      
      // Log status history if status was updated
      if (label.status !== dbStatus) {
        await query(
          `INSERT INTO public.shipping_label_status_history 
           (shipping_label_id, status, error_message) 
           VALUES ($1, $2, NULL)`,
          [label.id, dbStatus]
        );
      }
      
      console.log(`[SHIPPING_LABEL] Updated shipping_labels for orderCode ${orderCode}:`, {
        updates,
        oldStatus: label.status,
        newStatus: dbStatus,
        eurosenderStatus: orderDetails.status,
      });
    }

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

