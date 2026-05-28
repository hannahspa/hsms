DO $$
DECLARE
  v_order uuid;
  v_card uuid;
  v_res jsonb;
  c_nhanh uuid := '0081f5be-17b5-48e8-bd2f-fbc1f978ea3f';
  c_tran uuid := 'b70d0f15-659e-423d-bbea-a64ad1e33eae';
  c_my uuid := '02d1c196-bcd9-4f08-8e4e-61a63c9b1c9f';
  c_mai uuid := 'b4144d1b-3166-4b69-aefa-3a94c8ffc6f8';
  s_aqua uuid := '65558fa0-fc32-42e9-84f5-d6d76ae31d8a';
  s_hifu uuid := '686197e3-e5aa-46fb-8146-81b7366a85c3';
  s_ipl uuid := '381ae869-7748-4f51-b586-6db8d822bc82';
  s_tamtrang uuid := 'a2d5d774-04d6-43f7-a122-1631330dd691';
  s_triet uuid := '870750dd-40ab-45b3-b7b0-e61a34bcf77a';
  nv_linh uuid := '275cbbaa-1cdf-493a-9b6d-bee12a1ad4d5';
  nv_uyen uuid := '58279c3d-194f-44b3-8a45-e9b0b884d588';
  nv_duy uuid := '8acdc809-0592-46de-bc3e-7b728d1b495f';
  nv_phuong uuid := 'ecbb3c01-9df0-43f2-a483-39ea7e3a9f78';
BEGIN
  INSERT INTO don_hang(khach_hang_id, ngay, ghi_chu, is_test)
  VALUES (c_tran, date '2026-05-26', 'HSMS_REAL_TEST_20260526 multi_service_split_discount', false)
  RETURNING id INTO v_order;
  INSERT INTO don_hang_chi_tiet(don_hang_id, loai_item, dich_vu_id, nhan_vien_id, so_luong, don_gia, thanh_tien, ti_le_hoa_hong, tien_tour, tien_hoa_hong, ghi_chu, meta)
  VALUES
    (v_order, 'dich_vu', s_hifu, nv_linh, 1, 4000000, 3900000, 1.125, 45000, 45000, 'HSMS_REAL_TEST line_discount_100k', jsonb_build_object('lineDiscount', 100000)),
    (v_order, 'dich_vu', s_ipl, nv_uyen, 1, 1200000, 1200000, 2.9167, 35000, 35000, 'HSMS_REAL_TEST second_service', jsonb_build_object('lineDiscount', 0));
  INSERT INTO thanh_toan(don_hang_id, hinh_thuc, so_tien, ghi_chu)
  VALUES (v_order, 'tien_mat', 2000000, 'HSMS_REAL_TEST split cash'), (v_order, 'quet_the', 3000000, 'HSMS_REAL_TEST split TP');
  v_res := pos_finalize_order(v_order, 'da_thanh_toan', 100000, 0, 0, 'HSMS_REAL_TEST_20260526 multi_service_split_discount', false);
  IF COALESCE((v_res->>'success')::boolean, false) IS NOT TRUE THEN RAISE EXCEPTION 'Finalize failed: %', v_res; END IF;

  INSERT INTO don_hang(khach_hang_id, ngay, ghi_chu, is_test)
  VALUES (c_my, date '2026-05-26', 'HSMS_REAL_TEST_20260526 partial_debt', false)
  RETURNING id INTO v_order;
  INSERT INTO don_hang_chi_tiet(don_hang_id, loai_item, dich_vu_id, nhan_vien_id, so_luong, don_gia, thanh_tien, ti_le_hoa_hong, tien_tour, tien_hoa_hong, ghi_chu)
  VALUES (v_order, 'dich_vu', s_tamtrang, nv_uyen, 1, 1300000, 1300000, 2.3077, 30000, 30000, 'HSMS_REAL_TEST debt_service');
  INSERT INTO thanh_toan(don_hang_id, hinh_thuc, so_tien, ghi_chu)
  VALUES (v_order, 'chuyen_khoan', 800000, 'HSMS_REAL_TEST paid partial MB');
  v_res := pos_finalize_order(v_order, 'da_thanh_toan', 0, 0, 0, 'HSMS_REAL_TEST_20260526 partial_debt', false);
  IF COALESCE((v_res->>'success')::boolean, false) IS NOT TRUE THEN RAISE EXCEPTION 'Finalize failed: %', v_res; END IF;

  INSERT INTO don_hang(khach_hang_id, ngay, ghi_chu, is_test)
  VALUES (c_nhanh, date '2026-05-26', 'HSMS_REAL_TEST_20260526 sell_new_card', false)
  RETURNING id INTO v_order;
  INSERT INTO don_hang_chi_tiet(don_hang_id, loai_item, dich_vu_id, nhan_vien_id, so_luong, don_gia, thanh_tien, ti_le_hoa_hong, tien_commission, tien_hoa_hong, ghi_chu, meta)
  VALUES (v_order, 'the_moi', s_aqua, nv_duy, 5, 1800000, 1800000, 10, 180000, 180000, 'HSMS_REAL_TEST sell_card', jsonb_build_object('loai','the_lieu_trinh','dichVuId',s_aqua::text,'nhanVienBanId',nv_duy::text,'tenDichVu','AQUA SKIN','soBuoiMua',5,'soBuoiTang',1,'giaTriThe',1800000,'ngayHetHan','2027-05-26'));
  INSERT INTO thanh_toan(don_hang_id, hinh_thuc, so_tien, ghi_chu)
  VALUES (v_order, 'chuyen_khoan', 1800000, 'HSMS_REAL_TEST MB sell card');
  v_res := pos_finalize_order(v_order, 'da_thanh_toan', 0, 0, 0, 'HSMS_REAL_TEST_20260526 sell_new_card', false);
  IF COALESCE((v_res->>'success')::boolean, false) IS NOT TRUE THEN RAISE EXCEPTION 'Finalize failed: %', v_res; END IF;
  SELECT id INTO v_card FROM the_lieu_trinh WHERE don_hang_id = v_order ORDER BY created_at DESC LIMIT 1;

  INSERT INTO don_hang(khach_hang_id, ngay, ghi_chu, is_test)
  VALUES (c_nhanh, date '2026-05-26', 'HSMS_REAL_TEST_20260526 use_new_card', false)
  RETURNING id INTO v_order;
  INSERT INTO don_hang_chi_tiet(don_hang_id, loai_item, dich_vu_id, the_lieu_trinh_id, nhan_vien_id, so_luong, don_gia, thanh_tien, ti_le_hoa_hong, tien_tour, tien_hoa_hong, ghi_chu)
  VALUES (v_order, 'the_lieu_trinh', s_aqua, v_card, nv_linh, 1, 0, 0, 5, 20000, 20000, 'HSMS_REAL_TEST use_card_no_payment');
  v_res := pos_finalize_order(v_order, 'da_thanh_toan', 0, 0, 0, 'HSMS_REAL_TEST_20260526 use_new_card', false);
  IF COALESCE((v_res->>'success')::boolean, false) IS NOT TRUE THEN RAISE EXCEPTION 'Finalize failed: %', v_res; END IF;

  INSERT INTO don_hang(khach_hang_id, ngay, ghi_chu, is_test)
  VALUES (c_mai, date '2026-05-26', 'HSMS_REAL_TEST_20260526 sell_combo', false)
  RETURNING id INTO v_order;
  INSERT INTO don_hang_chi_tiet(don_hang_id, loai_item, dich_vu_id, nhan_vien_id, so_luong, don_gia, thanh_tien, ti_le_hoa_hong, tien_commission, tien_hoa_hong, ghi_chu, meta)
  VALUES (v_order, 'the_moi', s_triet, nv_phuong, 12, 3500000, 3500000, 5.7143, 200000, 200000, 'HSMS_REAL_TEST sell_combo', jsonb_build_object('loai','combo_lieu_trinh','dichVuId',s_triet::text,'nhanVienBanId',nv_phuong::text,'tenDichVu','Combo Triệt Lông Toàn Thân 12 tháng','soBuoiMua',12,'soBuoiTang',0,'giaTriThe',3500000,'ngayHetHan','2027-05-26'));
  INSERT INTO thanh_toan(don_hang_id, hinh_thuc, so_tien, ghi_chu)
  VALUES (v_order, 'quet_the', 3500000, 'HSMS_REAL_TEST TP combo');
  v_res := pos_finalize_order(v_order, 'da_thanh_toan', 0, 0, 0, 'HSMS_REAL_TEST_20260526 sell_combo', false);
  IF COALESCE((v_res->>'success')::boolean, false) IS NOT TRUE THEN RAISE EXCEPTION 'Finalize failed: %', v_res; END IF;

  INSERT INTO don_hang(khach_hang_id, ngay, ghi_chu, is_test)
  VALUES (c_tran, date '2026-05-26', 'HSMS_REAL_TEST_20260526 void_order_before_void', false)
  RETURNING id INTO v_order;
  INSERT INTO don_hang_chi_tiet(don_hang_id, loai_item, dich_vu_id, nhan_vien_id, so_luong, don_gia, thanh_tien, ti_le_hoa_hong, tien_tour, tien_hoa_hong, ghi_chu)
  VALUES (v_order, 'dich_vu', s_aqua, nv_linh, 1, 400000, 400000, 5, 20000, 20000, 'HSMS_REAL_TEST void_service');
  INSERT INTO thanh_toan(don_hang_id, hinh_thuc, so_tien, ghi_chu)
  VALUES (v_order, 'tien_mat', 400000, 'HSMS_REAL_TEST cash before void');
  v_res := pos_finalize_order(v_order, 'da_thanh_toan', 0, 0, 0, 'HSMS_REAL_TEST_20260526 void_order_before_void', false);
  IF COALESCE((v_res->>'success')::boolean, false) IS NOT TRUE THEN RAISE EXCEPTION 'Finalize failed: %', v_res; END IF;
  v_res := pos_void_order(v_order);
  IF COALESCE((v_res->>'success')::boolean, false) IS NOT TRUE THEN RAISE EXCEPTION 'Void failed: %', v_res; END IF;
END $$;
