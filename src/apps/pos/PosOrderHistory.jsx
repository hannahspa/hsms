import { useState, useEffect, useCallback } from 'react'
import { posService } from '../../services/posService'
import { formatCurrency, todayISO, getNowVN } from '../../lib/utils'
import DatePicker from '../../components/shared/DatePicker'
import I from '../../components/shared/Icons'
import { HINH_THUC_THU_LABEL } from '../../constants/enums'
import { useAuth } from '../../context/AuthContext'

// Constants
const STATUS_MAP = {
  draft:         { label: 'Chờ thanh toán', dot: '#F0AD4E', bg: 'rgba(240,173,78,.12)',  color: '#996a00' },
  da_thanh_toan: { label: 'Đã thanh toán',  dot: '#28A745', bg: 'rgba(40,167,69,.11)',   color: '#1a5e2e' },
  no_mot_phan:   { label: 'Đang nợ',        dot: '#17A2B8', bg: 'rgba(23,162,184,.12)',  color: '#0c5460' },
  huy:           { label: 'Đã bị xóa',      dot: '#DC3545', bg: 'rgba(220,53,69,.11)',   color: '#7c1a24' },
}

const STATUS_TABS = [
  { key: 'all',           label: 'Tất cả' },
  { key: 'draft',         label: 'Chờ thanh toán' },
  { key: 'da_thanh_toan', label: 'Đã thanh toán' },
  { key: 'no_mot_phan',   label: 'Đang nợ' },
  { key: 'huy',           label: 'Đã bị xóa' },
]

const PTTT_LABEL = {
  ...HINH_THUC_THU_LABEL,
  the_lieu_trinh: 'Thẻ liệu trình (cũ)',
}

const PAGE_SIZE = 50

function shortStaffName(name = '') {
  const isRetired = /\(\s*Nghỉ Việc\s*\)/i.test(String(name))
  const baseName = String(name).replace(/\(\s*Nghỉ Việc\s*\)/i, '').trim()
  const parts = baseName.split(/\s+/).filter(Boolean)
  if (parts.length <= 2) return parts.join(' ')
  const displayName = parts.slice(-2).join(' ')
  return isRetired ? `${displayName} (Nghỉ Việc)` : displayName
}

function fmtBusinessDate(dateStr) {
  if (!dateStr) return ''
  const [y, m, d] = String(dateStr).split('-')
  return y && m && d ? `${d}/${m}/${y}` : ''
}

function fmtDateTime(isoStr, businessDate) {
  if (!isoStr && !businessDate) return { date: '', time: '' }
  try {
    const d = isoStr ? new Date(isoStr) : null
    const date = fmtBusinessDate(businessDate) || d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Asia/Ho_Chi_Minh' })
    const time = d ? d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Ho_Chi_Minh' }) : ''
    return { date, time }
  } catch { return { date: '', time: '' } }
}

function getYesterdayISO() {
  const d = getNowVN(); d.setDate(d.getDate() - 1)
  return d.toISOString().slice(0, 10)
}
function getWeekStartISO() {
  const d = getNowVN()
  const day = d.getDay()            // 0=CN, 1=T2...
  const diff = day === 0 ? 6 : day - 1   // lùi về Thứ Hai
  d.setDate(d.getDate() - diff)
  return d.toISOString().slice(0, 10)
}
function getMonthStartISO() {
  const d = getNowVN()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

const DATE_TABS = [
  { key: 'today',     label: 'Hôm nay' },
  { key: 'yesterday', label: 'Hôm qua' },
  { key: 'week',      label: 'Tuần này' },
  { key: 'month',     label: 'Tháng này' },
  { key: 'range',     label: 'Từ ngày – đến ngày' },
  { key: 'all',       label: 'Tất cả' },
]

function historyTypeLabel(type) {
  if (type === 'mua_the_lieu_trinh') return 'Mua thẻ'
  if (type === 'dung_the_lieu_trinh') return 'Dùng thẻ'
  if (type === 'mua_san_pham') return 'Sản phẩm'
  return 'Dịch vụ'
}

function ledgerStatusLabel(status) {
  if (status === 'doi_soat') return 'Đã đối soát'
  if (status === 'da_chot') return 'Đã chốt'
  if (status === 'da_tra') return 'Đã trả'
  if (status === 'huy') return 'Đã hủy'
  return 'Phát sinh'
}

function orderItemName(item) {
  return item.meta?.tenDichVu
    || item.the_lieu_trinh?.ten_dich_vu
    || item.dich_vu?.ten
    || item.san_pham?.ten
    || 'Dịch vụ'
}

function treatmentOrderNote(order) {
  const used = (order.items || []).find(i => i.loai_item === 'the_lieu_trinh')
  if (!used) return ''
  const serviceName = orderItemName(used)
  const total = Number(used.the_lieu_trinh?.so_buoi_tong)
  const remain = Number(used.the_lieu_trinh?.so_buoi_con_lai)
  const usedCount = Number.isFinite(total) && Number.isFinite(remain) ? `${Math.max(0, total - remain)}/${total}` : ''
  return `Sử dụng thẻ liệu trình ${serviceName}${usedCount ? ` ${usedCount}` : ''}`
}

// Panel chi tiết đơn
function itemStaffName(item) {
  return item.nhan_vien?.ho_ten || item.meta?.myspaStaffDisplay || ''
}

function itemTypeLabel(item) {
  if (item.loai_item === 'the_moi') return 'Bán thẻ'
  if (item.loai_item === 'the_lieu_trinh') return 'Dùng thẻ'
  if (item.loai_item === 'san_pham') return 'Sản phẩm'
  return 'Dịch vụ'
}

function itemIncomeInfo(item) {
  // san_pham, the_moi → hoa hồng bán hàng
  // dich_vu, the_lieu_trinh → tiền tour KTV thực hiện
  const isCommission = item.loai_item === 'the_moi' || item.loai_item === 'san_pham'
  // Dùng || thay ?? để fallback đúng khi tien_tour/tien_commission = 0 (integer)
  const amount = isCommission
    ? (item.tien_commission || 0)
    : (item.tien_tour || item.tien_commission || 0)
  return { label: isCommission ? 'Hoa Hồng' : 'Tour', amount }
}

function orderItemsPreview(order) {
  const items = order.items || []
  if (!items.length) return ''
  const names = items.slice(0, 3).map(orderItemName).filter(Boolean)
  const more = items.length > 3 ? ` +${items.length - 3}` : ''
  return `${names.join(', ')}${more}`
}

function orderMatchesType(order, type) {
  const items = order.items || []
  if (type === 'all') return true
  if (type === 'service') return items.some(i => i.loai_item === 'dich_vu')
  if (type === 'card_use') return items.some(i => i.loai_item === 'the_lieu_trinh')
  if (type === 'card_sale') return items.some(i => i.loai_item === 'the_moi')
  if (type === 'product') return items.some(i => i.loai_item === 'san_pham')
  if (type === 'debt') return (order.con_no || 0) > 0
  return true
}

function OrderDetailPanel({ order, onClose, onVoid, onEdit, canVoid = true }) {
  const [detail, setDetail] = useState({ items: [], payments: [], ledger: [], customerSnapshot: null })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      posService.getLineItems(order.id),
      posService.getPayments(order.id),
      posService.getOrderStaffLedger(order.id),
      posService.getCustomerSnapshot(order.khach_hang_id),
    ]).then(([items, payments, ledger, customerSnapshot]) => setDetail({ items, payments, ledger, customerSnapshot }))
      .catch(() => setDetail({ items: [], payments: [], ledger: [], customerSnapshot: null }))
      .finally(() => setLoading(false))
  }, [order.id, order.khach_hang_id])

  const st = STATUS_MAP[order.trang_thai] || STATUS_MAP.draft
  const { date, time } = fmtDateTime(order.created_at, order.ngay)
  const orderTotal = order.tong_tien_hang || order.thanh_tien || 0
  const snap = detail.customerSnapshot
  const customer = snap?.customer || order.khach_hang
  const boughtCards = detail.items.filter(i => i.loai_item === 'the_moi')
  const usedCards = detail.items.filter(i => i.loai_item === 'the_lieu_trinh')
  const productItems = detail.items.filter(i => i.loai_item === 'san_pham')
  const serviceItems = detail.items.filter(i => i.loai_item === 'dich_vu')

  return (
    <>
      <style>{`@keyframes slideInRight { from { transform: translateX(100%) } to { transform: translateX(0) } }`}</style>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.32)', zIndex: 490 }} />
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: 'min(780px, 96vw)',
        background: '#fff', zIndex: 491, display: 'flex', flexDirection: 'column',
        boxShadow: '-6px 0 40px rgba(0,0,0,.22)', animation: 'slideInRight .22s ease',
      }}>

        {}
        <div style={{ background: 'linear-gradient(135deg,#3d2c20 0%,#2a1d14 100%)', flexShrink: 0 }}>
          <div style={{ padding: '14px 20px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: 15, fontWeight: 700, fontFamily: 'var(--serif)', color: '#f3e6d2' }}>
              Thông tin đơn hàng
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                background: st.bg, color: st.color,
              }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: st.dot, flexShrink: 0 }} />
                {st.label}
              </span>
              {order.trang_thai === 'da_thanh_toan' && (
                <span style={{
                  display: 'inline-flex', alignItems: 'center',
                  padding: '3px 9px', borderRadius: 20, fontSize: 10.5, fontWeight: 800,
                  background: 'rgba(201,169,110,.16)', color: '#f3e6d2',
                  border: '1px solid rgba(243,230,210,.18)',
                }}>
                  Khóa sửa trực tiếp
                </span>
              )}
              <button onClick={onClose} style={{ background: 'rgba(255,255,255,.12)', border: 'none', width: 28, height: 28, borderRadius: 8, cursor: 'pointer', color: '#f3e6d2', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
            </div>
          </div>
          <div style={{ display: 'flex', padding: '6px 20px 0', gap: 4 }}>
            {['Đơn hàng', 'CRM khách', 'Liên kết dữ liệu'].map((lbl, i) => (
              <div key={lbl} style={{ padding: '7px 14px', fontSize: 12.5, fontWeight: 700, color: i === 0 ? '#C9A96E' : 'rgba(243,230,210,.4)', borderBottom: i === 0 ? '2px solid #C9A96E' : '2px solid transparent', cursor: 'pointer' }}>{lbl}</div>
            ))}
          </div>
        </div>

        {}
        <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--line)', flexShrink: 0, background: '#fafaf9' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--champagne)', fontFamily: 'var(--serif)' }}>
                {customer?.ho_ten || <span style={{ fontStyle: 'italic', color: 'var(--ink3)', fontWeight: 400 }}>Khách lẻ</span>}
              </div>
              {customer?.so_dien_thoai && (
                <div style={{ fontSize: 12, color: 'var(--ink3)', marginTop: 2 }}>{customer.so_dien_thoai}</div>
              )}
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', fontFamily: 'var(--serif)' }}>{order.ma_don}</div>
              <div style={{ fontSize: 11, color: 'var(--ink3)', marginTop: 1 }}>{date} · {time}</div>
            </div>
          </div>
          {order.trang_thai === 'da_thanh_toan' && (
            <div style={{
              marginTop: 10, padding: '8px 10px', borderRadius: 8,
              background: 'rgba(45,122,79,.08)', border: '1px solid rgba(45,122,79,.18)',
              color: '#2D7A4F', fontSize: 11.5, fontWeight: 700,
            }}>
              Đơn đã thanh toán: dữ liệu doanh thu, thẻ liệu trình, kho và thu nhập nhân viên đã phát sinh. Chỉ Admin nên điều chỉnh bằng phiếu điều chỉnh có lưu vết.
            </div>
          )}
        </div>

        {}
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>

          {}
          <div style={{ display: 'flex', padding: '7px 20px', background: '#f0ebe4', fontSize: 10, fontWeight: 700, color: 'var(--ink3)', letterSpacing: '.06em', textTransform: 'uppercase', gap: 4 }}>
            <span style={{ flex: 1 }}>DV / SP</span>
            <span style={{ width: 30, textAlign: 'center' }}>SL</span>
            <span style={{ width: 70, textAlign: 'right' }}>Giảm giá</span>
            <span style={{ width: 90, textAlign: 'right' }}>Thành tiền</span>
          </div>

          {}
          <div style={{ padding: '0 20px', borderBottom: '1px solid var(--line)' }}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '24px', color: 'var(--ink3)', fontSize: 13 }}>Đang tải...</div>
            ) : detail.items.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px', color: 'var(--ink3)', fontSize: 13 }}>Không có dịch vụ</div>
            ) : detail.items.map(item => {
              const ten = orderItemName(item)
              const discAmt = Math.max(0, (item.don_gia || 0) * (item.so_luong || 1) - (item.thanh_tien || 0))
              const staffName = itemStaffName(item)
              const income = itemIncomeInfo(item)
              const typeLabel = itemTypeLabel(item)
              return (
                <div key={item.id} style={{ padding: '8px 0', borderBottom: '1px solid var(--line)' }}>
                  <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                    <div style={{ flex: 1, fontSize: 12.5, fontWeight: 600, color: 'var(--ink)', lineHeight: 1.3 }}>
                      <span style={{
                        display: 'inline-flex', marginRight: 6, marginBottom: 2,
                        padding: '1px 6px', borderRadius: 4, fontSize: 9.5,
                        fontWeight: 800, color: '#8a6335', background: 'rgba(201,169,110,.14)',
                      }}>
                        {typeLabel}
                      </span>
                      {ten}
                    </div>
                    <div style={{ width: 30, textAlign: 'center', fontSize: 12, color: 'var(--ink3)' }}>{item.so_luong}</div>
                    <div style={{ width: 70, textAlign: 'right', fontSize: 12, color: discAmt > 0 ? '#C0392B' : 'var(--ink3)' }}>
                      {discAmt > 0 ? formatCurrency(discAmt) : '0'}
                    </div>
                    <div style={{ width: 90, textAlign: 'right', fontSize: 13, fontWeight: 700, fontFamily: 'var(--serif)', color: 'var(--ink)' }}>
                      {formatCurrency(item.thanh_tien || 0)}
                    </div>
                  </div>
                  {}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3, paddingLeft: 2 }}>
                    <span style={{ fontSize: 10.5, color: 'var(--ink3)' }}>{formatCurrency(item.don_gia || 0)}</span>
                    <span style={{ fontSize: 10, color: 'var(--ink3)' }}>·</span>
                    {staffName ? (
                      <>
                        {item.nhan_vien?.avatar_url && (
                          <img src={item.nhan_vien.avatar_url} alt={staffName}
                            style={{ width: 26, height: 26, borderRadius: '50%', objectFit: 'cover', border: '1px solid rgba(160,113,79,.3)', flexShrink: 0 }} />
                        )}
                        <span style={{ fontSize: 12, color: 'var(--champagne)', fontWeight: 700 }}>{shortStaffName(staffName)}</span>
                        {(income.amount || 0) > 0 && (
                          <span style={{ fontSize: 11, color: '#2D7A4F', fontWeight: 700 }}>
                            {income.label}: {formatCurrency(income.amount)}
                          </span>
                        )}
                      </>
                    ) : (
                      <span style={{ fontSize: 10.5, color: 'var(--ink3)', fontStyle: 'italic' }}>
                        {item.meta?.myspaStaffStatus === 'chua_co_ten' ? 'Chưa có tên NV từ MySpa' : 'Không rõ KTV'}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {!loading && customer && (
            <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--line)', background: '#fffdf9' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 9 }}>
                <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: '.08em' }}>
                  Hồ sơ CRM khách hàng
                </div>
                <button
                  onClick={() => { window.location.href = '/admin/crm' }}
                  style={{ border: 'none', background: 'transparent', color: 'var(--champagne)', fontSize: 11, fontWeight: 800, cursor: 'pointer' }}>
                  Mở CRM
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginBottom: 10 }}>
                {[
                  { l: 'Tổng chi', v: formatCurrency(customer.tong_chi_tieu || 0), c: '#2D7A4F' },
                  { l: 'Lượt đến', v: customer.so_lan_den || 0, c: 'var(--ink)' },
                  { l: 'Thẻ còn', v: snap?.activeCards?.length || 0, c: 'var(--champagne)' },
                  { l: 'Công nợ', v: formatCurrency(snap?.debtBalance || 0), c: (snap?.debtBalance || 0) > 0 ? '#C0392B' : 'var(--ink)' },
                ].map(x => (
                  <div key={x.l} style={{ border: '1px solid var(--line)', borderRadius: 8, padding: '8px 9px', background: '#fff' }}>
                    <div style={{ fontSize: 9.5, color: 'var(--ink3)', textTransform: 'uppercase', fontWeight: 800 }}>{x.l}</div>
                    <div style={{ fontSize: 13, color: x.c, fontWeight: 800, fontFamily: 'var(--serif)', marginTop: 2 }}>{x.v}</div>
                  </div>
                ))}
              </div>

              {snap?.cards?.length > 0 && (
                <div style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 10.5, fontWeight: 800, color: 'var(--ink2)', marginBottom: 5 }}>Thẻ liệu trình của khách</div>
                  <div style={{ display: 'grid', gap: 5 }}>
                    {snap.cards.slice(0, 3).map(card => (
                      <div key={card.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 11.5, border: '1px solid var(--line)', borderRadius: 7, padding: '6px 8px', background: '#fafaf9' }}>
                        <span style={{ color: 'var(--ink)', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{card.ten_dich_vu}</span>
                        <span style={{ color: card.trang_thai === 'active' ? '#2D7A4F' : 'var(--ink3)', fontWeight: 800, flexShrink: 0 }}>
                          {card.so_buoi_con_lai}/{card.so_buoi_tong} buổi
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {snap?.history?.length > 0 && (
                <div>
                  <div style={{ fontSize: 10.5, fontWeight: 800, color: 'var(--ink2)', marginBottom: 5 }}>Lịch sử gần nhất</div>
                  <div style={{ display: 'grid', gap: 5 }}>
                    {snap.history.slice(0, 4).map((h, idx) => (
                      <div key={`${h.don_hang_chi_tiet_id || h.ma_don}-${idx}`} style={{ display: 'grid', gridTemplateColumns: '72px 1fr auto', gap: 8, alignItems: 'center', fontSize: 11.5 }}>
                        <span style={{ color: 'var(--ink3)' }}>{h.ngay?.split('-').reverse().join('/')}</span>
                        <span style={{ color: 'var(--ink)', fontWeight: 650, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.ten_dich_vu}</span>
                        <span style={{ color: h.loai_lich_su === 'dung_the_lieu_trinh' ? '#2D7A4F' : 'var(--champagne)', fontWeight: 800 }}>
                          {historyTypeLabel(h.loai_lich_su)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {!loading && (
            <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--line)', background: '#fafaf9' }}>
              <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 8 }}>
                Luồng dữ liệu phát sinh từ đơn này
              </div>
              <div style={{ display: 'grid', gap: 7 }}>
                {[
                  { ok: !!customer, l: 'CRM khách hàng', v: customer ? `${customer.ho_ten || 'Khách'} · ${serviceItems.length + usedCards.length} dịch vụ ghi nhận` : 'Khách lẻ, không ghi hồ sơ CRM' },
                  { ok: boughtCards.length > 0 || usedCards.length > 0, l: 'Thẻ liệu trình', v: boughtCards.length > 0 ? `Bán mới ${boughtCards.length} thẻ` : usedCards.length > 0 ? `Dùng ${usedCards.length} buổi/thẻ` : 'Không phát sinh thẻ' },
                  { ok: productItems.length > 0, l: 'Kho hàng', v: productItems.length > 0 ? `Xuất ${productItems.length} dòng sản phẩm` : 'Không xuất kho sản phẩm' },
                  { ok: detail.ledger.length > 0, l: 'Tour / Hoa hồng', v: detail.ledger.length > 0 ? `${detail.ledger.length} khoản thu nhập nhân viên` : 'Chưa có phát sinh nhân viên' },
                ].map(x => (
                  <div key={x.l} style={{ display: 'grid', gridTemplateColumns: '18px 112px 1fr', gap: 8, alignItems: 'center', fontSize: 12 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: x.ok ? '#2D7A4F' : '#B8A898', justifySelf: 'center' }} />
                    <span style={{ color: 'var(--ink2)', fontWeight: 800 }}>{x.l}</span>
                    <span style={{ color: 'var(--ink)', fontWeight: 600 }}>{x.v}</span>
                  </div>
                ))}
              </div>

              {detail.ledger.length > 0 && (
                <div style={{ marginTop: 10, display: 'grid', gap: 5 }}>
                  {detail.ledger.map(row => (
                    <div key={row.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, border: '1px solid var(--line)', background: '#fff', borderRadius: 7, padding: '6px 8px', fontSize: 11.5 }}>
                      <span style={{ color: 'var(--ink)', fontWeight: 700 }}>
                        {shortStaffName(row.nhan_vien?.ho_ten || 'Nhân viên')} · {row.loai === 'hoa_hong' ? 'Hoa Hồng' : 'Tour'}
                      </span>
                      <span style={{ color: '#2D7A4F', fontWeight: 800 }}>{formatCurrency(row.so_tien || 0)}</span>
                      <span style={{ color: 'var(--ink3)', fontWeight: 700 }}>{ledgerStatusLabel(row.trang_thai)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {}
          <div style={{ padding: '12px 20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 13 }}>
              <span style={{ color: 'var(--ink3)' }}>Tổng đơn</span>
              <span style={{ fontWeight: 700, fontFamily: 'var(--serif)' }}>{formatCurrency(orderTotal)}</span>
            </div>
            {(order.giam_gia || 0) > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 13 }}>
                <span style={{ color: 'var(--ink3)' }}>Giảm giá</span>
                <span style={{ fontWeight: 700, color: '#C0392B' }}>−{formatCurrency(order.giam_gia)}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderTop: '1px solid var(--line)', marginTop: 4 }}>
              <span style={{ fontSize: 15, fontWeight: 700, fontFamily: 'var(--serif)', color: 'var(--ink)' }}>Tổng cộng</span>
              <span style={{ fontSize: 18, fontWeight: 800, fontFamily: 'var(--serif)', color: '#2D7A4F' }}>
                {formatCurrency(order.thuc_thu || orderTotal)}
              </span>
            </div>
            {(order.con_no || 0) > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginTop: 2 }}>
                <span style={{ color: 'var(--ink3)' }}>Còn nợ</span>
                <span style={{ fontWeight: 700, color: '#C0392B' }}>{formatCurrency(order.con_no)}</span>
              </div>
            )}

            {!loading && detail.payments.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 7 }}>Đã thanh toán</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {detail.payments.map(p => (
                    <div key={p.id} style={{ padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--ink2)', display: 'flex', gap: 6 }}>
                      <span>{PTTT_LABEL[p.hinh_thuc] || p.hinh_thuc}</span>
                      <span style={{ fontWeight: 700, color: 'var(--ink)' }}>{formatCurrency(p.so_tien)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {}
        <div style={{ padding: '12px 20px', borderTop: '2px solid var(--line)', flexShrink: 0, display: 'flex', gap: 8, background: 'linear-gradient(135deg,#3d2c20 0%,#2a1d14 100%)' }}>
          {order.trang_thai !== 'huy' && canVoid && (
            <button onClick={onVoid} style={{ padding: '0 14px', height: 40, border: '1px solid rgba(220,53,69,.4)', borderRadius: 8, background: 'rgba(220,53,69,.15)', color: '#ff8a80', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--sans)' }}>
              Hủy đơn
            </button>
          )}
          {order.trang_thai !== 'huy' && !canVoid && (
            <span style={{ padding: '0 12px', height: 40, display: 'inline-flex', alignItems: 'center', fontSize: 11, color: 'rgba(243,230,210,0.4)', fontStyle: 'italic' }}>
              Đơn cũ · liên hệ Admin hủy
            </span>
          )}
          <div style={{ flex: 1 }} />
          <button onClick={onClose} style={{ padding: '0 16px', height: 40, border: '1px solid rgba(243,230,210,.2)', borderRadius: 8, background: 'rgba(255,255,255,.08)', color: 'rgba(243,230,210,.7)', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--sans)' }}>
            Đóng
          </button>
          {order.trang_thai === 'draft' && (
            <button onClick={() => { onClose(); onEdit?.(order); window.location.href = '/pos' }} style={{ padding: '0 16px', height: 40, border: 'none', borderRadius: 8, background: 'var(--champagne)', color: '#2a1d14', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--sans)' }}>
              Mở & Thanh toán
            </button>
          )}
        </div>
      </div>
    </>
  )
}

// Main
export default function PosOrderHistory({ onResumeOrder }) {
  const { user } = useAuth()
  const isAdmin   = user?.vai_tro === 'admin'
  const [dateTab, setDateTab]       = useState('today')  // mặc định Hôm nay → tối ưu load
  const [date, setDate]             = useState(todayISO())
  const [showPicker, setShowPicker] = useState(false)
  const [search, setSearch]         = useState('')
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [fromDate, setFromDate]     = useState(todayISO())
  const [toDate, setToDate]         = useState(todayISO())
  const [orderTypeFilter, setOrderTypeFilter] = useState('all')
  const [statusTab, setStatusTab]   = useState('all')
  const [orders, setOrders]         = useState([])
  const [totalOrders, setTotalOrders] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [loading, setLoading]       = useState(false)
  const [detailOrder, setDetailOrder] = useState(null)

  // Tính khoảng ngày theo tab — mặc định Hôm nay để không load toàn bộ
  const computeRange = useCallback(() => {
    const today = todayISO()
    switch (dateTab) {
      case 'today':     return { fromDate: today, toDate: today }
      case 'yesterday': { const y = getYesterdayISO(); return { fromDate: y, toDate: y } }
      case 'week':      return { fromDate: getWeekStartISO(), toDate: today }
      case 'month':     return { fromDate: getMonthStartISO(), toDate: today }
      case 'range':
      case 'advanced':  return { fromDate, toDate }
      case 'pick':      return { fromDate: date, toDate: date }
      case 'all':       return {}
      default:          return { fromDate: today, toDate: today }
    }
  }, [dateTab, fromDate, toDate, date])

  const load = useCallback(async (page = 1) => {
    setLoading(true)
    setDetailOrder(null)
    try {
      const result = await posService.getOrdersPage({ page, pageSize: PAGE_SIZE, ...computeRange() })
      setOrders(result.orders)
      setTotalOrders(result.total)
      setCurrentPage(page)
    } catch (_) {} finally { setLoading(false) }
  }, [computeRange])

  useEffect(() => { load() }, [load])

  const handleSearch = (q) => {
    setSearch(q)
  }

  // Chọn tab thời gian — load tự chạy qua useEffect (computeRange đổi)
  const handleDatePick = (key) => {
    setSearch('')
    setStatusTab('all')
    setShowAdvanced(false)
    setDateTab(key)
  }

  const handleDateTab = (tab) => {
    setSearch(''); setStatusTab('all')
    setDateTab(tab)
    if (tab === 'today') {
      const today = todayISO()
      setDate(today); setFromDate(today); setToDate(today)
    }
    else if (tab === 'yesterday') {
      const yesterday = getYesterdayISO()
      setDate(yesterday); setFromDate(yesterday); setToDate(yesterday)
    }
    else setShowPicker(true)
  }

  const handleAdvancedSearch = async () => {
    setLoading(true)
    setDetailOrder(null)
    setDateTab('advanced')
    try {
      const result = await posService.getOrdersPage({ page: 1, pageSize: PAGE_SIZE, fromDate, toDate })
      setOrders(result.orders)
      setTotalOrders(result.total)
      setCurrentPage(1)
    } catch (_) {} finally { setLoading(false) }
  }

  const resetAdvancedSearch = () => {
    const today = todayISO()
    setSearch('')
    setStatusTab('all')
    setOrderTypeFilter('all')
    setFromDate(today)
    setToDate(today)
    setDate(today)
    setShowAdvanced(false)
    setDateTab('today')   // về mặc định Hôm nay — load tự chạy qua useEffect
  }

  const handleVoid = async () => {
    if (!detailOrder) return
    // Lễ Tân chỉ được hủy đơn trong ngày hôm nay
    if (!isAdmin && detailOrder.ngay !== todayISO()) {
      alert('Lễ Tân chỉ được hủy đơn trong ngày hôm nay.\nĐơn cũ cần liên hệ Admin để xử lý.')
      return
    }
    if (!confirm(`Hủy đơn ${detailOrder.ma_don}?`)) return
    try {
      await posService.voidOrder(detailOrder.id)
      setDetailOrder(null)
      load(currentPage)
    } catch (err) { alert('Lỗi: ' + err.message) }
  }

  const filteredOrders = orders.filter(o => {
    if (statusTab !== 'all' && o.trang_thai !== statusTab) return false
    if (!orderMatchesType(o, orderTypeFilter)) return false
    const keyword = search.trim().toLowerCase()
    if (keyword) {
      const haystack = [
        o.ma_don,
        o.khach_hang?.ho_ten,
        o.khach_hang?.so_dien_thoai,
        o.item_summary,
        orderItemsPreview(o),
        ...(o.staff_compensations || []).map(s => s.name),
      ].filter(Boolean).join(' ').toLowerCase()
      if (!haystack.includes(keyword)) return false
    }
    return true
  })

  const countByStatus = (key) => orders.filter(o => key === 'all' || o.trang_thai === key).length
  const totalPages = Math.max(1, Math.ceil(totalOrders / PAGE_SIZE))
  const pageStart = totalOrders === 0 ? 0 : ((currentPage - 1) * PAGE_SIZE) + 1
  const pageEnd = Math.min(totalOrders, currentPage * PAGE_SIZE)

  const RANGE_LABEL = { today: 'Hôm nay', yesterday: 'Hôm qua', week: 'Tuần này', month: 'Tháng này', all: 'Tất cả đơn hàng' }
  const labelDate = RANGE_LABEL[dateTab]
    || ((dateTab === 'range' || dateTab === 'advanced')
        ? `${fromDate.split('-').reverse().join('/')} - ${toDate.split('-').reverse().join('/')}`
        : (date ? date.split('-').reverse().join('/') : '—'))

  return (
    <div>
      {}
      <div className="mod-head" style={{ marginBottom: 16 }}>
        <div>
          <div className="ttl">Danh Sách Đơn Hàng</div>
          <div className="sub">
            {search.trim()
              ? `Tìm "${search}" · ${filteredOrders.length} kết quả trong trang này`
              : `${labelDate} · ${totalOrders.toLocaleString('vi-VN')} đơn`}
          </div>
        </div>
      </div>

      {}
      <div className="card" style={{ padding: 16, marginBottom: 14, borderRadius: 8 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(260px,1fr) 120px 190px', gap: 12, alignItems: 'center' }}>
          <div className="search" style={{ maxWidth: 'none' }}>
            <I.Search />
            <input
              placeholder="Mã ĐH / tên / SĐT KH / dịch vụ / nhân viên"
              value={search}
              onChange={e => handleSearch(e.target.value)}
            />
            {search && (
              <button onClick={() => setSearch('')}
                style={{ background: 'none', border: 'none', color: 'var(--ink3)', cursor: 'pointer', fontSize: 14 }}>
                ×
              </button>
            )}
          </div>
          <button className="btn gold" onClick={() => setSearch(search)} style={{ height: 38, justifyContent: 'center' }}>
            Tìm kiếm
          </button>
          <button
            onClick={() => setShowAdvanced(v => !v)}
            className={showAdvanced ? 'btn gold' : 'btn'}
            style={{ height: 38, justifyContent: 'center' }}>
            Tìm kiếm nâng cao
          </button>
        </div>

        {/* Bộ lọc thời gian — mặc định Hôm nay để tối ưu load */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 12, alignItems: 'center', paddingTop: 12, borderTop: '1px solid var(--line)' }}>
          {DATE_TABS.map(t => {
            const active = dateTab === t.key
            return (
              <button key={t.key} onClick={() => handleDatePick(t.key)}
                style={{
                  padding: '5px 14px', borderRadius: 20, border: '1px solid var(--line)',
                  fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap',
                  background: active ? 'var(--grad-gold)' : 'var(--surface)',
                  color: active ? '#2a1d14' : 'var(--ink3)',
                  boxShadow: active ? '0 2px 8px rgba(160,113,79,.25)' : 'none',
                  transition: 'all .15s',
                }}>
                {t.label}
              </button>
            )
          })}
          {dateTab === 'range' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 4 }}>
              <input type="date" value={fromDate} max={toDate} onChange={e => setFromDate(e.target.value)}
                style={{ height: 32, border: '1px solid var(--line)', borderRadius: 8, padding: '0 8px', background: '#fff', color: 'var(--ink2)', fontSize: 12.5 }} />
              <span style={{ color: 'var(--ink3)' }}>→</span>
              <input type="date" value={toDate} min={fromDate} onChange={e => setToDate(e.target.value)}
                style={{ height: 32, border: '1px solid var(--line)', borderRadius: 8, padding: '0 8px', background: '#fff', color: 'var(--ink2)', fontSize: 12.5 }} />
            </div>
          )}
        </div>

        {showAdvanced && (
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(3, minmax(160px, 1fr)) 160px 160px',
            gap: 12, marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--line)',
          }}>
            <select value={statusTab} onChange={e => setStatusTab(e.target.value)} style={{ height: 36, border: '1px solid var(--line)', borderRadius: 8, padding: '0 10px', background: '#fff', color: 'var(--ink2)' }}>
              {STATUS_TABS.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
            </select>
            <select value={orderTypeFilter} onChange={e => setOrderTypeFilter(e.target.value)} style={{ height: 36, border: '1px solid var(--line)', borderRadius: 8, padding: '0 10px', background: '#fff', color: 'var(--ink2)' }}>
              <option value="all">Chọn loại đơn hàng...</option>
              <option value="service">Có dịch vụ</option>
              <option value="card_use">Sử dụng liệu trình</option>
              <option value="card_sale">Bán thẻ / combo</option>
              <option value="product">Có sản phẩm</option>
              <option value="debt">Có công nợ</option>
            </select>
            <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} style={{ height: 36, border: '1px solid var(--line)', borderRadius: 8, padding: '0 10px', background: '#fff', color: 'var(--ink2)' }} />
            <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} style={{ height: 36, border: '1px solid var(--line)', borderRadius: 8, padding: '0 10px', background: '#fff', color: 'var(--ink2)' }} />
            <button className="btn gold" onClick={handleAdvancedSearch} style={{ height: 36, justifyContent: 'center' }}>Lọc</button>
            <button className="btn" onClick={resetAdvancedSearch} style={{ height: 36, justifyContent: 'center' }}>Khôi phục</button>
          </div>
        )}

        {!showAdvanced && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 12 }}>
            {STATUS_TABS.map(t => {
              const cnt = countByStatus(t.key)
              const active = statusTab === t.key
              return (
                <button key={t.key} onClick={() => setStatusTab(t.key)}
                  style={{
                    padding: '5px 12px', borderRadius: 20, border: '1px solid var(--line)',
                    fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
                    background: active ? 'var(--grad-gold)' : 'var(--surface)',
                    color: active ? '#2a1d14' : 'var(--ink3)',
                    boxShadow: active ? '0 2px 8px rgba(160,113,79,.25)' : 'none',
                    transition: 'all .15s',
                  }}>
                  {t.label}
                  {cnt > 0 && <span style={{ marginLeft: 5, opacity: .7 }}>({cnt})</span>}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--ink3)' }}>Đang tải...</div>
      ) : filteredOrders.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '60px', color: 'var(--ink3)' }}>
          <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'center', color: 'var(--champagne)' }}>
            <I.FileText style={{ width: 40, height: 40 }} />
          </div>
          <div style={{ fontFamily: 'var(--serif)', fontSize: 16, marginBottom: 6 }}>
            {search.trim() ? 'Không tìm thấy đơn nào' : 'Chưa có đơn hàng'}
          </div>
          <div style={{ fontSize: 13 }}>
            {search.trim() ? 'Thử từ khóa khác' : 'Chưa có đơn hàng phù hợp với bộ lọc hiện tại'}
          </div>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="tbl" style={{ tableLayout: 'fixed', width: '100%' }}>
            <colgroup>
              <col style={{ width: '12%' }} />
              <col style={{ width: '12%' }} />
              <col style={{ width: '9%' }} />
              <col style={{ width: '13%' }} />
              <col style={{ width: '8%' }} />
              <col style={{ width: '7%' }} />
              <col style={{ width: '19%' }} />
              <col style={{ width: '13%' }} />
              <col style={{ width: '7%' }} />
            </colgroup>
            <thead>
              <tr>
                <th style={{ paddingLeft: 16 }}>Mã ĐH / Giờ</th>
                <th>Khách Hàng</th>
                <th>Trạng Thái</th>
                <th>NV / Tour / Hoa Hồng</th>
                <th className="amount">Đơn giá</th>
                <th className="amount">Giảm giá</th>
                <th className="amount">Tổng / Thu / Nợ</th>
                <th>Ghi chú</th>
                <th style={{ paddingRight: 16, textAlign: 'center' }}>Thao Tác</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map(o => {
                const st = STATUS_MAP[o.trang_thai] || STATUS_MAP.draft
                const { date: d, time: t } = fmtDateTime(o.created_at, o.ngay)
                const treatmentNote = treatmentOrderNote(o)
                const itemsPreview = orderItemsPreview(o)
                const hasLieuTrinh = treatmentNote || o.trang_thai_note?.includes('lieu_trinh')
                const orderTotal = o.tong_tien_hang || o.thanh_tien || 0
                const paidTotal = o.da_thu_tong ?? o.thuc_thu ?? 0
                const creatorName = o.nguoi_tao_ten || 'HSMS'
                const paymentText = (o.payments || []).length > 0
                  ? (o.payments || []).map(p => `${PTTT_LABEL[p.hinh_thuc] || p.hinh_thuc}: ${formatCurrency(p.so_tien)}`).join(' · ')
                  : 'Không thu tiền'

                return (
                  <tr
                    key={o.id}
                    onClick={() => setDetailOrder(o)}
                    title="Bấm để mở đầy đủ thông tin đơn hàng"
                    style={{ borderBottom: '1px solid var(--line)', cursor: 'pointer' }}
                  >
                    {}
                    <td style={{ paddingLeft: 16 }}>
                      <div style={{ fontWeight: 700, fontFamily: 'var(--serif)', fontSize: 13, color: 'var(--champagne)' }}>
                        {o.ma_don}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                        <span style={{ fontSize: 11, color: 'var(--ink3)' }}>{d} · {t}</span>
                      </div>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 5 }}>
                        {hasLieuTrinh && (
                          <span style={{
                            display: 'inline-block',
                            fontSize: 9.5, fontWeight: 800, padding: '1px 6px',
                            borderRadius: 4, background: 'rgba(201,169,110,.18)', color: '#8a6335',
                          }}>Liệu trình</span>
                        )}
                        {(o.items || []).length > 1 && (
                          <span style={{
                            display: 'inline-block',
                            fontSize: 9.5, fontWeight: 800, padding: '1px 6px',
                            borderRadius: 4, background: 'rgba(61,44,32,.08)', color: 'var(--ink3)',
                          }}>{(o.items || []).length} dòng</span>
                        )}
                      </div>
                    </td>

                    {}
                    <td>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>
                        {o.khach_hang?.ho_ten || (
                          <span style={{ color: 'var(--ink3)', fontStyle: 'italic', fontWeight: 400 }}>Khách lẻ</span>
                        )}
                      </div>
                      {o.khach_hang?.so_dien_thoai && (
                        <div style={{ fontSize: 11, color: 'var(--ink3)', marginTop: 1 }}>{o.khach_hang.so_dien_thoai}</div>
                      )}
                    </td>

                    {}
                    <td>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 5,
                        padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                        background: st.bg, color: st.color,
                      }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: st.dot, flexShrink: 0 }} />
                        {st.label}
                      </span>
                    </td>

                    {}
                    <td>
                      {(o.staff_compensations || []).length > 0 ? (
                        <div style={{ display: 'grid', gap: 3 }}>
                          {(o.staff_compensations || []).map(s => (
                            <div key={s.id || s.name}>
                              <div style={{ fontSize: 12, color: 'var(--ink)', fontWeight: 650, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {s.short_name || shortStaffName(s.name)}
                              </div>
                              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 1 }}>
                                {(s.tour || 0) > 0 && (
                                  <span style={{ fontSize: 10.5, color: '#1A5276', fontWeight: 700 }}>
                                    Tour {formatCurrency(s.tour)}
                                  </span>
                                )}
                                {(s.hoaHong || 0) > 0 && (
                                  <span style={{ fontSize: 10.5, color: '#426a2c', fontWeight: 700 }}>
                                    Hoa Hồng {formatCurrency(s.hoaHong)}
                                  </span>
                                )}
                                {(s.tour || 0) === 0 && (s.hoaHong || 0) === 0 && (
                                  <span style={{ fontSize: 10.5, color: 'var(--ink3)' }}>Chưa có tiền</span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div style={{ fontSize: 12, color: 'var(--ink3)' }}>—</div>
                      )}
                    </td>

                    {}
                    <td className="amount">
                      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)' }}>{formatCurrency(o.don_gia_tong || orderTotal)}</div>
                    </td>

                    <td className="amount">
                      <div style={{ fontSize: 12, color: (o.giam_gia_tong || 0) > 0 ? '#C0392B' : 'var(--ink3)', fontWeight: (o.giam_gia_tong || 0) > 0 ? 700 : 500 }}>
                        {formatCurrency(o.giam_gia_tong || 0)}
                      </div>
                    </td>

                    <td className="amount">
                      <div style={{ fontSize: 10.5, color: 'var(--ink3)', marginBottom: 1 }}>
                        Tổng: {formatCurrency(orderTotal)}
                      </div>
                      <div style={{ fontFamily: 'var(--serif)', fontSize: 15, fontWeight: 700, color: '#426a2c' }}>
                        Thu: {formatCurrency(paidTotal || orderTotal)}
                      </div>
                      {(o.con_no || 0) > 0 && (
                        <div style={{ fontSize: 11, color: 'var(--chi)', fontWeight: 700, marginTop: 1 }}>
                          Công nợ: {formatCurrency(o.con_no)}
                        </div>
                      )}
                      <div style={{ fontSize: 10.5, color: 'var(--ink3)', marginTop: 2, lineHeight: 1.25 }}>{paymentText}</div>
                    </td>

                    <td style={{ overflow: 'hidden' }}>
                      <div style={{
                        fontSize: 11.5, color: 'var(--ink2)', lineHeight: 1.35,
                        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                      }}>
                        {treatmentNote || o.ghi_chu || itemsPreview || o.item_summary || '—'}
                      </div>
                      {(o.items || []).some(i => i.loai_item === 'the_moi') && (
                        <span style={{
                          display: 'inline-block', marginTop: 4,
                          fontSize: 9.5, fontWeight: 700, padding: '1px 6px',
                          borderRadius: 4, background: 'rgba(201,169,110,.16)', color: '#8a6335',
                        }}>Bán thẻ</span>
                      )}
                    </td>

                    {}
                    <td style={{ paddingRight: 12 }}>
                      <div style={{ display: 'flex', gap: 5, justifyContent: 'center' }}>
                        {}
                        <button
                          onClick={(e) => { e.stopPropagation(); setDetailOrder(o) }}
                          title="Xem chi tiết"
                          style={{
                            width: 28, height: 28, borderRadius: 6, border: 'none',
                            background: 'rgba(23,162,184,.12)', color: '#0c5460',
                            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>
                          <I.Info style={{ width: 13, height: 13 }} />
                        </button>

                        {}
                          {o.trang_thai === 'draft' && onResumeOrder && (
                          <button
                            onClick={(e) => { e.stopPropagation(); onResumeOrder(o) }}
                            title="Mở đơn & Thanh toán"
                            style={{
                              width: 28, height: 28, borderRadius: 6, border: 'none',
                              background: 'rgba(40,167,69,.12)', color: '#1a5e2e',
                              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                            <I.Edit style={{ width: 13, height: 13 }} />
                          </button>
                        )}

                        {}
                        <button
                          onClick={(e) => e.stopPropagation()}
                          title="In hoá đơn"
                          style={{
                            width: 28, height: 28, borderRadius: 6, border: 'none',
                            background: 'rgba(52,131,208,.12)', color: '#1a5276',
                            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            opacity: 0.55,
                          }}>
                          <I.FileText style={{ width: 13, height: 13 }} />
                        </button>

                        {}
                        {o.trang_thai !== 'huy' && (
                          <button
                            onClick={(e) => { e.stopPropagation(); setDetailOrder(o); setTimeout(() => {}, 0) }}
                            title="Hủy đơn"
                            style={{
                              width: 28, height: 28, borderRadius: 6, border: 'none',
                              background: 'rgba(220,53,69,.10)', color: '#c0392b',
                              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                            <I.Trash style={{ width: 13, height: 13 }} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 16px', borderTop: '1px solid var(--line)', background: '#fffdf9',
          }}>
            <div style={{ fontSize: 12, color: 'var(--ink3)' }}>
              Hiển thị {pageStart.toLocaleString('vi-VN')}-{pageEnd.toLocaleString('vi-VN')} / {totalOrders.toLocaleString('vi-VN')} đơn
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button
                className="btn"
                disabled={currentPage <= 1 || loading}
                onClick={() => load(Math.max(1, currentPage - 1))}
                style={{ height: 32, opacity: currentPage <= 1 ? .45 : 1 }}>
                <I.ArrowLeft style={{ width: 13, height: 13 }} /> Trang trước
              </button>
              <span style={{ fontSize: 12, color: 'var(--ink2)', fontWeight: 700, minWidth: 86, textAlign: 'center' }}>
                {currentPage} / {totalPages}
              </span>
              <button
                className="btn"
                disabled={currentPage >= totalPages || loading}
                onClick={() => load(Math.min(totalPages, currentPage + 1))}
                style={{ height: 32, opacity: currentPage >= totalPages ? .45 : 1 }}>
                Trang sau <I.ArrowLeft style={{ width: 13, height: 13, transform: 'rotate(180deg)' }} />
              </button>
            </div>
          </div>
        </div>
      )}

      {}
      <DatePicker
        open={showPicker}
        selectedDate={date}
        onClose={() => setShowPicker(false)}
        onConfirm={(iso) => { setDate(iso); setFromDate(iso); setToDate(iso); setDateTab('pick'); setShowPicker(false) }}
      />

      {}
      {detailOrder && (
        <OrderDetailPanel
          order={detailOrder}
          onClose={() => setDetailOrder(null)}
          onVoid={handleVoid}
          canVoid={isAdmin || detailOrder.ngay === todayISO()}
          onEdit={(o) => { setDetailOrder(null); onResumeOrder?.(o); window.location.href = '/pos?resume=' + o.id }}
        />
      )}
    </div>
  )
}
