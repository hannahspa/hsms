-- 122 — Hệ thống Voucher (mã giảm giá riêng từng khách) cho Win-back khách lạnh
-- Cấu hình % theo NHÓM dịch vụ; mã RIÊNG từng khách, dùng 1 lần; áp giảm % trên GIÁ GỐC tại POS.
-- Nguyên tắc (anh Nam): giảm trên giá gốc; KHÔNG áp 2 KM (DV đã có giá KM thì mã không giảm thêm).

-- ── Phân nhóm dịch vụ theo sở thích (3 nhóm anh Nam định nghĩa) ──
CREATE OR REPLACE FUNCTION public.voucher_nhom_dich_vu(ten text)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE
    WHEN ten ILIKE '%triệt%' THEN 'triet_long'
    WHEN ten ILIKE '%gội%' OR ten ILIKE '%massage%' OR ten ILIKE '%cổ vai gáy%' OR ten ILIKE '%body%' OR ten ILIKE '%dưỡng sinh%' THEN 'thu_gian'
    WHEN ten ILIKE '%laser%' OR ten ILIKE '%công nghệ%' OR ten ILIKE '%béo%' OR ten ILIKE '%tắm%' OR ten ILIKE '%trắng%' OR ten ILIKE '%peel%' OR ten ILIKE '%collagen%' OR ten ILIKE '%mụn%' OR ten ILIKE '%điện di%' OR ten ILIKE '%tái tạo%' OR ten ILIKE '%da%' THEN 'cham_soc_da'
    ELSE NULL END
$$;

-- ── Cấu hình voucher theo nhóm (% giảm) — quản lý trong trang Khuyến Mãi ──
CREATE TABLE IF NOT EXISTS public.voucher_nhom_config (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nhom         text UNIQUE NOT NULL,   -- cham_soc_da | thu_gian | triet_long
  ten_hien_thi text NOT NULL,
  phan_tram    integer NOT NULL,       -- 50 / 40 / 70
  han_ngay     integer DEFAULT 30,     -- voucher có hạn N ngày kể từ khi gửi
  mo_ta        text,
  is_active    boolean DEFAULT true,
  updated_at   timestamptz DEFAULT now()
);
INSERT INTO public.voucher_nhom_config (nhom, ten_hien_thi, phan_tram, mo_ta) VALUES
  ('cham_soc_da', 'Chăm Sóc Da (Da/Laser/Giảm Béo/Tắm Trắng)', 50, 'Giảm 50% giá gốc cho nhóm chăm sóc da'),
  ('thu_gian',    'Thư Giãn (Gội Đầu/Massage Body)',          40, 'Giảm 40% giá gốc (Gội 99k không áp)'),
  ('triet_long',  'Triệt Lông',                                70, 'Giảm 70% giá gốc gói triệt lông')
ON CONFLICT (nhom) DO NOTHING;

-- ── Mã voucher riêng từng khách ──
CREATE TABLE IF NOT EXISTS public.voucher_ma (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code          text UNIQUE NOT NULL,
  khach_hang_id uuid REFERENCES public.khach_hang(id) ON DELETE SET NULL,
  so_dien_thoai text,
  nhom          text NOT NULL,
  phan_tram     integer NOT NULL,
  han_dung      date,
  trang_thai    text DEFAULT 'chua_dung',   -- chua_dung | da_dung | het_han | huy
  nguon         text DEFAULT 'winback',
  don_hang_id   uuid,
  gia_tri_giam  integer,
  gui_luc       timestamptz,
  dung_luc      timestamptz,
  created_at    timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_voucher_ma_kh ON public.voucher_ma(khach_hang_id);
CREATE INDEX IF NOT EXISTS idx_voucher_ma_tt ON public.voucher_ma(trang_thai);

ALTER TABLE public.voucher_nhom_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voucher_ma ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS vnc_all ON public.voucher_nhom_config;
DROP POLICY IF EXISTS vma_all ON public.voucher_ma;
CREATE POLICY vnc_all ON public.voucher_nhom_config FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY vma_all ON public.voucher_ma FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ── Sinh mã riêng cho 1 khách theo nhóm ──
CREATE OR REPLACE FUNCTION public.voucher_sinh_ma(p_khach_hang_id uuid, p_nhom text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_cfg record; v_code text; v_prefix text;
BEGIN
  SELECT * INTO v_cfg FROM public.voucher_nhom_config WHERE nhom = p_nhom AND is_active;
  IF NOT FOUND THEN RAISE EXCEPTION 'Nhóm voucher % không tồn tại/không bật', p_nhom; END IF;
  v_prefix := CASE p_nhom WHEN 'cham_soc_da' THEN 'DA' WHEN 'thu_gian' THEN 'TG' WHEN 'triet_long' THEN 'TL' ELSE 'VC' END;
  LOOP
    v_code := 'HSPA-' || v_prefix || v_cfg.phan_tram || '-' || upper(substr(md5(random()::text), 1, 4));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.voucher_ma WHERE code = v_code);
  END LOOP;
  INSERT INTO public.voucher_ma (code, khach_hang_id, so_dien_thoai, nhom, phan_tram, han_dung, gui_luc)
  SELECT v_code, p_khach_hang_id, k.so_dien_thoai, p_nhom, v_cfg.phan_tram, (CURRENT_DATE + v_cfg.han_ngay), now()
  FROM public.khach_hang k WHERE k.id = p_khach_hang_id;
  RETURN v_code;
END $$;

-- ── Kiểm tra mã (POS gọi khi Lễ tân nhập) ──
CREATE OR REPLACE FUNCTION public.voucher_kiem_tra(p_code text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v record;
BEGIN
  SELECT * INTO v FROM public.voucher_ma WHERE upper(code) = upper(trim(p_code));
  IF NOT FOUND THEN RETURN jsonb_build_object('hop_le', false, 'ly_do', 'Mã không tồn tại'); END IF;
  IF v.trang_thai = 'da_dung' THEN RETURN jsonb_build_object('hop_le', false, 'ly_do', 'Mã đã được sử dụng'); END IF;
  IF v.trang_thai = 'huy' THEN RETURN jsonb_build_object('hop_le', false, 'ly_do', 'Mã đã bị hủy'); END IF;
  IF v.han_dung < CURRENT_DATE THEN RETURN jsonb_build_object('hop_le', false, 'ly_do', 'Mã đã hết hạn (' || to_char(v.han_dung,'DD/MM/YYYY') || ')'); END IF;
  RETURN jsonb_build_object('hop_le', true, 'code', v.code, 'nhom', v.nhom, 'phan_tram', v.phan_tram,
    'han_dung', v.han_dung, 'khach_hang_id', v.khach_hang_id,
    'ten_nhom', (SELECT ten_hien_thi FROM public.voucher_nhom_config WHERE nhom = v.nhom));
END $$;

-- ── Đánh dấu mã đã dùng (POS gọi khi chốt đơn) ──
CREATE OR REPLACE FUNCTION public.voucher_ap_dung(p_code text, p_don_hang_id uuid, p_gia_tri_giam integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v record;
BEGIN
  SELECT * INTO v FROM public.voucher_ma WHERE upper(code) = upper(trim(p_code)) FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'ly_do', 'Mã không tồn tại'); END IF;
  IF v.trang_thai = 'da_dung' THEN RETURN jsonb_build_object('ok', false, 'ly_do', 'Mã đã dùng'); END IF;
  UPDATE public.voucher_ma SET trang_thai = 'da_dung', don_hang_id = p_don_hang_id,
    gia_tri_giam = p_gia_tri_giam, dung_luc = now() WHERE id = v.id;
  RETURN jsonb_build_object('ok', true);
END $$;
