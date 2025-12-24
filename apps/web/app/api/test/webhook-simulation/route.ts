import { NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import * as Sentry from "@sentry/nextjs";

/**
 * POST /api/test/webhook-simulation
 * Simulate Stripe webhook payment_intent.succeeded event
 * 
 * Body: {
 *   transactionId: string
 * }
 * 
 * This simulates what happens when Stripe sends payment_intent.succeeded webhook
 * after a successful payment. The webhook handler should create a Medusa order.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { transactionId } = body;

    if (!transactionId) {
      return Response.json(
        { error: "Missing required field: transactionId" },
        { status: 400 }
      );
    }

    const supabase = await createServiceClient();

    // Get transaction
    const { data: transaction, error: txError } = await supabase
      .from("transactions")
      .select("id, medusa_order_id, buyer_id, listing_id, listing_type, shipping_amount, item_amount, total_amount, status")
      .eq("id", transactionId)
      .single();

    if (txError || !transaction) {
      return Response.json(
        { error: "Transaction not found", details: txError?.message },
        { status: 404 }
      );
    }

    // Check if order already exists (idempotency)
    if (transaction.medusa_order_id) {
      return Response.json({
        success: true,
        message: "Order already exists (idempotency check)",
        orderId: transaction.medusa_order_id,
        skipped: true,
      });
    }

    // Simulate webhook logic (same as in webhook/route.ts)
    // Import webhook handler logic
    const { MedusaOrderService } = await import("@/lib/services/medusa-order-service");
    const medusaOrderService = new MedusaOrderService();

    // Get shipping address
    const { data: shippingAddress, error: addressError } = await supabase
      .from("shipping_addresses")
      .select("street, city, postal_code, country, state, address_line_2, phone, full_name")
      .eq("user_id", transaction.buyer_id)
      .eq("is_default", true)
      .single();

    if (addressError || !shippingAddress) {
      return Response.json(
        {
          success: false,
          error: "Shipping address not found",
          details: addressError?.message,
          note: "This is non-blocking in real webhook - transaction would still be marked as completed",
        },
        { status: 400 }
      );
    }

    // Parse full_name
    const nameParts = shippingAddress.full_name.split(" ");
    const firstName = nameParts[0] || "";
    const lastName = nameParts.slice(1).join(" ") || "";

    // Get shipping method and cost
    const shippingMethodName = "Eurosender Standard"; // Default
    const shippingCost = transaction.shipping_amount 
      ? Math.round(Number(transaction.shipping_amount)) 
      : 0;

    // Create order based on listing type
    let order;
    if (transaction.listing_type === "sale") {
      order = await medusaOrderService.createOrderFromSale(
        transaction.listing_id,
        transaction.buyer_id,
        {
          street: shippingAddress.street,
          city: shippingAddress.city,
          postal_code: shippingAddress.postal_code,
          country: shippingAddress.country,
          state: shippingAddress.state || undefined,
          address_line2: shippingAddress.address_line_2 || undefined,
          phone: shippingAddress.phone || undefined,
          first_name: firstName,
          last_name: lastName,
        },
        shippingMethodName,
        shippingCost
      );
    } else if (transaction.listing_type === "auction") {
      order = await medusaOrderService.createOrderFromAuction(
        transaction.listing_id,
        transaction.buyer_id,
        {
          street: shippingAddress.street,
          city: shippingAddress.city,
          postal_code: shippingAddress.postal_code,
          country: shippingAddress.country,
          state: shippingAddress.state || undefined,
          address_line2: shippingAddress.address_line_2 || undefined,
          phone: shippingAddress.phone || undefined,
          first_name: firstName,
          last_name: lastName,
        },
        shippingMethodName,
        shippingCost
      );
    } else {
      return Response.json(
        { error: "Invalid listing_type", listingType: transaction.listing_type },
        { status: 400 }
      );
    }

    // Update transaction with Medusa order ID
    const { error: orderUpdateError } = await supabase
      .from("transactions")
      .update({ medusa_order_id: order.id })
      .eq("id", transactionId);

    if (orderUpdateError) {
      Sentry.captureException(orderUpdateError, {
        tags: { component: "test_api", endpoint: "webhook-simulation" },
        extra: { transactionId, orderId: order.id },
      });
    }

    return Response.json({
      success: true,
      order,
      transactionUpdated: !orderUpdateError,
      message: "Order created and transaction updated successfully",
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    Sentry.captureException(error, {
      tags: { component: "test_api", endpoint: "webhook-simulation" },
      extra: { errorMessage },
    });

    return Response.json(
      { error: "Failed to simulate webhook", details: errorMessage },
      { status: 500 }
    );
  }
}

