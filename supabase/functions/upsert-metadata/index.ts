// @ts-nocheck - Deno runtime (TypeScript doesn't understand Deno types)
/**
 * Upsert Metadata Edge Function
 * 
 * Dedicated edge function for upserting metadata (clubs, players, seasons, contracts)
 * Uses UpsertService for business logic orchestration
 */

import { MetadataRepository } from '../_shared/repositories/metadata-repository.ts'
import { TransfermarktClient } from '../_shared/repositories/transfermarkt-client.ts'
import { UpsertService } from '../_shared/services/upsert-service.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface UpsertMetadataRequest {
  // Clubs
  clubs?: Array<{
    id: string
    name: string
    officialName?: string
    country?: string
    countryCode?: string
    image?: string
    colors?: string
    stadium?: { name?: string; seats?: number }
    foundedOn?: string
    marketValue?: number
    url?: string
  }>

  // Players
  players?: Array<{
    id: string
    name: string
    position?: string
    dateOfBirth?: string
    nationality?: string[]
    height?: number
    foot?: string
    currentClubId?: string
  }>

  // Seasons
  seasons?: Array<{
    tmSeasonId: string
    label: string
    startYear: number
    endYear: number
    seasonType: 'league' | 'calendar' | 'tournament'
  }>

  // Contracts
  contracts?: Array<{
    playerId: string
    clubId: string
    seasonId: string
    jerseyNumber?: number
    source?: string
    fromDate?: string | null
    toDate?: string | null
  }>
}

interface UpsertMetadataResponse {
  success: boolean
  results: {
    clubs?: { processed: number; errors: Array<{ clubId: string; error: string }> }
    players?: {
      processed: number
      created: number
      updated: number
      errors: Array<{ playerId: string; error: string }>
    }
    seasons?: { processed: number; errors: Array<{ seasonId: string; error: string }> }
    contracts?: {
      created: number
      updated: number
      errors: Array<{ playerId: string; seasonId: string; error: string }>
    }
  }
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
    const body: UpsertMetadataRequest = await req.json()

    if (!body.clubs && !body.players && !body.seasons && !body.contracts) {
      return new Response(
        JSON.stringify({ error: 'At least one of clubs, players, seasons, or contracts is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    console.log(`[UPSERT-METADATA] Starting upsert operation`)

    // Connect repository to PostgreSQL
    await repository.connect()

    const response: UpsertMetadataResponse = {
      success: true,
      results: {},
    }

    // Upsert clubs
    if (body.clubs && body.clubs.length > 0) {
      console.log(`[UPSERT-METADATA] Upserting ${body.clubs.length} clubs`)
      const clubsResult = await upsertService.upsertClubsBatch(body.clubs)
      response.results.clubs = clubsResult
    }

    // Upsert players
    if (body.players && body.players.length > 0) {
      console.log(`[UPSERT-METADATA] Upserting ${body.players.length} players`)
      const playersResult = await upsertService.upsertPlayersBatch(body.players)
      response.results.players = playersResult
    }

    // Upsert seasons
    if (body.seasons && body.seasons.length > 0) {
      console.log(`[UPSERT-METADATA] Upserting ${body.seasons.length} seasons`)
      const seasonsResult = await upsertService.upsertSeasonsBatch(body.seasons)
      response.results.seasons = seasonsResult
    }

    // Upsert contracts
    if (body.contracts && body.contracts.length > 0) {
      console.log(`[UPSERT-METADATA] Upserting ${body.contracts.length} contracts`)
      const contractsResult = await upsertService.upsertContractsBatch(body.contracts)
      response.results.contracts = contractsResult
    }

    console.log(`[UPSERT-METADATA] Upsert operation completed`)

    await repository.close()

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error) {
    // Ensure repository connection is closed on error
    await repository.close().catch(() => {})

    console.error('[UPSERT-METADATA] Error in upsert-metadata function:', error)
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})

