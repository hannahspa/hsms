-- Migration 006: POS Atomic Checkout RPC
-- Ngày: 08/05/2026
-- Hàm PostgreSQL để chốt đơn hàng trong 1 transaction

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
  v_doanh_thu_id uuid;
  v_gd_id uuid;
  v_card_count integer;
  v_kh_id uuid;
BEGIN
  -- Lock the order row to prevent concurrent modification
  SELECT * INTO v_dh FROM don_hang WHERE id = p_don_hang_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Đơn hàng không tồn tại');
  END IF;

  IF v_dh.trang_thai != 'draft' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Đơn hàng đã được chốt trước đó');
  END IF;

  -- Calculate totals from line items
  SELECT COALESCE(SUM(thanh_tien), 0) INTO v_tong_tien
  FROM don_hang_chi_tiet WHERE don_hang_id = p_don_hang_id;

  -- Calculate total payments
  SELECT COALESCE(SUM(so_tien), 0) INTO v_total_paid
  FROM thanh_toan WHERE don_hang_id = p_don_hang_id;

  v_thuc_thu := v_tong_tien - p_giam_gia;

  -- Validate: if no customer and underpaid, reject
  IF v_total_paid < v_thuc_thu AND v_dh.khach_hang_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Khách lẻ không được ghi nợ. Vui lòng thanh toán đủ.');
  END IF;

  -- Update order
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

  -- Process each payment → 1:1 doanh_thu record
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

  -- Process each line item (non-revenue side effects)
  FOR v_item IN
    SELECT * FROM don_hang_chi_tiet WHERE don_hang_id = p_don_hang_id
  LOOP
    -- sản phẩm: tạo kho_giao_dich (xuat_ban)
    IF v_item.loai_item = 'san_pham' THEN
      INSERT INTO kho_giao_dich (san_pham_id, loai, so_luong, gia_don_vi, ghi_chu, ngay, nguoi_thuc_hien, don_hang_id, khach_hang_id)
      VALUES (v_item.san_pham_id, 'xuat_ban', v_item.so_luong, v_item.don_gia,
              'Bán từ đơn ' || (SELECT ma_don FROM don_hang WHERE id = p_don_hang_id),
              v_dh.ngay, v_dh.nguoi_tao, p_don_hang_id, v_dh.khach_hang_id);

      UPDATE kho_san_pham SET ton_kho = ton_kho - v_item.so_luong WHERE id = v_item.san_pham_id;
    END IF;

    -- thẻ liệu trình: cập nhật số buổi đã dùng
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

  -- Handle debt
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

  -- Update customer stats
  IF v_dh.khach_hang_id IS NOT NULL THEN
    UPDATE khach_hang SET
      tong_chi_tieu = tong_chi_tieu + v_thuc_thu,
      so_lan_den = so_lan_den + 1,
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

  -- Reverse product inventory
  FOR v_item IN SELECT * FROM don_hang_chi_tiet WHERE don_hang_id = p_don_hang_id AND loai_item = 'san_pham'
  LOOP
    UPDATE kho_san_pham SET ton_kho = ton_kho + v_item.so_luong WHERE id = v_item.san_pham_id;

    -- Mark kho_giao_dich as reversed
    UPDATE kho_giao_dich SET ghi_chu = ghi_chu || ' [ĐÃ HỦY]'
    WHERE don_hang_id = p_don_hang_id AND san_pham_id = v_item.san_pham_id;
  END LOOP;

  -- Reverse treatment card usage
  FOR v_item IN SELECT * FROM don_hang_chi_tiet WHERE don_hang_id = p_don_hang_id AND loai_item = 'the_lieu_trinh'
  LOOP
    UPDATE the_lieu_trinh SET
      so_buoi_da_dung = GREATEST(0, so_buoi_da_dung - v_item.so_luong),
      trang_thai = 'active'
    WHERE id = v_item.the_lieu_trinh_id AND so_buoi_da_dung >= v_item.so_luong;
  END LOOP;

  -- Delete revenue records
  DELETE FROM doanh_thu WHERE don_hang_id = p_don_hang_id;

  -- Delete debt records
  DELETE FROM cong_no_khach_hang WHERE don_hang_id = p_don_hang_id;

  -- Mark order as cancelled
  UPDATE don_hang SET
    trang_thai = 'huy',
    updated_at = now()
  WHERE id = p_don_hang_id;

  RETURN jsonb_build_object('success', true, 'ma_don', v_dh.ma_don);
END;
$$;
