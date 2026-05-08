-- Tạo bảng dich_vu từ đầu
CREATE TABLE IF NOT EXISTS dich_vu (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ten              TEXT NOT NULL,
  mo_ta            TEXT DEFAULT '',
  mo_ta_ngan       TEXT DEFAULT '',
  gia_co_ban       INTEGER DEFAULT 0,
  ti_le_hoa_hong   NUMERIC DEFAULT 0,
  is_active        BOOLEAN DEFAULT TRUE,
  danh_muc         TEXT,
  nhom_hien_thi    TEXT,
  la_phu_thu       BOOLEAN DEFAULT FALSE,
  thoi_gian_phut   INTEGER DEFAULT 0,
  thu_tu           INTEGER DEFAULT 0,
  hien_tren_menu   BOOLEAN DEFAULT TRUE,
  la_hot           BOOLEAN DEFAULT FALSE,
  hinh_anh         TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_dich_vu_nhom      ON dich_vu(nhom_hien_thi);
CREATE INDEX IF NOT EXISTS idx_dich_vu_thu_tu     ON dich_vu(thu_tu);
CREATE INDEX IF NOT EXISTS idx_dich_vu_hien_menu  ON dich_vu(hien_tren_menu);
CREATE INDEX IF NOT EXISTS idx_dich_vu_active      ON dich_vu(is_active);

-- RLS
ALTER TABLE dich_vu ENABLE ROW LEVEL SECURITY;

-- Khách public xem được dịch vụ active hiện trên menu
CREATE POLICY "public_read_dich_vu" ON dich_vu
  FOR SELECT USING (is_active = TRUE);

-- Admin full access
CREATE POLICY "admin_all_dich_vu" ON dich_vu
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.vai_tro = 'admin'
    )
  );

SELECT 'Tạo bảng dich_vu thành công!' as result;
