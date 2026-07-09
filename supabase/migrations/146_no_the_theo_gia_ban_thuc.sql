-- ============================================================================
-- 146_no_the_theo_gia_ban_thuc.sql — Fix nợ thẻ tính theo GIÁ GỐC (09/07/2026)
-- ----------------------------------------------------------------------------
-- CA THỰC TẾ (Chị Mị, THE-LT-5085): thẻ Triệt Lông Nửa Đôi Chân giá gốc 4.5tr,
-- bán KM 70% → thực thu 1.35tr. Khách cọc 675k + thu nợ 675k = TRẢ ĐỦ.
-- Đơn con_no = 0 ✓ nhưng THẺ vẫn hiện "Nợ 1.575.000".
--
-- NGUYÊN NHÂN — trộn 2 đơn vị đo trong da_thanh_toan:
--   • Trigger 066 lúc tạo thẻ QUY ĐỔI tiền cọc sang "đơn vị giá gốc":
--     675k × (4.5tr/1.35tr) = 2.25tr
--   • pos_thu_no_the lại cộng TIỀN THẬT: 2.25tr + 675k = 2.925tr
--   • View v_cong_no_tong_hop: con_no = gia_tri_the(GỐC) − da_thanh_toan
--     = 4.5tr − 2.925tr = 1.575tr NỢ ẢO (đúng bằng phần giảm giá)
--
-- FIX — nợ thẻ phải tính trên GIÁ BÁN THỰC, da_thanh_toan luôn là TIỀN THẬT:
--   1. Cột mới the_lieu_trinh.gia_ban_thuc = phần thực thu phân bổ cho thẻ
--      (gia_tri_the GIỮ NGUYÊN = giá gốc/mệnh giá — vẫn dùng tính tour mỗi buổi)
--   2. Trigger tạo thẻ: set gia_ban_thuc + da_thanh_toan = tiền thật (không quy đổi)
--   3. View: con_no = COALESCE(gia_ban_thuc, gia_tri_the) − da_thanh_toan
--   4. pos_thu_no_the: cap tại gia_ban_thuc thay vì gia_tri_the
--   5. Backfill 68 thẻ gắn đơn POS (backup the_lieu_trinh_bak_no_20260709)
-- ============================================================================

-- ── 1. Cột giá bán thực ──────────────────────────────────────────────────────
ALTER TABLE public.the_lieu_trinh ADD COLUMN IF NOT EXISTS gia_ban_thuc integer;
COMMENT ON COLUMN public.the_lieu_trinh.gia_ban_thuc IS
  'Giá khách phải trả thật cho thẻ (thực thu đơn phân bổ theo tỉ trọng). NULL = fallback gia_tri_the. Nợ thẻ = gia_ban_thuc − da_thanh_toan.';

-- ── 2. Trigger tạo thẻ từ đơn POS (thay bản 066) ─────────────────────────────
CREATE OR REPLACE FUNCTION public.trg_card_set_da_thanh_toan()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_dh don_hang%ROWTYPE;
BEGIN
  IF NEW.don_hang_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT * INTO v_dh FROM don_hang WHERE id = NEW.don_hang_id;
  IF NOT FOUND OR COALESCE(v_dh.thuc_thu, 0) <= 0 OR COALESCE(v_dh.tong_tien_hang, 0) <= 0 THEN
    RETURN NEW;
  END IF;

  -- Giá bán thực của thẻ = thực thu đơn phân bổ theo tỉ trọng giá trị thẻ
  -- (giảm giá ghi ở cấp đơn nên chia đều theo tỉ trọng; đơn 1 thẻ → = thuc_thu)
  IF NEW.gia_ban_thuc IS NULL THEN
    NEW.gia_ban_thuc := ROUND(
      COALESCE(NEW.gia_tri_the, 0)::numeric * v_dh.thuc_thu / v_dh.tong_tien_hang
    );
  END IF;

  -- da_thanh_toan = TIỀN THẬT khách đã trả cho thẻ (KHÔNG quy đổi sang giá gốc)
  -- = (thuc_thu − con_no) phân bổ theo tỉ trọng giá bán thực của thẻ trên đơn
  IF COALESCE(NEW.da_thanh_toan, 0) = 0 THEN
    NEW.da_thanh_toan := LEAST(
      COALESCE(NEW.gia_ban_thuc, 0),
      GREATEST(0, ROUND(
        (v_dh.thuc_thu - COALESCE(v_dh.con_no, 0))::numeric
        * COALESCE(NEW.gia_ban_thuc, 0) / v_dh.thuc_thu
      ))
    );
  END IF;

  RETURN NEW;
END;
$$;
-- (trigger trg_card_set_da_thanh_toan BEFORE INSERT đã tồn tại từ 066 — giữ nguyên)

-- ── 3. View công nợ: nợ trên GIÁ BÁN THỰC ────────────────────────────────────
CREATE OR REPLACE VIEW public.v_cong_no_tong_hop AS
SELECT
  kh.id              AS khach_hang_id,
  kh.ho_ten          AS ten_khach,
  kh.so_dien_thoai,
  tlt.id             AS the_lieu_trinh_id,
  tlt.ten_dich_vu,
  tlt.gia_tri_the,
  COALESCE(tlt.da_thanh_toan, 0)                           AS da_thanh_toan,
  COALESCE(tlt.gia_ban_thuc, tlt.gia_tri_the, 0)
    - COALESCE(tlt.da_thanh_toan, 0)                       AS con_no,
  ROUND(
    COALESCE(tlt.da_thanh_toan, 0)::numeric
    / NULLIF(COALESCE(tlt.gia_ban_thuc, tlt.gia_tri_the), 0) * 100, 1
  )                                                         AS pct_da_tra,
  CASE
    WHEN COALESCE(tlt.da_thanh_toan, 0)
         < ROUND(COALESCE(tlt.gia_ban_thuc, tlt.gia_tri_the, 0) * 0.30)
    THEN false ELSE true
  END                                                       AS du_30_pct,
  tlt.trang_thai,
  tlt.ngay_mua,
  dh.ma_don,
  dh.id              AS don_hang_id,
  tlt.gia_ban_thuc
FROM the_lieu_trinh tlt
JOIN khach_hang kh ON kh.id = tlt.khach_hang_id
LEFT JOIN don_hang dh ON dh.id = tlt.don_hang_id
WHERE COALESCE(tlt.gia_ban_thuc, tlt.gia_tri_the, 0) > COALESCE(tlt.da_thanh_toan, 0)
  AND tlt.trang_thai NOT IN ('huy')
ORDER BY con_no DESC;

-- ── 4. pos_thu_no_the: cap nợ theo giá bán thực ─────────────────────────────
CREATE OR REPLACE FUNCTION public.pos_thu_no_the(
  p_the_lieu_trinh_id uuid, p_so_tien integer, p_hinh_thuc text,
  p_nguoi_thu text, p_ghi_chu text DEFAULT NULL::text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_the               the_lieu_trinh%ROWTYPE;
  v_don_hang          don_hang%ROWTYPE;
  v_tv                record;
  v_comm              integer;
  v_gia_ban           integer;
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

  -- Nợ tối đa = GIÁ BÁN THỰC (không phải giá gốc/mệnh giá gia_tri_the)
  v_gia_ban := COALESCE(v_the.gia_ban_thuc, v_the.gia_tri_the, 0);

  -- Tính tiền thực sự thu (không vượt số nợ còn lại)
  v_da_thanh_toan_moi := LEAST(v_gia_ban, COALESCE(v_the.da_thanh_toan, 0) + p_so_tien);
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

    -- Cập nhật cong_no_khach_hang (loai='thanh_toan' đúng CHECK constraint)
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
        'thanh_toan',
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

    -- Hoa hồng bổ sung theo đợt THU NỢ (debt-aware): cộng hoa hồng cho NV bán thẻ
    FOR v_tv IN
      SELECT dhct.nhan_vien_id, dhct.ti_le_hoa_hong
      FROM don_hang_chi_tiet dhct
      WHERE dhct.don_hang_id = v_the.don_hang_id
        AND dhct.loai_item = 'the_moi'
        AND dhct.nhan_vien_id = v_the.nhan_vien_ban_id
        AND COALESCE(dhct.ti_le_hoa_hong, 0) > 0
    LOOP
      v_comm := ROUND(v_so_tien_thuc::numeric * v_tv.ti_le_hoa_hong / 100);
      IF v_comm > 0 THEN
        INSERT INTO nhan_vien_thu_nhap (
          don_hang_id, nhan_vien_id, loai, nguon, ngay,
          doanh_so_tinh, ti_le, so_tien, trang_thai, is_test, ghi_chu
        ) VALUES (
          v_the.don_hang_id,
          v_tv.nhan_vien_id,
          'hoa_hong', 'pos',
          CURRENT_DATE,
          v_so_tien_thuc,
          v_tv.ti_le_hoa_hong,
          v_comm,
          'phat_sinh', false,
          'Thu no the ' || COALESCE(v_don_hang.ma_don, '') ||
          ' ngay ' || TO_CHAR(CURRENT_DATE, 'DD/MM/YYYY')
        );
      END IF;
    END LOOP;

    RETURN jsonb_build_object(
      'success',             true,
      'so_tien_thu',         v_so_tien_thuc,
      'da_thanh_toan',       v_da_thanh_toan_moi,
      'con_lai',             v_gia_ban - v_da_thanh_toan_moi,
      'don_hang_trang_thai', CASE WHEN v_con_no_moi = 0 THEN 'da_thanh_toan' ELSE 'no_mot_phan' END
    );
  EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
  END;
END;
$function$;

-- ── 5. Backfill thẻ đã bán qua POS (68 thẻ — backup trước) ───────────────────
CREATE TABLE IF NOT EXISTS public.the_lieu_trinh_bak_no_20260709 AS
SELECT id, ma_the, gia_tri_the, da_thanh_toan, now() AS bak_at
FROM public.the_lieu_trinh WHERE don_hang_id IS NOT NULL;

UPDATE public.the_lieu_trinh tlt SET
  gia_ban_thuc = ROUND(tlt.gia_tri_the::numeric * dh.thuc_thu / dh.tong_tien_hang),
  da_thanh_toan = GREATEST(0,
      ROUND(tlt.gia_tri_the::numeric * dh.thuc_thu / dh.tong_tien_hang)
    - ROUND(COALESCE(dh.con_no, 0)::numeric * tlt.gia_tri_the / dh.tong_tien_hang))
FROM public.don_hang dh
WHERE tlt.don_hang_id = dh.id
  AND COALESCE(dh.tong_tien_hang, 0) > 0
  AND COALESCE(dh.thuc_thu, 0) > 0;

-- ═══ VERIFY ═══
-- Thẻ Chị Mị hết nợ ảo:
--   SELECT ma_the, gia_tri_the, gia_ban_thuc, da_thanh_toan,
--          COALESCE(gia_ban_thuc, gia_tri_the) - da_thanh_toan AS con_no
--   FROM the_lieu_trinh WHERE ma_the = 'THE-LT-5085';
--   → gia_ban_thuc = 1.350.000, da_thanh_toan = 1.350.000, con_no = 0
-- View sạch: SELECT count(*) FROM v_cong_no_tong_hop;
