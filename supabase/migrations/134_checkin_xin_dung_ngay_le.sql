-- ============================================================================
-- 134_checkin_xin_dung_ngay_le.sql
-- GĐ0-A · LỚP 1b — RPC: KTV xin dùng quỹ ngày lễ bù ngày OV (gửi Admin duyệt).
-- Chỉ thêm, không revoke.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.checkin_xin_dung_ngay_le(
  p_token text, p_so_ngay numeric, p_ov numeric, p_thang int, p_nam int)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_nv uuid; v_ten text; v_quy_id uuid;
BEGIN
  v_nv := public.checkin_resolve(p_token);
  IF p_so_ngay IS NULL OR p_so_ngay <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Số ngày không hợp lệ');
  END IF;
  SELECT ho_ten INTO v_ten FROM public.nhan_vien WHERE id = v_nv;
  SELECT id INTO v_quy_id FROM public.quy_ngay_off WHERE nhan_vien_id = v_nv AND nam = p_nam LIMIT 1;

  INSERT INTO public.yeu_cau_chinh_sua(loai_bang, ban_ghi_id, loai_yeu_cau, trang_thai,
      du_lieu_cu, du_lieu_moi, ly_do, nguoi_yeu_cau)
    VALUES ('quy_ngay_off', v_quy_id, 'dung_ngay_le', 'cho_duyet',
      jsonb_build_object('nhan_vien_id', v_nv, 'nhan_vien_ten', v_ten),
      jsonb_build_object('so_dung_thang_nay', p_so_ngay, 'thang', p_thang, 'nam', p_nam),
      v_ten || ' yêu cầu dùng ' || p_so_ngay || ' ngày lễ tích luỹ bù ' || p_ov || ' ngày OV tháng ' || p_thang || '/' || p_nam,
      v_ten);
  RETURN jsonb_build_object('success', true);
END $$;

GRANT EXECUTE ON FUNCTION public.checkin_xin_dung_ngay_le(text, numeric, numeric, int, int) TO anon, authenticated;
