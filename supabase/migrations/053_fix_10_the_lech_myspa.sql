-- 053_fix_10_the_lech_myspa.sql
-- Sync 10 thẻ liệu trình về đúng số liệu MySpa (Nhóm 1 + Nhóm 2)
-- Nhóm 3 (5 thẻ MySpa data lỗi) giữ nguyên HSMS

-- ── NHÓM 1: MySpa ghi đã dùng nhiều hơn HSMS → UPDATE so_buoi_da_dung
-- Lưu ý: 3 thẻ đầu MySpa cho dùng vượt tổng buổi → set tổng = dùng để con_lai = 0

-- THE-LT-7: tổng 5 → 6 (cho dùng thêm 1), đã dùng 5 → 6
UPDATE the_lieu_trinh SET so_buoi_tong = 6, so_buoi_da_dung = 6 WHERE ma_the = 'THE-LT-7';

-- THE-LT-234: tổng 1 → 2 (cho dùng thêm 1), đã dùng 1 → 2
UPDATE the_lieu_trinh SET so_buoi_tong = 2, so_buoi_da_dung = 2 WHERE ma_the = 'THE-LT-234';

-- THE-LT-121: tổng 3 → 4, đã dùng 3 → 4
UPDATE the_lieu_trinh SET so_buoi_tong = 4, so_buoi_da_dung = 4 WHERE ma_the = 'THE-LT-121';

-- THE-LT-1279: tổng 1 → 3, đã dùng 1 → 3
UPDATE the_lieu_trinh SET so_buoi_tong = 3, so_buoi_da_dung = 3 WHERE ma_the = 'THE-LT-1279';

-- THE-LT-3777: giữ tổng 10, đã dùng 0 → 2
UPDATE the_lieu_trinh SET so_buoi_da_dung = 2 WHERE ma_the = 'THE-LT-3777';

-- THE-LT-2714: giữ tổng 10, đã dùng 0 → 5
UPDATE the_lieu_trinh SET so_buoi_da_dung = 5 WHERE ma_the = 'THE-LT-2714';

-- ── NHÓM 2: HSMS có tổng nhiều hơn MySpa → giảm tổng về MySpa

-- THE-LT-3614: tổng 9 → 7
UPDATE the_lieu_trinh SET so_buoi_tong = 7 WHERE ma_the = 'THE-LT-3614';

-- THE-LT-1377: tổng 5 → 4
UPDATE the_lieu_trinh SET so_buoi_tong = 4 WHERE ma_the = 'THE-LT-1377';

-- THE-LT-4560: tổng 5 → 4
UPDATE the_lieu_trinh SET so_buoi_tong = 4 WHERE ma_the = 'THE-LT-4560';

-- THE-LT-4433: tổng 20 → 15
UPDATE the_lieu_trinh SET so_buoi_tong = 15 WHERE ma_the = 'THE-LT-4433';

-- Cập nhật trạng thái thẻ active/het_buoi dựa trên so_buoi_con_lai mới
UPDATE the_lieu_trinh
SET trang_thai = CASE
  WHEN so_buoi_con_lai <= 0 THEN 'het_buoi'
  WHEN ngay_het_han IS NOT NULL AND ngay_het_han < CURRENT_DATE THEN 'het_han'
  ELSE 'active'
END
WHERE ma_the IN (
  'THE-LT-7', 'THE-LT-234', 'THE-LT-121', 'THE-LT-1279', 'THE-LT-3777',
  'THE-LT-2714', 'THE-LT-3614', 'THE-LT-1377', 'THE-LT-4560', 'THE-LT-4433'
);

-- Verify kết quả
SELECT ma_the, ten_dich_vu, so_buoi_tong, so_buoi_da_dung, so_buoi_con_lai, trang_thai
FROM the_lieu_trinh
WHERE ma_the IN (
  'THE-LT-7', 'THE-LT-234', 'THE-LT-121', 'THE-LT-1279', 'THE-LT-3777',
  'THE-LT-2714', 'THE-LT-3614', 'THE-LT-1377', 'THE-LT-4560', 'THE-LT-4433'
)
ORDER BY ma_the;
