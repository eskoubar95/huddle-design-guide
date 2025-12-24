import { NextRequest } from "next/server";
import { rateLimitMiddleware } from "@/lib/api/rate-limit";
import { handleApiError } from "@/lib/api/errors";
import { paginatedResponse } from "@/lib/api/responses";
import { requireAuth } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { ApiError } from "@/lib/api/errors";
import { z } from "zod";
import { query } from "@/lib/db/postgres-connection";

const ordersListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.string().optional(),
  sellerId: z.string().optional(),
  buyerId: z.string().optional(),
  status: z.enum(["pending", "paid", "shipped", "delivered", "completed", "cancelled"]).optional(),
});

/**
 * GET /api/v1/orders
 * List orders with filters (sellerId, buyerId, status)
 * 
 * Auth: User can only see own orders (sellerId or buyerId must match)
 * Pagination: Cursor-based
 */
const handler = async (req: NextRequest) => {
  try {
    const auth = await requireAuth(req);
    const searchParams = req.nextUrl.searchParams;

    // Parse query parameters
    const getParam = (key: string): string | undefined => {
      const value = searchParams.get(key);
      return value === null ? undefined : value;
    };

    const queryParams = ordersListQuerySchema.parse({
      limit: getParam("limit"),
      cursor: getParam("cursor"),
      sellerId: getParam("sellerId"),
      buyerId: getParam("buyerId"),
      status: getParam("status"),
    });

    // Authorization: User must be requesting their own orders
    if (queryParams.sellerId && queryParams.sellerId !== auth.userId) {
      throw new ApiError("FORBIDDEN", "You can only view your own orders", 403);
    }
    if (queryParams.buyerId && queryParams.buyerId !== auth.userId) {
      throw new ApiError("FORBIDDEN", "You can only view your own orders", 403);
    }

    // If no sellerId or buyerId specified, default to current user
    const sellerId = queryParams.sellerId || auth.userId;
    const buyerId = queryParams.buyerId || auth.userId;

    // Get transactions with orders
    const supabase = await createServiceClient();
    let transactionsQuery = supabase
      .from("transactions")
      .select(`
        id,
        medusa_order_id,
        buyer_id,
        seller_id,
        listing_id,
        listing_type,
        status,
        total_amount,
        currency,
        completed_at,
        created_at
      `)
      .order("created_at", { ascending: false })
      .limit(queryParams.limit + 1); // Fetch one extra for pagination

    // Apply filters - ensure user can only see their own orders
    if (queryParams.sellerId && queryParams.buyerId) {
      // Both specified - filter by both (AND)
      transactionsQuery = transactionsQuery
        .eq("seller_id", sellerId)
        .eq("buyer_id", buyerId);
    } else if (queryParams.sellerId) {
      transactionsQuery = transactionsQuery.eq("seller_id", sellerId);
    } else if (queryParams.buyerId) {
      transactionsQuery = transactionsQuery.eq("buyer_id", buyerId);
    } else {
      // Default: show orders where user is either buyer or seller
      transactionsQuery = transactionsQuery.or(
        `seller_id.eq.${auth.userId},buyer_id.eq.${auth.userId}`
      );
    }
    if (queryParams.status) {
      // Note: Status filter applies to transaction status, not order status
      // For order status filtering, we'd need to join with medusa.order
      transactionsQuery = transactionsQuery.eq("status", queryParams.status);
    }

    // Cursor pagination
    if (queryParams.cursor) {
      try {
        // Decode cursor (format: base64 encoded JSON with id and createdAt)
        const cursorData = JSON.parse(
          Buffer.from(queryParams.cursor, "base64").toString("utf-8")
        );
        // Use lt for created_at comparison (cursor-based pagination)
        transactionsQuery = transactionsQuery.lt("created_at", cursorData.createdAt);
      } catch {
        throw new ApiError("BAD_REQUEST", "Invalid cursor", 400);
      }
    }

    // Only get transactions with orders (medusa_order_id is not null)
    transactionsQuery = transactionsQuery.not("medusa_order_id", "is", null);

    const { data: transactions, error: txError } = await transactionsQuery;

    if (txError) {
      throw new ApiError(
        "INTERNAL_ERROR",
        `Failed to fetch transactions: ${txError.message}`,
        500
      );
    }

    const transactionItems = transactions || [];
    const hasMore = transactionItems.length > queryParams.limit;
    const result = hasMore ? transactionItems.slice(0, queryParams.limit) : transactionItems;

    // Get order data for each transaction
    const orderIds = result
      .map((t) => t.medusa_order_id)
      .filter((id): id is string => id !== null);

    // Fetch orders from Medusa
    const orders = await query<{
      id: string;
      status: string;
      created_at: string;
      updated_at: string;
    }>(
      `
      SELECT id, status, created_at, updated_at
      FROM medusa.order
      WHERE id = ANY($1)
      `,
      [orderIds]
    );

    const ordersMap = new Map(orders.map((o) => [o.id, o]));

    // Fetch jersey data for each order (via listing)
    const listingIds = result
      .map((t) => t.listing_id)
      .filter((id): id is string => id !== null);

    interface JerseyData {
      id: string;
      images: string[];
      club: string;
      season: string;
      jersey_type: string;
      player_name?: string | null;
    }
    const jerseysMap = new Map<string, JerseyData>();
    if (listingIds.length > 0) {
      // Get jerseys via sale_listings or auctions
      const { data: saleListings } = await supabase
        .from("sale_listings")
        .select("id, jersey_id, jerseys(*)")
        .in("id", listingIds);

      const { data: auctions } = await supabase
        .from("auctions")
        .select("id, jersey_id, jerseys(*)")
        .in("id", listingIds);

      // Map jerseys by listing ID
      interface ListingWithJersey {
        id: string;
        jersey_id: string;
        jerseys: JerseyData | JerseyData[] | null;
      }

      (saleListings as ListingWithJersey[] | null)?.forEach((listing) => {
        if (listing.jerseys) {
          const jersey: JerseyData = Array.isArray(listing.jerseys) ? listing.jerseys[0] : listing.jerseys;
          jerseysMap.set(listing.id, jersey);
        }
      });

      (auctions as ListingWithJersey[] | null)?.forEach((auction) => {
        if (auction.jerseys) {
          const jersey: JerseyData = Array.isArray(auction.jerseys) ? auction.jerseys[0] : auction.jerseys;
          jerseysMap.set(auction.id, jersey);
        }
      });
    }

    // Combine transaction, order, and jersey data
    const items = result.map((transaction) => {
      const order = ordersMap.get(transaction.medusa_order_id!);
      const jersey = jerseysMap.get(transaction.listing_id);
      return {
        id: transaction.medusa_order_id!,
        transactionId: transaction.id,
        status: order?.status || "pending",
        buyerId: transaction.buyer_id,
        sellerId: transaction.seller_id,
        listingId: transaction.listing_id,
        listingType: transaction.listing_type,
        totalAmount: transaction.total_amount,
        currency: transaction.currency,
        completedAt: transaction.completed_at,
        createdAt: order?.created_at || transaction.created_at,
        updatedAt: order?.updated_at || transaction.created_at,
        jersey: jersey || null,
      };
    });

    // Generate next cursor
    const nextCursor =
      hasMore && result.length > 0 && result[result.length - 1].created_at
        ? Buffer.from(
            JSON.stringify({
              id: result[result.length - 1].id,
              createdAt: result[result.length - 1].created_at,
            })
          ).toString("base64")
        : null;

    return paginatedResponse(items, nextCursor);
  } catch (error) {
    return handleApiError(error, req);
  }
};

export const GET = rateLimitMiddleware(handler);

