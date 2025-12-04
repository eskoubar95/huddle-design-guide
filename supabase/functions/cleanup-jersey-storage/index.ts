// @ts-nocheck - Deno runtime (TypeScript doesn't understand Deno types)
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { jerseyId } = await req.json() as { jerseyId: string }

    if (!jerseyId) {
      return new Response(
        JSON.stringify({ error: 'Missing jerseyId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // List all files in jersey folder
    const { data: files, error: listError } = await supabase.storage
      .from('jersey_images')
      .list(jerseyId)

    if (listError) {
      console.error('List error:', listError)
      // Continue anyway - folder might not exist
    }

    if (files && files.length > 0) {
      // Delete all files in folder
      const filePaths = files.map(file => `${jerseyId}/${file.name}`)
      
      const { error: deleteError } = await supabase.storage
        .from('jersey_images')
        .remove(filePaths)

      if (deleteError) {
        console.error('Delete error:', deleteError)
        // Log but don't fail - files might already be deleted
      }
    }

    return new Response(
      JSON.stringify({ success: true, deleted: files?.length || 0 }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Cleanup error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

