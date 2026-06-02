import { todayISO } from '../../../lib/utils'

export function fmtDate(iso) {
  if (!iso) return '-'
  const [y, m, d] = String(iso).slice(0, 10).split('-')
  if (!y || !m || !d) return '-'
  return `${d}/${m}/${y}`
}

export function fmtCompact(n) {
  if (!n) return '0đ'
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)} tỷ`
  if (n >= 1e6) return `${Math.round(n / 1e6)} tr`
  return `${Math.round(n / 1e3)}k`
}

export function parseMoney(v) {
  return parseInt(String(v || '').replace(/\D/g, ''), 10) || 0
}

export function moneyInput(n) {
  return n > 0 ? new Intl.NumberFormat('vi-VN').format(n) : ''
}

export function getCardTime(card) {
  return Date.parse(card.ngay_mua || card.created_at || card.ngay_het_han || 0) || 0
}

export function sortCardsNewestFirst(a, b) {
  const byTime = getCardTime(b) - getCardTime(a)
  if (byTime !== 0) return byTime
  return String(b.ma_the || '').localeCompare(String(a.ma_the || ''), 'vi')
}

export function getRemain(card) {
  return card.so_buoi_con_lai ?? Math.max(0, (card.so_buoi_tong || 0) - (card.so_buoi_da_dung || 0))
}

export function displayTongBuoi(card) {
  const n = card.so_buoi_tong || 0
  return n > 0 ? `${n} buổi` : '? buổi'
}

export function displayConLai(card) {
  const n = card.so_buoi_tong || 0
  if (n === 0) return '?'
  return String(getRemain(card))
}

export function displaySuDung(card) {
  const tong = card.so_buoi_tong || 0
  const dung = card.so_buoi_da_dung || 0
  if (tong === 0) return `${dung}/? buổi`
  const pct = Math.min(100, Math.round((dung / tong) * 100))
  return `${dung}/${tong} buổi · ${pct}%`
}

export function displayPct(card) {
  const tong = card.so_buoi_tong || 0
  if (tong === 0) return 0
  return Math.min(100, Math.round(((card.so_buoi_da_dung || 0) / tong) * 100))
}

export function getStatusKey(card) {
  const today = todayISO()
  if (card.trang_thai === 'hoan_tien' || card.trang_thai === 'dong_the' || card.trang_thai === 'da_huy') return 'closed'
  if (card.trang_thai === 'chuyen_doi') return 'converted'
  if (card.trang_thai === 'het_han') return 'expired'
  if (card.ngay_het_han && card.ngay_het_han < today) return 'expired'
  if (getRemain(card) <= 0) return 'done'
  return 'active'
}

export function getAuditStatus(card) {
  const reviewed = card.meta?.review_status
  if (['keep_active', 'closed_expired', 'extended', 'sessions_adjusted'].includes(reviewed)) return 'ok'
  const today = todayISO()
  if (card.trang_thai === 'active' && card.ngay_het_han && card.ngay_het_han < today) return 'active_but_expired'
  if (card.trang_thai === 'active' && !card.is_khong_gioi_han && getRemain(card) <= 0) return 'active_but_no_sessions'
  if (card.trang_thai === 'het_buoi' && getRemain(card) > 0) return 'finished_but_has_sessions'
  if (!card.is_khong_gioi_han && (card.so_buoi_da_dung || 0) > (card.so_buoi_tong || 0)) return 'used_more_than_total'
  return 'ok'
}

export function isExpiredCard(card) {
  return getStatusKey(card) === 'expired'
}

export function isDoneCard(card) {
  return getStatusKey(card) === 'done'
}

export function isActiveCard(card) {
  return getStatusKey(card) === 'active'
}

export function isComboCard(card) {
  return card.loai_the === 'combo_lieu_trinh' || !!card.combo_id
}

export function isAlmostDoneCard(card) {
  return isActiveCard(card) && !card.is_khong_gioi_han && getRemain(card) <= 2
}

export function needsReviewCard(card) {
  return getAuditStatus(card) !== 'ok'
}

export function getCardStats(cards) {
  return {
    total: cards.length,
    activeN: cards.filter(isActiveCard).length,
    expiredN: cards.filter(isExpiredCard).length,
    doneN: cards.filter(isDoneCard).length,
    almostN: cards.filter(isAlmostDoneCard).length,
    comboCardN: cards.filter(isComboCard).length,
    reviewN: cards.filter(needsReviewCard).length,
    totalValue: cards.reduce((sum, card) => sum + (card.gia_tri_the || 0), 0),
  }
}

export function filterCards(cards, filter, search) {
  const keyword = String(search || '').trim().toLowerCase()

  return cards.filter(card => {
    if (filter === 'active' && !isActiveCard(card)) return false
    if (filter === 'expired' && !isExpiredCard(card)) return false
    if (filter === 'done' && !isDoneCard(card)) return false
    if (filter === 'almost' && !isAlmostDoneCard(card)) return false
    if (filter === 'combo' && !isComboCard(card)) return false
    if (filter === 'review' && !needsReviewCard(card)) return false
    if (!keyword) return true

    const fields = [
      card.khach_hang?.ho_ten,
      card.khach_hang?.so_dien_thoai,
      card.ten_dich_vu,
      card.combo?.ten_combo,
      card.ma_the,
    ].join(' ').toLowerCase()

    return fields.includes(keyword)
  })
}
