# Architecture Analysis: Unified Metadata Matching for AI Vision Integration

**Date:** 2025-01-29  
**Related:** HUD-28  
**Status:** Analysis & Proposal

## Executive Summary

This document analyzes the current metadata matching architecture and proposes a unified, robust solution optimized for AI Vision integration. The goal is to create a single, synchronous Edge Function that handles all metadata matching with clear fallback strategies.

## Current State Analysis

### Problems Identified

1. **Fragmented Backfill Logic**
   - Backfill triggered from 4 different locations
   - Inconsistent error handling across services
   - Asynchronous execution causes race conditions
   - Frontend must implement retry logic

2. **Complex Season Lookup**
   - Multiple fallback strategies scattered across codebase
   - Season creation logic embedded in Edge Function
   - Transfermarkt season_id conversion happens in multiple places
   - No clear single source of truth

3. **Unclear Data Flow**
   - Upload flow → `autoBackfillIfNeeded` → Edge Function → Matching
   - Edit flow → `autoLinkMetadataViaEdgeFunction` → Edge Function → Backfill
   - Auto-link service → `autoBackfillIfNeeded` → Edge Function
   - Match API → `autoBackfillIfNeeded` → Edge Function
   - Each path has different error handling and timing

4. **Asynchronous Issues**
   - Backfill runs in background
   - Matching may execute before data is ready
   - Frontend must poll/retry
   - No clear success/failure feedback

## Proposed Solution: Unified `match-jersey-metadata` Edge Function

### Core Principle

**One function, one responsibility: Match jersey metadata and return IDs synchronously.**

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    AI Vision Extract                         │
│  {clubText, seasonText, playerNameText, playerNumberText}   │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│         match-jersey-metadata Edge Function                 │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐  │
│  │  1. Match Club                                       │  │
│  │     ├─ Database: metadata.clubs (fuzzy match)       │  │
│  │     └─ Fallback: Transfermarkt API → Create         │  │
│  └─────────────────────────────────────────────────────┘  │
│                           │                                 │
│                           ▼                                 │
│  ┌─────────────────────────────────────────────────────┐  │
│  │  2. Match Season                                     │  │
│  │     ├─ Database: metadata.seasons (by label)       │  │
│  │     └─ Fallback: Parse & Create                     │  │
│  └─────────────────────────────────────────────────────┘  │
│                           │                                 │
│                           ▼                                 │
│  ┌─────────────────────────────────────────────────────┐  │
│  │  3. Match Player                                     │  │
│  │     ├─ Database: metadata.player_contracts         │  │
│  │     ├─ Backfill: Transfermarkt API (if needed)      │  │
│  │     ├─ Database: metadata.players (name match)      │  │
│  │     └─ Fallback: Transfermarkt API → Create         │  │
│  └─────────────────────────────────────────────────────┘  │
│                           │                                 │
└───────────────────────────┼─────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              Return {clubId, seasonId, playerId}            │
│              + Confidence scores + Match status             │
└─────────────────────────────────────────────────────────────┘
```

### Function Signature

```typescript
// Request
interface MatchJerseyMetadataRequest {
  clubText: string;           // Required: "FC København"
  seasonText: string;         // Required: "22/23" | "23" | "2023/2024"
  playerNameText?: string;    // Optional: "Jonas Wind"
  playerNumberText?: string;  // Optional: "23"
}

// Season Text Formats:
// - "23" → Single year → tm_season_id: "2023"
// - "23/24" → Range → tm_season_id: "2023" (start year)
// - "2023/2024" → Full range → tm_season_id: "2023" (start year)

// Response
interface MatchJerseyMetadataResponse {
  clubId: string | null;
  seasonId: string | null;
  playerId: string | null;
  confidence: {
    club: number;      // 0-100
    season: number;    // 0-100
    player: number;    // 0-100
  };
  matched: {
    club: boolean;
    season: boolean;
    player: boolean;
  };
  metadata?: {
    clubName?: string;
    seasonLabel?: string;
    playerName?: string;
  };
}
```

### Detailed Flow

#### Step 1: Match Club

**Priority: Database → Transfermarkt API**

1. **Database Lookup** (Fuzzy Match)
   ```sql
   SELECT id, name FROM metadata.clubs 
   WHERE name ILIKE '%fc københavn%' 
   OR slug ILIKE '%fc københavn%'
   LIMIT 5
   ```
   - Try exact match first
   - Try normalized name (slug)
   - Try partial match
   - Return best match with confidence score

2. **Transfermarkt API Fallback**
   - If no database match found
   - Search Transfermarkt API for club
   - Create club in `metadata.clubs`
   - Return new `clubId`

**Output:** `clubId` (required for next steps)

#### Step 2: Match Season

**Priority: Database → Create**

1. **Normalize Season Input**
   Season input can be in 3 formats:
   - `"23"` → Parse as single year → `2023`
   - `"23/24"` → Parse as range → `2023` (start year)
   - `"2023/2024"` → Parse as full range → `2023` (start year)
   
   **Transfermarkt season_id rule:** Always use the **first year** in the definition
   - `"23"` → `tm_season_id: "2023"`
   - `"23/24"` → `tm_season_id: "2023"` (start year)
   - `"2023/2024"` → `tm_season_id: "2023"` (start year)

2. **Database Lookup**
   ```sql
   SELECT id, label, tm_season_id, start_year, end_year 
   FROM metadata.seasons 
   WHERE label = '22/23' OR tm_season_id = '2022'
   LIMIT 1
   ```
   - Try exact label match first
   - Try tm_season_id match as fallback

3. **Create if Missing**
   - Parse season input to extract start year:
     - `"23"` → start_year: 2023, end_year: 2023, label: "23"
     - `"23/24"` → start_year: 2023, end_year: 2024, label: "23/24"
     - `"2023/2024"` → start_year: 2023, end_year: 2024, label: "23/24" (normalized)
   - Set `tm_season_id` to start year as string: `"2023"`
   - Insert into `metadata.seasons`
   - Return new `seasonId`

**Output:** `seasonId` (required for player matching)

#### Step 3: Match Player

**Priority: Database (Contracts) → Backfill → Database (Name) → Transfermarkt API**

1. **Database Lookup by Jersey Number** (if `playerNumberText` provided)
   ```sql
   SELECT pc.player_id, p.full_name, pc.jersey_number
   FROM metadata.player_contracts pc
   JOIN metadata.players p ON p.id = pc.player_id
   WHERE pc.club_id = $1 
     AND pc.season_id = $2 
     AND pc.jersey_number = $3
   LIMIT 1
   ```
   - If found: Return `playerId` with high confidence

2. **Backfill if No Contract Found**
   - Check if club/season has sufficient contracts (< 5)
   - If insufficient: Trigger backfill from Transfermarkt API
   - Wait for backfill to complete (synchronous)
   - Retry database lookup

3. **Database Lookup by Name** (if `playerNameText` provided)
   ```sql
   SELECT id, full_name FROM metadata.players
   WHERE full_name ILIKE '%jonas wind%'
   LIMIT 5
   ```
   - Fuzzy match on player name
   - Cross-reference with club/season contracts if available
   - Return best match

4. **Transfermarkt API Fallback**
   - If still no match found
   - Search Transfermarkt API for player
   - Create player in `metadata.players`
   - Create contract in `metadata.player_contracts` (if jersey number known)
   - Return new `playerId`

**Output:** `playerId` (or null if not found)

### Key Features

1. **Synchronous Execution**
   - All operations complete before response
   - No race conditions
   - Clear success/failure status

2. **Robust Fallback Chain**
   - Database first (fast, reliable)
   - Transfermarkt API second (comprehensive, slower)
   - Automatic data creation when needed

3. **Automatic Backfill**
   - Detects missing data
   - Triggers backfill automatically
   - Waits for completion
   - Retries lookup

4. **Confidence Scoring**
   - Each match includes confidence score
   - Helps frontend make decisions
   - Enables user confirmation if needed

5. **Single Source of Truth**
   - One function handles all matching
   - Consistent error handling
   - Centralized logging

## Implementation Plan

### Phase 1: Create New Edge Function

**File:** `supabase/functions/match-jersey-metadata/index.ts`

**Responsibilities:**
- Club matching (database → API)
- Season matching (database → create)
- Player matching (database → backfill → API)
- Return structured response

**Dependencies:**
- Direct PostgreSQL connection for queries
- Supabase client for upserts
- Transfermarkt API client

### Phase 2: Update Frontend Integration

**Files to Update:**
- `apps/web/components/jersey/upload-steps/PlayerPrintStep.tsx`
- `apps/web/app/api/v1/metadata/match/route.ts`
- `apps/web/lib/services/metadata-backfill-service.ts`

**Changes:**
- Replace `autoBackfillIfNeeded` calls with `match-jersey-metadata`
- Remove retry logic (no longer needed)
- Update to use synchronous response

### Phase 3: Deprecate Old Functions

**Files to Deprecate:**
- `supabase/functions/backfill-metadata/index.ts` (keep for now, but unused)
- `apps/web/lib/services/metadata-backfill-service.ts` (refactor to use new function)

**Migration Strategy:**
- Keep old functions for backward compatibility
- Gradually migrate all callers
- Remove after full migration

## Benefits

### For AI Vision Integration

1. **Simple API**
   - One function call with extracted text
   - Synchronous response with all IDs
   - No polling or retry logic needed

2. **Reliable**
   - Always returns IDs (or null)
   - Handles all edge cases internally
   - Clear error messages

3. **Fast**
   - Database-first approach
   - Only calls API when needed
   - Caches results in database

### For Codebase

1. **Maintainability**
   - Single function to maintain
   - Clear responsibility
   - Easier to test and debug

2. **Consistency**
   - Same logic everywhere
   - Unified error handling
   - Centralized logging

3. **Performance**
   - Fewer function calls
   - Better caching
   - Reduced API usage

## Migration Path

### Step 1: Implement New Function
- Create `match-jersey-metadata` Edge Function
- Test with AI Vision integration
- Verify all matching scenarios

### Step 2: Update Upload Flow
- Replace `autoBackfillIfNeeded` in upload flow
- Remove retry logic
- Test end-to-end

### Step 3: Update Edit Flow
- Replace `autoLinkMetadataViaEdgeFunction` in edit flow
- Update to use new function
- Test manual auto-link

### Step 4: Cleanup
- Remove old backfill service methods
- Deprecate old Edge Functions
- Update documentation

## Risk Assessment

### Low Risk
- ✅ New function doesn't break existing code
- ✅ Can run in parallel with old system
- ✅ Easy to rollback if issues

### Medium Risk
- ⚠️ Edge Function timeout limits (60s default)
- ⚠️ Transfermarkt API rate limits
- ⚠️ Database connection pool limits

### Mitigation
- Implement timeout handling
- Add rate limiting
- Use connection pooling
- Add circuit breakers

## Success Criteria

1. **Functionality**
   - ✅ Returns `clubId`, `seasonId`, `playerId` for valid inputs
   - ✅ Handles missing data gracefully
   - ✅ Creates data when needed

2. **Performance**
   - ✅ < 5s response time for database hits
   - ✅ < 15s response time with API calls
   - ✅ < 30s response time with backfill

3. **Reliability**
   - ✅ 99%+ success rate for known clubs/seasons
   - ✅ Clear error messages for failures
   - ✅ No race conditions

## Next Steps

1. **Review & Approval**
   - Review this analysis
   - Get approval for new architecture
   - Plan implementation timeline

2. **Implementation**
   - Create Edge Function
   - Write tests
   - Integrate with AI Vision

3. **Testing**
   - Unit tests for matching logic
   - Integration tests with real data
   - Load testing for performance

4. **Deployment**
   - Deploy Edge Function
   - Update frontend
   - Monitor performance

## Season Parsing Logic

### Input Formats Supported

The function must handle 3 season input formats:

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

### Parsing Algorithm

```typescript
function parseSeasonInput(seasonText: string): {
  startYear: number;
  endYear: number;
  label: string;
  tmSeasonId: string;
} {
  // Format 1: Single year "23"
  const singleYearMatch = seasonText.match(/^(\d{2})$/);
  if (singleYearMatch) {
    const year = 2000 + parseInt(singleYearMatch[1], 10);
    return {
      startYear: year,
      endYear: year,
      label: seasonText,
      tmSeasonId: year.toString(),
    };
  }

  // Format 2: Short range "23/24"
  const shortRangeMatch = seasonText.match(/^(\d{2})\/(\d{2})$/);
  if (shortRangeMatch) {
    const startYear = 2000 + parseInt(shortRangeMatch[1], 10);
    const endYear = 2000 + parseInt(shortRangeMatch[2], 10);
    return {
      startYear,
      endYear,
      label: seasonText,
      tmSeasonId: startYear.toString(), // First year
    };
  }

  // Format 3: Full range "2023/2024"
  const fullRangeMatch = seasonText.match(/^(\d{4})\/(\d{4})$/);
  if (fullRangeMatch) {
    const startYear = parseInt(fullRangeMatch[1], 10);
    const endYear = parseInt(fullRangeMatch[2], 10);
    return {
      startYear,
      endYear,
      label: `${startYear % 100}/${endYear % 100}`, // Normalize to "23/24"
      tmSeasonId: startYear.toString(), // First year
    };
  }

  throw new Error(`Invalid season format: ${seasonText}`);
}
```

### Key Rule

**Transfermarkt API always uses the first year of the season definition as season_id:**
- Season "23/24" → API uses `season_id=2023`
- Season "2023/2024" → API uses `season_id=2023`
- Season "23" → API uses `season_id=2023`

## Questions & Considerations

1. **Timeout Limits**
   - Supabase Edge Functions have 60s timeout
   - Backfill can take 30-60s
   - May need async processing for large backfills

2. **Rate Limiting**
   - Transfermarkt API may have rate limits
   - Need to implement throttling
   - Consider caching strategies

3. **Error Handling**
   - What if Transfermarkt API is down?
   - What if database is slow?
   - How to handle partial matches?

4. **User Experience**
   - Should we show progress for long operations?
   - How to handle timeouts?
   - What feedback to give users?

5. **Season Parsing Edge Cases**
   - What if user enters "2023" (4-digit single year)?
   - What if user enters "23-24" (dash instead of slash)?
   - Should we normalize all inputs to "23/24" format?

## Conclusion

The proposed unified `match-jersey-metadata` Edge Function provides a clean, robust solution for metadata matching that is optimized for AI Vision integration. It simplifies the architecture, improves reliability, and provides a better developer experience.

The migration path is low-risk and can be done incrementally, allowing us to test and validate before fully committing to the new approach.

