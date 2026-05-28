-- 032_match_myspa_commission_to_pos_lines.sql
-- Match staged MySpa commission detail rows to POS line items when the signal is clear.

CREATE OR REPLACE FUNCTION norm_digits(value text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT regexp_replace(COALESCE(value, ''), '\D', '', 'g')
$$;

CREATE OR REPLACE FUNCTION norm_vn(value text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT lower(
    translate(
      COALESCE(value, ''),
      'ÀÁÂÃÄÅĂẮẰẲẴẶÂẤẦẨẪẬĐÈÉÊẼËẾỀỂỄỆÌÍÎÏÒÓÔÕÖƠỚỜỞỠỢÙÚÛÜƯỨỪỬỮỰỲÝỶỸỴàáâãäåăắằẳẵặâấầẩẫậđèéêẽëếềểễệìíîïòóôõöơớờởỡợùúûüưứừửữựỳýỷỹỵ',
      'AAAAAAĂĂĂĂĂĂÂÂÂÂÂÂDEEEEEEEEEIIIIOOOOOOƠƠƠƠƠUUUUƯƯƯƯƯYYYYYaaaaaaăăăăăăââââââdeeeeeeeeeiiiiooooooơơơơơuuuuưưưưưyyyyy'
    )
  )
$$;

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
  AND r.rn = 1;

UPDATE myspa_commission_detail
SET match_status = CASE
  WHEN ten_dich_vu = 'Thực hiện đơn hàng' THEN 'order_level'
  WHEN don_hang_id IS NOT NULL THEN 'matched_order'
  ELSE 'missing_order'
END
WHERE row_kind = 'detail'
  AND don_hang_chi_tiet_id IS NULL;

CREATE OR REPLACE VIEW v_myspa_commission_match_audit AS
SELECT
  match_status,
  COUNT(*) AS so_dong,
  COALESCE(SUM(tong_tien), 0) AS tong_tien,
  COALESCE(SUM(tien_tour_nv), 0) AS tien_tour,
  COALESCE(SUM(commission_ngay_tim_kiem + commission_tong_don), 0) AS commission
FROM myspa_commission_detail
WHERE row_kind = 'detail'
GROUP BY match_status
ORDER BY so_dong DESC;

CREATE OR REPLACE VIEW v_myspa_commission_vs_hsms_staff AS
WITH myspa AS (
  SELECT
    COALESCE(matched_nhan_vien_id::text, staff_display) AS staff_key,
    COALESCE(nv.ho_ten, staff_display) AS nhan_vien,
    staff_status,
    COUNT(*) AS myspa_rows,
    COALESCE(SUM(tien_tour_nv), 0) AS myspa_tour,
    COALESCE(SUM(commission_ngay_tim_kiem + commission_tong_don), 0) AS myspa_commission,
    COALESCE(SUM(tong_tien), 0) AS myspa_total
  FROM myspa_commission_detail d
  LEFT JOIN nhan_vien nv ON nv.id = d.matched_nhan_vien_id
  WHERE d.row_kind = 'detail'
  GROUP BY COALESCE(matched_nhan_vien_id::text, staff_display), COALESCE(nv.ho_ten, staff_display), staff_status
),
hsms AS (
  SELECT
    COALESCE(nvt.nhan_vien_id::text, 'unknown') AS staff_key,
    COALESCE(nv.ho_ten, 'Chưa gắn nhân viên') AS nhan_vien,
    COUNT(*) AS hsms_rows,
    COALESCE(SUM(so_tien) FILTER (WHERE loai = 'tour'), 0) AS hsms_tour,
    COALESCE(SUM(so_tien) FILTER (WHERE loai = 'commission'), 0) AS hsms_commission,
    COALESCE(SUM(so_tien), 0) AS hsms_total
  FROM nhan_vien_thu_nhap nvt
  LEFT JOIN nhan_vien nv ON nv.id = nvt.nhan_vien_id
  WHERE COALESCE(nvt.is_test, false) = false
  GROUP BY COALESCE(nvt.nhan_vien_id::text, 'unknown'), COALESCE(nv.ho_ten, 'Chưa gắn nhân viên')
)
SELECT
  COALESCE(myspa.staff_key, hsms.staff_key) AS staff_key,
  COALESCE(myspa.nhan_vien, hsms.nhan_vien) AS nhan_vien,
  COALESCE(myspa.staff_status, CASE WHEN hsms.staff_key IS NOT NULL THEN 'dang_lam' ELSE 'nghi_viec' END) AS staff_status,
  COALESCE(myspa.myspa_rows, 0) AS myspa_rows,
  COALESCE(hsms.hsms_rows, 0) AS hsms_rows,
  COALESCE(myspa.myspa_tour, 0) AS myspa_tour,
  COALESCE(hsms.hsms_tour, 0) AS hsms_tour,
  COALESCE(myspa.myspa_commission, 0) AS myspa_commission,
  COALESCE(hsms.hsms_commission, 0) AS hsms_commission,
  COALESCE(myspa.myspa_total, 0) AS myspa_total,
  COALESCE(hsms.hsms_total, 0) AS hsms_total,
  COALESCE(myspa.myspa_total, 0) - COALESCE(hsms.hsms_total, 0) AS chenh_lech
FROM myspa
FULL JOIN hsms ON hsms.staff_key = myspa.staff_key
ORDER BY ABS(COALESCE(myspa.myspa_total, 0) - COALESCE(hsms.hsms_total, 0)) DESC;

