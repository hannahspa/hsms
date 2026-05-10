# Tổng Quan Doanh Nghiệp

> Cập nhật: 09/05/2026 | Sau phiên import dữ liệu MySpa

## Doanh Nghiệp

| Thông Tin | Chi Tiết |
|---|---|
| Tên | Hannah Beauty & Spa |
| Địa Chỉ | 39 Nam Kỳ Khởi Nghĩa, P.Tân An, Ninh Kiều, Cần Thơ |
| Thành Lập | 15/04/2019 |
| Chủ | Cao Quốc Nam — quản lý từ Mỹ qua /admin |
| Domain | hannahspa.vn (LIVE trên Vercel) |
| POS cũ | myspa.vn (đang chạy song song — sẽ thay thế bằng HSMS POS) |

## Dữ Liệu Hiện Tại (09/05/2026)

| Bảng | Số lượng | Nguồn |
|---|---|---|
| `dich_vu` | **199** | MySpa — đã import % hoa hồng KTV |
| `khach_hang` | **5,705** | MySpa — 261 KH bỏ qua do không SĐT |
| `the_lieu_trinh` | **4,682** | MySpa — 2 thẻ không tìm thấy KH |
| `don_hang` | **43,864** | MySpa — lịch sử từ 2019 |
| `don_hang_chi_tiet` | **68,956** | MySpa — trung bình 1.57 DV/đơn |
| `nhan_vien` | **10** | Nhập thủ công |
| `doanh_thu` | **411** | Đang chạy thật — Lễ Tân nhập |
| `chi_phi` | **411** | Đang chạy thật — Lễ Tân nhập |

## Dữ Liệu Tương Lai

Khi MySpa phát sinh dữ liệu mới, chỉ cần chạy lại script import với file Excel mới nhất. Cơ chế upsert (ON CONFLICT DO UPDATE) đảm bảo:
- Dữ liệu cũ không bị trùng
- Dữ liệu mới được thêm vào
- Dữ liệu thay đổi được cập nhật

## URL Ứng Dụng

| URL | Người Dùng | Mục Đích |
|---|---|---|
| hannahspa.vn/ | Công khai | Landing page |
| hannahspa.vn/pos | Lễ Tân / Admin | POS Bán Hàng |
| hannahspa.vn/SoThuChi | Lễ Tân / Admin | Thu chi + báo cáo |
| hannahspa.vn/admin | Admin | Quản trị hệ thống |
| hannahspa.vn/checkin | KTV | Check-in bằng PIN |
| hannahspa.vn/menu | Khách | Menu iPad |
