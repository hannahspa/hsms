-- 031_myspa_commission_detail_stage.sql
-- Stage MySpa exported employee commission detail files.
-- This table is intentionally separate from nhan_vien_thu_nhap so old payroll
-- can be reconciled before we change operational income ledger rows.

CREATE TABLE IF NOT EXISTS myspa_commission_detail (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_file text NOT NULL,
  source_row integer NOT NULL,
  staff_file_name text,
  staff_name_raw text,
  staff_display text,
  staff_status text NOT NULL DEFAULT 'nghi_viec',
  matched_nhan_vien_id uuid REFERENCES nhan_vien(id),

  thoi_gian_thanh_toan timestamptz,
  thoi_gian_them_nhan_vien timestamptz,
  thoi_gian_tao_don_hang timestamptz,
  ngay date,

  loai_don_hang text,
  ma_don_the text NOT NULL,
  ten_dich_vu text,
  item_code text,
  so_luong numeric,
  thoi_luong numeric,
  ten_khach_hang text,
  so_dien_thoai text,
  chi_nhanh text,
  chuc_vu text,

  doanh_so_truoc_giam integer NOT NULL DEFAULT 0,
  doanh_so_sau_giam integer NOT NULL DEFAULT 0,
  ti_le numeric,
  commission_doanh_thu integer NOT NULL DEFAULT 0,
  commission_ngay_tim_kiem integer NOT NULL DEFAULT 0,
  commission_tong_don integer NOT NULL DEFAULT 0,
  tien_tour_nv integer NOT NULL DEFAULT 0,
  tong_tien integer NOT NULL DEFAULT 0,

  row_kind text NOT NULL DEFAULT 'detail',
  don_hang_id uuid REFERENCES don_hang(id),
  don_hang_chi_tiet_id uuid REFERENCES don_hang_chi_tiet(id),
  match_status text NOT NULL DEFAULT 'pending',
  raw jsonb NOT NULL DEFAULT '{}'::jsonb,
  imported_at timestamptz NOT NULL DEFAULT now(),

  UNIQUE (source_file, source_row)
);

CREATE INDEX IF NOT EXISTS idx_myspa_commission_ma_don
  ON myspa_commission_detail(ma_don_the);

CREATE INDEX IF NOT EXISTS idx_myspa_commission_staff
  ON myspa_commission_detail(matched_nhan_vien_id, ngay);

CREATE INDEX IF NOT EXISTS idx_myspa_commission_match
  ON myspa_commission_detail(match_status);

CREATE OR REPLACE VIEW v_myspa_commission_import_overview AS
SELECT 'rows'::text AS metric, COUNT(*)::numeric AS value, COALESCE(SUM(tong_tien), 0)::numeric AS amount
FROM myspa_commission_detail
WHERE row_kind = 'detail'
UNION ALL
SELECT 'matched_staff', COUNT(*)::numeric, COALESCE(SUM(tong_tien), 0)::numeric
FROM myspa_commission_detail
WHERE row_kind = 'detail' AND matched_nhan_vien_id IS NOT NULL
UNION ALL
SELECT 'retired_staff', COUNT(*)::numeric, COALESCE(SUM(tong_tien), 0)::numeric
FROM myspa_commission_detail
WHERE row_kind = 'detail' AND matched_nhan_vien_id IS NULL
UNION ALL
SELECT 'matched_orders', COUNT(*)::numeric, COALESCE(SUM(tong_tien), 0)::numeric
FROM myspa_commission_detail
WHERE row_kind = 'detail' AND don_hang_id IS NOT NULL
UNION ALL
SELECT 'unmatched_orders', COUNT(*)::numeric, COALESCE(SUM(tong_tien), 0)::numeric
FROM myspa_commission_detail
WHERE row_kind = 'detail' AND don_hang_id IS NULL;

CREATE OR REPLACE VIEW v_myspa_commission_by_staff AS
SELECT
  COALESCE(nv.ho_ten, staff_display, staff_name_raw) AS nhan_vien,
  staff_status,
  matched_nhan_vien_id,
  COUNT(*) AS so_dong,
  COALESCE(SUM(doanh_so_sau_giam), 0) AS doanh_so_sau_giam,
  COALESCE(SUM(commission_doanh_thu), 0) AS commission_doanh_thu,
  COALESCE(SUM(commission_ngay_tim_kiem), 0) AS commission_ngay_tim_kiem,
  COALESCE(SUM(commission_tong_don), 0) AS commission_tong_don,
  COALESCE(SUM(tien_tour_nv), 0) AS tien_tour_nv,
  COALESCE(SUM(tong_tien), 0) AS tong_tien
FROM myspa_commission_detail d
LEFT JOIN nhan_vien nv ON nv.id = d.matched_nhan_vien_id
WHERE row_kind = 'detail'
GROUP BY COALESCE(nv.ho_ten, staff_display, staff_name_raw), staff_status, matched_nhan_vien_id
ORDER BY tong_tien DESC;

