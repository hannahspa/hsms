-- ============================================================================
-- 136_bao_mat_lop1b4_revoke_checkin.sql
-- GĐ0-A · LỚP 1b-4 — KHÓA CỬA: thu hồi nốt quyền anon trên 9 bảng app KTV.
-- Sau khi app /checkin đã chuyển 100% sang RPC SECURITY DEFINER (deploy 885efe5,
-- hotfix b1c6b86) + nhân viên xác nhận check-in/selfie chạy tốt.
-- RPC là SECURITY DEFINER (chạy quyền owner) → KHÔNG cần anon có quyền bảng.
-- → anon (internet) hết đọc pin_hash/lương/chấm công trực tiếp; chỉ gọi RPC.
-- Rollback nếu cần: GRANT lại từ /tmp/rollback_grants_anon_129.sql.
-- ============================================================================
REVOKE ALL ON public.nhan_vien          FROM anon;
REVOKE ALL ON public.cham_cong          FROM anon;
REVOKE ALL ON public.dang_ky_off        FROM anon;
REVOKE ALL ON public.yeu_cau_chinh_sua  FROM anon;
REVOKE ALL ON public.lich_hen           FROM anon;
REVOKE ALL ON public.bang_luong         FROM anon;
REVOKE ALL ON public.quy_ngay_off       FROM anon;
REVOKE ALL ON public.don_hang_chi_tiet  FROM anon;
REVOKE ALL ON public.v_nhan_vien_thu_nhap FROM anon;
