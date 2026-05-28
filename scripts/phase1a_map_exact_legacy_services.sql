BEGIN;

CREATE TABLE IF NOT EXISTS public.don_hang_chi_tiet_service_map_backup_20260527 (
  id uuid PRIMARY KEY,
  don_hang_id uuid,
  old_dich_vu_id uuid,
  new_dich_vu_id uuid,
  loai_item text,
  ma_don text,
  ngay date,
  legacy_item_name text,
  matched_service_name text,
  backup_reason text,
  backed_up_at timestamptz NOT NULL DEFAULT now()
);

WITH missing_service AS (
  SELECT
    dhct.id AS line_id,
    dhct.don_hang_id,
    dhct.dich_vu_id AS old_dich_vu_id,
    dhct.loai_item,
    dh.ma_don,
    dh.ngay,
    trim(regexp_replace(regexp_replace(
      COALESCE(dhct.meta->>'tenDichVu', tlt.ten_dich_vu, dhct.ghi_chu, ''),
      '^(Dịch vụ|Liệu trình):\s*',
      '',
      'i'
    ), '\s+', ' ', 'g')) AS legacy_item_name
  FROM public.don_hang_chi_tiet dhct
  JOIN public.don_hang dh ON dh.id = dhct.don_hang_id
  LEFT JOIN public.the_lieu_trinh tlt ON tlt.id = dhct.the_lieu_trinh_id
  WHERE dh.ngay <= date '2026-04-30'
    AND dhct.dich_vu_id IS NULL
    AND dhct.loai_item IN ('dich_vu', 'the_lieu_trinh', 'the_moi')
),
exact_matches AS (
  SELECT
    m.*,
    dv.id AS new_dich_vu_id,
    dv.ten AS matched_service_name
  FROM missing_service m
  JOIN public.dich_vu dv
    ON lower(trim(dv.ten)) = lower(trim(m.legacy_item_name))
),
backup AS (
  INSERT INTO public.don_hang_chi_tiet_service_map_backup_20260527 (
    id,
    don_hang_id,
    old_dich_vu_id,
    new_dich_vu_id,
    loai_item,
    ma_don,
    ngay,
    legacy_item_name,
    matched_service_name,
    backup_reason
  )
  SELECT
    line_id,
    don_hang_id,
    old_dich_vu_id,
    new_dich_vu_id,
    loai_item,
    ma_don,
    ngay,
    legacy_item_name,
    matched_service_name,
    'phase1a_exact_legacy_service_name'
  FROM exact_matches
  ON CONFLICT (id) DO NOTHING
  RETURNING id
)
UPDATE public.don_hang_chi_tiet dhct
SET
  dich_vu_id = m.new_dich_vu_id,
  meta = COALESCE(dhct.meta, '{}'::jsonb) || jsonb_build_object(
    'serviceMapPhase', 'phase1a_exact_name',
    'serviceMapAt', now(),
    'legacyItemName', m.legacy_item_name
  )
FROM exact_matches m
WHERE dhct.id = m.line_id
  AND dhct.dich_vu_id IS NULL;

COMMIT;

WITH remaining AS (
  SELECT dhct.id, dhct.loai_item
  FROM public.don_hang_chi_tiet dhct
  JOIN public.don_hang dh ON dh.id = dhct.don_hang_id
  WHERE dh.ngay <= date '2026-04-30'
    AND dhct.dich_vu_id IS NULL
    AND dhct.loai_item IN ('dich_vu', 'the_lieu_trinh', 'the_moi')
)
SELECT
  (SELECT COUNT(*) FROM public.don_hang_chi_tiet_service_map_backup_20260527 WHERE backup_reason = 'phase1a_exact_legacy_service_name') AS backed_up_rows,
  (SELECT COUNT(*) FROM public.don_hang_chi_tiet_service_map_backup_20260527 b JOIN public.don_hang_chi_tiet c ON c.id = b.id WHERE b.backup_reason = 'phase1a_exact_legacy_service_name' AND c.dich_vu_id = b.new_dich_vu_id) AS mapped_rows,
  (SELECT COUNT(*) FROM remaining) AS remaining_unmapped_service_lines;
