-- HSMS POS: payment rows must not stay attached to draft orders.
-- Draft orders can be edited/resumed; payment rows are recreated right before finalize.
-- Keep a backup before cleanup so the reception team can reconcile if needed.

CREATE TABLE IF NOT EXISTS public.backup_draft_order_payments_20260602 AS
SELECT
  tt.*,
  dh.ma_don,
  dh.trang_thai AS don_hang_trang_thai,
  now() AS backed_up_at
FROM public.thanh_toan tt
JOIN public.don_hang dh ON dh.id = tt.don_hang_id
WHERE false;

INSERT INTO public.backup_draft_order_payments_20260602
SELECT
  tt.*,
  dh.ma_don,
  dh.trang_thai AS don_hang_trang_thai,
  now() AS backed_up_at
FROM public.thanh_toan tt
JOIN public.don_hang dh ON dh.id = tt.don_hang_id
WHERE dh.trang_thai IN ('draft', 'cho_thanh_toan')
  AND NOT EXISTS (
    SELECT 1
    FROM public.backup_draft_order_payments_20260602 b
    WHERE b.id = tt.id
  );

DELETE FROM public.thanh_toan tt
USING public.don_hang dh
WHERE dh.id = tt.don_hang_id
  AND dh.trang_thai IN ('draft', 'cho_thanh_toan');
