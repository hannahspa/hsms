-- Thông tin nhân viên
SELECT nv.id, nv.ho_ten, nv.vi_tri, nv.luong_cung,
       nv.trang_thai,
       nv.gioi_han_off_thang
FROM nhan_vien nv
WHERE nv.trang_thai != 'nghi_viec'
ORDER BY nv.ho_ten;
