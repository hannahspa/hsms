-- 051_v_nhan_vien_thu_nhap.sql
-- VIEW thay thế bảng nhan_vien_thu_nhap — lấy realtime từ don_hang_chi_tiet
-- Lý do: nhan_vien_thu_nhap (snapshot import MySpa) đã lệch ~25-35% so với
-- don_hang_chi_tiet (nguồn sự thật). Khi POS HSMS finalize đơn mới, dữ liệu
-- này phải tự cập nhật ngay cho KTV xem trên CheckinThuNhap.

DROP VIEW IF EXISTS v_nhan_vien_thu_nhap;

CREATE VIEW v_nhan_vien_thu_nhap AS
-- Tour
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
WHERE dhct.tien_tour IS NOT NULL
  AND dhct.tien_tour > 0
  AND dh.trang_thai != 'huy'

UNION ALL

-- Hoa hồng dịch vụ
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
  dhct.ghi_chu                                         AS ghi_chu,
  dhct.created_at                                      AS created_at,
  dhct.created_at                                      AS updated_at
FROM don_hang_chi_tiet dhct
JOIN don_hang dh ON dh.id = dhct.don_hang_id
WHERE dhct.tien_commission IS NOT NULL
  AND dhct.tien_commission > 0
  AND dh.trang_thai != 'huy';

-- Grants — cho phép checkin user đọc (RLS sẽ tự apply theo nhan_vien_id)
GRANT SELECT ON v_nhan_vien_thu_nhap TO authenticated;
GRANT SELECT ON v_nhan_vien_thu_nhap TO anon;

COMMENT ON VIEW v_nhan_vien_thu_nhap IS
  'VIEW realtime tiền tour + hoa hồng KTV từ don_hang_chi_tiet. Thay thế bảng nhan_vien_thu_nhap (snapshot MySpa bị lệch).';
