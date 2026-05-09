# Tổng Quan Doanh Nghiệp

> Xác minh lần cuối: 08/05/2026 | Phiên làm việc: Kiến trúc thống nhất + POS Foundation

## Doanh Nghiệp

| Thông Tin | Chi Tiết |
|---|---|
| Tên | Hannah Beauty & Spa |
| Địa Chỉ | 39 Nam Kỳ Khởi Nghĩa, P.Tân An, Ninh Kiều, Cần Thơ |
| Thành Lập | 15/04/2019 |
| Giờ Làm | 9:15 – 20:00 (ngưng nhận khách 19:30) |
| Email | hannahspa.nm@gmail.com |
| Domain | hannahspa.vn (ĐANG LIVE trên Vercel) |
| POS Hiện Tại | myspa.vn (cũ, đang chạy song song — sẽ thay thế bằng HSMS POS) |
| Ngân Hàng | MB Bank (chính) + TP Bank (quẹt thẻ, về 3-7 ngày) |
| Chủ | Cao Quốc Nam — đang ở Mỹ, quản lý remote qua /admin |

## Dữ Liệu Thực Tế (từ MySpa)

| Chỉ số | Giá trị | Ghi chú |
|---|---|---|
| Khách hàng | **5,966** | Cần import toàn bộ |
| Đơn hàng | **44,007** | Từ ngày thành lập đến nay |
| Thẻ liệu trình | **4,945** | Đang active trong MySpa |
| Dịch vụ | **181** | Đã seed trên Supabase (14 danh mục) |
| Nhân viên | **10** | Đã có trong `nhan_vien` |
| Doanh thu tháng 5/2026 | 52,360,000đ | 133 lượt thanh toán |
| DT thẻ chưa thực hiện | 101,031,643đ | Cần theo dõi trong HSMS |

## Khối Lượng Dữ Liệu Supabase

| Bảng | Số records (dự kiến) | Kích thước ~ |
|---|---|---|
| khach_hang | 5,966 | 1.2 MB |
| don_hang | 44,007 | 6.6 MB |
| don_hang_chi_tiet | ~88,000 | 10.5 MB |
| thanh_toan | ~66,000 | 5.3 MB |
| the_lieu_trinh | 4,945 | 0.7 MB |
| doanh_thu | ~100,000 | 10 MB |
| **Tổng** | **~380,000 records** | **~42 MB** |

> **Supabase Free (500 MB)**: dư ~458 MB — đủ cho ~280 năm dữ liệu.
> **Khuyến nghị**: Lên Pro ($25/tháng) khi go-live để có backup daily + không bị pause.

## Định Dạng Export MySpa

### Dịch vụ (`danh_sach_dich_vu_*.xlsx`)
| Cột MySpa | Cột HSMS | Ghi chú |
|---|---|---|
| Tên dịch vụ | `dich_vu.ten` | |
| Thời lượng Phút | `dich_vu.thoi_gian_phut` | |
| Danh mục | `dich_vu.danh_muc` | |
| Số tiền dịch vụ | `dich_vu.gia_co_ban` | |

### Lương Kinh Doanh (`Luong Kinh Doanh.xlsx`)
| Cột MySpa | Cột HSMS | Ghi chú |
|---|---|---|
| Tên nhân viên | `nhan_vien.ho_ten` | Map theo tên |
| Doanh số trước giảm | `bang_luong.doanh_so` | |
| Doanh số sau giảm | `bang_luong.doanh_so_sau_giam` | |
| commission (%) | `bang_luong.hoa_hong_dv` | |
| Tổng tiền tour NV | `bang_luong.tien_tour` | |

## Vận Hành Hàng Ngày

| Giờ | Hoạt Động |
|---|---|
| 9:15 | Spa mở cửa |
| 19:30 | Ngưng nhận khách |
| 19:30 – 20:30 | Lễ Tân nhập liệu tại POS (`/pos`) + nhập chi phí (`/SoThuChi`) |
| 20:00 | Đóng cửa chính thức |
| 21:00 | Email báo cáo tự động đến hannahspa.nm@gmail.com |

## URL Ứng Dụng

| URL | Ai | Mục Đích |
|---|---|---|
| hannahspa.vn/ | Công khai | Trang landing |
| hannahspa.vn/portal | Nhân viên | Cổng nội bộ |
| hannahspa.vn/pos | Lễ Tân / Admin | **POS Bán Hàng (MỚI)** |
| hannahspa.vn/SoThuChi | Lễ Tân / Admin | App nội bộ (thu chi thủ công) |
| hannahspa.vn/admin | Admin | Bảng điều khiển chủ |
| hannahspa.vn/checkin | KTV | Check-in điện thoại |
| hannahspa.vn/menu | Khách | Menu iPad |

## Tài Khoản Hệ Thống

| Vai Trò | Email | Mật Khẩu |
|---|---|---|
| Admin | quocnam2201@gmail.com | (riêng tư) |
| Lễ Tân | KhanhDuy@hannahspa.vn | HannahSpa2026 |
| Lễ Tân | NgocPhuong@hannahspa.vn | HannahSpa2026 |
| KTV | (8 người) | PIN 4 số tại /checkin |

## Tích Hợp Chính

- **MySpa** (myspa.vn): POS cũ, nguồn hoa hồng + thẻ liệu trình + KH. Đang chạy song song → sẽ thay thế.
- **Resend.com**: Email báo cáo (tạm dùng onboarding@resend.dev)
- **Vercel**: Tự động deploy từ GitHub nhánh main
- **Supabase**: PostgreSQL + Auth + Realtime + Storage (Singapore)
