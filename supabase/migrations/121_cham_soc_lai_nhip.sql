-- 121 — Chăm Sóc Lại theo NHỊP (anh Nam chốt 23/06): mỗi sáng 9h tự gửi
--   • Nhóm A "đúng nhịp": khách dùng thẻ ĐÚNG 10 ngày trước (vd 24/06 ⇽ 14/06), chưa nhắc → gửi HẾT
--   • Nhóm B "tồn đọng": khách cũ đến hạn còn lại → 40 khách/ngày (ưu tiên ấm)
-- Bảng cham_soc_hang_doi đổi vai trò: NHẬT KÝ gửi theo THẺ (mỗi thẻ tối đa 1 lần/ngày), có mã thẻ + nhóm.

TRUNCATE public.cham_soc_hang_doi;
ALTER TABLE public.cham_soc_hang_doi DROP CONSTRAINT IF EXISTS cham_soc_hang_doi_khach_hang_id_key;
ALTER TABLE public.cham_soc_hang_doi ADD COLUMN IF NOT EXISTS ma_the text;
ALTER TABLE public.cham_soc_hang_doi ADD COLUMN IF NOT EXISTS nhom  text;   -- 'dung_nhip' | 'ton_dong'
-- 1 thẻ chỉ ghi/gửi 1 lần mỗi ngày
CREATE UNIQUE INDEX IF NOT EXISTS uq_cshd_the_ngay ON public.cham_soc_hang_doi(the_dai_dien_id, ngay_du_kien);
