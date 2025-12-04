-- Create kit_templates table for embedding-based template matching
CREATE TABLE metadata.kit_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id TEXT REFERENCES metadata.clubs(id) ON DELETE CASCADE,
  player_id TEXT REFERENCES metadata.players(id) ON DELETE SET NULL,
  season_id UUID REFERENCES metadata.seasons(id) ON DELETE SET NULL,
  kit_type TEXT, -- 'Home', 'Away', 'Third', 'GK', etc.
  image_embedding vector(3072) NOT NULL, -- OpenAI embedding-3-large dimension
  example_jersey_id UUID REFERENCES public.jerseys(id) ON DELETE SET NULL,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Indexes
-- Note: Embedding index skipped due to pgvector dimension limit (3072 > 2000)
-- Similarity search will work but use sequential scan (acceptable for template matching)
-- Can add index later if pgvector version supports >2000 dimensions

CREATE INDEX idx_kit_templates_club_season ON metadata.kit_templates(club_id, season_id, kit_type);
CREATE INDEX idx_kit_templates_usage_count ON metadata.kit_templates(usage_count DESC);

-- Comments
COMMENT ON TABLE metadata.kit_templates IS 'Templates for jersey embeddings to skip Vision analysis if similar jersey already analyzed.';
COMMENT ON COLUMN metadata.kit_templates.image_embedding IS 'OpenAI embedding-3-large vector (3072 dimensions) from cover image of example jersey.';
COMMENT ON COLUMN metadata.kit_templates.usage_count IS 'Number of times this template was used to skip Vision analysis.';

