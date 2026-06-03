-- ============================================================
-- MIGRATION 075: Web Push subscriptions cho KTV
-- Ngày: 03/06/2026
-- Lưu đăng ký nhận thông báo đẩy (web push) của từng nhân viên/thiết bị.
-- ============================================================

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  nhan_vien_id  uuid REFERENCES nhan_vien(id) ON DELETE CASCADE,
  endpoint      text NOT NULL UNIQUE,
  p256dh        text NOT NULL,
  auth          text NOT NULL,
  user_agent    text,
  created_at    timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_push_sub_nv ON push_subscriptions (nhan_vien_id);

-- App check-in dùng anon key (KTV đăng nhập PIN, không có auth.uid) → mở policy
-- cho phép thao tác (endpoint push không nhạy cảm).
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS push_sub_all ON push_subscriptions;
CREATE POLICY push_sub_all ON push_subscriptions FOR ALL USING (true) WITH CHECK (true);

COMMENT ON TABLE push_subscriptions IS 'Web Push subscription của KTV — gửi thông báo lịch hẹn';
