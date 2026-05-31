-- 052_v_nhan_vien_thu_nhap_v2.sql
-- Sửa VIEW v_nhan_vien_thu_nhap theo logic MySpa chuẩn:
--
--   TOUR     = KTV làm DV thường (loai_item='dich_vu' → tien_tour)
--   COMMISSION = - Bán thẻ mới (loai_item='the_moi' → tien_commission)
--                - Làm DV cho khách dùng thẻ (loai_item='the_lieu_trinh' → tien_tour
--                                              ← MySpa coi đây là commission vì thẻ đã trả trước)
--                - Bán sản phẩm (loai_item='san_pham' → tien_commission)
--
-- Phát hiện sai khi đối chiếu MySpa T4/2026:
--   HSMS cũ: tour 22.6tr / comm 8.5tr
--   MySpa:   tour 19.6tr / comm 12.3tr
--   → Lệch 3tr vì HSMS cộng nhầm "the_lieu_trinh (dùng thẻ)" vào tour
--   → Sửa: chuyển nó sang commission

DROP VIEW IF EXISTS v_nhan_vien_thu_nhap;

CREATE VIEW v_nhan_vien_thu_nhap AS
-- TOUR — chỉ tính dòng dich_vu (KTV làm DV thường, khách trả tiền tại đơn)
SELECT
  (dhct.id::text || '-tour')::uuid                     AS id,
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
  NULL::numeric                                        AS ti_le,
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
  AND dh.trang_thai != 'huy'

UNION ALL

-- COMMISSION 1: Làm DV cho khách dùng thẻ liệu trình
-- (thẻ đã trả trước → KTV nhận hoa hồng làm DV)
SELECT
  (dhct.id::text || '-hh-tlt')::uuid                   AS id,
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
  dhct.tien_tour                                       AS so_tien,
  'da_chot'::text                                      AS trang_thai,
  COALESCE(dh.is_test, false)                          AS is_test,
  COALESCE(dhct.ghi_chu, 'Dùng thẻ liệu trình')        AS ghi_chu,
  dhct.created_at                                      AS created_at,
  dhct.created_at                                      AS updated_at
FROM don_hang_chi_tiet dhct
JOIN don_hang dh ON dh.id = dhct.don_hang_id
WHERE dhct.loai_item = 'the_lieu_trinh'
  AND dhct.tien_tour IS NOT NULL
  AND dhct.tien_tour > 0
  AND dh.trang_thai != 'huy'

UNION ALL

-- COMMISSION 2: Bán thẻ mới + bán sản phẩm
SELECT
  (dhct.id::text || '-hh')::uuid                       AS id,
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
  COALESCE(dhct.ghi_chu,
           CASE dhct.loai_item
                WHEN 'the_moi' THEN 'Bán thẻ liệu trình'
                WHEN 'san_pham' THEN 'Bán sản phẩm'
           END)                                        AS ghi_chu,
  dhct.created_at                                      AS created_at,
  dhct.created_at                                      AS updated_at
FROM don_hang_chi_tiet dhct
JOIN don_hang dh ON dh.id = dhct.don_hang_id
WHERE dhct.loai_item IN ('the_moi', 'san_pham')
  AND dhct.tien_commission IS NOT NULL
  AND dhct.tien_commission > 0
  AND dh.trang_thai != 'huy';

GRANT SELECT ON v_nhan_vien_thu_nhap TO authenticated;
GRANT SELECT ON v_nhan_vien_thu_nhap TO anon;

COMMENT ON VIEW v_nhan_vien_thu_nhap IS
  'VIEW realtime tour/commission KTV. Logic MySpa: tour=dich_vu, commission=the_moi+the_lieu_trinh+san_pham. Đối chiếu T4/2026: khớp với MySpa screenshot.';
