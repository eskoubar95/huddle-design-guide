/**
 * Admin endpoint to enable transfers capability for a Connect account
 * This is required for destination charges to work
 *
 * POST /api/v1/admin/stripe/enable-transfers
 * Body: { stripeAccountId: "acct_xxx" }
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { StripeService } from "@/lib/services/stripe-service";
import { handleApiError, ApiError } from "@/lib/api/errors";

// Admin user IDs from environment variable (comma-separated)
// Falls back to hardcoded list for backward compatibility
const ADMIN_USER_IDS = (process.env.ADMIN_USER_IDS || "user_36q2GEsU4OIQe2yXhepsR5twIxz")
  .split(",")
  .map((id) => id.trim())
  .filter(Boolean);

async function handler(req: NextRequest): Promise<NextResponse> {
  const authResult = await requireAuth(req);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  // Only allow admin users
  if (!ADMIN_USER_IDS.includes(authResult.userId)) {
    throw new ApiError("FORBIDDEN", "Admin access required", 403);
  }

  try {
    const body = await req.json();
    const { stripeAccountId } = body;

    if (!stripeAccountId || !stripeAccountId.startsWith("acct_")) {
      throw new ApiError(
        "BAD_REQUEST",
        "Invalid stripeAccountId. Must start with acct_",
        400
      );
    }

    const stripeService = new StripeService();

    // First check current capabilities
    const account = await stripeService.getConnectAccount(stripeAccountId);
    console.log("[ADMIN] Current capabilities for", stripeAccountId, {
      transfers: account.capabilities?.transfers,
      card_payments: account.capabilities?.card_payments,
    });

    // Request transfers capability
    const result = await stripeService.requestTransfersCapability(stripeAccountId);

    return NextResponse.json({
      success: true,
      message: "Transfers capability requested",
      stripeAccountId,
      capabilities: result.capabilities,
    });
  } catch (error) {
    return handleApiError(error, req) as NextResponse;
  }
}

export const POST = handler;

