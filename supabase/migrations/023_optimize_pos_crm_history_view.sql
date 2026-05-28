-- HSMS Phase 2.4: Optimize CRM history view for POS detail.
-- Avoid OR in joins so Supabase can return customer history quickly.

DROP VIEW IF EXISTS lich_su_dich_vu_kh;

CREATE VIEW lich_su_dich_vu_kh AS
SELECT
  dh.khach_hang_id,
  dh.id AS don_hang_id,
  dhct.id AS don_hang_chi_tiet_id,
  dh.ngay,
  dh.created_at,
  dh.ma_don,
  dh.trang_thai,
  dh.is_test,
  dhct.loai_item,
  CASE
    WHEN dhct.loai_item = 'the_moi' THEN 'mua_the_lieu_trinh'
    WHEN dhct.loai_item = 'the_lieu_trinh' THEN 'dung_the_lieu_trinh'
    WHEN dhct.loai_item = 'san_pham' THEN 'mua_san_pham'
    ELSE 'dich_vu'
  END AS loai_lich_su,
  COALESCE(dv.ten, sp.ten, tlt_used.ten_dich_vu, tlt_sold.ten_dich_vu, dhct.meta->>'tenDichVu', dhct.loai_item) AS ten_dich_vu,
  dhct.so_luong,
  dhct.don_gia,
  dhct.thanh_tien,
  dhct.tien_tour,
  dhct.tien_commission,
  nv.ho_ten AS ktv,
  COALESCE(dhct.the_lieu_trinh_id, tlt_sold.id) AS the_lieu_trinh_id,
  COALESCE(tlt_used.ma_the, tlt_sold.ma_the) AS ma_the,
  COALESCE(
    tlt_used.so_buoi_tong,
    tlt_sold.so_buoi_tong,
    NULLIF(dhct.meta->>'soBuoiTong', '')::integer,
    NULLIF(dhct.meta->>'soBuoiMua', '')::integer
  ) AS so_buoi_tong,
  COALESCE(tlt_used.so_buoi_da_dung, tlt_sold.so_buoi_da_dung) AS so_buoi_da_dung,
  COALESCE(tlt_used.so_buoi_con_lai, tlt_sold.so_buoi_con_lai) AS so_buoi_con_lai,
  dhct.meta
FROM don_hang dh
JOIN don_hang_chi_tiet dhct ON dhct.don_hang_id = dh.id
LEFT JOIN dich_vu dv ON dv.id = dhct.dich_vu_id
LEFT JOIN kho_san_pham sp ON sp.id = dhct.san_pham_id
LEFT JOIN the_lieu_trinh tlt_used ON tlt_used.id = dhct.the_lieu_trinh_id
LEFT JOIN the_lieu_trinh tlt_sold
  ON dhct.loai_item = 'the_moi'
  AND tlt_sold.don_hang_id = dh.id
  AND (
    tlt_sold.dich_vu_id = dhct.dich_vu_id
    OR tlt_sold.ten_dich_vu = COALESCE(dhct.meta->>'tenDichVu', dv.ten)
  )
LEFT JOIN nhan_vien nv ON nv.id = dhct.nhan_vien_id
WHERE dh.khach_hang_id IS NOT NULL
  AND dh.trang_thai != 'huy'
  AND COALESCE(dh.is_test, false) = false;

CREATE INDEX IF NOT EXISTS idx_tlt_don_hang ON the_lieu_trinh(don_hang_id);
CREATE INDEX IF NOT EXISTS idx_tlt_dich_vu ON the_lieu_trinh(dich_vu_id);
