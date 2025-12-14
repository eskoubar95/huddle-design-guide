// @ts-nocheck - Deno runtime (TypeScript doesn't understand Deno types)
/**
 * Transfermarkt API client
 * Handles all API calls to Transfermarkt API with retry logic and error handling
 */

// Type definitions for Transfermarkt API responses
export interface TransfermarktClub {
  id: string
  name: string
  officialName?: string
  country?: string
  countryCode?: string
  image?: string
  colors?: string[]
  stadium?: {
    name?: string
    seats?: number
  }
  stadiumName?: string // From /profile endpoint
  stadiumSeats?: number // From /profile endpoint
  foundedOn?: string
  marketValue?: number
  currentMarketValue?: number // From /profile endpoint
  url?: string
  isNationalTeam?: boolean | string
  league?: {
    id?: string
    name?: string
    countryId?: string
    countryName?: string // Use this for country mapping when country field is missing
    tier?: string
  }
}

export interface TransfermarktPlayer {
  id: string
  name: string
  position?: string
  dateOfBirth?: string
  nationality?: string[]
  height?: number
  foot?: string
  marketValue?: number
  image?: string
  url?: string
}

export interface TransfermarktJerseyNumber {
  season: string // E.g. "19/20" or "2023"
  club: string // Club ID
  jerseyNumber: number
}

export interface TransfermarktSeason {
  id: string // tm_season_id
  label: string // E.g. "23/24" or "2006"
  season_type?: 'league' | 'calendar' | 'tournament'
}

export interface TransfermarktCompetition {
  id: string
  name: string
  country?: string
  countryCode?: string
  continent?: string
  type?: string // E.g. "league", "cup", "friendly"
}

/**
 * Transfermarkt API Client with retry logic and error handling
 */
export class TransfermarktClient {
  private baseUrl: string
  private maxRetries: number = 3
  private retryDelay: number = 1000 // 1 second

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || 
      Deno.env.get('TRANSFERMARKT_API_URL') || 
      'https://transfermarkt-api-production-43d7.up.railway.app'
  }

  /**
   * Retry wrapper for API calls
   */
  private async retry<T>(
    fn: () => Promise<T>,
    retries: number = this.maxRetries
  ): Promise<T> {
    try {
      return await fn()
    } catch (error) {
      if (retries > 0) {
        console.warn(`[TransfermarktAPI] Request failed, retrying... (${retries} retries left)`)
        await new Promise(resolve => setTimeout(resolve, this.retryDelay))
        return this.retry(fn, retries - 1)
      }
      throw error
    }
  }

  /**
   * Make HTTP request with error handling
   */
  private async request<T>(url: string, options?: RequestInit): Promise<T> {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Transfermarkt API error (${response.status}): ${errorText}`)
    }

    const data = await response.json()
    return data as T
  }

  // ============================================
  // CLUB API OPERATIONS
  // ============================================

  /**
   * Search clubs by name
   * Endpoint: /clubs/search/{query}
   */
  async searchClubs(query: string): Promise<TransfermarktClub[]> {
    return this.retry(async () => {
      const url = `${this.baseUrl}/clubs/search/${encodeURIComponent(query)}`
      console.log(`[TransfermarktAPI] Searching clubs: ${query}`)
      
      const result = await this.request<{
        results?: TransfermarktClub[]
        clubs?: TransfermarktClub[]
      }>(url)

      // Handle different response formats
      const clubs = result.results || result.clubs || []
      console.log(`[TransfermarktAPI] Found ${clubs.length} clubs`)
      return clubs
    })
  }

  /**
   * Get club details by ID
   * Endpoint: /clubs/{clubId}/profile
   * 
   * Note: The profile endpoint returns league.countryName instead of top-level country.
   * We map league.countryName to country for consistency.
   */
  async getClubDetails(clubId: string): Promise<TransfermarktClub | null> {
    return this.retry(async () => {
      const url = `${this.baseUrl}/clubs/${clubId}/profile`
      console.log(`[TransfermarktAPI] Fetching club profile: ${clubId}`)
      
      try {
        const result = await this.request<any>(url)
        
        // Map /profile response format to TransfermarktClub interface
        // The profile endpoint returns: officialName, league.countryName, stadiumName, stadiumSeats, etc.
        const club: TransfermarktClub = {
          id: result.id,
          name: result.name,
          officialName: result.officialName,
          // Map league.countryName to country (profile endpoint doesn't have top-level country)
          country: result.league?.countryName || result.country,
          countryCode: result.countryCode, // May be missing from profile endpoint
          image: result.image,
          colors: result.colors,
          stadium: result.stadium || (result.stadiumName ? {
            name: result.stadiumName,
            seats: result.stadiumSeats,
          } : undefined),
          stadiumName: result.stadiumName,
          stadiumSeats: result.stadiumSeats,
          foundedOn: result.foundedOn,
          marketValue: result.currentMarketValue || result.marketValue,
          currentMarketValue: result.currentMarketValue,
          url: result.url,
          league: result.league,
        }
        
        return club
      } catch (error) {
        console.warn(`[TransfermarktAPI] Failed to fetch club profile ${clubId}:`, error)
        return null
      }
    })
  }

  /**
   * Get players for a club/season
   * Endpoint: /clubs/{clubId}/players?season_id={seasonId}
   */
  async getClubPlayers(clubId: string, seasonId: string): Promise<TransfermarktPlayer[]> {
    return this.retry(async () => {
      const url = `${this.baseUrl}/clubs/${clubId}/players?season_id=${seasonId}`
      console.log(`[TransfermarktAPI] Fetching players for club ${clubId}, season ${seasonId}`)
      
      const result = await this.request<{
        results?: {
          players?: TransfermarktPlayer[]
        }
        players?: TransfermarktPlayer[]
      }>(url)

      // Handle different response formats
      const players = result.results?.players || result.players || []
      console.log(`[TransfermarktAPI] Found ${players.length} players`)
      return players
    })
  }

  /**
   * Get competitions for a club/season
   * Endpoint: /clubs/{clubId}/competitions?season_id={seasonId}
   */
  async getClubCompetitions(clubId: string, seasonId: string): Promise<TransfermarktCompetition[]> {
    return this.retry(async () => {
      const url = `${this.baseUrl}/clubs/${clubId}/competitions?season_id=${seasonId}`
      console.log(`[TransfermarktAPI] Fetching competitions for club ${clubId}, season ${seasonId}`)
      
      try {
        const result = await this.request<{
          results?: {
            competitions?: TransfermarktCompetition[]
          }
          competitions?: TransfermarktCompetition[]
        }>(url)

        // Handle different response formats
        const competitions = result.results?.competitions || result.competitions || []
        console.log(`[TransfermarktAPI] Found ${competitions.length} competitions`)
        return competitions
      } catch (error) {
        console.warn(`[TransfermarktAPI] Failed to fetch competitions:`, error)
        return []
      }
    })
  }

  // ============================================
  // PLAYER API OPERATIONS
  // ============================================

  /**
   * Search players by name
   * Endpoint: /players/search/{query}?page_number={page}
   */
  async searchPlayers(query: string, page: number = 1): Promise<TransfermarktPlayer[]> {
    return this.retry(async () => {
      const url = `${this.baseUrl}/players/search/${encodeURIComponent(query)}?page_number=${page}`
      console.log(`[TransfermarktAPI] Searching players: ${query} (page ${page})`)
      
      const result = await this.request<{
        results?: TransfermarktPlayer[]
      }>(url)

      const players = result.results || []
      console.log(`[TransfermarktAPI] Found ${players.length} players`)
      return players
    })
  }

  /**
   * Get player details by ID
   * Endpoint: /players/{id}
   */
  async getPlayerDetails(playerId: string): Promise<TransfermarktPlayer | null> {
    return this.retry(async () => {
      const url = `${this.baseUrl}/players/${playerId}`
      console.log(`[TransfermarktAPI] Fetching player details: ${playerId}`)
      
      try {
        const result = await this.request<TransfermarktPlayer>(url)
        return result
      } catch (error) {
        console.warn(`[TransfermarktAPI] Failed to fetch player ${playerId}:`, error)
        return null
      }
    })
  }

  /**
   * Get jersey numbers for a player
   * Endpoint: /players/{id}/jersey_numbers
   */
  async getPlayerJerseyNumbers(playerId: string): Promise<TransfermarktJerseyNumber[]> {
    return this.retry(async () => {
      const url = `${this.baseUrl}/players/${playerId}/jersey_numbers`
      console.log(`[TransfermarktAPI] Fetching jersey numbers for player ${playerId}`)
      
      const result = await this.request<{
        results?: {
          jerseyNumbers?: TransfermarktJerseyNumber[]
        }
        jerseyNumbers?: TransfermarktJerseyNumber[]
      }>(url)

      // Handle different response formats
      const jerseyNumbers = result.results?.jerseyNumbers || result.jerseyNumbers || []
      console.log(`[TransfermarktAPI] Found ${jerseyNumbers.length} jersey numbers`)
      return jerseyNumbers
    })
  }

  // ============================================
  // COMPETITION/SEASON API OPERATIONS
  // ============================================

  /**
   * Get seasons for a competition (NEW)
   * Endpoint: /competitions/{competitionId}/seasons
   * 
   * Returns list of seasons available for a competition
   */
  async getCompetitionSeasons(competitionId: string): Promise<TransfermarktSeason[]> {
    return this.retry(async () => {
      const url = `${this.baseUrl}/competitions/${competitionId}/seasons`
      console.log(`[TransfermarktAPI] Fetching seasons for competition ${competitionId}`)
      
      try {
        const result = await this.request<{
          results?: TransfermarktSeason[]
          seasons?: TransfermarktSeason[]
        }>(url)

        // Handle different response formats
        const seasons = result.results || result.seasons || []
        console.log(`[TransfermarktAPI] Found ${seasons.length} seasons`)
        return seasons
      } catch (error) {
        console.warn(`[TransfermarktAPI] Failed to fetch seasons for competition ${competitionId}:`, error)
        // Return empty array instead of throwing - competition might not have seasons endpoint
        return []
      }
    })
  }

  /**
   * Get competition details by ID
   * Endpoint: /competitions/{id}
   */
  async getCompetitionDetails(competitionId: string): Promise<{
    id: string
    name: string
    country?: string
    countryCode?: string
    continent?: string
  } | null> {
    return this.retry(async () => {
      const url = `${this.baseUrl}/competitions/${competitionId}`
      console.log(`[TransfermarktAPI] Fetching competition details: ${competitionId}`)
      
      try {
        const result = await this.request<{
          id: string
          name: string
          country?: string
          countryCode?: string
          continent?: string
        }>(url)
        return result
      } catch (error) {
        console.warn(`[TransfermarktAPI] Failed to fetch competition ${competitionId}:`, error)
        return null
      }
    })
  }
}

