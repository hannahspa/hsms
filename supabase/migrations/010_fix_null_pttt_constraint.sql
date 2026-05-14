-- Migration 010: Fix NULL PTTT - add CHECK constraint
-- Ngày: 11/05/2026
-- Mô tả: Database cho phép INSERT NULL vào hinh_thuc_thanh_toan
--   -> Code FormChiPhi set đúng nhưng DB không chặn được NULL

-- 1. Sửa tất cả NULL còn tồn đọng thành 'tien_mat'
UPDATE chi_phi SET hinh_thuc_thanh_toan = 'tien_mat' WHERE hinh_thuc_thanh_toan IS NULL;

-- 2. Thêm NOT NULL constraint
ALTER TABLE chi_phi ALTER COLUMN hinh_thuc_thanh_toan SET NOT NULL;

-- 3. Đảm bảo CHECK constraint
ALTER TABLE chi_phi DROP CONSTRAINT IF EXISTS chi_phi_hinh_thuc_check;
ALTER TABLE chi_phi ADD CONSTRAINT chi_phi_hinh_thuc_check CHECK (hinh_thuc_thanh_toan IN ('tien_mat', 'chuyen_khoan', 'quet_the'));

-- Verify
-- SELECT hinh_thuc_thanh_toan, count(*) FROM chi_phi GROUP BY hinh_thuc_thanh_toan;
