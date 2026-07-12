-- ═══════════════════════════════════════════════════════════════════════════
-- 147 · SỬA NHANH TIỀN TOUR / HOA HỒNG TỪNG DÒNG ĐƠN ĐÃ CHỐT (12/07/2026)
-- Anh Nam: sửa 1 con số hoa hồng mà phải "khôi phục đơn → tạo lại → thanh toán
-- lại" → lỗi "thẻ mới đã được sử dụng", nguy cơ dupe thẻ x2. YÊU CẦU: sửa đúng
-- phần cần sửa (từng module nhỏ), không đụng luồng finalize.
-- RPC này: update tien_tour/tien_hoa_hong của MỘT dòng don_hang_chi_tiet
-- + đồng bộ sổ thu nhập nhân viên (nhan_vien_thu_nhap) — KHÔNG đụng thẻ/kho/
-- doanh thu/thanh toán. Chỉ ADMIN gọi được (kiểm profiles.vai_tro).
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.pos_sua_tien_dong(
  p_ct_id uuid,
  p_tien_tour integer DEFAULT NULL,      -- NULL = không đổi
  p_tien_hoa_hong integer DEFAULT NULL   -- NULL = không đổi
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_ct record; v_don record;
  v_tour integer; v_hh integer;
BEGIN
  -- Chỉ Admin
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND vai_tro = 'admin'
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Chỉ Admin được sửa tiền tour/hoa hồng');
  END IF;

  SELECT * INTO v_ct FROM public.don_hang_chi_tiet WHERE id = p_ct_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Không tìm thấy dòng đơn hàng');
  END IF;
  SELECT * INTO v_don FROM public.don_hang WHERE id = v_ct.don_hang_id;
  IF v_don.trang_thai IN ('huy') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Đơn đã hủy — không sửa được');
  END IF;

  v_tour := COALESCE(p_tien_tour, v_ct.tien_tour);
  v_hh   := COALESCE(p_tien_hoa_hong, v_ct.tien_hoa_hong);
  IF v_tour < 0 OR v_hh < 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Số tiền không được âm');
  END IF;

  -- 1) Dòng đơn hàng
  UPDATE public.don_hang_chi_tiet
  SET tien_tour = v_tour, tien_hoa_hong = v_hh
  WHERE id = p_ct_id;

  -- 2) Đồng bộ sổ thu nhập NV — TOUR
  IF p_tien_tour IS NOT NULL THEN
    UPDATE public.nhan_vien_thu_nhap
    SET so_tien = v_tour, updated_at = now()
    WHERE don_hang_chi_tiet_id = p_ct_id AND loai = 'tour';
    -- chưa có sổ mà giờ có tour + có NV → tạo
    IF NOT FOUND AND v_tour > 0 AND v_ct.nhan_vien_id IS NOT NULL THEN
      INSERT INTO public.nhan_vien_thu_nhap(
        don_hang_id, don_hang_chi_tiet_id, nhan_vien_id, loai, nguon, ngay,
        doanh_so_tinh, ti_le, so_tien, trang_thai, is_test, ghi_chu)
      VALUES (
        v_ct.don_hang_id, p_ct_id, v_ct.nhan_vien_id, 'tour', 'pos', v_don.ngay,
        COALESCE(v_ct.thanh_tien, 0), v_ct.ti_le_hoa_hong, v_tour, 'phat_sinh',
        COALESCE(v_don.is_test, false), 'Sửa nhanh bởi Admin');
    END IF;
  END IF;

  -- 3) Đồng bộ sổ thu nhập NV — HOA HỒNG
  IF p_tien_hoa_hong IS NOT NULL THEN
    UPDATE public.nhan_vien_thu_nhap
    SET so_tien = v_hh, updated_at = now()
    WHERE don_hang_chi_tiet_id = p_ct_id AND loai = 'hoa_hong';
    IF NOT FOUND AND v_hh > 0 AND v_ct.nhan_vien_id IS NOT NULL THEN
      INSERT INTO public.nhan_vien_thu_nhap(
        don_hang_id, don_hang_chi_tiet_id, nhan_vien_id, loai, nguon, ngay,
        doanh_so_tinh, ti_le, so_tien, trang_thai, is_test, ghi_chu)
      VALUES (
        v_ct.don_hang_id, p_ct_id, v_ct.nhan_vien_id, 'hoa_hong', 'pos', v_don.ngay,
        COALESCE(v_ct.thanh_tien, 0), v_ct.ti_le_hoa_hong, v_hh, 'phat_sinh',
        COALESCE(v_don.is_test, false), 'Sửa nhanh bởi Admin');
    END IF;
  END IF;

  -- 4) Nhật ký
  INSERT INTO public.nhat_ky_hoat_dong(nguoi_dung_id, hanh_dong, bang, du_lieu_cu, du_lieu_moi)
  VALUES (auth.uid(), 'sua_nhanh_tien_dong', 'don_hang_chi_tiet',
    jsonb_build_object('ct_id', p_ct_id, 'tien_tour', v_ct.tien_tour, 'tien_hoa_hong', v_ct.tien_hoa_hong),
    jsonb_build_object('ct_id', p_ct_id, 'tien_tour', v_tour, 'tien_hoa_hong', v_hh, 'ma_don', v_don.ma_don));

  RETURN jsonb_build_object('success', true, 'tien_tour', v_tour, 'tien_hoa_hong', v_hh);
END $function$;

GRANT EXECUTE ON FUNCTION public.pos_sua_tien_dong(uuid, integer, integer) TO authenticated;
