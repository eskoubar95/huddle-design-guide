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

    const supabase = await createServiceClient();
    const { data: addresses, error } = await supabase
      .from("shipping_addresses")
      .select("*")
      .eq("user_id", userId)
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

