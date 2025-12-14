-- Migration: Align all user_id columns from UUID to TEXT for Clerk compatibility
-- HUD-41 Phase 1.0
-- Date: 2025-12-13
--
-- Context: Application uses Clerk authentication (TEXT user IDs), but many tables
-- still have UUID user_id columns with foreign keys to auth.users (Supabase Auth).
-- This migration converts all user_id columns to TEXT to enable Clerk integration.
--
-- IMPORTANT: This migration drops and recreates RLS policies because policies
-- cannot reference columns that are being type-changed. Policies are recreated
-- with auth.uid()::text to match Clerk TEXT user IDs.

-- =============================================================================
-- STEP 1: DROP ALL RLS POLICIES THAT REFERENCE USER_ID COLUMNS
-- =============================================================================

-- notifications policies
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "System can create notifications" ON public.notifications;

-- sale_listings policies
DROP POLICY IF EXISTS "Sellers can create sale listings" ON public.sale_listings;
DROP POLICY IF EXISTS "Sellers can update their own listings" ON public.sale_listings;
DROP POLICY IF EXISTS "Sellers can view their own listings" ON public.sale_listings;
DROP POLICY IF EXISTS "Sellers can delete their own listings" ON public.sale_listings;
DROP POLICY IF EXISTS "Anyone can view active sale listings" ON public.sale_listings;

-- auctions policies
DROP POLICY IF EXISTS "Sellers can create auctions" ON public.auctions;
DROP POLICY IF EXISTS "Sellers can update their own auctions" ON public.auctions;
DROP POLICY IF EXISTS "Sellers can view their own auctions" ON public.auctions;
DROP POLICY IF EXISTS "Anyone can view active auctions" ON public.auctions;

-- bids policies
DROP POLICY IF EXISTS "Authenticated users can place bids" ON public.bids;
DROP POLICY IF EXISTS "Anyone can view bids" ON public.bids;

-- transactions policies
DROP POLICY IF EXISTS "Users can view their own transactions" ON public.transactions;
DROP POLICY IF EXISTS "System can create transactions" ON public.transactions;
DROP POLICY IF EXISTS "System can update transactions" ON public.transactions;

-- likes policies
DROP POLICY IF EXISTS "Authenticated users can like jerseys" ON public.likes;
DROP POLICY IF EXISTS "Users can unlike jerseys" ON public.likes;
DROP POLICY IF EXISTS "Anyone can view likes" ON public.likes;

-- saved_jerseys policies
DROP POLICY IF EXISTS "Authenticated users can save jerseys" ON public.saved_jerseys;
DROP POLICY IF EXISTS "Users can unsave jerseys" ON public.saved_jerseys;
DROP POLICY IF EXISTS "Users can view their own saved jerseys" ON public.saved_jerseys;

-- follows policies
DROP POLICY IF EXISTS "Users can follow others" ON public.follows;
DROP POLICY IF EXISTS "Users can unfollow" ON public.follows;
DROP POLICY IF EXISTS "Anyone can view follows" ON public.follows;

-- posts policies
DROP POLICY IF EXISTS "Authenticated users can create posts" ON public.posts;
DROP POLICY IF EXISTS "Users can update their own posts" ON public.posts;
DROP POLICY IF EXISTS "Users can delete their own posts" ON public.posts;
DROP POLICY IF EXISTS "Anyone can view posts" ON public.posts;

-- post_likes policies
DROP POLICY IF EXISTS "Authenticated users can like posts" ON public.post_likes;
DROP POLICY IF EXISTS "Users can unlike posts" ON public.post_likes;
DROP POLICY IF EXISTS "Anyone can view post likes" ON public.post_likes;

-- comments policies
DROP POLICY IF EXISTS "Authenticated users can create comments" ON public.comments;
DROP POLICY IF EXISTS "Users can update their own comments" ON public.comments;
DROP POLICY IF EXISTS "Users can delete their own comments" ON public.comments;
DROP POLICY IF EXISTS "Anyone can view comments" ON public.comments;

-- search_analytics policies
DROP POLICY IF EXISTS "Anyone can log searches" ON public.search_analytics;
DROP POLICY IF EXISTS "Anyone can view search analytics" ON public.search_analytics;

-- =============================================================================
-- STEP 2: CONVERT COLUMNS FROM UUID TO TEXT
-- =============================================================================

-- notifications.user_id (UUID → TEXT)
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_user_id_fkey;
DROP INDEX IF EXISTS idx_notifications_user_id;
ALTER TABLE public.notifications ALTER COLUMN user_id TYPE TEXT USING user_id::text;
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
COMMENT ON COLUMN public.notifications.user_id IS 'Clerk user ID (TEXT). No FK to auth.users - Clerk manages authentication.';

-- sale_listings.seller_id (UUID → TEXT)
ALTER TABLE public.sale_listings DROP CONSTRAINT IF EXISTS sale_listings_seller_id_fkey;
DROP INDEX IF EXISTS idx_sale_listings_seller_id;
ALTER TABLE public.sale_listings ALTER COLUMN seller_id TYPE TEXT USING seller_id::text;
CREATE INDEX IF NOT EXISTS idx_sale_listings_seller_id ON public.sale_listings(seller_id);
COMMENT ON COLUMN public.sale_listings.seller_id IS 'Clerk user ID (TEXT). No FK to auth.users - Clerk manages authentication.';

-- sale_listings.sold_to (UUID → TEXT)
ALTER TABLE public.sale_listings DROP CONSTRAINT IF EXISTS sale_listings_sold_to_fkey;
DROP INDEX IF EXISTS idx_sale_listings_sold_to;
ALTER TABLE public.sale_listings ALTER COLUMN sold_to TYPE TEXT USING sold_to::text;
CREATE INDEX IF NOT EXISTS idx_sale_listings_sold_to ON public.sale_listings(sold_to);
COMMENT ON COLUMN public.sale_listings.sold_to IS 'Clerk user ID (TEXT). No FK to auth.users - Clerk manages authentication.';

-- auctions.seller_id (UUID → TEXT)
ALTER TABLE public.auctions DROP CONSTRAINT IF EXISTS auctions_seller_id_fkey;
DROP INDEX IF EXISTS idx_auctions_seller_id;
ALTER TABLE public.auctions ALTER COLUMN seller_id TYPE TEXT USING seller_id::text;
CREATE INDEX IF NOT EXISTS idx_auctions_seller_id ON public.auctions(seller_id);
COMMENT ON COLUMN public.auctions.seller_id IS 'Clerk user ID (TEXT). No FK to auth.users - Clerk manages authentication.';

-- auctions.winner_id (UUID → TEXT)
ALTER TABLE public.auctions DROP CONSTRAINT IF EXISTS auctions_winner_id_fkey;
DROP INDEX IF EXISTS idx_auctions_winner_id;
ALTER TABLE public.auctions ALTER COLUMN winner_id TYPE TEXT USING winner_id::text;
CREATE INDEX IF NOT EXISTS idx_auctions_winner_id ON public.auctions(winner_id);
COMMENT ON COLUMN public.auctions.winner_id IS 'Clerk user ID (TEXT). No FK to auth.users - Clerk manages authentication.';

-- bids.bidder_id (UUID → TEXT)
ALTER TABLE public.bids DROP CONSTRAINT IF EXISTS bids_bidder_id_fkey;
DROP INDEX IF EXISTS idx_bids_bidder_id;
ALTER TABLE public.bids ALTER COLUMN bidder_id TYPE TEXT USING bidder_id::text;
CREATE INDEX IF NOT EXISTS idx_bids_bidder_id ON public.bids(bidder_id);
COMMENT ON COLUMN public.bids.bidder_id IS 'Clerk user ID (TEXT). No FK to auth.users - Clerk manages authentication.';

-- transactions.seller_id (UUID → TEXT)
ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_seller_id_fkey;
DROP INDEX IF EXISTS idx_transactions_seller_id;
ALTER TABLE public.transactions ALTER COLUMN seller_id TYPE TEXT USING seller_id::text;
CREATE INDEX IF NOT EXISTS idx_transactions_seller_id ON public.transactions(seller_id);
COMMENT ON COLUMN public.transactions.seller_id IS 'Clerk user ID (TEXT). No FK to auth.users - Clerk manages authentication.';

-- transactions.buyer_id (UUID → TEXT)
ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_buyer_id_fkey;
DROP INDEX IF EXISTS idx_transactions_buyer_id;
ALTER TABLE public.transactions ALTER COLUMN buyer_id TYPE TEXT USING buyer_id::text;
CREATE INDEX IF NOT EXISTS idx_transactions_buyer_id ON public.transactions(buyer_id);
COMMENT ON COLUMN public.transactions.buyer_id IS 'Clerk user ID (TEXT). No FK to auth.users - Clerk manages authentication.';

-- =============================================================================
-- SOCIAL FEATURE TABLES (For completeness - prevent future bugs)
-- =============================================================================

-- likes.user_id (UUID → TEXT)
ALTER TABLE public.likes DROP CONSTRAINT IF EXISTS likes_user_id_fkey;
DROP INDEX IF EXISTS idx_likes_user_id;
ALTER TABLE public.likes ALTER COLUMN user_id TYPE TEXT USING user_id::text;
CREATE INDEX IF NOT EXISTS idx_likes_user_id ON public.likes(user_id);
COMMENT ON COLUMN public.likes.user_id IS 'Clerk user ID (TEXT). No FK to auth.users - Clerk manages authentication.';

-- saved_jerseys.user_id (UUID → TEXT)
ALTER TABLE public.saved_jerseys DROP CONSTRAINT IF EXISTS saved_jerseys_user_id_fkey;
DROP INDEX IF EXISTS idx_saved_jerseys_user_id;
ALTER TABLE public.saved_jerseys ALTER COLUMN user_id TYPE TEXT USING user_id::text;
CREATE INDEX IF NOT EXISTS idx_saved_jerseys_user_id ON public.saved_jerseys(user_id);
COMMENT ON COLUMN public.saved_jerseys.user_id IS 'Clerk user ID (TEXT). No FK to auth.users - Clerk manages authentication.';

-- follows.follower_id (UUID → TEXT)
ALTER TABLE public.follows DROP CONSTRAINT IF EXISTS follows_follower_id_fkey;
DROP INDEX IF EXISTS idx_follows_follower_id;
ALTER TABLE public.follows ALTER COLUMN follower_id TYPE TEXT USING follower_id::text;
CREATE INDEX IF NOT EXISTS idx_follows_follower_id ON public.follows(follower_id);
COMMENT ON COLUMN public.follows.follower_id IS 'Clerk user ID (TEXT). No FK to auth.users - Clerk manages authentication.';

-- follows.following_id (UUID → TEXT)
ALTER TABLE public.follows DROP CONSTRAINT IF EXISTS follows_following_id_fkey;
DROP INDEX IF EXISTS idx_follows_following_id;
ALTER TABLE public.follows ALTER COLUMN following_id TYPE TEXT USING following_id::text;
CREATE INDEX IF NOT EXISTS idx_follows_following_id ON public.follows(following_id);
COMMENT ON COLUMN public.follows.following_id IS 'Clerk user ID (TEXT). No FK to auth.users - Clerk manages authentication.';

-- posts.user_id (UUID → TEXT)
ALTER TABLE public.posts DROP CONSTRAINT IF EXISTS posts_user_id_fkey;
DROP INDEX IF EXISTS idx_posts_user_id;
ALTER TABLE public.posts ALTER COLUMN user_id TYPE TEXT USING user_id::text;
CREATE INDEX IF NOT EXISTS idx_posts_user_id ON public.posts(user_id);
COMMENT ON COLUMN public.posts.user_id IS 'Clerk user ID (TEXT). No FK to auth.users - Clerk manages authentication.';

-- post_likes.user_id (UUID → TEXT)
ALTER TABLE public.post_likes DROP CONSTRAINT IF EXISTS post_likes_user_id_fkey;
DROP INDEX IF EXISTS idx_post_likes_user_id;
ALTER TABLE public.post_likes ALTER COLUMN user_id TYPE TEXT USING user_id::text;
CREATE INDEX IF NOT EXISTS idx_post_likes_user_id ON public.post_likes(user_id);
COMMENT ON COLUMN public.post_likes.user_id IS 'Clerk user ID (TEXT). No FK to auth.users - Clerk manages authentication.';

-- comments.user_id (UUID → TEXT)
ALTER TABLE public.comments DROP CONSTRAINT IF EXISTS comments_user_id_fkey;
DROP INDEX IF EXISTS idx_comments_user_id;
ALTER TABLE public.comments ALTER COLUMN user_id TYPE TEXT USING user_id::text;
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON public.comments(user_id);
COMMENT ON COLUMN public.comments.user_id IS 'Clerk user ID (TEXT). No FK to auth.users - Clerk manages authentication.';

-- search_analytics.user_id (UUID → TEXT)
ALTER TABLE public.search_analytics DROP CONSTRAINT IF EXISTS search_analytics_user_id_fkey;
DROP INDEX IF EXISTS idx_search_analytics_user_id;
ALTER TABLE public.search_analytics ALTER COLUMN user_id TYPE TEXT USING user_id::text;
CREATE INDEX IF NOT EXISTS idx_search_analytics_user_id ON public.search_analytics(user_id);
COMMENT ON COLUMN public.search_analytics.user_id IS 'Clerk user ID (TEXT). No FK to auth.users - Clerk manages authentication.';

-- =============================================================================
-- STEP 3: RECREATE RLS POLICIES WITH TEXT-COMPATIBLE SYNTAX
-- =============================================================================

-- notifications policies (NOTE: auth.uid() returns UUID in Supabase, cast to TEXT for Clerk)
CREATE POLICY "Users can view their own notifications" ON public.notifications
  FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can update their own notifications" ON public.notifications
  FOR UPDATE USING (auth.uid()::text = user_id);

-- Note: Notifications are created by service-role only (no INSERT policy for authenticated users)
-- System notifications are created server-side via API routes using service-role client

-- sale_listings policies
CREATE POLICY "Sellers can create sale listings" ON public.sale_listings
  FOR INSERT WITH CHECK (auth.uid()::text = seller_id);

CREATE POLICY "Sellers can update their own listings" ON public.sale_listings
  FOR UPDATE USING (auth.uid()::text = seller_id);

CREATE POLICY "Sellers can view their own listings" ON public.sale_listings
  FOR SELECT USING (auth.uid()::text = seller_id);

CREATE POLICY "Sellers can delete their own listings" ON public.sale_listings
  FOR DELETE USING (auth.uid()::text = seller_id);

CREATE POLICY "Anyone can view active sale listings" ON public.sale_listings
  FOR SELECT USING (status::text = 'active');

-- auctions policies
CREATE POLICY "Sellers can create auctions" ON public.auctions
  FOR INSERT WITH CHECK (auth.uid()::text = seller_id);

CREATE POLICY "Sellers can update their own auctions" ON public.auctions
  FOR UPDATE USING (auth.uid()::text = seller_id);

CREATE POLICY "Sellers can view their own auctions" ON public.auctions
  FOR SELECT USING (auth.uid()::text = seller_id);

CREATE POLICY "Anyone can view active auctions" ON public.auctions
  FOR SELECT USING (status::text = 'active');

-- bids policies
CREATE POLICY "Authenticated users can place bids" ON public.bids
  FOR INSERT WITH CHECK (auth.uid()::text = bidder_id);

CREATE POLICY "Anyone can view bids" ON public.bids
  FOR SELECT USING (true);

-- transactions policies
CREATE POLICY "Users can view their own transactions" ON public.transactions
  FOR SELECT USING (auth.uid()::text = buyer_id OR auth.uid()::text = seller_id);

-- Note: Transactions are created/updated by service-role only (no INSERT/UPDATE policies)
-- Financial data modifications must be done server-side via API routes using service-role client

-- likes policies
CREATE POLICY "Authenticated users can like jerseys" ON public.likes
  FOR INSERT WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can unlike jerseys" ON public.likes
  FOR DELETE USING (auth.uid()::text = user_id);

CREATE POLICY "Anyone can view likes" ON public.likes
  FOR SELECT USING (true);

-- saved_jerseys policies
CREATE POLICY "Authenticated users can save jerseys" ON public.saved_jerseys
  FOR INSERT WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can unsave jerseys" ON public.saved_jerseys
  FOR DELETE USING (auth.uid()::text = user_id);

CREATE POLICY "Users can view their own saved jerseys" ON public.saved_jerseys
  FOR SELECT USING (auth.uid()::text = user_id);

-- follows policies
CREATE POLICY "Users can follow others" ON public.follows
  FOR INSERT WITH CHECK (auth.uid()::text = follower_id);

CREATE POLICY "Users can unfollow" ON public.follows
  FOR DELETE USING (auth.uid()::text = follower_id);

CREATE POLICY "Anyone can view follows" ON public.follows
  FOR SELECT USING (true);

-- posts policies
CREATE POLICY "Authenticated users can create posts" ON public.posts
  FOR INSERT WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update their own posts" ON public.posts
  FOR UPDATE USING (auth.uid()::text = user_id);

CREATE POLICY "Users can delete their own posts" ON public.posts
  FOR DELETE USING (auth.uid()::text = user_id);

CREATE POLICY "Anyone can view posts" ON public.posts
  FOR SELECT USING (true);

-- post_likes policies
CREATE POLICY "Authenticated users can like posts" ON public.post_likes
  FOR INSERT WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can unlike posts" ON public.post_likes
  FOR DELETE USING (auth.uid()::text = user_id);

CREATE POLICY "Anyone can view post likes" ON public.post_likes
  FOR SELECT USING (true);

-- comments policies
CREATE POLICY "Authenticated users can create comments" ON public.comments
  FOR INSERT WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update their own comments" ON public.comments
  FOR UPDATE USING (auth.uid()::text = user_id);

CREATE POLICY "Users can delete their own comments" ON public.comments
  FOR DELETE USING (auth.uid()::text = user_id);

CREATE POLICY "Anyone can view comments" ON public.comments
  FOR SELECT USING (true);

-- search_analytics policies
CREATE POLICY "Anyone can log searches" ON public.search_analytics
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can view search analytics" ON public.search_analytics
  FOR SELECT USING (true);

-- =============================================================================
-- VERIFICATION
-- =============================================================================

-- Migration completed: All user_id columns converted from UUID to TEXT for Clerk compatibility
-- All RLS policies recreated with auth.uid()::text casting for Clerk compatibility
