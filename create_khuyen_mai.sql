-- ============================================================
-- Migration: Tạo bảng khuyen_mai (Phase 3)
-- Chạy trong Supabase > SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS khuyen_mai (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ten           TEXT NOT NULL,
  mo_ta         TEXT DEFAULT '',
  dich_vu_id    UUID REFERENCES dich_vu(id) ON DELETE CASCADE,
  gia_goc       INTEGER NOT NULL,
  gia_km        INTEGER NOT NULL,
  phan_tram_giam NUMERIC GENERATED ALWAYS AS (
    ROUND((gia_goc - gia_km)::numeric / NULLIF(gia_goc, 0) * 100, 1)
  ) STORED,
  ngay_bat_dau  DATE NOT NULL,
  ngay_ket_thuc DATE NOT NULL,
  trang_thai    TEXT DEFAULT 'active' CHECK (trang_thai IN ('active', 'expired', 'draft')),
  so_luot_dat   INTEGER DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_khuyen_mai_dich_vu    ON khuyen_mai(dich_vu_id);
CREATE INDEX IF NOT EXISTS idx_khuyen_mai_trang_thai  ON khuyen_mai(trang_thai);
CREATE INDEX IF NOT EXISTS idx_khuyen_mai_ngay        ON khuyen_mai(ngay_bat_dau, ngay_ket_thuc);

-- RLS
ALTER TABLE khuyen_mai ENABLE ROW LEVEL SECURITY;

-- Khách public xem KM đang active trong thời hạn
CREATE POLICY "public_read_khuyen_mai" ON khuyen_mai
  FOR SELECT USING (
    trang_thai = 'active'
    AND ngay_bat_dau <= CURRENT_DATE
    AND ngay_ket_thuc >= CURRENT_DATE
  );

-- Admin full access (SELECT + INSERT + UPDATE + DELETE)
CREATE POLICY "admin_all_khuyen_mai" ON khuyen_mai
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.vai_tro = 'admin'
    )
  );

SELECT 'Tạo bảng khuyen_mai thành công!' AS result;
