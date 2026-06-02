# KIẾN TRÚC DỮ LIỆU THỐNG NHẤT — HANNAH SPA

> **Phiên bản:** 1.0 | **Ngày:** 08/05/2026
> **Đây là tài liệu gốc (source of truth) cho toàn bộ hệ thống HSMS.**
> Mọi module phải tuân theo các định nghĩa trong tài liệu này.

---

## I. 4 PHƯƠNG THỨC THANH TOÁN — ĐỊNH NGHĨA DUY NHẤT

Đây là enum `hinh_thuc_thanh_toan` dùng CHO TOÀN BỘ HỆ THỐNG:

| # | Mã Enum | Tên Hiển Thị | Bản Chất | Vào Dòng Tiền? | Ghi Chú |
|---|---|---|---|---|---|
| 1 | `tien_mat` | Tiền Mặt | Tiền mặt VNĐ tại quầy | ✅ Có | |
| 2 | `chuyen_khoan` | Chuyển Khoản | Chuyển khoản ngân hàng | ✅ Có | Không phụ thuộc ngân hàng cụ thể |
| 3 | `quet_the` | Quẹt Thẻ | Thanh toán qua máy POS/cà thẻ | ✅ Có (về sau 3-7 ngày) | Không phụ thuộc ngân hàng cụ thể |
| 4 | `the_tra_truoc` | Thẻ Trả Trước | KH nạp tiền trước vào tài khoản spa | ❌ Không | Đã thu tiền từ trước, chỉ đang dùng số dư |
### Nguyên tắc:
- **4 phương thức này là BẤT BIẾN** — mọi bảng dùng chung CHECK constraint
- **Không nhúng tên ngân hàng** vào enum — "MB Bank", "TP Bank" chỉ là tên hiển thị của ví
- **Thẻ Trả Trước** không sinh dòng tiền mới (tiền đã thu từ trước)
- **Thẻ Liệu Trình** là dòng dùng/bán gói dịch vụ trong POS, không phải phương thức thanh toán

---

## II. SƠ ĐỒ LUỒNG DỮ LIỆU TOÀN HỆ THỐNG

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        KHÁCH HÀNG ĐẾN SPA                                    │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  BƯỚC 1: CHỌN DỊCH VỤ / SẢN PHẨM                                            │
│                                                                             │
│  ┌──────────┐    ┌──────────┐    ┌──────────────┐                           │
│  │ Dịch Vụ   │    │ Sản Phẩm  │    │ Thẻ Liệu Trình│                          │
│  │ (dich_vu) │    │(kho_san_ │    │(the_lieu_trinh)│                         │
│  │           │    │  pham)   │    │              │                           │
│  └─────┬─────┘    └─────┬────┘    └──────┬───────┘                           │
│        │               │               │                                    │
│        ▼               ▼               ▼                                    │
│  ┌──────────────────────────────────────────────────┐                       │
│  │              ĐƠN HÀNG (don_hang)                  │                       │
│  │  • id, ma_don, khach_hang_id, nguoi_tao          │                       │
│  │  • tong_tien_hang, giam_gia, thuc_thu, con_no    │                       │
│  │  • trang_thai: draft → da_thanh_toan / no_mot_phan│                       │
│  └──────────────────────────────────────────────────┘                       │
│        │                                                                    │
│        ▼                                                                    │
│  ┌──────────────────────────────────────────────────┐                       │
│  │         DÒNG HÀNG (don_hang_chi_tiet)             │                       │
│  │  • loai_item: dich_vu | san_pham | the_lieu_trinh│                       │
│  │  • nhan_vien_id → KTV thực hiện (commission)     │                       │
│  │  • don_gia, so_luong, thanh_tien                 │                       │
│  │  • ti_le_hoa_hong, tien_hoa_hong                 │                       │
│  └──────────────────────────────────────────────────┘                       │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  BƯỚC 2: THANH TOÁN                                                          │
│                                                                             │
│  ┌──────────────────────────────────────────────────┐                       │
│  │         THANH TOÁN (thanh_toan)                   │                       │
│  │  • 1 đơn hàng → 1..N khoản thanh toán             │                       │
│  │  • Mỗi khoản: hinh_thuc + so_tien                 │                       │
│  │  • VD: 200K tien_mat + 300K chuyen_khoan          │                       │
│  └──────────────────────────────────────────────────┘                       │
│        │                                                                    │
│        │  ← Mỗi khoản thanh toán tạo 1 bản ghi doanh_thu                   │
│        ▼                                                                    │
│  ┌──────────────────────────────────────────────────┐                       │
│  │         DOANH THU (doanh_thu)                     │                       │
│  │  • hinh_thuc = thanh_toan.hinh_thuc               │                       │
│  │  • so_tien  = thanh_toan.so_tien                  │                       │
│  │  • nguon = 'pos'                                  │                       │
│  │  • don_hang_id → truy xuất ngược về đơn hàng      │                       │
│  └──────────────────────────────────────────────────┘                       │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
          ┌───────────────────────────┼───────────────────────────┐
          ▼                           ▼                           ▼
┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐
│ SỐ DƯ VÍ          │    │ KHO HÀNG          │    │ CRM              │
│ (so_du_vi_thuc_te)│    │ (kho_giao_dich)   │    │ (khach_hang)     │
│                   │    │                   │    │                  │
│ Mỗi doanh_thu     │    │ Mỗi SP bán →      │    │ Cập nhật:        │
│ → cộng vào ví     │    │ xuat_ban          │    │ • tong_chi_tieu  │
│ tương ứng với     │    │ → giảm ton_kho    │    │ • so_lan_den     │
│ hinh_thuc         │    │                   │    │ • lan_cuoi_den   │
│                   │    │                   │    │ • hang           │
└──────────────────┘    └──────────────────┘    └──────────────────┘
          │
          ▼
┌──────────────────┐
│ NHÂN SỰ           │
│ (bang_luong)      │
│                   │
│ Cuối tháng:       │
│ SUM hoa hồng      │
│ từ don_hang_     │
│ chi_tiet          │
│ GROUP BY KTV      │
└──────────────────┘
```

---

## III. BẢNG `vi` — VÍ TIỀN (THIẾT KẾ LẠI)

### Vấn đề hiện tại
View `so_du_vi_thuc_te` ghép nối bằng tên ví:
```sql
WHERE (v.ten = 'Tiền Mặt' AND d.hinh_thuc = 'tien_mat')
   OR (v.ten = 'MB Bank'  AND d.hinh_thuc = 'chuyen_khoan')
   OR (v.ten = 'TP Bank'  AND d.hinh_thuc = 'quet_the')
```
→ Nếu đổi tên "MB Bank" → "Vietcombank", view bị hỏng.

### Giải pháp
Bảng `vi` đã có cột `loai` (enum `loai_vi`) ánh xạ trực tiếp tới `hinh_thuc_thanh_toan`:

| id | ten | loai | icon | thu_tu | so_du_dau |
|---|---|---|---|---|---|
| ... | Tiền Mặt | `tien_mat` | 💵 | 1 | ... |
| ... | MB Bank | `chuyen_khoan` | 🏦 | 2 | ... |
| ... | TP Bank | `quet_the` | 💳 | 3 | ... |

**Sửa view để dùng `v.loai` thay vì `v.ten`:**
```sql
CREATE VIEW so_du_vi_thuc_te AS
SELECT
  v.id, v.ten, v.loai, v.icon, v.thu_tu,
  v.so_du_dau
    + COALESCE((SELECT sum(d.so_tien) FROM doanh_thu d
        WHERE d.hinh_thuc <> 'the_tra_truoc'
          AND d.hinh_thuc <> 'the_lieu_trinh'
          AND d.hinh_thuc = v.loai  -- ← GHÉP BẰNG LOAI, KHÔNG PHẢI TÊN
      ), 0)
    - COALESCE((SELECT sum(cp.so_tien) FROM chi_phi cp
        WHERE cp.hinh_thuc_thanh_toan = v.loai  -- ← GHÉP BẰNG LOAI
      ), 0)
    + COALESCE((SELECT sum(ck.so_tien) FROM chuyen_khoan_noi_bo ck
        WHERE ck.den_vi_id = v.id), 0)
    - COALESCE((SELECT sum(ck.so_tien) FROM chuyen_khoan_noi_bo ck
        WHERE ck.tu_vi_id = v.id), 0)
  AS so_du_hien_tai
FROM vi v
WHERE v.is_active = true
ORDER BY v.thu_tu;
```

**Lợi ích:**
- Đổi tên ví "MB Bank" → "Vietcombank" → view không bị ảnh hưởng
- Thêm ví mới (VD: "Momo") → chỉ cần thêm 1 dòng trong bảng `vi` + thêm giá trị vào enum `loai_vi`
- Logic view hoàn toàn dynamic

---

## IV. MỐI LIÊN KẾT GIỮA CÁC MODULE

```
                    ┌──────────────────────┐
                    │     MARKETING        │
                    │  chien_dich_marketing│
                    │  • kenh (FB/Zalo/...)│
                    │  • ngan_sach         │
                    │  • so_kh_moi         │
                    └──────────┬───────────┘
                               │ khach_hang.nguon → marketing.kenh
                               ▼
┌──────────────────────────────────────────────────────────────────┐
│                          CRM                                      │
│  khach_hang                                                       │
│  • nguon → biết KH từ đâu (Facebook/Zalo/Walk-in/...)            │
│  • tong_chi_tieu → tự động cập nhật từ POS                        │
│  • so_lan_den → tự động cập nhật từ POS                           │
│  • lan_cuoi_den → tự động cập nhật từ POS                         │
│  • hang → bronze/silver/gold (tự động tính)                       │
│                                                                   │
│  the_lieu_trinh                                                   │
│  • Liên kết: khach_hang_id → ai sở hữu                           │
│  • Khi POS dùng buổi: UPDATE so_buoi_da_dung                      │
│  • Khi bán thẻ mới: INSERT + doanh_thu (the_tra_truoc)           │
└──────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────────┐
│                          POS                                      │
│  don_hang                                                         │
│  • khach_hang_id → liên kết CRM                                   │
│  • nguoi_tao → ai tạo đơn (Lễ Tân)                                │
│                                                                   │
│  don_hang_chi_tiet                                                │
│  • dich_vu_id → dịch vụ gì                                       │
│  • san_pham_id → sản phẩm gì                                     │
│  • the_lieu_trinh_id → thẻ nào (nếu dùng buổi)                   │
│  • nhan_vien_id → KTV nào làm (→ hoa hồng)                       │
│                                                                   │
│  thanh_toan                                                       │
│  • hinh_thuc → 1 trong 4 phương thức                              │
│  • so_tien → số tiền                                              │
└──────────────────────────────────────────────────────────────────┘
          │                       │                       │
          ▼                       ▼                       ▼
┌──────────────┐    ┌──────────────────┐    ┌──────────────────┐
│  TÀI CHÍNH   │    │  KHO HÀNG         │    │  NHÂN SỰ         │
│  doanh_thu   │    │  kho_giao_dich    │    │  bang_luong      │
│              │    │                   │    │                  │
│ 1:1 với      │    │ SP bán → xuat_ban │    │ Cuối tháng:      │
│ thanh_toan   │    │ → giảm ton_kho    │    │ SUM hoa hồng     │
│              │    │                   │    │ từ dòng hàng     │
│ hinh_thuc    │    │ don_hang_id →     │    │ GROUP BY KTV     │
│ = hinh_thuc  │    │ truy xuất đơn     │    │                  │
│              │    │                   │    │ hoa_hong_dv      │
│ chi_phi      │    │                   │    │ (POS auto)       │
│ • Lễ Tân     │    │                   │    │                  │
│   nhập tay   │    │                   │    │ tien_tour        │
│ • Nhập kho   │    │                   │    │ (từ POS)         │
│   → auto tạo │    │                   │    │                  │
└──────────────┘    └──────────────────┘    └──────────────────┘
          │
          ▼
┌──────────────────┐
│  BÁO CÁO         │
│  • Doanh thu     │
│  • Chi phí       │
│  • Lợi nhuận     │
│  • Dịch vụ       │
│  • Sản phẩm      │
│  • Hoa hồng      │
│  • Công nợ       │
│  • Thẻ liệu trình│
└──────────────────┘
```

---

## V. KIẾN TRÚC TRA CỨU HIỆU QUẢ KINH DOANH

```
KHÁCH MỚI TỪ ĐÂU?
  khach_hang.nguon ──────► chien_dich_marketing.kenh
  "Facebook Ads tháng 5 mang lại bao nhiêu KH mới?"

KH CŨ QUAY LẠI KHÔNG?
  khach_hang.lan_cuoi_den ──► so sánh với hôm nay
  "Bao nhiêu KH chưa quay lại >30 ngày?"

DỊCH VỤ NÀO BÁN CHẠY?
  don_hang_chi_tiet + dich_vu ──► COUNT + SUM GROUP BY dich_vu_id
  "Dịch vụ nào có doanh thu cao nhất tháng?"

KTV NÀO LÀM NHIỀU NHẤT?
  don_hang_chi_tiet.nhan_vien_id ──► COUNT + SUM
  "KTV nào làm nhiều dịch vụ nhất? Hoa hồng bao nhiêu?"

KHUYẾN MÃI CÓ HIỆU QUẢ KHÔNG?
  khuyen_mai.so_luot_dat ──► COUNT don_hang dùng KM
  "Khuyến mãi tháng 5 mang lại bao nhiêu đơn?"

CHI PHÍ MARKETING CÓ ĐÁNG KHÔNG?
  chien_dich_marketing.ngan_sach VS SUM doanh thu KH từ kênh đó
  "ROI Facebook Ads = (DT từ KH Facebook / Chi phí Ads) × 100%"
```

---

## VI. CHUẨN HÓA ENUM TOÀN HỆ THỐNG

### PostgreSQL — CHECK constraint dùng chung
```sql
-- Tạo domain để tất cả bảng dùng chung 1 định nghĩa
CREATE DOMAIN hinh_thuc_thanh_toan_t AS text
CHECK (VALUE IN (
  'tien_mat',
  'chuyen_khoan',
  'quet_the',
  'the_tra_truoc',
  'the_lieu_trinh'
));

-- Áp dụng cho tất cả bảng
-- doanh_thu.hinh_thuc       → hinh_thuc_thanh_toan_t
-- chi_phi.hinh_thuc_thanh_toan → hinh_thuc_thanh_toan_t
-- thanh_toan.hinh_thuc      → hinh_thuc_thanh_toan_t
```

### JavaScript — Enum dùng chung
```javascript
// src/constants/enums.js — ĐỊNH NGHĨA DUY NHẤT
export const HINH_THUC_THANH_TOAN = {
  TIEN_MAT:       'tien_mat',
  CHUYEN_KHOAN:   'chuyen_khoan',
  QUET_THE:       'quet_the',
  THE_TRA_TRUOC:  'the_tra_truoc',
  THE_LIEU_TRINH: 'the_lieu_trinh',
}

export const HINH_THUC_LABEL = {
  tien_mat:       'Tiền Mặt',
  chuyen_khoan:   'Chuyển Khoản',
  quet_the:       'Quẹt Thẻ',
  the_tra_truoc:  'Thẻ Trả Trước',
  the_lieu_trinh: 'Thẻ Liệu Trình',
}

// Phân loại: có vào dòng tiền không?
export const HINH_THUC_VAO_DONG_TIEN = [
  'tien_mat', 'chuyen_khoan', 'quet_the'
]
// the_tra_truoc và the_lieu_trinh KHÔNG vào dòng tiền
```

---

## VII. LUỒNG DỮ LIỆU POS → DOANH THU (ĐÃ SỬA)

### Trước khi sửa (SAI):
```
Đơn 500K: 200K TM + 300K CK
→ RPC tạo 1 doanh_thu 500K, hinh_thuc = 'chuyen_khoan'
→ Ví MB Bank +500K (SAI: thực tế MB chỉ nhận 300K)
```

### Sau khi sửa (ĐÚNG):
```
Đơn 500K: 200K TM + 300K CK
→ RPC tạo 2 doanh_thu:
  • 200K, hinh_thuc = 'tien_mat'     → Ví Tiền Mặt +200K ✓
  • 300K, hinh_thuc = 'chuyen_khoan' → Ví Ngân Hàng +300K ✓
→ 1:1 giữa thanh_toan và doanh_thu
```

---

## VIII. TỔNG KẾT — BẢNG LIÊN KẾT TOÀN HỆ THỐNG

```
BẢNG GỐC              LIÊN KẾT ĐẾN             THÔNG QUA CỘT
─────────────────────────────────────────────────────────────
don_hang          → khach_hang              khach_hang_id
                  → profiles                nguoi_tao

don_hang_chi_tiet → don_hang                don_hang_id
                  → dich_vu                 dich_vu_id
                  → kho_san_pham            san_pham_id
                  → the_lieu_trinh          the_lieu_trinh_id
                  → nhan_vien               nhan_vien_id

thanh_toan        → don_hang                don_hang_id

doanh_thu         → don_hang                don_hang_id (POS)
                  → (manual nếu nhập tay)   nguon = 'manual'

kho_giao_dich     → don_hang                don_hang_id
                  → khach_hang              khach_hang_id
                  → kho_san_pham            san_pham_id

the_lieu_trinh    → khach_hang              khach_hang_id

bang_luong        → nhan_vien               nhan_vien_id
                  ← don_hang_chi_tiet       (qua RPC cuối tháng)

khuyen_mai        → dich_vu                 dich_vu_id

chien_dich_       → khuyen_mai              khuyen_mai_id
marketing

lich_hen          → khach_hang              khach_hang_id
                  → dich_vu                 dich_vu_id
                  → nhan_vien               nhan_vien_id
```

---

*Đây là tài liệu kiến trúc gốc. Mọi thay đổi schema phải cập nhật vào đây.*
