-- 035_apply_myspa_commission_to_staff_ledger.sql
-- Replace the incomplete historical POS staff income ledger up to 2026-04-30
-- with the audited MySpa commission export. This does not touch So Thu Chi.

CREATE TABLE IF NOT EXISTS nhan_vien_thu_nhap_backup_myspa_20260430 (
  backup_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  backup_at timestamptz NOT NULL DEFAULT now(),
  original_id uuid,
  don_hang_id uuid,
  don_hang_chi_tiet_id uuid,
  nhan_vien_id uuid,
  loai text,
  nguon text,
  ngay date,
  doanh_so_tinh integer,
  ti_le numeric,
  so_tien integer,
  trang_thai text,
  is_test boolean,
  ghi_chu text,
  created_at timestamptz,
  updated_at timestamptz
);

INSERT INTO nhan_vien_thu_nhap_backup_myspa_20260430 (
  original_id,
  don_hang_id,
  don_hang_chi_tiet_id,
  nhan_vien_id,
  loai,
  nguon,
  ngay,
  doanh_so_tinh,
  ti_le,
  so_tien,
  trang_thai,
  is_test,
  ghi_chu,
  created_at,
  updated_at
)
SELECT
  nvt.id,
  nvt.don_hang_id,
  nvt.don_hang_chi_tiet_id,
  nvt.nhan_vien_id,
  nvt.loai,
  nvt.nguon,
  nvt.ngay,
  nvt.doanh_so_tinh,
  nvt.ti_le,
  nvt.so_tien,
  nvt.trang_thai,
  nvt.is_test,
  nvt.ghi_chu,
  nvt.created_at,
  nvt.updated_at
FROM nhan_vien_thu_nhap nvt
JOIN don_hang dh ON dh.id = nvt.don_hang_id
WHERE dh.ngay <= date '2026-04-30'
  AND COALESCE(nvt.is_test, false) = false
  AND nvt.nguon IN ('pos', 'myspa_commission')
  AND NOT EXISTS (
    SELECT 1
    FROM nhan_vien_thu_nhap_backup_myspa_20260430 b
    WHERE b.original_id = nvt.id
  );

DELETE FROM nhan_vien_thu_nhap nvt
USING don_hang dh
WHERE dh.id = nvt.don_hang_id
  AND dh.ngay <= date '2026-04-30'
  AND COALESCE(nvt.is_test, false) = false
  AND nvt.nguon IN ('pos', 'myspa_commission');

INSERT INTO nhan_vien_thu_nhap (
  don_hang_id,
  don_hang_chi_tiet_id,
  nhan_vien_id,
  loai,
  nguon,
  ngay,
  doanh_so_tinh,
  ti_le,
  so_tien,
  trang_thai,
  is_test,
  ghi_chu
)
SELECT
  p.don_hang_id,
  NULL::uuid AS don_hang_chi_tiet_id,
  p.nhan_vien_id,
  p.loai,
  'myspa_commission',
  p.ngay,
  COALESCE(p.doanh_so_tinh, 0),
  p.ti_le,
  p.so_tien,
  'doi_soat',
  false,
  p.ghi_chu
FROM v_myspa_commission_ledger_preview p
WHERE p.ngay <= date '2026-04-30'
  AND p.don_hang_id IS NOT NULL
  AND p.nhan_vien_id IS NOT NULL
  AND COALESCE(p.so_tien, 0) > 0;

CREATE OR REPLACE VIEW v_myspa_commission_apply_summary AS
SELECT 'backup_rows' AS metric, COUNT(*)::numeric AS value, COALESCE(SUM(so_tien), 0)::numeric AS amount
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
