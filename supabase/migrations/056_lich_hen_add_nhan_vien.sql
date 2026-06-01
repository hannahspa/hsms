-- 056_lich_hen_add_nhan_vien.sql
-- Module Lịch Hẹn redesign (calendar timeline kiểu MySpa, cột theo KTV).
-- Thêm cột gán KTV phụ trách cho từng lịch hẹn.

ALTER TABLE lich_hen
  ADD COLUMN IF NOT EXISTS nhan_vien_id uuid REFERENCES nhan_vien(id) ON DELETE SET NULL;

-- Index để lọc/nhóm lịch hẹn theo KTV + ngày nhanh
CREATE INDEX IF NOT EXISTS idx_lich_hen_nhan_vien_ngay
  ON lich_hen (ngay_hen, nhan_vien_id);
