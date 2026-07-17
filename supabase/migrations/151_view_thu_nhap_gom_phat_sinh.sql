-- 151 (17/07/2026): FIX hoa hồng Lễ Tân (+ thu nợ thẻ KTV) KHÔNG được cộng vào lương.
-- GỐC BUG: view v_nhan_vien_thu_nhap (nguồn Lương KD + Báo Cáo Thu Nhập) chỉ đọc
-- don_hang_chi_tiet — bỏ sót các khoản POS ghi vào BẢNG nhan_vien_thu_nhap không gắn
-- dòng hàng: hoa hồng tư vấn Lễ Tân (Ngọc Phương 27k+40.5k, Khánh Duy 45k) + hoa hồng
-- thu nợ thẻ (Thúy Hoanh 67.5k). Ca thật: DH-20260714-016, DH-20260710-009 (anh Nam 17/07).
-- ĐIỀU KIỆN AN TOÀN (chống cộng đôi): CHỈ lấy don_hang_chi_tiet_id IS NULL AND
-- trang_thai='phat_sinh' — bảng còn ~68k dòng 'doi_soat' là LỊCH SỬ MySpa import
-- (đã phản ánh qua nhánh dhct nguồn myspa_commission) TUYỆT ĐỐI không union.

CREATE OR REPLACE VIEW public.v_nhan_vien_thu_nhap AS
SELECT ((((((((substr(src.md5_key, 1, 8) || '-') || substr(src.md5_key, 9, 4)) || '-') || substr(src.md5_key, 13, 4)) || '-') || substr(src.md5_key, 17, 4)) || '-') || substr(src.md5_key, 21, 12))::uuid AS id,
    src.don_hang_id,
    src.don_hang_chi_tiet_id,
    src.nhan_vien_id,
    src.loai,
    src.nguon,
    src.ngay,
    src.doanh_so_tinh,
    src.ti_le,
    src.so_tien,
    src.trang_thai,
    src.is_test,
    src.ghi_chu,
    src.created_at,
    src.updated_at
FROM (
    -- Nhánh 1: TIỀN TOUR từ dòng hàng (dịch vụ / dùng thẻ)
    SELECT md5(dhct.id::text || ':tour') AS md5_key,
        dhct.don_hang_id, dhct.id AS don_hang_chi_tiet_id, dhct.nhan_vien_id,
        'tour'::text AS loai,
        CASE WHEN dh.created_at::date >= '2026-05-28'::date THEN 'pos' ELSE 'myspa_commission' END AS nguon,
        dh.ngay, COALESCE(dhct.thanh_tien, 0) AS doanh_so_tinh, dhct.ti_le_hoa_hong AS ti_le,
        dhct.tien_tour AS so_tien, 'da_chot'::text AS trang_thai,
        COALESCE(dh.is_test, false) AS is_test, dhct.ghi_chu, dhct.created_at, dhct.created_at AS updated_at
    FROM don_hang_chi_tiet dhct
    JOIN don_hang dh ON dh.id = dhct.don_hang_id
    WHERE dhct.loai_item IN ('dich_vu', 'the_lieu_trinh')
      AND dhct.tien_tour IS NOT NULL AND dhct.tien_tour > 0 AND dh.trang_thai <> 'huy'

    UNION ALL
    -- Nhánh 2: HOA HỒNG từ dòng hàng (bán thẻ / bán SP / upsale...)
    SELECT md5(dhct.id::text || ':hoa-hong') AS md5_key,
        dhct.don_hang_id, dhct.id, dhct.nhan_vien_id,
        'hoa_hong'::text,
        CASE WHEN dh.created_at::date >= '2026-05-28'::date THEN 'pos' ELSE 'myspa_commission' END,
        dh.ngay, COALESCE(dhct.thanh_tien, 0), dhct.ti_le_hoa_hong,
        dhct.tien_hoa_hong, 'da_chot'::text,
        COALESCE(dh.is_test, false),
        COALESCE(dhct.ghi_chu, CASE dhct.loai_item WHEN 'the_moi' THEN 'Ban the lieu trinh' WHEN 'san_pham' THEN 'Ban san pham' ELSE 'Hoa hong' END),
        dhct.created_at, dhct.created_at
    FROM don_hang_chi_tiet dhct
    JOIN don_hang dh ON dh.id = dhct.don_hang_id
    WHERE dhct.tien_hoa_hong IS NOT NULL AND dhct.tien_hoa_hong > 0 AND dh.trang_thai <> 'huy'

    UNION ALL
    -- Nhánh 3 (MỚI - mig 151): khoản PHÁT SINH không gắn dòng hàng trong bảng nhan_vien_thu_nhap
    -- = hoa hồng tư vấn Lễ Tân + hoa hồng thu nợ thẻ. KHÔNG lấy 'doi_soat' (lịch sử MySpa).
    SELECT md5(tn.id::text || ':bang') AS md5_key,
        tn.don_hang_id, tn.don_hang_chi_tiet_id, tn.nhan_vien_id,
        tn.loai,
        'pos'::text,
        tn.ngay, COALESCE(tn.doanh_so_tinh, 0), tn.ti_le,
        tn.so_tien, 'da_chot'::text,
        COALESCE(dh.is_test, false),
        COALESCE(tn.ghi_chu, 'Hoa hong phat sinh'),
        tn.created_at, COALESCE(tn.updated_at, tn.created_at)
    FROM nhan_vien_thu_nhap tn
    LEFT JOIN don_hang dh ON dh.id = tn.don_hang_id
    WHERE tn.don_hang_chi_tiet_id IS NULL
      AND tn.trang_thai = 'phat_sinh'
      AND tn.so_tien > 0
      AND COALESCE(dh.trang_thai, '') <> 'huy'
) src;
