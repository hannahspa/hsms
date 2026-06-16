-- 111: RPC tính tổng hợp Lương Kinh Doanh theo tháng (tránh giới hạn dòng PostgREST)
-- Trả JSON: tong_dt (Σ thực thu đơn), dt_my_pham (Σ bán SP), doanh_so [{nv, ds}] theo từng NV.
-- doanh_so mỗi NV = Σ thực thu các ĐƠN DISTINCT mà NV tham gia (khớp MySpa "doanh số sau giảm").

CREATE OR REPLACE FUNCTION public.luong_kd_summary(p_thang int, p_nam int)
RETURNS json
LANGUAGE sql STABLE
AS $$
  WITH dates AS (
    SELECT make_date(p_nam, p_thang, 1) AS d1,
           (make_date(p_nam, p_thang, 1) + interval '1 month')::date AS d2
  ),
  don_nv AS (  -- mỗi (NV, đơn) distinct + thực thu của đơn
    SELECT DISTINCT ct.nhan_vien_id, dh.id AS don_id, dh.thuc_thu
    FROM public.don_hang_chi_tiet ct
    JOIN public.don_hang dh ON dh.id = ct.don_hang_id
    CROSS JOIN dates
    WHERE dh.ngay >= dates.d1 AND dh.ngay < dates.d2
      AND dh.is_test = false AND dh.trang_thai <> 'huy'
      AND ct.nhan_vien_id IS NOT NULL
  )
  SELECT json_build_object(
    'tong_dt', (SELECT COALESCE(SUM(dh.thuc_thu), 0)
                FROM public.don_hang dh CROSS JOIN dates
                WHERE dh.ngay >= dates.d1 AND dh.ngay < dates.d2
                  AND dh.is_test = false AND dh.trang_thai <> 'huy'),
    'dt_my_pham', (SELECT COALESCE(SUM(ct.thanh_tien), 0)
                   FROM public.don_hang_chi_tiet ct
                   JOIN public.don_hang dh ON dh.id = ct.don_hang_id
                   CROSS JOIN dates
                   WHERE dh.ngay >= dates.d1 AND dh.ngay < dates.d2
                     AND dh.is_test = false AND dh.trang_thai <> 'huy'
                     AND ct.loai_item = 'san_pham'),
    'doanh_so', (SELECT COALESCE(json_agg(json_build_object('nv', nhan_vien_id, 'ds', ds)), '[]'::json)
                 FROM (SELECT nhan_vien_id, SUM(thuc_thu) AS ds
                       FROM don_nv GROUP BY nhan_vien_id) g)
  );
$$;

GRANT EXECUTE ON FUNCTION public.luong_kd_summary(int, int) TO anon, authenticated, service_role;
