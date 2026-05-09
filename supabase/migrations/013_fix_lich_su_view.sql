-- Migration 013: Fix view lich_su_giao_dich_tong_hop
-- Vấn đề: View cũ không map đúng vi_id cho doanh thu chuyen_khoan và quet_the
-- → Khi chọn ví MB Bank, không hiển thị doanh thu CK và quẹt thẻ
-- Fix: JOIN với vi table để lấy đúng vi_id dựa trên hinh_thuc

DROP VIEW IF EXISTS lich_su_giao_dich_tong_hop;

CREATE VIEW lich_su_giao_dich_tong_hop AS
-- Doanh thu
SELECT
  d.id,
  d.ngay,
  'thu' AS loai,
  CASE d.hinh_thuc
    WHEN 'tien_mat' THEN 'Doanh Thu Tiền Mặt'
    WHEN 'chuyen_khoan' THEN 'Doanh Thu Chuyển Khoản'
    WHEN 'quet_the' THEN 'Doanh Thu Quẹt Thẻ'
    WHEN 'the_tra_truoc' THEN 'Doanh Thu Thẻ Trả Trước'
    ELSE 'Doanh Thu'
  END AS mo_ta,
  d.so_tien,
  d.dien_giai,
  d.hinh_thuc,
  d.created_at,
  -- Map vi_id dựa trên hinh_thuc
  CASE d.hinh_thuc
    WHEN 'tien_mat' THEN (SELECT id FROM vi WHERE loai = 'tien_mat'::loai_vi LIMIT 1)
    WHEN 'chuyen_khoan' THEN (SELECT id FROM vi WHERE loai = 'chuyen_khoan'::loai_vi LIMIT 1)
    WHEN 'quet_the' THEN (SELECT id FROM vi WHERE loai = 'quet_the'::loai_vi LIMIT 1)
    WHEN 'the_tra_truoc' THEN (SELECT id FROM vi WHERE loai = 'tien_mat'::loai_vi LIMIT 1)
    ELSE NULL
  END AS vi_id,
  NULL::uuid AS vi_den_id,
  NULL::text AS ten_vi_tu,
  NULL::text AS ten_vi_den
FROM doanh_thu d

UNION ALL

-- Chi phí
SELECT
  cp.id,
  cp.ngay,
  'chi' AS loai,
  COALESCE(dm.ten, 'Chi Phí') AS mo_ta,
  cp.so_tien,
  cp.dien_giai,
  cp.hinh_thuc_thanh_toan AS hinh_thuc,
  cp.created_at,
  cp.vi_id,
  NULL::uuid AS vi_den_id,
  NULL::text AS ten_vi_tu,
  NULL::text AS ten_vi_den
FROM chi_phi cp
LEFT JOIN danh_muc_chi_phi dm ON cp.danh_muc_id = dm.id

UNION ALL

-- Chuyển khoản nội bộ
SELECT
  ck.id,
  ck.ngay,
  'chuyen_khoan' AS loai,
  'Chuyển Khoản Nội Bộ' AS mo_ta,
  ck.so_tien,
  ck.dien_giai,
  NULL AS hinh_thuc,
  ck.created_at,
  ck.tu_vi_id AS vi_id,
  ck.den_vi_id AS vi_den_id,
  vi_tu.ten AS ten_vi_tu,
  vi_den.ten AS ten_vi_den
FROM chuyen_khoan_noi_bo ck
LEFT JOIN vi vi_tu ON ck.tu_vi_id = vi_tu.id
LEFT JOIN vi vi_den ON ck.den_vi_id = vi_den.id

ORDER BY ngay DESC, created_at DESC;

-- Verify
SELECT '=== VERIFY ===' as checkpoint;
SELECT loai, COUNT(*) as so_luong FROM lich_su_giao_dich_tong_hop GROUP BY loai;
SELECT loai, COUNT(*) FILTER (WHERE vi_id IS NULL) as null_vi_id
FROM lich_su_giao_dich_tong_hop
GROUP BY loai;
