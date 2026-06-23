-- 120 — Module "Chăm Sóc Lại": hàng đợi gửi theo lịch 40 khách/ngày
-- Cơ chế (anh Nam chốt 23/06): 20h30 chốt danh sách 40 khách cho ngày mai (ưu tiên khách ẤM trước),
-- 9h sáng TỰ ĐỘNG gửi 40 đã chốt. Theo dõi đã gửi / đã xem / quan tâm OA / đã quay lại.

-- ── Bảng hàng đợi (theo KHÁCH — 40 khách/ngày) ──
CREATE TABLE IF NOT EXISTS public.cham_soc_hang_doi (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  khach_hang_id     uuid UNIQUE REFERENCES public.khach_hang(id) ON DELETE CASCADE,
  so_dien_thoai     text,
  ho_ten            text,
  the_dai_dien_id   uuid,            -- thẻ ấm nhất, dùng để hiển thị + gửi
  ten_dich_vu       text,
  so_buoi_con_lai   integer,
  so_the            integer,         -- số thẻ active đến hạn của khách
  so_ngay_vang      integer,
  la_khach_moi      boolean DEFAULT false,   -- mới = lan_dung >= mốc auto (zns_nhac_auto_tu_ngay)
  uu_tien           integer DEFAULT 100,     -- nhỏ = ưu tiên cao (= so_ngay_vang → ấm trước)
  trang_thai        text DEFAULT 'cho_gui',  -- cho_gui|da_chot|da_gui|gui_loi|da_xem|da_quan_tam|da_quay_lai|bo_qua
  ngay_du_kien      date,            -- ngày đã chốt sẽ gửi
  chot_luc          timestamptz,
  gui_luc           timestamptz,
  msg_id            text,
  ket_qua_gui       text,
  da_xem            boolean DEFAULT false,
  da_quan_tam_oa    boolean DEFAULT false,
  tuong_tac_luc     timestamptz,
  noi_dung          text,
  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cshd_trang_thai ON public.cham_soc_hang_doi(trang_thai);
CREATE INDEX IF NOT EXISTS idx_cshd_ngay_du_kien ON public.cham_soc_hang_doi(ngay_du_kien);
CREATE INDEX IF NOT EXISTS idx_cshd_sdt ON public.cham_soc_hang_doi(so_dien_thoai);

ALTER TABLE public.cham_soc_hang_doi ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS cham_soc_hang_doi_all ON public.cham_soc_hang_doi;
CREATE POLICY cham_soc_hang_doi_all ON public.cham_soc_hang_doi FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ── View: 1 dòng/khách cần chăm (đến hạn), thẻ ẤM nhất làm đại diện ──
CREATE OR REPLACE VIEW public.v_cham_soc_can_gui AS
SELECT DISTINCT ON (v.khach_hang_id)
  v.khach_hang_id, v.ho_ten, v.so_dien_thoai, v.phone_norm,
  v.the_id AS the_dai_dien_id, v.ten_dich_vu, v.so_buoi_con_lai,
  v.so_ngay_vang, v.lan_dung_gan_nhat, v.ngay_het_han,
  (SELECT count(*) FROM public.v_nhac_lieu_trinh v2 WHERE v2.khach_hang_id = v.khach_hang_id AND v2.den_han_nhac) AS so_the
FROM public.v_nhac_lieu_trinh v
WHERE v.den_han_nhac = true AND v.khach_hang_id IS NOT NULL AND v.so_dien_thoai IS NOT NULL
ORDER BY v.khach_hang_id, v.so_ngay_vang ASC;

-- ── RPC đồng bộ: thêm khách đến hạn (chưa có dòng) vào hàng đợi ──
CREATE OR REPLACE FUNCTION public.cham_soc_sync_hang_doi()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_moc date; v_count integer;
BEGIN
  SELECT COALESCE(value::date, '2099-01-01'::date) INTO v_moc FROM public.marketing_ai_config WHERE key='zns_nhac_auto_tu_ngay';
  v_moc := COALESCE(v_moc, '2099-01-01'::date);
  INSERT INTO public.cham_soc_hang_doi
    (khach_hang_id, so_dien_thoai, ho_ten, the_dai_dien_id, ten_dich_vu, so_buoi_con_lai, so_the, so_ngay_vang, la_khach_moi, uu_tien, trang_thai)
  SELECT g.khach_hang_id, g.so_dien_thoai, g.ho_ten, g.the_dai_dien_id, g.ten_dich_vu, g.so_buoi_con_lai, g.so_the, g.so_ngay_vang,
    (g.lan_dung_gan_nhat >= v_moc), COALESCE(g.so_ngay_vang, 999), 'cho_gui'
  FROM public.v_cham_soc_can_gui g
  ON CONFLICT (khach_hang_id) DO NOTHING;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END $$;

-- ── RPC chốt lịch: lấy N khách cho_gui ưu tiên ẤM trước → đánh dấu da_chot cho ngày p_ngay ──
CREATE OR REPLACE FUNCTION public.cham_soc_chot_lich(p_so_luong integer DEFAULT 40, p_ngay date DEFAULT NULL)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_ngay date; v_count integer;
BEGIN
  v_ngay := COALESCE(p_ngay, ((now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date + 1));
  WITH pick AS (
    SELECT id FROM public.cham_soc_hang_doi
    WHERE trang_thai='cho_gui'
    ORDER BY uu_tien ASC, so_ngay_vang ASC, created_at ASC
    LIMIT GREATEST(p_so_luong, 0)
  )
  UPDATE public.cham_soc_hang_doi h
    SET trang_thai='da_chot', ngay_du_kien=v_ngay, chot_luc=now(), updated_at=now()
  FROM pick WHERE h.id = pick.id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END $$;
