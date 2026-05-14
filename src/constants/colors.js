// ═══════════════════════════════════════════════════════════════════════════════
// HSMS Design System — Hannah Luxury + MySpa UX
// Cập nhật: 11/05/2026 — Phase 0 Foundation
// Dùng chung cho TOÀN BỘ hệ thống (Admin + Internal + Checkin + POS + Web)
// ═══════════════════════════════════════════════════════════════════════════════

// ── COLOR TOKENS ────────────────────────────────────────────────────────────────
export const C = {
  // Background
  bg:           '#FAF7F4',
  card:         '#FFFFFF',
  sidebarBg:    '#1A1209',
  sidebarHover: '#2A2018',
  sidebarActive:'rgba(201,169,110,0.12)',

  // Text
  text:         '#1A1209',
  textSub:      '#8B7355',
  textMute:     '#B8A898',
  textInverse:  '#F5EDE0',

  // Accent
  gold:         '#C9A96E',
  primary:      '#A0714F',
  primaryDark:  '#7D5A3C',

  // Gradients
  grad:         'linear-gradient(135deg, #C9A96E 0%, #A0714F 45%, #7D5A3C 100%)',
  heroGrad:     'linear-gradient(155deg, #1A1209 0%, #2A1A0F 50%, #3D2C20 100%)',

  // Semantic
  thu:          '#2D7A4F',
  chi:          '#C0392B',
  taiSan:       '#1A5276',
  ck:           '#6C3483',
  warn:         '#E67E22',
  danger:       '#E74C3C',

  // Border & Shadow
  border:       'rgba(160,113,79,0.12)',
  borderLight:  'rgba(160,113,79,0.06)',
  shadowSm:     '0 2px 8px rgba(139,94,60,0.06)',
  shadow:       '0 4px 24px rgba(139,94,60,0.10)',
  shadowLg:     '0 12px 40px rgba(139,94,60,0.15)',

  // ── LUX Aliases (tương thích ngược code cũ chưa migrate) ─────────────────────
  ink:          '#1A1209',
  ink2:         '#8B7355',
  ink3:         '#B8A898',
  surface:      '#FAF7F4',
  surface2:     '#FFFFFF',
  line:         'rgba(160,113,79,0.12)',
  line2:        'rgba(160,113,79,0.20)',
  espresso:     '#1A1209',
  espresso2:    '#2A1A0F',
  taupe:        '#A0714F',
  champagne:    '#C9A96E',
  champagne2:   '#B08A55',
  rose:         '#B87A6A',
  sage:         '#7A8A6A',
  radius:       '18px',
  radiusSm:     '8px',
  radiusLg:     '24px',
  goldGrad:     'linear-gradient(135deg, #C9A96E 0%, #A0714F 45%, #7D5A3C 100%)',
}

// ── TYPOGRAPHY ──────────────────────────────────────────────────────────────────
export const FONT = {
  serif:  "'Lora', 'Playfair Display', serif",
  sans:   "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
  mono:   "'JetBrains Mono', monospace",
  script: "'Dancing Script', cursive",
}

// ── SPACING ─────────────────────────────────────────────────────────────────────
export const SPACE = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 }

// ── BORDER RADIUS ───────────────────────────────────────────────────────────────
export const RADIUS = { sm: 8, md: 12, lg: 16, xl: 24, full: 9999 }

// ── BUTTON SYSTEM ───────────────────────────────────────────────────────────────
export const BTN = {
  primary: {
    background: C.grad,
    color: '#FFFFFF',
    border: 'none',
    padding: '10px 20px',
    borderRadius: RADIUS.md,
    fontWeight: 600,
    cursor: 'pointer',
  },
  secondary: {
    background: C.card,
    color: C.primary,
    border: `1px solid ${C.border}`,
    padding: '10px 20px',
    borderRadius: RADIUS.md,
    fontWeight: 600,
    cursor: 'pointer',
  },
  danger: {
    background: C.chi,
    color: '#FFFFFF',
    border: 'none',
    padding: '10px 20px',
    borderRadius: RADIUS.md,
    fontWeight: 600,
    cursor: 'pointer',
  },
  ghost: {
    background: 'transparent',
    color: C.textSub,
    border: 'none',
    padding: '8px 12px',
    borderRadius: RADIUS.sm,
    cursor: 'pointer',
  },
}

// ── BADGE SYSTEM ────────────────────────────────────────────────────────────────
export const BADGE = {
  success:  { background: '#E8F5EE', color: C.thu },
  danger:   { background: '#FDEDEC', color: C.chi },
  warning:  { background: '#FEF5E7', color: C.warn },
  info:     { background: '#EBF5FB', color: C.taiSan },
  neutral:  { background: '#F5F2EF', color: C.textSub },
  primary:  { background: 'rgba(160,113,79,0.10)', color: C.primary },
  gold:     { background: 'rgba(201,169,110,0.12)', color: C.gold },
  style: {
    padding: '3px 10px',
    borderRadius: RADIUS.full,
    fontSize: '11px',
    fontWeight: 600,
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
  },
}

// ── TABLE SYSTEM ────────────────────────────────────────────────────────────────
export const TABLE = {
  headCell: {
    padding: '12px 16px',
    fontSize: '11px',
    fontWeight: 700,
    color: C.textSub,
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    background: '#FAF8F5',
    borderBottom: `1px solid ${C.border}`,
  },
  bodyCell: {
    padding: '12px 16px',
    fontSize: '13px',
    color: C.text,
    borderBottom: `1px solid ${C.borderLight}`,
  },
  rowHover: {
    background: 'rgba(201,169,110,0.04)',
  },
}

// ── CARD SYSTEM ─────────────────────────────────────────────────────────────────
export const CARD = {
  style: {
    background: C.card,
    borderRadius: RADIUS.lg,
    border: `1px solid ${C.border}`,
    boxShadow: C.shadowSm,
    padding: SPACE.lg,
  },
}

// ── INPUT SYSTEM ────────────────────────────────────────────────────────────────
export const INPUT = {
  style: {
    padding: '10px 14px',
    borderRadius: RADIUS.md,
    border: `1px solid ${C.border}`,
    fontSize: '13px',
    fontFamily: FONT.sans,
    color: C.text,
    background: C.card,
    outline: 'none',
    transition: 'border-color 0.2s',
  },
  focusBorder: C.primary,
}

// ── BACKWARD COMPATIBILITY ──────────────────────────────────────────────────────
// COLORS export giữ lại cho 18 file đang dùng (sẽ migrate dần sang C)
export const COLORS = {
  grad:        C.grad,
  bg:          C.bg,
  card:        C.card,
  border:      C.border,
  shadow:      C.shadow,
  text:        C.text,
  textSub:     C.textSub,
  textMute:    C.textMute,
  thu:         C.thu,
  chi:         C.chi,
  taiSan:      C.taiSan,
  chuyenKhoan: C.ck,
  gold:        C.gold,
  primary:     C.primary,
}
