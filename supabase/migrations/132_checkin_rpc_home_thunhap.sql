-- ============================================================================
-- 132_checkin_rpc_home_thunhap.sql
-- GĐ0-A · LỚP 1b — Tinh chỉnh RPC home (lịch hẹn sắp tới + quên check-out)
-- và thu_nhap (toàn thời gian). Chỉ replace, không revoke.
-- ============================================================================

-- ─── Home: chấm công hôm nay + lịch hẹn SẮP TỚI + danh sách quên check-out ───
CREATE OR REPLACE FUNCTION public.checkin_home(p_token text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_nv uuid; v_today date;
BEGIN
  v_nv := public.checkin_resolve(p_token);
  v_today := (public.checkin_now_vn())::date;
  RETURN jsonb_build_object(
    'cham_cong_hom_nay', (SELECT to_jsonb(c) FROM public.cham_cong c
        WHERE c.nhan_vien_id = v_nv AND c.ngay = v_today LIMIT 1),
    -- Lịch hẹn của KTV: hôm nay + sắp tới (chưa huỷ)
    'lich_hen', COALESCE((SELECT jsonb_agg(to_jsonb(l) ORDER BY l.ngay_hen, l.gio_hen)
        FROM public.lich_hen l
        WHERE l.nhan_vien_id = v_nv AND l.ngay_hen >= v_today AND l.trang_thai <> 'huy'), '[]'::jsonb),
    -- Ngày ĐÃ QUA (14 ngày) đi làm nhưng quên check-out (thiếu giờ ra)
    'quen_checkout', COALESCE((SELECT jsonb_agg(jsonb_build_object(
          'id', c.id, 'ngay', c.ngay, 'gio_vao', c.gio_vao, 'gio_ra', c.gio_ra, 'loai', c.loai)
          ORDER BY c.ngay DESC)
        FROM public.cham_cong c
        WHERE c.nhan_vien_id = v_nv AND c.loai = 'di_lam' AND c.gio_ra IS NULL
          AND c.ngay >= v_today - 14 AND c.ngay < v_today), '[]'::jsonb)
  );
END $$;

-- ─── Thu nhập: chi tiết tháng + toàn bộ (all-time) trong 1 call ─────────────
CREATE OR REPLACE FUNCTION public.checkin_thu_nhap(p_token text, p_thang int, p_nam int)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_nv uuid; d1 date; d2 date;
BEGIN
  v_nv := public.checkin_resolve(p_token);
  d1 := make_date(p_nam, p_thang, 1);
  d2 := (d1 + interval '1 month - 1 day')::date;
  RETURN jsonb_build_object(
    -- Chi tiết từng lượt trong THÁNG (tên DV + khách) — chỉ dòng có tour/hoa hồng
    'chi_tiet', COALESCE((SELECT jsonb_agg(jsonb_build_object(
          'id', ct.id, 'thanh_tien', ct.thanh_tien, 'tien_tour', ct.tien_tour,
          'tien_hoa_hong', ct.tien_hoa_hong, 'loai_item', ct.loai_item,
          'ten', COALESCE((SELECT ten FROM public.dich_vu WHERE id = ct.dich_vu_id),
                          (SELECT ten FROM public.kho_san_pham WHERE id = ct.san_pham_id),
                          (SELECT ten_dich_vu FROM public.the_lieu_trinh WHERE id = ct.the_lieu_trinh_id)),
          'khach', (SELECT ho_ten FROM public.khach_hang WHERE id = dh.khach_hang_id),
          'ngay', dh.ngay)
          ORDER BY dh.ngay)
        FROM public.don_hang_chi_tiet ct
        JOIN public.don_hang dh ON dh.id = ct.don_hang_id
        WHERE ct.nhan_vien_id = v_nv AND dh.ngay BETWEEN d1 AND d2
          AND dh.is_test = false AND dh.trang_thai <> 'huy'
          AND ((ct.tien_tour > 0) OR (ct.tien_hoa_hong > 0))), '[]'::jsonb),
    -- Toàn bộ (all-time) từ view — cho tab "Toàn Bộ" + tổng tích luỹ
    'all_rows', COALESCE((SELECT jsonb_agg(jsonb_build_object(
          'id', v.id, 'ngay', v.ngay, 'loai', v.loai, 'so_tien', v.so_tien,
          'doanh_so_tinh', v.doanh_so_tinh, 'ti_le', v.ti_le, 'ghi_chu', v.ghi_chu, 'nguon', v.nguon)
          ORDER BY v.ngay DESC)
        FROM public.v_nhan_vien_thu_nhap v
        WHERE v.nhan_vien_id = v_nv AND v.is_test = false), '[]'::jsonb)
  );
END $$;

GRANT EXECUTE ON FUNCTION public.checkin_home(text)                TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.checkin_thu_nhap(text, int, int)  TO anon, authenticated;
