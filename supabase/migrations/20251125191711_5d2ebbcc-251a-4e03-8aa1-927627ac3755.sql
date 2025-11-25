-- Create search analytics table to track search queries
CREATE TABLE public.search_analytics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  query TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.search_analytics ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can log searches (anonymous or authenticated)
CREATE POLICY "Anyone can log searches"
ON public.search_analytics
FOR INSERT
WITH CHECK (true);

-- Policy: Anyone can view aggregated search data
CREATE POLICY "Anyone can view search analytics"
ON public.search_analytics
FOR SELECT
USING (true);

-- Create index for faster queries on search term and timestamp
CREATE INDEX idx_search_analytics_query ON public.search_analytics(query);
CREATE INDEX idx_search_analytics_created_at ON public.search_analytics(created_at DESC);

-- Create index for user_id for future analytics
CREATE INDEX idx_search_analytics_user_id ON public.search_analytics(user_id);