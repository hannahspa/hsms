-- Migration 108: Realtime cho Hộp Thư Marketing
-- Mục tiêu: HSMS nghe tin nhắn/cập nhật mới mà không tải lại toàn bộ kho dữ liệu thô.

ALTER TABLE public.marketing_messages REPLICA IDENTITY FULL;
ALTER TABLE public.marketing_fanpage_customer_segments REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.marketing_messages;
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END;

    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.marketing_fanpage_customer_segments;
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END;
  END IF;
END $$;

COMMENT ON TABLE public.marketing_messages IS
  'Tin nhắn vào/ra từ các kênh Marketing. Bảng được bật realtime để Hộp Thư HSMS nhận tin mới.';

COMMENT ON TABLE public.marketing_fanpage_customer_segments IS
  'Hồ sơ phân loại khách Fanpage, dùng làm hàng đợi chăm sóc và được bật realtime cho Hộp Thư.';

NOTIFY pgrst, 'reload schema';
