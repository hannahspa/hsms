-- Migration 014: RPC cho đăng ký OFF — bypass RLS cho KTV dùng PIN
-- Fix: bỏ cột bat_kha_khang (chưa tồn tại trong DB thực tế)

CREATE OR REPLACE FUNCTION insert_dang_ky_off(
  p_nhan_vien_id uuid,
  p_ngay_off date,
  p_loai_off text,
  p_ly_do text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO dang_ky_off (nhan_vien_id, ngay_off, loai_off, ly_do, trang_thai)
  VALUES (p_nhan_vien_id, p_ngay_off, p_loai_off, p_ly_do, 'cho_duyet');
  RETURN jsonb_build_object('success', true);
END;
$$;
