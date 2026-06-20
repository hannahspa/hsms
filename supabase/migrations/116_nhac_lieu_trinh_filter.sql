-- 116 — Lọc danh sách nhắc thẻ liệu trình (yêu cầu anh Nam 20/06)
-- Chỉ nhắc thẻ còn giá trị thật:
--   1) Loại thẻ đã hết hạn (đã có ở 115: ngay_het_han >= hôm nay).
--   2) Chỉ giữ thẻ MUA TỪ 2025 trở đi (bỏ thẻ cũ 2019-2024).
--   3) NGOẠI LỆ triệt lông: bảo hành 3 năm → giữ nếu mua trong vòng 3 năm gần nhất (kể cả trước 2025).
-- Chỉ thay đổi điều kiện WHERE của view; phần SELECT giữ nguyên như 115.

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
  CASE
    WHEN COALESCE(d.lan_cuoi_den, k.lan_cuoi_den) IS NULL THEN NULL
    ELSE ((now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date - COALESCE(d.lan_cuoi_den, k.lan_cuoi_den))
  END                                        AS so_ngay_vang,
  COALESCE(cs.so_lan_nhac, 0)                AS so_lan_nhac,
  cs.ngay_nhac_cuoi,
  COALESCE(cs.trang_thai, 'theo_doi')        AS trang_thai_cham_soc,
  cs.kich_ban_cuoi,
  cs.kenh_cuoi,
  cs.lich_su,
  CASE
    WHEN cs.ngay_nhac_cuoi IS NULL THEN NULL
    ELSE ((now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date - cs.ngay_nhac_cuoi)
  END                                        AS so_ngay_tu_lan_nhac,
  CASE
    WHEN cs.ngay_nhac_cuoi IS NOT NULL
     AND COALESCE(d.lan_cuoi_den, k.lan_cuoi_den) IS NOT NULL
     AND COALESCE(d.lan_cuoi_den, k.lan_cuoi_den) > cs.ngay_nhac_cuoi
    THEN true ELSE false
  END                                        AS da_quay_lai_sau_nhac,
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
  AND COALESCE(k.is_active, true) = true
  -- Chỉ thẻ 2025-2026; triệt lông bảo hành 3 năm là ngoại lệ (giữ nếu mua trong 3 năm gần nhất)
  AND (
    t.ngay_mua >= DATE '2025-01-01'
    OR (t.ten_dich_vu ILIKE '%triệt%'
        AND t.ngay_mua >= ((now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date - INTERVAL '3 years'))
  );

GRANT SELECT ON public.v_nhac_lieu_trinh TO authenticated, anon, service_role;
