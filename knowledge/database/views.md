# Database Views

> Xác minh lần cuối: 08/05/2026 | Kiến trúc thống nhất v1.0

## so_du_vi_thuc_te (Số Dư Ví Thực Tế)

Trả về số dư thời gian thực cho từng ví.

**Logic ghép nối (v4 — dùng `v.loai`, không phải `v.ten`):**

```sql
CREATE VIEW so_du_vi_thuc_te AS
SELECT
  v.id, v.ten, v.loai, v.icon, v.thu_tu,
  v.so_du_dau
    + COALESCE((SELECT sum(d.so_tien) FROM doanh_thu d
        WHERE d.hinh_thuc = v.loai
          AND d.hinh_thuc IN ('tien_mat', 'chuyen_khoan', 'quet_the')
      ), 0)
    - COALESCE((SELECT sum(cp.so_tien) FROM chi_phi cp
        WHERE cp.hinh_thuc_thanh_toan = v.loai
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

**Thay đổi chính (v4):**
- Ghép nối bằng `v.loai = d.hinh_thuc` (trước đây dùng `v.ten`)
- Đổi tên ví (VD: "MB Bank" → "Vietcombank") không làm hỏng view
- Chỉ cộng `doanh_thu` với `hinh_thuc IN ('tien_mat', 'chuyen_khoan', 'quet_the')` — loại trừ thẻ trả trước và thẻ liệu trình

**Cột trả về:**
| Cột | Kiểu | Mô Tả |
|---|---|---|
| id | uuid | vi.id |
| ten | text | Tên ví |
| loai | loai_vi | Loại ví (ánh xạ tới hinh_thuc_thanh_toan) |
| icon | text | Emoji |
| thu_tu | integer | Thứ tự hiển thị |
| so_du_hien_tai | bigint | Số dư hiện tại đã tính |

**Được dùng bởi:** hook `useVi.js`, `TongQuanPage.jsx`, `DoiSoatPage.jsx`, `TaiKhoanPage.jsx`

---

## lich_su_giao_dich_tong_hop (Lịch Sử Giao Dịch Tổng Hợp)

UNION ALL của doanh_thu, chi_phi, chuyen_khoan_noi_bo thành một dòng thời gian duy nhất.

**Cột quan sát được:**
| Cột | Mô Tả |
|---|---|
| id | uuid |
| loai | 'thu' / 'chi' / 'chuyen_khoan' |
| so_tien | integer |
| ngay | date |
| dien_giai | text |
| ban_ghi_id | uuid (ánh xạ về bản ghi gốc) |
| created_at | timestamptz |

**Được dùng bởi:** `DoiSoatPage.jsx`, `TaiKhoanPage.jsx`, `TongQuanPage.jsx`

---

## tong_quan_pos_ngay (Tổng Quan POS Theo Ngày)

View mới cho POS dashboard. Tổng hợp đơn hàng + thanh toán theo ngày.

```sql
CREATE VIEW tong_quan_pos_ngay AS
SELECT
  dh.ngay,
  COUNT(DISTINCT dh.id) AS so_don,
  SUM(dh.thuc_thu) AS tong_thu,
  SUM(CASE WHEN tt.hinh_thuc = 'tien_mat' THEN tt.so_tien ELSE 0 END) AS tm,
  SUM(CASE WHEN tt.hinh_thuc = 'chuyen_khoan' THEN tt.so_tien ELSE 0 END) AS ck,
  SUM(CASE WHEN tt.hinh_thuc = 'quet_the' THEN tt.so_tien ELSE 0 END) AS qt,
  SUM(CASE WHEN tt.hinh_thuc = 'the_tra_truoc' THEN tt.so_tien ELSE 0 END) AS ttt,
  SUM(CASE WHEN tt.hinh_thuc = 'the_lieu_trinh' THEN tt.so_tien ELSE 0 END) AS tlt
FROM don_hang dh
LEFT JOIN thanh_toan tt ON tt.don_hang_id = dh.id
WHERE dh.trang_thai != 'huy'
GROUP BY dh.ngay;
```
