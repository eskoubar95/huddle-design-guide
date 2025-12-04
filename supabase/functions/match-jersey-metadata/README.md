# Match Jersey Metadata Edge Function

## Purpose

This Edge Function provides a unified, synchronous interface for matching jersey metadata (club, season, player) from text input. It's designed to be called from AI Vision extraction or manual input, returning all matched IDs in a single response.

## Features

- **Unified Matching**: Single function handles club, season, and player matching
- **Synchronous Execution**: All operations complete before response (no race conditions)
- **Robust Fallback Chain**: Database first → Transfermarkt API second
- **Automatic Backfill**: Triggers backfill when data is missing
- **Season Parsing**: Handles 3 input formats ("23", "23/24", "2023/2024")
- **Confidence Scoring**: Returns confidence scores for each match

## Environment Variables

Set these in Supabase Dashboard → Edge Functions → Secrets:

- `TRANSFERMARKT_API_URL` (optional, defaults to production URL)
- `DB_PASSWORD` (required for PostgreSQL connection)
- `SUPABASE_URL` (automatically set by Supabase)
- `SUPABASE_SERVICE_ROLE_KEY` (automatically set by Supabase)

## Usage

### Request

```typescript
interface MatchJerseyMetadataRequest {
  clubText: string           // Required: "FC København"
  seasonText: string         // Required: "22/23" | "23" | "2023/2024"
  playerNameText?: string    // Optional: "Jonas Wind"
  playerNumberText?: string  // Optional: "23"
}
```

### Response

```typescript
interface MatchJerseyMetadataResponse {
  clubId: string | null
  seasonId: string | null
  playerId: string | null
  confidence: {
    club: number      // 0-100
    season: number    // 0-100
    player: number    // 0-100
  }
  matched: {
    club: boolean
    season: boolean
    player: boolean
  }
  metadata?: {
    clubName?: string
    seasonLabel?: string
    playerName?: string
  }
}
```

### Example Call

```bash
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/match-jersey-metadata \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "clubText": "FC København",
    "seasonText": "22/23",
    "playerNameText": "Jonas Wind",
    "playerNumberText": "23"
  }'
```

### Example Response

```json
{
  "clubId": "190",
  "seasonId": "94913497-225b-4106-a454-850f022fb010",
  "playerId": "391004",
  "confidence": {
    "club": 100,
    "season": 100,
    "player": 100
  },
  "matched": {
    "club": true,
    "season": true,
    "player": true
  },
  "metadata": {
    "clubName": "FC Copenhagen",
    "seasonLabel": "22/23",
    "playerName": "Jonas Wind"
  }
}
```

## Matching Flow

### Step 1: Match Club

1. **Database Lookup** (Fuzzy Match)
   - Searches `metadata.clubs` by name (case-insensitive, partial match)
   - Tries normalized names (Danish → English mappings)
   - Returns best match with confidence 100

2. **Transfermarkt API Fallback**
   - If no database match, searches Transfermarkt API
   - Creates club in `metadata.clubs`
   - Returns new `clubId`

**Output:** `clubId` (required for next steps)

### Step 2: Match Season

1. **Parse Season Input**
   - Supports 3 formats:
     - `"23"` → Single year → `tm_season_id: "2023"`
     - `"23/24"` → Range → `tm_season_id: "2023"` (start year)
     - `"2023/2024"` → Full range → `tm_season_id: "2023"` (start year)

2. **Database Lookup**
   - Searches `metadata.seasons` by label or `tm_season_id`
   - Returns match if found

3. **Create if Missing**
   - Parses season input to extract start/end years
   - Sets `tm_season_id` to start year (Transfermarkt format)
   - Creates season in `metadata.seasons`
   - Returns new `seasonId`

**Output:** `seasonId` (required for player matching)

### Step 3: Match Player

1. **Database Lookup by Jersey Number** (if `playerNumberText` provided)
   - Searches `metadata.player_contracts` for club/season/number
   - Returns match with confidence 100 if found

2. **Backfill if No Contract Found**
   - Checks if club/season has sufficient contracts (< 5)
   - Triggers `backfill-metadata` Edge Function synchronously
   - Waits for completion
   - Retries database lookup

3. **Database Lookup by Name** (if `playerNameText` provided)
   - Searches `metadata.players` by name (fuzzy match)
   - Cross-references with club/season contracts if available
   - Returns best match

4. **Transfermarkt API Fallback**
   - If still no match, searches Transfermarkt API
   - Creates player in `metadata.players`
   - Creates contract in `metadata.player_contracts` (if jersey number known)
   - Returns new `playerId`

**Output:** `playerId` (or null if not found)

## Season Parsing

The function handles 3 season input formats:

1. **Single Year:** `"23"`
   - Parsed as: `start_year: 2023, end_year: 2023`
   - Label: `"23"`
   - Transfermarkt season_id: `"2023"`

2. **Short Range:** `"23/24"`
   - Parsed as: `start_year: 2023, end_year: 2024`
   - Label: `"23/24"`
   - Transfermarkt season_id: `"2023"` (first year)

3. **Full Range:** `"2023/2024"`
   - Parsed as: `start_year: 2023, end_year: 2024`
   - Label: `"23/24"` (normalized to short format)
   - Transfermarkt season_id: `"2023"` (first year)

**Key Rule:** Transfermarkt API always uses the first year of the season definition as season_id.

## Confidence Scores

- **Club:** 100 if matched, 0 if not
- **Season:** 100 if matched, 0 if not
- **Player:** 100 if matched by jersey number, 80 if matched by name, 0 if not

## Error Handling

- Returns partial results if some matches fail
- Returns error message in response if critical failure
- Logs all errors for debugging
- Never throws unhandled errors

## Performance

- **Database hits only:** < 2s
- **With API calls:** < 5s
- **With backfill:** < 30s (synchronous wait)

## Use Cases

1. **AI Vision Integration**
   - Extract text from jersey image
   - Call function with extracted text
   - Get all IDs in single response
   - No polling or retry logic needed

2. **Manual Upload Flow**
   - User enters club, season, player info
   - Call function to match and get IDs
   - Auto-fill form with matched data

3. **Edit Flow**
   - User updates jersey metadata
   - Call function to re-match
   - Update jersey with new IDs

## Why This Approach?

1. **Simplicity**: One function, one responsibility
2. **Reliability**: Synchronous execution, no race conditions
3. **Performance**: Database-first approach, API only when needed
4. **Maintainability**: Single codebase, easier to debug
5. **User Experience**: Clear success/failure, no polling needed

