-- ============================================================
-- MIGRATION 084: Ảnh sản phẩm kho
-- Ngày: 06/06/2026
-- Lưu URL ảnh (Supabase Storage bucket `san-pham`) — KHÔNG nhúng ảnh vào code.
-- ============================================================

ALTER TABLE kho_san_pham
  ADD COLUMN IF NOT EXISTS anh_url text;
