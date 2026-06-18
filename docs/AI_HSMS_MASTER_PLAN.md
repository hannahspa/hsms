# HSMS — Quy Hoạch AI Tích Hợp Sâu (Trợ Lý AI toàn hệ thống)

Cập nhật: 17/06/2026 · Provider: **DeepSeek API** (dùng cho tất cả trước; Gemini bổ sung sau khi cần đọc ảnh)

---

## 1. Đổi tư duy cốt lõi

AI **không phải** một tính năng của Marketing. Nó là **một TẦNG TRỢ LÝ chạy xuyên suốt mọi module HSMS**, đứng trên toàn bộ big data của spa. Xây **một lần, dùng chung** cho Fanpage, Zalo, Lễ tân, POS, Thẻ liệu trình, Báo cáo.

> Mục tiêu: biến HSMS từ "phần mềm ghi chép" thành "phần mềm biết tư vấn" — mỗi nhân viên có một trợ thủ hiểu khách hơn chính họ.

## 2. Big data đang/sẽ có (nhiên liệu cho AI)

| Nguồn | Đang có | Dùng để AI hiểu |
|---|---|---|
| `khach_hang` (~5.700+) | ✅ | Khách là ai, hạng, chi tiêu, lần cuối đến |
| `don_hang` + chi tiết (~43k đơn) | ✅ | Lịch sử dịch vụ/sản phẩm đã dùng |
| `the_lieu_trinh` (~4.700 thẻ) | ✅ | Thẻ còn buổi, sắp hết, đã hết |
| `marketing_messages` (~123k chat Fanpage) | ✅ | Khách từng hỏi gì, quan tâm dịch vụ nào |
| `nhat_ky_khach_den` | ✅ | Phản hồi, cơ hội bán thêm ghi tay |
| `lich_hen` | ✅ | Lịch sử đặt hẹn |
| Chat Zalo OA + ghi chú tư vấn | ⏳ sau | Toàn bộ hội thoại 2 chiều |
| Đánh giá KTV (sau dịch vụ) | ⏳ sau | KTV nào tốt, khách nào không hài lòng |

## 3. Nguyên tắc kỹ thuật — để AI thông minh thật, không "tồi máy móc", và an toàn

1. **Context Layer + Tools (function calling):** AI không tự quét database. Mình xây sẵn các "công cụ" (tra hồ sơ khách, lấy lịch sử dịch vụ, đọc số liệu Fanpage). AI chỉ xin đúng dữ liệu qua các công cụ đó → vừa có ngữ cảnh thật, vừa nằm trong giới hạn mình cho phép.
2. **Grounded — mọi nhận định bám dữ liệu thật:** AI luôn được nạp dữ liệu thật trước khi tư vấn; không bịa.
3. **DeepSeek là bộ não chính** (text/reasoning, có ngân sách). Một provider cho tất cả lúc đầu để gọn. Gemini chỉ thêm khi cần đọc ảnh (phân tích bài post, gợi ý visual).
4. **Tối thiểu dữ liệu nhạy cảm gửi đi:** chỉ gửi cái cần (tên gọi, dịch vụ, số buổi). Hạn chế gửi SĐT/số tiền ra ngoài khi không cần.
5. **Human-in-the-loop:** với hành động đụng khách/tiền (gửi tin, đặt hẹn, ưu đãi), AI **đề xuất** → người **duyệt**. Tin tự động chỉ dùng mẫu cố định + AI điền lời.
6. **Không để key AI ở frontend** — chỉ trong Edge Function / VPS.

## 4. AI làm gì trong từng module (bản đồ tích hợp)

| Module | AI làm | Tầng |
|---|---|---|
| **Hộp Thư (FB/Zalo)** | Nhận diện khách cũ/mới · tóm tắt hội thoại · gợi ý câu trả lời · phân loại nhu cầu | 2 |
| **CRM khách hàng** | Tóm tắt hồ sơ 360 · "next-best-action" · cảnh báo khách rời bỏ | 2 |
| **Lễ tân / Đặt hẹn** | Khách gọi/inbox đặt lịch → hiện ngay kịch bản: khách từng quan tâm gì → nên tư vấn dịch vụ gì | 3 |
| **POS bán hàng** | Gợi ý upsell tại quầy theo lịch sử (còn thẻ, hay dùng gì) | 4 |
| **Thẻ liệu trình** | Nhắc gia hạn thông minh, đúng lúc, đúng lời (ví dụ "Chị Thu còn 2 buổi") | 4 |
| **Báo cáo / điều hành** | Phân tích xu hướng doanh thu, cảnh báo (KTV bị phàn nàn, nhóm khách rời bỏ), gợi ý KM tháng | 5 |
| **Fanpage & nội dung** | Đọc số liệu tiếp cận → gợi ý nên đăng gì, nội dung/concept hình | 5 (cần Insights API) |

## 5. Kiến trúc 1 tầng dùng chung

```
  Các Module HSMS (Marketing · CRM · Lễ tân · POS · Thẻ · Báo cáo · Zalo)
            │  (đều gọi cùng 1 cổng)
       ┌────▼─────────────┐
       │  AI Gateway      │  Edge Function "hsms-ai"
       │  (DeepSeek)      │
       └────┬─────────────┘
            │  gọi công cụ (tools)
       ┌────▼─────────────┐
       │  Context Layer   │  hàm/view đọc DB: hồ sơ khách 360, lịch sử DV,
       │                  │  thẻ còn buổi, chat, số liệu Fanpage
       └────┬─────────────┘
            │
        Database HSMS (VPS)
```

Xây **AI Gateway + Context Layer một lần** → mọi module cắm vào. Đây là cách chống "phình": không nhét AI rời rạc vào từng chỗ.

## 6. Lộ trình (theo tầng — không làm nhảy cóc)

- **GĐ 0 — Gộp provider:** đổi toàn bộ AI hiện có (marketing-ai) sang **DeepSeek**. *(việc nhỏ, làm ngay khi anh chốt)*
- **GĐ 1 — Nền:** Context Layer + tool tra khách/lịch sử (hồ sơ 360 cho mọi khách). Đây là nền bắt buộc.
- **GĐ 2 — Trợ lý Hộp Thư:** khách cũ/mới + gợi ý tư vấn có ngữ cảnh thật (Fanpage trước).
- **GĐ 3 — Trợ lý Lễ tân/Đặt hẹn:** khách gọi → kịch bản tư vấn theo lịch sử.
- **GĐ 4 — Nhắc thẻ / upsell thông minh:** nối POS + thẻ liệu trình (ví dụ Chị Thu).
- **GĐ 5 — Phân tích điều hành + nội dung Fanpage.**
- **GĐ 6 — Zalo OA** kế thừa toàn bộ tầng trợ lý đã có.

## 7. Kỷ luật phạm vi (chống phình)

- Mỗi giai đoạn: làm gọn → `npm run build` → test → push → mới sang giai đoạn sau.
- Không mở giai đoạn mới khi giai đoạn trước chưa "đóng".
- Trạng thái từng giai đoạn ghi vào memory `project_marketing_module_state` / file này.

## 8. Hiện trạng (17/06/2026)

- Module Facebook: nền webhook + worker + Hộp Thư đã chạy; UI đã hợp nhất (nút sync/phân loại). GĐ0 xong (AI → DeepSeek). Còn: ẩn nút kỹ thuật + anh đặt key VPS → "đóng".
- **AI provider trong code: DeepSeek** (`marketing-ai/index.ts` callAI → `/chat/completions`, model mặc định `deepseek-v4-pro`).
- Cần anh Nam: đặt `DEEPSEEK_API_KEY` (+ tùy chọn `DEEPSEEK_MODEL`) trên Edge Functions VPS rồi restart; **rotate key mới** (key cũ đã lộ trong chat); (Zalo) kiểm tra lại tài khoản `developers.zalo.me` + OA.
