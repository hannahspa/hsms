-- ============================================================
-- MIGRATION 066: Fix công nợ ảo của thẻ liệu trình bán mới (Bug B)
-- Ngày: 03/06/2026
-- Vấn đề: migration 049 khi viết lại pos_finalize_order đã BỎ logic set
--   the_lieu_trinh.da_thanh_toan (vốn có ở migration 046) → thẻ mới luôn
--   da_thanh_toan = 0 → hiển thị "Nợ <gia_tri_the> / 0% đã trả" dù khách đã trả đủ.
--
-- Giải pháp (an toàn, cô lập, KHÔNG đụng pos_finalize_order 370 dòng):
--   Trigger BEFORE INSERT trên the_lieu_trinh — khi thẻ tạo từ đơn POS mà
--   chưa set da_thanh_toan, tự tính phần khách đã trả cho thẻ:
--     da_thanh_toan = (thuc_thu − con_no) × gia_tri_the / thuc_thu
--   (phân bổ theo tỉ lệ giá trị thẻ trên tổng đơn; đơn trả đủ → = gia_tri_the).
-- ============================================================

CREATE OR REPLACE FUNCTION trg_card_set_da_thanh_toan()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_dh        don_hang%ROWTYPE;
  v_da_tra    integer;
BEGIN
  -- Chỉ xử lý thẻ tạo từ đơn POS và chưa được set da_thanh_toan (>0)
  IF NEW.don_hang_id IS NULL OR COALESCE(NEW.da_thanh_toan, 0) > 0 THEN
    RETURN NEW;
  END IF;

  SELECT * INTO v_dh FROM don_hang WHERE id = NEW.don_hang_id;
  IF NOT FOUND OR COALESCE(v_dh.thuc_thu, 0) <= 0 THEN
    RETURN NEW;
  END IF;

  -- Tiền khách đã trả thật = thuc_thu − con_no, phân bổ theo tỉ lệ giá trị thẻ
  v_da_tra := LEAST(
    COALESCE(NEW.gia_tri_the, 0),
    GREATEST(0, ROUND(
      (COALESCE(v_dh.thuc_thu, 0) - COALESCE(v_dh.con_no, 0))::numeric
      * COALESCE(NEW.gia_tri_the, 0) / v_dh.thuc_thu
    ))
  );

  NEW.da_thanh_toan := v_da_tra;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_card_set_da_thanh_toan ON the_lieu_trinh;

CREATE TRIGGER trg_card_set_da_thanh_toan
  BEFORE INSERT ON the_lieu_trinh
  FOR EACH ROW
  EXECUTE FUNCTION trg_card_set_da_thanh_toan();

-- ── Sửa dữ liệu thẻ đã tạo sai (da_thanh_toan=0) từ đơn đã thanh toán đủ ──
-- Chỉ áp cho thẻ gắn đơn có con_no=0 (đã trả đủ) mà da_thanh_toan đang < gia_tri_the.
UPDATE the_lieu_trinh tlt
SET da_thanh_toan = tlt.gia_tri_the
FROM don_hang dh
WHERE tlt.don_hang_id = dh.id
  AND COALESCE(dh.con_no, 0) = 0
  AND COALESCE(dh.thuc_thu, 0) > 0
  AND COALESCE(tlt.da_thanh_toan, 0) < COALESCE(tlt.gia_tri_the, 0)
  AND tlt.trang_thai IN ('active', 'het_buoi');

-- VERIFY:
-- SELECT ma_the, gia_tri_the, da_thanh_toan, gia_tri_the - da_thanh_toan AS con_no
-- FROM the_lieu_trinh WHERE don_hang_id IS NOT NULL ORDER BY created_at DESC LIMIT 10;
