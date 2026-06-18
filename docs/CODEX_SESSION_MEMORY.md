# HSMS - Codex Session Memory

## Cap nhat 16/06/2026 - Tiep tuc Marketing tren VPS va lam ro Hop Thu/bao cao

- Da chuyen cau hinh local sang VPS Supabase self-host:
  - `.env`: `VITE_SUPABASE_URL=https://api.hannahspa.vn`.
  - `.env.import`: dung service role cua VPS, khong in key ra chat.
  - REST test bang bang `vi` thanh cong.
- Da trien khai Edge Function `admin-users` len VPS va test:
  - `health` tra 200.
  - user le tan goi `ping` bi 403 dung quyen, chung to function chay va chan role dung.
- Da apply/hoan thien migration `109_marketing_message_thread_columns.sql` tren VPS:
  - Them cot nhe cho `marketing_messages`: `conversation_id`, `from_platform_user_id`, `recipient_id`.
  - Tao/cap nhat view `v_marketing_fanpage_message_thread_light`.
  - Backfill xong `conversation_id` cho 123.329 tin Facebook; `from_platform_user_id` co 123.313 dong; `recipient_id` thieu do data Meta cu khong luu truong nay.
- Da nang cap `AdminChamSocKhachPage.jsx`:
  - Hop Thu Thong Minh tai luong chat chi tiet theo `conversation_id`, lay tin moi nhat truoc, gioi han 160 tin de nhanh.
  - Them khoi tom tat hoi thoai: "Khach vua noi gi", "Hannah da tra loi", "Muc xu ly" de nhan vien khong can doc ca lich su dai.
  - Nut "Ghi ket qua cham soc" mo form nhat ky Fanpage co thong tin khach, dich vu, upsell va nut ket qua nhanh.
  - Luu nhat ky Fanpage se cap nhat `care_status`; neu can cham lai/chua hai long thi hen lai 1-2 ngay, neu da mua them thi sang `da_hen_lai`.
  - Bao cao nhan vien them bang "Khach con sot can xu ly" gom ten, SDT, so tin, nhom, han cham, viec can lam va trang thai.
  - Da sua so tin trong bang bao cao doc dung `inbound_messages` thay vi `message_count`.
- Da test giao dien local tren `http://localhost:5173`:
  - `/admin/marketing/hop-thu` hien 123.329 tin trong kho VPS, 400 khach can lam, tom tat hoi thoai va form ghi ket qua dung.
  - `/admin/marketing/bao-cao-nhan-vien` hien KPI, bang ket qua, bang theo nhan vien va bang khach con sot; so tin cua tung khach hien dung.
- `npm run build` pass sau thay doi.

## Cap nhat 17/06/2026 - Da trien khai nen Webhook realtime Fanpage tren VPS

- Da tao va chay migration VPS `110_marketing_webhook_realtime_segments.sql`:
  - Them function `marketing_detect_services_from_text`.
  - Them trigger `trg_marketing_realtime_segment_from_message` tren `marketing_messages`.
  - Khi co tin Facebook moi duoc insert, DB tu cap nhat/tao `marketing_fanpage_customer_segments`, cong so tin, them conversation id dang `fb:<page_id>:<customer_id>`, dat `next_contact_at` hom nay neu khach inbox.
- Da nang cap Edge Function `marketing-webhook`:
  - GET verify cho Meta van tra challenge neu verify token dung.
  - POST Meta `object=page` normalize Messenger event thanh row `marketing_messages`.
  - Webhook chi ghi tin moi va tra nhanh; khong cho AI chay trong request vi da test neu cho AI/REST sai duong se bi supervisor timeout.
  - Dung `supabase-js` noi bo de ghi DB, khong dung REST fetch thu cong.
- Da nang cap `marketing-ai`:
  - Khi xu ly `inbox_webhook`, neu message da co `platform_message_id` thi chi update `lead_id` va cac truong AI, khong ghi de noi dung/tin goc.
  - Dung `createReplyActionOnce` de tranh tao lap goi y tra loi khi Meta retry cung mot webhook.
  - Triage Fanpage uu tien dung `from_platform_user_id` va `conversation_id` moi cua webhook, tranh gom sai khach khi tin realtime vua vao.
- Da deploy len VPS:
  - Copy function vao `/root/supabase/docker/volumes/functions/marketing-webhook/index.ts`.
  - Copy `marketing-ai/index.ts`.
  - Restart `supabase-edge-functions`.
- Da test production endpoint:
  - POST `https://api.hannahspa.vn/functions/v1/marketing-webhook` voi payload Messenger gia lap tra `200` trong ~939ms.
  - Ket qua test co `processed=1`, ghi duoc `raw_message_id`, `realtime_segment=true`.
  - Da xoa sach tat ca message/segment test, verify con `messages=0`, `segments=0`.
- Da cai `MARKETING_WEBHOOK_VERIFY_TOKEN` tren VPS:
  - Them bien moi vao `/root/supabase/docker/.env`.
  - Them bien moi vao service `supabase-edge-functions` trong docker compose.
  - Restart Edge Functions thanh cong.
  - Test GET verify production bang challenge `HSMS_VERIFY_OK` tra `200` va body dung challenge.
- Da test AI nen sau webhook:
  - Goi `marketing-ai` mode `triage_fanpage` voi gioi han nho.
  - Ket qua production tra `200`: xu ly 3 tin nhan, bo qua 1 comment nhieu.
- Viec tiep theo:
  - Khai bao URL webhook trong Meta Developer: `https://api.hannahspa.vn/functions/v1/marketing-webhook`.
  - Subscribe truong Messenger cua Page trong Meta Developer va gui 1 tin that vao Fanpage de xac nhan HSMS nhan realtime.
  - Sau khi Meta gui tin that ve, bat dau lam worker/cron AI rieng de phan tich/tom tat sau khi tin da vao kho, khong lam cham Webhook.

## Cap nhat 17/06/2026 - Da cai worker AI Marketing nen tren VPS

- Da tao handoff tong hop cho anh Nam/Claude: `docs/MARKETING_HANDOFF_2026_06_17.md`.
- Da them script cai dat worker: `scripts/vps_install_marketing_ai_worker.sh`.
- Da cai worker that tren VPS:
  - File chay: `/root/hsms/bin/marketing-ai-worker.sh`.
  - Log: `/var/log/hsms/marketing-ai-worker.log`.
  - Cron:
    - Moi 2 phut: `triage_fanpage` xu ly tin/comment Fanpage moi voi lo nho.
    - Moi 15 phut: `resolve_conversation_phones` quet SDT trong hoi thoai va noi lead/khach.
    - Moi gio phut 17: `resolve_identities` noi dinh danh Fanpage/CRM.
- Da chay thu tren VPS:
  - `triage`: xu ly 8 tin nhan, bo qua 2 comment nhieu.
  - `phones`: quet 300 tin, 37 hoi thoai, tim 4 hoi thoai co SDT, cap nhat 4 lead; dong bo 1129 identity.
- Da xac nhan cron tu chay vao log luc 01:00 va 01:02 gio Viet Nam.
- Luu y: Edge Functions hien chua co `OPENAI_API_KEY` va `OPENAI_MODEL`, nen AI dang dung fallback rules. Khi bo sung key/model tren VPS, worker hien tai se tu dung AI that ma khong can doi kien truc.

## Cap nhat 13/06/2026 - Quy hoach lai module Marketing tong the

- Da tao tai lieu `docs/MARKETING_MODULE_MASTER_PLAN.md`.
- Dinh huong moi: Marketing la menu cha lon, gom hoat dong chat, Fanpage/noi dung, khach tiem nang, cham soc sau dich vu, nhac lich lieu trinh, chien dich/remarketing, bao cao nhan vien va cau hinh kenh.
- Menu con de xuat:
  - Tong Quan
  - Hop Thu Khach Hang
  - Fanpage & Noi Dung
  - Khach Hang Tiem Nang
  - Cham Soc Sau Dich Vu
  - Nhac Lich Lieu Trinh
  - Chien Dich & Remarketing
  - Bao Cao Nhan Vien
  - Cau Hinh Kenh
- Uu tien tiep theo: lam Hop Thu Khach Hang realtime cho Facebook truoc, dung Meta Webhook de nhan tin moi, khong keo lai toan bo Fanpage moi lan.
- Kien truc dung: tin moi -> conversation -> nhan dien khach -> tom tat -> goi y tu van -> nhan vien tra loi -> ghi ket qua -> tao lich cham soc lai.

## Cap nhat 12/06/2026 - Da co Trung tam cham soc khach trong HSMS

- Da trien khai trang `/admin/cham-soc-khach` de gom Fanpage + CRM + POS + the lieu trinh + bao cao khach den vao mot man hinh.
- File chinh: `src/apps/admin/cham-soc-khach/AdminChamSocKhachPage.jsx`.
- Da chay production migration:
  - `101_smart_customer_care_center.sql`
  - `102_smart_customer_care_perf_fix.sql`
  - `103_fast_fanpage_care_queue.sql`
- Bang/view moi quan trong:
  - `nhat_ky_khach_den`: nhan vien nhap bao cao khach den hang ngay thay form ngoai he thong.
  - `v_cham_soc_fanpage_smart`: hang doi Fanpage uu tien, noi voi HSMS/POS/the con buoi khi co SDT.
  - `v_nhat_ky_khach_den_smart`: nhat ky khach den kem goi y cham soc/upsell.
  - `v_cham_soc_khach`: khach cu/POS can cham lai, nhat la khach con buoi/vang lau.
- Da test local bang Chrome:
  - `/admin/cham-soc-khach` load thanh cong.
  - Fanpage hien 400 khach uu tien dau, 390 khach dat hen/co SDT, 373 khach noi HSMS.
  - Khach cu/POS hien 285 khach.
  - Form "Nhap khach den" mo dung.
  - Tab "Hieu qua cham soc" mo dung, hien bao cao hom nay/7 ngay va bang theo nhan vien.
- Menu da co loi vao "Cham Soc Khach" cho desktop va mobile trong `src/constants/navConfig.js` va `src/components/layout/MobileShell.jsx`.
- Nut "Ghi cham" tren dong Fanpage da test OK: bam tu hang khach Fanpage se tu dien form nhat ky khach den bang ten, SDT, dich vu quan tam, goi y upsell va noi dung cham soc. Da chi test mo form, khong luu du lieu gia.
- Da them va chay production migration `104_link_visit_log_to_fanpage_segment.sql`:
  - `nhat_ky_khach_den` co them `fanpage_segment_id`, `platform_user_id`.
  - `marketing_fanpage_customer_segments.care_status` co them `da_cham_soc`.
  - Luu nhat ky tu nut "Ghi cham" se tu cap nhat trang thai Fanpage sang `da_cham_soc`; neu form chon `da_mua_them` thi sang `da_hen_lai`.
- Da nang cap hang doi Fanpage:
  - Mac dinh loc "Hom nay phai cham".
  - Them bo loc "Qua han" va "Da cham/da hen".
  - Moi dong hien han cham tu `next_contact_at`.
  - Them nut "Da cham"; nut "Khong nghe" tu hen lai ngay hom sau.
  - Da test reload `/admin/cham-soc-khach`: khong co console error, cac request chinh 200.
- Da them tab "Hieu qua cham soc":
  - `nhat_ky_khach_den.created_by` duoc luu tu user dang dang nhap.
  - Bao cao ghep ten nhan vien bang `profiles` trong app, nen migration `105_customer_care_report_staff_name.sql` chua can chay production.
  - Grid bao cao da doi sang auto-fit de khong vo tren man hinh nho.
- `npm run build` da pass.
- Da deploy production Edge Function `marketing-meta-page-sync` voi `mode='send_message'` ngay 12/06/2026 bang Supabase CLI va token clipboard.
  - Chua gui tin test that cho khach de tranh lam phien khach.
  - UI "Gui/chep tin" se goi function gui Messenger truc tiep; neu function/Meta tu choi, UI fallback chep kich ban de nhan vien dan thu cong.
- Da doi giao dien Fanpage thanh "Hop Thu Thong Minh":
  - 3 khu ro rang: danh sach khach, khung tra loi/de xuat tin nhan, ho so HSMS + goi y tu van/upsell.
  - Da them ghi chu tren UI giai thich vi sao chi hien 400 khach uu tien trong khi kho goc co 123.320 tin nhan/6.021 khach.
  - Khong con truy van truc tiep `marketing_messages` trong UI vi filter JSON lam timeout 500; sau khi chan lai, reload Chrome khong con request 500.
  - Them local migration `107_marketing_message_thread_light_index.sql` cho index/view doc hoi thoai nhanh, chua apply production.
  - Kien truc dung tiep theo: Meta Webhook nhan tin moi realtime, luu delta + cap nhat tom tat, khong tai lai toan bo Fanpage.

## Cap nhat 10/06/2026 - Tiep tuc Fanpage inbox

- Da them cursor rieng lich su 3 nam `conversation_cursor_history_2022_2025`.
- Du lieu tho Fanpage duoc luu trong Supabase:
  - `marketing_messages`: inbox/tin nhan tho.
  - `marketing_page_comments`: comment tho.
  - `marketing_page_posts`: bai viet tho.
  - `marketing_connected_pages.metadata`: cursor/dau trang sync.
- Da chay 8 lo lich su tu 26/11/2022:
  - 25 hoi thoai / 963 tin.
  - 25 hoi thoai / 1.077 tin.
  - 25 hoi thoai / 887 tin.
  - 125 hoi thoai / 3.381 tin.
- Da chay them ngay 11/06/2026:
  - 3 lo / 75 hoi thoai / 1.432 tin duoc upsert.
  - 8 lo / 200 hoi thoai / 4.334 tin duoc upsert.
  - 8 lo / 200 hoi thoai / 3.906 tin duoc upsert.
  - 8 lo / 200 hoi thoai / 4.134 tin duoc upsert.
  - 8 lo / 200 hoi thoai / 3.784 tin duoc upsert.
  - 8 lo / 200 hoi thoai / 4.306 tin duoc upsert.
  - 8 lo / 200 hoi thoai / 2.957 tin duoc upsert.
  - 8 lo / 200 hoi thoai / 1.985 tin duoc upsert.
  - 8 lo / 200 hoi thoai / 1.821 tin duoc upsert.
  - 16 lo / 400 hoi thoai / 3.567 tin duoc upsert.
  - 16 lo / 400 hoi thoai / 2.231 tin duoc upsert.
  - Chay lien tuc den het cursor: them 107 lo / 5.350 hoi thoai / 81.020 tin duoc upsert.
  - So upsert co the gom dong cu duoc cap nhat; so ben duoi la so tin nhan duy nhat.
- So lieu production bao phu tu 26/11/2022 den hien tai:
  - 123.320 tin Facebook duy nhat.
  - 35.806 tin khach gui vao.
  - 87.498 tin page tra ra.
  - 16 dong sync/noi bo.
  - 10.418 dong text rong/attachment-only.
  - 6.033 hoi thoai khach inbound rieng biet.
  - 5.304 hoi thoai co SDT.
  - 6.029 hoi thoai co tin hieu quan tam/dich vu.
  - 4 hoi thoai tung inbox nhung chua ro nhu cau.
  - 8.069 tong conversation keys quet duoc.
- Ban ghi cu nhat da cham 26/11/2022 06:19 UTC. Cursor lich su `conversation_cursor_history_2022_2025` da `done=true`, `has_more=false`, cap nhat luc 11/06/2026 22:26 UTC; viec keo inbox Fanpage lich su tu 26/11/2022 den hien tai da hoan tat.

## Cap nhat 11/06/2026 - Phan nhom khach Fanpage de cham soc lai

- Da tao `marketing_fanpage_customer_segments` va view `v_marketing_fanpage_segment_summary`.
- Da phan loai lai toan bo kho tin Fanpage tu 26/11/2022 den hien tai:
  - 123.320 tin nhan duoc doc.
  - 8.069 conversation keys.
  - 6.021 khach/dinh danh sau khi hop nhat.
  - 1.148 khach co SDT lay tu tin inbound cua khach.
- Ket qua nhom cham soc:
  - `tiem_nang_chua_co_sdt`: 4.865.
  - `khach_dat_hen_co_sdt`: 1.141.
  - `can_xu_ly_rieng`: 10, trong do 5 co SDT.
  - `khach_nong_co_sdt`: 1.
  - `khach_cu_co_sdt_can_goi_lai`: 1.
  - `tuong_tac_thap`: 3.
- Da don 1.188 dong phan loai cu trong bang ket qua; khong xoa du lieu tin nhan tho.
- Tab Marketing > KH tiem nang da hien them bang cham soc lai tu Fanpage, dung thuat ngu tieng Viet thay cho "lead".

- Da trien khai va deploy `marketing-meta-page-sync` mode `sync_conversations_batch`.
- Mode nay quet inbox Facebook theo lo va luu cursor trong metadata Fanpage, giup doi phien van tiep tuc tu diem dung.
- Da gan nut "Quet Facebook" trong Marketing goi them mot lo inbox truoc khi loc SDT/phan loai khach.
- Da them `marketing-ai` mode `fanpage_audience_stats` va UI tab "KH tiem nang" hien thong ke tat ca inbox / co SDT / co nhu cau / tung inbox.
- So lieu tam thoi production tu 25/11/2025:
  - 21.467 tin Facebook.
  - 5.931 tin khach gui vao.
  - 15.529 tin page tra ra.
  - 1.390 hoi thoai khach inbound rieng biet.
  - 242 hoi thoai co SDT theo bo loc chuan.
  - 1.184 hoi thoai co tin hieu quan tam/dich vu.
  - 171 hoi thoai tung inbox nhung chua ro nhu cau.
- Cursor van bao con trang tiep (`has_more=true`). Neu tiep tuc cong viec, chay them `sync_conversations_batch` hoac bam "Quet Facebook" trong UI de lay tiep.
- Da sua loi dong sync error thieu `attachments=[]`.

Cap nhat: 09/06/2026

File nay la bo nho ban giao giua cac phien Codex cho du an HSMS. Khi mo phien moi, doc file nay truoc khi tiep tuc, sau do doc them `docs/AI_MARKETING_MEMORY.md` neu cong viec lien quan Marketing/Facebook.

## Nguyen tac tiep tuc cong viec

- Luon tra loi anh Nam bang tieng Viet.
- Truoc khi sua UI, doc `src/DESIGN_SYSTEM.md`.
- Khong ghi token, secret, access token Facebook, service role key vao code, docs hoac frontend.
- Neu can doc hieu code, uu tien MCP CodeGraph truoc khi mo nhieu file thu cong.
- Sau moi dot lam lon, cap nhat file nay hoac file memory chuyen de tuong ung.

## Cong cu da cau hinh

- CodeGraph MCP da duoc cau hinh cho Codex trong `.codex/config.toml` va global Codex config.
- Lenh MCP CodeGraph: `codegraph serve --mcp`.
- Index HSMS nam trong `.codegraph/` va khong commit.
- Chrome control co the bi loi theo tung phien; neu khong dieu khien duoc Chrome thi van tiep tuc code trong repo, con thao tac Facebook Dev thi de anh Nam lam theo checklist.

## Trang thai gan nhat

- Du an dang co nhieu thay doi chua commit lien quan AI Marketing/Facebook:
  - `src/apps/admin/marketing/AdminMarketingPage.jsx`
  - `supabase/functions/marketing-ai/`
  - `supabase/functions/marketing-meta-page-sync/`
  - `supabase/functions/marketing-webhook/`
  - cac migration `089` den `098`
- File chuyen de Marketing/Facebook la `docs/AI_MARKETING_MEMORY.md`.
- Fanpage Hannah Spa da lay duoc Page ID `2310509269209913`.
- Page token tung bi dan vao chat; khong ghi lai token. Sau khi on dinh can tao token moi va luu vao Supabase/Vercel secret/Vault.

## Huong tiep tuc AI Marketing

1. Hoan thien luong ket noi Fanpage:
   - connect page,
   - sync page/posts/comments/inbox,
   - webhook nhan inbox/comment,
   - khong tu dong gui tin that khi chua co phe duyet.
2. Chay lai backfill Facebook tu `2025-11-26` sau khi co token moi.
3. Chay cac mode trong `marketing-ai`:
   - `triage_fanpage`,
   - `resolve_identities`,
   - `attribution_bridge`.
4. Uu tien sua khoang trong attribution:
   - noi lead voi `khach_hang`,
   - noi lead voi `lich_hen`,
   - noi lead voi `don_hang`,
   - do duoc doanh thu den tu inbox/comment.

## Cap nhat 09/06/2026 - Pipeline Facebook UI

- Tab Lead trong `src/apps/admin/marketing/AdminMarketingPage.jsx` da co nut "Chay pipeline Facebook".
- Nut nay goi lien tiep 3 mode Edge Function:
  - `triage_fanpage`
  - `resolve_identities`
  - `attribution_bridge`
- Tab Lead da doc them:
  - `v_marketing_customer_360`
  - `v_marketing_source_quality`
- UI Lead hien them:
  - hieu qua nguon lead theo kenh/nguon chi tiet,
  - nhom Customer 360 uu tien,
  - danh sach khach nen cham lai truoc,
  - lead Fanpage chua noi khach.
- `marketing-ai` da cap nhat danh sach mode khi goi sai mode.
- `npm run build` da pass sau thay doi nay.

## Cap nhat 09/06/2026 - Xu ly lead Fanpage chua noi

- Da them form "Bo sung thong tin lead" trong `src/apps/admin/marketing/AdminMarketingPage.jsx`.
- Bang "Lead Fanpage chua noi khach hang" da co hanh dong nhanh:
  - bo sung so dien thoai/nhu cau/ghi chu,
  - dat hen truc tiep tu lead.
- Sau khi bo sung SĐT, man hinh reload va nhac chay pipeline Facebook de noi lead voi khach hang, lich hen, don hang.
- `npm run build` da pass sau thay doi nay.

## Cap nhat 09/06/2026 - Backfill Fanpage 26/11 den nay

- Tab Fanpage da co nut "Backfill 26/11 -> nay".
- Da chay backfill thanh cong mot dot nhe tren production:
  - 25 bai viet,
  - 43 binh luan,
  - 1000 tin nhan.
- Da chay pipeline Facebook sau backfill:
  - `triage_fanpage`: xu ly them 1 tin nhan,
  - `resolve_identities`: cap nhat 27 ho so khach, upsert 32 dinh danh,
  - `attribution_bridge`: chua noi them don/lich hen moi vi nhieu lead con thieu so dien thoai.
- UI Lead hien tai dang co:
  - 129 lead Facebook,
  - 27 lead da noi khach,
  - 100 lead chua noi,
  - 50 lead nong,
  - 2 don tu lead,
  - 80.000d doanh thu lead.
- `supabase/functions/marketing-meta-page-sync/index.ts` da duoc sua local de ho tro phan trang sau cho posts/comments/conversations/messages va loc tu `since_date`.
- Ban sync sau chua deploy len Supabase production duoc vi Supabase CLI tren may chua login/chua co `SUPABASE_ACCESS_TOKEN`.
- Khi co Supabase access token, can deploy lai `marketing-meta-page-sync`, sau do chay backfill nhieu dot nho de lay sau hon moc 26/11 ma khong vuot gioi han Edge Function.

## Cap nhat 10/06/2026 - Deploy va chay backfill sau

- Da dang nhap Supabase CLI bang token anh Nam dat trong clipboard. Khong ghi token vao chat/code/docs.
- Da deploy production:
  - `marketing-meta-page-sync`
  - `marketing-ai`
- Da chay backfill sau qua trinh duyet dang dang nhap:
  - `posts = 150`
  - `comments = 278`
  - `messages = 1800`
- Khi chay `triage_fanpage` toan bo thi bi Supabase `IDLE_TIMEOUT` 150 giay.
- Da sua `marketing-ai` de `triage_fanpage` nhan:
  - `message_limit`
  - `comment_limit`
  mac dinh moi lo 25 dong, giup chay theo lo nho.
- Da deploy lai `marketing-ai`, `npm run build` pass.
- Da chay thanh cong 4 lo nho, moi lo 15 inbox + 15 comment. Tong dot nay: 60 inbox + 60 comment.
- Sau do chay lai:
  - `resolve_identities`: `updated_customers = 28`, `identities_upserted = 33`
  - `attribution_bridge`: `updated_customers = 28`, chua noi them don/lich hen moi.
- UI Lead sau cap nhat:
  - Lead Facebook hien thi top limit: 200
  - Da noi khach: 28
  - Chua noi: 100
  - Lead nong: 100
  - Don tu lead: 2
  - Doanh thu lead: 80.000d
- Viec tiep theo: them UI/automation de chay pipeline theo lo nho nhieu lan, va loc bot comment/bai viet cua chinh page de tranh tao lead "Khach Fanpage" ao.

## Cap nhat 10/06/2026 - Lam sach lead ao Fanpage

- Da sua `marketing-ai` de chan lead ao ngay tu triage:
  - bo qua noi dung cua chinh page,
  - bo qua comment/bai quang cao dai cua Hannah Spa,
  - bo qua tin hieu rong nhu `Nguoi theo doi`, `@neu bat`, dau cham don le.
- Da them mode `cleanup_fanpage_leads` de danh dau lead ao thanh `trang_thai='spam'` thay vi xoa du lieu.
- Da deploy lai `marketing-ai` len Supabase production.
- Da chay cleanup:
  - dot 1: 75 lead ao + 133 comment bi bo qua,
  - dot 2: 197 lead nhieu/rong + 141 comment bi bo qua,
  - dot 3: 198 lead ao khi tinh ca hotline page bi bat nham.
- Da sua UI Marketing de khong tai/khong dem `trang_thai='spam'`.
- UI Lead sau reload:
  - Lead do duoc: 108
  - Da noi khach: 28
  - Chua noi: 81
  - Lead nong: 49
  - Don tu lead: 2
  - Doanh thu lead: 80.000d
- `npm run build` pass sau cac thay doi.

## Cach anh Nam tiep tuc o phien moi

Neu doi sang phien chat moi, anh Nam chi can nhan:

```text
Doc docs/CODEX_SESSION_MEMORY.md va docs/AI_MARKETING_MEMORY.md roi tiep tuc dung cho HSMS.
```

Phien moi se co ngu canh can thiet ma khong phai ke lai tu dau.
## Cap nhat moi nhat 10/06/2026 - Marketing Fanpage/KH tiem nang

- Da doi ngon ngu UI Marketing tu `Lead` sang `KH tiem nang` / `Khach hang tiem nang`.
- Da them `marketing-ai` mode `resolve_conversation_phones` de quet sau SDT trong tung hoi thoai Fanpage.
- Da deploy `marketing-ai` len Supabase production sau thay doi.
- Da chay `Quet Facebook` tren UI local:
  - sau dot quet sau SDT, `Da noi khach` tang tu 28 len 33.
  - `Chua noi` giam tu 80 xuong 75.
  - Tong KH tiem nang do duoc van 108 do 1800 messages la so dong tin nhan, khong phai so khach.
- `npm run build` pass sau khi sua UI.
- Can tiep tuc: neu muon tim SDT cho 75 KH tiem nang con lai, can backfill sau hon cac conversation pages/cuoc hoi thoai cu hon tu Meta.

## Cap nhat 13/06/2026 - Quy hoach va dat nen module Marketing lon

- Da tao `docs/MARKETING_MODULE_MASTER_PLAN.md` lam tai lieu tong the cho Marketing:
  - Tong Quan Marketing
  - Hop Thu Khach Hang
  - Fanpage & Noi Dung
  - Khach Hang Tiem Nang
  - Cham Soc Sau Dich Vu
  - Nhac Lich Lieu Trinh
  - Chien Dich & Remarketing
  - Bao Cao Nhan Vien
  - Cau Hinh Kenh
- Da tao `src/apps/admin/marketing/MarketingModulePage.jsx` de Marketing khong con la mot trang nhieu tab nho.
- Da doi route `/admin/marketing` sang module moi; `/admin/marketing/hop-thu` render Hop Thu Khach Hang.
- Da mo menu desktop/mobile theo cau truc Marketing moi; le tan duoc phep vao cac route van hanh khach:
  - `/admin/marketing/hop-thu`
  - `/admin/marketing/khach-tiem-nang`
  - `/admin/marketing/cham-soc-sau-dich-vu`
  - `/admin/marketing/nhac-lich-lieu-trinh`
- Da don Hop Thu khi nam trong Marketing: bo hang tab lon `Khach da den / Khach can goi lai / Hieu qua nhan vien`, giu dung vai tro chat Fanpage.
- Da them client realtime trong `AdminChamSocKhachPage.jsx`:
  - lang nghe `marketing_messages` insert cua Facebook,
  - lang nghe `marketing_fanpage_customer_segments` update,
  - tu lam moi nhe hang doi uu tien, khong tai lai kho du lieu tho.
- Da them doc lich su chat tu view nhe `v_marketing_fanpage_message_thread_light`:
  - uu tien `conversation_ids`,
  - fallback bang `platform_user_id`,
  - gioi han toi da 120 dong de tranh quet kho 123k tin nhan.
- Da them migration `supabase/migrations/108_marketing_realtime_inbox.sql` bat realtime cho:
  - `marketing_messages`
  - `marketing_fanpage_customer_segments`
- Luu y production:
  - UI local da bao production chua co view `v_marketing_fanpage_message_thread_light`, nghia la migration 107/108 can duoc apply len Supabase.
  - Thu `supabase db push` bi dung vi CLI khong co `SUPABASE_ACCESS_TOKEN`.
  - Da thu chay qua Supabase SQL Editor nhung trinh dieu khien tab bi nhay, chua xac nhan migration 107/108 da apply thanh cong. Can kiem tra lai truoc khi ket luan.
- `npm run build` pass sau moi dot thay doi.

## Cap nhat 13/06/2026 - Supabase migration history da dong bo

- Anh Nam copy Supabase access token vao clipboard; CLI da ket noi production thanh cong. Khong ghi token vao file/chat.
- Da xac nhan remote migration history truoc do chi ghi den 089, trong khi 090-108 da duoc chay thu cong/qua SQL Editor nhieu phan.
- Da kiem tra object production:
  - `marketing_messages` co ton tai.
  - `marketing_fanpage_customer_segments` co ton tai.
  - `v_marketing_fanpage_message_thread_light` ban dau chua ton tai.
- Da chay rieng migration 107 va 108 qua `supabase db query --linked --file ...`, sau do xac nhan view `v_marketing_fanpage_message_thread_light` da ton tai.
- Da repair migration history:
  - 090-108 => applied.
- Repo co 2 migration cung version `025`; da xac nhan production da co thay doi cua file POS VAT:
  - cot `don_hang.vat` = true.
  - ham `pos_finalize_order` 7 tham so = true.
- Da doi ten migration de het trung:
  - `025_fix_gia_tri_the.sql` -> `0250_fix_gia_tri_the.sql`
  - `025_pos_vat_and_staff_sale_income.sql` -> `0251_pos_vat_and_staff_sale_income.sql`
- Da repair migration history:
  - 025 => reverted.
  - 0250, 0251 => applied.
- `supabase migration list` da khop sach tu 001 den 108.
- `supabase db push --dry-run` da bao: `Remote database is up to date`.
- Da tao migration 109 de toi uu lich su chat:
  - them cot `conversation_id`, `from_platform_user_id`, `recipient_id`,
  - tao trigger sync tu metadata,
  - tao index cot thread,
  - tao ham backfill theo lo nho `backfill_marketing_message_thread_columns`.
- Lan dau 109 co update toan bang gay crash tien trinh Supabase; transaction rollback, khong tao cot.
- Da sua 109 thanh ban nhe khong update toan bang trong migration.
- Khi thu apply lai 109, Supabase production dang bi `read-only transaction` sau su co, chua ap duoc.
- Can tiep tuc khi Supabase het read-only:
  1. Chay `supabase db push --yes` de ap 109.
  2. Chay backfill theo lo nho bang `select public.backfill_marketing_message_thread_columns(1000);` lap lai den khi tra 0.
  3. Reload `/admin/marketing/hop-thu` va kiem tra lich su chat het timeout.
- `npm run build` pass sau thay doi UI thong bao timeout.

## Cap nhat 13/06/2026 - Tach man hinh van hanh Marketing

- Da hoan thien tiep `AdminChamSocKhachPage.jsx` de co the dung lai theo tung man hinh con Marketing:
  - `fixedTab="fanpage"` cho Hop Thu Khach Hang.
  - `fixedTab="today"` cho Cham Soc Sau Dich Vu.
  - `fixedTab="pos"` cho Nhac Lich Lieu Trinh.
  - `fixedTab="report"` cho Bao Cao Nhan Vien.
- Da them `CareSummaryStrip` de moi man hinh co 4 chi so rieng, khong dung chung mot bo KPI gay kho hieu.
- Da noi route that trong `MarketingModulePage.jsx`:
  - `/admin/marketing/hop-thu`
  - `/admin/marketing/khach-tiem-nang`
  - `/admin/marketing/cham-soc-sau-dich-vu`
  - `/admin/marketing/nhac-lich-lieu-trinh`
  - `/admin/marketing/bao-cao-nhan-vien`
- `/admin/marketing/khach-tiem-nang` da noi vao du lieu Fanpage that voi filter mac dinh `all`, de quan ly nhin toan bo khach uu tien thay vi chi nhom can lam hom nay.
- Da kiem tra bang DevTools:
  - `/admin/marketing/cham-soc-sau-dich-vu` hien dung man hinh nhap/quan ly khach da den.
  - `/admin/marketing/nhac-lich-lieu-trinh` hien du lieu that: 284 khach can goi lai, 150 khach con buoi, 134 khach moi quay lai, co nut Goi/Zalo/Chep.
  - `/admin/marketing/khach-tiem-nang` va `/admin/marketing/bao-cao-nhan-vien` bi quay ve man hinh dang nhap do phien local het auth; chua bam dang nhap lai de tranh tu gui mat khau dang luu.
- Da sua hien thi tien o KPI nhac lich tu dang `3577tr` sang dang gon hon nhu `3,6 ty`.
- `npm run build` pass.
- Kiem tra Supabase production luc 13/06/2026 14:05 PST van con read-only:
  - loi `cannot execute GRANT ROLE in a read-only transaction`.
  - chua duoc chay migration 109/backfill cho lich su chat.

## Cap nhat 13/06/2026 - Them man hinh Fanpage, Chien dich, Cau hinh kenh

- Da nang cap `src/apps/admin/marketing/MarketingModulePage.jsx`:
  - them hook doc du lieu Marketing tu Supabase:
    - `v_marketing_fanpage_overview`
    - `marketing_page_posts`
    - `marketing_content_calendar`
    - `chien_dich_marketing`
    - `v_marketing_campaign_performance`
    - `v_marketing_reactivation_customers`
    - `v_marketing_source_quality`
    - `v_marketing_fanpage_segment_summary`
  - route `/admin/marketing/fanpage-noi-dung` thanh man hinh that:
    - KPI nguoi theo doi, bai da luu, tuong tac, trang thai webhook.
    - bang bai viet co tin hieu tot.
    - lich noi dung can lam.
    - goi y chu de 7 ngay toi.
  - route `/admin/marketing/chien-dich` thanh man hinh that:
    - KPI chien dich dang chay, chi phi, doanh thu noi duoc, khach nen goi lai.
    - bang hieu qua chien dich/ROI.
    - tep remarketing: con buoi, gia tri cao, vang tren 90 ngay.
    - danh sach khach cu uu tien moi quay lai.
  - route `/admin/marketing/cau-hinh-kenh` thanh man hinh that:
    - trang thai Facebook, webhook, tep khach, nguyen tac luu tru gon.
    - bang kenh Facebook/Zalo/Hotline/dien thoai.
    - bang nhom Fanpage dang HSMS quan ly.
- `npm run build` pass sau thay doi.
- Da thu mo DevTools nhung snapshot bi tro sang tab Vietnix cua anh Nam, nen khong thao tac tiep de tranh dung nham trang; can kiem tra UI lai khi browser dang dung tab HSMS/local.
