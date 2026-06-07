-- ============================================================
-- MIGRATION 085: Định mức tồn ("đầy 100%") cho thanh % pin
-- Ngày: 06/06/2026
-- ton_dinh_muc = mức tồn cao nhất từng đạt (lần nhập nhiều nhất) → làm mốc 100%
-- để vẽ thanh % còn lại (chỉ dùng cho tiêu hao/vật tư). Tự cập nhật khi nhập kho.
-- ============================================================

ALTER TABLE kho_san_pham
  ADD COLUMN IF NOT EXISTS ton_dinh_muc numeric;

-- Khởi tạo = tồn hiện tại (lần đầu = 100%)
UPDATE kho_san_pham SET ton_dinh_muc = ton_kho
  WHERE ton_dinh_muc IS NULL AND ton_kho > 0;
