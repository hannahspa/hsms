-- Migration 103: Fast Fanpage care queue
-- Loai bo nhánh lich_su_dich_vu_kh khoi hang doi Fanpage de tranh timeout REST.

CREATE OR REPLACE VIEW public.v_cham_soc_fanpage_smart AS
WITH seg AS MATERIALIZED (
  SELECT *
  FROM public.marketing_fanpage_customer_segments
  WHERE segment <> 'tuong_tac_thap'
  ORDER BY priority_score DESC, last_message_at DESC NULLS LAST
  LIMIT 800
),
phones AS MATERIALIZED (
  SELECT DISTINCT phone_norm
  FROM seg
  WHERE phone_norm IS NOT NULL
),
kh AS MATERIALIZED (
  SELECT DISTINCT ON (public.normalize_vn_phone(k.so_dien_thoai))
    k.id AS khach_hang_id,
    k.ho_ten,
    k.so_dien_thoai,
    public.normalize_vn_phone(k.so_dien_thoai) AS phone_norm,
    k.ngay_sinh,
    k.nguon,
    k.ghi_chu_da_lieu
  FROM public.khach_hang k
  JOIN phones p ON p.phone_norm = public.normalize_vn_phone(k.so_dien_thoai)
  WHERE COALESCE(k.is_active, true) = true
  ORDER BY public.normalize_vn_phone(k.so_dien_thoai), COALESCE(k.tong_chi_tieu, 0) DESC, k.id
),
don AS (
  SELECT
    dh.khach_hang_id,
    MAX(dh.ngay) AS lan_cuoi_den,
    COUNT(*)::integer AS so_don,
    COALESCE(SUM(dh.thuc_thu), 0)::bigint AS tong_chi_tieu
  FROM public.don_hang dh
  JOIN kh ON kh.khach_hang_id = dh.khach_hang_id
  WHERE COALESCE(dh.trang_thai, '') <> 'huy'
    AND COALESCE(dh.is_test, false) = false
  GROUP BY dh.khach_hang_id
),
the_kh AS (
  SELECT
    t.khach_hang_id,
    COUNT(*) FILTER (WHERE t.trang_thai = 'active' AND COALESCE(t.so_buoi_con_lai, 0) > 0)::integer AS so_the_active,
    COALESCE(SUM(CASE WHEN t.trang_thai = 'active' THEN t.so_buoi_con_lai ELSE 0 END), 0)::integer AS tong_buoi_con,
    ARRAY_REMOVE(ARRAY_AGG(t.ten_dich_vu ORDER BY t.ngay_mua DESC) FILTER (WHERE t.trang_thai = 'active'), NULL) AS the_dang_co
  FROM public.the_lieu_trinh t
  JOIN kh ON kh.khach_hang_id = t.khach_hang_id
  GROUP BY t.khach_hang_id
),
ci AS (
  SELECT
    kh.khach_hang_id,
    kh.ho_ten,
    kh.so_dien_thoai,
    kh.phone_norm,
    kh.ngay_sinh,
    kh.nguon,
    kh.ghi_chu_da_lieu,
    d.lan_cuoi_den,
    COALESCE(d.so_don, 0) AS so_don,
    COALESCE(d.tong_chi_tieu, 0) AS tong_chi_tieu,
    COALESCE(t.so_the_active, 0) AS so_the_active,
    COALESCE(t.tong_buoi_con, 0) AS tong_buoi_con,
    COALESCE(t.the_dang_co, ARRAY[]::text[]) AS the_dang_co,
    ARRAY[]::text[] AS dich_vu_da_dung,
    NULL::text AS dich_vu_gan_nhat,
    CASE
      WHEN COALESCE(t.tong_buoi_con, 0) > 0 THEN 'Nhắc khách dùng tiếp thẻ/liệu trình còn buổi, chốt lịch gần nhất.'
      WHEN d.lan_cuoi_den IS NULL THEN 'Khách có SĐT nhưng lịch sử POS chưa rõ, cần hỏi nhu cầu và gắn hồ sơ đầy đủ.'
      WHEN ((now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date - d.lan_cuoi_den) >= 45 THEN 'Mời khách quay lại bằng ưu đãi khách cũ, nhắc đúng nhu cầu từng inbox.'
      ELSE 'Chăm sóc định kỳ, hỏi phản hồi và gợi ý dịch vụ theo nhu cầu Fanpage.'
    END AS muc_tieu_tu_van,
    CASE
      WHEN COALESCE(t.tong_buoi_con, 0) BETWEEN 1 AND 2 THEN 'Thẻ sắp hết buổi: tư vấn gia hạn hoặc mua gói mới trước khi dùng hết.'
      WHEN COALESCE(t.tong_buoi_con, 0) > 2 THEN 'Mời khách đặt lịch dùng tiếp số buổi còn lại, tránh để quên thẻ.'
      ELSE 'Dựa vào dịch vụ khách từng hỏi trên Fanpage để chốt lịch trước, sau đó mới tư vấn gói phù hợp.'
    END AS goi_y_upsell
  FROM kh
  LEFT JOIN don d ON d.khach_hang_id = kh.khach_hang_id
  LEFT JOIN the_kh t ON t.khach_hang_id = kh.khach_hang_id
)
SELECT
  s.id AS segment_id,
  s.identity_key,
  s.display_name,
  s.phone_norm,
  s.platform_user_id,
  s.segment,
  s.priority_score,
  s.quality_score,
  s.care_status,
  s.care_goal,
  s.suggested_action,
  s.suggested_script,
  s.services_interest,
  s.next_contact_at,
  s.first_message_at,
  s.last_message_at,
  s.inbound_messages,
  s.outbound_messages,
  ci.khach_hang_id,
  ci.ho_ten AS hsms_ho_ten,
  ci.so_dien_thoai AS hsms_so_dien_thoai,
  ci.lan_cuoi_den,
  ci.so_don,
  ci.tong_chi_tieu,
  ci.so_the_active,
  ci.tong_buoi_con,
  ci.the_dang_co,
  ci.dich_vu_da_dung,
  ci.dich_vu_gan_nhat,
  (ci.khach_hang_id IS NOT NULL) AS da_noi_hsms,
  CASE
    WHEN s.segment = 'can_xu_ly_rieng' THEN 'Chủ/quản lý đọc lại hội thoại trước khi lễ tân nhắn.'
    WHEN ci.khach_hang_id IS NOT NULL THEN ci.muc_tieu_tu_van
    WHEN s.phone_norm IS NOT NULL THEN 'Khách có SĐT nhưng chưa có hồ sơ HSMS: tạo/gắn hồ sơ, hỏi nhu cầu và chốt lịch.'
    ELSE s.care_goal
  END AS muc_tieu_tu_van,
  CASE
    WHEN ci.khach_hang_id IS NOT NULL THEN ci.goi_y_upsell
    WHEN 'Gội đầu dưỡng sinh' = ANY(s.services_interest) THEN 'Tư vấn gội dưỡng sinh, cổ vai gáy, Tigi/ấn huyệt nếu khách cần thư giãn nhanh.'
    WHEN 'Triệt lông' = ANY(s.services_interest) THEN 'Tư vấn lịch triệt lông, hỏi vùng cần làm và chốt liệu trình nếu khách phù hợp.'
    WHEN 'Massage' = ANY(s.services_interest) THEN 'Tư vấn massage cổ vai gáy/body, gợi ý combo theo thời gian rảnh của khách.'
    WHEN 'Chăm sóc da' = ANY(s.services_interest) THEN 'Hỏi tình trạng da trước, gợi ý soi da/chăm da cơ bản thay vì ép gói dài.'
    ELSE 'Mục tiêu đầu tiên: xin SĐT/Zalo và chốt lịch tư vấn.'
  END AS goi_y_upsell
FROM seg s
LEFT JOIN ci ON ci.phone_norm = s.phone_norm;

COMMENT ON VIEW public.v_cham_soc_fanpage_smart IS
  'Hang doi Fanpage thong minh ban nhanh: noi CRM/POS/the con buoi, khong quet lich su dich vu chi tiet.';

NOTIFY pgrst, 'reload schema';
