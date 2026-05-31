-- 054_perf_indexes.sql
-- Index để tăng tốc query AdminCRMPage + AdminTheLieuTrinhPage
-- (Trước fix: bấm vào load 15s; sau fix: <2s)

-- Sort theo tong_chi_tieu DESC trong AdminCRMPage
CREATE INDEX IF NOT EXISTS idx_kh_tong_chi_tieu_desc
  ON public.khach_hang USING btree (tong_chi_tieu DESC NULLS LAST);

-- Sort theo ngay_mua DESC + created_at DESC trong AdminTheLieuTrinhPage
CREATE INDEX IF NOT EXISTS idx_tlt_ngay_mua_desc
  ON public.the_lieu_trinh USING btree (ngay_mua DESC NULLS LAST, created_at DESC NULLS LAST);

-- Index for getCustomerSnapshot.history (lich_su_dich_vu_kh dùng don_hang.ngay)
CREATE INDEX IF NOT EXISTS idx_don_hang_kh_ngay
  ON public.don_hang USING btree (khach_hang_id, ngay DESC) WHERE khach_hang_id IS NOT NULL;
