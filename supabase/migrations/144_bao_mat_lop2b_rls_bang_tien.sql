-- ═══════════════════════════════════════════════════════════════════════════
-- 144 · BẢO MẬT LỚP 2b — RLS BẢNG TIỀN (04/07/2026) — tiếp nối 141 (hsms_is_admin)
-- Chặn Lễ tân (authenticated) SỬA/XÓA dữ liệu tiền đã ghi qua REST API:
--   doanh_thu / chi_phi / chuyen_khoan_noi_bo : UPDATE + DELETE = ADMIN-only
--   don_hang                                  : UPDATE đơn NHÁP ok, còn lại admin
--   don_hang_chi_tiet / thanh_toan            : UPDATE/DELETE khi đơn cha NHÁP, còn lại admin
-- Lễ tân vẫn: đọc + NHẬP MỚI mọi bảng (nhập liệu, tạo đơn POS) + thao tác đơn nháp.
-- Sửa/xóa bản ghi đã chốt → luồng yeu_cau_chinh_sua → admin duyệt (sẵn có).
-- RPC SECURITY DEFINER (pos_finalize/void/reopen, trigger hoàn ví) + service_role
-- (bypassrls) KHÔNG bị ảnh hưởng.
-- Đã rà FE 04/07: PosApp update/delete chi_tiet+thanh_toan chỉ trên đơn draft
-- (resume nháp) hoặc luồng admin (editOrderId); FormDoanhThu/FormChiPhi edit =
-- màn admin; Kho xóa chi_phi liên quan = màn admin.
-- ═══════════════════════════════════════════════════════════════════════════

-- Helper: đơn đang ở trạng thái nháp?
CREATE OR REPLACE FUNCTION public.hsms_don_nhap(p_don_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.don_hang WHERE id = p_don_id AND trang_thai = 'draft');
$$;
REVOKE ALL ON FUNCTION public.hsms_don_nhap(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.hsms_don_nhap(uuid) TO authenticated, service_role;

-- ── 1. doanh_thu / chi_phi / chuyen_khoan_noi_bo ─────────────────────────────
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['doanh_thu','chi_phi','chuyen_khoan_noi_bo'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS p_%s_select ON public.%I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS p_%s_insert ON public.%I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS p_%s_update ON public.%I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS p_%s_delete ON public.%I', t, t);
    EXECUTE format('CREATE POLICY p_%s_select ON public.%I FOR SELECT TO authenticated USING (true)', t, t);
    EXECUTE format('CREATE POLICY p_%s_insert ON public.%I FOR INSERT TO authenticated WITH CHECK (true)', t, t);
    EXECUTE format('CREATE POLICY p_%s_update ON public.%I FOR UPDATE TO authenticated USING (public.hsms_is_admin()) WITH CHECK (public.hsms_is_admin())', t, t);
    EXECUTE format('CREATE POLICY p_%s_delete ON public.%I FOR DELETE TO authenticated USING (public.hsms_is_admin())', t, t);
  END LOOP;
END $$;

-- ── 2. don_hang: sửa đơn NHÁP tự do (POS), còn lại admin ─────────────────────
ALTER TABLE public.don_hang ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS p_don_hang_select ON public.don_hang;
DROP POLICY IF EXISTS p_don_hang_insert ON public.don_hang;
DROP POLICY IF EXISTS p_don_hang_update ON public.don_hang;
DROP POLICY IF EXISTS p_don_hang_delete ON public.don_hang;
CREATE POLICY p_don_hang_select ON public.don_hang FOR SELECT TO authenticated USING (true);
CREATE POLICY p_don_hang_insert ON public.don_hang FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY p_don_hang_update ON public.don_hang FOR UPDATE TO authenticated
  USING (trang_thai = 'draft' OR public.hsms_is_admin());
CREATE POLICY p_don_hang_delete ON public.don_hang FOR DELETE TO authenticated
  USING (public.hsms_is_admin());

-- ── 3. don_hang_chi_tiet + thanh_toan: theo trạng thái đơn cha ───────────────
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['don_hang_chi_tiet','thanh_toan'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS p_%s_select ON public.%I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS p_%s_insert ON public.%I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS p_%s_update ON public.%I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS p_%s_delete ON public.%I', t, t);
    EXECUTE format('CREATE POLICY p_%s_select ON public.%I FOR SELECT TO authenticated USING (true)', t, t);
    EXECUTE format('CREATE POLICY p_%s_insert ON public.%I FOR INSERT TO authenticated WITH CHECK (true)', t, t);
    EXECUTE format('CREATE POLICY p_%s_update ON public.%I FOR UPDATE TO authenticated USING (public.hsms_don_nhap(don_hang_id) OR public.hsms_is_admin())', t, t);
    EXECUTE format('CREATE POLICY p_%s_delete ON public.%I FOR DELETE TO authenticated USING (public.hsms_don_nhap(don_hang_id) OR public.hsms_is_admin())', t, t);
  END LOOP;
END $$;

-- ═══ VERIFY sau khi chạy (giả lập JWT lễ tân):
--   UPDATE doanh_thu → 0 rows · DELETE chi_phi → 0 rows
--   UPDATE don_hang (đã thanh toán) → 0 rows · UPDATE don_hang (draft) → OK
--   UPDATE don_hang_chi_tiet của đơn draft → OK; của đơn đã chốt → 0 rows
--   INSERT doanh_thu/chi_phi → OK (nhập liệu hàng ngày không đổi)
