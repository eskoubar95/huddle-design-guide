// @ts-nocheck - Deno runtime (TypeScript doesn't understand Deno types)
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { MetadataRepository } from '../_shared/repositories/metadata-repository.ts'
import { TransfermarktClient } from '../_shared/repositories/transfermarkt-client.ts'
import { MatchService } from '../_shared/services/match-service.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface AutoLinkRequest {
  jerseyId: string
  clubText: string
  seasonText: string
  playerNameText?: string
  playerNumberText?: string
}


Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  // Initialize repositories and services
  const repository = new MetadataRepository()
  const transfermarktClient = new TransfermarktClient()
  const matchService = new MatchService(repository, transfermarktClient)

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

    const body: AutoLinkRequest = await req.json()
    const { jerseyId, clubText, seasonText, playerNameText, playerNumberText } = body

    if (!jerseyId || !clubText || !seasonText) {
      return new Response(
        JSON.stringify({ error: 'jerseyId, clubText, and seasonText are required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    console.log(`[AUTO-LINK] Starting auto-link for jersey ${jerseyId}`)

    // Connect repository to PostgreSQL
    await repository.connect()

    // 1. Match club using MatchService
    console.log(`[AUTO-LINK] Matching club: "${clubText}"`)
    const clubMatch = await matchService.matchClub(clubText)

    if (!clubMatch.club) {
      await repository.close()
      return new Response(
        JSON.stringify({
          success: false,
          confidence: 0,
          message: 'Club not found',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    const matchedClub = { id: clubMatch.club.id, name: clubMatch.club.name }
    console.log(`[AUTO-LINK] Matched club: ${matchedClub.name} (${matchedClub.id})`)

    // 2. Match season using MatchService
    console.log(`[AUTO-LINK] Matching season: "${seasonText}"`)
    const seasonMatch = await matchService.matchSeason(seasonText)

    if (!seasonMatch.season) {
      await repository.close()
      return new Response(
        JSON.stringify({
          success: false,
          confidence: 25,
          message: 'Season not found',
          matchedClub,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    const matchedSeason = { id: seasonMatch.season.id, label: seasonMatch.season.label }
    console.log(`[AUTO-LINK] Matched season: ${matchedSeason.label} (${matchedSeason.id})`)

    // 3. Trigger backfill if needed (call backfill Edge Function)
    try {
      const backfillUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/backfill-metadata`
      const backfillResponse = await fetch(backfillUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
        },
        body: JSON.stringify({
          clubId: matchedClub.id,
          seasonId: matchedSeason.id,
          seasonLabel: matchedSeason.label,
        }),
      })

      if (backfillResponse.ok) {
        const backfillResult = await backfillResponse.json()
        console.log(`[AUTO-LINK] Backfill triggered:`, backfillResult)
      }
    } catch (backfillError) {
      console.warn('[AUTO-LINK] Backfill failed, continuing:', backfillError)
      // Continue even if backfill fails
    }

    // 4. Match player if info is provided using MatchService
    let matchedPlayer: { id: string; fullName: string; jerseyNumber?: number } | null = null
    let confidence = 50 // Base confidence

    if (playerNumberText || playerNameText) {
      const playerMatch = await matchService.matchPlayer(
        matchedClub.id,
        matchedSeason.id,
        matchedSeason.label,
        seasonMatch.season.tm_season_id,
        playerNameText,
        playerNumberText
      )

      if (playerMatch.player) {
            matchedPlayer = {
          id: playerMatch.player.id,
          fullName: playerMatch.player.full_name,
          jerseyNumber: playerMatch.jerseyNumber,
            }
        confidence = playerMatch.confidence
      } else {
        // No player match, but club + season matched
        confidence = playerNumberText ? 75 : 70
      }
    } else {
      confidence = 75 // Club + season matched, but no player info provided
    }

    // 5. Update jersey with matched metadata if confidence is high enough
    // Note: public.jerseys is not in metadata schema, so we use repository's client for direct SQL
    if (confidence >= 70) {
      const updateFields: string[] = []
      const updateValues: any[] = []
      let paramIndex = 1

      if (matchedClub) {
        updateFields.push(`club_id = $${paramIndex++}`)
        updateValues.push(matchedClub.id)
      }
      if (matchedSeason) {
        updateFields.push(`season_id = $${paramIndex++}`)
        updateValues.push(matchedSeason.id)
      }
      if (matchedPlayer) {
        updateFields.push(`player_id = $${paramIndex++}`)
        updateValues.push(matchedPlayer.id)
      }

      if (updateFields.length > 0) {
        updateValues.push(jerseyId)
        const updateQuery = `
          UPDATE public.jerseys 
          SET ${updateFields.join(', ')}
          WHERE id = $${paramIndex}
        `
        
        // Use repository's executeQuery for public.jerseys update (not metadata schema)
        await repository.executeQuery(updateQuery, updateValues)
        console.log(`[AUTO-LINK] Updated jersey ${jerseyId} with metadata links`)
      }
    }

    await repository.close()

    return new Response(
      JSON.stringify({
        success: true,
        confidence,
        matchedClub,
        matchedSeason,
        matchedPlayer,
        updated: confidence >= 70,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error) {
    // Ensure repository connection is closed on error
    await repository.close().catch(() => {})
    
    console.error('[AUTO-LINK] Error in auto-link-metadata function:', error)
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
