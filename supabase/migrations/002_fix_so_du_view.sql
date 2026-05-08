-- Migration 002: Chuẩn hóa enum + Fix view so_du_vi_thuc_te
-- Ngày: 08/05/2026
-- Mô tả: Sửa dữ liệu 'ngan_hang' → 'chuyen_khoan', fix view, thêm constraint

-- Bước 1: Chuẩn hóa dữ liệu — tất cả 'ngan_hang' → 'chuyen_khoan'
UPDATE chi_phi
SET hinh_thuc_thanh_toan = 'chuyen_khoan'
WHERE hinh_thuc_thanh_toan = 'ngan_hang';

-- Bước 2: Thêm CHECK constraint cho chi_phi
ALTER TABLE chi_phi
  DROP CONSTRAINT IF EXISTS chi_phi_hinh_thuc_check;

ALTER TABLE chi_phi
  ADD CONSTRAINT chi_phi_hinh_thuc_check
  CHECK (hinh_thuc_thanh_toan IN ('tien_mat', 'chuyen_khoan', 'quet_the'));

-- Bước 3: Thêm CHECK constraint cho doanh_thu
ALTER TABLE doanh_thu
  DROP CONSTRAINT IF EXISTS doanh_thu_hinh_thuc_check;

ALTER TABLE doanh_thu
  ADD CONSTRAINT doanh_thu_hinh_thuc_check
  CHECK (hinh_thuc IN ('tien_mat', 'chuyen_khoan', 'quet_the', 'the_tra_truoc'));

-- Bước 4: Drop và tạo lại view so_du_vi_thuc_te (phiên bản đúng + rõ ràng hơn)
DROP VIEW IF EXISTS so_du_vi_thuc_te;

CREATE VIEW so_du_vi_thuc_te AS
SELECT
  v.id,
  v.ten,
  v.loai,
  v.icon,
  v.thu_tu,
  v.so_du_dau
    + COALESCE((
        SELECT sum(d.so_tien)
        FROM doanh_thu d
        WHERE d.hinh_thuc <> 'the_tra_truoc'
          AND (
            (v.loai = 'tien_mat' AND d.hinh_thuc = 'tien_mat')
            OR (v.loai = 'mb_bank' AND d.hinh_thuc = 'chuyen_khoan')
            OR (v.loai = 'tp_bank' AND d.hinh_thuc = 'quet_the')
          )
      ), 0)
    - COALESCE((
        SELECT sum(cp.so_tien)
        FROM chi_phi cp
        WHERE (
          (v.loai = 'tien_mat' AND cp.hinh_thuc_thanh_toan = 'tien_mat')
          OR (v.loai = 'mb_bank' AND cp.hinh_thuc_thanh_toan = 'chuyen_khoan')
          OR (v.loai = 'tp_bank' AND cp.hinh_thuc_thanh_toan = 'quet_the')
        )
      ), 0)
    + COALESCE((
        SELECT sum(ck.so_tien)
        FROM chuyen_khoan_noi_bo ck
        WHERE ck.den_vi_id = v.id
      ), 0)
    - COALESCE((
        SELECT sum(ck.so_tien)
        FROM chuyen_khoan_noi_bo ck
        WHERE ck.tu_vi_id = v.id
      ), 0)
  AS so_du_hien_tai
FROM vi v
WHERE v.is_active = true
ORDER BY v.thu_tu;

-- Verify
-- SELECT * FROM so_du_vi_thuc_te;
-- SELECT sum(so_du_hien_tai) as tong_tai_san FROM so_du_vi_thuc_te;
