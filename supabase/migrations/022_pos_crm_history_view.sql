-- HSMS Phase 2.3: POS -> CRM service/card history.
-- Make customer history readable from POS and CRM without mixing test orders.

ALTER TABLE the_lieu_trinh
  ADD COLUMN IF NOT EXISTS dich_vu_id uuid REFERENCES dich_vu(id) ON DELETE SET NULL;

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
  COALESCE(dv.ten, sp.ten, tlt.ten_dich_vu, dhct.meta->>'tenDichVu', dhct.loai_item) AS ten_dich_vu,
  dhct.so_luong,
  dhct.don_gia,
  dhct.thanh_tien,
  dhct.tien_tour,
  dhct.tien_commission,
  nv.ho_ten AS ktv,
  dhct.the_lieu_trinh_id,
  tlt.ma_the,
  COALESCE(tlt.so_buoi_tong, NULLIF(dhct.meta->>'soBuoiTong', '')::integer, NULLIF(dhct.meta->>'soBuoiMua', '')::integer) AS so_buoi_tong,
  tlt.so_buoi_da_dung,
  tlt.so_buoi_con_lai,
  dhct.meta
FROM don_hang dh
JOIN don_hang_chi_tiet dhct ON dhct.don_hang_id = dh.id
LEFT JOIN dich_vu dv ON dv.id = dhct.dich_vu_id
LEFT JOIN kho_san_pham sp ON sp.id = dhct.san_pham_id
LEFT JOIN the_lieu_trinh tlt
  ON tlt.id = dhct.the_lieu_trinh_id
  OR (dhct.loai_item = 'the_moi' AND tlt.don_hang_id = dh.id AND tlt.dich_vu_id = dhct.dich_vu_id)
LEFT JOIN nhan_vien nv ON nv.id = dhct.nhan_vien_id
WHERE dh.khach_hang_id IS NOT NULL
  AND dh.trang_thai != 'huy'
  AND COALESCE(dh.is_test, false) = false
ORDER BY dh.ngay DESC, dh.created_at DESC;
