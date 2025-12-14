// @ts-nocheck - Deno runtime (TypeScript doesn't understand Deno types)
/**
 * Search Service
 * 
 * Business logic for searching metadata (clubs, players, seasons).
 * Handles: Database search, API fallback, fuzzy matching, relevance ranking.
 * 
 * This service provides unified search capabilities across all metadata types,
 * combining database lookups with Transfermarkt API fallback for comprehensive results.
 */

import { mapCountryToIso2 } from '../utils/country-mapper.ts'
import { MetadataRepository } from '../repositories/metadata-repository.ts'
import { TransfermarktClient } from '../repositories/transfermarkt-client.ts'
import type { Club, Player, Season } from '../repositories/metadata-repository.ts'

/**
 * Options for club search
 * 
 * @interface SearchClubsOptions
 * @property {string} query - Search query string
 * @property {string} [country] - Filter by country name or ISO-2 code
 * @property {number} [limit=20] - Maximum number of results
 * @property {boolean} [fuzzy=true] - Enable fuzzy matching
 */
export interface SearchClubsOptions {
  query: string
  country?: string
  limit?: number
  fuzzy?: boolean
}

/**
 * Options for player search
 * 
 * @interface SearchPlayersOptions
 * @property {string} query - Search query string (player name)
 * @property {string} [clubId] - Filter by club ID (for context-aware search)
 * @property {string} [seasonId] - Filter by season ID (for context-aware search)
 * @property {number} [limit=20] - Maximum number of results
 * @property {boolean} [fuzzy=true] - Enable fuzzy matching
 */
export interface SearchPlayersOptions {
  query: string
  clubId?: string
  seasonId?: string
  limit?: number
  fuzzy?: boolean
}

/**
 * Options for season search
 * 
 * @interface SearchSeasonsOptions
 * @property {string} query - Search query string (season label or year)
 * @property {string} [competitionId] - Filter by competition ID
 * @property {'league' | 'calendar' | 'tournament'} [seasonType] - Filter by season type
 * @property {number} [limit=20] - Maximum number of results
 */
export interface SearchSeasonsOptions {
  query: string
  competitionId?: string
  seasonType?: 'league' | 'calendar' | 'tournament'
  limit?: number
}

/**
 * Search Service
 * 
 * Provides unified search capabilities for clubs, players, and seasons,
 * incorporating database lookups, Transfermarkt API fallbacks, fuzzy matching,
 * and relevance ranking.
 * 
 * @class SearchService
 */
export class SearchService {
  /**
   * Create a new SearchService instance
   * 
   * @param {MetadataRepository} repository - Repository for database operations
   * @param {TransfermarktClient} transfermarktClient - Client for Transfermarkt API calls
   */
  constructor(
    private repository: MetadataRepository,
    private transfermarktClient: TransfermarktClient
  ) {}

  /**
   * Search clubs
   * 
   * Strategy: Database lookup → Transfermarkt API fallback → Rank results
   * 
   * Searches for clubs in the database first, then falls back to Transfermarkt API
   * if insufficient results are found. Results are ranked by relevance and filtered
   * by country if specified.
   * 
   * @param {SearchClubsOptions} options - Search options
   * @returns {Promise<Club[]>} Array of matching clubs, ranked by relevance
   * 
   * @example
   * ```typescript
   * const clubs = await searchService.searchClubs({ query: 'FC Copenhagen' })
   * // Returns: Array of clubs matching the query
   * 
   * const danishClubs = await searchService.searchClubs({ 
   *   query: 'FC', 
   *   country: 'dk',
   *   limit: 10 
   * })
   * // Returns: Danish clubs matching the query
   * ```
   */
  async searchClubs(options: SearchClubsOptions): Promise<Club[]> {
    const { query, country, limit = 20, fuzzy = true } = options

    // 1. Try database search using findClubByName (fuzzy matching)
    const dbResults: Club[] = []
    
    // Try exact match first
    const exactMatch = await this.repository.findClubByName(query)
    if (exactMatch) {
      dbResults.push(exactMatch)
    }

    // If fuzzy enabled and not enough results, try partial matches
    // Note: findClubByName already does ILIKE matching, so it's fuzzy by default
    if (fuzzy && dbResults.length < limit) {
      // For now, we rely on findClubByName's ILIKE matching
      // In future, we could add a dedicated searchClubs method to repository
    }

    // Filter by country if specified
    let filteredResults = dbResults
    if (country) {
      filteredResults = dbResults.filter(c => 
        c.country?.toLowerCase() === country.toLowerCase() ||
        c.country_code?.toLowerCase() === country.toLowerCase()
      )
    }

    // 2. If insufficient results, try Transfermarkt API
    if (filteredResults.length < limit) {
      try {
        const apiClubs = await this.transfermarktClient.searchClubs(query)
        
        // Convert API clubs to Club format
        const apiResults: Club[] = []
        for (const apiClub of apiClubs.slice(0, limit - filteredResults.length)) {
          // Check if already in database
          const existing = await this.repository.findClubByName(apiClub.name)
          if (existing) {
            apiResults.push(existing)
          } else {
            // Create club in database
            try {
              // Map country name to ISO-2 code (required for medusa.region_country foreign key)
              const countryCode = apiClub.country ? mapCountryToIso2(apiClub.country) : null
              
              const saved = await this.repository.upsertClub({
                id: apiClub.id,
                name: apiClub.name,
                official_name: apiClub.officialName || null,
                slug: apiClub.name.toLowerCase().replace(/\s+/g, '-'),
                country: apiClub.country || null,
                country_code: countryCode || null, // ISO-2 code matching medusa.region_country.iso_2
                crest_url: apiClub.image || null,
                colors: apiClub.colors || null,
                stadium_name: apiClub.stadium?.name || null,
                stadium_seats: apiClub.stadium?.seats || null,
                founded_on: apiClub.foundedOn || null,
                current_market_value: apiClub.marketValue || null,
                external_url: apiClub.url || null,
              })
              apiResults.push(saved)
            } catch (err) {
              console.warn('[SEARCH-SERVICE] Failed to upsert API club:', err)
              // Still add to results even if DB save fails (create minimal Club object)
              apiResults.push({
                id: apiClub.id,
                name: apiClub.name,
                official_name: apiClub.officialName || null,
                slug: apiClub.name.toLowerCase().replace(/\s+/g, '-'),
                country: apiClub.country || null,
                country_code: apiClub.countryCode || null,
                crest_url: apiClub.image || null,
                colors: apiClub.colors || null,
                stadium_name: apiClub.stadium?.name || null,
                stadium_seats: apiClub.stadium?.seats || null,
                founded_on: apiClub.foundedOn || null,
                current_market_value: apiClub.marketValue || null,
                external_url: apiClub.url || null,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              })
            }
          }
        }

        // 3. Merge and rank results
        return this.rankSearchResults(filteredResults, apiResults, query, limit)
      } catch (apiError) {
        console.warn('[SEARCH-SERVICE] Transfermarkt API search failed:', apiError)
        // Return database results only
      }
    }

    return filteredResults.slice(0, limit)
  }

  /**
   * Search players: Database → API → Rank results
   */
  async searchPlayers(options: SearchPlayersOptions): Promise<Player[]> {
    const { query, clubId, seasonId, limit = 20, fuzzy = true } = options

    // If clubId + seasonId provided, prioritize player_contracts
    if (clubId && seasonId) {
      const contracts = await this.repository.findContractsByClubSeason(clubId, seasonId)
      
      // Filter by query (fuzzy match on player name)
      const queryLower = query.toLowerCase()
      const matchingContracts = contracts.filter(c => {
        const nameLower = (c.full_name || '').toLowerCase()
        if (fuzzy) {
          return nameLower.includes(queryLower) || queryLower.includes(nameLower)
        }
        return nameLower === queryLower
      })

      // Get unique players from contracts
      const playerIds = new Set(matchingContracts.map(c => c.player_id))
      const players: Player[] = []

      for (const playerId of Array.from(playerIds).slice(0, limit)) {
        const player = await this.repository.findPlayerById(playerId)
        if (player) {
          players.push(player)
        }
      }

      return players
    }

    // Otherwise, general player search
    const dbPlayers = await this.repository.findPlayerByName(query)
    
    // Filter by fuzzy matching if enabled
    let filteredPlayers = dbPlayers
    if (fuzzy) {
      const queryLower = query.toLowerCase()
      filteredPlayers = dbPlayers.filter(p => {
        const nameLower = (p.full_name || '').toLowerCase()
        return nameLower.includes(queryLower) || queryLower.includes(nameLower)
      })
    }

    if (filteredPlayers.length < limit) {
      try {
        const apiPlayers = await this.transfermarktClient.searchPlayers(query, limit - filteredPlayers.length)
        
        // Convert API players to Player format and upsert
        const apiResults: Player[] = []
        for (const apiPlayer of apiPlayers) {
          const existing = await this.repository.findPlayerById(apiPlayer.id)
          if (existing) {
            apiResults.push(existing)
          } else {
            // Upsert player
            const saved = await this.repository.upsertPlayer({
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
            apiResults.push(saved)
          }
        }

        return this.rankSearchResults(filteredPlayers, apiResults, query, limit)
      } catch (apiError) {
        console.warn('[SEARCH-SERVICE] Transfermarkt API search failed:', apiError)
      }
    }

    return filteredPlayers.slice(0, limit)
  }

  /**
   * Search seasons: Database → Competition context → Rank results
   */
  async searchSeasons(options: SearchSeasonsOptions): Promise<Season[]> {
    const { query, competitionId, seasonType, limit = 20 } = options

    // If competitionId provided, use competition_seasons mapping
    if (competitionId) {
      try {
        const apiSeasons = await this.transfermarktClient.getClubCompetitions(competitionId, query)
        
        // Note: getClubCompetitions returns competitions, not seasons
        // We need to get seasons for the competition
        // For now, fall back to general season search
        // TODO: Implement getCompetitionSeasons in TransfermarktClient
      } catch (apiError) {
        console.warn('[SEARCH-SERVICE] Failed to get competition seasons:', apiError)
      }
    }

    // General season search using findSeasonByLabelOrTmId
    // Note: This is a simplified search - in future, we could add a dedicated searchSeasons method
    const queryLower = query.toLowerCase()
    const results: Season[] = []

    // Try to find season by label or tm_season_id
    const season = await this.repository.findSeasonByLabelOrTmId(query)
    if (season) {
      // Filter by seasonType if specified
      if (!seasonType || season.season_type === seasonType) {
        results.push(season)
      }
    }

    // Note: This is a basic implementation
    // In future, we could add a dedicated searchSeasons method to repository
    // that does ILIKE matching on label and tm_season_id

    return results.slice(0, limit)
  }

  /**
   * Rank search results by relevance
   */
  private rankSearchResults<T extends { name?: string; full_name?: string }>(
    dbResults: T[],
    apiResults: T[],
    query: string,
    limit: number
  ): T[] {
    const queryLower = query.toLowerCase()
    
    // Score function: exact match > starts with > contains
    const score = (item: T): number => {
      const name = (item.name || item.full_name || '').toLowerCase()
      if (name === queryLower) return 100
      if (name.startsWith(queryLower)) return 80
      if (name.includes(queryLower)) return 60
      return 40
    }

    // Merge, deduplicate, and rank
    const allResults = [...dbResults, ...apiResults]
    const uniqueResults = Array.from(
      new Map(allResults.map(item => [
        (item as any).id || (item.name || item.full_name || ''),
        item
      ])).values()
    )

    return uniqueResults
      .map(item => ({ item, score: score(item) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(({ item }) => item)
  }
}

