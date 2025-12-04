-- Add season_type and competition_id columns to metadata.seasons
-- Related to: Metadata Implementation Playbook - Phase 1
-- Purpose: Enable differentiation between league seasons, calendar year seasons, and tournaments

-- Add season_type column with CHECK constraint
ALTER TABLE metadata.seasons 
ADD COLUMN season_type TEXT 
CHECK (season_type IN ('league', 'calendar', 'tournament'));

-- Add index for faster queries filtering by season_type
CREATE INDEX idx_seasons_season_type ON metadata.seasons(season_type);

-- Add comment explaining the column
COMMENT ON COLUMN metadata.seasons.season_type IS 
  'Type of season: league (multi-year, e.g. 23/24), calendar (single year, e.g. 2023), or tournament (single year event, e.g. VM 2006)';

-- Add competition_id column for direct mapping to competitions
ALTER TABLE metadata.seasons 
ADD COLUMN competition_id TEXT 
REFERENCES metadata.competitions(id) ON DELETE SET NULL;

-- Add index for faster queries filtering by competition_id
CREATE INDEX idx_seasons_competition_id ON metadata.seasons(competition_id);

-- Add comment explaining the column
COMMENT ON COLUMN metadata.seasons.competition_id IS 
  'Optional reference to competition for direct mapping (useful for tournaments and competition-specific seasons)';

