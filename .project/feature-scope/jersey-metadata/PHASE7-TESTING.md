# Phase 7: Testing & Documentation Guide

## Overview

This document outlines the testing strategy and documentation created during Phase 7 of the metadata system implementation.

## Test Structure

### Unit Tests

#### Utilities (`_shared/utils/__tests__/`)

**season-parser.test.ts**
- Tests for `parseSeasonInput()` with various formats
- Tests for `normalizeSeasonLabel()` with different season types
- Edge cases: invalid formats, boundary years, tournament vs league detection

**country-mapper.test.ts**
- Tests for `mapCountryToIso2()` with known countries
- Case-insensitive matching
- Whitespace handling
- Unknown country handling

**name-mapper.test.ts**
- Tests for `normalizeClubName()` with mapped and unmapped clubs
- Case-insensitive handling
- Whitespace trimming

#### Services (`_shared/services/__tests__/`)

**match-service.test.ts**
- Integration tests for `MatchService.matchClub()`
- Integration tests for `MatchService.matchSeason()`
- Tournament season type detection

**upsert-service.test.ts**
- Tests for `upsertPlayersBatch()` with valid players
- Error handling for invalid players

**search-service.test.ts**
- Tests for `searchClubs()` 
- Tests for `searchSeasons()`

### Integration Tests

**test-phase7-integration.sh**
- Full-stack integration tests for Edge Functions
- Tests the complete flow: Edge Function → Service → Repository → Database
- Tests for:
  - `match-jersey-metadata`
  - `backfill-metadata`

### Running Tests

#### Unit Tests (Deno)

```bash
# Run all utility tests
deno test supabase/functions/_shared/utils/__tests__/

# Run all service tests
deno test supabase/functions/_shared/services/__tests__/

# Run specific test file
deno test --allow-net --allow-env supabase/functions/_shared/utils/__tests__/season-parser.test.ts
```

#### Integration Tests

```bash
# Run integration tests (requires Supabase local instance or remote)
./scripts/test-phase7-integration.sh
```

#### E2E Tests

E2E tests are planned but not yet implemented. They should cover:

1. **Vision AI Flow**
   - Upload jersey image
   - Trigger Vision analysis
   - Verify metadata matching
   - Verify confidence scores

2. **Metadata Matching Flow**
   - Manual club/season/player selection
   - Verify database linking
   - Verify search functionality

3. **Backfill Flow**
   - Trigger backfill for club/season
   - Verify player contracts created
   - Verify data completeness

## Test Coverage Goals

- **Utilities**: 90%+ coverage (pure functions, easy to test)
- **Services**: 80%+ coverage (integration tests with real database)
- **Edge Functions**: 70%+ coverage (via integration tests)

## Performance Benchmarks

### Target Metrics

- **Database query time**: < 50ms (p95)
- **API response time**: < 200ms (p95)
- **Vision analysis time**: < 3s (p95)
- **Search response time**: < 300ms (p95)

### Benchmark Script

A performance benchmark script should be created to measure:

1. Database query performance
2. API response times
3. Batch upsert performance
4. Search query performance

## Documentation

### JSDoc Comments

All utilities and services now include comprehensive JSDoc comments:

- **Function/class descriptions**: Purpose and usage
- **Parameter documentation**: Types, descriptions, examples
- **Return value documentation**: Structure and examples
- **Usage examples**: Code snippets showing how to use each function

### Architecture Documentation

**README.md**: Complete architecture documentation including:

- System overview
- Layer structure diagram
- Component descriptions
- Usage examples
- Migration history
- Future enhancements

## Next Steps

1. ✅ Unit tests for utilities
2. ✅ Unit tests for services (basic coverage)
3. ✅ Integration tests for Edge Functions
4. ⏳ E2E tests (planned)
5. ⏳ Performance benchmarks (planned)
6. ✅ JSDoc comments
7. ✅ Architecture documentation

## Testing Best Practices

1. **AAA Pattern**: Arrange-Act-Assert
2. **Isolated Tests**: Each test should be independent
3. **Clear Test Names**: Describe what is being tested
4. **Mock External Dependencies**: For unit tests, mock API calls
5. **Integration Tests**: Use real database for integration tests
6. **Error Cases**: Test both happy path and error scenarios

## Continuous Integration

Tests should be integrated into CI/CD pipeline:

```yaml
# Example GitHub Actions workflow
- name: Run Unit Tests
  run: deno test supabase/functions/_shared/**/__tests__/*.test.ts

- name: Run Integration Tests
  run: ./scripts/test-phase7-integration.sh
```

