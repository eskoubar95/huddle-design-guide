# Backfill Metadata Edge Function

## Purpose

This Edge Function handles on-demand backfill of historical player and contract data from the Transfermarkt API. It's called automatically when metadata matching detects missing data for a club/season combination.

## Features

- **Automatic player creation**: Creates players in the database if they don't exist
- **Contract backfill**: Fetches and stores historical jersey numbers for players
- **Country code mapping**: Maps Transfermarkt country names to ISO-2 codes from Medusa
- **Non-blocking**: Runs asynchronously, allowing matching to continue even if backfill is slow

## Environment Variables

Set these in Supabase Dashboard → Edge Functions → Secrets:

- `TRANSFERMARKT_API_URL` (optional, defaults to production URL)
- `SUPABASE_URL` (automatically set by Supabase)
- `SUPABASE_SERVICE_ROLE_KEY` (automatically set by Supabase)

## Usage

Called automatically by `MetadataBackfillService.autoBackfillIfNeeded()` when:
- User selects a club and season in the edit page
- Matching service detects missing data (< 5 contracts for club/season)

### Manual Invocation

```bash
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/backfill-metadata \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "clubId": "190",
    "seasonId": "uuid-here",
    "seasonLabel": "19/20"
  }'
```

## Response

```json
{
  "success": true,
  "message": "Backfill completed",
  "playersProcessed": 25,
  "contractsCreated": 30
}
```

## Future: Upload Flow Integration

When implementing metadata matching in the upload flow, this Edge Function can be triggered automatically based on:
- Player name (text field)
- Player number (text field)
- Season (text field)
- Club (text field)

The function will:
1. Search for matching club/season
2. Backfill players and contracts
3. Return matching players for autocomplete

