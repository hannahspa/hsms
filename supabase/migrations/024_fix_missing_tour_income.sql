-- Fix đơn DH-20260521-004: gia_tri_the = 0 nên tien_tour tính ra = 0
-- Dùng gia_co_ban từ bảng dich_vu thay thế

-- ── Bước 1: Xem gia_co_ban của dịch vụ (chạy riêng để xác nhận trước)
SELECT id, ten, gia_co_ban, ti_le_hoa_hong
FROM dich_vu
WHERE ten ILIKE '%Gội Đầu Dưỡng Sinh%'
   OR ten ILIKE '%Goi Dau Duong Sinh%';

-- ── Bước 2: Update tien_tour dùng gia_co_ban từ dich_vu
-- ti_le_hoa_hong = 11.1 (đã có trong don_hang_chi_tiet)
-- chi_tiet_id = 8e328d9e-e77b-46c2-9663-8a7812b6907c
UPDATE don_hang_chi_tiet dhct
SET
  tien_tour     = (
    SELECT ROUND(dv.gia_co_ban * dhct.ti_le_hoa_hong / 100.0)::integer
    FROM dich_vu dv
    WHERE dv.ten ILIKE '%Gội Đầu Dưỡng Sinh%'
      AND dv.is_active = true
    ORDER BY dv.ten
    LIMIT 1
  ),
  tien_hoa_hong = (
    SELECT ROUND(dv.gia_co_ban * dhct.ti_le_hoa_hong / 100.0)::integer
    FROM dich_vu dv
    WHERE dv.ten ILIKE '%Gội Đầu Dưỡng Sinh%'
      AND dv.is_active = true
    ORDER BY dv.ten
    LIMIT 1
  )
WHERE dhct.id = '8e328d9e-e77b-46c2-9663-8a7812b6907c'
  AND COALESCE(dhct.tien_tour, 0) = 0
  AND dhct.ti_le_hoa_hong > 0;

-- ── Bước 3: Insert nhan_vien_thu_nhap
INSERT INTO nhan_vien_thu_nhap (
  don_hang_id, don_hang_chi_tiet_id, nhan_vien_id,
  loai, nguon, ngay, doanh_so_tinh, ti_le, so_tien, is_test, ghi_chu
)
SELECT
  dhct.don_hang_id,
  dhct.id,
  dhct.nhan_vien_id,
  'tour', 'pos', dh.ngay,
  0,
  dhct.ti_le_hoa_hong,
  dhct.tien_tour,
  false,
  'Fix retroactive: ' || dh.ma_don || ' (gia_tri_the=0, dung gia_co_ban)'
FROM don_hang_chi_tiet dhct
JOIN don_hang dh ON dh.id = dhct.don_hang_id
WHERE dhct.id = '8e328d9e-e77b-46c2-9663-8a7812b6907c'
  AND dhct.tien_tour > 0
  AND NOT EXISTS (
    SELECT 1 FROM nhan_vien_thu_nhap
    WHERE don_hang_chi_tiet_id = dhct.id AND loai = 'tour'
  )
ON CONFLICT (don_hang_chi_tiet_id, loai)
  WHERE don_hang_chi_tiet_id IS NOT NULL
DO UPDATE SET
  so_tien    = EXCLUDED.so_tien,
  ghi_chu    = EXCLUDED.ghi_chu,
  updated_at = now();

-- ── Xác nhận kết quả
SELECT
  dh.ma_don,
  nv.ho_ten          AS ktv,
  dhct.tien_tour     AS tien_tour_moi,
  dhct.ti_le_hoa_hong,
  nvt.so_tien        AS thu_nhap_da_ghi
FROM don_hang_chi_tiet dhct
JOIN don_hang dh ON dh.id = dhct.don_hang_id
JOIN nhan_vien nv ON nv.id = dhct.nhan_vien_id
LEFT JOIN nhan_vien_thu_nhap nvt
       ON nvt.don_hang_chi_tiet_id = dhct.id AND nvt.loai = 'tour'
WHERE dhct.id = '8e328d9e-e77b-46c2-9663-8a7812b6907c';
