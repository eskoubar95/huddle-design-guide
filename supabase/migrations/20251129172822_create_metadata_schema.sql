-- Create metadata schema for football reference data
-- Separate from public schema for clear separation of concerns
-- Related to: HUD-28

CREATE SCHEMA IF NOT EXISTS metadata;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA metadata TO postgres;
GRANT CREATE ON SCHEMA metadata TO postgres;

-- Comment explaining purpose
COMMENT ON SCHEMA metadata IS 'Football reference data imported from Transfermarkt API. Used for jersey metadata matching and analytics.';

-- 1. Competitions table
CREATE TABLE metadata.competitions (
  id TEXT NOT NULL PRIMARY KEY, -- Transfermarkt competition id (e.g. "DK1")
  name TEXT NOT NULL,
  country TEXT,
  continent TEXT, -- E.g. "UEFA", "CONMEBOL"
  clubs_count INTEGER,
  players_count INTEGER,
  total_market_value NUMERIC,
  mean_market_value NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2. Seasons table
CREATE TABLE metadata.seasons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tm_season_id TEXT NOT NULL UNIQUE, -- Raw season id from API (e.g. "2025")
  label TEXT NOT NULL, -- Human-readable label (e.g. "25/26" or "2025")
  start_year INTEGER NOT NULL, -- First calendar year (e.g. 2025 for "25/26")
  end_year INTEGER NOT NULL, -- Second calendar year (e.g. 2026 for "25/26")
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(tm_season_id, label)
);

CREATE INDEX idx_seasons_tm_season_id ON metadata.seasons(tm_season_id);
CREATE INDEX idx_seasons_start_year ON metadata.seasons(start_year);

-- 3. Clubs table
CREATE TABLE metadata.clubs (
  id TEXT NOT NULL PRIMARY KEY, -- Transfermarkt club id (e.g. "190" for FC Copenhagen)
  name TEXT NOT NULL,
  official_name TEXT,
  slug TEXT UNIQUE, -- Normalized name for search/fuzzy matching
  country TEXT,
  crest_url TEXT, -- From API image field
  colors TEXT[], -- HEX colors from API colors array
  stadium_name TEXT,
  stadium_seats INTEGER,
  founded_on DATE,
  current_market_value NUMERIC,
  external_url TEXT, -- Transfermarkt club URL
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_clubs_slug ON metadata.clubs(slug);
CREATE INDEX idx_clubs_country ON metadata.clubs(country);

-- 4. Club Seasons table (club X participates in competition Y in season Z)
CREATE TABLE metadata.club_seasons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  competition_id TEXT NOT NULL REFERENCES metadata.competitions(id) ON DELETE CASCADE,
  season_id UUID NOT NULL REFERENCES metadata.seasons(id) ON DELETE CASCADE,
  club_id TEXT NOT NULL REFERENCES metadata.clubs(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(competition_id, season_id, club_id)
);

CREATE INDEX idx_club_seasons_club_id ON metadata.club_seasons(club_id);
CREATE INDEX idx_club_seasons_season_id ON metadata.club_seasons(season_id);
CREATE INDEX idx_club_seasons_competition_id ON metadata.club_seasons(competition_id);

-- 5. Players table
CREATE TABLE metadata.players (
  id TEXT NOT NULL PRIMARY KEY, -- Transfermarkt player id (e.g. "370997")
  full_name TEXT NOT NULL,
  known_as TEXT, -- Optional short name/nickname
  date_of_birth DATE,
  nationalities TEXT[],
  height_cm INTEGER,
  preferred_position TEXT, -- E.g. "Goalkeeper", "Centre-Back"
  foot TEXT, -- "left", "right", "both"
  current_club_id TEXT REFERENCES metadata.clubs(id) ON DELETE SET NULL,
  current_shirt_number INTEGER,
  profile_url TEXT,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_players_current_club_id ON metadata.players(current_club_id);
CREATE INDEX idx_players_full_name ON metadata.players(full_name);

-- 6. Player Contracts table (critical for matching)
CREATE TABLE metadata.player_contracts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id TEXT NOT NULL REFERENCES metadata.players(id) ON DELETE CASCADE,
  club_id TEXT NOT NULL REFERENCES metadata.clubs(id) ON DELETE CASCADE,
  season_id UUID NOT NULL REFERENCES metadata.seasons(id) ON DELETE CASCADE,
  jersey_number INTEGER NOT NULL,
  source TEXT, -- E.g. "jersey_numbers" or "transfer_derived" for debugging
  from_date DATE,
  to_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  -- Allow multiple rows per (player_id, club_id, season_id) for number changes
  UNIQUE(player_id, club_id, season_id, jersey_number)
);

-- Critical indexes for matching queries
CREATE INDEX idx_player_contracts_club_season_number ON metadata.player_contracts(club_id, season_id, jersey_number);
CREATE INDEX idx_player_contracts_player_id ON metadata.player_contracts(player_id);
CREATE INDEX idx_player_contracts_season_id ON metadata.player_contracts(season_id);

-- Grant permissions for metadata schema (public read-only)
-- Metadata is reference data - all authenticated users can read, only service role can write
GRANT USAGE ON SCHEMA metadata TO anon, authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA metadata TO anon, authenticated;
-- Future tables will automatically get SELECT permission via default privileges
ALTER DEFAULT PRIVILEGES IN SCHEMA metadata GRANT SELECT ON TABLES TO anon, authenticated;

-- Add updated_at triggers
CREATE OR REPLACE FUNCTION metadata.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_competitions_updated_at
BEFORE UPDATE ON metadata.competitions
FOR EACH ROW
EXECUTE FUNCTION metadata.update_updated_at_column();

CREATE TRIGGER update_clubs_updated_at
BEFORE UPDATE ON metadata.clubs
FOR EACH ROW
EXECUTE FUNCTION metadata.update_updated_at_column();

CREATE TRIGGER update_players_updated_at
BEFORE UPDATE ON metadata.players
FOR EACH ROW
EXECUTE FUNCTION metadata.update_updated_at_column();

