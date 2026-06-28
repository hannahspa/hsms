-- 128 — Vòng Quay May Mắn: lịch sử lượt quay + cấu hình + RPC sinh mã & ghi lượt.
-- Khách quay trên iPad tại quầy → nhập SĐT → trúng gì lưu lại (gán khách) → voucher sinh mã riêng.

-- ── Lịch sử lượt quay ──
CREATE TABLE IF NOT EXISTS public.vong_quay_luot (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  so_dien_thoai   text,
  khach_hang_id   uuid REFERENCES public.khach_hang(id) ON DELETE SET NULL,
  ho_ten          text,
  phan_thuong     text,        -- nhãn ô trúng
  loai            text,        -- voucher | chuc | tien | them_luot | qua
  nhom            text,        -- nhóm voucher (nếu loai=voucher)
  phan_tram       integer,     -- % giảm (nếu voucher)
  voucher_code    text,        -- mã sinh ra (nếu voucher)
  nguoi_thuc_hien text,
  created_at      timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_vqluot_kh ON public.vong_quay_luot(khach_hang_id);
CREATE INDEX IF NOT EXISTS idx_vqluot_sdt ON public.vong_quay_luot(so_dien_thoai);
ALTER TABLE public.vong_quay_luot ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS vqluot_all ON public.vong_quay_luot;
CREATE POLICY vqluot_all ON public.vong_quay_luot FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ── Cấu hình phần thưởng mặc định (lưu trong marketing_ai_config dạng JSON) ──
INSERT INTO public.marketing_ai_config (key, value)
VALUES ('vong_quay_config', '[
  {"label":"Giảm 50%","mota":"Chăm Sóc Da","loai":"voucher","nhom":"cham_soc_da","phan_tram":50,"ty_le":8},
  {"label":"May mắn","mota":"Chúc may mắn lần sau","loai":"chuc","ty_le":24},
  {"label":"Giảm 40%","mota":"Thư Giãn · Gội / Massage","loai":"voucher","nhom":"thu_gian","phan_tram":40,"ty_le":12},
  {"label":"Voucher 100K","mota":"Trừ trực tiếp hóa đơn","loai":"tien","gia_tri":100000,"ty_le":5},
  {"label":"Giảm 70%","mota":"Triệt Lông","loai":"voucher","nhom":"triet_long","phan_tram":70,"ty_le":4},
  {"label":"Thêm lượt","mota":"Quay thêm 1 lần","loai":"them_luot","ty_le":16},
  {"label":"Giảm 20%","mota":"Áp dụng mọi dịch vụ","loai":"voucher","nhom":"thu_gian","phan_tram":20,"ty_le":22},
  {"label":"Quà tặng","mota":"Quà nhỏ tặng tại spa","loai":"qua","ty_le":9}
]')
ON CONFLICT (key) DO NOTHING;

-- ── RPC: lấy cấu hình phần thưởng (cho trang khách, anon) ──
CREATE OR REPLACE FUNCTION public.vong_quay_lay_config()
RETURNS jsonb LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT value::jsonb FROM public.marketing_ai_config WHERE key = 'vong_quay_config'
$$;

-- ── RPC: ghi lượt quay + sinh mã voucher riêng (gán khách) ──
CREATE OR REPLACE FUNCTION public.vong_quay_ghi(
  p_phone text, p_ten text, p_label text, p_loai text, p_nhom text, p_phan_tram integer, p_nguoi text DEFAULT 'iPad'
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_kh uuid; v_code text; v_sdt text;
BEGIN
  v_sdt := regexp_replace(COALESCE(p_phone, ''), '\D', '', 'g');
  IF v_sdt <> '' AND left(v_sdt, 1) <> '0' THEN v_sdt := '0' || v_sdt; END IF;

  -- tìm / tạo khách theo SĐT
  IF v_sdt <> '' THEN
    SELECT id INTO v_kh FROM public.khach_hang WHERE so_dien_thoai = v_sdt LIMIT 1;
    IF v_kh IS NULL THEN
      INSERT INTO public.khach_hang (ho_ten, so_dien_thoai)
      VALUES (COALESCE(NULLIF(trim(COALESCE(p_ten, '')), ''), 'Khách ' || right(v_sdt, 4)), v_sdt)
      RETURNING id INTO v_kh;
    END IF;
  END IF;

  -- voucher → sinh mã riêng cho khách (override % theo ô vòng quay)
  IF p_loai = 'voucher' AND v_kh IS NOT NULL AND p_nhom IS NOT NULL THEN
    BEGIN
      v_code := public.voucher_sinh_ma(v_kh, p_nhom);
      UPDATE public.voucher_ma
        SET nguon = 'vong_quay', phan_tram = COALESCE(p_phan_tram, phan_tram)
        WHERE code = v_code;
    EXCEPTION WHEN OTHERS THEN v_code := NULL; END;
  END IF;

  INSERT INTO public.vong_quay_luot
    (so_dien_thoai, khach_hang_id, ho_ten, phan_thuong, loai, nhom, phan_tram, voucher_code, nguoi_thuc_hien)
  VALUES (v_sdt, v_kh, p_ten, p_label, p_loai, p_nhom, p_phan_tram, v_code, p_nguoi);

  RETURN jsonb_build_object('ok', true, 'voucher_code', v_code, 'khach_hang_id', v_kh);
END $$;

GRANT EXECUTE ON FUNCTION public.vong_quay_lay_config() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.vong_quay_ghi(text, text, text, text, text, integer, text) TO anon, authenticated;
