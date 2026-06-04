-- ============================================================
-- MIGRATION 080: Ví trả trước (prepaid balance) cho khách hàng
-- Ngày: 04/06/2026
-- Vá lỗ hổng: trước đây chọn PTTT 'the_tra_truoc' KHÔNG trừ vào đâu
-- (HSMS chưa có chỗ lưu số dư) → đơn chốt nhưng không thu được tiền.
--
-- Mô hình kế toán (anh Nam chốt 04/06):
--   - NẠP: tiền vào ví thật + ghi doanh_thu (theo PTTT khách trả) + tăng số dư.
--   - DÙNG (thanh toán đơn bằng the_tra_truoc): CHỈ trừ số dư, KHÔNG ghi cashflow
--     (tránh đếm 2 lần) — tiền đã thu lúc nạp.
--   - HỦY/MỞ LẠI đơn: trigger tự hoàn số dư đã trừ.
-- ============================================================

-- ── 1) Cột số dư trên khách hàng ──────────────────────────────
ALTER TABLE khach_hang
  ADD COLUMN IF NOT EXISTS so_du_tra_truoc bigint NOT NULL DEFAULT 0;

-- ── 2) Sổ giao dịch ví trả trước ──────────────────────────────
CREATE TABLE IF NOT EXISTS tra_truoc_giao_dich (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  khach_hang_id    uuid NOT NULL REFERENCES khach_hang(id) ON DELETE CASCADE,
  loai             text NOT NULL CHECK (loai IN ('nap', 'su_dung', 'hoan', 'dieu_chinh')),
  so_tien          bigint NOT NULL CHECK (so_tien > 0),
  so_du_truoc      bigint,
  so_du_sau        bigint,
  don_hang_id      uuid REFERENCES don_hang(id) ON DELETE SET NULL,
  hinh_thuc        text,        -- chỉ dùng khi loai='nap': tien_mat/chuyen_khoan/quet_the
  ghi_chu          text,
  nguoi_thuc_hien  text,
  ngay             date NOT NULL DEFAULT CURRENT_DATE,
  created_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ttgd_khach   ON tra_truoc_giao_dich(khach_hang_id);
CREATE INDEX IF NOT EXISTS idx_ttgd_don_hang ON tra_truoc_giao_dich(don_hang_id);

-- ── 3) RPC: Nạp tiền vào ví trả trước ─────────────────────────
CREATE OR REPLACE FUNCTION pos_nap_tra_truoc(
  p_khach_hang_id  uuid,
  p_so_tien        bigint,
  p_hinh_thuc      text,
  p_nguoi          text DEFAULT NULL,
  p_ghi_chu        text DEFAULT NULL,
  p_ngay           date DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_kh      khach_hang%ROWTYPE;
  v_truoc   bigint := 0;
  v_sau     bigint := 0;
  v_ngay    date;
BEGIN
  IF p_hinh_thuc NOT IN ('tien_mat', 'chuyen_khoan', 'quet_the') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Hinh thuc nap khong hop le');
  END IF;
  IF COALESCE(p_so_tien, 0) <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'So tien nap phai lon hon 0');
  END IF;

  SELECT * INTO v_kh FROM khach_hang WHERE id = p_khach_hang_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Khong tim thay khach hang');
  END IF;

  v_ngay  := COALESCE(p_ngay, CURRENT_DATE);
  v_truoc := COALESCE(v_kh.so_du_tra_truoc, 0);
  v_sau   := v_truoc + p_so_tien;

  UPDATE khach_hang SET so_du_tra_truoc = v_sau WHERE id = p_khach_hang_id;

  INSERT INTO tra_truoc_giao_dich (
    khach_hang_id, loai, so_tien, so_du_truoc, so_du_sau, hinh_thuc, ghi_chu, nguoi_thuc_hien, ngay
  ) VALUES (
    p_khach_hang_id, 'nap', p_so_tien, v_truoc, v_sau, p_hinh_thuc,
    COALESCE(p_ghi_chu, 'Nap vi tra truoc'), p_nguoi, v_ngay
  );

  -- Tiền vào ví thật + ghi nhận doanh thu lúc nạp
  INSERT INTO doanh_thu (ngay, hinh_thuc, so_tien, dien_giai, nguoi_nhap, nguon)
  VALUES (
    v_ngay, p_hinh_thuc, p_so_tien,
    'Nap vi tra truoc - ' || COALESCE(v_kh.ho_ten, ''),
    p_nguoi, 'tra_truoc'
  );

  RETURN jsonb_build_object('success', true, 'so_du', v_sau, 'so_du_truoc', v_truoc);
END;
$$;

-- ── 4) RPC: Điều chỉnh số dư thủ công (Admin) ─────────────────
CREATE OR REPLACE FUNCTION pos_dieu_chinh_tra_truoc(
  p_khach_hang_id  uuid,
  p_so_du_moi      bigint,
  p_nguoi          text DEFAULT NULL,
  p_ghi_chu        text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_kh    khach_hang%ROWTYPE;
  v_truoc bigint := 0;
  v_delta bigint := 0;
BEGIN
  IF COALESCE(p_so_du_moi, -1) < 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'So du moi khong hop le');
  END IF;
  SELECT * INTO v_kh FROM khach_hang WHERE id = p_khach_hang_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Khong tim thay khach hang');
  END IF;
  v_truoc := COALESCE(v_kh.so_du_tra_truoc, 0);
  v_delta := p_so_du_moi - v_truoc;
  IF v_delta = 0 THEN
    RETURN jsonb_build_object('success', true, 'so_du', p_so_du_moi, 'unchanged', true);
  END IF;
  UPDATE khach_hang SET so_du_tra_truoc = p_so_du_moi WHERE id = p_khach_hang_id;
  INSERT INTO tra_truoc_giao_dich (
    khach_hang_id, loai, so_tien, so_du_truoc, so_du_sau, ghi_chu, nguoi_thuc_hien, ngay
  ) VALUES (
    p_khach_hang_id, 'dieu_chinh', ABS(v_delta), v_truoc, p_so_du_moi,
    COALESCE(p_ghi_chu, 'Dieu chinh so du tra truoc'), p_nguoi, CURRENT_DATE
  );
  RETURN jsonb_build_object('success', true, 'so_du', p_so_du_moi, 'so_du_truoc', v_truoc);
END;
$$;

-- ── 5) Recreate pos_finalize_order (từ 068) + xử lý the_tra_truoc ──
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
  v_tra_truoc_pay   integer := 0;   -- tổng thanh toán bằng ví trả trước
  v_so_du_tt        bigint  := 0;   -- số dư ví trả trước của khách (đã lock)
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

  SELECT COALESCE(SUM(so_tien), 0) INTO v_tra_truoc_pay
  FROM thanh_toan
  WHERE don_hang_id = p_don_hang_id AND hinh_thuc = 'the_tra_truoc';

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

  -- ✅ MỚI: kiểm tra số dư ví trả trước đủ trước khi chốt
  IF NOT v_is_test AND v_tra_truoc_pay > 0 THEN
    SELECT COALESCE(so_du_tra_truoc, 0) INTO v_so_du_tt
    FROM khach_hang WHERE id = v_dh.khach_hang_id FOR UPDATE;
    IF v_so_du_tt < v_tra_truoc_pay THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'So du vi tra truoc khong du. Con ' || v_so_du_tt || 'd, can ' || v_tra_truoc_pay || 'd'
      );
    END IF;
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

  FOR v_item IN
    SELECT *
    FROM don_hang_chi_tiet
    WHERE don_hang_id = p_don_hang_id
    ORDER BY created_at
  LOOP
    IF v_item.nhan_vien_id IS NOT NULL THEN
      v_tour_amount := CASE
        WHEN v_item.loai_item IN ('dich_vu', 'the_lieu_trinh')
        THEN COALESCE(v_item.tien_tour, 0)
        ELSE 0
      END;

      v_comm_amount := CASE
        WHEN v_item.loai_item IN ('san_pham', 'the_moi')
        THEN ROUND(COALESCE(v_item.tien_hoa_hong, 0)
             * CASE WHEN v_thuc_thu > 0 THEN LEAST(1.0, v_total_paid::numeric / v_thuc_thu) ELSE 1 END)
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

    -- ✅ MỚI: trừ số dư ví trả trước (KHÔNG ghi doanh_thu — đã thu lúc nạp)
    IF v_tra_truoc_pay > 0 AND v_dh.khach_hang_id IS NOT NULL THEN
      INSERT INTO tra_truoc_giao_dich (
        khach_hang_id, loai, so_tien, so_du_truoc, so_du_sau, don_hang_id, ghi_chu, nguoi_thuc_hien, ngay
      ) VALUES (
        v_dh.khach_hang_id, 'su_dung', v_tra_truoc_pay,
        v_so_du_tt, v_so_du_tt - v_tra_truoc_pay, p_don_hang_id,
        'Thanh toan don ' || v_dh.ma_don,
        (SELECT ho_ten FROM profiles WHERE id = v_dh.nguoi_tao),
        v_dh.ngay
      );
      UPDATE khach_hang
      SET so_du_tra_truoc = GREATEST(0, COALESCE(so_du_tra_truoc, 0) - v_tra_truoc_pay)
      WHERE id = v_dh.khach_hang_id;
    END IF;

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

-- ── 6) Trigger: tự hoàn số dư ví khi đơn HỦY hoặc MỞ LẠI ───────
CREATE OR REPLACE FUNCTION trg_hoan_vi_tra_truoc()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r       record;
  v_truoc bigint;
  v_sau   bigint;
BEGIN
  IF OLD.trang_thai IN ('da_thanh_toan', 'no_mot_phan')
     AND NEW.trang_thai IN ('huy', 'draft') THEN
    FOR r IN
      SELECT * FROM tra_truoc_giao_dich
      WHERE don_hang_id = NEW.id AND loai = 'su_dung'
    LOOP
      SELECT COALESCE(so_du_tra_truoc, 0) INTO v_truoc
      FROM khach_hang WHERE id = r.khach_hang_id FOR UPDATE;
      v_sau := v_truoc + r.so_tien;
      UPDATE khach_hang SET so_du_tra_truoc = v_sau WHERE id = r.khach_hang_id;
      INSERT INTO tra_truoc_giao_dich (
        khach_hang_id, loai, so_tien, so_du_truoc, so_du_sau, don_hang_id, ghi_chu, ngay
      ) VALUES (
        r.khach_hang_id, 'hoan', r.so_tien, v_truoc, v_sau, NEW.id,
        'Hoan vi do ' || CASE WHEN NEW.trang_thai = 'huy' THEN 'huy don' ELSE 'mo lai don' END,
        CURRENT_DATE
      );
      -- Xóa dòng su_dung để không hoàn lại lần 2 (chốt lại sẽ tạo su_dung mới)
      DELETE FROM tra_truoc_giao_dich WHERE id = r.id;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_don_hang_hoan_vi ON don_hang;
CREATE TRIGGER trg_don_hang_hoan_vi
  AFTER UPDATE OF trang_thai ON don_hang
  FOR EACH ROW
  EXECUTE FUNCTION trg_hoan_vi_tra_truoc();
