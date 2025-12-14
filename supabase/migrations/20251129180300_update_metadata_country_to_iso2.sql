-- Update metadata schema to use Medusa region_country.iso_2 instead of TEXT country
-- This provides standardized ISO codes and better data integrity

-- 1. Add new country_code columns (will reference medusa.region_country.iso_2)
ALTER TABLE metadata.competitions
ADD COLUMN country_code TEXT REFERENCES medusa.region_country(iso_2) ON DELETE SET NULL;

ALTER TABLE metadata.clubs
ADD COLUMN country_code TEXT REFERENCES medusa.region_country(iso_2) ON DELETE SET NULL;

-- 2. Migrate existing country TEXT values to country_code ISO-2 codes
-- Map common country names to ISO-2 codes
UPDATE metadata.competitions
SET country_code = CASE
  WHEN LOWER(country) = 'denmark' THEN 'dk'
  WHEN LOWER(country) = 'england' THEN 'gb'
  WHEN LOWER(country) = 'germany' THEN 'de'
  WHEN LOWER(country) = 'spain' THEN 'es'
  WHEN LOWER(country) = 'italy' THEN 'it'
  WHEN LOWER(country) = 'france' THEN 'fr'
  ELSE NULL
END
WHERE country IS NOT NULL;

UPDATE metadata.clubs
SET country_code = CASE
  WHEN LOWER(country) = 'denmark' THEN 'dk'
  WHEN LOWER(country) = 'england' THEN 'gb'
  WHEN LOWER(country) = 'germany' THEN 'de'
  WHEN LOWER(country) = 'spain' THEN 'es'
  WHEN LOWER(country) = 'italy' THEN 'it'
  WHEN LOWER(country) = 'france' THEN 'fr'
  ELSE NULL
END
WHERE country IS NOT NULL;

-- 3. Add indexes for country_code lookups
CREATE INDEX idx_competitions_country_code ON metadata.competitions(country_code);
CREATE INDEX idx_clubs_country_code ON metadata.clubs(country_code);

-- 4. Add comments explaining the change
COMMENT ON COLUMN metadata.competitions.country IS 'DEPRECATED: Use country_code instead. Kept for backward compatibility during migration.';
COMMENT ON COLUMN metadata.competitions.country_code IS 'ISO-2 country code referencing medusa.region_country.iso_2. Use this for standardized country data.';
COMMENT ON COLUMN metadata.clubs.country IS 'DEPRECATED: Use country_code instead. Kept for backward compatibility during migration.';
COMMENT ON COLUMN metadata.clubs.country_code IS 'ISO-2 country code referencing medusa.region_country.iso_2. Use this for standardized country data.';

-- Note: We keep the old 'country' TEXT columns for now to allow gradual migration
-- They can be dropped in a future migration once all code is updated

