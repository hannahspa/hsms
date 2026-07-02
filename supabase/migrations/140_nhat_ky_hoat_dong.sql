-- ============================================================
-- MIGRATION 140: Bảng nhật ký hoạt động (audit log)
-- Ngày: 01/07/2026
-- CLAUDE.md khai báo bảng này nhưng VPS chưa có → mọi INSERT log bị nuốt lỗi
-- (gia hạn thẻ, và cần cho hoàn tiền/chuyển đổi/đóng/xoá thẻ).
-- Tạo nếu chưa có để ghi nhật ký các hành động Admin.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.nhat_ky_hoat_dong (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nguoi_dung_id uuid,
  hanh_dong     text,
  bang          text,
  du_lieu_cu    jsonb,
  du_lieu_moi   jsonb,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_nhat_ky_bang_time
  ON public.nhat_ky_hoat_dong(bang, created_at DESC);
