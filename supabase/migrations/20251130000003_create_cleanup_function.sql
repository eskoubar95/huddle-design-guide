-- Function to cleanup abandoned draft jerseys
CREATE OR REPLACE FUNCTION cleanup_abandoned_drafts()
RETURNS TABLE(deleted_count INTEGER, jersey_ids UUID[]) AS $$
DECLARE
  deleted_jersey_ids UUID[];
BEGIN
  -- Find and delete draft jerseys > 24 hours old
  WITH deleted AS (
    DELETE FROM public.jerseys
    WHERE status = 'draft'
    AND created_at < now() - interval '24 hours'
    RETURNING id
  )
  SELECT array_agg(id), COUNT(*)::INTEGER
  INTO deleted_jersey_ids, deleted_count
  FROM deleted;
  
  RETURN QUERY SELECT deleted_count, deleted_jersey_ids;
END;
$$ LANGUAGE plpgsql;

-- Comment
COMMENT ON FUNCTION cleanup_abandoned_drafts() IS 'Deletes draft jerseys older than 24 hours. CASCADE delete automatically removes jersey_images rows. Storage cleanup handled by Edge Function.';

