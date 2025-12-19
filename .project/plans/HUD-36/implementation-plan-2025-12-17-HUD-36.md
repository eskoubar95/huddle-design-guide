# HUD-36 - Shipping Calculation Service & Integration Implementation Plan

## Overview
Implementér dynamisk shipping beregning baseret på region, vægt og shipping provider. Integrerer Shippo API for real-time rate calculation og carrier service point APIs for pickup point selection. Bygger på hybrid approach: Medusa backend for regions/shipping profiles, Shippo for dynamisk pricing, og custom service point integration.

**Sprint context:** Marketplace Features → **Phase 2: Shipping Infrastructure** (jf. `.project/marketplace-features-linear-document.md`)

---

## Linear Issue
**Issue:** HUD-36  
**Title:** [Feature] Shipping Calculation Service & Integration  
**Status:** Backlog  
**Priority:** High  
**Labels:** Marketplace, Feature  
**Team:** Huddle World  
**Project:** Marketplace Features  
**Branch (recommended):** `feature/huddle-36-shipping-calculation-service`  
**Linear URL:** `https://linear.app/huddle-world/issue/HUD-36/feature-shipping-calculation-service-and-integration`

---

## Current State Analysis (verificeret)

### Key Discoveries
1. **Medusa Schema Integration Pattern**  
   Direkte SQL queries til `medusa.*` schema via `postgres-connection.ts` helper.  
   - Ref: `apps/web/app/api/v1/countries/route.ts` (queryer `medusa.region_country`)
   - Pattern: `query<Type>(SELECT ... FROM medusa.table_name, [params])`

2. **External API Service Pattern (StripeService)**  
   Lazy-initialized client, error handling med ApiError, Sentry logging.  
   - Ref: `apps/web/lib/services/stripe-service.ts`
   - Pattern: Singleton client, environment variable validation, structured error handling

3. **Shipping Addresses Already Exist (HUD-41)**  
   `shipping_addresses` tabel er allerede oprettet med RLS enabled.  
   - Ref: `supabase/migrations/20251213171000_create_shipping_addresses.sql`
   - Pattern: Service-role only access, default address constraint

4. **Medusa Shipping Setup**  
   Medusa seed script opretter:
   - Region: "Europe" (gb, de, dk, se, fr, es, it)
   - Shipping Profile: "Default Shipping Profile"
   - Shipping Options: "Standard Shipping" (€10 flat), "Express Shipping" (€20 flat)
   - Service Zones: "Europe" geo-zone
   - Ref: `apps/medusa/src/scripts/seed.ts` (lines 195-294)

5. **Current Listing State**  
   `sale_listings` og `auctions` har shipping boolean fields:
   - `shipping_cost_buyer` (boolean)
   - `shipping_free_in_country` (boolean)
   - Ingen faktisk shipping beregning endnu

6. **API Client Pattern**  
   Frontend bruger `apiRequest` helper fra `apps/web/lib/api/client.ts` med Clerk authentication.

### Implication
For HUD-36 skal vi:
- Bygge på eksisterende Medusa shipping infrastructure (regions, profiles, options)
- Integrere Shippo API for dynamisk rate calculation (erstatter flat rates)
- Oprette service point cache tabel og carrier API integration
- Bygge shipping calculation service der kombinerer Medusa + Shippo
- Expose via API endpoints der kan bruges af checkout flows (HUD-34/HUD-35)

### Dependency & Ownership
**Shipping calculation leverer inputs til:**
- **HUD-34**: Sale listing checkout flow (bruger shipping calculation)
- **HUD-35**: Auction winner checkout flow (bruger shipping calculation)
- **HUD-42**: Shipping label generation (bruger shipping method fra order)

**HUD-36 leverer:**
- `ShippingService` (orchestration)
- `MedusaShippingService` (genbrugelig)
- `ShippoService` (genbrugelig i HUD-42)
- `ServicePointService` (genbrugelig)
- API endpoints for shipping calculation

---

## Desired End State

### Shipping Calculation
- `ShippingService` kan beregne shipping costs baseret på:
  - Listing/auction (vægt estimat, seller location)
  - Buyer shipping address eller service point
  - Service type (home_delivery vs pickup_point)
- Returnerer shipping options med:
  - Method name (Standard, Express, etc.)
  - Price (i cents)
  - Estimated delivery days
  - Service type

### Service Points
- `ServicePointService` kan søge efter pickup points:
  - By GPS coordinates (latitude/longitude)
  - By postal code
  - Filter by carrier (GLS, DHL, PostNord, DPD)
- Service points caches i database (`service_points` tabel)
- Returnerer sorteret liste med distance

### API Endpoints
- `GET /api/v1/shipping/zones` - List zones (fra Medusa)
- `GET /api/v1/shipping/methods?zone_id=xxx&service_type=xxx` - List methods
- `POST /api/v1/shipping/calculate` - Calculate shipping costs
- `GET /api/v1/shipping/service-points?lat=xxx&lng=xxx&country=xxx` - Search service points
- `GET /api/v1/shipping/addresses` - List user addresses (extend existing)

### Free Shipping Logic
- Hvis `shipping_free_in_country = true` og seller/buyer er i samme land → shipping = 0
- Ellers bruges Shippo rates eller Medusa flat rates (fallback)

### Cross-Border Support
- Zone determination baseret på seller country → buyer country
- Shippo håndterer customs documentation automatisk
- Viser "International Shipping" badge i UI (HUD-43)

---

## What We're NOT Doing

1. **Full Service Point Picker UI** - Dette er HUD-43 (separat ticket). Phase 7 inkluderer kun basic integration.
2. **Shipping Label Generation** - Dette er HUD-42. Vi bygger kun calculation service.
3. **Checkout Flow Integration** - Dette er HUD-34/HUD-35. Vi leverer kun API endpoints.
4. **Medusa API Calls** - Vi bruger direkte SQL queries til Medusa schema (pattern fra countries API). **READ-ONLY queries** - vi modificerer IKKE Medusa's shop data.
5. **Admin UI for Shipping Configuration** - Out-of-scope. Shipping zones/methods konfigureres via Medusa Admin.
6. **Real-time Tracking** - Out-of-scope. Tracking håndteres af Shippo/carriers.
7. **Multiple Currency Support** - MVP: EUR only (jf. Medusa seed script).
8. **Weight Calculation from Jersey Data** - MVP: Bruger estimatet vægt (0.5kg default). Fremtidig: Beregn fra jersey type/size.
9. **Modifying Medusa Shop Data** - Vi læser kun fra Medusa schema (regions, shipping_options). Vi opretter/modificerer IKKE Medusa products, orders, eller shipping configuration. Medusa shop-funktionalitet forbliver uændret.

---

## Implementation Approach

**Hybrid Strategy:**
- **Medusa** → Regions, shipping profiles, service zones (organizational structure)
- **Shippo** → Real-time rate calculation (dynamisk pricing)
- **Custom** → Service point integration (carrier APIs), shipping calculation orchestration

**Why Hybrid:**
- Medusa giver god struktur for regions/zones, men mangler dynamisk pricing
- Shippo giver real-time rates, men vi vil beholde Medusa for order management
- Service points kræver custom integration (ikke i Medusa eller Shippo)

---

## Phase 1: Database Schema (Foundation)

### Overview
Opret database tabeller for service points og shipping labels (cache). Extend eksisterende `shipping_addresses` hvis nødvendigt.

**Note:** Medusa seed data er ikke påkrævet - region er manuelt oprettet i Medusa Admin med alle EU lande.

### Changes Required:

#### 1. Create service_points table
**File:** `supabase/migrations/20251217100000_create_service_points.sql`

**Changes:** Opret tabel for caching af pickup points fra carrier APIs.

```sql
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
COMMENT ON TABLE public.service_points IS 'Cached pickup points from carrier APIs (GLS, DHL, PostNord, DPD). Used for service point picker UI.';
COMMENT ON COLUMN public.service_points.provider IS 'Carrier provider: gls, dhl, postnord, dpd';
COMMENT ON COLUMN public.service_points.provider_id IS 'External ID from carrier API (unique per provider)';
COMMENT ON COLUMN public.service_points.type IS 'Point type: service_point (post office), locker (automated), store (retail location)';
COMMENT ON COLUMN public.service_points.opening_hours IS 'JSON structure for opening hours (varies by carrier)';
COMMENT ON COLUMN public.service_points.distance_km IS 'Calculated distance from search location (set when searched, nullable)';
```

**Rationale:** Cache service points for performance og reducere API calls til carriers. Geospatial index for efficient distance queries. PostGIS check ensures migration works with or without PostGIS extension - uses PostGIS GIST index if available, otherwise falls back to simple composite index.

#### 2. Create shipping_labels table (for HUD-42 preparation)
**File:** `supabase/migrations/20251217101000_create_shipping_labels.sql`

**Changes:** Opret tabel for storing Shippo label information (forbereder HUD-42).

```sql
CREATE TABLE IF NOT EXISTS public.shipping_labels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NULL, -- Future: reference to medusa.orders.id (when HUD-39 implemented)
  transaction_id UUID NULL REFERENCES public.transactions(id) ON DELETE SET NULL,
  shippo_label_id VARCHAR(255) NOT NULL UNIQUE, -- Shippo label ID (e.g., "label_xxx")
  shippo_transaction_id VARCHAR(255) NOT NULL, -- Shippo transaction ID
  label_url TEXT NOT NULL, -- PDF download URL
  tracking_number VARCHAR(255) NULL, -- Carrier tracking number
  status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'purchased', 'cancelled', 'error')),
  service_point_id UUID NULL REFERENCES public.service_points(id) ON DELETE SET NULL,
  shipping_method_type VARCHAR(20) NOT NULL CHECK (shipping_method_type IN ('home_delivery', 'pickup_point')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_shipping_labels_order_id ON public.shipping_labels(order_id);
CREATE INDEX IF NOT EXISTS idx_shipping_labels_transaction_id ON public.shipping_labels(transaction_id);
CREATE INDEX IF NOT EXISTS idx_shipping_labels_status ON public.shipping_labels(status);

-- Enable RLS (service-role only access)
ALTER TABLE public.shipping_labels ENABLE ROW LEVEL SECURITY;

-- Add updated_at trigger
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_trigger WHERE tgname = 'update_shipping_labels_updated_at'
    ) THEN
      EXECUTE 'CREATE TRIGGER update_shipping_labels_updated_at
        BEFORE UPDATE ON public.shipping_labels
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column()';
    END IF;
  END IF;
END $$;

-- Comments
COMMENT ON TABLE public.shipping_labels IS 'Shippo shipping labels. Created when seller generates label (HUD-42).';
COMMENT ON COLUMN public.shipping_labels.shippo_label_id IS 'Shippo label ID (unique identifier from Shippo API)';
COMMENT ON COLUMN public.shipping_labels.service_point_id IS 'Reference to service point if pickup point delivery (nullable)';
```

**Rationale:** Forbereder HUD-42 integration. Store label metadata for seller dashboard.

### Success Criteria:

#### Automated Verification:
- [ ] Migration runs successfully: `npm run migrate` (or `supabase migration up`)
- [ ] Tables exist: `service_points`, `shipping_labels`
- [ ] Indexes created correctly
- [ ] RLS enabled on both tables
- [ ] Type check passes: `npm run type-check`
- [ ] No linting errors: `npm run lint`

#### Manual Verification:
- [ ] Tables visible in Supabase Dashboard
- [ ] Constraints work (test unique constraint on service_points)
- [ ] Updated_at trigger fires on UPDATE
- [ ] Geospatial index created correctly (check `idx_service_points_location` or `idx_service_points_lat_lng` in Supabase Dashboard)
- [ ] Migration can be rolled back (test DROP TABLE statements)

**⚠️ PAUSE HERE** - Verify all above before Phase 2

---

## Phase 2: Medusa Integration Service

### Overview
Opret `MedusaShippingService` der queryer Medusa schema direkte for regions, shipping profiles, og shipping options. Genbrugelig service der kan bruges af både HUD-36 og HUD-42.

### Changes Required:

#### 1. Create MedusaShippingService
**File:** `apps/web/lib/services/medusa-shipping-service.ts`

**Changes:** Opret service der queryer Medusa schema for shipping data.

```typescript
import { query } from "@/lib/db/postgres-connection";
import { ApiError } from "@/lib/api/errors";
import * as Sentry from "@sentry/nextjs";

export interface MedusaRegion {
  id: string;
  name: string;
  currency_code: string;
  countries: string[]; // ISO 2-letter codes
}

export interface MedusaShippingOption {
  id: string;
  name: string;
  price_type: string; // 'flat' | 'calculated'
  provider_id: string;
  service_zone_id: string;
  shipping_profile_id: string;
  type_code: string; // 'standard' | 'express'
  type_label: string;
  type_description: string | null;
  prices: Array<{
    currency_code: string;
    amount: number; // in minor units (cents)
    region_id?: string;
  }>;
}

export interface MedusaServiceZone {
  id: string;
  name: string;
  fulfillment_set_id: string;
  geo_zones: Array<{
    id: string;
    country_code: string;
    type: string;
  }>;
}

/**
 * MedusaShippingService - Queries Medusa schema for shipping data
 * 
 * Uses direct SQL queries to medusa.* schema (pattern from countries API)
 * Genbrugelig service for HUD-36 (calculation) og HUD-42 (label generation)
 * 
 * ⚠️ IMPORTANT: READ-ONLY queries only. This service does NOT modify Medusa's shop data.
 * Medusa is both our marketplace engine AND shop - we must not interfere with shop functionality.
 */
export class MedusaShippingService {
  /**
   * Get all regions from Medusa
   */
  async getRegions(): Promise<MedusaRegion[]> {
    try {
      const regions = await query<{
        id: string;
        name: string;
        currency_code: string;
      }>(
        `
        SELECT id, name, currency_code
        FROM medusa.region
        ORDER BY name ASC
        `
      );

      // Get countries for each region
      const regionsWithCountries: MedusaRegion[] = await Promise.all(
        regions.map(async (region) => {
          const countries = await query<{ iso_2: string }>(
            `
            SELECT iso_2
            FROM medusa.region_country
            WHERE region_id = $1
            ORDER BY iso_2 ASC
            `,
            [region.id]
          );

          return {
            id: region.id,
            name: region.name,
            currency_code: region.currency_code,
            countries: countries.map((c) => c.iso_2),
          };
        })
      );

      return regionsWithCountries;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      Sentry.captureException(error, {
        tags: { component: "medusa_shipping_service", operation: "get_regions" },
        extra: { errorMessage },
      });
      throw new ApiError(
        "EXTERNAL_SERVICE_ERROR",
        "Failed to fetch shipping regions",
        502
      );
    }
  }

  /**
   * Get region by country code
   */
  async getRegionByCountry(countryCode: string): Promise<MedusaRegion | null> {
    try {
      const result = await query<{
        region_id: string;
        region_name: string;
        currency_code: string;
      }>(
        `
        SELECT DISTINCT
          r.id as region_id,
          r.name as region_name,
          r.currency_code
        FROM medusa.region r
        INNER JOIN medusa.region_country rc ON r.id = rc.region_id
        WHERE rc.iso_2 = $1
        LIMIT 1
        `,
        [countryCode.toUpperCase()]
      );

      if (result.length === 0) {
        return null;
      }

      const region = result[0];
      const countries = await query<{ iso_2: string }>(
        `
        SELECT iso_2
        FROM medusa.region_country
        WHERE region_id = $1
        ORDER BY iso_2 ASC
        `,
        [region.region_id]
      );

      return {
        id: region.region_id,
        name: region.region_name,
        currency_code: region.currency_code,
        countries: countries.map((c) => c.iso_2),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      Sentry.captureException(error, {
        tags: { component: "medusa_shipping_service", operation: "get_region_by_country" },
        extra: { errorMessage, countryCode },
      });
      throw new ApiError(
        "EXTERNAL_SERVICE_ERROR",
        "Failed to fetch region by country",
        502
      );
    }
  }

  /**
   * Get shipping options for a region
   * 
   * @param regionId Medusa region ID
   * @param serviceType Optional filter: 'home_delivery' | 'pickup_point'
   */
  async getShippingOptions(
    regionId: string,
    serviceType?: "home_delivery" | "pickup_point"
  ): Promise<MedusaShippingOption[]> {
    try {
      // Query shipping options with prices
      // Medusa v2 uses: shipping_option → shipping_option_price_set → price_set → price → price_rule (for region_id)
      // IMPORTANT: Read-only queries - we don't modify Medusa's shop data
      const options = await query<{
        id: string;
        name: string;
        price_type: string;
        provider_id: string;
        service_zone_id: string;
        shipping_profile_id: string;
        type_code: string;
        type_label: string;
        type_description: string | null;
        price_amount: number;
        price_currency: string;
        region_id: string | null;
      }>(
        `
        SELECT DISTINCT
          so.id,
          so.name,
          so.price_type,
          so.provider_id,
          so.service_zone_id,
          so.shipping_profile_id,
          sot.code as type_code,
          sot.label as type_label,
          sot.description as type_description,
          p.amount as price_amount,
          p.currency_code as price_currency,
          pr.value as region_id
        FROM medusa.shipping_option so
        LEFT JOIN medusa.shipping_option_type sot ON so.shipping_option_type_id = sot.id
        LEFT JOIN medusa.shipping_option_price_set sop ON so.id = sop.shipping_option_id
        LEFT JOIN medusa.price_set ps ON sop.price_set_id = ps.id
        LEFT JOIN medusa.price p ON ps.id = p.price_set_id
        LEFT JOIN medusa.price_rule pr ON p.id = pr.price_id AND pr.attribute = 'region_id'
        WHERE (pr.value = $1 OR pr.value IS NULL)
        ORDER BY so.name ASC
        `,
        [regionId]
      );

      // Group prices by shipping option
      const optionsMap = new Map<string, MedusaShippingOption>();
      
      for (const row of options) {
        if (!optionsMap.has(row.id)) {
          optionsMap.set(row.id, {
            id: row.id,
            name: row.name,
            price_type: row.price_type,
            provider_id: row.provider_id,
            service_zone_id: row.service_zone_id,
            shipping_profile_id: row.shipping_profile_id,
            type_code: row.type_code,
            type_label: row.type_label,
            type_description: row.type_description,
            prices: [],
          });
        }

        const option = optionsMap.get(row.id)!;
        if (row.price_amount && row.price_currency) {
          option.prices.push({
            currency_code: row.price_currency,
            amount: row.price_amount, // Already in minor units (cents)
            region_id: row.region_id || regionId, // Use actual region_id from price_rule if available
          });
        }
      }

      let result = Array.from(optionsMap.values());

      // Filter by service type if provided
      // Note: Medusa doesn't have service_type field - we'll map based on type_code
      // Standard/Express = home_delivery, future: pickup_point options
      if (serviceType === "pickup_point") {
        // For now, return empty (pickup points handled by Shippo)
        result = [];
      }

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      Sentry.captureException(error, {
        tags: { component: "medusa_shipping_service", operation: "get_shipping_options" },
        extra: { errorMessage, regionId, serviceType },
      });
      throw new ApiError(
        "EXTERNAL_SERVICE_ERROR",
        "Failed to fetch shipping options",
        502
      );
    }
  }

  /**
   * Get service zones for a region
   */
  async getServiceZones(regionId: string): Promise<MedusaServiceZone[]> {
    try {
      // Query service zones via fulfillment_set
      // This is complex - simplified for MVP
      const zones = await query<{
        id: string;
        name: string;
        fulfillment_set_id: string;
      }>(
        `
        SELECT DISTINCT
          sz.id,
          sz.name,
          sz.fulfillment_set_id
        FROM medusa.service_zone sz
        INNER JOIN medusa.fulfillment_set fs ON sz.fulfillment_set_id = fs.id
        WHERE EXISTS (
          SELECT 1
          FROM medusa.geo_zone gz
          WHERE gz.service_zone_id = sz.id
          AND EXISTS (
            SELECT 1
            FROM medusa.region_country rc
            WHERE rc.region_id = $1
            AND rc.iso_2 = gz.country_code
          )
        )
        `,
        [regionId]
      );

      // Get geo zones for each service zone
      const zonesWithGeoZones: MedusaServiceZone[] = await Promise.all(
        zones.map(async (zone) => {
          const geoZones = await query<{
            id: string;
            country_code: string;
            type: string;
          }>(
            `
            SELECT id, country_code, type
            FROM medusa.geo_zone
            WHERE service_zone_id = $1
            `,
            [zone.id]
          );

          return {
            id: zone.id,
            name: zone.name,
            fulfillment_set_id: zone.fulfillment_set_id,
            geo_zones: geoZones,
          };
        })
      );

      return zonesWithGeoZones;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      Sentry.captureException(error, {
        tags: { component: "medusa_shipping_service", operation: "get_service_zones" },
        extra: { errorMessage, regionId },
      });
      throw new ApiError(
        "EXTERNAL_SERVICE_ERROR",
        "Failed to fetch service zones",
        502
      );
    }
  }
}
```

**Rationale:** Genbrugelig service der kan bruges af både HUD-36 og HUD-42. Følger pattern fra countries API (direkte SQL queries til medusa schema).

### Success Criteria:

#### Automated Verification:
- [ ] Type check passes: `npm run type-check`
- [ ] No linting errors: `npm run lint`
- [ ] Build succeeds: `npm run build`

#### Manual Verification:
- [ ] Service can query Medusa regions (test with seed data)
- [ ] `getRegionByCountry()` returns correct region for EU countries
- [ ] `getShippingOptions()` returns Standard/Express options
- [ ] Error handling works (test with invalid region_id)

**⚠️ PAUSE HERE** - Verify all above before Phase 3

---

## Phase 3: Shippo Integration Service

### Overview
Opret `ShippoService` der integrerer med Shippo API for real-time rate calculation. Lazy-initialized client pattern (som StripeService). Genbrugelig service for HUD-36 og HUD-42.

### Changes Required:

#### 1. Install Shippo SDK (or use REST API)
**File:** `apps/web/package.json`

**Changes:** Add Shippo package (or use fetch for REST API).

```json
{
  "dependencies": {
    // ... existing
    "shippo": "^2.0.0" // Or use REST API directly with fetch
  }
}
```

**Rationale:** Shippo SDK giver type safety, men REST API med fetch er også muligt (lighter weight).

#### 2. Create ShippoService
**File:** `apps/web/lib/services/shippo-service.ts`

**Changes:** Opret service der integrerer med Shippo API.

```typescript
import { ApiError } from "@/lib/api/errors";
import * as Sentry from "@sentry/nextjs";

// Shippo API types (simplified)
export interface ShippoAddress {
  name: string;
  street1: string;
  street2?: string;
  city: string;
  state?: string;
  zip: string;
  country: string; // ISO 2-letter
  phone?: string;
  email?: string;
}

export interface ShippoParcel {
  length: string; // "10" (cm)
  width: string;
  height: string;
  distance_unit: "cm" | "in";
  weight: string; // "0.5" (kg)
  mass_unit: "kg" | "lb";
}

export interface ShippoRate {
  object_id: string;
  amount: string; // Price in minor units (e.g., "1000" = €10.00)
  currency: string; // "EUR"
  provider: string; // "DHL", "UPS", etc.
  servicelevel: {
    name: string; // "Standard", "Express"
    token: string;
  };
  estimated_days: number | null;
  duration_terms?: string;
}

export interface ShippoShipment {
  object_id: string;
  status: string;
  rates: ShippoRate[];
  address_from: ShippoAddress;
  address_to: ShippoAddress;
  parcels: ShippoParcel[];
}

// Lazy-initialize Shippo client
let shippoApiKey: string | null = null;

function getShippoApiKey(): string {
  if (!shippoApiKey) {
    const key = process.env.SHIPPO_API_KEY;
    if (!key) {
      throw new Error("SHIPPO_API_KEY is not configured");
    }
    shippoApiKey = key;
  }
  return shippoApiKey;
}

/**
 * ShippoService - Handles Shippo API integration
 * 
 * Genbrugelig service for HUD-36 (rate calculation) og HUD-42 (label generation)
 * 
 * API Documentation: https://docs.goshippo.com/
 */
export class ShippoService {
  private apiKey: string;
  private baseUrl = "https://api.goshippo.com";

  constructor() {
    this.apiKey = getShippoApiKey();
  }

  /**
   * Create shipment and get rates
   * 
   * @param addressFrom Seller address
   * @param addressTo Buyer address or service point address
   * @param parcel Package dimensions and weight
   * @returns Shippo shipment with rates
   */
  async createShipment(
    addressFrom: ShippoAddress,
    addressTo: ShippoAddress,
    parcel: ShippoParcel
  ): Promise<ShippoShipment> {
    try {
      const response = await fetch(`${this.baseUrl}/shipments`, {
        method: "POST",
        headers: {
          "Authorization": `ShippoToken ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          address_from: addressFrom,
          address_to: addressTo,
          parcels: [parcel],
          async: false, // Synchronous (wait for rates)
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(
          `Shippo API error: ${response.status} - ${JSON.stringify(error)}`
        );
      }

      const shipment: ShippoShipment = await response.json();

      // Validate shipment has rates
      if (!shipment.rates || shipment.rates.length === 0) {
        throw new ApiError(
          "NO_SHIPPING_RATES",
          "No shipping rates available for this address",
          404
        );
      }

      return shipment;
    } catch (error) {
      // Handle Shippo-specific errors
      if (error instanceof ApiError) {
        throw error;
      }

      const errorMessage = error instanceof Error ? error.message : String(error);
      Sentry.captureException(error, {
        tags: { component: "shippo_service", operation: "create_shipment" },
        extra: { errorMessage },
      });

      throw new ApiError(
        "EXTERNAL_SERVICE_ERROR",
        "Failed to get shipping rates. Please try again later.",
        502
      );
    }
  }

  /**
   * Get rates for existing shipment
   * 
   * @param shipmentId Shippo shipment ID
   * @returns Array of rates
   */
  async getRates(shipmentId: string): Promise<ShippoRate[]> {
    try {
      const response = await fetch(`${this.baseUrl}/shipments/${shipmentId}/rates`, {
        method: "GET",
        headers: {
          "Authorization": `ShippoToken ${this.apiKey}`,
        },
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(
          `Shippo API error: ${response.status} - ${JSON.stringify(error)}`
        );
      }

      const rates: { results: ShippoRate[] } = await response.json();
      return rates.results || [];
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      Sentry.captureException(error, {
        tags: { component: "shippo_service", operation: "get_rates" },
        extra: { errorMessage, shipmentId },
      });

      throw new ApiError(
        "EXTERNAL_SERVICE_ERROR",
        "Failed to get shipping rates",
        502
      );
    }
  }

  /**
   * Validate address with Shippo
   * 
   * @param address Address to validate
   * @returns Validation result
   */
  async validateAddress(address: ShippoAddress): Promise<{
    is_valid: boolean;
    messages: string[];
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/addresses`, {
        method: "POST",
        headers: {
          "Authorization": `ShippoToken ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...address,
          validate: true,
        }),
      });

      if (!response.ok) {
        // Address validation is optional - don't fail hard
        return { is_valid: true, messages: [] };
      }

      const result = await response.json();
      return {
        is_valid: result.is_complete || false,
        messages: result.messages || [],
      };
    } catch (error) {
      // Address validation is optional - return valid by default
      return { is_valid: true, messages: [] };
    }
  }
}
```

**Rationale:** Lazy-initialized client pattern (som StripeService). Error handling med ApiError. Sentry logging. Genbrugelig for HUD-42.

#### 3. Environment Variables
**File:** `.env.local` (example)

**Changes:** Add Shippo API key.

```bash
# Shippo API (test token for development)
SHIPPO_API_KEY=shippo_test_xxx
```

**Rationale:** Test token for development (gratis labels). Production token i production environment.

### Success Criteria:

#### Automated Verification:
- [ ] Type check passes: `npm run type-check`
- [ ] No linting errors: `npm run lint`
- [ ] Build succeeds: `npm run build`
- [ ] Environment variable validation works (throws error if missing)

#### Manual Verification:
- [ ] Shippo API key configured in `.env.local`
- [ ] `createShipment()` returns rates for test addresses
- [ ] Error handling works (test with invalid address)
- [ ] Rates returned in correct format (amount in minor units)

**⚠️ PAUSE HERE** - Verify all above before Phase 4

---

## Phase 4: Shipping Service (Orchestration)

### Overview
Opret `ShippingService` der kombinerer Medusa + Shippo for shipping calculation. Håndterer zone determination, free shipping logic, og rate mapping.

### Changes Required:

#### 1. Create ShippingService
**File:** `apps/web/lib/services/shipping-service.ts`

**Changes:** Opret orchestration service der kombinerer Medusa + Shippo.

```typescript
import { MedusaShippingService, MedusaRegion, MedusaShippingOption } from "./medusa-shipping-service";
import { ShippoService, ShippoAddress, ShippoParcel, ShippoRate } from "./shippo-service";
import { createServiceClient } from "@/lib/supabase/server";
import { ApiError } from "@/lib/api/errors";
import * as Sentry from "@sentry/nextjs";

export interface ShippingCalculationInput {
  listingId?: string; // sale_listings.id
  auctionId?: string; // auctions.id
  shippingAddress: {
    street: string;
    city: string;
    postal_code: string;
    country: string; // ISO 2-letter
    state?: string;
  };
  serviceType?: "home_delivery" | "pickup_point";
  servicePointId?: string; // If pickup point selected
}

export interface ShippingOption {
  id: string; // Medusa shipping option ID or Shippo rate ID
  name: string; // "Standard Shipping", "DHL Express", etc.
  price: number; // in cents
  estimatedDays: number | null;
  serviceType: "home_delivery" | "pickup_point";
  provider: string; // "manual" (Medusa) or "DHL", "UPS" (Shippo)
  method: string; // "standard", "express", etc.
}

/**
 * ShippingService - Orchestrates shipping calculation
 * 
 * Combines Medusa (regions/zones) + Shippo (dynamic rates) for shipping calculation
 */
export class ShippingService {
  private medusaService: MedusaShippingService;
  private shippoService: ShippoService;

  constructor() {
    this.medusaService = new MedusaShippingService();
    this.shippoService = new ShippoService();
  }

  /**
   * Calculate shipping options for a listing/auction
   */
  async calculateShipping(
    input: ShippingCalculationInput
  ): Promise<ShippingOption[]> {
    try {
      // 1. Get listing/auction details (seller location, weight estimate)
      const { sellerCountry, weightKg, shippingFreeInCountry } = 
        await this.getListingDetails(input.listingId, input.auctionId);

      // 2. Determine shipping zone (from seller country to buyer country)
      const buyerCountry = input.shippingAddress.country.toUpperCase();
      const region = await this.medusaService.getRegionByCountry(buyerCountry);
      
      if (!region) {
        throw new ApiError(
          "INVALID_COUNTRY",
          `Shipping not available to ${buyerCountry}`,
          400
        );
      }

      // 3. Check free shipping logic
      if (shippingFreeInCountry && sellerCountry === buyerCountry) {
        // Same country + free shipping enabled → return free option
        return [{
          id: "free_shipping",
          name: "Free Shipping",
          price: 0,
          estimatedDays: 3,
          serviceType: input.serviceType || "home_delivery",
          provider: "manual",
          method: "standard",
        }];
      }

      // 4. Get shipping options based on service type
      if (input.serviceType === "pickup_point") {
        // Pickup points: Use Shippo rates (carriers support pickup points)
        return await this.calculateShippoRates(
          sellerCountry,
          input.shippingAddress,
          weightKg,
          "pickup_point"
        );
      } else {
        // Home delivery: Try Shippo first, fallback to Medusa flat rates
        const shippoRates = await this.calculateShippoRates(
          sellerCountry,
          input.shippingAddress,
          weightKg,
          "home_delivery"
        ).catch(() => []); // Fallback if Shippo fails

        if (shippoRates.length > 0) {
          return shippoRates;
        }

        // Fallback: Use Medusa flat rates
        return await this.calculateMedusaRates(region.id, "home_delivery");
      }
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }

      const errorMessage = error instanceof Error ? error.message : String(error);
      Sentry.captureException(error, {
        tags: { component: "shipping_service", operation: "calculate_shipping" },
        extra: { errorMessage, input },
      });

      throw new ApiError(
        "INTERNAL_SERVICE_ERROR",
        "Failed to calculate shipping costs",
        500
      );
    }
  }

  /**
   * Get listing/auction details (seller location, weight)
   */
  private async getListingDetails(
    listingId?: string,
    auctionId?: string
  ): Promise<{
    sellerCountry: string;
    weightKg: number;
    shippingFreeInCountry: boolean;
  }> {
    const supabase = await createServiceClient();

    if (listingId) {
      const { data: listing, error } = await supabase
        .from("sale_listings")
        .select("seller_id, shipping_free_in_country")
        .eq("id", listingId)
        .single();

      if (error || !listing) {
        throw new ApiError("NOT_FOUND", "Listing not found", 404);
      }

      // Get seller country from profile (simplified - assume seller has country in profile)
      // Future: Store seller country in listing or get from profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("country")
        .eq("id", listing.seller_id)
        .single();

      return {
        sellerCountry: profile?.country || "DK", // Default to DK
        weightKg: 0.5, // Default weight estimate (future: calculate from jersey type/size)
        shippingFreeInCountry: listing.shipping_free_in_country || false,
      };
    }

    if (auctionId) {
      const { data: auction, error } = await supabase
        .from("auctions")
        .select("seller_id, shipping_free_in_country")
        .eq("id", auctionId)
        .single();

      if (error || !auction) {
        throw new ApiError("NOT_FOUND", "Auction not found", 404);
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("country")
        .eq("id", auction.seller_id)
        .single();

      return {
        sellerCountry: profile?.country || "DK",
        weightKg: 0.5,
        shippingFreeInCountry: auction.shipping_free_in_country || false,
      };
    }

    throw new ApiError("BAD_REQUEST", "Either listingId or auctionId required", 400);
  }

  /**
   * Calculate shipping using Shippo API
   */
  private async calculateShippoRates(
    sellerCountry: string,
    buyerAddress: ShippingCalculationInput["shippingAddress"],
    weightKg: number,
    serviceType: "home_delivery" | "pickup_point"
  ): Promise<ShippingOption[]> {
    // Get seller address (simplified - use default warehouse location)
    // Future: Get from seller profile or listing
    const addressFrom: ShippoAddress = {
      name: "Huddle Seller",
      street1: "Warehouse Address", // Placeholder
      city: "Copenhagen",
      zip: "1000",
      country: sellerCountry,
    };

    const addressTo: ShippoAddress = {
      name: "Buyer",
      street1: buyerAddress.street,
      city: buyerAddress.city,
      zip: buyerAddress.postal_code,
      country: buyerAddress.country,
      state: buyerAddress.state,
    };

    const parcel: ShippoParcel = {
      length: "30",
      width: "20",
      height: "5",
      distance_unit: "cm",
      weight: weightKg.toString(),
      mass_unit: "kg",
    };

    const shipment = await this.shippoService.createShipment(
      addressFrom,
      addressTo,
      parcel
    );

    // Map Shippo rates to ShippingOption format
    return shipment.rates
      .filter((rate) => {
        // Filter by service type if needed
        // For now, return all rates
        return true;
      })
      .map((rate) => ({
        id: rate.object_id,
        name: `${rate.provider} ${rate.servicelevel.name}`,
        price: Math.round(parseFloat(rate.amount) * 100), // Convert to cents
        estimatedDays: rate.estimated_days,
        serviceType,
        provider: rate.provider.toLowerCase(),
        method: rate.servicelevel.token,
      }))
      .sort((a, b) => a.price - b.price); // Sort by price
  }

  /**
   * Calculate shipping using Medusa flat rates (fallback)
   */
  private async calculateMedusaRates(
    regionId: string,
    serviceType: "home_delivery" | "pickup_point"
  ): Promise<ShippingOption[]> {
    const options = await this.medusaService.getShippingOptions(
      regionId,
      serviceType
    );

    return options.map((option) => {
      // Get EUR price (or first price available)
      const eurPrice = option.prices.find((p) => p.currency_code === "eur");
      const price = eurPrice?.amount || option.prices[0]?.amount || 0;

      return {
        id: option.id,
        name: option.name,
        price, // Already in cents
        estimatedDays: option.type_code === "express" ? 1 : 3,
        serviceType,
        provider: "manual",
        method: option.type_code,
      };
    });
  }

  /**
   * Get shipping zones (from Medusa)
   */
  async getShippingZones(): Promise<MedusaRegion[]> {
    return this.medusaService.getRegions();
  }

  /**
   * Get shipping methods for a zone
   */
  async getShippingMethods(
    zoneId: string,
    serviceType?: "home_delivery" | "pickup_point"
  ): Promise<MedusaShippingOption[]> {
    return this.medusaService.getShippingOptions(zoneId, serviceType);
  }
}
```

**Rationale:** Orchestration service der kombinerer Medusa + Shippo. Håndterer free shipping logic, zone determination, og rate mapping.

### Success Criteria:

#### Automated Verification:
- [ ] Type check passes: `npm run type-check`
- [ ] No linting errors: `npm run lint`
- [ ] Build succeeds: `npm run build`

#### Manual Verification:
- [ ] `calculateShipping()` returns options for valid addresses
- [ ] Free shipping logic works (same country + flag enabled)
- [ ] Shippo rates returned when available
- [ ] Medusa fallback works when Shippo fails
- [ ] Error handling works (invalid country, missing listing)

**⚠️ PAUSE HERE** - Verify all above before Phase 5

---

## Phase 5: Service Point Service

### Overview
Opret `ServicePointService` der integrerer med carrier APIs (GLS, DHL, PostNord, DPD) for service point search. Caches results i database.

### Changes Required:

#### 1. Create ServicePointService
**File:** `apps/web/lib/services/service-point-service.ts`

**Changes:** Opret service der integrerer med carrier APIs og cacher i database.

```typescript
import { createServiceClient } from "@/lib/supabase/server";
import { query } from "@/lib/db/postgres-connection";
import { ApiError } from "@/lib/api/errors";
import * as Sentry from "@sentry/nextjs";

export interface ServicePoint {
  id: string;
  provider: "gls" | "dhl" | "postnord" | "dpd";
  provider_id: string;
  name: string;
  address: string;
  city: string;
  postal_code: string;
  country: string;
  latitude: number;
  longitude: number;
  type: "service_point" | "locker" | "store";
  opening_hours: Record<string, any> | null;
  distance_km: number | null;
}

export interface ServicePointSearchParams {
  latitude: number;
  longitude: number;
  country: string; // ISO 2-letter
  carrier?: "gls" | "dhl" | "postnord" | "dpd";
  radiusKm?: number; // Default: 10km
  limit?: number; // Default: 20
}

/**
 * ServicePointService - Integrates with carrier APIs for pickup point search
 * 
 * Carriers:
 * - GLS: ParcelShop API
 * - DHL: Service Points API
 * - PostNord: Service Points API (Nordic countries)
 * - DPD: Pickup Points API
 * 
 * Caches results in database for performance
 */
export class ServicePointService {
  /**
   * Search service points by GPS coordinates
   */
  async searchByCoordinates(
    params: ServicePointSearchParams
  ): Promise<ServicePoint[]> {
    try {
      const {
        latitude,
        longitude,
        country,
        carrier,
        radiusKm = 10,
        limit = 20,
      } = params;

      // 1. Check cache first (points within radius)
      const cached = await this.getCachedPoints(
        latitude,
        longitude,
        country,
        carrier,
        radiusKm,
        limit
      );

      if (cached.length >= limit) {
        return cached;
      }

      // 2. Fetch from carrier APIs (if not enough cached)
      const fresh = await this.fetchFromCarriers(
        latitude,
        longitude,
        country,
        carrier,
        radiusKm,
        limit
      );

      // 3. Cache fresh points
      await this.cachePoints(fresh, latitude, longitude);

      // 4. Return combined (cached + fresh)
      const all = [...cached, ...fresh];
      
      // Sort by distance and limit
      return all
        .sort((a, b) => (a.distance_km || 0) - (b.distance_km || 0))
        .slice(0, limit);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      Sentry.captureException(error, {
        tags: { component: "service_point_service", operation: "search_by_coordinates" },
        extra: { errorMessage, params },
      });

      throw new ApiError(
        "EXTERNAL_SERVICE_ERROR",
        "Failed to search service points",
        502
      );
    }
  }

  /**
   * Search service points by postal code
   */
  async searchByPostalCode(
    postalCode: string,
    country: string,
    carrier?: "gls" | "dhl" | "postnord" | "dpd",
    limit: number = 20
  ): Promise<ServicePoint[]> {
    try {
      // For postal code search, we need to:
      // 1. Geocode postal code to get coordinates
      // 2. Then use coordinate search
      
      // Simplified: Use geocoding service (Google Maps Geocoding API or similar)
      // For MVP: Return cached points for postal code
      
      const points = await query<ServicePoint>(
        `
        SELECT 
          id,
          provider,
          provider_id,
          name,
          address,
          city,
          postal_code,
          country,
          latitude,
          longitude,
          type,
          opening_hours,
          distance_km
        FROM public.service_points
        WHERE country = $1
          AND postal_code = $2
          ${carrier ? `AND provider = $3` : ""}
        ORDER BY name ASC
        LIMIT $${carrier ? 4 : 3}
        `,
        carrier
          ? [country, postalCode, carrier, limit]
          : [country, postalCode, limit]
      );

      return points;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      Sentry.captureException(error, {
        tags: { component: "service_point_service", operation: "search_by_postal_code" },
        extra: { errorMessage, postalCode, country, carrier },
      });

      throw new ApiError(
        "EXTERNAL_SERVICE_ERROR",
        "Failed to search service points by postal code",
        502
      );
    }
  }

  /**
   * Get cached points from database
   */
  private async getCachedPoints(
    latitude: number,
    longitude: number,
    country: string,
    carrier?: string,
    radiusKm: number = 10,
    limit: number = 20
  ): Promise<ServicePoint[]> {
    // Use PostGIS for geospatial queries (if available)
    // Otherwise, use simple distance calculation
    const points = await query<ServicePoint>(
      `
      SELECT 
        id,
        provider,
        provider_id,
        name,
        address,
        city,
        postal_code,
        country,
        latitude,
        longitude,
        type,
        opening_hours,
        -- Calculate distance (Haversine formula, simplified)
        (
          6371 * acos(
            cos(radians($1)) * cos(radians(latitude)) *
            cos(radians(longitude) - radians($2)) +
            sin(radians($1)) * sin(radians(latitude))
          )
        ) as distance_km
      FROM public.service_points
      WHERE country = $3
        ${carrier ? `AND provider = $4` : ""}
        AND (
          6371 * acos(
            cos(radians($1)) * cos(radians(latitude)) *
            cos(radians(longitude) - radians($2)) +
            sin(radians($1)) * sin(radians(latitude))
          )
        ) <= $${carrier ? 5 : 4}
      ORDER BY distance_km ASC
      LIMIT $${carrier ? 6 : 5}
      `,
      carrier
        ? [latitude, longitude, country, carrier, radiusKm, limit]
        : [latitude, longitude, country, radiusKm, limit]
    );

    return points;
  }

  /**
   * Fetch service points from carrier APIs
   */
  private async fetchFromCarriers(
    latitude: number,
    longitude: number,
    country: string,
    carrier?: "gls" | "dhl" | "postnord" | "dpd",
    radiusKm: number = 10,
    limit: number = 20
  ): Promise<ServicePoint[]> {
    const carriers: Array<"gls" | "dhl" | "postnord" | "dpd"> = carrier
      ? [carrier]
      : ["gls", "dhl", "postnord", "dpd"]; // All carriers

    const results: ServicePoint[] = [];

    for (const c of carriers) {
      try {
        const points = await this.fetchFromCarrier(c, latitude, longitude, country, radiusKm);
        results.push(...points);
      } catch (error) {
        // Log but continue with other carriers
        Sentry.captureException(error, {
          tags: { component: "service_point_service", operation: "fetch_from_carrier", carrier: c },
        });
      }
    }

    return results.slice(0, limit);
  }

  /**
   * Fetch from specific carrier API
   */
  private async fetchFromCarrier(
    carrier: "gls" | "dhl" | "postnord" | "dpd",
    latitude: number,
    longitude: number,
    country: string,
    radiusKm: number
  ): Promise<ServicePoint[]> {
    // MVP: Stub implementation
    // Future: Implement actual carrier API calls
    
    switch (carrier) {
      case "gls":
        return this.fetchGLS(latitude, longitude, country, radiusKm);
      case "dhl":
        return this.fetchDHL(latitude, longitude, country, radiusKm);
      case "postnord":
        return this.fetchPostNord(latitude, longitude, country, radiusKm);
      case "dpd":
        return this.fetchDPD(latitude, longitude, country, radiusKm);
      default:
        return [];
    }
  }

  /**
   * Fetch GLS ParcelShop locations
   */
  private async fetchGLS(
    latitude: number,
    longitude: number,
    country: string,
    radiusKm: number
  ): Promise<ServicePoint[]> {
    // GLS ParcelShop API
    // Documentation: https://gls-group.eu/API/parcelshop/
    
    // MVP: Return empty (implement in future phase)
    // TODO: Implement GLS API integration
    return [];
  }

  /**
   * Fetch DHL Service Points
   */
  private async fetchDHL(
    latitude: number,
    longitude: number,
    country: string,
    radiusKm: number
  ): Promise<ServicePoint[]> {
    // DHL Service Points API
    // Documentation: https://developer.dhl.com/
    
    // MVP: Return empty (implement in future phase)
    // TODO: Implement DHL API integration
    return [];
  }

  /**
   * Fetch PostNord Service Points
   */
  private async fetchPostNord(
    latitude: number,
    longitude: number,
    country: string,
    radiusKm: number
  ): Promise<ServicePoint[]> {
    // PostNord Service Points API
    // Documentation: https://developer.postnord.com/
    
    // MVP: Return empty (implement in future phase)
    // TODO: Implement PostNord API integration
    return [];
  }

  /**
   * Fetch DPD Pickup Points
   */
  private async fetchDPD(
    latitude: number,
    longitude: number,
    country: string,
    radiusKm: number
  ): Promise<ServicePoint[]> {
    // DPD Pickup Points API
    // Documentation: https://developer.dpd.com/
    
    // MVP: Return empty (implement in future phase)
    // TODO: Implement DPD API integration
    return [];
  }

  /**
   * Cache service points in database
   */
  private async cachePoints(
    points: ServicePoint[],
    searchLat: number,
    searchLng: number
  ): Promise<void> {
    const supabase = await createServiceClient();

    for (const point of points) {
      // Calculate distance if not set
      if (!point.distance_km) {
        point.distance_km = this.calculateDistance(
          searchLat,
          searchLng,
          point.latitude,
          point.longitude
        );
      }

      // Upsert point (unique constraint on provider + provider_id)
      const { error } = await supabase
        .from("service_points")
        .upsert(
          {
            provider: point.provider,
            provider_id: point.provider_id,
            name: point.name,
            address: point.address,
            city: point.city,
            postal_code: point.postal_code,
            country: point.country,
            latitude: point.latitude,
            longitude: point.longitude,
            type: point.type,
            opening_hours: point.opening_hours,
            distance_km: point.distance_km,
          },
          {
            onConflict: "provider,provider_id",
            ignoreDuplicates: false,
          }
        );

      if (error) {
        // Log but continue
        Sentry.captureException(error, {
          tags: { component: "service_point_service", operation: "cache_points" },
          extra: { provider: point.provider, provider_id: point.provider_id },
        });
      }
    }
  }

  /**
   * Calculate distance between two coordinates (Haversine formula)
   */
  private calculateDistance(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number
  ): number {
    const R = 6371; // Earth radius in km
    const dLat = this.toRad(lat2 - lat1);
    const dLng = this.toRad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) *
        Math.cos(this.toRad(lat2)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(degrees: number): number {
    return (degrees * Math.PI) / 180;
  }
}
```

**Rationale:** Service der integrerer med carrier APIs og cacher i database. MVP: Stub implementations (carrier APIs implementeres i fremtidig fase). Caching pattern for performance.

### Success Criteria:

#### Automated Verification:
- [ ] Type check passes: `npm run type-check`
- [ ] No linting errors: `npm run lint`
- [ ] Build succeeds: `npm run build`

#### Manual Verification:
- [ ] `searchByCoordinates()` returns cached points (test with seed data)
- [ ] Distance calculation works correctly
- [ ] Caching works (points stored in database)
- [ ] Error handling works (invalid coordinates)

**⚠️ PAUSE HERE** - Verify all above before Phase 6

---

## Phase 6: API Endpoints

### Overview
Opret API endpoints for shipping calculation, zones, methods, og service points. Følger eksisterende API patterns (rate limiting, error handling, authentication).

### Changes Required:

#### 1. GET /api/v1/shipping/zones
**File:** `apps/web/app/api/v1/shipping/zones/route.ts`

**Changes:** List shipping zones (fra Medusa).

```typescript
import { NextRequest } from "next/server";
import { rateLimitMiddleware } from "@/lib/api/rate-limit";
import { handleApiError } from "@/lib/api/errors";
import { ShippingService } from "@/lib/services/shipping-service";
import * as Sentry from "@sentry/nextjs";

const handler = async (req: NextRequest) => {
  try {
    if (req.method !== "GET") {
      return new Response(null, { status: 405 });
    }

    const service = new ShippingService();
    const zones = await service.getShippingZones();

    return Response.json({ zones });
  } catch (error) {
    Sentry.captureException(error, {
      extra: { url: req.url },
      tags: { component: "shipping-zones-api" },
    });
    return handleApiError(error, req);
  }
};

export const GET = rateLimitMiddleware(handler);
```

**Rationale:** Simple endpoint der lister zones fra Medusa.

#### 2. GET /api/v1/shipping/methods
**File:** `apps/web/app/api/v1/shipping/methods/route.ts`

**Changes:** List shipping methods for a zone.

```typescript
import { NextRequest } from "next/server";
import { rateLimitMiddleware } from "@/lib/api/rate-limit";
import { handleApiError } from "@/lib/api/errors";
import { ShippingService } from "@/lib/services/shipping-service";
import * as Sentry from "@sentry/nextjs";

const handler = async (req: NextRequest) => {
  try {
    if (req.method !== "GET") {
      return new Response(null, { status: 405 });
    }

    const searchParams = req.nextUrl.searchParams;
    const zoneId = searchParams.get("zone_id");
    const serviceType = searchParams.get("service_type") as
      | "home_delivery"
      | "pickup_point"
      | null;

    if (!zoneId) {
      return Response.json(
        { error: { code: "BAD_REQUEST", message: "zone_id required" } },
        { status: 400 }
      );
    }

    const service = new ShippingService();
    const methods = await service.getShippingMethods(
      zoneId,
      serviceType || undefined
    );

    return Response.json({ methods });
  } catch (error) {
    Sentry.captureException(error, {
      extra: { url: req.url },
      tags: { component: "shipping-methods-api" },
    });
    return handleApiError(error, req);
  }
};

export const GET = rateLimitMiddleware(handler);
```

**Rationale:** List methods for a zone, optional service type filter.

#### 3. POST /api/v1/shipping/calculate
**File:** `apps/web/app/api/v1/shipping/calculate/route.ts`

**Changes:** Calculate shipping costs for a listing/auction.

```typescript
import { NextRequest } from "next/server";
import { rateLimitMiddleware } from "@/lib/api/rate-limit";
import { requireAuth } from "@/lib/auth";
import { handleApiError } from "@/lib/api/errors";
import { ShippingService } from "@/lib/services/shipping-service";
import { z } from "zod";
import * as Sentry from "@sentry/nextjs";

const calculateSchema = z.object({
  listingId: z.string().uuid().optional(),
  auctionId: z.string().uuid().optional(),
  shippingAddress: z.object({
    street: z.string().min(1),
    city: z.string().min(1),
    postal_code: z.string().min(1),
    country: z.string().length(2), // ISO 2-letter
    state: z.string().optional(),
  }),
  serviceType: z.enum(["home_delivery", "pickup_point"]).optional(),
  servicePointId: z.string().uuid().optional(),
});

const handler = async (req: NextRequest) => {
  try {
    if (req.method !== "POST") {
      return new Response(null, { status: 405 });
    }

    const { userId } = await requireAuth(req);

    const body = await req.json();
    const validated = calculateSchema.parse(body);

    // Validate: Either listingId or auctionId required
    if (!validated.listingId && !validated.auctionId) {
      return Response.json(
        { error: { code: "BAD_REQUEST", message: "listingId or auctionId required" } },
        { status: 400 }
      );
    }

    const service = new ShippingService();
    const options = await service.calculateShipping({
      listingId: validated.listingId,
      auctionId: validated.auctionId,
      shippingAddress: validated.shippingAddress,
      serviceType: validated.serviceType,
      servicePointId: validated.servicePointId,
    });

    return Response.json({ options });
  } catch (error) {
    Sentry.captureException(error, {
      extra: { url: req.url },
      tags: { component: "shipping-calculate-api" },
    });
    return handleApiError(error, req);
  }
};

export const POST = rateLimitMiddleware(handler);
```

**Rationale:** Main calculation endpoint. Requires authentication. Validates input with Zod.

#### 4. GET /api/v1/shipping/service-points
**File:** `apps/web/app/api/v1/shipping/service-points/route.ts`

**Changes:** Search service points by coordinates or postal code.

```typescript
import { NextRequest } from "next/server";
import { rateLimitMiddleware } from "@/lib/api/rate-limit";
import { handleApiError } from "@/lib/api/errors";
import { ServicePointService } from "@/lib/services/service-point-service";
import * as Sentry from "@sentry/nextjs";

const handler = async (req: NextRequest) => {
  try {
    if (req.method !== "GET") {
      return new Response(null, { status: 405 });
    }

    const searchParams = req.nextUrl.searchParams;
    const lat = searchParams.get("lat");
    const lng = searchParams.get("lng");
    const postalCode = searchParams.get("postal_code");
    const country = searchParams.get("country");
    const carrier = searchParams.get("carrier") as
      | "gls"
      | "dhl"
      | "postnord"
      | "dpd"
      | null;
    const radiusKm = searchParams.get("radius_km")
      ? parseInt(searchParams.get("radius_km")!)
      : 10;
    const limit = searchParams.get("limit")
      ? parseInt(searchParams.get("limit")!)
      : 20;

    if (!country) {
      return Response.json(
        { error: { code: "BAD_REQUEST", message: "country required" } },
        { status: 400 }
      );
    }

    const service = new ServicePointService();
    let points;

    if (lat && lng) {
      // Search by coordinates
      points = await service.searchByCoordinates({
        latitude: parseFloat(lat),
        longitude: parseFloat(lng),
        country: country.toUpperCase(),
        carrier: carrier || undefined,
        radiusKm,
        limit,
      });
    } else if (postalCode) {
      // Search by postal code
      points = await service.searchByPostalCode(
        postalCode,
        country.toUpperCase(),
        carrier || undefined,
        limit
      );
    } else {
      return Response.json(
        {
          error: {
            code: "BAD_REQUEST",
            message: "Either lat/lng or postal_code required",
          },
        },
        { status: 400 }
      );
    }

    return Response.json({ points });
  } catch (error) {
    Sentry.captureException(error, {
      extra: { url: req.url },
      tags: { component: "service-points-api" },
    });
    return handleApiError(error, req);
  }
};

export const GET = rateLimitMiddleware(handler);
```

**Rationale:** Service point search endpoint. Supports both coordinate and postal code search.

#### 5. GET /api/v1/shipping/addresses (extend existing)
**File:** `apps/web/app/api/v1/shipping/addresses/route.ts` (create if not exists)

**Changes:** List user shipping addresses (extend existing CRUD if needed).

```typescript
import { NextRequest } from "next/server";
import { rateLimitMiddleware } from "@/lib/api/rate-limit";
import { requireAuth } from "@/lib/auth";
import { handleApiError } from "@/lib/api/errors";
import { createServiceClient } from "@/lib/supabase/server";
import * as Sentry from "@sentry/nextjs";

const handler = async (req: NextRequest) => {
  try {
    if (req.method !== "GET") {
      return new Response(null, { status: 405 });
    }

    const { userId } = await requireAuth(req);

    const supabase = await createServiceClient();
    const { data: addresses, error } = await supabase
      .from("shipping_addresses")
      .select("*")
      .eq("user_id", userId)
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    return Response.json({ addresses: addresses || [] });
  } catch (error) {
    Sentry.captureException(error, {
      extra: { url: req.url },
      tags: { component: "shipping-addresses-api" },
    });
    return handleApiError(error, req);
  }
};

export const GET = rateLimitMiddleware(handler);
```

**Rationale:** List user addresses. Extend with POST/PATCH/DELETE if needed (check if exists from HUD-41).

### Success Criteria:

#### Automated Verification:
- [ ] All endpoints return correct status codes
- [ ] Type check passes: `npm run type-check`
- [ ] No linting errors: `npm run lint`
- [ ] Build succeeds: `npm run build`

#### Manual Verification:
- [ ] `GET /api/v1/shipping/zones` returns zones
- [ ] `GET /api/v1/shipping/methods?zone_id=xxx` returns methods
- [ ] `POST /api/v1/shipping/calculate` returns options for valid input
- [ ] `GET /api/v1/shipping/service-points?lat=xxx&lng=xxx&country=DK` returns points
- [ ] `GET /api/v1/shipping/addresses` returns user addresses (authenticated)
- [ ] Error handling works (invalid input, missing auth)
- [ ] Rate limiting works

**⚠️ PAUSE HERE** - Verify all above before Phase 7

---

## Phase 7: Basic Frontend Integration

### Overview
Opret basic frontend components for shipping method selection. Full Service Point Picker UI er HUD-43, så denne fase fokuserer på basic integration.

### Changes Required:

#### 1. Create ShippingMethodSelector component
**File:** `apps/web/components/checkout/ShippingMethodSelector.tsx`

**Changes:** Basic component for shipping method selection (radio buttons).

```typescript
"use client";

import { useState, useEffect } from "react";
import { apiRequest } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

interface ShippingOption {
  id: string;
  name: string;
  price: number; // in cents
  estimatedDays: number | null;
  serviceType: "home_delivery" | "pickup_point";
  provider: string;
  method: string;
}

interface ShippingMethodSelectorProps {
  listingId?: string;
  auctionId?: string;
  shippingAddress: {
    street: string;
    city: string;
    postal_code: string;
    country: string;
    state?: string;
  };
  serviceType?: "home_delivery" | "pickup_point";
  onSelect: (option: ShippingOption) => void;
  selectedOptionId?: string;
}

export function ShippingMethodSelector({
  listingId,
  auctionId,
  shippingAddress,
  serviceType,
  onSelect,
  selectedOptionId,
}: ShippingMethodSelectorProps) {
  const [options, setOptions] = useState<ShippingOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOptions = async () => {
      setLoading(true);
      setError(null);

      try {
        const data = await apiRequest<{ options: ShippingOption[] }>(
          "/shipping/calculate",
          {
            method: "POST",
            body: JSON.stringify({
              listingId,
              auctionId,
              shippingAddress,
              serviceType,
            }),
          }
        );

        setOptions(data.options);
      } catch (err) {
        setError("Failed to load shipping options");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    if (shippingAddress.country) {
      fetchOptions();
    }
  }, [listingId, auctionId, shippingAddress, serviceType]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="ml-2">Loading shipping options...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-destructive/10 text-destructive rounded-lg">
        {error}
      </div>
    );
  }

  if (options.length === 0) {
    return (
      <div className="p-4 bg-muted rounded-lg">
        No shipping options available for this address.
      </div>
    );
  }

  const formatPrice = (cents: number) => {
    return `€${(cents / 100).toFixed(2)}`;
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Shipping Method</h3>
      <RadioGroup
        value={selectedOptionId}
        onValueChange={(value) => {
          const option = options.find((o) => o.id === value);
          if (option) {
            onSelect(option);
          }
        }}
      >
        {options.map((option) => (
          <div
            key={option.id}
            className="flex items-center space-x-2 p-4 border rounded-lg hover:bg-muted/50"
          >
            <RadioGroupItem value={option.id} id={option.id} />
            <Label htmlFor={option.id} className="flex-1 cursor-pointer">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{option.name}</div>
                  {option.estimatedDays && (
                    <div className="text-sm text-muted-foreground">
                      Estimated {option.estimatedDays} day
                      {option.estimatedDays !== 1 ? "s" : ""}
                    </div>
                  )}
                </div>
                <div className="font-semibold">{formatPrice(option.price)}</div>
              </div>
            </Label>
          </div>
        ))}
      </RadioGroup>
    </div>
  );
}
```

**Rationale:** Basic shipping method selector. Full UI med service point picker er HUD-43.

### Success Criteria:

#### Automated Verification:
- [ ] Type check passes: `npm run type-check`
- [ ] No linting errors: `npm run lint`
- [ ] Build succeeds: `npm run build`

#### Manual Verification:
- [ ] Component renders shipping options
- [ ] Selection works (calls onSelect)
- [ ] Loading state shows while fetching
- [ ] Error state shows on failure
- [ ] Price formatting correct (€X.XX)
- [ ] Estimated days displayed

**⚠️ PAUSE HERE** - Verify all above before completion

---

## Testing Strategy

### Unit Tests
- `MedusaShippingService` - Test region/country queries
- `ShippoService` - Test API calls (mock responses)
- `ShippingService` - Test calculation logic, free shipping
- `ServicePointService` - Test caching, distance calculation

### Integration Tests
- API endpoints - Test with valid/invalid input
- Database migrations - Test table creation, constraints
- Service integration - Test Medusa + Shippo combination

### Manual Tests
- Shipping calculation for different countries
- Free shipping logic (same country + flag)
- Service point search (coordinates, postal code)
- Error handling (invalid addresses, API failures)

---

## References
- Linear: HUD-36
- Related files:
  - `apps/web/lib/services/stripe-service.ts` (lazy init pattern)
  - `apps/web/app/api/v1/countries/route.ts` (Medusa query pattern)
  - `apps/web/lib/db/postgres-connection.ts` (direct SQL helper)
  - `supabase/migrations/20251213171000_create_shipping_addresses.sql` (address table)
  - `apps/medusa/src/scripts/seed.ts` (Medusa shipping setup)
- Shippo API Docs: https://docs.goshippo.com/
- Carrier APIs:
  - GLS: https://gls-group.eu/API/parcelshop/
  - DHL: https://developer.dhl.com/
  - PostNord: https://developer.postnord.com/
  - DPD: https://developer.dpd.com/

---

## Estimated Complexity
- **Total LOC:** ~1800 LOC
- **Estimated Hours:** 28-32 timer
- **Breakdown:**
  - Phase 1 (Database): 2-3h
  - Phase 2 (Medusa Service): 4-5h
  - Phase 3 (Shippo Service): 4-5h
  - Phase 4 (Shipping Service): 6-8h
  - Phase 5 (Service Point Service): 4-5h (MVP: stubs, full implementation later)
  - Phase 6 (API Endpoints): 4-5h
  - Phase 7 (Frontend): 4-5h

---

## Rollback Strategy

### Database Migrations Rollback

**Phase 1 Migrations:**
```sql
-- Rollback service_points table
DROP TABLE IF EXISTS public.service_points CASCADE;

-- Rollback shipping_labels table  
DROP TABLE IF EXISTS public.shipping_labels CASCADE;
```

**Rollback Procedure:**
1. Stop application (prevent new shipping calculations)
2. Run rollback SQL (above) in Supabase SQL Editor
3. Remove environment variables: `SHIPPO_API_KEY` (optional - can keep for future use)
4. Redeploy application

**Note:** Rollback will remove cached service points and shipping labels. Existing orders with shipping labels will lose label references (but labels remain accessible in Shippo dashboard).

### Feature Flag (Future Enhancement)

For production safety, consider adding feature flag:

```typescript
// In ShippingService
const SHIPPING_CALCULATION_ENABLED = process.env.SHIPPING_CALCULATION_ENABLED !== 'false';

async calculateShipping(input: ShippingCalculationInput): Promise<ShippingOption[]> {
  if (!SHIPPING_CALCULATION_ENABLED) {
    // Fallback to simple flat rate or throw error
    throw new ApiError('FEATURE_DISABLED', 'Shipping calculation temporarily unavailable', 503);
  }
  // ... existing logic
}
```

**Kill Switch:**
- Set `SHIPPING_CALCULATION_ENABLED=false` in environment to disable
- Returns 503 error instead of calculating shipping
- Allows graceful degradation
- Can be toggled without code deployment

### Data Migration Safety

**Service Points:**
- Cached data only - safe to drop
- Will be re-populated on next search
- No data loss risk (data comes from carrier APIs)

**Shipping Labels:**
- Links to Shippo labels (stored in Shippo)
- Dropping table removes local references only
- Labels remain accessible via Shippo dashboard
- No data loss risk (source of truth is Shippo)

**Medusa Data:**
- READ-ONLY access - no modifications
- Rollback doesn't affect Medusa shop data
- Safe to rollback shipping calculation without impacting Medusa

---

## Next Steps After Completion
1. **HUD-43**: Implement full Service Point Picker UI (map + list view)
2. **HUD-42**: Use `ShippoService` for label generation
3. **HUD-34/HUD-35**: Integrate shipping calculation in checkout flows
4. **Future**: Implement full carrier API integrations (GLS, DHL, PostNord, DPD)

