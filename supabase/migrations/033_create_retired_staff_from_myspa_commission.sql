-- 033_create_retired_staff_from_myspa_commission.sql
-- Create inactive staff records for legacy MySpa employees so payroll history can
-- reference a real nhan_vien_id while UI still displays the short retired name.

WITH retired AS (
  SELECT
    staff_name_raw,
    staff_display,
    MIN(ngay) AS ngay_bat_dau,
    MODE() WITHIN GROUP (ORDER BY NULLIF(chuc_vu, '')) AS vi_tri
  FROM myspa_commission_detail
  WHERE row_kind = 'detail'
    AND matched_nhan_vien_id IS NULL
    AND NULLIF(staff_name_raw, '') IS NOT NULL
  GROUP BY staff_name_raw, staff_display
),
to_insert AS (
  SELECT
    CONCAT(staff_name_raw, ' (Nghỉ Việc)') AS ho_ten,
    COALESCE(NULLIF(vi_tri, ''), 'Nhân Viên Nghỉ Việc') AS vi_tri,
    COALESCE(ngay_bat_dau, DATE '2019-01-01') AS ngay_bat_dau
  FROM retired r
  WHERE NOT EXISTS (
    SELECT 1
    FROM nhan_vien nv
    WHERE norm_vn(nv.ho_ten) = norm_vn(CONCAT(r.staff_name_raw, ' (Nghỉ Việc)'))
       OR norm_vn(nv.ho_ten) = norm_vn(r.staff_name_raw)
  )
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
  ho_ten,
  vi_tri,
  0,
  ngay_bat_dau,
  'nghi_viec',
  0,
  'chua'
FROM to_insert;

UPDATE myspa_commission_detail d
SET
  matched_nhan_vien_id = nv.id,
  staff_status = CASE WHEN nv.trang_thai = 'nghi_viec' THEN 'nghi_viec' ELSE 'dang_lam' END
FROM nhan_vien nv
WHERE d.matched_nhan_vien_id IS NULL
  AND (
    norm_vn(nv.ho_ten) = norm_vn(CONCAT(d.staff_name_raw, ' (Nghỉ Việc)'))
    OR norm_vn(nv.ho_ten) = norm_vn(d.staff_name_raw)
  );

-- Re-run clear line matching after retired staff receives nhan_vien_id.
WITH candidates AS (
  SELECT
    d.id AS commission_id,
    dhct.id AS line_id,
    CASE
      WHEN d.matched_nhan_vien_id IS NOT NULL AND dhct.nhan_vien_id = d.matched_nhan_vien_id THEN 100
      WHEN norm_vn(dhct.meta->>'myspaStaffDisplay') = norm_vn(d.staff_display) THEN 80
      WHEN norm_vn(nv.ho_ten) = norm_vn(d.staff_display) THEN 70
      ELSE 0
    END
    + CASE
      WHEN d.item_code IS NOT NULL AND norm_digits(d.item_code) <> ''
       AND norm_digits(COALESCE(dhct.meta->>'myspaItemCode', dv.ma_dv, tlt.meta->>'ma_dich_vu', '')) = norm_digits(d.item_code)
      THEN 50
      ELSE 0
    END
    + CASE
      WHEN d.ten_dich_vu IS NOT NULL
       AND norm_vn(d.ten_dich_vu) LIKE '%' || norm_vn(COALESCE(dhct.meta->>'tenDichVu', dv.ten, tlt.ten_dich_vu, '')) || '%'
      THEN 20
      ELSE 0
    END AS score
  FROM myspa_commission_detail d
  JOIN don_hang dh ON dh.id = d.don_hang_id
  JOIN don_hang_chi_tiet dhct ON dhct.don_hang_id = dh.id
  LEFT JOIN nhan_vien nv ON nv.id = dhct.nhan_vien_id
  LEFT JOIN dich_vu dv ON dv.id = dhct.dich_vu_id
  LEFT JOIN the_lieu_trinh tlt ON tlt.id = dhct.the_lieu_trinh_id
  WHERE d.row_kind = 'detail'
    AND d.ten_dich_vu IS NOT NULL
    AND d.ten_dich_vu <> 'Thực hiện đơn hàng'
),
ranked AS (
  SELECT *,
    row_number() OVER (PARTITION BY commission_id ORDER BY score DESC, line_id) AS rn
  FROM candidates
  WHERE score >= 100
)
UPDATE myspa_commission_detail d
SET
  don_hang_chi_tiet_id = r.line_id,
  match_status = 'matched_line'
FROM ranked r
WHERE d.id = r.commission_id
  AND r.rn = 1
  AND d.don_hang_chi_tiet_id IS NULL;

UPDATE myspa_commission_detail
SET match_status = CASE
  WHEN ten_dich_vu = 'Thực hiện đơn hàng' THEN 'order_level'
  WHEN don_hang_id IS NOT NULL THEN 'matched_order'
  ELSE 'missing_order'
END
WHERE row_kind = 'detail'
  AND don_hang_chi_tiet_id IS NULL;

