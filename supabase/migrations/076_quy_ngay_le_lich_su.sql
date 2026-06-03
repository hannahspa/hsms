-- 076: Lịch sử CỘNG + SỬ DỤNG quỹ ngày lễ (gắn theo tháng + ngày off vượt được bù)
-- Mục tiêu: kiểm soát chặt, có lịch sử rõ ràng — admin trừ tay, không cho NV tự thao tác.

ALTER TABLE quy_ngay_off
  ADD COLUMN IF NOT EXISTS ngay_le_da_cong jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS lich_su_dung    jsonb NOT NULL DEFAULT '[]'::jsonb;

-- ngay_le_da_cong: mảng ngày lễ đã được cộng quỹ, vd ["2026-04-30","2026-05-01"]
--   → Section "Tích Lũy Ngày Lễ" dùng để hiển thị trạng thái "đã cộng / chưa cộng".
COMMENT ON COLUMN quy_ngay_off.ngay_le_da_cong IS 'Mảng ISO date ngày lễ đã cộng quỹ';

-- lich_su_dung: lịch sử dùng quỹ bù off vượt
--   [{ nam, thang, so_ngay, cac_ngay_bu: ["2026-05-26","2026-05-27"], ghi_chu, ts }]
--   → Bảng lương tháng đọc tổng so_ngay theo (nam, thang) để bù vào ngày off vượt.
COMMENT ON COLUMN quy_ngay_off.lich_su_dung IS 'Lịch sử dùng quỹ bù off vượt theo tháng';
