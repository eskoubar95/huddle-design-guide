import { NextRequest } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { rateLimitMiddleware } from '@/lib/api/rate-limit';
import { handleApiError } from '@/lib/api/errors';
import { MetadataMatchingService } from '@/lib/services/metadata-matching-service';
import { MetadataBackfillService } from '@/lib/services/metadata-backfill-service';
import { z } from 'zod';

const matchQuerySchema = z.object({
  clubId: z.string().min(1),
  seasonId: z.string().uuid().optional(),
  seasonLabel: z.string().optional(),
  jerseyNumber: z.number().int().min(1).max(99).optional(),
  playerNameHint: z.string().optional(),
});

const handler = async (req: NextRequest) => {
  try {
    if (req.method !== 'GET') {
      return new Response(null, { status: 405 });
    }

    const searchParams = req.nextUrl.searchParams;
    const jerseyNumberParam = searchParams.get('jerseyNumber');
    const query = matchQuerySchema.parse({
      clubId: searchParams.get('clubId'),
      seasonId: searchParams.get('seasonId') || undefined,
      seasonLabel: searchParams.get('seasonLabel') || undefined,
      jerseyNumber: jerseyNumberParam ? parseInt(jerseyNumberParam, 10) : undefined,
      playerNameHint: searchParams.get('playerNameHint') || undefined,
    });

    const matchingService = new MetadataMatchingService();
    const backfillService = new MetadataBackfillService();

    // Auto-backfill if needed (works with both seasonId and seasonLabel)
    // Note: Backfill runs asynchronously via Edge Function, so matching may run before data is ready
    // Frontend should retry matching after a delay if no results found
    if (query.seasonId || query.seasonLabel) {
      try {
        // Trigger backfill (non-blocking, runs in background)
        backfillService.autoBackfillIfNeeded(
          query.clubId,
          query.seasonId,
          query.seasonLabel
        ).catch((backfillError) => {
          // Log but don't fail matching if backfill fails
          Sentry.captureException(backfillError, {
            extra: {
              clubId: query.clubId,
              seasonId: query.seasonId,
              seasonLabel: query.seasonLabel,
            },
            tags: { component: 'metadata-backfill' },
          });
          console.error('[MATCH] Backfill failed (non-blocking):', backfillError);
        });
        // Don't await - let it run in background
      } catch (backfillError) {
        // Log but don't fail matching if backfill fails
        Sentry.captureException(backfillError, {
          extra: {
            clubId: query.clubId,
            seasonId: query.seasonId,
            seasonLabel: query.seasonLabel,
          },
          tags: { component: 'metadata-backfill' },
        });
        console.error('[MATCH] Backfill failed, continuing with matching:', backfillError);
      }
    }

    // Perform matching
    const results = await matchingService.matchPlayers({
      clubId: query.clubId,
      seasonId: query.seasonId,
      seasonLabel: query.seasonLabel,
      jerseyNumber: query.jerseyNumber,
      playerNameHint: query.playerNameHint,
    });

    return Response.json({ results });
  } catch (error) {
    // Capture error with Sentry
    Sentry.captureException(error, {
      extra: {
        url: req.url,
        method: req.method,
      },
      tags: { component: 'metadata-match-api' },
    });
    return handleApiError(error, req);
  }
};

export const GET = rateLimitMiddleware(handler);

