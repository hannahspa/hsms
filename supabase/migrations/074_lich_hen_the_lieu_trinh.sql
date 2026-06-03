-- ============================================================
-- MIGRATION 074: Lịch hẹn gắn thẻ liệu trình cụ thể
-- Ngày: 03/06/2026
-- Khi đặt hẹn, Lễ Tân chọn 1 thẻ liệu trình của khách → lưu the_lieu_trinh_id
-- để lúc "Khách đến → Tạo đơn" trừ ĐÚNG thẻ đó (tránh đoán nhầm khi trùng tên DV).
-- ============================================================

ALTER TABLE lich_hen
  ADD COLUMN IF NOT EXISTS the_lieu_trinh_id uuid REFERENCES the_lieu_trinh(id) ON DELETE SET NULL;
