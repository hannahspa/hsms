-- POS is now the real operating source for revenue.
-- Keep the old column for compatibility, but force every order to be real data.

UPDATE public.don_hang
SET is_test = false
WHERE COALESCE(is_test, false) = true;

ALTER TABLE public.don_hang
ALTER COLUMN is_test SET DEFAULT false;

CREATE OR REPLACE FUNCTION public.force_real_pos_order()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.is_test := false;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_force_real_pos_order ON public.don_hang;

CREATE TRIGGER trg_force_real_pos_order
BEFORE INSERT OR UPDATE OF is_test ON public.don_hang
FOR EACH ROW
EXECUTE FUNCTION public.force_real_pos_order();

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'nhan_vien_thu_nhap'
      AND column_name = 'is_test'
  ) THEN
    UPDATE public.nhan_vien_thu_nhap
    SET is_test = false
    WHERE COALESCE(is_test, false) = true;

    ALTER TABLE public.nhan_vien_thu_nhap
    ALTER COLUMN is_test SET DEFAULT false;
  END IF;
END $$;
