-- Migration 014: RPC cho đăng ký OFF — bypass RLS cho KTV dùng PIN
-- Vấn đề: KTV đăng nhập PIN (không có auth.uid()) → RLS chặn INSERT dang_ky_off

CREATE OR REPLACE FUNCTION insert_dang_ky_off(
  p_nhan_vien_id uuid,
  p_ngay_off date,
  p_loai_off text,
  p_ly_do text,
  p_bat_kha_khang boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO dang_ky_off (nhan_vien_id, ngay_off, loai_off, ly_do, trang_thai, bat_kha_khang)
  VALUES (p_nhan_vien_id, p_ngay_off, p_loai_off, p_ly_do, 'cho_duyet', p_bat_kha_khang);
  RETURN jsonb_build_object('success', true);
END;
$$;
