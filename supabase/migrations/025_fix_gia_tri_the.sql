-- Migration 025: Fix gia_tri_the = 0 cho tất cả thẻ liệu trình
-- gia_tri_the = gia_co_ban × so_buoi_tong (giá trị toàn bộ thẻ)
-- Khi checkout 1 buổi: baseTT = gia_tri_the / so_buoi_tong → tienTour tính đúng

-- ── Bước 1: Fix các thẻ có tên khớp chính xác với dich_vu.ten ──────────────
UPDATE the_lieu_trinh tlt
SET gia_tri_the = dv.gia_co_ban * GREATEST(tlt.so_buoi_tong, 1)
FROM dich_vu dv
WHERE dv.ten = tlt.ten_dich_vu
  AND dv.is_active = true
  AND tlt.gia_tri_the = 0;

-- ── Bước 2: Fix thẻ "Bảo hành" (tên có suffix, dùng ILIKE) ─────────────────
-- "Triệt Lông Dưới Cánh Tay  (Bảo hành 1 năm)" → match "Triệt Lông Dưới Cánh Tay"
UPDATE the_lieu_trinh tlt
SET gia_tri_the = (
  SELECT dv.gia_co_ban * GREATEST(tlt.so_buoi_tong, 1)
  FROM dich_vu dv
  WHERE tlt.ten_dich_vu ILIKE dv.ten || '%'
    AND dv.is_active = true
  ORDER BY length(dv.ten) DESC
  LIMIT 1
)
WHERE tlt.gia_tri_the = 0
  AND tlt.ten_dich_vu IS NOT NULL
  AND tlt.ten_dich_vu != ''
  AND EXISTS (
    SELECT 1 FROM dich_vu dv
    WHERE tlt.ten_dich_vu ILIKE dv.ten || '%'
      AND dv.is_active = true
  );

-- ── Bước 3: Fix retroactive tien_tour trong don_hang_chi_tiet ───────────────
-- Các đơn đã chốt, dùng thẻ, có KTV, nhưng tien_tour = 0
-- Tính lại: tien_tour = (gia_tri_the / so_buoi_tong) * ti_le_hoa_hong / 100

UPDATE don_hang_chi_tiet dhct
SET
  tien_tour     = ROUND(
    (tlt.gia_tri_the::numeric / GREATEST(tlt.so_buoi_tong, 1))
    * COALESCE(dhct.ti_le_hoa_hong, 0) / 100.0
  )::integer,
  tien_hoa_hong = ROUND(
    (tlt.gia_tri_the::numeric / GREATEST(tlt.so_buoi_tong, 1))
    * COALESCE(dhct.ti_le_hoa_hong, 0) / 100.0
  )::integer
FROM the_lieu_trinh tlt
JOIN don_hang dh ON dh.id = dhct.don_hang_id
WHERE dhct.the_lieu_trinh_id = tlt.id
  AND dhct.loai_item = 'the_lieu_trinh'
  AND dhct.nhan_vien_id IS NOT NULL
  AND COALESCE(dhct.ti_le_hoa_hong, 0) > 0
  AND COALESCE(dhct.tien_tour, 0) = 0
  AND tlt.gia_tri_the > 0
  AND dh.is_test = false;

-- ── Bước 4: Ghi bổ sung nhan_vien_thu_nhap cho các dòng thiếu ───────────────
INSERT INTO nhan_vien_thu_nhap (
  don_hang_id, don_hang_chi_tiet_id, nhan_vien_id,
  loai, nguon, ngay, doanh_so_tinh, ti_le, so_tien, is_test, ghi_chu
)
SELECT
  dhct.don_hang_id,
  dhct.id,
  dhct.nhan_vien_id,
  'tour',
  'pos',
  dh.ngay,
  0,
  dhct.ti_le_hoa_hong,
  dhct.tien_tour,
  false,
  'Fix retroactive: gia_tri_the → ' || tlt.ten_dich_vu
FROM don_hang_chi_tiet dhct
JOIN don_hang dh ON dh.id = dhct.don_hang_id
JOIN the_lieu_trinh tlt ON tlt.id = dhct.the_lieu_trinh_id
WHERE dhct.loai_item = 'the_lieu_trinh'
  AND dhct.nhan_vien_id IS NOT NULL
  AND COALESCE(dhct.tien_tour, 0) > 0
  AND dh.is_test = false
  AND NOT EXISTS (
    SELECT 1 FROM nhan_vien_thu_nhap nvt
    WHERE nvt.don_hang_chi_tiet_id = dhct.id
      AND nvt.loai = 'tour'
  )
ON CONFLICT (don_hang_chi_tiet_id, loai)
  WHERE don_hang_chi_tiet_id IS NOT NULL
DO UPDATE SET
  so_tien    = EXCLUDED.so_tien,
  ghi_chu    = EXCLUDED.ghi_chu,
  updated_at = now();

-- ── Xác nhận kết quả ────────────────────────────────────────────────────────
SELECT
  'the_lieu_trinh' AS bang,
  COUNT(*) FILTER (WHERE gia_tri_the = 0)  AS con_zero,
  COUNT(*) FILTER (WHERE gia_tri_the > 0)  AS da_co_gia,
  COUNT(*)                                  AS tong
FROM the_lieu_trinh

UNION ALL

SELECT
  'don_hang_chi_tiet (the)',
  COUNT(*) FILTER (WHERE tien_tour = 0 AND nhan_vien_id IS NOT NULL),
  COUNT(*) FILTER (WHERE tien_tour > 0),
  COUNT(*)
FROM don_hang_chi_tiet
WHERE loai_item = 'the_lieu_trinh';
