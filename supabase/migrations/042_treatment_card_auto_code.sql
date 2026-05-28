-- Auto-generate Hannah Spa treatment card codes for cards created from POS.

CREATE OR REPLACE FUNCTION public.generate_ma_the_lieu_trinh()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_seq integer;
BEGIN
  IF NEW.ma_the IS NULL OR btrim(NEW.ma_the) = '' THEN
    SELECT COALESCE(MAX(substring(ma_the FROM '^THE-LT-(\d+)$')::integer), 0) + 1
    INTO v_seq
    FROM the_lieu_trinh
    WHERE ma_the ~ '^THE-LT-\d+$';

    LOOP
      NEW.ma_the := 'THE-LT-' || v_seq::text;
      EXIT WHEN NOT EXISTS (
        SELECT 1
        FROM the_lieu_trinh
        WHERE ma_the = NEW.ma_the
      );
      v_seq := v_seq + 1;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_the_lieu_trinh_ma_the ON the_lieu_trinh;
CREATE TRIGGER trg_the_lieu_trinh_ma_the
BEFORE INSERT ON the_lieu_trinh
FOR EACH ROW
EXECUTE FUNCTION public.generate_ma_the_lieu_trinh();

DO $$
DECLARE
  v_card record;
  v_seq integer;
  v_code text;
BEGIN
  SELECT COALESCE(MAX(substring(ma_the FROM '^THE-LT-(\d+)$')::integer), 0) + 1
  INTO v_seq
  FROM the_lieu_trinh
  WHERE ma_the ~ '^THE-LT-\d+$';

  FOR v_card IN
    SELECT id
    FROM the_lieu_trinh
    WHERE ma_the IS NULL OR btrim(ma_the) = ''
    ORDER BY created_at, id
  LOOP
    LOOP
      v_code := 'THE-LT-' || v_seq::text;
      v_seq := v_seq + 1;
      EXIT WHEN NOT EXISTS (
        SELECT 1
        FROM the_lieu_trinh
        WHERE ma_the = v_code
      );
    END LOOP;

    UPDATE the_lieu_trinh
    SET ma_the = v_code
    WHERE id = v_card.id;
  END LOOP;
END;
$$;
