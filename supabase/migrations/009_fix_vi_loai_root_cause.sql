-- Migration 009: Fix ROOT CAUSE — vi.loai enum chưa có 'chuyen_khoan'/'quet_the'
-- Ngày: 09/05/2026
--
-- ═══════════════════════════════════════════════════════════════
-- ⚠️ QUAN TRỌNG: Chạy 2 dòng ALTER TYPE RIÊNG TRƯỚC
--    (PostgreSQL không cho ALTER TYPE chạy trong transaction)
--    Sau đó chạy phần còn lại
-- ═══════════════════════════════════════════════════════════════
--
-- Vấn đề: Migration 003 chưa được execute → MB Bank & TP Bank vẫn có loai='ngan_hang'
-- → View so_du_vi_thuc_te không match được doanh_thu/chi_phi của 2 ví này
-- → 621M doanh thu CK + 77M quẹt thẻ + 770M chi phí CK bị "vô hình" với view
-- → Tổng tài sản bị sai lệch ~70 triệu

-- ════════════════════════════════════════════════════
-- PHẦN 1: CHẠY RIÊNG 2 DÒNG NÀY TRƯỚC
-- ════════════════════════════════════════════════════
ALTER TYPE loai_vi ADD VALUE IF NOT EXISTS 'chuyen_khoan';
ALTER TYPE loai_vi ADD VALUE IF NOT EXISTS 'quet_the';
-- ════════════════════════════════════════════════════
-- SAU KHI PHẦN 1 THÀNH CÔNG, CHẠY TIẾP PHẦN 2
-- ════════════════════════════════════════════════════

-- BƯỚC 2: Cập nhật vi.loai cho MB Bank & TP Bank
UPDATE vi SET loai = 'chuyen_khoan' WHERE ten = 'MB Bank' AND loai = 'ngan_hang';
UPDATE vi SET loai = 'quet_the'    WHERE ten = 'TP Bank' AND loai = 'ngan_hang';

-- BƯỚC 3: Sửa chi_phi có hinh_thuc_thanh_toan SAI so với vi.loai
--    (190.000đ = hinh_thuc='tien_mat' nhưng vi_id → MB Bank)
UPDATE chi_phi cp
SET hinh_thuc_thanh_toan = v.loai
FROM vi v
WHERE cp.vi_id = v.id
  AND cp.hinh_thuc_thanh_toan != v.loai::text
  AND v.loai IN ('tien_mat', 'chuyen_khoan', 'quet_the');

-- BƯỚC 4: Tạo lại view với logic ghép bằng v.loai (bản cuối)
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
        WHERE d.hinh_thuc = v.loai::text
          AND d.hinh_thuc IN ('tien_mat', 'chuyen_khoan', 'quet_the')
      ), 0)
    - COALESCE((SELECT sum(cp.so_tien) FROM chi_phi cp
        WHERE cp.hinh_thuc_thanh_toan = v.loai::text
      ), 0)
    + COALESCE((SELECT sum(ck.so_tien) FROM chuyen_khoan_noi_bo ck
        WHERE ck.den_vi_id = v.id), 0)
    - COALESCE((SELECT sum(ck.so_tien) FROM chuyen_khoan_noi_bo ck
        WHERE ck.tu_vi_id = v.id), 0)
  AS so_du_hien_tai
FROM vi v
WHERE v.is_active = true
ORDER BY v.thu_tu;

-- BƯỚC 5: Trigger tự động đồng bộ chi_phi.hinh_thuc_thanh_toan
--    từ vi.loai khi INSERT/UPDATE, ngăn dữ liệu sai trong tương lai
CREATE OR REPLACE FUNCTION chi_phi_sync_hinh_thuc()
RETURNS trigger AS $$
BEGIN
  IF NEW.vi_id IS NOT NULL THEN
    SELECT loai::text INTO NEW.hinh_thuc_thanh_toan
    FROM vi WHERE id = NEW.vi_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_chi_phi_sync_hinh_thuc ON chi_phi;
CREATE TRIGGER trg_chi_phi_sync_hinh_thuc
  BEFORE INSERT OR UPDATE OF vi_id ON chi_phi
  FOR EACH ROW
  EXECUTE FUNCTION chi_phi_sync_hinh_thuc();

-- BƯỚC 6: Trigger ghi log khi so_du_dau bị sửa thủ công
CREATE OR REPLACE FUNCTION vi_log_so_du_dau_change()
RETURNS trigger AS $$
BEGIN
  IF OLD.so_du_dau IS DISTINCT FROM NEW.so_du_dau THEN
    INSERT INTO nhat_ky_hoat_dong (nguoi_dung_id, hanh_dong, bang, du_lieu_cu, du_lieu_moi)
    VALUES (
      auth.uid(),
      'sua_so_du_dau',
      'vi',
      jsonb_build_object('vi_id', OLD.id::text, 'ten', OLD.ten, 'so_du_dau', OLD.so_du_dau),
      jsonb_build_object('vi_id', NEW.id::text, 'ten', NEW.ten, 'so_du_dau', NEW.so_du_dau)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_vi_log_so_du_dau ON vi;
CREATE TRIGGER trg_vi_log_so_du_dau
  BEFORE UPDATE ON vi
  FOR EACH ROW
  EXECUTE FUNCTION vi_log_so_du_dau_change();

-- ════════════════════════════════════════════════════
-- VERIFY
-- ════════════════════════════════════════════════════
SELECT '=== VI LOAI SAU FIX ===' as checkpoint;
SELECT ten, loai FROM vi ORDER BY thu_tu;

SELECT '=== SO DU VI THUC TE SAU FIX ===' as checkpoint;
SELECT ten, so_du_hien_tai FROM so_du_vi_thuc_te ORDER BY thu_tu;

SELECT '=== TONG TAI SAN SAU FIX ===' as checkpoint;
SELECT sum(so_du_hien_tai) as tong_tai_san FROM so_du_vi_thuc_te;

SELECT '=== CHI_PHI SAU FIX — KIEM TRA CON MISMATCH ===' as checkpoint;
SELECT COUNT(*) as so_luong_con_sai
FROM chi_phi cp
JOIN vi v ON cp.vi_id = v.id
WHERE cp.hinh_thuc_thanh_toan != v.loai::text;
