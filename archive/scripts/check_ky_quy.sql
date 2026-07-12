-- Kiểm tra columns thực tế trong nhan_vien
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'nhan_vien'
ORDER BY ordinal_position;
