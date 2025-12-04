import { NextRequest } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { rateLimitMiddleware } from '@/lib/api/rate-limit';
import { handleApiError } from '@/lib/api/errors';
import { query } from '@/lib/db/postgres-connection';

interface Club {
  id: string;
  name: string;
  crest_url?: string | null;
}

const handler = async (req: NextRequest) => {
  try {
    if (req.method !== 'GET') {
      return new Response(null, { status: 405 });
    }

    const searchParams = req.nextUrl.searchParams;
    const queryParam = searchParams.get('q'); // Search query
    const idParam = searchParams.get('id'); // Get by ID

    let clubs: Club[];
    if (idParam) {
      // Get specific club by ID
      clubs = await query<Club>(
        `
        SELECT id, name, crest_url
        FROM metadata.clubs
        WHERE id = $1
        LIMIT 1
        `,
        [idParam]
      );
    } else if (queryParam) {
      clubs = await query<Club>(
        `
        SELECT id, name, crest_url
        FROM metadata.clubs
        WHERE name ILIKE $1
        ORDER BY name
        LIMIT 50
        `,
        [`%${queryParam}%`]
      );
    } else {
      clubs = await query<Club>(
        `
        SELECT id, name, crest_url
        FROM metadata.clubs
        ORDER BY name
        LIMIT 50
        `
      );
    }

    return Response.json({ clubs });
  } catch (error) {
    Sentry.captureException(error, {
      extra: { url: req.url, query: req.nextUrl.searchParams.get('q') },
      tags: { component: 'metadata-clubs-api' },
    });
    return handleApiError(error, req);
  }
};

export const GET = rateLimitMiddleware(handler);

