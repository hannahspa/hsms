-- ============================================================================
-- 130_checkin_rpc_secure.sql
-- GĐ0-A · LỚP 1b (DB CORE) — RPC an toàn cho app KTV /checkin
-- ----------------------------------------------------------------------------
-- MỤC TIÊU:
--  1) KTV đăng nhập PIN → nhận session_token; MỌI thao tác qua RPC kèm token.
--     Server chỉ trả/ghi DỮ LIỆU CỦA ĐÚNG NV đó → KTV chỉ thấy lương/tour/hoa
--     hồng CỦA MÌNH. KHÔNG bao giờ trả pin_hash / luong_cung của người khác.
--  2) Chấm công: verify GPS SERVER-SIDE (chống sửa JS) + bắt buộc SELFIE
--     (chống check-in hộ — A đưa PIN cho B thì B vẫn phải chụp mặt).
--  3) Sau khi frontend chuyển hết sang RPC (bước 1b-3) → REVOKE 9 bảng checkin
--     khỏi anon (bước 1b-4). Migration NÀY chỉ THÊM, KHÔNG revoke → an toàn chạy
--     bất cứ lúc nào, app cũ vẫn chạy song song.
--
-- Tất cả RPC: SECURITY DEFINER (chạy quyền owner → đọc được bảng kể cả sau khi
-- revoke anon), search_path khoá về public. anon chỉ được EXECUTE các RPC này.
-- ============================================================================

-- ─── 1. Cột selfie + GPS cho chấm công (bằng chứng chống check hộ) ───────────
ALTER TABLE public.cham_cong
  ADD COLUMN IF NOT EXISTS selfie_vao_url text,
  ADD COLUMN IF NOT EXISTS selfie_ra_url  text,
  ADD COLUMN IF NOT EXISTS gps_vao        text,
  ADD COLUMN IF NOT EXISTS gps_ra         text;

-- ─── 2. Bảng phiên đăng nhập KTV ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.checkin_session (
  token        text PRIMARY KEY,
  nhan_vien_id uuid NOT NULL REFERENCES public.nhan_vien(id) ON DELETE CASCADE,
  created_at   timestamptz NOT NULL DEFAULT now(),
  expires_at   timestamptz NOT NULL,
  last_seen    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_checkin_session_nv ON public.checkin_session(nhan_vien_id);

-- ─── 3. Rate-limit đăng nhập (server-side, chống dò PIN) ─────────────────────
CREATE TABLE IF NOT EXISTS public.checkin_login_attempt (
  nhan_vien_id uuid PRIMARY KEY REFERENCES public.nhan_vien(id) ON DELETE CASCADE,
  fail_count   int NOT NULL DEFAULT 0,
  locked_until timestamptz
);

-- ─── 4. Helpers ─────────────────────────────────────────────────────────────
-- Giờ VN
CREATE OR REPLACE FUNCTION public.checkin_now_vn()
RETURNS timestamp LANGUAGE sql STABLE AS $$
  SELECT (now() AT TIME ZONE 'Asia/Ho_Chi_Minh');
$$;

-- Khoảng cách haversine (mét) tới spa 39 NKKN
CREATE OR REPLACE FUNCTION public.checkin_dist_spa_m(p_lat double precision, p_lng double precision)
RETURNS double precision LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  spa_lat CONSTANT double precision := 10.031917;
  spa_lng CONSTANT double precision := 105.785083;
  r CONSTANT double precision := 6371000;
  d_lat double precision := radians(p_lat - spa_lat);
  d_lng double precision := radians(p_lng - spa_lng);
  a double precision;
BEGIN
  a := sin(d_lat/2)^2 + cos(radians(spa_lat))*cos(radians(p_lat))*sin(d_lng/2)^2;
  RETURN r * 2 * atan2(sqrt(a), sqrt(1-a));
END $$;

-- Resolve token → nhan_vien_id (chưa hết hạn); gia hạn phiên (sliding 12h)
CREATE OR REPLACE FUNCTION public.checkin_resolve(p_token text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_nv uuid;
BEGIN
  UPDATE public.checkin_session
     SET last_seen = now(), expires_at = now() + interval '12 hours'
   WHERE token = p_token AND expires_at > now()
  RETURNING nhan_vien_id INTO v_nv;
  IF v_nv IS NULL THEN RAISE EXCEPTION 'PHIEN_HET_HAN'; END IF;
  RETURN v_nv;
END $$;

-- ─── 5. Danh sách NV cho màn chọn (KHÔNG lộ pin/lương) ───────────────────────
CREATE OR REPLACE FUNCTION public.checkin_ds_nhan_vien()
RETURNS TABLE(id uuid, ho_ten text, vi_tri text, avatar_url text)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT id, ho_ten, vi_tri, avatar_url
  FROM public.nhan_vien
  WHERE trang_thai = 'dang_lam'
  ORDER BY ho_ten;
$$;

-- ─── 6. Đăng nhập PIN → session_token (client gửi pin_hash SHA-256) ──────────
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

  -- OK → reset attempt, tạo phiên mới
  DELETE FROM public.checkin_login_attempt WHERE nhan_vien_id = p_nhan_vien_id;
  v_token := gen_random_uuid()::text || gen_random_uuid()::text;
  INSERT INTO public.checkin_session(token, nhan_vien_id, expires_at)
    VALUES (v_token, v_nv.id, now() + interval '12 hours');
  -- dọn phiên hết hạn cũ
  DELETE FROM public.checkin_session WHERE expires_at < now() - interval '1 day';

  RETURN jsonb_build_object('success', true, 'token', v_token,
    'nhan_vien', jsonb_build_object(
      'id', v_nv.id, 'ho_ten', v_nv.ho_ten, 'vi_tri', v_nv.vi_tri,
      'avatar_url', v_nv.avatar_url, 'gioi_han_off_thang', v_nv.gioi_han_off_thang,
      'ngay_bat_dau', v_nv.ngay_bat_dau, 'ky_quy_trang_thai', v_nv.ky_quy_trang_thai));
END $$;

CREATE OR REPLACE FUNCTION public.checkin_dang_xuat(p_token text)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  DELETE FROM public.checkin_session WHERE token = p_token;
$$;

-- ─── 7. Hồ sơ NV hiện tại ────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.checkin_me(p_token text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_nv uuid; r jsonb;
BEGIN
  v_nv := public.checkin_resolve(p_token);
  SELECT jsonb_build_object('id', id, 'ho_ten', ho_ten, 'vi_tri', vi_tri,
    'avatar_url', avatar_url, 'gioi_han_off_thang', gioi_han_off_thang,
    'ngay_bat_dau', ngay_bat_dau, 'ky_quy_trang_thai', ky_quy_trang_thai)
  INTO r FROM public.nhan_vien WHERE id = v_nv;
  RETURN r;
END $$;

-- ─── 8. Home: chấm công hôm nay + lịch hẹn hôm nay ──────────────────────────
CREATE OR REPLACE FUNCTION public.checkin_home(p_token text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_nv uuid; v_today date;
BEGIN
  v_nv := public.checkin_resolve(p_token);
  v_today := (public.checkin_now_vn())::date;
  RETURN jsonb_build_object(
    'cham_cong_hom_nay', (SELECT to_jsonb(c) FROM public.cham_cong c
        WHERE c.nhan_vien_id = v_nv AND c.ngay = v_today LIMIT 1),
    'lich_hen_hom_nay', COALESCE((SELECT jsonb_agg(to_jsonb(l)) FROM public.lich_hen l
        WHERE l.nhan_vien_id = v_nv AND l.ngay_hen = v_today), '[]'::jsonb)
  );
END $$;

-- ─── 9. Lịch tháng: chấm công + đăng ký OFF ─────────────────────────────────
CREATE OR REPLACE FUNCTION public.checkin_lich(p_token text, p_thang int, p_nam int)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_nv uuid; d1 date; d2 date;
BEGIN
  v_nv := public.checkin_resolve(p_token);
  d1 := make_date(p_nam, p_thang, 1);
  d2 := (d1 + interval '1 month - 1 day')::date;
  RETURN jsonb_build_object(
    'cham_cong', COALESCE((SELECT jsonb_agg(to_jsonb(c)) FROM public.cham_cong c
        WHERE c.nhan_vien_id = v_nv AND c.ngay BETWEEN d1 AND d2), '[]'::jsonb),
    'dang_ky_off', COALESCE((SELECT jsonb_agg(to_jsonb(o)) FROM public.dang_ky_off o
        WHERE o.nhan_vien_id = v_nv AND o.ngay_off BETWEEN d1 AND d2), '[]'::jsonb)
  );
END $$;

-- ─── 10. Lương (dữ liệu thô của CHÍNH NV — client tự tính bằng tinhLuong) ────
CREATE OR REPLACE FUNCTION public.checkin_luong(p_token text, p_thang int, p_nam int)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_nv uuid; d1 date; d2 date;
BEGIN
  v_nv := public.checkin_resolve(p_token);
  d1 := make_date(p_nam, p_thang, 1);
  d2 := (d1 + interval '1 month - 1 day')::date;
  RETURN jsonb_build_object(
    'cham_cong', COALESCE((SELECT jsonb_agg(to_jsonb(c)) FROM public.cham_cong c
        WHERE c.nhan_vien_id = v_nv AND c.ngay BETWEEN d1 AND d2), '[]'::jsonb),
    'bang_luong', (SELECT to_jsonb(b) FROM public.bang_luong b
        WHERE b.nhan_vien_id = v_nv AND b.thang = p_thang AND b.nam = p_nam LIMIT 1),
    'quy_ngay_off', (SELECT to_jsonb(q) FROM public.quy_ngay_off q
        WHERE q.nhan_vien_id = v_nv AND q.nam = p_nam LIMIT 1),
    'pos_thu_nhap', COALESCE((SELECT jsonb_agg(jsonb_build_object('loai', v.loai, 'so_tien', v.so_tien))
        FROM public.v_nhan_vien_thu_nhap v
        WHERE v.nhan_vien_id = v_nv AND v.ngay BETWEEN d1 AND d2 AND v.is_test = false), '[]'::jsonb)
  );
END $$;

-- ─── 11. Thu nhập chi tiết (từng đơn của CHÍNH NV) ──────────────────────────
CREATE OR REPLACE FUNCTION public.checkin_thu_nhap(p_token text, p_thang int, p_nam int)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_nv uuid; d1 date; d2 date;
BEGIN
  v_nv := public.checkin_resolve(p_token);
  d1 := make_date(p_nam, p_thang, 1);
  d2 := (d1 + interval '1 month - 1 day')::date;
  RETURN jsonb_build_object(
    'tong', COALESCE((SELECT jsonb_agg(jsonb_build_object('loai', v.loai, 'so_tien', v.so_tien, 'ngay', v.ngay))
        FROM public.v_nhan_vien_thu_nhap v
        WHERE v.nhan_vien_id = v_nv AND v.ngay BETWEEN d1 AND d2 AND v.is_test = false), '[]'::jsonb),
    'chi_tiet', COALESCE((SELECT jsonb_agg(jsonb_build_object(
          'id', ct.id, 'thanh_tien', ct.thanh_tien, 'tien_tour', ct.tien_tour,
          'tien_hoa_hong', ct.tien_hoa_hong, 'ti_le_hoa_hong', ct.ti_le_hoa_hong, 'loai_item', ct.loai_item,
          'dich_vu', (SELECT ten FROM public.dich_vu WHERE id = ct.dich_vu_id),
          'san_pham', (SELECT ten FROM public.kho_san_pham WHERE id = ct.san_pham_id),
          'the', (SELECT ten_dich_vu FROM public.the_lieu_trinh WHERE id = ct.the_lieu_trinh_id),
          'ngay', dh.ngay, 'ma_don', dh.ma_don, 'trang_thai', dh.trang_thai,
          'khach', (SELECT ho_ten FROM public.khach_hang WHERE id = dh.khach_hang_id)))
        FROM public.don_hang_chi_tiet ct
        JOIN public.don_hang dh ON dh.id = ct.don_hang_id
        WHERE ct.nhan_vien_id = v_nv AND dh.ngay BETWEEN d1 AND d2
          AND dh.is_test = false AND dh.trang_thai <> 'huy'
          AND ((ct.tien_tour > 0) OR (ct.tien_hoa_hong > 0))), '[]'::jsonb)
  );
END $$;

-- ─── 12. Chấm công (verify GPS server + bắt buộc selfie) ────────────────────
-- p_action: 'vao' | 'ra'. Giá trị he_so/tang_ca client tính (admin duyệt lại).
CREATE OR REPLACE FUNCTION public.checkin_cham_cong(
  p_token text, p_action text, p_gio text,
  p_he_so numeric, p_tang_ca numeric, p_ly_do text,
  p_selfie_url text, p_lat double precision, p_lng double precision)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_nv uuid; v_today date; v_dist double precision; v_ten text; v_id uuid; v_gps text;
BEGIN
  v_nv := public.checkin_resolve(p_token);
  IF p_selfie_url IS NULL OR length(p_selfie_url) < 5 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Thiếu ảnh selfie xác thực');
  END IF;
  IF p_lat IS NULL OR p_lng IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Thiếu vị trí GPS');
  END IF;
  v_dist := public.checkin_dist_spa_m(p_lat, p_lng);
  IF v_dist > 150 THEN
    RETURN jsonb_build_object('success', false, 'error_code', 'GPS_XA',
      'error', 'Vị trí cách Spa ' || round(v_dist)::int || 'm (tối đa 150m)');
  END IF;
  SELECT ho_ten INTO v_ten FROM public.nhan_vien WHERE id = v_nv;
  v_today := (public.checkin_now_vn())::date;
  v_gps := p_lat || ',' || p_lng;

  IF p_action = 'vao' THEN
    IF EXISTS (SELECT 1 FROM public.cham_cong WHERE nhan_vien_id = v_nv AND ngay = v_today) THEN
      RETURN jsonb_build_object('success', false, 'error', 'Đã check-in hôm nay');
    END IF;
    INSERT INTO public.cham_cong(nhan_vien_id, ngay, gio_vao, loai, he_so, he_so_tam,
        tang_ca_gio, trang_thai_tang_ca, nguoi_cham, selfie_vao_url, gps_vao)
      VALUES (v_nv, v_today, p_gio, 'di_lam', 0, 0, 0, 'khong_co', v_ten, p_selfie_url, v_gps)
      RETURNING id INTO v_id;
    RETURN jsonb_build_object('success', true, 'id', v_id);

  ELSIF p_action = 'ra' THEN
    UPDATE public.cham_cong
       SET gio_ra = p_gio, he_so = p_he_so, he_so_tam = p_he_so, tang_ca_gio = 0,
           ly_do_ve_som = p_ly_do,
           trang_thai_tang_ca = CASE WHEN p_tang_ca > 0 THEN 'cho_duyet' ELSE 'khong_co' END,
           selfie_ra_url = p_selfie_url, gps_ra = v_gps
     WHERE nhan_vien_id = v_nv AND ngay = v_today AND gio_ra IS NULL
     RETURNING id INTO v_id;
    IF v_id IS NULL THEN
      RETURN jsonb_build_object('success', false, 'error', 'Chưa check-in hoặc đã check-out');
    END IF;
    IF p_tang_ca > 0 THEN
      INSERT INTO public.yeu_cau_chinh_sua(loai_bang, ban_ghi_id, loai_yeu_cau,
          du_lieu_cu, du_lieu_moi, ly_do, nguoi_yeu_cau)
        VALUES ('cham_cong', v_id, 'duyet_tang_ca',
          jsonb_build_object('tang_ca_gio', 0), jsonb_build_object('tang_ca_gio', p_tang_ca),
          v_ten || ' tăng ca ' || p_tang_ca || 'h — check-out ' || left(p_gio,5), v_ten);
    END IF;
    RETURN jsonb_build_object('success', true, 'id', v_id);
  END IF;
  RETURN jsonb_build_object('success', false, 'error', 'Hành động không hợp lệ');
END $$;

-- ─── 13. Bổ sung giờ ra (quên check-out ngày cũ) ────────────────────────────
CREATE OR REPLACE FUNCTION public.checkin_bo_sung_gio_ra(
  p_token text, p_cham_cong_id uuid, p_gio_ra text, p_he_so numeric, p_tang_ca numeric)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_nv uuid; v_id uuid;
BEGIN
  v_nv := public.checkin_resolve(p_token);
  UPDATE public.cham_cong
     SET gio_ra = p_gio_ra, he_so = p_he_so, he_so_tam = p_he_so, tang_ca_gio = p_tang_ca,
         trang_thai_tang_ca = CASE WHEN p_tang_ca > 0 THEN 'cho_duyet' ELSE 'khong_co' END
   WHERE id = p_cham_cong_id AND nhan_vien_id = v_nv  -- chỉ bản ghi CỦA MÌNH
   RETURNING id INTO v_id;
  IF v_id IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Không tìm thấy bản ghi'); END IF;
  RETURN jsonb_build_object('success', true, 'id', v_id);
END $$;

-- ─── 14. Đăng ký OFF ────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.checkin_dang_ky_off(
  p_token text, p_ngay_off date, p_loai_off text, p_ly_do text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_nv uuid;
BEGIN
  v_nv := public.checkin_resolve(p_token);
  INSERT INTO public.dang_ky_off(nhan_vien_id, ngay_off, loai_off, ly_do, trang_thai, nguon)
    VALUES (v_nv, p_ngay_off, p_loai_off, p_ly_do, 'cho_duyet', 'nhan_vien');
  RETURN jsonb_build_object('success', true);
END $$;

-- ─── 15. Đổi PIN (verify PIN cũ, client gửi 2 hash) ─────────────────────────
CREATE OR REPLACE FUNCTION public.checkin_doi_pin(
  p_token text, p_pin_hash_cu text, p_pin_hash_moi text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_nv uuid;
BEGIN
  v_nv := public.checkin_resolve(p_token);
  IF NOT EXISTS (SELECT 1 FROM public.nhan_vien WHERE id = v_nv AND pin_hash = p_pin_hash_cu) THEN
    RETURN jsonb_build_object('success', false, 'error', 'PIN cũ không đúng');
  END IF;
  UPDATE public.nhan_vien SET pin_hash = p_pin_hash_moi WHERE id = v_nv;
  RETURN jsonb_build_object('success', true);
END $$;

-- ─── 16. Đổi avatar ─────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.checkin_doi_avatar(p_token text, p_url text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_nv uuid;
BEGIN
  v_nv := public.checkin_resolve(p_token);
  UPDATE public.nhan_vien SET avatar_url = p_url WHERE id = v_nv;
  RETURN jsonb_build_object('success', true);
END $$;

-- ─── 17. Quyền: anon chỉ được EXECUTE các RPC (KHÔNG đọc bảng trực tiếp) ─────
-- checkin_resolve/dist/now là helper nội bộ — vẫn cần execute vì RPC gọi lẫn nhau
-- dưới quyền definer (không sao). Cấp execute cho các RPC app gọi:
GRANT EXECUTE ON FUNCTION public.checkin_ds_nhan_vien()                          TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.checkin_dang_nhap(uuid, text)                   TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.checkin_dang_xuat(text)                         TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.checkin_me(text)                               TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.checkin_home(text)                             TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.checkin_lich(text, int, int)                   TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.checkin_luong(text, int, int)                  TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.checkin_thu_nhap(text, int, int)               TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.checkin_cham_cong(text, text, text, numeric, numeric, text, text, double precision, double precision) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.checkin_bo_sung_gio_ra(text, uuid, text, numeric, numeric) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.checkin_dang_ky_off(text, date, text, text)    TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.checkin_doi_pin(text, text, text)              TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.checkin_doi_avatar(text, text)                 TO anon, authenticated;

-- Bảng phiên/attempt: KHÔNG cấp quyền trực tiếp cho anon (chỉ RPC definer chạm)
REVOKE ALL ON public.checkin_session       FROM anon;
REVOKE ALL ON public.checkin_login_attempt FROM anon;

-- ============================================================================
-- SAU MIGRATION NÀY (bước 1b-3, khi frontend đã chuyển hết sang RPC):
--   REVOKE ALL ON public.nhan_vien, cham_cong, dang_ky_off, yeu_cau_chinh_sua,
--     lich_hen, bang_luong, quy_ngay_off, don_hang_chi_tiet FROM anon;
--   REVOKE SELECT ON public.v_nhan_vien_thu_nhap FROM anon;
--   (nhan_vien: cân nhắc ẩn cột pin_hash/luong_cung khỏi mọi role thường)
-- ============================================================================
