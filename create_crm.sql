-- ============================================================
-- Migration: Module CRM Khách Hàng (Module 4)
-- ============================================================

-- 1. Hồ sơ khách hàng
CREATE TABLE IF NOT EXISTS khach_hang (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ho_ten          TEXT NOT NULL,
  so_dien_thoai   TEXT UNIQUE NOT NULL,
  ngay_sinh       DATE,
  gioi_tinh       TEXT DEFAULT 'nu' CHECK (gioi_tinh IN ('nu', 'nam', 'khac')),
  dia_chi         TEXT DEFAULT '',
  ghi_chu_da_lieu TEXT DEFAULT '',   -- Tình trạng da, dị ứng, ghi chú KTV
  nguon           TEXT DEFAULT '',   -- Facebook, Zalo, Bạn bè, Walk-in...
  lan_cuoi_den    DATE,              -- Cập nhật khi dùng buổi hoặc nhập thủ công
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Thẻ liệu trình
CREATE TABLE IF NOT EXISTS the_lieu_trinh (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  khach_hang_id   UUID NOT NULL REFERENCES khach_hang(id) ON DELETE CASCADE,
  ten_dich_vu     TEXT NOT NULL,
  so_buoi_tong    INTEGER NOT NULL CHECK (so_buoi_tong > 0),
  so_buoi_da_dung INTEGER NOT NULL DEFAULT 0 CHECK (so_buoi_da_dung >= 0),
  so_buoi_con_lai INTEGER GENERATED ALWAYS AS (so_buoi_tong - so_buoi_da_dung) STORED,
  gia_tri_the     INTEGER NOT NULL DEFAULT 0,
  ngay_mua        DATE NOT NULL DEFAULT CURRENT_DATE,
  ngay_het_han    DATE,
  trang_thai      TEXT DEFAULT 'active'
                  CHECK (trang_thai IN ('active', 'het_buoi', 'het_han', 'da_huy')),
  ghi_chu         TEXT DEFAULT '',
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_kh_sdt       ON khach_hang(so_dien_thoai);
CREATE INDEX IF NOT EXISTS idx_kh_active     ON khach_hang(is_active);
CREATE INDEX IF NOT EXISTS idx_kh_lan_cuoi   ON khach_hang(lan_cuoi_den);
CREATE INDEX IF NOT EXISTS idx_tlt_kh        ON the_lieu_trinh(khach_hang_id);
CREATE INDEX IF NOT EXISTS idx_tlt_tt        ON the_lieu_trinh(trang_thai);
CREATE INDEX IF NOT EXISTS idx_tlt_han       ON the_lieu_trinh(ngay_het_han);

-- RLS
ALTER TABLE khach_hang    ENABLE ROW LEVEL SECURITY;
ALTER TABLE the_lieu_trinh ENABLE ROW LEVEL SECURITY;

-- Admin full access
CREATE POLICY "admin_all_khach_hang" ON khach_hang
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND vai_tro = 'admin')
  );

CREATE POLICY "admin_all_the_lieu_trinh" ON the_lieu_trinh
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND vai_tro = 'admin')
  );

-- Lễ Tân: đọc + thêm + sửa khách hàng
CREATE POLICY "le_tan_select_khach_hang" ON khach_hang
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND vai_tro IN ('admin','le_tan'))
  );

CREATE POLICY "le_tan_insert_khach_hang" ON khach_hang
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND vai_tro IN ('admin','le_tan'))
  );

CREATE POLICY "le_tan_update_khach_hang" ON khach_hang
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND vai_tro IN ('admin','le_tan'))
  );

-- Lễ Tân: đọc + thêm + sửa thẻ liệu trình
CREATE POLICY "le_tan_select_the_lieu_trinh" ON the_lieu_trinh
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND vai_tro IN ('admin','le_tan'))
  );

CREATE POLICY "le_tan_insert_the_lieu_trinh" ON the_lieu_trinh
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND vai_tro IN ('admin','le_tan'))
  );

CREATE POLICY "le_tan_update_the_lieu_trinh" ON the_lieu_trinh
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND vai_tro IN ('admin','le_tan'))
  );

SELECT 'Tạo Module CRM Khách Hàng thành công!' AS result;
