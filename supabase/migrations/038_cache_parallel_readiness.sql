-- 038_cache_parallel_readiness.sql
-- Cache readiness metrics for REST/UI performance.

DROP VIEW IF EXISTS v_hsms_parallel_readiness_status;
DROP VIEW IF EXISTS v_hsms_parallel_readiness_summary;

CREATE TABLE IF NOT EXISTS v_hsms_parallel_readiness_summary (
  metric text PRIMARY KEY,
  value numeric NOT NULL DEFAULT 0,
  expected numeric NOT NULL DEFAULT 0,
  diff numeric NOT NULL DEFAULT 0,
  note text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS v_hsms_parallel_readiness_status (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  core_status text NOT NULL,
  card_review_needed numeric NOT NULL DEFAULT 0,
  active_expired_cards numeric NOT NULL DEFAULT 0,
  overused_cards numeric NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

TRUNCATE v_hsms_parallel_readiness_summary;
TRUNCATE v_hsms_parallel_readiness_status;

WITH card_audit AS (
  SELECT audit_status, so_the, gia_tri
  FROM v_myspa_legacy_card_audit
),
history AS (
  SELECT COUNT(*) AS rows
  FROM lich_su_dich_vu_kh
),
ledger_diff AS (
  SELECT COALESCE(SUM(ABS(chenh_lech)), 0) AS abs_diff
  FROM v_myspa_commission_vs_current_ledger_summary
  WHERE chenh_lech <> 0
),
metrics AS (
  SELECT
    'customers_locked'::text AS metric,
    (SELECT COUNT(*)::numeric FROM khach_hang WHERE ma_kh IS NOT NULL) AS value,
    5965::numeric AS expected,
    5965::numeric - (SELECT COUNT(*)::numeric FROM khach_hang WHERE ma_kh IS NOT NULL) AS diff,
    'Khách hàng MySpa đã có trong HSMS'::text AS note
  UNION ALL
  SELECT
    'orders_locked',
    (SELECT COUNT(*)::numeric FROM don_hang WHERE ngay <= date '2026-04-30' AND COALESCE(is_test, false) = false),
    43864::numeric,
    43864::numeric - (SELECT COUNT(*)::numeric FROM don_hang WHERE ngay <= date '2026-04-30' AND COALESCE(is_test, false) = false),
    'Đơn hàng MySpa đến 30/04/2026'
  UNION ALL
  SELECT
    'order_lines_locked',
    (SELECT COUNT(*)::numeric FROM don_hang_chi_tiet dhct JOIN don_hang dh ON dh.id = dhct.don_hang_id WHERE dh.ngay <= date '2026-04-30' AND COALESCE(dh.is_test, false) = false),
    68956::numeric,
    68956::numeric - (SELECT COUNT(*)::numeric FROM don_hang_chi_tiet dhct JOIN don_hang dh ON dh.id = dhct.don_hang_id WHERE dh.ngay <= date '2026-04-30' AND COALESCE(dh.is_test, false) = false),
    'Dòng dịch vụ/sản phẩm trong đơn MySpa'
  UNION ALL
  SELECT
    'cards_locked',
    (SELECT COUNT(*)::numeric FROM the_lieu_trinh WHERE ngay_mua <= date '2026-04-30'),
    4684::numeric,
    4684::numeric - (SELECT COUNT(*)::numeric FROM the_lieu_trinh WHERE ngay_mua <= date '2026-04-30'),
    'Thẻ liệu trình MySpa đến 30/04/2026'
  UNION ALL
  SELECT 'commission_diff', 0::numeric, 0::numeric, (SELECT abs_diff::numeric FROM ledger_diff), 'Chênh lệch Tour/Hoa hồng MySpa vs HSMS'
  UNION ALL
  SELECT 'crm_history_rows', (SELECT rows::numeric FROM history), 68956::numeric, 68956::numeric - (SELECT rows::numeric FROM history), 'Lịch sử CRM từ chi tiết đơn hàng'
  UNION ALL
  SELECT 'card_review_needed', COALESCE((SELECT SUM(so_the)::numeric FROM card_audit WHERE audit_status <> 'ok'), 0), 0::numeric, COALESCE((SELECT SUM(so_the)::numeric FROM card_audit WHERE audit_status <> 'ok'), 0), 'Thẻ cần rà tay trước go-live'
  UNION ALL
  SELECT 'active_expired_cards', COALESCE((SELECT SUM(so_the)::numeric FROM card_audit WHERE audit_status = 'active_but_expired'), 0), 0::numeric, COALESCE((SELECT SUM(so_the)::numeric FROM card_audit WHERE audit_status = 'active_but_expired'), 0), 'Thẻ active nhưng đã hết hạn'
  UNION ALL
  SELECT 'overused_cards', COALESCE((SELECT SUM(so_the)::numeric FROM card_audit WHERE audit_status = 'used_more_than_total'), 0), 0::numeric, COALESCE((SELECT SUM(so_the)::numeric FROM card_audit WHERE audit_status = 'used_more_than_total'), 0), 'Thẻ dùng vượt số buổi'
)
INSERT INTO v_hsms_parallel_readiness_summary (metric, value, expected, diff, note)
SELECT metric, value, expected, diff, note
FROM metrics;

INSERT INTO v_hsms_parallel_readiness_status (core_status, card_review_needed, active_expired_cards, overused_cards)
SELECT
  CASE
    WHEN COALESCE(SUM(ABS(diff)) FILTER (WHERE metric IN ('customers_locked', 'orders_locked', 'order_lines_locked', 'cards_locked', 'commission_diff', 'crm_history_rows')), 0) = 0
    THEN 'core_locked'
    ELSE 'need_fix'
  END,
  COALESCE(SUM(value) FILTER (WHERE metric = 'card_review_needed'), 0),
  COALESCE(SUM(value) FILTER (WHERE metric = 'active_expired_cards'), 0),
  COALESCE(SUM(value) FILTER (WHERE metric = 'overused_cards'), 0)
FROM v_hsms_parallel_readiness_summary;

GRANT SELECT ON v_hsms_parallel_readiness_summary TO anon, authenticated;
GRANT SELECT ON v_hsms_parallel_readiness_status TO anon, authenticated;
