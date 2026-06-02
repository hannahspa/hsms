-- 061_link_appointment_to_pos_order.sql
-- Lien ket Lich Hen -> POS:
-- - Cho phep tao don POS nhap tu mot lich hen.
-- - Giu 1 don nhap dang mo cho moi lich hen de tranh bam lap tao nhieu don.

ALTER TABLE public.don_hang
  ADD COLUMN IF NOT EXISTS lich_hen_id uuid REFERENCES public.lich_hen(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_don_hang_lich_hen
  ON public.don_hang(lich_hen_id);

CREATE UNIQUE INDEX IF NOT EXISTS uniq_draft_don_hang_lich_hen
  ON public.don_hang(lich_hen_id)
  WHERE lich_hen_id IS NOT NULL AND trang_thai = 'draft';

COMMENT ON COLUMN public.don_hang.lich_hen_id IS
  'Lien ket don POS nhap tao tu lich hen, giup le tan mo lai dung don tu block lich.';
