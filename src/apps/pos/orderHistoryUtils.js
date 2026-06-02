// ─── Helpers thuần + hằng số dùng chung cho PosOrderHistory ───────────────────
// Tách từ PosOrderHistory.jsx (Phase 2 — tối ưu cấu trúc). Không đổi logic.
import { todayISO } from '../../lib/utils'
import { addDaysISO, getWeekdayISO } from '../../lib/dateMath'
import { HINH_THUC_THU_LABEL } from '../../constants/enums'

export const STATUS_MAP = {
  draft:         { label: 'Chờ thanh toán', dot: '#F0AD4E', bg: 'rgba(240,173,78,.12)',  color: '#996a00' },
  da_thanh_toan: { label: 'Đã thanh toán',  dot: '#28A745', bg: 'rgba(40,167,69,.11)',   color: '#1a5e2e' },
  no_mot_phan:   { label: 'Đang nợ',        dot: '#17A2B8', bg: 'rgba(23,162,184,.12)',  color: '#0c5460' },
  huy:           { label: 'Đã bị xóa',      dot: '#DC3545', bg: 'rgba(220,53,69,.11)',   color: '#7c1a24' },
}

export const STATUS_TABS = [
  { key: 'all',           label: 'Tất cả' },
  { key: 'draft',         label: 'Chờ thanh toán' },
  { key: 'da_thanh_toan', label: 'Đã thanh toán' },
  { key: 'no_mot_phan',   label: 'Đang nợ' },
  { key: 'huy',           label: 'Đã bị xóa' },
]

export const PTTT_LABEL = HINH_THUC_THU_LABEL

export const PAGE_SIZE = 50

export const DATE_TABS = [
  { key: 'today',     label: 'Hôm nay' },
  { key: 'yesterday', label: 'Hôm qua' },
  { key: 'week',      label: 'Tuần này' },
  { key: 'month',     label: 'Tháng này' },
  { key: 'range',     label: 'Từ ngày – đến ngày' },
  { key: 'all',       label: 'Tất cả' },
]

export function shortStaffName(name = '') {
  const isRetired = /\(\s*Nghỉ Việc\s*\)/i.test(String(name))
  const baseName = String(name).replace(/\(\s*Nghỉ Việc\s*\)/i, '').trim()
  const parts = baseName.split(/\s+/).filter(Boolean)
  if (parts.length <= 2) return parts.join(' ')
  const displayName = parts.slice(-2).join(' ')
  return isRetired ? `${displayName} (Nghỉ Việc)` : displayName
}

export function fmtBusinessDate(dateStr) {
  if (!dateStr) return ''
  const [y, m, d] = String(dateStr).split('-')
  return y && m && d ? `${d}/${m}/${y}` : ''
}

export function fmtDateTime(isoStr, businessDate) {
  if (!isoStr && !businessDate) return { date: '', time: '' }
  try {
    const d = isoStr ? new Date(isoStr) : null
    const date = fmtBusinessDate(businessDate) || d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Asia/Ho_Chi_Minh' })
    const time = d ? d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Ho_Chi_Minh' }) : ''
    return { date, time }
  } catch { return { date: '', time: '' } }
}

export function displayDate(iso) {
  return iso ? String(iso).split('-').reverse().join('/') : 'Chọn ngày'
}

export function getYesterdayISO() {
  return addDaysISO(todayISO(), -1)
}

export function getWeekStartISO() {
  const today = todayISO()
  const day = getWeekdayISO(today)            // 0=CN, 1=T2...
  const diff = day === 0 ? 6 : day - 1        // lùi về Thứ Hai
  return addDaysISO(today, -diff)
}

export function getMonthStartISO() {
  const [year, month] = todayISO().split('-')
  return `${year}-${month}-01`
}

export function paymentMethodLabel(method) {
  return PTTT_LABEL[method] || 'Dữ liệu cũ cần rà soát'
}

export function historyTypeLabel(type) {
  if (type === 'mua_the_lieu_trinh') return 'Mua thẻ'
  if (type === 'dung_the_lieu_trinh') return 'Dùng thẻ'
  if (type === 'mua_san_pham') return 'Sản phẩm'
  return 'Dịch vụ'
}

export function ledgerStatusLabel(status) {
  if (status === 'doi_soat') return 'Đã đối soát'
  if (status === 'da_chot') return 'Đã chốt'
  if (status === 'da_tra') return 'Đã trả'
  if (status === 'huy') return 'Đã hủy'
  return 'Phát sinh'
}

export function orderItemName(item) {
  return item.meta?.tenDichVu
    || item.the_lieu_trinh?.ten_dich_vu
    || item.dich_vu?.ten
    || item.san_pham?.ten
    || 'Dịch vụ'
}

export function treatmentOrderNote(order) {
  const used = (order.items || []).find(i => i.loai_item === 'the_lieu_trinh')
  if (!used) return ''
  const serviceName = orderItemName(used)
  const total = Number(used.the_lieu_trinh?.so_buoi_tong)
  const remain = Number(used.the_lieu_trinh?.so_buoi_con_lai)
  const usedCount = Number.isFinite(total) && Number.isFinite(remain) ? `${Math.max(0, total - remain)}/${total}` : ''
  return `Sử dụng thẻ liệu trình ${serviceName}${usedCount ? ` ${usedCount}` : ''}`
}

export function itemStaffName(item) {
  return item.nhan_vien?.ho_ten || item.meta?.myspaStaffDisplay || ''
}

export function itemTypeLabel(item) {
  if (item.loai_item === 'the_moi') return 'Bán thẻ'
  if (item.loai_item === 'the_lieu_trinh') return 'Dùng thẻ'
  if (item.loai_item === 'san_pham') return 'Sản phẩm'
  return 'Dịch vụ'
}

export function itemIncomeInfo(item) {
  // san_pham, the_moi → hoa hồng bán hàng
  // dich_vu, the_lieu_trinh → tiền tour KTV thực hiện
  const isCommission = item.loai_item === 'the_moi' || item.loai_item === 'san_pham'
  // Dùng || thay ?? để fallback đúng khi tien_tour/tien_commission = 0 (integer)
  const amount = isCommission
    ? (item.tien_commission || 0)
    : (item.tien_tour || item.tien_commission || 0)
  return { label: isCommission ? 'Hoa Hồng' : 'Tour', amount }
}

export function orderItemsPreview(order) {
  const items = order.items || []
  if (!items.length) return ''
  const names = items.slice(0, 3).map(orderItemName).filter(Boolean)
  const more = items.length > 3 ? ` +${items.length - 3}` : ''
  return `${names.join(', ')}${more}`
}

export function orderMatchesType(order, type) {
  const items = order.items || []
  if (type === 'all') return true
  if (type === 'service') return items.some(i => i.loai_item === 'dich_vu')
  if (type === 'card_use') return items.some(i => i.loai_item === 'the_lieu_trinh')
  if (type === 'card_sale') return items.some(i => i.loai_item === 'the_moi')
  if (type === 'product') return items.some(i => i.loai_item === 'san_pham')
  if (type === 'debt') return (order.con_no || 0) > 0
  return true
}
