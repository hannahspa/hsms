-- 028_myspa_legacy_staff_sync.sql
-- Preserve legacy MySpa staff names up to 2026-04-30 without touching So Thu Chi.

CREATE TABLE IF NOT EXISTS myspa_legacy_staff_sync (
  ma_don text NOT NULL,
  line_no integer NOT NULL,
  ngay date,
  ten_dich_vu text,
  staff_name text,
  staff_display text,
  staff_status text NOT NULL DEFAULT 'nghi_viec',
  matched_nhan_vien_id uuid REFERENCES nhan_vien(id) ON DELETE SET NULL,
  commission_amount integer NOT NULL DEFAULT 0,
  raw_commission text,
  cutoff_date date NOT NULL DEFAULT DATE '2026-04-30',
  synced_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (ma_don, line_no)
);

CREATE INDEX IF NOT EXISTS idx_myspa_legacy_staff_ma_don
  ON myspa_legacy_staff_sync(ma_don);

CREATE INDEX IF NOT EXISTS idx_myspa_legacy_staff_matched_nv
  ON myspa_legacy_staff_sync(matched_nhan_vien_id);

CREATE OR REPLACE VIEW v_myspa_legacy_staff_audit AS
SELECT
  s.staff_status,
  COALESCE(s.staff_display, 'Chưa có tên nhân viên') AS staff_display,
  COUNT(*) AS so_dong,
  COALESCE(SUM(s.commission_amount), 0) AS tong_tien,
  MIN(s.ngay) AS tu_ngay,
  MAX(s.ngay) AS den_ngay
FROM myspa_legacy_staff_sync s
GROUP BY s.staff_status, s.staff_display
ORDER BY tong_tien DESC, so_dong DESC;

CREATE OR REPLACE VIEW lich_su_dich_vu_kh AS
SELECT
  dh.khach_hang_id,
  dh.id AS don_hang_id,
  dhct.id AS don_hang_chi_tiet_id,
  dh.ngay,
  dh.created_at,
  dh.ma_don,
  dh.trang_thai,
  COALESCE(dh.is_test, false) AS is_test,
  dhct.loai_item,
  CASE
    WHEN dhct.loai_item = 'the_moi' THEN 'mua_the_lieu_trinh'
    WHEN dhct.loai_item = 'the_lieu_trinh' THEN 'dung_the_lieu_trinh'
    ELSE 'dich_vu'
  END AS loai_lich_su,
  COALESCE(dv.ten, sp.ten, tlt_used.ten_dich_vu, tlt_sold.ten_dich_vu, dhct.meta->>'tenDichVu', dhct.loai_item) AS ten_dich_vu,
  dhct.so_luong,
  dhct.don_gia,
  dhct.thanh_tien,
  COALESCE(dhct.tien_tour, 0) AS tien_tour,
  COALESCE(dhct.tien_commission, 0) AS tien_commission,
  COALESCE(nv.ho_ten, dhct.meta->>'myspaStaffDisplay') AS ktv,
  COALESCE(dhct.the_lieu_trinh_id, tlt_sold.id) AS the_lieu_trinh_id,
  COALESCE(tlt_used.ma_the, tlt_sold.ma_the) AS ma_the,
  COALESCE(tlt_used.so_buoi_tong, tlt_sold.so_buoi_tong) AS so_buoi_tong,
  COALESCE(tlt_used.so_buoi_da_dung, tlt_sold.so_buoi_da_dung) AS so_buoi_da_dung,
  COALESCE(tlt_used.so_buoi_con_lai, tlt_sold.so_buoi_con_lai) AS so_buoi_con_lai,
  dhct.meta
FROM don_hang dh
JOIN don_hang_chi_tiet dhct ON dhct.don_hang_id = dh.id
LEFT JOIN dich_vu dv ON dv.id = dhct.dich_vu_id
LEFT JOIN kho_san_pham sp ON sp.id = dhct.san_pham_id
LEFT JOIN nhan_vien nv ON nv.id = dhct.nhan_vien_id
LEFT JOIN the_lieu_trinh tlt_used ON tlt_used.id = dhct.the_lieu_trinh_id
LEFT JOIN the_lieu_trinh tlt_sold
  ON dhct.loai_item = 'the_moi'
  AND tlt_sold.don_hang_id = dh.id
  AND (
    tlt_sold.dich_vu_id = dhct.dich_vu_id
    OR tlt_sold.ten_dich_vu = COALESCE(dhct.meta->>'tenDichVu', dv.ten)
  );
