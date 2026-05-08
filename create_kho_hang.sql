-- ============================================================
-- Migration: Module Kho Hàng (Module 3)
-- ============================================================

-- 1. Danh mục sản phẩm
CREATE TABLE IF NOT EXISTS kho_san_pham (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ten             TEXT NOT NULL,
  loai            TEXT NOT NULL DEFAULT 'tieu_hao'
                  CHECK (loai IN ('tieu_hao', 'ban_khach', 'vat_tu')),
  don_vi          TEXT NOT NULL DEFAULT 'cái',
  mo_ta           TEXT DEFAULT '',
  gia_nhap        INTEGER DEFAULT 0,
  gia_ban         INTEGER DEFAULT 0,
  ton_kho         NUMERIC DEFAULT 0,
  canh_bao_ton    NUMERIC DEFAULT 5,

  -- Chiết rót: 1 sp lớn chiết ra N sp nhỏ
  co_the_chiet    BOOLEAN DEFAULT FALSE,
  san_pham_chiet_id UUID REFERENCES kho_san_pham(id) ON DELETE SET NULL,
  he_so_chiet     NUMERIC DEFAULT 1,

  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Giao dịch nhập / xuất / chiết
CREATE TABLE IF NOT EXISTS kho_giao_dich (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  san_pham_id       UUID NOT NULL REFERENCES kho_san_pham(id) ON DELETE CASCADE,
  loai              TEXT NOT NULL
                    CHECK (loai IN (
                      'nhap_kho',       -- Nhập từ nhà cung cấp
                      'xuat_su_dung',   -- Xuất KTV dùng nội bộ
                      'xuat_ban',       -- Bán cho khách
                      'chiet_ra',       -- Chiết từ sp lớn (trừ tồn sp lớn)
                      'chiet_vao',      -- Chiết vào sp nhỏ (cộng tồn sp nhỏ)
                      'dieu_chinh',     -- Điều chỉnh sau kiểm kho
                      'tra_nha_cc'      -- Trả nhà cung cấp
                    )),
  so_luong          NUMERIC NOT NULL CHECK (so_luong > 0),
  gia_don_vi        INTEGER DEFAULT 0,
  ghi_chu           TEXT DEFAULT '',
  lien_quan_id      UUID,  -- link cặp chiet_ra ↔ chiet_vao
  ngay              DATE NOT NULL DEFAULT CURRENT_DATE,
  nguoi_thuc_hien   UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_kho_sp_loai       ON kho_san_pham(loai);
CREATE INDEX IF NOT EXISTS idx_kho_sp_active      ON kho_san_pham(is_active);
CREATE INDEX IF NOT EXISTS idx_kho_gd_sp          ON kho_giao_dich(san_pham_id);
CREATE INDEX IF NOT EXISTS idx_kho_gd_loai        ON kho_giao_dich(loai);
CREATE INDEX IF NOT EXISTS idx_kho_gd_ngay        ON kho_giao_dich(ngay);
CREATE INDEX IF NOT EXISTS idx_kho_gd_lienquan    ON kho_giao_dich(lien_quan_id);

-- RLS
ALTER TABLE kho_san_pham  ENABLE ROW LEVEL SECURITY;
ALTER TABLE kho_giao_dich ENABLE ROW LEVEL SECURITY;

-- Admin full access
CREATE POLICY "admin_all_kho_san_pham" ON kho_san_pham
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND vai_tro = 'admin')
  );

CREATE POLICY "admin_all_kho_giao_dich" ON kho_giao_dich
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND vai_tro = 'admin')
  );

-- Lễ Tân có thể xem + tạo giao dịch xuất / chiết
CREATE POLICY "le_tan_read_kho_san_pham" ON kho_san_pham
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND vai_tro IN ('admin','le_tan'))
  );

CREATE POLICY "le_tan_insert_kho_giao_dich" ON kho_giao_dich
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND vai_tro IN ('admin','le_tan'))
  );

CREATE POLICY "le_tan_read_kho_giao_dich" ON kho_giao_dich
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND vai_tro IN ('admin','le_tan'))
  );

SELECT 'Tạo Module Kho Hàng thành công!' AS result;
