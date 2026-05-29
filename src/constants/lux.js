// ═══════════════════════════════════════════════════════════════════════════════
// Hannah Spa — Backward Compatibility Layer
// Cập nhật: 11/05/2026 — Phase 0
// Re-export từ colors.js để 62 file đang dùng LUX không bị break
// Sẽ xóa file này sau khi migrate hết sang C tokens
// ═══════════════════════════════════════════════════════════════════════════════

import { C, FONT, RADIUS } from './colors'

export const LUX = {
  // Surfaces
  bg:       C.bg,
  surface:  C.bg,
  surface2: C.card,

  // Ink
  ink:  C.text,
  ink2: C.textSub,
  ink3: C.textMute,

  // Lines
  line:  C.border,
  line2: C.borderLight,

  // Brand Espresso
  espresso:  '#3d2c20',
  espresso2: '#5a4030',

  // Accent tones
  taupe:      C.primary,
  champagne:  C.gold,
  champagne2: '#b08a55',
  gold:       C.gold,
  rose:       '#b87a6a',
  sage:       '#7a8a6a',
  danger:     C.danger,

  // Gradients
  heroGrad: C.heroGrad,
  goldGrad: C.grad,

  // Border Radius
  radius:   `${RADIUS.lg}px`,
  radiusSm: `${RADIUS.sm}px`,
  radiusLg: `${RADIUS.xl}px`,

  // Shadows
  shadowSm: C.shadowSm,
  shadow:   C.shadow,
  shadowLg: C.shadowLg,

  // Typography
  fontSerif: FONT.serif,
  fontSans:  FONT.sans,
  fontMono:  FONT.mono,
}

// Menu accent config — giữ nguyên
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
  {
    key: 'holiday',
    title: 'Quỹ Ngày Lễ',
    desc: 'Tích lũy ngày OFF cho NV đi làm ngày lễ',
    accent: '#5a8a6a', iconBg: '#e0f0e8', iconFg: '#3a6a4a',
    icon: 'calendar',
  },
]
