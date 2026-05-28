# Thu Nhập Nhân Viên — Khái Niệm Chuẩn HSMS

> Cập nhật: 28/05/2026 — Chuẩn hóa từ migration 048

---

## Định Nghĩa Chuẩn

| Khái Niệm HSMS | Định Nghĩa | Tương Đương MySpa |
|---|---|---|
| **Tiền Tour** | Thu nhập KTV khi **thực hiện** dịch vụ/thẻ liệu trình | "Commission nhân viên" (dịch vụ) |
| **Tiền Hoa Hồng** | Thu nhập KTV khi **bán** sản phẩm / thẻ liệu trình mới | "Commission nhân viên" (SP/thẻ) |

> MySpa gọi chung là "commission" — HSMS phân biệt rõ 2 loại.

---

## Mapping Theo loai_item (don_hang_chi_tiet)

| loai_item | Loại Thu Nhập | Cột DB | nhan_vien_thu_nhap.loai |
|---|---|---|---|
| `dich_vu` | **Tiền Tour** | `tien_tour` | `'tour'` |
| `the_lieu_trinh` | **Tiền Tour** | `tien_tour` | `'tour'` |
| `san_pham` | **Tiền Hoa Hồng** | `tien_commission` | `'commission'` |
| `the_moi` | **Tiền Hoa Hồng** | `tien_commission` | `'commission'` |

---

## Cột DB Chuẩn

### don_hang_chi_tiet
- ✅ `tien_tour` — **DÙNG** — Tiền Tour KTV (dịch vụ + thẻ liệu trình)
- ✅ `tien_commission` — **DÙNG** — Tiền Hoa Hồng KTV (sản phẩm + thẻ mới)
- ✅ `ti_le_hoa_hong` — **DÙNG** — Tỷ lệ % hoa hồng (dùng cho tính toán + audit)
- ~~`tien_hoa_hong`~~ — **ĐÃ DROP** qua migration 049 (28/05/2026)

### nhan_vien_thu_nhap
- `loai = 'tour'` → Tiền Tour (hiển thị UI: "Tiền Tour")
- `loai = 'hoa_hong'` → Tiền Hoa Hồng (hiển thị UI: "Hoa Hồng")
- ~~`loai = 'commission'`~~ — **ĐÃ XÓA** qua migration 049 (28/05/2026)

### bang_luong
- `hoa_hong_dv` — Tổng Tiền Tour tháng (tên legacy, ý nghĩa = tiền tour)
- `tien_tour` — Tiền Tour (cột mới, dùng thay thế)
- `hoa_hong_the` — Thưởng Đạt Doanh Số

---

## Quy Tắc Code

```javascript
// ✅ ĐÚNG — Dựa vào loai_item để xác định loại thu nhập
const isServiceItem = ['dich_vu', 'the_lieu_trinh'].includes(item.loai_item)
if (isServiceItem) {
  // Tiền Tour: tien_tour là cột chuẩn; fallback tien_commission cho data T5 import cũ
  tour += item.tien_tour || item.tien_commission || 0
} else {
  // Tiền Hoa Hồng: san_pham, the_moi → dùng tien_commission
  hoaHong += item.tien_commission || 0
}

// ❌ SAI — Dùng ?? sẽ không fallback khi tien_tour = 0 (integer)
tour += item.tien_tour ?? item.tien_commission  // BUG: 0 ?? X = 0

// ✅ ĐÚNG — Hiển thị UI
// nhan_vien_thu_nhap.loai = 'tour'     → label: "Tiền Tour"   icon: ✈️
// nhan_vien_thu_nhap.loai = 'hoa_hong' → label: "Hoa Hồng"    icon: 💆

// ✅ ĐÚNG — Filter trong code
incomeRows.filter(r => r.loai === 'hoa_hong')  // đúng
// ❌ SAI — cũ, đã xóa
incomeRows.filter(r => r.loai === 'commission')  // sai sau migration 049
```

---

## Lịch Sử Thay Đổi

| Ngày | Thay đổi |
|---|---|
| 08/05/2026 | Thêm cột `tien_tour`, `tien_commission` vào don_hang_chi_tiet |
| 28/05/2026 | Migration 048: Fix 737 dòng T5 import nhầm cột; chuẩn hóa nhan_vien_thu_nhap.loai |
