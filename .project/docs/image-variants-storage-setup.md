# Image Variants Storage Setup

## Overview

Image variants (vision, gallery, card) are now generated using imgproxy and stored in Supabase Storage. This approach:
- Uses imgproxy as the processing engine (no caching on imgproxy server)
- Stores variants permanently in Supabase Storage
- Provides better control over storage usage
- Eliminates dependency on imgproxy cache

## Architecture

```
1. User uploads image → upload-jersey-image Edge Function
   ↓
2. Image stored in Storage: {jerseyId}/{filename}.jpg
   ↓
3. Database trigger fires → generate-image-variants Edge Function
   ↓
4. Edge Function:
   a. Generates imgproxy URLs for vision/gallery/card variants
   b. Downloads transformed images from imgproxy
   c. Uploads variants to Storage:
      - {jerseyId}/{filename}-vision.jpg
      - {jerseyId}/{filename}-gallery.webp
      - {jerseyId}/{filename}-card.webp
   d. Updates database with gallery variant URL
   ↓
5. Frontend uses Storage URLs directly (no imgproxy dependency)
```

## Environment Variables

### Railway (imgproxy service)

**Public URL**: `https://imgproxy-production-aca3.up.railway.app`

**Required:**
- `IMGPROXY_URL` (or use `NEXT_PUBLIC_IMGPROXY_URL` from frontend)

**Optional (for insecure mode - current setup):**
- Do NOT set `IMGPROXY_KEY` or `IMGPROXY_SALT` (leave unset)
- If set, imgproxy will require signed URLs even with `/insecure/` path

### Supabase Edge Functions

**Required secrets:**
- `SUPABASE_URL` (automatically set by Supabase)
- `SUPABASE_SERVICE_ROLE_KEY` (automatically set by Supabase)
- `IMGPROXY_URL` or `NEXT_PUBLIC_IMGPROXY_URL` (must match Railway URL)

**Optional:**
- `IMGPROXY_KEY` and `IMGPROXY_SALT` (only if using signed URLs - not needed for insecure mode)

### Frontend

**Required:**
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_IMGPROXY_URL` (optional - only for legacy fallback, not used in new flow)

## Variant Specifications

### Vision Variant
- **Purpose**: AI Vision processing
- **Format**: JPEG
- **Dimensions**: Max 2000x2000 (maintains aspect ratio)
- **Quality**: 80
- **Storage path**: `{jerseyId}/{filename}-vision.jpg`

### Gallery Variant
- **Purpose**: Detail view / gallery display
- **Format**: WebP
- **Dimensions**: Width 1200px (height auto)
- **Quality**: 70
- **Storage path**: `{jerseyId}/{filename}-gallery.webp`
- **Database**: Stored in `image_url_webp` for backward compatibility

### Card Variant
- **Purpose**: Thumbnails / card view
- **Format**: WebP
- **Dimensions**: Width 480px (height auto)
- **Quality**: 65
- **Storage path**: `{jerseyId}/{filename}-card.webp`

## Database Trigger

The trigger `trigger_generate_variants_jersey_image` is created by migration:
- `supabase/migrations/20250113000000_generate_image_variants_trigger.sql`

**Behavior:**
- Fires AFTER INSERT on `jersey_images`
- Only triggers if `storage_path` exists and image is not already WebP
- Calls `generate-image-variants` Edge Function asynchronously via `pg_net`

## Testing

### Manual Test Flow

1. **Upload a jersey image:**
   - Create a draft jersey
   - Upload an image via frontend
   - Check Supabase Storage for:
     - Original: `{jerseyId}/{filename}.jpg`
     - Vision variant: `{jerseyId}/{filename}-vision.jpg`
     - Gallery variant: `{jerseyId}/{filename}-gallery.webp`
     - Card variant: `{jerseyId}/{filename}-card.webp`

2. **Verify database:**
   - Check `jersey_images` table
   - `image_url_webp` should be set to gallery variant URL
   - `storage_path` should be set to original path

3. **Test frontend:**
   - View jersey in wardrobe (should use card variant)
   - View jersey detail (should use gallery variant)
   - Run Vision AI (should use vision variant)

4. **Test Vision AI:**
   - Enable AI Vision toggle
   - Verify it uses vision variant from Storage
   - Check logs for "Using vision variant" message

### Troubleshooting

**Variants not generated:**
- Check Edge Function logs in Supabase Dashboard
- Verify `IMGPROXY_URL` is set correctly
- Check that imgproxy service is accessible from Edge Functions
- Verify database trigger is active

**403 errors from imgproxy:**
- Ensure `IMGPROXY_KEY` and `IMGPROXY_SALT` are NOT set in Railway
- Verify imgproxy is using insecure mode

**Vision AI not using variants:**
- Check `analyze-jersey-vision` logs
- Verify `storage_path` is set in `jersey_images` table
- Check that vision variant exists in Storage

## Migration Notes

**From imgproxy URLs to Storage variants:**
- Old images without `storage_path` will fallback to `image_url_webp` or original
- New uploads automatically generate variants
- No manual migration needed - variants are generated on-demand

## Performance Considerations

- **Storage usage**: ~3x original file size (original + 3 variants)
- **Processing time**: ~2-5 seconds per image (download + upload)
- **Edge Function timeout**: Variant generation is async via trigger, doesn't block upload
- **imgproxy load**: Only used for processing, no caching (reduces server load)

