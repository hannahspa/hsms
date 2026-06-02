# Chốt 4 Module Lõi HSMS - 02/06/2026

Mục tiêu: đưa POS, Sổ Thu Chi, Thẻ Liệu Trình và Nhân Sự/Lương về trạng thái ổn định để nhân sự dùng hằng ngày, đồng thời ghi rõ các điểm còn cần rà tiếp.

## 1. POS

Trạng thái: tạm chốt code vận hành, tiếp tục rà dữ liệu thực tế.

Đã xác nhận:
- Production `/pos` tải được danh sách dịch vụ sau khi dữ liệu load xong.
- Production `/pos/danh-sach` tải được danh sách đơn hàng.
- Không ghi nhận lỗi console trên các route POS đã kiểm tra.
- Nút mở lại đơn nháp đã sửa để không ghi đè route `/pos?resume=<id>`.
- VAT được truyền vào RPC `pos_finalize_order`.
- Tìm kiếm danh sách đơn hàng đã chuyển sang query database theo mã đơn, tên khách, SĐT và ghi chú.

Điểm cần rà tiếp:
- Một số đơn trạng thái `draft` / chờ thanh toán đang hiển thị `Thu` lớn hơn `Tổng`. Cần audit dữ liệu `don_hang`, `thanh_toan`, `trang_thai`, `thuc_thu`, `tong_tien_hang` trước khi sửa logic.
- Cần test thao tác thật có rollback hoặc đơn test riêng: tạo đơn, thêm dịch vụ, chọn KTV, thanh toán, in hóa đơn.

## 2. Sổ Thu Chi

Trạng thái: tạm chốt code hiển thị và danh sách giao dịch.

Đã xác nhận:
- Production `/SoThuChi/danh-sach` tải được dữ liệu.
- Không ghi nhận lỗi console.
- Bản ghi POS trong Sổ Thu Chi đang hiển thị nguồn POS, đúng hướng liên kết POS -> tài chính.

Điểm cần rà tiếp:
- Sau khi audit POS có đơn `draft` nhưng có thanh toán, cần đối chiếu lại dòng `doanh_thu` tương ứng để tránh Sổ Thu Chi nhận doanh thu từ đơn chưa chốt.

## 3. Thẻ Liệu Trình

Trạng thái: tạm chốt module quản trị, còn danh sách cần rà trước go-live dữ liệu.

Đã xác nhận:
- Production `/admin/the-lieu-trinh` tải được danh sách thẻ.
- Không ghi nhận lỗi console.
- DatePicker trong modal rà thẻ đã thay cho input date native.
- Tại thời điểm kiểm tra: 525 thẻ, 417 active, 20 thẻ cần rà trước go-live.

Điểm cần rà tiếp:
- 20 thẻ cần rà phải được xử lý bằng flow review, không sửa tay trực tiếp nếu chưa có lý do.
- Cần audit tiếp nhóm thẻ lệch số buổi thực tế so với import MySpa.

## 4. Nhân Sự / Lương

Trạng thái: tạm chốt code tính lương, cần kiểm chứng số thực cuối kỳ.

Đã xác nhận:
- Production `/admin/nhan-su/bang-luong` tải được bảng lương.
- Không ghi nhận lỗi console.
- Quỹ ngày lễ chỉ bù vào ngày OV, không bù nhầm sang phạt T7/CN hoặc ngày công lẻ.
- Phiếu lương PDF đã loại khỏi định hướng; ưu tiên lương realtime trên app.

Điểm cần rà tiếp:
- Đầu tháng có nhân viên hiển thị lương âm do mới có ít ngày công nhưng đã trừ ký quỹ/phạt. Cần quyết định UI nên hiển thị "tạm tính đến hôm nay" hay "dự kiến cuối tháng" để tránh nhân sự hiểu sai.

## 5. Database

Đã áp dụng production:
- `public.thanh_toan.hinh_thuc` chỉ còn 4 phương thức:
  - `tien_mat`
  - `chuyen_khoan`
  - `quet_the`
  - `the_tra_truoc`
- `the_lieu_trinh` không còn là phương thức thanh toán; chỉ là loại dòng hàng / sử dụng buổi.
- Kiểm tra sau khi áp dụng: `invalid_rows = 0`.

Migration nguồn:
- `supabase/migrations/063_lock_thanh_toan_four_methods.sql`

## 6. Bảo Mật

Đã làm:
- Xóa hard-code Supabase service key khỏi các script Python đang được Git theo dõi.
- Script chuyển sang đọc `SUPABASE_KEY` từ biến môi trường.
- Xóa file cache Python `.pyc` khỏi Git.
- Bổ sung `.gitignore` để chặn `__pycache__/` và `*.pyc`.

Cần làm bên Supabase Dashboard:
- Rotate service role key vì key cũ đã từng nằm trong lịch sử Git.
- Sau khi rotate, cập nhật `.env.import` / biến môi trường local đang dùng cho script import.

## 7. Kết Luận

Code 4 module lõi đã đủ điều kiện tiếp tục test thực tế trên production. Chưa nên tuyên bố "khóa tuyệt đối" cho POS cho đến khi xử lý xong audit các đơn `draft` / chờ thanh toán nhưng đã có dòng thu.
