-- 060_block_pos_overpayment.sql
-- POS backend guard:
-- - UI da chan tien nhan > tong don.
-- - Migration nay khoa tiep o DB de RPC/nguon khac khong the chot don neu
--   tong thanh_toan lon hon so phai thu cua don.
-- - Chan truoc khi don_hang roi trang_thai draft, nen khong tao doanh_thu sai.

CREATE OR REPLACE FUNCTION public.hsms_block_pos_overpayment()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_total_paid integer := 0;
BEGIN
  IF OLD.trang_thai = 'draft'
     AND NEW.trang_thai IN ('da_thanh_toan', 'no_mot_phan')
  THEN
    SELECT COALESCE(SUM(so_tien), 0)
    INTO v_total_paid
    FROM thanh_toan
    WHERE don_hang_id = NEW.id;

    IF v_total_paid > COALESCE(NEW.thuc_thu, 0) THEN
      RAISE EXCEPTION
        'So tien thanh toan (%) lon hon so phai thu (%) cua don %',
        v_total_paid, COALESCE(NEW.thuc_thu, 0), NEW.ma_don
        USING ERRCODE = '23514';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_hsms_block_pos_overpayment ON public.don_hang;

CREATE TRIGGER trg_hsms_block_pos_overpayment
BEFORE UPDATE OF trang_thai, thuc_thu ON public.don_hang
FOR EACH ROW
EXECUTE FUNCTION public.hsms_block_pos_overpayment();

COMMENT ON FUNCTION public.hsms_block_pos_overpayment() IS
  'Chan POS chot don khi tong thanh_toan lon hon thuc_thu, tranh tao doanh_thu/cashflow bi du.';
