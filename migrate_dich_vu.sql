-- ============================================================
-- Migration: Thêm cột mới cho bảng dich_vu (Phase 1)
-- Chạy trong Supabase > SQL Editor
-- ============================================================

ALTER TABLE dich_vu
  ADD COLUMN IF NOT EXISTS danh_muc      TEXT,
  ADD COLUMN IF NOT EXISTS hinh_anh      TEXT,
  ADD COLUMN IF NOT EXISTS thoi_gian_phut INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS mo_ta_ngan    TEXT,
  ADD COLUMN IF NOT EXISTS mo_ta_day_du  TEXT,
  ADD COLUMN IF NOT EXISTS thu_tu        INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS hien_tren_menu BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS la_hot        BOOLEAN DEFAULT FALSE;

-- Index tìm kiếm theo danh mục
CREATE INDEX IF NOT EXISTS idx_dich_vu_danh_muc ON dich_vu(danh_muc);
CREATE INDEX IF NOT EXISTS idx_dich_vu_thu_tu   ON dich_vu(thu_tu);

-- Verify
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'dich_vu'
ORDER BY ordinal_position;
