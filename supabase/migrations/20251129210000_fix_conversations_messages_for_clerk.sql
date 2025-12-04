-- Fix conversations, messages, and message_reactions tables for Clerk authentication
-- Change participant_1_id, participant_2_id, sender_id, and user_id from UUID to TEXT
-- This migration handles all dependencies (policies, constraints, indexes)

-- Step 1: Drop ALL policies that depend on conversations/messages columns
-- Storage policies
DROP POLICY IF EXISTS "Users can view chat images from their conversations" ON storage.objects;

-- Message reactions policies
DROP POLICY IF EXISTS "Users can view reactions in their conversations" ON public.message_reactions;
DROP POLICY IF EXISTS "Users can add reactions in their conversations" ON public.message_reactions;
DROP POLICY IF EXISTS "Users can remove their own reactions" ON public.message_reactions;

-- Messages policies
DROP POLICY IF EXISTS "Conversation participants can view messages" ON public.messages;
DROP POLICY IF EXISTS "Conversation participants can send messages" ON public.messages;
DROP POLICY IF EXISTS "Users can update their own messages" ON public.messages;

-- Conversations policies
DROP POLICY IF EXISTS "Users can view their own conversations" ON public.conversations;
DROP POLICY IF EXISTS "Authenticated users can create conversations" ON public.conversations;
DROP POLICY IF EXISTS "Participants can update conversations" ON public.conversations;

-- Step 2: Drop constraints (must drop UNIQUE before foreign keys)
-- Conversations constraints
ALTER TABLE public.conversations DROP CONSTRAINT IF EXISTS conversations_participant_1_id_participant_2_id_jersey_id_key;
ALTER TABLE public.conversations DROP CONSTRAINT IF EXISTS conversations_check;
ALTER TABLE public.conversations DROP CONSTRAINT IF EXISTS conversations_participant_check;
ALTER TABLE public.conversations DROP CONSTRAINT IF EXISTS conversations_participant_1_fkey;
ALTER TABLE public.conversations DROP CONSTRAINT IF EXISTS conversations_participant_2_fkey;

-- Messages constraints
ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS messages_sender_fkey;

-- Message reactions constraints (UNIQUE constraint includes user_id)
ALTER TABLE public.message_reactions DROP CONSTRAINT IF EXISTS message_reactions_message_id_user_id_emoji_key;

-- Step 3: Drop indexes
DROP INDEX IF EXISTS idx_conversations_participant_1;
DROP INDEX IF EXISTS idx_conversations_participant_2;
DROP INDEX IF EXISTS idx_messages_sender;
DROP INDEX IF EXISTS idx_message_reactions_user_id;

-- Step 4: Change column types
ALTER TABLE public.conversations ALTER COLUMN participant_1_id TYPE TEXT USING participant_1_id::text;
ALTER TABLE public.conversations ALTER COLUMN participant_2_id TYPE TEXT USING participant_2_id::text;
ALTER TABLE public.messages ALTER COLUMN sender_id TYPE TEXT USING sender_id::text;
ALTER TABLE public.message_reactions ALTER COLUMN user_id TYPE TEXT USING user_id::text;

-- Step 5: Re-add CHECK constraint (now both are TEXT)
ALTER TABLE public.conversations ADD CONSTRAINT conversations_participant_check 
  CHECK (participant_1_id != participant_2_id);

-- Step 6: Re-add UNIQUE constraints
ALTER TABLE public.conversations ADD CONSTRAINT conversations_participant_1_id_participant_2_id_jersey_id_key
  UNIQUE (participant_1_id, participant_2_id, jersey_id);

ALTER TABLE public.message_reactions ADD CONSTRAINT message_reactions_message_id_user_id_emoji_key
  UNIQUE (message_id, user_id, emoji);

-- Step 7: Re-create indexes
CREATE INDEX idx_conversations_participant_1 ON public.conversations(participant_1_id);
CREATE INDEX idx_conversations_participant_2 ON public.conversations(participant_2_id);
CREATE INDEX idx_messages_sender ON public.messages(sender_id);
CREATE INDEX idx_message_reactions_user_id ON public.message_reactions(user_id);

-- Step 8: Re-create storage policy (updated for TEXT)
CREATE POLICY "Users can view chat images from their conversations"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'chat_images' AND
    EXISTS (
      SELECT 1 FROM public.messages m
      JOIN public.conversations c ON c.id = m.conversation_id
      WHERE m.images && ARRAY[storage.objects.name]
      AND (auth.uid()::text = c.participant_1_id OR auth.uid()::text = c.participant_2_id)
    )
  );

-- Step 9: Re-create message_reactions policies (updated for TEXT)
CREATE POLICY "Users can view reactions in their conversations"
  ON public.message_reactions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.messages m
      JOIN public.conversations c ON c.id = m.conversation_id
      WHERE m.id = message_reactions.message_id
      AND (auth.uid()::text = c.participant_1_id OR auth.uid()::text = c.participant_2_id)
    )
  );

CREATE POLICY "Users can add reactions in their conversations"
  ON public.message_reactions FOR INSERT
  WITH CHECK (
    auth.uid()::text = user_id
    AND EXISTS (
      SELECT 1 FROM public.messages m
      JOIN public.conversations c ON c.id = m.conversation_id
      WHERE m.id = message_reactions.message_id
      AND (auth.uid()::text = c.participant_1_id OR auth.uid()::text = c.participant_2_id)
    )
  );

CREATE POLICY "Users can remove their own reactions"
  ON public.message_reactions FOR DELETE
  USING (auth.uid()::text = user_id);

-- Step 10: Re-create messages policies (updated for TEXT)
CREATE POLICY "Conversation participants can view messages"
  ON public.messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations
      WHERE id = messages.conversation_id
      AND (auth.uid()::text = participant_1_id OR auth.uid()::text = participant_2_id)
    )
  );

CREATE POLICY "Conversation participants can send messages"
  ON public.messages FOR INSERT
  WITH CHECK (
    auth.uid()::text = sender_id
    AND EXISTS (
      SELECT 1 FROM public.conversations
      WHERE id = messages.conversation_id
      AND (auth.uid()::text = participant_1_id OR auth.uid()::text = participant_2_id)
    )
  );

CREATE POLICY "Users can update their own messages"
  ON public.messages FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations
      WHERE id = messages.conversation_id
      AND (auth.uid()::text = participant_1_id OR auth.uid()::text = participant_2_id)
    )
  );

-- Step 11: Re-create conversations policies (updated for TEXT)
CREATE POLICY "Users can view their own conversations"
  ON public.conversations FOR SELECT
  USING (auth.uid()::text = participant_1_id OR auth.uid()::text = participant_2_id);

CREATE POLICY "Authenticated users can create conversations"
  ON public.conversations FOR INSERT
  WITH CHECK (auth.uid()::text = participant_1_id OR auth.uid()::text = participant_2_id);

CREATE POLICY "Participants can update conversations"
  ON public.conversations FOR UPDATE
  USING (auth.uid()::text = participant_1_id OR auth.uid()::text = participant_2_id);

-- Note: Foreign key references to auth.users(id) are removed since we use Clerk
-- Service role client bypasses RLS, so policies are for documentation only

