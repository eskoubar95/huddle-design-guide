/**
 * PostgreSQL-based repository for metadata schema operations
 * Uses direct PostgreSQL connection instead of Supabase client
 * Used for seed scripts and admin operations that bypass PostgREST
 */

import { query } from '../db/postgres-connection';
import type {
  Competition,
  Season,
  Club,
  ClubSeason,
  Player,
  PlayerContract,
} from './metadata-repository';

export class MetadataRepositoryPG {
  /**
   * Upsert competition
   */
  async upsertCompetition(data: {
    id: string;
    name: string;
    country?: string;
    country_code?: string;
    continent?: string;
    clubs_count?: number;
    players_count?: number;
    total_market_value?: number;
    mean_market_value?: number;
  }): Promise<Competition> {
    const result = await query<Competition>(
      `
      INSERT INTO metadata.competitions (
        id, name, country, country_code, continent, clubs_count, players_count,
        total_market_value, mean_market_value
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
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
      RETURNING *
    `,
      [
        data.id,
        data.name,
        data.country || null,
        data.country_code || null,
        data.continent || null,
        data.clubs_count || null,
        data.players_count || null,
        data.total_market_value || null,
        data.mean_market_value || null,
      ]
    );

    if (result.length === 0) {
      throw new Error(`Failed to upsert competition: ${data.id}`);
    }

    return result[0];
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
    const result = await query<Season>(
      `
      INSERT INTO metadata.seasons (tm_season_id, label, start_year, end_year)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (tm_season_id) DO UPDATE SET
        label = EXCLUDED.label,
        start_year = EXCLUDED.start_year,
        end_year = EXCLUDED.end_year
      RETURNING *
    `,
      [data.tm_season_id, data.label, data.start_year, data.end_year]
    );

    if (result.length === 0) {
      throw new Error(`Failed to upsert season: ${data.tm_season_id}`);
    }

    return result[0];
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
    country_code?: string;
    crest_url?: string;
    colors?: string[];
    stadium_name?: string;
    stadium_seats?: number;
    founded_on?: string;
    current_market_value?: number;
    external_url?: string;
  }): Promise<Club> {
    const result = await query<Club>(
      `
      INSERT INTO metadata.clubs (
        id, name, official_name, slug, country, country_code, crest_url, colors,
        stadium_name, stadium_seats, founded_on, current_market_value, external_url
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
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
      RETURNING *
    `,
      [
        data.id,
        data.name,
        data.official_name || null,
        data.slug || null,
        data.country || null,
        data.country_code || null,
        data.crest_url || null,
        data.colors || null,
        data.stadium_name || null,
        data.stadium_seats || null,
        data.founded_on || null,
        data.current_market_value || null,
        data.external_url || null,
      ]
    );

    if (result.length === 0) {
      throw new Error(`Failed to upsert club: ${data.id}`);
    }

    return result[0];
  }

  /**
   * Upsert club season
   */
  async upsertClubSeason(data: {
    competition_id: string;
    season_id: string;
    club_id: string;
  }): Promise<ClubSeason> {
    const result = await query<ClubSeason>(
      `
      INSERT INTO metadata.club_seasons (competition_id, season_id, club_id)
      VALUES ($1, $2, $3)
      ON CONFLICT (competition_id, season_id, club_id) DO NOTHING
      RETURNING *
    `,
      [data.competition_id, data.season_id, data.club_id]
    );

    if (result.length === 0) {
      // Already exists, fetch it
      const existing = await query<ClubSeason>(
        `
        SELECT * FROM metadata.club_seasons
        WHERE competition_id = $1 AND season_id = $2 AND club_id = $3
      `,
        [data.competition_id, data.season_id, data.club_id]
      );
      if (existing.length > 0) {
        return existing[0];
      }
      throw new Error(
        `Failed to upsert club season: ${data.competition_id}/${data.season_id}/${data.club_id}`
      );
    }

    return result[0];
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
    primary_country_code?: string;
    height_cm?: number;
    preferred_position?: string;
    foot?: string;
    current_club_id?: string;
    current_shirt_number?: number;
    profile_url?: string;
    image_url?: string;
  }): Promise<Player> {
    const result = await query<Player>(
      `
      INSERT INTO metadata.players (
        id, full_name, known_as, date_of_birth, nationalities, primary_country_code, height_cm,
        preferred_position, foot, current_club_id, current_shirt_number,
        profile_url, image_url
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      ON CONFLICT (id) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        known_as = EXCLUDED.known_as,
        date_of_birth = EXCLUDED.date_of_birth,
        nationalities = EXCLUDED.nationalities,
        primary_country_code = EXCLUDED.primary_country_code,
        height_cm = EXCLUDED.height_cm,
        preferred_position = EXCLUDED.preferred_position,
        foot = EXCLUDED.foot,
        current_club_id = EXCLUDED.current_club_id,
        current_shirt_number = EXCLUDED.current_shirt_number,
        profile_url = EXCLUDED.profile_url,
        image_url = EXCLUDED.image_url,
        updated_at = now()
      RETURNING *
    `,
      [
        data.id,
        data.full_name,
        data.known_as || null,
        data.date_of_birth || null,
        data.nationalities || null,
        data.primary_country_code || null,
        data.height_cm || null,
        data.preferred_position || null,
        data.foot || null,
        data.current_club_id || null,
        data.current_shirt_number || null,
        data.profile_url || null,
        data.image_url || null,
      ]
    );

    if (result.length === 0) {
      throw new Error(`Failed to upsert player: ${data.id}`);
    }

    return result[0];
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
    const result = await query<PlayerContract>(
      `
      INSERT INTO metadata.player_contracts (
        player_id, club_id, season_id, jersey_number, source, from_date, to_date
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (player_id, club_id, season_id, jersey_number) DO UPDATE SET
        source = EXCLUDED.source,
        from_date = EXCLUDED.from_date,
        to_date = EXCLUDED.to_date
      RETURNING *
    `,
      [
        data.player_id,
        data.club_id,
        data.season_id,
        data.jersey_number,
        data.source || null,
        data.from_date || null,
        data.to_date || null,
      ]
    );

    if (result.length === 0) {
      throw new Error(
        `Failed to upsert player contract: ${data.player_id}/${data.club_id}/${data.season_id}`
      );
    }

    return result[0];
  }

  /**
   * Find season by ID
   */
  async findSeasonById(id: string): Promise<Season | null> {
    const result = await query<Season>(
      'SELECT * FROM metadata.seasons WHERE id = $1',
      [id]
    );
    return result.length > 0 ? result[0] : null;
  }

  /**
   * Find season by Transfermarkt season ID or label
   */
  async findSeasonByTmIdOrLabel(
    tmSeasonId: string,
    label: string
  ): Promise<Season | null> {
    const result = await query<Season>(
      'SELECT * FROM metadata.seasons WHERE tm_season_id = $1 OR label = $2 LIMIT 1',
      [tmSeasonId, label]
    );
    return result.length > 0 ? result[0] : null;
  }

  /**
   * Find club by ID
   */
  async findClubById(id: string): Promise<Club | null> {
    const result = await query<Club>(
      'SELECT * FROM metadata.clubs WHERE id = $1',
      [id]
    );
    return result.length > 0 ? result[0] : null;
  }

  /**
   * Find club by slug
   */
  async findClubBySlug(slug: string): Promise<Club | null> {
    const result = await query<Club>(
      'SELECT * FROM metadata.clubs WHERE slug = $1',
      [slug]
    );
    return result.length > 0 ? result[0] : null;
  }

  /**
   * Get all seeded competitions
   */
  async getSeededCompetitions(): Promise<Competition[]> {
    return query<Competition>('SELECT * FROM metadata.competitions ORDER BY name');
  }

  /**
   * Get all seeded clubs
   */
  async getSeededClubs(): Promise<Club[]> {
    return query<Club>('SELECT * FROM metadata.clubs ORDER BY name');
  }
}

