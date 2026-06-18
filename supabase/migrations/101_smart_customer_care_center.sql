-- Migration 101: Smart Customer Care Center
-- Ket noi Fanpage -> CRM -> POS -> The lieu trinh -> Nhat ky khach den.

CREATE TABLE IF NOT EXISTS public.nhat_ky_khach_den (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ngay                date NOT NULL DEFAULT ((now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date),
  khach_hang_id       uuid REFERENCES public.khach_hang(id) ON DELETE SET NULL,
  ho_ten              text,
  so_dien_thoai       text,
  phone_norm          text,
  dich_vu_su_dung     text,
  ktv_phu_trach       text,
  phan_hoi            text,
  co_hoi_upsell       text,
  ket_qua             text NOT NULL DEFAULT 'can_cham_lai'
                      CHECK (ket_qua IN ('hai_long','tam_duoc','chua_hai_long','da_mua_them','can_cham_lai')),
  nguon               text NOT NULL DEFAULT 'bao_cao_nhan_vien',
  goi_y_tiep_theo     text,
  ghi_chu             text,
  created_by          uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at          timestamptz DEFAULT now(),
  updated_at          timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_nhat_ky_khach_den_ngay
  ON public.nhat_ky_khach_den(ngay DESC);
CREATE INDEX IF NOT EXISTS idx_nhat_ky_khach_den_phone
  ON public.nhat_ky_khach_den(phone_norm)
  WHERE phone_norm IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_nhat_ky_khach_den_khach
  ON public.nhat_ky_khach_den(khach_hang_id);

DROP TRIGGER IF EXISTS trg_nhat_ky_khach_den_updated_at ON public.nhat_ky_khach_den;
CREATE TRIGGER trg_nhat_ky_khach_den_updated_at
BEFORE UPDATE ON public.nhat_ky_khach_den
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.nhat_ky_khach_den ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_le_tan_all_nhat_ky_khach_den" ON public.nhat_ky_khach_den;
CREATE POLICY "admin_le_tan_all_nhat_ky_khach_den" ON public.nhat_ky_khach_den
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.vai_tro IN ('admin','le_tan')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.vai_tro IN ('admin','le_tan')
    )
  );

CREATE OR REPLACE FUNCTION public.nhat_ky_khach_den_before_save()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.phone_norm := public.normalize_vn_phone(NEW.so_dien_thoai);
  IF NEW.khach_hang_id IS NULL AND NEW.phone_norm IS NOT NULL THEN
    SELECT id INTO NEW.khach_hang_id
    FROM public.khach_hang
    WHERE public.normalize_vn_phone(so_dien_thoai) = NEW.phone_norm
    LIMIT 1;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_nhat_ky_khach_den_before_save ON public.nhat_ky_khach_den;
CREATE TRIGGER trg_nhat_ky_khach_den_before_save
BEFORE INSERT OR UPDATE ON public.nhat_ky_khach_den
FOR EACH ROW EXECUTE FUNCTION public.nhat_ky_khach_den_before_save();

CREATE OR REPLACE VIEW public.v_customer_pos_intelligence AS
WITH don AS (
  SELECT
    dh.khach_hang_id,
    MAX(dh.ngay) AS lan_cuoi_den,
    COUNT(*)::integer AS so_don,
    COALESCE(SUM(dh.thuc_thu), 0)::bigint AS tong_chi_tieu
  FROM public.don_hang dh
  WHERE dh.khach_hang_id IS NOT NULL
    AND COALESCE(dh.trang_thai, '') <> 'huy'
    AND COALESCE(dh.is_test, false) = false
  GROUP BY dh.khach_hang_id
),
dv AS (
  SELECT
    x.khach_hang_id,
    ARRAY_REMOVE(ARRAY_AGG(DISTINCT x.ten_dich_vu) FILTER (WHERE x.ten_dich_vu IS NOT NULL), NULL) AS dich_vu_da_dung,
    (ARRAY_AGG(x.ten_dich_vu ORDER BY x.ngay DESC, x.created_at DESC) FILTER (WHERE x.ten_dich_vu IS NOT NULL))[1] AS dich_vu_gan_nhat
  FROM public.lich_su_dich_vu_kh x
  GROUP BY x.khach_hang_id
),
the_kh AS (
  SELECT
    khach_hang_id,
    COUNT(*) FILTER (WHERE trang_thai = 'active' AND COALESCE(so_buoi_con_lai, 0) > 0)::integer AS so_the_active,
    COALESCE(SUM(CASE WHEN trang_thai = 'active' THEN so_buoi_con_lai ELSE 0 END), 0)::integer AS tong_buoi_con,
    ARRAY_REMOVE(ARRAY_AGG(ten_dich_vu ORDER BY ngay_mua DESC) FILTER (WHERE trang_thai = 'active'), NULL) AS the_dang_co
  FROM public.the_lieu_trinh
  GROUP BY khach_hang_id
)
SELECT
  k.id AS khach_hang_id,
  k.ho_ten,
  k.so_dien_thoai,
  public.normalize_vn_phone(k.so_dien_thoai) AS phone_norm,
  k.ngay_sinh,
  k.nguon,
  k.ghi_chu_da_lieu,
  COALESCE(d.lan_cuoi_den, k.lan_cuoi_den) AS lan_cuoi_den,
  COALESCE(d.so_don, 0) AS so_don,
  COALESCE(d.tong_chi_tieu, 0) AS tong_chi_tieu,
  COALESCE(t.so_the_active, 0) AS so_the_active,
  COALESCE(t.tong_buoi_con, 0) AS tong_buoi_con,
  COALESCE(t.the_dang_co, ARRAY[]::text[]) AS the_dang_co,
  COALESCE(dv.dich_vu_da_dung, ARRAY[]::text[]) AS dich_vu_da_dung,
  dv.dich_vu_gan_nhat,
  CASE
    WHEN COALESCE(t.tong_buoi_con, 0) > 0 THEN 'Nhắc khách dùng tiếp thẻ/liệu trình còn buổi, chốt lịch gần nhất.'
    WHEN COALESCE(t.so_the_active, 0) > 0 THEN 'Kiểm tra thẻ đang có và mời khách dùng tiếp trước khi quên.'
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
FROM public.khach_hang k
LEFT JOIN don d ON d.khach_hang_id = k.id
LEFT JOIN dv ON dv.khach_hang_id = k.id
LEFT JOIN the_kh t ON t.khach_hang_id = k.id
WHERE COALESCE(k.is_active, true) = true;

CREATE OR REPLACE VIEW public.v_cham_soc_fanpage_smart AS
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
FROM public.marketing_fanpage_customer_segments s
LEFT JOIN public.v_customer_pos_intelligence ci
  ON ci.phone_norm = s.phone_norm
WHERE s.segment <> 'tuong_tac_thap';

CREATE OR REPLACE VIEW public.v_nhat_ky_khach_den_smart AS
SELECT
  nk.*,
  COALESCE(ci.khach_hang_id, nk.khach_hang_id) AS hsms_khach_hang_id,
  ci.ho_ten AS hsms_ho_ten,
  ci.lan_cuoi_den,
  ci.so_don,
  ci.tong_chi_tieu,
  ci.so_the_active,
  ci.tong_buoi_con,
  ci.the_dang_co,
  ci.dich_vu_da_dung,
  ci.dich_vu_gan_nhat,
  COALESCE(nk.goi_y_tiep_theo, ci.muc_tieu_tu_van) AS muc_tieu_tu_van,
  ci.goi_y_upsell
FROM public.nhat_ky_khach_den nk
LEFT JOIN public.v_customer_pos_intelligence ci
  ON ci.khach_hang_id = nk.khach_hang_id
  OR (nk.phone_norm IS NOT NULL AND ci.phone_norm = nk.phone_norm);

COMMENT ON TABLE public.nhat_ky_khach_den IS
  'Bao cao khach den hang ngay cua le tan/KTV, thay form ngoai he thong va lam dau vao goi y upsell.';
COMMENT ON VIEW public.v_cham_soc_fanpage_smart IS
  'Hang doi Fanpage thong minh: noi inbox voi CRM/POS/the lieu trinh va goi y tu van.';
COMMENT ON VIEW public.v_customer_pos_intelligence IS
  'Ho so POS/CRM rut gon de HSMS goi y cham soc va upsell cho tung khach.';
