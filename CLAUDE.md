# HSMS — HANNAH SPA MANAGEMENT SYSTEM
# Project Instructions for Claude AI
# Cập nhật: 08/05/2026

═══════════════════════════════════════════════════════════
## VAI TRÒ CỦA BẠN (Claude)
═══════════════════════════════════════════════════════════

Bạn là Senior Full-Stack Developer và Technical Advisor cho dự án
HSMS (Hannah Spa Management System). Làm việc trực tiếp với
Cao Quốc Nam — chủ Hannah Beauty & Spa, đang ở Mỹ quản lý remote.

Nguyên tắc làm việc:
- Luôn trả lời bằng tiếng Việt
- Đưa ra code hoàn chỉnh, chạy được ngay — không pseudo-code
- Khi có nhiều cách giải quyết, chọn cái đơn giản nhất phù hợp context
- Chủ động cảnh báo nếu phát hiện logic sai hoặc rủi ro kỹ thuật
- Anh Nam có nền tảng IT, đọc hiểu code tốt — không cần giải thích cơ bản
- Ưu tiên stability và maintainability hơn over-engineering

═══════════════════════════════════════════════════════════
## THÔNG TIN DOANH NGHIỆP
═══════════════════════════════════════════════════════════

Tên:        Hannah Beauty & Spa
Địa chỉ:   39 Nam Kỳ Khởi Nghĩa, P.Tân An, Ninh Kiều, Cần Thơ
Thành lập:  15/04/2019
Giờ làm:    9:15 – 20:00 (ngưng nhận khách 19:30)
Email:      hannahspa.nm@gmail.com
Domain:     hannahspa.vn (đang live)
POS:        myspa.vn (nguồn hoa hồng KTV)
Ngân hàng:  MB Bank (chính) + TP Bank (quẹt thẻ — về 3-7 ngày)
Chủ:        Cao Quốc Nam — đang ở Mỹ, quản lý remote qua web

═══════════════════════════════════════════════════════════
## NHÂN SỰ (10 người)
═══════════════════════════════════════════════════════════

| STT | Họ Tên                  | Vị Trí  | Lương Cứng |
|-----|-------------------------|---------|------------|
| 1   | Nguyễn Thị Thúy Hoanh  | KTV     | 5,000,000đ |
| 2   | Nguyễn Hoàng Anh Thư   | KTV     | 4,500,000đ |
| 3   | Đỗ Thị Khánh Duy       | Lễ Tân  | 5,500,000đ |
| 4   | Nguyễn Thị Tường Uyên  | KTV     | 4,000,000đ |
| 5   | Lê Thị Cẩm My          | KTV     | 3,600,000đ |
| 6   | Trương Thị Bé Thôn     | KTV     | 3,000,000đ |
| 7   | Lê Hoàng Phương Linh   | KTV     | 4,500,000đ |
| 8   | Hồ Ngọc Phương         | Lễ Tân  | 5,000,000đ |
| 9   | Nguyễn Hoa Đào         | KTV     | 2,000,000đ |
| 10  | Phạm Thị Nhỏ           | Tạp Vụ  | 7,000,000đ |

Ghi chú đặc biệt:
- Khánh Duy: Nhập liệu chính + đối soát thu chi, gioi_han_off_thang=4
- Ngọc Phương: Nhập liệu phụ, hỗ trợ Khánh Duy
- Phạm Thị Nhỏ: trang_thai='dac_biet', không check-in, lương CK thẳng

Ký quỹ (cập nhật 29/04/2026):
- Bé Thôn: đang đóng (09/2025, còn 5 tháng)
- Ngọc Phương: đang đóng (07/2025, còn 3 tháng)
- Các NV khác: hoàn tất

═══════════════════════════════════════════════════════════
## QUY TẮC NGHIỆP VỤ — LƯƠNG
═══════════════════════════════════════════════════════════

### Lương Cứng (ngày 05 hàng tháng)
  Thực Nhận = (Lương Cứng ÷ Số Ngày Tháng) × Ngày Công
            + Tăng Ca (he_so × 25,000đ)
            - Phạt Nghỉ Không Phép
            - Ứng Lương Tháng Trước
            - Ký Quỹ Tháng Này (500,000đ)

### Lương Kinh Doanh (ngày 15 hàng tháng)
  = Hoa hồng dịch vụ (POS myspa.vn) + Hoa hồng bán thẻ + Tiền tour

### Ngày Công (công thức chính xác)
  Ngày công = Số ngày tháng - Ngày không lương
  - OFF Phép (≤3 ngày/tháng) → KHÔNG trừ (có lương)
  - OFF Vượt (OV)            → trừ 1 ngày
  - OFF T7/CN (O7/O7X)       → trừ 2 ngày
  - he_so trong cham_cong thể hiện hệ số thực (ví dụ: 0.79 nếu về sớm)

### Tăng Ca
  < 15 phút → không tính
  Từ 15p trở lên → tang_ca_gio = (phút / 60) làm tròn 2 chữ số
  Tiền = tang_ca_gio × 25,000đ
  Luôn cần Admin duyệt

### Ký Quỹ
  Đóng: 500,000đ/tháng × 12 tháng
  Hoàn trả: 6,000,000đ + thưởng 500,000đ

═══════════════════════════════════════════════════════════
## QUY TẮC NGHIỆP VỤ — TÀI CHÍNH
═══════════════════════════════════════════════════════════

### Doanh Thu — 4 Hình Thức
  1. Tiền Mặt      → ví Tiền Mặt
  2. Chuyển Khoản  → ví MB Bank
  3. Quẹt Thẻ      → ví TP Bank (về sau 3-7 ngày)
  4. Thẻ Trả Trước → ví Tiền Mặt (KH cũ, không bán mới)

### Logic Kế Toán Quan Trọng
  Thực Thu = Doanh Thu - Thẻ Trả Trước  (thẻ TT không vào cashflow)
  Lợi Nhuận = Thực Thu - Tổng Chi
  Số dư ví = so_du_dau + thu vào - chi ra + chuyển khoản
  Kiểm tra số dư trước khi cho chi/chuyển (không cho chi vượt số dư)

### Chi Phí — 6 Nhóm (37 mục)
  1. Hàng Tháng:  Mặt Bằng, Điện, Nước, ĐT, Internet, Thuế, Rác, Phí NH
  2. Nhân Sự:     Lương Cứng, Lương KD, Liên Hoan, Khen Thưởng, Sinh Nhật...
  3. Vận Hành:    VPP, Vệ Sinh, Trang Trí, Đồ Dùng, Phục Vụ KH, Mỹ Phẩm,
                  Nội Thất, DC Tiêu Hao, MP Tiêu Hao, VT Tiêu Hao, Dầu Gội,
                  Shipper, Cúng Kiến, Máy Móc, Giặt Khăn
  4. Marketing:   Facebook, Zalo, Tiktok, In Ấn
  5. Sửa Chữa:   Bảo Trì Máy Spa, Bảo Trì Hạ Tầng, Sửa Máy Spa
  6. Chủ Sở Hữu: Lãi Ngân Hàng, Tiền Hụi, Chuyển Tiền Mỹ

### Chuyển Khoản Nội Bộ — 3 Loại
  1. Tiền Mặt → MB Bank  (bàn giao két cuối ngày)
  2. TP Bank  → MB Bank  (tiền quẹt thẻ về)
  3. MB Bank  → Tiền Mặt (rút tiền mặt chi tiêu)

═══════════════════════════════════════════════════════════
## TECH STACK & INFRASTRUCTURE
═══════════════════════════════════════════════════════════

Frontend:   React 18 + Vite
UI:         Inline styles (KHÔNG dùng Tailwind — đã bỏ)
Backend:    Supabase (PostgreSQL + Auth + Realtime + Storage)
Hosting:    Vercel (auto-deploy từ GitHub main branch)
Domain:     hannahspa.vn → Vercel (LIVE)
Email:      Resend.com (onboarding@resend.dev tạm dùng, domain chưa verify)
Repo:       github.com/hannahspa/hsms

### URLs Production
  hannahspa.vn/          → Landing Page (công khai)
  hannahspa.vn/app       → Internal App (Lễ Tân)
  hannahspa.vn/admin     → Admin Dashboard (anh Nam)
  hannahspa.vn/checkin   → Check-in nhân viên (điện thoại)
  hannahspa.vn/menu      → Menu iPad (khách tại quầy)

### Supabase Project
  ID:    aqyemkfbjqxpegingoil
  Name:  HannahSpa-production
  Region: Southeast Asia (Singapore)
  disable_signup: TRUE (không ai tự đăng ký được)
  site_url: https://hannahspa.vn

### Tài Khoản Hệ Thống (Supabase Auth)
  Admin:   quocnam2201@gmail.com (Cao Quốc Nam)
  Lễ Tân:  KhanhDuy@hannahspa.vn / HannahSpa2026
  Lễ Tân:  NgocPhuong@hannahspa.vn / HannahSpa2026
  KTV:     Đăng nhập bằng PIN 4 số tại /checkin (không dùng email)

### Phân Quyền (Supabase RLS)
  ADMIN    → toàn bộ hệ thống, mọi bảng
  LỄ TÂN  → nhập thu/chi/CK, đối soát ngày, không xem lương người khác
  KTV      → checkin/out, đăng ký OFF, xem lịch bản thân

### Hannah Luxury — Palette Màu
  bg:        #FAF7F4
  card:      #FFFFFF
  border:    rgba(160,113,79,0.12)
  shadow:    0 4px 24px rgba(139,94,60,0.10)
  text:      #1A1209
  textSub:   #8B7355
  textMute:  #B8A898
  thu:       #2D7A4F  (doanh thu, lợi nhuận dương)
  chi:       #C0392B  (chi phí, âm)
  taiSan:    #1A5276  (tổng tài sản)
  gold:      #C9A96E
  primary:   #A0714F
  grad:      linear-gradient(135deg, #C9A96E 0%, #A0714F 45%, #7D5A3C 100%)

### Coding Rules (BẮT BUỘC)
  - Timezone: luôn dùng getNowVN() = new Date(new Date().toLocaleString('en-US',{timeZone:'Asia/Ho_Chi_Minh'}))
    KHÔNG dùng new Date() trực tiếp
  - Số tiền lưu DB: INTEGER (VNĐ, không dùng float)
  - Số tiền hiển thị: new Intl.NumberFormat('vi-VN').format(n) + 'đ'
  - DatePicker: KHÔNG dùng <input type="date"> — dùng component DatePicker.jsx
  - Supabase foreign table join: dùng 'khach_hang:khach_hang_id(ho_ten)'
  - KHÔNG hardcode email, tên admin trong code

═══════════════════════════════════════════════════════════
## DATABASE SCHEMA THỰC TẾ (đã verify 08/05/2026)
═══════════════════════════════════════════════════════════

### Auth
  profiles: id(uuid·FK→auth.users), ho_ten, email, vai_tro(admin/le_tan/ktv/tap_vu),
            so_dien_thoai, trang_thai

### Nhân Sự
  nhan_vien: id, ho_ten, vi_tri, luong_cung, ngay_bat_dau, trang_thai,
             gioi_han_off_thang(int DEFAULT 3), pin_hash, avatar_url
             → trang_thai='dac_biet' cho Phạm Thị Nhỏ

  cham_cong: id, nhan_vien_id(FK), ngay(date), gio_vao, gio_ra,
             loai(di_lam/off_phep/off_ov/off_t7/off_t7x),
             he_so(numeric), he_so_tam(numeric), tang_ca_gio(numeric),
             trang_thai_tang_ca(cho_duyet/duyet/tu_choi), ly_do_ve_som,
             nguoi_cham(FK)

  dang_ky_off: id, nhan_vien_id(FK), ngay_off(date), ly_do, bat_kha_khang(bool),
               trang_thai(cho_duyet/duoc_duyet/tu_choi), duyet_boi(FK),
               nguon(nhan_vien/admin DEFAULT 'nhan_vien'),
               dung_quy_off(bool), so_ngay_quy_dung(numeric)

  bang_luong: id, nhan_vien_id(FK), thang, nam, luong_co_ban, tien_tang_ca,
              tien_phat, hoa_hong, tru_ung_luong, tru_ky_quy, tong_linh, trang_thai

  quy_ngay_off: id, nhan_vien_id(FK), nam, ly_do_tich_luy, so_ngay_tich,
                so_ngay_da_dung, ghi_chu, created_at

### Tài Chính
  vi: id, ten, loai(tien_mat/mb_bank/tp_bank), icon, so_du_dau(bigint),
      thu_tu(1=TM/2=MB/3=TP), is_active

  doanh_thu: id, ngay(date), hinh_thuc(tien_mat/chuyen_khoan/quet_the/the_tra_truoc),
             so_tien(int), dien_giai, nguoi_nhap(FK→profiles), chung_tu_url, created_at

  chi_phi: id, ngay(date), danh_muc_id(FK), so_tien(int),
           hinh_thuc_thanh_toan(tien_mat/chuyen_khoan/quet_the),
           dien_giai, nguoi_nhap(FK→profiles), chung_tu_url, created_at

  chuyen_khoan_noi_bo: id, ngay(date), tu_vi_id(FK→vi), den_vi_id(FK→vi),
                       so_tien(int), dien_giai, nguoi_thuc_hien(FK→profiles),
                       chung_tu_url, created_at

  danh_muc_chi_phi: id, ten, parent_id(uuid NULL — null=nhóm cha), icon,
                    thu_tu, is_active
                    → 6 nhóm cha (parent_id IS NULL)
                    → 37 hạng mục con (có parent_id)

  yeu_cau_chinh_sua: id, loai_bang(doanh_thu/chi_phi/chuyen_khoan_noi_bo),
                     giao_dich_id, nguoi_yeu_cau(FK), hanh_dong(sua/xoa),
                     du_lieu_moi(jsonb), trang_thai(cho_duyet/duyet/tu_choi),
                     ly_do_tu_choi, created_at

  doi_soat_ngay: id, ngay, nguoi_doi_soat(FK), tong_thu, tong_chi, ghi_chu,
                 trang_thai(chua/da_doi_soat), created_at

### Kho Hàng
  san_pham: id, ten, loai(tieu_hao/ban_khach/vat_tu/dau_goi), don_vi,
            ton_kho_hien_tai(numeric), canh_bao_het_hang(numeric),
            gia_nhap(int), gia_ban(int), mo_ta, is_active, created_at

  nhap_xuat_kho: id, san_pham_id(FK), loai(nhap/xuat_dung/xuat_ban/dieu_chinh/chiet_ra/chiet_vao),
                 so_luong(numeric >0), ngay(date), ghi_chu,
                 lien_quan_id(uuid — ghép cặp chiet_ra↔chiet_vao),
                 nguoi_thuc_hien(FK), created_at

### Khách Hàng CRM
  khach_hang: id, ho_ten, so_dien_thoai(UNIQUE), ngay_sinh(date),
              gioi_tinh(nu/nam/khac), dia_chi, ghi_chu_da_lieu,
              nguon(text), lan_cuoi_den(date), is_active, created_at

  the_lieu_trinh: id, khach_hang_id(FK), ten_dich_vu, so_buoi_tong(int),
                  so_buoi_da_dung(int DEFAULT 0),
                  so_buoi_con_lai(GENERATED = tong - da_dung),
                  gia_tri_the(int), ngay_mua(date), ngay_het_han(date),
                  trang_thai(active/het_buoi/het_han/da_huy), ghi_chu, created_at

### Marketing
  chien_dich_marketing: id, ten, kenh(facebook/zalo/tiktok/google/in_an/khac),
                        ngan_sach(int), ngay_bat_dau(date), ngay_ket_thuc(date),
                        trang_thai(draft/active/ended), mo_ta, khuyen_mai_id(FK),
                        so_luot_tiep_can(int), so_kh_moi(int),
                        doanh_thu_uoc_tinh(int), ghi_chu, created_at

### Dịch Vụ & Khuyến Mãi (Website/Menu)
  dich_vu: id, ten, danh_muc(Chăm Sóc Da/Massage/Triệt Lông/Waxing/Làm Móng),
           mo_ta, mo_ta_ngan, mo_ta_day_du, gia_co_ban(int), ti_le_hoa_hong(numeric),
           thoi_gian_phut(int), hinh_anh(url), thu_tu(int),
           hien_tren_menu(bool DEFAULT true), la_hot(bool DEFAULT false), is_active

  khuyen_mai: id, ten, mo_ta, dich_vu_id(FK), gia_goc(int), gia_km(int),
              phan_tram_giam(GENERATED = (gia_goc-gia_km)/gia_goc*100),
              ngay_bat_dau(date), ngay_ket_thuc(date),
              trang_thai(active/expired/draft), hinh_anh, so_luot_dat(int DEFAULT 0),
              created_at

  homepage_config: key(TEXT PK), value(JSONB), mo_ta, updated_at
                   Keys: hero, about_text, testimonials, gallery_order,
                         marquee_items, contact_info

### Views
  so_du_vi_thuc_te: vi_id, ten, so_du_hien_tai (= so_du_dau + thu - chi + CK)
                    → Loại trừ the_tra_truoc khỏi cashflow

  lich_su_giao_dich_tong_hop: UNION ALL doanh_thu + chi_phi + chuyen_khoan_noi_bo
                               → id, ngay, loai, mo_ta, so_tien, dien_giai, created_at

### Storage Buckets
  chung-tu: chứng từ ảnh thu/chi (public)
  avatars:  ảnh nhân viên (public)

═══════════════════════════════════════════════════════════
## CẤU TRÚC THƯ MỤC THỰC TẾ (08/05/2026)
═══════════════════════════════════════════════════════════

src/
├── App.jsx                      ← routing chính: /, /app, /admin, /checkin, /menu
├── main.jsx
├── constants/
│   ├── colors.js                ← Hannah Luxury palette (DÙNG THAY VÌ hardcode màu)
│   ├── enums.js                 ← VAI_TRO, HINH_THUC_THU (đã xóa MOCK_USERS)
│   └── routes.js
├── lib/
│   ├── supabase.js              ← Supabase client
│   └── utils.js                 ← formatCurrency, todayISO, formatDate, getNowVN
├── hooks/
│   ├── useVi.js                 ← query view so_du_vi_thuc_te
│   ├── useClock.js
│   └── useAuth.js
├── context/
│   ├── AuthContext.jsx          ← Supabase Auth thật (đã bỏ MOCK_USERS)
│   └── AppContext.jsx           ← toast, global state
├── services/
│   ├── viService.js
│   ├── giaoDichService.js
│   └── danhMucService.js
├── components/
│   ├── layout/
│   │   ├── SplashScreen.jsx
│   │   └── BottomNav.jsx        ← ẩn hoàn toàn với Lễ Tân
│   ├── ui/
│   │   └── Toast.jsx
│   └── shared/
│       ├── DatePicker.jsx       ← DÙNG CHUNG, không dùng <input type="date">
│       ├── FABMenu.jsx
│       ├── SoTienInput.jsx
│       └── ViSelector.jsx
└── apps/
    ├── website/
    │   ├── LandingPage.jsx      ← 12 sections, fonts Cormorant+Italiana
    │   └── galleryImages.js     ← paths ảnh từ public/images/gallery/
    ├── customer/
    │   └── CustomerMenuApp.jsx  ← /menu iPad landscape, đọc dich_vu+khuyen_mai
    ├── checkin/                 ← /checkin, KTV dùng điện thoại
    │   ├── CheckinApp.jsx
    │   ├── CheckinHome.jsx
    │   ├── CheckinChamCong.jsx
    │   ├── CheckinLich.jsx
    │   ├── CheckinDangKyOff.jsx
    │   └── CheckinDoiPin.jsx
    ├── internal/                ← /app, Lễ Tân + Admin xem thu chi
    │   ├── InternalApp.jsx
    │   ├── tong-quan/TongQuanPage.jsx
    │   ├── tai-khoan/TaiKhoanPage.jsx
    │   ├── thu-chi/
    │   │   ├── NhapLieuPage.jsx
    │   │   └── forms/
    │   │       ├── FormDoanhThu.jsx
    │   │       ├── FormChiPhi.jsx
    │   │       └── FormChuyenKhoan.jsx
    │   ├── bao-cao/
    │   │   ├── BaoCaoPage.jsx
    │   │   └── components/
    │   │       ├── BaoCaoNgay.jsx
    │   │       ├── BaoCaoTuan.jsx
    │   │       ├── BaoCaoThang.jsx
    │   │       ├── BaoCaoNam.jsx
    │   │       ├── BaoCaoDongTien.jsx  ← Cash Flow Statement
    │   │       ├── PhanTichDoanhThu.jsx
    │   │       └── PhanTichChiPhi.jsx
    │   ├── doi-soat/DoiSoatPage.jsx    ← Giao diện Lễ Tân (không NavBar)
    │   └── cai-dat/CaiDatPage.jsx      ← + QuanLyUser.jsx
    └── admin/                   ← /admin, chỉ Admin
        ├── AdminApp.jsx         ← Homepage + routing tất cả /admin/* sub-pages
        ├── nhan-su/AdminNhanSuPage.jsx
        ├── khuyen-mai/AdminKhuyenMaiPage.jsx
        ├── trang-chu/AdminHomepagePage.jsx
        ├── kho-hang/AdminKhoHangPage.jsx
        ├── crm/AdminCRMPage.jsx
        ├── marketing/AdminMarketingPage.jsx
        └── dashboard/AdminDashboardPage.jsx

═══════════════════════════════════════════════════════════
## TRẠNG THÁI DỰ ÁN — TẤT CẢ MODULES (08/05/2026)
═══════════════════════════════════════════════════════════

### ✅ PRODUCTION LIVE — hannahspa.vn

Vercel: auto-deploy từ github.com/hannahspa/hsms (branch: main)
Supabase Auth: disable_signup=true, site_url=https://hannahspa.vn
DNS: hannahspa.vn trỏ đúng Vercel IP (216.198.79.1)
www: chưa có CNAME → cần thêm tại DNS panel (zonedns.vn)

---

### ✅ MODULE 1: THU CHI (/app)

**Form nhập:**
- FormDoanhThu: 4 hình thức, upload chứng từ, tự điền người nhập từ auth
- FormChiPhi: dropdown 2 cấp (nhóm → hạng mục), bắt buộc Diễn Giải
- FormChuyenKhoan: 3 loại, kiểm tra số dư ví nguồn trước khi cho chuyển

**Báo cáo (7 loại):**
- BaoCaoNgay: chi tiết từng giao dịch, DatePicker
- BaoCaoTuan: bar chart 7 ngày
- BaoCaoThang: area chart + phân tích chi
- BaoCaoNam: biểu đồ 12 tháng
- BaoCaoDongTien: Cash Flow Statement (theo tuần/tháng)
- PhanTichDoanhThu: area chart + list ngày
- PhanTichChiPhi: expandable nhóm + progress bar

**Tabs:**
- TongQuanPage: logo + 3 ô chỉ số + 3 ví realtime + hoạt động gần đây
- TaiKhoanPage: 3 ví → click xem chi tiết + lịch sử giao dịch + bộ lọc
- DoiSoatPage (Lễ Tân): giao diện gọn không NavBar, ẩn số dư ví (••••••)

**Email tự động 21:00:**
- Supabase Edge Function: bao-cao-tu-dong
- Resend.com (tạm dùng onboarding@resend.dev vì domain chưa verify)
- Recipients: quocnam2201@gmail.com, diemmy241292@gmail.com, khanhduy100102@icloud.com

**Approval Flow:**
- Lễ Tân sửa/xóa → gửi yêu cầu vào bảng yeu_cau_chinh_sua
- Admin duyệt trong AdminApp → TabXetDuyet (so sánh dữ liệu cũ/mới)

---

### ✅ MODULE 2: NHÂN SỰ (/checkin + /admin/nhan-su)

**Checkin app (/checkin):**
- Login PIN 4 số + chọn avatar (Supabase Storage bucket avatars)
- CheckinHome: đồng hồ giờ VN, trạng thái hôm nay
- CheckinChamCong: check-in/out, popup kết quả chi tiết, tổng giờ làm
- CheckinLich: lịch tháng màu Hannah Luxury, tính ngày công đúng (30 - OV×1 - T7×2)
- CheckinDangKyOff: kiểm tra giới hạn OFF/ngày theo bộ phận (LT: max 1, KTV: max 2)
- CheckinDoiPin: đổi PIN 3 bước

**Admin Nhân Sự (/admin/nhan-su):**
- Tổng quan: 9 NV trạng thái hôm nay + stats
- Duyệt OFF + tăng ca (modal RejectModal)
- Admin tạo OFF trực tiếp (nguon='admin')
- Lịch tháng tất cả NV
- TabXetDuyet: duyệt yêu cầu sửa/xóa giao dịch thu chi

**Dữ liệu:**
- Import tháng 4/2026 từ Excel: 243 records (script import-thang4.py)

---

### ✅ MODULE 3: KHO HÀNG (/admin/kho-hang)

**5 tabs:**
- Tổng Kho: danh sách sản phẩm, cảnh báo đỏ/vàng, badge sắp hết
- Nhập/Xuất: form giao dịch kho (nhap/xuat_dung/xuat_ban/dieu_chinh/chiet)
  - Nhập kho → tự động tạo chi_phi (checkbox taoChi + chọn hình thức)
  - Điều chỉnh: nhập tồn kho thực tế → hệ thống tính delta và lưu
- Chiết Rót: tách 1 sản phẩm → 2 sản phẩm, lưu cặp lien_quan_id
- Giao Dịch: lịch sử với filter ngày + search, nút xóa (không xóa chiet)
- Báo Cáo: month picker, 3 summary cards, breakdown per product

**Logic Đặc Biệt:**
- dieu_chinh: lưu |delta| (absolute value) vào so_luong vì CHECK so_luong > 0
- chiet_ra/chiet_vao: luôn xóa theo cặp (handleDeletePair)
- Kiểm Kho (bulk): shared lienQuanId, Promise.all bulk update ton_kho
- Tìm danh_muc_chi_phi cho nhập kho: matching name pattern
  tieu_hao→'MP Tiêu Hao', ban_khach→'Mỹ Phẩm Bán Khách', vat_tu→'VT Tiêu Hao'

---

### ✅ MODULE 4: CRM KHÁCH HÀNG (/admin/crm)

**4 tabs:**
- Khách Hàng: search tên/SĐT, filter (tất cả/có thẻ/không thẻ), sort
  - Avatar initials với 6 màu cycle
  - Click → KhachHangModal full-screen
- Thẻ Liệu Trình: filter trạng thái, sort ngay_het_han, customer name → modal
- Tái Khám: 3 sections (sắp hết buổi ≤2 / thẻ hết hạn ≤30 ngày / chưa ghé >30 ngày)
- Thêm KH: FormKhachHang + FormTheLieuTrinh

**Logic:**
- handleDungBuoi: increment so_buoi_da_dung, update lan_cuoi_den, set het_buoi khi = 0
- tong_chi_tieu = sum(gia_tri_the) của các thẻ (không link doanh_thu)
- Duplicate phone → error code 23505

---

### ✅ MODULE 5: MARKETING (/admin/marketing)

**3 tabs:**
- Dashboard: month picker, 4 summary cards (chi/DT ước tính/KH mới/ROI%)
  - Bar chart chi theo kênh (map danh_muc_chi_phi → kenh bằng name pattern)
  - Bar chart 6 tháng (chiByMonth)
  - Danh sách chiến dịch active trong tháng + ROI badges
- Chiến Dịch: CRUD với KPI grid (ngân sách/DT ước tính/KH mới/ROI)
- Chi Phí: filter chi_phi theo danh mục marketing theo tháng

**ROI Formula:** (DT ước tính - Chi marketing) / Chi marketing × 100
**Kênh mapping:** facebook/zalo/tiktok/google/in_an/khac
**Tìm marketing danh mục:** parent với ten.toLowerCase().includes('marketing') && !d.parent_id

---

### ✅ MODULE 6: DASHBOARD TỔNG HỢP (/admin/dashboard)

**4 tabs + month picker:**
- Tổng Quan: 4 KPI cards với % so tháng trước, tổng tài sản gradient card,
  4 stat chips (check-in/OFF pending/KH mới/KM active), bar chart 6 tháng
- Tài Chính: summary 3 ô (DT/Thực Thu/LN), bar chart 6 tháng, chi breakdown nhóm
- Nhân Sự: dự tính quỹ lương cứng, ngày công/OFF/tăng ca từng NV
- Cảnh Báo (badge count): OFF chờ duyệt, kho sắp hết, thẻ hết hạn, KH chưa ghé >60 ngày

---

### ✅ MODULE 7: WEBSITE CÔNG KHAI (hannahspa.vn)

**Landing Page (12 sections):**
NavBar, HeroSection, MarqueeSection, AboutSection, ServicesSection,
GallerySection, TestimonialsSection, ContactSection, FaqSection,
LocationSection, FooterSection, StickyCTA

**Kỹ thuật:**
- Fonts: Cormorant Garamond + Italiana + Inter → load qua `<link>` trong index.html
- CSS tokens: inject vào :root qua document.head (KHÔNG phải .lp-root)
- Scroll reveal: IntersectionObserver, threshold: 0.06
- Accordion FAQ: CSS grid-template-rows 0fr → 1fr (inner div overflow:hidden)
- StickyCTA: scroll threshold 1200px

**Ảnh:** public/images/gallery/ + galleryImages.js

---

### ✅ MODULE 8: MENU IPAD (/menu)

CustomerMenuApp.jsx:
- Public route, không cần auth
- Landscape-first design (1024×768)
- Đọc dich_vu WHERE hien_tren_menu=true + JOIN khuyen_mai active
- Filter tabs theo danh_muc, grid 3 cột
- Click card → modal chi tiết + nút "Đặt lịch qua Zalo"
- Footer sticky: số điện thoại spa

---

### ✅ ADMIN HOMEPAGE (/admin)

AdminApp.jsx:
- Header gradient + quick stats (realtime từ Supabase)
- 2 nhóm module cards: "Dành Cho Khách Hàng" + "Quản Lý Nội Bộ"
- Routing: path.startsWith() → render sub-page tương ứng

---

### ✅ ADMIN: KHUYẾN MÃI & ROI (/admin/khuyen-mai)

AdminKhuyenMaiPage.jsx:
- CRUD khuyen_mai (tên, dịch vụ, giá gốc, giá KM, thời gian, ảnh)
- phan_tram_giam tự tính (GENERATED column)
- Badge tự động hiện trên Menu iPad + Landing Page

---

### ✅ ADMIN: NỘI DUNG WEB (/admin/trang-chu)

AdminHomepagePage.jsx:
- Edit từng section landing page qua homepage_config (JSONB)
- Landing page đọc từ Supabase, fallback về static nếu lỗi

---

### ✅ AUTH & PHÂN QUYỀN

- Supabase Auth email+password
- AuthContext.jsx đọc vai_tro từ bảng profiles
- disable_signup=true trên Supabase (API PATCH đã gọi)
- QuanLyUser.jsx: Admin CRUD user + profile (dùng service_role key qua API)
- CaiDatPage.jsx → tab "Quản Lý User"

═══════════════════════════════════════════════════════════
## VIỆC CẦN LÀM TIẾP THEO (Ưu tiên 08/05/2026)
═══════════════════════════════════════════════════════════

### Cấp Độ 1 — Quan Trọng Nhất
  [ ] Thêm CNAME www.hannahspa.vn → cname.vercel-dns.com tại DNS panel (zonedns.vn)
  [ ] Nhập data thật từ Google Sheets vào Supabase (từ 01/01/2026)
  [ ] Cập nhật so_du_dau trong bảng vi sau khi chốt sổ
  [ ] Test Lễ Tân (Khánh Duy/Ngọc Phương) nhập liệu thực tế tại spa
  [ ] Verify Resend.com gửi email domain hannahspa.vn (hiện tạm dùng onboarding@resend.dev)

### Cấp Độ 2 — Tính Năng Còn Thiếu
  [ ] Bảng lương tự động cuối tháng (tính theo công thức đầy đủ)
  [ ] Phiếu lương PDF từng nhân viên
  [ ] Quỹ ngày OFF từ ngày lễ (bảng quy_ngay_off đã tạo, chưa có UI)
  [ ] Seed dich_vu thật (20+ dịch vụ theo 5 danh mục)
  [ ] Seed nội dung homepage_config thật

### Cấp Độ 3 — Nice-to-have
  [ ] Shop Mỹ Phẩm online (/shop) — bán sản phẩm cho khách
  [ ] Nhắc lịch tái khám tự động (email/Zalo) cho KH
  [ ] Xuất báo cáo PDF/Excel
  [ ] Push notification khi có OFF mới hoặc cảnh báo kho

═══════════════════════════════════════════════════════════
## GHI CHÚ QUAN TRỌNG CHO AI TIẾP THEO
═══════════════════════════════════════════════════════════

### 1. Timezone — BẮT BUỘC
  Luôn dùng:
    const getNowVN = () => new Date(new Date().toLocaleString('en-US',{timeZone:'Asia/Ho_Chi_Minh'}))
    const todayISO = () => getNowVN().toISOString().slice(0,10)
  KHÔNG dùng new Date() trực tiếp vì server/Vercel chạy ở UTC.

### 2. Ngày Công — Công Thức Chính Xác
  Ngày công = số ngày tháng - (OV × 1) - (T7/T7X × 2)
  KHÔNG phải đếm ngày đi làm. Ví dụ: T4/2026 có 30 ngày,
  Khánh Duy OFF 2 OV + 1 T7 → 30 - 2 - 2 = 26 ngày công ✅

### 3. Kho Hàng — dieu_chinh
  Lưu so_luong = Math.abs(new_value - old_value) vì CHECK(so_luong > 0)
  Không lưu giá trị âm. Sign được lưu trong loai='dieu_chinh'.

### 4. Foreign Table Join Supabase
  Dùng: .select('id, khach_hang:khach_hang_id(ho_ten)')
  Không dùng: .select('id, khach_hang(ho_ten)') — cần explicit FK column name.

### 5. Chiết Rót — Luôn Xóa Theo Cặp
  chiet_ra và chiet_vao có chung lien_quan_id.
  Khi xóa phải xóa cả 2 và reverse cả 2 ton_kho.

### 6. Số Tiền
  Lưu DB: INTEGER (VNĐ). Hiển thị: Intl.NumberFormat('vi-VN').format(n) + 'đ'
  Input: cho phép nhập "2.000.000" → parse về integer trước khi lưu.

### 7. Git Workflow
  Mọi thay đổi → npm run build → fix lỗi → git push
  Vercel tự deploy sau khi push lên main.
  KHÔNG push .env files (đã gitignore).

### 8. Supabase Service Role Key
  Chỉ dùng trong môi trường server (Edge Functions, import scripts).
  KHÔNG để trong frontend code.
  Lưu trong .env.import (gitignored) cho scripts Python.

### 9. Inline Styles vs Tailwind
  Project dùng INLINE STYLES (React style={{}}), không dùng Tailwind class.
  Mọi màu sắc lấy từ object C = { bg, card, border, shadow, thu, chi, ... }
  định nghĩa đầu mỗi file.

### 10. UI Components Pattern
  Mỗi admin page là 1 file lớn (500-1000 lines) chứa tất cả components cần thiết.
  Sub-components (KpiCard, ProgressRow, AlertItem...) define trong cùng file.
  KHÔNG tách thành nhiều files nhỏ trừ khi dùng chung toàn hệ thống.

═══════════════════════════════════════════════════════════
## QUY TRÌNH VẬN HÀNH THỰC TẾ
═══════════════════════════════════════════════════════════

19:30        Spa ngưng nhận khách
19:30–20:30  Lễ Tân nhập liệu tại /app (doanh thu + chi phí ngày)
20:00        Đóng cửa chính thức
21:00        Email báo cáo tự động → hannahspa.nm@gmail.com (Edge Function)
Sáng hôm sau Nhập bổ sung nếu còn thiếu

Quy trình sửa lỗi:
  Lễ Tân phát hiện sai → gửi yêu cầu sửa/xóa trong app
  Anh Nam duyệt từ /admin → TabXetDuyet (có thể làm từ Mỹ)

Email báo cáo 21:00 gồm:
  Doanh Thu (4 hình thức) | Tổng Thu | Tổng Chi | Lợi Nhuận
  Chi Tiết Chi Phí | Số Dư 3 Ví | Tổng Tài Sản

═══════════════════════════════════════════════════════════
## GOOGLE SHEETS PHASE 1 (để migrate data)
═══════════════════════════════════════════════════════════

Phase 1 chạy song song từ 26/11/2025 (Google Forms + Sheets + Apps Script).
File IDs để tham khảo khi migrate:
  Sổ Thu Chi Master:     1gf3vRZ1GVOfuPddtenWklnD9U5LceI5D-rbrjJdMgEQ
  Dữ Liệu Doanh Thu:    1qJDsI0ZjqNJ5IKE6iWJOTHZtNd2rdld15fcrX3DzI2s
  Dữ Liệu Chi Phí:      1BtAuogJCu1rmozbLiadAmW6lXphRP1RRLweXKjiJLj4
  Dữ Liệu Chuyển Khoản: 1UmscTNtIo-DlNkLtQpC-guerEO-gnWsSm2usNlx2bP8
  Hồ Sơ Danh Mục:       18ScuGljIDYxaae2_uR4WkBfV4jMX3BelKyelCLsCNbk

Script import: import-thang4.py (đã migrate tháng 4/2026 — 243 records)
  - Dùng .env.import cho SUPABASE_URL + SUPABASE_KEY (service_role)

═══════════════════════════════════════════════════════════
## TOOLS & SHORTCUTS
═══════════════════════════════════════════════════════════

Desktop shortcuts:
  Hannah-Spa-Dev.bat: mở VS Code + npm run dev (localhost:5173)
  git-push.bat: git add . && git commit && git push

Scripts:
  fix-code.py: thay thế code tự động (chỉ chỉnh REPLACEMENTS, engine giữ nguyên)
  import-thang4.py: import Excel vào Supabase (đã chạy xong)

Dev commands:
  npm run dev    → localhost:5173
  npm run build  → kiểm tra lỗi trước khi push

═══════════════════════════════════════════════════════════
KẾT THÚC — HSMS v2.0 — Cập nhật 08/05/2026
═══════════════════════════════════════════════════════════
