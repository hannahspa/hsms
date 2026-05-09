-- Migration 004: POS Core Tables
-- Ngày: 08/05/2026
-- Tạo 4 bảng cho module POS: don_hang, don_hang_chi_tiet, thanh_toan, cong_no_khach_hang

-- ════════════════════════════════════════════════════
-- BẢNG 1: don_hang (Đơn hàng)
-- ════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS don_hang (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ma_don          text UNIQUE NOT NULL,
  khach_hang_id   uuid REFERENCES khach_hang(id) ON DELETE SET NULL,
  nguoi_tao       uuid REFERENCES profiles(id),
  tong_tien_hang  integer NOT NULL DEFAULT 0,
  giam_gia        integer NOT NULL DEFAULT 0,
  thuc_thu        integer NOT NULL DEFAULT 0,
  con_no          integer NOT NULL DEFAULT 0,
  trang_thai      text NOT NULL CHECK (trang_thai IN ('draft', 'da_thanh_toan', 'no_mot_phan', 'huy')) DEFAULT 'draft',
  ghi_chu         text,
  tien_tour       integer DEFAULT 0,
  ngay            date NOT NULL,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_don_hang_ngay ON don_hang(ngay);
CREATE INDEX IF NOT EXISTS idx_don_hang_kh ON don_hang(khach_hang_id);
CREATE INDEX IF NOT EXISTS idx_don_hang_trang_thai ON don_hang(trang_thai);

-- Auto-generate ma_don: DH-YYYYMMDD-NNN
CREATE OR REPLACE FUNCTION generate_ma_don()
RETURNS trigger AS $$
DECLARE
  today_str text;
  seq int;
BEGIN
  today_str := to_char(NEW.ngay, 'YYYYMMDD');
  SELECT COUNT(*) + 1 INTO seq FROM don_hang WHERE ngay = NEW.ngay;
  NEW.ma_don := 'DH-' || today_str || '-' || lpad(seq::text, 3, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_don_hang_ma ON don_hang;
CREATE TRIGGER trg_don_hang_ma BEFORE INSERT ON don_hang
  FOR EACH ROW EXECUTE FUNCTION generate_ma_don();

-- ════════════════════════════════════════════════════
-- BẢNG 2: don_hang_chi_tiet (Dòng hàng)
-- ════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS don_hang_chi_tiet (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  don_hang_id       uuid NOT NULL REFERENCES don_hang(id) ON DELETE CASCADE,
  loai_item         text NOT NULL CHECK (loai_item IN ('dich_vu', 'san_pham', 'the_lieu_trinh')),
  dich_vu_id        uuid REFERENCES dich_vu(id) ON DELETE SET NULL,
  san_pham_id       uuid REFERENCES kho_san_pham(id) ON DELETE SET NULL,
  the_lieu_trinh_id uuid REFERENCES the_lieu_trinh(id) ON DELETE SET NULL,
  nhan_vien_id      uuid REFERENCES nhan_vien(id) ON DELETE SET NULL,
  so_luong          integer NOT NULL DEFAULT 1 CHECK (so_luong > 0),
  don_gia           integer NOT NULL,
  thanh_tien        integer NOT NULL,
  ti_le_hoa_hong    numeric,
  tien_hoa_hong     integer DEFAULT 0,
  ghi_chu           text,
  created_at        timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dhct_don_hang ON don_hang_chi_tiet(don_hang_id);
CREATE INDEX IF NOT EXISTS idx_dhct_nhan_vien ON don_hang_chi_tiet(nhan_vien_id);
CREATE INDEX IF NOT EXISTS idx_dhct_loai ON don_hang_chi_tiet(loai_item);

-- ════════════════════════════════════════════════════
-- BẢNG 3: thanh_toan (Thanh toán)
-- ════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS thanh_toan (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  don_hang_id     uuid NOT NULL REFERENCES don_hang(id) ON DELETE CASCADE,
  hinh_thuc       text NOT NULL CHECK (hinh_thuc IN ('tien_mat', 'chuyen_khoan', 'quet_the', 'the_tra_truoc')),
  so_tien         integer NOT NULL CHECK (so_tien > 0),
  ghi_chu         text,
  created_at      timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_thanh_toan_dh ON thanh_toan(don_hang_id);

-- ════════════════════════════════════════════════════
-- BẢNG 4: cong_no_khach_hang (Công nợ — append-only)
-- ════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS cong_no_khach_hang (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  khach_hang_id   uuid NOT NULL REFERENCES khach_hang(id) ON DELETE CASCADE,
  don_hang_id     uuid REFERENCES don_hang(id) ON DELETE SET NULL,
  loai            text NOT NULL CHECK (loai IN ('phat_sinh', 'thanh_toan', 'xoa_no')),
  so_tien         integer NOT NULL CHECK (so_tien > 0),
  so_du_con_lai   integer NOT NULL,
  ngay            date NOT NULL,
  ghi_chu         text,
  created_at      timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cong_no_kh ON cong_no_khach_hang(khach_hang_id);
CREATE INDEX IF NOT EXISTS idx_cong_no_dh ON cong_no_khach_hang(don_hang_id);

-- ════════════════════════════════════════════════════
-- BẢNG 5: lich_su_dung_the (Theo dõi dùng buổi thẻ)
-- ════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS lich_su_dung_the (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  the_lieu_trinh_id uuid NOT NULL REFERENCES the_lieu_trinh(id) ON DELETE CASCADE,
  don_hang_id       uuid REFERENCES don_hang(id) ON DELETE SET NULL,
  nguoi_thuc_hien   uuid REFERENCES nhan_vien(id) ON DELETE SET NULL,
  ngay              date NOT NULL,
  created_at        timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lsdt_the ON lich_su_dung_the(the_lieu_trinh_id);
CREATE INDEX IF NOT EXISTS idx_lsdt_ngay ON lich_su_dung_the(ngay);

-- ════════════════════════════════════════════════════
-- BẢNG 6: lich_hen (Đặt hẹn)
-- ════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS lich_hen (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  khach_hang_id   uuid REFERENCES khach_hang(id) ON DELETE SET NULL,
  ho_ten_kh       text,
  so_dien_thoai   text,
  dich_vu_id      uuid REFERENCES dich_vu(id) ON DELETE SET NULL,
  nhan_vien_id    uuid REFERENCES nhan_vien(id) ON DELETE SET NULL,
  thoi_gian_bat_dau timestamptz NOT NULL,
  thoi_gian_ket_thuc timestamptz,
  trang_thai      text NOT NULL CHECK (trang_thai IN ('cho_xac_nhan', 'da_xac_nhan', 'da_den', 'khong_den', 'da_huy', 'online')) DEFAULT 'cho_xac_nhan',
  ghi_chu         text,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lich_hen_ngay ON lich_hen(thoi_gian_bat_dau);
CREATE INDEX IF NOT EXISTS idx_lich_hen_kh ON lich_hen(khach_hang_id);
CREATE INDEX IF NOT EXISTS idx_lich_hen_nv ON lich_hen(nhan_vien_id);
