-- Data migration: Update existing seasons with season_type values
-- Related to: Metadata Implementation Playbook - Phase 1
-- Purpose: Classify existing seasons as league, calendar, or tournament

-- Strategy:
-- 1. Tournament seasons: Single year where label is 4-digit year (e.g. "2006") or 2-digit (e.g. "06")
--    These are typically World Cups, Euros, etc.
-- 2. Calendar year seasons: Single year but label is not tournament format (less common)
-- 3. League seasons: Multi-year (default for most seasons like "23/24")

-- Step 1: Identify tournament seasons
-- Tournaments are single-year events with label format "2006", "06", "2022", etc.
UPDATE metadata.seasons
SET season_type = 'tournament'
WHERE start_year = end_year 
  AND (
    -- 4-digit year format (e.g. "2006", "2022")
    label ~ '^\d{4}$' 
    -- OR 2-digit year format (e.g. "06", "22") - but be careful with years < 2000
    OR (label ~ '^\d{2}$' AND start_year >= 2000 AND start_year < 2100)
  )
  AND season_type IS NULL;

-- Step 2: Identify remaining single-year seasons as calendar year seasons
-- These are less common but could exist (e.g. MLS seasons, some leagues use calendar year)
UPDATE metadata.seasons
SET season_type = 'calendar'
WHERE start_year = end_year 
  AND season_type IS NULL;

-- Step 3: Default all remaining seasons to 'league' (multi-year seasons)
-- This covers the vast majority: "23/24", "22/23", etc.
UPDATE metadata.seasons
SET season_type = 'league'
WHERE season_type IS NULL;

-- Verify: Check distribution of season types
-- (This is a comment - actual verification should be done manually or via test)
-- SELECT season_type, COUNT(*) as count 
-- FROM metadata.seasons 
-- GROUP BY season_type;

-- Special case: Fix VM 2006 data if it exists with wrong format
-- If there's a season with tm_season_id="2006" and label="06/07", update it
UPDATE metadata.seasons
SET season_type = 'tournament',
    label = '2006',
    end_year = 2006
WHERE tm_season_id = '2006' 
  AND label = '06/07' 
  AND start_year = 2006 
  AND end_year = 2007;

-- Add comment documenting the migration
COMMENT ON COLUMN metadata.seasons.season_type IS 
  'Type of season: league (multi-year, e.g. 23/24), calendar (single year, e.g. 2023), or tournament (single year event, e.g. VM 2006). Set via data migration 20251201224025.';

