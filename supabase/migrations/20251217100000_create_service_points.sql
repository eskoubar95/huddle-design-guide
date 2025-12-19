-- Migration: Create service_points table
-- HUD-36 Phase 1
-- Date: 2025-12-17
--
-- Creates table for caching pickup points from carrier APIs (GLS, DHL, PostNord, DPD).
-- Used for service point picker UI. Caches results to reduce API calls.

CREATE TABLE IF NOT EXISTS public.service_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider VARCHAR(50) NOT NULL, -- 'gls', 'dhl', 'postnord', 'dpd'
  provider_id VARCHAR(255) NOT NULL, -- External ID from carrier API
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  postal_code TEXT NOT NULL,
  country VARCHAR(2) NOT NULL, -- ISO 2-letter country code
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('service_point', 'locker', 'store')),
  opening_hours JSONB NULL, -- Flexible JSON structure for opening hours
  distance_km DECIMAL(8, 2) NULL, -- Calculated distance (nullable, set when searched)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Ensure unique provider + provider_id combination
  CONSTRAINT service_points_provider_id_unique UNIQUE (provider, provider_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_service_points_country ON public.service_points(country);
CREATE INDEX IF NOT EXISTS idx_service_points_provider ON public.service_points(provider);

-- Geospatial index (conditional - uses PostGIS if available, otherwise simple index)
DO $$
BEGIN
  -- Check if PostGIS extension is available
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'postgis') THEN
    -- Use PostGIS for efficient geospatial queries
    IF NOT EXISTS (
      SELECT 1 FROM pg_indexes 
      WHERE tablename = 'service_points' 
      AND indexname = 'idx_service_points_location'
    ) THEN
      EXECUTE 'CREATE INDEX idx_service_points_location ON public.service_points USING GIST (
        ll_to_earth(latitude, longitude)
      )';
    END IF;
  ELSE
    -- Fallback: Simple composite index for latitude/longitude (less efficient but works without PostGIS)
    IF NOT EXISTS (
      SELECT 1 FROM pg_indexes 
      WHERE tablename = 'service_points' 
      AND indexname = 'idx_service_points_lat_lng'
    ) THEN
      CREATE INDEX idx_service_points_lat_lng ON public.service_points(latitude, longitude);
    END IF;
  END IF;
END $$;

-- Enable RLS (service-role only access)
ALTER TABLE public.service_points ENABLE ROW LEVEL SECURITY;

-- Add updated_at trigger
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_trigger WHERE tgname = 'update_service_points_updated_at'
    ) THEN
      EXECUTE 'CREATE TRIGGER update_service_points_updated_at
        BEFORE UPDATE ON public.service_points
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column()';
    END IF;
  END IF;
END $$;

-- Comments
COMMENT ON TABLE public.service_points IS 'Cached pickup points from carrier APIs (Eurosender PUDO, GLS, DHL, PostNord, DPD). Used for service point picker UI.';
COMMENT ON COLUMN public.service_points.provider IS 'Carrier provider: eurosender, gls, dhl, postnord, dpd';
COMMENT ON COLUMN public.service_points.provider_id IS 'External ID from carrier API (Eurosender pudoPointCode, or other provider ID, unique per provider)';
COMMENT ON COLUMN public.service_points.type IS 'Point type: service_point (post office), locker (automated), store (retail location)';
COMMENT ON COLUMN public.service_points.opening_hours IS 'JSON structure for opening hours (varies by carrier)';
COMMENT ON COLUMN public.service_points.distance_km IS 'Calculated distance from search location (set when searched, nullable)';

