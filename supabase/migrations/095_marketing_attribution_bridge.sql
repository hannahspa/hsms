-- Migration 095: Marketing attribution bridge
-- Noi lead Fanpage voi khach hang, lich hen va don hang bang so dien thoai chuan hoa.

CREATE OR REPLACE FUNCTION public.normalize_vn_phone(p_phone text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN p_phone IS NULL THEN NULL
    WHEN regexp_replace(p_phone, '\D', '', 'g') = '' THEN NULL
    WHEN regexp_replace(p_phone, '\D', '', 'g') LIKE '84%' AND length(regexp_replace(p_phone, '\D', '', 'g')) BETWEEN 10 AND 11
      THEN '0' || substring(regexp_replace(p_phone, '\D', '', 'g') from 3)
    ELSE regexp_replace(p_phone, '\D', '', 'g')
  END
$$;

CREATE INDEX IF NOT EXISTS idx_khach_hang_phone_norm
  ON public.khach_hang (public.normalize_vn_phone(so_dien_thoai));

CREATE INDEX IF NOT EXISTS idx_marketing_leads_phone_norm
  ON public.marketing_leads (public.normalize_vn_phone(so_dien_thoai));

CREATE INDEX IF NOT EXISTS idx_lich_hen_phone_norm
  ON public.lich_hen (public.normalize_vn_phone(sdt_khach));

CREATE OR REPLACE FUNCTION public.marketing_run_attribution_bridge(p_days_after integer DEFAULT 90)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_linked_customers integer := 0;
  v_updated_customers integer := 0;
  v_linked_appointments integer := 0;
  v_linked_orders integer := 0;
  v_leads_da_mua integer := 0;
  v_leads_da_dat_hen integer := 0;
BEGIN
  WITH kh_phone AS (
    SELECT DISTINCT ON (public.normalize_vn_phone(so_dien_thoai))
      id,
      public.normalize_vn_phone(so_dien_thoai) AS phone_norm
    FROM public.khach_hang
    WHERE public.normalize_vn_phone(so_dien_thoai) IS NOT NULL
    ORDER BY public.normalize_vn_phone(so_dien_thoai), created_at DESC
  ),
  matched AS (
    SELECT ml.id AS lead_id, kh.id AS khach_hang_id
    FROM public.marketing_leads ml
    JOIN kh_phone kh
      ON kh.phone_norm = public.normalize_vn_phone(ml.so_dien_thoai)
    WHERE ml.khach_hang_id IS NULL
      AND public.normalize_vn_phone(ml.so_dien_thoai) IS NOT NULL
  ),
  upd AS (
    UPDATE public.marketing_leads ml
    SET
      khach_hang_id = matched.khach_hang_id,
      metadata = COALESCE(ml.metadata, '{}'::jsonb) || jsonb_build_object(
        'attribution_bridge', jsonb_build_object(
          'matched_by', 'phone',
          'matched_at', now(),
          'khach_hang_id', matched.khach_hang_id
        )
      )
    FROM matched
    WHERE ml.id = matched.lead_id
    RETURNING ml.id
  )
  SELECT COUNT(*) INTO v_linked_customers FROM upd;

  WITH linked AS (
    SELECT id, khach_hang_id, chien_dich_id
    FROM public.marketing_leads
    WHERE khach_hang_id IS NOT NULL
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

  WITH linked AS (
    SELECT id, khach_hang_id, chien_dich_id, ngay_tao, so_dien_thoai
    FROM public.marketing_leads
    WHERE khach_hang_id IS NOT NULL OR public.normalize_vn_phone(so_dien_thoai) IS NOT NULL
  ),
  matched AS (
    SELECT lh.id AS lich_hen_id, linked.id AS lead_id, linked.chien_dich_id
    FROM public.lich_hen lh
    JOIN linked ON (
      (lh.khach_hang_id IS NOT NULL AND lh.khach_hang_id = linked.khach_hang_id)
      OR (
        lh.khach_hang_id IS NULL
        AND public.normalize_vn_phone(lh.sdt_khach) = public.normalize_vn_phone(linked.so_dien_thoai)
      )
    )
    WHERE lh.marketing_lead_id IS NULL
      AND lh.ngay_hen >= linked.ngay_tao
      AND lh.ngay_hen <= linked.ngay_tao + make_interval(days => p_days_after)
  ),
  upd AS (
    UPDATE public.lich_hen lh
    SET
      marketing_lead_id = matched.lead_id,
      chien_dich_marketing_id = COALESCE(lh.chien_dich_marketing_id, matched.chien_dich_id)
    FROM matched
    WHERE lh.id = matched.lich_hen_id
    RETURNING lh.id
  )
  SELECT COUNT(*) INTO v_linked_appointments FROM upd;

  WITH linked AS (
    SELECT id, khach_hang_id, chien_dich_id, ngay_tao
    FROM public.marketing_leads
    WHERE khach_hang_id IS NOT NULL
  ),
  matched AS (
    SELECT dh.id AS don_hang_id, linked.id AS lead_id, linked.chien_dich_id
    FROM public.don_hang dh
    JOIN linked ON linked.khach_hang_id = dh.khach_hang_id
    WHERE dh.marketing_lead_id IS NULL
      AND COALESCE(dh.is_test, false) = false
      AND COALESCE(dh.trang_thai, '') <> 'huy'
      AND dh.ngay >= linked.ngay_tao
      AND dh.ngay <= linked.ngay_tao + make_interval(days => p_days_after)
  ),
  upd AS (
    UPDATE public.don_hang dh
    SET
      marketing_lead_id = matched.lead_id,
      chien_dich_marketing_id = COALESCE(dh.chien_dich_marketing_id, matched.chien_dich_id)
    FROM matched
    WHERE dh.id = matched.don_hang_id
    RETURNING dh.id
  )
  SELECT COUNT(*) INTO v_linked_orders FROM upd;

  WITH bought AS (
    SELECT DISTINCT marketing_lead_id
    FROM public.don_hang
    WHERE marketing_lead_id IS NOT NULL
      AND COALESCE(is_test, false) = false
      AND COALESCE(trang_thai, '') <> 'huy'
  ),
  upd AS (
    UPDATE public.marketing_leads ml
    SET trang_thai = 'da_mua'
    FROM bought
    WHERE ml.id = bought.marketing_lead_id
      AND ml.trang_thai <> 'da_mua'
    RETURNING ml.id
  )
  SELECT COUNT(*) INTO v_leads_da_mua FROM upd;

  WITH booked AS (
    SELECT DISTINCT marketing_lead_id
    FROM public.lich_hen
    WHERE marketing_lead_id IS NOT NULL
  ),
  upd AS (
    UPDATE public.marketing_leads ml
    SET trang_thai = 'da_dat_hen'
    FROM booked
    WHERE ml.id = booked.marketing_lead_id
      AND ml.trang_thai IN ('moi','dang_tu_van')
    RETURNING ml.id
  )
  SELECT COUNT(*) INTO v_leads_da_dat_hen FROM upd;

  RETURN jsonb_build_object(
    'linked_customers', v_linked_customers,
    'updated_customers', v_updated_customers,
    'linked_appointments', v_linked_appointments,
    'linked_orders', v_linked_orders,
    'leads_da_mua', v_leads_da_mua,
    'leads_da_dat_hen', v_leads_da_dat_hen,
    'days_after', p_days_after
  );
END;
$$;

CREATE OR REPLACE VIEW public.v_marketing_attribution_pipeline AS
WITH lead_base AS (
  SELECT
    DATE_TRUNC('month', ml.ngay_tao)::date AS thang,
    ml.id,
    ml.khach_hang_id,
    ml.trang_thai,
    ml.diem_tiem_nang
  FROM public.marketing_leads ml
  WHERE ml.kenh = 'facebook'
),
appt AS (
  SELECT marketing_lead_id, COUNT(*) AS appointments
  FROM public.lich_hen
  WHERE marketing_lead_id IS NOT NULL
  GROUP BY marketing_lead_id
),
ord AS (
  SELECT
    marketing_lead_id,
    COUNT(*) AS orders,
    COALESCE(SUM(thuc_thu), 0) AS revenue
  FROM public.don_hang
  WHERE marketing_lead_id IS NOT NULL
    AND COALESCE(is_test, false) = false
    AND COALESCE(trang_thai, '') <> 'huy'
  GROUP BY marketing_lead_id
)
SELECT
  lb.thang,
  COUNT(*)::integer AS leads,
  COUNT(*) FILTER (WHERE lb.khach_hang_id IS NOT NULL)::integer AS linked_customers,
  COUNT(*) FILTER (WHERE lb.diem_tiem_nang >= 55)::integer AS hot_leads,
  COALESCE(SUM(appt.appointments), 0)::integer AS appointments,
  COALESCE(SUM(ord.orders), 0)::integer AS orders,
  COALESCE(SUM(ord.revenue), 0)::bigint AS revenue,
  ROUND(COUNT(*) FILTER (WHERE lb.khach_hang_id IS NOT NULL)::numeric / NULLIF(COUNT(*), 0) * 100, 1) AS ty_le_noi_khach,
  ROUND(COALESCE(SUM(ord.orders), 0)::numeric / NULLIF(COUNT(*), 0) * 100, 1) AS ty_le_mua
FROM lead_base lb
LEFT JOIN appt ON appt.marketing_lead_id = lb.id
LEFT JOIN ord ON ord.marketing_lead_id = lb.id
GROUP BY lb.thang;

CREATE OR REPLACE VIEW public.v_marketing_unmatched_leads AS
SELECT
  ml.id,
  ml.kenh,
  ml.ho_ten,
  ml.so_dien_thoai,
  public.normalize_vn_phone(ml.so_dien_thoai) AS phone_norm,
  ml.nhu_cau,
  ml.trang_thai,
  ml.diem_tiem_nang,
  ml.ai_intent,
  ml.ai_summary,
  ml.ai_next_best_action,
  ml.first_message_at,
  ml.last_message_at,
  ml.created_at,
  ml.metadata->>'conversation_id' AS conversation_id,
  ml.metadata
FROM public.marketing_leads ml
WHERE ml.kenh = 'facebook'
  AND ml.khach_hang_id IS NULL;

CREATE OR REPLACE VIEW public.v_marketing_reactivation_customers AS
WITH valid_orders AS (
  SELECT
    khach_hang_id,
    MAX(ngay) AS last_order_date,
    COUNT(*) AS total_orders,
    COALESCE(SUM(thuc_thu), 0) AS total_revenue
  FROM public.don_hang
  WHERE COALESCE(is_test, false) = false
    AND COALESCE(trang_thai, '') <> 'huy'
    AND khach_hang_id IS NOT NULL
  GROUP BY khach_hang_id
),
cards AS (
  SELECT
    khach_hang_id,
    COUNT(*) FILTER (
      WHERE trang_thai IN ('active','dang_su_dung','con_hieu_luc')
        OR COALESCE(so_buoi_con_lai, 0) > 0
    ) AS active_cards,
    COALESCE(SUM(so_buoi_con_lai), 0) AS remaining_sessions
  FROM public.the_lieu_trinh
  GROUP BY khach_hang_id
)
SELECT
  kh.id AS khach_hang_id,
  kh.ho_ten,
  kh.so_dien_thoai,
  kh.hang,
  v.last_order_date,
  (CURRENT_DATE - v.last_order_date)::integer AS so_ngay_chua_den,
  CASE
    WHEN v.last_order_date < CURRENT_DATE - INTERVAL '365 days' THEN 'tren_365_ngay'
    WHEN v.last_order_date < CURRENT_DATE - INTERVAL '180 days' THEN '180_365_ngay'
    WHEN v.last_order_date < CURRENT_DATE - INTERVAL '90 days' THEN '90_180_ngay'
    WHEN v.last_order_date < CURRENT_DATE - INTERVAL '45 days' THEN '45_90_ngay'
    ELSE 'dang_hoat_dong'
  END AS nhom,
  v.total_orders,
  v.total_revenue,
  COALESCE(c.active_cards, 0) AS active_cards,
  COALESCE(c.remaining_sessions, 0) AS remaining_sessions
FROM public.khach_hang kh
JOIN valid_orders v ON v.khach_hang_id = kh.id
LEFT JOIN cards c ON c.khach_hang_id = kh.id
WHERE v.last_order_date < CURRENT_DATE - INTERVAL '45 days'
ORDER BY so_ngay_chua_den DESC, v.total_revenue DESC;

COMMENT ON FUNCTION public.marketing_run_attribution_bridge(integer) IS
  'Noi lead marketing voi khach_hang, lich_hen va don_hang bang so dien thoai chuan hoa trong khoang ngay sau lead.';
