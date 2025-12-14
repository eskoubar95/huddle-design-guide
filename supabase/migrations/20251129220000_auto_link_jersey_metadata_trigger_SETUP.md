# Setup Auto-Link Metadata Trigger

## After Running Migration

The trigger is ready to use immediately! No additional configuration needed.

**Note:** Edge Function has `verify_jwt = false` in `supabase/config.toml`, so it doesn't require authentication from the trigger. The Edge Function uses its own `SUPABASE_SERVICE_ROLE_KEY` from environment variables (automatically set by Supabase).

### Step 1: Test the Trigger

Test the trigger by inserting/updating a jersey without metadata:

```sql
-- Test: Insert a jersey without metadata links
INSERT INTO public.jerseys (
  owner_id,
  club,
  season,
  player_name,
  player_number,
  jersey_type,
  visibility,
  images
) VALUES (
  'your-user-id',
  'FC København',
  '2019/2021',
  'Jonas Wind',
  '23',
  'Home',
  'public',
  ARRAY[]::TEXT[]
);

-- Check if trigger fired (check Edge Function logs in Supabase Dashboard)
```

## How It Works

1. **Trigger fires** when jersey is INSERTed or UPDATEd
2. **Condition**: Only if `club_id`, `season_id`, or `player_id` is NULL AND `club` and `season` text fields are present
3. **Calls Edge Function** via `pg_net` (asynchronous, non-blocking)
4. **Edge Function** matches text fields to metadata and updates jersey

## Troubleshooting

### Trigger not firing?

1. Check if trigger exists:
   ```sql
   SELECT * FROM pg_trigger WHERE tgname = 'trigger_auto_link_jersey_metadata';
   ```

2. Check Edge Function logs in Supabase Dashboard → Edge Functions → auto-link-metadata → Logs

3. Verify Edge Function is deployed:
   ```bash
   supabase functions list
   ```

### Edge Function failing?

1. Check Edge Function is deployed:
   ```bash
   supabase functions list
   ```

2. Check Edge Function logs for errors in Supabase Dashboard

3. Verify Edge Function has access to `SUPABASE_SERVICE_ROLE_KEY` (automatically set by Supabase)

## Security Note

The Edge Function has `verify_jwt = false` in `supabase/config.toml`, which means it doesn't require authentication from external callers. This is safe because:
- The trigger is internal (runs in the same database)
- The Edge Function uses its own `SUPABASE_SERVICE_ROLE_KEY` from environment (not passed from trigger)
- Only the trigger can call it (via `pg_net` from database)

