-- Thu nhập tháng 5/2026 từ POS
SELECT nv.ho_ten,
       SUM(CASE WHEN ni.loai = 'tour' THEN ni.so_tien ELSE 0 END) as tien_tour,
       SUM(CASE WHEN ni.loai = 'hoa_hong' THEN ni.so_tien ELSE 0 END) as hoa_hong,
       COUNT(DISTINCT ni.don_hang_id) as so_don
FROM nhan_vien nv
LEFT JOIN nhan_vien_thu_nhap ni ON ni.nhan_vien_id = nv.id
    AND ni.ngay >= '2026-05-01' AND ni.ngay <= '2026-05-31'
WHERE nv.trang_thai != 'nghi_viec'
GROUP BY nv.ho_ten ORDER BY tien_tour DESC;
