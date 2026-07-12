BEGIN;

CREATE TEMP TABLE hsms_pos_test_orders AS
SELECT id, ma_don, khach_hang_id, COALESCE(thuc_thu, 0) AS thuc_thu, trang_thai
FROM public.don_hang
WHERE ghi_chu ILIKE '%HSMS_REAL_TEST_20260526%'
   OR id IN (
      SELECT don_hang_id FROM public.don_hang_chi_tiet WHERE ghi_chu ILIKE '%HSMS_REAL_TEST%'
      UNION
      SELECT don_hang_id FROM public.thanh_toan WHERE ghi_chu ILIKE '%HSMS_REAL_TEST%'
   );

CREATE TEMP TABLE hsms_pos_test_cards AS
SELECT id
FROM public.the_lieu_trinh
WHERE don_hang_id IN (SELECT id FROM hsms_pos_test_orders);

CREATE TEMP TABLE hsms_pos_test_summary AS
SELECT
  (SELECT COUNT(*) FROM hsms_pos_test_orders) AS orders_before,
  (SELECT COUNT(*) FROM public.don_hang_chi_tiet WHERE don_hang_id IN (SELECT id FROM hsms_pos_test_orders)) AS line_items_before,
  (SELECT COUNT(*) FROM public.thanh_toan WHERE don_hang_id IN (SELECT id FROM hsms_pos_test_orders)) AS payments_before,
  (SELECT COUNT(*) FROM public.nhan_vien_thu_nhap WHERE don_hang_id IN (SELECT id FROM hsms_pos_test_orders)) AS staff_income_before,
  (SELECT COUNT(*) FROM public.cong_no_khach_hang WHERE don_hang_id IN (SELECT id FROM hsms_pos_test_orders)) AS debt_before,
  (SELECT COUNT(*) FROM public.lich_su_dung_the WHERE don_hang_id IN (SELECT id FROM hsms_pos_test_orders)) AS card_usage_before,
  (SELECT COUNT(*) FROM hsms_pos_test_cards) AS generated_cards_before;

WITH reverse_existing_card_usage AS (
  SELECT dhct.the_lieu_trinh_id, SUM(COALESCE(dhct.so_luong, 1))::integer AS used_qty
  FROM public.don_hang_chi_tiet dhct
  JOIN hsms_pos_test_orders o ON o.id = dhct.don_hang_id
  WHERE dhct.loai_item = 'the_lieu_trinh'
    AND o.trang_thai <> 'huy'
    AND dhct.the_lieu_trinh_id IS NOT NULL
    AND dhct.the_lieu_trinh_id NOT IN (SELECT id FROM hsms_pos_test_cards)
  GROUP BY dhct.the_lieu_trinh_id
)
UPDATE public.the_lieu_trinh t
SET
  so_buoi_da_dung = GREATEST(0, COALESCE(t.so_buoi_da_dung, 0) - r.used_qty),
  trang_thai = CASE
    WHEN t.trang_thai = 'het_buoi' THEN 'active'
    ELSE t.trang_thai
  END
FROM reverse_existing_card_usage r
WHERE t.id = r.the_lieu_trinh_id;

WITH reverse_customers AS (
  SELECT
    khach_hang_id,
    SUM(thuc_thu)::integer AS reduce_spend,
    COUNT(*)::integer AS reduce_visits
  FROM hsms_pos_test_orders
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
WHERE don_hang_id IN (SELECT id FROM hsms_pos_test_orders);

DELETE FROM public.nhan_vien_thu_nhap
WHERE don_hang_id IN (SELECT id FROM hsms_pos_test_orders);

DELETE FROM public.cong_no_khach_hang
WHERE don_hang_id IN (SELECT id FROM hsms_pos_test_orders);

DELETE FROM public.doanh_thu
WHERE don_hang_id IN (SELECT id FROM hsms_pos_test_orders);

DELETE FROM public.thanh_toan
WHERE don_hang_id IN (SELECT id FROM hsms_pos_test_orders);

DELETE FROM public.don_hang_chi_tiet
WHERE don_hang_id IN (SELECT id FROM hsms_pos_test_orders);

DELETE FROM public.the_lieu_trinh
WHERE id IN (SELECT id FROM hsms_pos_test_cards);

DELETE FROM public.don_hang
WHERE id IN (SELECT id FROM hsms_pos_test_orders);

COMMIT;

SELECT
  s.*,
  (SELECT COUNT(*) FROM public.don_hang WHERE ghi_chu ILIKE '%HSMS_REAL_TEST_20260526%') AS orders_after,
  (SELECT COUNT(*) FROM public.don_hang_chi_tiet WHERE ghi_chu ILIKE '%HSMS_REAL_TEST%') AS line_items_after,
  (SELECT COUNT(*) FROM public.thanh_toan WHERE ghi_chu ILIKE '%HSMS_REAL_TEST%') AS payments_after,
  (SELECT COUNT(*) FROM public.the_lieu_trinh WHERE don_hang_id IS NOT NULL AND ma_the IN ('THE-LT-4976', 'THE-LT-4977')) AS generated_cards_after
FROM hsms_pos_test_summary s;

DROP TABLE IF EXISTS hsms_pos_test_summary;
DROP TABLE IF EXISTS hsms_pos_test_cards;
DROP TABLE IF EXISTS hsms_pos_test_orders;
