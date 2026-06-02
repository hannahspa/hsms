# Enum & Hằng Số Database

> Xác minh lần cuối: 08/05/2026 | Kiến trúc thống nhất v1.0

## Phương Thức Thanh Toán (DÙNG CHUNG TOÀN HỆ THỐNG)

| # | Giá Trị | Nhãn | Vào Dòng Tiền? |
|---|---|---|---|
| 1 | `tien_mat` | Tiền Mặt | ✅ Có |
| 2 | `chuyen_khoan` | Chuyển Khoản | ✅ Có |
| 3 | `quet_the` | Quẹt Thẻ | ✅ Có (về sau 3-7 ngày) |
| 4 | `the_tra_truoc` | Thẻ Trả Trước | ❌ Không |

**Domain PostgreSQL:** `hinh_thuc_thanh_toan_t` CHECK IN (4 giá trị trên)
**Áp dụng cho:** `doanh_thu.hinh_thuc`, `chi_phi.hinh_thuc_thanh_toan`, `thanh_toan.hinh_thuc`
**Lưu ý:** `the_lieu_trinh` là `loai_item` của POS, không phải phương thức thanh toán.

## Vai Trò Người Dùng (vai_tro)

| Giá Trị | Nhãn | Mô Tả |
|---|---|---|
| admin | Admin | Toàn quyền hệ thống, Cao Quốc Nam |
| le_tan | Lễ Tân | Nhập liệu, chấm công, POS |
| ktv | KTV | Kỹ thuật viên, chỉ check-in |
| tap_vu | Tạp Vụ | Dọn dẹp, trạng thái đặc biệt |

## Loại Ví (loai_vi — PostgreSQL enum)

| Giá Trị | Ví Mặc Định | thu_tu |
|---|---|---|
| tien_mat | Tiền Mặt | 1 |
| chuyen_khoan | (Tên ngân hàng) | 2 |
| quet_the | (Tên ngân hàng) | 3 |

> View `so_du_vi_thuc_te` ghép nối bằng `v.loai` (không phải `v.ten`) → đổi tên ví không ảnh hưởng.

## Loại Item Đơn Hàng (POS)

| Giá Trị | Nhãn |
|---|---|
| `dich_vu` | Dịch Vụ |
| `san_pham` | Sản Phẩm |
| `the_lieu_trinh` | Thẻ Liệu Trình |

## Trạng Thái Đơn Hàng (POS)

| Giá Trị | Nhãn |
|---|---|
| `draft` | Đang soạn |
| `da_thanh_toan` | Đã thanh toán |
| `no_mot_phan` | Nợ một phần |
| `huy` | Đã hủy |

## Loại Công Nợ

| Giá Trị | Nhãn |
|---|---|
| `phat_sinh` | Phát sinh nợ mới |
| `thanh_toan` | Thanh toán nợ |
| `xoa_no` | Xóa nợ |

## Nguồn Doanh Thu

| Giá Trị | Nhãn |
|---|---|
| `pos` | Từ POS (tự động) |
| `manual` | Nhập tay (FormDoanhThu) |
| `migration` | Import từ MySpa |

## Hạng Khách Hàng

| Giá Trị | Nhãn | Ngưỡng |
|---|---|---|
| `bronze` | Đồng | 0 - 5M |
| `silver` | Bạc | 5M - 15M |
| `gold` | Vàng | > 15M |

## Loại OFF (cham_cong)

| Giá Trị | Nhãn | Ảnh Hưởng Lương |
|---|---|---|
| di_lam | Đi Làm | Đủ lương × he_so |
| off_phep | OFF Phép | Có lương (trong giới hạn) |
| off_ov | OFF Vượt | -1 ngày |
| off_t7 | OFF T7/CN | -2 ngày |
| off_t7x | OFF T7/CN (không lý do) | -2 ngày + phạt |

## Loại Sản Phẩm (kho_san_pham)

| Giá Trị | Nhãn |
|---|---|
| `tieu_hao` | Tiêu Hao |
| `ban_khach` | Bán Khách |
| `vat_tu` | Vật Tư |

## Loại Giao Dịch Kho (kho_giao_dich)

| Giá Trị | Nhãn | Dấu |
|---|---|---|
| `nhap_kho` | Nhập Kho | + |
| `xuat_su_dung` | Xuất Sử Dụng | - |
| `xuat_ban` | Xuất Bán | - |
| `chiet_ra` | Chiết Ra | - |
| `chiet_vao` | Chiết Vào | + |
| `dieu_chinh` | Điều Chỉnh | ± |
| `tra_nha_cc` | Trả Nhà CC | - |

## Trạng Thái Thẻ Liệu Trình

| Giá Trị | Mô Tả |
|---|---|
| `active` | Đang hoạt động |
| `het_buoi` | Hết buổi |
| `het_han` | Hết hạn |
| `da_huy` | Đã hủy |

## Trạng Thái Lịch Hẹn

| Giá Trị | Nhãn |
|---|---|
| `cho_xac_nhan` | Chờ Xác Nhận |
| `da_xac_nhan` | Đã Xác Nhận |
| `da_den` | Đã Đến |
| `khong_den` | Không Đến |
| `da_huy` | Đã Hủy |
| `online` | Online |

## Kênh Marketing

Facebook, Zalo, TikTok, Google, In Ấn, Khác

## Nguồn Khách Hàng

Facebook, Zalo, Bạn bè giới thiệu, Walk-in, TikTok, Google, Khác
