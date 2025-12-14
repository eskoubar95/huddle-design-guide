-- Add primary_country_code to players table
-- Maps first nationality from nationalities array to ISO-2 code

ALTER TABLE metadata.players
ADD COLUMN primary_country_code TEXT REFERENCES medusa.region_country(iso_2) ON DELETE SET NULL;

-- Add index for country lookups
CREATE INDEX idx_players_primary_country_code ON metadata.players(primary_country_code);

-- Add comment
COMMENT ON COLUMN metadata.players.primary_country_code IS 'ISO-2 code of primary nationality (first entry in nationalities array), referencing medusa.region_country.iso_2';

