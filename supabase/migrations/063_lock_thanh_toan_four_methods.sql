-- HSMS: thanh_toan.hinh_thuc chi duoc dung 4 phuong thuc thanh toan.
-- the_lieu_trinh la loai dong hang POS, khong phai phuong thuc thanh toan.

ALTER TABLE public.thanh_toan
  DROP CONSTRAINT IF EXISTS thanh_toan_hinh_thuc_check;

ALTER TABLE public.thanh_toan
  ADD CONSTRAINT thanh_toan_hinh_thuc_check
  CHECK (hinh_thuc IN ('tien_mat', 'chuyen_khoan', 'quet_the', 'the_tra_truoc'));
