# Chiến Lược Di Cư Dữ Liệu MySpa → HSMS

> Cập nhật: 08/05/2026 | Đây là tài liệu tham chiếu cho scripts import

## Định Dạng File Export MySpa

### 1. Dịch Vụ
**File mẫu:** `danh_sach_dich_vu_tat_ca_chi_nhanh_*.xlsx`
**Số dòng:** 182 (gồm header)

| Cột gốc | Kiểu | Ánh xạ HSMS |
|---|---|---|
| Tên dịch vụ | text | `dich_vu.ten` |
| Thời lượng Phút | integer | `dich_vu.thoi_gian_phut` |
| Danh mục | text | `dich_vu.danh_muc` |
| Số tiền dịch vụ | integer | `dich_vu.gia_co_ban` |

> **Trạng thái:** 181/182 đã seed vào Supabase. Menu iPad đang dùng.

### 2. Lương Kinh Doanh (Hoa Hồng KTV)
**File mẫu:** `Luong Kinh Doanh.xlsx`
**Số dòng:** 12 (gồm header)

| Cột gốc | Kiểu | Ánh xạ HSMS |
|---|---|---|
| Tên nhân viên | text | Map → `nhan_vien.ho_ten` → `nhan_vien.id` |
| Số điện thoại | text | |
| Email | text | |
| Chức vụ | text | |
| Doanh số trước giảm | integer | `bang_luong.doanh_so` |
| Doanh số sau giảm | integer | `bang_luong.doanh_so_sau_giam` |
| commission (%) theo doanh thu | numeric | |
| commission (%) theo ngày tìm kiếm | numeric | |
| commission (%) tổng đơn hàng | numeric | `bang_luong.hoa_hong_dv` |
| Tổng tiền tour NV | integer | `bang_luong.tien_tour` |
| Chi nhánh | text | |

### 3. Khách Hàng (sẽ tìm file mẫu)
**Dự kiến:** ~5,966 records
- Mã KH: `KH-00001` → `KH-05973`
- Họ tên, SĐT, ngày sinh, địa chỉ, nguồn

### 4. Đơn Hàng (sẽ tìm file mẫu)
**Dự kiến:** ~44,007 records
- Mã ĐH: `DH-00001` → `DH-44008`
- Ngày, KH, KTV, dịch vụ, số tiền, PTTT

### 5. Thẻ Liệu Trình (sẽ tìm file mẫu)
**Dự kiến:** ~4,945 records
- Mã thẻ: `THE-LT-0001` → `THE-LT-4998`
- KH sở hữu, tên DV, tổng buổi, đã dùng, giá trị, ngày mua, hạn

## Quy Trình Import (4 bước)

```
BƯỚC 1: XUẤT từ MySpa (nhân viên spa thực hiện)
  → File Excel/CSV cho từng module

BƯỚC 2: TRANSFORM bằng Python scripts
  → Chuẩn hóa SĐT, tên, ngày tháng
  → Map danh mục
  → Validate FK references

BƯỚC 3: IMPORT vào Supabase (service_role key)
  → Theo thứ tự: dich_vu → nhan_vien → khach_hang → the_lieu_trinh → don_hang → doanh_thu

BƯỚC 4: VERIFY
  → Đối chiếu số dòng, tổng tiền, trạng thái thẻ
```

## Thứ Tự Import (Quan Trọng)

```
1. dich_vu          (không phụ thuộc)     ✅ Đã seed 181 DV
2. nhan_vien        (không phụ thuộc)     ✅ Đã có 10 NV
3. khach_hang       (không phụ thuộc)     ❌ 0 records — cần import 5,966
4. the_lieu_trinh   (→ khach_hang)        ❌ 0 records — cần import 4,945
5. don_hang         (→ khach_hang)        ❌ 0 records — cần import 44,007
6. don_hang_chi_tiet(→ don_hang, dich_vu, nhan_vien, the_lieu_trinh)
7. thanh_toan       (→ don_hang)
8. doanh_thu        (→ don_hang, hoặc standalone)
```

## Xử Lý Dữ Liệu Lớn

- Import batch 500 records/lần — không timeout
- Scripts idempotent (có thể chạy lại)
- Giữ nguyên mã gốc MySpa trong cột `ma_*`
- Lưu `raw_data` JSONB để truy vết nếu cần
- Chạy trên staging DB trước production
