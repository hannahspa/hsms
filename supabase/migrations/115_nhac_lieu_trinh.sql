-- 115 — Nhắc thẻ liệu trình tự động
-- Mục tiêu (yêu cầu anh Nam 19/06): khách có thẻ liệu trình còn buổi nhưng lâu chưa quay lại
-- → bộ đếm ngày vắng → cứ ~10 ngày nhắc 1 nhịp, kịch bản leo thang (nhắc nhẹ → lợi ích/sắp hết hạn → sale chéo + KM)
-- để tăng tỷ lệ khách quay lại dùng tiếp thẻ.
--
-- Gồm: bảng theo dõi nhịp nhắc (cham_soc_lieu_trinh) + view nguồn dữ liệu (v_nhac_lieu_trinh).
-- Gửi tin (ZNS/Zalo) + sinh kịch bản AI do edge function `nhac-lieu-trinh` đảm nhiệm; bảng này chỉ lưu trạng thái.

-- ── Bảng theo dõi nhịp nhắc (1 dòng / thẻ đang theo dõi) ──────────────────────
CREATE TABLE IF NOT EXISTS public.cham_soc_lieu_trinh (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  the_lieu_trinh_id  uuid NOT NULL UNIQUE REFERENCES public.the_lieu_trinh(id) ON DELETE CASCADE,
  so_lan_nhac        integer NOT NULL DEFAULT 0,
  ngay_nhac_cuoi     date,
  trang_thai         text NOT NULL DEFAULT 'theo_doi'
                       CHECK (trang_thai IN ('theo_doi','da_quay_lai','tam_dung','hoan_thanh')),
  kich_ban_cuoi      text,                       -- nội dung nhắc gần nhất (AI hoặc thủ công)
  kenh_cuoi          text,                       -- 'zns' | 'zalo' | 'goi' | 'thu_cong'
  lich_su            jsonb NOT NULL DEFAULT '[]'::jsonb,  -- [{lan, ngay, kenh, noi_dung, ket_qua}]
  created_at         timestamptz DEFAULT now(),
  updated_at         timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cham_soc_lieu_trinh_the ON public.cham_soc_lieu_trinh(the_lieu_trinh_id);
CREATE INDEX IF NOT EXISTS idx_cham_soc_lieu_trinh_trang_thai ON public.cham_soc_lieu_trinh(trang_thai);

ALTER TABLE public.cham_soc_lieu_trinh ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS p_cham_soc_lieu_trinh_all ON public.cham_soc_lieu_trinh;
CREATE POLICY p_cham_soc_lieu_trinh_all ON public.cham_soc_lieu_trinh
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.cham_soc_lieu_trinh TO authenticated;
GRANT ALL ON public.cham_soc_lieu_trinh TO service_role;

-- ── View nguồn dữ liệu: mỗi THẺ active còn buổi + bộ đếm ngày vắng + nhịp nhắc ──
CREATE OR REPLACE VIEW public.v_nhac_lieu_trinh AS
WITH don AS (
  SELECT
    dh.khach_hang_id,
    MAX(dh.ngay) AS lan_cuoi_den
  FROM public.don_hang dh
  WHERE dh.khach_hang_id IS NOT NULL
    AND COALESCE(dh.trang_thai, '') <> 'huy'
    AND COALESCE(dh.is_test, false) = false
  GROUP BY dh.khach_hang_id
)
SELECT
  t.id                                      AS the_id,
  t.khach_hang_id,
  t.ten_dich_vu,
  t.so_buoi_tong,
  t.so_buoi_da_dung,
  t.so_buoi_con_lai,
  t.gia_tri_the,
  t.ngay_mua,
  t.ngay_het_han,
  k.ho_ten,
  k.so_dien_thoai,
  public.normalize_vn_phone(k.so_dien_thoai) AS phone_norm,
  k.ngay_sinh,
  COALESCE(d.lan_cuoi_den, k.lan_cuoi_den)   AS lan_cuoi_den,
  -- Bộ đếm: số ngày khách vắng kể từ lần đến gần nhất
  CASE
    WHEN COALESCE(d.lan_cuoi_den, k.lan_cuoi_den) IS NULL THEN NULL
    ELSE ((now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date - COALESCE(d.lan_cuoi_den, k.lan_cuoi_den))
  END                                        AS so_ngay_vang,
  -- Trạng thái theo dõi nhịp nhắc
  COALESCE(cs.so_lan_nhac, 0)                AS so_lan_nhac,
  cs.ngay_nhac_cuoi,
  COALESCE(cs.trang_thai, 'theo_doi')        AS trang_thai_cham_soc,
  cs.kich_ban_cuoi,
  cs.kenh_cuoi,
  cs.lich_su,
  -- Số ngày kể từ lần nhắc gần nhất (để áp nhịp ~10 ngày)
  CASE
    WHEN cs.ngay_nhac_cuoi IS NULL THEN NULL
    ELSE ((now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date - cs.ngay_nhac_cuoi)
  END                                        AS so_ngay_tu_lan_nhac,
  -- Khách đã quay lại SAU khi nhắc? (đến mới hơn lần nhắc gần nhất)
  CASE
    WHEN cs.ngay_nhac_cuoi IS NOT NULL
     AND COALESCE(d.lan_cuoi_den, k.lan_cuoi_den) IS NOT NULL
     AND COALESCE(d.lan_cuoi_den, k.lan_cuoi_den) > cs.ngay_nhac_cuoi
    THEN true ELSE false
  END                                        AS da_quay_lai_sau_nhac,
  -- Cờ "đến hạn nhắc": còn theo dõi + trong cửa sổ 10..120 ngày kể từ lần đến + đủ 10 ngày kể từ lần nhắc cuối.
  -- Trần 120 ngày: khách vắng quá lâu (đa phần thẻ MySpa cũ) KHÔNG tự nhắc ồ ạt — để win-back thủ công (module Chăm Sóc Khách).
  CASE
    WHEN COALESCE(cs.trang_thai, 'theo_doi') <> 'theo_doi' THEN false
    WHEN COALESCE(d.lan_cuoi_den, k.lan_cuoi_den) IS NULL THEN false
    WHEN ((now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date - COALESCE(d.lan_cuoi_den, k.lan_cuoi_den)) > 120 THEN false
    WHEN cs.ngay_nhac_cuoi IS NULL THEN
      (((now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date - COALESCE(d.lan_cuoi_den, k.lan_cuoi_den)) >= 10)
    ELSE
      (((now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date - cs.ngay_nhac_cuoi) >= 10)
  END                                        AS den_han_nhac
FROM public.the_lieu_trinh t
JOIN public.khach_hang k ON k.id = t.khach_hang_id
LEFT JOIN don d ON d.khach_hang_id = t.khach_hang_id
LEFT JOIN public.cham_soc_lieu_trinh cs ON cs.the_lieu_trinh_id = t.id
WHERE t.trang_thai = 'active'
  AND COALESCE(t.so_buoi_con_lai, 0) > 0
  AND (t.ngay_het_han IS NULL OR t.ngay_het_han >= (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date)
  AND k.so_dien_thoai IS NOT NULL
  AND COALESCE(k.is_active, true) = true;

GRANT SELECT ON public.v_nhac_lieu_trinh TO authenticated, anon, service_role;

-- ── RPC ghi nhận 1 nhịp nhắc (tăng đếm + append lịch sử) — frontend gọi an toàn ──
CREATE OR REPLACE FUNCTION public.ghi_nhan_nhac_lieu_trinh(
  p_the_id uuid,
  p_kenh   text,
  p_noi_dung text,
  p_ket_qua text DEFAULT 'da_gui'
) RETURNS public.cham_soc_lieu_trinh
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_row public.cham_soc_lieu_trinh;
  v_today date := (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date;
  v_entry jsonb;
BEGIN
  INSERT INTO public.cham_soc_lieu_trinh (the_lieu_trinh_id, so_lan_nhac, ngay_nhac_cuoi, kich_ban_cuoi, kenh_cuoi, lich_su, updated_at)
  VALUES (p_the_id, 1, v_today, p_noi_dung, p_kenh,
          jsonb_build_array(jsonb_build_object('lan', 1, 'ngay', v_today, 'kenh', p_kenh, 'noi_dung', p_noi_dung, 'ket_qua', p_ket_qua)),
          now())
  ON CONFLICT (the_lieu_trinh_id) DO UPDATE SET
    so_lan_nhac    = public.cham_soc_lieu_trinh.so_lan_nhac + 1,
    ngay_nhac_cuoi = v_today,
    kich_ban_cuoi  = p_noi_dung,
    kenh_cuoi      = p_kenh,
    lich_su        = public.cham_soc_lieu_trinh.lich_su
                       || jsonb_build_array(jsonb_build_object(
                            'lan', public.cham_soc_lieu_trinh.so_lan_nhac + 1,
                            'ngay', v_today, 'kenh', p_kenh,
                            'noi_dung', p_noi_dung, 'ket_qua', p_ket_qua)),
    updated_at     = now()
  RETURNING * INTO v_row;
  RETURN v_row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.ghi_nhan_nhac_lieu_trinh(uuid, text, text, text) TO authenticated, service_role;

-- ── RPC đổi trạng thái theo dõi (đã quay lại / tạm dừng / theo dõi lại) ──
CREATE OR REPLACE FUNCTION public.dat_trang_thai_nhac_lieu_trinh(
  p_the_id uuid,
  p_trang_thai text
) RETURNS public.cham_soc_lieu_trinh
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_row public.cham_soc_lieu_trinh;
BEGIN
  INSERT INTO public.cham_soc_lieu_trinh (the_lieu_trinh_id, trang_thai, updated_at)
  VALUES (p_the_id, p_trang_thai, now())
  ON CONFLICT (the_lieu_trinh_id) DO UPDATE SET
    trang_thai = p_trang_thai,
    updated_at = now()
  RETURNING * INTO v_row;
  RETURN v_row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.dat_trang_thai_nhac_lieu_trinh(uuid, text) TO authenticated, service_role;
