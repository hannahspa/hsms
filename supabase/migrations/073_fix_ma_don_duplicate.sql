-- ============================================================
-- MIGRATION 073: Fix trùng mã đơn (don_hang_ma_don_key)
-- Ngày: 02/06/2026
-- Lỗi: generate_ma_don() dùng COUNT(*)+1 → khi có đơn bị XÓA, số đếm
--   hụt so với số thứ tự lớn nhất → sinh mã đã tồn tại → duplicate key.
-- Sửa: lấy MAX(số thứ tự) + 1 theo prefix DH-YYYYMMDD, bỏ qua đơn đã xóa.
-- ============================================================

CREATE OR REPLACE FUNCTION generate_ma_don()
RETURNS trigger AS $$
DECLARE
  today_str text;
  seq int;
BEGIN
  IF NEW.ma_don IS NULL THEN
    today_str := to_char(NEW.ngay, 'YYYYMMDD');
    -- Lấy số thứ tự LỚN NHẤT đang có trong ngày + 1 (an toàn với đơn đã xóa)
    SELECT COALESCE(MAX(SPLIT_PART(ma_don, '-', 3)::int), 0) + 1
    INTO seq
    FROM don_hang
    WHERE ma_don ~ ('^DH-' || today_str || '-[0-9]+$');
    NEW.ma_don := 'DH-' || today_str || '-' || lpad(seq::text, 3, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
