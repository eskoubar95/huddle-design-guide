import { NextRequest } from "next/server";
import { rateLimitMiddleware } from "@/lib/api/rate-limit";
import { requireAuth } from "@/lib/auth";
import { handleApiError } from "@/lib/api/errors";
import { ShippingLabelService } from "@/lib/services/shipping-label-service";
import { createServiceClient } from "@/lib/supabase/server";
import { z } from "zod";
import * as Sentry from "@sentry/nextjs";

const createLabelSchema = z.object({
  // Transaction ID (required for validation)
  transactionId: z.string().uuid(),
  
  // Quote information (from previous quote request)
  serviceType: z.string(), // e.g., "flexi", "regular_plus", "express"
  quoteId: z.string().optional(), // Optional quote ID reference

  // Addresses
  pickupAddress: z.object({
    country: z.string().length(2),
    zip: z.string().min(1),
    city: z.string().min(1),
    street: z.string().min(1),
    region: z.string().optional(),
  }),
  deliveryAddress: z.object({
    country: z.string().length(2),
    zip: z.string().min(1),
    city: z.string().min(1),
    street: z.string().min(1),
    region: z.string().optional(),
  }),

  // Contacts
  pickupContact: z.object({
    name: z.string().min(1),
    phone: z.string().min(1),
    email: z.string().email(),
    company: z.string().optional(),
  }),
  deliveryContact: z.object({
    name: z.string().min(1),
    phone: z.string().min(1),
    email: z.string().email(),
    company: z.string().optional(),
  }),

  // Parcels
  parcels: z.object({
    packages: z.array(
      z.object({
        parcelId: z.string(),
        quantity: z.number().int().positive(),
        width: z.number().positive(), // cm
        height: z.number().positive(), // cm
        length: z.number().positive(), // cm
        weight: z.number().positive(), // kg
        content: z.string().optional(),
        value: z.number().optional(), // EUR
      })
    ),
  }),

  // Optional fields
  paymentMethod: z.enum(["credit", "deferred"]).default("deferred"),
  labelFormat: z.enum(["pdf", "zpl"]).optional(),
  shippingMethodType: z.enum(["home_delivery", "pickup_point"]).default("home_delivery"),
});

const handler = async (req: NextRequest) => {
  try {
    if (req.method !== "POST") {
      return new Response(null, { status: 405 });
    }

    const { userId } = await requireAuth(req);

    const body = await req.json();
    const validated = createLabelSchema.parse(body);

    // Verify user is seller (via transaction ownership)
    const supabase = await createServiceClient();
    const { data: transaction, error: txError } = await supabase
      .from("transactions")
      .select("seller_id")
      .eq("id", validated.transactionId)
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
            message: "Access denied: You must be the seller to create shipping labels",
          },
        },
        { status: 403 }
      );
    }

    // Create label via ShippingLabelService
    const labelService = new ShippingLabelService();
    const result = await labelService.createLabel({
      transactionId: validated.transactionId,
      serviceType: validated.serviceType,
      pickupAddress: validated.pickupAddress,
      deliveryAddress: validated.deliveryAddress,
      parcels: validated.parcels,
      pickupContact: validated.pickupContact,
      deliveryContact: validated.deliveryContact,
      paymentMethod: validated.paymentMethod,
      labelFormat: validated.labelFormat,
      quoteId: validated.quoteId,
      shippingMethodType: validated.shippingMethodType,
    });

    return Response.json({
      orderCode: result.orderCode,
      status: "purchased",
      labelUrl: result.labelUrl,
      trackingNumber: result.trackingNumber,
      alreadyExisted: !!result.label.id, // Indicate if label was already generated
    });
  } catch (error) {
    Sentry.captureException(error, {
      extra: { url: req.url },
      tags: { component: "shipping-labels-api", operation: "create_label" },
    });
    return handleApiError(error, req);
  }
};

export const POST = rateLimitMiddleware(handler);

