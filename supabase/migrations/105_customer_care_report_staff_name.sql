-- Migration 105: Customer care report staff names
-- Them ten nguoi tao vao view nhat ky cham soc de bao cao hieu qua nhan vien.

CREATE OR REPLACE VIEW public.v_nhat_ky_khach_den_smart AS
SELECT
  nk.id,
  nk.ngay,
  nk.khach_hang_id,
  nk.ho_ten,
  nk.so_dien_thoai,
  nk.phone_norm,
  nk.dich_vu_su_dung,
  nk.ktv_phu_trach,
  nk.phan_hoi,
  nk.co_hoi_upsell,
  nk.ket_qua,
  nk.nguon,
  nk.goi_y_tiep_theo,
  nk.ghi_chu,
  nk.created_by,
  nk.created_at,
  nk.updated_at,
  COALESCE(ci.khach_hang_id, nk.khach_hang_id) AS hsms_khach_hang_id,
  ci.ho_ten AS hsms_ho_ten,
  ci.lan_cuoi_den,
  ci.so_don,
  ci.tong_chi_tieu,
  ci.so_the_active,
  ci.tong_buoi_con,
  ci.the_dang_co,
  ci.dich_vu_da_dung,
  ci.dich_vu_gan_nhat,
  COALESCE(nk.goi_y_tiep_theo, ci.muc_tieu_tu_van) AS muc_tieu_tu_van,
  ci.goi_y_upsell,
  nk.fanpage_segment_id,
  nk.platform_user_id,
  p.ho_ten AS created_by_name,
  p.email AS created_by_email
FROM public.nhat_ky_khach_den nk
LEFT JOIN public.profiles p
  ON p.id = nk.created_by
LEFT JOIN public.v_customer_pos_intelligence ci
  ON ci.khach_hang_id = nk.khach_hang_id
  OR (nk.phone_norm IS NOT NULL AND ci.phone_norm = nk.phone_norm);

COMMENT ON VIEW public.v_nhat_ky_khach_den_smart IS
  'Nhat ky khach den kem goi y cham soc/upsell va ten nhan vien tao bao cao.';

NOTIFY pgrst, 'reload schema';
