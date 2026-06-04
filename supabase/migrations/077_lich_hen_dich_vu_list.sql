-- 077: Lịch hẹn hỗ trợ NHIỀU dịch vụ + KTV khác nhau trong 1 lịch hẹn.
-- Mỗi phần tử: { ten_dich_vu, dich_vu_id, nhan_vien_id }
-- Dịch vụ CHÍNH vẫn ở cột ten_dich_vu/dich_vu_id/nhan_vien_id (tương thích cũ),
-- dich_vu_list chứa các dịch vụ THÊM (KTV khác phụ trách).
ALTER TABLE lich_hen
  ADD COLUMN IF NOT EXISTS dich_vu_list jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN lich_hen.dich_vu_list IS 'Dịch vụ thêm: [{ten_dich_vu,dich_vu_id,nhan_vien_id}] — KTV khác phụ trách';
