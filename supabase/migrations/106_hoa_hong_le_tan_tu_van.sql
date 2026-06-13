-- ============================================================
-- MIGRATION 106: Ghi hoa hồng LỄ TÂN TƯ VẤN khi bán thẻ (chia 7/3)
-- Ngày: 12/06/2026
-- Bối cảnh: RPC 068 chỉ ghi hoa hồng cho 1 người (KTV bán / nhan_vien_id).
--   Khi đơn bán thẻ có chia thêm Lễ tân tư vấn (meta.nhanVienTuVanLtId +
--   meta.tiLeCommLt), phần hoa hồng Lễ tân BỊ MẤT hoàn toàn (không vào lương).
-- Fix: GIỮ NGUYÊN toàn bộ logic 068, CHỈ THÊM 1 block ghi 1 dòng hoa hồng
--   riêng cho Lễ tân tư vấn (don_hang_chi_tiet_id = NULL → không đụng unique).
--   Base hoa hồng LT = base của KTV (đã = thực thu nhờ frontend) × (ltPct/ktvPct).
--   Chỉ ghi khi: có nvLT, tiLeLt>0, tiLeKtv>0, và nvLT KHÁC người bán
--   (tránh double khi 1 người vừa bán vừa là LT — đã ghi qua dòng chính).
-- ============================================================

CREATE OR REPLACE FUNCTION pos_finalize_order(
  p_don_hang_id       uuid,
  p_trang_thai        text,
  p_giam_gia          integer  DEFAULT 0,
  p_vat               integer  DEFAULT 0,
  p_con_no            integer  DEFAULT 0,
  p_ghi_chu           text     DEFAULT NULL,
  p_skip_doanh_thu    boolean  DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_dh              don_hang%ROWTYPE;
  v_item            record;
  v_payment         record;
  v_card            record;
  v_tong_tien       integer := 0;
  v_line_count      integer := 0;
  v_thuc_thu        integer := 0;
  v_total_paid      integer := 0;
  v_con_no          integer := 0;
  v_so_buoi_mua     integer := 0;
  v_so_buoi_tang    integer := 0;
  v_so_buoi_tong    integer := 0;
  v_gia_tri_the     integer := 0;
  v_created_cards   integer := 0;
  v_is_test         boolean := false;
  v_tour_amount     integer := 0;
  v_comm_amount     integer := 0;
  -- ➕ Biến cho hoa hồng Lễ tân tư vấn
  v_nv_lt_id        uuid;
  v_ti_le_lt        numeric := 0;
  v_ti_le_ktv       numeric := 0;
  v_lt_amount       integer := 0;
  v_ratio           numeric := 1;
BEGIN
  SELECT * INTO v_dh
  FROM don_hang
  WHERE id = p_don_hang_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Don hang khong ton tai');
  END IF;

  IF v_dh.trang_thai != 'draft' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Don hang da duoc chot truoc do');
  END IF;

  v_is_test := COALESCE(v_dh.is_test, false) OR COALESCE(p_skip_doanh_thu, false);

  SELECT COALESCE(SUM(thanh_tien), 0), COUNT(*)
  INTO v_tong_tien, v_line_count
  FROM don_hang_chi_tiet
  WHERE don_hang_id = p_don_hang_id;

  IF v_line_count = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Don hang chua co dong hang hop le');
  END IF;

  SELECT COALESCE(SUM(so_tien), 0) INTO v_total_paid
  FROM thanh_toan
  WHERE don_hang_id = p_don_hang_id;

  IF EXISTS (
    SELECT 1
    FROM thanh_toan
    WHERE don_hang_id = p_don_hang_id
      AND hinh_thuc NOT IN ('tien_mat', 'chuyen_khoan', 'quet_the', 'the_tra_truoc')
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Hinh thuc thanh toan khong hop le');
  END IF;

  IF v_dh.khach_hang_id IS NULL AND EXISTS (
    SELECT 1 FROM thanh_toan
    WHERE don_hang_id = p_don_hang_id AND hinh_thuc = 'the_tra_truoc'
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Thanh toan bang the tra truoc bat buoc phai chon khach hang');
  END IF;

  v_thuc_thu := GREATEST(0, v_tong_tien - COALESCE(p_giam_gia, 0) + COALESCE(p_vat, 0));
  v_con_no := GREATEST(0, v_thuc_thu - v_total_paid);

  IF v_con_no > 0 AND v_dh.khach_hang_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Khach le khong duoc ghi no. Vui long thanh toan du.');
  END IF;

  FOR v_item IN
    SELECT *
    FROM don_hang_chi_tiet
    WHERE don_hang_id = p_don_hang_id
    ORDER BY created_at
  LOOP
    IF NOT v_is_test AND v_item.loai_item = 'san_pham' THEN
      IF NOT EXISTS (
        SELECT 1
        FROM kho_san_pham
        WHERE id = v_item.san_pham_id
          AND ton_kho >= v_item.so_luong
      ) THEN
        RETURN jsonb_build_object('success', false, 'error', 'San pham khong du ton kho de chot don');
      END IF;
    END IF;

    IF NOT v_is_test AND v_item.loai_item = 'the_lieu_trinh' THEN
      SELECT * INTO v_card
      FROM the_lieu_trinh
      WHERE id = v_item.the_lieu_trinh_id
      FOR UPDATE;

      IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'The lieu trinh khong ton tai');
      END IF;

      IF COALESCE(v_card.so_buoi_con_lai, 0) < v_item.so_luong THEN
        RETURN jsonb_build_object('success', false, 'error', 'The lieu trinh khong du so buoi con lai');
      END IF;
    END IF;

    IF v_item.loai_item = 'the_moi' THEN
      IF v_dh.khach_hang_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Mua the lieu trinh bat buoc phai chon khach hang');
      END IF;

      IF v_item.nhan_vien_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Mua the lieu trinh bat buoc chon nhan vien ban');
      END IF;

      v_so_buoi_mua := COALESCE((v_item.meta->>'soBuoiMua')::integer, v_item.so_luong, 0);
      v_so_buoi_tang := COALESCE((v_item.meta->>'soBuoiTang')::integer, 0);
      v_so_buoi_tong := v_so_buoi_mua + v_so_buoi_tang;

      IF v_so_buoi_mua <= 0 OR v_so_buoi_tong <= 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Thong tin the moi thieu so buoi');
      END IF;
    END IF;
  END LOOP;

  UPDATE don_hang SET
    tong_tien_hang = v_tong_tien,
    giam_gia       = COALESCE(p_giam_gia, 0),
    vat            = COALESCE(p_vat, 0),
    thuc_thu       = v_thuc_thu,
    con_no         = v_con_no,
    trang_thai     = CASE WHEN v_con_no = 0 THEN 'da_thanh_toan' ELSE 'no_mot_phan' END,
    ghi_chu        = COALESCE(p_ghi_chu, v_dh.ghi_chu),
    tien_tour      = COALESCE((
      SELECT SUM(COALESCE(tien_tour, 0) + COALESCE(tien_hoa_hong, 0))
      FROM don_hang_chi_tiet
      WHERE don_hang_id = p_don_hang_id
    ), 0),
    updated_at     = now()
  WHERE id = p_don_hang_id;

  DELETE FROM nhan_vien_thu_nhap WHERE don_hang_id = p_don_hang_id;

  -- Tỉ lệ đã trả (debt-aware): đơn trả đủ → 1
  v_ratio := CASE WHEN v_thuc_thu > 0 THEN LEAST(1.0, v_total_paid::numeric / v_thuc_thu) ELSE 1 END;

  FOR v_item IN
    SELECT *
    FROM don_hang_chi_tiet
    WHERE don_hang_id = p_don_hang_id
    ORDER BY created_at
  LOOP
    IF v_item.nhan_vien_id IS NOT NULL THEN
      -- Tiền Tour: dich_vu, the_lieu_trinh
      v_tour_amount := CASE
        WHEN v_item.loai_item IN ('dich_vu', 'the_lieu_trinh')
        THEN COALESCE(v_item.tien_tour, 0)
        ELSE 0
      END;

      -- Tiền Hoa Hồng: san_pham, the_moi — DEBT-AWARE: tính trên SỐ TIỀN ĐÃ TRẢ
      v_comm_amount := CASE
        WHEN v_item.loai_item IN ('san_pham', 'the_moi')
        THEN ROUND(COALESCE(v_item.tien_hoa_hong, 0) * v_ratio)
        ELSE 0
      END;

      IF v_tour_amount > 0 THEN
        INSERT INTO nhan_vien_thu_nhap (
          don_hang_id, don_hang_chi_tiet_id, nhan_vien_id, loai, nguon, ngay,
          doanh_so_tinh, ti_le, so_tien, is_test, ghi_chu
        )
        VALUES (
          p_don_hang_id, v_item.id, v_item.nhan_vien_id, 'tour', 'pos', v_dh.ngay,
          COALESCE(v_item.thanh_tien, 0), v_item.ti_le_hoa_hong, v_tour_amount, v_is_test,
          'POS ' || v_dh.ma_don
        )
        ON CONFLICT (don_hang_chi_tiet_id, loai) WHERE don_hang_chi_tiet_id IS NOT NULL
        DO UPDATE SET
          so_tien = EXCLUDED.so_tien,
          doanh_so_tinh = EXCLUDED.doanh_so_tinh,
          ti_le = EXCLUDED.ti_le,
          is_test = EXCLUDED.is_test,
          updated_at = now();
      END IF;

      -- Hoa hồng cho NGƯỜI BÁN (KTV / nhan_vien_id) — loai = 'hoa_hong'
      IF v_comm_amount > 0 THEN
        INSERT INTO nhan_vien_thu_nhap (
          don_hang_id, don_hang_chi_tiet_id, nhan_vien_id, loai, nguon, ngay,
          doanh_so_tinh, ti_le, so_tien, is_test, ghi_chu
        )
        VALUES (
          p_don_hang_id, v_item.id, v_item.nhan_vien_id, 'hoa_hong', 'pos', v_dh.ngay,
          COALESCE(v_item.thanh_tien, 0), v_item.ti_le_hoa_hong, v_comm_amount, v_is_test,
          'POS ' || v_dh.ma_don
        )
        ON CONFLICT (don_hang_chi_tiet_id, loai) WHERE don_hang_chi_tiet_id IS NOT NULL
        DO UPDATE SET
          so_tien = EXCLUDED.so_tien,
          doanh_so_tinh = EXCLUDED.doanh_so_tinh,
          ti_le = EXCLUDED.ti_le,
          is_test = EXCLUDED.is_test,
          updated_at = now();
      END IF;

      -- ➕ HOA HỒNG LỄ TÂN TƯ VẤN (chia 7/3) — chỉ với thẻ mới có chia 2 người
      -- Base LT = base KTV × (ltPct/ktvPct). don_hang_chi_tiet_id = NULL → row riêng,
      -- không đụng unique (don_hang_chi_tiet_id, loai) của dòng người bán.
      IF v_item.loai_item = 'the_moi' THEN
        v_nv_lt_id  := NULLIF(v_item.meta->>'nhanVienTuVanLtId', '')::uuid;
        v_ti_le_lt  := COALESCE((v_item.meta->>'tiLeCommLt')::numeric, 0);
        v_ti_le_ktv := COALESCE((v_item.meta->>'tiLeCommKtv')::numeric, 0);

        IF v_nv_lt_id IS NOT NULL
           AND v_ti_le_lt > 0
           AND v_ti_le_ktv > 0
           AND v_nv_lt_id <> v_item.nhan_vien_id THEN
          v_lt_amount := ROUND(COALESCE(v_item.tien_hoa_hong, 0) * v_ti_le_lt / v_ti_le_ktv * v_ratio);
          IF v_lt_amount > 0 THEN
            INSERT INTO nhan_vien_thu_nhap (
              don_hang_id, nhan_vien_id, loai, nguon, ngay,
              doanh_so_tinh, ti_le, so_tien, is_test, trang_thai, ghi_chu
            )
            VALUES (
              p_don_hang_id, v_nv_lt_id, 'hoa_hong', 'pos', v_dh.ngay,
              COALESCE(v_item.thanh_tien, 0), v_ti_le_lt, v_lt_amount, v_is_test, 'phat_sinh',
              'Hoa hong tu van LT ' || v_dh.ma_don
            );
          END IF;
        END IF;
      END IF;
    END IF;
  END LOOP;

  IF NOT v_is_test THEN
    FOR v_payment IN
      SELECT *
      FROM thanh_toan
      WHERE don_hang_id = p_don_hang_id
        AND hinh_thuc IN ('tien_mat', 'chuyen_khoan', 'quet_the')
    LOOP
      INSERT INTO doanh_thu (ngay, hinh_thuc, so_tien, dien_giai, nguoi_nhap, don_hang_id, nguon)
      VALUES (
        v_dh.ngay,
        v_payment.hinh_thuc,
        v_payment.so_tien,
        'POS ' || v_dh.ma_don,
        (SELECT ho_ten FROM profiles WHERE id = v_dh.nguoi_tao),
        p_don_hang_id,
        'pos'
      );
    END LOOP;

    FOR v_item IN
      SELECT *
      FROM don_hang_chi_tiet
      WHERE don_hang_id = p_don_hang_id
      ORDER BY created_at
    LOOP
      IF v_item.loai_item = 'san_pham' THEN
        INSERT INTO kho_giao_dich (san_pham_id, loai, so_luong, gia_don_vi, ghi_chu, ngay, nguoi_thuc_hien, don_hang_id, khach_hang_id)
        VALUES (v_item.san_pham_id, 'xuat_ban', v_item.so_luong, v_item.don_gia, 'Ban tu don ' || v_dh.ma_don, v_dh.ngay, v_dh.nguoi_tao, p_don_hang_id, v_dh.khach_hang_id);

        UPDATE kho_san_pham
        SET ton_kho = ton_kho - v_item.so_luong
        WHERE id = v_item.san_pham_id;
      END IF;

      IF v_item.loai_item = 'the_lieu_trinh' THEN
        UPDATE the_lieu_trinh SET
          so_buoi_da_dung = so_buoi_da_dung + v_item.so_luong,
          trang_thai = CASE
                         WHEN GREATEST(0, so_buoi_tong - (so_buoi_da_dung + v_item.so_luong)) = 0 THEN 'het_buoi'
                         ELSE 'active'
                       END
        WHERE id = v_item.the_lieu_trinh_id;

        INSERT INTO lich_su_dung_the (the_lieu_trinh_id, don_hang_id, nguoi_thuc_hien, ngay)
        VALUES (v_item.the_lieu_trinh_id, p_don_hang_id, v_item.nhan_vien_id, v_dh.ngay);
      END IF;

      IF v_item.loai_item = 'the_moi' THEN
        v_so_buoi_mua := COALESCE((v_item.meta->>'soBuoiMua')::integer, v_item.so_luong, 0);
        v_so_buoi_tang := COALESCE((v_item.meta->>'soBuoiTang')::integer, 0);
        v_so_buoi_tong := v_so_buoi_mua + v_so_buoi_tang;
        v_gia_tri_the := COALESCE((v_item.meta->>'giaTriThe')::integer, v_item.thanh_tien, 0);

        INSERT INTO the_lieu_trinh (
          khach_hang_id, don_hang_id, dich_vu_id, nhan_vien_ban_id,
          ten_dich_vu, so_buoi_tong, so_buoi_da_dung,
          gia_tri_the, ngay_mua, ngay_het_han, trang_thai
        )
        VALUES (
          v_dh.khach_hang_id,
          p_don_hang_id,
          COALESCE(NULLIF(v_item.meta->>'dichVuId', '')::uuid, v_item.dich_vu_id),
          COALESCE(NULLIF(v_item.meta->>'nhanVienBanId', '')::uuid, v_item.nhan_vien_id),
          COALESCE(v_item.meta->>'tenDichVu', 'The lieu trinh'),
          v_so_buoi_tong,
          0,
          v_gia_tri_the,
          v_dh.ngay,
          NULLIF(v_item.meta->>'ngayHetHan', '')::date,
          'active'
        );

        v_created_cards := v_created_cards + 1;
      END IF;
    END LOOP;
  END IF;

  IF NOT v_is_test AND v_con_no > 0 AND v_dh.khach_hang_id IS NOT NULL THEN
    INSERT INTO cong_no_khach_hang (khach_hang_id, don_hang_id, loai, so_tien, so_du_con_lai, ngay, ghi_chu)
    SELECT
      v_dh.khach_hang_id,
      p_don_hang_id,
      'phat_sinh',
      v_con_no,
      COALESCE((SELECT so_du_con_lai FROM cong_no_khach_hang WHERE khach_hang_id = v_dh.khach_hang_id ORDER BY created_at DESC LIMIT 1), 0) + v_con_no,
      v_dh.ngay,
      'Phat sinh tu don ' || v_dh.ma_don;
  END IF;

  IF NOT v_is_test AND v_dh.khach_hang_id IS NOT NULL THEN
    UPDATE khach_hang SET
      tong_chi_tieu = GREATEST(0, COALESCE(tong_chi_tieu, 0) + v_thuc_thu),
      so_lan_den    = COALESCE(so_lan_den, 0) + 1,
      lan_cuoi_den  = v_dh.ngay
    WHERE id = v_dh.khach_hang_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'ma_don', v_dh.ma_don,
    'tong_tien', v_tong_tien,
    'giam_gia', COALESCE(p_giam_gia, 0),
    'vat', COALESCE(p_vat, 0),
    'thuc_thu', v_thuc_thu,
    'con_no', v_con_no,
    'created_cards', v_created_cards,
    'test_mode', v_is_test
  );
EXCEPTION
  WHEN invalid_text_representation THEN
    RETURN jsonb_build_object('success', false, 'error', 'Du lieu meta cua don hang khong hop le');
END;
$$;
