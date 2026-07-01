-- ============================================================================
-- 133_checkin_luong_chitiet.sql
-- GĐ0-A · LỚP 1b — checkin_luong: thêm 'chi_tiet' (từng lượt tour/hoa hồng tháng)
-- để màn Lương KTV hiển thị danh sách đã làm. Chỉ replace, không revoke.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.checkin_luong(p_token text, p_thang int, p_nam int)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_nv uuid; v_vitri text; d1 date; d2 date; v_kd jsonb; v_letan jsonb;
BEGIN
  v_nv := public.checkin_resolve(p_token);
  SELECT vi_tri INTO v_vitri FROM public.nhan_vien WHERE id = v_nv;
  d1 := make_date(p_nam, p_thang, 1);
  d2 := (d1 + interval '1 month - 1 day')::date;

  IF v_vitri = 'le_tan' THEN
    v_kd := public.luong_kd_summary(p_thang, p_nam);
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
    'chi_tiet', COALESCE((SELECT jsonb_agg(jsonb_build_object(
          'id', ct.id, 'thanh_tien', ct.thanh_tien, 'tien_tour', ct.tien_tour,
          'tien_hoa_hong', ct.tien_hoa_hong, 'ti_le_hoa_hong', ct.ti_le_hoa_hong, 'loai_item', ct.loai_item,
          'ten', COALESCE((SELECT ten FROM public.dich_vu WHERE id = ct.dich_vu_id),
                          (SELECT ten FROM public.kho_san_pham WHERE id = ct.san_pham_id),
                          (SELECT ten_dich_vu FROM public.the_lieu_trinh WHERE id = ct.the_lieu_trinh_id)),
          'khach', (SELECT ho_ten FROM public.khach_hang WHERE id = dh.khach_hang_id),
          'ngay', dh.ngay, 'ma_don', dh.ma_don, 'trang_thai', dh.trang_thai)
          ORDER BY dh.ngay)
        FROM public.don_hang_chi_tiet ct
        JOIN public.don_hang dh ON dh.id = ct.don_hang_id
        WHERE ct.nhan_vien_id = v_nv AND dh.ngay BETWEEN d1 AND d2
          AND dh.is_test = false AND dh.trang_thai <> 'huy'
          AND ((ct.tien_tour > 0) OR (ct.tien_hoa_hong > 0))), '[]'::jsonb),
    'letan_kd', v_kd,
    'letan_ids', v_letan
  );
END $$;

GRANT EXECUTE ON FUNCTION public.checkin_luong(text, int, int) TO anon, authenticated;
