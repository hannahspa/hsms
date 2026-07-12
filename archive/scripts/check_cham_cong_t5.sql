SELECT nv.ho_ten,
       COUNT(cc.id) as so_ban_ghi,
       SUM(CASE WHEN cc.loai = 'di_lam' THEN 1 ELSE 0 END) as ngay_di_lam,
       SUM(CASE WHEN cc.loai LIKE 'off%' THEN 1 ELSE 0 END) as ngay_off,
       ROUND(SUM(COALESCE(cc.he_so, 0))::numeric, 2) as tong_he_so
FROM nhan_vien nv
LEFT JOIN cham_cong cc ON cc.nhan_vien_id = nv.id
    AND cc.ngay >= '2026-05-01' AND cc.ngay <= '2026-05-31'
WHERE nv.trang_thai != 'nghi_viec'
GROUP BY nv.ho_ten ORDER BY nv.ho_ten;
