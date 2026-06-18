-- Migration 109: Cot nhe cho thread Fanpage
-- Muc tieu: Hoi thoai khach trong Hop Thu khong doc JSONB moi lan, tranh timeout.

ALTER TABLE public.marketing_messages
  ADD COLUMN IF NOT EXISTS conversation_id text,
  ADD COLUMN IF NOT EXISTS from_platform_user_id text,
  ADD COLUMN IF NOT EXISTS recipient_id text;

CREATE OR REPLACE FUNCTION public.sync_marketing_message_thread_columns()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.kenh = 'facebook' THEN
    NEW.conversation_id := COALESCE(NEW.conversation_id, NEW.metadata->>'conversation_id');
    NEW.from_platform_user_id := COALESCE(NEW.from_platform_user_id, NEW.metadata->'raw_message'->'from'->>'id');
    NEW.recipient_id := COALESCE(NEW.recipient_id, NEW.metadata->>'recipient_id');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_marketing_message_thread_columns ON public.marketing_messages;
CREATE TRIGGER trg_sync_marketing_message_thread_columns
BEFORE INSERT OR UPDATE OF kenh, metadata, conversation_id, from_platform_user_id, recipient_id
ON public.marketing_messages
FOR EACH ROW EXECUTE FUNCTION public.sync_marketing_message_thread_columns();

CREATE OR REPLACE FUNCTION public.backfill_marketing_message_thread_columns(p_limit integer DEFAULT 1000)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count integer := 0;
BEGIN
  WITH todo AS (
    SELECT id
    FROM public.marketing_messages
    WHERE kenh = 'facebook'
      AND (
        (conversation_id IS NULL AND metadata->>'conversation_id' IS NOT NULL)
        OR (from_platform_user_id IS NULL AND metadata->'raw_message'->'from'->>'id' IS NOT NULL)
        OR (recipient_id IS NULL AND metadata->>'recipient_id' IS NOT NULL)
      )
    ORDER BY created_at DESC
    LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 1000), 5000))
  )
  UPDATE public.marketing_messages mm
  SET
    conversation_id = COALESCE(mm.conversation_id, mm.metadata->>'conversation_id'),
    from_platform_user_id = COALESCE(mm.from_platform_user_id, mm.metadata->'raw_message'->'from'->>'id'),
    recipient_id = COALESCE(mm.recipient_id, mm.metadata->>'recipient_id')
  FROM todo
  WHERE mm.id = todo.id;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

CREATE INDEX IF NOT EXISTS idx_marketing_messages_fb_conversation_col_created
  ON public.marketing_messages (conversation_id, created_at DESC)
  WHERE kenh = 'facebook' AND conversation_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_marketing_messages_fb_from_col_created
  ON public.marketing_messages (from_platform_user_id, created_at DESC)
  WHERE kenh = 'facebook' AND from_platform_user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_marketing_messages_fb_recipient_col_created
  ON public.marketing_messages (recipient_id, created_at DESC)
  WHERE kenh = 'facebook' AND recipient_id IS NOT NULL;

CREATE OR REPLACE VIEW public.v_marketing_fanpage_message_thread_light AS
SELECT
  id,
  kenh,
  direction,
  sender_type,
  sender_name,
  noi_dung,
  trang_thai,
  sent_at,
  created_at,
  conversation_id,
  from_platform_user_id,
  recipient_id
FROM public.marketing_messages
WHERE kenh = 'facebook';

COMMENT ON VIEW public.v_marketing_fanpage_message_thread_light IS
  'View nhe cho Hop Thu Fanpage; dung cot/index thread rieng de doc hoi thoai nhanh, tranh quet JSONB.';

NOTIFY pgrst, 'reload schema';
