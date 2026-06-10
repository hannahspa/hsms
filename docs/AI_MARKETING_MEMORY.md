# HSMS AI Marketing Memory

## Cap nhat 10/06/2026 - Fanpage inbox backfill theo lo

- Da them cursor rieng cho lich su 3 nam: `conversation_cursor_history_2022_2025`.
- Muc tieu lich su: lay du lieu tho tu 26/11/2022 den 26/11/2025, vi giai doan dia chi 25 Vo Thi Sau van co gia tri remarketing.
- Lich su 3 nam dang luu vao cung kho tho `marketing_messages`, chong trung bang `kenh,platform_message_id`.
- Da chay 8 lo lich su dau tien:
  - Lo 1: 25 hoi thoai, 963 tin.
  - Lo 2: 25 hoi thoai, 1.077 tin.
  - Lo 3: 25 hoi thoai, 887 tin.
  - Lo 4-8: 125 hoi thoai, 3.381 tin.
- So lieu production bao phu tu 26/11/2022 den hien tai:
  - `marketing_messages`: 23.604 tin Facebook.
  - Tin khach gui vao: 6.629.
  - Tin page tra ra: 16.968.
  - Hoi thoai khach inbound rieng biet: 1.395.
  - Hoi thoai co SDT: 257.
  - Hoi thoai co tin hieu quan tam/dich vu: 1.194.
  - Hoi thoai tung inbox nhung chua ro nhu cau: 167.
  - Ban ghi cu nhat hien thay: 26/11/2022 12:51 UTC, khach Tuyen Le dat lich goi dau.
- Cursor lich su van con `has_more=true`, can tiep tuc keo them cac lo sau neu muon lay that day du.

- Da trien khai `marketing-meta-page-sync` mode `sync_conversations_batch`.
- Mode nay luu cursor trong `marketing_connected_pages.metadata.conversation_cursor`, moi lan quet tiep tu dung diem dung cu, khong luu full paging URL co token.
- Nut "Quet Facebook" trong `src/apps/admin/marketing/AdminMarketingPage.jsx` da goi them mode nay truoc khi loc SDT/phan loai khach.
- Da them `marketing-ai` mode `fanpage_audience_stats` de UI doc thong ke tat ca inbox ma khong phai tai toan bo tin nhan ve trinh duyet.
- Tab "KH tiem nang" da hien them dai thong ke:
  - Tat ca khach tung inbox.
  - Co so dien thoai.
  - Co nhu cau dich vu.
  - Tung inbox nhung chua ro nhu cau.
  - Tong tin nhan da luu.
- Da deploy function `marketing-meta-page-sync` va `marketing-ai` len Supabase production.
- Build frontend da pass sau thay doi.
- So lieu production sau khi quet tu 25/11/2025 den luc cap nhat:
  - `marketing_messages`: 21.467 tin Facebook tu moc 25/11/2025.
  - Tin khach gui vao: 5.931.
  - Tin page tra ra: 15.529.
  - Hoi thoai khach inbound rieng biet: 1.390.
  - Hoi thoai co SDT theo bo loc chuan: 242.
  - Hoi thoai co tin hieu quan tam/dich vu: 1.184.
  - Tung inbox nhung chua ro nhu cau: 171.
- Truoc khi co batch cursor, cung moc thoi gian chi thay 108 hoi thoai khach inbound. Ket luan: van de chinh la Meta chua duoc keo het lich su ve HSMS, khong phai do bo loc "KH tiem nang" qua chat.
- Trang thai cursor moi nhat van con `has_more=true`; co the tiep tuc bam "Quet Facebook" hoac goi `sync_conversations_batch` de quet tiep. Cac lo cuoi chu yeu them tin outbound/hoi thoai it tin nhan, nen so hoi thoai inbound tang cham hon.
- Da sua loi dong `sync_error` thieu `attachments=[]`, tranh viec mot hoi thoai Meta loi lam dung ca lo.

Cập nhật: 09/06/2026

## Mục tiêu hiện tại

Xây module AI Marketing cho Hannah Spa theo hướng tự động hóa có kiểm soát:

- Kết nối Fanpage trước, chưa chạy quảng cáo.
- Đồng bộ bài viết, bình luận, inbox và chỉ số nền.
- Phân loại inbox/comment thành lead.
- Gắn lead với khách hàng/đơn hàng để kiểm chứng hiệu quả quảng cáo.
- Sau này mới mở tự đăng bài, tự trả lời, tự chạy ads khi dữ liệu ổn định.

## Fanpage đã kết nối

- Page: Hannah Spa
- Page ID: 2310509269209913
- Followers: khoảng 4.989
- Token đã từng bị dán trong chat, không ghi lại ở file này. Sau khi ổn định cần tạo token sạch và thay token cũ trong Supabase Vault.
- Ngày 09/06/2026 khi chạy backfill inbox từ 26/11/2025, Page token trong Vault đã hết hạn:
  - Meta báo hết hạn: 08/06/2026 23:00 PDT.
  - Cần tạo Page Access Token mới rồi chạy lại `marketing-meta-page-sync` với `since_date='2025-11-26'`.

## Các file/migration liên quan

- `supabase/functions/marketing-meta-page-sync/index.ts`
  - Đồng bộ Page info, posts, comments, conversations/messages.
  - Graph default đã đổi sang `v25.0`.
  - Không phụ thuộc Page Insights metric cũ.

- `supabase/functions/marketing-ai/index.ts`
  - Có mode `triage_fanpage`.
  - Phân loại inbox/comment, tạo/cập nhật `marketing_leads`, gắn `lead_id` vào `marketing_messages` và `marketing_page_comments`.
  - Tạo action nháp `reply_message` / `reply_comment` để duyệt.

- `supabase/migrations/093_marketing_fanpage_data_depth.sql`
  - Thêm `talking_about_count`.
  - Sửa view `v_marketing_fanpage_overview`.
  - Thêm unique index đầy đủ cho `marketing_messages(kenh, platform_message_id)`.

- `supabase/migrations/094_marketing_health_attribution.sql`
  - Tạo view `v_marketing_customer_monthly_mix`.
  - Tạo view `v_marketing_reactivation_segments`.
  - Tạo view `v_marketing_fanpage_health`.

- `supabase/migrations/098_marketing_customer_360.sql`
  - Tạo view `v_marketing_customer_360`.
  - Tạo view `v_marketing_source_quality`.
  - Dùng để vận hành hồ sơ khách hàng, segment giữ chân, winback và next-best-action.

- `src/apps/admin/marketing/AdminMarketingPage.jsx`
  - Tab Fanpage có thêm chỉ số: followers, đang nhắc đến, bài viết, tương tác, inbox.

## Kết quả đã chạy trên production

Đồng bộ Fanpage:

- Bài viết lưu trong HSMS: 48
- Bình luận: 43
- Tin nhắn Facebook: 511
- Tin khách gửi vào: 156
- Tin page trả ra: 355

Triage Fanpage:

- `triage_fanpage` đã chạy 2 lượt.
- 156/156 tin inbound đã gắn lead.
- 43/43 comment đã gắn lead.
- Facebook leads tạo/cập nhật: 46
- Lead điểm tiềm năng >= 55: 11
- Lead có số điện thoại nhận diện từ nội dung: 1
- AI reply actions tạo gần đây: 40

View sức khỏe Fanpage sau triage:

- `v_marketing_fanpage_health.inbound_chua_gan_lead = 0`
- `v_marketing_fanpage_health.comments_chua_gan_lead = 0`
- `orders_2026 = 2843`
- `orders_with_lead = 0`
- `orders_with_campaign = 0`

Kết luận: đã phân loại được inbox/comment, nhưng chưa nối được lead với đơn hàng/doanh thu. Đây là lỗ hổng attribution cần làm tiếp.

## Sức khỏe kinh doanh/marketing đã đo

30 ngày gần nhất:

- 522 đơn
- 272 khách
- 58 khách mới
- 214 khách cũ
- Tỷ lệ khách mới: 21.3%
- Thực thu: 115.483.300đ

Cơ cấu 30 ngày:

- Thẻ mới: 76.058.000đ, 46 đơn, 45 khách
- Dịch vụ: 49.298.000đ, 293 đơn, 194 khách
- Dùng thẻ liệu trình cũ: 356 đơn, 186 khách, 0đ doanh thu trực tiếp

Nhóm remarketing:

- 45-90 ngày chưa quay lại: 182 khách
- 90-180 ngày: 279 khách
- 180-365 ngày: 491 khách
- Trên 365 ngày: 4.229 khách

Customer 360 segment sau migration 098:

- `winback_365`: 4.229 khách, tổng doanh thu lịch sử khoảng 1.314.357.090đ, còn khoảng 2.435 buổi
- `winback_180`: 490 khách, khoảng 650.218.240đ, còn 553 buổi
- `winback_90`: 279 khách, khoảng 611.904.200đ, còn 506 buổi
- `nhac_quay_lai`: 181 khách, khoảng 411.333.840đ, còn 567 buổi
- `dang_hoat_dong`: 250 khách, khoảng 2.805.239.097đ, còn 3.129 buổi
- `khach_moi_can_cham`: 62 khách
- `sap_het_the`: 36 khách, còn 43 buổi

Backfill Facebook từ mốc chi nhánh mới:

- Mốc cần phân tích: từ 26/11/2025 đến hiện tại.
- `marketing-meta-page-sync` đã được chỉnh để nhận option:
  - `since_date`
  - `conversation_limit`
  - `message_limit`
  - `max_pages`
  - `max_rows`
- Lệnh/body mẫu:
  - `mode='backfill_facebook'`
  - `page_id='2310509269209913'`
  - `since_date='2025-11-26'`
  - `conversation_limit=200`
  - `message_limit=100`
  - `max_pages=5`
  - `max_rows=3000`
- Chưa chạy thành công vì token hết hạn. Sau khi thay token mới, chạy lại backfill rồi chạy:
  - `marketing-ai` mode `triage_fanpage`
  - `marketing-ai` mode `resolve_identities`
  - `marketing-ai` mode `attribution_bridge`

## Việc cần làm tiếp theo

Ưu tiên 1: Attribution bridge

- Đã tạo logic nối `marketing_leads` với `khach_hang`, `lich_hen`, `don_hang` bằng số điện thoại chuẩn hóa.
- Migration liên quan:
  - `supabase/migrations/095_marketing_attribution_bridge.sql`
  - `supabase/migrations/096_marketing_phone_normalization_hardening.sql`
- Function/RPC:
  - `public.normalize_vn_phone(text)`
  - `public.marketing_run_attribution_bridge(p_days_after integer default 90)`
  - Edge Function mode: `marketing-ai` với `mode='attribution_bridge'`
- Views mới:
  - `v_marketing_attribution_pipeline`
  - `v_marketing_unmatched_leads`
  - `v_marketing_reactivation_customers`
- Đã chạy `attribution_bridge` trên production với `days_after=90`.
- Kết quả hiện tại:
  - Sau bước đầu chỉ nối trực tiếp bằng lead phone thì `linked_customers = 0` vì lead mới nhất ít có số điện thoại.
  - Đã bổ sung identity map để đọc số điện thoại trong toàn bộ lịch sử conversation.
  - Migration liên quan: `supabase/migrations/097_marketing_customer_identity_map.sql`.
  - Bảng mới: `marketing_customer_identities`.
  - RPC mới: `public.marketing_resolve_customer_identities()`.
  - View mới: `v_marketing_customer_identity_map`.
  - Edge Function mode mới: `marketing-ai` với `mode='resolve_identities'`.
  - Đã chạy production:
    - `identities_upserted = 7`
    - `linked_leads = 6`
    - `updated_customers = 6`
    - `linked_appointments = 1`
    - `linked_orders = 1`
    - `revenue = 80.000đ`
  - Identity map đã nối được một số mã/khách:
    - Chị Tuyết Loan -> `KH-06007`
    - Chị Thi -> `KH-06016`
    - Chị Thùy Trang -> `KH-01251`
    - Một số khách trùng SĐT nhưng `ma_kh` còn null trong bảng `khach_hang`.
- Kết luận vận hành: cần kịch bản inbox/comment bắt buộc xin số điện thoại hoặc tạo lịch hẹn từ lead để nối attribution chính xác. Với khách đã từng gửi SĐT trong lịch sử conversation, identity map sẽ tự gắn lại với khách HSMS.

Ưu tiên 2: UI quản trị

- Tab Lead trong `src/apps/admin/marketing/AdminMarketingPage.jsx` đã đọc thêm:
  - `v_marketing_attribution_pipeline`
  - `v_marketing_unmatched_leads`
  - `v_marketing_reactivation_customers`
  - `v_marketing_fanpage_health`
- UI đã có nút "Nối dữ liệu" gọi `marketing-ai` mode `attribution_bridge`.
- UI hiển thị lead chưa nối khách, lead nóng, số đơn/doanh thu đã quy về lead, khoảng trống attribution và nhóm khách remarketing.

Ưu tiên 3: Kiểm soát báo cáo quảng cáo

- Trước khi có ad account, chưa thể xác minh spend/impressions/campaign thật.
- Cần dùng số liệu HSMS làm nguồn kiểm chứng: inbox -> lead -> lịch hẹn -> đến spa -> mua.
- Sau khi có ad account, nối thêm `ads_read`/`ads_management` để so sánh chi phí thật.

Ưu tiên 4: Dữ liệu và Supabase quota

- Database hiện khoảng 428 MB / 500 MB Free.
- Fanpage hiện chỉ khoảng vài MB, chưa phải nguyên nhân phình.
- Bảng nặng nhất là `myspa_commission_detail` khoảng 204 MB.
- Có thể archive 2019-2023 của bảng này, ước tính giải phóng khoảng 138 MB nếu reclaim đúng.

## Lưu ý an toàn

- Không tự gửi reply thật cho khách ở giai đoạn này.
- Chỉ tạo nháp/gợi ý, để admin/lễ tân duyệt.
- Không tự chạy ads vì chủ spa chưa gắn ad account riêng.
- Không ghi token Facebook vào code, docs hoặc frontend.

## Cap nhat 09/06/2026 - Xu ly lead thieu so dien thoai

- `src/apps/admin/marketing/AdminMarketingPage.jsx` da co form sua nhanh lead chua noi.
- Bang "Lead Fanpage chua noi khach hang" da co nut:
  - bo sung SĐT/nhu cau/ghi chu,
  - dat hen truc tiep tu lead.
- Muc dich: doi voi lead Facebook chua tu dong noi duoc attribution, le tan co the bo sung SĐT roi chay lai pipeline Facebook.
- `npm run build` da pass sau thay doi.

## Cap nhat 09/06/2026 - Backfill Fanpage tu 26/11/2025

- Tab Fanpage da them nut "Backfill 26/11 -> nay".
- Payload backfill nang da bi Supabase Edge bao `WORKER_RESOURCE_LIMIT`, nen da giam thanh tung dot nho de chay on dinh.
- Dot backfill nhe da chay thanh cong tren production:
  - `posts = 25`
  - `comments = 43`
  - `messages = 1000`
- Sau backfill da chay pipeline Facebook:
  - `triage_fanpage`: `messages = 1`, `comments = 0`
  - `resolve_identities`: `linked_leads = 0`, `updated_customers = 27`, `identities_upserted = 32`
  - `attribution_bridge`: `updated_customers = 27`, chua noi them lich hen/don hang moi.
- UI Lead sau pipeline:
  - 129 lead Facebook
  - 27 lead da noi khach
  - 100 lead chua noi
  - 50 lead nong
  - 2 don tu lead
  - 80.000d doanh thu lead
- `marketing-meta-page-sync/index.ts` ban local da duoc nang cap:
  - posts co `since_date`, `post_limit`, `post_pages`, `post_page_limit`
  - comments co `comment_limit`, `comment_pages_per_post`, `comment_post_limit`, `max_comment_rows`
  - conversations/messages co `message_pages_per_conversation`, `max_messages_per_conversation`, `max_rows`
  - upsert theo batch de giam tai Edge Function.
- Chua deploy duoc ban local len Supabase vi Supabase CLI chua login/chua co `SUPABASE_ACCESS_TOKEN`.
- Huong tiep theo: login Supabase CLI, deploy `marketing-meta-page-sync`, roi chay backfill thanh nhieu dot nho theo cursor/limit de lay sau hon ve moc 26/11/2025.

## Cap nhat 10/06/2026 - Backfill sau va triage theo lo nho

- Supabase CLI da login thanh cong bang token anh Nam de trong clipboard.
- Da deploy production:
  - `marketing-meta-page-sync`
  - `marketing-ai`
- Da chay mot dot backfill sau:
  - `posts = 150`
  - `comments = 278`
  - `messages = 1800`
- `triage_fanpage` ban cu bi `IDLE_TIMEOUT` khi xu ly 100 inbox + 100 comment vi moi dong co the goi AI.
- Da sua `marketing-ai`:
  - `triage_fanpage` nhan `message_limit`
  - `triage_fanpage` nhan `comment_limit`
  - mac dinh moi lo 25 dong, max 100.
- Da deploy lai `marketing-ai`.
- Da chay 4 lo triage nho thanh cong:
  - 4 x 15 inbox
  - 4 x 15 comment
  - tong: 60 inbox + 60 comment.
- Sau triage da chay:
  - `resolve_identities`: `linked_leads = 0`, `updated_customers = 28`, `identities_upserted = 33`
  - `attribution_bridge`: `updated_customers = 28`, chua noi them don/lich hen moi.
- UI Lead hien tai:
  - top limit Lead Facebook = 200
  - Da noi khach = 28
  - Chua noi = 100
  - Lead nong = 100
  - Don tu lead = 2
  - Doanh thu lead = 80.000d
  - Source quality row Facebook/khong_ro: 289 lead, 28 da noi KH, 135 lead nong, 2 don, 80.000d.
- Luu y van hanh: nhieu comment/bai viet cua chinh page dang tao lead "Khach Fanpage" ao voi noi dung quang cao dai. Can loc `from_id == page_id` hoac content promotion cua chinh page truoc khi triage tiep, neu khong danh sach lead se bi nhieu lead ao.

## Cap nhat 10/06/2026 - Cleanup lead ao Fanpage

- Da sua `marketing-ai`:
  - them `isLikelyPagePromo`
  - them `isLowSignalFanpageNoise`
  - `triage_fanpage` bo qua page-owned/promo/noise thay vi tao lead.
- Da them mode `cleanup_fanpage_leads`.
- Cleanup chi danh dau `marketing_leads.trang_thai='spam'`, khong xoa record.
- Da deploy production `marketing-ai`.
- Ket qua cleanup:
  - lan 1: `leads_marked_spam = 75`, `comments_ignored = 133`
  - lan 2: `leads_marked_spam = 197`, `comments_ignored = 141`
  - lan 3: `leads_marked_spam = 198`, `comments_ignored = 0`
- Da sua UI `AdminMarketingPage.jsx`:
  - query `marketing_leads` voi `trang_thai != spam`
  - loc `unmatchedLeads` va bang Lead/Facebook khong dem spam/page_owned_content
  - bang Source Quality lay so lead/lead nong tu danh sach lead sach tren UI.
- UI sau reload:
  - Lead do duoc = 108
  - Lead Facebook = 108
  - Da noi khach = 28
  - Chua noi = 81
  - Lead nong = 49
  - Don tu lead = 2
  - Doanh thu lead = 80.000d
- Van con mot so tin ngan nhu `Alo`, `Bắt đầu`, `Ib`; tam giu lai vi co the la khach that mo hoi thoai. Buoc sau nen uu tien nut bo sung SĐT/dat hen va workflow le tan xu ly 49 lead nong.
## Cap nhat 10/06/2026 - Phan biet tat ca inbox vs KH tiem nang

- Anh Nam hoi vi sao tu 25/11 den nay chi co 108 KH tiem nang va co phai chi la nguoi co kha nang mua khong.
- Da them mode `sync_fanpage_audience` trong `marketing-ai` de gom tat ca hoi thoai inbound Fanpage theo `conversation_id`, khong chi rieng lead co diem mua cao.
- Da deploy `marketing-ai` len Supabase production.
- Da chay audit/sync tu `since_date = 2025-11-25`:
  - `scanned_messages = 3406`
  - `inbound_messages = 1277`
  - `outbound_messages = 2129`
  - `all_inbox_conversations = 108`
  - `conversations_with_buying_signal = 94`
  - `conversations_with_phone = 32`
  - `leads_updated = 108`
- Ket luan: 108 hien la toan bo hoi thoai khach Fanpage dang co trong database HSMS hien tai, khong phai chi tap nguoi co kha nang mua. Tap co tin hieu mua/dat lich trong 108 la 94.
- Da thu keo sau Meta conversation voi gioi han lon hon nhung `marketing-meta-page-sync` vuot timeout 120s/Edge, va sau do audit van giu 108 hoi thoai.
- Viec tiep theo neu anh Nam chac Fanpage co nhieu hon: can viet importer nen/chia lo co cursor cho Meta Conversations, luu cursor paging, moi lan keo 20-50 conversation de tranh timeout.

## Cap nhat 10/06/2026 - Viet hoa Lead va quet sau SDT hoi thoai

- Da Viet hoa UI Marketing:
  - `Lead` -> `KH tiem nang` / `Khach hang tiem nang`.
  - `Lead nong` -> `KH uu tien`.
  - `Intent` -> `Phan loai` voi nhan de hieu: Dat lich, Hoi gia, Tu van da, Hoi the lieu trinh, Khieu nai/can xu ly, Cham lai khach cu.
- Da sua `marketing-ai`:
  - them mode `resolve_conversation_phones`.
  - quet theo `conversation_id`, gom cac tin inbound cua khach trong cung hoi thoai.
  - neu tim thay SDT trong bat ky tin nao cua hoi thoai thi gan SDT ve `marketing_leads`.
  - neu CRM chua co khach theo SDT do thi tao ho so `khach_hang` nguon `Facebook`, roi noi lai lead voi khach.
  - van loc page-owned/promo/noise truoc khi quet, tranh lay hotline cua Hannah Spa.
- Da deploy production `marketing-ai` sau khi them quet sau SDT.
- Da chay nut `Quet Facebook` tren UI:
  - lan 1: tim `22 hoi thoai co SDT`, nhieu lead bat dau hien SDT tren bang.
  - lan 2 sau khi bat tao/noi CRM: `Da noi khach` tang tu 28 len 33, `Chua noi` giam tu 80 xuong 75.
- UI hien tai sau quet:
  - KH tiem nang do duoc = 108
  - KH tiem nang Facebook = 108
  - Da noi khach = 33
  - Chua noi = 75
  - KH uu tien = 45 o KPI, source quality van co 70 do view tinh theo nguon.
  - Don tu KH tiem nang = 2
  - Doanh thu KH tiem nang = 80.000d
- Giai thich cho anh Nam: `1800 messages` la so dong tin nhan da xu ly/upsert, gom ca tin khach + tin nhan vien/page tra loi + nhieu dong trong cung mot hoi thoai. No khong phai 1800 khach.
- Huong tiep theo: backfill them conversation pages/cuoc hoi thoai cu hon hoac tang do sau sync neu muon tim SDT cho 75 KH tiem nang con chua noi.
