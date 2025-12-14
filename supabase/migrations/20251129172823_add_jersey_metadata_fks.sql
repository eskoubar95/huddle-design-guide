-- Add optional foreign key fields to public.jerseys for metadata linking
-- These fields are nullable - jerseys can exist without metadata links
-- User text fields (club, season, player_name, player_number) remain primary truth
-- Related to: HUD-28

ALTER TABLE public.jerseys
ADD COLUMN club_id TEXT REFERENCES metadata.clubs(id) ON DELETE SET NULL,
ADD COLUMN player_id TEXT REFERENCES metadata.players(id) ON DELETE SET NULL,
ADD COLUMN season_id UUID REFERENCES metadata.seasons(id) ON DELETE SET NULL;

-- Add indexes for FK lookups
CREATE INDEX idx_jerseys_club_id ON public.jerseys(club_id);
CREATE INDEX idx_jerseys_player_id ON public.jerseys(player_id);
CREATE INDEX idx_jerseys_season_id ON public.jerseys(season_id);

-- Add comments explaining purpose
COMMENT ON COLUMN public.jerseys.club_id IS 'Optional reference to metadata.clubs.id. User text field "club" remains primary truth.';
COMMENT ON COLUMN public.jerseys.player_id IS 'Optional reference to metadata.players.id. User text field "player_name" remains primary truth.';
COMMENT ON COLUMN public.jerseys.season_id IS 'Optional reference to metadata.seasons.id. User text field "season" remains primary truth.';

