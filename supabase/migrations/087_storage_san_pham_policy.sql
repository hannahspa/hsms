-- ============================================================
-- MIGRATION 087: RLS policy cho Storage bucket `san-pham`
-- Ngày: 06/06/2026
-- Cho phép user đã đăng nhập (admin + lễ tân) upload/sửa/xoá ảnh SP.
-- Đọc ảnh đã public (bucket public). Lỗi trước: "violates row-level security".
-- ============================================================

DROP POLICY IF EXISTS "san_pham_read"   ON storage.objects;
DROP POLICY IF EXISTS "san_pham_insert" ON storage.objects;
DROP POLICY IF EXISTS "san_pham_update" ON storage.objects;
DROP POLICY IF EXISTS "san_pham_delete" ON storage.objects;

-- Đọc công khai
CREATE POLICY "san_pham_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'san-pham');

-- Upload / sửa / xoá: user đã đăng nhập
CREATE POLICY "san_pham_insert" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'san-pham');

CREATE POLICY "san_pham_update" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'san-pham') WITH CHECK (bucket_id = 'san-pham');

CREATE POLICY "san_pham_delete" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'san-pham');
