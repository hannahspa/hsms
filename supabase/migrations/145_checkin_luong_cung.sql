-- ============================================================================
-- 145_checkin_luong_cung.sql
-- HOTFIX · Lương app KTV (/checkin) hiện 0đ sau migration 136 (revoke anon).
-- ----------------------------------------------------------------------------
-- NGUYÊN NHÂN: migration 136 revoke anon khỏi bảng nhan_vien → app không đọc
-- thẳng luong_cung nữa, phải qua RPC. Nhưng checkin_dang_nhap + checkin_me
-- KHÔNG trả luong_cung → frontend tính luongCoBan = (undefined/ngày) = NaN → 0đ.
--
-- SỬA: trả THÊM luong_cung — nhưng CHỈ của CHÍNH NV (token đã resolve đúng NV).
-- KHÔNG lộ lương người khác: mỗi RPC chỉ trả 1 dòng theo v_nv của token.
-- Vẫn KHÔNG trả pin_hash. An toàn.
-- ============================================================================

-- ─── Đăng nhập PIN → thêm luong_cung vào nhan_vien trả về ───────────────────
CREATE OR REPLACE FUNCTION public.checkin_dang_nhap(p_nhan_vien_id uuid, p_pin_hash text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_nv     public.nhan_vien%ROWTYPE;
  v_att    public.checkin_login_attempt%ROWTYPE;
  v_token  text;
BEGIN
  SELECT * INTO v_att FROM public.checkin_login_attempt WHERE nhan_vien_id = p_nhan_vien_id;
  IF v_att.locked_until IS NOT NULL AND v_att.locked_until > now() THEN
    RETURN jsonb_build_object('success', false, 'error_code', 'LOCKED',
      'error', 'Sai PIN quá nhiều lần. Vui lòng đợi ' ||
        ceil(extract(epoch FROM (v_att.locked_until - now()))/60)::int || ' phút.');
  END IF;

  SELECT * INTO v_nv FROM public.nhan_vien
   WHERE id = p_nhan_vien_id AND pin_hash = p_pin_hash AND trang_thai = 'dang_lam';

  IF v_nv.id IS NULL THEN
    INSERT INTO public.checkin_login_attempt(nhan_vien_id, fail_count)
      VALUES (p_nhan_vien_id, 1)
    ON CONFLICT (nhan_vien_id) DO UPDATE
      SET fail_count = public.checkin_login_attempt.fail_count + 1,
          locked_until = CASE WHEN public.checkin_login_attempt.fail_count + 1 >= 5
                              THEN now() + interval '5 minutes' ELSE NULL END;
    RETURN jsonb_build_object('success', false, 'error_code', 'WRONG_PIN', 'error', 'PIN không đúng');
  END IF;

  DELETE FROM public.checkin_login_attempt WHERE nhan_vien_id = p_nhan_vien_id;
  v_token := gen_random_uuid()::text || gen_random_uuid()::text;
  INSERT INTO public.checkin_session(token, nhan_vien_id, expires_at)
    VALUES (v_token, v_nv.id, now() + interval '12 hours');
  DELETE FROM public.checkin_session WHERE expires_at < now() - interval '1 day';

  RETURN jsonb_build_object('success', true, 'token', v_token,
    'nhan_vien', jsonb_build_object(
      'id', v_nv.id, 'ho_ten', v_nv.ho_ten, 'vi_tri', v_nv.vi_tri,
      'avatar_url', v_nv.avatar_url, 'gioi_han_off_thang', v_nv.gioi_han_off_thang,
      'ngay_bat_dau', v_nv.ngay_bat_dau, 'ky_quy_trang_thai', v_nv.ky_quy_trang_thai,
      'luong_cung', v_nv.luong_cung));   -- ← lương cơ bản của CHÍNH NV (tính Kỳ 1)
END $$;

-- ─── Hồ sơ NV hiện tại (reload/persist token) → thêm luong_cung ─────────────
CREATE OR REPLACE FUNCTION public.checkin_me(p_token text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_nv uuid; r jsonb;
BEGIN
  v_nv := public.checkin_resolve(p_token);
  SELECT jsonb_build_object('id', id, 'ho_ten', ho_ten, 'vi_tri', vi_tri,
    'avatar_url', avatar_url, 'gioi_han_off_thang', gioi_han_off_thang,
    'ngay_bat_dau', ngay_bat_dau, 'ky_quy_trang_thai', ky_quy_trang_thai,
    'luong_cung', luong_cung)   -- ← lương cơ bản của CHÍNH NV (token đã resolve)
  INTO r FROM public.nhan_vien WHERE id = v_nv;
  RETURN r;
END $$;

-- Quyền giữ nguyên (đã GRANT ở migration 130); CREATE OR REPLACE không đổi grant.
