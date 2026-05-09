# Quy Ước Database

> Xác minh lần cuối: 08/05/2026

## Dự Án Supabase

```
ID:       aqyemkfbjqxpegingoil
Tên:      HannahSpa-production
Khu Vực:  Đông Nam Á (Singapore)
Site URL: https://hannahspa.vn
Auth:     disable_signup=TRUE
```

## Biến Môi Trường

```
VITE_SUPABASE_URL         — Anon key, an toàn cho frontend
VITE_SUPABASE_ANON_KEY    — Anon key, an toàn cho frontend
SUPABASE_URL              — (chỉ trong .env.import)
SUPABASE_KEY              — Service role key, KHÔNG BAO GIỜ trong frontend
```

## Khởi Tạo Client (`src/lib/supabase.js`)

```javascript
import { createClient } from '@supabase/supabase-js'
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)
```

## Cú Pháp JOIN Khóa Ngoại

```javascript
// PHẢI dùng tên cột FK rõ ràng sau dấu hai chấm:
.select('id, nhan_vien:nhan_vien_id(ho_ten, vi_tri)')

// JOIN lồng (2 cấp):
.select('so_tien, danh_muc:danh_muc_chi_phi(ten, nhom_cha:danh_muc_chi_phi(ten))')
```

## Mẫu RLS Policy

Tất cả RLS policy theo mẫu này:
```sql
CREATE POLICY "ten_policy" ON ten_bang
  FOR thao_tac
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND vai_tro = 'vai_tro_yeu_cau'
  ));
```

## Tóm Tắt RLS

| Bảng | Công Khai | Lễ Tân | Admin |
|---|---|---|---|
| homepage_config | SELECT | — | ALL |
| dich_vu | SELECT (active) | — | ALL |
| khuyen_mai | SELECT (active) | — | ALL |
| khach_hang | — | SELECT, INSERT, UPDATE | ALL |
| the_lieu_trinh | — | SELECT, INSERT, UPDATE | ALL |
| kho_san_pham | — | SELECT | ALL |
| kho_giao_dich | — | SELECT, INSERT | ALL |
| chien_dich_marketing | — | — | ALL |

Các bảng còn lại (nhan_vien, cham_cong, dang_ky_off, bang_luong, quy_ngay_off, vi, doanh_thu, chi_phi, danh_muc_chi_phi, chuyen_khoan_noi_bo, yeu_cau_chinh_sua, doi_soat_ngay) có RLS policy trong Supabase dashboard (không có trong file SQL migration).

## Quy Tắc Truy Vấn An Toàn

1. Mọi truy vấn Supabase trong try/catch + toast error
2. Dùng `.maybeSingle()` thay vì `.single()` khi bản ghi có thể không tồn tại
3. Dùng `.in()` cho thao tác hàng loạt, không dùng vòng lặp
4. Truy vấn đếm: `.select('id', { count: 'exact' })` cho badge

## Storage Buckets

| Bucket | Mục Đích | Mẫu Đường Dẫn |
|---|---|---|
| `avatars` | Ảnh nhân viên | `{nam}/{thang}/{ten_file}` |
| `chung-tu` | Ảnh chứng từ | (phẳng hoặc theo ngày) |
