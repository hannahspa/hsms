-- ============================================================
-- MIGRATION 049: Loại bỏ khái niệm "commission", thống nhất "hoa_hong"
-- Ngày: 28/05/2026
-- Mục tiêu: Đồng bộ hoàn toàn khái niệm tiền nhân viên:
--   - nhan_vien_thu_nhap.loai: 'commission' → 'hoa_hong'
--   - pos_finalize_order: ghi 'hoa_hong' thay 'commission'
--   - DROP COLUMN don_hang_chi_tiet.tien_hoa_hong (LEGACY sau migration 048)
--   - Cập nhật CHECK constraint
-- ============================================================

BEGIN;

-- ── BƯỚC 1: DROP constraint cũ TRƯỚC (để UPDATE không bị block) ───────────
ALTER TABLE nhan_vien_thu_nhap
  DROP CONSTRAINT IF EXISTS nhan_vien_thu_nhap_loai_check;

-- Thêm constraint tạm cho phép cả hai giá trị trong quá trình chuyển
ALTER TABLE nhan_vien_thu_nhap
  ADD CONSTRAINT nhan_vien_thu_nhap_loai_check
  CHECK (loai IN ('tour', 'hoa_hong', 'commission', 'kpi', 'adjustment'));

-- ── BƯỚC 2: Đổi loai 'commission' → 'hoa_hong' trong nhan_vien_thu_nhap ─────
UPDATE nhan_vien_thu_nhap
SET loai = 'hoa_hong'
WHERE loai = 'commission';

-- ── BƯỚC 3: Đóng constraint — chỉ còn 'hoa_hong' (loại bỏ 'commission') ────
ALTER TABLE nhan_vien_thu_nhap
  DROP CONSTRAINT IF EXISTS nhan_vien_thu_nhap_loai_check;

ALTER TABLE nhan_vien_thu_nhap
  ADD CONSTRAINT nhan_vien_thu_nhap_loai_check
  CHECK (loai IN ('tour', 'hoa_hong', 'kpi', 'adjustment'));

-- ── BƯỚC 3: UPDATE RPC pos_finalize_order ─────────────────────────────────
-- Thay đổi:
--   a) Không còn fallback v_item.tien_hoa_hong (cột sẽ bị DROP)
--   b) INSERT loai = 'hoa_hong' thay vì 'commission'
-- ──────────────────────────────────────────────────────────────────────────
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
      SELECT SUM(COALESCE(tien_tour, 0) + COALESCE(tien_commission, 0))
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
      -- Tiền Tour: dich_vu, the_lieu_trinh
      -- Sau migration 048: tien_tour đã chứa đủ data, không cần fallback tien_hoa_hong
      v_tour_amount := CASE
        WHEN v_item.loai_item IN ('dich_vu', 'the_lieu_trinh')
        THEN COALESCE(v_item.tien_tour, 0)
        ELSE 0
      END;

      -- Tiền Hoa Hồng: san_pham, the_moi
      -- Sau migration 048: tien_commission đã chứa đủ data
      v_comm_amount := CASE
        WHEN v_item.loai_item IN ('san_pham', 'the_moi')
        THEN COALESCE(v_item.tien_commission, 0)
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

      -- ✅ Đổi loai = 'hoa_hong' (trước là 'commission')
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

-- ── BƯỚC 4: DROP LEGACY column tien_hoa_hong ──────────────────────────────
-- View v_myspa_legacy_overview phụ thuộc vào tien_hoa_hong (trong CTE old_lines)
-- → DROP view trước, rồi DROP column, rồi CREATE view lại (không có tien_hoa_hong)

DROP VIEW IF EXISTS v_myspa_legacy_overview;

ALTER TABLE don_hang_chi_tiet DROP COLUMN IF EXISTS tien_hoa_hong;

-- Tạo lại view v_myspa_legacy_overview (bỏ tien_hoa_hong khỏi CTE old_lines)
CREATE OR REPLACE VIEW v_myspa_legacy_overview AS
WITH old_orders AS (
  SELECT dh.id, dh.ma_don, dh.khach_hang_id, dh.nguoi_tao,
         dh.tong_tien_hang, dh.giam_gia, dh.thuc_thu, dh.con_no,
         dh.trang_thai, dh.ghi_chu, dh.tien_tour, dh.ngay,
         dh.created_at, dh.updated_at, dh.is_test, dh.vat
  FROM don_hang dh
  WHERE dh.ngay <= '2026-04-30'
),
old_lines AS (
  SELECT dhct.id, dhct.don_hang_id, dhct.loai_item,
         dhct.dich_vu_id, dhct.san_pham_id, dhct.the_lieu_trinh_id,
         dhct.nhan_vien_id, dhct.so_luong, dhct.don_gia, dhct.thanh_tien,
         dhct.ti_le_hoa_hong, dhct.ghi_chu, dhct.created_at, dhct.meta,
         dhct.tien_tour, dhct.tien_commission
  FROM don_hang_chi_tiet dhct
  JOIN old_orders dh ON dh.id = dhct.don_hang_id
),
synced AS (
  SELECT ma_don, line_no, ngay, ten_dich_vu, staff_name, staff_display,
         staff_status, matched_nhan_vien_id, commission_amount, raw_commission,
         cutoff_date, synced_at
  FROM myspa_legacy_staff_sync
)
SELECT 'old_orders'::text AS metric,
       COUNT(*)::numeric AS value, NULL::numeric AS amount FROM old_orders
UNION ALL
SELECT 'old_lines'::text AS metric,
       COUNT(*)::numeric AS value,
       COALESCE(SUM(thanh_tien), 0)::numeric AS amount FROM old_lines
UNION ALL
SELECT 'synced_staff_lines'::text AS metric,
       COUNT(*)::numeric AS value,
       COALESCE(SUM(commission_amount), 0)::numeric AS amount FROM synced
UNION ALL
SELECT 'matched_active_staff'::text AS metric,
       COUNT(*)::numeric AS value,
       COALESCE(SUM(commission_amount), 0)::numeric AS amount FROM synced WHERE staff_status = 'dang_lam'
UNION ALL
SELECT 'legacy_resigned_staff'::text AS metric,
       COUNT(*)::numeric AS value,
       COALESCE(SUM(commission_amount), 0)::numeric AS amount FROM synced WHERE staff_status = 'nghi_viec'
UNION ALL
SELECT 'missing_staff_name'::text AS metric,
       COUNT(*)::numeric AS value,
       COALESCE(SUM(commission_amount), 0)::numeric AS amount FROM synced WHERE staff_status = 'chua_co_ten'
UNION ALL
SELECT 'old_orders_without_payment_rows'::text AS metric,
       COUNT(*)::numeric AS value,
       COALESCE(SUM(dh.thuc_thu), 0)::numeric AS amount
FROM old_orders dh
LEFT JOIN (SELECT DISTINCT don_hang_id FROM thanh_toan) tt ON tt.don_hang_id = dh.id
WHERE tt.don_hang_id IS NULL
UNION ALL
SELECT 'old_orders_without_pos_revenue'::text AS metric,
       COUNT(*)::numeric AS value,
       COALESCE(SUM(dh.thuc_thu), 0)::numeric AS amount
FROM old_orders dh
LEFT JOIN (SELECT DISTINCT don_hang_id FROM doanh_thu WHERE nguon = 'pos') dt ON dt.don_hang_id = dh.id
WHERE dt.don_hang_id IS NULL AND COALESCE(dh.thuc_thu, 0) > 0;

COMMIT;

-- ── VERIFY ─────────────────────────────────────────────────────────────────
-- SELECT loai, COUNT(*) FROM nhan_vien_thu_nhap GROUP BY loai ORDER BY loai;
-- Kết quả mong đợi: chỉ còn 'tour', 'hoa_hong', 'kpi', 'adjustment'
-- KHÔNG còn 'commission'
