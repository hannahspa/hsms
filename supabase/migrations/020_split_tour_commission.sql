-- HSMS Phase 2.2: tach tien Tour va hoa hong ban hang tren dong POS.
-- tien_hoa_hong duoc giu lai de tuong thich voi code/du lieu cu.

ALTER TABLE don_hang_chi_tiet
  ADD COLUMN IF NOT EXISTS tien_tour integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tien_commission integer NOT NULL DEFAULT 0;

UPDATE don_hang_chi_tiet
SET
  tien_tour = CASE
    WHEN loai_item IN ('dich_vu', 'the_lieu_trinh') THEN COALESCE(tien_hoa_hong, 0)
    ELSE COALESCE(tien_tour, 0)
  END,
  tien_commission = CASE
    WHEN loai_item IN ('san_pham', 'the_moi') THEN COALESCE(tien_hoa_hong, 0)
    ELSE COALESCE(tien_commission, 0)
  END
WHERE COALESCE(tien_tour, 0) = 0
   OR COALESCE(tien_commission, 0) = 0;

UPDATE don_hang dh
SET tien_tour = COALESCE(t.tong_tour, 0)
FROM (
  SELECT don_hang_id, SUM(COALESCE(tien_tour, 0)) AS tong_tour
  FROM don_hang_chi_tiet
  GROUP BY don_hang_id
) t
WHERE dh.id = t.don_hang_id;
