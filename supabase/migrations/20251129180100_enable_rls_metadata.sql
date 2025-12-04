-- Enable RLS on metadata tables and create read-only policies
-- Metadata is reference data - all users can read, only service role can write

-- Enable RLS on all metadata tables
ALTER TABLE metadata.competitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE metadata.seasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE metadata.clubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE metadata.club_seasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE metadata.players ENABLE ROW LEVEL SECURITY;
ALTER TABLE metadata.player_contracts ENABLE ROW LEVEL SECURITY;

-- Create SELECT policies (read-only for all authenticated users)
-- Service role bypasses RLS automatically, so it can still write

CREATE POLICY "Anyone can view competitions"
ON metadata.competitions FOR SELECT
USING (true);

CREATE POLICY "Anyone can view seasons"
ON metadata.seasons FOR SELECT
USING (true);

CREATE POLICY "Anyone can view clubs"
ON metadata.clubs FOR SELECT
USING (true);

CREATE POLICY "Anyone can view club_seasons"
ON metadata.club_seasons FOR SELECT
USING (true);

CREATE POLICY "Anyone can view players"
ON metadata.players FOR SELECT
USING (true);

CREATE POLICY "Anyone can view player_contracts"
ON metadata.player_contracts FOR SELECT
USING (true);

-- Note: No INSERT/UPDATE/DELETE policies are created
-- This means only service role (which bypasses RLS) can write to metadata tables
-- All other users (anon, authenticated) can only read

