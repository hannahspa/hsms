-- Migration 104: Link customer visit logs back to Fanpage care queue
-- Giu dau vet: nhat ky khach den nao duoc tao tu khach Fanpage nao.

ALTER TABLE public.nhat_ky_khach_den
  ADD COLUMN IF NOT EXISTS fanpage_segment_id uuid REFERENCES public.marketing_fanpage_customer_segments(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS platform_user_id text;

CREATE INDEX IF NOT EXISTS idx_nhat_ky_khach_den_fanpage_segment
  ON public.nhat_ky_khach_den(fanpage_segment_id)
  WHERE fanpage_segment_id IS NOT NULL;

ALTER TABLE public.marketing_fanpage_customer_segments
  DROP CONSTRAINT IF EXISTS marketing_fanpage_customer_segments_care_status_check;

ALTER TABLE public.marketing_fanpage_customer_segments
  ADD CONSTRAINT marketing_fanpage_customer_segments_care_status_check
  CHECK (care_status IN (
    'chua_cham_soc',
    'dang_cham_soc',
    'da_cham_soc',
    'da_hen_lai',
    'khong_lien_he_duoc',
    'tam_ngung'
  ));

COMMENT ON COLUMN public.nhat_ky_khach_den.fanpage_segment_id IS
  'Lien ket ve khach trong hang doi Fanpage neu nhat ky duoc tao tu man hinh cham soc Fanpage.';
COMMENT ON COLUMN public.nhat_ky_khach_den.platform_user_id IS
  'Ma nguoi dung tren kenh nhan tin, dung de doi chieu Fanpage/Zalo neu co.';

NOTIFY pgrst, 'reload schema';
