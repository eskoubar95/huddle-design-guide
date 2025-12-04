import { NextRequest } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { rateLimitMiddleware } from '@/lib/api/rate-limit';
import { handleApiError } from '@/lib/api/errors';
import { query } from '@/lib/db/postgres-connection';

interface Player {
  id: string;
  full_name: string;
  current_shirt_number?: number | null;
}

const handler = async (req: NextRequest, { params }: { params: { id: string } }) => {
  try {
    if (req.method !== 'GET') {
      return new Response(null, { status: 405 });
    }

    const playerId = params.id;

    const players = await query<Player>(
      `
      SELECT id, full_name, current_shirt_number
      FROM metadata.players
      WHERE id = $1
      LIMIT 1
      `,
      [playerId]
    );

    if (!players || players.length === 0) {
      return Response.json({ error: 'Player not found' }, { status: 404 });
    }

    return Response.json({ player: players[0] });
  } catch (error) {
    Sentry.captureException(error, {
      extra: { url: req.url, playerId: params.id },
      tags: { component: 'metadata-players-api' },
    });
    return handleApiError(error, req);
  }
};

export const GET = rateLimitMiddleware(handler);

