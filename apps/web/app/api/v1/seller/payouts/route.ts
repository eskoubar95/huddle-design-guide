import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { handleApiError } from "@/lib/api/errors";
import { successResponse } from "@/lib/api/responses";
import { createServiceClient } from "@/lib/supabase/server";
import { rateLimitMiddleware } from "@/lib/api/rate-limit";

/**
 * GET /api/v1/seller/payouts
 * Get seller payout history
 *
 * Query params:
 * - limit: Number of results (default: 20, max: 100)
 * - cursor: Pagination cursor (completed_at timestamp)
 *
 * Returns:
 * - payouts: Array of transactions with transfer_id
 * - nextCursor: Cursor for next page (or null)
 */
const handler = async (req: NextRequest) => {
  try {
    const { userId } = await requireAuth(req);
    const supabase = await createServiceClient();

    const searchParams = req.nextUrl.searchParams;
    const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 100);
    const cursor = searchParams.get("cursor") || undefined;

    // Get transactions where user is seller and has transfer_id (payout completed)
    // Filter out NULL completed_at to ensure stable pagination
    let query = supabase
      .from("transactions")
      .select("*")
      .eq("seller_id", userId)
      .not("stripe_transfer_id", "is", null)
      .not("completed_at", "is", null)
      .order("completed_at", { ascending: false })
      .limit(limit);

    if (cursor) {
      query = query.lt("completed_at", cursor);
    }

    const { data: transactions, error } = await query;

    if (error) {
      throw error;
    }

    return successResponse({
      payouts: transactions || [],
      nextCursor: transactions && transactions.length === limit
        ? transactions[transactions.length - 1].completed_at
        : null,
    });
  } catch (error) {
    return handleApiError(error, req);
  }
};

export const GET = rateLimitMiddleware(handler);
