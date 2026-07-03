-- ═══════════════════════════════════════════════════════════════════════════
-- 142 · BẢO MẬT RPC POS THEO VAI TRÒ (03/07/2026) — tiếp nối 141 (hsms_is_admin)
-- Phát hiện 03/07: cả 5 RPC pos_finalize/void/reopen/hard_delete/restore đều
-- GRANT EXECUTE cho anon + authenticated → ai có anon key (không cần đăng nhập)
-- hoặc Lễ tân qua REST API có thể HỦY / MỞ LẠI / XÓA VĨNH VIỄN đơn đã thanh
-- toán, bypass mọi chặn UI (memory: "phân quyền chỉ Admin hủy/sửa/xóa đơn"
-- b833734 mới chỉ chặn ở frontend).
-- Vá 2 lớp:
--   (1) REVOKE anon + PUBLIC khỏi cả 5 RPC (Lễ tân vẫn giữ finalize để chốt đơn)
--   (2) Guard TRONG hàm: void đơn đã thanh toán / reopen / hard_delete / restore
--       → yêu cầu hsms_is_admin(). Lễ tân vẫn hủy được đơn NHÁP (draft).
--       auth.uid() IS NULL (service_role, psql, scripts) → bypass như cũ.
-- Logic nghiệp vụ giữ NGUYÊN 100% source đang chạy trên VPS (đã dump đối chiếu).
-- ═══════════════════════════════════════════════════════════════════════════

-- ── (1) Khóa quyền EXECUTE ───────────────────────────────────────────────────
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN ('pos_finalize_order','pos_void_order','pos_reopen_order',
                        'pos_hard_delete_order','pos_restore_order')
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon', r.sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated, service_role', r.sig);
  END LOOP;
END $$;

-- ── (2a) pos_void_order — Lễ tân chỉ hủy được đơn NHÁP; đơn đã chốt cần ADMIN ─
CREATE OR REPLACE FUNCTION public.pos_void_order(p_don_hang_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_dh don_hang%ROWTYPE;
  v_item record;
  v_is_test boolean := false;
BEGIN
  SELECT * INTO v_dh
  FROM don_hang
  WHERE id = p_don_hang_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Don hang khong ton tai');
  END IF;

  IF v_dh.trang_thai = 'huy' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Don hang da huy truoc do');
  END IF;

  -- [142] Đơn đã thanh toán / nợ một phần: chỉ ADMIN được hủy
  IF v_dh.trang_thai IN ('da_thanh_toan', 'no_mot_phan')
     AND auth.uid() IS NOT NULL AND NOT public.hsms_is_admin() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Chi ADMIN duoc huy don da thanh toan');
  END IF;

  v_is_test := COALESCE(v_dh.is_test, false);

  IF NOT v_is_test AND EXISTS (
    SELECT 1
    FROM the_lieu_trinh
    WHERE don_hang_id = p_don_hang_id
      AND COALESCE(so_buoi_da_dung, 0) > 0
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'The moi cua don nay da duoc su dung, can doi soat thu cong truoc khi huy');
  END IF;

  DELETE FROM nhan_vien_thu_nhap WHERE don_hang_id = p_don_hang_id;

  IF NOT v_is_test THEN
    FOR v_item IN
      SELECT *
      FROM don_hang_chi_tiet
      WHERE don_hang_id = p_don_hang_id
        AND loai_item = 'san_pham'
    LOOP
      UPDATE kho_san_pham
      SET ton_kho = ton_kho + v_item.so_luong
      WHERE id = v_item.san_pham_id;

      UPDATE kho_giao_dich
      SET ghi_chu = COALESCE(ghi_chu, '') || ' [DA HUY]'
      WHERE don_hang_id = p_don_hang_id
        AND san_pham_id = v_item.san_pham_id;
    END LOOP;

    FOR v_item IN
      SELECT *
      FROM don_hang_chi_tiet
      WHERE don_hang_id = p_don_hang_id
        AND loai_item = 'the_lieu_trinh'
    LOOP
      UPDATE the_lieu_trinh SET
        so_buoi_da_dung = GREATEST(0, so_buoi_da_dung - v_item.so_luong),
        trang_thai = 'active'
      WHERE id = v_item.the_lieu_trinh_id;
    END LOOP;

    DELETE FROM lich_su_dung_the WHERE don_hang_id = p_don_hang_id;
    DELETE FROM the_lieu_trinh WHERE don_hang_id = p_don_hang_id;
    DELETE FROM doanh_thu WHERE don_hang_id = p_don_hang_id AND nguon = 'pos';
    DELETE FROM cong_no_khach_hang WHERE don_hang_id = p_don_hang_id;

    IF v_dh.khach_hang_id IS NOT NULL AND v_dh.trang_thai IN ('da_thanh_toan', 'no_mot_phan') THEN
      UPDATE khach_hang SET
        tong_chi_tieu = GREATEST(0, COALESCE(tong_chi_tieu, 0) - COALESCE(v_dh.thuc_thu, 0)),
        so_lan_den    = GREATEST(0, COALESCE(so_lan_den, 0) - 1)
      WHERE id = v_dh.khach_hang_id;
    END IF;
  END IF;

  UPDATE don_hang SET
    trang_thai = 'huy',
    con_no = 0,
    updated_at = now()
  WHERE id = p_don_hang_id;

  RETURN jsonb_build_object('success', true, 'ma_don', v_dh.ma_don);
END;
$function$;

-- ── (2b) pos_reopen_order — mở lại đơn đã chốt: chỉ ADMIN ────────────────────
CREATE OR REPLACE FUNCTION public.pos_reopen_order(p_don_hang_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
 SET statement_timeout TO '120s'
AS $function$
DECLARE
  v_dh don_hang%ROWTYPE;
  v_item record;
  v_is_test boolean := false;
BEGIN
  SELECT * INTO v_dh FROM don_hang WHERE id = p_don_hang_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Don hang khong ton tai');
  END IF;
  IF v_dh.trang_thai = 'draft' THEN
    RETURN jsonb_build_object('success', true, 'already_draft', true, 'ma_don', v_dh.ma_don);
  END IF;
  IF v_dh.trang_thai = 'huy' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Don da huy — khong mo lai duoc');
  END IF;

  -- [142] Mở lại đơn đã chốt = quyền ADMIN (Lễ tân đi luồng đề xuất → duyệt)
  IF auth.uid() IS NOT NULL AND NOT public.hsms_is_admin() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Chi ADMIN duoc mo lai don da chot');
  END IF;

  v_is_test := COALESCE(v_dh.is_test, false);

  -- Không cho mở lại nếu thẻ mới của đơn đã được dùng buổi (tránh lệch dữ liệu)
  IF NOT v_is_test AND EXISTS (
    SELECT 1 FROM the_lieu_trinh
    WHERE don_hang_id = p_don_hang_id AND COALESCE(so_buoi_da_dung, 0) > 0
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'The moi cua don nay da duoc su dung — can doi soat thu cong truoc khi sua');
  END IF;

  -- Đảo ngược tác động phát sinh (giống void)
  DELETE FROM nhan_vien_thu_nhap WHERE don_hang_id = p_don_hang_id;

  IF NOT v_is_test THEN
    -- hoàn kho sản phẩm
    FOR v_item IN SELECT * FROM don_hang_chi_tiet WHERE don_hang_id = p_don_hang_id AND loai_item = 'san_pham' LOOP
      UPDATE kho_san_pham SET ton_kho = ton_kho + v_item.so_luong WHERE id = v_item.san_pham_id;
    END LOOP;
    -- hoàn buổi thẻ đã dùng
    FOR v_item IN SELECT * FROM don_hang_chi_tiet WHERE don_hang_id = p_don_hang_id AND loai_item = 'the_lieu_trinh' LOOP
      UPDATE the_lieu_trinh SET
        so_buoi_da_dung = GREATEST(0, so_buoi_da_dung - v_item.so_luong),
        trang_thai = 'active'
      WHERE id = v_item.the_lieu_trinh_id;
    END LOOP;
    DELETE FROM kho_giao_dich WHERE don_hang_id = p_don_hang_id;
    DELETE FROM lich_su_dung_the WHERE don_hang_id = p_don_hang_id;
    DELETE FROM the_lieu_trinh WHERE don_hang_id = p_don_hang_id;
    DELETE FROM doanh_thu WHERE don_hang_id = p_don_hang_id AND nguon = 'pos';
    DELETE FROM cong_no_khach_hang WHERE don_hang_id = p_don_hang_id;

    IF v_dh.khach_hang_id IS NOT NULL AND v_dh.trang_thai IN ('da_thanh_toan', 'no_mot_phan') THEN
      UPDATE khach_hang SET
        tong_chi_tieu = GREATEST(0, COALESCE(tong_chi_tieu, 0) - COALESCE(v_dh.thuc_thu, 0)),
        so_lan_den    = GREATEST(0, COALESCE(so_lan_den, 0) - 1)
      WHERE id = v_dh.khach_hang_id;
    END IF;
  END IF;

  -- Đưa về nháp, GIỮ dòng hàng + thanh toán để sửa
  UPDATE don_hang SET trang_thai = 'draft', con_no = 0, updated_at = now()
  WHERE id = p_don_hang_id;

  RETURN jsonb_build_object('success', true, 'ma_don', v_dh.ma_don, 'reopened', true);
END;
$function$;

-- ── (2c) pos_hard_delete_order — xóa vĩnh viễn: chỉ ADMIN ────────────────────
CREATE OR REPLACE FUNCTION public.pos_hard_delete_order(p_don_hang_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
 SET statement_timeout TO '120s'
AS $function$
DECLARE
  v_dh don_hang%ROWTYPE;
BEGIN
  -- [142] Xóa vĩnh viễn = quyền ADMIN
  IF auth.uid() IS NOT NULL AND NOT public.hsms_is_admin() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Chi ADMIN duoc xoa vinh vien don hang');
  END IF;

  SELECT * INTO v_dh FROM don_hang WHERE id = p_don_hang_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Don hang khong ton tai');
  END IF;
  IF v_dh.trang_thai <> 'huy' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Chi xoa vinh vien duoc don DA HUY');
  END IF;

  -- Dọn sạch dữ liệu liên quan (đề phòng đơn cũ còn sót)
  DELETE FROM nhan_vien_thu_nhap WHERE don_hang_id = p_don_hang_id;
  DELETE FROM doanh_thu WHERE don_hang_id = p_don_hang_id;
  DELETE FROM thanh_toan WHERE don_hang_id = p_don_hang_id;
  DELETE FROM don_hang_chi_tiet WHERE don_hang_id = p_don_hang_id;
  DELETE FROM don_hang WHERE id = p_don_hang_id;

  RETURN jsonb_build_object('success', true, 'ma_don', v_dh.ma_don, 'deleted', true);
END;
$function$;

-- ── (2d) pos_restore_order — khôi phục đơn hủy: chỉ ADMIN ────────────────────
CREATE OR REPLACE FUNCTION public.pos_restore_order(p_don_hang_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
 SET statement_timeout TO '120s'
AS $function$
DECLARE
  v_dh   don_hang%ROWTYPE;
  v_cnt  integer := 0;
  v_res  jsonb;
BEGIN
  -- [142] Khôi phục đơn hủy = quyền ADMIN
  IF auth.uid() IS NOT NULL AND NOT public.hsms_is_admin() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Chi ADMIN duoc khoi phuc don da huy');
  END IF;

  SELECT * INTO v_dh FROM don_hang WHERE id = p_don_hang_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Don hang khong ton tai');
  END IF;

  IF v_dh.trang_thai <> 'huy' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Chi khoi phuc duoc don DA HUY');
  END IF;

  SELECT COUNT(*) INTO v_cnt FROM don_hang_chi_tiet WHERE don_hang_id = p_don_hang_id;
  IF v_cnt = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Don da bi xoa vinh vien (khong con dong hang) — khong khoi phuc duoc');
  END IF;

  -- Đưa về nháp để finalize chạy lại dựng tác động
  UPDATE don_hang SET trang_thai = 'draft', con_no = 0, updated_at = now()
  WHERE id = p_don_hang_id;

  -- Chạy lại finalize (dựng lại thẻ LT / kho / doanh thu / tour-hoa hồng)
  v_res := pos_finalize_order(
    p_don_hang_id,
    'da_thanh_toan',
    COALESCE(v_dh.giam_gia, 0),
    COALESCE(v_dh.vat, 0),
    0,
    v_dh.ghi_chu
  );

  -- Nếu finalize không thành công → trả đơn về 'huy' (giữ nguyên hiện trạng)
  IF COALESCE((v_res->>'success')::boolean, false) IS NOT TRUE THEN
    UPDATE don_hang SET trang_thai = 'huy', updated_at = now() WHERE id = p_don_hang_id;
    RETURN jsonb_build_object('success', false,
      'error', COALESCE(v_res->>'error', 'Khong the khoi phuc don (finalize that bai)'));
  END IF;

  RETURN jsonb_build_object('success', true, 'ma_don', v_dh.ma_don, 'restored', true);
END;
$function$;

-- ═══ VERIFY sau khi chạy ═══
-- SELECT proname, has_function_privilege('anon', oid, 'EXECUTE') FROM pg_proc
--   WHERE proname LIKE 'pos_%order' → anon = false toàn bộ
-- Giả lập Lễ tân: pos_void_order(đơn đã thanh toán) → error 'Chi ADMIN...'
-- Giả lập Lễ tân: pos_reopen_order(đơn đã chốt)     → error 'Chi ADMIN...'
