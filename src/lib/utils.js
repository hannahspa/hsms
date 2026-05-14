export const DAYS = ['CN','T2','T3','T4','T5','T6','T7']

export const formatCurrency = (n) =>
  new Intl.NumberFormat('vi-VN').format(n || 0) + 'đ'

export const parseVND = (s) => parseInt(String(s).replace(/\D/g, ''), 10) || 0

export const formatCurrencyHide = () => '••••••••'

export const fmtCompact = (n) => {
  if (!n && n !== 0) return '—'
  if (Math.abs(n) >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M'
  if (Math.abs(n) >= 1_000) return (n / 1_000).toFixed(0) + 'K'
  return String(n)
}

export const fmtFull = (n) => formatCurrency(n)

export const formatDate = (isoDate) => {
  if (!isoDate) return ''
  const [y, m, d] = String(isoDate).substring(0, 10).split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return `${DAYS[date.getDay()]} ${String(d).padStart(2,'0')}/${String(m).padStart(2,'0')}/${y}`
}

export const formatDateFull = (isoStr) => {
  if (!isoStr) return ''
  const d = new Date(isoStr + 'T00:00:00')
  return `${DAYS[d.getDay()]}, ${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`
}

export const getNowVN = () => {
  const now = new Date()
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60000
  return new Date(utcMs + 7 * 60 * 60000)
}

export const todayISO = () => {
  const d = getNowVN()
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

export const nowTimeVN = () => {
  const d = getNowVN()
  return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}-${String(d.getSeconds()).padStart(2,'0')}`
}

export const formatDateInput = (isoDate) => {
  if (!isoDate) return ''
  const [y, m, dd] = isoDate.split('-')
  return `${dd}/${m}/${y}`
}

export async function hashPin(pin) {
  const encoder = new TextEncoder()
  const data = encoder.encode(pin)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

const LOCKOUT_KEY = 'hsms_pin_lockout'

export function getPinLockout() {
  try {
    const raw = localStorage.getItem(LOCKOUT_KEY)
    if (!raw) return { attempts: 0, until: 0 }
    const parsed = JSON.parse(raw)
    if (Date.now() > parsed.until) { localStorage.removeItem(LOCKOUT_KEY); return { attempts: 0, until: 0 } }
    return parsed
  } catch { return { attempts: 0, until: 0 } }
}

export function recordPinFailure() {
  const current = getPinLockout()
  const attempts = current.attempts + 1
  const until = attempts >= 5 ? Date.now() + 5 * 60 * 1000 : 0
  localStorage.setItem(LOCKOUT_KEY, JSON.stringify({ attempts, until }))
  return { attempts, until }
}

export function clearPinLockout() {
  localStorage.removeItem(LOCKOUT_KEY)
}

export const addDays = (iso, n) => {
  const [y, m, d] = iso.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d + n))
  return dt.toISOString().slice(0, 10)
}

export const monthRange = (y, m) => {
  const days = new Date(y, m, 0).getDate()
  const mm = String(m).padStart(2, '0')
  return { first: `${y}-${mm}-01`, last: `${y}-${mm}-${String(days).padStart(2, '0')}`, days }
}

export const pctChange = (now, prev) => {
  if (!prev) return null
  return Math.round(((now - prev) / Math.abs(prev)) * 100)
}

export const daysUntil = (iso) => {
  if (!iso) return null
  const now = getNowVN(); now.setHours(0, 0, 0, 0)
  const d = new Date(iso + 'T00:00:00')
  return Math.round((d - now) / 86400000)
}

export const daysAgo = (iso) => {
  if (!iso) return null
  const now = getNowVN(); now.setHours(0, 0, 0, 0)
  const d = new Date(iso + 'T00:00:00')
  return Math.round((now - d) / 86400000)
}

export const viTriLabel = (v) => {
  return v === 'ktv' ? 'KTV' : v === 'le_tan' ? 'Lễ Tân' : v === 'tap_vu' ? 'Tạp Vụ' : v || ''
}