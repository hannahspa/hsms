-- Migration 008: Mã code thống nhất + View báo cáo tổng hợp
-- Ngày: 09/05/2026
-- 1. Thêm cột mã UNIQUE vào khach_hang, the_lieu_trinh, dich_vu
-- 2. Tạo view bao_cao_doanh_thu_day_du (gộp 3 nguồn, không ảnh hưởng Sổ Thu Chi)

-- ════════════════════════════════════════════════════
-- BƯỚC 1: Thêm cột mã UNIQUE
-- ════════════════════════════════════════════════════
ALTER TABLE khach_hang ADD COLUMN IF NOT EXISTS ma_kh text UNIQUE;
ALTER TABLE the_lieu_trinh ADD COLUMN IF NOT EXISTS ma_the text UNIQUE;
ALTER TABLE dich_vu ADD COLUMN IF NOT EXISTS ma_dv text UNIQUE;
ALTER TABLE kho_san_pham ADD COLUMN IF NOT EXISTS ma_sp text UNIQUE;

-- ════════════════════════════════════════════════════
-- BƯỚC 2: Cập nhật mã DV cho 181 dịch vụ hiện có
-- ════════════════════════════════════════════════════
-- Sẽ chạy script Python import sau — tạm thời để NULL

-- ════════════════════════════════════════════════════
-- BƯỚC 3: View báo cáo doanh thu đầy đủ
--          Gộp: doanh_thu (thủ công) + doanh_thu (POS) + don_hang (lịch sử MySpa)
--          Có cột nguon để phân biệt
--          KHÔNG ảnh hưởng Sổ Thu Chi (so_du_vi_thuc_te vẫn chỉ đọc doanh_thu)
-- ════════════════════════════════════════════════════
DROP VIEW IF EXISTS bao_cao_doanh_thu_day_du;

CREATE VIEW bao_cao_doanh_thu_day_du AS
-- Nguồn 1: Lễ Tân nhập tay (đang dùng)
SELECT
  id,
  ngay,
  hinh_thuc,
  so_tien,
  dien_giai,
  'manual' AS nguon,
  NULL::uuid AS don_hang_id,
  created_at
FROM doanh_thu
WHERE nguon = 'manual' OR nguon IS NULL

UNION ALL

-- Nguồn 2: POS tự động (tương lai)
SELECT
  id,
  ngay,
  hinh_thuc,
  so_tien,
  dien_giai,
  'pos' AS nguon,
  don_hang_id,
  created_at
FROM doanh_thu
WHERE nguon = 'pos'

UNION ALL

-- Nguồn 3: Đơn hàng lịch sử từ MySpa (import — KHÔNG vào doanh_thu)
SELECT
  dh.id,
  dh.ngay,
  COALESCE(
    (SELECT tt.hinh_thuc FROM thanh_toan tt WHERE tt.don_hang_id = dh.id LIMIT 1),
    'chuyen_khoan'
  ) AS hinh_thuc,
  dh.thuc_thu AS so_tien,
  'ĐH cũ: ' || COALESCE(dh.ma_don, '') AS dien_giai,
  'migration' AS nguon,
  dh.id AS don_hang_id,
  dh.created_at
FROM don_hang dh
WHERE dh.trang_thai != 'huy';

-- ════════════════════════════════════════════════════
-- BƯỚC 4: Hàm tính tổng chi tiêu KH từ đơn hàng
-- ════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION tinh_tong_chi_tieu_kh(p_khach_hang_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(SUM(dh.thuc_thu), 0)
  FROM don_hang dh
  WHERE dh.khach_hang_id = p_khach_hang_id
    AND dh.trang_thai != 'huy';
$$;

-- ════════════════════════════════════════════════════
-- BƯỚC 5: View lịch sử dịch vụ cho CRM
-- ════════════════════════════════════════════════════
DROP VIEW IF EXISTS lich_su_dich_vu_kh;

CREATE VIEW lich_su_dich_vu_kh AS
SELECT
  dh.khach_hang_id,
  dh.ngay,
  dh.ma_don,
  dhct.loai_item,
  COALESCE(dv.ten, sp.ten, tlt.ten_dich_vu) AS ten_dich_vu,
  dhct.so_luong,
  dhct.don_gia,
  dhct.thanh_tien,
  nv.ho_ten AS ktv,
  dhct.the_lieu_trinh_id
FROM don_hang dh
JOIN don_hang_chi_tiet dhct ON dhct.don_hang_id = dh.id
LEFT JOIN dich_vu dv ON dv.id = dhct.dich_vu_id
LEFT JOIN kho_san_pham sp ON sp.id = dhct.san_pham_id
LEFT JOIN the_lieu_trinh tlt ON tlt.id = dhct.the_lieu_trinh_id
LEFT JOIN nhan_vien nv ON nv.id = dhct.nhan_vien_id
WHERE dh.trang_thai != 'huy'
ORDER BY dh.ngay DESC;
