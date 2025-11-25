-- Create jerseys table
CREATE TABLE public.jerseys (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  club TEXT NOT NULL,
  season TEXT NOT NULL,
  jersey_type TEXT NOT NULL, -- Home, Away, Third, Fourth, Special Edition, GK, etc.
  player_name TEXT,
  player_number TEXT,
  competition_badges TEXT[], -- Array of badge types
  condition_rating INTEGER CHECK (condition_rating >= 1 AND condition_rating <= 10),
  notes TEXT,
  visibility TEXT NOT NULL DEFAULT 'public', -- public or private
  images TEXT[] NOT NULL, -- Array of image URLs
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create likes table
CREATE TABLE public.likes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  jersey_id UUID NOT NULL REFERENCES public.jerseys(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, jersey_id)
);

-- Create saved_jerseys table
CREATE TABLE public.saved_jerseys (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  jersey_id UUID NOT NULL REFERENCES public.jerseys(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, jersey_id)
);

-- Enable RLS
ALTER TABLE public.jerseys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_jerseys ENABLE ROW LEVEL SECURITY;

-- Jerseys policies
CREATE POLICY "Public jerseys are viewable by everyone"
ON public.jerseys FOR SELECT
USING (visibility = 'public');

CREATE POLICY "Owners can view their own jerseys"
ON public.jerseys FOR SELECT
USING (auth.uid() = owner_id);

CREATE POLICY "Authenticated users can create jerseys"
ON public.jerseys FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners can update their own jerseys"
ON public.jerseys FOR UPDATE
USING (auth.uid() = owner_id);

CREATE POLICY "Owners can delete their own jerseys"
ON public.jerseys FOR DELETE
USING (auth.uid() = owner_id);

-- Likes policies
CREATE POLICY "Anyone can view likes"
ON public.likes FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can like jerseys"
ON public.likes FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike jerseys"
ON public.likes FOR DELETE
USING (auth.uid() = user_id);

-- Saved jerseys policies
CREATE POLICY "Users can view their own saved jerseys"
ON public.saved_jerseys FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can save jerseys"
ON public.saved_jerseys FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unsave jerseys"
ON public.saved_jerseys FOR DELETE
USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX idx_jerseys_owner_id ON public.jerseys(owner_id);
CREATE INDEX idx_jerseys_visibility ON public.jerseys(visibility);
CREATE INDEX idx_likes_jersey_id ON public.likes(jersey_id);
CREATE INDEX idx_likes_user_id ON public.likes(user_id);
CREATE INDEX idx_saved_jerseys_user_id ON public.saved_jerseys(user_id);
CREATE INDEX idx_saved_jerseys_jersey_id ON public.saved_jerseys(jersey_id);

-- Add trigger for updated_at
CREATE TRIGGER update_jerseys_updated_at
BEFORE UPDATE ON public.jerseys
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();