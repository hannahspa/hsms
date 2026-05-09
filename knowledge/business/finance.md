# Quy Tắc Nghiệp Vụ — Tài Chính

> Xác minh lần cuối: 08/05/2026 | Kiến trúc thống nhất v1.0

## 5 Phương Thức Thanh Toán (Định Nghĩa Duy Nhất)

Đây là enum dùng CHO TOÀN BỘ HỆ THỐNG:

| # | Mã Enum | Tên | Vào Dòng Tiền? | Mô Tả |
|---|---|---|---|---|
| 1 | `tien_mat` | Tiền Mặt | ✅ Có | Tiền mặt VNĐ tại quầy |
| 2 | `chuyen_khoan` | Chuyển Khoản | ✅ Có | Chuyển khoản ngân hàng (không phụ thuộc ngân hàng cụ thể) |
| 3 | `quet_the` | Quẹt Thẻ | ✅ Có (về sau 3-7 ngày) | Thanh toán qua máy POS (không phụ thuộc ngân hàng cụ thể) |
| 4 | `the_tra_truoc` | Thẻ Trả Trước | ❌ Không | KH nạp tiền trước, đang dùng số dư |
| 5 | `the_lieu_trinh` | Thẻ Liệu Trình | ❌ Không | Gói dịch vụ mua trước, đang dùng buổi |

**Nguyên tắc:**
- 5 phương thức này là BẤT BIẾN — mọi bảng dùng chung CHECK constraint
- "MB Bank", "TP Bank" chỉ là tên hiển thị của ví, không nhúng vào enum
- `the_tra_truoc` và `the_lieu_trinh`: tiền đã thu từ trước → không sinh dòng tiền mới

## Công Thức Dòng Tiền Cốt Lõi

```
Thực Thu     = SUM doanh_thu WHERE hinh_thuc IN (tien_mat, chuyen_khoan, quet_the)
Lợi Nhuận   = Thực Thu - Tổng Chi
Số dư ví     = so_du_dau + thu vào - chi ra + CK vào - CK ra

the_tra_truoc và the_lieu_trinh bị LOẠI TRỪ khỏi dòng tiền
→ Chỉ dùng để báo cáo doanh thu chưa thực hiện (P&L)
```

## Ví (vi) — Nơi Chứa Tiền

Ví được ánh xạ với phương thức thanh toán qua cột `loai`:

| # | Tên Ví | loai | Mục Đích |
|---|---|---|---|
| 1 | Tiền Mặt | `tien_mat` | Tiền mặt tại quầy |
| 2 | (Tên ngân hàng) | `chuyen_khoan` | Tài khoản ngân hàng |
| 3 | (Tên ngân hàng) | `quet_the` | Tiền quẹt thẻ về |

**Có thể đổi tên ví hoặc thêm ví mới** mà không ảnh hưởng code — view `so_du_vi_thuc_te` ghép nối bằng `v.loai`, không phải `v.ten`.

## View: so_du_vi_thuc_te (đã sửa — dùng v.loai)

```sql
so_du_hien_tai = so_du_dau
  + SUM(doanh_thu WHERE hinh_thuc = v.loai AND hinh_thuc IN cash_methods)
  - SUM(chi_phi WHERE hinh_thuc_thanh_toan = v.loai)
  + SUM(chuyen_khoan_noi_bo WHERE den_vi_id = v.id)
  - SUM(chuyen_khoan_noi_bo WHERE tu_vi_id = v.id)
```

Ghép nối bằng `v.loai` (không phải `v.ten`) → đổi tên ví không làm hỏng view.

## POS → Doanh Thu (1:1 với Thanh Toán)

```
Mỗi khoản thanh toán trong đơn hàng → 1 bản ghi doanh_thu
  • 200K tien_mat     → doanh_thu: 200K, hinh_thuc = 'tien_mat'
  • 300K chuyen_khoan → doanh_thu: 300K, hinh_thuc = 'chuyen_khoan'

Đảm bảo số dư từng ví luôn chính xác.
```

## Chiều Chuyển Khoản Nội Bộ

1. **Tiền Mặt → Ngân Hàng**: Nộp tiền mặt cuối ngày
2. **Ngân Hàng (quẹt thẻ) → Ngân Hàng (chính)**: Tiền quẹt thẻ về
3. **Ngân Hàng → Tiền Mặt**: Rút tiền chi tiêu

## Hình Thức Thanh Toán Chi Phí

Chi phí dùng 3 phương thức (không dùng thẻ trả trước/liệu trình):

| Hình Thức | Ví |
|---|---|
| `tien_mat` | Ví có loai = `tien_mat` |
| `chuyen_khoan` | Ví có loai = `chuyen_khoan` |
| `quet_the` | Ví có loai = `quet_the` |

## Quy Tắc Kiểm Tra Số Dư

**Luôn kiểm tra số dư ví trước khi cho phép chi hoặc chuyển khoản.**

## View: lich_su_giao_dich_tong_hop

UNION ALL của doanh_thu (loai='thu'), chi_phi (loai='chi'), chuyen_khoan_noi_bo (loai='chuyen_khoan').

## Quản Lý so_du_dau

- Cập nhật sau mỗi lần đối soát ngày
- Làm cơ sở tính số dư cho ngày tiếp theo
- Phải khớp với số dư ngân hàng/tiền mặt thực tế
