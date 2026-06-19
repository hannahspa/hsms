# Mẫu ZNS Hannah Spa — soạn sẵn để đăng ký với Zalo

> Nơi tạo: OA Manager → Khác → Zalo Notification Service → Tạo mẫu mới.
> Tham số trong Zalo dùng dạng `<tên_tham_số>` (chèn bằng nút "Thêm tham số" trong trình soạn).
> Sau khi Zalo duyệt từng mẫu → lấy **template_id** đưa cho dev nối vào HSMS.

---

## MẪU 1 — Nhắc lịch hẹn
- **Loại ZNS:** Chăm sóc khách hàng (Customer Care) / Nhắc nhở.
- **Tên mẫu:** Hannah Spa - Nhắc lịch hẹn
- **Nội dung:**

```
Hannah Beauty & Spa kính chào <ten_khach>.
Spa xin nhắc lịch hẹn: <dich_vu>
Thời gian: <gio> - <ngay>
Địa chỉ: 39 Nam Kỳ Khởi Nghĩa, P.Tân An, Ninh Kiều, Cần Thơ.
Quý khách vui lòng đến đúng giờ để được phục vụ tốt nhất. Cảm ơn Quý khách!
```

- **Tham số:** `ten_khach` (vd: Chị Lan) · `dich_vu` (vd: Triệt lông nách) · `gio` (vd: 14:00) · `ngay` (vd: 20/06/2026)
- **Nút (tùy chọn):** "Gọi spa" → số 0379080909

---

## MẪU 2 — Chăm sóc sau dịch vụ
- **Loại ZNS:** Chăm sóc khách hàng (Customer Care).
- **Tên mẫu:** Hannah Spa - Cham soc sau dich vu
- **Nội dung:**

```
Hannah Beauty & Spa cảm ơn <ten_khach> đã tin tưởng sử dụng dịch vụ <dich_vu>.
Spa mong được lắng nghe cảm nhận của Quý khách sau khi trải nghiệm.
Để liệu trình đạt hiệu quả tốt nhất, Quý khách nên duy trì đúng lịch hẹn các buổi tiếp theo.
Mọi nhu cầu tư vấn, Quý khách nhắn tin ngay tại đây nhé. Trân trọng!
```

- **Tham số:** `ten_khach` · `dich_vu`
- **Nút (tùy chọn):** "Nhắn tin tư vấn" → mở chat OA

---

## MẪU 3 — Mời quay lại / Ưu đãi
- **Loại ZNS:** Chăm sóc khách hàng (Customer Care). *(ZNS khuyến mãi thuần có điều kiện ngặt — dùng loại Chăm sóc để mời quay lại an toàn hơn.)*
- **Tên mẫu:** Hannah Spa - Moi quay lai
- **Nội dung:**

```
Hannah Beauty & Spa thân gửi <ten_khach>.
Đã lâu Spa chưa được đón tiếp Quý khách!
Hiện Spa có ưu đãi dành riêng cho khách thân thiết: <uu_dai>
Mời Quý khách ghé trải nghiệm tại 39 Nam Kỳ Khởi Nghĩa, Ninh Kiều, Cần Thơ.
Nhắn tin để Spa giữ lịch cho mình nhé. Hẹn gặp lại Quý khách!
```

- **Tham số:** `ten_khach` · `uu_dai` (vd: Giảm 20% gói chăm sóc da)
- **Nút (tùy chọn):** "Đặt lịch ngay" → mở chat OA

---

---

# NHÓM ZNS GIAO DỊCH (Transaction) — ưu tiên duyệt, phí rẻ, gửi mọi khách có SĐT

## MẪU 4 — Xác nhận đặt lịch (gửi NGAY khi khách đặt hẹn)
- **Loại ZNS:** Giao dịch → Đặt chỗ / Lịch hẹn.
- **Tên mẫu:** Hannah Spa - Xac nhan dat lich
- **Nội dung:**

```
Hannah Beauty & Spa xác nhận đặt lịch thành công!
Khách hàng: <ten_khach>
Dịch vụ: <dich_vu>
Thời gian: <gio> - <ngay>
Mã đặt lịch: <ma_dat_lich>
Địa chỉ: 39 Nam Kỳ Khởi Nghĩa, P.Tân An, Ninh Kiều, Cần Thơ.
Spa sẽ nhắc lại trước giờ hẹn. Rất hân hạnh được đón tiếp Quý khách!
```

- **Tham số:** `ten_khach` · `dich_vu` · `gio` · `ngay` · `ma_dat_lich` (vd: LH-20260620-01)
- **Nút:** "Nhắn tin đổi lịch" → mở chat OA

---

## MẪU 5 — Hóa đơn sau dịch vụ (gửi NGAY khi thanh toán xong)
- **Loại ZNS:** Giao dịch → Thanh toán / Hóa đơn.
- **Tên mẫu:** Hannah Spa - Hoa don dich vu
- **Nội dung:**

```
Hannah Beauty & Spa cảm ơn <ten_khach> đã sử dụng dịch vụ!
HÓA ĐƠN: <ma_don>
Dịch vụ: <dich_vu>
Tổng tiền: <tong_tien>
Đã thanh toán: <da_thanh_toan>
Còn lại: <con_lai>
Ngày: <ngay>
Hẹn gặp lại Quý khách tại Hannah Spa - 39 Nam Kỳ Khởi Nghĩa, Cần Thơ!
```

- **Tham số:** `ten_khach` · `ma_don` (vd: DH-20260620-005) · `dich_vu` · `tong_tien` (vd: 350.000đ) · `da_thanh_toan` · `con_lai` (vd: 0đ) · `ngay`
- **Nút:** "Nhắn tin / Phản hồi" → mở chat OA

---

## MẪU 6 — Cập nhật thẻ liệu trình (gửi NGAY khi khách dùng 1 buổi)
- **Loại ZNS:** Giao dịch → Cập nhật dịch vụ.
- **Tên mẫu:** Hannah Spa - Cap nhat the lieu trinh
- **Nội dung:**

```
Hannah Beauty & Spa thông báo cập nhật thẻ liệu trình của <ten_khach>:
Thẻ: <ten_the>
Vừa sử dụng: <dich_vu> (1 buổi)
Số buổi còn lại: <so_buoi_con>/<so_buoi_tong>
Ngày sử dụng: <ngay>
Spa mong được đồng hành cùng Quý khách trọn liệu trình để đạt kết quả tốt nhất. Hẹn gặp lại!
```

- **Tham số:** `ten_khach` · `ten_the` (vd: Triệt lông nách 10 buổi) · `dich_vu` · `so_buoi_con` (vd: 7) · `so_buoi_tong` (vd: 10) · `ngay`
- **Nút:** "Đặt buổi tiếp theo" → mở chat OA

---

## Lưu ý khi đăng ký
1. Mỗi mẫu Zalo duyệt riêng (1-2 ngày làm việc). Nội dung KHÔNG được sai chính tả, KHÔNG dùng từ cấm.
2. ZNS gửi theo **số điện thoại** khách (không cần khách quan tâm OA) — đây là điểm mạnh để chăm sóc chủ động ngoài 24h.
3. Mỗi ZNS gửi tốn phí theo bảng giá Zalo (vài trăm đồng/tin) — chỉ gửi đúng người đúng lúc.
4. ZNS Giao dịch (mẫu 4,5,6) Zalo ưu tiên duyệt nhanh + phí rẻ nhất + gửi được mọi khách. ZNS Chăm sóc (1,2,3) phí cao hơn, có giới hạn tần suất.
5. Sau khi có **template_id** của từng mẫu → đưa dev nhập vào `marketing_ai_config`:
   - `zns_nhac_lich` = mẫu 1 (nhắc lịch)
   - `zns_cham_soc` = mẫu 2 (chăm sóc sau DV)
   - `zns_moi_quay_lai` = mẫu 3 (mời quay lại)
   - `zns_xac_nhan_lich` = mẫu 4 (xác nhận đặt lịch)
   - `zns_hoa_don` = mẫu 5 (hóa đơn)
   - `zns_the_lieu_trinh` = mẫu 6 (cập nhật thẻ)
6. Dev sẽ nối: đặt lịch (LichHenPage) → tự gửi mẫu 4; thanh toán POS → tự gửi mẫu 5; dùng thẻ (checkout buổi) → tự gửi mẫu 6.
