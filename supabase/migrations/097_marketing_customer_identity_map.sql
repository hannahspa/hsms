-- Migration 097: Customer identity map
-- Gan dinh danh Facebook/Zalo/conversation voi khach_hang va ma_kh de attribution khong phu thuoc tung tin nhan moi nhat.

CREATE TABLE IF NOT EXISTS public.marketing_customer_identities (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  khach_hang_id          uuid REFERENCES public.khach_hang(id) ON DELETE SET NULL,
  kenh                  text NOT NULL DEFAULT 'facebook'
                        CHECK (kenh IN ('facebook','zalo','tiktok','google','website','khac')),
  platform_user_id       text,
  conversation_id        text,
  phone_norm             text,
  display_name           text,
  ma_kh_snapshot         text,
  confidence             integer NOT NULL DEFAULT 100,
  source                 text NOT NULL DEFAULT 'auto_phone_match',
  first_seen_at          timestamptz,
  last_seen_at           timestamptz,
  metadata               jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at             timestamptz DEFAULT now(),
  updated_at             timestamptz DEFAULT now(),
  UNIQUE (kenh, conversation_id, platform_user_id, phone_norm)
);

CREATE INDEX IF NOT EXISTS idx_mkt_identity_customer
  ON public.marketing_customer_identities(khach_hang_id);
CREATE INDEX IF NOT EXISTS idx_mkt_identity_conversation
  ON public.marketing_customer_identities(kenh, conversation_id);
CREATE INDEX IF NOT EXISTS idx_mkt_identity_platform_user
  ON public.marketing_customer_identities(kenh, platform_user_id);
CREATE INDEX IF NOT EXISTS idx_mkt_identity_phone
  ON public.marketing_customer_identities(phone_norm);

DROP TRIGGER IF EXISTS trg_mkt_identity_updated_at ON public.marketing_customer_identities;
CREATE TRIGGER trg_mkt_identity_updated_at
BEFORE UPDATE ON public.marketing_customer_identities
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.marketing_customer_identities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_le_tan_all_marketing_identities" ON public.marketing_customer_identities;
CREATE POLICY "admin_le_tan_all_marketing_identities" ON public.marketing_customer_identities
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.vai_tro IN ('admin','le_tan')
    )
  );

CREATE OR REPLACE FUNCTION public.marketing_resolve_customer_identities()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_inserted integer := 0;
  v_linked_leads integer := 0;
  v_updated_customers integer := 0;
BEGIN
  WITH phone_messages AS (
    SELECT
      mm.id AS message_id,
      mm.lead_id,
      mm.kenh,
      mm.sender_name,
      mm.created_at,
      mm.metadata->>'conversation_id' AS conversation_id,
      mm.metadata->'raw_message'->'from'->>'id' AS platform_user_id,
      public.normalize_vn_phone(mm.noi_dung) AS phone_norm
    FROM public.marketing_messages mm
    WHERE mm.kenh = 'facebook'
      AND mm.direction = 'inbound'
      AND public.normalize_vn_phone(mm.noi_dung) IS NOT NULL
  ),
  matched AS (
    SELECT
      pm.*,
      kh.id AS khach_hang_id,
      kh.ma_kh,
      kh.ho_ten,
      kh.so_dien_thoai
    FROM phone_messages pm
    LEFT JOIN public.khach_hang kh
      ON public.normalize_vn_phone(kh.so_dien_thoai) = pm.phone_norm
  ),
  ins AS (
    INSERT INTO public.marketing_customer_identities (
      khach_hang_id,
      kenh,
      platform_user_id,
      conversation_id,
      phone_norm,
      display_name,
      ma_kh_snapshot,
      confidence,
      source,
      first_seen_at,
      last_seen_at,
      metadata
    )
    SELECT
      matched.khach_hang_id,
      matched.kenh,
      matched.platform_user_id,
      matched.conversation_id,
      matched.phone_norm,
      COALESCE(matched.ho_ten, matched.sender_name),
      matched.ma_kh,
      CASE WHEN matched.khach_hang_id IS NOT NULL THEN 100 ELSE 65 END,
      CASE WHEN matched.khach_hang_id IS NOT NULL THEN 'auto_phone_match' ELSE 'phone_captured_no_customer' END,
      MIN(matched.created_at),
      MAX(matched.created_at),
      jsonb_build_object(
        'message_ids', jsonb_agg(matched.message_id),
        'lead_ids', jsonb_agg(DISTINCT matched.lead_id) FILTER (WHERE matched.lead_id IS NOT NULL),
        'phone_source', 'inbound_message'
      )
    FROM matched
    GROUP BY
      matched.khach_hang_id,
      matched.kenh,
      matched.platform_user_id,
      matched.conversation_id,
      matched.phone_norm,
      COALESCE(matched.ho_ten, matched.sender_name),
      matched.ma_kh
    ON CONFLICT (kenh, conversation_id, platform_user_id, phone_norm)
    DO UPDATE SET
      khach_hang_id = COALESCE(EXCLUDED.khach_hang_id, marketing_customer_identities.khach_hang_id),
      display_name = COALESCE(EXCLUDED.display_name, marketing_customer_identities.display_name),
      ma_kh_snapshot = COALESCE(EXCLUDED.ma_kh_snapshot, marketing_customer_identities.ma_kh_snapshot),
      confidence = GREATEST(marketing_customer_identities.confidence, EXCLUDED.confidence),
      last_seen_at = GREATEST(marketing_customer_identities.last_seen_at, EXCLUDED.last_seen_at),
      metadata = marketing_customer_identities.metadata || EXCLUDED.metadata
    RETURNING id
  )
  SELECT COUNT(*) INTO v_inserted FROM ins;

  WITH identities AS (
    SELECT *
    FROM public.marketing_customer_identities
    WHERE kenh = 'facebook'
      AND khach_hang_id IS NOT NULL
  ),
  lead_matches AS (
    SELECT DISTINCT
      ml.id AS lead_id,
      i.khach_hang_id,
      i.phone_norm,
      i.ma_kh_snapshot,
      i.id AS identity_id
    FROM public.marketing_leads ml
    JOIN identities i ON (
      (ml.platform_user_id IS NOT NULL AND ml.platform_user_id = i.platform_user_id)
      OR (ml.metadata->>'conversation_id' IS NOT NULL AND ml.metadata->>'conversation_id' = i.conversation_id)
      OR EXISTS (
        SELECT 1
        FROM public.marketing_messages mm
        WHERE mm.lead_id = ml.id
          AND mm.metadata->>'conversation_id' = i.conversation_id
      )
    )
    WHERE ml.kenh = 'facebook'
      AND ml.khach_hang_id IS NULL
  ),
  upd AS (
    UPDATE public.marketing_leads ml
    SET
      khach_hang_id = lead_matches.khach_hang_id,
      so_dien_thoai = COALESCE(ml.so_dien_thoai, lead_matches.phone_norm),
      metadata = COALESCE(ml.metadata, '{}'::jsonb) || jsonb_build_object(
        'customer_identity', jsonb_build_object(
          'identity_id', lead_matches.identity_id,
          'matched_by', 'conversation_or_platform_user',
          'matched_at', now(),
          'ma_kh', lead_matches.ma_kh_snapshot
        )
      )
    FROM lead_matches
    WHERE ml.id = lead_matches.lead_id
    RETURNING ml.id
  )
  SELECT COUNT(*) INTO v_linked_leads FROM upd;

  WITH linked AS (
    SELECT id, khach_hang_id, chien_dich_id
    FROM public.marketing_leads
    WHERE kenh = 'facebook'
      AND khach_hang_id IS NOT NULL
  ),
  upd AS (
    UPDATE public.khach_hang kh
    SET
      marketing_lead_id = COALESCE(kh.marketing_lead_id, linked.id),
      chien_dich_marketing_id = COALESCE(kh.chien_dich_marketing_id, linked.chien_dich_id)
    FROM linked
    WHERE kh.id = linked.khach_hang_id
      AND (kh.marketing_lead_id IS NULL OR kh.chien_dich_marketing_id IS NULL)
    RETURNING kh.id
  )
  SELECT COUNT(*) INTO v_updated_customers FROM upd;

  RETURN jsonb_build_object(
    'identities_upserted', v_inserted,
    'linked_leads', v_linked_leads,
    'updated_customers', v_updated_customers
  );
END;
$$;

CREATE OR REPLACE VIEW public.v_marketing_customer_identity_map AS
SELECT
  i.id,
  i.kenh,
  i.platform_user_id,
  i.conversation_id,
  i.phone_norm,
  i.display_name,
  i.confidence,
  i.source,
  i.first_seen_at,
  i.last_seen_at,
  kh.id AS khach_hang_id,
  kh.ma_kh,
  kh.ho_ten,
  kh.so_dien_thoai,
  kh.lan_cuoi_den,
  kh.tong_chi_tieu,
  kh.so_lan_den,
  kh.hang
FROM public.marketing_customer_identities i
LEFT JOIN public.khach_hang kh ON kh.id = i.khach_hang_id;

COMMENT ON TABLE public.marketing_customer_identities IS
  'Ban do dinh danh da kenh: Facebook/Zalo platform user/conversation/phone -> khach_hang/ma_kh.';
