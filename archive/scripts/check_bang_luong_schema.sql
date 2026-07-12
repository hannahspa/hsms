-- Kiểm tra schema bang_luong và ky_quy
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'bang_luong'
ORDER BY ordinal_position;
