-- 126 — GĐ3: Mời KHÁCH LẺ (chưa mua gói) quay lại dùng dịch vụ.
-- Đối tượng: khách đến 2023-2026, CHƯA có thẻ liệu trình, lần cuối đến >30 ngày.
-- Ưu tiên khách đến NHIỀU LẦN (đã tin tưởng). Mục tiêu: mời quay lại (không ép mua gói).

-- ── View khách lẻ cần mời quay lại + nhóm dịch vụ ưa thích (DV gần nhất) ──
CREATE OR REPLACE VIEW public.v_khach_le_quay_lai AS
WITH le AS (   -- khách có đơn 2023+ nhưng CHƯA mua thẻ
  SELECT DISTINCT dh.khach_hang_id
  FROM public.don_hang dh
  WHERE dh.khach_hang_id IS NOT NULL AND dh.ngay >= '2023-01-01' AND COALESCE(dh.is_test,false)=false
    AND NOT EXISTS (SELECT 1 FROM public.the_lieu_trinh t WHERE t.khach_hang_id = dh.khach_hang_id)
),
ld AS (   -- lần cuối đến + số lần đến
  SELECT khach_hang_id, MAX(ngay) AS lan_cuoi, count(*) AS so_don
  FROM public.don_hang WHERE khach_hang_id IS NOT NULL AND COALESCE(is_test,false)=false GROUP BY 1
),
dv_gan AS (   -- dịch vụ GẦN NHẤT mỗi khách → nhóm sở thích
  SELECT DISTINCT ON (dh.khach_hang_id) dh.khach_hang_id, d.ten,
         public.voucher_nhom_dich_vu(d.ten) AS nhom
  FROM public.don_hang dh
  JOIN public.don_hang_chi_tiet ct ON ct.don_hang_id = dh.id AND ct.loai_item='dich_vu'
  JOIN public.dich_vu d ON d.id = ct.dich_vu_id
  WHERE dh.khach_hang_id IS NOT NULL AND COALESCE(dh.is_test,false)=false
  ORDER BY dh.khach_hang_id, dh.ngay DESC
)
SELECT k.id AS khach_hang_id, k.ho_ten, k.so_dien_thoai,
       ld.lan_cuoi, ld.so_don, (CURRENT_DATE - ld.lan_cuoi) AS so_ngay_vang,
       EXTRACT(year FROM ld.lan_cuoi)::int AS nam_lan_cuoi,
       dv_gan.ten AS dv_so_thich, COALESCE(dv_gan.nhom, 'thu_gian') AS nhom_so_thich
FROM public.khach_hang k
JOIN le ON le.khach_hang_id = k.id
JOIN ld ON ld.khach_hang_id = k.id
LEFT JOIN dv_gan ON dv_gan.khach_hang_id = k.id
WHERE k.so_dien_thoai IS NOT NULL AND (CURRENT_DATE - ld.lan_cuoi) > 30;

-- ── Hàng đợi mời khách lẻ (mỗi khách 1 lần) ──
CREATE TABLE IF NOT EXISTS public.le_hang_doi (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  khach_hang_id uuid UNIQUE REFERENCES public.khach_hang(id) ON DELETE CASCADE,
  ho_ten        text,
  so_dien_thoai text,
  nhom_so_thich text,
  dv_so_thich   text,
  so_don        integer,
  nam_lan_cuoi  integer,
  so_ngay_vang  integer,
  ngay_du_kien  date,
  trang_thai    text DEFAULT 'da_chot',   -- da_chot|da_gui|gui_loi|da_den|bo_qua
  chot_luc      timestamptz,
  gui_luc       timestamptz,
  msg_id        text,
  ket_qua_gui   text,
  da_den        boolean DEFAULT false,
  created_at    timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_le_trang_thai ON public.le_hang_doi(trang_thai);
ALTER TABLE public.le_hang_doi ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS le_all ON public.le_hang_doi;
CREATE POLICY le_all ON public.le_hang_doi FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ── RPC chốt: lấy N khách lẻ chưa xử lý, ưu tiên đến NHIỀU LẦN (trung thành) ──
CREATE OR REPLACE FUNCTION public.le_chot(p_so_luong integer DEFAULT 50, p_ngay date DEFAULT NULL)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_ngay date; v_cnt integer;
BEGIN
  v_ngay := COALESCE(p_ngay, ((now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date + 1));
  WITH pick AS (
    SELECT v.* FROM public.v_khach_le_quay_lai v
    WHERE NOT EXISTS (SELECT 1 FROM public.le_hang_doi h WHERE h.khach_hang_id = v.khach_hang_id)
    ORDER BY v.so_don DESC, v.so_ngay_vang ASC
    LIMIT GREATEST(p_so_luong, 0)
  )
  INSERT INTO public.le_hang_doi (khach_hang_id, ho_ten, so_dien_thoai, nhom_so_thich, dv_so_thich, so_don, nam_lan_cuoi, so_ngay_vang, ngay_du_kien, trang_thai, chot_luc)
  SELECT khach_hang_id, ho_ten, so_dien_thoai, nhom_so_thich, dv_so_thich, so_don, nam_lan_cuoi, so_ngay_vang, v_ngay, 'da_chot', now()
  FROM pick ON CONFLICT (khach_hang_id) DO NOTHING;
  GET DIAGNOSTICS v_cnt = ROW_COUNT;
  RETURN v_cnt;
END $$;
