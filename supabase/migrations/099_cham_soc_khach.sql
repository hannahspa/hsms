-- Migration 099: View Cham Soc Khach Hang (Customer Care / Retention)
-- Sprint 1 "Giu chan khach" — phat hien khach can goi cham soc:
--   - Roi bo (winback): >=45 ngay khong quay lai (nguong anh Nam chot 11/06/2026)
--   - The ngu quen: con buoi nhung lau khong toi
--   - Sinh nhat: tinh o client tu ngay_sinh
-- DOC LAP: chi dung 3 bang loi chac chan ton tai. KHONG phu thuoc module marketing.
-- "Lan cuoi den" lay tu MAX(don_hang.ngay) — nguon THAT, khong dung cot
-- khach_hang.lan_cuoi_den (cap nhat thu cong, khong dang tin).

CREATE OR REPLACE VIEW public.v_cham_soc_khach AS
WITH don_kh AS (
  SELECT
    khach_hang_id,
    MAX(ngay)                          AS lan_cuoi_den,
    COUNT(*)::int                      AS so_don,
    COALESCE(SUM(thuc_thu), 0)::bigint AS tong_chi_tieu
  FROM public.don_hang
  WHERE khach_hang_id IS NOT NULL
    AND COALESCE(trang_thai, '') <> 'huy'
  GROUP BY khach_hang_id
),
the_kh AS (
  SELECT
    khach_hang_id,
    COUNT(*) FILTER (
      WHERE trang_thai = 'active' AND COALESCE(so_buoi_con_lai, 0) > 0
    )::int AS so_the_con_buoi,
    COALESCE(SUM(
      CASE WHEN trang_thai = 'active' THEN so_buoi_con_lai ELSE 0 END
    ), 0)::int AS tong_buoi_con
  FROM public.the_lieu_trinh
  GROUP BY khach_hang_id
)
SELECT
  k.id,
  k.ho_ten,
  k.so_dien_thoai,
  k.ngay_sinh,
  k.nguon,
  k.hang,
  d.lan_cuoi_den,
  COALESCE(d.so_don, 0)                       AS so_don,
  COALESCE(d.tong_chi_tieu, 0)                AS tong_chi_tieu,
  COALESCE(t.so_the_con_buoi, 0)             AS so_the_con_buoi,
  COALESCE(t.tong_buoi_con, 0)               AS tong_buoi_con,
  (CURRENT_DATE - d.lan_cuoi_den)::int        AS so_ngay_vang
FROM public.khach_hang k
LEFT JOIN don_kh d ON d.khach_hang_id = k.id
LEFT JOIN the_kh t ON t.khach_hang_id = k.id
WHERE COALESCE(k.is_active, true) = true;

COMMENT ON VIEW public.v_cham_soc_khach IS
  'Cham soc khach (Sprint 1): lan cuoi den that tu don_hang, the con buoi, ngay sinh — phuc vu trang /admin/cham-soc-khach.';
