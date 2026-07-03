-- ═══════════════════════════════════════════════════════════════════════════
-- 141 · BẢO MẬT LỚP 2a — RLS THEO VAI TRÒ cho 4 bảng "quyền lực" (03/07/2026)
-- Mục tiêu: chặn LEO THANG ĐẶC QUYỀN + sửa lương trái phép ở TẦNG DB.
--   Trước: bất kỳ tài khoản đăng nhập (Lễ tân) đều có thể qua REST API:
--     - UPDATE profiles SET vai_tro='admin'  → tự thăng cấp admin
--     - UPDATE bang_luong / nhan_vien.luong_cung → sửa lương
--   Sau: 4 bảng chỉ ADMIN (vai_tro='admin' trong profiles) được GHI.
--   Đã rà frontend 03/07: mọi chỗ ghi 4 bảng này đều nằm trong /admin/nhan-su
--   (chỉ admin dùng) → không vỡ luồng Lễ tân. RPC SECURITY DEFINER (checkin) +
--   service_role (edge/scripts) bypass RLS nên không ảnh hưởng.
-- LỚP 2b (sau — cần quan sát luồng): doanh_thu/chi_phi/don_hang UPDATE/DELETE.
-- ═══════════════════════════════════════════════════════════════════════════

-- Helper: người gọi hiện tại có phải admin? (SECURITY DEFINER để đọc profiles
-- không bị đệ quy RLS của chính profiles)
CREATE OR REPLACE FUNCTION public.hsms_is_admin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND vai_tro = 'admin'
  );
$$;
REVOKE ALL ON FUNCTION public.hsms_is_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.hsms_is_admin() TO authenticated;

-- ── 1. profiles — chặn tự thăng cấp vai_tro ─────────────────────────────────
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS p_profiles_select      ON public.profiles;
DROP POLICY IF EXISTS p_profiles_admin_write ON public.profiles;
CREATE POLICY p_profiles_select ON public.profiles
  FOR SELECT TO authenticated USING (true);
CREATE POLICY p_profiles_admin_write ON public.profiles
  FOR ALL TO authenticated
  USING (public.hsms_is_admin()) WITH CHECK (public.hsms_is_admin());

-- ── 2. bang_luong — chỉ admin (đọc + ghi); app KTV xem lương qua RPC definer ─
ALTER TABLE public.bang_luong ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS p_bang_luong_admin ON public.bang_luong;
CREATE POLICY p_bang_luong_admin ON public.bang_luong
  FOR ALL TO authenticated
  USING (public.hsms_is_admin()) WITH CHECK (public.hsms_is_admin());

-- ── 3. nhan_vien — mọi người đăng nhập ĐỌC (POS cần list KTV); GHI chỉ admin ─
ALTER TABLE public.nhan_vien ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS p_nhan_vien_select      ON public.nhan_vien;
DROP POLICY IF EXISTS p_nhan_vien_admin_write ON public.nhan_vien;
CREATE POLICY p_nhan_vien_select ON public.nhan_vien
  FOR SELECT TO authenticated USING (true);
CREATE POLICY p_nhan_vien_admin_write ON public.nhan_vien
  FOR ALL TO authenticated
  USING (public.hsms_is_admin()) WITH CHECK (public.hsms_is_admin());

-- ── 4. marketing_ai_config — hiến pháp AI + config vòng quay; GHI chỉ admin ──
-- (Bảng cau_hinh trong CLAUDE.md KHÔNG tồn tại trên VPS — đã kiểm 03/07)
ALTER TABLE public.marketing_ai_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS p_mkt_config_select      ON public.marketing_ai_config;
DROP POLICY IF EXISTS p_mkt_config_admin_write ON public.marketing_ai_config;
CREATE POLICY p_mkt_config_select ON public.marketing_ai_config
  FOR SELECT TO authenticated USING (true);
CREATE POLICY p_mkt_config_admin_write ON public.marketing_ai_config
  FOR ALL TO authenticated
  USING (public.hsms_is_admin()) WITH CHECK (public.hsms_is_admin());

-- ── 5. DỌN POLICY CŨ dễ dãi/đệ quy (phát hiện khi chạy 03/07) ────────────────
-- profiles có 4 policy cũ (trong đó "Users can update own profile" = CHÍNH LỖ
-- HỔNG tự sửa vai_tro; profiles_select_admin gây đệ quy vô hạn);
-- nhan_vien có allow_all_nhan_vien; marketing_ai_config có mac_auth_all.
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile."             ON public.profiles;
DROP POLICY IF EXISTS profiles_select_admin                        ON public.profiles;
DROP POLICY IF EXISTS profiles_select_own                          ON public.profiles;
DROP POLICY IF EXISTS allow_all_nhan_vien                          ON public.nhan_vien;
DROP POLICY IF EXISTS mac_auth_all                                 ON public.marketing_ai_config;

-- ═══ VERIFY (đã chạy 03/07 — PASS) ═══
-- Giả lập Lễ tân (role authenticated + sub lễ tân):
--   UPDATE profiles/bang_luong/nhan_vien/marketing_ai_config → 0 rows (chặn hết)
--   SELECT nhan_vien (69) + marketing_ai_config (15) → vẫn đọc (POS OK)
-- Giả lập Admin: UPDATE nhan_vien 1 row + đọc bang_luong 19 → đầy đủ quyền
-- Giả lập Lễ tân: SET LOCAL role authenticated + claims sub=<letan_id>
--   UPDATE profiles SET vai_tro='admin' ...   → 0 rows (bị chặn)
--   UPDATE bang_luong SET tong_linh=...       → 0 rows
--   SELECT ho_ten FROM nhan_vien LIMIT 1      → vẫn đọc được (POS OK)
