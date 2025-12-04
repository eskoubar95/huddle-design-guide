/**
 * Repository for metadata schema operations
 * Handles all database access for metadata tables
 */

import { createServiceClient } from '../supabase/server';
import { query } from '../db/postgres-connection';

// Type definitions for metadata schema tables
// These will be replaced with generated types once metadata schema is in Database type
export interface Competition {
  id: string;
  name: string;
  country?: string | null; // DEPRECATED: Use country_code instead
  country_code?: string | null; // ISO-2 code referencing medusa.region_country.iso_2
  continent?: string | null;
  clubs_count?: number | null;
  players_count?: number | null;
  total_market_value?: number | null;
  mean_market_value?: number | null;
  created_at: string;
  updated_at: string;
}

export interface Season {
  id: string;
  tm_season_id: string;
  label: string;
  start_year: number;
  end_year: number;
  created_at: string;
}

export interface Club {
  id: string;
  name: string;
  official_name?: string | null;
  slug?: string | null;
  country?: string | null; // DEPRECATED: Use country_code instead
  country_code?: string | null; // ISO-2 code referencing medusa.region_country.iso_2
  crest_url?: string | null;
  colors?: string[] | null;
  stadium_name?: string | null;
  stadium_seats?: number | null;
  founded_on?: string | null;
  current_market_value?: number | null;
  external_url?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ClubSeason {
  id: string;
  competition_id: string;
  season_id: string;
  club_id: string;
  created_at: string;
}

export interface Player {
  id: string;
  full_name: string;
  known_as?: string | null;
  date_of_birth?: string | null;
  nationalities?: string[] | null;
  primary_country_code?: string | null; // ISO-2 code of primary nationality
  height_cm?: number | null;
  preferred_position?: string | null;
  foot?: string | null;
  current_club_id?: string | null;
  current_shirt_number?: number | null;
  profile_url?: string | null;
  image_url?: string | null;
  created_at: string;
  updated_at: string;
}

export interface PlayerContract {
  id: string;
  player_id: string;
  club_id: string;
  season_id: string;
  jersey_number: number;
  source?: string | null;
  from_date?: string | null;
  to_date?: string | null;
  created_at: string;
}

export class MetadataRepository {
  /**
   * Upsert competition
   */
  async upsertCompetition(data: {
    id: string;
    name: string;
    country?: string;
    continent?: string;
    clubs_count?: number;
    players_count?: number;
    total_market_value?: number;
    mean_market_value?: number;
  }): Promise<Competition> {
    const supabase = await createServiceClient();
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment, @typescript-eslint/no-explicit-any
    // @ts-ignore - metadata schema not yet in Database type, will be fixed after types regeneration
    const { data: competition, error } = await (supabase as any)
      .schema('metadata')
      .from('competitions')
      .upsert(data, { onConflict: 'id' })
      .select()
      .single();

    if (error) throw error;
    return competition as unknown as Competition;
  }

  /**
   * Upsert season
   */
  async upsertSeason(data: {
    tm_season_id: string;
    label: string;
    start_year: number;
    end_year: number;
  }): Promise<Season> {
    const supabase = await createServiceClient();
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore - metadata schema not yet in Database type, will be fixed after types regeneration
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: season, error } = await (supabase as any)
      .schema('metadata')
      .from('seasons')
      .upsert(data, { onConflict: 'tm_season_id' })
      .select()
      .single();

    if (error) throw error;
    return season as Season;
  }

  /**
   * Upsert club
   */
  async upsertClub(data: {
    id: string;
    name: string;
    official_name?: string;
    slug?: string;
    country?: string;
    crest_url?: string;
    colors?: string[];
    stadium_name?: string;
    stadium_seats?: number;
    founded_on?: string;
    current_market_value?: number;
    external_url?: string;
  }): Promise<Club> {
    const supabase = await createServiceClient();
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore - metadata schema not yet in Database type, will be fixed after types regeneration
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: club, error } = await (supabase as any)
      .schema('metadata')
      .from('clubs')
      .upsert(data, { onConflict: 'id' })
      .select()
      .single();

    if (error) throw error;
    return club as Club;
  }

  /**
   * Upsert club season relationship
   */
  async upsertClubSeason(data: {
    competition_id: string;
    season_id: string;
    club_id: string;
  }): Promise<ClubSeason> {
    const supabase = await createServiceClient();
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore - metadata schema not yet in Database type, will be fixed after types regeneration
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: clubSeason, error } = await (supabase as any)
      .schema('metadata')
      .from('club_seasons')
      .upsert(data, { 
        onConflict: 'competition_id,season_id,club_id' 
      })
      .select()
      .single();

    if (error) throw error;
    return clubSeason as ClubSeason;
  }

  /**
   * Upsert player
   */
  async upsertPlayer(data: {
    id: string;
    full_name: string;
    known_as?: string;
    date_of_birth?: string;
    nationalities?: string[];
    height_cm?: number;
    preferred_position?: string;
    foot?: string;
    current_club_id?: string;
    current_shirt_number?: number;
    profile_url?: string;
    image_url?: string;
  }): Promise<Player> {
    const supabase = await createServiceClient();
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore - metadata schema not yet in Database type, will be fixed after types regeneration
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: player, error } = await (supabase as any)
      .schema('metadata')
      .from('players')
      .upsert(data, { onConflict: 'id' })
      .select()
      .single();

    if (error) throw error;
    return player as Player;
  }

  /**
   * Upsert player contract
   */
  async upsertPlayerContract(data: {
    player_id: string;
    club_id: string;
    season_id: string;
    jersey_number: number;
    source?: string;
    from_date?: string;
    to_date?: string;
  }): Promise<PlayerContract> {
    const supabase = await createServiceClient();
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore - metadata schema not yet in Database type, will be fixed after types regeneration
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: contract, error } = await (supabase as any)
      .schema('metadata')
      .from('player_contracts')
      .upsert(data, { 
        onConflict: 'player_id,club_id,season_id,jersey_number' 
      })
      .select()
      .single();

    if (error) throw error;
    return contract as PlayerContract;
  }

  /**
   * Find season by UUID (for backfill)
   */
  async findSeasonById(seasonId: string): Promise<Season | null> {
    const supabase = await createServiceClient();
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore - metadata schema not yet in Database type, will be fixed after types regeneration
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .schema('metadata')
      .from('seasons')
      .select('*')
      .eq('id', seasonId)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    return (data as unknown as Season) || null;
  }

  /**
   * Find season by tm_season_id or label
   */
  async findSeasonByTmIdOrLabel(tmSeasonId: string, label?: string): Promise<Season | null> {
    const supabase = await createServiceClient();
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore - metadata schema not yet in Database type, will be fixed after types regeneration
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = (supabase as any)
      .schema('metadata')
      .from('seasons')
      .select('*');

    if (tmSeasonId) {
      query = query.eq('tm_season_id', tmSeasonId);
    }

    if (label) {
      query = query.or(`tm_season_id.eq.${tmSeasonId || ''},label.eq.${label}`);
    }

    const { data, error } = await query.maybeSingle();

    if (error && error.code !== 'PGRST116') { // PGRST116 = not found
      throw error;
    }

    return (data as unknown as Season) || null;
  }

  /**
   * Find club by ID
   */
  async findClubById(clubId: string): Promise<Club | null> {
    const supabase = await createServiceClient();
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore - metadata schema not yet in Database type, will be fixed after types regeneration
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .schema('metadata')
      .from('clubs')
      .select('*')
      .eq('id', clubId)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    return (data as unknown as Club) || null;
  }

  /**
   * Get competitions for a specific club and season
   * Uses direct PostgreSQL connection because metadata schema is not accessible via PostgREST
   */
  async getCompetitionsForClubAndSeason(clubId: string, seasonId: string): Promise<Competition[]> {
    try {
      // Step 1: Get competition IDs from club_seasons table
      const clubSeasonsData = await query<{ competition_id: string }>(
        `
        SELECT competition_id
        FROM metadata.club_seasons
        WHERE club_id = $1 AND season_id = $2
        `,
        [clubId, seasonId]
      );

      if (!clubSeasonsData || clubSeasonsData.length === 0) {
        return [];
      }

      // Extract unique competition IDs
      const competitionIds = [...new Set(clubSeasonsData.map((row) => row.competition_id))];

      // Step 2: Fetch competitions by IDs
      const competitionsData = await query<Competition>(
        `
        SELECT 
          id,
          name,
          country,
          country_code,
          continent,
          clubs_count,
          players_count,
          total_market_value,
          mean_market_value,
          created_at,
          updated_at
        FROM metadata.competitions
        WHERE id = ANY($1::text[])
        ORDER BY name
        `,
        [competitionIds]
      );

      return competitionsData || [];
    } catch (error) {
      console.error('[MetadataRepository] Error fetching competitions for club and season:', error);
      throw error;
    }
  }
}

