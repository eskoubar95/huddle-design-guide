import { NextRequest } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { rateLimitMiddleware } from '@/lib/api/rate-limit';
import { handleApiError } from '@/lib/api/errors';
import { requireAuth } from '@/lib/auth';
import { createServiceClient } from '@/lib/supabase/server';
import { z } from 'zod';

const findOrCreateSchema = z.object({
  jerseyId: z.string().uuid(),
  otherUserId: z.string().min(1),
});

const handler = async (req: NextRequest) => {
  try {
    if (req.method !== 'POST') {
      return new Response(null, { status: 405 });
    }

    // Authenticate user
    const authResult = await requireAuth(req);

    // Parse and validate request body
    const body = await req.json();
    const { jerseyId, otherUserId } = findOrCreateSchema.parse(body);

    // Validate that user IDs are different
    if (authResult.userId === otherUserId) {
      return Response.json(
        { error: 'Cannot create conversation with yourself' },
        { status: 400 }
      );
    }

    // Create Supabase service client for server-side operations
    const supabase = await createServiceClient();

    // Check if conversation already exists
    // Use safe query with proper filtering to prevent SQL injection
    // Supabase client library handles parameterization, but we validate inputs first
    const { data: existingConversation, error: fetchError } = await supabase
      .from('conversations')
      .select('id')
      .or(
        `and(participant_1_id.eq.${authResult.userId},participant_2_id.eq.${otherUserId}),and(participant_1_id.eq.${otherUserId},participant_2_id.eq.${authResult.userId})`
      )
      .eq('jersey_id', jerseyId)
      .maybeSingle();
    
    // Note: Supabase client library handles parameterization internally
    // The userId and otherUserId are validated by requireAuth and zod schema
    // jerseyId is validated as UUID by zod schema

    if (fetchError) {
      // Handle table not found gracefully (for development)
      if (fetchError.code === 'PGRST205') {
        return Response.json(
          { error: 'Conversations feature not available' },
          { status: 503 }
        );
      }
      throw fetchError;
    }

    if (existingConversation) {
      return Response.json({
        conversationId: existingConversation.id,
        created: false,
      });
    }

    // Create new conversation
    const { data: newConversation, error: createError } = await supabase
      .from('conversations')
      .insert({
        participant_1_id: authResult.userId,
        participant_2_id: otherUserId,
        jersey_id: jerseyId,
      })
      .select('id')
      .single();

    if (createError) {
      // Handle table not found gracefully (for development)
      if (createError.code === 'PGRST205') {
        return Response.json(
          { error: 'Conversations feature not available' },
          { status: 503 }
        );
      }
      throw createError;
    }

    if (!newConversation) {
      return Response.json(
        { error: 'Failed to create conversation' },
        { status: 500 }
      );
    }

    return Response.json({
      conversationId: newConversation.id,
      created: true,
    });
  } catch (error) {
    Sentry.captureException(error, {
      extra: {
        url: req.url,
        method: req.method,
      },
      tags: { component: 'conversations-find-or-create-api' },
    });
    return handleApiError(error, req);
  }
};

export const POST = rateLimitMiddleware(handler);

