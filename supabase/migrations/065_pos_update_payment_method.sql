-- ============================================================
-- MIGRATION 065: Đổi PTTT của đơn đã chốt (atomic, đồng bộ doanh_thu)
-- Ngày: 02/06/2026
-- Bug C: Khách đổi hình thức thanh toán sau khi tạo bill (vd quẹt thẻ → tiền mặt).
--   Phải đổi CẢ thanh_toan LẪN doanh_thu (đã đổ vào ví theo PTTT cũ),
--   nếu không số dư ví sẽ lệch.
-- Chỉ Admin gọi (RLS frontend kiểm soát). Có ghi nhật ký hoạt động.
-- ============================================================

CREATE OR REPLACE FUNCTION pos_update_payment_method(
  p_payment_id     uuid,
  p_new_hinh_thuc  text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pay           thanh_toan%ROWTYPE;
  v_old           text;
  v_dt_id         uuid;
  v_old_generates boolean;
  v_new_generates boolean;
BEGIN
  SELECT * INTO v_pay FROM thanh_toan WHERE id = p_payment_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Thanh toan khong ton tai');
  END IF;

  IF p_new_hinh_thuc NOT IN ('tien_mat', 'chuyen_khoan', 'quet_the', 'the_tra_truoc') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Hinh thuc thanh toan khong hop le');
  END IF;

  v_old := v_pay.hinh_thuc;
  IF v_old = p_new_hinh_thuc THEN
    RETURN jsonb_build_object('success', true, 'unchanged', true);
  END IF;

  -- the_tra_truoc bắt buộc có khách hàng
  IF p_new_hinh_thuc = 'the_tra_truoc' AND NOT EXISTS (
    SELECT 1 FROM don_hang WHERE id = v_pay.don_hang_id AND khach_hang_id IS NOT NULL
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'The tra truoc bat buoc don phai co khach hang');
  END IF;

  -- 1) Đổi PTTT trên thanh_toan
  UPDATE thanh_toan SET hinh_thuc = p_new_hinh_thuc WHERE id = p_payment_id;

  v_old_generates := v_old           IN ('tien_mat', 'chuyen_khoan', 'quet_the');
  v_new_generates := p_new_hinh_thuc IN ('tien_mat', 'chuyen_khoan', 'quet_the');

  -- 2) Tìm dòng doanh_thu POS tương ứng (cùng đơn, PTTT cũ, cùng số tiền) — đúng 1 dòng
  IF v_old_generates THEN
    SELECT id INTO v_dt_id
    FROM doanh_thu
    WHERE don_hang_id = v_pay.don_hang_id
      AND nguon = 'pos'
      AND hinh_thuc = v_old
      AND so_tien = v_pay.so_tien
    ORDER BY created_at
    LIMIT 1;
  END IF;

  -- 3) Đồng bộ doanh_thu theo PTTT mới
  IF v_new_generates THEN
    IF v_dt_id IS NOT NULL THEN
      UPDATE doanh_thu SET hinh_thuc = p_new_hinh_thuc WHERE id = v_dt_id;
    ELSE
      -- PTTT cũ là the_tra_truoc (không có doanh_thu) → tạo dòng doanh thu mới
      INSERT INTO doanh_thu (ngay, hinh_thuc, so_tien, dien_giai, nguoi_nhap, don_hang_id, nguon)
      SELECT dh.ngay, p_new_hinh_thuc, v_pay.so_tien, 'POS ' || dh.ma_don,
             (SELECT ho_ten FROM profiles WHERE id = dh.nguoi_tao), dh.id, 'pos'
      FROM don_hang dh WHERE dh.id = v_pay.don_hang_id;
    END IF;
  ELSE
    -- PTTT mới là the_tra_truoc (không vào cashflow) → xoá doanh_thu cũ nếu có
    IF v_dt_id IS NOT NULL THEN
      DELETE FROM doanh_thu WHERE id = v_dt_id;
    END IF;
  END IF;

  -- 4) Ghi nhật ký
  INSERT INTO nhat_ky_hoat_dong (nguoi_dung_id, hanh_dong, bang, du_lieu_cu, du_lieu_moi)
  VALUES (
    auth.uid(),
    'doi_pttt',
    'thanh_toan',
    jsonb_build_object('payment_id', p_payment_id, 'hinh_thuc', v_old),
    jsonb_build_object('payment_id', p_payment_id, 'hinh_thuc', p_new_hinh_thuc, 'don_hang_id', v_pay.don_hang_id)
  );

  RETURN jsonb_build_object('success', true, 'old', v_old, 'new', p_new_hinh_thuc, 'doanh_thu_id', v_dt_id);
END;
$$;
