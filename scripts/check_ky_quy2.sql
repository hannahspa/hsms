SELECT ho_ten, ky_quy_bat_dau, ky_quy_so_thang, ky_quy_trang_thai
FROM nhan_vien
WHERE trang_thai != 'nghi_viec'
ORDER BY ho_ten;
