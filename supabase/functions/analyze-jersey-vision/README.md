# Analyze Jersey Vision Edge Function

## Purpose

This Edge Function analyzes jersey images using OpenAI Vision API to automatically extract metadata (club, season, player, kit type) and map them to database IDs. It uses template matching to skip Vision analysis for similar jerseys, reducing API costs.

## Features

- **Vision Analysis**: Extracts metadata from jersey images using OpenAI Vision API
- **Template Matching**: Uses pgvector similarity search to skip Vision for similar jerseys (>85% similarity)
- **Embedding Generation**: Creates embeddings from Vision results for future template matching
- **Metadata Mapping**: Maps extracted text to database IDs via `match-jersey-metadata` Edge Function
- **Automatic Template Creation**: Creates kit templates for unique jerseys (confidence >80%)
- **Results Storage**: Stores Vision results and embeddings in `jersey_images` and `jerseys` tables

## Environment Variables

Set these in Supabase Dashboard → Edge Functions → Secrets:

- `OPENAI_API_KEY` (required) - OpenAI API key for Vision and Embeddings
- `DB_PASSWORD` (required) - PostgreSQL password for direct database connection
- `SUPABASE_URL` (automatically set by Supabase)
- `SUPABASE_SERVICE_ROLE_KEY` (automatically set by Supabase)

**Note:** Error logging uses `console.error` (Sentry can be added later if needed for Deno Edge Functions)

## Usage

### Request

```typescript
interface AnalyzeVisionRequest {
  jerseyId: string      // Required: Jersey UUID
  imageUrls: string[]   // Required: Array of image URLs from Storage
  userId: string        // Required: Authenticated user ID
}
```

### Response

```typescript
interface AnalyzeVisionResponse {
  vision: VisionResult | null  // Null if template matched
  templateUsed: boolean
  matched: {
    clubId: string | null
    seasonId: string | null
    playerId: string | null
  }
  confidence: {
    club: number      // 0-100
    season: number    // 0-100
    player: number   // 0-100
    overall: number  // 0-100
  }
  embedding: number[] | null  // 3072-dimension vector (if generated)
  error?: string
}
```

### Example Call

```bash
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/analyze-jersey-vision \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "jerseyId": "uuid-here",
    "imageUrls": ["https://.../jersey_images/uuid/image1.jpg"],
    "userId": "user-id-here"
  }'
```

## Flow

1. **Validate Request**: Check jerseyId, imageUrls, userId
2. **Verify Ownership**: Ensure user owns the jersey
3. **Download Images**: Download all images from Storage
4. **Run Vision Analysis**: Analyze all images with OpenAI Vision API
5. **Generate Embedding**: Create embedding from Vision results text
6. **Template Matching**: Check for similar templates (cosine similarity >0.85)
7. **If Template Found**:
   - Use template metadata
   - Increment template usage count
   - Skip Vision API calls (cost savings)
8. **If No Template**:
   - Map Vision results to DB IDs via `match-jersey-metadata`
   - Store results in `jersey_images` rows
   - Create kit_template if unique (confidence >80%)
9. **Update Jersey**: Store Vision results and confidence in `jerseys` table

## Vision API Prompt

The function uses a structured prompt to extract:
- Club name
- Season (supports "23", "23/24", "2023/2024")
- Player name
- Player number
- Kit type (Home, Away, Third, GK)
- Badges/sponsors

## Template Matching

- **Similarity Threshold**: Cosine distance < 0.15 (similarity > 0.85)
- **Embedding Model**: `text-embedding-3-large` (3072 dimensions)
- **Search Method**: Sequential scan (no index due to dimension limit)
- **Performance**: <1 second for template matching

## Error Handling

- **Vision API Failures**: Logged to console, returns user-friendly error
- **Embedding Generation Failures**: Logged, fallback to Vision only
- **Template Matching Errors**: Logged as warning, continue with Vision
- **Metadata Mapping Failures**: Returns partial results
- **Timeout**: 30s timeout for entire operation
- **Error Logging**: Uses `console.error` (can be enhanced with Sentry later)

## Performance

- **Vision Analysis**: <10 seconds for 1-3 images
- **Template Matching**: <1 second
- **End-to-end**: <15 seconds (upload + Vision + metadata mapping)

## Cost Optimization

- **Template Matching**: Skips Vision API calls for similar jerseys
- **Automatic Template Creation**: Builds template library over time
- **Confidence Threshold**: Only creates templates for high-confidence results (>80%)

## Error Logging

- Errors logged to console with context (jerseyId, imageCount)
- Performance tracking (duration logged)
- User-friendly error messages returned to client
- **Note:** Sentry integration can be added later if needed for Deno Edge Functions

## Database Updates

- **jersey_images**: Updates `view_type` and `image_embedding` (cover image only)
- **jerseys**: Updates `vision_raw` (JSONB) and `vision_confidence` (float)
- **kit_templates**: Creates new templates for unique jerseys

## Limitations

- Embedding indexes not available (pgvector dimension limit)
- Sequential scan for template matching (acceptable for small template sets)
- Vision API costs: ~$0.01-0.03 per image
- Embedding API costs: ~$0.00013 per image

## Future Improvements

- Add embedding indexes when pgvector supports >2000 dimensions
- Improve view_type detection with Vision analysis
- Cache Vision results for identical images
- Batch processing for multiple jerseys

