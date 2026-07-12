BEGIN;

CREATE TEMP TABLE hsms_pos_may_orders AS
SELECT id, ma_don, khach_hang_id, COALESCE(thuc_thu, 0) AS thuc_thu, trang_thai
FROM public.don_hang
WHERE ngay >= date '2026-05-01';

CREATE TEMP TABLE hsms_pos_may_summary AS
SELECT
  (SELECT COUNT(*) FROM hsms_pos_may_orders) AS orders_before,
  (SELECT COUNT(*) FROM public.don_hang_chi_tiet WHERE don_hang_id IN (SELECT id FROM hsms_pos_may_orders)) AS line_items_before,
  (SELECT COUNT(*) FROM public.thanh_toan WHERE don_hang_id IN (SELECT id FROM hsms_pos_may_orders)) AS payments_before,
  (SELECT COUNT(*) FROM public.doanh_thu WHERE don_hang_id IN (SELECT id FROM hsms_pos_may_orders)) AS revenue_before,
  (SELECT COUNT(*) FROM public.nhan_vien_thu_nhap WHERE don_hang_id IN (SELECT id FROM hsms_pos_may_orders)) AS staff_income_before,
  (SELECT COUNT(*) FROM public.cong_no_khach_hang WHERE don_hang_id IN (SELECT id FROM hsms_pos_may_orders)) AS debt_before,
  (SELECT COUNT(*) FROM public.lich_su_dung_the WHERE don_hang_id IN (SELECT id FROM hsms_pos_may_orders)) AS card_usage_before,
  (SELECT COUNT(*) FROM public.the_lieu_trinh WHERE don_hang_id IN (SELECT id FROM hsms_pos_may_orders)) AS generated_cards_before;

WITH reverse_customers AS (
  SELECT
    khach_hang_id,
    SUM(thuc_thu)::integer AS reduce_spend,
    COUNT(*)::integer AS reduce_visits
  FROM hsms_pos_may_orders
  WHERE khach_hang_id IS NOT NULL
    AND trang_thai IN ('da_thanh_toan', 'no_mot_phan')
  GROUP BY khach_hang_id
)
UPDATE public.khach_hang kh
SET
  tong_chi_tieu = GREATEST(0, COALESCE(kh.tong_chi_tieu, 0) - r.reduce_spend),
  so_lan_den = GREATEST(0, COALESCE(kh.so_lan_den, 0) - r.reduce_visits)
FROM reverse_customers r
WHERE kh.id = r.khach_hang_id;

DELETE FROM public.lich_su_dung_the
WHERE don_hang_id IN (SELECT id FROM hsms_pos_may_orders);

DELETE FROM public.nhan_vien_thu_nhap
WHERE don_hang_id IN (SELECT id FROM hsms_pos_may_orders);

DELETE FROM public.cong_no_khach_hang
WHERE don_hang_id IN (SELECT id FROM hsms_pos_may_orders);

DELETE FROM public.doanh_thu
WHERE don_hang_id IN (SELECT id FROM hsms_pos_may_orders);

DELETE FROM public.thanh_toan
WHERE don_hang_id IN (SELECT id FROM hsms_pos_may_orders);

DELETE FROM public.don_hang_chi_tiet
WHERE don_hang_id IN (SELECT id FROM hsms_pos_may_orders);

DELETE FROM public.the_lieu_trinh
WHERE don_hang_id IN (SELECT id FROM hsms_pos_may_orders);

DELETE FROM public.don_hang
WHERE id IN (SELECT id FROM hsms_pos_may_orders);

COMMIT;

SELECT
  s.*,
  (SELECT COUNT(*) FROM public.don_hang WHERE ngay >= date '2026-05-01') AS orders_after,
  (SELECT COUNT(*) FROM public.don_hang_chi_tiet dhct JOIN public.don_hang dh ON dh.id = dhct.don_hang_id WHERE dh.ngay >= date '2026-05-01') AS line_items_after,
  (SELECT COUNT(*) FROM public.thanh_toan tt JOIN public.don_hang dh ON dh.id = tt.don_hang_id WHERE dh.ngay >= date '2026-05-01') AS payments_after,
  (SELECT COUNT(*) FROM public.the_lieu_trinh t WHERE t.don_hang_id IS NOT NULL AND t.ngay_mua >= date '2026-05-01') AS generated_cards_after
FROM hsms_pos_may_summary s;

DROP TABLE IF EXISTS hsms_pos_may_summary;
DROP TABLE IF EXISTS hsms_pos_may_orders;
