-- Tăng ca tháng 5/2026
SELECT nv.ho_ten,
       SUM(cc.tang_ca_gio) as tong_tang_ca_gio,
       ROUND(SUM(cc.tang_ca_gio) * 25000) as tien_tang_ca
FROM nhan_vien nv
LEFT JOIN cham_cong cc ON cc.nhan_vien_id = nv.id
    AND cc.ngay >= '2026-05-01' AND cc.ngay <= '2026-05-31'
    AND cc.tang_ca_gio > 0
WHERE nv.trang_thai != 'nghi_viec'
GROUP BY nv.ho_ten
ORDER BY tong_tang_ca_gio DESC;
