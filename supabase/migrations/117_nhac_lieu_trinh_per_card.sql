-- 117 — Nhắc thẻ liệu trình: bộ đếm theo LẦN DÙNG BUỔI CỦA CHÍNH THẺ (yêu cầu anh Nam 20/06)
-- Trước: đếm theo lần khách đến bất kỳ (MAX don_hang.ngay theo khách).
-- Nay:   đếm theo lần DÙNG BUỔI của chính thẻ đó (don_hang_chi_tiet.loai_item='the_lieu_trinh').
--   → Khách dùng thẻ hôm nay thì bộ đếm reset, ~10 ngày sau tự nhắc quay lại dùng tiếp thẻ ĐÓ.
-- Thêm cột lan_dung_gan_nhat (ngày cụ thể) để hiển thị. Giữ bộ lọc 2025-2026 + triệt lông 3 năm (116).

DROP VIEW IF EXISTS public.v_nhac_lieu_trinh;
CREATE VIEW public.v_nhac_lieu_trinh AS
WITH the_usage AS (
  -- Lần dùng buổi gần nhất CỦA TỪNG THẺ
  SELECT
    ct.the_lieu_trinh_id,
    MAX(dh.ngay) AS lan_dung_the
  FROM public.don_hang_chi_tiet ct
  JOIN public.don_hang dh ON dh.id = ct.don_hang_id
  WHERE ct.the_lieu_trinh_id IS NOT NULL
    AND ct.loai_item = 'the_lieu_trinh'
    AND COALESCE(dh.trang_thai, '') <> 'huy'
    AND COALESCE(dh.is_test, false) = false
  GROUP BY ct.the_lieu_trinh_id
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
  -- Lần dùng buổi gần nhất của thẻ (fallback ngày mua nếu chưa dùng buổi nào)
  COALESCE(u.lan_dung_the, t.ngay_mua)       AS lan_dung_gan_nhat,
  COALESCE(u.lan_dung_the, t.ngay_mua)       AS lan_cuoi_den,  -- giữ tên cũ cho tương thích
  -- Bộ đếm: số ngày kể từ lần dùng buổi gần nhất của thẻ
  CASE
    WHEN COALESCE(u.lan_dung_the, t.ngay_mua) IS NULL THEN NULL
    ELSE ((now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date - COALESCE(u.lan_dung_the, t.ngay_mua))
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
  -- Khách đã dùng buổi thẻ SAU lần nhắc gần nhất? (đã quay lại → ngừng nhắc)
  CASE
    WHEN cs.ngay_nhac_cuoi IS NOT NULL
     AND COALESCE(u.lan_dung_the, t.ngay_mua) IS NOT NULL
     AND COALESCE(u.lan_dung_the, t.ngay_mua) > cs.ngay_nhac_cuoi
    THEN true ELSE false
  END                                        AS da_quay_lai_sau_nhac,
  -- Cờ "đến hạn nhắc": còn theo dõi + cửa sổ 10..120 ngày kể từ lần dùng thẻ + đủ 10 ngày kể từ lần nhắc cuối
  CASE
    WHEN COALESCE(cs.trang_thai, 'theo_doi') <> 'theo_doi' THEN false
    WHEN COALESCE(u.lan_dung_the, t.ngay_mua) IS NULL THEN false
    WHEN ((now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date - COALESCE(u.lan_dung_the, t.ngay_mua)) > 120 THEN false
    WHEN cs.ngay_nhac_cuoi IS NULL THEN
      (((now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date - COALESCE(u.lan_dung_the, t.ngay_mua)) >= 10)
    ELSE
      (((now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date - cs.ngay_nhac_cuoi) >= 10)
  END                                        AS den_han_nhac
FROM public.the_lieu_trinh t
JOIN public.khach_hang k ON k.id = t.khach_hang_id
LEFT JOIN the_usage u ON u.the_lieu_trinh_id = t.id
LEFT JOIN public.cham_soc_lieu_trinh cs ON cs.the_lieu_trinh_id = t.id
WHERE t.trang_thai = 'active'
  AND COALESCE(t.so_buoi_con_lai, 0) > 0
  AND (t.ngay_het_han IS NULL OR t.ngay_het_han >= (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date)
  AND k.so_dien_thoai IS NOT NULL
  AND COALESCE(k.is_active, true) = true
  AND (
    t.ngay_mua >= DATE '2025-01-01'
    OR (t.ten_dich_vu ILIKE '%triệt%'
        AND t.ngay_mua >= ((now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date - INTERVAL '3 years'))
  );

GRANT SELECT ON public.v_nhac_lieu_trinh TO authenticated, anon, service_role;
