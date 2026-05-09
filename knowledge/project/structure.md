# Cấu Trúc Dự Án

> Xác minh lần cuối: 08/05/2026

```
hsms/
├── App.jsx                        # Router gốc (dùng path, không dùng react-router)
├── main.jsx                       # Điểm vào
├── index.css                      # Tailwind base
├── App.css                        # Style toàn cục
├── package.json                   # React 19 + Vite 8 + Supabase
├── vite.config.js
├── CLAUDE.md                      # Tài liệu master (có thể lỗi thời)
│
├── src/
│   ├── constants/
│   │   ├── colors.js              # Bảng màu COLORS (gold/nâu luxury)
│   │   ├── lux.js                 # Hệ thống thiết kế LUX + LUX_MENU
│   │   ├── routes.js              # Hằng số đường dẫn
│   │   ├── enums.js               # VAI_TRO, LOAI_GIAO_DICH, HINH_THUC_THU
│   │   └── galleryImages.js       # HERO_BG, ABOUT_IMG, v.v.
│   │
│   ├── context/
│   │   ├── AuthContext.jsx         # Supabase auth + truy vấn profiles
│   │   └── AppContext.jsx          # Toast + trạng thái form
│   │
│   ├── hooks/
│   │   ├── useVi.js               # Số dư ví thời gian thực
│   │   ├── useClock.js            # Đồng hồ múi giờ VN
│   │   ├── useCMS.js              # Homepage config có cache
│   │   └── useAuth.js             # Auth hook (Supabase)
│   │
│   ├── lib/
│   │   ├── supabase.js            # Supabase client
│   │   ├── luong.js               # Engine tính lương (253 dòng)
│   │   └── utils.js               # formatCurrency, hashPin, getNowVN, todayISO
│   │
│   ├── services/
│   │   └── viService.js           # Service CRUD ví
│   │
│   ├── components/
│   │   ├── layout/
│   │   │   ├── BottomNav.jsx      # Thanh điều hướng dưới cùng
│   │   │   └── SplashScreen.jsx   # Màn hình splash (2.6s)
│   │   ├── shared/
│   │   │   ├── AvatarUpload.jsx
│   │   │   ├── ConfirmDialog.jsx
│   │   │   ├── DatePicker.jsx     # Lịch tùy chỉnh (dùng thay <input type="date">)
│   │   │   ├── ErrorBoundary.jsx  # Error boundary toàn cục
│   │   │   ├── FABMenu.jsx        # Nút nổi
│   │   │   ├── ImageUpload.jsx
│   │   │   └── LazyImage.jsx
│   │   └── ui/
│   │       ├── Toast.jsx          # Thông báo toast
│   │       ├── Modal.jsx          # Modal chung
│   │       ├── Card.jsx           # Card component
│   │       ├── Button.jsx         # Button component
│   │       └── EmptyState.jsx     # Trạng thái rỗng
│   │
│   └── apps/
│       ├── auth/
│       │   └── LoginPage.jsx
│       │
│       ├── website/               # hannahspa.vn/
│       │   ├── HomePage.jsx       # /portal — cổng nhân viên
│       │   ├── LandingPage.jsx    # / — landing công khai
│       │   └── sections/          # 15 section files (12 active in LandingPage.jsx)
│       │
│       ├── pos/                   # /pos — POS Bán Hàng (MỚI 08/05/2026)
│       │   ├── PosApp.jsx         # Main layout (2 cột: catalog + cart)
│       │   ├── PosProductCatalog.jsx  # Browse DV/SP/Thẻ
│       │   ├── PosCart.jsx        # Giỏ hàng + quản lý dòng
│       │   ├── PosPaymentModal.jsx    # Thanh toán đa PTTT
│       │   ├── PosCustomerSelect.jsx  # Tìm/thêm nhanh KH
│       │   └── PosOrderHistory.jsx    # Lịch sử đơn + hủy
│       │
│       ├── customer/              # /menu — iPad
│       │   └── CustomerMenuApp.jsx
│       │
│       ├── checkin/               # /checkin — KTV điện thoại
│       │   ├── CheckinApp.jsx
│       │   ├── CheckinLogin.jsx
│       │   ├── CheckinHome.jsx
│       │   ├── CheckinChamCong.jsx
│       │   ├── CheckinDangKyOff.jsx
│       │   ├── CheckinLich.jsx
│       │   ├── CheckinLuong.jsx
│       │   ├── CheckinDoiPin.jsx
│       │   ├── CheckinDoiAvatar.jsx
│       │   └── styles.css
│       │
│       ├── internal/              # /SoThuChi — Lễ Tân
│       │   ├── InternalApp.jsx
│       │   ├── tong-quan/TongQuanPage.jsx
│       │   ├── tai-khoan/TaiKhoanPage.jsx + ChiTietGiaoDich.jsx
│       │   ├── thu-chi/
│       │   │   ├── NhapLieuPage.jsx
│       │   │   ├── DoiSoatPage.jsx
│       │   │   ├── DoiSoatNgay.jsx
│       │   │   ├── NopTienMat.jsx
│       │   │   └── forms/ (FormDoanhThu, FormChiPhi, FormChuyenKhoan)
│       │   ├── bao-cao/
│       │   │   ├── BaoCaoPage.jsx
│       │   │   └── components/ (Ngay, Tuan, Thang, Nam, DongTien, PhanTichDoanhThu, PhanTichChiPhi)
│       │   └── cai-dat/
│       │       ├── CaiDatPage.jsx
│       │       └── components/ (DanhMuc, DoanhThu, Vi, ThongTinSpa, NhanVien, User, DonChungTu, DoiMatKhau, PheDuyetThuChi)
│       │
│       └── admin/                 # /admin — Chỉ Admin
│           ├── AdminApp.jsx
│           ├── dashboard/AdminDashboardPage.jsx
│           ├── nhan-su/
│           │   ├── AdminNhanSuPage.jsx
│           │   └── components/ (TabTongQuan, TabXetDuyet, TabLichDieuDong, TabHoSo, TabBangLuong, BangLuongImportPOS, AdminTaoOff, AdminSuaChamCong)
│           ├── khuyen-mai/AdminKhuyenMaiPage.jsx + ROITab.jsx
│           ├── trang-chu/AdminHomepagePage.jsx
│           ├── crm/AdminCRMPage.jsx
│           ├── kho-hang/AdminKhoHangPage.jsx
│           ├── marketing/AdminMarketingPage.jsx
│           └── dashboard/AdminDashboardPage.jsx
│
├── supabase/
│   ├── migrations/
│   │   ├── 001_hash_pins.sql
│   │   ├── 002_fix_so_du_view.sql
│   │   └── 003_fix_vi_loai_enum.sql
│   └── functions/send-report/     # Email báo cáo 21:00
│
├── scripts/                       # Script Python audit/sửa/nhập data
├── knowledge/                     # Cơ sở kiến thức MCP (thư mục này)
├── mcp-server/                    # Mã nguồn MCP server
├── docs/
└── .claude/                       # Cấu hình Claude Code
    ├── mcp.json
    └── settings.local.json
```
