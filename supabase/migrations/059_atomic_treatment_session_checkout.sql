-- Atomic treatment-card session checkout.
-- Source of truth: the_lieu_trinh.so_buoi_da_dung.
-- so_buoi_con_lai may be a generated column in production, so never update it.

CREATE TABLE IF NOT EXISTS public.the_lieu_trinh_su_dung (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  the_lieu_trinh_id uuid NOT NULL REFERENCES public.the_lieu_trinh(id) ON DELETE CASCADE,
  ngay_su_dung date NOT NULL,
  ghi_chu text,
  nguoi_ghi text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tlt_su_dung_the ON public.the_lieu_trinh_su_dung(the_lieu_trinh_id);
CREATE INDEX IF NOT EXISTS idx_tlt_su_dung_ngay ON public.the_lieu_trinh_su_dung(ngay_su_dung);

CREATE OR REPLACE FUNCTION public.hsms_checkout_treatment_session(
  p_card_id uuid,
  p_ngay_su_dung date DEFAULT CURRENT_DATE,
  p_ghi_chu text DEFAULT NULL,
  p_nguoi_ghi text DEFAULT 'admin'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_card public.the_lieu_trinh%ROWTYPE;
  v_new_used integer;
  v_new_status text;
BEGIN
  SELECT *
  INTO v_card
  FROM public.the_lieu_trinh
  WHERE id = p_card_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Không tìm thấy thẻ liệu trình.');
  END IF;

  IF COALESCE(v_card.is_khong_gioi_han, false) IS FALSE
     AND COALESCE(v_card.so_buoi_tong, 0) <= COALESCE(v_card.so_buoi_da_dung, 0) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Thẻ đã hết buổi.');
  END IF;

  v_new_used := COALESCE(v_card.so_buoi_da_dung, 0) + 1;
  v_new_status := CASE
    WHEN COALESCE(v_card.is_khong_gioi_han, false) THEN COALESCE(v_card.trang_thai, 'active')
    WHEN COALESCE(v_card.so_buoi_tong, 0) - v_new_used <= 0 THEN 'het_buoi'
    ELSE COALESCE(v_card.trang_thai, 'active')
  END;

  UPDATE public.the_lieu_trinh
  SET
    so_buoi_da_dung = v_new_used,
    trang_thai = v_new_status
  WHERE id = p_card_id
  RETURNING * INTO v_card;

  INSERT INTO public.the_lieu_trinh_su_dung (
    the_lieu_trinh_id,
    ngay_su_dung,
    ghi_chu,
    nguoi_ghi
  )
  VALUES (
    p_card_id,
    COALESCE(p_ngay_su_dung, CURRENT_DATE),
    NULLIF(BTRIM(p_ghi_chu), ''),
    COALESCE(NULLIF(BTRIM(p_nguoi_ghi), ''), 'admin')
  );

  RETURN jsonb_build_object(
    'success', true,
    'card_id', v_card.id,
    'so_buoi_da_dung', v_card.so_buoi_da_dung,
    'so_buoi_con_lai', GREATEST(0, COALESCE(v_card.so_buoi_tong, 0) - COALESCE(v_card.so_buoi_da_dung, 0)),
    'trang_thai', v_card.trang_thai
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.hsms_checkout_treatment_session(uuid, date, text, text) TO anon, authenticated;
