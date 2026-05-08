-- Migration 003: Fix vi.loai enum + Chuẩn hóa toàn bộ
-- Ngày: 08/05/2026
-- ⚠️ CHẠY THEO 2 BƯỚC RIÊNG BIỆT (PostgreSQL yêu cầu)

-- ════════════════════════════════════════════════════
-- BƯỚC 1: Chạy RIÊNG 2 dòng này trước
-- ════════════════════════════════════════════════════
ALTER TYPE loai_vi ADD VALUE IF NOT EXISTS 'chuyen_khoan';
ALTER TYPE loai_vi ADD VALUE IF NOT EXISTS 'quet_the';

-- Sau khi chạy Bước 1 thành công, mới chạy tiếp Bước 2 bên dưới

-- ════════════════════════════════════════════════════
-- BƯỚC 2: Chạy tất cả phần còn lại
-- ════════════════════════════════════════════════════

-- Cập nhật loai cho từng ví
UPDATE vi SET loai = 'chuyen_khoan' WHERE ten = 'MB Bank';
UPDATE vi SET loai = 'quet_the'    WHERE ten = 'TP Bank';

-- Cập nhật chi_phi còn sót (nếu có) theo vi_id
UPDATE chi_phi cp
SET hinh_thuc_thanh_toan = v.ten
FROM vi v
WHERE cp.vi_id = v.id
  AND cp.hinh_thuc_thanh_toan !=
    CASE WHEN v.ten = 'MB Bank' THEN 'chuyen_khoan'
         WHEN v.ten = 'TP Bank' THEN 'quet_the'
         ELSE 'tien_mat' END;

-- Tạo lại view với logic chuẩn (dùng v.ten để an toàn)
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
        WHERE d.hinh_thuc <> 'the_tra_truoc'
          AND ((v.ten = 'Tiền Mặt' AND d.hinh_thuc = 'tien_mat')
            OR (v.ten = 'MB Bank'  AND d.hinh_thuc = 'chuyen_khoan')
            OR (v.ten = 'TP Bank'  AND d.hinh_thuc = 'quet_the'))), 0)
    - COALESCE((SELECT sum(cp.so_tien) FROM chi_phi cp
        WHERE ((v.ten = 'Tiền Mặt' AND cp.hinh_thuc_thanh_toan = 'tien_mat')
            OR (v.ten = 'MB Bank'  AND cp.hinh_thuc_thanh_toan = 'chuyen_khoan')
            OR (v.ten = 'TP Bank'  AND cp.hinh_thuc_thanh_toan = 'quet_the'))), 0)
    + COALESCE((SELECT sum(ck.so_tien) FROM chuyen_khoan_noi_bo ck
        WHERE ck.den_vi_id = v.id), 0)
    - COALESCE((SELECT sum(ck.so_tien) FROM chuyen_khoan_noi_bo ck
        WHERE ck.tu_vi_id = v.id), 0)
  AS so_du_hien_tai
FROM vi v
WHERE v.is_active = true
ORDER BY v.thu_tu;

-- Verify
SELECT * FROM so_du_vi_thuc_te;
SELECT sum(so_du_hien_tai) as tong_tai_san FROM so_du_vi_thuc_te;
