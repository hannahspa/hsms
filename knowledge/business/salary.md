# Quy Tắc Nghiệp Vụ — Lương

> Xác minh lần cuối: 08/05/2026 | Nguồn: `src/lib/luong.js`

## Hằng Số Tính Lương

| Hằng Số | Giá Trị | Mô Tả |
|---|---|---|
| DON_GIA_TANG_CA | 25.000đ | Đơn giá tăng ca mỗi giờ |
| KY_QUY_MOIS | 500.000đ | Ký quỹ mỗi tháng |
| KY_QUY_TONG | 12 tháng | Tổng thời gian ký quỹ |
| KY_QUY_THUONG | 500.000đ | Thưởng hoàn tất ký quỹ |
| PHAT_T7X_SAT | 300.000đ | Phạt nghỉ T7 không lý do |
| PHAT_T7X_SUN | 500.000đ | Phạt nghỉ CN không lý do |

## Hai Kỳ Lương

### Kỳ 1 — Lương Cứng (trả trước ngày 05)
```
luongCoBan = ROUND((luong_cung / soNgayThangFull) × ngayCong)
tienTangCa = tongTangCa × 25.000
truKyQuy   = 500.000 nếu ky_quy_trang_thai == 'dang_dong' còn không thì 0

tongLuongCung = luongCoBan + tienTangCa - tienPhat - truKyQuy - truUngLuong
```
Trạng thái lưu trong `bang_luong.trang_thai_lc` → có thể khóa từ ngày 05.

### Kỳ 2 — Lương Kinh Doanh (trả trước ngày 15)
```
tongKinhDoanh = hoaHongDV + tienTour + thuongDatDoanhSo
```
Trạng thái lưu trong `bang_luong.trang_thai_lkd` → có thể khóa từ ngày 15 tháng sau.

### Tổng Lĩnh
```
tongLinh = tongLuongCung + tongKinhDoanh (tối thiểu 0)
```

## Quy Tắc Tính Ngày Công (PASS 1-5 trong tinhLuong)

### PASS 1 — Thu Thập Bản Ghi OFF
Gộp OFF từ cả `cham_cong` (với `loai != 'di_lam'`) và `dang_ky_off` (với `trang_thai = 'duoc_duyet'`), loại bỏ trùng theo ngày.

### PASS 2 — Phân Loại
Tách thành: off_phep, off_ov, off_t7, off_t7x.

### PASS 3 — Tính Ngày Không Lương
1. `gioi_han_off_thang` ngày off_phep đầu tiên → CÓ LƯƠNG (mặc định 3, Khánh Duy = 4)
2. off_phep còn lại → OV (1 ngày không lương)
3. OV rõ ràng → 1 ngày không lương
4. T7/CN → 2 ngày không lương
5. Trừ ngày dùng quỹ lễ (`so_dung_thang_nay`)
6. Ngày không trọn: `(1 - he_so)` cho ngày về sớm

### PASS 4 — Tăng Ca & Phạt
- `tongTangCa = SUM(tang_ca_gio)` trên các ngày `di_lam`
- OT < 15 phút → KHÔNG tính
- OT ≥ 15 phút → `tang_ca_gio = ROUND(phut/60, 2)`
- Phạt T7X: 300k T7 / 500k CN (nghỉ cuối tuần không lý do)

### PASS 5 — Tính Toán Cuối Cùng
- Đơn giá ngày = `luong_cung / soNgayThangFull` (TẤT CẢ ngày trong tháng)
- `ngayCong = soNgayThang - ngayKhongLuong`
- Làm ngày lễ → +1 ngày OFF có lương tích lũy

## Cơ Chế todayRef

Khi có `todayRef` (tháng hiện tại), MỌI tính toán bị giới hạn đến ngày hôm nay. Cho phép xem trước lương thời gian thực trong tháng.

## Tự Động Tăng Ký Quỹ

Khi đánh dấu Kỳ 1 là `da_phat_luong`:
- NẾU `ky_quy_so_thang < 12`: tăng thêm 1
- NẾU `ky_quy_so_thang >= 12`: đặt `ky_quy_trang_thai = 'hoan_tat'`

## Công Thức Hoa Hồng Lễ Tân

```
Bậc 1: MAX(0, 150.000.000 - DS_KD - DS_NP - DT_MP) × 1%
Bậc 2: MAX(0, tổng - 150.000.000) × 1,5%
Kết quả = Bậc 1 + Bậc 2 (cho mỗi Lễ Tân)
```

## Ngày Lễ Quốc Gia (hardcode 2026-2027)

- Tết Dương Lịch (01/01)
- Tết Âm Lịch (3 ngày, âm lịch)
- Giải Phóng (30/04)
- Quốc Tế Lao Động (01/05)
- Quốc Khánh (02/09)
