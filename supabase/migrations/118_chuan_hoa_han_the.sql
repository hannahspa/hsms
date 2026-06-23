-- 118 — Chuẩn hóa hạn + trạng thái thẻ liệu trình (anh Nam chốt 22/06)
-- Nguyên nhân khách "mất" thẻ trên POS: import đặt ngày hết hạn = mua + 1 năm cho MỌI thẻ,
-- khiến thẻ triệt lông (bán 3 năm) + thẻ còn buổi bị đánh "hết hạn" giả → ẩn khỏi giao diện.
--
-- Quy định đúng (anh Nam):
--   - Mặc định MỌI thẻ: hạn 1 NĂM từ ngày mua.
--   - Triệt lông bán theo bảo hành ghi TRÊN THẺ: tên chứa "3 năm" → 3 năm; còn lại (gồm "bảo hành 1 năm") → 1 năm.
--   - Hết hạn = trạng thái KHÔNG active (đúng dữ liệu), nhưng POS vẫn HIỂN THỊ hết thẻ.
-- (Đã backup the_lieu_trinh_bak_doisoat_20260622.)

UPDATE public.the_lieu_trinh SET
  ngay_het_han = (ngay_mua + (CASE WHEN ten_dich_vu ILIKE '%3 năm%' THEN INTERVAL '3 years' ELSE INTERVAL '1 year' END))::date,
  trang_thai = CASE
    WHEN COALESCE(so_buoi_con_lai,0) <= 0 THEN 'het_buoi'
    WHEN (ngay_mua + (CASE WHEN ten_dich_vu ILIKE '%3 năm%' THEN INTERVAL '3 years' ELSE INTERVAL '1 year' END))::date >= CURRENT_DATE THEN 'active'
    ELSE 'het_han'
  END
WHERE ngay_mua IS NOT NULL;
