-- 124 — Module Win-back khách lạnh: lọc 462 khách (mua thẻ 3 năm + lần cuối đến spa >90 ngày)
-- phân nhóm sở thích, sinh voucher mã riêng, gửi 50 khách/ngày ưu tiên 2026→2023.

-- ── View khách lạnh + nhóm sở thích (thẻ mua gần nhất) ──
CREATE OR REPLACE VIEW public.v_winback_khach_lanh AS
WITH lan_den AS (
  SELECT khach_hang_id, MAX(ngay) AS lan_cuoi
  FROM public.don_hang WHERE khach_hang_id IS NOT NULL AND COALESCE(is_test,false)=false
  GROUP BY 1
),
the_gan AS (   -- thẻ MUA gần nhất mỗi khách (xác định sở thích) — chỉ thẻ trong 3 năm
  SELECT DISTINCT ON (khach_hang_id) khach_hang_id, ten_dich_vu, ngay_mua
  FROM public.the_lieu_trinh
  WHERE khach_hang_id IS NOT NULL AND ngay_mua >= '2023-01-01'
  ORDER BY khach_hang_id, ngay_mua DESC
)
SELECT k.id AS khach_hang_id, k.ho_ten, k.so_dien_thoai,
       ld.lan_cuoi, (CURRENT_DATE - ld.lan_cuoi) AS so_ngay_vang,
       EXTRACT(year FROM ld.lan_cuoi)::int AS nam_lan_cuoi,
       tg.ten_dich_vu AS dv_so_thich,
       public.voucher_nhom_dich_vu(tg.ten_dich_vu) AS nhom_so_thich
FROM public.khach_hang k
JOIN lan_den ld ON ld.khach_hang_id = k.id
JOIN the_gan tg ON tg.khach_hang_id = k.id
WHERE k.so_dien_thoai IS NOT NULL
  AND (CURRENT_DATE - ld.lan_cuoi) > 90
  AND ld.lan_cuoi >= '2023-01-01';

-- ── Bảng hàng đợi win-back (mỗi khách 1 lần) ──
CREATE TABLE IF NOT EXISTS public.winback_hang_doi (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  khach_hang_id uuid UNIQUE REFERENCES public.khach_hang(id) ON DELETE CASCADE,
  ho_ten        text,
  so_dien_thoai text,
  nhom_so_thich text,
  phan_tram     integer,
  nam_lan_cuoi  integer,
  so_ngay_vang  integer,
  voucher_code  text,
  ngay_du_kien  date,
  trang_thai    text DEFAULT 'da_chot',   -- da_chot|da_gui|gui_loi|da_den|bo_qua
  chot_luc      timestamptz,
  gui_luc       timestamptz,
  msg_id        text,
  ket_qua_gui   text,
  da_den        boolean DEFAULT false,     -- khách đã đến dùng voucher
  created_at    timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_wb_trang_thai ON public.winback_hang_doi(trang_thai);
CREATE INDEX IF NOT EXISTS idx_wb_ngay ON public.winback_hang_doi(ngay_du_kien);

ALTER TABLE public.winback_hang_doi ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS wb_all ON public.winback_hang_doi;
CREATE POLICY wb_all ON public.winback_hang_doi FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ── RPC chốt: lấy N khách lạnh chưa xử lý (ưu tiên năm mới nhất) + sinh voucher + ghi hàng đợi ──
CREATE OR REPLACE FUNCTION public.winback_chot(p_so_luong integer DEFAULT 50, p_ngay date DEFAULT NULL)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_ngay date; r record; v_code text; v_pct integer; v_cnt integer := 0;
BEGIN
  v_ngay := COALESCE(p_ngay, ((now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date + 1));
  FOR r IN
    SELECT w.* FROM public.v_winback_khach_lanh w
    WHERE w.nhom_so_thich IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM public.winback_hang_doi h WHERE h.khach_hang_id = w.khach_hang_id)
    ORDER BY w.nam_lan_cuoi DESC, w.so_ngay_vang ASC
    LIMIT GREATEST(p_so_luong, 0)
  LOOP
    SELECT phan_tram INTO v_pct FROM public.voucher_nhom_config WHERE nhom = r.nhom_so_thich AND is_active;
    IF v_pct IS NULL THEN CONTINUE; END IF;
    v_code := public.voucher_sinh_ma(r.khach_hang_id, r.nhom_so_thich);
    INSERT INTO public.winback_hang_doi (khach_hang_id, ho_ten, so_dien_thoai, nhom_so_thich, phan_tram, nam_lan_cuoi, so_ngay_vang, voucher_code, ngay_du_kien, trang_thai, chot_luc)
    VALUES (r.khach_hang_id, r.ho_ten, r.so_dien_thoai, r.nhom_so_thich, v_pct, r.nam_lan_cuoi, r.so_ngay_vang, v_code, v_ngay, 'da_chot', now())
    ON CONFLICT (khach_hang_id) DO NOTHING;
    v_cnt := v_cnt + 1;
  END LOOP;
  RETURN v_cnt;
END $$;
