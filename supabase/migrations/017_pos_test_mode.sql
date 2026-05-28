-- Migration 017: POS Test Mode — thêm p_skip_doanh_thu vào pos_finalize_order
-- Khi p_skip_doanh_thu = true: chốt đơn bình thường nhưng KHÔNG ghi vào bảng doanh_thu
-- Dùng trong quá trình test POS để không làm ô nhiễm Sổ Thu Chi

CREATE OR REPLACE FUNCTION pos_finalize_order(
  p_don_hang_id       uuid,
  p_trang_thai        text,
  p_giam_gia          integer  DEFAULT 0,
  p_con_no            integer  DEFAULT 0,
  p_ghi_chu           text     DEFAULT NULL,
  p_skip_doanh_thu    boolean  DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_dh            don_hang%ROWTYPE;
  v_item          record;
  v_payment       record;
  v_tong_tien     integer := 0;
  v_thuc_thu      integer := 0;
  v_total_paid    integer := 0;
  v_kh_id         uuid;
BEGIN
  SELECT * INTO v_dh FROM don_hang WHERE id = p_don_hang_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Đơn hàng không tồn tại');
  END IF;

  IF v_dh.trang_thai != 'draft' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Đơn hàng đã được chốt trước đó');
  END IF;

  SELECT COALESCE(SUM(thanh_tien), 0) INTO v_tong_tien
  FROM don_hang_chi_tiet WHERE don_hang_id = p_don_hang_id;

  SELECT COALESCE(SUM(so_tien), 0) INTO v_total_paid
  FROM thanh_toan WHERE don_hang_id = p_don_hang_id;

  v_thuc_thu := v_tong_tien - p_giam_gia;

  IF v_total_paid < v_thuc_thu AND v_dh.khach_hang_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Khách lẻ không được ghi nợ. Vui lòng thanh toán đủ.');
  END IF;

  UPDATE don_hang SET
    tong_tien_hang = v_tong_tien,
    giam_gia       = p_giam_gia,
    thuc_thu       = v_thuc_thu,
    con_no         = GREATEST(0, v_thuc_thu - v_total_paid),
    trang_thai     = CASE
                       WHEN v_total_paid >= v_thuc_thu THEN 'da_thanh_toan'
                       ELSE 'no_mot_phan'
                     END,
    ghi_chu        = COALESCE(p_ghi_chu, v_dh.ghi_chu),
    updated_at     = now()
  WHERE id = p_don_hang_id;

  -- Ghi vào doanh_thu — bỏ qua nếu test mode
  IF NOT p_skip_doanh_thu THEN
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
  END IF;

  -- Xử lý các loại dòng hàng
  FOR v_item IN
    SELECT * FROM don_hang_chi_tiet WHERE don_hang_id = p_don_hang_id
  LOOP
    IF v_item.loai_item = 'san_pham' THEN
      INSERT INTO kho_giao_dich (san_pham_id, loai, so_luong, gia_don_vi, ghi_chu, ngay, nguoi_thuc_hien, don_hang_id, khach_hang_id)
      VALUES (v_item.san_pham_id, 'xuat_ban', v_item.so_luong, v_item.don_gia,
              'Bán từ đơn ' || (SELECT ma_don FROM don_hang WHERE id = p_don_hang_id),
              v_dh.ngay, v_dh.nguoi_tao, p_don_hang_id, v_dh.khach_hang_id);
      UPDATE kho_san_pham SET ton_kho = ton_kho - v_item.so_luong WHERE id = v_item.san_pham_id;
    END IF;

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

  -- Công nợ khách hàng
  IF v_total_paid < v_thuc_thu AND v_dh.khach_hang_id IS NOT NULL THEN
    v_kh_id := v_dh.khach_hang_id;
    INSERT INTO cong_no_khach_hang (khach_hang_id, don_hang_id, loai, so_tien, so_du_con_lai, ngay, ghi_chu)
    SELECT
      v_kh_id, p_don_hang_id, 'phat_sinh',
      v_thuc_thu - v_total_paid,
      COALESCE((SELECT so_du_con_lai FROM cong_no_khach_hang WHERE khach_hang_id = v_kh_id ORDER BY created_at DESC LIMIT 1), 0) + (v_thuc_thu - v_total_paid),
      v_dh.ngay,
      'Phát sinh từ đơn ' || (SELECT ma_don FROM don_hang WHERE id = p_don_hang_id);
  END IF;

  -- Cập nhật thống kê khách hàng
  IF v_dh.khach_hang_id IS NOT NULL THEN
    UPDATE khach_hang SET
      tong_chi_tieu = tong_chi_tieu + v_thuc_thu,
      so_lan_den    = so_lan_den + 1,
      lan_cuoi_den  = v_dh.ngay
    WHERE id = v_dh.khach_hang_id;
  END IF;

  RETURN jsonb_build_object(
    'success',   true,
    'ma_don',    (SELECT ma_don FROM don_hang WHERE id = p_don_hang_id),
    'tong_tien', v_tong_tien,
    'thuc_thu',  v_thuc_thu,
    'con_no',    GREATEST(0, v_thuc_thu - v_total_paid),
    'test_mode', p_skip_doanh_thu
  );
END;
$$;
