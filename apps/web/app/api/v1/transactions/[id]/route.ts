import { NextRequest } from "next/server";
import { rateLimitMiddleware } from "@/lib/api/rate-limit";
import { requireAuth } from "@/lib/auth";
import { handleApiError } from "@/lib/api/errors";
import { createServiceClient } from "@/lib/supabase/server";
import * as Sentry from "@sentry/nextjs";

const handler = async (
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) => {
  try {
    if (req.method !== "GET") {
      return new Response(null, { status: 405 });
    }

    const { userId } = await requireAuth(req);
    const { id } = await context.params;

    if (!id) {
      return Response.json(
        {
          error: {
            code: "BAD_REQUEST",
            message: "Transaction ID is required",
          },
        },
        { status: 400 }
      );
    }

    const supabase = await createServiceClient();
    const { data: transaction, error } = await supabase
      .from("transactions")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !transaction) {
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

    // Verify user is either seller or buyer
    if (transaction.seller_id !== userId && transaction.buyer_id !== userId) {
      return Response.json(
        {
          error: {
            code: "FORBIDDEN",
            message: "Access denied",
          },
        },
        { status: 403 }
      );
    }

    return Response.json(transaction);
  } catch (error) {
    const { id } = await context.params;
    Sentry.captureException(error, {
      extra: { url: req.url, transactionId: id },
      tags: {
        component: "transactions-api",
        operation: "get_transaction",
      },
    });
    return handleApiError(error, req);
  }
};

export const GET = rateLimitMiddleware(handler);


