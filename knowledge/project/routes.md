# Đường Dẫn Ứng Dụng

> Xác minh lần cuối: 08/05/2026 | Nguồn: `src/App.jsx`

Định tuyến dùng `window.location.pathname` — KHÔNG dùng react-router `<Routes>`.

## Route Công Khai (không cần auth)

| Path | Component | Mô Tả |
|---|---|---|
| `/` | LandingPage | Trang landing công khai (12 sections) |
| `/portal` | HomePage | Cổng nhân viên (thẻ module) |
| `/menu` | CustomerMenuApp | Menu iPad (181 DV, ngang 1024×768) |
| `/shop` | LandingPage (tạm) | Shop tương lai |
| `/checkin` | CheckinApp | Check-in nhân viên (dùng PIN) |

## POS — `/pos` (auth: Lễ Tân + Admin)

| Path | Component | Mô Tả |
|---|---|---|
| `/pos` | PosApp | **POS Bán Hàng** — tạo đơn, checkout, lịch sử |

## Internal App — `/SoThuChi` (auth: mọi vai trò)

| Path | Component | Mô Tả |
|---|---|---|
| `/SoThuChi` | InternalApp → TongQuanPage | Tổng quan (ví, thống kê) |
| `/SoThuChi/tai-khoan` | InternalApp → TaiKhoanPage | Số dư ví + lịch sử giao dịch |
| `/SoThuChi/doi-soat` | InternalApp → DoiSoatPage | Đối soát ngày |
| `/SoThuChi/nhap-lieu` | InternalApp → NhapLieuPage | Form Doanh Thu/Chi Phí/Chuyển Khoản |
| `/SoThuChi/bao-cao` | InternalApp → BaoCaoPage | Báo cáo (7 loại) |
| `/SoThuChi/cai-dat` | InternalApp → CaiDatPage | Cài đặt (8 module con) |

## Admin App — `/admin` (auth: chỉ admin)

| Path | Component | Mô Tả |
|---|---|---|
| `/admin` | AdminApp | Trung tâm khởi chạy (11 thẻ) |
| `/admin/dashboard` | AdminDashboardPage | KPI, tài chính, nhân sự, cảnh báo |
| `/admin/nhan-su` | AdminNhanSuPage | Quản lý nhân sự (5 sub-view) |
| `/admin/kho-hang` | AdminKhoHangPage | CRUD kho hàng (5 tab) |
| `/admin/khuyen-mai` | AdminKhuyenMaiPage | CRUD khuyến mãi + ROI |
| `/admin/marketing` | AdminMarketingPage | Chiến dịch + ROI theo kênh |
| `/admin/crm` | AdminCRMPage | Khách hàng, thẻ liệu trình, tái khám |
| `/admin/trang-chu` | AdminHomepagePage | CMS landing page |
