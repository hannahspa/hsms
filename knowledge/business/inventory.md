# Quy Tắc Nghiệp Vụ — Kho Hàng

> Xác minh lần cuối: 08/05/2026

## Loại Sản Phẩm (loai)

| Loại | Nhãn | Mô Tả |
|---|---|---|
| tieu_hao | Tiêu Hao | Vật tư tiêu hao (dùng trong liệu trình) |
| ban_khach | Bán Khách | Sản phẩm bán lẻ |
| vat_tu | Vật Tư | Vật tư/nguyên liệu |

## Loại Giao Dịch (loai trong kho_giao_dich)

| Loại | Ảnh Hưởng Kho | Mô Tả |
|---|---|---|
| nhap_kho | + | Nhập kho (mua vào) |
| xuat_su_dung | - | Xuất dùng trong liệu trình |
| xuat_ban | - | Bán cho khách |
| chiet_ra | - | Chiết từ sản phẩm cha |
| chiet_vao | + | Kết quả chiết |
| dieu_chinh | ± | Điều chỉnh thủ công |
| tra_nha_cc | - | Trả nhà cung cấp |

## Quy Tắc Chính

### Số Lượng Luôn Dương
`so_luong` trong `kho_giao_dich` luôn > 0 (ràng buộc CHECK). Dấu được xác định bởi `loai` (nhập = +, xuất = -, v.v.).

### Cách Tính Điều Chỉnh
```
so_luong = ABS(ton_kho_moi - ton_kho_cu)
loai = mới > cũ ? 'nhap_kho' : 'xuat_su_dung'
```
Thực tế dùng loại `dieu_chinh`. `so_luong = Math.abs(giá_trị_mới - giá_trị_cũ)`.

### Tự Động Tạo Chi Phí Khi Nhập Kho
Khi nhập giao dịch `nhap_kho` → tự động tạo bản ghi `chi_phi` tương ứng.

### Xóa Liên Kết
Khi xóa giao dịch `nhap_kho` → phải xóa cả bản ghi `chi_phi` liên quan.

### Chiết Sản Phẩm
- `co_the_chiet = true` cho phép chiết
- Sản phẩm cha → con qua `san_pham_chiet_id` (tự tham chiếu)
- `he_so_chiet`: tỉ lệ chiết
- `chiet_ra` và `chiet_vao` ghép cặp qua `lien_quan_id`

## Cảnh Báo Hết Hàng

- `canh_bao_ton`: ngưỡng cảnh báo sắp hết
- Hiển thị dạng badge trong Admin Dashboard
- Kiểm tra trên tab tổng quan Dashboard

## Đơn Vị (don_vi)

cái, chai, lọ, hộp, gói, thùng, túi, cuộn, lít, ml, kg, g, đôi, bộ, tờ, miếng
