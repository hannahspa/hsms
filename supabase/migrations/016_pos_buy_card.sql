-- HSMS: Bổ sung DB cho tính năng Mua Thẻ Liệu Trình trong POS
-- 1. Thêm loại item 'the_moi' cho đơn hàng chi tiết
-- 2. Thêm cột cho the_lieu_trinh (để gắn với đơn hàng + KTV bán)
-- 3. Thêm promotion_config JSONB cho dịch vụ
-- 4. Thêm meta JSONB cho don_hang_chi_tiet (lưu thông tin tạo thẻ)

-- 1. Thêm 'the_moi' vào CHECK constraint
ALTER TABLE don_hang_chi_tiet 
  DROP CONSTRAINT IF EXISTS don_hang_chi_tiet_loai_item_check;
ALTER TABLE don_hang_chi_tiet 
  ADD CONSTRAINT don_hang_chi_tiet_loai_item_check 
    CHECK (loai_item IN ('dich_vu','san_pham','the_lieu_trinh','the_moi'));

-- 2. Thêm cột cho the_lieu_trinh
ALTER TABLE the_lieu_trinh 
  ADD COLUMN IF NOT EXISTS don_hang_id uuid REFERENCES don_hang(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS nhan_vien_ban_id uuid REFERENCES nhan_vien(id) ON DELETE SET NULL;

-- 3. Promotion config cho dịch vụ (mua X tặng Y)
ALTER TABLE dich_vu 
  ADD COLUMN IF NOT EXISTS promotion_config jsonb DEFAULT null;

-- 4. Meta JSONB cho don_hang_chi_tiet (lưu thông tin tạo thẻ tạm thời)
ALTER TABLE don_hang_chi_tiet 
  ADD COLUMN IF NOT EXISTS meta jsonb DEFAULT null;

-- 5. Seed promotion mẫu (Gội đầu tặng 3, Massage tặng 2)
UPDATE dich_vu 
SET promotion_config = jsonb_build_object(
  'mua', 10, 'tang', 3
)
WHERE (ten ILIKE '%gội đầu%' OR ten ILIKE '%massage body%')
  AND is_active = true;

UPDATE dich_vu 
SET promotion_config = jsonb_build_object(
  'mua', 5, 'tang', 1
)
WHERE (ten ILIKE '%massage%' OR ten ILIKE '%body%')
  AND is_active = true
  AND promotion_config IS NULL;
