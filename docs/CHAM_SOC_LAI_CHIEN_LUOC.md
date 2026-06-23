# CHIẾN LƯỢC CHĂM SÓC LẠI (WIN-BACK) QUA ZALO OA
Cập nhật: 23/06/2026 — phân tích dữ liệu thời gian thực trên VPS

## 1. Phân tích dữ liệu (mỏ vàng OA)

- Tổng khách có SĐT: **6.070** (99% có Zalo → OA khai thác được)
- Khách ĐÃ TỪNG mua thẻ LT: **1.385** (đã tin tưởng) — 2025: 433, 2026: 250
- Thẻ **còn buổi + còn hạn (active)**: 610 thẻ / **359 khách**
- Thẻ **còn buổi + HẾT HẠN**: 910 thẻ / **564 khách** (504 gia hạn được + 406 triệt lông)
- Thẻ **hết buổi** (đã dùng hết): 3.271 thẻ / **966 khách**
- Nhóm dịch vụ thẻ còn buổi: Triệt lông 512 · Massage/CVG 313 · Gội 194 · Chăm sóc da 148 · Body 30 · Tắm trắng 14

Phân tầng khách active theo độ vắng: GẦN (nhịp ≤12n) 112 · Ấm 67 · Nguội 40 · Rất nguội 14 · Ngủ đông 69.

## 2. Phân khúc khách (SEGMENT) + chiến lược + tin

| # | Segment | Điều kiện | Quy mô | Mục tiêu | Template ZNS |
|---|---|---|---|---|---|
| S1 | **Nhịp 10 ngày** | active, vắng ≤13, chưa quay lại | 112 | Nhắc đặt buổi tiếp (giữ nhịp) | `moi_quay_lai` ✅ |
| S2 | **Ấm** | active, vắng 13–30 | 67 | Kéo về trước khi nguội | `moi_quay_lai` ✅ |
| S3 | **Nguội** | active, vắng 31–90 | 40 | Mời + ưu đãi nhẹ | `uu_dai_voucher` ⬜ |
| S4 | **Rất nguội / Ngủ đông** | active, vắng >90 | 83 | Voucher kích cầu mạnh | `uu_dai_voucher` ⬜ |
| S5 | **Hết hạn còn buổi** | het_han, còn buổi, KHÔNG triệt | 504 thẻ | Mời đến **GIA HẠN** thẻ | `gia_han_the` ⬜ |
| S6 | **Triệt lông hết hạn** | het_han, còn buổi, triệt | 406 thẻ | Mời mua gói mới / sale chéo (KHÔNG gia hạn) | `uu_dai_voucher` ⬜ |
| S7 | **Hết buổi (đã tin tưởng)** | hết buổi | 966 khách | Mời mua thẻ mới / sale chéo theo DV đã dùng | `uu_dai_voucher` ⬜ |

> Quy tắc anh Nam: thẻ HẾT HẠN còn buổi vẫn mời đến **gia hạn** (trừ triệt lông). Khách hết buổi đã tin tưởng → mời mua mới / sale chéo. Nguội & lạnh → Voucher/chương trình Hot riêng.

## 3. Template ZNS cần tạo trên ZBS (gộp gọn còn 3)

1. ✅ `moi_quay_lai` (đã có) — "Thẻ còn {remain} buổi, mời ghé dùng tiếp" — cho S1, S2.
2. ⬜ `gia_han_the` — "Thẻ {service} còn {remain} buổi đã tới hạn, mời ghé gia hạn ưu đãi" — cho S5.
3. ⬜ `uu_dai_voucher` — "Tặng {customer} voucher {voucher}, ghé Hannah dùng {service}/dịch vụ mới" — cho S3, S4, S6, S7.

Params đề xuất `uu_dai_voucher`: customer_name, service, voucher (mã/giá trị), han_dung (HSD voucher).
Params `gia_han_the`: customer_name, service, remain_time, uu_dai (ưu đãi gia hạn).

## 4. Hành trình tự động (mỗi sáng 9h)

- **S1/S2 (nhịp + ấm):** tự gửi `moi_quay_lai` — đang chạy.
- **S5 (gia hạn):** tự gửi `gia_han_the` — 40/ngày, ưu tiên hết hạn gần nhất.
- **S3/S4/S6/S7 (nguội–lạnh–hết buổi):** tự gửi `uu_dai_voucher` kèm voucher — 40/ngày, ưu tiên ấm hơn trước.
- Khách dùng buổi mới / mua mới → tự rời danh sách (bộ đếm reset).

## 5. Lộ trình triển khai

- [x] Phân tích dữ liệu + phân khúc (tài liệu này)
- [ ] Anh Nam tạo 2 template ZBS: `gia_han_the`, `uu_dai_voucher` (+ quyết voucher/ưu đãi cụ thể)
- [ ] Nâng cấp module: thêm segment S5/S7 + phân tầng + chọn template theo segment
- [ ] Tab "Phân Tích" realtime trong module Chăm Sóc Lại
- [ ] Theo dõi đã xem / quan tâm OA (webhook)
