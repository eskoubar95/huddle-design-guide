// @ts-nocheck - Deno runtime (TypeScript doesn't understand Deno types)
/**
 * Upsert Service
 * 
 * Business logic for batch upserting metadata (players, contracts, clubs, seasons).
 * Handles: Batch operations, error handling, progress tracking, backfill orchestration.
 * 
 * This service provides efficient bulk operations for populating the metadata database
 * with data from the Transfermarkt API, with robust error handling and progress tracking.
 */

import { mapCountryToIso2 } from '../utils/country-mapper.ts'
import { parseSeasonInput, normalizeSeasonLabel } from '../utils/season-parser.ts'
import { MetadataRepository } from '../repositories/metadata-repository.ts'
import { TransfermarktClient, type TransfermarktPlayer } from '../repositories/transfermarkt-client.ts'

/**
 * Result of batch upserting players
 * 
 * @interface UpsertPlayersResult
 * @property {number} playersProcessed - Total number of players processed
 * @property {number} playersCreated - Number of new players created
 * @property {number} playersUpdated - Number of existing players updated
 * @property {Array<{playerId: string, error: string}>} errors - List of errors encountered
 */
export interface UpsertPlayersResult {
  playersProcessed: number
  playersCreated: number
  playersUpdated: number
  errors: Array<{ playerId: string; error: string }>
}

/**
 * Result of batch upserting player contracts
 * 
 * @interface UpsertContractsResult
 * @property {number} contractsCreated - Number of new contracts created
 * @property {number} contractsUpdated - Number of existing contracts updated
 * @property {Array<{playerId: string, seasonId: string, error: string}>} errors - List of errors encountered
 */
export interface UpsertContractsResult {
  contractsCreated: number
  contractsUpdated: number
  errors: Array<{ playerId: string; seasonId: string; error: string }>
}

/**
 * Result of backfilling club season data
 * 
 * @interface BackfillClubSeasonResult
 * @property {number} playersProcessed - Number of players processed
 * @property {number} contractsCreated - Number of contracts created
 * @property {Array<{playerId: string, error: string}>} errors - List of errors encountered
 */
export interface BackfillClubSeasonResult {
  playersProcessed: number
  contractsCreated: number
  errors: Array<{ playerId: string; error: string }>
}

/**
 * Upsert Service
 * 
 * Provides batch upsert operations for metadata entities and orchestrates
 * the backfill process for club season data.
 * 
 * @class UpsertService
 */
export class UpsertService {
  /**
   * Create a new UpsertService instance
   * 
   * @param {MetadataRepository} repository - Repository for database operations
   * @param {TransfermarktClient} transfermarktClient - Client for Transfermarkt API calls
   */
  constructor(
    private repository: MetadataRepository,
    private transfermarktClient: TransfermarktClient
  ) {}

  /**
   * Upsert multiple players in batch
   * 
   * Processes a batch of players, creating new records or updating existing ones.
   * Handles validation, error tracking, and provides detailed results.
   * 
   * @param {Array} players - Array of player data to upsert
   * @param {string} players[].id - Transfermarkt player ID
   * @param {string} players[].name - Player full name (required)
   * @param {string} [players[].position] - Preferred position
   * @param {string} [players[].dateOfBirth] - Date of birth (ISO format)
   * @param {string[]} [players[].nationality] - Array of nationality strings
   * @param {number} [players[].height] - Height in cm
   * @param {string} [players[].foot] - Preferred foot ('left' | 'right')
   * @param {string} [players[].currentClubId] - Current club ID
   * @returns {Promise<UpsertPlayersResult>} Result with counts and errors
   * 
   * @example
   * ```typescript
   * const result = await upsertService.upsertPlayersBatch([
   *   { id: '123', name: 'John Doe', position: 'Forward' }
   * ])
   * // Returns: { playersProcessed: 1, playersCreated: 1, playersUpdated: 0, errors: [] }
   * ```
   */
  async upsertPlayersBatch(
    players: Array<{
      id: string
      name: string
      position?: string
      dateOfBirth?: string
      nationality?: string[]
      height?: number
      foot?: string
      currentClubId?: string
    }>
  ): Promise<UpsertPlayersResult> {
    const result: UpsertPlayersResult = {
      playersProcessed: 0,
      playersCreated: 0,
      playersUpdated: 0,
      errors: [],
    }

    for (const playerData of players) {
      if (!playerData.name || !playerData.name.trim()) {
        result.errors.push({
          playerId: playerData.id,
          error: 'Missing name',
        })
        continue
      }

      try {
        const primaryCountryCode = playerData.nationality && playerData.nationality.length > 0
          ? mapCountryToIso2(playerData.nationality[0])
          : null

        // Check if player exists
        const existingPlayer = await this.repository.findPlayerById(playerData.id)
        const wasNew = !existingPlayer

        await this.repository.upsertPlayer({
          id: playerData.id,
          full_name: playerData.name,
          known_as: null,
          date_of_birth: playerData.dateOfBirth || null,
          nationalities: playerData.nationality || null,
          primary_country_code: primaryCountryCode,
          height_cm: playerData.height || null,
          preferred_position: playerData.position || null,
          foot: playerData.foot || null,
          current_club_id: playerData.currentClubId || null,
          current_shirt_number: null,
          profile_url: null,
          image_url: null,
        })

        if (wasNew) {
          result.playersCreated++
        } else {
          result.playersUpdated++
        }
        result.playersProcessed++

        console.log(`[UPSERT-SERVICE] Upserted player: ${playerData.name} (${playerData.id})`)
      } catch (error) {
        result.errors.push({
          playerId: playerData.id,
          error: error instanceof Error ? error.message : 'Unknown error',
        })
        console.error(`[UPSERT-SERVICE] Error upserting player ${playerData.id}:`, error)
      }
    }

    return result
  }

  /**
   * Upsert player contracts in batch
   */
  async upsertContractsBatch(
    contracts: Array<{
      playerId: string
      clubId: string
      seasonId: string
      jerseyNumber?: number
      source?: string
      fromDate?: string | null
      toDate?: string | null
    }>
  ): Promise<UpsertContractsResult> {
    const result: UpsertContractsResult = {
      contractsCreated: 0,
      contractsUpdated: 0,
      errors: [],
    }

    for (const contract of contracts) {
      try {
        // Check if contract exists
        const existingContract = contract.jerseyNumber
          ? await this.repository.findContractByJerseyNumber(
              contract.clubId,
              contract.seasonId,
              contract.jerseyNumber
            )
          : null

        const wasNew = !existingContract

        await this.repository.upsertPlayerContract({
          player_id: contract.playerId,
          club_id: contract.clubId,
          season_id: contract.seasonId,
          jersey_number: contract.jerseyNumber || null,
          source: contract.source || 'manual',
          from_date: contract.fromDate || null,
          to_date: contract.toDate || null,
        })

        if (wasNew) {
          result.contractsCreated++
        } else {
          result.contractsUpdated++
        }
      } catch (error) {
        result.errors.push({
          playerId: contract.playerId,
          seasonId: contract.seasonId,
          error: error instanceof Error ? error.message : 'Unknown error',
        })
        console.error(`[UPSERT-SERVICE] Error upserting contract:`, error)
      }
    }

    return result
  }

  /**
   * Backfill all players and contracts for a club/season
   * This is the main backfill operation used by backfill-metadata Edge Function
   */
  async backfillClubSeason(
    clubId: string,
    seasonId: string,
    seasonLabel: string,
    tmSeasonId: string,
    playerIds?: string[]
  ): Promise<BackfillClubSeasonResult> {
    console.log(`[UPSERT-SERVICE] Starting backfill for club ${clubId}, season ${seasonLabel} (${tmSeasonId})`)

    const result: BackfillClubSeasonResult = {
      playersProcessed: 0,
      contractsCreated: 0,
      errors: [],
    }

    // 1. Get players to backfill
    let playersToBackfill: string[] = playerIds || []
    let playersData: TransfermarktPlayer[] = []

    if (playersToBackfill.length === 0) {
      // Get all players for this club/season from API
      playersData = await this.transfermarktClient.getClubPlayers(clubId, tmSeasonId)
      playersToBackfill = playersData.map((p: TransfermarktPlayer) => p.id)
    }

    console.log(`[UPSERT-SERVICE] Found ${playersToBackfill.length} players to process`)

    // 2. Upsert players in batch
    if (playersData.length > 0) {
      const playersResult = await this.upsertPlayersBatch(
        playersData.map(p => ({
          id: p.id,
          name: p.name,
          position: p.position,
          dateOfBirth: p.dateOfBirth,
          nationality: p.nationality,
          height: p.height,
          foot: p.foot,
          currentClubId: clubId,
        }))
      )

      result.playersProcessed = playersResult.playersProcessed
      result.errors.push(...playersResult.errors.map(e => ({
        playerId: e.playerId,
        error: e.error,
      })))
    }

    // 3. For each player, get jersey_numbers and upsert contracts
    for (const playerId of playersToBackfill) {
      try {
        // Get jersey numbers
        const jerseyNumbers = await this.transfermarktClient.getPlayerJerseyNumbers(playerId)

        const contractsToUpsert: Array<{
          playerId: string
          clubId: string
          seasonId: string
          jerseyNumber?: number
          source?: string
        }> = []

        for (const jerseyData of jerseyNumbers) {
          // Map season label to season_id
          const contractSeason = await this.repository.findSeasonByLabelOrTmId(jerseyData.season)

          if (!contractSeason) {
            console.warn(`[UPSERT-SERVICE] Season not found: ${jerseyData.season}`)
            continue
          }

          // Only backfill if club matches
          if (jerseyData.club === clubId) {
            contractsToUpsert.push({
              playerId,
              clubId,
              seasonId: contractSeason.id,
              jerseyNumber: jerseyData.jerseyNumber,
              source: 'jersey_numbers',
            })
          }
        }

        // Upsert contracts in batch
        if (contractsToUpsert.length > 0) {
          const contractsResult = await this.upsertContractsBatch(contractsToUpsert)
          result.contractsCreated += contractsResult.contractsCreated
          result.errors.push(...contractsResult.errors.map(e => ({
            playerId: e.playerId,
            error: e.error,
          })))
        }

        console.log(`[UPSERT-SERVICE] Backfilled contracts for player: ${playerId}`)
      } catch (error) {
        result.errors.push({
          playerId,
          error: error instanceof Error ? error.message : 'Unknown error',
        })
        console.error(`[UPSERT-SERVICE] Error backfilling player ${playerId}:`, error)
      }
    }

    console.log(`[UPSERT-SERVICE] Backfill completed. Processed ${result.playersProcessed} players, created ${result.contractsCreated} contracts`)

    return result
  }

  /**
   * Upsert clubs in batch
   */
  async upsertClubsBatch(
    clubs: Array<{
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
  ): Promise<{ processed: number; errors: Array<{ clubId: string; error: string }> }> {
    const result = {
      processed: 0,
      errors: [] as Array<{ clubId: string; error: string }>,
    }

    for (const club of clubs) {
      try {
        // Map country name to ISO-2 code (required for medusa.region_country foreign key)
        const countryCode = club.country ? mapCountryToIso2(club.country) : null
        
        await this.repository.upsertClub({
          id: club.id,
          name: club.name,
          official_name: club.officialName || null,
          slug: club.name.toLowerCase().replace(/\s+/g, '-'),
          country: club.country || null,
          country_code: countryCode || null, // ISO-2 code matching medusa.region_country.iso_2
          crest_url: club.image || null,
          colors: club.colors || null,
          stadium_name: club.stadium?.name || null,
          stadium_seats: club.stadium?.seats || null,
          founded_on: club.foundedOn || null,
          current_market_value: club.marketValue || null,
          external_url: club.url || null,
        })

        result.processed++
      } catch (error) {
        result.errors.push({
          clubId: club.id,
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    }

    return result
  }

  /**
   * Upsert seasons in batch
   */
  async upsertSeasonsBatch(
    seasons: Array<{
      tmSeasonId: string
      label: string
      startYear: number
      endYear: number
      seasonType: 'league' | 'calendar' | 'tournament'
    }>
  ): Promise<{ processed: number; errors: Array<{ seasonId: string; error: string }> }> {
    const result = {
      processed: 0,
      errors: [] as Array<{ seasonId: string; error: string }>,
    }

    for (const season of seasons) {
      try {
        const normalizedLabel = normalizeSeasonLabel({
          startYear: season.startYear,
          endYear: season.endYear,
          label: season.label,
          tmSeasonId: season.tmSeasonId,
          seasonType: season.seasonType,
        })

        await this.repository.upsertSeason({
          tm_season_id: season.tmSeasonId,
          label: normalizedLabel,
          start_year: season.startYear,
          end_year: season.endYear,
          season_type: season.seasonType,
        })

        result.processed++
      } catch (error) {
        result.errors.push({
          seasonId: season.tmSeasonId,
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    }

    return result
  }
}

