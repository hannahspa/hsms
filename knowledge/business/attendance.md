# Quy Tắc Nghiệp Vụ — Chấm Công

> Xác minh lần cuối: 08/05/2026

## Luồng Đăng Nhập Check-in

1. Nhân viên chọn tên, nhập mã PIN 4 số
2. PIN được băm SHA-256 ở phía client (Web Crypto API)
3. So sánh với `nhan_vien.pin_hash`
4. 5 lần sai → khóa 5 phút (localStorage)

## Check-in/Check-out

- Check-in: INSERT `cham_cong` với `gio_vao`, `loai='di_lam'`, `he_so=0`
- Check-out: UPDATE `gio_ra`, tính `he_so` dựa trên thời gian

## Giờ Làm Việc

- Spa mở cửa: 9:15
- Ngưng nhận khách: 19:30
- Đóng cửa: 20:00

## he_so (Hệ Số Công)

- Ngày đầy đủ: `he_so = 1`
- Về sớm: `he_so < 1` (VD: 0.79)
- Ảnh hưởng lương: `(1 - he_so)` tính như ngày không trọn

## Loại OFF

| Loại | Mã | Ảnh Hưởng Lương |
|---|---|---|
| OFF Phép | off_phep | Có lương (trong giới hạn tháng) |
| OFF Vượt | off_ov | -1 ngày |
| OFF T7/CN (có lý do) | off_t7 | -2 ngày |
| OFF T7/CN (không lý do) | off_t7x | -2 ngày + phạt |

## Giới Hạn OFF Hàng Tháng

- Mặc định: 3 ngày/tháng
- Khánh Duy (Lễ Tân): 4 ngày/tháng (`gioi_han_off_thang=4`)
- Lễ Tân: tối đa 1 người OFF cùng ngày
- KTV: tối đa 2 người OFF cùng ngày

## Tăng Ca

- < 15 phút → KHÔNG tính
- ≥ 15 phút → `tang_ca_gio = ROUND(phut/60, 2)`
- Đơn giá: 25.000đ/giờ
- Trạng thái: `khong_co` / `cho_duyet` (cần admin duyệt)
- Admin duyệt qua TabXetDuyet → `duyet_tang_ca`

## Quỹ Ngày OFF (Ngày Lễ Tích Lũy)

- Làm việc vào ngày lễ → +1 ngày OFF có lương
- Lưu trong `quy_ngay_off` (mỗi nhân viên mỗi năm)
- Dùng để bù trừ ngày OV (tỉ lệ 1:1)
- Theo dõi: `so_ngay_tich` (tích lũy), `so_ngay_da_dung` (đã dùng), `so_dung_thang_nay` (tháng hiện tại)

## Nhân Viên Đặc Biệt: Phạm Thị Nhỏ

- `trang_thai = 'dac_biet'`
- KHÔNG check-in
- Lương chuyển khoản thẳng
- Vị trí: Tạp Vụ, lương 7.000.000đ

## Chỉnh Sửa Chấm Công

- Lễ Tân tạo yêu cầu chỉnh sửa (`yeu_cau_chinh_sua` với `loai_bang='cham_cong'`)
- Admin duyệt/từ chối trong TabXetDuyet
- Admin cũng có thể sửa trực tiếp qua `AdminSuaChamCong.jsx`
