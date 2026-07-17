-- 152 (17/07/2026): Tin hủy hẹn REPLY vào đúng tin đặt trong nhóm Telegram + lưu lý do hủy
-- tg_message_id: message_id tin "CÓ KHÁCH ĐẶT HẸN" bot đã gửi (telegram-notify/cron lưu)
-- ly_do_huy: lễ tân nhập khi bấm Huỷ — bot nhắn kèm "📝 Lý do: ..."
ALTER TABLE public.lich_hen ADD COLUMN IF NOT EXISTS tg_message_id bigint;
ALTER TABLE public.lich_hen ADD COLUMN IF NOT EXISTS ly_do_huy text;
