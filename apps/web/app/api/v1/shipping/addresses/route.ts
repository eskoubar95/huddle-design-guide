import { NextRequest } from "next/server";
import { rateLimitMiddleware } from "@/lib/api/rate-limit";
import { requireAuth } from "@/lib/auth";
import { handleApiError } from "@/lib/api/errors";
import { createServiceClient } from "@/lib/supabase/server";
import * as Sentry from "@sentry/nextjs";

const handler = async (req: NextRequest) => {
  try {
    if (req.method !== "GET") {
      return new Response(null, { status: 405 });
    }

    const { userId } = await requireAuth(req);

    // Support userId query param for fetching addresses for a specific user (e.g., buyer)
    // Allow seller to fetch buyer addresses if they have a transaction together
    const searchParams = req.nextUrl.searchParams;
    const requestedUserId = searchParams.get("userId");

    let targetUserId = userId;
    
    // If userId param is provided
    if (requestedUserId) {
      if (requestedUserId === userId) {
        // User fetching own addresses - always allowed
        targetUserId = requestedUserId;
      } else {
        // Seller fetching buyer address - verify they have a transaction together
        const supabase = await createServiceClient();
        const { data: transaction } = await supabase
          .from("transactions")
          .select("id")
          .eq("seller_id", userId)
          .eq("buyer_id", requestedUserId)
          .limit(1)
          .single();

        if (transaction) {
          // Seller and buyer have a transaction together - allow access
          targetUserId = requestedUserId;
        } else {
          // No transaction found - deny access
          return Response.json(
            {
              error: {
                code: "FORBIDDEN",
                message: "Access denied: You can only fetch addresses for users you have transactions with",
              },
            },
            { status: 403 }
          );
        }
      }
    }

    const supabase = await createServiceClient();
    const { data: addresses, error } = await supabase
      .from("shipping_addresses")
      .select("*")
      .eq("user_id", targetUserId)
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    return Response.json({ addresses: addresses || [] });
  } catch (error) {
    Sentry.captureException(error, {
      extra: { url: req.url },
      tags: { component: "shipping-addresses-api" },
    });
    return handleApiError(error, req);
  }
};

export const GET = rateLimitMiddleware(handler);

