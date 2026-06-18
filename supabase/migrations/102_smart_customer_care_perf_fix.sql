-- Migration 102: Performance fix for Smart Customer Care Center
-- Giam tai view Fanpage: chi noi CRM/POS cho nhom khach can cham truoc.

CREATE INDEX IF NOT EXISTS idx_khach_hang_phone_norm
  ON public.khach_hang (public.normalize_vn_phone(so_dien_thoai));

CREATE INDEX IF NOT EXISTS idx_don_hang_kh_valid
  ON public.don_hang (khach_hang_id, ngay DESC)
  WHERE khach_hang_id IS NOT NULL
    AND COALESCE(trang_thai, '') <> 'huy'
    AND COALESCE(is_test, false) = false;

CREATE INDEX IF NOT EXISTS idx_tlt_kh_active
  ON public.the_lieu_trinh (khach_hang_id, ngay_mua DESC)
  WHERE khach_hang_id IS NOT NULL;

CREATE OR REPLACE VIEW public.v_cham_soc_khach AS
WITH don_kh AS (
  SELECT
    khach_hang_id,
    MAX(ngay) AS lan_cuoi_den,
    COUNT(*)::integer AS so_don,
    COALESCE(SUM(thuc_thu), 0)::bigint AS tong_chi_tieu
  FROM public.don_hang
  WHERE khach_hang_id IS NOT NULL
    AND COALESCE(trang_thai, '') <> 'huy'
    AND COALESCE(is_test, false) = false
  GROUP BY khach_hang_id
),
the_kh AS (
  SELECT
    khach_hang_id,
    COUNT(*) FILTER (
      WHERE trang_thai = 'active' AND COALESCE(so_buoi_con_lai, 0) > 0
    )::integer AS so_the_con_buoi,
    COALESCE(SUM(
      CASE WHEN trang_thai = 'active' THEN so_buoi_con_lai ELSE 0 END
    ), 0)::integer AS tong_buoi_con
  FROM public.the_lieu_trinh
  GROUP BY khach_hang_id
)
SELECT
  k.id,
  k.ho_ten,
  k.so_dien_thoai,
  k.ngay_sinh,
  k.nguon,
  k.hang,
  d.lan_cuoi_den,
  COALESCE(d.so_don, 0) AS so_don,
  COALESCE(d.tong_chi_tieu, 0) AS tong_chi_tieu,
  COALESCE(t.so_the_con_buoi, 0) AS so_the_con_buoi,
  COALESCE(t.tong_buoi_con, 0) AS tong_buoi_con,
  (CURRENT_DATE - d.lan_cuoi_den)::integer AS so_ngay_vang
FROM public.khach_hang k
LEFT JOIN don_kh d ON d.khach_hang_id = k.id
LEFT JOIN the_kh t ON t.khach_hang_id = k.id
WHERE COALESCE(k.is_active, true) = true;

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
dv AS (
  SELECT
    x.khach_hang_id,
    ARRAY_REMOVE(ARRAY_AGG(DISTINCT x.ten_dich_vu) FILTER (WHERE x.ten_dich_vu IS NOT NULL), NULL) AS dich_vu_da_dung,
    (ARRAY_AGG(x.ten_dich_vu ORDER BY x.ngay DESC, x.created_at DESC) FILTER (WHERE x.ten_dich_vu IS NOT NULL))[1] AS dich_vu_gan_nhat
  FROM public.lich_su_dich_vu_kh x
  JOIN kh ON kh.khach_hang_id = x.khach_hang_id
  GROUP BY x.khach_hang_id
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
    COALESCE(dv.dich_vu_da_dung, ARRAY[]::text[]) AS dich_vu_da_dung,
    dv.dich_vu_gan_nhat,
    CASE
      WHEN COALESCE(t.tong_buoi_con, 0) > 0 THEN 'Nhắc khách dùng tiếp thẻ/liệu trình còn buổi, chốt lịch gần nhất.'
      WHEN d.lan_cuoi_den IS NULL THEN 'Khách chưa có lịch sử POS rõ ràng, cần hỏi nhu cầu và tạo hồ sơ đầy đủ.'
      WHEN ((now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date - d.lan_cuoi_den) >= 45 THEN 'Mời khách quay lại bằng ưu đãi khách cũ, nhắc đúng dịch vụ từng dùng.'
      ELSE 'Chăm sóc định kỳ, hỏi phản hồi và gợi ý dịch vụ bổ sung phù hợp.'
    END AS muc_tieu_tu_van,
    CASE
      WHEN COALESCE(t.tong_buoi_con, 0) BETWEEN 1 AND 2 THEN 'Thẻ sắp hết buổi: tư vấn gia hạn hoặc mua gói mới trước khi dùng hết.'
      WHEN COALESCE(dv.dich_vu_da_dung, ARRAY[]::text[])::text ILIKE '%gội%' THEN 'Gợi ý combo gội dưỡng sinh + massage cổ vai gáy/Tigi/ấn huyệt.'
      WHEN COALESCE(dv.dich_vu_da_dung, ARRAY[]::text[])::text ILIKE '%triệt%' THEN 'Gợi ý duy trì liệu trình triệt lông, bảo hành hoặc vùng mới nếu phù hợp.'
      WHEN COALESCE(dv.dich_vu_da_dung, ARRAY[]::text[])::text ILIKE '%massage%' THEN 'Gợi ý combo massage body + cổ vai gáy hoặc gói 5-10 buổi.'
      WHEN COALESCE(dv.dich_vu_da_dung, ARRAY[]::text[])::text ILIKE '%da%' THEN 'Gợi ý liệu trình chăm da định kỳ, peel/mụn/nám theo tình trạng da.'
      ELSE 'Hỏi nhu cầu hiện tại trước, sau đó gợi ý dịch vụ bán chạy phù hợp.'
    END AS goi_y_upsell
  FROM kh
  LEFT JOIN don d ON d.khach_hang_id = kh.khach_hang_id
  LEFT JOIN dv ON dv.khach_hang_id = kh.khach_hang_id
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

COMMENT ON VIEW public.v_cham_soc_khach IS
  'Cham soc khach: lan cuoi den that tu don_hang, the con buoi, ngay sinh.';
COMMENT ON VIEW public.v_cham_soc_fanpage_smart IS
  'Hang doi Fanpage thong minh toi uu: chi noi CRM/POS cho nhom khach can cham truoc.';

NOTIFY pgrst, 'reload schema';
