import { NextRequest } from "next/server";
import { rateLimitMiddleware } from "@/lib/api/rate-limit";
import { requireAuth } from "@/lib/auth";
import { handleApiError } from "@/lib/api/errors";
import { EurosenderService } from "@/lib/services/eurosender-service";
import { z } from "zod";
import * as Sentry from "@sentry/nextjs";

const quoteSchema = z.object({
  shipment: z.object({
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
    pickupDate: z.string().optional(), // RFC 3339 format
  }),
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
  paymentMethod: z.enum(["credit", "deferred"]).optional().default("credit"),
  currencyCode: z.string().optional().default("EUR"),
});

const handler = async (req: NextRequest) => {
  try {
    if (req.method !== "POST") {
      return new Response(null, { status: 405 });
    }

    await requireAuth(req); // Verify authentication

    const body = await req.json();
    const validated = quoteSchema.parse(body);

    // Normalize country codes to uppercase (Eurosender API requirement)
    const normalizedBody = {
      ...validated,
      shipment: {
        ...validated.shipment,
        pickupAddress: {
          ...validated.shipment.pickupAddress,
          country: validated.shipment.pickupAddress.country.toUpperCase(),
        },
        deliveryAddress: {
          ...validated.shipment.deliveryAddress,
          country: validated.shipment.deliveryAddress.country.toUpperCase(),
        },
      },
    };

    const eurosenderService = new EurosenderService();
    const quotes = await eurosenderService.getQuotes(normalizedBody);

    return Response.json({
      options: quotes.options,
    });
  } catch (error) {
    Sentry.captureException(error, {
      extra: { url: req.url },
      tags: { component: "shipping-quotes-api" },
    });
    return handleApiError(error, req);
  }
};

export const POST = rateLimitMiddleware(handler);


