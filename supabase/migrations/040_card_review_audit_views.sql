-- 040_card_review_audit_views.sql
-- Treat reviewed legacy cards as resolved when they are intentionally kept active.

DROP VIEW IF EXISTS v_myspa_legacy_card_samples;
DROP VIEW IF EXISTS v_myspa_legacy_card_audit;

CREATE VIEW v_myspa_legacy_card_audit AS
SELECT
  CASE
    WHEN meta->>'review_status' IN ('keep_active', 'closed_expired', 'extended', 'sessions_adjusted') THEN 'ok'
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

CREATE VIEW v_myspa_legacy_card_samples AS
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
  t.meta,
  CASE
    WHEN t.meta->>'review_status' IN ('keep_active', 'closed_expired', 'extended', 'sessions_adjusted') THEN 'ok'
    WHEN t.trang_thai = 'active' AND t.ngay_het_han < CURRENT_DATE THEN 'active_but_expired'
    WHEN t.trang_thai = 'active' AND COALESCE(t.so_buoi_con_lai, 0) <= 0 AND COALESCE(t.is_khong_gioi_han, false) = false THEN 'active_but_no_sessions'
    WHEN t.trang_thai = 'het_buoi' AND COALESCE(t.so_buoi_con_lai, 0) > 0 THEN 'finished_but_has_sessions'
    WHEN COALESCE(t.so_buoi_da_dung, 0) > COALESCE(t.so_buoi_tong, 0) AND COALESCE(t.is_khong_gioi_han, false) = false THEN 'used_more_than_total'
    ELSE 'ok'
  END AS audit_status
FROM the_lieu_trinh t
LEFT JOIN khach_hang kh ON kh.id = t.khach_hang_id
WHERE t.ngay_mua <= DATE '2026-04-30' OR t.created_at::date <= DATE '2026-04-30';

SELECT hsms_refresh_parallel_readiness_cache();
