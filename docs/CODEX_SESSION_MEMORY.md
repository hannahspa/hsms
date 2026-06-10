# HSMS - Codex Session Memory

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
- So lieu production bao phu tu 26/11/2022 den hien tai:
  - 23.604 tin Facebook.
  - 6.629 tin khach gui vao.
  - 16.968 tin page tra ra.
  - 1.395 hoi thoai khach inbound rieng biet.
  - 257 hoi thoai co SDT.
  - 1.194 hoi thoai co tin hieu quan tam/dich vu.
- Ban ghi cu nhat da cham 26/11/2022 12:51 UTC. Cursor lich su van con `has_more=true`, tiep tuc chay `sync_conversations_batch` voi cursor_key tren neu muon lay day du hon.

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
