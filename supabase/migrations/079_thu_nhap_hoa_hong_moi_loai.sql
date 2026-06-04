-- ============================================================
-- 078: Cho phép tien_hoa_hong tính cho MỌI loại dòng (không chỉ the_moi/san_pham)
-- Lý do: import T5 từ MySpa gộp hoa hồng bán thẻ vào tour của dòng "dùng thẻ"
-- (the_lieu_trinh). Để đối soát đúng myspa, ta chuyển phần đó sang tien_hoa_hong
-- TRÊN CHÍNH dòng đó → view phải đếm tien_hoa_hong của dòng dich_vu/the_lieu_trinh.
-- tour = tien_tour (dich_vu + the_lieu_trinh); hoa_hong = tien_hoa_hong (mọi loại).
-- 1 dòng có thể đóng góp CẢ tour (tien_tour) LẪN hoa hồng (tien_hoa_hong).
-- ============================================================
DROP VIEW IF EXISTS v_nhan_vien_thu_nhap;

CREATE VIEW v_nhan_vien_thu_nhap AS
SELECT
  ( substr(src.md5_key, 1, 8) || '-' || substr(src.md5_key, 9, 4) || '-' ||
    substr(src.md5_key, 13, 4) || '-' || substr(src.md5_key, 17, 4) || '-' ||
    substr(src.md5_key, 21, 12) )::uuid AS id,
  src.don_hang_id, src.don_hang_chi_tiet_id, src.nhan_vien_id, src.loai, src.nguon,
  src.ngay, src.doanh_so_tinh, src.ti_le, src.so_tien, src.trang_thai, src.is_test,
  src.ghi_chu, src.created_at, src.updated_at
FROM (
  -- TOUR: dịch vụ thường + KTV thực hiện buổi từ thẻ liệu trình
  SELECT
    md5(dhct.id::text || ':tour')                        AS md5_key,
    dhct.don_hang_id, dhct.id AS don_hang_chi_tiet_id, dhct.nhan_vien_id,
    'tour'::text                                         AS loai,
    CASE WHEN dh.created_at::date >= '2026-05-28' THEN 'pos' ELSE 'myspa_commission' END AS nguon,
    dh.ngay, COALESCE(dhct.thanh_tien, 0) AS doanh_so_tinh, dhct.ti_le_hoa_hong AS ti_le,
    dhct.tien_tour                                       AS so_tien,
    'da_chot'::text AS trang_thai, COALESCE(dh.is_test, false) AS is_test,
    dhct.ghi_chu, dhct.created_at, dhct.created_at AS updated_at
  FROM don_hang_chi_tiet dhct
  JOIN don_hang dh ON dh.id = dhct.don_hang_id
  WHERE dhct.loai_item IN ('dich_vu', 'the_lieu_trinh')
    AND dhct.tien_tour IS NOT NULL AND dhct.tien_tour > 0
    AND dh.trang_thai <> 'huy'

  UNION ALL

  -- HOA HỒNG: mọi dòng có tien_hoa_hong > 0 (bán thẻ/SP + phần hoa hồng đối soát myspa)
  SELECT
    md5(dhct.id::text || ':hoa-hong')                    AS md5_key,
    dhct.don_hang_id, dhct.id AS don_hang_chi_tiet_id, dhct.nhan_vien_id,
    'hoa_hong'::text                                     AS loai,
    CASE WHEN dh.created_at::date >= '2026-05-28' THEN 'pos' ELSE 'myspa_commission' END AS nguon,
    dh.ngay, COALESCE(dhct.thanh_tien, 0) AS doanh_so_tinh, dhct.ti_le_hoa_hong AS ti_le,
    dhct.tien_hoa_hong                                   AS so_tien,
    'da_chot'::text AS trang_thai, COALESCE(dh.is_test, false) AS is_test,
    COALESCE(dhct.ghi_chu,
      CASE dhct.loai_item WHEN 'the_moi' THEN 'Ban the lieu trinh'
        WHEN 'san_pham' THEN 'Ban san pham' ELSE 'Hoa hong' END) AS ghi_chu,
    dhct.created_at, dhct.created_at AS updated_at
  FROM don_hang_chi_tiet dhct
  JOIN don_hang dh ON dh.id = dhct.don_hang_id
  WHERE dhct.tien_hoa_hong IS NOT NULL AND dhct.tien_hoa_hong > 0
    AND dh.trang_thai <> 'huy'
) src;

GRANT SELECT ON v_nhan_vien_thu_nhap TO authenticated;
GRANT SELECT ON v_nhan_vien_thu_nhap TO anon;
COMMENT ON VIEW v_nhan_vien_thu_nhap IS 'tour=tien_tour(dich_vu+the_lieu_trinh); hoa_hong=tien_hoa_hong(mọi loại). 1 dòng có thể có cả 2.';
