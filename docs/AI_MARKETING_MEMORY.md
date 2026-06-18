# HSMS AI Marketing Memory

## Cap nhat 16/06/2026 - Hop Thu Thong Minh va Bao Cao con sot

- Backend hien dung VPS Supabase self-host `https://api.hannahspa.vn`; kho Fanpage da co 123.329 tin Facebook tren VPS.
- Da them/cap nhat migration `109_marketing_message_thread_columns.sql` de doc hoi thoai nhanh:
  - `marketing_messages.conversation_id`.
  - `marketing_messages.from_platform_user_id`.
  - view `v_marketing_fanpage_message_thread_light`.
- Hop Thu Khach Hang `/admin/marketing/hop-thu` da ro hon cho nhan vien:
  - Danh sach trai: khach can xu ly theo uu tien.
  - Giua: tom tat hoi thoai + dong chat da tai + tin nhan de xuat.
  - Phai: ho so HSMS, viec can lam, goi y upsell, nut ghi ket qua.
  - Khi tai hoi thoai se lay tin moi nhat truoc, gioi han 160 tin, tranh keo toan bo lich su dai lam cham.
- Form "Ghi ket qua cham soc" cho khach Fanpage da du thao tac van hanh:
  - Tu dien ten, SDT neu co, dich vu quan tam, co hoi upsell, phan hoi va ghi chu.
  - Co nut nhanh: Hai long, Tam duoc, Chua hai long, Da mua them, Can cham lai.
  - Luu xong cap nhat trang thai Fanpage; khach can cham lai/chua hai long se duoc hen ngay cham tiep.
- Bao Cao Nhan Vien `/admin/marketing/bao-cao-nhan-vien` da them bang "Khach con sot can xu ly":
  - Hien khach nao dang tre, thieu SDT, khach nong, da noi HSMS.
  - Hien so tin dung tu `inbound_messages`.
  - Sap xep uu tien theo tre han, thieu SDT, can quan ly xem, khach co nhieu tin.
- Da verify bang Chrome:
  - Yoon Min co 12 tin trong hop thu va bao cao.
  - Nhi Nguyen co 50 tin trong bao cao.
  - Khach da noi HSMS nhu Chi Anh Thao hien duoc goi y "Moi khach dat lich dung the con buoi".
- `npm run build` pass.
- Viec tiep theo dung huong:
  - Lam Meta Webhook nhan tin moi realtime vao VPS de HSMS nhan ngay khi khach inbox.
  - Sau webhook, moi lam tiep gui/nhan chat that trong HSMS va automation phan cong nhan vien.

## Cap nhat 17/06/2026 - Nen realtime Fanpage da len VPS

- Da trien khai nen Webhook realtime cho Fanpage tren VPS:
  - Function: `supabase/functions/marketing-webhook/index.ts`.
  - URL production: `https://api.hannahspa.vn/functions/v1/marketing-webhook`.
  - Migration: `supabase/migrations/110_marketing_webhook_realtime_segments.sql`.
- Luong moi:
  - Meta Messenger webhook -> `marketing-webhook`.
  - Webhook normalize message -> ghi `marketing_messages`.
  - Trigger DB cap nhat `marketing_fanpage_customer_segments`.
  - Frontend Hop Thu da subscribe realtime `marketing_messages`/`marketing_fanpage_customer_segments`, nen co nen de nhan tin moi.
- Ket qua test production:
  - Payload Messenger gia lap tra `200` trong ~939ms.
  - Da ghi duoc message raw va segment realtime.
  - Da xoa sach data test sau test.
- Da cai verify token Webhook tren VPS:
  - Token duoc luu trong `/root/supabase/docker/.env`, khong dua vao frontend/code repo.
  - Service `supabase-edge-functions` da co bien `MARKETING_WEBHOOK_VERIFY_TOKEN`.
  - GET verify production tra `200` voi challenge `HSMS_VERIFY_OK`.
- Quyet dinh kien truc quan trong:
  - Khong goi AI dong bo trong request Webhook, vi request co the bi Supabase Edge supervisor huy khi vuot ~30s.
  - AI/tom tat se lam bang worker rieng sau khi message da duoc luu, nhu vay Meta Webhook luon nhanh va khong mat tin.
- Da cap nhat AI nen:
  - `triage_fanpage` uu tien `from_platform_user_id` va `conversation_id` moi cua webhook.
  - Da deploy `marketing-ai/index.ts` len VPS va restart Edge Functions.
  - Da chay thu production gioi han nho: xu ly 3 tin nhan, bo qua 1 comment nhieu, HTTP `200`.
- Viec can lam tiep:
  - Khai bao callback URL `https://api.hannahspa.vn/functions/v1/marketing-webhook` va verify token trong Meta Developer App.
  - Subscribe truong Messenger cua Page trong Meta.
  - Gui 1 tin that vao Fanpage de xac nhan HSMS nhan realtime vao `marketing_messages`.
  - Sau khi co tin that chay ve, lam worker nen `marketing-ai` de tom tat hoi thoai, tao goi y tra loi va phan cong nhan vien.

## Cap nhat 17/06/2026 - Worker AI Marketing nen da chay tren VPS

- Da cai worker nen tren VPS de xu ly sau webhook:
  - `/root/hsms/bin/marketing-ai-worker.sh`.
  - Log: `/var/log/hsms/marketing-ai-worker.log`.
  - Cac lich cron:
    - Moi 2 phut: `triage_fanpage` voi `message_limit=8`, `comment_limit=2`.
    - Moi 15 phut: `resolve_conversation_phones` voi `limit=300`.
    - Moi gio phut 17: `resolve_identities`.
- Da chay thu va cron tu chay thanh cong:
  - `triage`: 8 messages, 2 ignored comments.
  - `phones`: scanned 300 messages, 37 conversations, 4 conversations with phone, 4 leads updated, 1129 identities upserted.
- Edge Functions tren VPS hien dang thieu `OPENAI_API_KEY` va `OPENAI_MODEL`.
  - Khi chua co key, `marketing-ai` van chay fallback rules de phan loai co ban.
  - Khi them key/model, worker nay se tu chay AI that cho tom tat/goi y tra loi.

## Cap nhat 13/06/2026 - Marketing Master Plan

- Da tao `docs/MARKETING_MODULE_MASTER_PLAN.md` lam tai lieu quy hoach module Marketing tong the.
- Ket luan san pham: khong tiep tuc xem Marketing la bang lead/Fanpage roi rac; phai xem la he thong van hanh khach hang da kenh.
- Menu cha Marketing de xuat gom:
  - Tong Quan Marketing
  - Hop Thu Khach Hang
  - Fanpage & Noi Dung
  - Khach Hang Tiem Nang
  - Cham Soc Sau Dich Vu
  - Nhac Lich Lieu Trinh
  - Chien Dich & Remarketing
  - Bao Cao Nhan Vien Tu Van
  - Cau Hinh Kenh
- Uu tien trien khai: Hop Thu Khach Hang realtime cho Facebook truoc, sau do noi HSMS/POS, bao cao nhan vien, cham soc chu ky, Fanpage/noi dung, roi Zalo/hotline.
- Huong ky thuat: Meta Webhook nhan tin moi realtime; UI chi doc hoi thoai/tom tat nhe, khong quet `marketing_messages` tho moi lan.

## Cap nhat 12/06/2026 - Trung tam cham soc khach Fanpage/CRM/POS

- Da trien khai trang `src/apps/admin/cham-soc-khach/AdminChamSocKhachPage.jsx` thanh "Trung Tam Cham Soc Khach".
- Trang nay gom 4 luong lam viec:
  - Fanpage can cham: lay tu `marketing_fanpage_customer_segments`, noi voi ho so HSMS/POS/the lieu trinh khi co SDT.
  - Khach den hom nay: thay form bao cao roi rac cua nhan vien bang bang `nhat_ky_khach_den`.
  - Khach cu/POS: danh sach khach co gia tri cao, con the/buoi, vang lau can goi lai.
  - Hieu qua cham soc: dem so nhat ky hom nay/7 ngay, so Fanpage da cham/da hen, so viec con phai cham, va bang ket qua theo nhan vien.
- Da chay production cac migration:
  - `101_smart_customer_care_center.sql`: tao `nhat_ky_khach_den`, `v_customer_pos_intelligence`, `v_cham_soc_fanpage_smart`, `v_nhat_ky_khach_den_smart`.
  - `102_smart_customer_care_perf_fix.sql`: them view `v_cham_soc_khach`, index va toi uu view Fanpage.
  - `103_fast_fanpage_care_queue.sql`: cat nhánh `lich_su_dich_vu_kh` khoi hang doi Fanpage de tranh timeout REST.
- Trang local da test thanh cong tai `/admin/cham-soc-khach`:
  - Fanpage can cham hien 400 dong uu tien dau.
  - Trong 400 dong dau co 390 khach dat hen/co SDT, 373 khach noi duoc HSMS.
  - Khach cu/POS hien 285 khach can cham.
  - Form "Nhap khach den" mo dung va co du truong ngay, ket qua, ten, SDT, dich vu, KTV, phan hoi, co hoi ban them.
- Da them loi vao menu desktop/mobile:
  - Admin va Le tan deu co muc "Cham Soc Khach" trong navigation.
  - MobileShell da co title `/admin/cham-soc-khach` va muc nhanh trong menu them.
- Nut "Ghi cham" tren tung dong Fanpage da test OK: tu dong mo form nhat ky khach den va dien ten khach, SDT, dich vu quan tam, co hoi upsell, phan hoi, ghi chu goi y. Da test voi khach "Chi Quy" SDT `0969888969`, khong bam luu du lieu gia.
- Da chay production migration `104_link_visit_log_to_fanpage_segment.sql`:
  - Them `nhat_ky_khach_den.fanpage_segment_id` va `platform_user_id`.
  - Them trang thai `da_cham_soc` cho `marketing_fanpage_customer_segments.care_status`.
  - Sau khi nhan vien luu nhat ky tu nut "Ghi cham", HSMS se tu doi trang thai Fanpage sang `da_cham_soc`; neu ket qua la `da_mua_them` thi doi sang `da_hen_lai`.
- Da nang cap hang doi Fanpage ngay 12/06/2026:
  - Mac dinh mo tab "Fanpage can cham" se loc "Hom nay phai cham", khong con bat nhan vien nhin toan bo 400 dong.
  - Bo loc moi: hom nay phai cham, qua han, can xu ly, dat hen co SDT, chua co SDT, da noi HSMS, da cham/da hen, tat ca.
  - KPI dau trang doi thanh so viec Fanpage hom nay, so viec qua han, so khach chua co SDT, so da cham/da hen.
  - Moi dong hien ngay "Cham:" tu `next_contact_at`; co them nut "Da cham".
  - Bam "Khong nghe" se tu hen lai ngay hom sau; bam "Da cham"/"Da hen" se xoa han cham de dong do roi khoi danh sach viec hom nay.
- Da them tab "Hieu qua cham soc" ngay 12/06/2026:
  - App tu gan ten nhan vien bang cach query `profiles`, khong phu thuoc migration 105.
  - Form nhat ky luu `created_by` tu user dang dang nhap de bao cao dung tung nhan vien.
  - Da test tren Chrome: tab report mo duoc, request Supabase 200, khong co console error do.
  - Migration `105_customer_care_report_staff_name.sql` co file local nhung chua can chay production vi app da ghep ten nhan vien o frontend.
- Edge Function `marketing-meta-page-sync` da deploy production ngay 12/06/2026 voi mode `send_message`.
  - UI "Gui/chep tin" co the goi function nay de gui Messenger truc tiep tu HSMS.
  - Chua gui tin test that cho khach de tranh lam phien khach; neu function/Meta tu choi gui, UI van fallback chep kich ban de nhan vien dan thu cong.
- Da doi UI `/admin/cham-soc-khach` thanh "Hop Thu Thong Minh":
  - Tab Fanpage khong con la bang 5 cot kho hieu; da chia 3 khu: danh sach khach can xu ly, khung tra loi/de xuat tin nhan, ho so HSMS + goi y tu van/upsell.
  - Man hinh noi ro: kho goc co 123.320 tin nhan va 6.021 khach/dinh danh; UI chi nap nhom uu tien de nhanh va de lam.
  - Tam thoi khong truy van truc tiep `marketing_messages` theo JSON trong UI vi da thay Supabase timeout 500; tranh hao tai nguyen.
  - Da them migration local `107_marketing_message_thread_light_index.sql` de tao index/view nhe cho hop chat sau nay. Chua apply production vi `supabase db push` can DB password/SQL Editor.
  - Huong dung dai han: dung Meta Webhook de nhan tin moi realtime, chi luu delta + tom tat, khong keo lai toan bo du lieu tho moi lan.
- `npm run build` da pass sau thay doi.

## Cap nhat 10/06/2026 - Fanpage inbox backfill theo lo

- Da them cursor rieng cho lich su 3 nam: `conversation_cursor_history_2022_2025`.
- Muc tieu lich su: lay du lieu tho tu 26/11/2022 den 26/11/2025, vi giai doan dia chi 25 Vo Thi Sau van co gia tri remarketing.
- Lich su 3 nam dang luu vao cung kho tho `marketing_messages`, chong trung bang `kenh,platform_message_id`.
- Da chay 8 lo lich su dau tien:
  - Lo 1: 25 hoi thoai, 963 tin.
  - Lo 2: 25 hoi thoai, 1.077 tin.
  - Lo 3: 25 hoi thoai, 887 tin.
  - Lo 4-8: 125 hoi thoai, 3.381 tin.
- Da chay them cac vong lich su tiep theo ngay 11/06/2026:
  - 3 lo dau: 75 hoi thoai, 1.432 tin duoc upsert.
  - Vong 8 lo tiep: 200 hoi thoai, 4.334 tin duoc upsert.
  - Vong 8 lo tiep: 200 hoi thoai, 3.906 tin duoc upsert.
  - Vong 8 lo tiep: 200 hoi thoai, 4.134 tin duoc upsert.
  - Vong 8 lo tiep: 200 hoi thoai, 3.784 tin duoc upsert.
  - Vong 8 lo tiep: 200 hoi thoai, 4.306 tin duoc upsert.
  - Vong 8 lo tiep: 200 hoi thoai, 2.957 tin duoc upsert.
  - Vong 8 lo tiep: 200 hoi thoai, 1.985 tin duoc upsert.
  - Vong 8 lo tiep: 200 hoi thoai, 1.821 tin duoc upsert.
  - Vong 16 lo tiep: 400 hoi thoai, 3.567 tin duoc upsert.
  - Vong 16 lo tiep: 400 hoi thoai, 2.231 tin duoc upsert.
  - Chay lien tuc den het cursor: them 107 lo / 5.350 hoi thoai / 81.020 tin duoc upsert.
  - Luu y: so "duoc upsert" co the bao gom cap nhat dong cu khi Meta tra lai tin trung; so lieu production ben duoi la so tin nhan duy nhat dang co trong kho.
- So lieu production bao phu tu 26/11/2022 den hien tai:
  - `marketing_messages`: 123.320 tin Facebook duy nhat.
  - Tin khach gui vao: 35.806.
  - Tin page tra ra: 87.498.
  - Dong sync/noi bo: 16.
  - Dong text rong/attachment-only: 10.418.
  - Hoi thoai khach inbound rieng biet: 6.033.
  - Hoi thoai co SDT: 5.304.
  - Hoi thoai co tin hieu quan tam/dich vu: 6.029.
  - Hoi thoai tung inbox nhung chua ro nhu cau: 4.
  - Tong conversation keys quet duoc: 8.069.
  - Ban ghi cu nhat hien thay: 26/11/2022 06:19 UTC, khach Tran Thi Thien Trang doi lich triet long.
- Cursor lich su `conversation_cursor_history_2022_2025` da `done=true`, `has_more=false`, cap nhat luc 11/06/2026 22:26 UTC. Viec keo inbox Fanpage lich su tu 26/11/2022 den hien tai da hoan tat.

## Cap nhat 11/06/2026 - Phan nhom cham soc khach Fanpage

- Da tao bang `marketing_fanpage_customer_segments` va view `v_marketing_fanpage_segment_summary` de gom tung hoi thoai thanh tung khach/dinh danh.
- Da chay bo phan loai tren 123.320 tin nhan tho:
  - Tong khach/dinh danh sau khi hop nhat: 6.021.
  - Tong khach co SDT lay tu tin khach gui vao: 1.148.
  - Khach co nhu cau nhung chua co SDT: 4.865.
  - Khach da/chuan bi dat hen co SDT: 1.141.
  - Khach can xu ly rieng: 10, trong do 5 co SDT.
  - Khach nong co SDT: 1.
  - Khach cu co SDT can goi lai: 1.
  - Tuong tac thap: 3.
- Da sua bo dieu kien "can xu ly rieng" de khong con bat nham cac cau nhu dau vai gay/massage thanh khieu nai; chi giu cac tin co dau hieu khieu nai, phan nan, hoan tien, khong hai long, di ung, bi bong, lua dao, khong hieu qua.
- Tab Marketing > KH tiem nang da co khoi "Danh sach cham soc lai tu Fanpage" voi nhom cham soc, diem uu tien, dich vu quan tam, viec can lam va kich ban goi y.
- Nut tren UI hien la "Lam moi phan nhom Fanpage" de tai lai ket qua da phan nhom; viec phan loai toan bo du lieu nen chay bang script/automation nen, tranh bam trong app lam timeout.

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

## Cap nhat 13/06/2026 - Marketing Module + Hop Thu realtime

- Da quy hoach Marketing thanh menu cha lon, khong dung mot trang nhieu tab nho.
- Da them `MarketingModulePage.jsx` lam tong quan va route khung cho:
  - Hop Thu Khach Hang,
  - Fanpage & Noi Dung,
  - Khach Hang Tiem Nang,
  - Cham Soc Sau Dich Vu,
  - Nhac Lich Lieu Trinh,
  - Chien Dich & Remarketing,
  - Bao Cao Nhan Vien,
  - Cau Hinh Kenh.
- Hop Thu Khach Hang da duoc dua ve `/admin/marketing/hop-thu`.
- Da them client Supabase Realtime trong Hop Thu:
  - nghe insert `marketing_messages` kenh Facebook,
  - nghe update `marketing_fanpage_customer_segments`,
  - refresh nhe hang doi uu tien, khong tai lai toan bo message raw.
- Da noi khung chat voi view nhe `v_marketing_fanpage_message_thread_light`, doc toi da 120 tin theo `conversation_ids` hoac `platform_user_id`.
- Da them migration `107_marketing_message_thread_light_index.sql` va `108_marketing_realtime_inbox.sql` de production co:
  - index conversation/sender,
  - view hoi thoai nhe,
  - realtime publication cho message/segment.
- Can xac nhan production da apply 107/108. Lan kiem tra local tren UI bao production chua co view `v_marketing_fanpage_message_thread_light`.

## Cap nhat 13/06/2026 - Supabase CLI token va lich su migration

- Supabase access token trong clipboard dung duoc; CLI ket noi production thanh cong.
- Da chay rieng 107/108 len production, xac nhan view `v_marketing_fanpage_message_thread_light` da ton tai.
- Da repair migration history production: 090-108 => applied.
- Da chuan hoa migration trung version 025:
  - `025_fix_gia_tri_the.sql` thanh `0250_fix_gia_tri_the.sql`
  - `025_pos_vat_and_staff_sale_income.sql` thanh `0251_pos_vat_and_staff_sale_income.sql`
  - repair 025 reverted, 0250/0251 applied.
- `supabase db push --dry-run` da bao remote up to date.
- Hien tai Hop Thu khong con loi missing view, nhung doc lich su chat cu van timeout vi view con doc du lieu thread tu JSONB tren kho 123k tin.
- Da tao migration 109 de them cot thread/index/trigger va ham backfill theo lo nho.
- Chua apply duoc 109 vi Supabase production dang read-only sau khi lan dau update toan bang bi server process crash; transaction da rollback, khong tao cot.
- Buoc tiep theo khi Supabase het read-only: apply 109 va backfill bang lo nho.

## Cap nhat 13/06/2026 - Man hinh con Marketing da bat dau thanh module van hanh

- Da tach `AdminChamSocKhachPage.jsx` thanh cac mode dung lai theo route:
  - Hop Thu Khach Hang = `fanpage`.
  - Cham Soc Sau Dich Vu = `today`.
  - Nhac Lich Lieu Trinh = `pos`.
  - Bao Cao Nhan Vien = `report`.
- Da them KPI rieng cho tung mode bang `CareSummaryStrip`, giup nhan vien vao man hinh nao biet viec man hinh do ngay.
- Da noi route that trong `MarketingModulePage.jsx` cho:
  - `/admin/marketing/khach-tiem-nang`
  - `/admin/marketing/cham-soc-sau-dich-vu`
  - `/admin/marketing/nhac-lich-lieu-trinh`
  - `/admin/marketing/bao-cao-nhan-vien`
- Khach Hang Tiem Nang dung chung mode Fanpage nhung mac dinh filter `all`, de xem toan bo khach uu tien/can phan loai.
- DevTools da xac nhan:
  - Cham Soc Sau Dich Vu co nut `+ Nhap khach den`, KPI khach hom nay/7 ngay/KTV/cho cham lai.
  - Nhac Lich Lieu Trinh co du lieu that: 284 can goi lai, 150 con buoi, 134 moi quay lai, tong gia tri nhom hien dang gon hon.
  - Khach Hang Tiem Nang va Bao Cao Nhan Vien bi ve login do phien local het auth; chua gui lai mat khau.
- `npm run build` pass sau thay doi.
- Supabase production van read-only luc kiem tra lai, chua apply duoc migration 109.

## Cap nhat 13/06/2026 - Fanpage, Chien Dich, Cau Hinh Kenh co UI that

- Da them cac man hinh chuyen biet trong `MarketingModulePage.jsx`:
  - `FanpageContentPage`
  - `CampaignsPage`
  - `ChannelSettingsPage`
- Cac man hinh doc du lieu that tu cac bang/view marketing hien co, khong con chi la trang mo ta:
  - `v_marketing_fanpage_overview`
  - `marketing_page_posts`
  - `marketing_content_calendar`
  - `v_marketing_campaign_performance`
  - `v_marketing_reactivation_customers`
  - `v_marketing_source_quality`
  - `v_marketing_fanpage_segment_summary`
- `/admin/marketing/fanpage-noi-dung` hien:
  - suc khoe Fanpage/webhook,
  - bai viet co tin hieu tot,
  - lich noi dung,
  - chu de nen dang.
- `/admin/marketing/chien-dich` hien:
  - ROI/chi phi/doanh thu chien dich,
  - tep khach remarketing,
  - danh sach khach cu uu tien goi lai.
- `/admin/marketing/cau-hinh-kenh` hien:
  - trang thai Facebook/Zalo/Hotline/dien thoai,
  - nguyen tac luu tru du lieu gon,
  - nhom Fanpage HSMS dang quan ly.
- `npm run build` pass.
- DevTools snapshot bi nhay sang tab Vietnix, khong tiep tuc thao tac browser de tranh anh huong tab cua anh Nam.
