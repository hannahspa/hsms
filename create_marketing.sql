-- ============================================================
-- Migration: Module Marketing (Module 5)
-- ============================================================

CREATE TABLE IF NOT EXISTS chien_dich_marketing (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ten                 TEXT NOT NULL,
  kenh                TEXT NOT NULL DEFAULT 'facebook'
                      CHECK (kenh IN ('facebook','zalo','tiktok','google','in_an','khac')),
  ngan_sach           INTEGER DEFAULT 0,       -- ngân sách kế hoạch
  ngay_bat_dau        DATE NOT NULL DEFAULT CURRENT_DATE,
  ngay_ket_thuc       DATE,
  trang_thai          TEXT DEFAULT 'active'
                      CHECK (trang_thai IN ('draft','active','ended')),
  mo_ta               TEXT DEFAULT '',
  khuyen_mai_id       UUID REFERENCES khuyen_mai(id) ON DELETE SET NULL,

  -- KPIs (nhập thủ công sau khi chiến dịch kết thúc)
  so_luot_tiep_can    INTEGER DEFAULT 0,       -- reach / impressions
  so_kh_moi           INTEGER DEFAULT 0,       -- KH mới ghi nhận
  doanh_thu_uoc_tinh  INTEGER DEFAULT 0,       -- ước tính doanh thu tạo ra
  ghi_chu             TEXT DEFAULT '',

  created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cdm_kenh       ON chien_dich_marketing(kenh);
CREATE INDEX IF NOT EXISTS idx_cdm_tt         ON chien_dich_marketing(trang_thai);
CREATE INDEX IF NOT EXISTS idx_cdm_ngay       ON chien_dich_marketing(ngay_bat_dau);

ALTER TABLE chien_dich_marketing ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all_chien_dich_marketing" ON chien_dich_marketing
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND vai_tro = 'admin')
  );

SELECT 'Tạo Module Marketing thành công!' AS result;
