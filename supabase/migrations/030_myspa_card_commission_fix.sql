-- 030_myspa_card_commission_fix.sql
-- Keep MySpa header-level card sale commission so legacy card rows show seller/commission.

ALTER TABLE myspa_legacy_staff_sync
  ADD COLUMN IF NOT EXISTS item_code text,
  ADD COLUMN IF NOT EXISTS item_group text,
  ADD COLUMN IF NOT EXISTS commission_kind text NOT NULL DEFAULT 'line';

DROP VIEW IF EXISTS v_myspa_legacy_staff_audit;
CREATE OR REPLACE VIEW v_myspa_legacy_staff_audit AS
SELECT
  s.staff_status,
  COALESCE(s.staff_display, 'Chưa có tên nhân viên') AS staff_display,
  s.commission_kind,
  COUNT(*) AS so_dong,
  COALESCE(SUM(s.commission_amount), 0) AS tong_tien,
  MIN(s.ngay) AS tu_ngay,
  MAX(s.ngay) AS den_ngay
FROM myspa_legacy_staff_sync s
GROUP BY s.staff_status, s.staff_display, s.commission_kind
ORDER BY tong_tien DESC, so_dong DESC;

DROP VIEW IF EXISTS v_myspa_legacy_staff_samples;
CREATE OR REPLACE VIEW v_myspa_legacy_staff_samples AS
SELECT
  s.ma_don,
  s.line_no,
  s.ngay,
  s.item_code,
  s.item_group,
  s.ten_dich_vu,
  s.staff_display,
  s.staff_status,
  s.commission_kind,
  s.commission_amount,
  dh.khach_hang_id,
  kh.ho_ten AS ten_khach_hang,
  kh.so_dien_thoai
FROM myspa_legacy_staff_sync s
LEFT JOIN don_hang dh ON dh.ma_don = s.ma_don
LEFT JOIN khach_hang kh ON kh.id = dh.khach_hang_id;
