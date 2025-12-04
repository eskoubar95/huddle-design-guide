-- Add embedding index to jersey_images (requires pgvector extension)
-- Note: Embedding index skipped due to pgvector dimension limit (3072 > 2000)
-- Similarity search will work but use sequential scan (acceptable for template matching)
-- Can add index later if pgvector version supports >2000 dimensions

-- Comment explaining why no index
COMMENT ON COLUMN public.jersey_images.image_embedding IS 'OpenAI embedding-3-large vector (3072 dimensions). Similarity search uses sequential scan due to pgvector dimension limit.';

