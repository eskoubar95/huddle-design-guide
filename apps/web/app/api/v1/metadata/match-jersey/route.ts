import { NextRequest } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { rateLimitMiddleware } from '@/lib/api/rate-limit';
import { handleApiError } from '@/lib/api/errors';
import { matchJerseyMetadata } from '@/lib/services/metadata-match-service';
import { z } from 'zod';

const matchJerseySchema = z.object({
  clubText: z.string().min(1),
  seasonText: z.string().min(1),
  playerNameText: z.string().optional(),
  playerNumberText: z.string().optional(),
});

const handler = async (req: NextRequest) => {
  try {
    if (req.method !== 'POST') {
      return new Response(null, { status: 405 });
    }

    const body = await req.json();
    const input = matchJerseySchema.parse(body);

    // Call unified match-jersey-metadata Edge Function
    const result = await matchJerseyMetadata(input);

    // Transform response to match expected format for frontend
    // The Edge Function returns clubId, seasonId, playerId directly
    // We need to return player suggestions if player matching was requested
    const response: {
      clubId: string | null;
      seasonId: string | null;
      playerId: string | null;
      matched: {
        club: boolean;
        season: boolean;
        player: boolean;
      };
      confidence: {
        club: number;
        season: number;
        player: number;
      };
      players?: Array<{
        playerId: string;
        fullName: string;
        jerseyNumber?: number;
        confidenceScore: number;
      }>;
      metadata?: {
        clubName?: string;
        seasonLabel?: string;
        playerName?: string;
      };
      error?: string;
    } = {
      clubId: result.clubId,
      seasonId: result.seasonId,
      playerId: result.playerId,
      matched: result.matched,
      confidence: result.confidence,
      metadata: result.metadata,
    };

    // If player was matched, include it in players array
    if (result.playerId && result.matched.player) {
      response.players = [
        {
          playerId: result.playerId,
          fullName: result.metadata?.playerName || 'Unknown',
          confidenceScore: result.confidence.player,
        },
      ];
    }

    return Response.json(response);
  } catch (error) {
    Sentry.captureException(error, {
      extra: {
        url: req.url,
        method: req.method,
      },
      tags: { component: 'metadata-match-jersey-api' },
    });
    return handleApiError(error, req);
  }
};

export const POST = rateLimitMiddleware(handler);

