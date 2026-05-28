-- 036_cache_myspa_commission_summaries.sql
-- Cache commission summary metrics so the admin UI does not run heavy
-- aggregate views through the REST API on every page load.

DROP VIEW IF EXISTS v_myspa_commission_lock_summary;
DROP VIEW IF EXISTS v_myspa_commission_apply_summary;

CREATE TABLE IF NOT EXISTS v_myspa_commission_lock_summary (
  metric text PRIMARY KEY,
  value numeric NOT NULL DEFAULT 0,
  amount numeric NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS v_myspa_commission_apply_summary (
  metric text PRIMARY KEY,
  value numeric NOT NULL DEFAULT 0,
  amount numeric NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

TRUNCATE v_myspa_commission_lock_summary;
TRUNCATE v_myspa_commission_apply_summary;

INSERT INTO v_myspa_commission_lock_summary (metric, value, amount)
SELECT 'commission_rows', COUNT(*)::numeric, COALESCE(SUM(tong_tien), 0)::numeric
FROM myspa_commission_detail
WHERE row_kind = 'detail'
UNION ALL
SELECT 'matched_orders', COUNT(*)::numeric, COALESCE(SUM(tong_tien), 0)::numeric
FROM myspa_commission_detail
WHERE row_kind = 'detail' AND don_hang_id IS NOT NULL
UNION ALL
SELECT 'matched_staff', COUNT(*)::numeric, COALESCE(SUM(tong_tien), 0)::numeric
FROM myspa_commission_detail
WHERE row_kind = 'detail' AND matched_nhan_vien_id IS NOT NULL
UNION ALL
SELECT 'unmatched_orders', COUNT(*)::numeric, COALESCE(SUM(tong_tien), 0)::numeric
FROM myspa_commission_detail
WHERE row_kind = 'detail' AND don_hang_id IS NULL
UNION ALL
SELECT 'unmatched_staff', COUNT(*)::numeric, COALESCE(SUM(tong_tien), 0)::numeric
FROM myspa_commission_detail
WHERE row_kind = 'detail' AND matched_nhan_vien_id IS NULL
UNION ALL
SELECT 'tour_amount', COUNT(*)::numeric, COALESCE(SUM(tien_tour_nv), 0)::numeric
FROM myspa_commission_detail
WHERE row_kind = 'detail' AND tien_tour_nv > 0
UNION ALL
SELECT 'commission_amount', COUNT(*)::numeric, COALESCE(SUM(commission_ngay_tim_kiem + commission_tong_don), 0)::numeric
FROM myspa_commission_detail
WHERE row_kind = 'detail' AND (commission_ngay_tim_kiem + commission_tong_don) > 0;

INSERT INTO v_myspa_commission_apply_summary (metric, value, amount)
SELECT 'backup_rows', COUNT(*)::numeric, COALESCE(SUM(so_tien), 0)::numeric
FROM nhan_vien_thu_nhap_backup_myspa_20260430
UNION ALL
SELECT 'applied_rows', COUNT(*)::numeric, COALESCE(SUM(so_tien), 0)::numeric
FROM nhan_vien_thu_nhap nvt
JOIN don_hang dh ON dh.id = nvt.don_hang_id
WHERE dh.ngay <= date '2026-04-30'
  AND nvt.nguon = 'myspa_commission'
  AND COALESCE(nvt.is_test, false) = false
UNION ALL
SELECT 'applied_tour', COUNT(*)::numeric, COALESCE(SUM(so_tien), 0)::numeric
FROM nhan_vien_thu_nhap nvt
JOIN don_hang dh ON dh.id = nvt.don_hang_id
WHERE dh.ngay <= date '2026-04-30'
  AND nvt.nguon = 'myspa_commission'
  AND nvt.loai = 'tour'
  AND COALESCE(nvt.is_test, false) = false
UNION ALL
SELECT 'applied_commission', COUNT(*)::numeric, COALESCE(SUM(so_tien), 0)::numeric
FROM nhan_vien_thu_nhap nvt
JOIN don_hang dh ON dh.id = nvt.don_hang_id
WHERE dh.ngay <= date '2026-04-30'
  AND nvt.nguon = 'myspa_commission'
  AND nvt.loai = 'commission'
  AND COALESCE(nvt.is_test, false) = false;

GRANT SELECT ON v_myspa_commission_lock_summary TO anon, authenticated;
GRANT SELECT ON v_myspa_commission_apply_summary TO anon, authenticated;
