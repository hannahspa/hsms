-- Migration 091: Backfill AI Marketing changes added after remote 078
-- Remote production already has migration 078, so these idempotent changes must run separately.

ALTER TABLE public.marketing_content_calendar
  DROP CONSTRAINT IF EXISTS marketing_content_calendar_kenh_check;

ALTER TABLE public.marketing_content_calendar
  ADD CONSTRAINT marketing_content_calendar_kenh_check
  CHECK (kenh IN ('facebook','zalo','tiktok','google','website','in_an','khac'));

CREATE TABLE IF NOT EXISTS public.marketing_automation_runs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mode            text NOT NULL,
  status          text NOT NULL DEFAULT 'success'
                  CHECK (status IN ('success','error')),
  input_payload   jsonb NOT NULL DEFAULT '{}'::jsonb,
  result_payload  jsonb NOT NULL DEFAULT '{}'::jsonb,
  error_message   text,
  created_at      timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mkt_automation_runs_mode_created
  ON public.marketing_automation_runs(mode, created_at DESC);

ALTER TABLE public.marketing_automation_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_all_marketing_automation_runs" ON public.marketing_automation_runs;
CREATE POLICY "admin_all_marketing_automation_runs" ON public.marketing_automation_runs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.vai_tro = 'admin'
    )
  );

CREATE OR REPLACE FUNCTION public.marketing_sync_lead_from_appointment()
RETURNS trigger AS $$
BEGIN
  IF NEW.marketing_lead_id IS NULL THEN
    RETURN NEW;
  END IF;

  UPDATE public.marketing_leads ml
  SET
    khach_hang_id = COALESCE(ml.khach_hang_id, NEW.khach_hang_id),
    trang_thai = CASE
      WHEN ml.trang_thai IN ('moi','dang_tu_van') THEN 'da_dat_hen'
      ELSE ml.trang_thai
    END,
    ai_next_best_action = CASE
      WHEN ml.trang_thai IN ('moi','dang_tu_van') THEN 'Theo doi khach den spa va chot don POS'
      ELSE ml.ai_next_best_action
    END,
    metadata = COALESCE(ml.metadata, '{}'::jsonb) || jsonb_build_object(
      'last_appointment_id', NEW.id,
      'last_appointment_status', NEW.trang_thai,
      'last_appointment_at', now()
    )
  WHERE ml.id = NEW.marketing_lead_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_marketing_sync_lead_from_appointment ON public.lich_hen;
CREATE TRIGGER trg_marketing_sync_lead_from_appointment
AFTER INSERT OR UPDATE OF marketing_lead_id, khach_hang_id, trang_thai ON public.lich_hen
FOR EACH ROW EXECUTE FUNCTION public.marketing_sync_lead_from_appointment();

CREATE OR REPLACE FUNCTION public.marketing_sync_lead_from_order()
RETURNS trigger AS $$
BEGIN
  IF NEW.marketing_lead_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.trang_thai NOT IN ('da_thanh_toan','no_mot_phan') THEN
    RETURN NEW;
  END IF;

  UPDATE public.marketing_leads ml
  SET
    khach_hang_id = COALESCE(ml.khach_hang_id, NEW.khach_hang_id),
    trang_thai = 'da_mua',
    ai_next_best_action = 'Cham soc sau mua va hen lich tai kham',
    metadata = COALESCE(ml.metadata, '{}'::jsonb) || jsonb_build_object(
      'last_order_id', NEW.id,
      'last_order_status', NEW.trang_thai,
      'last_order_revenue', COALESCE(NEW.thuc_thu, 0),
      'last_order_at', now()
    )
  WHERE ml.id = NEW.marketing_lead_id;

  UPDATE public.khach_hang kh
  SET
    marketing_lead_id = COALESCE(kh.marketing_lead_id, NEW.marketing_lead_id),
    chien_dich_marketing_id = COALESCE(kh.chien_dich_marketing_id, NEW.chien_dich_marketing_id)
  WHERE kh.id = NEW.khach_hang_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_marketing_sync_lead_from_order ON public.don_hang;
CREATE TRIGGER trg_marketing_sync_lead_from_order
AFTER INSERT OR UPDATE OF marketing_lead_id, khach_hang_id, chien_dich_marketing_id, trang_thai, thuc_thu ON public.don_hang
FOR EACH ROW EXECUTE FUNCTION public.marketing_sync_lead_from_order();

COMMENT ON TABLE public.marketing_automation_runs IS 'Nhat ky moi lan Edge Function AI Marketing chay: webhook, phan tich, tao noi dung, chay hanh dong.';
