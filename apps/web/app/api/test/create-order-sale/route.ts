import { NextRequest } from "next/server";
import { MedusaOrderService } from "@/lib/services/medusa-order-service";
import { createServiceClient } from "@/lib/supabase/server";
import { ApiError } from "@/lib/api/errors";
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
    const body = await request.json();
    const { listingId, buyerId, shippingMethodName = "Eurosender Standard", shippingCost = 1500 } = body;

    if (!listingId || !buyerId) {
      return Response.json(
        { error: "Missing required fields: listingId, buyerId" },
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

    // Parse full_name into first_name and last_name
    const nameParts = shippingAddress.full_name.split(" ");
    const firstName = nameParts[0] || "";
    const lastName = nameParts.slice(1).join(" ") || "";

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

