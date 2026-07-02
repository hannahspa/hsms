-- ============================================================
-- MIGRATION 138: RPC hoàn tiền thẻ liệu trình (Admin)
-- Ngày: 01/07/2026
-- Anh Nam chốt: hoàn bằng Tiền Mặt/CK → GHI VÀO SỔ CHI (chi_phi) → trừ ví thật.
-- Toàn bộ trong 1 transaction (an toàn vì đụng tiền).
--   1) INSERT chi_phi (danh mục "Hoàn tiền khách hàng") theo hình thức + ví
--   2) UPDATE thẻ: trang_thai='hoan_tien', bi_dong=true, ghi chú
--   3) INSERT nhat_ky_hoat_dong
-- Ví suy ra từ hình thức (tien_mat/chuyen_khoan/quet_the) — khớp cách view tính chi.
-- ============================================================

CREATE OR REPLACE FUNCTION hoan_tien_the(
  p_the_id     uuid,
  p_so_tien    bigint,
  p_hinh_thuc  text,           -- tien_mat | chuyen_khoan | quet_the
  p_ly_do      text DEFAULT NULL,
  p_nguoi      text DEFAULT NULL,
  p_nguoi_id   uuid DEFAULT NULL,
  p_ngay       date DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_card       the_lieu_trinh%ROWTYPE;
  v_danh_muc   uuid;
  v_vi         uuid;
  v_chi_phi    uuid;
  v_ngay       date := COALESCE(p_ngay, CURRENT_DATE);
BEGIN
  IF p_so_tien IS NULL OR p_so_tien <= 0 THEN
    RAISE EXCEPTION 'Số tiền hoàn phải lớn hơn 0';
  END IF;
  IF p_hinh_thuc NOT IN ('tien_mat','chuyen_khoan','quet_the') THEN
    RAISE EXCEPTION 'Hình thức không hợp lệ: %', p_hinh_thuc;
  END IF;

  SELECT * INTO v_card FROM the_lieu_trinh WHERE id = p_the_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Không tìm thấy thẻ liệu trình %', p_the_id;
  END IF;

  -- Danh mục chi phí "Hoàn tiền khách hàng" (tạo nếu chưa có)
  SELECT id INTO v_danh_muc FROM danh_muc_chi_phi WHERE ten = 'Hoàn tiền khách hàng' LIMIT 1;
  IF v_danh_muc IS NULL THEN
    INSERT INTO danh_muc_chi_phi (ten, icon, parent_id, thu_tu, is_active)
    VALUES ('Hoàn tiền khách hàng', '💵', NULL, 99, true)
    RETURNING id INTO v_danh_muc;
  END IF;

  -- Ví theo hình thức (tien_mat/chuyen_khoan/quet_the)
  SELECT id INTO v_vi FROM vi WHERE loai = p_hinh_thuc::loai_vi LIMIT 1;

  INSERT INTO chi_phi (ngay, danh_muc_id, so_tien, hinh_thuc_thanh_toan, vi_id, nguoi_nhap, dien_giai)
  VALUES (
    v_ngay, v_danh_muc, p_so_tien, p_hinh_thuc, v_vi, COALESCE(p_nguoi, 'Admin'),
    'Hoàn tiền thẻ "' || COALESCE(v_card.ten_dich_vu, '') || '"'
      || CASE WHEN p_ly_do IS NOT NULL AND p_ly_do <> '' THEN ' — ' || p_ly_do ELSE '' END
  )
  RETURNING id INTO v_chi_phi;

  UPDATE the_lieu_trinh
  SET trang_thai = 'hoan_tien',
      bi_dong    = true,
      ghi_chu    = TRIM(BOTH ' ' FROM COALESCE(ghi_chu, '') || ' | Hoàn tiền '
                   || to_char(p_so_tien, 'FM999,999,999') || 'đ ('
                   || v_ngay || ')' || COALESCE(' — ' || p_ly_do, ''))
  WHERE id = p_the_id;

  INSERT INTO nhat_ky_hoat_dong (nguoi_dung_id, hanh_dong, bang, du_lieu_cu, du_lieu_moi)
  VALUES (
    p_nguoi_id, 'hoan_tien_the', 'the_lieu_trinh',
    to_jsonb(v_card),
    jsonb_build_object('the_id', p_the_id, 'so_tien', p_so_tien, 'hinh_thuc', p_hinh_thuc,
                       'chi_phi_id', v_chi_phi, 'ly_do', p_ly_do)
  );

  RETURN jsonb_build_object('ok', true, 'chi_phi_id', v_chi_phi);
END;
$$;
