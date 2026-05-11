# HSMS — Design System v1.0
# Tổng hợp: MySpa UX Pattern + Hannah Luxury Visual Language
# Cập nhật: 11/05/2026 | Claude Sonnet 4.6

> **Quy tắc vàng:** Đọc file này TRƯỚC KHI viết bất kỳ dòng UI nào.
> Mọi component, màn hình, layout đều phải tuân theo document này.
> Mục tiêu: UX logic của MySpa + Visual của Hannah Luxury = 1 sản phẩm hoàn chỉnh.

---

## 1. TRIẾT LÝ THIẾT KẾ

### MySpa dạy chúng ta điều gì?
Sau khi phân tích 30 màn hình MySpa, các nguyên tắc UX cốt lõi là:

1. **Sidebar tối màu + Content sáng** — phân tách rõ ràng navigation vs. content
2. **Header xanh accent luôn cố định** — branding nhất quán, action quan trọng luôn visible
3. **Page title màu accent (xanh lá/tím)** — người dùng biết ngay đang ở đâu
4. **Table-first** — mọi danh sách đều là bảng, không dùng card list
5. **Action buttons nổi bật** — tím/xanh lá pill shape, không bao giờ text-only
6. **Status badges màu sắc** — xanh/đỏ/vàng/tím nhất quán toàn hệ thống
7. **Search + Filter luôn ở đầu trang** — không ẩn đi
8. **Icon tròn cho action** — edit=xanh, delete=đỏ, view=cam/tím
9. **Breadcrumb navigation** — luôn biết mình ở đâu trong cây menu
10. **Right panel activity feed** — hoạt động gần đây luôn visible trên dashboard

### Hannah Luxury thêm vào điều gì?
Từ file Design System (hannah-admin.css) + ảnh kiến trúc spa:

1. **Bảng màu warm cream-espresso-champagne** — không dùng trắng thuần/đen thuần
2. **Cormorant Garamond cho tiêu đề** — sang trọng, khác biệt với SaaS thông thường
3. **Arch motif** — vòm cong từ kiến trúc spa, dùng làm signature shape
4. **Espresso sidebar** — tối ấm, không lạnh như MySpa
5. **Champagne gold accent** — thay cho xanh lá của MySpa
6. **Dusty rose secondary** — màu bổ sung từ ảnh kiến trúc

---

## 2. COLOR TOKENS — BẮT BUỘC

```javascript
// src/constants/colors.js — DÙNG CHÍNH XÁC CÁC GIÁ TRỊ NÀY
export const C = {
  // Nền
  bg:        '#f3ece1',   // kem facade kiến trúc
  bg2:       '#ede4d6',   // kem ấm hơn
  surface:   '#fbf7ef',   // trắng giấy
  surface2:  '#ffffff',

  // Chữ
  ink:       '#2a201a',   // espresso gần đen
  ink2:      '#5a4a3e',   // espresso vừa
  ink3:      '#8e7a68',   // espresso nhạt
  ink4:      '#b5a594',   // espresso rất nhạt

  // Đường kẻ
  line:      '#e8dcc8',
  line2:     '#d4c4ad',

  // Brand
  espresso:  '#3d2c20',   // sidebar background
  espresso2: '#5a4030',
  walnut:    '#6b4a35',   // sàn gỗ
  champagne: '#c9a96e',   // ACCENT CHÍNH — thay thế xanh lá MySpa
  champagne2:'#b08a55',
  gold:      '#d4a574',
  rose:      '#c4998a',   // dusty rose — header strip, secondary accent
  rose2:     '#a87366',
  mauve:     '#8a6a6e',
  sage:      '#7a8a6a',

  // Semantic (giữ nguyên từ HSMS cũ để không break)
  thu:       '#6e8a5e',   // doanh thu (sage green thay vì bright green)
  chi:       '#b85a4a',   // chi phí
  taiSan:    '#5a6a8a',   // tổng tài sản
  ck:        '#7a6a8a',   // chuyển khoản

  // Gradient — DÙNG CHO BUTTONS VÀ ACCENT ELEMENTS
  grad:      'linear-gradient(135deg, #e2c08a 0%, #c9a96e 50%, #a87f4f 100%)',
  gradSide:  'linear-gradient(180deg, #3a2a1f 0%, #2a1d14 100%)',
  gradRose:  'linear-gradient(135deg, #dec5b6 0%, #c4998a 60%, #a87366 100%)',
}
```

---

## 3. TYPOGRAPHY

```javascript
// Fonts — import trong index.html
// <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400;1,600&family=Inter:wght@400;500;600&display=swap">

const FONT = {
  serif: "'Cormorant Garamond', Georgia, serif",  // Page titles, card titles, số tiền lớn
  sans:  "'Inter', -apple-system, sans-serif",     // Body, label, table, button
}

// Quy tắc dùng font:
// - Page title (h1): serif, 24-28px, weight 700
// - Card title (h3): serif, 15-18px, weight 700
// - Số tiền lớn (KPI): serif, 20-28px, weight 700
// - Mọi thứ còn lại: sans
// - Label/badge/tag: sans, KHÔNG dùng serif
```

---

## 4. LAYOUT SHELL — BẮT BUỘC CHO MỌI TRANG ADMIN

```
┌─────────────────────────────────────────────────────────┐
│  TOPBAR (48px cố định, sticky)                          │
│  Logo · Branch dropdown · Search · Actions · Clock/User │
├────────────┬────────────────────────────────────────────┤
│            │  CONTENT AREA                              │
│  SIDEBAR   │  ┌─────────────────────────────────────┐  │
│  (220px)   │  │ Page Header: Title + Actions        │  │
│            │  ├─────────────────────────────────────┤  │
│  Dark      │  │ Filters / Search bar                │  │
│  Espresso  │  ├─────────────────────────────────────┤  │
│            │  │ Main Content                        │  │
│  Nav items │  │ (table / cards / form)              │  │
│  grouped   │  │                                     │  │
│  by        │  │                                     │  │
│  section   │  └─────────────────────────────────────┘  │
│            │                                            │
│  User      │                                            │
│  footer    │                                            │
└────────────┴────────────────────────────────────────────┘
```

### Sidebar (220px, màu espresso)
```javascript
// sidebar style
{
  width: '220px',
  background: C.gradSide,     // '#3a2a1f → #2a1d14'
  color: '#f3e6d2',
  display: 'flex',
  flexDirection: 'column',
  height: '100vh',
  position: 'fixed',
  left: 0, top: 0,
}

// Nav item — inactive
{
  display: 'flex', alignItems: 'center', gap: '10px',
  padding: '9px 12px',
  borderRadius: '8px',
  fontSize: '13px', fontWeight: 500,
  color: 'rgba(243,230,210,0.68)',
  cursor: 'pointer',
}

// Nav item — ACTIVE (dùng chính xác style này)
{
  background: 'linear-gradient(90deg, rgba(212,165,116,.22), rgba(212,165,116,.06))',
  color: '#f3d9a8',
  fontWeight: 600,
  // Có thanh vàng bên trái:
  position: 'relative',
  // ::before pseudo (dùng className thay inline):
  // left: -12px, width: 3px, background: grad, borderRadius: '0 3px 3px 0'
}

// Section label (Tổng Quan / Vận Hành / Quản Lý)
{
  fontSize: '9px',
  textTransform: 'uppercase',
  letterSpacing: '.22em',
  color: 'rgba(243,230,210,0.3)',
  padding: '14px 12px 5px',
  fontWeight: 600,
}
```

### Nav Structure (THEO ĐÚNG THỨ TỰ NÀY)
```
TỔNG QUAN
  · Dashboard

VẬN HÀNH
  · POS Bán Hàng          [badge: Mới]
  · Lịch Hẹn              [dot: số lịch hôm nay]
  · Thu Chi & Báo Cáo
  · Đối Soát Ngày

QUẢN LÝ
  · Nhân Sự
  · CRM Khách Hàng
  · Kho Hàng
  · Khuyến Mãi
  · Marketing
  · Nội Dung Web

HỆ THỐNG
  · Cài Đặt
```

### Topbar (48px sticky)
```javascript
{
  height: '48px',
  background: 'rgba(251,247,239,0.95)',
  borderBottom: `1px solid ${C.line}`,
  backdropFilter: 'blur(10px)',
  display: 'flex', alignItems: 'center',
  padding: '0 24px 0 16px',
  position: 'sticky', top: 0, zIndex: 100,
  // Bên trái: Page title + breadcrumb
  // Giữa: Search (max 360px)
  // Bên phải: icon buttons + CTA + clock
}

// Page title trong topbar
{
  fontFamily: FONT.serif,
  fontSize: '22px',
  fontWeight: 700,
  color: C.ink,
  letterSpacing: '-.005em',
}

// Primary CTA button (Tạo Đơn / Thêm mới)
{
  display: 'flex', alignItems: 'center', gap: '6px',
  padding: '7px 16px',
  borderRadius: '8px',
  background: C.grad,   // champagne gradient
  color: '#2a1d14',
  fontWeight: 600,
  fontSize: '12.5px',
  border: 'none',
  cursor: 'pointer',
}
```

---

## 5. PAGE ANATOMY — MỌI TRANG PHẢI CÓ CẤU TRÚC NÀY

```javascript
// Template cho mọi admin page
function AdminPageTemplate() {
  return (
    <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

      {/* 1. PAGE HEADER */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div>
          {/* Title dùng serif, màu champagne (học từ MySpa: title màu accent) */}
          <h1 style={{ fontFamily: FONT.serif, fontSize: '26px', fontWeight: 700, color: C.champagne }}>
            Tên Trang
          </h1>
          {/* Divider line màu champagne bên dưới title — đặc trưng MySpa */}
          <div style={{ height: '2px', background: C.champagne, marginTop: '6px', width: '100%', opacity: .4 }} />
        </div>
        {/* Action buttons bên phải: Xuất / Nạp / v.v. */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <button style={BTN.outline}>⬇ Xuất danh sách</button>
          <button style={BTN.primary}>+ Thêm mới</button>
        </div>
      </div>

      {/* 2. FILTER BAR */}
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <input placeholder="Tìm kiếm..." style={INPUT.search} />
        <button style={BTN.primary}>Tìm kiếm</button>
        <button style={BTN.outline}>Khôi phục</button>
        <button style={BTN.purple}>Tìm kiếm nâng cao</button>
      </div>

      {/* 3. MAIN CONTENT — thường là bảng */}
      <div style={CARD.base}>
        {/* Table hoặc Grid */}
      </div>

    </div>
  )
}
```

---

## 6. BUTTON SYSTEM

```javascript
// Học từ MySpa: buttons có shape rõ ràng, màu sắc nhất quán
export const BTN = {
  // Primary — Champagne Gold (thay thế xanh lá MySpa)
  primary: {
    padding: '8px 16px',
    borderRadius: '8px',
    background: C.grad,
    color: '#2a1d14',
    fontWeight: 600,
    fontSize: '13px',
    border: 'none',
    cursor: 'pointer',
    display: 'flex', alignItems: 'center', gap: '6px',
  },

  // Secondary outline
  outline: {
    padding: '7px 14px',
    borderRadius: '8px',
    background: 'transparent',
    border: `1px solid ${C.line2}`,
    color: C.ink2,
    fontWeight: 500,
    fontSize: '12.5px',
    cursor: 'pointer',
    display: 'flex', alignItems: 'center', gap: '6px',
  },

  // Purple — cho "Tìm kiếm nâng cao", "Tạo combo" (học từ MySpa)
  purple: {
    padding: '8px 16px',
    borderRadius: '8px',
    background: '#6b4a8a',
    color: '#fff',
    fontWeight: 600,
    fontSize: '13px',
    border: 'none',
    cursor: 'pointer',
  },

  // Danger — xóa
  danger: {
    padding: '8px 16px',
    borderRadius: '8px',
    background: C.chi,
    color: '#fff',
    fontWeight: 600,
    fontSize: '13px',
    border: 'none',
    cursor: 'pointer',
  },
}

// Icon action buttons (tròn, học từ MySpa)
export const ICON_BTN = {
  edit: {   // xanh lá
    width: '32px', height: '32px', borderRadius: '50%',
    background: '#5a8a5a', color: '#fff',
    border: 'none', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '14px',
  },
  view: {   // cam/tím
    width: '32px', height: '32px', borderRadius: '50%',
    background: '#8a5a2a', color: '#fff',
    border: 'none', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '14px',
  },
  delete: { // đỏ
    width: '32px', height: '32px', borderRadius: '50%',
    background: C.chi, color: '#fff',
    border: 'none', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '14px',
  },
  print: {  // xanh nhạt
    width: '32px', height: '32px', borderRadius: '50%',
    background: '#3a6a8a', color: '#fff',
    border: 'none', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '14px',
  },
}
```

---

## 7. TABLE SYSTEM — QUAN TRỌNG NHẤT

> MySpa dùng table cho MỌI danh sách. HSMS làm tương tự.

```javascript
export const TABLE = {
  wrapper: {
    width: '100%',
    background: C.surface,
    border: `1px solid ${C.line}`,
    borderRadius: '10px',
    overflow: 'hidden',
  },

  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '12.5px',
  },

  th: {
    textAlign: 'left',
    padding: '10px 12px',
    fontSize: '10px',
    textTransform: 'uppercase',
    letterSpacing: '.12em',
    color: C.ink3,
    fontWeight: 600,
    fontFamily: FONT.sans,
    background: C.bg2,
    borderBottom: `1px solid ${C.line}`,
    whiteSpace: 'nowrap',
  },

  td: {
    padding: '10px 12px',
    borderBottom: `1px solid rgba(232,220,200,0.5)`,
    verticalAlign: 'middle',
    color: C.ink,
  },

  // Row hover
  trHover: {
    background: 'rgba(201,169,110,0.04)',
  },

  // Số tiền trong bảng
  amount: {
    fontFamily: FONT.serif,
    fontSize: '13.5px',
    fontWeight: 700,
    color: C.ink,
    textAlign: 'right',
  },

  amountNeg: {
    fontFamily: FONT.serif,
    fontSize: '13.5px',
    fontWeight: 700,
    color: C.chi,
    textAlign: 'right',
  },
}
```

---

## 8. STATUS BADGE SYSTEM

```javascript
// Học từ MySpa: badge màu sắc nhất quán, pill shape
export const BADGE = {
  // Thanh toán
  cash:     { background: '#e8f2e3', color: '#3a6e2a', padding: '2px 8px', borderRadius: '999px', fontSize: '10.5px', fontWeight: 600 },
  transfer: { background: '#e3ebf5', color: '#2a4a6e', padding: '2px 8px', borderRadius: '999px', fontSize: '10.5px', fontWeight: 600 },
  card:     { background: '#f3e8f5', color: '#5a2a6e', padding: '2px 8px', borderRadius: '999px', fontSize: '10.5px', fontWeight: 600 },
  package:  { background: '#f5ede3', color: '#6e3a2a', padding: '2px 8px', borderRadius: '999px', fontSize: '10.5px', fontWeight: 600 },

  // Trạng thái đơn hàng
  paid:     { background: '#e8f2e3', color: '#2d6a2d', padding: '2px 8px', borderRadius: '999px', fontSize: '10.5px', fontWeight: 600 },
  pending:  { background: '#f5f0e3', color: '#6e5a2a', padding: '2px 8px', borderRadius: '999px', fontSize: '10.5px', fontWeight: 600 },
  canceled: { background: '#f5e8e3', color: '#6e2a2a', padding: '2px 8px', borderRadius: '999px', fontSize: '10.5px', fontWeight: 600 },

  // Trạng thái lịch hẹn (học từ MySpa ảnh 5)
  dadden:   { background: '#d4e8f5', color: '#1a4a6e', padding: '2px 10px', borderRadius: '999px', fontSize: '10.5px', fontWeight: 600 },
  xacnhan:  { background: '#d4f5d4', color: '#1a6e1a', padding: '2px 10px', borderRadius: '999px', fontSize: '10.5px', fontWeight: 600 },
  huy:      { background: '#f5d4d4', color: '#6e1a1a', padding: '2px 10px', borderRadius: '999px', fontSize: '10.5px', fontWeight: 600 },

  // Active/Inactive
  active:   { background: '#e3f5e3', color: '#2a6e2a', padding: '2px 8px', borderRadius: '999px', fontSize: '10.5px', fontWeight: 600 },
  inactive: { background: '#f0f0f0', color: '#6a6a6a', padding: '2px 8px', borderRadius: '999px', fontSize: '10.5px', fontWeight: 600 },

  // Branch tag (học từ MySpa: "Hannah Spa" pill tím)
  branch:   { background: '#6b4a8a', color: '#fff', padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 600 },
}
```

---

## 9. CARD SYSTEM

```javascript
export const CARD = {
  base: {
    background: C.surface,
    border: `1px solid ${C.line}`,
    borderRadius: '10px',
    overflow: 'hidden',
  },

  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 16px',
    borderBottom: `1px solid ${C.line}`,
  },

  title: {
    fontFamily: FONT.serif,
    fontSize: '15px',
    fontWeight: 700,
    color: C.ink,
  },

  body: {
    padding: '14px 16px',
  },

  // KPI card
  kpi: {
    background: C.surface,
    border: `1px solid ${C.line}`,
    borderRadius: '10px',
    padding: '14px 16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },

  // Summary number card (học từ MySpa dashboard: ô doanh thu, ghi nợ)
  metric: {
    padding: '16px 20px',
    borderRadius: '10px',
    textAlign: 'center',
    // Dùng màu background để phân biệt loại:
    // Doanh thu: background champagne
    // Ghi nợ: background rose
    // Tổng nợ còn lại: background đỏ cam (học từ ảnh 20)
  },
}
```

---

## 10. FORM SYSTEM

```javascript
export const INPUT = {
  base: {
    padding: '8px 12px',
    borderRadius: '8px',
    border: `1px solid ${C.line2}`,
    background: C.surface2,
    fontSize: '13px',
    color: C.ink,
    outline: 'none',
    width: '100%',
    fontFamily: FONT.sans,
    // focus: border-color = champagne
  },

  search: {
    padding: '8px 14px',
    borderRadius: '20px',    // pill shape (học từ MySpa)
    border: `1px solid ${C.line2}`,
    background: C.surface2,
    fontSize: '13px',
    color: C.ink,
    outline: 'none',
    minWidth: '280px',
  },

  label: {
    fontSize: '12px',
    fontWeight: 500,
    color: C.ink2,
    marginBottom: '4px',
    display: 'block',
  },

  required: {
    color: C.chi,
    marginLeft: '2px',
  },
}
```

---

## 11. DASHBOARD LAYOUT (màn hình 1 — ảnh MySpa số 1)

```
Cấu trúc Dashboard HSMS (học từ MySpa + Hannah Design):

┌─────────────────────────────────────────────────────────────────┐
│ HERO STRIP (dusty rose gradient) — lời chào + 3 stat nhanh      │
├────────────┬────────────┬────────────┬────────────────────────┤
│ KPI: DT    │ KPI: Chi   │ KPI: Đơn   │ KPI: Tổng TS          │
│ Hôm nay    │ Hôm nay    │ Hôm nay    │ 3 ví                  │
│ +sparkline │ +sparkline │ +sparkline │ +sparkline             │
├────────────────────────┬───────────────────────────────────────┤
│ Chart Doanh Thu 7 ngày │ Giao Dịch Gần Đây (table 5 dòng)    │
├────────────────────────┴───────────────────────────────────────┤
│ Số Dư 3 Ví (3 cards ngang) + Cảnh Báo Kho (badge đỏ)          │
└─────────────────────────────────────────────────────────────────┘

Bên phải (nếu màn lớn): Activity Feed — học từ MySpa ảnh 1
  "Hoạt động gần đây: Lễ Tân Hannah 2 — Thêm đơn hàng — 13 giờ trước"
```

---

## 12. DANH SÁCH PAGE PATTERN (học từ MySpa)

```
Mọi trang danh sách (KH, Đơn hàng, NV, Dịch vụ, Kho...) theo đúng pattern:

1. Page Title (serif, màu champagne) + divider line
2. Action bar: [+ Tạo mới] [Search pill] [Tìm kiếm] [Tìm kiếm nâng cao]
3. Status filter chips (nếu có): Tất cả / Đã thanh toán / Chờ / Hủy
4. Bảng dữ liệu với:
   - Checkbox chọn nhiều (cột đầu)
   - Columns có sort arrow (▲▼)
   - Row hover highlight nhẹ
   - Action icons tròn cuối mỗi row: view/edit/delete/print
5. Pagination dưới bảng
```

---

## 13. MOBILE — /checkin (màn hình KTV)

```
Mobile khác hoàn toàn với Admin desktop:
- maxWidth: 420px, margin: 0 auto
- Bottom navigation (5 tab)
- FAB button (+) ở giữa bottom nav
- Không có sidebar
- Màu nền: C.bg (#f3ece1)
- Mỗi card bo góc 16px
- Số tiền/số liệu dùng font serif to
```

---

## 14. QUY TẮC CODE BẮT BUỘC

```javascript
// 1. KHÔNG bao giờ dùng Tailwind class
// 2. LUÔN dùng inline styles
// 3. Import C từ constants/colors.js
// 4. Font: FONT.serif cho title/số, FONT.sans cho body
// 5. Timezone: getNowVN() không bao giờ new Date()
// 6. Số tiền: Intl.NumberFormat('vi-VN') + 'đ'
// 7. Supabase query: luôn có try/catch + toast error
// 8. DatePicker: component custom, không input type="date"
// 9. Mỗi page là 1 file lớn (500-1000 lines)
// 10. Sub-components định nghĩa trong cùng file

// KHÔNG làm:
// ❌ background: 'white'  → C.surface hoặc C.surface2
// ❌ color: 'black'       → C.ink
// ❌ color: 'gray'        → C.ink3 hoặc C.ink4
// ❌ background: '#6b7280' → dùng C token
// ❌ fontFamily: 'Arial'  → FONT.sans
// ❌ fontSize quá nhỏ (< 10px) hoặc quá lớn (> 28px cho body)
```

---

## 15. SPACING SCALE

```javascript
// Nhất quán toàn hệ thống
const SPACE = {
  xs:  '4px',
  sm:  '8px',
  md:  '12px',
  lg:  '16px',
  xl:  '20px',
  xxl: '24px',
  page: '24px',  // padding ngoài của content area
  section: '16px', // gap giữa các section
}

// Border radius
const RADIUS = {
  sm:   '6px',
  md:   '8px',
  lg:   '10px',
  xl:   '12px',
  pill: '999px',
  arch: '999px 999px 8px 8px',  // Hannah arch motif
}
```

---

## 16. ANIMATION — TIẾT KIỆM, CÓ CHỦ ĐÍCH

```css
/* Chỉ dùng transition cho: hover, active, open/close */
transition: all 0.15s ease;

/* Không dùng animation phức tạp trong production app */
/* Exception: SplashScreen, Toast notification */
```

---

## 17. ICONS

```javascript
// Dùng Lucide React (đã có trong project)
// Kích thước chuẩn:
// - Nav sidebar: 15-16px
// - Table action: 14px
// - Button icon: 13-14px
// - KPI card: 16-18px
// Màu: luôn theo ngữ cảnh (C.ink3 cho neutral, C.champagne cho accent)
```

---

## 18. RESPONSIVE BREAKPOINTS

```javascript
// HSMS không mobile-first cho Admin
// Admin: desktop-only (min-width: 1024px)
// /checkin: mobile-only (max-width: 480px)
// /menu: tablet landscape (1024x768)
// /: landing page responsive đầy đủ

// Không cần media queries cho Admin pages
// Chỉ cần đảm bảo hoạt động tốt ở 1280px+
```

---

## 19. FILE STRUCTURE CHO MỖI ADMIN PAGE

```javascript
// Template chuẩn — COPY VÀ ĐIỀN VÀO
import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabase'
import { C, FONT } from '../../../constants/colors'   // hoặc từ design-system
import { fmt, getNowVN } from '../../../lib/utils'
import { useApp } from '../../../context/AppContext'

// 1. Constants/helpers LOCAL (không export)
const COLUMNS = [...]
const STATUS_MAP = {...}

// 2. Sub-components LOCAL (nhỏ, chỉ dùng trong file này)
function StatusBadge({ status }) { ... }
function ActionButtons({ row, onEdit, onDelete }) { ... }

// 3. Main component
export default function AdminXxxPage() {
  const { showToast } = useApp()
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [selected, setSelected] = useState(null)

  // fetch, handlers...

  return (
    <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* PAGE HEADER */}
      {/* FILTER BAR */}
      {/* TABLE */}
      {/* MODAL/FORM (conditional) */}
    </div>
  )
}
```

---

## 20. CHECKLIST TRƯỚC KHI PUSH

```
□ Tất cả màu dùng C.xxx tokens
□ Font: serif cho title/số lớn, sans cho body
□ Page title màu C.champagne + divider line
□ Buttons đúng theo BTN system
□ Table dùng TABLE styles
□ Badge dùng BADGE system
□ Inline styles, không Tailwind
□ getNowVN() cho timezone
□ try/catch cho mọi Supabase query
□ npm run build pass (0 errors)
```

---

*HSMS Design System v1.0 — Hannah Beauty & Spa*
*Tổng hợp từ: MySpa UX analysis (30 screens) + Hannah Design System (claude-design project)*
*Cập nhật: 11/05/2026*
