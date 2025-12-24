import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { handleApiError } from "@/lib/api/errors";
import { successResponse } from "@/lib/api/responses";
import { MedusaOrderService } from "@/lib/services/medusa-order-service";
import { createServiceClient } from "@/lib/supabase/server";
import { ApiError } from "@/lib/api/errors";
// Sentry import removed - handled by handleApiError

/**
 * GET /api/v1/orders/[orderId]
 * Get order details (Medusa order + Huddle transaction data)
 * 
 * Auth: Buyer, seller, or admin can view
 */
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ orderId: string }> }
) {
  try {
    const auth = await requireAuth(req);
    const { orderId } = await context.params;

    const medusaOrderService = new MedusaOrderService();
    const order = await medusaOrderService.getOrder(orderId);

    // Get transaction data
    const supabase = await createServiceClient();
    const { data: transaction, error: txError } = await supabase
      .from("transactions")
      .select(`
        id,
        medusa_order_id,
        buyer_id,
        seller_id,
        listing_id,
        listing_type,
        item_amount,
        shipping_amount,
        platform_fee_amount,
        seller_fee_amount,
        seller_payout_amount,
        total_amount,
        currency,
        stripe_payment_intent_id,
        stripe_transfer_id,
        completed_at
      `)
      .eq("medusa_order_id", orderId)
      .single();

    if (txError || !transaction) {
      // Order exists but no transaction linked - return order only
      return successResponse({
        order,
        transaction: null,
      });
    }

    // Authorization check: buyer, seller, or admin can view
    const isBuyer = transaction.buyer_id === auth.userId;
    const isSeller = transaction.seller_id === auth.userId;
    const isAdmin = auth.userId === process.env.ADMIN_USER_ID; // TODO: Implement proper admin check

    if (!isBuyer && !isSeller && !isAdmin) {
      throw new ApiError(
        "FORBIDDEN",
        "You don't have permission to view this order",
        403
      );
    }

    // Get jersey data
    const listingId = transaction.listing_id;
    let jersey = null;

    if (transaction.listing_type === "sale") {
      const { data: listing } = await supabase
        .from("sale_listings")
        .select("jersey_id, jerseys(*)")
        .eq("id", listingId)
        .single();

      if (listing && listing.jerseys) {
        jersey = Array.isArray(listing.jerseys) ? listing.jerseys[0] : listing.jerseys;
      }
    } else if (transaction.listing_type === "auction") {
      const { data: auction } = await supabase
        .from("auctions")
        .select("jersey_id, jerseys(*)")
        .eq("id", listingId)
        .single();

      if (auction && auction.jerseys) {
        jersey = Array.isArray(auction.jerseys) ? auction.jerseys[0] : auction.jerseys;
      }
    }

    // Get shipping label if exists
    const { data: shippingLabel } = await supabase
      .from("shipping_labels")
      .select("tracking_number, label_url")
      .eq("transaction_id", transaction.id)
      .single();

    // Combine tracking info (priority: shipping_labels > Medusa metadata)
    const trackingNumber =
      shippingLabel?.tracking_number ||
      (order.metadata?.tracking_number as string) ||
      null;
    const shippingProvider =
      (order.metadata?.shipping_provider as string) ||
      null;

    return successResponse({
      order,
      transaction: {
        id: transaction.id,
        medusa_order_id: transaction.medusa_order_id,
        buyer_id: transaction.buyer_id,
        seller_id: transaction.seller_id,
        item_amount: transaction.item_amount,
        shipping_amount: transaction.shipping_amount,
        platform_fee_amount: transaction.platform_fee_amount,
        seller_fee_amount: transaction.seller_fee_amount,
        seller_payout_amount: transaction.seller_payout_amount,
        total_amount: transaction.total_amount,
        currency: transaction.currency,
        stripe_payment_intent_id: transaction.stripe_payment_intent_id,
        stripe_transfer_id: transaction.stripe_transfer_id,
        completed_at: transaction.completed_at,
      },
      jersey: jersey || null,
      shippingLabel: shippingLabel
        ? {
            tracking_number: shippingLabel.tracking_number,
            label_url: shippingLabel.label_url,
            shipping_provider: null, // Not stored in shipping_labels table
          }
        : null,
      tracking: {
        number: trackingNumber,
        provider: shippingProvider,
        url: null, // TODO: Generate tracking URL from provider if available
      },
    });
  } catch (error) {
    return handleApiError(error, req);
  }
}

/**
 * PATCH /api/v1/orders/[orderId]
 * Update order status
 * 
 * Body: { status: OrderStatus }
 * Auth: Seller (must own listing) or admin only
 */
export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ orderId: string }> }
) {
  try {
    const auth = await requireAuth(req);
    const { orderId } = await context.params;
    const body = await req.json();
    const { status } = body;

    if (!status) {
      throw new ApiError("BAD_REQUEST", "Status is required", 400);
    }

    // Get transaction to check ownership
    const supabase = await createServiceClient();
    const { data: transaction, error: txError } = await supabase
      .from("transactions")
      .select("seller_id")
      .eq("medusa_order_id", orderId)
      .single();

    if (txError || !transaction) {
      throw new ApiError("NOT_FOUND", "Order not found", 404);
    }

    // Authorization: Seller or admin only
    const isSeller = transaction.seller_id === auth.userId;
    const isAdmin = auth.userId === process.env.ADMIN_USER_ID; // TODO: Implement proper admin check

    if (!isSeller && !isAdmin) {
      throw new ApiError(
        "FORBIDDEN",
        "Only seller can update order status",
        403
      );
    }

    // Update order status
    const medusaOrderService = new MedusaOrderService();
    await medusaOrderService.updateOrderStatus(orderId, status);

    return successResponse({
      message: "Order status updated successfully",
      orderId,
      status,
    });
  } catch (error) {
    return handleApiError(error, req);
  }
}

