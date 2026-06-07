-- ============================================================
-- MIGRATION 088: RLS cho phép user đã đăng nhập (Lễ tân + Admin) thao tác kho
-- Ngày: 06/06/2026
-- Lỗi: Lễ tân sửa/nhập/xuất SP bấm Lưu không được — RLS chỉ cho Admin ghi.
-- Kho giờ do Lễ tân vận hành → mở CRUD cho authenticated.
-- ============================================================

ALTER TABLE kho_san_pham ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS kho_sp_rw_auth ON kho_san_pham;
CREATE POLICY kho_sp_rw_auth ON kho_san_pham
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE kho_giao_dich ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS kho_gd_rw_auth ON kho_giao_dich;
CREATE POLICY kho_gd_rw_auth ON kho_giao_dich
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
