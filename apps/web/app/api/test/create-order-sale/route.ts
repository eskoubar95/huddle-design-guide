import { NextRequest } from "next/server";
import { MedusaOrderService } from "@/lib/services/medusa-order-service";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth";
import * as Sentry from "@sentry/nextjs";

/**
 * POST /api/test/create-order-sale
 * Test endpoint for createOrderFromSale() service method
 * 
 * Body: {
 *   listingId: string,
 *   buyerId: string,
 *   shippingMethodName?: string,
 *   shippingCost?: number
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Only allow in development/test environments
    if (process.env.NODE_ENV === "production") {
      return Response.json(
        { error: "Test endpoints are not available in production" },
        { status: 404 }
      );
    }

    // Verify authentication even in test environments
    const auth = await requireAuth(request);
    const authenticatedBuyerId = auth.userId;

    const body = await request.json();
    const { listingId, shippingMethodName = "Eurosender Standard", shippingCost = 1500 } = body;
    
    // Use authenticated userId instead of accepting buyerId from client
    const buyerId = authenticatedBuyerId;

    if (!listingId) {
      return Response.json(
        { error: "Missing required field: listingId" },
        { status: 400 }
      );
    }

    const supabase = await createServiceClient();

    // Get buyer's default shipping address
    const { data: shippingAddress, error: addressError } = await supabase
      .from("shipping_addresses")
      .select("street, city, postal_code, country, state, address_line_2, phone, full_name")
      .eq("user_id", buyerId)
      .eq("is_default", true)
      .single();

    if (addressError || !shippingAddress) {
      return Response.json(
        { error: "Buyer does not have a default shipping address", details: addressError?.message },
        { status: 400 }
      );
    }

    // Parse full_name into first_name and last_name (guard against null/empty)
    const nameParts = (shippingAddress.full_name || "").trim().split(/\s+/);
    const firstName = nameParts[0] || "Customer";
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : "";

    // Create order via service
    const medusaOrderService = new MedusaOrderService();
    const order = await medusaOrderService.createOrderFromSale(
      listingId,
      buyerId,
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

    return Response.json({
      success: true,
      order,
      message: "Order created successfully",
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    Sentry.captureException(error, {
      tags: { component: "test_api", endpoint: "create-order-sale" },
      extra: { errorMessage },
    });

    return Response.json(
      { error: "Failed to create order", details: errorMessage },
      { status: 500 }
    );
  }
}

