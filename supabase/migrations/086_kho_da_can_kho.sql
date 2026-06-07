-- ============================================================
-- MIGRATION 086: Cờ "đã cân kho %" (khoá chống thất thoát)
-- Ngày: 06/06/2026
-- Cho phép nhập % còn lại thực tế MỘT LẦN để cân thanh pin cho đúng,
-- sau đó khoá (không sửa tay) — chỉ đổi tồn qua Nhập/Xuất.
-- ============================================================

ALTER TABLE kho_san_pham
  ADD COLUMN IF NOT EXISTS da_can_kho boolean NOT NULL DEFAULT false;
