-- Create competition_seasons junction table
-- Related to: Metadata Implementation Playbook - Phase 1
-- Purpose: Direct mapping between competitions and seasons (from Transfermarkt API /competitions/{id}/seasons endpoint)

CREATE TABLE metadata.competition_seasons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id TEXT NOT NULL REFERENCES metadata.competitions(id) ON DELETE CASCADE,
  season_id UUID NOT NULL REFERENCES metadata.seasons(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(competition_id, season_id)
);

-- Indexes for efficient queries
CREATE INDEX idx_competition_seasons_competition_id ON metadata.competition_seasons(competition_id);
CREATE INDEX idx_competition_seasons_season_id ON metadata.competition_seasons(season_id);

-- Composite index for common query pattern: get all seasons for a competition
CREATE INDEX idx_competition_seasons_comp_season ON metadata.competition_seasons(competition_id, season_id);

-- Add comment explaining the table
COMMENT ON TABLE metadata.competition_seasons IS 
  'Junction table mapping competitions to seasons. Used for /competitions/{id}/seasons API endpoint integration.';

-- Grant permissions (inherits from schema default)
-- Already covered by: ALTER DEFAULT PRIVILEGES IN SCHEMA metadata GRANT SELECT ON TABLES TO anon, authenticated;

