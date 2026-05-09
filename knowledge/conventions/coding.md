# Quy Ước Lập Trình

> Xác minh lần cuối: 08/05/2026

## Múi Giờ — QUAN TRỌNG

```javascript
// LUÔN dùng các hàm trợ giúp này (từ src/lib/utils.js):
const getNowVN = () => new Date(
  new Date().toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' })
)
const todayISO = () => getNowVN().toISOString().slice(0, 10)
const nowTimeVN = () => getNowVN().toTimeString().slice(0, 8)

// KHÔNG BAO GIỜ dùng new Date() trực tiếp — server/Vercel chạy UTC, VN là +7
```

## Định Dạng Tiền Tệ

```javascript
// Hiển thị (từ src/lib/utils.js):
const fmt = n => new Intl.NumberFormat('vi-VN').format(n) + 'đ'
// → "2.000.000đ"

// Parse input:
const parseVND = s => parseInt(String(s).replace(/\D/g, ''), 10) || 0
// "2.000.000" → 2000000

// Tiền LUÔN là INTEGER (VNĐ) trong database — không bao giờ dùng float
```

## Mẫu Truy Vấn Supabase

```javascript
// JOIN bảng ngoại — PHẢI dùng tên cột FK rõ ràng:
.select('id, khach_hang:khach_hang_id(ho_ten)')  // ĐÚNG
.select('id, khach_hang(ho_ten)')                  // SAI!

// Mọi truy vấn PHẢI có try/catch + toast error:
try {
  const { data, error } = await supabase.from('...').select('...')
  if (error) throw error
  // ...
} catch (err) {
  showToast('error', err.message)
}

// Mẫu upsert (kiểm tra tồn tại trước):
const { data: existing } = await supabase.from('bang_luong')
  .select('id').eq('nhan_vien_id', id).eq('thang', m).eq('nam', y)
  .maybeSingle()
if (existing) { /* cập nhật */ } else { /* thêm mới */ }
```

## UI Style

```javascript
// Dùng INLINE STYLES (React style={{}}), KHÔNG dùng Tailwind class
// Màu sắc lấy từ constants:
import { COLORS } from '../constants/colors'   // hoặc
import { LUX } from '../constants/lux'

// Mỗi trang admin = 1 file lớn (500-1000 dòng)
// Sub-component định nghĩa trong cùng file trừ khi dùng toàn hệ thống
```

## Quy Tắc DatePicker

```javascript
// KHÔNG BAO GIỜ dùng <input type="date">
// LUÔN dùng DatePicker từ src/components/shared/DatePicker.jsx
```

## Service Role Key

```
Chỉ dùng trong: Edge Functions, script import (Python)
KHÔNG BAO GIỜ trong code frontend (chỉ dùng VITE_SUPABASE_ANON_KEY)
Lưu trong: .env.import (đã gitignore)
```

## Git Workflow

```bash
npm run build    # Kiểm tra lỗi TRƯỚC KHI push
git push         # → Vercel tự deploy
# KHÔNG BAO GIỜ push: .env, .env.import (đã gitignore)
```

## Đặt Tên File

- Component: PascalCase (VD: `FormDoanhThu.jsx`)
- Tiện ích: camelCase (VD: `utils.js`, `viService.js`)
- Hằng số: camelCase (VD: `colors.js`, `routes.js`)
- Hooks: tiền tố `use` (VD: `useVi.js`, `useClock.js`)

## Quy Tắc Không Comment

Mặc định KHÔNG comment. Chỉ thêm khi LÝ DO không rõ ràng: ràng buộc ẩn, invariant tinh tế, workaround cho bug cụ thể. Đặt tên tốt sẽ giải thích ĐIỀU code làm.

## Mẫu Auth

- Admin/Internal: Supabase Auth (email + password) → bảng `profiles`
- Checkin: PIN 4 số → SHA-256 hash → so sánh với `nhan_vien.pin_hash`
- `disable_signup=true` trên Supabase
