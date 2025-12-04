-- Enable pgvector extension (required for image_embedding column)
CREATE EXTENSION IF NOT EXISTS vector;

-- Create jersey_images table for normalized image storage
CREATE TABLE public.jersey_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  jersey_id UUID NOT NULL REFERENCES public.jerseys(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  storage_path TEXT NOT NULL, -- For cleanup: "jersey_id/filename.jpg"
  view_type TEXT, -- 'front', 'back', 'detail', 'other' (fra Vision)
  sort_order INTEGER DEFAULT 0, -- For reordering (første = cover)
  image_embedding vector(3072), -- OpenAI embedding dimension (nullable initially)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Indexes
CREATE INDEX idx_jersey_images_jersey_id ON public.jersey_images(jersey_id);
CREATE INDEX idx_jersey_images_sort_order ON public.jersey_images(jersey_id, sort_order);

-- Comments
COMMENT ON TABLE public.jersey_images IS 'Normalized jersey images with metadata. Replaces jerseys.images TEXT[] array.';
COMMENT ON COLUMN public.jersey_images.view_type IS 'Image view type detected by Vision or user. Values: front, back, detail, other.';
COMMENT ON COLUMN public.jersey_images.image_embedding IS 'OpenAI embedding vector (3072 dimensions) for template matching. Created in Phase 1.';

