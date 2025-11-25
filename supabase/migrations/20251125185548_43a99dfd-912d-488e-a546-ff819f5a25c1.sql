-- Add images column to messages table
ALTER TABLE public.messages
ADD COLUMN images TEXT[] DEFAULT '{}';

-- Create chat_images storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat_images', 'chat_images', true);

-- Allow authenticated users to upload their own chat images
CREATE POLICY "Users can upload chat images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'chat_images' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow authenticated users to view chat images from their conversations
CREATE POLICY "Users can view chat images from their conversations"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'chat_images' AND
  EXISTS (
    SELECT 1 FROM public.messages m
    JOIN public.conversations c ON c.id = m.conversation_id
    WHERE m.images && ARRAY[storage.objects.name]
    AND (c.participant_1_id = auth.uid() OR c.participant_2_id = auth.uid())
  )
);

-- Allow users to delete their own uploaded images
CREATE POLICY "Users can delete their own chat images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'chat_images' AND
  auth.uid()::text = (storage.foldername(name))[1]
);