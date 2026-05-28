-- 029_myspa_legacy_audit_views.sql
-- Read-only audit views for MySpa legacy data up to 2026-04-30.

CREATE OR REPLACE VIEW v_myspa_legacy_overview AS
WITH old_orders AS (
  SELECT *
  FROM don_hang
  WHERE ngay <= DATE '2026-04-30'
),
old_lines AS (
  SELECT dhct.*
  FROM don_hang_chi_tiet dhct
  JOIN old_orders dh ON dh.id = dhct.don_hang_id
),
synced AS (
  SELECT *
  FROM myspa_legacy_staff_sync
)
SELECT 'old_orders'::text AS metric, COUNT(*)::numeric AS value, NULL::numeric AS amount
FROM old_orders
UNION ALL
SELECT 'old_lines', COUNT(*)::numeric, COALESCE(SUM(thanh_tien), 0)::numeric
FROM old_lines
UNION ALL
SELECT 'synced_staff_lines', COUNT(*)::numeric, COALESCE(SUM(commission_amount), 0)::numeric
FROM synced
UNION ALL
SELECT 'matched_active_staff', COUNT(*)::numeric, COALESCE(SUM(commission_amount), 0)::numeric
FROM synced
WHERE staff_status = 'dang_lam'
UNION ALL
SELECT 'legacy_resigned_staff', COUNT(*)::numeric, COALESCE(SUM(commission_amount), 0)::numeric
FROM synced
WHERE staff_status = 'nghi_viec'
UNION ALL
SELECT 'missing_staff_name', COUNT(*)::numeric, COALESCE(SUM(commission_amount), 0)::numeric
FROM synced
WHERE staff_status = 'chua_co_ten'
UNION ALL
SELECT 'old_orders_without_payment_rows', COUNT(*)::numeric, COALESCE(SUM(dh.thuc_thu), 0)::numeric
FROM old_orders dh
LEFT JOIN (SELECT DISTINCT don_hang_id FROM thanh_toan) tt ON tt.don_hang_id = dh.id
WHERE tt.don_hang_id IS NULL
UNION ALL
SELECT 'old_orders_without_pos_revenue', COUNT(*)::numeric, COALESCE(SUM(dh.thuc_thu), 0)::numeric
FROM old_orders dh
LEFT JOIN (SELECT DISTINCT don_hang_id FROM doanh_thu WHERE nguon = 'pos') dt ON dt.don_hang_id = dh.id
WHERE dt.don_hang_id IS NULL AND COALESCE(dh.thuc_thu, 0) > 0;

CREATE OR REPLACE VIEW v_myspa_legacy_card_audit AS
SELECT
  CASE
    WHEN trang_thai = 'active' AND ngay_het_han < CURRENT_DATE THEN 'active_but_expired'
    WHEN trang_thai = 'active' AND COALESCE(so_buoi_con_lai, 0) <= 0 AND COALESCE(is_khong_gioi_han, false) = false THEN 'active_but_no_sessions'
    WHEN trang_thai = 'het_buoi' AND COALESCE(so_buoi_con_lai, 0) > 0 THEN 'finished_but_has_sessions'
    WHEN COALESCE(so_buoi_da_dung, 0) > COALESCE(so_buoi_tong, 0) AND COALESCE(is_khong_gioi_han, false) = false THEN 'used_more_than_total'
    ELSE 'ok'
  END AS audit_status,
  COUNT(*) AS so_the,
  COALESCE(SUM(gia_tri_the), 0) AS gia_tri,
  COALESCE(SUM(so_buoi_tong), 0) AS buoi_tong,
  COALESCE(SUM(so_buoi_da_dung), 0) AS buoi_da_dung
FROM the_lieu_trinh
WHERE ngay_mua <= DATE '2026-04-30' OR created_at::date <= DATE '2026-04-30'
GROUP BY audit_status;

CREATE OR REPLACE VIEW v_myspa_legacy_staff_samples AS
SELECT
  s.ma_don,
  s.line_no,
  s.ngay,
  s.ten_dich_vu,
  s.staff_display,
  s.staff_status,
  s.commission_amount,
  dh.khach_hang_id,
  kh.ho_ten AS ten_khach_hang,
  kh.so_dien_thoai
FROM myspa_legacy_staff_sync s
LEFT JOIN don_hang dh ON dh.ma_don = s.ma_don
LEFT JOIN khach_hang kh ON kh.id = dh.khach_hang_id;

CREATE OR REPLACE VIEW v_myspa_legacy_card_samples AS
SELECT
  t.id,
  t.ma_the,
  t.khach_hang_id,
  kh.ho_ten AS ten_khach_hang,
  kh.so_dien_thoai,
  t.ten_dich_vu,
  t.so_buoi_tong,
  t.so_buoi_da_dung,
  t.so_buoi_con_lai,
  t.gia_tri_the,
  t.ngay_mua,
  t.ngay_het_han,
  t.trang_thai,
  COALESCE(t.loai_the, 'lieu_trinh') AS loai_the,
  t.combo_id,
  t.is_khong_gioi_han,
  t.source,
  t.ghi_chu,
  CASE
    WHEN t.trang_thai = 'active' AND t.ngay_het_han < CURRENT_DATE THEN 'active_but_expired'
    WHEN t.trang_thai = 'active' AND COALESCE(t.so_buoi_con_lai, 0) <= 0 AND COALESCE(t.is_khong_gioi_han, false) = false THEN 'active_but_no_sessions'
    WHEN t.trang_thai = 'het_buoi' AND COALESCE(t.so_buoi_con_lai, 0) > 0 THEN 'finished_but_has_sessions'
    WHEN COALESCE(t.so_buoi_da_dung, 0) > COALESCE(t.so_buoi_tong, 0) AND COALESCE(t.is_khong_gioi_han, false) = false THEN 'used_more_than_total'
    ELSE 'ok'
  END AS audit_status
FROM the_lieu_trinh t
LEFT JOIN khach_hang kh ON kh.id = t.khach_hang_id
WHERE t.ngay_mua <= DATE '2026-04-30' OR t.created_at::date <= DATE '2026-04-30';
