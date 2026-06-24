# HSMS — ROADMAP KHAI THÁC KHÁCH HÀNG & PHÁT TRIỂN HỆ THỐNG
Cập nhật: 24/06/2026 | Tầm nhìn dài hạn (anh Nam) — khai thác "mỏ vàng" 3 năm + hoàn thiện HSMS khép kín

## Bối cảnh
Hannah Spa hoạt động 3 năm (11/2023 → 11/2024 → 11/2025 → nay). Có ~6.070 khách (99% dùng Zalo), 1.385 đã từng mua thẻ liệu trình. Dùng Zalo OA (đã đầu tư gói Tăng Trưởng) để khai thác lại — rẻ và chính xác hơn quảng cáo.

---

## GIAI ĐOẠN 1 — CHĂM SÓC LẠI (NÓNG) ✅ ĐÃ XONG & ĐANG CHẠY
Khách CÒN thẻ, vắng ≤90 ngày. Tự động khép kín: 21:00 chốt → 9:00 gửi ZNS mời quay lại.
- Nhịp 10 ngày (đúng ngày, gom theo khách) + tồn đọng 40/ngày (lùi dần, mỗi khách 1 lần).
- Đã gửi thật 46/47 (24/06). Module: Marketing → "Chăm Sóc Lại".

## GIAI ĐOẠN 2 — WIN-BACK KHÁCH LẠNH (module RIÊNG) ⬅️ ĐANG LÊN KẾ HOẠCH
**Định nghĩa (anh Nam chốt):** Tập = khách **MUA thẻ LT trong 3 năm** (ngay_mua ≥ 2023-01-01). LẠNH = trong tập đó, **lần cuối ĐẾN SPA** (= MAX ngày đơn hàng bất kỳ, KHÔNG phải lần dùng thẻ) **>90 ngày** = **462 khách**.
**Thứ tự ưu tiên gửi:** 2026 (104) → 2025 (224) → 2024 (90) → 2023 (44). **50 khách/ngày** (~10 ngày).
> ⚠️ BÀI HỌC: (1) "lần cuối ĐẾN SPA" = MAX(don_hang.ngay) — KHÔNG dùng "lần dùng thẻ" (data dùng thẻ 2024 thiếu → nghịch lý). (2) Ranh giới: NÓNG ≤90 ngày (tin thường, module Chăm Sóc Lại), LẠNH >90 ngày (voucher). (3) Khách mua thẻ 2019 nhưng tuần rồi mới đến → KHÔNG lạnh. Khách mua thẻ 3 năm = 779, ấm (≤90) thuộc nóng, lạnh (>90) = 462.

**Phân 3 nhóm sở thích (gửi voucher đúng gu):**
| Nhóm | Gồm | Voucher giảm |
|---|---|---|
| 1. Chăm Sóc Da | Da Mặt + Công Nghệ Cao/Laser + Giảm Béo + Tắm Trắng + Peel | 50% |
| 2. Thư Giãn | Gội Đầu + Massage Body (tất cả gói) | 40% (Gội 99k KHÔNG áp) |
| 3. Triệt Lông | Tất cả triệt lông | 70% (gói 1 năm) |

Phân bố lạnh theo nhóm: Thư Giãn 255 · Triệt 116 · Da 77 (1 khách có thể nhiều nhóm → gán nhóm thẻ gần nhất khi gửi).

**Cơ chế voucher (đã chốt cùng anh Nam):**
- Cấu hình % theo nhóm NGAY TRONG trang Khuyến Mãi (tận dụng bảng khuyen_mai: loai_km, nhom_ap_dung).
- **Mã RIÊNG từng khách** (unique, 1 lần) → gửi qua ZNS `uu_dai_voucher` → khách đến, Lễ tân nhập mã ở POS → tự giảm % trên GIÁ GỐC.
- Nguyên tắc: giảm trên giá gốc; KHÔNG áp 2 KM (DV đã có giá KM thì mã không giảm thêm); đo được ai đến nhờ mã nào.
- Khách còn buổi+hết hạn (trừ triệt) → mời GIA HẠN. Khách hết buổi → mời mua mới/sale chéo.

## GIAI ĐOẠN 3 — KHÁCH DÙNG LẺ (chưa mua gói) — MỜI QUAY LẠI
**Phân tích (24/06):** 3.079 khách lẻ (đến 2023-2026, CHƯA mua thẻ, có SĐT); 3.009 đã >30 ngày chưa lại; **437 khách đến ≥3 lần = TARGET VÀNG** (đã tin tưởng, quay lại đều). Sở thích: Thư Giãn (gội/massage) 2.519 áp đảo · Khác 1.025 · Chăm Sóc Da 331 · Triệt 35.
**Chiến lược (anh Nam chốt):** CHỦ YẾU **mời khách quay lại dùng dịch vụ** (KHÔNG ép mua gói). Tin nhẹ nhàng mời quay lại trải nghiệm dịch vụ họ thích (gội/massage), có thể kèm quà/ưu đãi nhỏ chào đón. Ưu tiên 437 khách trung thành trước, rồi mở rộng. 50 khách/ngày.
**Cần:** template ZNS "mời khách quay lại" RIÊNG cho khách lẻ (KHÔNG có mã thẻ — họ chưa có thẻ; khác template moi_quay_lai/uu_dai_voucher). Module tương tự Chăm Sóc Lại: view khách lẻ + hàng đợi + cron 21h/9h.

## GIAI ĐOẠN 4 — MINI APP ZALO
Mini App thương hiệu Hannah (gói OA đã có nền). Khách xem thẻ/lịch sử, đặt lịch, nhận voucher.

## GIAI ĐOẠN 5 — VÒNG QUAY MAY MẮN + tính năng Mini App
Gamification giữ chân: vòng quay trúng voucher/buổi miễn phí, tích điểm, ưu đãi sinh nhật...

## GIAI ĐOẠN 6 — TỐI ƯU HOÁ TOÀN HỆ THỐNG
Rà soát & hoàn thiện từng module → HSMS khép kín hoàn toàn (POS, tài chính, nhân sự, marketing, CSKH liên thông).

---

## Nguyên tắc xuyên suốt
- Làm DỨT ĐIỂM từng phần, ổn định rồi mới sang phần khác.
- Độ chính xác 100%: đúng khách, đúng thẻ, đúng ngày — luôn verify + test trước khi bật tự động.
- Tự động hoá tối đa, hạn chế thao tác tay (dễ sai sót).
