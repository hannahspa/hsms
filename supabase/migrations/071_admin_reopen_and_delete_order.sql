-- ============================================================
-- MIGRATION 071: Admin sửa đơn (mở lại) + xóa vĩnh viễn đơn đã hủy
-- Ngày: 03/06/2026
-- - pos_reopen_order: đảo ngược tác động (như void) NHƯNG đưa về 'draft' + GIỮ
--   dòng hàng + thanh toán → Admin mở lại sửa rồi chốt lại (không cần xóa-tạo lại).
-- - pos_hard_delete_order: xóa hẳn 1 đơn ĐÃ HỦY (cascade) cho danh sách gọn.
-- ============================================================

-- ── 1) MỞ LẠI ĐƠN ĐỂ SỬA (Admin) ─────────────────────────────
CREATE OR REPLACE FUNCTION pos_reopen_order(p_don_hang_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_dh don_hang%ROWTYPE;
  v_item record;
  v_is_test boolean := false;
BEGIN
  SELECT * INTO v_dh FROM don_hang WHERE id = p_don_hang_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Don hang khong ton tai');
  END IF;
  IF v_dh.trang_thai = 'draft' THEN
    RETURN jsonb_build_object('success', true, 'already_draft', true, 'ma_don', v_dh.ma_don);
  END IF;
  IF v_dh.trang_thai = 'huy' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Don da huy — khong mo lai duoc');
  END IF;

  v_is_test := COALESCE(v_dh.is_test, false);

  -- Không cho mở lại nếu thẻ mới của đơn đã được dùng buổi (tránh lệch dữ liệu)
  IF NOT v_is_test AND EXISTS (
    SELECT 1 FROM the_lieu_trinh
    WHERE don_hang_id = p_don_hang_id AND COALESCE(so_buoi_da_dung, 0) > 0
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'The moi cua don nay da duoc su dung — can doi soat thu cong truoc khi sua');
  END IF;

  -- Đảo ngược tác động phát sinh (giống void)
  DELETE FROM nhan_vien_thu_nhap WHERE don_hang_id = p_don_hang_id;

  IF NOT v_is_test THEN
    -- hoàn kho sản phẩm
    FOR v_item IN SELECT * FROM don_hang_chi_tiet WHERE don_hang_id = p_don_hang_id AND loai_item = 'san_pham' LOOP
      UPDATE kho_san_pham SET ton_kho = ton_kho + v_item.so_luong WHERE id = v_item.san_pham_id;
    END LOOP;
    -- hoàn buổi thẻ đã dùng
    FOR v_item IN SELECT * FROM don_hang_chi_tiet WHERE don_hang_id = p_don_hang_id AND loai_item = 'the_lieu_trinh' LOOP
      UPDATE the_lieu_trinh SET
        so_buoi_da_dung = GREATEST(0, so_buoi_da_dung - v_item.so_luong),
        trang_thai = 'active'
      WHERE id = v_item.the_lieu_trinh_id;
    END LOOP;
    DELETE FROM kho_giao_dich WHERE don_hang_id = p_don_hang_id;
    DELETE FROM lich_su_dung_the WHERE don_hang_id = p_don_hang_id;
    DELETE FROM the_lieu_trinh WHERE don_hang_id = p_don_hang_id;
    DELETE FROM doanh_thu WHERE don_hang_id = p_don_hang_id AND nguon = 'pos';
    DELETE FROM cong_no_khach_hang WHERE don_hang_id = p_don_hang_id;

    IF v_dh.khach_hang_id IS NOT NULL AND v_dh.trang_thai IN ('da_thanh_toan', 'no_mot_phan') THEN
      UPDATE khach_hang SET
        tong_chi_tieu = GREATEST(0, COALESCE(tong_chi_tieu, 0) - COALESCE(v_dh.thuc_thu, 0)),
        so_lan_den    = GREATEST(0, COALESCE(so_lan_den, 0) - 1)
      WHERE id = v_dh.khach_hang_id;
    END IF;
  END IF;

  -- Đưa về nháp, GIỮ dòng hàng + thanh toán để sửa
  UPDATE don_hang SET trang_thai = 'draft', con_no = 0, updated_at = now()
  WHERE id = p_don_hang_id;

  RETURN jsonb_build_object('success', true, 'ma_don', v_dh.ma_don, 'reopened', true);
END;
$$;

-- ── 2) XÓA VĨNH VIỄN ĐƠN ĐÃ HỦY (Admin) ──────────────────────
CREATE OR REPLACE FUNCTION pos_hard_delete_order(p_don_hang_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_dh don_hang%ROWTYPE;
BEGIN
  SELECT * INTO v_dh FROM don_hang WHERE id = p_don_hang_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Don hang khong ton tai');
  END IF;
  IF v_dh.trang_thai <> 'huy' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Chi xoa vinh vien duoc don DA HUY');
  END IF;

  -- Dọn sạch dữ liệu liên quan (đề phòng đơn cũ còn sót)
  DELETE FROM nhan_vien_thu_nhap WHERE don_hang_id = p_don_hang_id;
  DELETE FROM doanh_thu WHERE don_hang_id = p_don_hang_id;
  DELETE FROM thanh_toan WHERE don_hang_id = p_don_hang_id;
  DELETE FROM don_hang_chi_tiet WHERE don_hang_id = p_don_hang_id;
  DELETE FROM don_hang WHERE id = p_don_hang_id;

  RETURN jsonb_build_object('success', true, 'ma_don', v_dh.ma_don, 'deleted', true);
END;
$$;
