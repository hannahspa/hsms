-- Migration 094: Marketing health and attribution views
-- Tao cac view doc suc khoe Fanpage, ty le khach moi/cu va nhom remarketing.

CREATE OR REPLACE VIEW public.v_marketing_customer_monthly_mix AS
WITH valid_orders AS (
  SELECT id, khach_hang_id, ngay, thuc_thu
  FROM public.don_hang
  WHERE COALESCE(is_test, false) = false
    AND COALESCE(trang_thai, '') <> 'huy'
    AND khach_hang_id IS NOT NULL
),
first_seen AS (
  SELECT khach_hang_id, MIN(ngay) AS first_order_date
  FROM valid_orders
  GROUP BY khach_hang_id
)
SELECT
  DATE_TRUNC('month', o.ngay)::date AS thang,
  COUNT(*)::integer AS so_don,
  COUNT(DISTINCT o.khach_hang_id)::integer AS so_khach,
  COUNT(DISTINCT o.khach_hang_id) FILTER (
    WHERE f.first_order_date >= DATE_TRUNC('month', o.ngay)::date
      AND f.first_order_date < DATE_TRUNC('month', o.ngay)::date + INTERVAL '1 month'
  )::integer AS khach_moi,
  COUNT(DISTINCT o.khach_hang_id) FILTER (
    WHERE f.first_order_date < DATE_TRUNC('month', o.ngay)::date
  )::integer AS khach_cu,
  ROUND(
    COUNT(DISTINCT o.khach_hang_id) FILTER (
      WHERE f.first_order_date >= DATE_TRUNC('month', o.ngay)::date
        AND f.first_order_date < DATE_TRUNC('month', o.ngay)::date + INTERVAL '1 month'
    )::numeric / NULLIF(COUNT(DISTINCT o.khach_hang_id), 0) * 100,
    1
  ) AS ty_le_khach_moi,
  COALESCE(SUM(o.thuc_thu), 0)::bigint AS thuc_thu
FROM valid_orders o
JOIN first_seen f ON f.khach_hang_id = o.khach_hang_id
GROUP BY 1;

CREATE OR REPLACE VIEW public.v_marketing_reactivation_segments AS
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
),
segmented AS (
  SELECT
    CASE
      WHEN v.last_order_date < CURRENT_DATE - INTERVAL '365 days' THEN 'tren_365_ngay'
      WHEN v.last_order_date < CURRENT_DATE - INTERVAL '180 days' THEN '180_365_ngay'
      WHEN v.last_order_date < CURRENT_DATE - INTERVAL '90 days' THEN '90_180_ngay'
      WHEN v.last_order_date < CURRENT_DATE - INTERVAL '45 days' THEN '45_90_ngay'
      ELSE 'dang_hoat_dong'
    END AS nhom,
    v.*,
    COALESCE(c.active_cards, 0) AS active_cards,
    COALESCE(c.remaining_sessions, 0) AS remaining_sessions
  FROM valid_orders v
  LEFT JOIN cards c ON c.khach_hang_id = v.khach_hang_id
)
SELECT
  nhom,
  COUNT(*)::integer AS so_khach,
  COUNT(*) FILTER (WHERE active_cards > 0 OR remaining_sessions > 0)::integer AS co_the_lieu_trinh_con,
  COALESCE(SUM(total_revenue), 0)::bigint AS tong_chi_tieu
FROM segmented
GROUP BY nhom;

CREATE OR REPLACE VIEW public.v_marketing_fanpage_health AS
WITH msg AS (
  SELECT
    COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '7 days') AS messages_7d,
    COUNT(*) FILTER (WHERE direction = 'inbound' AND created_at >= CURRENT_DATE - INTERVAL '7 days') AS inbound_7d,
    COUNT(DISTINCT metadata->>'conversation_id') FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '7 days') AS conversations_7d,
    COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '30 days') AS messages_30d,
    COUNT(*) FILTER (WHERE direction = 'inbound' AND created_at >= CURRENT_DATE - INTERVAL '30 days') AS inbound_30d,
    COUNT(DISTINCT metadata->>'conversation_id') FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '30 days') AS conversations_30d,
    COUNT(*) FILTER (WHERE direction = 'inbound' AND lead_id IS NULL) AS inbound_chua_gan_lead
  FROM public.marketing_messages
  WHERE kenh = 'facebook'
),
posts AS (
  SELECT
    COUNT(*) AS total_posts,
    COUNT(*) FILTER (WHERE created_time >= CURRENT_DATE - INTERVAL '30 days') AS posts_30d,
    COALESCE(SUM(comments_count), 0) AS total_post_comments,
    COALESCE(SUM(reactions_count), 0) AS total_reactions
  FROM public.marketing_page_posts
  WHERE kenh = 'facebook'
),
comments AS (
  SELECT
    COUNT(*) AS total_comments,
    COUNT(*) FILTER (WHERE created_time >= CURRENT_DATE - INTERVAL '30 days') AS comments_30d,
    COUNT(*) FILTER (WHERE lead_id IS NULL) AS comments_chua_gan_lead
  FROM public.marketing_page_comments
  WHERE kenh = 'facebook'
),
orders AS (
  SELECT
    COUNT(*) AS orders_2026,
    COUNT(*) FILTER (WHERE marketing_lead_id IS NOT NULL) AS orders_with_lead,
    COUNT(*) FILTER (WHERE chien_dich_marketing_id IS NOT NULL) AS orders_with_campaign
  FROM public.don_hang
  WHERE ngay >= DATE '2026-01-01'
    AND COALESCE(is_test, false) = false
    AND COALESCE(trang_thai, '') <> 'huy'
)
SELECT
  p.id,
  p.page_id,
  p.page_name,
  p.followers_count,
  p.talking_about_count,
  p.last_synced_at,
  COALESCE(msg.messages_7d, 0)::integer AS messages_7d,
  COALESCE(msg.inbound_7d, 0)::integer AS inbound_7d,
  COALESCE(msg.conversations_7d, 0)::integer AS conversations_7d,
  COALESCE(msg.messages_30d, 0)::integer AS messages_30d,
  COALESCE(msg.inbound_30d, 0)::integer AS inbound_30d,
  COALESCE(msg.conversations_30d, 0)::integer AS conversations_30d,
  COALESCE(msg.inbound_chua_gan_lead, 0)::integer AS inbound_chua_gan_lead,
  COALESCE(posts.total_posts, 0)::integer AS total_posts,
  COALESCE(posts.posts_30d, 0)::integer AS posts_30d,
  COALESCE(posts.total_post_comments, 0)::integer AS total_post_comments,
  COALESCE(posts.total_reactions, 0)::integer AS total_reactions,
  COALESCE(comments.total_comments, 0)::integer AS total_comments,
  COALESCE(comments.comments_30d, 0)::integer AS comments_30d,
  COALESCE(comments.comments_chua_gan_lead, 0)::integer AS comments_chua_gan_lead,
  COALESCE(orders.orders_2026, 0)::integer AS orders_2026,
  COALESCE(orders.orders_with_lead, 0)::integer AS orders_with_lead,
  COALESCE(orders.orders_with_campaign, 0)::integer AS orders_with_campaign
FROM public.marketing_connected_pages p
CROSS JOIN msg
CROSS JOIN posts
CROSS JOIN comments
CROSS JOIN orders
WHERE p.kenh = 'facebook';

COMMENT ON VIEW public.v_marketing_fanpage_health IS
  'Suc khoe Fanpage va khoang trong attribution: inbox, comment, bai viet, don hang da gan lead/campaign.';
