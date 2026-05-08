-- ============================================================
-- Migration: Bảng homepage_config cho CMS trang chủ (Phase 5)
-- ============================================================

CREATE TABLE IF NOT EXISTS homepage_config (
  key        TEXT PRIMARY KEY,
  value      JSONB NOT NULL DEFAULT '{}',
  mo_ta      TEXT DEFAULT '',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger tự cập nhật updated_at
CREATE OR REPLACE FUNCTION update_homepage_config_ts()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_homepage_config_updated_at
  BEFORE UPDATE ON homepage_config
  FOR EACH ROW EXECUTE FUNCTION update_homepage_config_ts();

-- RLS
ALTER TABLE homepage_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_read_homepage_config" ON homepage_config
  FOR SELECT USING (true);

CREATE POLICY "admin_all_homepage_config" ON homepage_config
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.vai_tro = 'admin'
    )
  );

-- Seed dữ liệu mặc định
INSERT INTO homepage_config (key, value, mo_ta) VALUES
(
  'hero',
  '{
    "headline": "Giữ Mãi Nét Thanh Xuân Của Bạn",
    "tagline": "Công nghệ thẩm mỹ hiện đại — Chạm đến vẻ đẹp tự nhiên của bạn",
    "cta_text": "Đặt lịch ngay hôm nay",
    "phone": "0379 080 909"
  }',
  'Section Hero — tiêu đề, tagline, nút CTA, số điện thoại'
),
(
  'contact',
  '{
    "phone": "0379 080 909",
    "email": "hannahspa.nm@gmail.com",
    "address": "39 Nam Kỳ Khởi Nghĩa, P.Tân An, Ninh Kiều, Cần Thơ",
    "hours": "09:15 – 20:00 (Ngưng nhận khách 19:30)",
    "facebook": "https://www.facebook.com/hannahspact",
    "maps_url": "https://maps.app.goo.gl/FdrUZxUdJkbdbERe8"
  }',
  'Thông tin liên hệ — số điện thoại, địa chỉ, giờ mở cửa'
),
(
  'about',
  '{
    "heading": "Câu Chuyện Của Hannah Spa",
    "body": "Thành lập từ năm 2019, Hannah Beauty & Spa là không gian chăm sóc sắc đẹp cao cấp tại Cần Thơ. Chúng tôi kết hợp công nghệ thẩm mỹ hiện đại với liệu pháp truyền thống, mang đến trải nghiệm thư giãn và làm đẹp toàn diện cho quý khách.",
    "founded": "2019",
    "staff_count": "10"
  }',
  'Section Giới thiệu — heading và nội dung'
),
(
  'marquee',
  '["Chăm Sóc Da Chuyên Sâu", "Massage Body Thư Giãn", "Triệt Lông Công Nghệ Cao", "Tắm Trắng & Giảm Béo", "Gội Đầu Dưỡng Sinh", "Combo Tiết Kiệm", "Đặt Lịch 0379 080 909"]',
  'Dải chữ chạy ngang — danh sách items'
),
(
  'testimonials',
  '[
    {"name": "Chị Nguyễn Thuỳ Linh", "role": "Khách hàng thân thiết", "text": "Dịch vụ massage body ở đây tuyệt vời lắm! Mình đến Hannah Spa được 2 năm rồi, chưa bao giờ thất vọng. Các bạn nhân viên rất tận tâm và chuyên nghiệp.", "rating": 5},
    {"name": "Chị Trần Minh Châu", "role": "Khách hàng thân thiết", "text": "Triệt lông ở đây hiệu quả hơn mình nghĩ nhiều. Sau 3 buổi đã thấy rõ sự khác biệt. Không đau, không kích ứng da. Sẽ tiếp tục quay lại!", "rating": 5},
    {"name": "Chị Lê Phương Anh", "role": "Khách hàng mới", "text": "Lần đầu đến Hannah Spa theo lời giới thiệu của bạn bè. Không gian sạch sẽ, thơm tho, nhân viên nhiệt tình tư vấn. Chắc chắn sẽ trở thành khách quen!", "rating": 5}
  ]',
  'Đánh giá khách hàng — mảng [{name, role, text, rating}]'
),
(
  'faq',
  '[
    {"q": "Hannah Spa mở cửa những ngày nào?", "a": "Chúng tôi mở cửa tất cả các ngày trong tuần, kể cả Thứ 7, Chủ Nhật và ngày lễ. Giờ phục vụ từ 9:15 – 20:00, ngưng nhận khách lúc 19:30."},
    {"q": "Tôi có cần đặt lịch trước không?", "a": "Chúng tôi khuyến khích đặt lịch trước qua Facebook hoặc gọi điện để đảm bảo có chuyên viên phục vụ đúng giờ. Tuy nhiên, khách walk-in vẫn được phục vụ tuỳ theo lịch trống."},
    {"q": "Triệt lông cần bao nhiêu buổi?", "a": "Thông thường cần 6-8 buổi để đạt hiệu quả tối ưu, mỗi buổi cách nhau 4-6 tuần. Số buổi cụ thể tuỳ thuộc vào màu lông, màu da và vùng cần triệt."},
    {"q": "Có chính sách ưu đãi cho khách thân thiết không?", "a": "Hannah Spa có thẻ liệu trình ưu đãi cho các dịch vụ thường xuyên. Ngoài ra, khách thân thiết sẽ được thông báo trước các chương trình khuyến mãi đặc biệt."}
  ]',
  'Câu hỏi thường gặp — mảng [{q, a}]'
)
ON CONFLICT (key) DO NOTHING;

SELECT 'Tạo bảng homepage_config thành công!' AS result;
