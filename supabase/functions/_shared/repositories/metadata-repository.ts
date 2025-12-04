// @ts-nocheck - Deno runtime (TypeScript doesn't understand Deno types)
/**
 * Repository for metadata schema database operations
 * Uses direct PostgreSQL Client (NOT Supabase client) for metadata schema queries
 * 
 * NOTE: Supabase queries don't work on metadata schema, so we use direct SQL
 * via PostgreSQL Client (bypassing PostgREST)
 */

import { Client } from 'https://deno.land/x/postgres@v0.17.0/mod.ts'
import { getPostgresConnectionString } from '../utils/db-connection.ts'

// Type definitions for metadata entities
export interface Club {
  id: string
  name: string
  official_name?: string | null
  slug?: string | null
  country?: string | null
  country_code?: string | null
  crest_url?: string | null
  colors?: string[] | null
  stadium_name?: string | null
  stadium_seats?: number | null
  founded_on?: string | null
  current_market_value?: number | null
  external_url?: string | null
  created_at: string
  updated_at: string
}

export interface Season {
  id: string
  tm_season_id: string
  label: string
  start_year: number
  end_year: number
  season_type?: 'league' | 'calendar' | 'tournament' | null
  competition_id?: string | null
  created_at: string
}

export interface Player {
  id: string
  full_name: string
  known_as?: string | null
  date_of_birth?: string | null
  nationalities?: string[] | null
  height_cm?: number | null
  preferred_position?: string | null
  foot?: string | null
  current_club_id?: string | null
  current_shirt_number?: number | null
  profile_url?: string | null
  image_url?: string | null
  primary_country_code?: string | null
  created_at: string
  updated_at: string
}

export interface PlayerContract {
  id: string
  player_id: string
  club_id: string
  season_id: string
  jersey_number?: number | null
  source?: string | null
  from_date?: string | null
  to_date?: string | null
  created_at: string
}

export interface Competition {
  id: string
  name: string
  country?: string | null
  country_code?: string | null
  continent?: string | null
  clubs_count?: number | null
  players_count?: number | null
  total_market_value?: number | null
  mean_market_value?: number | null
  created_at: string
  updated_at: string
}

/**
 * Repository for metadata schema operations
 * Uses PostgreSQL Client for direct SQL queries (bypasses PostgREST)
 */
export class MetadataRepository {
  private client: Client | null = null
  private connectionString: string

  constructor(connectionString?: string) {
    this.connectionString = connectionString || getPostgresConnectionString()
  }

  /**
   * Get or create PostgreSQL client connection
   * Caller should close connection when done: await repository.close()
   */
  async connect(): Promise<void> {
    if (!this.client) {
      this.client = new Client(this.connectionString)
      await this.client.connect()
    }
  }

  /**
   * Close PostgreSQL client connection
   */
  async close(): Promise<void> {
    if (this.client) {
      await this.client.end()
      this.client = null
    }
  }

  /**
   * Ensure client is connected (auto-connect if needed)
   */
  private async ensureConnected(): Promise<Client> {
    if (!this.client) {
      await this.connect()
    }
    if (!this.client) {
      throw new Error('Failed to connect to PostgreSQL')
    }
    return this.client
  }

  // ============================================
  // CLUB OPERATIONS
  // ============================================

  /**
   * Find club by name (fuzzy search with ILIKE)
   * Searches both name and official_name columns to handle local language names
   * Returns first match found
   */
  async findClubByName(searchTerm: string): Promise<Club | null> {
    const client = await this.ensureConnected()
    
    const result = await client.queryObject<Club>(
      `SELECT id, name, official_name, slug, country, country_code, 
              crest_url, colors, stadium_name, stadium_seats, 
              founded_on, current_market_value, external_url, 
              created_at, updated_at
       FROM metadata.clubs 
       WHERE name ILIKE $1 
          OR official_name ILIKE $1
       LIMIT 1`,
      [`%${searchTerm}%`]
    )

    return result.rows && result.rows.length > 0 ? result.rows[0] : null
  }

  /**
   * Find club by ID
   */
  async findClubById(clubId: string): Promise<Club | null> {
    const client = await this.ensureConnected()
    
    const result = await client.queryObject<Club>(
      `SELECT id, name, official_name, slug, country, country_code, 
              crest_url, colors, stadium_name, stadium_seats, 
              founded_on, current_market_value, external_url, 
              created_at, updated_at
       FROM metadata.clubs 
       WHERE id = $1 
       LIMIT 1`,
      [clubId]
    )

    return result.rows && result.rows.length > 0 ? result.rows[0] : null
  }

  /**
   * Upsert club (insert or update)
   */
  async upsertClub(club: {
    id: string
    name: string
    official_name?: string | null
    slug?: string | null
    country?: string | null
    country_code?: string | null
    crest_url?: string | null
    colors?: string[] | null
    stadium_name?: string | null
    stadium_seats?: number | null
    founded_on?: string | null
    current_market_value?: number | null
    external_url?: string | null
  }): Promise<Club> {
    const client = await this.ensureConnected()
    
    const result = await client.queryObject<Club>(
      `INSERT INTO metadata.clubs (
        id, name, official_name, slug, country, country_code, 
        crest_url, colors, stadium_name, stadium_seats, 
        founded_on, current_market_value, external_url
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        official_name = EXCLUDED.official_name,
        slug = EXCLUDED.slug,
        country = EXCLUDED.country,
        country_code = EXCLUDED.country_code,
        crest_url = EXCLUDED.crest_url,
        colors = EXCLUDED.colors,
        stadium_name = EXCLUDED.stadium_name,
        stadium_seats = EXCLUDED.stadium_seats,
        founded_on = EXCLUDED.founded_on,
        current_market_value = EXCLUDED.current_market_value,
        external_url = EXCLUDED.external_url,
        updated_at = now()
      RETURNING id, name, official_name, slug, country, country_code, 
                crest_url, colors, stadium_name, stadium_seats, 
                founded_on, current_market_value, external_url, 
                created_at, updated_at`,
      [
        club.id,
        club.name,
        club.official_name || null,
        club.slug || null,
        club.country || null,
        club.country_code || null,
        club.crest_url || null,
        club.colors || null,
        club.stadium_name || null,
        club.stadium_seats || null,
        club.founded_on || null,
        club.current_market_value || null,
        club.external_url || null,
      ]
    )

    if (!result.rows || result.rows.length === 0) {
      throw new Error(`Failed to upsert club: ${club.id}`)
    }

    return result.rows[0]
  }

  // ============================================
  // SEASON OPERATIONS
  // ============================================

  /**
   * Find season by label or tm_season_id
   */
  async findSeasonByLabelOrTmId(label?: string, tmSeasonId?: string): Promise<Season | null> {
    const client = await this.ensureConnected()
    
    let query = `SELECT id, tm_season_id, label, start_year, end_year, 
                        season_type, competition_id, created_at
                 FROM metadata.seasons 
                 WHERE `
    const params: string[] = []
    
    if (label && tmSeasonId) {
      query += `(label = $1 OR tm_season_id = $2) LIMIT 1`
      params.push(label, tmSeasonId)
    } else if (label) {
      query += `label = $1 LIMIT 1`
      params.push(label)
    } else if (tmSeasonId) {
      query += `tm_season_id = $1 LIMIT 1`
      params.push(tmSeasonId)
    } else {
      return null
    }

    const result = await client.queryObject<Season>(query, params)

    return result.rows && result.rows.length > 0 ? result.rows[0] : null
  }

  /**
   * Find season by UUID
   */
  async findSeasonById(id: string): Promise<Season | null> {
    const client = await this.ensureConnected()
    
    const query = `SELECT id, tm_season_id, label, start_year, end_year, 
                          season_type, competition_id, created_at
                   FROM metadata.seasons 
                   WHERE id = $1 LIMIT 1`

    const result = await client.queryObject<Season>(query, [id])

    return result.rows && result.rows.length > 0 ? result.rows[0] : null
  }

  /**
   * Upsert season (insert or update)
   */
  async upsertSeason(season: {
    tm_season_id: string
    label: string
    start_year: number
    end_year: number
    season_type?: 'league' | 'calendar' | 'tournament' | null
  }): Promise<Season> {
    const client = await this.ensureConnected()
    
    const result = await client.queryObject<Season>(
      `INSERT INTO metadata.seasons (tm_season_id, label, start_year, end_year, season_type)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (tm_season_id) DO UPDATE SET
         label = EXCLUDED.label,
         start_year = EXCLUDED.start_year,
         end_year = EXCLUDED.end_year,
         season_type = EXCLUDED.season_type
       RETURNING id, tm_season_id, label, start_year, end_year, 
                 season_type, competition_id, created_at`,
      [
        season.tm_season_id,
        season.label,
        season.start_year,
        season.end_year,
        season.season_type || null,
      ]
    )

    if (!result.rows || result.rows.length === 0) {
      throw new Error(`Failed to upsert season: ${season.tm_season_id}`)
    }

    return result.rows[0]
  }

  // ============================================
  // PLAYER OPERATIONS
  // ============================================

  /**
   * Find player by ID
   */
  async findPlayerById(playerId: string): Promise<Player | null> {
    const client = await this.ensureConnected()
    
    const result = await client.queryObject<Player>(
      `SELECT id, full_name, known_as, date_of_birth, nationalities, 
              height_cm, preferred_position, foot, current_club_id, 
              current_shirt_number, profile_url, image_url, primary_country_code, 
              created_at, updated_at
       FROM metadata.players 
       WHERE id = $1 
       LIMIT 1`,
      [playerId]
    )

    return result.rows && result.rows.length > 0 ? result.rows[0] : null
  }

  /**
   * Find player by name (fuzzy search)
   */
  async findPlayerByName(name: string): Promise<Player[]> {
    const client = await this.ensureConnected()
    
    const result = await client.queryObject<Player>(
      `SELECT id, full_name, known_as, date_of_birth, nationalities, 
              height_cm, preferred_position, foot, current_club_id, 
              current_shirt_number, profile_url, image_url, primary_country_code, 
              created_at, updated_at
       FROM metadata.players 
       WHERE full_name ILIKE $1 
       LIMIT 10`,
      [`%${name}%`]
    )

    return result.rows || []
  }

  /**
   * Upsert player (insert or update)
   */
  async upsertPlayer(player: {
    id: string
    full_name: string
    known_as?: string | null
    date_of_birth?: string | null
    nationalities?: string[] | null
    height_cm?: number | null
    preferred_position?: string | null
    foot?: string | null
    current_club_id?: string | null
    current_shirt_number?: number | null
    profile_url?: string | null
    image_url?: string | null
    primary_country_code?: string | null
  }): Promise<Player> {
    const client = await this.ensureConnected()
    
    const result = await client.queryObject<Player>(
      `INSERT INTO metadata.players (
        id, full_name, known_as, date_of_birth, nationalities, 
        height_cm, preferred_position, foot, current_club_id, 
        current_shirt_number, profile_url, image_url, primary_country_code
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      ON CONFLICT (id) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        known_as = EXCLUDED.known_as,
        date_of_birth = EXCLUDED.date_of_birth,
        nationalities = EXCLUDED.nationalities,
        height_cm = EXCLUDED.height_cm,
        preferred_position = EXCLUDED.preferred_position,
        foot = EXCLUDED.foot,
        current_club_id = EXCLUDED.current_club_id,
        current_shirt_number = EXCLUDED.current_shirt_number,
        profile_url = EXCLUDED.profile_url,
        image_url = EXCLUDED.image_url,
        primary_country_code = EXCLUDED.primary_country_code,
        updated_at = now()
      RETURNING id, full_name, known_as, date_of_birth, nationalities, 
                height_cm, preferred_position, foot, current_club_id, 
                current_shirt_number, profile_url, image_url, primary_country_code, 
                created_at, updated_at`,
      [
        player.id,
        player.full_name,
        player.known_as || null,
        player.date_of_birth || null,
        player.nationalities || null,
        player.height_cm || null,
        player.preferred_position || null,
        player.foot || null,
        player.current_club_id || null,
        player.current_shirt_number || null,
        player.profile_url || null,
        player.image_url || null,
        player.primary_country_code || null,
      ]
    )

    if (!result.rows || result.rows.length === 0) {
      throw new Error(`Failed to upsert player: ${player.id}`)
    }

    return result.rows[0]
  }

  // ============================================
  // PLAYER CONTRACT OPERATIONS
  // ============================================

  /**
   * Find player contract by club, season, and jersey number
   */
  async findContractByJerseyNumber(
    clubId: string,
    seasonId: string,
    jerseyNumber: number
  ): Promise<PlayerContract & { full_name: string } | null> {
    const client = await this.ensureConnected()
    
    const result = await client.queryObject<PlayerContract & { full_name: string }>(
      `SELECT pc.id, pc.player_id, pc.club_id, pc.season_id, 
              pc.jersey_number, pc.source, pc.from_date, pc.to_date, pc.created_at,
              p.full_name
       FROM metadata.player_contracts pc
       JOIN metadata.players p ON p.id = pc.player_id
       WHERE pc.club_id = $1 
         AND pc.season_id = $2 
         AND pc.jersey_number = $3
       LIMIT 1`,
      [clubId, seasonId, jerseyNumber]
    )

    return result.rows && result.rows.length > 0 ? result.rows[0] : null
  }

  /**
   * Get all player contracts for a club/season
   */
  async findContractsByClubSeason(
    clubId: string,
    seasonId: string
  ): Promise<(PlayerContract & { full_name: string; jersey_number: number | null })[]> {
    const client = await this.ensureConnected()
    
    const result = await client.queryObject<PlayerContract & { full_name: string }>(
      `SELECT pc.id, pc.player_id, pc.club_id, pc.season_id, 
              pc.jersey_number, pc.source, pc.from_date, pc.to_date, pc.created_at,
              p.full_name
       FROM metadata.player_contracts pc
       JOIN metadata.players p ON p.id = pc.player_id
       WHERE pc.club_id = $1 
         AND pc.season_id = $2
       ORDER BY pc.jersey_number NULLS LAST`,
      [clubId, seasonId]
    )

    return result.rows || []
  }

  /**
   * Upsert player contract (insert or update)
   */
  async upsertPlayerContract(contract: {
    player_id: string
    club_id: string
    season_id: string
    jersey_number?: number | null
    source?: string | null
    from_date?: string | null
    to_date?: string | null
  }): Promise<PlayerContract> {
    const client = await this.ensureConnected()
    
    const result = await client.queryObject<PlayerContract>(
      `INSERT INTO metadata.player_contracts (
        player_id, club_id, season_id, jersey_number, 
        source, from_date, to_date
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (player_id, club_id, season_id, jersey_number) DO UPDATE SET
        source = EXCLUDED.source,
        from_date = EXCLUDED.from_date,
        to_date = EXCLUDED.to_date
      RETURNING id, player_id, club_id, season_id, jersey_number, 
                source, from_date, to_date, created_at`,
      [
        contract.player_id,
        contract.club_id,
        contract.season_id,
        contract.jersey_number || null,
        contract.source || null,
        contract.from_date || null,
        contract.to_date || null,
      ]
    )

    if (!result.rows || result.rows.length === 0) {
      throw new Error(`Failed to upsert player contract`)
    }

    return result.rows[0]
  }

  // ============================================
  // COMPETITION OPERATIONS
  // ============================================

  /**
   * Find competition by ID
   */
  async findCompetitionById(competitionId: string): Promise<Competition | null> {
    const client = await this.ensureConnected()
    
    const result = await client.queryObject<Competition>(
      `SELECT id, name, country, country_code, continent, clubs_count, 
              players_count, total_market_value, mean_market_value, 
              created_at, updated_at
       FROM metadata.competitions 
       WHERE id = $1 
       LIMIT 1`,
      [competitionId]
    )

    return result.rows && result.rows.length > 0 ? result.rows[0] : null
  }

  /**
   * Upsert competition (insert or update)
   */
  async upsertCompetition(competition: {
    id: string
    name: string
    country?: string | null
    country_code?: string | null
    continent?: string | null
    clubs_count?: number | null
    players_count?: number | null
    total_market_value?: number | null
    mean_market_value?: number | null
  }): Promise<Competition> {
    const client = await this.ensureConnected()
    
    const result = await client.queryObject<Competition>(
      `INSERT INTO metadata.competitions (
        id, name, country, country_code, continent, clubs_count, 
        players_count, total_market_value, mean_market_value
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        country = EXCLUDED.country,
        country_code = EXCLUDED.country_code,
        continent = EXCLUDED.continent,
        clubs_count = EXCLUDED.clubs_count,
        players_count = EXCLUDED.players_count,
        total_market_value = EXCLUDED.total_market_value,
        mean_market_value = EXCLUDED.mean_market_value,
        updated_at = now()
      RETURNING id, name, country, country_code, continent, clubs_count, 
                players_count, total_market_value, mean_market_value, 
                created_at, updated_at`,
      [
        competition.id,
        competition.name,
        competition.country || null,
        competition.country_code || null,
        competition.continent || null,
        competition.clubs_count || null,
        competition.players_count || null,
        competition.total_market_value || null,
        competition.mean_market_value || null,
      ]
    )

    if (!result.rows || result.rows.length === 0) {
      throw new Error(`Failed to upsert competition: ${competition.id}`)
    }

    return result.rows[0]
  }

  /**
   * Get seasons for a competition (using competition_seasons junction table)
   */
  async getCompetitionSeasons(competitionId: string): Promise<Season[]> {
    const client = await this.ensureConnected()
    
    const result = await client.queryObject<Season>(
      `SELECT s.id, s.tm_season_id, s.label, s.start_year, s.end_year, 
              s.season_type, s.competition_id, s.created_at
       FROM metadata.seasons s
       JOIN metadata.competition_seasons cs ON cs.season_id = s.id
       WHERE cs.competition_id = $1
       ORDER BY s.start_year DESC`,
      [competitionId]
    )

    return result.rows || []
  }

  /**
   * Check if club/season has sufficient contracts (for backfill trigger)
   */
  async countContractsByClubSeason(clubId: string, seasonId: string): Promise<number> {
    const client = await this.ensureConnected()
    
    const result = await client.queryObject<{ count: number }>(
      `SELECT COUNT(*) as count
       FROM metadata.player_contracts
       WHERE club_id = $1 AND season_id = $2`,
      [clubId, seasonId]
    )

    return result.rows && result.rows.length > 0 ? Number(result.rows[0].count) : 0
  }

  /**
   * Upsert club_season relationship (club participates in competition in season)
   */
  async upsertClubSeason(relationship: {
    competition_id: string
    season_id: string
    club_id: string
  }): Promise<void> {
    const client = await this.ensureConnected()
    
    await client.queryObject(
      `INSERT INTO metadata.club_seasons (
        competition_id, season_id, club_id
      ) VALUES ($1, $2, $3)
      ON CONFLICT (competition_id, season_id, club_id) DO NOTHING`,
      [
        relationship.competition_id,
        relationship.season_id,
        relationship.club_id,
      ]
    )
  }

  /**
   * Execute a custom SQL query (for non-metadata schema operations)
   * Use this for public schema queries (e.g., updating public.jerseys)
   */
  async executeQuery<T = unknown>(query: string, params?: unknown[]): Promise<T[]> {
    const client = await this.ensureConnected()
    
    const result = await client.queryObject<T>(query, params || [])
    return result.rows || []
  }

  /**
   * Find player contracts by club and player (across all seasons)
   * Used for player matching when season is unknown
   */
  async findPlayerContractsByClubAndPlayer(
    clubId: string,
    playerName?: string,
    jerseyNumber?: number
  ): Promise<Array<{
    player_id: string
    season_id: string
    jersey_number: number | null
    full_name: string
    season_label: string
    season_uuid: string
    start_year: number
  }>> {
    const client = await this.ensureConnected()
    
    let query = `
      SELECT DISTINCT pc.player_id, pc.season_id, pc.jersey_number,
             p.full_name, s.label as season_label, s.id as season_uuid, s.start_year
      FROM metadata.player_contracts pc
      JOIN metadata.players p ON p.id = pc.player_id
      JOIN metadata.seasons s ON s.id = pc.season_id
      WHERE pc.club_id = $1
    `
    const params: any[] = [clubId]
    
    // Add player name filter if available
    if (playerName) {
      query += ` AND (p.full_name ILIKE $${params.length + 1} OR p.known_as ILIKE $${params.length + 1})`
      params.push(`%${playerName}%`)
    }
    
    // Add jersey number filter if available
    if (jerseyNumber !== undefined && jerseyNumber !== null) {
      query += ` AND pc.jersey_number = $${params.length + 1}`
      params.push(jerseyNumber)
    }
    
    query += ` ORDER BY s.start_year DESC LIMIT 10`
    
    const result = await client.queryObject<{
      player_id: string
      season_id: string
      jersey_number: number | null
      full_name: string
      season_label: string
      season_uuid: string
      start_year: number
    }>(query, params)
    
    return result.rows || []
  }
}

