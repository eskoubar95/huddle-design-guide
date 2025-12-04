# Auto-Link Metadata Edge Function

## Purpose

This Edge Function automatically links jersey text fields to metadata schema. It's designed to run:
- **Automatically** from database triggers (when jersey is created/updated)
- **From batch jobs** (processing existing jerseys)
- **Via API calls** (manual trigger from frontend)

## Features

- **Fuzzy club name matching**: Handles Danish/English variations (e.g., "FC København" → "FC Copenhagen")
- **Season label normalization**: Converts various formats ("2019/2021", "19/20", "2019-2020") to standard format
- **Player matching**: Matches player name + number to metadata
- **Automatic backfill**: Triggers `backfill-metadata` Edge Function if data is missing
- **Database updates**: Updates jersey with matched metadata links

## Environment Variables

Automatically set by Supabase:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

## Usage

### From API Route (Recommended)

```typescript
import { autoLinkMetadataViaEdgeFunction } from '@/lib/services/metadata-backfill-service';

await autoLinkMetadataViaEdgeFunction({
  jerseyId: 'jersey-uuid',
  clubText: 'FC København',
  seasonText: '2019/2021',
  playerNameText: 'Jonas Wind',
  playerNumberText: '23',
});
```

### Direct HTTP Call

```bash
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/auto-link-metadata \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "jerseyId": "d0c44d4d-4004-4d62-9c46-3e44d32c8d58",
    "clubText": "FC København",
    "seasonText": "2019/2021",
    "playerNameText": "Jonas Wind",
    "playerNumberText": "23"
  }'
```

### From Database Trigger (Future)

```sql
-- Example trigger (to be implemented)
CREATE OR REPLACE FUNCTION auto_link_jersey_metadata()
RETURNS TRIGGER AS $$
BEGIN
  -- Call Edge Function via pg_net
  PERFORM net.http_post(
    url := current_setting('app.supabase_url') || '/functions/v1/auto-link-metadata',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.service_role_key')
    ),
    body := jsonb_build_object(
      'jerseyId', NEW.id,
      'clubText', NEW.club,
      'seasonText', NEW.season,
      'playerNameText', NEW.player_name,
      'playerNumberText', NEW.player_number
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_auto_link_metadata
  AFTER INSERT OR UPDATE ON public.jerseys
  FOR EACH ROW
  WHEN (NEW.club_id IS NULL OR NEW.season_id IS NULL OR NEW.player_id IS NULL)
  EXECUTE FUNCTION auto_link_jersey_metadata();
```

## Response

```json
{
  "success": true,
  "confidence": 100,
  "matchedClub": {
    "id": "190",
    "name": "FC Copenhagen"
  },
  "matchedSeason": {
    "id": "01d0dc55-213f-4065-a0e0-04468aa8ee18",
    "label": "19/20"
  },
  "matchedPlayer": {
    "id": "391004",
    "fullName": "Jonas Wind",
    "jerseyNumber": 23
  },
  "updated": true
}
```

## Confidence Scores

- **100**: Perfect match (club + season + player)
- **75**: Club + season matched, but no player number or player not found
- **70**: Club + season matched, but player name doesn't match
- **50**: Only club matched
- **25**: Only club matched, season not found
- **0**: No matches

## Why Edge Function?

1. **Database proximity**: Runs closer to database, faster queries
2. **Automatic triggers**: Can be called from database triggers
3. **Batch processing**: Better for processing many jerseys
4. **Isolation**: Doesn't block main application
5. **Scalability**: Handles long-running operations better

## Fallback

The API route (`/api/v1/jerseys/[id]/auto-link-metadata`) will fall back to direct service if Edge Function fails, ensuring reliability.

