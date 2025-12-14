// @ts-nocheck - Deno runtime (TypeScript doesn't understand Deno types)
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { Errors, corsHeaders, handleEdgeFunctionError } from '../_shared/utils/errors.ts'
import { retryWithBackoff } from '../_shared/utils/retry.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { jerseyId } = await req.json() as { jerseyId: string }

    if (!jerseyId) {
      return Errors.MISSING_FIELDS(['jerseyId']).toResponse()
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // List all files in jersey folder (includes original + all variants)
    const { data: files, error: listError } = await retryWithBackoff(
      async () => {
        const { data, error } = await supabase.storage
      .from('jersey_images')
      .list(jerseyId)

        if (error && !error.message?.includes('not found')) {
          throw error
        }
        return { data, error }
      },
      { maxRetries: 3, initialDelay: 1000 }
    )

    if (listError && !listError.message?.includes('not found')) {
      console.error('[CLEANUP] List error:', listError)
      // Continue anyway - folder might not exist
    }

    if (files && files.length > 0) {
      // Delete all files in folder (original + variants: -vision.jpg, -gallery.webp, -card.webp)
      const filePaths = files.map(file => `${jerseyId}/${file.name}`)
      
      console.log(`[CLEANUP] Deleting ${filePaths.length} files for jersey ${jerseyId}`)
      
      await retryWithBackoff(
        async () => {
      const { error: deleteError } = await supabase.storage
        .from('jersey_images')
        .remove(filePaths)

      if (deleteError) {
        // Log but don't fail - files might already be deleted
            console.warn('[CLEANUP] Some files may not have been deleted:', deleteError.message)
      }
        },
        { maxRetries: 3, initialDelay: 1000 }
      )
    }

    return new Response(
      JSON.stringify({ success: true, deleted: files?.length || 0 }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('[CLEANUP] Unexpected error:', error)
    return handleEdgeFunctionError(error)
  }
})

