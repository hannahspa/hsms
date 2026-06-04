-- Migration 078: AI Marketing foundation
-- Muc tieu:
-- - Dua chien_dich_marketing vao migration chinh thuc neu truoc do chi tao thu cong.
-- - Tao duong do luong Marketing -> Lead -> Lich hen -> Don hang -> Doanh thu.
-- - Tao nen cho AI Inbox, lich noi dung, de xuat toi uu va tu dong hoa co phe duyet.

CREATE TABLE IF NOT EXISTS public.chien_dich_marketing (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ten                 text NOT NULL,
  kenh                text NOT NULL DEFAULT 'facebook'
                      CHECK (kenh IN ('facebook','zalo','tiktok','google','in_an','khac')),
  ngan_sach           integer DEFAULT 0,
  ngay_bat_dau        date NOT NULL DEFAULT CURRENT_DATE,
  ngay_ket_thuc       date,
  trang_thai          text DEFAULT 'active'
                      CHECK (trang_thai IN ('draft','active','ended')),
  mo_ta               text DEFAULT '',
  khuyen_mai_id       uuid REFERENCES public.khuyen_mai(id) ON DELETE SET NULL,
  so_luot_tiep_can    integer DEFAULT 0,
  so_kh_moi           integer DEFAULT 0,
  doanh_thu_uoc_tinh  integer DEFAULT 0,
  ghi_chu             text DEFAULT '',
  created_at          timestamptz DEFAULT now()
);

ALTER TABLE public.chien_dich_marketing
  ADD COLUMN IF NOT EXISTS external_campaign_id text,
  ADD COLUMN IF NOT EXISTS external_ad_account_id text,
  ADD COLUMN IF NOT EXISTS objective text,
  ADD COLUMN IF NOT EXISTS daily_budget integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS lifetime_budget integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS spend_limit integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ai_mode text NOT NULL DEFAULT 'manual'
    CHECK (ai_mode IN ('manual','suggest_only','auto_with_approval','auto_limited')),
  ADD COLUMN IF NOT EXISTS auto_rules jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS target_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS creative_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS last_synced_at timestamptz,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_cdm_kenh ON public.chien_dich_marketing(kenh);
CREATE INDEX IF NOT EXISTS idx_cdm_tt ON public.chien_dich_marketing(trang_thai);
CREATE INDEX IF NOT EXISTS idx_cdm_ngay ON public.chien_dich_marketing(ngay_bat_dau);
CREATE INDEX IF NOT EXISTS idx_cdm_external_campaign
  ON public.chien_dich_marketing(kenh, external_campaign_id)
  WHERE external_campaign_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_chien_dich_marketing_updated_at ON public.chien_dich_marketing;
CREATE TRIGGER trg_chien_dich_marketing_updated_at
BEFORE UPDATE ON public.chien_dich_marketing
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.marketing_leads (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chien_dich_id          uuid REFERENCES public.chien_dich_marketing(id) ON DELETE SET NULL,
  khuyen_mai_id          uuid REFERENCES public.khuyen_mai(id) ON DELETE SET NULL,
  khach_hang_id          uuid REFERENCES public.khach_hang(id) ON DELETE SET NULL,
  kenh                  text NOT NULL DEFAULT 'facebook'
                        CHECK (kenh IN ('facebook','zalo','tiktok','google','website','walk_in','in_an','khac')),
  nguon_chi_tiet         text,
  platform_lead_id       text,
  platform_user_id       text,
  ho_ten                 text,
  so_dien_thoai          text,
  email                  text,
  nhu_cau                text,
  dich_vu_quan_tam_id    uuid REFERENCES public.dich_vu(id) ON DELETE SET NULL,
  trang_thai             text NOT NULL DEFAULT 'moi'
                        CHECK (trang_thai IN (
                          'moi','dang_tu_van','da_dat_hen','da_den','da_mua',
                          'mat_co_hoi','spam'
                        )),
  diem_tiem_nang         integer NOT NULL DEFAULT 0 CHECK (diem_tiem_nang >= 0),
  gia_tri_du_kien        integer NOT NULL DEFAULT 0,
  first_message_at       timestamptz,
  last_message_at        timestamptz,
  ngay_tao               date NOT NULL DEFAULT CURRENT_DATE,
  gan_cho                uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ai_summary             text,
  ai_intent              text,
  ai_next_best_action    text,
  ghi_chu                text,
  utm                    jsonb NOT NULL DEFAULT '{}'::jsonb,
  metadata               jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at             timestamptz DEFAULT now(),
  updated_at             timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_marketing_leads_campaign ON public.marketing_leads(chien_dich_id);
CREATE INDEX IF NOT EXISTS idx_marketing_leads_customer ON public.marketing_leads(khach_hang_id);
CREATE INDEX IF NOT EXISTS idx_marketing_leads_phone ON public.marketing_leads(so_dien_thoai);
CREATE INDEX IF NOT EXISTS idx_marketing_leads_status ON public.marketing_leads(trang_thai);
CREATE INDEX IF NOT EXISTS idx_marketing_leads_kenh_ngay ON public.marketing_leads(kenh, ngay_tao);
CREATE UNIQUE INDEX IF NOT EXISTS uniq_marketing_leads_platform_lead
  ON public.marketing_leads(kenh, platform_lead_id)
  WHERE platform_lead_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_marketing_leads_platform_user
  ON public.marketing_leads(kenh, platform_user_id)
  WHERE platform_user_id IS NOT NULL;

DROP TRIGGER IF EXISTS trg_marketing_leads_updated_at ON public.marketing_leads;
CREATE TRIGGER trg_marketing_leads_updated_at
BEFORE UPDATE ON public.marketing_leads
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.marketing_messages (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id              uuid REFERENCES public.marketing_leads(id) ON DELETE SET NULL,
  kenh                text NOT NULL DEFAULT 'facebook'
                      CHECK (kenh IN ('facebook','zalo','tiktok','google','website','khac')),
  direction            text NOT NULL
                      CHECK (direction IN ('inbound','outbound','internal')),
  platform_message_id  text,
  sender_type          text NOT NULL DEFAULT 'customer'
                      CHECK (sender_type IN ('customer','staff','ai','system')),
  sender_name          text,
  noi_dung             text,
  attachments          jsonb NOT NULL DEFAULT '[]'::jsonb,
  ai_intent            text,
  ai_confidence        numeric,
  ai_suggested_reply   text,
  ai_safety_level      text NOT NULL DEFAULT 'normal'
                      CHECK (ai_safety_level IN ('normal','needs_review','blocked')),
  trang_thai           text NOT NULL DEFAULT 'received'
                      CHECK (trang_thai IN (
                        'received','draft','cho_duyet','approved','sent','failed','ignored'
                      )),
  handled_by           uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  sent_at              timestamptz,
  metadata             jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at           timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_marketing_messages_lead ON public.marketing_messages(lead_id);
CREATE INDEX IF NOT EXISTS idx_marketing_messages_kenh_created ON public.marketing_messages(kenh, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_marketing_messages_status ON public.marketing_messages(trang_thai);
CREATE UNIQUE INDEX IF NOT EXISTS uniq_marketing_messages_platform
  ON public.marketing_messages(kenh, platform_message_id)
  WHERE platform_message_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.marketing_campaign_daily_stats (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chien_dich_id          uuid REFERENCES public.chien_dich_marketing(id) ON DELETE CASCADE,
  ngay                  date NOT NULL,
  kenh                  text NOT NULL DEFAULT 'facebook'
                        CHECK (kenh IN ('facebook','zalo','tiktok','google','in_an','khac')),
  external_campaign_id   text,
  external_adset_id      text,
  external_ad_id         text,
  chi_phi               integer NOT NULL DEFAULT 0,
  impressions           integer NOT NULL DEFAULT 0,
  reach                 integer NOT NULL DEFAULT 0,
  clicks                integer NOT NULL DEFAULT 0,
  messages              integer NOT NULL DEFAULT 0,
  leads                 integer NOT NULL DEFAULT 0,
  appointments          integer NOT NULL DEFAULT 0,
  arrived               integer NOT NULL DEFAULT 0,
  orders                integer NOT NULL DEFAULT 0,
  revenue               integer NOT NULL DEFAULT 0,
  metadata              jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at            timestamptz DEFAULT now(),
  updated_at            timestamptz DEFAULT now(),
  UNIQUE (chien_dich_id, ngay, external_adset_id, external_ad_id)
);

CREATE INDEX IF NOT EXISTS idx_mkt_stats_campaign_day ON public.marketing_campaign_daily_stats(chien_dich_id, ngay);
CREATE INDEX IF NOT EXISTS idx_mkt_stats_kenh_day ON public.marketing_campaign_daily_stats(kenh, ngay);

DROP TRIGGER IF EXISTS trg_mkt_stats_updated_at ON public.marketing_campaign_daily_stats;
CREATE TRIGGER trg_mkt_stats_updated_at
BEFORE UPDATE ON public.marketing_campaign_daily_stats
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.marketing_content_calendar (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chien_dich_id      uuid REFERENCES public.chien_dich_marketing(id) ON DELETE SET NULL,
  khuyen_mai_id      uuid REFERENCES public.khuyen_mai(id) ON DELETE SET NULL,
  kenh              text NOT NULL DEFAULT 'facebook'
                    CHECK (kenh IN ('facebook','zalo','tiktok','google','website','khac')),
  tieu_de           text NOT NULL,
  loai_noi_dung     text NOT NULL DEFAULT 'bai_viet'
                    CHECK (loai_noi_dung IN ('bai_viet','hinh_anh','video','story','reel','quang_cao')),
  chu_de            text,
  noi_dung          text,
  hashtags          text[] NOT NULL DEFAULT ARRAY[]::text[],
  asset_urls        text[] NOT NULL DEFAULT ARRAY[]::text[],
  scheduled_at      timestamptz,
  published_at      timestamptz,
  trang_thai        text NOT NULL DEFAULT 'y_tuong'
                    CHECK (trang_thai IN (
                      'y_tuong','nhap','cho_duyet','da_duyet','da_dang','that_bai','huy'
                    )),
  ai_prompt         text,
  ai_notes          text,
  approved_by       uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_by        uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  metadata          jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mkt_content_campaign ON public.marketing_content_calendar(chien_dich_id);
CREATE INDEX IF NOT EXISTS idx_mkt_content_status ON public.marketing_content_calendar(trang_thai);
CREATE INDEX IF NOT EXISTS idx_mkt_content_schedule ON public.marketing_content_calendar(scheduled_at);

DROP TRIGGER IF EXISTS trg_mkt_content_updated_at ON public.marketing_content_calendar;
CREATE TRIGGER trg_mkt_content_updated_at
BEFORE UPDATE ON public.marketing_content_calendar
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.marketing_ai_actions (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action_type          text NOT NULL,
  scope                text NOT NULL DEFAULT 'marketing'
                      CHECK (scope IN ('marketing','inbox','content','ads','crm')),
  title                text NOT NULL,
  recommendation       text,
  ly_do                text,
  risk_level           text NOT NULL DEFAULT 'low'
                      CHECK (risk_level IN ('low','medium','high')),
  requires_approval    boolean NOT NULL DEFAULT true,
  trang_thai           text NOT NULL DEFAULT 'de_xuat'
                      CHECK (trang_thai IN (
                        'de_xuat','cho_duyet','da_duyet','tu_choi','dang_chay','da_chay','loi','huy'
                      )),
  chien_dich_id        uuid REFERENCES public.chien_dich_marketing(id) ON DELETE SET NULL,
  lead_id              uuid REFERENCES public.marketing_leads(id) ON DELETE SET NULL,
  message_id           uuid REFERENCES public.marketing_messages(id) ON DELETE SET NULL,
  content_id           uuid REFERENCES public.marketing_content_calendar(id) ON DELETE SET NULL,
  cost_impact          integer NOT NULL DEFAULT 0,
  proposed_payload     jsonb NOT NULL DEFAULT '{}'::jsonb,
  result_payload       jsonb NOT NULL DEFAULT '{}'::jsonb,
  approved_by          uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  approved_at          timestamptz,
  executed_at          timestamptz,
  error_message        text,
  created_at           timestamptz DEFAULT now(),
  updated_at           timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mkt_ai_actions_status ON public.marketing_ai_actions(trang_thai);
CREATE INDEX IF NOT EXISTS idx_mkt_ai_actions_campaign ON public.marketing_ai_actions(chien_dich_id);
CREATE INDEX IF NOT EXISTS idx_mkt_ai_actions_scope ON public.marketing_ai_actions(scope, created_at DESC);

DROP TRIGGER IF EXISTS trg_mkt_ai_actions_updated_at ON public.marketing_ai_actions;
CREATE TRIGGER trg_mkt_ai_actions_updated_at
BEFORE UPDATE ON public.marketing_ai_actions
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.marketing_approval_queue (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ai_action_id    uuid REFERENCES public.marketing_ai_actions(id) ON DELETE CASCADE,
  loai            text NOT NULL DEFAULT 'ai_action'
                  CHECK (loai IN ('ai_action','message_reply','content_publish','budget_change')),
  title           text NOT NULL,
  payload         jsonb NOT NULL DEFAULT '{}'::jsonb,
  trang_thai      text NOT NULL DEFAULT 'cho_duyet'
                  CHECK (trang_thai IN ('cho_duyet','da_duyet','tu_choi','huy')),
  requested_by    text NOT NULL DEFAULT 'ai',
  reviewed_by     uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at     timestamptz,
  ghi_chu_duyet   text,
  created_at      timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mkt_approval_status ON public.marketing_approval_queue(trang_thai, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mkt_approval_action ON public.marketing_approval_queue(ai_action_id);

CREATE TABLE IF NOT EXISTS public.marketing_rules (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ten             text NOT NULL,
  pham_vi         text NOT NULL DEFAULT 'ads'
                  CHECK (pham_vi IN ('ads','inbox','content','crm')),
  dieu_kien       jsonb NOT NULL DEFAULT '{}'::jsonb,
  hanh_dong       jsonb NOT NULL DEFAULT '{}'::jsonb,
  gioi_han        jsonb NOT NULL DEFAULT '{}'::jsonb,
  can_duyet       boolean NOT NULL DEFAULT true,
  is_active       boolean NOT NULL DEFAULT true,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mkt_rules_scope_active ON public.marketing_rules(pham_vi, is_active);

DROP TRIGGER IF EXISTS trg_mkt_rules_updated_at ON public.marketing_rules;
CREATE TRIGGER trg_mkt_rules_updated_at
BEFORE UPDATE ON public.marketing_rules
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.khach_hang
  ADD COLUMN IF NOT EXISTS marketing_lead_id uuid REFERENCES public.marketing_leads(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS chien_dich_marketing_id uuid REFERENCES public.chien_dich_marketing(id) ON DELETE SET NULL;

ALTER TABLE public.lich_hen
  ADD COLUMN IF NOT EXISTS marketing_lead_id uuid REFERENCES public.marketing_leads(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS chien_dich_marketing_id uuid REFERENCES public.chien_dich_marketing(id) ON DELETE SET NULL;

ALTER TABLE public.don_hang
  ADD COLUMN IF NOT EXISTS marketing_lead_id uuid REFERENCES public.marketing_leads(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS chien_dich_marketing_id uuid REFERENCES public.chien_dich_marketing(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_khach_hang_marketing_lead ON public.khach_hang(marketing_lead_id);
CREATE INDEX IF NOT EXISTS idx_khach_hang_marketing_campaign ON public.khach_hang(chien_dich_marketing_id);
CREATE INDEX IF NOT EXISTS idx_lich_hen_marketing_lead ON public.lich_hen(marketing_lead_id);
CREATE INDEX IF NOT EXISTS idx_lich_hen_marketing_campaign ON public.lich_hen(chien_dich_marketing_id);
CREATE INDEX IF NOT EXISTS idx_don_hang_marketing_lead ON public.don_hang(marketing_lead_id);
CREATE INDEX IF NOT EXISTS idx_don_hang_marketing_campaign ON public.don_hang(chien_dich_marketing_id);

CREATE OR REPLACE VIEW public.v_marketing_campaign_performance AS
WITH stats AS (
  SELECT
    chien_dich_id,
    COALESCE(SUM(chi_phi), 0)::integer AS chi_phi_thuc_te,
    COALESCE(SUM(impressions), 0)::integer AS impressions,
    COALESCE(SUM(reach), 0)::integer AS reach,
    COALESCE(SUM(clicks), 0)::integer AS clicks,
    COALESCE(SUM(messages), 0)::integer AS messages,
    COALESCE(SUM(leads), 0)::integer AS stat_leads,
    COALESCE(SUM(appointments), 0)::integer AS stat_appointments,
    COALESCE(SUM(orders), 0)::integer AS stat_orders,
    COALESCE(SUM(revenue), 0)::integer AS stat_revenue
  FROM public.marketing_campaign_daily_stats
  GROUP BY chien_dich_id
),
lead_counts AS (
  SELECT
    chien_dich_id,
    COUNT(*)::integer AS linked_leads
  FROM public.marketing_leads
  GROUP BY chien_dich_id
),
appointment_counts AS (
  SELECT
    COALESCE(lh.chien_dich_marketing_id, ml.chien_dich_id) AS chien_dich_id,
    COUNT(DISTINCT lh.id)::integer AS linked_appointments
  FROM public.lich_hen lh
  LEFT JOIN public.marketing_leads ml ON ml.id = lh.marketing_lead_id
  WHERE COALESCE(lh.chien_dich_marketing_id, ml.chien_dich_id) IS NOT NULL
  GROUP BY COALESCE(lh.chien_dich_marketing_id, ml.chien_dich_id)
),
order_counts AS (
  SELECT
    COALESCE(dh.chien_dich_marketing_id, ml.chien_dich_id) AS chien_dich_id,
    COUNT(DISTINCT dh.id)::integer AS linked_orders,
    COALESCE(SUM(dh.thuc_thu), 0)::integer AS linked_revenue
  FROM public.don_hang dh
  LEFT JOIN public.marketing_leads ml ON ml.id = dh.marketing_lead_id
  WHERE COALESCE(dh.chien_dich_marketing_id, ml.chien_dich_id) IS NOT NULL
    AND dh.trang_thai IN ('da_thanh_toan','no_mot_phan')
  GROUP BY COALESCE(dh.chien_dich_marketing_id, ml.chien_dich_id)
),
base AS (
  SELECT
    cd.id,
    cd.ten,
    cd.kenh,
    cd.trang_thai,
    cd.ngan_sach,
    cd.ngay_bat_dau,
    cd.ngay_ket_thuc,
    COALESCE(s.chi_phi_thuc_te, 0)::integer AS chi_phi_thuc_te,
    COALESCE(s.impressions, 0)::integer AS impressions,
    COALESCE(s.reach, 0)::integer AS reach,
    COALESCE(s.clicks, 0)::integer AS clicks,
    COALESCE(s.messages, 0)::integer AS messages,
    GREATEST(COALESCE(s.stat_leads, 0), COALESCE(lc.linked_leads, 0))::integer AS leads,
    GREATEST(COALESCE(s.stat_appointments, 0), COALESCE(ac.linked_appointments, 0))::integer AS appointments,
    GREATEST(COALESCE(s.stat_orders, 0), COALESCE(oc.linked_orders, 0))::integer AS orders,
    GREATEST(COALESCE(s.stat_revenue, 0), COALESCE(oc.linked_revenue, 0))::integer AS revenue
  FROM public.chien_dich_marketing cd
  LEFT JOIN stats s ON s.chien_dich_id = cd.id
  LEFT JOIN lead_counts lc ON lc.chien_dich_id = cd.id
  LEFT JOIN appointment_counts ac ON ac.chien_dich_id = cd.id
  LEFT JOIN order_counts oc ON oc.chien_dich_id = cd.id
)
SELECT
  *,
  CASE
    WHEN leads > 0 THEN ROUND(appointments::numeric / leads::numeric * 100, 2)
    ELSE 0
  END AS ty_le_dat_hen,
  CASE
    WHEN appointments > 0 THEN ROUND(orders::numeric / appointments::numeric * 100, 2)
    ELSE 0
  END AS ty_le_mua,
  CASE
    WHEN chi_phi_thuc_te > 0
    THEN ROUND((revenue::numeric - chi_phi_thuc_te::numeric) / chi_phi_thuc_te::numeric * 100, 2)
    ELSE NULL
  END AS roi
FROM base;

CREATE OR REPLACE VIEW public.v_marketing_lead_funnel AS
WITH message_counts AS (
  SELECT lead_id, COUNT(*)::integer AS so_tin_nhan
  FROM public.marketing_messages
  GROUP BY lead_id
),
appointment_counts AS (
  SELECT marketing_lead_id AS lead_id, COUNT(*)::integer AS so_lich_hen
  FROM public.lich_hen
  WHERE marketing_lead_id IS NOT NULL
  GROUP BY marketing_lead_id
),
order_counts AS (
  SELECT
    marketing_lead_id AS lead_id,
    COUNT(*)::integer AS so_don_hang,
    COALESCE(SUM(thuc_thu), 0)::integer AS doanh_thu
  FROM public.don_hang
  WHERE marketing_lead_id IS NOT NULL
    AND trang_thai IN ('da_thanh_toan','no_mot_phan')
  GROUP BY marketing_lead_id
)
SELECT
  ml.id,
  ml.kenh,
  ml.chien_dich_id,
  cd.ten AS ten_chien_dich,
  ml.trang_thai,
  ml.ngay_tao,
  ml.ho_ten,
  ml.so_dien_thoai,
  ml.ai_intent,
  ml.ai_next_best_action,
  COALESCE(mc.so_tin_nhan, 0)::integer AS so_tin_nhan,
  COALESCE(ac.so_lich_hen, 0)::integer AS so_lich_hen,
  COALESCE(oc.so_don_hang, 0)::integer AS so_don_hang,
  COALESCE(oc.doanh_thu, 0)::integer AS doanh_thu
FROM public.marketing_leads ml
LEFT JOIN public.chien_dich_marketing cd ON cd.id = ml.chien_dich_id
LEFT JOIN message_counts mc ON mc.lead_id = ml.id
LEFT JOIN appointment_counts ac ON ac.lead_id = ml.id
LEFT JOIN order_counts oc ON oc.lead_id = ml.id;

ALTER TABLE public.chien_dich_marketing ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_campaign_daily_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_content_calendar ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_ai_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_approval_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_all_chien_dich_marketing" ON public.chien_dich_marketing;
DROP POLICY IF EXISTS "admin_le_tan_all_chien_dich_marketing" ON public.chien_dich_marketing;
CREATE POLICY "admin_le_tan_all_chien_dich_marketing" ON public.chien_dich_marketing
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.vai_tro IN ('admin','le_tan')
    )
  );

DROP POLICY IF EXISTS "admin_le_tan_all_marketing_leads" ON public.marketing_leads;
CREATE POLICY "admin_le_tan_all_marketing_leads" ON public.marketing_leads
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.vai_tro IN ('admin','le_tan')
    )
  );

DROP POLICY IF EXISTS "admin_le_tan_all_marketing_messages" ON public.marketing_messages;
CREATE POLICY "admin_le_tan_all_marketing_messages" ON public.marketing_messages
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.vai_tro IN ('admin','le_tan')
    )
  );

DROP POLICY IF EXISTS "admin_le_tan_all_marketing_content" ON public.marketing_content_calendar;
CREATE POLICY "admin_le_tan_all_marketing_content" ON public.marketing_content_calendar
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.vai_tro IN ('admin','le_tan')
    )
  );

DROP POLICY IF EXISTS "admin_all_marketing_stats" ON public.marketing_campaign_daily_stats;
CREATE POLICY "admin_all_marketing_stats" ON public.marketing_campaign_daily_stats
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.vai_tro = 'admin'
    )
  );

DROP POLICY IF EXISTS "admin_all_marketing_ai_actions" ON public.marketing_ai_actions;
CREATE POLICY "admin_all_marketing_ai_actions" ON public.marketing_ai_actions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.vai_tro = 'admin'
    )
  );

DROP POLICY IF EXISTS "admin_all_marketing_approval_queue" ON public.marketing_approval_queue;
CREATE POLICY "admin_all_marketing_approval_queue" ON public.marketing_approval_queue
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.vai_tro = 'admin'
    )
  );

DROP POLICY IF EXISTS "admin_all_marketing_rules" ON public.marketing_rules;
CREATE POLICY "admin_all_marketing_rules" ON public.marketing_rules
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.vai_tro = 'admin'
    )
  );

COMMENT ON TABLE public.marketing_leads IS 'Lead marketing: diem noi Marketing -> CRM -> Lich hen -> POS.';
COMMENT ON TABLE public.marketing_messages IS 'Tin nhan vao/ra tu Facebook, Zalo, website va goi y tra loi cua AI.';
COMMENT ON TABLE public.marketing_campaign_daily_stats IS 'So lieu ngay cua chien dich/quang cao de tinh funnel va ROI.';
COMMENT ON TABLE public.marketing_content_calendar IS 'Lich noi dung do nguoi dung hoac AI tao, co trang thai phe duyet.';
COMMENT ON TABLE public.marketing_ai_actions IS 'Nhat ky hanh dong/de xuat cua AI Marketing, phuc vu tu dong hoa co kiem soat.';
COMMENT ON TABLE public.marketing_approval_queue IS 'Hang cho duyet cho hanh dong AI co rui ro: tra loi, dang bai, doi ngan sach.';
COMMENT ON TABLE public.marketing_rules IS 'Luat gioi han tu dong hoa Marketing: dieu kien, hanh dong, gioi han va yeu cau duyet.';
