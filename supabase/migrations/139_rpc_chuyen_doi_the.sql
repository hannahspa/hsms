-- ============================================================
-- MIGRATION 139: RPC chuyển đổi thẻ liệu trình A → B (Admin)
-- Ngày: 01/07/2026
-- Nghiệp vụ (anh Nam chốt):
--   - Giá trị quy đổi thẻ A = giá gốc/buổi × buổi CHƯA dùng (bỏ khuyến mãi/tặng).
--     (client tính sẵn qua computeCardConvertValue, truyền p_gia_tri_quy_doi)
--   - Bù tiền = giá thẻ B − quy đổi (KHÔNG âm; đổi xuống gói rẻ hơn KHÔNG hoàn dư).
--   - Tạo ĐƠN HÀNG bán thẻ B (giảm giá = quy đổi) → doanh thu = bù tiền.
--   - Thẻ A đóng: trang_thai='chuyen_doi', bi_dong=true, ghi chú "đã chuyển sang B".
-- TÁI DÙNG pos_finalize_order để tạo thẻ B + ghi doanh thu + cập nhật CRM (đồng nhất POS).
-- Toàn bộ trong 1 transaction.
-- ============================================================

CREATE OR REPLACE FUNCTION chuyen_doi_the(
  p_the_cu_id        uuid,
  p_gia_tri_quy_doi  integer,
  p_ten_dich_vu      text,
  p_dich_vu_id       uuid,
  p_so_buoi_mua      integer,
  p_so_buoi_tang     integer,
  p_gia_tri_the      integer,        -- giá thẻ B
  p_ngay_het_han     date,
  p_nhan_vien_ban_id uuid,           -- NULL = không tính hoa hồng bán
  p_payments         jsonb,          -- [{hinh_thuc, so_tien}] cho phần bù
  p_nguoi            text DEFAULT NULL,
  p_nguoi_id         uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_card_cu    the_lieu_trinh%ROWTYPE;
  v_kh         uuid;
  v_don_id     uuid;
  v_ma_don     text;
  v_bu         integer;
  v_giam       integer;
  v_the_moi_id uuid;
  v_pay        jsonb;
  v_fin        jsonb;
BEGIN
  IF p_gia_tri_the IS NULL OR p_gia_tri_the <= 0 THEN
    RAISE EXCEPTION 'Giá thẻ mới không hợp lệ';
  END IF;

  SELECT * INTO v_card_cu FROM the_lieu_trinh WHERE id = p_the_cu_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Không tìm thấy thẻ cũ %', p_the_cu_id; END IF;
  v_kh := v_card_cu.khach_hang_id;
  IF v_kh IS NULL THEN RAISE EXCEPTION 'Thẻ cũ không gắn khách hàng — không chuyển đổi được'; END IF;

  -- Bù tiền = giá B − quy đổi (không âm). Giảm giá đơn = phần quy đổi thực dùng.
  v_bu   := GREATEST(0, p_gia_tri_the - GREATEST(0, COALESCE(p_gia_tri_quy_doi, 0)));
  v_giam := p_gia_tri_the - v_bu;   -- = min(quy đổi, giá B)

  -- 1) Đơn hàng draft (ma_don tự sinh)
  INSERT INTO don_hang (khach_hang_id, nguoi_tao, ngay, ghi_chu)
  VALUES (v_kh, p_nguoi_id, CURRENT_DATE,
          'Chuyển đổi thẻ: ' || COALESCE(v_card_cu.ten_dich_vu, '') || ' → ' || p_ten_dich_vu)
  RETURNING id, ma_don INTO v_don_id, v_ma_don;

  -- 2) Dòng thẻ mới (the_moi) — pos_finalize_order sẽ tạo the_lieu_trinh từ meta
  INSERT INTO don_hang_chi_tiet (
    don_hang_id, loai_item, dich_vu_id, nhan_vien_id, so_luong, don_gia, thanh_tien,
    tien_tour, tien_hoa_hong, meta
  ) VALUES (
    v_don_id, 'the_moi', p_dich_vu_id, p_nhan_vien_ban_id, 1, p_gia_tri_the, p_gia_tri_the,
    0, 0,
    jsonb_build_object(
      'soBuoiMua', p_so_buoi_mua, 'soBuoiTang', p_so_buoi_tang, 'giaTriThe', p_gia_tri_the,
      'dichVuId', p_dich_vu_id, 'nhanVienBanId', p_nhan_vien_ban_id, 'tenDichVu', p_ten_dich_vu,
      'ngayHetHan', CASE WHEN p_ngay_het_han IS NULL THEN NULL ELSE to_char(p_ngay_het_han, 'YYYY-MM-DD') END,
      'chuyenDoiTuTheId', p_the_cu_id
    )
  );

  -- 3) Thanh toán phần bù (nếu > 0)
  IF v_bu > 0 THEN
    FOR v_pay IN SELECT * FROM jsonb_array_elements(COALESCE(p_payments, '[]'::jsonb)) LOOP
      IF COALESCE((v_pay->>'so_tien')::integer, 0) > 0 THEN
        INSERT INTO thanh_toan (don_hang_id, hinh_thuc, so_tien)
        VALUES (v_don_id, v_pay->>'hinh_thuc', (v_pay->>'so_tien')::integer);
      END IF;
    END LOOP;
  END IF;

  -- 4) Finalize → tạo thẻ B + ghi doanh thu (= bù) + cập nhật CRM/công nợ
  v_fin := pos_finalize_order(v_don_id, 'da_thanh_toan', v_giam, 0, 0, NULL, false);
  IF NOT COALESCE((v_fin->>'success')::boolean, false) THEN
    RAISE EXCEPTION 'Chuyển đổi thất bại khi chốt đơn: %', COALESCE(v_fin->>'error', 'không rõ');
  END IF;

  -- 5) Thẻ B vừa tạo → gắn nguồn chuyển đổi
  SELECT id INTO v_the_moi_id FROM the_lieu_trinh
   WHERE don_hang_id = v_don_id ORDER BY created_at DESC LIMIT 1;
  IF v_the_moi_id IS NOT NULL THEN
    UPDATE the_lieu_trinh SET chuyen_tu_the_id = p_the_cu_id WHERE id = v_the_moi_id;
  END IF;

  -- 6) Đóng thẻ A + ghi chú
  UPDATE the_lieu_trinh SET
    trang_thai         = 'chuyen_doi',
    bi_dong            = true,
    chuyen_sang_the_id = v_the_moi_id,
    ghi_chu            = TRIM(BOTH ' ' FROM COALESCE(ghi_chu, '')
                          || ' | Đã chuyển sang thẻ mới "' || p_ten_dich_vu || '" (đơn ' || COALESCE(v_ma_don, '')
                          || '), quy đổi ' || to_char(GREATEST(0, COALESCE(p_gia_tri_quy_doi, 0)), 'FM999,999,999') || 'đ')
  WHERE id = p_the_cu_id;

  -- 7) Nhật ký
  INSERT INTO nhat_ky_hoat_dong (nguoi_dung_id, hanh_dong, bang, du_lieu_cu, du_lieu_moi)
  VALUES (
    p_nguoi_id, 'chuyen_doi_the', 'the_lieu_trinh',
    to_jsonb(v_card_cu),
    jsonb_build_object('the_cu_id', p_the_cu_id, 'the_moi_id', v_the_moi_id, 'don_hang_id', v_don_id,
                       'ma_don', v_ma_don, 'quy_doi', p_gia_tri_quy_doi, 'gia_the_moi', p_gia_tri_the, 'bu_tien', v_bu)
  );

  RETURN jsonb_build_object('ok', true, 'don_hang_id', v_don_id, 'ma_don', v_ma_don,
                            'the_moi_id', v_the_moi_id, 'bu_tien', v_bu);
END;
$$;
