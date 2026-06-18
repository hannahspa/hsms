-- Migration 110: Realtime Fanpage segment updater
-- Muc tieu: khi Meta Webhook ghi tin moi vao marketing_messages,
-- hang doi cham soc Fanpage duoc cap nhat ngay ma khong can quet lai toan bo kho chat.

CREATE OR REPLACE FUNCTION public.marketing_detect_services_from_text(p_text text)
RETURNS text[]
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT ARRAY_REMOVE(ARRAY[
    CASE WHEN COALESCE(p_text, '') ~* '(triệt|triet|lông|long)' THEN 'Triệt lông' END,
    CASE WHEN COALESCE(p_text, '') ~* '(gội|goi|dưỡng\s*sinh|duong\s*sinh)' THEN 'Gội đầu dưỡng sinh' END,
    CASE WHEN COALESCE(p_text, '') ~* '(massage|cổ\s*vai\s*gáy|co\s*vai\s*gay|body)' THEN 'Massage' END,
    CASE WHEN COALESCE(p_text, '') ~* '(mụn|mun|nám|nam|da|sẹo|seo)' THEN 'Chăm sóc da' END,
    CASE WHEN COALESCE(p_text, '') ~* '(phun|xăm|xam|môi|mày|mi)' THEN 'Phun xăm thẩm mỹ' END,
    CASE WHEN COALESCE(p_text, '') ~* '(giảm\s*béo|giam\s*beo|giảm\s*mỡ|giam\s*mo|eo|bụng|bung)' THEN 'Giảm béo' END,
    CASE WHEN COALESCE(p_text, '') ~* '(thẻ|the|liệu\s*trình|lieu\s*trinh|buổi|buoi)' THEN 'Thẻ liệu trình' END
  ], NULL);
$$;

CREATE OR REPLACE FUNCTION public.marketing_realtime_segment_from_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_page_id text;
  v_customer_id text;
  v_conversation_id text;
  v_segment_id uuid;
  v_text text := COALESCE(NEW.noi_dung, '');
  v_services text[];
  v_has_booking boolean;
  v_has_price boolean;
  v_has_service boolean;
  v_has_complaint boolean;
  v_segment text;
  v_priority integer;
  v_goal text;
  v_action text;
  v_script text;
  v_now_date date := (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date;
BEGIN
  IF NEW.kenh <> 'facebook' THEN
    RETURN NEW;
  END IF;

  v_page_id := COALESCE(
    NULLIF(NEW.metadata->>'page_id', ''),
    NULLIF(NEW.metadata->'raw_message'->'recipient'->>'id', '')
  );

  v_customer_id := COALESCE(
    NULLIF(NEW.metadata->>'customer_id', ''),
    NULLIF(NEW.metadata->>'recipient_id', ''),
    NULLIF(NEW.from_platform_user_id, ''),
    NULLIF(NEW.metadata->'raw_message'->'sender'->>'id', '')
  );

  IF v_customer_id IS NULL THEN
    RETURN NEW;
  END IF;

  v_conversation_id := COALESCE(
    NULLIF(NEW.conversation_id, ''),
    NULLIF(NEW.metadata->>'conversation_id', ''),
    CASE WHEN v_page_id IS NOT NULL THEN 'fb:' || v_page_id || ':' || v_customer_id ELSE NULL END
  );

  v_services := public.marketing_detect_services_from_text(v_text);
  v_has_booking := v_text ~* '(đặt\s*lịch|dat\s*lich|hẹn|hen|qua\s*(bên|spa)|ghe\s*qua|giữ\s*lịch|giu\s*lich)';
  v_has_price := v_text ~* '(giá|gia|bao\s*nhiêu|bao\s*nhieu|combo|khuyến\s*mãi|khuyen\s*mai|ưu\s*đãi|uu\s*dai)';
  v_has_service := COALESCE(array_length(v_services, 1), 0) > 0;
  v_has_complaint := v_text ~* '(khiếu\s*nại|khieu\s*nai|phàn\s*nàn|phan\s*nan|hoàn\s*tiền|hoan\s*tien|không\s*hài\s*lòng|khong\s*hai\s*long|dị\s*ứng|di\s*ung|bị\s*bỏng|bi\s*bong|không\s*hiệu\s*quả|khong\s*hieu\s*qua)';

  v_segment := CASE
    WHEN v_has_complaint THEN 'can_xu_ly_rieng'
    WHEN v_has_booking THEN 'khach_dat_hen_co_sdt'
    WHEN v_has_price OR v_has_service THEN 'tiem_nang_chua_co_sdt'
    ELSE 'tuong_tac_thap'
  END;

  v_priority := CASE v_segment
    WHEN 'can_xu_ly_rieng' THEN 100
    WHEN 'khach_dat_hen_co_sdt' THEN 95
    WHEN 'tiem_nang_chua_co_sdt' THEN 60
    ELSE 20
  END;

  v_goal := CASE v_segment
    WHEN 'can_xu_ly_rieng' THEN 'Chủ/quản lý đọc lại hội thoại trước khi lễ tân nhắn.'
    WHEN 'khach_dat_hen_co_sdt' THEN 'Xác nhận lại nhu cầu và mời khách đặt lịch gần nhất.'
    WHEN 'tiem_nang_chua_co_sdt' THEN 'Xin SĐT/Zalo để nhận diện khách và tư vấn kỹ hơn.'
    ELSE 'Nuôi dưỡng nhẹ bằng nội dung/ưu đãi, chưa ưu tiên gọi.'
  END;

  v_action := CASE v_segment
    WHEN 'can_xu_ly_rieng' THEN 'Quản lý đọc trước khi nhắn'
    WHEN 'khach_dat_hen_co_sdt' THEN 'Chốt giờ hẹn và dịch vụ'
    WHEN 'tiem_nang_chua_co_sdt' THEN 'Xin SĐT/Zalo'
    ELSE 'Theo dõi thêm'
  END;

  v_script := CASE v_segment
    WHEN 'can_xu_ly_rieng' THEN 'Dạ Hannah Spa đã nhận được phản hồi của mình. Em xin phép kiểm tra lại thông tin và hỗ trợ mình kỹ hơn ạ.'
    WHEN 'khach_dat_hen_co_sdt' THEN 'Dạ em chào chị, Hannah Spa có thể hỗ trợ mình đặt lịch. Chị cho em xin số điện thoại và khung giờ mình muốn đến để bên em giữ lịch ạ.'
    WHEN 'tiem_nang_chua_co_sdt' THEN 'Dạ em chào chị, để tư vấn đúng nhu cầu và giữ lịch cho mình, chị cho em xin số điện thoại hoặc Zalo được không ạ?'
    ELSE 'Dạ Hannah Spa chào mình, em có thể hỗ trợ mình về dịch vụ, bảng giá hoặc đặt lịch ạ.'
  END;

  SELECT id INTO v_segment_id
  FROM public.marketing_fanpage_customer_segments
  WHERE platform_user_id = v_customer_id
     OR identity_key = v_customer_id
  ORDER BY updated_at DESC NULLS LAST
  LIMIT 1;

  IF v_segment_id IS NULL THEN
    INSERT INTO public.marketing_fanpage_customer_segments (
      identity_key,
      kenh,
      platform_user_id,
      display_name,
      conversation_ids,
      first_message_at,
      last_message_at,
      total_messages,
      inbound_messages,
      outbound_messages,
      has_booking_signal,
      has_price_signal,
      has_service_signal,
      has_complaint_signal,
      services_interest,
      segment,
      priority_score,
      quality_score,
      care_status,
      care_goal,
      suggested_action,
      suggested_script,
      next_contact_at,
      raw_summary
    )
    VALUES (
      v_customer_id,
      'facebook',
      v_customer_id,
      NULLIF(NEW.sender_name, ''),
      CASE WHEN v_conversation_id IS NULL THEN ARRAY[]::text[] ELSE ARRAY[v_conversation_id] END,
      NEW.created_at,
      NEW.created_at,
      1,
      CASE WHEN NEW.direction = 'inbound' THEN 1 ELSE 0 END,
      CASE WHEN NEW.direction = 'outbound' THEN 1 ELSE 0 END,
      v_has_booking,
      v_has_price,
      v_has_service,
      v_has_complaint,
      v_services,
      v_segment,
      v_priority,
      LEAST(100, v_priority),
      CASE WHEN NEW.direction = 'inbound' THEN 'chua_cham_soc' ELSE 'dang_cham_soc' END,
      v_goal,
      v_action,
      v_script,
      CASE WHEN NEW.direction = 'inbound' THEN v_now_date ELSE NULL END,
      jsonb_build_object('last_realtime_message_id', NEW.id, 'last_realtime_at', NEW.created_at)
    );
  ELSE
    UPDATE public.marketing_fanpage_customer_segments
    SET
      display_name = COALESCE(marketing_fanpage_customer_segments.display_name, NULLIF(NEW.sender_name, '')),
      conversation_ids = CASE
        WHEN v_conversation_id IS NULL THEN marketing_fanpage_customer_segments.conversation_ids
        WHEN v_conversation_id = ANY(marketing_fanpage_customer_segments.conversation_ids) THEN marketing_fanpage_customer_segments.conversation_ids
        ELSE array_append(marketing_fanpage_customer_segments.conversation_ids, v_conversation_id)
      END,
      first_message_at = LEAST(COALESCE(marketing_fanpage_customer_segments.first_message_at, NEW.created_at), NEW.created_at),
      last_message_at = GREATEST(COALESCE(marketing_fanpage_customer_segments.last_message_at, NEW.created_at), NEW.created_at),
      total_messages = COALESCE(marketing_fanpage_customer_segments.total_messages, 0) + 1,
      inbound_messages = COALESCE(marketing_fanpage_customer_segments.inbound_messages, 0) + CASE WHEN NEW.direction = 'inbound' THEN 1 ELSE 0 END,
      outbound_messages = COALESCE(marketing_fanpage_customer_segments.outbound_messages, 0) + CASE WHEN NEW.direction = 'outbound' THEN 1 ELSE 0 END,
      has_booking_signal = marketing_fanpage_customer_segments.has_booking_signal OR v_has_booking,
      has_price_signal = marketing_fanpage_customer_segments.has_price_signal OR v_has_price,
      has_service_signal = marketing_fanpage_customer_segments.has_service_signal OR v_has_service,
      has_complaint_signal = marketing_fanpage_customer_segments.has_complaint_signal OR v_has_complaint,
      services_interest = (
        SELECT ARRAY(SELECT DISTINCT x FROM unnest(marketing_fanpage_customer_segments.services_interest || v_services) AS x WHERE x IS NOT NULL)
      ),
      segment = CASE
        WHEN v_segment = 'can_xu_ly_rieng' THEN v_segment
        WHEN marketing_fanpage_customer_segments.segment = 'tuong_tac_thap' THEN v_segment
        ELSE marketing_fanpage_customer_segments.segment
      END,
      priority_score = GREATEST(marketing_fanpage_customer_segments.priority_score, v_priority),
      quality_score = GREATEST(marketing_fanpage_customer_segments.quality_score, LEAST(100, v_priority)),
      care_status = CASE
        WHEN NEW.direction = 'inbound' THEN 'dang_cham_soc'
        ELSE marketing_fanpage_customer_segments.care_status
      END,
      next_contact_at = CASE
        WHEN NEW.direction = 'inbound' THEN v_now_date
        ELSE marketing_fanpage_customer_segments.next_contact_at
      END,
      care_goal = COALESCE(marketing_fanpage_customer_segments.care_goal, v_goal),
      suggested_action = COALESCE(marketing_fanpage_customer_segments.suggested_action, v_action),
      suggested_script = COALESCE(marketing_fanpage_customer_segments.suggested_script, v_script),
      raw_summary = COALESCE(marketing_fanpage_customer_segments.raw_summary, '{}'::jsonb)
        || jsonb_build_object('last_realtime_message_id', NEW.id, 'last_realtime_at', NEW.created_at)
    WHERE id = v_segment_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_marketing_realtime_segment_from_message ON public.marketing_messages;
CREATE TRIGGER trg_marketing_realtime_segment_from_message
AFTER INSERT ON public.marketing_messages
FOR EACH ROW EXECUTE FUNCTION public.marketing_realtime_segment_from_message();

NOTIFY pgrst, 'reload schema';
