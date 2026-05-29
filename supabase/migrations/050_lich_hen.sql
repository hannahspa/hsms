-- ═══════════════════════════════════════════════════════════════════
-- Migration 050: Bảng Lịch Hẹn
-- Lễ Tân nhập thay khi khách gọi điện / Zalo đặt hẹn
-- Created: 2026-05-29
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS lich_hen (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  ten_khach       text NOT NULL,
  sdt_khach       text,
  khach_hang_id   uuid REFERENCES khach_hang(id) ON DELETE SET NULL,
  dich_vu_id      uuid REFERENCES dich_vu(id) ON DELETE SET NULL,
  ten_dich_vu     text,                         -- lưu tên DV tại thời điểm đặt (snapshot)
  thoi_luong_phut integer DEFAULT 60,
  ngay_hen        date NOT NULL,
  gio_hen         text NOT NULL,                -- "HH:MM"
  ghi_chu         text,
  trang_thai      text NOT NULL DEFAULT 'cho_xac_nhan',
                  -- cho_xac_nhan | da_xac_nhan | da_xong | huy
  nguoi_nhap      text,                         -- tên Lễ Tân nhập
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

-- Index để query theo ngày nhanh
CREATE INDEX IF NOT EXISTS idx_lich_hen_ngay   ON lich_hen (ngay_hen);
CREATE INDEX IF NOT EXISTS idx_lich_hen_khach  ON lich_hen (khach_hang_id);
CREATE INDEX IF NOT EXISTS idx_lich_hen_tt     ON lich_hen (trang_thai);

-- Trigger cập nhật updated_at
CREATE OR REPLACE FUNCTION set_lich_hen_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_lich_hen_updated_at
BEFORE UPDATE ON lich_hen
FOR EACH ROW EXECUTE FUNCTION set_lich_hen_updated_at();

-- RLS: Admin và Lễ Tân đọc được tất cả
ALTER TABLE lich_hen ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_le_tan_all"
ON lich_hen
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
      AND profiles.vai_tro IN ('admin', 'le_tan')
  )
);

COMMENT ON TABLE lich_hen IS 'Lịch hẹn khách hàng — Lễ Tân nhập thay khi khách gọi/Zalo';
