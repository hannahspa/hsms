-- ============================================================
-- MIGRATION 082: Người nhận khi xuất sử dụng (kho)
-- Ngày: 05/06/2026
-- Thêm cột nhan_vien_nhan_id để báo cáo "KTV nào nhận" chuẩn (thay vì
-- parse text trong ghi_chu). Dùng cho Nhật ký Nhập–Xuất + báo cáo theo KTV.
-- ============================================================

ALTER TABLE kho_giao_dich
  ADD COLUMN IF NOT EXISTS nhan_vien_nhan_id uuid REFERENCES nhan_vien(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_kgd_nhan_vien_nhan ON kho_giao_dich(nhan_vien_nhan_id);
CREATE INDEX IF NOT EXISTS idx_kgd_ngay ON kho_giao_dich(ngay);
