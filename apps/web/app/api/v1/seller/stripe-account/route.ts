import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { handleApiError } from "@/lib/api/errors";
import { successResponse } from "@/lib/api/responses";
import { createServiceClient } from "@/lib/supabase/server";
import { rateLimitMiddleware } from "@/lib/api/rate-limit";

/**
 * GET /api/v1/seller/stripe-account
 * Get current user's Stripe Connect account status
 *
 * Returns:
 * - account object (if exists) with:
 *   - id: UUID
 *   - stripe_account_id: Stripe account ID (acct_xxx)
 *   - status: 'pending' | 'active' | 'restricted'
 *   - payouts_enabled: boolean
 *   - charges_enabled: boolean
 *   - created_at: timestamp
 *   - updated_at: timestamp
 * - null if no account exists
 */
const handler = async (req: NextRequest) => {
  try {
    const { userId } = await requireAuth(req);
    const supabase = await createServiceClient();

    const { data: account, error } = await supabase
      .from("stripe_accounts")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (error && error.code !== "PGRST116") {
      // PGRST116 = no rows returned (account doesn't exist)
      throw error;
    }

    return successResponse(account || null);
  } catch (error) {
    return handleApiError(error, req);
  }
};

export const GET = rateLimitMiddleware(handler);
