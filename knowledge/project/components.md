# Danh Mục Component Dùng Chung

> Xác minh lần cuối: 08/05/2026

## Component Bố Cục

### BottomNav (`src/components/layout/BottomNav.jsx`)
Thanh điều hướng dưới cùng cố định. Hai bố cục:
- **Admin**: 5 tab (Tổng Quan, Tài Khoản, Nhập Liệu, Báo Cáo, Cài Đặt)
- **Lễ Tân**: 2 tab (Đối Soát, Nhập Liệu)

Props: `activeTab`, `onTabChange`, `isAdmin`

### SplashScreen (`src/components/layout/SplashScreen.jsx`)
Màn hình splash động (2.6s). Hiển thị logo Hannah với hiệu ứng fade-in/out.

Props: callback `onFinish`

---

## Component Dùng Chung (tái sử dụng)

### DatePicker (`src/components/shared/DatePicker.jsx`)
**LUÔN dùng cái này thay vì `<input type="date">`**. Widget lịch tùy chỉnh, kiểu Misa.

Props: `selected` (chuỗi ngày ISO), `onChange` (chuỗi ngày), `minDate?`, `maxDate?`

### ConfirmDialog (`src/components/shared/ConfirmDialog.jsx`)
Modal xác nhận tái sử dụng.

Props: `open`, `title`, `message`, `onConfirm`, `onCancel`, `confirmText?`, `danger?`

### ErrorBoundary (`src/components/shared/ErrorBoundary.jsx`)
React error boundary dạng class. Bọc toàn bộ app trong `App.jsx`.

### FABMenu (`src/components/shared/FABMenu.jsx`)
Nút nổi với menu popup. Dùng trong Nhập Liệu để truy cập nhanh Thu/Chi/CK.

Props: mảng `items` (label, icon, onClick)

### AvatarUpload (`src/components/shared/AvatarUpload.jsx`)
Tải lên ảnh đại diện nhân viên có xem trước. Dùng Supabase storage (bucket `avatars`).

### ImageUpload (`src/components/shared/ImageUpload.jsx`)
Tải lên ảnh chứng từ. Dùng Supabase storage (bucket `chung-tu`).

### LazyImage (`src/components/shared/LazyImage.jsx`)
Tải ảnh lười biếng dùng IntersectionObserver.

---

## Component UI

### Toast (`src/components/ui/Toast.jsx`)
Thông báo ở giữa trên cùng. Tự động tắt sau 3s. Loại: success (xanh), error (đỏ).

Dùng qua `AppContext.showToast(loai, thongBao)`.

---

## Component Form (internal app)

### FormDoanhThu (`src/apps/internal/thu-chi/forms/FormDoanhThu.jsx`)
Form nhập doanh thu. 4 hình thức thanh toán, nhập số tiền, tải chứng từ.

### FormChiPhi (`src/apps/internal/thu-chi/forms/FormChiPhi.jsx`)
Form nhập chi phí. Chọn danh mục (cây 2 cấp), hình thức thanh toán, chọn ví.

### FormChuyenKhoan (`src/apps/internal/thu-chi/forms/FormChuyenKhoan.jsx`)
Form chuyển khoản nội bộ. Từ ví → Đến ví, số tiền.

---

## Component Admin

### TabBangLuong (`src/apps/admin/nhan-su/components/TabBangLuong.jsx`)
Bảng lương 981 dòng. Điều hướng tháng/năm, tab Kỳ 1/Kỳ 2, bottom-sheet chi tiết NV, phát lương hàng loạt, khóa/mở khóa mỗi kỳ.

### BangLuongImportPOS (`src/apps/admin/nhan-su/components/BangLuongImportPOS.jsx`)
Import Excel (.xlsx) cho dữ liệu hoa hồng POS. Ánh xạ tên NV, xem trước trước khi áp dụng.

### TabXetDuyet (`src/apps/admin/nhan-su/components/TabXetDuyet.jsx`)
Bảng duyệt: đơn OFF, tăng ca, yêu cầu sửa/xóa. Duyệt/từ chối hàng loạt.

### TabHoSo (`src/apps/admin/nhan-su/components/TabHoSo.jsx`)
CRUD hồ sơ nhân viên. Sửa lương, trạng thái ký quỹ, giới hạn OFF, ảnh.

### AdminSuaChamCong (`src/apps/admin/nhan-su/components/AdminSuaChamCong.jsx`)
Admin chỉnh sửa trực tiếp bản ghi chấm công.

### AdminTaoOff (`src/apps/admin/nhan-su/components/AdminTaoOff.jsx`)
Đơn OFF do admin tạo (`nguon='admin'`).

---

## Component Checkin

### CheckinLogin (`src/apps/checkin/CheckinLogin.jsx`)
Lưới chọn nhân viên + bàn phím PIN 4 số. Băm SHA-256 phía client. Khóa sau 5 lần sai.

### CheckinChamCong (`src/apps/checkin/CheckinChamCong.jsx`)
Màn hình check-in/out với hiển thị trạng thái, thời gian, popup kết quả.

### CheckinLuong (`src/apps/checkin/CheckinLuong.jsx`)
Màn hình xem lương trên điện thoại 407 dòng. Phân tích từng tháng, tóm tắt chấm công, tổng Kỳ 1/Kỳ 2.
