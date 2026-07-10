-- ═══════════════════════════════════════════════════════════════════════════
-- 145 · CHỐNG TRÙNG YÊU CẦU CHECKIN (09/07/2026)
-- Anh Nam: NV bấm gửi mà "không thấy tác dụng" → bấm lại nhiều lần → tạo yêu
-- cầu TRÙNG (vd Tường Uyên 3 yêu cầu 'dùng ngày lễ' giống hệt). Client báo
-- 'đã gửi' chỉ 5s rồi mất nên NV tưởng chưa gửi.
-- VÁ TẬN GỐC Ở RPC (mọi client đều qua đây): nếu ĐÃ CÓ yêu cầu CHỜ DUYỆT
-- giống → KHÔNG tạo mới, trả cờ 'already' để client báo "đã gửi, chờ duyệt".
-- Giữ nguyên logic tạo mới khi chưa có.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. Xin dùng ngày lễ: trùng theo (NV + tháng + năm) đang chờ ──────────────
CREATE OR REPLACE FUNCTION public.checkin_xin_dung_ngay_le(p_token text, p_so_ngay numeric, p_ov numeric, p_thang integer, p_nam integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_nv uuid; v_ten text; v_quy_id uuid;
BEGIN
  v_nv := public.checkin_resolve(p_token);
  IF p_so_ngay IS NULL OR p_so_ngay <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Số ngày không hợp lệ');
  END IF;

  -- CHỐNG TRÙNG: đã có yêu cầu dùng ngày lễ CHỜ DUYỆT của NV này cho tháng/năm này?
  IF EXISTS (
    SELECT 1 FROM public.yeu_cau_chinh_sua
    WHERE loai_yeu_cau = 'dung_ngay_le' AND trang_thai = 'cho_duyet'
      AND du_lieu_cu->>'nhan_vien_id' = v_nv::text
      AND COALESCE(du_lieu_moi->>'thang','') = p_thang::text
      AND COALESCE(du_lieu_moi->>'nam','')   = p_nam::text
  ) THEN
    RETURN jsonb_build_object('success', true, 'already', true,
      'message', 'Bạn đã gửi yêu cầu này rồi, đang chờ Admin duyệt.');
  END IF;

  SELECT ho_ten INTO v_ten FROM public.nhan_vien WHERE id = v_nv;
  SELECT id INTO v_quy_id FROM public.quy_ngay_off WHERE nhan_vien_id = v_nv AND nam = p_nam LIMIT 1;

  INSERT INTO public.yeu_cau_chinh_sua(loai_bang, ban_ghi_id, loai_yeu_cau, trang_thai,
      du_lieu_cu, du_lieu_moi, ly_do, nguoi_yeu_cau)
    VALUES ('quy_ngay_off', v_quy_id, 'dung_ngay_le', 'cho_duyet',
      jsonb_build_object('nhan_vien_id', v_nv, 'nhan_vien_ten', v_ten),
      jsonb_build_object('so_dung_thang_nay', p_so_ngay, 'thang', p_thang, 'nam', p_nam),
      v_ten || ' yêu cầu dùng ' || p_so_ngay || ' ngày lễ tích luỹ bù ' || p_ov || ' ngày OV tháng ' || p_thang || '/' || p_nam,
      v_ten);
  RETURN jsonb_build_object('success', true);
END $function$;

-- ── 2. Xin đổi ngày OFF: trùng theo đơn OFF (ban_ghi_id) đang chờ ────────────
CREATE OR REPLACE FUNCTION public.checkin_xin_doi_off(p_token text, p_off_id uuid, p_ngay_cu date, p_loai_off text, p_ngay_moi date)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_nv uuid; v_ten text;
BEGIN
  v_nv := public.checkin_resolve(p_token);
  IF NOT EXISTS (SELECT 1 FROM public.dang_ky_off WHERE id = p_off_id AND nhan_vien_id = v_nv) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Không tìm thấy đơn OFF của bạn');
  END IF;

  -- CHỐNG TRÙNG: đã có yêu cầu đổi CHÍNH đơn OFF này đang chờ duyệt?
  IF EXISTS (
    SELECT 1 FROM public.yeu_cau_chinh_sua
    WHERE loai_yeu_cau = 'sua' AND loai_bang = 'dang_ky_off'
      AND ban_ghi_id = p_off_id AND trang_thai = 'cho_duyet'
  ) THEN
    RETURN jsonb_build_object('success', true, 'already', true,
      'message', 'Bạn đã gửi yêu cầu đổi ngày OFF này rồi, đang chờ Admin duyệt.');
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
END $function$;
