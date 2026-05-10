-- Migration 015: Fix ma_don trigger — only generate if NULL
-- Ngay: 09/05/2026

CREATE OR REPLACE FUNCTION generate_ma_don()
RETURNS trigger AS $$
DECLARE
  today_str text;
  seq int;
BEGIN
  IF NEW.ma_don IS NULL THEN
    today_str := to_char(NEW.ngay, 'YYYYMMDD');
    SELECT COUNT(*) + 1 INTO seq FROM don_hang WHERE ngay = NEW.ngay AND ma_don LIKE 'DH-' || today_str || '-%';
    NEW.ma_don := 'DH-' || today_str || '-' || lpad(seq::text, 3, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
