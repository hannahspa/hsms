-- Migration 058: Lock payment methods to the 4 real methods Hannah Spa uses.
-- Business rule:
--   the_lieu_trinh is a service/card line item, not a payment method.
--   Valid payment methods are:
--     tien_mat, chuyen_khoan, quet_the, the_tra_truoc
--
-- NOT VALID keeps this migration safe if old imported rows still exist.
-- PostgreSQL still enforces the constraint for new/updated rows.

ALTER TABLE doanh_thu DROP CONSTRAINT IF EXISTS doanh_thu_hinh_thuc_check;
ALTER TABLE doanh_thu ADD CONSTRAINT doanh_thu_hinh_thuc_check
  CHECK (hinh_thuc IN ('tien_mat', 'chuyen_khoan', 'quet_the', 'the_tra_truoc')) NOT VALID;

ALTER TABLE thanh_toan DROP CONSTRAINT IF EXISTS thanh_toan_hinh_thuc_check;
ALTER TABLE thanh_toan ADD CONSTRAINT thanh_toan_hinh_thuc_check
  CHECK (hinh_thuc IN ('tien_mat', 'chuyen_khoan', 'quet_the', 'the_tra_truoc')) NOT VALID;

ALTER TABLE chi_phi DROP CONSTRAINT IF EXISTS chi_phi_hinh_thuc_check;
ALTER TABLE chi_phi ADD CONSTRAINT chi_phi_hinh_thuc_check
  CHECK (hinh_thuc_thanh_toan IN ('tien_mat', 'chuyen_khoan', 'quet_the')) NOT VALID;

COMMENT ON CONSTRAINT doanh_thu_hinh_thuc_check ON doanh_thu IS
  'HSMS only has 4 payment methods. the_lieu_trinh is a line item/use of prepaid treatment sessions, not a payment method.';

COMMENT ON CONSTRAINT thanh_toan_hinh_thuc_check ON thanh_toan IS
  'HSMS only has 4 payment methods. the_lieu_trinh is a line item/use of prepaid treatment sessions, not a payment method.';
