-- Migration 010: Catch-up tất cả migration còn thiếu
-- Ngày: 09/05/2026
-- Tổng hợp từ: 005 (partial), 006 (full), 007 (partial), 008 (partial)
-- CHẠY TOÀN BỘ FILE NÀY 1 LẦN trong SQL Editor

-- ════════════════════════════════════════════════════
-- PHẦN 1: Migration 005 — khach_hang computed columns
-- ════════════════════════════════════════════════════
ALTER TABLE khach_hang ADD COLUMN IF NOT EXISTS tong_chi_tieu integer DEFAULT 0;
ALTER TABLE khach_hang ADD COLUMN IF NOT EXISTS so_lan_den integer DEFAULT 0;
ALTER TABLE khach_hang ADD COLUMN IF NOT EXISTS hang text DEFAULT 'bronze';

-- ════════════════════════════════════════════════════
-- PHẦN 2: Migration 007 — Domain + CHECK constraints
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

-- Cập nhật CHECK constraint doanh_thu (thêm the_lieu_trinh)
ALTER TABLE doanh_thu DROP CONSTRAINT IF EXISTS doanh_thu_hinh_thuc_check;
ALTER TABLE doanh_thu ADD CONSTRAINT doanh_thu_hinh_thuc_check
  CHECK (hinh_thuc IN ('tien_mat', 'chuyen_khoan', 'quet_the', 'the_tra_truoc', 'the_lieu_trinh'));

-- Cập nhật CHECK constraint chi_phi
ALTER TABLE chi_phi DROP CONSTRAINT IF EXISTS chi_phi_hinh_thuc_check;
ALTER TABLE chi_phi ADD CONSTRAINT chi_phi_hinh_thuc_check
  CHECK (hinh_thuc_thanh_toan IN ('tien_mat', 'chuyen_khoan', 'quet_the'));

-- Cập nhật CHECK constraint thanh_toan (POS)
ALTER TABLE thanh_toan DROP CONSTRAINT IF EXISTS thanh_toan_hinh_thuc_check;
ALTER TABLE thanh_toan ADD CONSTRAINT thanh_toan_hinh_thuc_check
  CHECK (hinh_thuc IN ('tien_mat', 'chuyen_khoan', 'quet_the', 'the_tra_truoc', 'the_lieu_trinh'));

-- ════════════════════════════════════════════════════
-- PHẦN 3: Migration 006 — POS Atomic Checkout RPC
-- ════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION pos_finalize_order(
  p_don_hang_id uuid,
  p_trang_thai text,
  p_giam_gia integer DEFAULT 0,
  p_con_no integer DEFAULT 0,
  p_ghi_chu text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_dh don_hang%ROWTYPE;
  v_item record;
  v_payment record;
  v_tong_tien integer := 0;
  v_thuc_thu integer := 0;
  v_total_paid integer := 0;
  v_kh_id uuid;
BEGIN
  -- Lock đơn hàng để tránh concurrent modification
  SELECT * INTO v_dh FROM don_hang WHERE id = p_don_hang_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Đơn hàng không tồn tại');
  END IF;

  IF v_dh.trang_thai != 'draft' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Đơn hàng đã được chốt trước đó');
  END IF;

  -- Tính tổng tiền từ line items
  SELECT COALESCE(SUM(thanh_tien), 0) INTO v_tong_tien
  FROM don_hang_chi_tiet WHERE don_hang_id = p_don_hang_id;

  -- Tính tổng thanh toán
  SELECT COALESCE(SUM(so_tien), 0) INTO v_total_paid
  FROM thanh_toan WHERE don_hang_id = p_don_hang_id;

  v_thuc_thu := v_tong_tien - p_giam_gia;

  -- Validate: khách lẻ phải thanh toán đủ
  IF v_total_paid < v_thuc_thu AND v_dh.khach_hang_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Khách lẻ không được ghi nợ. Vui lòng thanh toán đủ.');
  END IF;

  -- Cập nhật đơn hàng
  UPDATE don_hang SET
    tong_tien_hang = v_tong_tien,
    giam_gia = p_giam_gia,
    thuc_thu = v_thuc_thu,
    con_no = GREATEST(0, v_thuc_thu - v_total_paid),
    trang_thai = CASE
      WHEN v_total_paid >= v_thuc_thu THEN 'da_thanh_toan'
      ELSE 'no_mot_phan'
    END,
    ghi_chu = COALESCE(p_ghi_chu, v_dh.ghi_chu),
    updated_at = now()
  WHERE id = p_don_hang_id;

  -- Tạo doanh_thu cho mỗi lần thanh toán (1:1)
  FOR v_payment IN
    SELECT * FROM thanh_toan WHERE don_hang_id = p_don_hang_id
  LOOP
    INSERT INTO doanh_thu (ngay, hinh_thuc, so_tien, dien_giai, nguoi_nhap, don_hang_id, nguon)
    VALUES (
      v_dh.ngay,
      v_payment.hinh_thuc,
      v_payment.so_tien,
      'POS ' || v_dh.ma_don,
      (SELECT ho_ten FROM profiles WHERE id = v_dh.nguoi_tao),
      p_don_hang_id,
      'pos'
    );
  END LOOP;

  -- Xử lý từng line item
  FOR v_item IN
    SELECT * FROM don_hang_chi_tiet WHERE don_hang_id = p_don_hang_id
  LOOP
    -- Sản phẩm: xuất kho
    IF v_item.loai_item = 'san_pham' THEN
      INSERT INTO kho_giao_dich (san_pham_id, loai, so_luong, gia_don_vi, ghi_chu, ngay, nguoi_thuc_hien, don_hang_id, khach_hang_id)
      VALUES (v_item.san_pham_id, 'xuat_ban', v_item.so_luong, v_item.don_gia,
              'Bán từ đơn ' || (SELECT ma_don FROM don_hang WHERE id = p_don_hang_id),
              v_dh.ngay, v_dh.nguoi_tao, p_don_hang_id, v_dh.khach_hang_id);

      UPDATE kho_san_pham SET ton_kho = ton_kho - v_item.so_luong WHERE id = v_item.san_pham_id;
    END IF;

    -- Thẻ liệu trình: trừ buổi
    IF v_item.loai_item = 'the_lieu_trinh' THEN
      UPDATE the_lieu_trinh SET
        so_buoi_da_dung = so_buoi_da_dung + v_item.so_luong
      WHERE id = v_item.the_lieu_trinh_id;

      UPDATE the_lieu_trinh SET
        trang_thai = 'het_buoi'
      WHERE id = v_item.the_lieu_trinh_id
        AND (so_buoi_tong - so_buoi_da_dung) <= 0;

      INSERT INTO lich_su_dung_the (the_lieu_trinh_id, don_hang_id, nguoi_thuc_hien, ngay)
      VALUES (v_item.the_lieu_trinh_id, p_don_hang_id, v_item.nhan_vien_id, v_dh.ngay);
    END IF;
  END LOOP;

  -- Xử lý công nợ
  IF v_total_paid < v_thuc_thu AND v_dh.khach_hang_id IS NOT NULL THEN
    v_kh_id := v_dh.khach_hang_id;
    INSERT INTO cong_no_khach_hang (khach_hang_id, don_hang_id, loai, so_tien, so_du_con_lai, ngay, ghi_chu)
    SELECT
      v_kh_id,
      p_don_hang_id,
      'phat_sinh',
      v_thuc_thu - v_total_paid,
      COALESCE((SELECT so_du_con_lai FROM cong_no_khach_hang WHERE khach_hang_id = v_kh_id ORDER BY created_at DESC LIMIT 1), 0) + (v_thuc_thu - v_total_paid),
      v_dh.ngay,
      'Phát sinh từ đơn ' || (SELECT ma_don FROM don_hang WHERE id = p_don_hang_id);
  END IF;

  -- Cập nhật thống kê khách hàng
  IF v_dh.khach_hang_id IS NOT NULL THEN
    UPDATE khach_hang SET
      tong_chi_tieu = COALESCE(tong_chi_tieu, 0) + v_thuc_thu,
      so_lan_den = COALESCE(so_lan_den, 0) + 1,
      lan_cuoi_den = v_dh.ngay
    WHERE id = v_dh.khach_hang_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'ma_don', (SELECT ma_don FROM don_hang WHERE id = p_don_hang_id),
    'tong_tien', v_tong_tien,
    'thuc_thu', v_thuc_thu,
    'con_no', GREATEST(0, v_thuc_thu - v_total_paid)
  );
END;
$$;

-- ════════════════════════════════════════════════════
-- Hàm hủy đơn hàng (reverse tất cả)
-- ════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION pos_void_order(p_don_hang_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_dh don_hang%ROWTYPE;
  v_item record;
BEGIN
  SELECT * INTO v_dh FROM don_hang WHERE id = p_don_hang_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Đơn hàng không tồn tại');
  END IF;

  IF v_dh.trang_thai = 'huy' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Đơn hàng đã hủy trước đó');
  END IF;

  -- Hoàn kho sản phẩm
  FOR v_item IN SELECT * FROM don_hang_chi_tiet WHERE don_hang_id = p_don_hang_id AND loai_item = 'san_pham'
  LOOP
    UPDATE kho_san_pham SET ton_kho = ton_kho + v_item.so_luong WHERE id = v_item.san_pham_id;
    UPDATE kho_giao_dich SET ghi_chu = COALESCE(ghi_chu, '') || ' [ĐÃ HỦY]'
    WHERE don_hang_id = p_don_hang_id AND san_pham_id = v_item.san_pham_id;
  END LOOP;

  -- Hoàn buổi thẻ liệu trình
  FOR v_item IN SELECT * FROM don_hang_chi_tiet WHERE don_hang_id = p_don_hang_id AND loai_item = 'the_lieu_trinh'
  LOOP
    UPDATE the_lieu_trinh SET
      so_buoi_da_dung = GREATEST(0, so_buoi_da_dung - v_item.so_luong),
      trang_thai = 'active'
    WHERE id = v_item.the_lieu_trinh_id AND so_buoi_da_dung >= v_item.so_luong;
  END LOOP;

  -- Xóa doanh thu POS
  DELETE FROM doanh_thu WHERE don_hang_id = p_don_hang_id;

  -- Xóa công nợ
  DELETE FROM cong_no_khach_hang WHERE don_hang_id = p_don_hang_id;

  -- Đánh dấu hủy
  UPDATE don_hang SET
    trang_thai = 'huy',
    updated_at = now()
  WHERE id = p_don_hang_id;

  RETURN jsonb_build_object('success', true, 'ma_don', v_dh.ma_don);
END;
$$;

-- ════════════════════════════════════════════════════
-- PHẦN 4: Migration 008 — Mã code + Hàm CRM
-- ════════════════════════════════════════════════════
ALTER TABLE khach_hang ADD COLUMN IF NOT EXISTS ma_kh text UNIQUE;
ALTER TABLE the_lieu_trinh ADD COLUMN IF NOT EXISTS ma_the text UNIQUE;
ALTER TABLE kho_san_pham ADD COLUMN IF NOT EXISTS ma_sp text UNIQUE;

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
-- VERIFY
-- ════════════════════════════════════════════════════
SELECT '=== VERIFY MIGRATION 010 ===' as checkpoint;

SELECT 'khach_hang columns' as item,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name='khach_hang' AND column_name='tong_chi_tieu') as tong_chi_tieu,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name='khach_hang' AND column_name='so_lan_den') as so_lan_den,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name='khach_hang' AND column_name='hang') as hang,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name='khach_hang' AND column_name='ma_kh') as ma_kh;

SELECT 'code columns' as item,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name='kho_san_pham' AND column_name='ma_sp') as ma_sp,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name='the_lieu_trinh' AND column_name='ma_the') as ma_the;

SELECT 'RPC functions' as item,
  (SELECT COUNT(*) FROM information_schema.routines WHERE routine_name='pos_finalize_order') as pos_finalize_order,
  (SELECT COUNT(*) FROM information_schema.routines WHERE routine_name='pos_void_order') as pos_void_order,
  (SELECT COUNT(*) FROM information_schema.routines WHERE routine_name='tinh_tong_chi_tieu_kh') as tinh_tong_chi_tieu_kh;
