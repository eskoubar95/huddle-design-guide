import { NextRequest } from "next/server";
import { rateLimitMiddleware } from "@/lib/api/rate-limit";
import { handleApiError } from "@/lib/api/errors";
import { query } from "@/lib/db/postgres-connection";
import * as Sentry from "@sentry/nextjs";

interface Country {
  iso_2: string;
  iso_3: string;
  num_code: string;
  name: string;
  display_name: string;
  region_id: string | null;
}

const handler = async (req: NextRequest) => {
  try {
    if (req.method !== "GET") {
      return new Response(null, { status: 405 });
    }

    const searchParams = req.nextUrl.searchParams;
    const regionId = searchParams.get("region_id"); // Optional filter for future use

    let countries: Country[];

    if (regionId) {
      // Filter by region_id (for future use when Medusa regions are configured)
      countries = await query<Country>(
        `
        SELECT 
          iso_2,
          iso_3,
          num_code,
          name,
          display_name,
          region_id
        FROM medusa.region_country
        WHERE region_id = $1
        ORDER BY display_name ASC
        `,
        [regionId]
      );
    } else {
      // Get all countries (current behavior)
      countries = await query<Country>(
        `
        SELECT 
          iso_2,
          iso_3,
          num_code,
          name,
          display_name,
          region_id
        FROM medusa.region_country
        ORDER BY display_name ASC
        `
      );
    }

    return Response.json({ countries });
  } catch (error) {
    Sentry.captureException(error, {
      extra: { url: req.url },
      tags: { component: "countries-api" },
    });
    return handleApiError(error, req);
  }
};

export const GET = rateLimitMiddleware(handler);
