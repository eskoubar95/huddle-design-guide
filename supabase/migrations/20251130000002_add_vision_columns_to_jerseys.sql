-- Add Vision metadata columns
ALTER TABLE public.jerseys 
ADD COLUMN vision_raw JSONB, -- Full Vision API response
ADD COLUMN vision_confidence FLOAT, -- Overall confidence score (0-100)
ADD COLUMN status TEXT DEFAULT 'published'; -- 'draft', 'published', 'archived'

-- Indexes
CREATE INDEX idx_jerseys_status ON public.jerseys(status, created_at);
CREATE INDEX idx_jerseys_vision_confidence ON public.jerseys(vision_confidence) 
WHERE vision_confidence IS NOT NULL;

-- Constraints
ALTER TABLE public.jerseys ADD CONSTRAINT jerseys_status_check 
CHECK (status IN ('draft', 'published', 'archived'));

-- Comments
COMMENT ON COLUMN public.jerseys.status IS 'Jersey status: draft (work in progress), published (visible), archived (hidden).';
COMMENT ON COLUMN public.jerseys.vision_raw IS 'Full OpenAI Vision API response stored as JSONB for debugging and future improvements.';
COMMENT ON COLUMN public.jerseys.vision_confidence IS 'Overall confidence score (0-100) for Vision analysis. Null if no Vision analysis performed.';

