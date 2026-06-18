-- Migration 107: Lightweight indexes for HSMS Fanpage inbox
-- Muc tieu: khong de UI quet JSONB marketing_messages bang full scan khi mo hoi thoai.

CREATE INDEX IF NOT EXISTS idx_marketing_messages_conversation_created
  ON public.marketing_messages ((metadata->>'conversation_id'), created_at DESC)
  WHERE kenh = 'facebook' AND metadata ? 'conversation_id';

CREATE INDEX IF NOT EXISTS idx_marketing_messages_sender_created
  ON public.marketing_messages ((metadata->'raw_message'->'from'->>'id'), created_at DESC)
  WHERE kenh = 'facebook' AND metadata ? 'raw_message';

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
  metadata->>'conversation_id' AS conversation_id,
  metadata->'raw_message'->'from'->>'id' AS from_platform_user_id,
  metadata->>'recipient_id' AS recipient_id
FROM public.marketing_messages
WHERE kenh = 'facebook';

COMMENT ON VIEW public.v_marketing_fanpage_message_thread_light IS
  'View nhe cho hop thu Fanpage HSMS; dung kem index conversation_id de doc hoi thoai nhanh, tranh quet kho tin tho.';

NOTIFY pgrst, 'reload schema';
