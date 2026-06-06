-- ============================================================
-- MIGRATION 083: Đơn vị quy đổi (kho thông minh)
-- Ngày: 05/06/2026
-- Tồn kho theo ĐƠN VỊ CƠ SỞ nhỏ nhất (don_vi: gram/miếng/ml). Mua theo
-- ĐƠN VỊ NHẬP lớn (túi/hộp) với hệ số quy đổi → nhập tự quy ra cơ sở.
-- gia_nhap lưu = giá / 1 đơn vị cơ sở (giá lớn ÷ quy_doi) → tính giá trị tồn.
-- ============================================================

ALTER TABLE kho_san_pham
  ADD COLUMN IF NOT EXISTS don_vi_nhap text,                       -- đơn vị mua vào (túi, hộp...). NULL = trùng đơn vị cơ sở
  ADD COLUMN IF NOT EXISTS quy_doi numeric NOT NULL DEFAULT 1;     -- 1 đơn vị nhập = quy_doi đơn vị cơ sở
