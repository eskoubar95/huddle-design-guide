import { NextRequest } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { rateLimitMiddleware } from '@/lib/api/rate-limit';
import { handleApiError } from '@/lib/api/errors';
import { MetadataRepository } from '@/lib/repositories/metadata-repository';

const handler = async (req: NextRequest) => {
  try {
    if (req.method !== 'GET') {
      return new Response(null, { status: 405 });
    }

    const { searchParams } = new URL(req.url);
    const clubId = searchParams.get('clubId');
    const seasonId = searchParams.get('seasonId');

    if (!clubId || !seasonId) {
      return new Response(
        JSON.stringify({ error: 'clubId and seasonId are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const repository = new MetadataRepository();
    const competitions = await repository.getCompetitionsForClubAndSeason(clubId, seasonId);

    return Response.json({ competitions });
  } catch (error) {
    Sentry.captureException(error, {
      extra: {
        url: req.url,
        method: req.method,
      },
      tags: { component: 'competitions-api-route' },
    });
    return handleApiError(error, req);
  }
};

export const GET = rateLimitMiddleware(handler);

