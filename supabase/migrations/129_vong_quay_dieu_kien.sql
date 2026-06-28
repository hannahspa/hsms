-- 129 — Vòng quay: điều kiện chi tiêu trong ngày → số lượt quay.
-- Nhập SĐT → tự lấy tên khách + tính chi tiêu hôm nay → số lượt = floor(chi tiêu / ngưỡng).
-- Ngưỡng cấu hình trong admin (marketing_ai_config.vong_quay_nguong), mặc định 1.000.000đ.

INSERT INTO public.marketing_ai_config (key, value)
VALUES ('vong_quay_nguong', '1000000')
ON CONFLICT (key) DO NOTHING;

-- Kiểm tra khách theo SĐT: trả tên + chi tiêu hôm nay + số lượt quay còn lại.
CREATE OR REPLACE FUNCTION public.vong_quay_kiem_tra(p_phone text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_sdt text; v_kh uuid; v_ten text; v_today date;
  v_chi numeric; v_nguong numeric; v_duoc int; v_daquay int;
BEGIN
  v_sdt := regexp_replace(COALESCE(p_phone, ''), '\D', '', 'g');
  IF v_sdt <> '' AND left(v_sdt, 1) <> '0' THEN v_sdt := '0' || v_sdt; END IF;
  IF length(v_sdt) < 9 THEN RETURN jsonb_build_object('ok', false, 'ly_do', 'Số điện thoại không hợp lệ'); END IF;

  SELECT id, ho_ten INTO v_kh, v_ten FROM public.khach_hang WHERE so_dien_thoai = v_sdt LIMIT 1;
  IF v_kh IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'ly_do', 'Chưa tìm thấy khách hàng với số điện thoại này');
  END IF;

  v_today := (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date;
  SELECT COALESCE(SUM(thuc_thu), 0) INTO v_chi
    FROM public.don_hang
    WHERE khach_hang_id = v_kh AND ngay = v_today AND COALESCE(is_test, false) = false;

  v_nguong := COALESCE((SELECT value::numeric FROM public.marketing_ai_config WHERE key = 'vong_quay_nguong'), 1000000);
  v_duoc := floor(v_chi / NULLIF(v_nguong, 0))::int;

  SELECT count(*) INTO v_daquay FROM public.vong_quay_luot
    WHERE khach_hang_id = v_kh
      AND (created_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date = v_today;

  RETURN jsonb_build_object(
    'ok', true, 'ho_ten', COALESCE(v_ten, 'Quý khách'), 'khach_hang_id', v_kh,
    'so_dien_thoai', v_sdt, 'chi_tieu', v_chi, 'nguong', v_nguong,
    'so_luot_con', GREATEST(v_duoc - v_daquay, 0), 'so_luot_duoc', v_duoc, 'da_quay', v_daquay
  );
END $$;

GRANT EXECUTE ON FUNCTION public.vong_quay_kiem_tra(text) TO anon, authenticated;
