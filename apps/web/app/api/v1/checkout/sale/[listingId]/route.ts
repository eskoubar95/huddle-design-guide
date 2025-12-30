import { NextRequest, NextResponse } from "next/server";
import { rateLimitMiddleware } from "@/lib/api/rate-limit";
import { requireAuth } from "@/lib/auth";
import { handleApiError, ApiError } from "@/lib/api/errors";
import { CheckoutService, CheckoutInitParams, ServicePointInfo } from "@/lib/services/checkout-service";
import { z } from "zod";
import * as Sentry from "@sentry/nextjs";

/**
 * POST /api/v1/checkout/sale/[listingId]
 * 
 * Initialize checkout for a sale listing.
 * Creates transaction, Medusa order, and Stripe Payment Intent.
 * 
 * Request body:
 * - shippingMethod: "home_delivery" | "pickup_point"
 * - shippingAddress: { street, city, postal_code, country, state?, full_name?, phone? }
 * - servicePoint?: { id, name, address, city, postal_code, country, provider }
 * - preferredTimeWindow?: string
 * - shippingCostCents: number
 * - quoteTimestamp?: string (for freshness validation)
 * 
 * Response:
 * - transactionId
 * - orderId
 * - clientSecret
 * - publishableKey
 * - breakdown: { itemCents, shippingCents, platformFeeCents, totalCents, currency }
 * - shippingMethod
 * - servicePoint?
 */

const checkoutSchema = z.object({
  shippingMethod: z.enum(["home_delivery", "pickup_point"]),
  shippingAddress: z.object({
    street: z.string().min(1, "Street is required"),
    city: z.string().min(1, "City is required"),
    postal_code: z.string().min(1, "Postal code is required"),
    country: z.string().length(2, "Country must be ISO 2-letter code"),
    state: z.string().optional(),
    full_name: z.string().optional(),
    phone: z.string().optional(),
  }),
  servicePoint: z.object({
    id: z.string().min(1),
    name: z.string().min(1),
    address: z.string().min(1),
    city: z.string().min(1),
    postal_code: z.string().min(1),
    country: z.string().length(2),
    provider: z.string().min(1),
  }).optional(),
  preferredTimeWindow: z.string().optional(),
  shippingCostCents: z.number().int().min(0),
  quoteTimestamp: z.string().optional(),
});

type CheckoutRequestBody = z.infer<typeof checkoutSchema>;

const handler = async (
  req: NextRequest,
  { params }: { params: Promise<{ listingId: string }> }
) => {
  const resolvedParams = await params;
  const { listingId } = resolvedParams;

  try {
    // Validate listingId format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(listingId)) {
      throw new ApiError("BAD_REQUEST", "Invalid listing ID format.", 400);
    }

    // Authenticate buyer
    const { userId } = await requireAuth(req);
    if (!userId) {
      throw new ApiError("UNAUTHORIZED", "Authentication required.", 401);
    }

    // Parse and validate request body
    const body = await req.json();
    const validationResult = checkoutSchema.safeParse(body);

    if (!validationResult.success) {
      const errors = validationResult.error.issues
        .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
        .join(", ");
      throw new ApiError("BAD_REQUEST", `Invalid request: ${errors}`, 400);
    }

    const data: CheckoutRequestBody = validationResult.data;

    // Validate pickup_point requires servicePoint
    if (data.shippingMethod === "pickup_point" && !data.servicePoint) {
      throw new ApiError(
        "BAD_REQUEST",
        "Service point is required for pickup point delivery.",
        400
      );
    }

    // Initialize checkout service
    const checkoutService = new CheckoutService();

    // Validate quote freshness (optional)
    if (data.quoteTimestamp) {
      const isFresh = await checkoutService.validateQuoteFreshness(data.quoteTimestamp);
      if (!isFresh) {
        throw new ApiError(
          "STALE_DATA",
          "Shipping quote has expired. Please refresh and try again.",
          409
        );
      }
    }

    // Build checkout params
    const checkoutParams: CheckoutInitParams = {
      listingId,
      buyerId: userId,
      shippingMethod: data.shippingMethod,
      shippingAddress: data.shippingAddress,
      servicePoint: data.servicePoint as ServicePointInfo | undefined,
      preferredTimeWindow: data.preferredTimeWindow,
      shippingCostCents: data.shippingCostCents,
      shippingQuoteId: data.quoteTimestamp, // Used for freshness check
    };

    // Initialize checkout
    const result = await checkoutService.initCheckout(checkoutParams);

    // Log successful checkout
    Sentry.addBreadcrumb({
      category: "checkout",
      message: "Checkout API: Checkout initiated",
      level: "info",
      data: {
        listingIdPrefix: listingId.slice(0, 8),
        transactionIdPrefix: result.transactionId.slice(0, 8),
        shippingMethod: data.shippingMethod,
      },
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    // Log error without PII
    Sentry.captureException(error, {
      tags: { 
        component: "checkout_sale_api",
        operation: "init_checkout",
      },
      extra: { 
        listingIdPrefix: listingId.slice(0, 8),
      },
    });

    return handleApiError(error, req);
  }
};

export const POST = rateLimitMiddleware(handler);

/**
 * GET /api/v1/checkout/sale/[listingId]
 * 
 * Get listing details for checkout page.
 * Validates listing is active and buyer can purchase.
 */
const getHandler = async (
  req: NextRequest,
  { params }: { params: Promise<{ listingId: string }> }
) => {
  const resolvedParams = await params;
  const { listingId } = resolvedParams;

  try {
    // Validate listingId format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(listingId)) {
      throw new ApiError("BAD_REQUEST", "Invalid listing ID format.", 400);
    }

    // Authenticate buyer
    const { userId } = await requireAuth(req);
    if (!userId) {
      throw new ApiError("UNAUTHORIZED", "Authentication required.", 401);
    }

    const checkoutService = new CheckoutService();
    const listing = await checkoutService.getListingForCheckout(listingId, userId);

    return NextResponse.json({ listing });
  } catch (error) {
    Sentry.captureException(error, {
      tags: { 
        component: "checkout_sale_api",
        operation: "get_listing",
      },
      extra: { 
        listingIdPrefix: listingId.slice(0, 8),
      },
    });

    return handleApiError(error, req);
  }
};

export const GET = rateLimitMiddleware(getHandler);

