-- ============================================================
-- MIGRATION 137: Admin quản lý Thẻ Liệu Trình
-- Ngày: 01/07/2026
-- Thêm cột cho các hành động chỉ-Admin trên thẻ liệu trình:
--   - bi_dong            : đóng/băng thẻ (không dùng được ở POS, MỞ LẠI được)
--   - da_xoa             : ẩn mềm (soft-delete) — biến mất khỏi danh sách/POS,
--                          giữ nguyên dữ liệu trong DB để đối soát/khôi phục
--   - chuyen_sang_the_id : (trên thẻ CŨ) trỏ tới thẻ mới khi chuyển đổi
--   - chuyen_tu_the_id   : (trên thẻ MỚI) trỏ về thẻ cũ nguồn khi chuyển đổi
-- Mở rộng CHECK trang_thai: thêm 'chuyen_doi', 'hoan_tien'.
--
-- LƯU Ý: KHÔNG xoá cứng thẻ (số buổi có thể chưa sync MySpa) — chỉ ẩn mềm.
-- ============================================================

ALTER TABLE the_lieu_trinh
  ADD COLUMN IF NOT EXISTS bi_dong            boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS da_xoa             boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS chuyen_sang_the_id uuid,
  ADD COLUMN IF NOT EXISTS chuyen_tu_the_id   uuid;

-- Lọc nhanh thẻ còn hiệu lực (POS/CRM)
CREATE INDEX IF NOT EXISTS idx_the_lt_trangthai_active
  ON the_lieu_trinh(khach_hang_id)
  WHERE da_xoa = false AND bi_dong = false;

-- Mở rộng CHECK trang_thai cho 2 trạng thái mới (chuyển đổi / hoàn tiền).
-- Dùng NOT VALID để KHÔNG chặn dữ liệu import cũ có trang_thai lạ; chỉ áp cho ghi mới.
ALTER TABLE the_lieu_trinh DROP CONSTRAINT IF EXISTS the_lieu_trinh_trang_thai_check;
ALTER TABLE the_lieu_trinh
  ADD CONSTRAINT the_lieu_trinh_trang_thai_check
  CHECK (trang_thai IN ('active','het_buoi','het_han','da_huy','chuyen_doi','hoan_tien'))
  NOT VALID;

COMMENT ON COLUMN the_lieu_trinh.bi_dong IS 'Admin đóng/băng thẻ — không dùng được ở POS, mở lại được';
COMMENT ON COLUMN the_lieu_trinh.da_xoa  IS 'Ẩn mềm (soft-delete) — giữ dữ liệu để đối soát';
