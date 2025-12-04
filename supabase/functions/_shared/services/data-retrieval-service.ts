// @ts-nocheck - Deno runtime (TypeScript doesn't understand Deno types)
/**
 * Data Retrieval Service
 * 
 * Business logic for cross-search patterns (database + API).
 * Handles: Caching, intelligent fallback, data enrichment.
 * 
 * This service implements robust data retrieval patterns that combine
 * database lookups with Transfermarkt API calls, using intelligent caching
 * to optimize performance and reduce API calls.
 */

import { mapCountryToIso2 } from '../utils/country-mapper.ts'
import { MetadataRepository } from '../repositories/metadata-repository.ts'
import { TransfermarktClient } from '../repositories/transfermarkt-client.ts'
import type { Club, Player, Season } from '../repositories/metadata-repository.ts'

/**
 * Options for retrieving club with details
 * 
 * @interface GetClubWithDetailsOptions
 * @property {string} clubId - Club ID
 * @property {boolean} [includePlayers=false] - Include player roster
 * @property {boolean} [includeSeasons=false] - Include seasons
 * @property {string} [seasonId] - Specific season ID (for player roster)
 */
export interface GetClubWithDetailsOptions {
  clubId: string
  includePlayers?: boolean
  includeSeasons?: boolean
  seasonId?: string
}

/**
 * Options for retrieving player with details
 * 
 * @interface GetPlayerWithDetailsOptions
 * @property {string} playerId - Player ID
 * @property {boolean} [includeContracts=false] - Include contract history
 * @property {boolean} [includeClubs=false] - Include clubs played for
 */
export interface GetPlayerWithDetailsOptions {
  playerId: string
  includeContracts?: boolean
  includeClubs?: boolean
}

/**
 * Options for retrieving season with details
 * 
 * @interface GetSeasonWithDetailsOptions
 * @property {string} seasonId - Season ID
 * @property {boolean} [includeClubs=false] - Include participating clubs
 * @property {boolean} [includeCompetitions=false] - Include competitions
 */
export interface GetSeasonWithDetailsOptions {
  seasonId: string
  includeClubs?: boolean
  includeCompetitions?: boolean
}

/**
 * Simple in-memory cache for Edge Function runtime
 * 
 * Provides basic caching with TTL (time-to-live) for frequently accessed data.
 * In production, consider using Redis or similar distributed cache.
 * 
 * @class SimpleCache
 * @template T - Type of cached data
 */
class SimpleCache<T> {
  private cache = new Map<string, { data: T; expires: number }>()
  private ttl: number

  constructor(ttlMs: number = 300000) { // 5 minutes default
    this.ttl = ttlMs
  }

  get(key: string): T | null {
    const entry = this.cache.get(key)
    if (!entry) return null
    
    if (Date.now() > entry.expires) {
      this.cache.delete(key)
      return null
    }
    
    return entry.data
  }

  set(key: string, data: T): void {
    this.cache.set(key, {
      data,
      expires: Date.now() + this.ttl,
    })
  }

  clear(): void {
    this.cache.clear()
  }
}

/**
 * Data Retrieval Service
 * 
 * Provides robust data retrieval with caching and intelligent fallback.
 * Uses in-memory caching to optimize performance and reduce API calls.
 * 
 * @class DataRetrievalService
 */
export class DataRetrievalService {
  private clubCache = new SimpleCache<Club>(300000) // 5 minutes
  private playerCache = new SimpleCache<Player>(300000) // 5 minutes
  private seasonCache = new SimpleCache<Season>(300000) // 5 minutes

  /**
   * Create a new DataRetrievalService instance
   * 
   * @param {MetadataRepository} repository - Repository for database operations
   * @param {TransfermarktClient} transfermarktClient - Client for Transfermarkt API calls
   */
  constructor(
    private repository: MetadataRepository,
    private transfermarktClient: TransfermarktClient
  ) {}

  /**
   * Get club with optional details (players, seasons)
   * 
   * Retrieves club data with optional enrichment (player roster, seasons).
   * Uses caching to optimize repeated requests.
   * 
   * Strategy:
   * 1. Check cache
   * 2. Check database
   * 3. Fetch from Transfermarkt API if not found
   * 4. Enrich with optional details if requested
   * 5. Cache and return result
   * 
   * @param {GetClubWithDetailsOptions} options - Options for retrieving club
   * @returns {Promise<Club | null>} Club data with optional details, or null if not found
   * 
   * @example
   * ```typescript
   * // Get basic club info
   * const club = await service.getClubWithDetails({ clubId: '190' })
   * 
   * // Get club with player roster for specific season
   * const clubWithPlayers = await service.getClubWithDetails({
   *   clubId: '190',
   *   includePlayers: true,
   *   seasonId: 'season-id'
   * })
   * ```
   */
   * Strategy: Cache → Database → API
   */
  async getClubWithDetails(options: GetClubWithDetailsOptions): Promise<{
    club: Club
    players?: Player[]
    seasons?: Season[]
  }> {
    const { clubId, includePlayers, includeSeasons, seasonId } = options

    // 1. Check cache
    const cacheKey = `club:${clubId}:${includePlayers}:${includeSeasons}:${seasonId || ''}`
    const cached = this.clubCache.get(cacheKey)
    if (cached) {
      return cached as any
    }

    // 2. Try database
    let club = await this.repository.findClubById(clubId)

    // 3. If not in database, try API
    if (!club) {
      try {
        const apiClub = await this.transfermarktClient.getClubDetails(clubId)
        if (apiClub) {
          // Map country name to ISO-2 code (required for medusa.region_country foreign key)
          // Use country from club, or fallback to league.countryName from profile endpoint
          const countryName = apiClub.country || apiClub.league?.countryName
          const countryCode = countryName ? mapCountryToIso2(countryName) : null
          
          // Upsert to database
          club = await this.repository.upsertClub({
            id: apiClub.id,
            name: apiClub.name,
            official_name: apiClub.officialName || null,
            slug: apiClub.name.toLowerCase().replace(/\s+/g, '-'),
            country: countryName || null,
            country_code: countryCode || null, // ISO-2 code matching medusa.region_country.iso_2
            crest_url: apiClub.image || null,
            colors: apiClub.colors || null,
            stadium_name: apiClub.stadiumName || apiClub.stadium?.name || null,
            stadium_seats: apiClub.stadiumSeats || apiClub.stadium?.seats || null,
            founded_on: apiClub.foundedOn || null,
            current_market_value: apiClub.currentMarketValue || apiClub.marketValue || null,
            external_url: apiClub.url || null,
          })
        }
      } catch (apiError) {
        console.warn('[DATA-RETRIEVAL] Failed to fetch club from API:', apiError)
      }
    }

    if (!club) {
      throw new Error(`Club not found: ${clubId}`)
    }

    // 4. Get optional details
    const result: {
      club: Club
      players?: Player[]
      seasons?: Season[]
    } = { club }

    if (includePlayers && seasonId) {
      // Get players for club/season
      const contracts = await this.repository.findContractsByClubSeason(clubId, seasonId)
      const playerIds = new Set(contracts.map(c => c.player_id))
      
      const players: Player[] = []
      for (const playerId of Array.from(playerIds)) {
        const player = await this.repository.findPlayerById(playerId)
        if (player) {
          players.push(player)
        }
      }
      result.players = players
    }

    if (includeSeasons) {
      // Get seasons for club (via contracts)
      const contracts = await this.repository.findContractsByClubSeason(clubId, '')
      const seasonIds = new Set(contracts.map(c => c.season_id))
      
      const seasons: Season[] = []
      for (const seasonId of Array.from(seasonIds)) {
        const season = await this.repository.findSeasonByLabelOrTmId('', seasonId)
        if (season) {
          seasons.push(season)
        }
      }
      result.seasons = seasons
    }

    // 5. Cache result
    this.clubCache.set(cacheKey, result as any)

    return result
  }

  /**
   * Get player with optional details (contracts, clubs)
   * Strategy: Cache → Database → API
   */
  async getPlayerWithDetails(options: GetPlayerWithDetailsOptions): Promise<{
    player: Player
    contracts?: Array<{
      club: Club
      season: Season
      jerseyNumber?: number
    }>
    clubs?: Club[]
  }> {
    const { playerId, includeContracts, includeClubs } = options

    // 1. Check cache
    const cacheKey = `player:${playerId}:${includeContracts}:${includeClubs}`
    const cached = this.playerCache.get(cacheKey)
    if (cached) {
      return cached as any
    }

    // 2. Try database
    let player = await this.repository.findPlayerById(playerId)

    // 3. If not in database, try API
    if (!player) {
      try {
        const apiPlayer = await this.transfermarktClient.getPlayerDetails(playerId)
        if (apiPlayer) {
          // Upsert to database
          player = await this.repository.upsertPlayer({
            id: apiPlayer.id,
            full_name: apiPlayer.name,
            known_as: null,
            date_of_birth: apiPlayer.dateOfBirth || null,
            nationalities: apiPlayer.nationality || null,
            primary_country_code: null, // Would need country mapper
            height_cm: apiPlayer.height || null,
            preferred_position: apiPlayer.position || null,
            foot: apiPlayer.foot || null,
            current_club_id: null,
            current_shirt_number: null,
            profile_url: null,
            image_url: null,
          })
        }
      } catch (apiError) {
        console.warn('[DATA-RETRIEVAL] Failed to fetch player from API:', apiError)
      }
    }

    if (!player) {
      throw new Error(`Player not found: ${playerId}`)
    }

    // 4. Get optional details
    const result: {
      player: Player
      contracts?: Array<{
        club: Club
        season: Season
        jerseyNumber?: number
      }>
      clubs?: Club[]
    } = { player }

    if (includeContracts) {
      // Get all contracts for player
      // Note: We need to query player_contracts by player_id
      // For now, we'll use a simplified approach
      // TODO: Add findContractsByPlayerId to repository
      result.contracts = []
    }

    if (includeClubs) {
      // Get clubs from contracts
      if (result.contracts) {
        result.clubs = Array.from(
          new Map(result.contracts.map(c => [c.club.id, c.club])).values()
        )
      }
    }

    // 5. Cache result
    this.playerCache.set(cacheKey, result as any)

    return result
  }

  /**
   * Get season with optional details (clubs, competitions)
   * Strategy: Cache → Database → API
   */
  async getSeasonWithDetails(options: GetSeasonWithDetailsOptions): Promise<{
    season: Season
    clubs?: Club[]
    competitions?: Array<{
      id: string
      name: string
    }>
  }> {
    const { seasonId, includeClubs, includeCompetitions } = options

    // 1. Check cache
    const cacheKey = `season:${seasonId}:${includeClubs}:${includeCompetitions}`
    const cached = this.seasonCache.get(cacheKey)
    if (cached) {
      return cached as any
    }

    // 2. Try database
    const season = await this.repository.findSeasonByLabelOrTmId('', seasonId)

    if (!season) {
      throw new Error(`Season not found: ${seasonId}`)
    }

    // 3. Get optional details
    const result: {
      season: Season
      clubs?: Club[]
      competitions?: Array<{
        id: string
        name: string
      }>
    } = { season }

    if (includeClubs) {
      // Get clubs from contracts
      // Note: We need to query player_contracts by season_id
      // For now, we'll use a simplified approach
      // TODO: Add findContractsBySeasonId to repository
      result.clubs = []
    }

    if (includeCompetitions && season.competition_id) {
      // Get competition details
      // TODO: Add findCompetitionById to repository
      result.competitions = []
    }

    // 4. Cache result
    this.seasonCache.set(cacheKey, result as any)

    return result
  }

  /**
   * Clear all caches (useful for testing or forced refresh)
   */
  clearCaches(): void {
    this.clubCache.clear()
    this.playerCache.clear()
    this.seasonCache.clear()
  }
}

