# HSMS Marketing Handoff - 17/06/2026

File này tổng hợp phần Codex đã làm cho module Marketing/Fanpage để anh Nam và Claude Code tiếp tục mà không cần đọc lại toàn bộ chat.

## 1. Bối cảnh hiện tại

- HSMS đã chuyển backend từ Supabase hosted sang Supabase self-host trên VPS.
- API production hiện dùng: `https://api.hannahspa.vn`.
- Studio VPS: xem trong `docs/VPS_HANDOVER.md`.
- Local `.env` và `.env.import` đã trỏ về VPS, không ghi service key vào tài liệu.
- Trước mỗi phiên mới vẫn đọc:
  - `docs/CODEX_SESSION_MEMORY.md`
  - `docs/AI_MARKETING_MEMORY.md`
  - Nếu sửa UI: `src/DESIGN_SYSTEM.md`

## 2. Mục tiêu Marketing đã thống nhất

Marketing không còn là một bảng khách tiềm năng rời rạc. Nó là hệ thống vận hành khách hàng đa kênh:

1. Khách inbox/comment Fanpage.
2. HSMS nhận realtime qua webhook.
3. DB tự gom khách vào nhóm chăm sóc.
4. Worker AI nền phân loại, tìm số điện thoại, nối hồ sơ HSMS.
5. Hộp Thư HSMS hiển thị lịch sử chat, tóm tắt, gợi ý tư vấn/upsell.
6. Nhân viên trả lời, ghi kết quả chăm sóc.
7. Báo cáo nhân viên cho chủ/quản lý biết khách nào còn sót.
8. Sau đó mở rộng Zalo, hotline, nhắc lịch liệu trình, remarketing.

## 3. Backend/VPS đã hoàn thành

### Edge Functions đã có trên VPS

- `marketing-webhook`
  - Local: `supabase/functions/marketing-webhook/index.ts`
  - VPS: `/root/supabase/docker/volumes/functions/marketing-webhook/index.ts`
  - URL: `https://api.hannahspa.vn/functions/v1/marketing-webhook`
  - `verify_jwt=false`
  - Chức năng:
    - GET verify cho Meta/Facebook.
    - POST nhận Messenger webhook `object=page`.
    - Normalize message thành row `marketing_messages`.
    - Không gọi AI đồng bộ để tránh timeout, chỉ ghi tin nhanh và trả 200.

- `marketing-ai`
  - Local: `supabase/functions/marketing-ai/index.ts`
  - VPS: `/root/supabase/docker/volumes/functions/marketing-ai/index.ts`
  - `verify_jwt=true`
  - Các mode quan trọng:
    - `triage_fanpage`
    - `resolve_conversation_phones`
    - `resolve_identities`
    - `inbox_webhook`
    - `attribution_bridge`
    - `run_approved`
  - Đã sửa để ưu tiên `from_platform_user_id` và `conversation_id` mới từ webhook, tránh gom sai khách.

### Cấu hình webhook đã xong

- Đã đặt `MARKETING_WEBHOOK_VERIFY_TOKEN` trong VPS:
  - Nằm trong `/root/supabase/docker/.env`
  - Đã thêm vào service `supabase-edge-functions` trong `/root/supabase/docker/docker-compose.yml`
  - Không ghi token vào repo.
- Đã restart Edge Functions thành công.
- Test GET verify production:
  - Callback trả `200`
  - Body trả đúng challenge `HSMS_VERIFY_OK`

### Migration/DB đã làm

- `supabase/migrations/109_marketing_message_thread_columns.sql`
  - Thêm cột nhẹ cho `marketing_messages`:
    - `conversation_id`
    - `from_platform_user_id`
    - `recipient_id`
  - Tạo/cập nhật view nhẹ:
    - `v_marketing_fanpage_message_thread_light`
  - Đã backfill trên VPS:
    - 123.329 tin có `conversation_id`
    - 123.313 tin có `from_platform_user_id`

- `supabase/migrations/110_marketing_webhook_realtime_segments.sql`
  - Tạo function `marketing_detect_services_from_text`
  - Tạo trigger `trg_marketing_realtime_segment_from_message`
  - Khi có tin Facebook mới insert vào `marketing_messages`, DB tự cập nhật/tạo `marketing_fanpage_customer_segments`.
  - Trigger tự cộng số tin, thêm `conversation_id`, nhận diện dịch vụ quan tâm, set khách cần chăm.

### Test production đã chạy

- POST giả lập Messenger webhook:
  - Endpoint trả `200`
  - Ghi được `raw_message_id`
  - Trigger realtime segment chạy được
  - Đã xóa sạch dữ liệu test sau khi thử

- Gọi `marketing-ai` mode `triage_fanpage`:
  - Trả `200`
  - Đã xử lý được tin thật trong DB

## 4. Worker AI nền đã cài trên VPS

### Script trong repo

- `scripts/vps_install_marketing_ai_worker.sh`

Script này cài worker lên VPS và có thể chạy lại nếu cần tái cài.

### Worker thực tế trên VPS

- File chạy: `/root/hsms/bin/marketing-ai-worker.sh`
- Log: `/var/log/hsms/marketing-ai-worker.log`

### Cron đã cài

```cron
*/2 * * * * /root/hsms/bin/marketing-ai-worker.sh triage >> /var/log/hsms/marketing-ai-worker.log 2>&1
*/15 * * * * /root/hsms/bin/marketing-ai-worker.sh phones >> /var/log/hsms/marketing-ai-worker.log 2>&1
17 * * * * /root/hsms/bin/marketing-ai-worker.sh identities >> /var/log/hsms/marketing-ai-worker.log 2>&1
```

Ý nghĩa:

- Mỗi 2 phút:
  - Chạy `triage_fanpage`
  - Xử lý tin/comment Fanpage mới theo lô nhỏ
  - Tạo phân loại, gợi ý trả lời, action cho Hộp Thư

- Mỗi 15 phút:
  - Chạy `resolve_conversation_phones`
  - Quét số điện thoại trong hội thoại
  - Nối Fanpage lead với khách HSMS nếu có số điện thoại

- Mỗi giờ phút 17:
  - Chạy `resolve_identities`
  - Đồng bộ định danh Fanpage/CRM

### Kết quả test worker

- `triage`
  - Xử lý 8 tin nhắn
  - Bỏ qua 2 comment nhiễu

- `phones`
  - Quét 300 tin
  - 37 hội thoại
  - Tìm 4 hội thoại có số điện thoại
  - Cập nhật 4 lead
  - Đồng bộ 1129 identity

### Lưu ý quan trọng

- VPS hiện thiếu:
  - `OPENAI_API_KEY`
  - `OPENAI_MODEL`
- Vì vậy `marketing-ai` đang chạy bằng fallback rules.
- Khi thêm OpenAI key/model vào Edge Functions, worker hiện tại sẽ tự dùng AI thật, không cần đổi kiến trúc.

## 5. Frontend/UI Marketing đã làm

### Hộp Thư Khách Hàng

- Route: `/admin/marketing/hop-thu`
- File chính: `src/apps/admin/cham-soc-khach/AdminChamSocKhachPage.jsx`
- Đã có:
  - Danh sách khách cần xử lý.
  - Tải chat theo `conversation_id`.
  - Giới hạn tin tải để không kéo toàn bộ lịch sử quá dài.
  - Tóm tắt hội thoại: khách vừa nói gì, Hannah đã trả lời gì, mức xử lý.
  - Gợi ý tin nhắn cho lễ tân.
  - Form ghi kết quả chăm sóc Fanpage.
  - Cập nhật `care_status` sau khi ghi kết quả.

### Báo Cáo Nhân Viên

- Route: `/admin/marketing/bao-cao-nhan-vien`
- Đã có bảng khách còn sót cần xử lý:
  - Khách trễ chăm.
  - Khách thiếu SĐT.
  - Khách nóng/cần quản lý đọc trước.
  - Khách đã nối HSMS.
  - Số tin dùng `inbound_messages`.

### Cấu Hình Kênh

- Route: `/admin/marketing/cau-hinh-kenh`
- File: `src/apps/admin/marketing/MarketingModulePage.jsx`
- Đã thêm phần trạng thái worker:
  - KPI `AI nền`
  - Panel `Nền tự động trên VPS`
  - Hiển thị 3 worker:
    - Quét tin mới
    - Quét số điện thoại
    - Nối định danh
  - Dữ liệu đọc từ `marketing_automation_runs`

### Lưu ý UI

- `npm run build` đã pass sau thay đổi.
- Chưa kiểm tra lại bằng browser local vì phiên bị chuyển sang yêu cầu tổng hợp handoff.

## 6. File đã tạo/sửa chính

Backend/functions:

- `supabase/functions/marketing-webhook/index.ts`
- `supabase/functions/marketing-ai/index.ts`

Migrations:

- `supabase/migrations/109_marketing_message_thread_columns.sql`
- `supabase/migrations/110_marketing_webhook_realtime_segments.sql`

Worker:

- `scripts/vps_install_marketing_ai_worker.sh`

UI:

- `src/apps/admin/cham-soc-khach/AdminChamSocKhachPage.jsx`
- `src/apps/admin/marketing/MarketingModulePage.jsx`

Docs/memory:

- `docs/CODEX_SESSION_MEMORY.md`
- `docs/AI_MARKETING_MEMORY.md`
- `docs/MARKETING_HANDOFF_2026_06_17.md`

## 7. Việc tiếp theo nên làm

### Ưu tiên 1 - Nối Meta Developer thật

Trong Meta Developer App:

- Callback URL:
  - `https://api.hannahspa.vn/functions/v1/marketing-webhook`
- Verify token:
  - Lấy từ VPS trong `/root/supabase/docker/.env`
  - Không ghi token vào chat/repo.
- Subscribe Page Messenger events:
  - `messages`
  - `messaging_postbacks`
  - Có thể thêm delivery/read nếu cần, nhưng webhook hiện đang bỏ qua delivery/read để tiết kiệm tài nguyên.

Sau khi save:

1. Gửi 1 tin nhắn thật vào Fanpage Hannah Spa.
2. Kiểm tra `marketing_messages` có tin mới.
3. Kiểm tra `marketing_fanpage_customer_segments` có cập nhật.
4. Mở `/admin/marketing/hop-thu` xem tin mới có vào hàng đợi không.

### Ưu tiên 2 - Bổ sung OpenAI key/model cho VPS

Hiện worker đã chạy nhưng đang dùng fallback rules. Cần thêm:

- `OPENAI_API_KEY`
- `OPENAI_MODEL`

Vị trí cấu hình nên theo mẫu đã làm với `MARKETING_WEBHOOK_VERIFY_TOKEN`:

- Thêm vào `/root/supabase/docker/.env`
- Thêm vào service `supabase-edge-functions` trong docker compose
- Restart `supabase-edge-functions`
- Test lại `marketing-ai`

### Ưu tiên 3 - Kiểm tra UI local/production

- Mở `/admin/marketing/cau-hinh-kenh`
- Kiểm tra panel `Nền tự động trên VPS`
- Mở `/admin/marketing/hop-thu`
- Kiểm tra tin mới và gợi ý xử lý

### Ưu tiên 4 - Hoàn thiện gửi tin từ HSMS

Hiện Hộp Thư có giao diện và gợi ý, nhưng cần kiểm tra/hoàn thiện đường gửi tin thật qua Meta:

- Xem `marketing-meta-page-sync` phần send message.
- Đảm bảo token Page còn sống.
- Khi nhân viên bấm gửi:
  - Gửi qua Meta API.
  - Ghi message outbound vào `marketing_messages`.
  - Cập nhật segment/care status.

### Ưu tiên 5 - Sau Fanpage mới mở Zalo/hotline

Đừng mở rộng Zalo trước khi Fanpage chạy ổn. Thứ tự đúng:

1. Fanpage realtime nhận/gửi/tóm tắt/gợi ý.
2. Báo cáo nhân viên chăm sóc.
3. Nhắc lịch liệu trình/POS.
4. Zalo OA/ZNS hoặc quy trình nhập Zalo thủ công có cấu trúc.
5. Hotline/cuộc gọi.

## 8. Lệnh kiểm tra hữu ích cho Claude

Không in secret:

```bash
docker exec supabase-edge-functions printenv MARKETING_WEBHOOK_VERIFY_TOKEN >/dev/null && echo webhook_token_set || echo webhook_token_missing
docker exec supabase-edge-functions printenv OPENAI_API_KEY >/dev/null && echo openai_key_set || echo openai_key_missing
docker exec supabase-edge-functions printenv OPENAI_MODEL >/dev/null && echo openai_model_set || echo openai_model_missing
```

Xem cron:

```bash
crontab -l | grep marketing-ai-worker
```

Xem log worker:

```bash
tail -80 /var/log/hsms/marketing-ai-worker.log
```

Chạy thử worker:

```bash
/root/hsms/bin/marketing-ai-worker.sh triage
/root/hsms/bin/marketing-ai-worker.sh phones
```

Restart Edge Functions:

```bash
cd /root/supabase/docker
docker compose up -d functions
```

## 9. Cảnh báo không được làm

- Không đưa service role key, Page access token, verify token, OpenAI key vào frontend hoặc docs.
- Không gọi AI trực tiếp trong `marketing-webhook`; webhook phải luôn trả nhanh.
- Không kéo toàn bộ lịch sử chat mỗi lần nhân viên mở Hộp Thư.
- Không chạy batch quá lớn trong worker; ưu tiên lô nhỏ, chạy thường xuyên.
- Không tự động gửi tin nhắn cho khách khi chưa có cơ chế duyệt/kiểm soát rõ.

