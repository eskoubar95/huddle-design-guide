import { NextRequest } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { rateLimitMiddleware } from '@/lib/api/rate-limit';
import { handleApiError } from '@/lib/api/errors';
import { MetadataAutoLinkService } from '@/lib/services/metadata-auto-link-service';
import { z } from 'zod';

const autoLinkSchema = z.object({
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
    const input = autoLinkSchema.parse(body);

    const autoLinkService = new MetadataAutoLinkService();
    const result = await autoLinkService.autoLink(input);

    return Response.json(result);
  } catch (error) {
    Sentry.captureException(error, {
      extra: {
        url: req.url,
        method: req.method,
        body: await req.json().catch(() => null),
      },
      tags: { component: 'metadata-auto-link-api' },
    });
    return handleApiError(error, req);
  }
};

export const POST = rateLimitMiddleware(handler);

