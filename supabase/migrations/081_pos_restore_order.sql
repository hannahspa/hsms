-- ============================================================
-- MIGRATION 081: Khôi phục đơn đã hủy (Admin)
-- Ngày: 04/06/2026
-- pos_void_order chỉ set trang_thai='huy' + đảo ngược tác động (xóa thẻ/kho/
-- doanh_thu/ledger/cong_no) NHƯNG GIỮ don_hang_chi_tiet + thanh_toan.
-- → Khôi phục = đưa về 'draft' rồi chạy lại pos_finalize_order để DỰNG LẠI
--   thẻ liệu trình, kho, doanh thu, hoa hồng/tour y như lúc chốt.
-- Chỉ khôi phục được đơn CHƯA xóa vĩnh viễn (còn dòng hàng).
-- ============================================================

CREATE OR REPLACE FUNCTION pos_restore_order(p_don_hang_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
  SET statement_timeout = '120s'
AS $$
DECLARE
  v_dh   don_hang%ROWTYPE;
  v_cnt  integer := 0;
  v_res  jsonb;
BEGIN
  SELECT * INTO v_dh FROM don_hang WHERE id = p_don_hang_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Don hang khong ton tai');
  END IF;

  IF v_dh.trang_thai <> 'huy' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Chi khoi phuc duoc don DA HUY');
  END IF;

  SELECT COUNT(*) INTO v_cnt FROM don_hang_chi_tiet WHERE don_hang_id = p_don_hang_id;
  IF v_cnt = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Don da bi xoa vinh vien (khong con dong hang) — khong khoi phuc duoc');
  END IF;

  -- Đưa về nháp để finalize chạy lại dựng tác động
  UPDATE don_hang SET trang_thai = 'draft', con_no = 0, updated_at = now()
  WHERE id = p_don_hang_id;

  -- Chạy lại finalize (dựng lại thẻ LT / kho / doanh thu / tour-hoa hồng)
  v_res := pos_finalize_order(
    p_don_hang_id,
    'da_thanh_toan',
    COALESCE(v_dh.giam_gia, 0),
    COALESCE(v_dh.vat, 0),
    0,
    v_dh.ghi_chu
  );

  -- Nếu finalize không thành công → trả đơn về 'huy' (giữ nguyên hiện trạng)
  IF COALESCE((v_res->>'success')::boolean, false) IS NOT TRUE THEN
    UPDATE don_hang SET trang_thai = 'huy', updated_at = now() WHERE id = p_don_hang_id;
    RETURN jsonb_build_object('success', false,
      'error', COALESCE(v_res->>'error', 'Khong the khoi phuc don (finalize that bai)'));
  END IF;

  RETURN jsonb_build_object('success', true, 'ma_don', v_dh.ma_don, 'restored', true);
END;
$$;
