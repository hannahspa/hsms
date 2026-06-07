// ─── Hằng số + helper dùng chung module Lịch Hẹn ──────────────────────────────
// Tách từ LichHenPage.jsx (Phase 2 — tối ưu cấu trúc). Không đổi logic.
import { addDaysISO, getWeekdayISO } from '../../../lib/dateMath'

// ── Hannah Luxury Palette ──
export const C = {
  bg: '#FAF7F4', card: '#FFFFFF', line: 'rgba(160,113,79,0.14)', line2: 'rgba(160,113,79,0.22)',
  ink: '#1A1209', ink2: '#5a4a3e', ink3: '#8B7355', ink4: '#B8A898',
  gold: '#C9A96E', primary: '#A0714F', espresso: '#3d2c20',
  grad: 'linear-gradient(135deg, #C9A96E 0%, #A0714F 45%, #7D5A3C 100%)',
  shadow: '0 4px 24px rgba(139,94,60,0.10)', shadowLg: '0 8px 40px rgba(139,94,60,0.18)',
}

export const TRANG_THAI = {
  cho_xac_nhan: { label: 'Chờ Xác Nhận', bg: '#FFF6E6', color: '#B8860B', bar: '#E0A82E' },
  da_xac_nhan:  { label: 'Đã Xác Nhận',  bg: '#EAF4EC', color: '#2D7A4F', bar: '#3FA968' },
  da_xong:      { label: 'Hoàn Thành',   bg: '#E8F0FE', color: '#1a4f96', bar: '#3b78d4' },
  huy:          { label: 'Đã Hủy',       bg: '#F7E7E3', color: '#C0392B', bar: '#d8654f' },
}

// Giờ làm việc spa: 9h – 20h, mỗi slot 30 phút
export const HOUR_START = 9, HOUR_END = 20, SLOT_MIN = 30
export const ROW_H = 38  // chiều cao mỗi slot 30 phút (px)
export const SLOTS = []
for (let h = HOUR_START; h < HOUR_END; h++) { SLOTS.push(h * 60); SLOTS.push(h * 60 + 30) }

export const GIO_LIST = (() => {
  const list = []
  for (let h = HOUR_START; h <= HOUR_END; h++) {
    list.push(`${String(h).padStart(2, '0')}:00`)
    if (h < HOUR_END) list.push(`${String(h).padStart(2, '0')}:30`)
  }
  return list
})()

// Danh sách giờ mỗi 15 phút (00 15 30 45) — dùng cho modal đặt hẹn
export const GIO_LIST_15 = (() => {
  const list = []
  for (let h = HOUR_START; h <= HOUR_END; h++) {
    for (const mm of ['00', '15', '30', '45']) {
      if (h === HOUR_END && mm !== '00') break
      list.push(`${String(h).padStart(2, '0')}:${mm}`)
    }
  }
  return list
})()

export const DOW = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7']
export const fmtDate = iso => { if (!iso) return '—'; const [y, m, d] = iso.split('-'); return `${d}/${m}/${y}` }
export const dayOfWeek = iso => iso ? DOW[getWeekdayISO(iso)] : ''
export const gioToMin = g => { const [h, m] = String(g || '00:00').split(':').map(Number); return h * 60 + m }
export const shortName = n => { if (!n) return ''; const p = String(n).trim().split(/\s+/); return p.slice(-2).join(' ') }
export const getInitials = n => { if (!n) return '?'; const p = String(n).trim().split(' '); return (p[p.length - 1][0] || '').toUpperCase() }
export const normalizePhone = s => String(s || '').replace(/\D/g, '')
// Bỏ dấu tiếng Việt + thường hoá để tìm kiếm linh hoạt ("co vai" khớp "Cổ Vai")
export const removeAccent = s => String(s || '').normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase().trim()

export function dedupeHints(rows) {
  const seen = new Set()
  return rows.filter(row => {
    const key = `${normalizePhone(row.sdt_khach)}:${String(row.ten_khach || '').trim().toLowerCase()}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export function Avatar({ nv, size = 30 }) {
  if (nv?.avatar_url) return <img src={nv.avatar_url} alt="" style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: `1px solid ${C.line2}` }} />
  return <div style={{ width: size, height: size, borderRadius: '50%', flexShrink: 0, background: C.grad, color: '#2a1d14', fontSize: Math.round(size * 0.4), fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{getInitials(nv?.ho_ten)}</div>
}

// 7 ngày (T2→CN) của tuần chứa iso
export function weekDaysOf(iso) {
  const dow = getWeekdayISO(iso)
  const monday = addDaysISO(iso, -(dow === 0 ? 6 : dow - 1))
  return Array.from({ length: 7 }, (_, i) => addDaysISO(monday, i))
}
// Ma trận tháng (6 tuần × 7 ngày) chứa iso
export function monthMatrixOf(iso) {
  const [y, m] = iso.split('-').map(Number)
  const first = `${y}-${String(m).padStart(2, '0')}-01`
  const firstDow = getWeekdayISO(first)
  const start = addDaysISO(first, -(firstDow === 0 ? 6 : firstDow - 1))
  return Array.from({ length: 6 }, (_, w) => Array.from({ length: 7 }, (_, i) => addDaysISO(start, w * 7 + i)))
}
export const monthOf = iso => Number(iso.split('-')[1])
export const VIEW_TABS = [{ k: 'live', l: '🟢 Điều Phối' }, { k: 'day', l: 'Ngày' }, { k: 'week', l: 'Tuần' }, { k: 'month', l: 'Tháng' }, { k: 'list', l: '☰ Danh Sách' }]

export const navBtn = { width: 34, height: 34, borderRadius: 8, border: `1px solid ${C.line2}`, background: '#fdfcfb', cursor: 'pointer', fontSize: 16, color: C.ink3, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }
export const miniBtn = (color) => ({ border: 'none', background: color, color: '#fff', borderRadius: 4, padding: '1px 6px', fontSize: 9.5, fontWeight: 700, cursor: 'pointer', lineHeight: 1.4 })
