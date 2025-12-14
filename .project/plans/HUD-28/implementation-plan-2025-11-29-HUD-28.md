# Jersey Metadata Layer - Football Reference Data Schema Implementation Plan

## Overview

Implementerer et `metadata`-schema i Supabase med normaliseret fodboldreferencedata fra Transfermarkt API. Dette gør det muligt at linke `public.jerseys` til officielle klubber, spillere og sæsoner via valgfrie foreign keys, mens brugertekst forbliver den primære sandhed. Feature'en understøtter smart autofill i upload-flowet og fremtidige analytics/badges baseret på metadata.

**Hvorfor:** Brugere indtaster i øjeblikket jersey-metadata manuelt som fritekst, hvilket begrænser smarte forslag, statistikker og discovery-features. Transfermarkt API giver adgang til historiske data (10-15+ år) om klubber, spillere og trøjenumre.

**Mål:** Oprette et robust metadata-lag der kan matche jersey-uploads mod officielle fodbolddata, med on-demand backfill af historiske data og en server-side matching-service.

---

## Linear Issue

**Issue:** [HUD-28](https://linear.app/huddle-world/issue/HUD-28/feature-jersey-metadata-layer-football-reference-data-schema)  
**Status:** Backlog  
**Priority:** High (2)  
**Labels:** API, Database, Backend, Jerseys, Feature  
**Team:** Huddle World  
**Branch:** `nicklaseskou95/hud-28-feature-jersey-metadata-layer-football-reference-data-schema`  
**Created:** 2025-11-29  
**Updated:** 2025-11-29

---

## Current State Analysis

### Nuværende Tilstand:

**Database Schema:**
- ✅ `public.jerseys` tabel eksisterer med felter: `club` (TEXT), `season` (TEXT), `player_name` (TEXT), `player_number` (TEXT)
- ✅ Alle felter er fritekst - ingen normalisering eller linking til reference data
- ✅ RLS policies eksisterer for jerseys tabel
- ❌ Ingen `metadata` schema eksisterer
- ❌ Ingen foreign keys til reference data

**Jersey Upload Flow (`apps/web/components/jersey/UploadJersey.tsx`):**
- ✅ Multi-step form med image upload, metadata input, og submit
- ✅ Validering via Zod schema (`jerseySchema`)
- ✅ Gemmer direkte til `public.jerseys` via Supabase client
- ❌ Ingen autofill eller matching mod reference data
- ❌ Ingen dropdowns med klubber/spillere fra metadata

**API Integration:**
- ✅ Next.js API routes i `apps/web/app/api/v1/` med service/repository pattern
- ✅ Transfermarkt API dokumentation: `https://transfermarkt-api-production-43d7.up.railway.app/docs#/`
- ❌ Ingen Transfermarkt API client/service eksisterer
- ❌ Ingen matching-service eksisterer

**Database Patterns:**
- ✅ Migrations i `supabase/migrations/` med timestamped SQL files
- ✅ Separate schemas eksisterer (fx `medusa` schema for MedusaJS)
- ✅ FK patterns eksisterer (fx `jerseys.owner_id` → `auth.users.id`)
- ✅ RLS patterns eksisterer for user-facing tables

### Key Discoveries:

1. **Schema Isolation:** Vi bruger allerede separate schemas (`medusa`), så `metadata` schema følger samme pattern
2. **Migration Pattern:** Alle migrations er timestamped SQL files - ingen ORM migrations
3. **Service Pattern:** Services i `apps/web/lib/services/` bruger repositories fra `apps/web/lib/repositories/`
4. **API Pattern:** External API integrations (fx Medusa) bruges via services, ikke direkte i API routes
5. **Backward Compatibility:** Eksisterende jerseys skal fortsat virke uden metadata links (nullable FK'er)

---

## Desired End State

### Database Schema:

**`metadata` Schema:**
- `metadata.competitions` - Ligaer/turneringer (Superliga, Premier League, etc.)
- `metadata.seasons` - Sæsonnormalisering (tm_season_id → "25/26" label)
- `metadata.clubs` - Globale klubber med logo, farver, grunddata
- `metadata.club_seasons` - Club-competition-season relationer
- `metadata.players` - Globale spillere med profil-data
- `metadata.player_contracts` - Player-club-season-jersey_number relationer (kritisk for matching)

**`public.jerseys` Extensions:**
- `club_id` (TEXT, FK → `metadata.clubs.id`, nullable)
- `player_id` (TEXT, FK → `metadata.players.id`, nullable)
- `season_id` (UUID, FK → `metadata.seasons.id`, nullable)

### Services & API:

**Transfermarkt API Client:**
- Service i `apps/web/lib/services/transfermarkt-service.ts`
- Methods: `searchCompetitions()`, `getClubs()`, `getPlayers()`, `getJerseyNumbers()`
- Error handling og rate limiting
- Type-safe responses baseret på API docs

**Matching Service:**
- Service i `apps/web/lib/services/metadata-matching-service.ts`
- Method: `matchPlayers(clubId, seasonId, jerseyNumber, playerNameHint?)`
- Returns ranked candidates med confidence scores
- Supports fuzzy matching med player_name_hint

**API Endpoints:**
- `GET /api/v1/metadata/match` - Matching endpoint for upload flow
- `POST /api/v1/metadata/backfill` - On-demand backfill (admin/internal)

**Seed Scripts:**
- Edge Function eller script til initial seed (Top 5 + Superliga)
- On-demand backfill via API eller Edge Function

### Upload Flow Integration:

**Updated `UploadJersey` Component:**
- Ny "Confirm metadata" step efter image upload
- Club dropdown (pre-filled fra matching)
- Season dropdown (pre-filled)
- Player dropdown (pre-filled fra matching)
- Jersey number input (pre-filled)
- User kan acceptere eller redigere forslag
- Gemmer både fritekst OG FK'er ved submit

---

## What We're NOT Doing

**Out of Scope (v1):**
- ❌ Live match/fixture data eller real-time stats (fx fra football-data.org)
- ❌ Full global coverage af alle competitions/clubs fra dag ét (kun Top 5 + Superliga seed)
- ❌ Hard validation der tvinger metadata links - user text er altid primær sandhed
- ❌ AI vision model integration (Phase 4 i tech spec) - kun matching-service
- ❌ Position normalization (positions tabel) - keep as free text for now
- ❌ Automatic metadata FK attachment uden user confirmation
- ❌ `metadata.sources` tabel for tracking provenance (kan tilføjes senere)

**Future Extensions:**
- AI vision model til jersey image analysis
- Proactive backfill for "hero" clubs
- Position normalization
- Multiple metadata sources (ikke kun Transfermarkt)

---

## Implementation Approach

**Strategy:**
1. **Database First:** Opret schema og migrations først (foundation)
2. **API Integration:** Byg Transfermarkt client og seed scripts
3. **Matching Logic:** Implementer matching-service med backfill support
4. **UI Integration:** Opdater upload flow med metadata step (MVP)

**Key Principles:**
- **Separation of Concerns:** `metadata` schema er isoleret fra `public` schema
- **Optional Linking:** FK'er er nullable - jerseys kan eksistere uden metadata links
- **User Text is Primary:** Metadata links er enhancement, ikke requirement
- **On-Demand Backfill:** Load ikke hele verden upfront - backfill når brugt
- **Backward Compatible:** Eksisterende jerseys virker uden ændringer

---

## Phase 1: Database Schema & Migrations

### Overview

Opretter `metadata` schema med alle tabeller og foreign keys til `public.jerseys`. Dette er foundation for hele feature'en.

### Changes Required:

#### 1. Create Metadata Schema Migration

**File:** `supabase/migrations/20251129_create_metadata_schema.sql`

**Changes:** Opretter `metadata` schema og alle tabeller per tech spec.

```sql
-- Create metadata schema for football reference data
-- Separate from public schema for clear separation of concerns
CREATE SCHEMA IF NOT EXISTS metadata;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA metadata TO postgres;
GRANT CREATE ON SCHEMA metadata TO postgres;

-- Comment explaining purpose
COMMENT ON SCHEMA metadata IS 'Football reference data imported from Transfermarkt API. Used for jersey metadata matching and analytics.';

-- 1. Competitions table
CREATE TABLE metadata.competitions (
  id TEXT NOT NULL PRIMARY KEY, -- Transfermarkt competition id (e.g. "DK1")
  name TEXT NOT NULL,
  country TEXT,
  continent TEXT, -- E.g. "UEFA", "CONMEBOL"
  clubs_count INTEGER,
  players_count INTEGER,
  total_market_value NUMERIC,
  mean_market_value NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2. Seasons table
CREATE TABLE metadata.seasons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tm_season_id TEXT NOT NULL UNIQUE, -- Raw season id from API (e.g. "2025")
  label TEXT NOT NULL, -- Human-readable label (e.g. "25/26" or "2025")
  start_year INTEGER NOT NULL, -- First calendar year (e.g. 2025 for "25/26")
  end_year INTEGER NOT NULL, -- Second calendar year (e.g. 2026 for "25/26")
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(tm_season_id, label)
);

CREATE INDEX idx_seasons_tm_season_id ON metadata.seasons(tm_season_id);
CREATE INDEX idx_seasons_start_year ON metadata.seasons(start_year);

-- 3. Clubs table
CREATE TABLE metadata.clubs (
  id TEXT NOT NULL PRIMARY KEY, -- Transfermarkt club id (e.g. "190" for FC Copenhagen)
  name TEXT NOT NULL,
  official_name TEXT,
  slug TEXT UNIQUE, -- Normalized name for search/fuzzy matching
  country TEXT,
  crest_url TEXT, -- From API image field
  colors TEXT[], -- HEX colors from API colors array
  stadium_name TEXT,
  stadium_seats INTEGER,
  founded_on DATE,
  current_market_value NUMERIC,
  external_url TEXT, -- Transfermarkt club URL
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_clubs_slug ON metadata.clubs(slug);
CREATE INDEX idx_clubs_country ON metadata.clubs(country);

-- 4. Club Seasons table (club X participates in competition Y in season Z)
CREATE TABLE metadata.club_seasons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  competition_id TEXT NOT NULL REFERENCES metadata.competitions(id) ON DELETE CASCADE,
  season_id UUID NOT NULL REFERENCES metadata.seasons(id) ON DELETE CASCADE,
  club_id TEXT NOT NULL REFERENCES metadata.clubs(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(competition_id, season_id, club_id)
);

CREATE INDEX idx_club_seasons_club_id ON metadata.club_seasons(club_id);
CREATE INDEX idx_club_seasons_season_id ON metadata.club_seasons(season_id);
CREATE INDEX idx_club_seasons_competition_id ON metadata.club_seasons(competition_id);

-- 5. Players table
CREATE TABLE metadata.players (
  id TEXT NOT NULL PRIMARY KEY, -- Transfermarkt player id (e.g. "370997")
  full_name TEXT NOT NULL,
  known_as TEXT, -- Optional short name/nickname
  date_of_birth DATE,
  nationalities TEXT[],
  height_cm INTEGER,
  preferred_position TEXT, -- E.g. "Goalkeeper", "Centre-Back"
  foot TEXT, -- "left", "right", "both"
  current_club_id TEXT REFERENCES metadata.clubs(id) ON DELETE SET NULL,
  current_shirt_number INTEGER,
  profile_url TEXT,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_players_current_club_id ON metadata.players(current_club_id);
CREATE INDEX idx_players_full_name ON metadata.players(full_name);

-- 6. Player Contracts table (critical for matching)
CREATE TABLE metadata.player_contracts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id TEXT NOT NULL REFERENCES metadata.players(id) ON DELETE CASCADE,
  club_id TEXT NOT NULL REFERENCES metadata.clubs(id) ON DELETE CASCADE,
  season_id UUID NOT NULL REFERENCES metadata.seasons(id) ON DELETE CASCADE,
  jersey_number INTEGER NOT NULL,
  source TEXT, -- E.g. "jersey_numbers" or "transfer_derived" for debugging
  from_date DATE,
  to_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  -- Allow multiple rows per (player_id, club_id, season_id) for number changes
  UNIQUE(player_id, club_id, season_id, jersey_number)
);

-- Critical indexes for matching queries
CREATE INDEX idx_player_contracts_club_season_number ON metadata.player_contracts(club_id, season_id, jersey_number);
CREATE INDEX idx_player_contracts_player_id ON metadata.player_contracts(player_id);
CREATE INDEX idx_player_contracts_season_id ON metadata.player_contracts(season_id);

-- Grant permissions for metadata schema (public read-only)
-- Metadata is reference data - all authenticated users can read, only service role can write
GRANT USAGE ON SCHEMA metadata TO anon, authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA metadata TO anon, authenticated;
-- Future tables will automatically get SELECT permission via default privileges
ALTER DEFAULT PRIVILEGES IN SCHEMA metadata GRANT SELECT ON TABLES TO anon, authenticated;

-- Add updated_at triggers
CREATE OR REPLACE FUNCTION metadata.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_competitions_updated_at
BEFORE UPDATE ON metadata.competitions
FOR EACH ROW
EXECUTE FUNCTION metadata.update_updated_at_column();

CREATE TRIGGER update_clubs_updated_at
BEFORE UPDATE ON metadata.clubs
FOR EACH ROW
EXECUTE FUNCTION metadata.update_updated_at_column();

CREATE TRIGGER update_players_updated_at
BEFORE UPDATE ON metadata.players
FOR EACH ROW
EXECUTE FUNCTION metadata.update_updated_at_column();
```

**Rationale:** Opretter komplet metadata schema med alle tabeller, indexes og constraints per tech spec. Indexes på `player_contracts` er kritiske for matching-performance. GRANT statements sikrer at alle authenticated users kan læse metadata (reference data), mens kun service role kan skrive (via migrations/seed scripts).

#### 2. Add Foreign Keys to public.jerseys

**File:** `supabase/migrations/20251129_add_jersey_metadata_fks.sql`

**Changes:** Tilføjer nullable FK-felter til `public.jerseys` tabel.

```sql
-- Add optional foreign key fields to public.jerseys for metadata linking
-- These fields are nullable - jerseys can exist without metadata links
-- User text fields (club, season, player_name, player_number) remain primary truth

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
```

**Rationale:** Tilføjer nullable FK'er til jerseys tabel. `ON DELETE SET NULL` sikrer at jerseys ikke slettes hvis metadata slettes. Indexes forbedrer join-performance.

#### 3. Update Supabase Types

**File:** `apps/web/lib/supabase/types.ts`

**Changes:** Regenerer TypeScript types fra Supabase schema.

```bash
# For local Supabase instance (development):
npx supabase gen types typescript --local > apps/web/lib/supabase/types.ts

# For remote Supabase project (staging/production):
npx supabase gen types typescript --project-id <project-id> > apps/web/lib/supabase/types.ts
```

**Note:** Brug `--local` flag når du kører mod local Supabase instance. Brug `--project-id` for remote projects.

**Rationale:** Opdaterer TypeScript types så vi kan bruge `Tables<"metadata.competitions">` etc. i kode. Types skal regenereres efter hver migration der påvirker schema.

### Success Criteria:

#### Automated Verification:
- [ ] Migration runs successfully: `npx supabase migration up`
- [ ] No SQL errors in migration files
- [ ] Type check passes: `npm run type-check`
- [ ] Types generated successfully: `npx supabase gen types typescript`
- [ ] All indexes created: Verify via `\d+ metadata.player_contracts` in psql

#### Manual Verification:
- [ ] `metadata` schema exists in Supabase dashboard
- [ ] All 6 tables created (`competitions`, `seasons`, `clubs`, `club_seasons`, `players`, `player_contracts`)
- [ ] Foreign keys work: Insert test club → reference from jersey → verify FK constraint
- [ ] Nullable FK's work: Jersey can be created without `club_id` set
- [ ] Indexes exist: Check via Supabase dashboard or `\di metadata.*` in psql
- [ ] Updated_at triggers work: Update row → verify `updated_at` changes

**⚠️ PAUSE HERE** - Verify all above before Phase 2

---

## Phase 2: Transfermarkt API Integration & Seed Scripts

### Overview

Implementerer Transfermarkt API client og seed scripts til at importere initial metadata (Top 5 leagues + Superliga). Dette giver os baseline data til at teste matching-service.

### Environment Variables Required

Følgende environment variables skal være sat før implementation:

**Required:**
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key for database operations (seed scripts, repositories)
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL (allerede konfigureret)

**Optional:**
- `TRANSFERMARKT_API_URL` - Transfermarkt API base URL (defaults to production URL hvis ikke sat)

**Setup:**
```bash
# Add to .env.local (development)
TRANSFERMARKT_API_URL=https://transfermarkt-api-production-43d7.up.railway.app
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Add to production environment variables
# (via Supabase dashboard → Settings → API → service_role key)
```

**Note:** `SUPABASE_SERVICE_ROLE_KEY` skal kun bruges server-side (API routes, scripts). Aldrig eksponer i client bundles.

### Changes Required:

#### 1. Transfermarkt API Client Service

**File:** `apps/web/lib/services/transfermarkt-service.ts`

**Changes:** Opretter service til at kalde Transfermarkt API med type-safe responses.

```typescript
/**
 * Transfermarkt API Client Service
 * 
 * Base URL: https://transfermarkt-api-production-43d7.up.railway.app/docs#/
 * 
 * Handles all API calls to Transfermarkt API with error handling and rate limiting.
 */

const TRANSFERMARKT_API_BASE = process.env.TRANSFERMARKT_API_URL || 
  'https://transfermarkt-api-production-43d7.up.railway.app';

interface TransfermarktApiError {
  message: string;
  status?: number;
}

export class TransfermarktService {
  private baseUrl: string;
  private rateLimitDelay: number = 100; // 100ms delay between requests

  constructor() {
    this.baseUrl = TRANSFERMARKT_API_BASE;
  }

  /**
   * Search for competitions by name
   * GET /competitions/search/{competition_name}
   */
  async searchCompetitions(competitionName: string): Promise<CompetitionSearchResult[]> {
    const url = `${this.baseUrl}/competitions/search/${encodeURIComponent(competitionName)}`;
    return this.fetchWithRetry<CompetitionSearchResult[]>(url);
  }

  /**
   * Get clubs for a competition and season
   * GET /competitions/{competition_id}/clubs?season_id={season_id}
   */
  async getCompetitionClubs(
    competitionId: string,
    seasonId: string
  ): Promise<CompetitionClubsResult> {
    const url = `${this.baseUrl}/competitions/${competitionId}/clubs?season_id=${seasonId}`;
    return this.fetchWithRetry<CompetitionClubsResult>(url);
  }

  /**
   * Get players for a club and season
   * GET /clubs/{club_id}/players?season_id={season_id}
   */
  async getClubPlayers(
    clubId: string,
    seasonId: string
  ): Promise<ClubPlayersResult> {
    const url = `${this.baseUrl}/clubs/${clubId}/players?season_id=${seasonId}`;
    return this.fetchWithRetry<ClubPlayersResult>(url);
  }

  /**
   * Get jersey numbers for a player (historical)
   * GET /players/{player_id}/jersey_numbers
   */
  async getPlayerJerseyNumbers(
    playerId: string
  ): Promise<PlayerJerseyNumbersResult> {
    const url = `${this.baseUrl}/players/${playerId}/jersey_numbers`;
    return this.fetchWithRetry<PlayerJerseyNumbersResult>(url);
  }

  /**
   * Search for clubs by name
   * GET /clubs/search/{club_name}
   */
  async searchClubs(clubName: string): Promise<ClubSearchResult[]> {
    const url = `${this.baseUrl}/clubs/search/${encodeURIComponent(clubName)}`;
    return this.fetchWithRetry<ClubSearchResult[]>(url);
  }

  /**
   * Get club profile
   * GET /clubs/{club_id}/profile
   */
  async getClubProfile(clubId: string): Promise<ClubProfileResult> {
    const url = `${this.baseUrl}/clubs/${clubId}/profile`;
    return this.fetchWithRetry<ClubProfileResult>(url);
  }

  /**
   * Generic fetch with retry logic and rate limiting
   */
  private async fetchWithRetry<T>(
    url: string,
    retries: number = 3
  ): Promise<T> {
    for (let i = 0; i < retries; i++) {
      try {
        // Rate limiting delay
        if (i > 0) {
          await this.delay(this.rateLimitDelay * i);
        }

        const response = await fetch(url, {
          headers: {
            'Accept': 'application/json',
          },
        });

        if (!response.ok) {
          if (response.status === 429) {
            // Rate limited - wait longer
            await this.delay(1000 * (i + 1));
            continue;
          }
          throw new Error(`API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        return data as T;
      } catch (error) {
        if (i === retries - 1) {
          throw new TransfermarktApiError(
            `Failed to fetch ${url} after ${retries} retries: ${error instanceof Error ? error.message : String(error)}`
          );
        }
      }
    }
    throw new Error('Unreachable');
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Type definitions based on API docs (simplified - expand as needed)
export interface CompetitionSearchResult {
  id: string;
  name: string;
  country?: string;
  continent?: string;
  clubs?: number;
  players?: number;
  totalMarketValue?: number;
  meanMarketValue?: number;
}

export interface CompetitionClubsResult {
  clubs: Array<{
    id: string;
    name: string;
    // ... other fields from API
  }>;
}

export interface ClubPlayersResult {
  players: Array<{
    id: string;
    fullName: string;
    // ... other fields from API
  }>;
}

export interface PlayerJerseyNumbersResult {
  jerseyNumbers: Array<{
    season: string; // E.g. "25/26"
    club: string; // Club ID
    jerseyNumber: number;
  }>;
}

export interface ClubSearchResult {
  id: string;
  name: string;
  // ... other fields
}

export interface ClubProfileResult {
  id: string;
  name: string;
  officialName?: string;
  country?: string;
  image?: string; // Crest URL
  colors?: string[]; // HEX colors
  stadiumName?: string;
  stadiumSeats?: number;
  foundedOn?: string; // Date string
  currentMarketValue?: number;
  externalUrl?: string;
}

class TransfermarktApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TransfermarktApiError';
  }
}
```

**Rationale:** Centraliserer alle Transfermarkt API calls i én service med error handling, rate limiting og retry logic. Type-safe interfaces baseret på API docs.

#### 2. Metadata Repository

**File:** `apps/web/lib/repositories/metadata-repository.ts`

**Changes:** Opretter repository til database operations på metadata schema.

```typescript
/**
 * Repository for metadata schema operations
 * Handles all database access for metadata tables
 */

import { createServiceClient } from '@/lib/supabase/server';
import type { Database } from '@/lib/supabase/types';

type Competition = Database['metadata']['competitions']['Row'];
type Season = Database['metadata']['seasons']['Row'];
type Club = Database['metadata']['clubs']['Row'];
type ClubSeason = Database['metadata']['club_seasons']['Row'];
type Player = Database['metadata']['players']['Row'];
type PlayerContract = Database['metadata']['player_contracts']['Row'];

export class MetadataRepository {
  /**
   * Upsert competition
   */
  async upsertCompetition(data: {
    id: string;
    name: string;
    country?: string;
    continent?: string;
    clubs_count?: number;
    players_count?: number;
    total_market_value?: number;
    mean_market_value?: number;
  }): Promise<Competition> {
    const supabase = await createServiceClient();
    const { data: competition, error } = await supabase
      .schema('metadata')
      .from('competitions')
      .upsert(data, { onConflict: 'id' })
      .select()
      .single();

    if (error) throw error;
    return competition;
  }

  /**
   * Upsert season
   */
  async upsertSeason(data: {
    tm_season_id: string;
    label: string;
    start_year: number;
    end_year: number;
  }): Promise<Season> {
    const supabase = await createServiceClient();
    const { data: season, error } = await supabase
      .schema('metadata')
      .from('seasons')
      .upsert(data, { onConflict: 'tm_season_id' })
      .select()
      .single();

    if (error) throw error;
    return season;
  }

  /**
   * Upsert club
   */
  async upsertClub(data: {
    id: string;
    name: string;
    official_name?: string;
    slug?: string;
    country?: string;
    crest_url?: string;
    colors?: string[];
    stadium_name?: string;
    stadium_seats?: number;
    founded_on?: string;
    current_market_value?: number;
    external_url?: string;
  }): Promise<Club> {
    const supabase = await createServiceClient();
    const { data: club, error } = await supabase
      .schema('metadata')
      .from('clubs')
      .upsert(data, { onConflict: 'id' })
      .select()
      .single();

    if (error) throw error;
    return club;
  }

  /**
   * Upsert club season relationship
   */
  async upsertClubSeason(data: {
    competition_id: string;
    season_id: string;
    club_id: string;
  }): Promise<ClubSeason> {
    const supabase = await createServiceClient();
    const { data: clubSeason, error } = await supabase
      .schema('metadata')
      .from('club_seasons')
      .upsert(data, { 
        onConflict: 'competition_id,season_id,club_id' 
      })
      .select()
      .single();

    if (error) throw error;
    return clubSeason;
  }

  /**
   * Upsert player
   */
  async upsertPlayer(data: {
    id: string;
    full_name: string;
    known_as?: string;
    date_of_birth?: string;
    nationalities?: string[];
    height_cm?: number;
    preferred_position?: string;
    foot?: string;
    current_club_id?: string;
    current_shirt_number?: number;
    profile_url?: string;
    image_url?: string;
  }): Promise<Player> {
    const supabase = await createServiceClient();
    const { data: player, error } = await supabase
      .schema('metadata')
      .from('players')
      .upsert(data, { onConflict: 'id' })
      .select()
      .single();

    if (error) throw error;
    return player;
  }

  /**
   * Upsert player contract
   */
  async upsertPlayerContract(data: {
    player_id: string;
    club_id: string;
    season_id: string;
    jersey_number: number;
    source?: string;
    from_date?: string;
    to_date?: string;
  }): Promise<PlayerContract> {
    const supabase = await createServiceClient();
    const { data: contract, error } = await supabase
      .schema('metadata')
      .from('player_contracts')
      .upsert(data, { 
        onConflict: 'player_id,club_id,season_id,jersey_number' 
      })
      .select()
      .single();

    if (error) throw error;
    return contract;
  }

  /**
   * Find season by UUID (for backfill)
   */
  async findSeasonById(seasonId: string): Promise<Season | null> {
    const supabase = await createServiceClient();
    const { data, error } = await supabase
      .schema('metadata')
      .from('seasons')
      .select('*')
      .eq('id', seasonId)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    return data || null;
  }

  /**
   * Find season by tm_season_id or label
   */
  async findSeasonByTmIdOrLabel(tmSeasonId: string, label?: string): Promise<Season | null> {
    const supabase = await createServiceClient();
    let query = supabase
      .schema('metadata')
      .from('seasons')
      .select('*');

    if (tmSeasonId) {
      query = query.eq('tm_season_id', tmSeasonId);
    }

    if (label) {
      query = query.or(`tm_season_id.eq.${tmSeasonId || ''},label.eq.${label}`);
    }

    const { data, error } = await query.maybeSingle();

    if (error && error.code !== 'PGRST116') { // PGRST116 = not found
      throw error;
    }

    return data || null;
  }

  /**
   * Find club by ID
   */
  async findClubById(clubId: string): Promise<Club | null> {
    const supabase = await createServiceClient();
    const { data, error } = await supabase
      .schema('metadata')
      .from('clubs')
      .select('*')
      .eq('id', clubId)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    return data || null;
  }
}
```

**Rationale:** Repository pattern for database access. Bruger service role client (bypasses RLS). Upsert operations med onConflict for idempotency. Bruger `.schema('metadata')` før `.from()` for at query'e non-public schema.

#### 3. Seed Service

**File:** `apps/web/lib/services/metadata-seed-service.ts`

**Changes:** Opretter service til at seed initial metadata (Top 5 + Superliga).

```typescript
/**
 * Service for seeding initial metadata from Transfermarkt API
 * Seeds competitions, clubs, seasons, and baseline players for Top 5 + Superliga
 */

import { TransfermarktService } from './transfermarkt-service';
import { MetadataRepository } from '@/lib/repositories/metadata-repository';

const TARGET_COMPETITIONS = [
  'Premier League',
  'La Liga',
  'Serie A',
  'Bundesliga',
  'Ligue 1',
  'Superliga', // Danish Superliga
];

const TARGET_SEASONS = [
  { tm_season_id: '2024', label: '24/25', start_year: 2024, end_year: 2025 },
  { tm_season_id: '2023', label: '23/24', start_year: 2023, end_year: 2024 },
  // Add more seasons as needed
];

export class MetadataSeedService {
  private transfermarktService = new TransfermarktService();
  private metadataRepository = new MetadataRepository();

  /**
   * Seed all initial metadata
   */
  async seedAll(): Promise<void> {
    console.log('[SEED] Starting metadata seed...');

    // 1. Seed competitions
    await this.seedCompetitions();

    // 2. Seed seasons
    await this.seedSeasons();

    // 3. Seed clubs and club_seasons
    await this.seedClubsAndSeasons();

    // 4. Seed baseline players
    await this.seedBaselinePlayers();

    console.log('[SEED] Metadata seed completed');
  }

  /**
   * Seed competitions
   */
  private async seedCompetitions(): Promise<void> {
    console.log('[SEED] Seeding competitions...');

    for (const compName of TARGET_COMPETITIONS) {
      try {
        const results = await this.transfermarktService.searchCompetitions(compName);
        if (results.length === 0) {
          console.warn(`[SEED] No competition found for: ${compName}`);
          continue;
        }

        // Take first result (most relevant)
        const comp = results[0];
        await this.metadataRepository.upsertCompetition({
          id: comp.id,
          name: comp.name,
          country: comp.country,
          continent: comp.continent,
          clubs_count: comp.clubs,
          players_count: comp.players,
          total_market_value: comp.totalMarketValue,
          mean_market_value: comp.meanMarketValue,
        });

        console.log(`[SEED] Upserted competition: ${comp.name} (${comp.id})`);
      } catch (error) {
        console.error(`[SEED] Error seeding competition ${compName}:`, error);
      }
    }
  }

  /**
   * Seed seasons
   */
  private async seedSeasons(): Promise<void> {
    console.log('[SEED] Seeding seasons...');

    for (const season of TARGET_SEASONS) {
      try {
        await this.metadataRepository.upsertSeason({
          tm_season_id: season.tm_season_id,
          label: season.label,
          start_year: season.start_year,
          end_year: season.end_year,
        });
        console.log(`[SEED] Upserted season: ${season.label}`);
      } catch (error) {
        console.error(`[SEED] Error seeding season ${season.label}:`, error);
      }
    }
  }

  /**
   * Seed clubs and club_seasons
   */
  private async seedClubsAndSeasons(): Promise<void> {
    console.log('[SEED] Seeding clubs and club_seasons...');

    // Get all competitions we seeded
    const competitions = await this.getSeededCompetitions();

    for (const comp of competitions) {
      for (const season of TARGET_SEASONS) {
        try {
          // Get clubs for this competition and season
          const clubsResult = await this.transfermarktService.getCompetitionClubs(
            comp.id,
            season.tm_season_id
          );

          // Find or create season
          const seasonRecord = await this.metadataRepository.findSeasonByTmIdOrLabel(
            season.tm_season_id,
            season.label
          );

          if (!seasonRecord) {
            console.warn(`[SEED] Season not found: ${season.label}`);
            continue;
          }

          // Upsert each club
          for (const clubData of clubsResult.clubs) {
            // Get full club profile for additional data
            const clubProfile = await this.transfermarktService.getClubProfile(clubData.id);

            await this.metadataRepository.upsertClub({
              id: clubData.id,
              name: clubData.name,
              official_name: clubProfile.officialName,
              slug: this.normalizeSlug(clubData.name),
              country: clubProfile.country,
              crest_url: clubProfile.image,
              colors: clubProfile.colors,
              stadium_name: clubProfile.stadiumName,
              stadium_seats: clubProfile.stadiumSeats,
              founded_on: clubProfile.foundedOn,
              current_market_value: clubProfile.currentMarketValue,
              external_url: clubProfile.externalUrl,
            });

            // Create club_season relationship
            await this.metadataRepository.upsertClubSeason({
              competition_id: comp.id,
              season_id: seasonRecord.id,
              club_id: clubData.id,
            });

            console.log(`[SEED] Upserted club: ${clubData.name} (${clubData.id})`);
          }
        } catch (error) {
          console.error(`[SEED] Error seeding clubs for ${comp.name} ${season.label}:`, error);
        }
      }
    }
  }

  /**
   * Seed baseline players
   */
  private async seedBaselinePlayers(): Promise<void> {
    console.log('[SEED] Seeding baseline players...');

    // Get all clubs we seeded
    const clubs = await this.getSeededClubs();

    for (const club of clubs) {
      // Seed players for current season (2024)
      try {
        const playersResult = await this.transfermarktService.getClubPlayers(
          club.id,
          '2024' // Current season
        );

        for (const playerData of playersResult.players) {
          await this.metadataRepository.upsertPlayer({
            id: playerData.id,
            full_name: playerData.fullName,
            // Add other fields from API response
          });

          console.log(`[SEED] Upserted player: ${playerData.fullName} (${playerData.id})`);
        }
      } catch (error) {
        console.error(`[SEED] Error seeding players for club ${club.name}:`, error);
      }
    }
  }

  /**
   * Helper: Get seeded competitions
   */
  private async getSeededCompetitions(): Promise<Array<{ id: string; name: string }>> {
    const { createServiceClient } = await import('@/lib/supabase/server');
    const supabase = await createServiceClient();
    const { data, error } = await supabase
      .schema('metadata')
      .from('competitions')
      .select('id, name');

    if (error) {
      console.error('[SEED] Error fetching competitions:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Helper: Get seeded clubs
   */
  private async getSeededClubs(): Promise<Array<{ id: string; name: string }>> {
    const { createServiceClient } = await import('@/lib/supabase/server');
    const supabase = await createServiceClient();
    const { data, error } = await supabase
      .schema('metadata')
      .from('clubs')
      .select('id, name');

    if (error) {
      console.error('[SEED] Error fetching clubs:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Normalize club name to slug
   */
  private normalizeSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
}
```

**Rationale:** Seed service der koordinerer import af competitions, clubs, seasons og players. Bruger repository pattern og Transfermarkt service. Error handling per operation så én fejl ikke stopper hele seed. Helper methods (`getSeededCompetitions`, `getSeededClubs`) bruger dynamic import af `createServiceClient` for at undgå circular dependencies.

#### 4. Seed Script / Edge Function

**File:** `scripts/seed-metadata.ts` (Standalone Script)

**Changes:** Opretter standalone script til at køre seed operation. Edge Functions er ikke ideelt da de kører i Deno runtime og ikke kan importere Node.js services direkte.

**Note:** Script kan køres lokalt eller i CI/CD. For production, overvej at oprette API endpoint `/api/v1/admin/seed-metadata` der kalder seed service.

```typescript
/**
 * Standalone script to seed metadata
 * Run with: npm run seed-metadata (add to package.json scripts)
 * 
 * Usage:
 *   npm run seed-metadata
 *   # Or with tsx:
 *   npx tsx scripts/seed-metadata.ts
 */

import { MetadataSeedService } from '../apps/web/lib/services/metadata-seed-service';

async function main() {
  console.log('Starting metadata seed...');
  const seedService = new MetadataSeedService();
  await seedService.seedAll();
  console.log('Metadata seed completed successfully');
  process.exit(0);
}

main().catch((error) => {
  console.error('Seed failed:', error);
  process.exit(1);
});
```

**Rationale:** Standalone script er bedre end Edge Function da services er Node.js/TypeScript og ikke kompatibel med Deno runtime. Script kan køres lokalt, i CI/CD, eller via API endpoint wrapper.

**Performance Considerations:**
- Seed script kan importere store mængder data (1000+ clubs, 10,000+ players for Top 5 + Superliga)
- Script bruger rate limiting (100ms delay) for at undgå API throttling
- Error handling per operation sikrer at én fejl ikke stopper hele seed
- Overvej at køre seed i batches eller via background job hvis data mængde bliver for stor
- For production: Overvej at køre seed script via scheduled job eller CI/CD pipeline i stedet for manuel execution

### Success Criteria:

#### Automated Verification:
- [ ] Type check passes: `npm run type-check`
- [ ] Lint passes: `npm run lint`
- [ ] Build succeeds: `npm run build`
- [ ] Transfermarkt service compiles without errors
- [ ] Repository methods compile without errors

#### Manual Verification:
- [ ] Transfermarkt API is accessible (test endpoint manually)
- [ ] Seed service can search competitions (test `searchCompetitions()`)
- [ ] Seed service can get clubs (test `getCompetitionClubs()`)
- [ ] Repository can upsert competition (test manually)
- [ ] Repository can upsert club (test manually)
- [ ] Seed script runs without errors (test with 1 competition first)
- [ ] Data appears in Supabase dashboard after seed

**⚠️ PAUSE HERE** - Verify all above before Phase 3

---

## Phase 3: Matching Service & Backfill

### Overview

Implementerer matching-service der kan finde kandidatspillere baseret på club + season + jersey number. Tilføjer også on-demand backfill af historiske `player_contracts` data.

### Changes Required:

#### 1. Matching Service

**File:** `apps/web/lib/services/metadata-matching-service.ts`

**Changes:** Opretter service til at matche jersey metadata mod `player_contracts` tabel.

```typescript
/**
 * Service for matching jersey metadata to players
 * Given club, season, and jersey number, returns candidate players
 */

import { MetadataRepository } from '@/lib/repositories/metadata-repository';
import { createServiceClient } from '@/lib/supabase/server';

export interface MatchPlayerInput {
  clubId: string;
  seasonId?: string; // UUID
  seasonLabel?: string; // E.g. "25/26" - used if seasonId not provided
  jerseyNumber: number;
  playerNameHint?: string; // Optional hint for fuzzy matching
}

export interface MatchPlayerResult {
  playerId: string;
  fullName: string;
  jerseyNumber: number;
  seasonLabel: string;
  confidenceScore: number; // 0-100
}

export class MetadataMatchingService {
  private metadataRepository = new MetadataRepository();

  /**
   * Match players based on club, season, and jersey number
   */
  async matchPlayers(input: MatchPlayerInput): Promise<MatchPlayerResult[]> {
    const { clubId, seasonId, seasonLabel, jerseyNumber, playerNameHint } = input;

    // 1. Resolve season_id if only label provided
    let resolvedSeasonId = seasonId;
    if (!resolvedSeasonId && seasonLabel) {
      const season = await this.metadataRepository.findSeasonByTmIdOrLabel(
        '', // tm_season_id not known
        seasonLabel
      );
      if (!season) {
        return []; // No season found
      }
      resolvedSeasonId = season.id;
    }

    if (!resolvedSeasonId) {
      throw new Error('Either seasonId or seasonLabel must be provided');
    }

    // 2. Query player_contracts for matches
    const supabase = await createServiceClient();
    const { data: contracts, error } = await supabase
      .schema('metadata')
      .from('player_contracts')
      .select(`
        jersey_number,
        player_id,
        season_id,
        players:players!player_id (
          id,
          full_name
        ),
        seasons:seasons!season_id (
          id,
          label
        )
      `)
      .eq('club_id', clubId)
      .eq('season_id', resolvedSeasonId)
      .eq('jersey_number', jerseyNumber);

    if (error) {
      throw new Error(`Failed to query player_contracts: ${error.message}`);
    }

    if (!contracts || contracts.length === 0) {
      return []; // No matches found
    }

    // 3. Map to results and calculate confidence scores
    const results: MatchPlayerResult[] = contracts.map((contract: any) => {
      const player = contract.players;
      const season = contract.seasons;

      // Base confidence: 100 for exact match
      let confidenceScore = 100;

      // Reduce confidence if player name hint doesn't match
      if (playerNameHint && player?.full_name) {
        const hintLower = playerNameHint.toLowerCase();
        const nameLower = player.full_name.toLowerCase();

        if (nameLower.includes(hintLower) || hintLower.includes(nameLower)) {
          // Name matches - keep high confidence
        } else {
          // Name doesn't match - reduce confidence
          confidenceScore = 70;
        }
      }

      return {
        playerId: player.id,
        fullName: player.full_name,
        jerseyNumber: contract.jersey_number,
        seasonLabel: season?.label || 'Unknown',
        confidenceScore,
      };
    });

    // 4. Sort by confidence score (highest first)
    results.sort((a, b) => b.confidenceScore - a.confidenceScore);

    return results;
  }

  /**
   * Check if backfill is needed for a club/season combination
   */
  async needsBackfill(clubId: string, seasonId: string): Promise<boolean> {
    const supabase = await createServiceClient();
    const { count, error } = await supabase
      .schema('metadata')
      .from('player_contracts')
      .select('*', { count: 'exact', head: true })
      .eq('club_id', clubId)
      .eq('season_id', seasonId);

    if (error) {
      throw new Error(`Failed to check backfill: ${error.message}`);
    }

    // If count is 0 or very low, backfill is needed
    return (count || 0) < 5; // Threshold: at least 5 contracts expected
  }
}
```

**Rationale:** Matching-service der query'er `player_contracts` med joins til `players` og `seasons`. Confidence scoring baseret på exact match + optional name hint. `needsBackfill()` helper til at tjekke om data mangler. Bruger `.schema('metadata')` for korrekt schema query.

#### 2. Backfill Service

**File:** `apps/web/lib/services/metadata-backfill-service.ts`

**Changes:** Opretter service til on-demand backfill af historiske `player_contracts` data.

```typescript
/**
 * Service for on-demand backfill of historical player_contracts data
 * Fills in missing jersey_numbers data for clubs/seasons as needed
 */

import { TransfermarktService } from './transfermarkt-service';
import { MetadataRepository } from '@/lib/repositories/metadata-repository';
import { MetadataMatchingService } from './metadata-matching-service';

export interface BackfillOptions {
  clubId: string;
  seasonId: string;
  playerIds?: string[]; // Optional: specific players to backfill
}

export class MetadataBackfillService {
  private transfermarktService = new TransfermarktService();
  private metadataRepository = new MetadataRepository();
  private matchingService = new MetadataMatchingService();

  /**
   * Backfill player_contracts for a club/season combination
   */
  async backfillClubSeason(options: BackfillOptions): Promise<void> {
    const { clubId, seasonId, playerIds } = options;

    // 1. Get season record to find tm_season_id
    const season = await this.metadataRepository.findSeasonById(seasonId);
    if (!season) {
      throw new Error(`Season not found: ${seasonId}`);
    }

    // 2. Get players to backfill
    let playersToBackfill: string[] = playerIds || [];

    if (playersToBackfill.length === 0) {
      // Get all players for this club/season from API
      const playersResult = await this.transfermarktService.getClubPlayers(
        clubId,
        season.tm_season_id
      );
      playersToBackfill = playersResult.players.map(p => p.id);
    }

    // 3. For each player, get jersey_numbers and upsert contracts
    for (const playerId of playersToBackfill) {
      try {
        const jerseyNumbersResult = await this.transfermarktService.getPlayerJerseyNumbers(
          playerId
        );

        for (const jerseyData of jerseyNumbersResult.jerseyNumbers) {
          // Map season label to season_id
          const contractSeason = await this.metadataRepository.findSeasonByTmIdOrLabel(
            '', // tm_season_id not available from jersey_numbers API
            jerseyData.season // Use season label (e.g. "25/26")
          );

          if (!contractSeason) {
            console.warn(`[BACKFILL] Season not found: ${jerseyData.season}`);
            continue;
          }

          // Only backfill if club matches
          if (jerseyData.club === clubId) {
            await this.metadataRepository.upsertPlayerContract({
              player_id: playerId,
              club_id: clubId,
              season_id: contractSeason.id,
              jersey_number: jerseyData.jerseyNumber,
              source: 'jersey_numbers',
            });
          }
        }

        console.log(`[BACKFILL] Backfilled contracts for player: ${playerId}`);
      } catch (error) {
        console.error(`[BACKFILL] Error backfilling player ${playerId}:`, error);
      }
    }
  }

  /**
   * Auto-backfill if needed (called before matching)
   */
  async autoBackfillIfNeeded(clubId: string, seasonId: string): Promise<void> {
    const needsBackfill = await this.matchingService.needsBackfill(clubId, seasonId);
    if (needsBackfill) {
      console.log(`[BACKFILL] Auto-backfilling ${clubId} / ${seasonId}`);
      await this.backfillClubSeason({ clubId, seasonId });
    }
  }
}
```

**Rationale:** Backfill-service der importerer historiske `jersey_numbers` fra Transfermarkt API. `autoBackfillIfNeeded()` kan kaldes før matching for at sikre data er tilgængelig. Bruger `findSeasonById()` for UUID lookup i stedet for tomme strings.

#### 3. Matching API Endpoint

**File:** `apps/web/app/api/v1/metadata/match/route.ts`

**Changes:** Opretter API endpoint til matching for upload flow.

```typescript
import { NextRequest } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { rateLimitMiddleware } from '@/lib/api/rate-limit';
import { handleApiError } from '@/lib/api/errors';
import { MetadataMatchingService } from '@/lib/services/metadata-matching-service';
import { MetadataBackfillService } from '@/lib/services/metadata-backfill-service';
import { z } from 'zod';

const matchQuerySchema = z.object({
  clubId: z.string().min(1),
  seasonId: z.string().uuid().optional(),
  seasonLabel: z.string().optional(),
  jerseyNumber: z.number().int().min(1).max(99),
  playerNameHint: z.string().optional(),
});

const handler = async (req: NextRequest) => {
  try {
    if (req.method !== 'GET') {
      return new Response(null, { status: 405 });
    }

    const searchParams = req.nextUrl.searchParams;
    const query = matchQuerySchema.parse({
      clubId: searchParams.get('clubId'),
      seasonId: searchParams.get('seasonId'),
      seasonLabel: searchParams.get('seasonLabel'),
      jerseyNumber: parseInt(searchParams.get('jerseyNumber') || '0', 10),
      playerNameHint: searchParams.get('playerNameHint'),
    });

    const matchingService = new MetadataMatchingService();
    const backfillService = new MetadataBackfillService();

    // Auto-backfill if needed
    if (query.seasonId) {
      try {
        await backfillService.autoBackfillIfNeeded(query.clubId, query.seasonId);
      } catch (backfillError) {
        // Log but don't fail matching if backfill fails
        Sentry.captureException(backfillError, {
          extra: { clubId: query.clubId, seasonId: query.seasonId },
          tags: { component: 'metadata-backfill' },
        });
        console.error('[MATCH] Backfill failed, continuing with matching:', backfillError);
      }
    }

    // Perform matching
    const results = await matchingService.matchPlayers({
      clubId: query.clubId,
      seasonId: query.seasonId,
      seasonLabel: query.seasonLabel,
      jerseyNumber: query.jerseyNumber,
      playerNameHint: query.playerNameHint,
    });

    return Response.json({ results });
  } catch (error) {
    // Capture error with Sentry
    Sentry.captureException(error, {
      extra: {
        url: req.url,
        method: req.method,
      },
      tags: { component: 'metadata-match-api' },
    });
    return handleApiError(error, req);
  }
};

export const GET = rateLimitMiddleware(handler);
```

**Rationale:** API endpoint til matching. Validerer input via Zod, kalder auto-backfill hvis nødvendigt, returnerer ranked results. Sentry error capture tilføjet per observability standards. Backfill failures logges men blokerer ikke matching.

### Success Criteria:

#### Automated Verification:
- [ ] Type check passes: `npm run type-check`
- [ ] Lint passes: `npm run lint`
- [ ] Build succeeds: `npm run build`
- [ ] Matching service compiles without errors
- [ ] API endpoint compiles without errors

#### Manual Verification:
- [ ] Matching service finds players for known club/season/number
- [ ] Confidence scores are calculated correctly
- [ ] Results are sorted by confidence (highest first)
- [ ] Backfill service imports jersey_numbers correctly
- [ ] Auto-backfill triggers when data is missing
- [ ] API endpoint returns results: `GET /api/v1/metadata/match?clubId=X&seasonId=Y&jerseyNumber=7`
- [ ] API endpoint handles missing data gracefully

**⚠️ PAUSE HERE** - Verify all above before Phase 4

---

## Phase 4: Upload Flow Integration (MVP)

### Overview

Opdaterer `UploadJersey` komponenten med "Confirm metadata" step der pre-filler felter baseret på matching-service. Gemmer både fritekst OG FK'er ved submit.

### Changes Required:

#### 1. Metadata Matching Hook

**File:** `apps/web/hooks/use-metadata-matching.ts`

**Changes:** Opretter React hook til at kalde matching API.

```typescript
/**
 * Hook for matching jersey metadata
 */

import { useQuery } from '@tanstack/react-query';

interface MatchPlayersParams {
  clubId: string;
  seasonId?: string;
  seasonLabel?: string;
  jerseyNumber: number;
  playerNameHint?: string;
}

interface MatchPlayerResult {
  playerId: string;
  fullName: string;
  jerseyNumber: number;
  seasonLabel: string;
  confidenceScore: number;
}

export function useMetadataMatching(params: MatchPlayersParams | null) {
  return useQuery<MatchPlayerResult[]>({
    queryKey: ['metadata-match', params],
    queryFn: async () => {
      if (!params) return [];

      const searchParams = new URLSearchParams({
        clubId: params.clubId,
        jerseyNumber: params.jerseyNumber.toString(),
      });

      if (params.seasonId) {
        searchParams.set('seasonId', params.seasonId);
      }
      if (params.seasonLabel) {
        searchParams.set('seasonLabel', params.seasonLabel);
      }
      if (params.playerNameHint) {
        searchParams.set('playerNameHint', params.playerNameHint);
      }

      const response = await fetch(`/api/v1/metadata/match?${searchParams}`);
      if (!response.ok) {
        throw new Error('Failed to match players');
      }

      const data = await response.json();
      return data.results || [];
    },
    enabled: !!params && !!params.clubId && !!params.jerseyNumber,
  });
}
```

**Rationale:** React hook der kalder matching API via TanStack Query. Enabled kun når nødvendige params er tilgængelig.

#### 2. Update UploadJersey Component

**File:** `apps/web/components/jersey/UploadJersey.tsx`

**Changes:** Tilføjer "Confirm metadata" step med dropdowns og matching.

```typescript
// Add imports
import { useMetadataMatching } from '@/hooks/use-metadata-matching';
import { useQuery } from '@tanstack/react-query';

// Add state for metadata FK's
const [clubId, setClubId] = useState<string>('');
const [playerId, setPlayerId] = useState<string>('');
const [seasonId, setSeasonId] = useState<string>('');

// Add matching query (after club, season, number are set)
const matchingQuery = useMetadataMatching(
  clubId && seasonId && playerNumber
    ? {
        clubId,
        seasonId,
        jerseyNumber: parseInt(playerNumber, 10),
        playerNameHint: playerName,
      }
    : null
);

// Update handleSubmit to save FK's
const handleSubmit = async () => {
  // ... existing validation ...

  // Create jersey record with both text fields AND FK's
  const { error: jerseyError } = await supabase.from("jerseys").insert({
    owner_id: user.id,
    club: validated.club, // User text (primary)
    season: validated.season, // User text (primary)
    jersey_type: validated.jerseyType,
    player_name: validated.playerName, // User text (primary)
    player_number: validated.playerNumber, // User text (primary)
    competition_badges: validated.competitionBadges,
    condition_rating: validated.conditionRating,
    notes: validated.notes,
    visibility: validated.visibility,
    images: imageUrls,
    // Metadata FK's (optional)
    club_id: clubId || null,
    player_id: playerId || null,
    season_id: seasonId || null,
  });

  // ... rest of submit logic ...
};

// Add new step in render (between image upload and final review)
{step === 2 && (
  <div className="space-y-6">
    <h2 className="text-2xl font-bold">Confirm Metadata</h2>
    
    {/* Club dropdown (pre-filled from matching) */}
    <div>
      <Label>Club</Label>
      <Select value={clubId} onValueChange={setClubId}>
        {/* Populate from matching results or search */}
      </Select>
    </div>

    {/* Season dropdown */}
    <div>
      <Label>Season</Label>
      <Select value={seasonId} onValueChange={setSeasonId}>
        {/* Populate from metadata.seasons */}
      </Select>
    </div>

    {/* Player dropdown (pre-filled from matching) */}
    {matchingQuery.data && matchingQuery.data.length > 0 && (
      <div>
        <Label>Player</Label>
        <Select value={playerId} onValueChange={setPlayerId}>
          {matchingQuery.data.map((result) => (
            <SelectItem key={result.playerId} value={result.playerId}>
              {result.fullName} ({result.confidenceScore}% match)
            </SelectItem>
          ))}
        </Select>
      </div>
    )}

    {/* Jersey number (pre-filled) */}
    <div>
      <Label>Jersey Number</Label>
      <Input
        value={playerNumber}
        onChange={(e) => setPlayerNumber(e.target.value)}
      />
    </div>

    <Button onClick={() => setStep(3)}>Continue</Button>
  </div>
)}
```

**Rationale:** Opdaterer upload flow med metadata step. Pre-fills dropdowns baseret på matching. Gemmer både fritekst OG FK'er. Backward compatible - FK'er er nullable.

#### 3. Clubs/Seasons API Endpoints (for dropdowns)

**File:** `apps/web/app/api/v1/metadata/clubs/route.ts`

**Changes:** Opretter endpoint til at hente klubber til dropdown.

```typescript
import { NextRequest } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { rateLimitMiddleware } from '@/lib/api/rate-limit';
import { handleApiError } from '@/lib/api/errors';
import { createServiceClient } from '@/lib/supabase/server';

const handler = async (req: NextRequest) => {
  try {
    if (req.method !== 'GET') {
      return new Response(null, { status: 405 });
    }

    const searchParams = req.nextUrl.searchParams;
    const query = searchParams.get('q'); // Search query

    const supabase = await createServiceClient();
    let queryBuilder = supabase
      .schema('metadata')
      .from('clubs')
      .select('id, name, crest_url')
      .order('name');

    if (query) {
      queryBuilder = queryBuilder.ilike('name', `%${query}%`);
    }

    const { data, error } = await queryBuilder.limit(50);

    if (error) {
      throw error;
    }

    return Response.json({ clubs: data || [] });
  } catch (error) {
    Sentry.captureException(error, {
      extra: { url: req.url, query: req.nextUrl.searchParams.get('q') },
      tags: { component: 'metadata-clubs-api' },
    });
    return handleApiError(error, req);
  }
};

export const GET = rateLimitMiddleware(handler);
```

**File:** `apps/web/app/api/v1/metadata/seasons/route.ts`

**Changes:** Opretter endpoint til at hente sæsoner til dropdown.

```typescript
import { NextRequest } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { rateLimitMiddleware } from '@/lib/api/rate-limit';
import { handleApiError } from '@/lib/api/errors';
import { createServiceClient } from '@/lib/supabase/server';

const handler = async (req: NextRequest) => {
  try {
    if (req.method !== 'GET') {
      return new Response(null, { status: 405 });
    }

    const supabase = await createServiceClient();
    const { data, error } = await supabase
      .schema('metadata')
      .from('seasons')
      .select('id, label, start_year, end_year')
      .order('start_year', { ascending: false })
      .limit(20);

    if (error) {
      throw error;
    }

    return Response.json({ seasons: data || [] });
  } catch (error) {
    Sentry.captureException(error, {
      extra: { url: req.url },
      tags: { component: 'metadata-seasons-api' },
    });
    return handleApiError(error, req);
  }
};

export const GET = rateLimitMiddleware(handler);
```

**Rationale:** API endpoints til at populere dropdowns i upload flow. Clubs endpoint understøtter search query. Bruger `.schema('metadata')` for korrekt schema query. Sentry error capture tilføjet per observability standards.

### Success Criteria:

#### Automated Verification:
- [ ] Type check passes: `npm run type-check`
- [ ] Lint passes: `npm run lint`
- [ ] Build succeeds: `npm run build`
- [ ] No TypeScript errors in UploadJersey component
- [ ] Hook compiles without errors

#### Manual Verification:
- [ ] Upload flow shows "Confirm metadata" step
- [ ] Club dropdown populates with clubs from API
- [ ] Season dropdown populates with seasons
- [ ] Player dropdown shows matching results when club/season/number set
- [ ] Jersey can be saved without metadata FK's (backward compatible)
- [ ] Jersey can be saved with metadata FK's
- [ ] Both text fields AND FK's are saved correctly
- [ ] Existing jerseys (without FK's) still work
- [ ] UI is responsive (test på mobile, tablet, desktop)
- [ ] **Accessibility:**
  - [ ] Keyboard navigation works for all dropdowns (Tab, Arrow keys, Enter to select)
  - [ ] Screen reader announces dropdown options (test med VoiceOver/NVDA)
  - [ ] Focus states are visible for all interactive elements
  - [ ] Form labels are properly associated with inputs
  - [ ] Error messages are announced to screen readers
  - [ ] Color contrast meets WCAG AA standards

**⚠️ PAUSE HERE** - Verify all above before considering complete

---

## Testing Strategy

### Unit Tests

**Files to Test:**
- `apps/web/lib/services/transfermarkt-service.ts` - Mock API calls
- `apps/web/lib/services/metadata-matching-service.ts` - Test matching logic
- `apps/web/lib/repositories/metadata-repository.ts` - Test database operations

**Test Cases:**
- Transfermarkt service handles API errors correctly
- Matching service returns ranked results
- Repository upsert operations are idempotent
- Confidence scores calculated correctly

### Integration Tests

**Test Scenarios:**
- Seed script imports data correctly
- Matching API endpoint returns results
- Upload flow saves both text and FK's
- Backfill triggers when data missing

### Manual Testing Checklist

- [ ] Seed initial metadata (Top 5 + Superliga)
- [ ] Upload jersey with metadata matching
- [ ] Upload jersey without metadata (backward compatible)
- [ ] Match players for known club/season/number
- [ ] Backfill historical data for old jersey
- [ ] Verify FK's are set correctly in database
- [ ] Verify text fields are still primary truth

---

## References

- **Linear:** [HUD-28](https://linear.app/huddle-world/issue/HUD-28/feature-jersey-metadata-layer-football-reference-data-schema)
- **Tech Spec:** `.project/feature-scope/jersey-metadata/tech-spec-metadata-jerseys.md`
- **PRD:** `.project/feature-scope/jersey-metadata/prd-metadata-jerseys.md`
- **Transfermarkt API:** `https://transfermarkt-api-production-43d7.up.railway.app/docs#/`
- **Database Schema:** `.project/04-Database_Schema.md`
- **API Design:** `.project/05-API_Design.md`
- **Supabase Patterns:** `.cursor/rules/32-supabase_patterns.mdc`

---

## Notes & Considerations

### Performance

- **Indexes:** Critical indexes on `player_contracts` for matching queries
- **Rate Limiting:** Transfermarkt API may have rate limits - implement delays (100ms default)
- **Caching:** Consider caching club/season lists for dropdowns
- **Seed Script Performance:**
  - Initial seed kan importere 1000+ clubs og 10,000+ players for Top 5 + Superliga
  - Script bruger rate limiting (100ms delay) for at undgå API throttling
  - Estimated runtime: 15-30 minutter for fuld seed (afhænger af API response times)
  - Overvej at køre seed i batches eller via background job hvis data mængde bliver for stor
  - For production: Overvej scheduled job eller CI/CD pipeline i stedet for manuel execution
  - Monitor database connection pool og memory usage under seed operation

### Error Handling

- **API Failures:** Transfermarkt API may be down - handle gracefully
- **Missing Data:** Not all clubs/seasons may have data - allow fallback to text
- **Backfill Failures:** Backfill errors should not block jersey creation

### Future Enhancements

- AI vision model integration (Phase 4 in tech spec)
- Proactive backfill for "hero" clubs
- Position normalization
- Multiple metadata sources (not just Transfermarkt)

---

**Plan Status:** ✅ Ready for Implementation  
**Last Updated:** 2025-11-29  
**Estimated Total LOC:** ~800-1200 LOC  
**Estimated Time:** 12-16 hours (3-4 phases)

