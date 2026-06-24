-- 125 — Khi voucher được dùng tại POS → đánh dấu khách "ĐÃ QUAY LẠI" trong hàng đợi win-back (đo ROI)
-- Mở rộng RPC voucher_ap_dung: ngoài đánh dấu mã đã dùng, cập nhật winback_hang_doi.da_den
-- → WinbackPage hiển thị chính xác bao nhiêu khách quay lại nhờ voucher.

CREATE OR REPLACE FUNCTION public.voucher_ap_dung(p_code text, p_don_hang_id uuid, p_gia_tri_giam integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v record;
BEGIN
  SELECT * INTO v FROM public.voucher_ma WHERE upper(code) = upper(trim(p_code)) FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'ly_do', 'Mã không tồn tại'); END IF;
  IF v.trang_thai = 'da_dung' THEN RETURN jsonb_build_object('ok', false, 'ly_do', 'Mã đã dùng'); END IF;
  UPDATE public.voucher_ma SET trang_thai = 'da_dung', don_hang_id = p_don_hang_id,
    gia_tri_giam = p_gia_tri_giam, dung_luc = now() WHERE id = v.id;
  -- Đánh dấu khách đã quay lại trong hàng đợi win-back (nếu có)
  IF v.khach_hang_id IS NOT NULL THEN
    UPDATE public.winback_hang_doi
      SET da_den = true, trang_thai = 'da_den'
      WHERE khach_hang_id = v.khach_hang_id AND trang_thai <> 'bo_qua';
  END IF;
  RETURN jsonb_build_object('ok', true);
END $$;
