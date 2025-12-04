/**
 * Transfermarkt API Client Service
 * 
 * Base URL: https://transfermarkt-api-production-43d7.up.railway.app/docs#/
 * 
 * Handles all API calls to Transfermarkt API with error handling and rate limiting.
 */

const TRANSFERMARKT_API_BASE = process.env.TRANSFERMARKT_API_URL || 
  'https://transfermarkt-api-production-43d7.up.railway.app';

// Separate error class to avoid declaration merging issues
class TransfermarktApiError extends Error {
  status?: number;
  
  constructor(message: string, status?: number) {
    super(message);
    this.name = 'TransfermarktApiError';
    this.status = status;
  }
}

export class TransfermarktService {
  private baseUrl: string;
  private rateLimitDelay: number = 100; // 100ms delay between requests

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || TRANSFERMARKT_API_BASE;
  }

  /**
   * Search for competitions by name
   * GET /competitions/search/{competition_name}
   */
  async searchCompetitions(competitionName: string): Promise<CompetitionSearchResult[]> {
    const url = `${this.baseUrl}/competitions/search/${encodeURIComponent(competitionName)}`;
    const response = await this.fetchWithRetry<{ results: CompetitionSearchResult[] }>(url);
    // API returns {results: [...]} not array directly
    return response.results || [];
  }

  /**
   * Get clubs for a competition and season
   * GET /competitions/{competition_id}/clubs?season_id={season_id}
   */
  async getCompetitionClubs(
    competitionId: string,
    seasonId: string
  ): Promise<CompetitionClubsResult> {
    const url = `${this.baseUrl}/competitions/${competitionId}/clubs?season_id=${seasonId}`;
    return this.fetchWithRetry<CompetitionClubsResult>(url);
  }

  /**
   * Get players for a club and season
   * GET /clubs/{club_id}/players?season_id={season_id}
   */
  async getClubPlayers(
    clubId: string,
    seasonId: string
  ): Promise<ClubPlayersResult> {
    const url = `${this.baseUrl}/clubs/${clubId}/players?season_id=${seasonId}`;
    return this.fetchWithRetry<ClubPlayersResult>(url);
  }

  /**
   * Get jersey numbers for a player (historical)
   * GET /players/{player_id}/jersey_numbers
   */
  async getPlayerJerseyNumbers(
    playerId: string
  ): Promise<PlayerJerseyNumbersResult> {
    const url = `${this.baseUrl}/players/${playerId}/jersey_numbers`;
    return this.fetchWithRetry<PlayerJerseyNumbersResult>(url);
  }

  /**
   * Search for clubs by name
   * GET /clubs/search/{club_name}
   */
  async searchClubs(clubName: string): Promise<ClubSearchResult[]> {
    const url = `${this.baseUrl}/clubs/search/${encodeURIComponent(clubName)}`;
    return this.fetchWithRetry<ClubSearchResult[]>(url);
  }

  /**
   * Get club profile
   * GET /clubs/{club_id}/profile
   */
  async getClubProfile(clubId: string): Promise<ClubProfileResult> {
    const url = `${this.baseUrl}/clubs/${clubId}/profile`;
    return this.fetchWithRetry<ClubProfileResult>(url);
  }

  /**
   * Generic fetch with retry logic and rate limiting
   */
  private async fetchWithRetry<T>(
    url: string,
    retries: number = 3
  ): Promise<T> {
    for (let i = 0; i < retries; i++) {
      try {
        // Rate limiting delay
        if (i > 0) {
          await this.delay(this.rateLimitDelay * i);
        }

        const response = await fetch(url, {
          headers: {
            'Accept': 'application/json',
          },
        });

        if (!response.ok) {
          if (response.status === 429) {
            // Rate limited - wait longer
            await this.delay(1000 * (i + 1));
            continue;
          }
          throw new Error(`API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        return data as T;
      } catch (error) {
        if (i === retries - 1) {
          throw new TransfermarktApiError(
            `Failed to fetch ${url} after ${retries} retries: ${error instanceof Error ? error.message : String(error)}`
          );
        }
      }
    }
    throw new Error('Unreachable');
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Type definitions based on API docs (simplified - expand as needed)
export interface CompetitionSearchResult {
  id: string;
  name: string;
  country?: string;
  continent?: string;
  clubs?: number;
  players?: number;
  totalMarketValue?: number;
  meanMarketValue?: number;
}

export interface CompetitionClubsResult {
  clubs: Array<{
    id: string;
    name: string;
    // ... other fields from API
  }>;
}

export interface ClubPlayersResult {
  players: Array<{
    id: string;
    name: string; // API returns "name" not "fullName"
    position?: string; // Preferred position
    dateOfBirth?: string; // ISO date string
    nationality?: string[]; // API returns "nationality" (array of country names)
    height?: number; // Height in cm
    foot?: string; // "left", "right", "both"
    currentClub?: string; // Club name
    marketValue?: number;
    joinedOn?: string; // ISO date string
    signedFrom?: string;
    age?: number;
  }>;
}

export interface PlayerJerseyNumbersResult {
  id: string; // Player ID
  updatedAt: string; // ISO timestamp
  jerseyNumbers: Array<{
    season: string; // E.g. "25/26", "24/25"
    club: string; // Club ID
    jerseyNumber: number;
  }>;
}

export interface ClubSearchResult {
  id: string;
  name: string;
  // ... other fields
}

export interface ClubProfileResult {
  id: string;
  name: string;
  officialName?: string;
  country?: string;
  image?: string; // Crest URL
  colors?: string[]; // HEX colors
  stadiumName?: string;
  stadiumSeats?: number;
  foundedOn?: string; // Date string
  currentMarketValue?: number;
  externalUrl?: string;
}


