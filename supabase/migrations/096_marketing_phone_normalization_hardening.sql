-- Migration 096: Harden phone normalization for attribution
-- Chi chap nhan so dien thoai Viet Nam 10 chu so sau khi chuan hoa.

CREATE OR REPLACE FUNCTION public.normalize_vn_phone(p_phone text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  WITH cleaned AS (
    SELECT regexp_replace(COALESCE(p_phone, ''), '\D', '', 'g') AS digits
  ),
  normalized AS (
    SELECT CASE
      WHEN digits LIKE '84%' AND length(digits) = 11 THEN '0' || substring(digits from 3)
      ELSE digits
    END AS phone
    FROM cleaned
  )
  SELECT CASE
    WHEN phone ~ '^0[0-9]{9}$' THEN phone
    ELSE NULL
  END
  FROM normalized
$$;

UPDATE public.marketing_leads
SET so_dien_thoai = NULL
WHERE kenh = 'facebook'
  AND so_dien_thoai IS NOT NULL
  AND public.normalize_vn_phone(so_dien_thoai) IS NULL;
