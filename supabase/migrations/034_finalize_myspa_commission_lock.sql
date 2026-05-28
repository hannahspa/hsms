-- 034_finalize_myspa_commission_lock.sql
-- Complete staff matching for MySpa commission staging and expose a safe
-- preview ledger before replacing any historical POS payroll rows.

WITH missing_staff(raw_name, staff_name, display_name, vi_tri, start_date) AS (
  VALUES
    ('Nguyen Anh Ngoc', 'Nguyen Anh Ngoc (Nghỉ Việc)', 'Anh Ngoc (Nghỉ Việc)', 'Kỹ Thuật Viên', date '2021-03-12'),
    ('To Nguyet Minh', 'To Nguyet Minh (Nghỉ Việc)', 'Nguyet Minh (Nghỉ Việc)', 'Kỹ Thuật Viên', date '2020-12-10'),
    ('Duong Ngoc Tuong Vy', 'Duong Ngoc Tuong Vy (Nghỉ Việc)', 'Tuong Vy (Nghỉ Việc)', 'Lễ Tân', date '2020-11-11')
)
INSERT INTO nhan_vien (
  ho_ten,
  vi_tri,
  luong_cung,
  ngay_bat_dau,
  trang_thai,
  ky_quy_so_thang,
  ky_quy_trang_thai
)
SELECT
  staff_name,
  vi_tri,
  0,
  start_date,
  'nghi_viec',
  0,
  'chua'
FROM missing_staff ms
WHERE NOT EXISTS (
  SELECT 1
  FROM nhan_vien nv
  WHERE lower(nv.ho_ten) = lower(ms.staff_name)
     OR lower(nv.ho_ten) = lower(ms.raw_name)
);

WITH missing_staff(raw_name, staff_name) AS (
  VALUES
    ('Nguyen Anh Ngoc', 'Nguyen Anh Ngoc (Nghỉ Việc)'),
    ('To Nguyet Minh', 'To Nguyet Minh (Nghỉ Việc)'),
    ('Duong Ngoc Tuong Vy', 'Duong Ngoc Tuong Vy (Nghỉ Việc)')
)
UPDATE myspa_commission_detail d
SET
  matched_nhan_vien_id = nv.id,
  staff_status = 'nghi_viec'
FROM missing_staff ms
JOIN nhan_vien nv
  ON lower(nv.ho_ten) = lower(ms.staff_name)
  OR lower(nv.ho_ten) = lower(ms.raw_name)
WHERE d.staff_name_raw = ms.raw_name
  AND d.matched_nhan_vien_id IS NULL;

ALTER TABLE nhan_vien_thu_nhap
DROP CONSTRAINT IF EXISTS nhan_vien_thu_nhap_nguon_check;

ALTER TABLE nhan_vien_thu_nhap
ADD CONSTRAINT nhan_vien_thu_nhap_nguon_check
CHECK (nguon IN ('pos', 'manual', 'payroll', 'myspa_commission'));

CREATE OR REPLACE VIEW v_myspa_commission_lock_summary AS
SELECT 'commission_rows' AS metric, COUNT(*)::numeric AS value, COALESCE(SUM(tong_tien), 0)::numeric AS amount
FROM myspa_commission_detail
WHERE row_kind = 'detail'
UNION ALL
SELECT 'matched_orders', COUNT(*)::numeric, COALESCE(SUM(tong_tien), 0)::numeric
FROM myspa_commission_detail
WHERE row_kind = 'detail' AND don_hang_id IS NOT NULL
UNION ALL
SELECT 'matched_staff', COUNT(*)::numeric, COALESCE(SUM(tong_tien), 0)::numeric
FROM myspa_commission_detail
WHERE row_kind = 'detail' AND matched_nhan_vien_id IS NOT NULL
UNION ALL
SELECT 'unmatched_orders', COUNT(*)::numeric, COALESCE(SUM(tong_tien), 0)::numeric
FROM myspa_commission_detail
WHERE row_kind = 'detail' AND don_hang_id IS NULL
UNION ALL
SELECT 'unmatched_staff', COUNT(*)::numeric, COALESCE(SUM(tong_tien), 0)::numeric
FROM myspa_commission_detail
WHERE row_kind = 'detail' AND matched_nhan_vien_id IS NULL
UNION ALL
SELECT 'tour_amount', COUNT(*)::numeric, COALESCE(SUM(tien_tour_nv), 0)::numeric
FROM myspa_commission_detail
WHERE row_kind = 'detail' AND tien_tour_nv > 0
UNION ALL
SELECT 'commission_amount', COUNT(*)::numeric, COALESCE(SUM(commission_ngay_tim_kiem + commission_tong_don), 0)::numeric
FROM myspa_commission_detail
WHERE row_kind = 'detail' AND (commission_ngay_tim_kiem + commission_tong_don) > 0;

CREATE OR REPLACE VIEW v_myspa_commission_ledger_preview AS
SELECT
  d.id AS source_commission_id,
  d.source_file,
  d.source_row,
  d.ngay,
  d.don_hang_id,
  d.don_hang_chi_tiet_id,
  d.matched_nhan_vien_id AS nhan_vien_id,
  nv.ho_ten AS nhan_vien,
  d.staff_display,
  d.staff_status,
  d.ma_don_the AS ma_don,
  dh.ma_don AS hsms_ma_don,
  d.ten_khach_hang,
  d.so_dien_thoai,
  d.ten_dich_vu,
  d.item_code,
  x.loai,
  d.doanh_so_sau_giam AS doanh_so_tinh,
  CASE WHEN x.loai = 'commission' THEN d.ti_le ELSE NULL END AS ti_le,
  x.so_tien,
  d.match_status,
  format(
    'MySpa commission import %s row %s: %s - %s',
    d.source_file,
    d.source_row,
    d.staff_display,
    COALESCE(d.ten_dich_vu, d.ma_don_the)
  ) AS ghi_chu
FROM myspa_commission_detail d
JOIN don_hang dh ON dh.id = d.don_hang_id
JOIN nhan_vien nv ON nv.id = d.matched_nhan_vien_id
CROSS JOIN LATERAL (
  VALUES
    ('tour'::text, COALESCE(d.tien_tour_nv, 0)),
    ('commission'::text, COALESCE(d.commission_ngay_tim_kiem, 0) + COALESCE(d.commission_tong_don, 0))
) AS x(loai, so_tien)
WHERE d.row_kind = 'detail'
  AND COALESCE(x.so_tien, 0) > 0;

CREATE OR REPLACE VIEW v_myspa_commission_vs_current_ledger_summary AS
WITH myspa AS (
  SELECT
    nhan_vien_id,
    loai,
    COUNT(*) AS myspa_rows,
    COALESCE(SUM(so_tien), 0) AS myspa_amount
  FROM v_myspa_commission_ledger_preview
  GROUP BY nhan_vien_id, loai
),
hsms AS (
  SELECT
    nvt.nhan_vien_id,
    nvt.loai,
    COUNT(*) AS hsms_rows,
    COALESCE(SUM(nvt.so_tien), 0) AS hsms_amount
  FROM nhan_vien_thu_nhap nvt
  JOIN don_hang dh ON dh.id = nvt.don_hang_id
  WHERE dh.ngay <= date '2026-04-30'
    AND COALESCE(nvt.is_test, false) = false
    AND nvt.trang_thai <> 'huy'
  GROUP BY nvt.nhan_vien_id, nvt.loai
)
SELECT
  COALESCE(myspa.nhan_vien_id, hsms.nhan_vien_id) AS nhan_vien_id,
  nv.ho_ten AS nhan_vien,
  COALESCE(myspa.loai, hsms.loai) AS loai,
  COALESCE(myspa.myspa_rows, 0) AS myspa_rows,
  COALESCE(hsms.hsms_rows, 0) AS hsms_rows,
  COALESCE(myspa.myspa_amount, 0) AS myspa_amount,
  COALESCE(hsms.hsms_amount, 0) AS hsms_amount,
  COALESCE(myspa.myspa_amount, 0) - COALESCE(hsms.hsms_amount, 0) AS chenh_lech
FROM myspa
FULL JOIN hsms
  ON hsms.nhan_vien_id = myspa.nhan_vien_id
 AND hsms.loai = myspa.loai
LEFT JOIN nhan_vien nv ON nv.id = COALESCE(myspa.nhan_vien_id, hsms.nhan_vien_id)
ORDER BY ABS(COALESCE(myspa.myspa_amount, 0) - COALESCE(hsms.hsms_amount, 0)) DESC;
