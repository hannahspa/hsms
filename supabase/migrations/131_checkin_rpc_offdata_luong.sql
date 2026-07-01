-- ============================================================================
-- 131_checkin_rpc_offdata_luong.sql
-- GĐ0-A · LỚP 1b — RPC bổ sung cho màn Đăng Ký OFF + mở rộng Lương (Lễ Tân)
-- Chỉ THÊM/replace RPC, không revoke → an toàn.
-- ============================================================================

-- ─── Dữ liệu màn Đăng Ký OFF: đồng nghiệp cùng bộ phận + lịch OFF tháng + lịch sử của mình
CREATE OR REPLACE FUNCTION public.checkin_off_data(p_token text, p_thang int, p_nam int)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_nv uuid; v_vitri text; d1 date; d2 date;
BEGIN
  v_nv := public.checkin_resolve(p_token);
  SELECT vi_tri INTO v_vitri FROM public.nhan_vien WHERE id = v_nv;
  d1 := make_date(p_nam, p_thang, 1);
  d2 := (d1 + interval '1 month - 1 day')::date;
  RETURN jsonb_build_object(
    'vi_tri', v_vitri,
    -- đồng nghiệp cùng bộ phận (id + họ tên để client rút gọn) — để hiển thị ai đã OFF
    'dong_nghiep', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', id, 'ho_ten', ho_ten))
        FROM public.nhan_vien WHERE vi_tri = v_vitri AND trang_thai = 'dang_lam'), '[]'::jsonb),
    -- lịch OFF cả bộ phận trong tháng (chỉ trạng thái chờ/duyệt) — để tô lịch
    'off_thang', COALESCE((SELECT jsonb_agg(jsonb_build_object(
          'ngay_off', o.ngay_off, 'nhan_vien_id', o.nhan_vien_id,
          'trang_thai', o.trang_thai, 'loai_off', o.loai_off))
        FROM public.dang_ky_off o
        JOIN public.nhan_vien n ON n.id = o.nhan_vien_id AND n.vi_tri = v_vitri AND n.trang_thai = 'dang_lam'
        WHERE o.ngay_off BETWEEN d1 AND d2 AND o.trang_thai IN ('cho_duyet', 'duoc_duyet')), '[]'::jsonb),
    -- lịch sử OFF của CHÍNH MÌNH (15 gần nhất)
    'lich_su', COALESCE((SELECT jsonb_agg(to_jsonb(o) ORDER BY o.ngay_off DESC)
        FROM (SELECT * FROM public.dang_ky_off WHERE nhan_vien_id = v_nv
              ORDER BY ngay_off DESC LIMIT 15) o), '[]'::jsonb)
  );
END $$;

-- ─── Xin đổi ngày OFF (gửi yêu cầu chỉnh sửa → Admin duyệt) ──────────────────
CREATE OR REPLACE FUNCTION public.checkin_xin_doi_off(
  p_token text, p_off_id uuid, p_ngay_cu date, p_loai_off text, p_ngay_moi date)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_nv uuid; v_ten text;
BEGIN
  v_nv := public.checkin_resolve(p_token);
  -- Chỉ cho đổi đơn OFF CỦA CHÍNH MÌNH
  IF NOT EXISTS (SELECT 1 FROM public.dang_ky_off WHERE id = p_off_id AND nhan_vien_id = v_nv) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Không tìm thấy đơn OFF của bạn');
  END IF;
  SELECT ho_ten INTO v_ten FROM public.nhan_vien WHERE id = v_nv;
  INSERT INTO public.yeu_cau_chinh_sua(loai_bang, ban_ghi_id, loai_yeu_cau, trang_thai,
      du_lieu_cu, du_lieu_moi, ly_do, nguoi_yeu_cau)
    VALUES ('dang_ky_off', p_off_id, 'sua', 'cho_duyet',
      jsonb_build_object('ngay_off', p_ngay_cu, 'loai_off', p_loai_off, 'nhan_vien_ten', v_ten),
      jsonb_build_object('ngay_off', p_ngay_moi),
      v_ten || ' xin đổi ngày OFF ' || to_char(p_ngay_cu,'DD/MM/YYYY') || ' → ' || to_char(p_ngay_moi,'DD/MM/YYYY'),
      v_ten);
  RETURN jsonb_build_object('success', true);
END $$;

-- ─── Mở rộng checkin_luong: thêm khối Lễ Tân (lương KD công thức doanh số) ───
CREATE OR REPLACE FUNCTION public.checkin_luong(p_token text, p_thang int, p_nam int)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_nv uuid; v_vitri text; d1 date; d2 date; v_kd jsonb; v_letan jsonb;
BEGIN
  v_nv := public.checkin_resolve(p_token);
  SELECT vi_tri INTO v_vitri FROM public.nhan_vien WHERE id = v_nv;
  d1 := make_date(p_nam, p_thang, 1);
  d2 := (d1 + interval '1 month - 1 day')::date;

  IF v_vitri = 'le_tan' THEN
    v_kd := public.luong_kd_summary(p_thang, p_nam);   -- tổng hợp doanh số (dùng cho công thức)
    v_letan := COALESCE((SELECT jsonb_agg(jsonb_build_object('id', id))
        FROM public.nhan_vien WHERE vi_tri = 'le_tan' AND trang_thai = 'dang_lam'), '[]'::jsonb);
  END IF;

  RETURN jsonb_build_object(
    'vi_tri', v_vitri,
    'cham_cong', COALESCE((SELECT jsonb_agg(to_jsonb(c)) FROM public.cham_cong c
        WHERE c.nhan_vien_id = v_nv AND c.ngay BETWEEN d1 AND d2), '[]'::jsonb),
    'bang_luong', (SELECT to_jsonb(b) FROM public.bang_luong b
        WHERE b.nhan_vien_id = v_nv AND b.thang = p_thang AND b.nam = p_nam LIMIT 1),
    'quy_ngay_off', (SELECT to_jsonb(q) FROM public.quy_ngay_off q
        WHERE q.nhan_vien_id = v_nv AND q.nam = p_nam LIMIT 1),
    'pos_thu_nhap', COALESCE((SELECT jsonb_agg(jsonb_build_object('loai', v.loai, 'so_tien', v.so_tien))
        FROM public.v_nhan_vien_thu_nhap v
        WHERE v.nhan_vien_id = v_nv AND v.ngay BETWEEN d1 AND d2 AND v.is_test = false), '[]'::jsonb),
    'letan_kd', v_kd,          -- null nếu KTV
    'letan_ids', v_letan       -- null nếu KTV
  );
END $$;

GRANT EXECUTE ON FUNCTION public.checkin_off_data(text, int, int)                TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.checkin_xin_doi_off(text, uuid, date, text, date) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.checkin_luong(text, int, int)                    TO anon, authenticated;
