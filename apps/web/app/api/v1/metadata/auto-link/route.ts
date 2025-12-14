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
  let requestBody: unknown = null;

  try {
    if (req.method !== 'POST') {
      return new Response(null, { status: 405 });
    }

    // Parse body once and reuse
    requestBody = await req.json();
    const input = autoLinkSchema.parse(requestBody);

    const autoLinkService = new MetadataAutoLinkService();
    const result = await autoLinkService.autoLink(input);

    return Response.json(result);
  } catch (error) {
    Sentry.captureException(error, {
      extra: {
        url: req.url,
        method: req.method,
        body: requestBody, // Use already parsed body instead of re-parsing
      },
      tags: { component: 'metadata-auto-link-api' },
    });
    return handleApiError(error, req);
  }
};

export const POST = rateLimitMiddleware(handler);

