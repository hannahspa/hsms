-- ============================================================
-- Migration: Cập nhật bảng dich_vu cho Phase 1
-- Chạy trong Supabase > SQL Editor
-- ============================================================

-- 1. Thêm cột mới vào dich_vu
ALTER TABLE dich_vu
  ADD COLUMN IF NOT EXISTS danh_muc        TEXT,
  ADD COLUMN IF NOT EXISTS nhom_hien_thi   TEXT,
  ADD COLUMN IF NOT EXISTS la_phu_thu      BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS thoi_gian_phut  INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS mo_ta_ngan      TEXT,
  ADD COLUMN IF NOT EXISTS thu_tu          INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS hien_tren_menu  BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS la_hot          BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS hinh_anh        TEXT;

-- 2. Index tìm kiếm
CREATE INDEX IF NOT EXISTS idx_dich_vu_nhom       ON dich_vu(nhom_hien_thi);
CREATE INDEX IF NOT EXISTS idx_dich_vu_thu_tu      ON dich_vu(thu_tu);
CREATE INDEX IF NOT EXISTS idx_dich_vu_hien_menu   ON dich_vu(hien_tren_menu);
CREATE INDEX IF NOT EXISTS idx_dich_vu_active       ON dich_vu(is_active);

-- 3. Verify kết quả
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'dich_vu'
ORDER BY ordinal_position;
