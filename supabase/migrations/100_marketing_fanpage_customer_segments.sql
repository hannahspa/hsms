-- Migration 100: Fanpage customer segmentation
-- Gom inbox Fanpage thanh tung khach/dinh danh de cham soc lai va remarketing.

CREATE TABLE IF NOT EXISTS public.marketing_fanpage_customer_segments (
  id                         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identity_key               text NOT NULL UNIQUE,
  kenh                       text NOT NULL DEFAULT 'facebook'
                             CHECK (kenh IN ('facebook','zalo','tiktok','google','website','khac')),
  phone_norm                 text,
  platform_user_id           text,
  display_name               text,
  conversation_ids           text[] NOT NULL DEFAULT ARRAY[]::text[],
  first_message_at           timestamptz,
  last_message_at            timestamptz,
  total_messages             integer NOT NULL DEFAULT 0,
  inbound_messages           integer NOT NULL DEFAULT 0,
  outbound_messages          integer NOT NULL DEFAULT 0,
  has_phone                  boolean NOT NULL DEFAULT false,
  has_booking_signal         boolean NOT NULL DEFAULT false,
  has_price_signal           boolean NOT NULL DEFAULT false,
  has_service_signal         boolean NOT NULL DEFAULT false,
  has_complaint_signal       boolean NOT NULL DEFAULT false,
  services_interest          text[] NOT NULL DEFAULT ARRAY[]::text[],
  segment                    text NOT NULL DEFAULT 'tuong_tac_thap',
  priority_score             integer NOT NULL DEFAULT 0,
  quality_score              integer NOT NULL DEFAULT 0,
  care_status                text NOT NULL DEFAULT 'chua_cham_soc'
                             CHECK (care_status IN ('chua_cham_soc','dang_cham_soc','da_hen_lai','khong_lien_he_duoc','tam_ngung')),
  care_goal                  text,
  suggested_action           text,
  suggested_script           text,
  next_contact_at            date,
  raw_summary                jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at                 timestamptz DEFAULT now(),
  updated_at                 timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mkt_fanpage_segments_segment
  ON public.marketing_fanpage_customer_segments(segment, priority_score DESC);
CREATE INDEX IF NOT EXISTS idx_mkt_fanpage_segments_phone
  ON public.marketing_fanpage_customer_segments(phone_norm)
  WHERE phone_norm IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mkt_fanpage_segments_next_contact
  ON public.marketing_fanpage_customer_segments(next_contact_at, priority_score DESC);
CREATE INDEX IF NOT EXISTS idx_mkt_fanpage_segments_last_message
  ON public.marketing_fanpage_customer_segments(last_message_at DESC);

DROP TRIGGER IF EXISTS trg_mkt_fanpage_segments_updated_at ON public.marketing_fanpage_customer_segments;
CREATE TRIGGER trg_mkt_fanpage_segments_updated_at
BEFORE UPDATE ON public.marketing_fanpage_customer_segments
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.marketing_fanpage_customer_segments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_le_tan_all_mkt_fanpage_segments" ON public.marketing_fanpage_customer_segments;
CREATE POLICY "admin_le_tan_all_mkt_fanpage_segments" ON public.marketing_fanpage_customer_segments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.vai_tro IN ('admin','le_tan')
    )
  );

CREATE OR REPLACE FUNCTION public.refresh_marketing_fanpage_customer_segments(p_since date DEFAULT DATE '2022-11-26')
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_upserted integer := 0;
  v_total integer := 0;
BEGIN
  WITH base AS (
    SELECT
      mm.id,
      mm.direction,
      mm.sender_type,
      mm.sender_name,
      COALESCE(mm.noi_dung, '') AS noi_dung,
      mm.created_at,
      COALESCE(
        mm.metadata->>'conversation_id',
        mm.metadata->'raw_conversation'->>'id',
        mm.platform_message_id,
        mm.id::text
      ) AS conversation_id,
      CASE
        WHEN mm.direction = 'inbound' AND mm.sender_type = 'customer'
          THEN mm.metadata->'raw_message'->'from'->>'id'
        ELSE NULL
      END AS platform_user_id,
      CASE
        WHEN mm.direction = 'inbound' AND mm.sender_type = 'customer'
          THEN COALESCE(mm.sender_name, mm.metadata->'raw_message'->'from'->>'name')
        ELSE NULL
      END AS customer_name,
      CASE
        WHEN mm.direction = 'inbound' AND mm.sender_type = 'customer'
          THEN public.normalize_vn_phone(mm.noi_dung)
        ELSE NULL
      END AS phone_norm
    FROM public.marketing_messages mm
    WHERE mm.kenh = 'facebook'
      AND mm.created_at >= p_since::timestamptz
      AND mm.direction IN ('inbound','outbound','internal')
  ),
  conversation_rollup AS (
    SELECT
      conversation_id,
      MAX(platform_user_id) FILTER (WHERE platform_user_id IS NOT NULL) AS platform_user_id,
      MAX(customer_name) FILTER (WHERE customer_name IS NOT NULL) AS display_name,
      MAX(phone_norm) FILTER (WHERE phone_norm IS NOT NULL) AS phone_norm,
      MIN(created_at) AS first_message_at,
      MAX(created_at) AS last_message_at,
      COUNT(*)::integer AS total_messages,
      COUNT(*) FILTER (WHERE direction = 'inbound' AND sender_type = 'customer')::integer AS inbound_messages,
      COUNT(*) FILTER (WHERE direction = 'outbound')::integer AS outbound_messages,
      LEFT(STRING_AGG(noi_dung, E'\n' ORDER BY created_at), 12000) AS full_text
    FROM base
    GROUP BY conversation_id
  ),
  identity_rollup AS (
    SELECT
      COALESCE(phone_norm, platform_user_id, conversation_id) AS identity_key,
      MAX(phone_norm) FILTER (WHERE phone_norm IS NOT NULL) AS phone_norm,
      MAX(platform_user_id) FILTER (WHERE platform_user_id IS NOT NULL) AS platform_user_id,
      MAX(display_name) FILTER (WHERE display_name IS NOT NULL) AS display_name,
      ARRAY_AGG(DISTINCT conversation_id) AS conversation_ids,
      MIN(first_message_at) AS first_message_at,
      MAX(last_message_at) AS last_message_at,
      SUM(total_messages)::integer AS total_messages,
      SUM(inbound_messages)::integer AS inbound_messages,
      SUM(outbound_messages)::integer AS outbound_messages,
      LEFT(STRING_AGG(full_text, E'\n---\n' ORDER BY last_message_at DESC), 20000) AS full_text
    FROM conversation_rollup
    WHERE inbound_messages > 0
    GROUP BY COALESCE(phone_norm, platform_user_id, conversation_id)
  ),
  scored AS (
    SELECT
      ir.*,
      (phone_norm IS NOT NULL) AS has_phone,
      (full_text ~* '(đặt\s*lịch|dat\s*lich|hẹn|hen|dời\s*lịch|doi\s*lich|qua\s*(bên|spa)|ghe\s*qua|giữ\s*lịch|giu\s*lich|xác\s*nhận\s*lịch|xac\s*nhan\s*lich)') AS has_booking_signal,
      (full_text ~* '(giá|gia|bao\s*nhiêu|bao\s*nhieu|combo|khuyến\s*mãi|khuyen\s*mai|ưu\s*đãi|uu\s*dai)') AS has_price_signal,
      (full_text ~* '(triệt|triet|lông|long|gội|goi|massage|mụn|mun|nám|nam|da|liệu\s*trình|lieu\s*trinh|phun|xăm|xam|giảm\s*béo|giam\s*beo|giảm\s*mỡ|giam\s*mo|cổ\s*vai\s*gáy|co\s*vai\s*gay|dưỡng\s*sinh|duong\s*sinh|spa|dịch\s*vụ|dich\s*vu|thẻ|the)') AS has_service_signal,
      (full_text ~* '(khiếu\s*nại|khieu\s*nai|phàn\s*nàn|phan\s*nan|hoàn\s*tiền|hoan\s*tien|không\s*hài\s*lòng|khong\s*hai\s*long|dị\s*ứng|di\s*ung|bị\s*bỏng|bi\s*bong|lừa\s*đảo|lua\s*dao|không\s*hiệu\s*quả|khong\s*hieu\s*qua)') AS has_complaint_signal,
      ARRAY_REMOVE(ARRAY[
        CASE WHEN full_text ~* '(triệt|triet|lông|long)' THEN 'Triệt lông' END,
        CASE WHEN full_text ~* '(gội|goi|dưỡng\s*sinh|duong\s*sinh)' THEN 'Gội đầu dưỡng sinh' END,
        CASE WHEN full_text ~* '(massage|cổ\s*vai\s*gáy|co\s*vai\s*gay|body)' THEN 'Massage' END,
        CASE WHEN full_text ~* '(mụn|mun|nám|nam|da|sẹo|seo)' THEN 'Chăm sóc da' END,
        CASE WHEN full_text ~* '(phun|xăm|xam|môi|mày|mi)' THEN 'Phun xăm thẩm mỹ' END,
        CASE WHEN full_text ~* '(giảm\s*béo|giam\s*beo|giảm\s*mỡ|giam\s*mo|eo|bụng|bung)' THEN 'Giảm béo' END,
        CASE WHEN full_text ~* '(thẻ|the|liệu\s*trình|lieu\s*trinh|buổi|buoi)' THEN 'Thẻ liệu trình' END
      ], NULL) AS services_interest
    FROM identity_rollup ir
  ),
  classified AS (
    SELECT
      s.*,
      CASE
        WHEN has_complaint_signal THEN 'can_xu_ly_rieng'
        WHEN has_phone AND has_booking_signal THEN 'khach_dat_hen_co_sdt'
        WHEN has_phone AND last_message_at < ((now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date - INTERVAL '180 days') THEN 'khach_cu_co_sdt_can_goi_lai'
        WHEN has_phone AND (has_price_signal OR has_service_signal) THEN 'khach_nong_co_sdt'
        WHEN has_phone THEN 'co_sdt_can_cham_soc'
        WHEN NOT has_phone AND (has_booking_signal OR has_price_signal OR has_service_signal) THEN 'tiem_nang_chua_co_sdt'
        ELSE 'tuong_tac_thap'
      END AS segment,
      LEAST(100, GREATEST(0,
        (CASE WHEN has_phone THEN 35 ELSE 0 END) +
        (CASE WHEN has_booking_signal THEN 30 ELSE 0 END) +
        (CASE WHEN has_price_signal THEN 15 ELSE 0 END) +
        (CASE WHEN has_service_signal THEN 15 ELSE 0 END) +
        (CASE WHEN has_complaint_signal THEN 20 ELSE 0 END) +
        LEAST(20, inbound_messages * 2)
      ))::integer AS quality_score
    FROM scored s
  ),
  prepared AS (
    SELECT
      identity_key,
      'facebook'::text AS kenh,
      phone_norm,
      platform_user_id,
      display_name,
      conversation_ids,
      first_message_at,
      last_message_at,
      total_messages,
      inbound_messages,
      outbound_messages,
      has_phone,
      has_booking_signal,
      has_price_signal,
      has_service_signal,
      has_complaint_signal,
      services_interest,
      segment,
      CASE segment
        WHEN 'can_xu_ly_rieng' THEN 100
        WHEN 'khach_dat_hen_co_sdt' THEN 95
        WHEN 'khach_nong_co_sdt' THEN 90
        WHEN 'khach_cu_co_sdt_can_goi_lai' THEN 85
        WHEN 'co_sdt_can_cham_soc' THEN 75
        WHEN 'tiem_nang_chua_co_sdt' THEN 60
        ELSE 20
      END AS priority_score,
      quality_score,
      CASE segment
        WHEN 'can_xu_ly_rieng' THEN 'Chủ/quản lý xem lại nội dung trước khi nhắn.'
        WHEN 'khach_dat_hen_co_sdt' THEN 'Xác nhận lại nhu cầu và mời đặt lịch gần nhất.'
        WHEN 'khach_nong_co_sdt' THEN 'Gọi/Zalo trong ngày, tư vấn đúng dịch vụ khách đã hỏi.'
        WHEN 'khach_cu_co_sdt_can_goi_lai' THEN 'Mời khách quay lại bằng ưu đãi chăm sóc khách cũ.'
        WHEN 'co_sdt_can_cham_soc' THEN 'Gọi xác minh nhu cầu, hỏi khách còn muốn làm dịch vụ nào.'
        WHEN 'tiem_nang_chua_co_sdt' THEN 'Inbox xin SĐT/Zalo để tư vấn kỹ và giữ lịch.'
        ELSE 'Nuôi dưỡng nhẹ bằng nội dung/ưu đãi, chưa ưu tiên gọi.'
      END AS care_goal,
      CASE segment
        WHEN 'can_xu_ly_rieng' THEN 'Đọc kỹ hội thoại, gọi xin lỗi/xử lý nếu có khiếu nại.'
        WHEN 'khach_dat_hen_co_sdt' THEN 'Gọi xác nhận lịch và gợi ý dịch vụ đi kèm phù hợp.'
        WHEN 'khach_nong_co_sdt' THEN 'Gọi ngay, nhắc đúng dịch vụ khách từng hỏi và chốt khung giờ.'
        WHEN 'khach_cu_co_sdt_can_goi_lai' THEN 'Gửi lời hỏi thăm, nhắc Hannah còn lưu lịch sử tư vấn và mời quay lại.'
        WHEN 'co_sdt_can_cham_soc' THEN 'Gọi/Zalo hỏi nhu cầu hiện tại, phân lại dịch vụ quan tâm.'
        WHEN 'tiem_nang_chua_co_sdt' THEN 'Nhắn inbox xin số điện thoại để tư vấn nhanh hơn.'
        ELSE 'Chỉ đưa vào tệp remarketing rộng, chưa giao nhân viên gọi.'
      END AS suggested_action,
      CASE segment
        WHEN 'can_xu_ly_rieng' THEN 'Em chào chị, Hannah Spa đã xem lại tin nhắn cũ của mình. Em xin phép được gọi lại để nghe rõ hơn và hỗ trợ mình cho đúng ạ.'
        WHEN 'khach_dat_hen_co_sdt' THEN 'Em chào chị, em là Hannah Spa. Trước đây mình có trao đổi/đặt lịch bên em về dịch vụ. Tuần này mình muốn em giữ lại khung giờ nào để mình ghé chăm sóc lại không ạ?'
        WHEN 'khach_nong_co_sdt' THEN 'Em chào chị, em là Hannah Spa. Trước đây mình có hỏi bên em về dịch vụ. Hiện bên em có lịch trống và ưu đãi chăm sóc lại, em tư vấn nhanh cho mình qua Zalo được không ạ?'
        WHEN 'khach_cu_co_sdt_can_goi_lai' THEN 'Em chào chị, lâu rồi Hannah chưa được đón mình lại spa. Bên em đang có chương trình chăm sóc khách cũ, em gửi mình lựa chọn phù hợp với nhu cầu trước đây nhé ạ.'
        WHEN 'co_sdt_can_cham_soc' THEN 'Em chào chị, em là Hannah Spa. Em thấy trước đây mình từng inbox bên em, hiện mình còn nhu cầu chăm sóc da/body/gội dưỡng sinh không để em tư vấn đúng hơn ạ?'
        WHEN 'tiem_nang_chua_co_sdt' THEN 'Dạ Hannah Spa chào mình. Để tư vấn kỹ và giữ lịch nhanh hơn, mình cho em xin SĐT/Zalo tiện liên hệ được không ạ?'
        ELSE 'Dạ Hannah Spa chào mình. Khi nào mình cần tư vấn dịch vụ hoặc đặt lịch, Hannah luôn sẵn sàng hỗ trợ mình ạ.'
      END AS suggested_script,
      CASE
        WHEN segment IN ('can_xu_ly_rieng','khach_dat_hen_co_sdt','khach_nong_co_sdt') THEN (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date
        WHEN segment IN ('khach_cu_co_sdt_can_goi_lai','co_sdt_can_cham_soc') THEN ((now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date + 1)
        WHEN segment = 'tiem_nang_chua_co_sdt' THEN ((now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date + 2)
        ELSE ((now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date + 7)
      END AS next_contact_at,
      jsonb_build_object(
        'conversation_ids', to_jsonb(conversation_ids),
        'service_keywords', to_jsonb(services_interest),
        'first_message_at', first_message_at,
        'last_message_at', last_message_at,
        'auto_classified_at', now(),
        'classifier_version', '2026-06-11-refined-complaint'
      ) AS raw_summary
    FROM classified
  ),
  upserted AS (
    INSERT INTO public.marketing_fanpage_customer_segments (
      identity_key,
      kenh,
      phone_norm,
      platform_user_id,
      display_name,
      conversation_ids,
      first_message_at,
      last_message_at,
      total_messages,
      inbound_messages,
      outbound_messages,
      has_phone,
      has_booking_signal,
      has_price_signal,
      has_service_signal,
      has_complaint_signal,
      services_interest,
      segment,
      priority_score,
      quality_score,
      care_goal,
      suggested_action,
      suggested_script,
      next_contact_at,
      raw_summary
    )
    SELECT
      identity_key,
      kenh,
      phone_norm,
      platform_user_id,
      display_name,
      conversation_ids,
      first_message_at,
      last_message_at,
      total_messages,
      inbound_messages,
      outbound_messages,
      has_phone,
      has_booking_signal,
      has_price_signal,
      has_service_signal,
      has_complaint_signal,
      services_interest,
      segment,
      priority_score,
      quality_score,
      care_goal,
      suggested_action,
      suggested_script,
      next_contact_at,
      raw_summary
    FROM prepared
    ON CONFLICT (identity_key) DO UPDATE SET
      phone_norm = EXCLUDED.phone_norm,
      platform_user_id = EXCLUDED.platform_user_id,
      display_name = COALESCE(public.marketing_fanpage_customer_segments.display_name, EXCLUDED.display_name),
      conversation_ids = EXCLUDED.conversation_ids,
      first_message_at = EXCLUDED.first_message_at,
      last_message_at = EXCLUDED.last_message_at,
      total_messages = EXCLUDED.total_messages,
      inbound_messages = EXCLUDED.inbound_messages,
      outbound_messages = EXCLUDED.outbound_messages,
      has_phone = EXCLUDED.has_phone,
      has_booking_signal = EXCLUDED.has_booking_signal,
      has_price_signal = EXCLUDED.has_price_signal,
      has_service_signal = EXCLUDED.has_service_signal,
      has_complaint_signal = EXCLUDED.has_complaint_signal,
      services_interest = EXCLUDED.services_interest,
      segment = EXCLUDED.segment,
      priority_score = EXCLUDED.priority_score,
      quality_score = EXCLUDED.quality_score,
      care_goal = EXCLUDED.care_goal,
      suggested_action = EXCLUDED.suggested_action,
      suggested_script = EXCLUDED.suggested_script,
      next_contact_at = EXCLUDED.next_contact_at,
      raw_summary = EXCLUDED.raw_summary,
      updated_at = now()
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_upserted FROM upserted;

  SELECT COUNT(*) INTO v_total FROM public.marketing_fanpage_customer_segments;

  RETURN jsonb_build_object(
    'since_date', p_since,
    'upserted', v_upserted,
    'total_segments', v_total,
    'refreshed_at', now()
  );
END;
$$;

CREATE OR REPLACE VIEW public.v_marketing_fanpage_segment_summary AS
SELECT
  segment,
  COUNT(*)::integer AS customers,
  COUNT(*) FILTER (WHERE has_phone)::integer AS customers_with_phone,
  COUNT(*) FILTER (WHERE care_status = 'chua_cham_soc')::integer AS pending_customers,
  ROUND(AVG(priority_score), 1) AS avg_priority,
  MAX(last_message_at) AS newest_message_at
FROM public.marketing_fanpage_customer_segments
GROUP BY segment;

COMMENT ON TABLE public.marketing_fanpage_customer_segments IS
  'Phan nhom khach Fanpage theo du lieu inbox tho de cham soc lai, moi quay lai va remarketing.';
COMMENT ON FUNCTION public.refresh_marketing_fanpage_customer_segments(date) IS
  'Gom marketing_messages Facebook thanh tung dinh danh khach va gan nhom cham soc/remarketing.';
