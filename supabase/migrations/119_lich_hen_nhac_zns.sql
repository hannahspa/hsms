-- 119 — Cột đánh dấu đã gửi ZNS nhắc lịch hẹn (tránh nhắc trùng)
ALTER TABLE public.lich_hen ADD COLUMN IF NOT EXISTS nhac_zns_luc timestamptz;
COMMENT ON COLUMN public.lich_hen.nhac_zns_luc IS 'Thời điểm đã gửi ZNS nhắc lịch (NULL = chưa nhắc). Cron nhac-lich-hen set sau khi gửi.';
