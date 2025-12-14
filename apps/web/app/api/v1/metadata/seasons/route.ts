import { NextRequest } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { rateLimitMiddleware } from '@/lib/api/rate-limit';
import { handleApiError } from '@/lib/api/errors';
import { query } from '@/lib/db/postgres-connection';

interface Season {
  id: string;
  label: string;
  start_year: number;
  end_year: number;
}

const handler = async (req: NextRequest) => {
  try {
    if (req.method !== 'GET') {
      return new Response(null, { status: 405 });
    }

    const searchParams = req.nextUrl.searchParams;
    const idParam = searchParams.get('id'); // Get by ID
    const labelParam = searchParams.get('label'); // Get by label

    let seasons: Season[];
    if (idParam) {
      // Get specific season by ID
      seasons = await query<Season>(
        `
        SELECT id, label, start_year, end_year
        FROM metadata.seasons
        WHERE id = $1
        LIMIT 1
        `,
        [idParam]
      );
    } else if (labelParam) {
      // Get specific season by label
      seasons = await query<Season>(
        `
        SELECT id, label, start_year, end_year
        FROM metadata.seasons
        WHERE label = $1
        LIMIT 1
        `,
        [labelParam]
      );
    } else {
      seasons = await query<Season>(
        `
        SELECT id, label, start_year, end_year
        FROM metadata.seasons
        ORDER BY start_year DESC
        LIMIT 20
        `
      );
    }

    return Response.json({ seasons });
  } catch (error) {
    Sentry.captureException(error, {
      extra: { url: req.url },
      tags: { component: 'metadata-seasons-api' },
    });
    return handleApiError(error, req);
  }
};

export const GET = rateLimitMiddleware(handler);

