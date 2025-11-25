-- Add foreign key constraint from posts to profiles
ALTER TABLE public.posts
ADD CONSTRAINT posts_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES auth.users(id) 
ON DELETE CASCADE;

-- Add foreign key constraint from comments to profiles  
ALTER TABLE public.comments
ADD CONSTRAINT comments_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES auth.users(id) 
ON DELETE CASCADE;

-- Add foreign key constraint from follows
ALTER TABLE public.follows
ADD CONSTRAINT follows_follower_id_fkey 
FOREIGN KEY (follower_id) 
REFERENCES auth.users(id) 
ON DELETE CASCADE;

ALTER TABLE public.follows
ADD CONSTRAINT follows_following_id_fkey 
FOREIGN KEY (following_id) 
REFERENCES auth.users(id) 
ON DELETE CASCADE;

-- Add foreign key constraint from post_likes
ALTER TABLE public.post_likes
ADD CONSTRAINT post_likes_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES auth.users(id) 
ON DELETE CASCADE;