import { NextRequest } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { rateLimitMiddleware } from '@/lib/api/rate-limit';
import { handleApiError } from '@/lib/api/errors';
import { MetadataAutoLinkService } from '@/lib/services/metadata-auto-link-service';
import { autoLinkMetadataViaEdgeFunction } from '@/lib/services/metadata-backfill-service';
import { JerseyService } from '@/lib/services/jersey-service';
import { requireAuth } from '@/lib/auth';

const handler = async (
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) => {
  try {
    if (req.method !== 'POST') {
      return new Response(null, { status: 405 });
    }

    const { id: jerseyId } = await context.params;

    // Authenticate user
    const authResult = await requireAuth(req);
    const jerseyService = new JerseyService();

    // Get jersey to check ownership
    const jersey = await jerseyService.getJersey(jerseyId, authResult.userId);

    // Auto-link metadata via Edge Function (better for database operations)
    try {
      await autoLinkMetadataViaEdgeFunction({
        jerseyId,
        clubText: jersey.club,
        seasonText: jersey.season,
        playerNameText: jersey.player_name || undefined,
        playerNumberText: jersey.player_number || undefined,
      });

      return Response.json({
        success: true,
        message: 'Metadata auto-linked successfully',
      });
    } catch (error) {
      // Fallback to direct service if Edge Function fails
      console.warn('[AUTO-LINK] Edge Function failed, falling back to direct service:', error);
      
      const autoLinkService = new MetadataAutoLinkService();
      const linkResult = await autoLinkService.autoLink({
        clubText: jersey.club,
        seasonText: jersey.season,
        playerNameText: jersey.player_name || undefined,
        playerNumberText: jersey.player_number || undefined,
      });

      // Update jersey with matched metadata if confidence is high enough
      if (linkResult.confidence >= 70 && (linkResult.clubId || linkResult.seasonId || linkResult.playerId)) {
        await jerseyService.updateJersey(
          jerseyId,
          {
            clubId: linkResult.clubId || undefined,
            seasonId: linkResult.seasonId || undefined,
            playerId: linkResult.playerId || undefined,
          },
          authResult.userId
        );
      }

      return Response.json({
        success: true,
        linked: linkResult.confidence >= 70,
        confidence: linkResult.confidence,
        result: linkResult,
        fallback: true, // Indicates fallback was used
      });
    }
  } catch (error) {
    const { id: jerseyId } = await context.params;
    Sentry.captureException(error, {
      extra: {
        url: req.url,
        method: req.method,
        jerseyId,
      },
      tags: { component: 'jersey-auto-link-metadata-api' },
    });
    return handleApiError(error, req);
  }
};

export const POST = rateLimitMiddleware(handler);

