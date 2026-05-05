// Hannah Spa — Luxury Design System
// Dùng cho Admin Dashboard và các trang cao cấp

export const LUX = {
  // ── Surfaces ─────────────────────────────────
  bg:       '#f5f0e8',
  surface:  '#fbf8f3',
  surface2: '#ffffff',

  // ── Ink ──────────────────────────────────────
  ink:  '#2a201a',
  ink2: '#5a4a3e',
  ink3: '#8a7868',

  // ── Lines ────────────────────────────────────
  line:  '#e8dfd2',
  line2: '#d9cdb9',

  // ── Brand Espresso ────────────────────────────
  espresso:  '#3d2c20',
  espresso2: '#5a4030',

  // ── Accent tones ─────────────────────────────
  taupe:      '#8a6a52',
  champagne:  '#c8a675',
  champagne2: '#b08a55',
  gold:       '#d4a574',
  rose:       '#b87a6a',
  sage:       '#7a8a6a',
  danger:     '#b85a4a',

  // ── Gradients ────────────────────────────────
  heroGrad: 'radial-gradient(circle at 100% 0%, rgba(212,165,116,0.35), transparent 60%), linear-gradient(155deg, #4a3528 0%, #3d2c20 50%, #2e2018 100%)',
  goldGrad: 'linear-gradient(180deg, #d4a574 0%, #b88a55 100%)',

  // ── Border Radius ─────────────────────────────
  radius:   '18px',
  radiusSm: '12px',
  radiusLg: '28px',

  // ── Shadows ───────────────────────────────────
  shadowSm: '0 2px 8px -2px rgba(60,40,25,0.08)',
  shadow:   '0 8px 32px -8px rgba(60,40,25,0.12), 0 2px 6px -2px rgba(60,40,25,0.06)',
  shadowLg: '0 24px 60px -16px rgba(60,40,25,0.22), 0 4px 12px -4px rgba(60,40,25,0.08)',

  // ── Typography ────────────────────────────────
  fontSerif: "'Cormorant Garamond', serif",
  fontSans:  "'Inter', -apple-system, sans-serif",
  fontMono:  "'JetBrains Mono', monospace",
}

// Menu accent config (dùng cho menu items ở dashboard)
export const LUX_MENU = [
  {
    key: 'status',
    title: 'Tình Trạng Nhân Sự',
    desc: 'Tổng quan chấm công, hiện diện hôm nay',
    accent: '#7a8a6a', iconBg: '#eef2e7', iconFg: '#5a6a4a',
    icon: 'chart',
  },
  {
    key: 'off',
    title: 'Xét Duyệt Đơn OFF',
    desc: 'Đơn xin nghỉ phép & nghỉ bù',
    accent: '#d4a574', iconBg: '#f5e9d4', iconFg: '#a07a45',
    icon: 'calendar-check',
  },
  {
    key: 'schedule',
    title: 'Lịch Làm Việc Tháng',
    desc: 'Phân ca theo ngày, theo nhân viên',
    accent: '#8a6a52', iconBg: '#ece2d4', iconFg: '#6a4a35',
    icon: 'calendar',
  },
  {
    key: 'employees',
    title: 'Hồ Sơ Nhân Viên',
    desc: '9 nhân viên · 3 vị trí',
    accent: '#b87a6a', iconBg: '#f1e3df', iconFg: '#8a5a4a',
    icon: 'users',
  },
  {
    key: 'salary',
    title: 'Bảng Lương',
    desc: 'Tính lương tự động theo chấm công',
    accent: '#c8a675', iconBg: '#ede0c9', iconFg: '#8a6a35',
    icon: 'wallet',
  },
]
