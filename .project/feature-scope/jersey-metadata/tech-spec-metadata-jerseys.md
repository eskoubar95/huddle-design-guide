## Feature Tech Spec – Jersey Metadata & `metadata` Schema

### 1. Overview

This document describes the technical design for a football metadata layer that supports robust jersey metadata in Huddle.  
The goal is to model clubs, competitions, seasons, players, and player–club–season–jersey-number relationships in a separate `metadata` schema, powered by the Transfermarkt API.  
User-owned jerseys remain in `public.jerseys` and can optionally link into `metadata` for richer features and better suggestions.

### 2. Objectives & Non‑Goals

**Objectives**
- Provide a **normalized, historical metadata model** that can cover jerseys from the last 10–15+ years.
- Enable **smart autofill** in the jersey upload flow (club, season, player, number) based on AI + Transfermarkt data.
- Keep **user data and metadata clearly separated** (`public` vs `metadata` schema).
- Support future analytics (per club/season/player) without changing the core jersey model again.

**Non‑Goals (v1)**
- Live match/fixture data, standings, and real‑time stats (e.g. from football-data.org).
- Full global coverage of all competitions and clubs from day one.
- Hard validation that forces every jersey to match metadata exactly – user text stays the primary truth.

### 3. High‑Level Architecture

**Schemas**
- `public`: Huddle domain data (profiles, jerseys, auctions, transactions, etc.).
- `metadata`: Football reference data imported from Transfermarkt (and possibly other sources in the future).

**Key Idea**
- `metadata` holds **objective football facts** (competitions, clubs, seasons, players, historical jersey numbers).
- `public.jerseys` holds **user‑authored facts** about specific shirts and can **optionally link** into `metadata`.
- Transfermarkt API is the primary metadata source, consumed either via scripts or Edge Functions.

### 4. Data Model – `metadata` Schema

> Note: Types are conceptual, realistic Supabase/Postgres types should be used (e.g. `uuid`, `text`, `integer`, `numeric`).

#### 4.1 `metadata.competitions`

**Purpose**
- Stores leagues/tournaments (e.g. Superliga, Premier League).

**Source**
- `GET /competitions/search/{competition_name}`
- `GET /competitions/{competition_id}/clubs?season_id=...`

**Core Fields**
- `id` (`text`, PK)  
  Transfermarkt competition id (e.g. `"DK1"`).
- `name` (`text`)  
  Full competition name (e.g. `"Superliga"`).
- `country` (`text`)  
  Country name.
- `continent` (`text`)  
  E.g. `"UEFA"`, `"CONMEBOL"`.
- `clubs_count` (`integer`, nullable)  
  From search result (`clubs`).
- `players_count` (`integer`, nullable)  
  From search result (`players`).
- `total_market_value` (`numeric`, nullable)
- `mean_market_value` (`numeric`, nullable)

#### 4.2 `metadata.seasons`

**Purpose**
- Normalizes seasons across competitions and players and binds Transfermarkt `seasonId` to human‑friendly labels.

**Observation**
- Transfermarkt uses a numeric `season_id` parameter (e.g. `2025`), which maps to labels like `"25/26"` (or `"2025"` for calendar‑year seasons).

**Core Fields**
- `id` (`uuid`, PK).
- `tm_season_id` (`text`)  
  Raw season id used in API calls (e.g. `"2025"`).
- `label` (`text`)  
  Human‑readable label used in UI and jersey metadata (e.g. `"25/26"` or `"2025"`).
- `start_year` (`integer`)  
  First calendar year of the season (e.g. `2025` for `"25/26"`).
- `end_year` (`integer`)  
  Second calendar year of the season (e.g. `2026` for `"25/26"`, or `2025` for calendar‑year seasons).

#### 4.3 `metadata.clubs`

**Purpose**
- Global master list of clubs across competitions and seasons.

**Sources**
- `GET /competitions/{competition_id}/clubs?season_id=...`
- `GET /clubs/search/{club_name}`
- `GET /clubs/{club_id}/profile`

**Core Fields**
- `id` (`text`, PK)  
  Transfermarkt club id (e.g. `"190"` for FC Copenhagen).
- `name` (`text`)  
  Short/common name (e.g. `"FC Copenhagen"`).
- `official_name` (`text`, nullable)  
  From `officialName`.
- `slug` (`text`, unique, nullable)  
  Normalized name for search/fuzzy matching.
- `country` (`text`)
- `crest_url` (`text`, nullable)  
  From `image`.
- `colors` (`text[]`, nullable)  
  HEX colors from `colors`.
- `stadium_name` (`text`, nullable)  
  From `stadiumName`.
- `stadium_seats` (`integer`, nullable)
- `founded_on` (`date`, nullable)
- `current_market_value` (`numeric`, nullable)
- `external_url` (`text`, nullable)  
  Transfermarkt club URL.

#### 4.4 `metadata.club_seasons`

**Purpose**
- Captures the relationship “club X participates in competition Y in season Z”.

**Source**
- `GET /competitions/{competition_id}/clubs?season_id={tm_season_id}`

**Core Fields**
- `id` (`uuid`, PK).
- `competition_id` (`text`, FK → `metadata.competitions.id`).
- `season_id` (`uuid`, FK → `metadata.seasons.id`).
- `club_id` (`text`, FK → `metadata.clubs.id`).

#### 4.5 `metadata.players`

**Purpose**
- Global master record for each player, independent of club/season.

**Sources**
- `GET /clubs/{club_id}/players?season_id=...`
- `GET /players/search/{player_name}`
- `GET /players/{player_id}/profile`

**Core Fields**
- `id` (`text`, PK)  
  Transfermarkt player id (e.g. `"370997"`).
- `full_name` (`text`)  
  Full display name.
- `known_as` (`text`, nullable)  
  Optional short name/nickname.
- `date_of_birth` (`date`, nullable)
- `nationalities` (`text[]`, nullable)
- `height_cm` (`integer`, nullable)
- `preferred_position` (`text`, nullable)  
  E.g. `"Goalkeeper"`, `"Centre-Back"`.
- `foot` (`text`, nullable)  
  `"left"`, `"right"`, `"both"`.
- `current_club_id` (`text`, FK → `metadata.clubs.id`, nullable)
- `current_shirt_number` (`integer`, nullable)
- `profile_url` (`text`, nullable)
- `image_url` (`text`, nullable)

#### 4.6 `metadata.player_contracts`

**Purpose**
- Models a player’s association with a club in a specific season and jersey number(s).
- This is the critical table for matching jersey metadata: club + season + number → candidate player(s).

**Sources**
- `GET /players/{player_id}/jersey_numbers`  
  - `jerseyNumbers[]`: `{ season: "25/26", club: "190", jerseyNumber: 1 }`.
- `GET /players/{player_id}/transfers`  
  - `transfers[]`: `{ clubFrom, clubTo, date, season, fee, marketValue }` (optional enrichment).

**Core Fields**
- `id` (`uuid`, PK).
- `player_id` (`text`, FK → `metadata.players.id`).
- `club_id` (`text`, FK → `metadata.clubs.id`).
- `season_id` (`uuid`, FK → `metadata.seasons.id`).
- `jersey_number` (`integer`).
- `source` (`text`, nullable)  
  E.g. `"jersey_numbers"` or `"transfer_derived"` for debugging/auditing.
- `from_date` (`date`, nullable)  
  Optionally derived from transfers if needed.
- `to_date` (`date`, nullable).

**Important Rules**
- Allow **multiple rows per (player_id, club_id, season_id)** to support number changes within a season.
- This table is the primary index for queries like:
  - “Which players had number 7 for club 190 in season 2010/11?”

### 5. Linking to `public.jerseys`

#### 5.1 Existing Jersey Fields (unchanged)

`public.jerseys` already includes:
- `club` (`text`) – user’s free text.
- `season` (`text`).
- `jersey_type` (`text`).
- `player_name` (`text | null`).
- `player_number` (`text | null`).

These fields remain the **primary user‑authored truth** and must not be forced to align with metadata.

#### 5.2 New Optional Foreign Keys

Add nullable reference fields to `public.jerseys`:
- `club_id` (`text`, FK → `metadata.clubs.id`, nullable)
- `player_id` (`text`, FK → `metadata.players.id`, nullable)
- `season_id` (`uuid`, FK → `metadata.seasons.id`, nullable)
- (Later, if needed) `player_contract_id` (`uuid`, FK → `metadata.player_contracts.id`, nullable)

**Key Principle**
- Jerseys can be saved and used **without** any metadata FK set.  
  Metadata links are an enhancement, not a requirement.

### 6. Data Flows

#### 6.1 Initial Metadata Seed

**Goal**
- Ensure we have enough metadata to support Huddle’s core audience (e.g. Top 5 leagues + Superliga).

**High‑Level Steps**
1. **Competitions lookup**
   - For each target league (e.g. “Superliga”, “Premier League”), call:
     - `GET /competitions/search/{competition_name}`
   - Upsert into `metadata.competitions`.

2. **Clubs per competition and season**
   - For each `(competition_id, tm_season_id)` pair in scope:
     - `GET /competitions/{competition_id}/clubs?season_id={tm_season_id}`
   - Upsert:
     - `metadata.seasons` using `tm_season_id` and season label.
     - `metadata.clubs` for all returned clubs.
     - `metadata.club_seasons` linking competition, season, club.

3. **Baseline players**
   - For key clubs (e.g. clubs in those competitions and seasons):
     - `GET /clubs/{club_id}/players?season_id={tm_season_id}`
   - Upsert into `metadata.players`.

#### 6.2 On‑Demand Historical Backfill

**Goal**
- Avoid loading whole‑world histories upfront; instead, backfill relevant player contracts as needed.

**Triggers**
- A jersey upload references a club and season for which we don’t yet have player_contracts, or
- A matching operation requires data for a missing `(club, season)` combination.

**High‑Level Steps**
1. Identify players to hydrate (either a full squad for a club or specific players).
2. For each `player_id`:
   - `GET /players/{player_id}/jersey_numbers`
   - Optionally: `GET /players/{player_id}/transfers`
3. For each jerseyNumbers entry:
   - Map `season` → `metadata.seasons`.
   - Map `club` id → `metadata.clubs`.
   - Upsert a row in `metadata.player_contracts` with `jersey_number`.

#### 6.3 Matching Service (Server‑Side)

**Goal**
- Provide a reusable function/service that, given club, season, and jersey number, returns candidate players.

**Input**
- `club_id` (required).
- `season_id` or season label (required, can be approximated).
- `jersey_number` (required).
- Optional: `player_name_hint` (string).

**Logic (simplified)**
- Query `metadata.player_contracts` for rows matching:
  - `club_id = ?`
  - `season_id = ?`
  - `jersey_number = ?`
- Rank candidates:
  - Hard match on number/club/season.
  - Optional soft bonus if `player_name_hint` fuzzy‑matches `metadata.players.full_name`.

**Output**
- List of `{ player_id, full_name, jersey_number, season_label, confidenceScore }`.

#### 6.4 Upload Flow Integration (Future Implementation)

**Steps**
1. User uploads jersey image.
2. Edge Function calls AI (vision model) with `image_url` to guess:
   - Club name, colors, kit type.
   - Jersey number, player name (if visible).
   - Approximate season / year range.
3. Server normalizes guesses against `metadata`:
   - Match club via `metadata.clubs` + Transfermarkt search.
   - Map season guess → `metadata.seasons`.
   - Use Matching Service to get candidate players.
4. Frontend shows “Confirm metadata” step:
   - Pre‑selected club (dropdown).
   - Pre‑selected season (dropdown/text).
   - Pre‑selected player (dropdown).
   - Pre‑filled jersey number.
5. On submit:
   - Save user text fields to `public.jerseys`.
   - Save any confirmed FK references (`club_id`, `player_id`, `season_id`, optionally `player_contract_id`).

### 7. Open Questions & Future Extensions

- Should we normalize **positions** into an enum table (e.g. `metadata.positions`) or keep as free text for now?
- How aggressive should backfill be:
  - only for clubs/seasons that users touch,
  - or proactively for selected “hero” clubs?
- When is it safe to automatically attach metadata FK’s without explicit user confirmation?
- Should we introduce a `metadata.sources` table for tracking provenance (Transfermarkt vs other providers) per row?

This spec is intended as the starting point for migrations, Edge Function design, and upload‑flow changes.  
Implementation should keep the separation between `public` and `metadata` strict, and always treat user‑entered jersey data as the authoritative description for that specific shirt.


