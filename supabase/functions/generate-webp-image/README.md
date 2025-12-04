# Generate WebP Image Edge Function

## Purpose

This Edge Function automatically generates WebP versions of uploaded jersey images. It's called automatically via database trigger when a `jersey_image` is inserted without a WebP version.

## Features

- **Automatic triggering**: Called via database trigger when `jersey_image` is created
- **Retry logic**: Implements exponential backoff for download, upload, and database operations
- **Error handling**: Comprehensive error handling with cleanup on failure
- **Idempotent**: Skips if WebP already exists or image is already WebP format
- **Non-blocking**: Runs asynchronously, doesn't block image upload

## Architecture

```
User selects image → Browser resizes to max 2000px (browser-image-compression)
                ↓
         upload-jersey-image Edge Function (uploads directly, no resize)
                ↓
         Insert jersey_image (image_url_webp = null)
                ↓
         Database Trigger fires
                ↓
         generate-webp-image Edge Function
                ↓
         Download → Resize (if needed) → Convert to WebP → Upload → Update DB
```

**Note:** Image resize is now handled in the browser before upload to avoid Edge Function CPU timeout. The `generate-webp-image` function still resizes images as a backup if the browser resize failed or if the image is still too large.

## Environment Variables

Automatically set by Supabase:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

## Database Trigger Setup

The trigger is created by migration `20251203120000_generate_webp_trigger.sql`.

**No additional configuration needed!** The trigger works out of the box because:
- Edge Function has `verify_jwt = false` in `supabase/config.toml`
- Edge Function uses `SUPABASE_SERVICE_ROLE_KEY` from Edge Function secrets (automatically set by Supabase)
- Trigger calls Edge Function without Authorization header (not needed with `verify_jwt = false`)

## Request Format

Called automatically by database trigger with:

```json
{
  "jerseyImageId": "uuid",
  "imageUrl": "https://...",
  "storagePath": "jersey-id/filename.jpg"
}
```

## Response

```json
{
  "success": true,
  "jerseyImageId": "uuid",
  "webpUrl": "https://..."
}
```

## Error Handling

- **Retry logic**: 3 retries with exponential backoff (1s, 2s, 4s)
- **Cleanup**: Removes uploaded WebP file if database update fails
- **Logging**: Comprehensive logging for debugging

## Frontend Compatibility

The frontend already handles `image_url_webp` being `null`:
- Uses `getWebPUrl()` to generate WebP URL from original
- Falls back to original image if WebP fails to load
- `onError` handler switches to original URL

## Troubleshooting

### Trigger not firing?

1. Check if trigger exists:
   ```sql
   SELECT * FROM pg_trigger WHERE tgname = 'trigger_generate_webp_jersey_image';
   ```

2. Check Edge Function logs in Supabase Dashboard → Edge Functions → generate-webp-image → Logs

3. Verify Edge Function is deployed:
   ```bash
   supabase functions list
   ```

### WebP generation failing?

1. Check Edge Function logs for specific errors in Supabase Dashboard
2. Verify ImageMagick (@imagemagick/magick-wasm) is working (check Deno compatibility)
3. Check storage permissions for `jersey_images` bucket
4. Verify `SUPABASE_SERVICE_ROLE_KEY` is set in Edge Function secrets (automatically set by Supabase)

## Image Processing Library

This function uses **ImageMagick** (`@imagemagick/magick-wasm`) for WebP conversion instead of ImageScript, as ImageMagick provides better compression and file size optimization. WebP quality is set to 70 to match the compressed JPEG sizes from client-side resizing.

### WebP not appearing in frontend?

1. Check if `image_url_webp` is populated in database:
   ```sql
   SELECT id, image_url, image_url_webp FROM jersey_images WHERE id = 'your-id';
   ```

2. Frontend will fallback to original if WebP is null (expected behavior)
3. WebP generation is asynchronous - may take 5-10 seconds

