// @ts-nocheck - Deno runtime (TypeScript doesn't understand Deno types)
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { MetadataRepository } from '../_shared/repositories/metadata-repository.ts'
import { TransfermarktClient } from '../_shared/repositories/transfermarkt-client.ts'
import { MatchService } from '../_shared/services/match-service.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface MatchJerseyMetadataRequest {
  clubText: string           // Required: "FC København"
  seasonText: string         // Required: "22/23" | "23" | "2023/2024"
  playerNameText?: string    // Optional: "Jonas Wind"
  playerNumberText?: string  // Optional: "23"
}

interface MatchPlayerResult {
  playerId: string
  fullName: string
  jerseyNumber?: number
  seasonLabel: string
  confidenceScore: number
}

interface MatchJerseyMetadataResponse {
  clubId: string | null
  seasonId: string | null
  playerId: string | null
  confidence: {
    club: number      // 0-100
    season: number    // 0-100
    player: number    // 0-100
  }
  matched: {
    club: boolean
    season: boolean
    player: boolean
  }
  players?: MatchPlayerResult[]  // Array of player suggestions
  metadata?: {
    clubName?: string
    seasonLabel?: string
    playerName?: string
    matchedSeason?: {
      id: string
      label: string
      tm_season_id: string
    }
  }
}

import type { TransfermarktCompetition } from '../_shared/repositories/transfermarkt-client.ts'


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

    const body: MatchJerseyMetadataRequest = await req.json()
    const { clubText, seasonText, playerNameText, playerNumberText } = body

    if (!clubText || !seasonText) {
      return new Response(
        JSON.stringify({ error: 'clubText and seasonText are required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    console.log(`[MATCH] Starting metadata matching for club="${clubText}", season="${seasonText}"`)

    // Connect repository to PostgreSQL
    await repository.connect()

    const result: MatchJerseyMetadataResponse = {
      clubId: null,
      seasonId: null,
      playerId: null,
      confidence: {
        club: 0,
        season: 0,
        player: 0,
      },
      matched: {
        club: false,
        season: false,
        player: false,
      },
      players: [], // Initialize players array
      metadata: {},
    }

    // ============================================
    // STEP 1: Match Club (using MatchService)
    // ============================================
    console.log(`[MATCH] Step 1: Matching club "${clubText}"`)

    const clubMatch = await matchService.matchClub(clubText)

    if (clubMatch.club) {
      result.clubId = clubMatch.club.id
      result.confidence.club = clubMatch.confidence
      result.matched.club = true
      result.metadata!.clubName = clubMatch.club.name
      console.log(`[MATCH] Matched club: ${clubMatch.club.name} (${clubMatch.club.id})`)
    } else {
      console.warn(`[MATCH] Could not match club: ${clubText}`)
      return new Response(
        JSON.stringify({
          ...result,
          error: `Club not found: ${clubText}`,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    // ============================================
    // STEP 2: Match Season (using MatchService)
    // ============================================
    console.log(`[MATCH] Step 2: Matching season "${seasonText}"`)

    const seasonMatch = await matchService.matchSeason(seasonText)

    if (seasonMatch.season) {
      result.seasonId = seasonMatch.season.id
      result.confidence.season = seasonMatch.confidence
      result.matched.season = true
      result.metadata!.seasonLabel = seasonMatch.season.label
      result.metadata!.matchedSeason = seasonMatch.season
      console.log(`[MATCH] Matched season: ${seasonMatch.season.label} (${seasonMatch.season.id})`)
    } else {
      console.warn(`[MATCH] Could not match or create season: ${seasonText}`)
      return new Response(
        JSON.stringify({
          ...result,
          error: `Season not found or could not be created: ${seasonText}`,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    // ============================================
    // STEP 3: Match Player (using MatchService)
    // ============================================
    if (!playerNameText && !playerNumberText) {
      // No player info provided, return what we have
      console.log(`[MATCH] No player info provided, returning club and season matches`)
      return new Response(
        JSON.stringify(result),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    console.log(`[MATCH] Step 3: Matching player (name="${playerNameText}", number="${playerNumberText}")`)

    if (!result.clubId || !result.seasonId || !result.metadata?.matchedSeason) {
      console.warn(`[MATCH] Cannot match player without club and season`)
            } else {
      const playerMatch = await matchService.matchPlayer(
                            result.clubId,
                            result.seasonId,
        result.metadata.matchedSeason.label,
        result.metadata.matchedSeason.tm_season_id,
        playerNameText,
        playerNumberText
      )

      if (playerMatch.player) {
        result.playerId = playerMatch.player.id
        result.confidence.player = playerMatch.confidence
        result.matched.player = true
        result.metadata!.playerName = playerMatch.player.full_name

        // Add candidates to players array
        if (playerMatch.candidates && playerMatch.candidates.length > 0) {
          result.players = playerMatch.candidates
        }
      }

    }

    // ============================================
    // STEP 4: Fetch and store competitions for club/season
    // ============================================
    if (result.clubId && result.metadata?.matchedSeason) {
      const matchedSeason = result.metadata.matchedSeason
      console.log(`[MATCH] Step 4: Fetching competitions for club ${result.clubId}, season ${matchedSeason.tm_season_id}`)
      
      try {
        const competitions = await transfermarktClient.getClubCompetitions(result.clubId, matchedSeason.tm_season_id)
          
          console.log(`[MATCH] Transfermarkt API returned ${competitions.length} competitions`)
          
          // Filter out friendly competitions
          const nonFriendlyCompetitions = competitions.filter(comp => {
            const type = comp.type?.toLowerCase() || ''
            const name = comp.name?.toLowerCase() || ''
            const id = comp.id?.toLowerCase() || ''
            // Exclude friendly matches
            return type !== 'friendly' && 
                   !name.includes('friendly') && 
                   !name.includes('freundschaftsspiel') &&
                   id !== 'fs' && // Transfermarkt ID for "International Friendlies"
                   comp.id && comp.name
          })
          
          console.log(`[MATCH] Filtered to ${nonFriendlyCompetitions.length} non-friendly competitions`)
          
          // Store competitions and club_seasons relationships
          for (const comp of nonFriendlyCompetitions) {
            try {
            // Insert or update competition using repository
            await repository.upsertCompetition({
              id: comp.id,
              name: comp.name,
              country: comp.country || null,
              country_code: comp.countryCode || null,
              continent: comp.continent || null,
            })
              
              // Insert club_season relationship (if not exists)
            await repository.upsertClubSeason({
              competition_id: comp.id,
              season_id: result.seasonId!,
              club_id: result.clubId!,
            })
              
              console.log(`[MATCH] Stored competition: ${comp.name} (${comp.id}) for club ${result.clubId}, season ${matchedSeason.label}`)
            } catch (compError) {
              console.warn(`[MATCH] Error storing competition ${comp.name} (${comp.id}):`, compError)
            }
        }
      } catch (compFetchError) {
        console.warn(`[MATCH] Error fetching competitions:`, compFetchError)
        // Don't fail the entire request if competitions fetch fails
      }
    }

    // Calculate overall confidence
    const overallConfidence = (
      result.confidence.club * 0.3 +
      result.confidence.season * 0.3 +
      result.confidence.player * 0.4
    )

    console.log(`[MATCH] Matching completed: club=${result.matched.club}, season=${result.matched.season}, player=${result.matched.player}`)

    await repository.close()

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error) {
    // Ensure repository connection is closed on error
    await repository.close().catch(() => {})
    
    console.error('[MATCH] Error in match-jersey-metadata function:', error)
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})

