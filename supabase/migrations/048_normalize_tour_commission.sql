-- ============================================================
-- MIGRATION 048: Chuẩn hóa khái niệm Tiền Tour / Tiền Hoa Hồng
-- Ngày: 28/05/2026
-- Mục tiêu: Thống nhất 2 khái niệm xuyên suốt toàn hệ thống
--
-- ĐỊNH NGHĨA CHUẨN:
--   Tiền Tour      = Thu nhập KTV từ THỰC HIỆN dịch vụ / thẻ liệu trình
--                    → loai_item: dich_vu, the_lieu_trinh
--                    → Cột: don_hang_chi_tiet.tien_tour
--                    → nhan_vien_thu_nhap.loai = 'tour'
--
--   Tiền Hoa Hồng  = Thu nhập KTV từ BÁN sản phẩm / thẻ mới
--   (= "commission" trong MySpa)
--                    → loai_item: san_pham, the_moi
--                    → Cột: don_hang_chi_tiet.tien_commission
--                    → nhan_vien_thu_nhap.loai = 'commission'
--
-- Cột legacy sẽ xóa SAU KHI verify:
--   don_hang_chi_tiet.tien_hoa_hong  (= tour hoặc commission, không phân biệt)
--   don_hang_chi_tiet.ti_le_hoa_hong (không dùng trong POS mới)
-- ============================================================

BEGIN;

-- ── BƯỚC 1: Fix data nhầm cột từ import_chitiet_t5.py ───────────────────────
-- 541 dòng dich_vu + 196 dòng the_lieu_trinh bị ghi vào tien_commission
-- thay vì tien_tour (do script T5 import không phân biệt loại item)

UPDATE don_hang_chi_tiet
SET
  tien_tour       = tien_commission,
  tien_commission = 0
WHERE loai_item IN ('dich_vu', 'the_lieu_trinh')
  AND tien_commission > 0
  AND (tien_tour = 0 OR tien_tour IS NULL);

-- ── BƯỚC 2: Fix data the_moi/san_pham chỉ có tien_hoa_hong ─────────────────
-- 20 dòng the_moi: tien_hoa_hong > 0 nhưng tien_commission = 0

UPDATE don_hang_chi_tiet
SET tien_commission = tien_hoa_hong
WHERE loai_item IN ('san_pham', 'the_moi')
  AND tien_hoa_hong > 0
  AND (tien_commission = 0 OR tien_commission IS NULL);

-- ── BƯỚC 3: Đồng bộ nhan_vien_thu_nhap.loai ─────────────────────────────────
-- Các record từ MySpa import tháng 5 có loai = 'commission' nhưng
-- thực chất là tour (từ dịch vụ KTV thực hiện)
-- Fix: dựa vào don_hang_chi_tiet.loai_item để xác định đúng loại

UPDATE nhan_vien_thu_nhap nti
SET loai = 'tour'
WHERE nti.loai = 'commission'
  AND nti.don_hang_chi_tiet_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM don_hang_chi_tiet dhct
    WHERE dhct.id = nti.don_hang_chi_tiet_id
      AND dhct.loai_item IN ('dich_vu', 'the_lieu_trinh')
  );

-- ── VERIFY: Kiểm tra kết quả sau migration ───────────────────────────────────
-- Chạy query này để xác nhận trước khi COMMIT:

-- SELECT loai_item,
--        (tien_tour > 0) as has_tour,
--        (tien_commission > 0) as has_comm,
--        COUNT(*) as so_dong
-- FROM don_hang_chi_tiet
-- WHERE nhan_vien_id IS NOT NULL
-- GROUP BY loai_item, (tien_tour > 0), (tien_commission > 0)
-- ORDER BY loai_item, so_dong DESC;
--
-- Kết quả mong đợi:
--   dich_vu + the_lieu_trinh: has_tour=true, has_comm=false
--   san_pham + the_moi:       has_tour=false, has_comm=true (hoặc cả 2 = false)
--
-- SELECT loai, COUNT(*) FROM nhan_vien_thu_nhap GROUP BY loai;
-- Mong đợi: tour >> commission (commission chỉ từ bán SP/thẻ)

COMMIT;

-- ── BƯỚC 4 (SAU KHI VERIFY): Xóa cột legacy ─────────────────────────────────
-- Chạy riêng sau khi đã verify data OK và đã update tất cả code

-- ALTER TABLE don_hang_chi_tiet DROP COLUMN IF EXISTS tien_hoa_hong;
-- ALTER TABLE don_hang_chi_tiet DROP COLUMN IF EXISTS ti_le_hoa_hong;
-- Ghi chú: DROP ti_le_hoa_hong chỉ khi không còn dùng trong RPC pos_finalize_order
