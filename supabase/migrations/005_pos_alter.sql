-- Migration 005: POS Integration — Bổ sung cột cho bảng hiện có
-- Ngày: 08/05/2026
-- Thêm cột liên kết POS vào doanh_thu, kho_giao_dich, khach_hang

-- ════════════════════════════════════════════════════
-- doanh_thu: truy xuất nguồn gốc từ POS
-- ════════════════════════════════════════════════════
ALTER TABLE doanh_thu ADD COLUMN IF NOT EXISTS don_hang_id uuid REFERENCES don_hang(id) ON DELETE SET NULL;
ALTER TABLE doanh_thu ADD COLUMN IF NOT EXISTS nguon text DEFAULT 'manual';

-- ════════════════════════════════════════════════════
-- kho_giao_dich: liên kết đơn hàng + khách hàng
-- ════════════════════════════════════════════════════
ALTER TABLE kho_giao_dich ADD COLUMN IF NOT EXISTS don_hang_id uuid REFERENCES don_hang(id) ON DELETE SET NULL;
ALTER TABLE kho_giao_dich ADD COLUMN IF NOT EXISTS khach_hang_id uuid REFERENCES khach_hang(id) ON DELETE SET NULL;

-- ════════════════════════════════════════════════════
-- khach_hang: computed fields cho CRM
-- ════════════════════════════════════════════════════
ALTER TABLE khach_hang ADD COLUMN IF NOT EXISTS tong_chi_tieu integer DEFAULT 0;
ALTER TABLE khach_hang ADD COLUMN IF NOT EXISTS so_lan_den integer DEFAULT 0;
ALTER TABLE khach_hang ADD COLUMN IF NOT EXISTS hang text DEFAULT 'bronze';

-- ════════════════════════════════════════════════════
-- danh_muc_chi_phi: thêm danh mục mặc định cho nhập kho POS
-- ════════════════════════════════════════════════════
-- Đảm bảo có danh mục "Nhập Kho" cho auto chi_phi từ nhập kho
INSERT INTO danh_muc_chi_phi (id, ten, parent_id, thu_tu, is_active)
SELECT gen_random_uuid(), 'Nhập Kho Hàng', NULL, 99, true
WHERE NOT EXISTS (
  SELECT 1 FROM danh_muc_chi_phi WHERE ten = 'Nhập Kho Hàng' AND parent_id IS NULL
);
