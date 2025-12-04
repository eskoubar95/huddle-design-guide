import { NextRequest } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { rateLimitMiddleware } from '@/lib/api/rate-limit';
import { handleApiError } from '@/lib/api/errors';
import { query } from '@/lib/db/postgres-connection';
import { TransfermarktService } from '@/lib/services/transfermarkt-service';

interface Club {
  id: string;
  name: string;
  crest_url?: string | null;
  source: 'database' | 'transfermarkt';
}

const handler = async (req: NextRequest) => {
  try {
    if (req.method !== 'GET') {
      return new Response(null, { status: 405 });
    }

    const searchParams = req.nextUrl.searchParams;
    const queryParam = searchParams.get('q');

    if (!queryParam || queryParam.trim().length < 2) {
      return Response.json({ clubs: [] });
    }

    const searchTerm = queryParam.trim();
    const allClubs: Club[] = [];

    // Step 1: Search in our database first
    // Search both name and official_name to handle local language names (e.g., AI analyzer gives "FC København", official_name contains local name)
    try {
      const dbClubs = await query<{ id: string; name: string; crest_url: string | null }>(
        `
        SELECT id, name, crest_url
        FROM metadata.clubs
        WHERE name ILIKE $1
           OR official_name ILIKE $1
        ORDER BY 
          CASE 
            WHEN LOWER(name) = LOWER($2) THEN 1
            WHEN LOWER(official_name) = LOWER($2) THEN 1
            WHEN LOWER(name) LIKE LOWER($3) THEN 2
            WHEN LOWER(official_name) LIKE LOWER($3) THEN 2
            ELSE 3
          END,
          name
        LIMIT 20
        `,
        [`%${searchTerm}%`, searchTerm, `${searchTerm}%`]
      );

      if (dbClubs && dbClubs.length > 0) {
        allClubs.push(
          ...dbClubs.map((club) => ({
            id: club.id,
            name: club.name,
            crest_url: club.crest_url,
            source: 'database' as const,
          }))
        );
      }
    } catch (dbError) {
      console.error('[CLUB-SEARCH] Database search error:', dbError);
      Sentry.captureException(dbError, {
        extra: { searchTerm },
        tags: { component: 'metadata-clubs-search-db' },
      });
      // Continue to Transfermarkt search even if DB search fails
    }

    // Step 2: If we have less than 10 results, search Transfermarkt API
    if (allClubs.length < 10) {
      try {
        const transfermarktService = new TransfermarktService();
        const tmClubs = await transfermarktService.searchClubs(searchTerm);

        if (tmClubs && tmClubs.length > 0) {
          // Filter out clubs that are already in our database
          const dbClubIds = new Set(allClubs.map((c) => c.id));
          const tmClubsFiltered = tmClubs
            .filter((tmClub) => !dbClubIds.has(tmClub.id))
            .slice(0, 10 - allClubs.length); // Limit to fill up to 10 total

          allClubs.push(
            ...tmClubsFiltered.map((club) => ({
              id: club.id,
              name: club.name,
              crest_url: null,
              source: 'transfermarkt' as const,
            }))
          );
        }
      } catch (tmError) {
        console.error('[CLUB-SEARCH] Transfermarkt search error:', tmError);
        Sentry.captureException(tmError, {
          extra: { searchTerm },
          tags: { component: 'metadata-clubs-search-tm' },
        });
        // Continue with database results only
      }
    }

    return Response.json({ clubs: allClubs });
  } catch (error) {
    Sentry.captureException(error, {
      extra: { url: req.url, query: req.nextUrl.searchParams.get('q') },
      tags: { component: 'metadata-clubs-search-api' },
    });
    return handleApiError(error, req);
  }
};

export const GET = rateLimitMiddleware(handler);

