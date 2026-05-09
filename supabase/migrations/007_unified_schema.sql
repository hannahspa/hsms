-- Migration 007: Chuẩn hóa kiến trúc dữ liệu thống nhất
-- Ngày: 08/05/2026
-- 1. Tạo domain hinh_thuc_thanh_toan_t dùng chung toàn hệ thống
-- 2. Fix view so_du_vi_thuc_te — dùng v.loai thay vì v.ten
-- 3. Thêm 'the_lieu_trinh' vào CHECK constraints

-- ════════════════════════════════════════════════════
-- BƯỚC 1: Tạo domain thống nhất cho hình thức thanh toán
-- ════════════════════════════════════════════════════
DO $$ BEGIN
  CREATE DOMAIN hinh_thuc_thanh_toan_t AS text
  CHECK (VALUE IN (
    'tien_mat',
    'chuyen_khoan',
    'quet_the',
    'the_tra_truoc',
    'the_lieu_trinh'
  ));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ════════════════════════════════════════════════════
-- BƯỚC 2: Cập nhật CHECK constraints các bảng dùng domain
-- ════════════════════════════════════════════════════

-- doanh_thu.hinh_thuc
ALTER TABLE doanh_thu DROP CONSTRAINT IF EXISTS doanh_thu_hinh_thuc_check;
ALTER TABLE doanh_thu ADD CONSTRAINT doanh_thu_hinh_thuc_check
  CHECK (hinh_thuc IN ('tien_mat', 'chuyen_khoan', 'quet_the', 'the_tra_truoc', 'the_lieu_trinh'));

-- chi_phi.hinh_thuc_thanh_toan
ALTER TABLE chi_phi DROP CONSTRAINT IF EXISTS chi_phi_hinh_thuc_check;
ALTER TABLE chi_phi ADD CONSTRAINT chi_phi_hinh_thuc_check
  CHECK (hinh_thuc_thanh_toan IN ('tien_mat', 'chuyen_khoan', 'quet_the'));

-- thanh_toan.hinh_thuc (POS)
ALTER TABLE thanh_toan DROP CONSTRAINT IF EXISTS thanh_toan_hinh_thuc_check;
ALTER TABLE thanh_toan ADD CONSTRAINT thanh_toan_hinh_thuc_check
  CHECK (hinh_thuc IN ('tien_mat', 'chuyen_khoan', 'quet_the', 'the_tra_truoc', 'the_lieu_trinh'));

-- ════════════════════════════════════════════════════
-- BƯỚC 3: Fix view so_du_vi_thuc_te — dùng v.loai
-- ════════════════════════════════════════════════════
DROP VIEW IF EXISTS so_du_vi_thuc_te;

CREATE VIEW so_du_vi_thuc_te AS
SELECT
  v.id,
  v.ten,
  v.loai,
  v.icon,
  v.thu_tu,
  v.so_du_dau
    + COALESCE((SELECT sum(d.so_tien) FROM doanh_thu d
        WHERE d.hinh_thuc = v.loai::text  -- ← GHÉP BẰNG LOAI
          AND d.hinh_thuc IN ('tien_mat', 'chuyen_khoan', 'quet_the')
      ), 0)
    - COALESCE((SELECT sum(cp.so_tien) FROM chi_phi cp
        WHERE cp.hinh_thuc_thanh_toan = v.loai::text  -- ← GHÉP BẰNG LOAI
      ), 0)
    + COALESCE((SELECT sum(ck.so_tien) FROM chuyen_khoan_noi_bo ck
        WHERE ck.den_vi_id = v.id), 0)
    - COALESCE((SELECT sum(ck.so_tien) FROM chuyen_khoan_noi_bo ck
        WHERE ck.tu_vi_id = v.id), 0)
  AS so_du_hien_tai
FROM vi v
WHERE v.is_active = true
ORDER BY v.thu_tu;

-- Verify
-- SELECT * FROM so_du_vi_thuc_te;
-- SELECT sum(so_du_hien_tai) as tong_tai_san FROM so_du_vi_thuc_te;
