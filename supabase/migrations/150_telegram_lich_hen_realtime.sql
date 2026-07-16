-- 150 (16/07/2026): Thông báo lịch hẹn Telegram THỜI GIAN THỰC + tag nhân viên
-- 1. lich_hen.tg_bao_luc — mốc đã bắn tin vào nhóm (edge function telegram-notify set;
--    cron 5' chỉ gửi dòng NULL làm lưới an toàn khi client gửi fail → không trùng tin)
-- 2. nhan_vien.telegram_chat_id — để tag (mention) đúng KTV được book trong nhóm

ALTER TABLE public.lich_hen ADD COLUMN IF NOT EXISTS tg_bao_luc timestamptz;
ALTER TABLE public.nhan_vien ADD COLUMN IF NOT EXISTS telegram_chat_id text;

-- Nhóm Telegram nhân sự hiện tại (bot /setgroup sẽ tự cập nhật key này về sau)
-- Bảng config key/value của hệ = marketing_ai_config (bảng cau_hinh trong CLAUDE.md không tồn tại)
INSERT INTO public.marketing_ai_config (key, value, mo_ta)
VALUES ('telegram_group', '-5307094104', 'ID nhóm Telegram nhân sự — bot bắn thông báo lịch hẹn')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
