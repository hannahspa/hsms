-- Migration 090: Marketing Fanpage Intelligence
-- Muc tieu: ket noi va dong bo thong tin Fanpage truoc, chua tu chay quang cao.

CREATE EXTENSION IF NOT EXISTS supabase_vault WITH SCHEMA vault;

CREATE OR REPLACE FUNCTION public.marketing_create_vault_secret(
  p_secret_value text,
  p_secret_name text,
  p_description text DEFAULT ''
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM vault.create_secret(p_secret_value, p_secret_name, p_description);
  RETURN p_secret_name;
END;
$$;

CREATE TABLE IF NOT EXISTS public.marketing_connected_pages (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kenh                      text NOT NULL DEFAULT 'facebook'
                            CHECK (kenh IN ('facebook','instagram','zalo','khac')),
  page_id                   text NOT NULL,
  page_name                 text NOT NULL,
  username                  text,
  page_url                  text,
  avatar_url                text,
  cover_url                 text,
  category                  text,
  about                     text,
  fan_count                 integer DEFAULT 0,
  followers_count           integer DEFAULT 0,
  page_access_token_secret  text,
  webhook_enabled           boolean NOT NULL DEFAULT false,
  sync_enabled              boolean NOT NULL DEFAULT true,
  ads_enabled               boolean NOT NULL DEFAULT false,
  last_synced_at            timestamptz,
  metadata                  jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at                timestamptz DEFAULT now(),
  updated_at                timestamptz DEFAULT now(),
  UNIQUE (kenh, page_id)
);

CREATE INDEX IF NOT EXISTS idx_mkt_pages_sync
  ON public.marketing_connected_pages(sync_enabled, last_synced_at DESC);

DROP TRIGGER IF EXISTS trg_mkt_pages_updated_at ON public.marketing_connected_pages;
CREATE TRIGGER trg_mkt_pages_updated_at
BEFORE UPDATE ON public.marketing_connected_pages
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.marketing_page_posts (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  connected_page_id      uuid REFERENCES public.marketing_connected_pages(id) ON DELETE CASCADE,
  kenh                  text NOT NULL DEFAULT 'facebook',
  page_id               text NOT NULL,
  platform_post_id      text NOT NULL,
  permalink_url         text,
  message               text,
  story                 text,
  post_type             text,
  status_type           text,
  full_picture          text,
  created_time          timestamptz,
  shares_count          integer DEFAULT 0,
  comments_count        integer DEFAULT 0,
  reactions_count       integer DEFAULT 0,
  insights              jsonb NOT NULL DEFAULT '{}'::jsonb,
  ai_summary            text,
  ai_quality_score      integer DEFAULT 0,
  ai_next_action        text,
  raw                   jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_synced_at        timestamptz DEFAULT now(),
  created_at            timestamptz DEFAULT now(),
  updated_at            timestamptz DEFAULT now(),
  UNIQUE (kenh, platform_post_id)
);

CREATE INDEX IF NOT EXISTS idx_mkt_posts_page_time
  ON public.marketing_page_posts(connected_page_id, created_time DESC);
CREATE INDEX IF NOT EXISTS idx_mkt_posts_quality
  ON public.marketing_page_posts(ai_quality_score DESC, created_time DESC);

DROP TRIGGER IF EXISTS trg_mkt_posts_updated_at ON public.marketing_page_posts;
CREATE TRIGGER trg_mkt_posts_updated_at
BEFORE UPDATE ON public.marketing_page_posts
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.marketing_page_comments (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  connected_page_id      uuid REFERENCES public.marketing_connected_pages(id) ON DELETE CASCADE,
  post_id               uuid REFERENCES public.marketing_page_posts(id) ON DELETE CASCADE,
  kenh                  text NOT NULL DEFAULT 'facebook',
  page_id               text NOT NULL,
  platform_comment_id   text NOT NULL,
  platform_post_id      text,
  parent_comment_id     text,
  from_id               text,
  from_name             text,
  message               text,
  comment_url           text,
  created_time          timestamptz,
  like_count            integer DEFAULT 0,
  comment_count         integer DEFAULT 0,
  sentiment             text,
  ai_intent             text,
  ai_suggested_reply    text,
  lead_id               uuid REFERENCES public.marketing_leads(id) ON DELETE SET NULL,
  raw                   jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_synced_at        timestamptz DEFAULT now(),
  created_at            timestamptz DEFAULT now(),
  updated_at            timestamptz DEFAULT now(),
  UNIQUE (kenh, platform_comment_id)
);

CREATE INDEX IF NOT EXISTS idx_mkt_comments_post_time
  ON public.marketing_page_comments(post_id, created_time DESC);
CREATE INDEX IF NOT EXISTS idx_mkt_comments_lead
  ON public.marketing_page_comments(lead_id);

DROP TRIGGER IF EXISTS trg_mkt_comments_updated_at ON public.marketing_page_comments;
CREATE TRIGGER trg_mkt_comments_updated_at
BEFORE UPDATE ON public.marketing_page_comments
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.marketing_page_insights (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  connected_page_id      uuid REFERENCES public.marketing_connected_pages(id) ON DELETE CASCADE,
  kenh                  text NOT NULL DEFAULT 'facebook',
  page_id               text NOT NULL,
  metric_name           text NOT NULL,
  period                text,
  metric_date           date,
  value                 numeric DEFAULT 0,
  raw                   jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at            timestamptz DEFAULT now(),
  UNIQUE (kenh, page_id, metric_name, period, metric_date)
);

CREATE INDEX IF NOT EXISTS idx_mkt_page_insights_metric
  ON public.marketing_page_insights(connected_page_id, metric_name, metric_date DESC);

CREATE OR REPLACE VIEW public.v_marketing_fanpage_overview AS
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
  COUNT(DISTINCT po.id)::integer AS so_bai_viet,
  COUNT(DISTINCT co.id)::integer AS so_binh_luan,
  COALESCE(SUM(po.reactions_count), 0)::integer AS tong_tuong_tac,
  COALESCE(SUM(po.comments_count), 0)::integer AS tong_comment,
  MAX(po.created_time) AS bai_moi_nhat_at
FROM public.marketing_connected_pages p
LEFT JOIN public.marketing_page_posts po ON po.connected_page_id = p.id
LEFT JOIN public.marketing_page_comments co ON co.connected_page_id = p.id
GROUP BY p.id;

ALTER TABLE public.marketing_connected_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_page_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_page_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_page_insights ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_le_tan_all_marketing_pages" ON public.marketing_connected_pages;
CREATE POLICY "admin_le_tan_all_marketing_pages" ON public.marketing_connected_pages
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.vai_tro IN ('admin','le_tan')
    )
  );

DROP POLICY IF EXISTS "admin_le_tan_all_marketing_posts" ON public.marketing_page_posts;
CREATE POLICY "admin_le_tan_all_marketing_posts" ON public.marketing_page_posts
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.vai_tro IN ('admin','le_tan')
    )
  );

DROP POLICY IF EXISTS "admin_le_tan_all_marketing_comments" ON public.marketing_page_comments;
CREATE POLICY "admin_le_tan_all_marketing_comments" ON public.marketing_page_comments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.vai_tro IN ('admin','le_tan')
    )
  );

DROP POLICY IF EXISTS "admin_le_tan_all_marketing_page_insights" ON public.marketing_page_insights;
CREATE POLICY "admin_le_tan_all_marketing_page_insights" ON public.marketing_page_insights
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.vai_tro IN ('admin','le_tan')
    )
  );

COMMENT ON TABLE public.marketing_connected_pages IS 'Fanpage/kenh da ket noi de dong bo thong tin, inbox, comment va insight. Chua bat Ads Automation.';
COMMENT ON TABLE public.marketing_page_posts IS 'Bai viet Fanpage dong bo tu Meta/Zalo de AI phan tich noi dung.';
COMMENT ON TABLE public.marketing_page_comments IS 'Binh luan Fanpage dong bo de AI phan loai lead va goi y tra loi.';
COMMENT ON TABLE public.marketing_page_insights IS 'Chi so Page/Post dong bo tu nen tang, phuc vu phan tich on dinh truoc khi chay ads.';
