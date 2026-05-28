DO $$
DECLARE
  v_order uuid;
  v_card uuid;
  v_customer uuid;
  v_service uuid;
  v_staff uuid := '275cbbaa-1cdf-493a-9b6d-bee12a1ad4d5';
  v_before_used integer;
  v_before_left integer;
  v_after_used integer;
  v_after_left integer;
  v_void_used integer;
  v_void_left integer;
  v_res jsonb;
BEGIN
  SELECT id, khach_hang_id, dich_vu_id, so_buoi_da_dung, so_buoi_con_lai
  INTO v_card, v_customer, v_service, v_before_used, v_before_left
  FROM the_lieu_trinh
  WHERE ma_the = 'THE-LT-4976'
  FOR UPDATE;

  IF v_card IS NULL THEN
    RAISE EXCEPTION 'Khong tim thay THE-LT-4976';
  END IF;
  IF COALESCE(v_before_left, 0) < 1 THEN
    RAISE EXCEPTION 'THE-LT-4976 khong con buoi de test';
  END IF;

  INSERT INTO don_hang(khach_hang_id, ngay, ghi_chu, is_test)
  VALUES (v_customer, date '2026-05-26', 'HSMS_REAL_TEST_20260526 manual_void_card_usage', false)
  RETURNING id INTO v_order;

  INSERT INTO don_hang_chi_tiet(
    don_hang_id, loai_item, dich_vu_id, the_lieu_trinh_id, nhan_vien_id,
    so_luong, don_gia, thanh_tien, ti_le_hoa_hong, tien_tour, tien_hoa_hong, ghi_chu
  )
  VALUES (
    v_order, 'the_lieu_trinh', v_service, v_card, v_staff,
    1, 0, 0, 5, 20000, 20000, 'HSMS_REAL_TEST manual use then void'
  );

  v_res := pos_finalize_order(v_order, 'da_thanh_toan', 0, 0, 0, 'HSMS_REAL_TEST_20260526 manual_void_card_usage', false);
  IF COALESCE((v_res->>'success')::boolean, false) IS NOT TRUE THEN
    RAISE EXCEPTION 'Finalize failed: %', v_res;
  END IF;

  SELECT so_buoi_da_dung, so_buoi_con_lai
  INTO v_after_used, v_after_left
  FROM the_lieu_trinh
  WHERE id = v_card;

  IF v_after_used <> v_before_used + 1 OR v_after_left <> v_before_left - 1 THEN
    RAISE EXCEPTION 'Card use mismatch before %/% after %/%', v_before_used, v_before_left, v_after_used, v_after_left;
  END IF;

  v_res := pos_void_order(v_order);
  IF COALESCE((v_res->>'success')::boolean, false) IS NOT TRUE THEN
    RAISE EXCEPTION 'Void failed: %', v_res;
  END IF;

  SELECT so_buoi_da_dung, so_buoi_con_lai
  INTO v_void_used, v_void_left
  FROM the_lieu_trinh
  WHERE id = v_card;

  IF v_void_used <> v_before_used OR v_void_left <> v_before_left THEN
    RAISE EXCEPTION 'Card void mismatch before %/% void %/%', v_before_used, v_before_left, v_void_used, v_void_left;
  END IF;
END $$;
