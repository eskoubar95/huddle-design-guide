// @ts-nocheck - Deno runtime (TypeScript doesn't understand Deno types)
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { MetadataRepository } from '../_shared/repositories/metadata-repository.ts'
import { TransfermarktClient } from '../_shared/repositories/transfermarkt-client.ts'
import { UpsertService } from '../_shared/services/upsert-service.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface BackfillRequest {
  clubId: string
  seasonId?: string // UUID
  seasonLabel?: string // E.g. "19/20"
  playerIds?: string[] // Optional: specific players to backfill
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  // Initialize repositories and services
  const repository = new MetadataRepository()
  const transfermarktClient = new TransfermarktClient()
  const upsertService = new UpsertService(repository, transfermarktClient)

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )

    const body: BackfillRequest = await req.json()
    const { clubId, seasonId, seasonLabel, playerIds } = body

    if (!clubId) {
      return new Response(
        JSON.stringify({ error: 'clubId is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    console.log(`[BACKFILL] Starting backfill for club ${clubId}, season ${seasonId || seasonLabel}`)

    // Connect repository to PostgreSQL
    await repository.connect()

    // Resolve season - UpsertService.backfillClubSeason() requires seasonId (UUID)
    if (!seasonId && !seasonLabel) {
      return new Response(
        JSON.stringify({ error: 'Either seasonId or seasonLabel is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    let resolvedSeasonId = seasonId
    let resolvedSeasonLabel = seasonLabel || ''
    let resolvedTmSeasonId = ''

    if (!resolvedSeasonId && seasonLabel) {
      // Find season by label
      const dbSeason = await repository.findSeasonByLabelOrTmId(seasonLabel)
      if (!dbSeason) {
        return new Response(
          JSON.stringify({ error: `Season not found: label="${seasonLabel}"` }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
      }
      resolvedSeasonId = dbSeason.id
      resolvedSeasonLabel = dbSeason.label
      resolvedTmSeasonId = dbSeason.tm_season_id
    } else if (resolvedSeasonId) {
      // Get season info if we only have UUID
      const dbSeason = await repository.findSeasonById(resolvedSeasonId)
      if (!dbSeason) {
        await repository.close()
        return new Response(
          JSON.stringify({ error: `Season not found: id="${resolvedSeasonId}"` }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
      }
      resolvedSeasonLabel = dbSeason.label
      resolvedTmSeasonId = dbSeason.tm_season_id
    }

    // Validate we have tmSeasonId (required for Transfermarkt API)
    if (!resolvedTmSeasonId) {
      await repository.close()
      return new Response(
        JSON.stringify({ error: `Could not resolve tmSeasonId for season ${resolvedSeasonId || seasonLabel}` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Use UpsertService to backfill
    console.log(`[BACKFILL] Starting backfill for club ${clubId}, season ${resolvedSeasonId} (tmSeasonId: ${resolvedTmSeasonId})`)
    const backfillResult = await upsertService.backfillClubSeason(
      clubId,
      resolvedSeasonId!,
      resolvedSeasonLabel,
      resolvedTmSeasonId,
      playerIds
    )

    console.log(`[BACKFILL] Backfill completed. Processed ${backfillResult.playersProcessed} players, created ${backfillResult.contractsCreated} contracts`)

    if (backfillResult.errors.length > 0) {
      console.warn(`[BACKFILL] ${backfillResult.errors.length} errors occurred during backfill`)
    }

    await repository.close()

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Backfill completed',
        playersProcessed: backfillResult.playersProcessed,
        contractsCreated: backfillResult.contractsCreated,
        errors: backfillResult.errors.length > 0 ? backfillResult.errors : undefined,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error) {
    // Ensure repository connection is closed on error
    await repository.close().catch(() => {})
    
    console.error('[BACKFILL] Error in backfill-metadata function:', error)
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})

