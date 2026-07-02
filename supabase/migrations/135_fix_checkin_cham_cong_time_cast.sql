-- ============================================================================
-- 135_fix_checkin_cham_cong_time_cast.sql
-- FIX LỖI: 'column "gio_vao" is of type time without time zone but expression
-- is of type text'. RPC checkin_cham_cong/bo_sung_gio_ra truyền p_gio/p_gio_ra
-- dạng text → phải ép ::time khi ghi vào cột time. Chỉ sửa cast, giữ nguyên logic.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.checkin_cham_cong(
  p_token text, p_action text, p_gio text,
  p_he_so numeric, p_tang_ca numeric, p_ly_do text,
  p_selfie_url text, p_lat double precision, p_lng double precision)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_nv uuid; v_today date; v_dist double precision; v_ten text; v_id uuid; v_gps text;
BEGIN
  v_nv := public.checkin_resolve(p_token);
  IF p_selfie_url IS NULL OR length(p_selfie_url) < 5 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Thiếu ảnh selfie xác thực');
  END IF;
  IF p_lat IS NULL OR p_lng IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Thiếu vị trí GPS');
  END IF;
  v_dist := public.checkin_dist_spa_m(p_lat, p_lng);
  IF v_dist > 150 THEN
    RETURN jsonb_build_object('success', false, 'error_code', 'GPS_XA',
      'error', 'Vị trí cách Spa ' || round(v_dist)::int || 'm (tối đa 150m)');
  END IF;
  SELECT ho_ten INTO v_ten FROM public.nhan_vien WHERE id = v_nv;
  v_today := (public.checkin_now_vn())::date;
  v_gps := p_lat || ',' || p_lng;

  IF p_action = 'vao' THEN
    IF EXISTS (SELECT 1 FROM public.cham_cong WHERE nhan_vien_id = v_nv AND ngay = v_today) THEN
      RETURN jsonb_build_object('success', false, 'error', 'Đã check-in hôm nay');
    END IF;
    INSERT INTO public.cham_cong(nhan_vien_id, ngay, gio_vao, loai, he_so, he_so_tam,
        tang_ca_gio, trang_thai_tang_ca, nguoi_cham, selfie_vao_url, gps_vao)
      VALUES (v_nv, v_today, p_gio::time, 'di_lam', 0, 0, 0, 'khong_co', v_ten, p_selfie_url, v_gps)
      RETURNING id INTO v_id;
    RETURN jsonb_build_object('success', true, 'id', v_id);

  ELSIF p_action = 'ra' THEN
    UPDATE public.cham_cong
       SET gio_ra = p_gio::time, he_so = p_he_so, he_so_tam = p_he_so, tang_ca_gio = 0,
           ly_do_ve_som = p_ly_do,
           trang_thai_tang_ca = CASE WHEN p_tang_ca > 0 THEN 'cho_duyet' ELSE 'khong_co' END,
           selfie_ra_url = p_selfie_url, gps_ra = v_gps
     WHERE nhan_vien_id = v_nv AND ngay = v_today AND gio_ra IS NULL
     RETURNING id INTO v_id;
    IF v_id IS NULL THEN
      RETURN jsonb_build_object('success', false, 'error', 'Chưa check-in hoặc đã check-out');
    END IF;
    IF p_tang_ca > 0 THEN
      INSERT INTO public.yeu_cau_chinh_sua(loai_bang, ban_ghi_id, loai_yeu_cau,
          du_lieu_cu, du_lieu_moi, ly_do, nguoi_yeu_cau)
        VALUES ('cham_cong', v_id, 'duyet_tang_ca',
          jsonb_build_object('tang_ca_gio', 0), jsonb_build_object('tang_ca_gio', p_tang_ca),
          v_ten || ' tăng ca ' || p_tang_ca || 'h — check-out ' || left(p_gio,5), v_ten);
    END IF;
    RETURN jsonb_build_object('success', true, 'id', v_id);
  END IF;
  RETURN jsonb_build_object('success', false, 'error', 'Hành động không hợp lệ');
END $$;

CREATE OR REPLACE FUNCTION public.checkin_bo_sung_gio_ra(
  p_token text, p_cham_cong_id uuid, p_gio_ra text, p_he_so numeric, p_tang_ca numeric)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_nv uuid; v_id uuid;
BEGIN
  v_nv := public.checkin_resolve(p_token);
  UPDATE public.cham_cong
     SET gio_ra = p_gio_ra::time, he_so = p_he_so, he_so_tam = p_he_so, tang_ca_gio = p_tang_ca,
         trang_thai_tang_ca = CASE WHEN p_tang_ca > 0 THEN 'cho_duyet' ELSE 'khong_co' END
   WHERE id = p_cham_cong_id AND nhan_vien_id = v_nv
   RETURNING id INTO v_id;
  IF v_id IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Không tìm thấy bản ghi'); END IF;
  RETURN jsonb_build_object('success', true, 'id', v_id);
END $$;

GRANT EXECUTE ON FUNCTION public.checkin_cham_cong(text, text, text, numeric, numeric, text, text, double precision, double precision) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.checkin_bo_sung_gio_ra(text, uuid, text, numeric, numeric) TO anon, authenticated;
