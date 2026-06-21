-- 119_khuyen_mai_combo.sql
-- Cho phép khuyến mãi gắn vào COMBO liệu trình (combo_lieu_trinh) — gói triệt lông
-- bảo hành theo thời gian, bán nội bộ ở /admin/the-lieu-trinh/combo.
-- VD CTKM T6: "Triệt lông giảm 70% gói bảo hành 1 năm".
-- Chỉ THÊM cột, không đụng dữ liệu cũ.

ALTER TABLE public.khuyen_mai
  ADD COLUMN IF NOT EXISTS combo_id uuid REFERENCES public.combo_lieu_trinh(id) ON DELETE CASCADE;

COMMENT ON COLUMN public.khuyen_mai.combo_id IS 'Gắn KM vào 1 combo liệu trình (combo_lieu_trinh). NULL = không gắn combo';
