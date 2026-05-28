-- ============================================================
-- Migration 047: Fix thu nợ + Logic block buổi theo tỷ lệ thanh toán
-- 1. pos_thu_no_the: đổi loai 'thu_no' → 'thanh_toan' (đúng CHECK constraint)
-- 2. pos_finalize_order: thay logic block 30% cứng → block theo tỷ lệ buổi
--    Công thức: buoi_duoc_phep = FLOOR(da_thanh_toan / gia_tri_the × so_buoi_tong)
--    Khách trả 50% → dùng tối đa 50% số buổi, đến buổi vượt ngưỡng phải trả thêm
-- ============================================================

-- ── 1. Fix pos_thu_no_the ────────────────────────────────────
CREATE OR REPLACE FUNCTION pos_thu_no_the(
  p_the_lieu_trinh_id  uuid,
  p_so_tien            integer,
  p_hinh_thuc          text,
  p_nguoi_thu          text,
  p_ghi_chu            text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_the               the_lieu_trinh%ROWTYPE;
  v_don_hang          don_hang%ROWTYPE;
  v_tv                record;
  v_comm              integer;
  v_da_thanh_toan_moi integer;
  v_con_no_moi        integer;
  v_so_du_cn_cu       integer;
  v_so_tien_thuc      integer;
BEGIN
  IF p_hinh_thuc NOT IN ('tien_mat', 'chuyen_khoan', 'quet_the') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Hinh thuc thanh toan khong hop le');
  END IF;

  IF COALESCE(p_so_tien, 0) <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'So tien phai lon hon 0');
  END IF;

  SELECT * INTO v_the FROM the_lieu_trinh WHERE id = p_the_lieu_trinh_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Khong tim thay the lieu trinh');
  END IF;

  SELECT * INTO v_don_hang FROM don_hang WHERE id = v_the.don_hang_id;

  -- Tính tiền thực sự thu (không vượt số nợ còn lại)
  v_da_thanh_toan_moi := LEAST(
    COALESCE(v_the.gia_tri_the, 0),
    COALESCE(v_the.da_thanh_toan, 0) + p_so_tien
  );
  v_so_tien_thuc := v_da_thanh_toan_moi - COALESCE(v_the.da_thanh_toan, 0);

  IF v_so_tien_thuc <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'The da thanh toan du, khong con no');
  END IF;

  BEGIN
    -- Cập nhật da_thanh_toan
    UPDATE the_lieu_trinh SET da_thanh_toan = v_da_thanh_toan_moi
    WHERE id = p_the_lieu_trinh_id;

    -- Thêm bản ghi thanh_toan vào đơn gốc
    INSERT INTO thanh_toan (don_hang_id, hinh_thuc, so_tien, ghi_chu)
    VALUES (v_the.don_hang_id, p_hinh_thuc, v_so_tien_thuc,
      COALESCE(p_ghi_chu, 'Thu no the LT - ' || p_nguoi_thu));

    -- Cập nhật con_no trên don_hang
    v_con_no_moi := GREATEST(0, COALESCE(v_don_hang.con_no, 0) - v_so_tien_thuc);
    UPDATE don_hang SET
      con_no     = v_con_no_moi,
      trang_thai = CASE WHEN v_con_no_moi = 0 THEN 'da_thanh_toan' ELSE 'no_mot_phan' END,
      updated_at = now()
    WHERE id = v_the.don_hang_id;

    -- Cập nhật cong_no_khach_hang
    -- FIX: loai = 'thanh_toan' (không phải 'thu_no' — vi phạm CHECK constraint)
    IF v_the.khach_hang_id IS NOT NULL THEN
      SELECT COALESCE(so_du_con_lai, 0) INTO v_so_du_cn_cu
      FROM cong_no_khach_hang
      WHERE khach_hang_id = v_the.khach_hang_id
      ORDER BY created_at DESC LIMIT 1;

      INSERT INTO cong_no_khach_hang (
        khach_hang_id, don_hang_id, loai, so_tien, so_du_con_lai, ngay, ghi_chu
      ) VALUES (
        v_the.khach_hang_id,
        v_the.don_hang_id,
        'thanh_toan',   -- ← FIX: đúng CHECK constraint
        v_so_tien_thuc,
        GREATEST(0, COALESCE(v_so_du_cn_cu, 0) - v_so_tien_thuc),
        CURRENT_DATE,
        'Thu no the: ' || COALESCE(v_the.ten_dich_vu, '') || ' - ' || p_nguoi_thu
      );

      UPDATE khach_hang SET
        tong_chi_tieu = COALESCE(tong_chi_tieu, 0) + v_so_tien_thuc
      WHERE id = v_the.khach_hang_id;
    END IF;

    -- Ghi doanh_thu vào ví
    INSERT INTO doanh_thu (ngay, hinh_thuc, so_tien, dien_giai, nguoi_nhap, don_hang_id, nguon)
    VALUES (
      CURRENT_DATE, p_hinh_thuc, v_so_tien_thuc,
      'Thu no the LT' || CASE WHEN v_don_hang.ma_don IS NOT NULL THEN ' ' || v_don_hang.ma_don ELSE '' END,
      p_nguoi_thu, v_the.don_hang_id, 'pos'
    );

    -- Commission bổ sung theo đợt thanh toán
    -- Hoa hồng ghi vào THÁNG THỰC TẾ KH thanh toán (CURRENT_DATE)
    FOR v_tv IN
      SELECT * FROM the_lieu_trinh_tu_van WHERE the_lieu_trinh_id = p_the_lieu_trinh_id
    LOOP
      v_comm := ROUND(v_so_tien_thuc::numeric * v_tv.ti_le_commission / 100);
      IF v_comm > 0 THEN
        INSERT INTO nhan_vien_thu_nhap (
          don_hang_id, nhan_vien_id, loai, nguon, ngay,
          doanh_so_tinh, ti_le, so_tien, trang_thai, is_test, ghi_chu
        ) VALUES (
          v_the.don_hang_id,
          v_tv.nhan_vien_id,
          'commission', 'pos',
          CURRENT_DATE,   -- ← ngày thực tế thu tiền (đúng tháng lương)
          v_so_tien_thuc,
          v_tv.ti_le_commission,
          v_comm,
          'phat_sinh', false,
          'Thu no the ' || COALESCE(v_don_hang.ma_don, '') ||
          ' ngay ' || TO_CHAR(CURRENT_DATE, 'DD/MM/YYYY')
        );

        UPDATE the_lieu_trinh_tu_van SET da_nhan = da_nhan + v_comm WHERE id = v_tv.id;
      END IF;
    END LOOP;

    RETURN jsonb_build_object(
      'success',             true,
      'so_tien_thu',         v_so_tien_thuc,
      'da_thanh_toan',       v_da_thanh_toan_moi,
      'con_lai',             COALESCE(v_the.gia_tri_the, 0) - v_da_thanh_toan_moi,
      'don_hang_trang_thai', CASE WHEN v_con_no_moi = 0 THEN 'da_thanh_toan' ELSE 'no_mot_phan' END
    );
  EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
  END;
END;
$$;


-- ── 2. Fix pos_finalize_order: block theo tỷ lệ buổi ────────
--
-- LOGIC CŨ: Block nếu da_thanh_toan < gia_tri_the × 30%
--
-- LOGIC MỚI:
--   buoi_duoc_phep = FLOOR(da_thanh_toan / gia_tri_the × so_buoi_tong)
--   Block nếu so_buoi_da_dung + so_luong_dung > buoi_duoc_phep
--   Ví dụ: 10 buổi, 2tr, trả 1tr → được dùng FLOOR(0.5×10) = 5 buổi
--           Dùng buổi 6 → phải trả thêm CEIL(6/10×2tr) - 1tr = 200k
-- ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION pos_finalize_order(
  p_don_hang_id       uuid,
  p_trang_thai        text,
  p_giam_gia          integer  DEFAULT 0,
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
  v_new_the_id      uuid;
  v_nv_ban_id       uuid;
  v_nv_lt_id        uuid;
  v_ti_le_ktv       numeric;
  v_ti_le_lt        numeric;
  v_km_ref_pct      numeric;
  v_da_thanh_toan   integer;
  v_tv              record;
  v_comm_tuan       integer;
  -- Biến mới cho logic tỷ lệ buổi
  v_buoi_duoc_phep  integer;
  v_can_tra_them    integer;
BEGIN
  SELECT * INTO v_dh FROM don_hang WHERE id = p_don_hang_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Don hang khong ton tai');
  END IF;

  IF v_dh.trang_thai != 'draft' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Don hang da duoc chot truoc do');
  END IF;

  v_is_test := COALESCE(v_dh.is_test, false) OR COALESCE(p_skip_doanh_thu, false);

  SELECT COALESCE(SUM(thanh_tien), 0), COUNT(*)
  INTO v_tong_tien, v_line_count
  FROM don_hang_chi_tiet WHERE don_hang_id = p_don_hang_id;

  IF v_line_count = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Don hang chua co dong hang hop le');
  END IF;

  SELECT COALESCE(SUM(so_tien), 0) INTO v_total_paid
  FROM thanh_toan WHERE don_hang_id = p_don_hang_id;

  IF EXISTS (
    SELECT 1 FROM thanh_toan
    WHERE don_hang_id = p_don_hang_id
      AND hinh_thuc NOT IN ('tien_mat','chuyen_khoan','quet_the','the_tra_truoc')
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Hinh thuc thanh toan khong hop le');
  END IF;

  IF v_dh.khach_hang_id IS NULL AND EXISTS (
    SELECT 1 FROM thanh_toan
    WHERE don_hang_id = p_don_hang_id AND hinh_thuc = 'the_tra_truoc'
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Thanh toan bang the tra truoc bat buoc phai chon khach hang');
  END IF;

  v_thuc_thu := GREATEST(0, v_tong_tien - COALESCE(p_giam_gia, 0));
  v_con_no   := GREATEST(0, v_thuc_thu - v_total_paid);

  IF v_con_no > 0 AND v_dh.khach_hang_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Khach le khong duoc ghi no. Vui long thanh toan du.');
  END IF;

  -- Validate từng dòng hàng
  FOR v_item IN
    SELECT * FROM don_hang_chi_tiet WHERE don_hang_id = p_don_hang_id ORDER BY created_at
  LOOP
    IF NOT v_is_test AND v_item.loai_item = 'san_pham' THEN
      IF NOT EXISTS (
        SELECT 1 FROM kho_san_pham WHERE id = v_item.san_pham_id AND ton_kho >= v_item.so_luong
      ) THEN
        RETURN jsonb_build_object('success', false, 'error', 'San pham khong du ton kho de chot don');
      END IF;
    END IF;

    IF NOT v_is_test AND v_item.loai_item = 'the_lieu_trinh' THEN
      SELECT * INTO v_card FROM the_lieu_trinh
      WHERE id = v_item.the_lieu_trinh_id FOR UPDATE;

      IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'The lieu trinh khong ton tai');
      END IF;

      IF COALESCE(v_card.so_buoi_con_lai, 0) < v_item.so_luong THEN
        RETURN jsonb_build_object('success', false, 'error', 'The lieu trinh khong du so buoi con lai');
      END IF;

      -- ── LOGIC MỚI: Block theo tỷ lệ thanh toán ──────────────────
      -- buoi_duoc_phep = FLOOR(da_thanh_toan / gia_tri_the × so_buoi_tong)
      -- Nếu so_buoi_da_dung + so_luong > buoi_duoc_phep → yêu cầu thanh toán thêm
      IF COALESCE(v_card.gia_tri_the, 0) > 0
         AND COALESCE(v_card.so_buoi_tong, 0) > 0
      THEN
        v_buoi_duoc_phep := FLOOR(
          COALESCE(v_card.da_thanh_toan, 0)::numeric
          / v_card.gia_tri_the
          * v_card.so_buoi_tong
        );

        IF (COALESCE(v_card.so_buoi_da_dung, 0) + v_item.so_luong) > v_buoi_duoc_phep THEN
          -- Tính tiền cần trả thêm để dùng thêm N buổi
          v_can_tra_them := CEIL(
            (v_card.so_buoi_da_dung + v_item.so_luong)::numeric
            / v_card.so_buoi_tong
            * v_card.gia_tri_the
          ) - COALESCE(v_card.da_thanh_toan, 0);

          RETURN jsonb_build_object(
            'success',       false,
            'error_code',    'CHUA_DU_BUOI',
            'error',         'The ' || COALESCE(v_card.ten_dich_vu,'') ||
                             ': da dung ' || COALESCE(v_card.so_buoi_da_dung,0)::text ||
                             '/' || v_card.so_buoi_tong::text || ' buoi' ||
                             ' (da tra ' || COALESCE(v_card.da_thanh_toan,0)::text || 'd' ||
                             '/' || v_card.gia_tri_the::text || 'd).' ||
                             ' Can thanh toan them ' || v_can_tra_them::text || 'd de dung tiep.',
            'can_tra_them',  v_can_tra_them,
            'buoi_duoc_phep', v_buoi_duoc_phep,
            'the_lieu_trinh_id', v_card.id
          );
        END IF;
      END IF;
      -- ─────────────────────────────────────────────────────────────
    END IF;

    IF v_item.loai_item = 'the_moi' THEN
      IF v_dh.khach_hang_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Mua the lieu trinh bat buoc phai chon khach hang');
      END IF;
      v_so_buoi_mua  := COALESCE((v_item.meta->>'soBuoiMua')::integer, v_item.so_luong, 0);
      v_so_buoi_tang := COALESCE((v_item.meta->>'soBuoiTang')::integer, 0);
      v_so_buoi_tong := v_so_buoi_mua + v_so_buoi_tang;
      IF v_so_buoi_mua <= 0 OR v_so_buoi_tong <= 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Thong tin the moi thieu so buoi');
      END IF;
    END IF;
  END LOOP;

  -- Cập nhật don_hang
  UPDATE don_hang SET
    tong_tien_hang = v_tong_tien,
    giam_gia       = COALESCE(p_giam_gia, 0),
    thuc_thu       = v_thuc_thu,
    con_no         = v_con_no,
    trang_thai     = CASE WHEN v_con_no = 0 THEN 'da_thanh_toan' ELSE 'no_mot_phan' END,
    ghi_chu        = COALESCE(p_ghi_chu, v_dh.ghi_chu),
    tien_tour      = COALESCE((
      SELECT SUM(COALESCE(tien_tour,0) + COALESCE(tien_commission,0))
      FROM don_hang_chi_tiet WHERE don_hang_id = p_don_hang_id
    ), 0),
    updated_at     = now()
  WHERE id = p_don_hang_id;

  DELETE FROM nhan_vien_thu_nhap WHERE don_hang_id = p_don_hang_id;

  FOR v_item IN
    SELECT * FROM don_hang_chi_tiet WHERE don_hang_id = p_don_hang_id ORDER BY created_at
  LOOP
    IF v_item.nhan_vien_id IS NOT NULL THEN
      v_tour_amount := CASE
        WHEN v_item.loai_item IN ('dich_vu','the_lieu_trinh')
        THEN COALESCE(NULLIF(v_item.tien_tour,0), v_item.tien_hoa_hong, 0)
        ELSE 0
      END;
      v_comm_amount := CASE
        WHEN v_item.loai_item = 'san_pham'
        THEN COALESCE(NULLIF(v_item.tien_commission,0), v_item.tien_hoa_hong, 0)
        ELSE 0
      END;

      IF v_tour_amount > 0 THEN
        INSERT INTO nhan_vien_thu_nhap (
          don_hang_id, don_hang_chi_tiet_id, nhan_vien_id, loai, nguon, ngay,
          doanh_so_tinh, ti_le, so_tien, is_test, ghi_chu
        ) VALUES (
          p_don_hang_id, v_item.id, v_item.nhan_vien_id, 'tour', 'pos', v_dh.ngay,
          COALESCE(v_item.thanh_tien,0), v_item.ti_le_hoa_hong, v_tour_amount, v_is_test,
          'POS ' || v_dh.ma_don
        )
        ON CONFLICT (don_hang_chi_tiet_id, loai) WHERE don_hang_chi_tiet_id IS NOT NULL
        DO UPDATE SET
          so_tien = EXCLUDED.so_tien, doanh_so_tinh = EXCLUDED.doanh_so_tinh,
          ti_le = EXCLUDED.ti_le, is_test = EXCLUDED.is_test, updated_at = now();
      END IF;

      IF v_comm_amount > 0 THEN
        INSERT INTO nhan_vien_thu_nhap (
          don_hang_id, don_hang_chi_tiet_id, nhan_vien_id, loai, nguon, ngay,
          doanh_so_tinh, ti_le, so_tien, is_test, ghi_chu
        ) VALUES (
          p_don_hang_id, v_item.id, v_item.nhan_vien_id, 'commission', 'pos', v_dh.ngay,
          COALESCE(v_item.thanh_tien,0), v_item.ti_le_hoa_hong, v_comm_amount, v_is_test,
          'POS ' || v_dh.ma_don
        )
        ON CONFLICT (don_hang_chi_tiet_id, loai) WHERE don_hang_chi_tiet_id IS NOT NULL
        DO UPDATE SET
          so_tien = EXCLUDED.so_tien, doanh_so_tinh = EXCLUDED.doanh_so_tinh,
          ti_le = EXCLUDED.ti_le, is_test = EXCLUDED.is_test, updated_at = now();
      END IF;
    END IF;

    -- ── Xử lý the_moi ──────────────────────────────────────────
    IF NOT v_is_test AND v_item.loai_item = 'the_moi' THEN
      v_so_buoi_mua  := COALESCE((v_item.meta->>'soBuoiMua')::integer, v_item.so_luong, 0);
      v_so_buoi_tang := COALESCE((v_item.meta->>'soBuoiTang')::integer, 0);
      v_so_buoi_tong := v_so_buoi_mua + v_so_buoi_tang;
      v_gia_tri_the  := COALESCE((v_item.meta->>'giaTriThe')::integer, v_item.thanh_tien, 0);
      v_km_ref_pct   := COALESCE((v_item.meta->>'kmRefPct')::numeric, 0);
      v_ti_le_ktv    := COALESCE((v_item.meta->>'tiLeCommKtv')::numeric, 0);
      v_ti_le_lt     := COALESCE((v_item.meta->>'tiLeCommLt')::numeric, 0);

      v_da_thanh_toan := CASE
        WHEN v_tong_tien > 0
        THEN ROUND(v_total_paid::numeric * v_gia_tri_the / v_tong_tien)
        ELSE 0
      END;
      v_da_thanh_toan := LEAST(v_da_thanh_toan, v_gia_tri_the);

      v_nv_ban_id := COALESCE(NULLIF(v_item.meta->>'nhanVienBanId','')::uuid, v_item.nhan_vien_id);
      v_nv_lt_id  := NULLIF(v_item.meta->>'nhanVienTuVanLtId','')::uuid;

      -- NOTE: so_buoi_con_lai là GENERATED column → KHÔNG INSERT
      INSERT INTO the_lieu_trinh (
        khach_hang_id, don_hang_id, dich_vu_id, nhan_vien_ban_id,
        ten_dich_vu, so_buoi_tong, so_buoi_da_dung,
        gia_tri_the, da_thanh_toan, km_ref_pct,
        ngay_mua, ngay_het_han, trang_thai
      )
      VALUES (
        v_dh.khach_hang_id, p_don_hang_id,
        COALESCE(NULLIF(v_item.meta->>'dichVuId','')::uuid, v_item.dich_vu_id),
        v_nv_ban_id,
        COALESCE(v_item.meta->>'tenDichVu','The lieu trinh'),
        v_so_buoi_tong, 0,
        v_gia_tri_the, v_da_thanh_toan, v_km_ref_pct,
        v_dh.ngay,
        NULLIF(v_item.meta->>'ngayHetHan','')::date,
        'active'
      )
      RETURNING id INTO v_new_the_id;

      IF v_nv_ban_id IS NOT NULL AND v_ti_le_ktv > 0 THEN
        INSERT INTO the_lieu_trinh_tu_van (the_lieu_trinh_id, nhan_vien_id, vai_tro, ti_le_commission)
        VALUES (v_new_the_id, v_nv_ban_id, 'ktv', v_ti_le_ktv)
        ON CONFLICT (the_lieu_trinh_id, nhan_vien_id) DO NOTHING;
      END IF;

      IF v_nv_lt_id IS NOT NULL AND v_ti_le_lt > 0 THEN
        INSERT INTO the_lieu_trinh_tu_van (the_lieu_trinh_id, nhan_vien_id, vai_tro, ti_le_commission)
        VALUES (v_new_the_id, v_nv_lt_id, 'le_tan', v_ti_le_lt)
        ON CONFLICT (the_lieu_trinh_id, nhan_vien_id) DO NOTHING;
      END IF;

      IF v_da_thanh_toan > 0 THEN
        FOR v_tv IN
          SELECT * FROM the_lieu_trinh_tu_van WHERE the_lieu_trinh_id = v_new_the_id
        LOOP
          v_comm_tuan := ROUND(v_da_thanh_toan::numeric * v_tv.ti_le_commission / 100);
          IF v_comm_tuan > 0 THEN
            INSERT INTO nhan_vien_thu_nhap (
              don_hang_id, nhan_vien_id, loai, nguon, ngay,
              doanh_so_tinh, ti_le, so_tien, is_test, ghi_chu
            ) VALUES (
              p_don_hang_id, v_tv.nhan_vien_id, 'commission', 'pos', v_dh.ngay,
              v_da_thanh_toan, v_tv.ti_le_commission, v_comm_tuan, v_is_test,
              'Hoa hong ban the ' || v_dh.ma_don ||
              CASE WHEN v_con_no > 0 THEN ' (dot 1/' || v_gia_tri_the::text || 'd)' ELSE '' END
            );
            UPDATE the_lieu_trinh_tu_van SET da_nhan = da_nhan + v_comm_tuan WHERE id = v_tv.id;
          END IF;
        END LOOP;
      END IF;

      v_created_cards := v_created_cards + 1;
    END IF;

    IF NOT v_is_test AND v_item.loai_item != 'the_moi' THEN
      IF v_item.loai_item = 'san_pham' THEN
        INSERT INTO kho_giao_dich (
          san_pham_id, loai, so_luong, gia_don_vi, ghi_chu, ngay, nguoi_thuc_hien, don_hang_id, khach_hang_id
        ) VALUES (
          v_item.san_pham_id, 'xuat_ban', v_item.so_luong, v_item.don_gia,
          'Ban tu don ' || v_dh.ma_don, v_dh.ngay, v_dh.nguoi_tao, p_don_hang_id, v_dh.khach_hang_id
        );
        UPDATE kho_san_pham SET ton_kho = ton_kho - v_item.so_luong WHERE id = v_item.san_pham_id;
      END IF;

      IF v_item.loai_item = 'the_lieu_trinh' THEN
        -- NOTE: so_buoi_con_lai là GENERATED column → không SET trực tiếp
        UPDATE the_lieu_trinh SET
          so_buoi_da_dung = so_buoi_da_dung + v_item.so_luong,
          trang_thai = CASE
            WHEN (so_buoi_tong - (so_buoi_da_dung + v_item.so_luong)) <= 0 THEN 'het_buoi'
            ELSE 'active'
          END
        WHERE id = v_item.the_lieu_trinh_id;

        INSERT INTO lich_su_dung_the (the_lieu_trinh_id, don_hang_id, nguoi_thuc_hien, ngay)
        VALUES (v_item.the_lieu_trinh_id, p_don_hang_id, v_item.nhan_vien_id, v_dh.ngay);
      END IF;
    END IF;
  END LOOP;

  IF NOT v_is_test THEN
    FOR v_payment IN
      SELECT * FROM thanh_toan
      WHERE don_hang_id = p_don_hang_id
        AND hinh_thuc IN ('tien_mat','chuyen_khoan','quet_the')
    LOOP
      INSERT INTO doanh_thu (ngay, hinh_thuc, so_tien, dien_giai, nguoi_nhap, don_hang_id, nguon)
      VALUES (
        v_dh.ngay, v_payment.hinh_thuc, v_payment.so_tien,
        'POS ' || v_dh.ma_don,
        (SELECT ho_ten FROM profiles WHERE id = v_dh.nguoi_tao),
        p_don_hang_id, 'pos'
      );
    END LOOP;

    IF v_con_no > 0 AND v_dh.khach_hang_id IS NOT NULL THEN
      INSERT INTO cong_no_khach_hang (
        khach_hang_id, don_hang_id, loai, so_tien, so_du_con_lai, ngay, ghi_chu
      )
      SELECT
        v_dh.khach_hang_id, p_don_hang_id, 'phat_sinh', v_con_no,
        COALESCE((
          SELECT so_du_con_lai FROM cong_no_khach_hang
          WHERE khach_hang_id = v_dh.khach_hang_id
          ORDER BY created_at DESC LIMIT 1
        ), 0) + v_con_no,
        v_dh.ngay,
        'Phat sinh no tu don ' || v_dh.ma_don;
    END IF;

    IF v_dh.khach_hang_id IS NOT NULL THEN
      UPDATE khach_hang SET
        tong_chi_tieu = GREATEST(0, COALESCE(tong_chi_tieu,0) + v_thuc_thu),
        so_lan_den    = COALESCE(so_lan_den,0) + 1,
        lan_cuoi_den  = v_dh.ngay
      WHERE id = v_dh.khach_hang_id;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'success',       true,
    'ma_don',        v_dh.ma_don,
    'tong_tien',     v_tong_tien,
    'thuc_thu',      v_thuc_thu,
    'con_no',        v_con_no,
    'created_cards', v_created_cards,
    'test_mode',     v_is_test
  );
EXCEPTION
  WHEN invalid_text_representation THEN
    RETURN jsonb_build_object('success', false, 'error', 'Du lieu meta cua don hang khong hop le');
END;
$$;
