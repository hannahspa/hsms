-- 123 — Mã voucher NGẪU NHIÊN THUẦN (bảo mật): không lộ nhóm/% để nhân viên không đoán được.
-- Hệ thống tự tra DB ra nhóm + % khi nhập. Mã gắn 1 khách + 1 nhóm, dùng 1 lần.
-- Tập ký tự bỏ ký tự dễ nhầm khi đọc qua điện thoại: O/0, I/1.

CREATE OR REPLACE FUNCTION public.voucher_sinh_ma(p_khach_hang_id uuid, p_nhom text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_cfg record; v_code text; v_body text;
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';  -- bỏ I,O,0,1
  i int;
BEGIN
  SELECT * INTO v_cfg FROM public.voucher_nhom_config WHERE nhom = p_nhom AND is_active;
  IF NOT FOUND THEN RAISE EXCEPTION 'Nhóm voucher % không tồn tại/không bật', p_nhom; END IF;
  LOOP
    v_body := '';
    FOR i IN 1..6 LOOP
      v_body := v_body || substr(chars, floor(random() * length(chars))::int + 1, 1);
    END LOOP;
    v_code := 'HSPA-' || v_body;   -- vd HSPA-K7XM2Q (ngẫu nhiên, KHÔNG lộ nhóm/%)
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.voucher_ma WHERE code = v_code);
  END LOOP;
  INSERT INTO public.voucher_ma (code, khach_hang_id, so_dien_thoai, nhom, phan_tram, han_dung, gui_luc)
  SELECT v_code, p_khach_hang_id, k.so_dien_thoai, p_nhom, v_cfg.phan_tram, (CURRENT_DATE + v_cfg.han_ngay), now()
  FROM public.khach_hang k WHERE k.id = p_khach_hang_id;
  RETURN v_code;
END $$;
