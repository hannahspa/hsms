-- Migration 098: Marketing Customer 360
-- Ho so khach hang toan canh de van hanh marketing nhu mot phong Marketing that.

CREATE OR REPLACE VIEW public.v_marketing_customer_360 AS
WITH order_stats AS (
  SELECT
    khach_hang_id,
    COUNT(*)::integer AS total_orders,
    MAX(ngay) AS last_order_date,
    COALESCE(SUM(thuc_thu), 0)::bigint AS total_revenue,
    COUNT(*) FILTER (WHERE ngay >= CURRENT_DATE - INTERVAL '30 days')::integer AS orders_30d,
    COUNT(*) FILTER (WHERE ngay >= CURRENT_DATE - INTERVAL '90 days')::integer AS orders_90d
  FROM public.don_hang
  WHERE khach_hang_id IS NOT NULL
    AND COALESCE(is_test, false) = false
    AND COALESCE(trang_thai, '') <> 'huy'
  GROUP BY khach_hang_id
),
card_stats AS (
  SELECT
    khach_hang_id,
    COUNT(*)::integer AS total_cards,
    COUNT(*) FILTER (
      WHERE trang_thai IN ('active','dang_su_dung','con_hieu_luc')
        OR COALESCE(so_buoi_con_lai, 0) > 0
    )::integer AS active_cards,
    COALESCE(SUM(so_buoi_con_lai), 0)::integer AS remaining_sessions,
    MAX(ngay_mua) AS last_card_purchase_date
  FROM public.the_lieu_trinh
  GROUP BY khach_hang_id
),
lead_stats AS (
  SELECT
    khach_hang_id,
    COUNT(*)::integer AS total_leads,
    MAX(last_message_at) AS last_message_at,
    STRING_AGG(DISTINCT kenh, ', ') AS channels,
    MAX(diem_tiem_nang) AS max_lead_score,
    STRING_AGG(DISTINCT ai_intent, ', ') FILTER (WHERE ai_intent IS NOT NULL) AS intents,
    STRING_AGG(DISTINCT nguon_chi_tiet, ', ') FILTER (WHERE nguon_chi_tiet IS NOT NULL) AS source_details
  FROM public.marketing_leads
  WHERE khach_hang_id IS NOT NULL
  GROUP BY khach_hang_id
),
identity_stats AS (
  SELECT
    khach_hang_id,
    COUNT(*)::integer AS identity_count,
    STRING_AGG(DISTINCT kenh, ', ') AS identity_channels,
    MAX(last_seen_at) AS identity_last_seen_at
  FROM public.marketing_customer_identities
  WHERE khach_hang_id IS NOT NULL
  GROUP BY khach_hang_id
)
SELECT
  kh.id AS khach_hang_id,
  kh.ma_kh,
  kh.ho_ten,
  kh.so_dien_thoai,
  public.normalize_vn_phone(kh.so_dien_thoai) AS phone_norm,
  kh.hang,
  kh.nguon,
  kh.lan_cuoi_den,
  kh.tong_chi_tieu,
  kh.so_lan_den,
  kh.created_at AS customer_created_at,
  COALESCE(o.total_orders, 0) AS total_orders,
  o.last_order_date,
  COALESCE(o.total_revenue, 0) AS total_revenue,
  COALESCE(o.orders_30d, 0) AS orders_30d,
  COALESCE(o.orders_90d, 0) AS orders_90d,
  COALESCE(c.total_cards, 0) AS total_cards,
  COALESCE(c.active_cards, 0) AS active_cards,
  COALESCE(c.remaining_sessions, 0) AS remaining_sessions,
  c.last_card_purchase_date,
  COALESCE(l.total_leads, 0) AS total_leads,
  l.last_message_at,
  l.channels AS marketing_channels,
  l.source_details,
  COALESCE(l.max_lead_score, 0) AS max_lead_score,
  l.intents,
  COALESCE(i.identity_count, 0) AS identity_count,
  i.identity_channels,
  i.identity_last_seen_at,
  CASE
    WHEN o.last_order_date IS NULL THEN 'chua_co_don'
    WHEN o.last_order_date < CURRENT_DATE - INTERVAL '365 days' THEN 'winback_365'
    WHEN o.last_order_date < CURRENT_DATE - INTERVAL '180 days' THEN 'winback_180'
    WHEN o.last_order_date < CURRENT_DATE - INTERVAL '90 days' THEN 'winback_90'
    WHEN o.last_order_date < CURRENT_DATE - INTERVAL '45 days' THEN 'nhac_quay_lai'
    WHEN COALESCE(c.remaining_sessions, 0) <= 2 AND COALESCE(c.active_cards, 0) > 0 THEN 'sap_het_the'
    WHEN COALESCE(o.total_orders, 0) = 1 THEN 'khach_moi_can_cham'
    ELSE 'dang_hoat_dong'
  END AS marketing_segment,
  CASE
    WHEN COALESCE(c.remaining_sessions, 0) <= 2 AND COALESCE(c.active_cards, 0) > 0
      THEN 'Moi gia han the/lieu trinh phu hop truoc khi het buoi.'
    WHEN o.last_order_date < CURRENT_DATE - INTERVAL '90 days'
      THEN 'Chay chien dich comeback voi uu dai nhe va loi moi tu van lai nhu cau.'
    WHEN COALESCE(o.total_orders, 0) = 1
      THEN 'Cham soc sau lan dau, hoi trai nghiem va goi y lich tai cham.'
    WHEN COALESCE(l.max_lead_score, 0) >= 55 AND o.last_order_date IS NULL
      THEN 'Lead nong chua den, can xin so dien thoai va chot lich.'
    ELSE 'Theo doi va cham soc dinh ky.'
  END AS ai_next_best_action
FROM public.khach_hang kh
LEFT JOIN order_stats o ON o.khach_hang_id = kh.id
LEFT JOIN card_stats c ON c.khach_hang_id = kh.id
LEFT JOIN lead_stats l ON l.khach_hang_id = kh.id
LEFT JOIN identity_stats i ON i.khach_hang_id = kh.id;

CREATE OR REPLACE VIEW public.v_marketing_source_quality AS
WITH leads AS (
  SELECT
    COALESCE(kenh, 'khac') AS kenh,
    COALESCE(nguon_chi_tiet, 'khong_ro') AS nguon_chi_tiet,
    COUNT(*) AS leads,
    COUNT(*) FILTER (WHERE khach_hang_id IS NOT NULL) AS linked_customers,
    COUNT(*) FILTER (WHERE diem_tiem_nang >= 55) AS hot_leads
  FROM public.marketing_leads
  GROUP BY 1, 2
),
orders AS (
  SELECT
    COALESCE(ml.kenh, 'khac') AS kenh,
    COALESCE(ml.nguon_chi_tiet, 'khong_ro') AS nguon_chi_tiet,
    COUNT(dh.*) AS orders,
    COALESCE(SUM(dh.thuc_thu), 0) AS revenue
  FROM public.don_hang dh
  JOIN public.marketing_leads ml ON ml.id = dh.marketing_lead_id
  WHERE COALESCE(dh.is_test, false) = false
    AND COALESCE(dh.trang_thai, '') <> 'huy'
  GROUP BY 1, 2
)
SELECT
  l.kenh,
  l.nguon_chi_tiet,
  l.leads::integer,
  l.linked_customers::integer,
  l.hot_leads::integer,
  COALESCE(o.orders, 0)::integer AS orders,
  COALESCE(o.revenue, 0)::bigint AS revenue,
  ROUND(l.linked_customers::numeric / NULLIF(l.leads, 0) * 100, 1) AS ty_le_noi_khach,
  ROUND(COALESCE(o.orders, 0)::numeric / NULLIF(l.leads, 0) * 100, 1) AS ty_le_mua
FROM leads l
LEFT JOIN orders o ON o.kenh = l.kenh AND o.nguon_chi_tiet = l.nguon_chi_tiet;

COMMENT ON VIEW public.v_marketing_customer_360 IS
  'Ho so Customer 360 cho marketing: khach hang, don hang, the lieu trinh, lead, identity, segment va next best action.';
