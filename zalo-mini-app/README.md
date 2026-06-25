# Hannah Spa — Zalo Mini App

Mini App chạy trong Zalo cho khách Hannah Beauty & Spa. 4 chức năng:

| Trang | Mô tả |
|---|---|
| 🎫 Thẻ Liệu Trình | Xem các thẻ còn bao nhiêu buổi, hạn dùng |
| 📅 Đặt Lịch Hẹn | Chọn dịch vụ + ngày giờ → đổ về module Lịch Hẹn HSMS (`lich_hen`, trạng thái `cho_xac_nhan`) |
| 🎟️ Voucher Của Tôi | Xem mã voucher còn hạn (chung hệ voucher win-back) |
| 🎰 Vòng Quay May Mắn | Mỗi ngày 1 lượt → sinh voucher ngẫu nhiên (`voucher_sinh_ma`, nguồn `vong_quay`) |

## Kiến trúc

```
Zalo Mini App (thư mục này, ZMP framework)
        │  getPhoneNumber() + getAccessToken()
        ▼
Edge function  supabase/functions/miniapp  (trên VPS api.hannahspa.vn)
        │  đổi token → SĐT thật → truy vấn theo đúng khách
        ▼
PostgreSQL (the_lieu_trinh, voucher_ma, lich_hen, dich_vu, khach_hang)
```

Mọi truy vấn data đều dựa trên **SĐT đã xác thực bởi Zalo** ở backend → khách không xem được dữ liệu người khác.

## Việc cần anh Nam làm (1 lần)

1. **Tạo Mini App trên Zalo**: vào https://mini.zalo.me → tạo ứng dụng mới → liên kết với **OA Hannah Spa** → lấy **App ID**.
2. **Xin quyền `getPhoneNumber`** cho Mini App (trong phần Cấu hình → Quyền). Đây là quyền cần Zalo duyệt để lấy SĐT khách.
3. **Lấy App Secret** của Mini App → đưa vào DB:
   ```sql
   INSERT INTO marketing_ai_config(key, value)
   VALUES ('zalo_miniapp_secret', '<APP_SECRET>')
   ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
   ```
4. Điền `SUPABASE_ANON_KEY` vào `src/config.js` (giống `VITE_SUPABASE_ANON_KEY` của web HSMS).

## Deploy backend (đã có sẵn code)

```bash
# deploy edge function miniapp lên VPS (giống các function khác)
scp -i ~/.ssh/hannahspa_vps -r supabase/functions/miniapp root@103.90.224.43:/root/hsms/functions/
# rồi restart edge runtime trên VPS theo quy trình hiện tại
```

## Chạy / phát hành Mini App

```bash
cd zalo-mini-app
npm install
npm install -g zmp-cli        # nếu chưa có
zmp start                     # chạy thử trên trình duyệt (đặt DUNG_ZALO_AUTH=false + nhập SĐT test)
zmp login                     # đăng nhập tài khoản Zalo dev
zmp deploy                    # phát hành lên Zalo (gắn App ID đã tạo)
```

## Test nhanh trên trình duyệt (không cần Zalo)

Trong `src/config.js` đặt `DUNG_ZALO_AUTH = false`, rồi ở console trình duyệt:
```js
localStorage.setItem('hannah_test_phone', '0909563397')   // SĐT khách có thật trong DB
```
→ các trang Thẻ/Voucher sẽ tải dữ liệu của khách đó.

## Trạng thái

- [x] Backend edge `miniapp` (4 action) — xong, test được qua REST
- [x] Frontend ZMP: 5 trang (Home + 4 chức năng) — xong khung
- [ ] App ID + App Secret + quyền getPhoneNumber (anh Nam)
- [ ] Deploy backend lên VPS + điền anon key
- [ ] `zmp deploy` phát hành
