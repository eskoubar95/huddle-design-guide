# Metadata System - Architecture & Documentation

## Overview

The metadata system provides a structured way to store and retrieve football reference data (competitions, clubs, seasons, players, player contracts) imported from the Transfermarkt API. This system enables:

- **AI Vision Integration**: Automatic metadata extraction and matching from jersey images
- **Frontend Search**: Fast, intelligent search for clubs, players, and seasons
- **Data Consistency**: Centralized source of truth for football metadata
- **Cross-Search**: Ability to search both internal database and external Transfermarkt API

## Architecture

### Layer Structure

```
┌─────────────────────────────────────────────────────────────┐
│                    Edge Functions                            │
│  (match-jersey-metadata, backfill-metadata, etc.)          │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│                    Service Layer                             │
│  MatchService | UpsertService | SearchService |            │
│  DataRetrievalService                                        │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│              Repository Layer                                │
│  MetadataRepository | TransfermarktClient                   │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│                    Utilities                                 │
│  season-parser | country-mapper | name-mapper |            │
│  db-connection                                               │
└──────────────────────────────────────────────────────────────┘
```

### Database Schema

The metadata system uses a dedicated PostgreSQL schema (`metadata`) with the following tables:

- **`metadata.competitions`**: Football competitions (leagues, tournaments)
- **`metadata.clubs`**: Football clubs and national teams
- **`metadata.seasons`**: Season definitions (league, calendar, tournament)
- **`metadata.players`**: Player information
- **`metadata.player_contracts`**: Links players to clubs, seasons, and jersey numbers
- **`metadata.competition_seasons`**: Junction table mapping competitions to seasons

All tables reference `medusa.region_country` via foreign keys for standardized country codes.

## Components

### Utilities (`_shared/utils/`)

Pure functions for common operations:

- **`season-parser.ts`**: Parses season input strings ("23/24", "2006", etc.) and detects season types
- **`country-mapper.ts`**: Maps country names to ISO-2 codes matching `medusa.region_country.iso_2`
- **`name-mapper.ts`**: Normalizes club names (handles Danish/English variations)
- **`db-connection.ts`**: Constructs PostgreSQL connection strings

### Repository Layer (`_shared/repositories/`)

Abstraction for database and external API operations:

- **`metadata-repository.ts`**: Direct PostgreSQL client for `metadata` schema operations
- **`transfermarkt-client.ts`**: Client for Transfermarkt API with retry logic and error handling

### Service Layer (`_shared/services/`)

Business logic orchestration:

- **`match-service.ts`**: Core matching logic for clubs, seasons, and players
- **`upsert-service.ts`**: Batch upsert operations and backfill orchestration
- **`search-service.ts`**: Unified search with database + API fallback
- **`data-retrieval-service.ts`**: Cross-search patterns and caching strategies

### Edge Functions

Serverless functions for backend operations:

- **`match-jersey-metadata`**: Matches jersey metadata (club, season, player)
- **`backfill-metadata`**: Backfills detailed player contract data for a club/season
- **`upsert-metadata`**: Handles upsert operations for various metadata entities
- **`auto-link-metadata`**: Automatically links jersey data to metadata
- **`analyze-jersey-vision`**: AI Vision analysis with metadata matching

## Key Features

### Season Type Detection

The system supports three season types:

- **`league`**: Multi-year seasons (e.g., "23/24" for 2023-2024)
- **`calendar`**: Single-year calendar seasons (e.g., "23" for 2023)
- **`tournament`**: Single-year tournaments (e.g., "2006" for World Cup)

Season labels are normalized based on type:
- League: "23/24"
- Tournament: "2006"
- Calendar: "23"

### Confidence-Based Matching

The matching system provides confidence scores (0-100) for matches:

- **100**: Exact match (e.g., jersey number match)
- **80**: High confidence (e.g., name match in database)
- **60**: Medium confidence (e.g., API match and creation)
- **0**: No match

### Cross-Search Pattern

The system implements a robust cross-search pattern:

1. **Database First**: Fast lookup in local database
2. **API Fallback**: If not found, search Transfermarkt API
3. **Auto-Create**: Create records in database when found via API
4. **Caching**: Cache results for repeated searches

## Usage Examples

### Matching Club

```typescript
const matchService = new MatchService(repository, transfermarktClient)
const result = await matchService.matchClub('FC København')

// Returns: { club: { id: '190', name: 'FC Copenhagen' }, confidence: 100 }
```

### Matching Season

```typescript
const result = await matchService.matchSeason('23/24')

// Returns: { season: { id: '...', label: '23/24', tm_season_id: '2023' }, confidence: 100 }
```

### Matching Player

```typescript
const result = await matchService.matchPlayer(
  '190', // clubId
  'season-id',
  'season-label',
  '2023',
  'Jonas Wind', // playerName
  '23' // jerseyNumber
)

// Returns: { player: { id: '...', full_name: 'Jonas Wind', jersey_number: 23 }, confidence: 100 }
```

## Testing

### Unit Tests

Unit tests are located in `_shared/utils/__tests__/` and `_shared/services/__tests__/`:

```bash
# Run utility tests
deno test supabase/functions/_shared/utils/__tests__/

# Run service tests
deno test supabase/functions/_shared/services/__tests__/
```

### Integration Tests

Integration tests verify Edge Functions work correctly with the full stack:

```bash
# Test match-jersey-metadata
curl -X POST https://your-project.supabase.co/functions/v1/match-jersey-metadata \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"club": "FC Copenhagen", "season": "23/24"}'
```

## Performance Metrics

Target performance metrics:

- **Database query time**: < 50ms (p95)
- **API response time**: < 200ms (p95)
- **Vision analysis time**: < 3s (p95)
- **Search response time**: < 300ms (p95)

## Migration History

### Phase 1: Database Enhancements
- Added `season_type` column to `metadata.seasons`
- Created `metadata.competition_seasons` junction table
- Data migration for existing seasons

### Phase 2: Extract Utilities
- Extracted season parsing, country mapping, name mapping, DB connection utilities
- Eliminated code duplication across Edge Functions

### Phase 3: Repository Layer
- Created `MetadataRepository` for database operations
- Created `TransfermarktClient` for API operations
- Replaced direct database/API calls in Edge Functions

### Phase 4: Service Layer
- Created `MatchService`, `UpsertService`, `SearchService`, `DataRetrievalService`
- Centralized business logic
- Reduced Edge Function complexity

### Phase 5: Edge Function Refactoring
- Refactored all Edge Functions to use Service Layer
- Created dedicated `upsert-metadata` function
- Optimized `analyze-jersey-vision` to use services directly

### Phase 6: Frontend Integration
- Created `useMetadataSearch` hook
- Created unified `MetadataCombobox` component
- Enhanced AI Vision integration with confidence-based auto-fill

### Phase 7: Testing & Documentation
- Unit tests for utilities and services
- Integration tests for Edge Functions
- JSDoc comments for all components
- Architecture documentation

## Future Enhancements

- [ ] Direct database lookup for country codes (replace hardcoded map)
- [ ] Caching layer for frequently accessed data
- [ ] Performance monitoring and alerting
- [ ] Automated data quality checks
- [ ] Support for additional metadata types (managers, stadiums, etc.)

## Related Documentation

- [Implementation Playbook](./metadata-implementation-playbook-2025-01-12.md)
- [Database Schema Documentation](../database/metadata-schema.md)
- [API Documentation](../api/metadata-api.md)

