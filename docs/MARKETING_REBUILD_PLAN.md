# Kế Hoạch Đập Đi Xây Lại Module Marketing

Cập nhật: 18/06/2026 · Lý do: module hiện rối, nhiều mục trùng chức năng, lẫn vai trò, "nhìn không hiểu dùng thế nào".

> **12/07/2026 — BẢN 2.0 Ở CUỐI FILE (mục G).** B1→B6 của bản 1.0 đã làm xong nhưng anh Nam đánh giá:
> module vẫn "tệ nhất hệ thống, toàn con số vô nghĩa, NV không thèm dùng". Bản 2.0 đổi hướng:
> từ module-để-NHÌN sang máy-tự-LÀM (tự đăng bài, tự làm ảnh, AI trực fanpage, kéo NV vào luồng).

---

## A. AUDIT HIỆN TRẠNG — từng mục đang là gì

| Menu hiện tại | Thực chất render | Nguồn dữ liệu | Vấn đề |
|---|---|---|---|
| Tổng Quan | `Overview` | segment summary + nhét RealtimeInbox | Mang danh "báo cáo" nhưng trộn chat → lẫn vai trò |
| **Hộp Thư Khách Hàng** | `AdminChamSocKhachPage` tab `fanpage` | `v_cham_soc_fanpage_smart` (segments từ **123k tin cũ**) | KHÔNG phải hộp thư tin mới — load kho khách 2022; chậm, vô nghĩa cho việc hằng ngày |
| **Khách Hàng Tiềm Năng** | `AdminChamSocKhachPage` tab `fanpage` (filter=all) | y hệt Hộp Thư | **TRÙNG HỘP THƯ** — chỉ khác bộ lọc |
| Fanpage & Nội Dung | `FanpageContentPage` | overview/posts | Read-only, ít dữ liệu, chưa dùng được |
| Chăm Sóc Sau Dịch Vụ | `AdminChamSocKhachPage` tab `today` | `v_nhat_ky_khach_den_smart` | Thực ra thuộc module **Chăm Sóc Khách** (`/admin/cham-soc-khach`), không phải Marketing |
| Nhắc Lịch Liệu Trình | `AdminChamSocKhachPage` tab `pos` | `v_cham_soc_khach` (khách POS còn buổi) | Cũng thuộc Chăm Sóc Khách / CRM, không phải Marketing |
| Chiến Dịch & Remarketing | `CampaignsPage` | chiến dịch + reactivation | OK (cho chủ) nhưng CRUD nằm ở "bản đầy đủ" cũ |
| Báo Cáo Nhân Viên | `AdminChamSocKhachPage` tab `report` | nhật ký chăm sóc | Thuộc Chăm Sóc Khách |
| Cấu Hình Kênh | `ChannelSettingsPage` | trạng thái kênh + nút sync | OK (admin) |

**Kết luận:** 9 mục nhưng 5 mục là 4 tab của 1 file Chăm Sóc Khách bị mượn; có 1 cặp trùng hẳn (Hộp Thư = Tiềm Năng); Hộp Thư sai bản chất (kho cũ thay vì tin mới).

---

## B. NGUYÊN TẮC THIẾT KẾ LẠI

1. **Mỗi mục = 1 vai trò duy nhất, không trùng.**
2. **Tách bạch TIN MỚI (Hộp Thư) ≠ KHO CŨ (Remarketing).**
   - Hộp Thư = hội thoại **đang hoạt động** (tin webhook gần đây, cần trả lời). Nguồn: `marketing_messages` mới.
   - Remarketing = kho 123k tin cũ đã phân nhóm + khách POS. Nguồn: segments/CRM.
3. **Marketing không nuốt việc của Chăm Sóc Khách.** "Khách đến hôm nay / Nhắc lịch POS / Báo cáo NV chăm" trả về module **Chăm Sóc Khách** (`/admin/cham-soc-khach`) — Marketing chỉ liên kết tới, không nhân đôi.
4. **Tổng Quan = báo cáo thuần** cho chủ; việc hằng ngày của lễ tân nằm trong Hộp Thư.
5. **Mỗi màn hình có 1 dòng: "Trang này để [X] · Bạn làm: [Y]".**

---

## C. CẤU TRÚC MENU MỚI (gọn còn 5 mục, rõ vai trò)

```
Marketing
├── 1. Tổng Quan            → BÁO CÁO thuần cho chủ (số liệu kênh, không có chat)
├── 2. Hộp Thư              → CHAT realtime: tin MỚI cần trả lời (lễ tân) — đa kênh FB+Zalo sau
├── 3. Khách & Remarketing  → KHO khách cũ đã phân nhóm: mời quay lại (gộp "tiềm năng" cũ)
├── 4. Fanpage & Chiến Dịch → Nội dung + ROI + tệp remarketing (chủ/marketing)
└── 5. Cấu Hình Kênh        → Kết nối FB/Zalo + sync (admin)
```

Bỏ khỏi Marketing (đưa về Chăm Sóc Khách): "Chăm sóc sau dịch vụ", "Nhắc lịch liệu trình", "Báo cáo nhân viên" → 3 mục này vốn là tab của Chăm Sóc Khách.

---

## D. TỪNG TÍNH NĂNG — vai trò & công dụng tương lai

### 1. Tổng Quan (chủ)
- **Bây giờ:** số khách Fanpage, có SĐT, cần xử lý, có thể chốt lịch + funnel.
- **Tương lai:** tin mới hôm nay, tỷ lệ phản hồi, số khách chốt lịch từ chat, doanh thu gắn Fanpage/chiến dịch, nhân viên nào chăm tốt. **Bỏ panel chat** (chuyển sang Hộp Thư).

### 2. Hộp Thư (lễ tân) — VIẾT LẠI BẢN CHẤT
- **Bây giờ:** load segments 123k tin cũ → sai.
- **Tương lai:** chỉ hiển thị **hội thoại đang hoạt động** (có tin trong N ngày gần đây), ưu tiên **chưa trả lời**. 3 cột: danh sách hội thoại mới · khung chat + gửi tin (token đã có) · hồ sơ khách + gợi ý AI. Khách cũ inbox lại → tự nhận diện. Đa kênh FB+Zalo chung 1 hộp.
- **Nguồn mới cần:** view/query "hội thoại hoạt động" từ `marketing_messages` (last_message_at gần đây), KHÔNG phải toàn bộ segments.

### 3. Khách & Remarketing (gộp "Tiềm Năng" + kho cũ)
- **Bây giờ:** trùng Hộp Thư.
- **Tương lai:** kho 123k tin cũ đã phân loại 3 nhóm (rác / đã đến / thân thiết) + khách có SĐT chưa đến + từng hỏi dịch vụ X. Hành động: lọc tệp → gửi Zalo/broadcast → đo phản hồi. Đây là nơi khai thác Việc 3 (làm sạch → CRM).

### 4. Fanpage & Chiến Dịch (chủ/marketing)
- **Tương lai:** sức khoẻ Fanpage + Insight (sau khi có quyền), bài viết hiệu quả, lịch đăng, gợi ý nội dung AI; CRUD chiến dịch + ROI + tệp remarketing. Gộp Fanpage + Chiến Dịch (đang tách rời).

### 5. Cấu Hình Kênh (admin)
- **Tương lai:** trạng thái FB (Live/webhook/token), Zalo OA, sync thủ công, phân công nhân viên, giờ làm việc. Giữ FanpageActions ở đây.

---

## E. KẾ HOẠCH TRIỂN KHAI (từng bước, có kiểm soát)

- **Bước 1 — Gỡ trùng:** bỏ menu "Khách Tiềm Năng" trùng; gộp vào "Khách & Remarketing". Cập nhật MARKETING_ROUTES + routing.
- **Bước 2 — Hộp Thư đúng bản chất:** tạo nguồn "hội thoại đang hoạt động" (tin mới N ngày) → Hộp Thư đọc cái đó thay vì segments 123k. Ưu tiên chưa trả lời.
- **Bước 3 — Tổng Quan thành báo cáo thuần:** bỏ RealtimeInbox khỏi Tổng Quan (chuyển vào Hộp Thư), giữ số liệu + funnel.
- **Bước 4 — Trả 3 mục CSKH về Chăm Sóc Khách:** Marketing chỉ link tới, không nhân đôi.
- **Bước 5 — Gộp Fanpage + Chiến Dịch.**
- **Bước 6 — Việc 3:** làm sạch 123k → CRM, đổ vào "Khách & Remarketing".
- **Bước 7 — Module Zalo** đổ chung Hộp Thư.

Mỗi bước: build + (test) + push. Giữ "bản đầy đủ" `/admin/marketing/ban-cu` cho CRUD sâu cho tới khi port hết.

---

## F. CẦN ANH NAM CHỐT TRƯỚC KHI CODE
1. Đồng ý menu 5 mục mới + trả 3 mục CSKH về module Chăm Sóc Khách?
2. "Hộp Thư" chỉ hiện hội thoại N ngày gần đây — N = bao nhiêu (7 / 14 / 30 ngày)?
3. Bắt đầu từ Bước 1-2-3 (gỡ trùng + Hộp Thư đúng + Tổng Quan báo cáo) trước, đúng không?

---
---

# BẢN 2.0 — MARKETING TỰ VẬN HÀNH (12/07/2026)

## G. CHẨN ĐOÁN VÌ SAO BẢN 1.0 VẪN "TỆ"

Bản 1.0 sửa đúng phần CẤU TRÚC (menu gọn, Hộp Thư 30 ngày, AI gợi ý, gửi tin từ HSMS — đều đã chạy)
nhưng sai TRIẾT LÝ: module được xây để **NHÌN** (báo cáo, segment, con số) trong khi anh Nam cần nó **LÀM VIỆC THAY NGƯỜI**:

1. **NV không dùng Hộp Thư** — vì nó nằm ở `/admin/marketing/hop-thu`, còn lễ tân cả ngày ngồi ở POS.
   Chuông chỉ kêu khi đã mở sẵn trang → không ai biết khách nhắn.
2. **Con số vô nghĩa** — segment 123k tin cũ, funnel, source quality… không dẫn tới hành động nào trong ngày.
3. **Không có đầu ra tự động** — fanpage không tự đăng bài, không tự chăm, khách nhắn đêm không ai trả lời.
   Chưa có gì "tự chuyển hóa thành kênh kéo khách".

## H. BỐN TRỤ CỦA BẢN 2.0

### T1 · Máy đăng bài Fanpage tự động (ưu tiên đề xuất: LÀM ĐẦU TIÊN)
- **Đã có sẵn:** page token VĨNH VIỄN + quyền `pages_manage_posts` (cấp 17/06) · bảng `marketing_content_calendar` ·
  DeepSeek PRO cho content · bot Telegram có nút bấm duyệt.
- **Làm mới:**
  1. `marketing-meta-page-sync` thêm mode `publish_post` (POST `/{page-id}/feed`, kèm ảnh qua `/photos`).
  2. Worker "content-planner" (cron VPS, 1 lần/ngày): DeepSeek đọc dữ liệu thật (khuyến mãi đang chạy `khuyen_mai`,
     dịch vụ hot theo đơn POS 30 ngày, mùa/lễ) → soạn 3-5 bài/tuần vào `marketing_content_calendar` trạng thái `cho_duyet`.
  3. **Duyệt qua Telegram:** bot gửi bài nháp (text + ảnh) kèm nút ✅ Đăng / ✏️ Viết lại / ❌ Bỏ. KHÔNG đăng gì khi chưa duyệt.
  4. Cron "publisher" đăng bài `da_duyet` vào giờ vàng (11:30 / 19:30).
- **Ảnh:** giai đoạn 1 dùng **template + kho ảnh thật của spa** (render canvas server-side: ảnh nền spa + text KM + logo,
  đúng brand, 0đ). AI sinh ảnh để giai đoạn 2 nếu cần (tốn phí, chữ tiếng Việt hay lỗi).

### T2 · AI trực Fanpage/Zalo ngoài giờ (20:00 → 9:15)
- Trong giờ: AI chỉ GỢI Ý cho NV (như hiện tại). Ngoài giờ: khách nhắn → AI **tự trả lời** dựa `suggest_reply`
  + hồ sơ khách (`v_customer_pos_intelligence`) — chào, giữ khách, xin SĐT, hẹn sáng liên hệ; gắn tag `ai_truc_dem`
  để sáng NV xem lại. Câu khó/khiếu nại → AI im + đẩy alert Telegram.
- Tận dụng worker triage 2 phút đang chạy — thêm nhánh auto-send có điều kiện giờ.

### T3 · Kéo NV vào luồng — Hộp Thư xuất hiện ở nơi NV ngồi
- **Chuông trong POS:** badge đỏ "💬 N khách chờ trả lời" trên PosApp (query nhẹ `marketing_messages` chưa reply
  + realtime) → bấm mở Hộp Thư. Lễ tân không phải "nhớ" mở trang marketing.
- **Alert Telegram cho anh Nam:** hội thoại inbound quá 15 phút không ai trả lời → bot nhắn (thêm check vào
  `hsms_alert_telegram.py` 5 phút/lần có sẵn). Đây KHÔNG phải bridge chat (đã hoãn) — chỉ báo để đốc thúc.
- Đo được: thời gian phản hồi trung bình / ngày — 1 con số CÓ nghĩa thay cho funnel.

### T4 · Remarketing nói thẳng theo luật kênh + dọn số liệu
- **Facebook KHÔNG cho nhắn chủ động sau 24h** (Messenger policy) → mọi ý tưởng "nhắn lại khách cũ qua FB" phải đi đường:
  đăng bài đều (T1) + auto trả lời comment mời inbox + (sau này) quảng cáo Click-to-Messenger.
- **Kênh nhắn chủ động thật sự = Zalo** — ZNS/voucher win-back đã có nền; kho SĐT từ identity map FB → đổ sang Zalo.
- **Tổng Quan viết lại còn 5 con số hành động:** tin chưa trả lời · thời gian phản hồi TB · SĐT mới lấy được tuần này ·
  lịch hẹn chốt từ chat · bài đã đăng + reach tuần. Bỏ hết bảng segment/source-quality khỏi màn hình chính (vào trang phân tích phụ).

## I. THỨ TỰ ĐỀ XUẤT
T1 (fanpage sống lại, thấy ngay kết quả) → T3 (khách nhắn có người trả lời thật) → T2 (phủ nốt ban đêm) → T4 (dọn số liệu).
Mỗi trụ: build + test thật + push riêng. Không làm gộp.
