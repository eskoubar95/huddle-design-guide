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
  // Note: PostgreSQL UUID type is more lenient than Zod's strict UUID validator
  // We accept any string that PostgreSQL would accept as UUID
  transactionId: z.string().regex(
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    "Transaction ID must be a valid UUID format"
  ),
  
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
  // Note: "credit" uses prepaid credit on Huddle's Eurosender account
  // "deferred" requires invoicing setup and is not available in sandbox
  paymentMethod: z.enum(["credit", "deferred"]).default("credit"),
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
    
    // Validate request body with better error messages
    let validated;
    try {
      validated = createLabelSchema.parse(body);
    } catch (error) {
      if (error instanceof z.ZodError) {
        // Check if transactionId validation failed
        const transactionIdError = error.issues.find((e) => e.path.includes("transactionId"));
        if (transactionIdError) {
          return Response.json(
            {
              error: {
                code: "VALIDATION_ERROR",
                message: `Invalid transaction ID format: ${transactionIdError.message}. Transaction ID must be a valid UUID (e.g., 550e8400-e29b-41d4-a716-446655440000).`,
              },
            },
            { status: 400 }
          );
        }
      }
      throw error; // Re-throw if not a transactionId error
    }

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
      alreadyExisted: result.alreadyExisted, // Indicate if label was already generated
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

