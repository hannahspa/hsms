-- Migration 093: Fanpage data depth
-- Them chi so talking_about_count va sua view tong quan de aggregate khong bi nhan doi.

ALTER TABLE public.marketing_connected_pages
ADD COLUMN IF NOT EXISTS talking_about_count integer DEFAULT 0;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_marketing_messages_platform_all
  ON public.marketing_messages(kenh, platform_message_id);

CREATE OR REPLACE VIEW public.v_marketing_fanpage_overview AS
WITH post_stats AS (
  SELECT
    connected_page_id,
    COUNT(*)::integer AS so_bai_viet,
    COALESCE(SUM(reactions_count), 0)::integer AS tong_tuong_tac,
    COALESCE(SUM(comments_count), 0)::integer AS tong_comment,
    MAX(created_time) AS bai_moi_nhat_at
  FROM public.marketing_page_posts
  GROUP BY connected_page_id
),
comment_stats AS (
  SELECT
    connected_page_id,
    COUNT(*)::integer AS so_binh_luan
  FROM public.marketing_page_comments
  GROUP BY connected_page_id
)
SELECT
  p.id,
  p.kenh,
  p.page_id,
  p.page_name,
  p.page_url,
  p.avatar_url,
  p.fan_count,
  p.followers_count,
  p.webhook_enabled,
  p.sync_enabled,
  p.ads_enabled,
  p.last_synced_at,
  COALESCE(ps.so_bai_viet, 0)::integer AS so_bai_viet,
  COALESCE(cs.so_binh_luan, 0)::integer AS so_binh_luan,
  COALESCE(ps.tong_tuong_tac, 0)::integer AS tong_tuong_tac,
  COALESCE(ps.tong_comment, 0)::integer AS tong_comment,
  ps.bai_moi_nhat_at,
  p.talking_about_count
FROM public.marketing_connected_pages p
LEFT JOIN post_stats ps ON ps.connected_page_id = p.id
LEFT JOIN comment_stats cs ON cs.connected_page_id = p.id;

COMMENT ON COLUMN public.marketing_connected_pages.talking_about_count IS
  'Chi so talking_about_count tu Meta Page fields, dung lam metric on dinh khi Page Insights metric cu bi loai.';
