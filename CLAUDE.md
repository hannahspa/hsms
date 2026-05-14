# HSMS — HANNAH SPA MANAGEMENT SYSTEM
# Master Project Document v4.0
# Cập nhật: 14/05/2026 | Đang cải tạo giao diện — Phase 0

---
Trước khi viết bất kỳ UI nào, đọc src/DESIGN_SYSTEM.md
Dự án cải tạo giao diện: D:\Hannah Spa\Du An WebApp Hannah Spa\Cai Tao Giao Dien Web\KE_HOACH_Cai_Tao_Giao_Dien.md
## 🇻🇳 NGÔN NGỮ — BẮT BUỘC
- Toàn bộ phản hồi PHẢI bằng tiếng Việt: giải thích, phân tích, câu hỏi, thông báo lỗi
- Khi đọc file, chạy lệnh, debug → tóm tắt kết quả bằng tiếng Việt
- KHÔNG dùng tiếng Anh dù chỉ 1 câu, trừ: code, tên biến, tên file, terminal output
- Thinking cũng ghi bằng tiếng việt, tuyệt đối không dùng tiếng anh
## MỤC LỤC

1. [Thông tin dự án & doanh nghiệp](#1-thông-tin-dự-án--doanh-nghiệp)
2. [Trạng thái hiện tại — Đã làm được gì](#2-trạng-thái-hiện-tại--đã-làm-được-gì)
3. [Tech Stack & Infrastructure](#3-tech-stack--infrastructure)
4. [Database Schema đầy đủ](#4-database-schema-đầy-đủ)
5. [Quy tắc nghiệp vụ](#5-quy-tắc-nghiệp-vụ)
6. [Coding Rules — BẮT BUỘC](#6-coding-rules--bắt-buộc)
7. [Việc cần làm — Ưu tiên rõ ràng](#7-việc-cần-làm--ưu-tiên-rõ-ràng)
8. [Kế hoạch tích hợp MySpa → HSMS](#8-kế-hoạch-tích-hợp-myspa--hsms)
9. [Quy trình vận hành thực tế](#9-quy-trình-vận-hành-thực-tế)
10. [Ghi chú kỹ thuật quan trọng](#10-ghi-chú-kỹ-thuật-quan-trọng)

---

## 1. THÔNG TIN DỰ ÁN & DOANH NGHIỆP

### Doanh nghiệp

| Thông tin | Chi tiết |
|---|---|
| Tên | Hannah Beauty & Spa |
| Địa chỉ | 39 Nam Kỳ Khởi Nghĩa, P.Tân An, Ninh Kiều, Cần Thơ |
| Thành lập | 15/04/2019 |
| Giờ làm | 9:15 – 20:00 (ngưng nhận khách 19:30) |
| Email | hannahspa.nm@gmail.com |
| Domain | hannahspa.vn (đang LIVE trên Vercel) |
| POS hiện tại | myspa.vn (nguồn hoa hồng KTV — đang dùng song song) |
| Ngân hàng | MB Bank (chính) + TP Bank (quẹt thẻ, về 3-7 ngày) |
| Chủ | Cao Quốc Nam — đang ở Mỹ, quản lý remote qua web |

### Nhân sự (10 người)

| STT | Họ Tên | Vị Trí | Lương Cứng | Ghi chú |
|---|---|---|---|---|
| 1 | Nguyễn Thị Thúy Hoanh | KTV | 5,000,000đ | |
| 2 | Nguyễn Hoàng Anh Thư | KTV | 4,500,000đ | Tiền tour cao nhất (507,900đ T5) |
| 3 | Đỗ Thị Khánh Duy | Lễ Tân | 5,500,000đ | Nhập liệu chính, gioi_han_off=4 |
| 4 | Nguyễn Thị Tường Uyên | KTV | 4,000,000đ | |
| 5 | Lê Thị Cẩm My | KTV | 3,600,000đ | Ký quỹ hoàn tất |
| 6 | Trương Thị Bé Thôn | KTV | 3,000,000đ | Ký quỹ còn 5 tháng (từ 09/2025) |
| 7 | Lê Hoàng Phương Linh | KTV | 4,500,000đ | |
| 8 | Hồ Ngọc Phương | Lễ Tân | 5,000,000đ | Nhập liệu phụ, ký quỹ còn 3 tháng (từ 07/2025) |
| 9 | Nguyễn Hoa Đào | KTV | 2,000,000đ | |
| 10 | Phạm Thị Nhỏ | Tạp Vụ | 7,000,000đ | trang_thai='dac_biet', không check-in, lương CK thẳng |

---

## 2. TRẠNG THÁI HIỆN TẠI — ĐÃ LÀM ĐƯỢC GÌ

> **Cập nhật cuối: 14/05/2026**
>
> Session 13-14/05/2026 đã làm: DatePicker fix createPortal (không còn hiện sai vị trí), POS thêm tab "Danh Sách Bán Hàng" (filter/search/detail/void/resume), sidebar logo Hannah Spa + menu cha-con 4 modules (Nhân Sự 6 sub / Kho Hàng 5 sub / Khuyến Mãi 2 sub / Marketing 3 sub), Tổng Quan lên vị trí 1 trong Nhân Sự, fix 3 bugs AdminApp (trang_thai 'active'→'dang_lam', URL ?tab=off→/xet-duyet). AdminNhanSuPage chuyển sang URL routing (window.location.pathname). **KHÔNG kết nối POS với Sổ Thu Chi** — giữ data sạch đến khi web hoàn thiện 100%.

> **4 commits local chưa push:** afe792a, 37bf45f, 9270467, facc335

### ✅ Đã hoàn chỉnh & đang LIVE

#### Module 1: Thu Chi (`/app` → tab Nhập Liệu)
- Form Doanh Thu — 4 hình thức (Tiền Mặt / CK / Quẹt Thẻ / Thẻ Trả Trước)
- Form Chi Phí — 2 cấp danh mục (6 nhóm / 37 hạng mục)
- Form Chuyển Khoản Nội Bộ — 3 chiều giữa 3 ví
- Đối Soát Ngày — chốt số dư ví sau khi đối soát
- Quản lý Ví Realtime (view `so_du_vi_thuc_te`)
- Lịch sử giao dịch tổng hợp (view `lich_su_giao_dich_tong_hop`)
- **Sổ Thu Chi đã sạch**: Tiền Mặt = 0đ, Tổng TS = 95,850,235đ khớp 3 ví
- **Fix 08/05**: 64 records sai enum + 14 CK sai số + 4 CK thiếu đã sửa

#### Module 2: Nhân Sự (`/checkin`)
- Login PIN 4 số + SHA-256 hash + rate limiting (fix 08/05)
- CheckinHome: đồng hồ giờ VN, trạng thái hôm nay
- CheckinChamCong: check-in/out, tính % ngày công chính xác, popup kết quả
- CheckinLich: lịch tháng màu Hannah Luxury
- CheckinDangKyOff: calendar, kiểm tra giới hạn OFF/ngày theo bộ phận
- CheckinDoiPin: đổi PIN 3 bước
- Import data tháng 4/2026 hoàn tất (243 records)

#### Module 3: Báo Cáo (`/app` → tab Báo Cáo)
- BaoCaoNgay / BaoCaoTuan / BaoCaoThang / BaoCaoNam
- PhanTichDoanhThu + PhanTichChiPhi (expandable nhóm + progress bar)
- DatePicker custom (Misa style) — dùng chung toàn hệ thống
- **Fix 08/05**: `so_du_dau → so_du_hien_tai` trong BaoCaoNgay

#### Module 4: Kho Hàng (`/admin/kho-hang`)
- CRUD sản phẩm (3 loại: tieu_hao / ban_khach / dau_goi)
- Nhập/Xuất/Điều chỉnh kho
- Nhập kho tự động tạo chi_phi tương ứng
- **Fix 08/05**: xóa nhập kho → xóa cả chi_phi liên quan
- Cảnh báo hết hàng (badge trong Dashboard)
- Thống nhất schema: `san_pham → kho_san_pham` (fix 08/05)

#### Module 5: Marketing (`/admin/marketing`)
- Theo dõi chi phí marketing theo kênh (Facebook/Zalo/TikTok/In Ấn)
- ROI theo kênh với biểu đồ
- **Fix 08/05**: `kenhDMMap` hỗ trợ mảng DM IDs

#### Module 6: Dashboard Tổng Hợp (`/admin/dashboard`)
- 4 tabs: Tổng Quan / Tài Chính / Nhân Sự / Cảnh Báo
- KPI cards với % so tháng trước
- Tổng tài sản gradient card
- Bar chart 6 tháng
- **Fix 08/05**: trừ ký quỹ chỉ cho NV đang đóng (trang_thai='dang_dong')

#### Module 7: Website Công Khai (`hannahspa.vn/`)
- Landing Page 12 sections: NavBar, Hero, Marquee, About, Services, Gallery,
  Testimonials, Contact, FAQ, Location, Footer, StickyCTA
- Scroll reveal, Accordion FAQ, fonts Cormorant Garamond + Italiana + Inter
- Đọc nội dung từ `homepage_config` (JSONB), fallback về static

#### Module 8: Menu iPad (`/menu`)
- Public route, không cần auth, landscape-first (1024×768)
- Đọc `dich_vu WHERE hien_tren_menu=true` + JOIN khuyen_mai active
- Filter tabs, grid 3 cột, modal chi tiết + nút đặt lịch Zalo

#### Module 9: Admin Homepage Editor (`/admin/trang-chu`)
- Edit từng section landing page qua `homepage_config` (JSONB)

#### Module 10: Khuyến Mãi (`/admin/khuyen-mai`)
- CRUD `khuyen_mai`, badge tự động trên Menu iPad + Landing Page
- `phan_tram_giam` GENERATED column

#### Auth & Phân Quyền
- Supabase Auth email+password, `disable_signup=true`
- AuthContext đọc `vai_tro` từ `profiles`
- QuanLyUser.jsx: Admin CRUD user + profile
- ErrorBoundary toàn cục (thêm 08/05)

#### Bảo mật (fix 08/05)
- PIN hash SHA-256 + xóa PIN mặc định + rate limiting
- 3 file SQL migration trong `supabase/migrations/`

---

### ⏳ Đang làm / Còn thiếu trong HSMS

| Tính năng | Mức độ | Ghi chú |
|---|---|---|
| Bảng lương tự động cuối tháng | 🔴 Quan trọng | Schema `bang_luong` có sẵn |
| Phiếu lương PDF từng NV | 🔴 Quan trọng | Cần sau bảng lương |
| Quỹ ngày OFF từ ngày lễ | 🟡 Cần | Table `quy_ngay_off` có, chưa có UI |
| Seed dich_vu thật (300+ DV) | 🟡 Cần | Bảng có, cần import data từ MySpa |
| Seed nội dung homepage_config | 🟡 Cần | |
| Module POS Bán Hàng | ⚠️ Đang làm | Tab Bán Hàng + Danh Sách có. Chưa kết nối Sổ Thu Chi |
| Module Đặt Hẹn / Lịch Hẹn | 🟡 Cần | |
| Module CRM Khách Hàng | 🟡 Cần | Schema có |
| Module Thẻ Liệu Trình | 🟡 Cần | Schema có |
| Báo cáo Commission KTV | 🟡 Cần | |

---

## 3. TECH STACK & INFRASTRUCTURE

### Stack

| Thành phần | Công nghệ | Ghi chú |
|---|---|---|
| Frontend | React 18 + Vite | |
| UI | Inline styles (React `style={{}}`) | KHÔNG dùng Tailwind — đã bỏ |
| Backend | Supabase | PostgreSQL + Auth + Realtime + Storage |
| Hosting | Vercel | Auto-deploy từ GitHub main |
| Domain | hannahspa.vn | Đang LIVE |
| Email | Resend.com | Tạm dùng `onboarding@resend.dev`, domain chưa verify |
| Repo | github.com/hannahspa/hsms | |

### URLs Production

| URL | Mô tả |
|---|---|
| `hannahspa.vn/` | Landing Page (công khai) |
| `hannahspa.vn/app` | Internal App (Lễ Tân) |
| `hannahspa.vn/admin` | Admin Dashboard (anh Nam từ Mỹ) |
| `hannahspa.vn/checkin` | Check-in nhân viên (điện thoại) |
| `hannahspa.vn/menu` | Menu iPad (khách tại quầy) |

### Supabase Project

```
ID:      aqyemkfbjqxpegingoil
Name:    HannahSpa-production
Region:  Southeast Asia (Singapore)
disable_signup: TRUE
site_url: https://hannahspa.vn
```

### Tài khoản hệ thống

```
Admin:    quocnam2201@gmail.com (Cao Quốc Nam)
Lễ Tân:  KhanhDuy@hannahspa.vn / HannahSpa2026
Lễ Tân:  NgocPhuong@hannahspa.vn / HannahSpa2026
KTV:     Đăng nhập PIN 4 số tại /checkin (không dùng email)
```

### Hannah Luxury — Palette Màu (object `C` hoặc `LUX`)

```javascript
const C = {
  bg:        '#FAF7F4',
  card:      '#FFFFFF',
  border:    'rgba(160,113,79,0.12)',
  shadow:    '0 4px 24px rgba(139,94,60,0.10)',
  text:      '#1A1209',
  textSub:   '#8B7355',
  textMute:  '#B8A898',
  thu:       '#2D7A4F',   // doanh thu, lợi nhuận dương
  chi:       '#C0392B',   // chi phí, âm
  taiSan:    '#1A5276',   // tổng tài sản
  ck:        '#6C3483',   // chuyển khoản nội bộ
  gold:      '#C9A96E',
  primary:   '#A0714F',
  grad:      'linear-gradient(135deg, #C9A96E 0%, #A0714F 45%, #7D5A3C 100%)',
}
```

---

## 4. DATABASE SCHEMA ĐẦY ĐỦ

> Đã verify thực tế 08/05/2026 trên Supabase HannahSpa-production

### Auth
```sql
profiles (
  id          uuid PK FK→auth.users,
  ho_ten      text,
  email       text,
  vai_tro     enum(admin, le_tan, ktv, tap_vu),
  so_dien_thoai text,
  trang_thai  text
)
```

### Nhân Sự
```sql
nhan_vien (
  id                  uuid PK,
  ho_ten              text,
  vi_tri              text,
  luong_cung          integer,
  ngay_bat_dau        date,
  trang_thai          text,        -- 'dac_biet' cho Phạm Thị Nhỏ
  gioi_han_off_thang  integer DEFAULT 3,  -- Khánh Duy = 4
  pin_hash            text,        -- SHA-256
  avatar_url          text
)

cham_cong (
  id                    uuid PK,
  nhan_vien_id          uuid FK,
  ngay                  date,
  gio_vao               text,        -- định dạng "HH:MM:SS" (không phải timestamptz)
  gio_ra                text,        -- định dạng "HH:MM:SS"
  loai                  enum(di_lam, off_phep, off_ov, off_t7, off_t7x),
  he_so                 numeric,     -- hệ số thực (0.79 nếu về sớm)
  he_so_tam             numeric,
  tang_ca_gio           numeric,
  trang_thai_tang_ca    enum(khong_co, cho_duyet),  -- đơn giản hơn bản cũ
  ly_do_ve_som          text,
  nguoi_cham            text         -- text (không phải uuid FK)
)

dang_ky_off (
  id              uuid PK,
  nhan_vien_id    uuid FK,
  ngay_off        date,
  ly_do           text,
  bat_kha_khang   boolean DEFAULT false,
  trang_thai      enum(cho_duyet, duoc_duyet, tu_choi),
  duyet_boi       uuid FK,
  nguon           text DEFAULT 'nhan_vien',  -- 'admin' nếu admin tạo
  dung_quy_off    boolean DEFAULT false,
  so_ngay_quy_dung numeric DEFAULT 0
)

bang_luong (
  id              uuid PK,
  nhan_vien_id    uuid FK,
  thang           integer,
  nam             integer,
  luong_co_ban    integer,
  tien_tang_ca    integer,
  tien_phat       integer,
  hoa_hong_dv     integer,        -- hoa hồng dịch vụ từ POS
  hoa_hong_the    integer,        -- thưởng đạt doanh số
  tien_tour       integer,        -- tiền tour
  tru_ung_luong   integer,
  tru_ky_quy      integer,
  tong_linh       integer,
  trang_thai_lc   text,           -- Kỳ 1: chua_tinh/da_tinh/da_chot/da_phat_luong
  trang_thai_lkd  text            -- Kỳ 2: chua_tinh/da_tinh/da_chot/da_phat_luong
)

quy_ngay_off (
  id                uuid PK,
  nhan_vien_id      uuid FK,
  nam               integer,
  ly_do_tich_luy    text,
  so_ngay_tich      numeric,
  so_ngay_da_dung   numeric,
  ghi_chu           text,
  created_at        timestamptz
)

yeu_cau_chinh_sua (
  id              uuid PK,
  nguoi_yeu_cau   uuid FK,
  loai_yeu_cau    text,   -- 'sua' | 'xoa' | 'tang_ca'
  bang            text,
  record_id       uuid,
  du_lieu_cu      jsonb,
  du_lieu_moi     jsonb,
  trang_thai      text,   -- 'cho_duyet' | 'duyet' | 'tu_choi'
  duyet_boi       uuid FK,
  created_at      timestamptz
)
```

### Tài Chính
```sql
vi (
  id          uuid PK,
  ten         text,
  loai        USER-DEFINED,
  icon        text,
  so_du_dau   bigint,   -- cập nhật sau mỗi lần chốt sổ
  thu_tu      integer,
  is_active   boolean
)
-- 3 ví: Tiền Mặt(thu_tu=1), MB Bank(thu_tu=2), TP Bank(thu_tu=3)

doanh_thu (
  id          uuid PK,
  ngay        date,
  hinh_thuc   text,  -- tien_mat | chuyen_khoan | quet_the | the_tra_truoc
  so_tien     integer,
  dien_giai   text,
  nguoi_nhap  text,        -- text (không phải uuid FK)
  chung_tu_url text,       -- URL ảnh chứng từ
  created_at  timestamptz
)

chi_phi (
  id                    uuid PK,
  ngay                  date,
  danh_muc_id           uuid FK,
  so_tien               integer,
  hinh_thuc_thanh_toan  text,  -- tien_mat | chuyen_khoan | quet_the
  vi_id                 uuid FK,      -- ví nguồn chi
  dien_giai             text,
  nguoi_nhap            text,         -- text (không phải uuid FK)
  chung_tu_url          text,
  created_at            timestamptz
)

chuyen_khoan_noi_bo (
  id              uuid PK,
  ngay            date,
  tu_vi_id        uuid FK,
  den_vi_id       uuid FK,
  so_tien         integer,
  dien_giai       text,
  nguoi_thuc_hien text,         -- text (không phải uuid FK)
  created_at      timestamptz
)

danh_muc_chi_phi (
  id          uuid PK,
  ten         text,
  parent_id   uuid,      -- NULL = nhóm cha, có giá trị = hạng mục con
  icon        text,
  thu_tu      integer,
  is_active   boolean
)
-- 6 nhóm cha, 37 hạng mục con
```

### Kho Hàng
```sql
kho_san_pham (  -- Tên thật trong DB, CLAUDE.md cũ ghi là san_pham
  id                uuid PK,
  ten               text,
  loai              enum(tieu_hao, ban_khach, vat_tu),  -- vat_tu thay vì dau_goi
  don_vi            text,
  ton_kho           integer,         -- tên thật: ton_kho (không phải ton_kho_hien_tai)
  canh_bao_ton      integer,         -- tên thật: canh_bao_ton
  gia_nhap          integer,
  gia_ban           integer,
  mo_ta             text,
  co_the_chiet      boolean,
  san_pham_chiet_id uuid,
  he_so_chiet       numeric,
  is_active         boolean,
  created_at        timestamptz
)

kho_giao_dich (  -- Tên thật trong DB, CLAUDE.md cũ ghi là nhap_xuat_kho
  id              uuid PK,
  kho_san_pham_id uuid FK,          -- tên thật (không phải san_pham_id)
  loai            enum(nhap_kho, xuat_su_dung, xuat_ban, chiet_ra, chiet_vao, dieu_chinh, tra_nha_cc),
  so_luong        numeric,           -- LUÔN > 0, sign lưu trong loai
  ngay            date,
  gia_don_vi      integer,
  ghi_chu         text,
  nguoi_thuc_hien text,              -- text (không phải uuid FK)
  lien_quan_id    uuid,
  created_at      timestamptz
)
-- NOTE: khi xóa nhập kho → hoàn lại ton_kho trong kho_san_pham
```

### Khách Hàng
```sql
khach_hang (
  id                uuid PK,
  ho_ten            text,
  so_dien_thoai     text UNIQUE,
  ngay_sinh         date,
  ghi_chu_da_lieu   text,
  tong_chi_tieu     integer,  -- computed
  lan_cuoi_den      date       -- computed
)

the_lieu_trinh (
  id              uuid PK,
  khach_hang_id   uuid FK,
  ten_dich_vu     text,
  so_buoi_tong    integer,
  so_buoi_da_dung integer,
  so_buoi_con_lai integer,  -- computed
  gia_tri_the     integer,
  trang_thai      text,
  ngay_het_han    date
)
```

### Dịch Vụ & Khuyến Mãi
```sql
dich_vu (
  id                  uuid PK,
  ten                 text,
  mo_ta               text,
  gia_co_ban          integer,
  ti_le_hoa_hong      numeric,
  danh_muc            text,
  thoi_luong_phut     integer,
  hien_tren_menu      boolean DEFAULT true,
  is_active           boolean DEFAULT true
)

khuyen_mai (
  id              uuid PK,
  ten             text,
  dich_vu_id      uuid FK,
  gia_goc         integer,
  gia_km          integer,
  phan_tram_giam  integer GENERATED,  -- (gia_goc-gia_km)/gia_goc*100
  thoi_gian_bat_dau timestamptz,
  thoi_gian_ket_thuc timestamptz,
  anh_url         text,
  is_active       boolean
)
```

### Config & Marketing
```sql
cau_hinh (
  key   text PK,
  value text,
  mo_ta text
)
-- gio_tang_ca_don_gia=25000, ky_quy_moi_thang=500000
-- phat_nghi_t7=300000, phat_nghi_cn=500000

nhat_ky_hoat_dong (
  id            uuid PK,
  nguoi_dung_id uuid FK,
  hanh_dong     text,
  bang          text,
  du_lieu_cu    jsonb,
  du_lieu_moi   jsonb,
  created_at    timestamptz
)

homepage_config (
  key     text PK,
  value   jsonb,
  mo_ta   text
)
```

### Views
```sql
-- Số dư thực tế từng ví
so_du_vi_thuc_te:
  so_du_hien_tai = so_du_dau + thu_vao - chi_ra + ck_vao - ck_ra
  -- Loại trừ the_tra_truoc khỏi cashflow ví

-- Lịch sử giao dịch tổng hợp (UNION ALL 3 bảng)
lich_su_giao_dich_tong_hop:
  columns: id, ngay, loai, mo_ta, so_tien, dien_giai, created_at
```

---

## 5. QUY TẮC NGHIỆP VỤ

### 5.1 Tài Chính

```
Thực Thu     = Doanh Thu - Thẻ Trả Trước
               (thẻ TT không vào cashflow thực)
Lợi Nhuận   = Thực Thu - Tổng Chi
Số dư ví     = so_du_dau + thu vào - chi ra + CK vào - CK ra
```

**Kiểm tra số dư trước khi cho chi/chuyển — không được chi vượt số dư.**

Doanh thu 4 hình thức:
- `tien_mat` → ví Tiền Mặt
- `chuyen_khoan` → ví MB Bank
- `quet_the` → ví TP Bank (về sau 3-7 ngày)
- `the_tra_truoc` → ví Tiền Mặt (KH cũ, không bán mới)

Chuyển khoản nội bộ 3 chiều:
1. Tiền Mặt → MB Bank (bàn giao két cuối ngày)
2. TP Bank → MB Bank (tiền quẹt thẻ về)
3. MB Bank → Tiền Mặt (rút chi tiêu)

### 5.2 Lương

**Lương Cứng** (ngày 05 hàng tháng):
```
Thực Nhận = (Lương Cứng ÷ Số Ngày Tháng) × Ngày Công
          + Tăng Ca (tang_ca_gio × 25,000đ)
          - Phạt Nghỉ Không Phép
          - Ứng Lương Tháng Trước
          - Ký Quỹ Tháng Này (500,000đ)
```

**Lương Kinh Doanh** (ngày 15 hàng tháng):
```
= Hoa hồng dịch vụ (POS myspa.vn)
+ Hoa hồng bán thẻ liệu trình
+ Tiền tour (nếu có)
```

**Ngày Công — công thức chính xác:**
```
Ngày công = Số ngày tháng - Ngày không lương

OFF Phép (≤3 ngày/tháng) → KHÔNG trừ (có lương)
OFF Vượt (OV)            → trừ 1 ngày
OFF T7/CN (O7/O7X)       → trừ 2 ngày
he_so trong cham_cong thể hiện hệ số thực (0.79 nếu về sớm)

Ví dụ: Tháng 4/2026, Khánh Duy OFF 2 OV + 1 T7:
30 - (2×1) - (1×2) = 26 ngày công ✅
```

**Tăng Ca:**
```
< 15 phút  → KHÔNG tính
≥ 15 phút  → tang_ca_gio = (phút / 60) làm tròn 2 chữ số
Tiền       = tang_ca_gio × 25,000đ
Luôn cần Admin duyệt trước khi tính
```

**Ký Quỹ:**
```
Đóng: 500,000đ/tháng × 12 tháng liên tục
Hoàn trả: 6,000,000đ + thưởng 500,000đ = 6,500,000đ
Chỉ trừ ký quỹ cho NV có trang_thai='dang_dong'
```

**Giới hạn OFF:**
```
Mặc định:    3 ngày/tháng
Khánh Duy:   4 ngày/tháng (gioi_han_off_thang=4)
Lễ Tân:      max 1 người OFF cùng ngày
KTV:         max 2 người OFF cùng ngày
```

### 5.3 Kho Hàng

- `nhap_xuat_kho.so_luong` luôn > 0 (CHECK constraint)
- Dấu âm/dương xác định bởi `loai` ('nhap'/'xuat'/'dieu_chinh')
- Khi điều chỉnh: `so_luong = Math.abs(new_value - old_value)`
- Khi xóa nhập kho: phải xóa cả `chi_phi` liên quan (cùng `chi_phi_id`)

---

## 6. CODING RULES — BẮT BUỘC

### Timezone
```javascript
// LUÔN dùng:
const getNowVN = () => new Date(
  new Date().toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' })
)
const todayISO = () => getNowVN().toISOString().slice(0, 10)

// KHÔNG bao giờ dùng new Date() trực tiếp
// (Server/Vercel chạy UTC, khác VN 7 tiếng)
```

### Số tiền
```javascript
// Lưu DB: INTEGER (VNĐ, không dùng float)
// Hiển thị:
const fmt = n => new Intl.NumberFormat('vi-VN').format(n) + 'đ'
// Input: cho phép nhập "2.000.000" → parse về integer
const parseVND = s => parseInt(String(s).replace(/\D/g, ''), 10) || 0
```

### Supabase Query
```javascript
// Foreign table join — phải explicit FK column:
.select('id, khach_hang:khach_hang_id(ho_ten)')
// KHÔNG dùng:
.select('id, khach_hang(ho_ten)')  // sai!

// Mọi Supabase query phải có try/catch + toast error
```

### UI Style
```javascript
// Dùng INLINE STYLES, không dùng Tailwind class
// Màu sắc lấy từ object C hoặc LUX định nghĩa đầu file
// Mỗi admin page = 1 file lớn (500-1000 lines)
// Sub-components define trong cùng file, trừ khi dùng toàn hệ thống
```

### DatePicker
```javascript
// KHÔNG dùng <input type="date">
// LUÔN dùng component DatePicker.jsx từ src/components/shared/
```

### Git Workflow
```bash
npm run build  # Kiểm tra lỗi TRƯỚC khi push
git push       # → Vercel tự deploy
# KHÔNG push: .env, .env.import (đã gitignore)
```

### Supabase Service Role Key
```
Chỉ dùng trong: Edge Functions, import scripts Python
KHÔNG để trong frontend code
Lưu trong: .env.import (gitignored)
```

---

## 7. VIỆC CẦN LÀM — ƯU TIÊN RÕ RÀNG

### 🔴 Cấp 1 — Quan trọng nhất (làm ngay)

| # | Việc cần làm | Lý do |
|---|---|---|
| 1.1 | Thêm CNAME `www.hannahspa.vn → cname.vercel-dns.com` tại DNS (zonedns.vn) | Domain www chưa hoạt động |
| 1.2 | Nhập data thật từ Google Sheets vào Supabase (từ 01/01/2026) | Báo cáo còn trống |
| 1.3 | Cập nhật `so_du_dau` trong bảng `vi` sau khi chốt sổ | Số dư ví không chính xác |
| 1.4 | Test Lễ Tân (Khánh Duy/Ngọc Phương) nhập liệu thực tế tại spa | User acceptance test |
| 1.5 | Verify Resend.com gửi email domain `hannahspa.vn` | Hiện tạm dùng `onboarding@resend.dev` |
| 1.6 | **Bảng lương tự động cuối tháng** | Tính lương ngày 05 |
| 1.7 | **Phiếu lương PDF từng nhân viên** | Sau khi có bảng lương |

### 🟡 Cấp 2 — Tính năng cần thiết (1-2 tháng)

| # | Việc cần làm | Notes |
|---|---|---|
| 2.1 | Quỹ ngày OFF từ ngày lễ — UI | Table `quy_ngay_off` đã có |
| 2.2 | Seed `dich_vu` thật (300+ DV, 10 danh mục) | Import từ MySpa |
| 2.3 | Seed nội dung `homepage_config` thật | |
| 2.4 | Module CRM Khách hàng: danh sách + đăng ký + phân hạng | Schema đã có |
| 2.5 | Module Thẻ liệu trình: UI danh sách + báo cáo | Schema đã có |
| 2.6 | Admin tạo OFF trực tiếp cho NV | `nguon='admin'` trong `dang_ky_off` |
| 2.7 | Báo cáo Commission KTV | Cần sau khi có POS |
| 2.8 | **Giao diện Mobile** — responsive sidebar + cards | Admin hiện chỉ tối ưu desktop |
| 2.9 | **In hoá đơn nhiệt** — khổ 80mm, thermal printer | Chờ anh Nam gửi mẫu hoá đơn |

### 🟢 Cấp 3 — Nice-to-have (3-6 tháng)

| # | Việc cần làm |
|---|---|
| 3.1 | Module POS Bán Hàng (xem phần 8) |
| 3.2 | Module Đặt Hẹn / Lịch Hẹn |
| 3.3 | Shop Mỹ Phẩm online (`/shop`) |
| 3.4 | Nhắc lịch tái khám tự động (email/Zalo) |
| 3.5 | Xuất báo cáo PDF/Excel |
| 3.6 | Push notification: OFF mới, cảnh báo kho |
| 3.7 | Auth thật Supabase thay MOCK_USERS (checkin) |

---

## 8. KẾ HOẠCH TÍCH HỢP MYSPA → HSMS

### Vấn đề hiện tại

Dữ liệu đang bị split thành 2 nguồn rời rạc:

```
MySpa:                    HSMS:
✅ Doanh thu POS          ✅ Chi phí 37 mục
✅ Commission KTV         ✅ Nhân sự + ký quỹ
✅ Thẻ liệu trình         ✅ Email báo cáo 21:00
✅ Lịch hẹn               ❌ Không có doanh thu POS
✅ 4,944 thẻ KH           ❌ Không có commission

→ Lợi nhuận thực tế KHÔNG AI TÍNH ĐƯỢC TỰ ĐỘNG
```

### Số liệu thực tế MySpa (Tháng 05/2026)

| Chỉ số | Giá trị |
|---|---|
| Tổng doanh thu tháng 5 | 52,360,000đ (133 lượt TT) |
| Doanh thu năm 2026 | 855,292,000đ |
| Khách chuyển khoản | 38,152,000đ (73%) |
| Khách tiền mặt | 13,338,000đ (25%) |
| Khách quẹt thẻ | 870,000đ (2%) |
| DT thẻ chưa thực hiện | 101,031,643đ |
| Công nợ KH tháng 5 | 2,345,000đ |
| Tổng nợ năm 2026 | 3,645,000đ |
| Tổng thẻ liệu trình | 4,944 thẻ |
| Tổng dịch vụ | 300+ (10 danh mục) |
| Tổng SP bán | 300+ SKU |
| Vật tư tiêu hao | 310+ mục |

### Phân tích 11 Module MySpa vs HSMS

| Module | MySpa | HSMS | Ưu tiên |
|---|---|---|---|
| M1 · Thu chi | ✅ Cơ bản | ✅ Vượt trội | Done |
| M2 · Nhân sự | Cơ bản | ✅ Vượt trội | Done |
| M3 · Commission KTV | ✅ Đầy đủ | ❌ Chưa có UI | Cần sau POS |
| M4 · Bán hàng POS | ✅ Core feature | ❌ Chưa có | 🔴 Cao |
| M5 · Đặt hẹn | ✅ Calendar đầy đủ | ❌ Chưa có | 🟡 Trung bình |
| M6 · Thẻ liệu trình | ✅ 4,944 thẻ | ⚠️ DB có, chưa UI | 🟡 Trung bình |
| M7 · CRM Khách hàng | ✅ Đầy đủ | ⚠️ DB có, chưa UI | 🟡 Trung bình |
| M8 · Sản phẩm + Kho | ✅ 4 kho riêng | ⚠️ Có cơ bản | Hoàn thiện |
| M9 · Dịch vụ + DM | ✅ 300+ DV | ⚠️ Schema có | Seed data |
| M10 · Báo cáo tổng hợp | ✅ Đầy đủ | ⚠️ Chỉ có thu chi | Sau POS |
| M11 · Cài đặt hệ thống | ✅ Chi tiết | ⚠️ Cơ bản | Nice-to-have |

### Roadmap 3 giai đoạn

#### Giai đoạn A — Ngay bây giờ (2 tuần)
- [ ] Bảng lương tự động (Module Nhân Sự hoàn chỉnh)
- [ ] Phiếu lương PDF
- [ ] Script đồng bộ dữ liệu doanh thu MySpa → HSMS hàng tối 20:30
  - Đọc export MySpa qua Google Sheets hoặc API
  - Insert vào `doanh_thu` tự động
- [ ] Fix DNS `www.hannahspa.vn`

#### Giai đoạn B — 1-2 tháng
- [ ] Module CRM: danh sách KH, đăng ký mới, phân hạng
- [ ] Seed 300+ dịch vụ từ MySpa vào bảng `dich_vu`
- [ ] Module Thẻ liệu trình: UI danh sách, checkout buổi, báo cáo
- [ ] Import data KH từ MySpa vào `khach_hang`
- [ ] Báo cáo commission KTV

#### Giai đoạn C — 3-6 tháng (HSMS độc lập hoàn toàn)
- [ ] **Module POS Bán Hàng** — tính năng cốt lõi:
  - Tạo đơn hàng, chọn DV theo danh mục
  - Chọn KTV thực hiện + ghi commission tự động
  - Checkout thẻ liệu trình (trừ buổi tự động)
  - Thanh toán đa PTTT (TM + CK + Quẹt thẻ trong 1 đơn)
  - Ghi nợ / công nợ KH
  - In hóa đơn / gửi ZNS cảm ơn
- [ ] Module Đặt Hẹn: calendar, trạng thái lịch hẹn, đặt online
- [ ] Báo cáo tổng hợp đầy đủ: DV, SP, commission, công nợ
- [ ] **Deploy production** `hannahspa.vn` — ngưng dùng MySpa hoặc chạy song song
- [ ] Auth thật Supabase cho toàn bộ hệ thống

### Schema bổ sung cần tạo cho POS

```sql
-- Khi xây Module POS
don_hang (
  id              uuid PK,
  ma_don          text UNIQUE,  -- DH-XXXXX
  khach_hang_id   uuid FK,      -- NULL nếu khách lẻ
  tong_tien       integer,
  giam_gia        integer,
  thanh_tien      integer,
  trang_thai      text,         -- cho_thanh_toan | da_thanh_toan | huy
  ghi_chu         text,
  nguoi_tao       uuid FK,
  created_at      timestamptz
)

don_hang_chi_tiet (
  id              uuid PK,
  don_hang_id     uuid FK,
  dich_vu_id      uuid FK,      -- NULL nếu checkout thẻ
  the_lieu_trinh_id uuid FK,    -- NULL nếu dịch vụ thường
  nhan_vien_id    uuid FK,      -- KTV thực hiện
  so_luong        integer DEFAULT 1,
  don_gia         integer,
  thanh_tien      integer,
  commission_pct  numeric,
  commission_tien integer
)

thanh_toan (
  id              uuid PK,
  don_hang_id     uuid FK,
  hinh_thuc       text,         -- tien_mat | chuyen_khoan | quet_the
  so_tien         integer,
  created_at      timestamptz
)
```

---

## 9. QUY TRÌNH VẬN HÀNH THỰC TẾ

### Lịch trình hàng ngày

| Thời gian | Hoạt động |
|---|---|
| 9:15 | Spa mở cửa |
| 19:30 | Ngưng nhận khách |
| 19:30 – 20:30 | Lễ Tân nhập liệu tại `/app` (doanh thu + chi phí ngày) |
| 20:00 | Đóng cửa chính thức |
| 21:00 | Email báo cáo tự động → `hannahspa.nm@gmail.com` |
| Sáng hôm sau | Nhập bổ sung nếu còn thiếu |

### Email báo cáo 21:00 bao gồm
- Doanh Thu (4 hình thức) | Tổng Thu | Tổng Chi
- Chi Tiết Chi Phí | Lợi Nhuận | Số Dư 3 Ví | Tổng Tài Sản

### Quy trình sửa lỗi
```
Lễ Tân phát hiện sai
  → Gửi yêu cầu sửa/xóa trong app
  → Anh Nam duyệt từ /admin → TabXetDuyet
  → Có thể xử lý từ Mỹ qua điện thoại
```

### Tài khoản email báo cáo
```
To:  quocnam2201@gmail.com
CC:  diemmy241292@gmail.com, khanhduy100102@icloud.com
From: onboarding@resend.dev (tạm thời)
     → Đổi sang hannahspa@hannahspa.vn sau khi verify domain
```

---

## 10. GHI CHÚ KỸ THUẬT QUAN TRỌNG

### Cấu trúc thư mục

```
src/
├── App.jsx                     # Route chính + ErrorBoundary
├── main.jsx
├── constants/
│   ├── colors.js               # Hannah Luxury palette (object LUX/C)
│   ├── enums.js                # VAI_TRO, HINH_THUC_THU, MOCK_USERS
│   └── routes.js
├── lib/
│   ├── supabase.js             # Supabase client
│   └── utils.js                # formatCurrency, todayISO, getNowVN
├── hooks/
│   ├── useVi.js                # Query từ view so_du_vi_thuc_te
│   ├── useClock.js
│   └── useAuth.js
├── context/
│   ├── AuthContext.jsx         # Auth thật (Supabase)
│   └── AppContext.jsx          # Toast, form state
├── services/
│   ├── viService.js
│   ├── giaoDichService.js
│   └── danhMucService.js
├── components/
│   ├── layout/
│   │   ├── SplashScreen.jsx
│   │   └── BottomNav.jsx
│   ├── ui/
│   │   └── Toast.jsx
│   └── shared/
│       ├── DatePicker.jsx      # DÙNG CHUNG — không dùng <input type="date">
│       ├── ErrorBoundary.jsx   # Toàn cục, bọc App
│       ├── FABMenu.jsx
│       ├── SoTienInput.jsx
│       └── ViSelector.jsx
└── apps/
    ├── internal/               # /app — Lễ Tân
    │   ├── InternalApp.jsx
    │   ├── tong-quan/
    │   ├── tai-khoan/
    │   ├── thu-chi/
    │   │   ├── NhapLieuPage.jsx
    │   │   ├── DoiSoatNgay.jsx    # Chốt số dư ví
    │   │   └── forms/
    │   │       ├── FormDoanhThu.jsx
    │   │       ├── FormChiPhi.jsx
    │   │       └── FormChuyenKhoan.jsx
    │   ├── bao-cao/
    │   └── cai-dat/
    ├── checkin/                # /checkin — KTV
    │   ├── CheckinApp.jsx
    │   ├── CheckinHome.jsx
    │   ├── CheckinChamCong.jsx
    │   ├── CheckinLich.jsx
    │   ├── CheckinDangKyOff.jsx
    │   └── CheckinDoiPin.jsx
    ├── admin/                  # /admin — Anh Nam
    │   ├── AdminApp.jsx
    │   ├── dashboard/AdminDashboardPage.jsx
    │   ├── nhan-su/AdminNhanSuPage.jsx
    │   ├── kho-hang/AdminKhoHangPage.jsx
    │   ├── marketing/AdminMarketingPage.jsx
    │   ├── khuyen-mai/AdminKhuyenMaiPage.jsx
    │   └── trang-chu/AdminHomepagePage.jsx
    ├── website/                # hannahspa.vn/
    │   └── LandingPage/ (12 sections)
    ├── customer/               # /menu — iPad
    │   └── CustomerMenuApp.jsx
    └── shop/                   # /shop — tương lai

supabase/
├── migrations/                 # 3 file SQL đã tạo 08/05/2026
└── functions/
    └── send-report/            # Edge Function email 21:00

scripts/
├── import-thang4.py            # Đã chạy xong (243 records T4/2026)
├── fix-code.py                 # Replace code tự động
├── audit_thu_chi.py            # Audit sổ thu chi
└── ...các scripts fix data khác

docs/
└── myspa-screenshots/          # 30 ảnh MySpa (đã phân tích)

Landing Page Hannah Spa/        # Thư mục landing page riêng

.env                            # VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
.env.import                     # SUPABASE_URL, SUPABASE_KEY (service_role) — gitignored
```

### Scripts Desktop (Windows)

```bat
Hannah-Spa-Dev.bat  → mở VS Code + npm run dev (localhost:5173)
git-push.bat        → git add . && git commit && git push
```

### Phân quyền Supabase RLS

```
ADMIN (quocnam2201@gmail.com):
  → Toàn bộ hệ thống, mọi bảng
  → Duyệt OFF, tăng ca từ Mỹ
  → Xem lương tất cả NV

LỄ TÂN (KhanhDuy, NgocPhuong):
  → Nhập: doanh_thu, chi_phi, chuyen_khoan_noi_bo
  → Xem: đối soát ngày, số dư ví
  → Chấm công thay khi NV quên
  → KHÔNG xem: lương người khác, báo cáo tổng

KTV + TẠP VỤ (8 người):
  → Check-in/out bằng PIN
  → Xem lịch bản thân
  → Đăng ký OFF
  → KHÔNG xem: thu chi, lương người khác
```

### Google Sheets Phase 1 (để migrate data)

```
Phase 1 chạy song song từ 26/11/2025 (Google Forms + Sheets + Apps Script)
Đã migrate: tháng 4/2026 (243 records)
Cần migrate: từ 01/01/2026 đến nay

File IDs:
  Sổ Thu Chi Master:     1gf3vRZ1GVOfuPddtenWklnD9U5LceI5D-rbrjJdMgEQ
  Dữ Liệu Doanh Thu:    1qJDsI0ZjqNJ5IKE6iWJOTHZtNd2rdld15fcrX3DzI2s
  Dữ Liệu Chi Phí:      1BtAuogJCu1rmozbLiadAmW6lXphRP1RRLweXKjiJLj4
  Dữ Liệu Chuyển Khoản: 1UmscTNtIo-DlNkLtQpC-guerEO-gnWsSm2usNlx2bP8
  Hồ Sơ Danh Mục:       18ScuGljIDYxaae2_uR4WkBfV4jMX3BelKyelCLsCNbk
```

---

## CHECKLIST NHANH CHO AI KHI BẮT ĐẦU SESSION MỚI

Khi nhận task mới, AI phải:

- [ ] Đọc file này để hiểu context đầy đủ
- [ ] Kiểm tra `npm run build` pass trước khi sửa
- [ ] Dùng `getNowVN()` thay `new Date()`
- [ ] Dùng `DatePicker.jsx` thay `<input type="date">`
- [ ] Inline styles, không Tailwind
- [ ] Số tiền lưu INTEGER, hiển thị `Intl.NumberFormat`
- [ ] Sau khi sửa: `npm run build` → fix lỗi → `git push`
- [ ] Không push `.env` hoặc `.env.import`

---

*Hannah Beauty & Spa | 39 Nam Kỳ Khởi Nghĩa, Cần Thơ | hannahspa.vn*
*HSMS Master Document v3.0 — Tổng hợp bởi Claude Sonnet 4.6 — 08/05/2026*
