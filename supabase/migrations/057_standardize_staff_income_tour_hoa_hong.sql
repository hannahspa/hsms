-- 057_standardize_staff_income_tour_hoa_hong.sql
-- Chuan hoa thu nhap nhan vien theo nghiep vu Hannah Spa:
-- - KTV thuc hien dich vu thuong: loai = 'tour'
-- - KTV thuc hien buoi the lieu trinh cu: loai = 'tour'
-- - KTV/Le Tan ban the moi hoac san pham: loai = 'hoa_hong'
--
-- Luu y:
-- - the_lieu_trinh KHONG phai phuong thuc thanh toan.
-- - Ten cot vat ly `tien_commission` duoc giu de tuong thich schema hien tai,
--   nhung nghiep vu/UI goi la `hoa_hong`.
-- - Sua cach tao id cua VIEW: khong ep `uuid || '-tour'` ve uuid nua; dung md5
--   de tao uuid on dinh, tranh loi khi query.

DROP VIEW IF EXISTS v_nhan_vien_thu_nhap;

CREATE VIEW v_nhan_vien_thu_nhap AS
SELECT
  (
    substr(src.md5_key, 1, 8) || '-' ||
    substr(src.md5_key, 9, 4) || '-' ||
    substr(src.md5_key, 13, 4) || '-' ||
    substr(src.md5_key, 17, 4) || '-' ||
    substr(src.md5_key, 21, 12)
  )::uuid                                                AS id,
  src.don_hang_id,
  src.don_hang_chi_tiet_id,
  src.nhan_vien_id,
  src.loai,
  src.nguon,
  src.ngay,
  src.doanh_so_tinh,
  src.ti_le,
  src.so_tien,
  src.trang_thai,
  src.is_test,
  src.ghi_chu,
  src.created_at,
  src.updated_at
FROM (
  -- Tien Tour: dich vu thuong
  SELECT
    md5(dhct.id::text || ':tour-dich-vu')                AS md5_key,
    dhct.don_hang_id                                     AS don_hang_id,
    dhct.id                                              AS don_hang_chi_tiet_id,
    dhct.nhan_vien_id                                    AS nhan_vien_id,
    'tour'::text                                         AS loai,
    CASE WHEN dh.created_at::date >= '2026-05-28'
      THEN 'pos'
      ELSE 'myspa_commission'
    END                                                  AS nguon,
    dh.ngay                                              AS ngay,
    COALESCE(dhct.thanh_tien, 0)                         AS doanh_so_tinh,
    dhct.ti_le_hoa_hong                                  AS ti_le,
    dhct.tien_tour                                       AS so_tien,
    'da_chot'::text                                      AS trang_thai,
    COALESCE(dh.is_test, false)                          AS is_test,
    dhct.ghi_chu                                         AS ghi_chu,
    dhct.created_at                                      AS created_at,
    dhct.created_at                                      AS updated_at
  FROM don_hang_chi_tiet dhct
  JOIN don_hang dh ON dh.id = dhct.don_hang_id
  WHERE dhct.loai_item = 'dich_vu'
    AND dhct.tien_tour IS NOT NULL
    AND dhct.tien_tour > 0
    AND dh.trang_thai <> 'huy'

  UNION ALL

  -- Tien Tour: KTV thuc hien buoi tu the lieu trinh cu
  SELECT
    md5(dhct.id::text || ':tour-the-lieu-trinh')         AS md5_key,
    dhct.don_hang_id                                     AS don_hang_id,
    dhct.id                                              AS don_hang_chi_tiet_id,
    dhct.nhan_vien_id                                    AS nhan_vien_id,
    'tour'::text                                         AS loai,
    CASE WHEN dh.created_at::date >= '2026-05-28'
      THEN 'pos'
      ELSE 'myspa_commission'
    END                                                  AS nguon,
    dh.ngay                                              AS ngay,
    COALESCE(dhct.thanh_tien, 0)                         AS doanh_so_tinh,
    dhct.ti_le_hoa_hong                                  AS ti_le,
    dhct.tien_tour                                       AS so_tien,
    'da_chot'::text                                      AS trang_thai,
    COALESCE(dh.is_test, false)                          AS is_test,
    COALESCE(dhct.ghi_chu, 'Dung the lieu trinh')         AS ghi_chu,
    dhct.created_at                                      AS created_at,
    dhct.created_at                                      AS updated_at
  FROM don_hang_chi_tiet dhct
  JOIN don_hang dh ON dh.id = dhct.don_hang_id
  WHERE dhct.loai_item = 'the_lieu_trinh'
    AND dhct.tien_tour IS NOT NULL
    AND dhct.tien_tour > 0
    AND dh.trang_thai <> 'huy'

  UNION ALL

  -- Hoa hong: ban the moi va ban san pham
  SELECT
    md5(dhct.id::text || ':hoa-hong-ban')                AS md5_key,
    dhct.don_hang_id                                     AS don_hang_id,
    dhct.id                                              AS don_hang_chi_tiet_id,
    dhct.nhan_vien_id                                    AS nhan_vien_id,
    'hoa_hong'::text                                     AS loai,
    CASE WHEN dh.created_at::date >= '2026-05-28'
      THEN 'pos'
      ELSE 'myspa_commission'
    END                                                  AS nguon,
    dh.ngay                                              AS ngay,
    COALESCE(dhct.thanh_tien, 0)                         AS doanh_so_tinh,
    dhct.ti_le_hoa_hong                                  AS ti_le,
    dhct.tien_commission                                 AS so_tien,
    'da_chot'::text                                      AS trang_thai,
    COALESCE(dh.is_test, false)                          AS is_test,
    COALESCE(
      dhct.ghi_chu,
      CASE dhct.loai_item
        WHEN 'the_moi' THEN 'Ban the lieu trinh'
        WHEN 'san_pham' THEN 'Ban san pham'
      END
    )                                                    AS ghi_chu,
    dhct.created_at                                      AS created_at,
    dhct.created_at                                      AS updated_at
  FROM don_hang_chi_tiet dhct
  JOIN don_hang dh ON dh.id = dhct.don_hang_id
  WHERE dhct.loai_item IN ('the_moi', 'san_pham')
    AND dhct.tien_commission IS NOT NULL
    AND dhct.tien_commission > 0
    AND dh.trang_thai <> 'huy'
) src;

GRANT SELECT ON v_nhan_vien_thu_nhap TO authenticated;
GRANT SELECT ON v_nhan_vien_thu_nhap TO anon;

COMMENT ON VIEW v_nhan_vien_thu_nhap IS
  'VIEW realtime thu nhap nhan vien: tour=dich_vu+the_lieu_trinh, hoa_hong=the_moi+san_pham. the_lieu_trinh khong phai phuong thuc thanh toan.';
