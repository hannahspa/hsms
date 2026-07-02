import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabase'
import { formatCurrency, getNowVN } from '../../../lib/utils'
import { posService } from '../../../services/posService'
import I from '../../../components/shared/Icons'

const SEG = {
  vip: { l: 'VIP', cls: 'vip' },
  reg: { l: 'THƯỜNG XUYÊN', cls: 'reg' },
  new: { l: 'MỚI', cls: 'new' },
  slp: { l: 'NGỦ ĐÔNG', cls: 'slp' },
}

const AVT_GRAD = {
  vip: 'linear-gradient(135deg,#C9A96E 0%,#A0714F 100%)',
  reg: 'linear-gradient(135deg,#7D9EC0 0%,#5A7A9A 100%)',
  new: 'linear-gradient(135deg,#7BB88F 0%,#4E9467 100%)',
  slp: 'linear-gradient(135deg,#B8A898 0%,#8B7355 100%)',
}

function getSegment(chiTieu) {
  if (chiTieu >= 30000000) return 'vip'
  if (chiTieu >= 10000000) return 'reg'
  if (chiTieu >= 1000000) return 'new'
  return 'slp'
}

function getInitials(name) {
  if (!name) return '?'
  const p = name.trim().split(' ')
  return (p[p.length - 1][0] || '').toUpperCase()
}

function fmtCompact(n) {
  if (!n) return '0₫'
  if (n >= 1e9) return (n / 1e9).toFixed(1) + ' tỷ'
  if (n >= 1e6) return Math.round(n / 1e6) + ' tr'
  return Math.round(n / 1e3) + 'k'
}

function fmtDate(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('vi-VN')
}

function historyLabel(type) {
  if (type === 'mua_the_lieu_trinh') return 'Mua thẻ'
  if (type === 'dung_the_lieu_trinh') return 'Dùng thẻ'
  if (type === 'mua_san_pham') return 'Sản phẩm'
  return 'Dịch vụ'
}

function historyIncome(row) {
  // dich_vu + the_lieu_trinh → tiền KTV là TOUR
  // san_pham + the_moi → COMMISSION (hoa hồng bán hàng)
  const isService = row.loai_item === 'dich_vu' || row.loai_item === 'the_lieu_trinh'
  if (isService) {
    // Fallback: tien_tour trước, nếu 0 thì dùng tien_hoa_hong (data T5 import ghi nhầm cột)
    const amount = row.tien_tour || row.tien_hoa_hong || 0
    if (amount <= 0) return null
    return { label: 'Tour', amount, color: 'var(--thu)' }
  } else {
    const amount = row.tien_hoa_hong || 0
    if (amount <= 0) return null
    return { label: 'Hoa Hồng', amount, color: 'var(--champagne)' }
  }
}

function shortStaffName(name = '') {
  const isRetired = /\(\s*Nghỉ Việc\s*\)/i.test(String(name))
  const baseName = String(name).replace(/\(\s*Nghỉ Việc\s*\)/i, '').trim()
  const parts = baseName.split(/\s+/).filter(Boolean)
  if (parts.length <= 2) return parts.join(' ')
  const displayName = parts.slice(-2).join(' ')
  return isRetired ? `${displayName} (Nghỉ Việc)` : displayName
}

function staffIncomeRows(rows = []) {
  const map = {}
  rows.forEach(row => {
    if (!row.ktv) return
    const key = row.ktv
    if (!map[key]) map[key] = { name: shortStaffName(row.ktv), tour: 0, hoaHong: 0 }
    map[key].tour += row.tien_tour || 0
    map[key].hoaHong += row.tien_hoa_hong || 0
  })
  return Object.values(map)
}

function StaffIncomeList({ staff = [] }) {
  if (!staff.length) return <span>—</span>
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {staff.map(s => (
        <div key={s.name} style={{ lineHeight: 1.25 }}>
          <div style={{ fontWeight: 800, color: 'var(--ink)' }}>{s.name}</div>
          <div style={{ fontSize: 11, color: 'var(--ink3)' }}>
            {s.tour > 0 && <span style={{ color: 'var(--thu)', fontWeight: 800 }}>Tour {formatCurrency(s.tour)}</span>}
            {s.tour > 0 && s.hoaHong > 0 && <span> · </span>}
            {s.hoaHong > 0 && <span style={{ color: 'var(--champagne)', fontWeight: 800 }}>Hoa Hồng {formatCurrency(s.hoaHong)}</span>}
            {s.tour <= 0 && s.hoaHong <= 0 && <span>Chưa có thu nhập</span>}
          </div>
        </div>
      ))}
    </div>
  )
}

function daysSince(dateStr) {
  if (!dateStr) return null
  const d = new Date(dateStr)
  const now = getNowVN()
  return Math.floor((now - d) / 86400000)
}

function DayLabel({ dateStr }) {
  const d = daysSince(dateStr)
  if (d === null) return <span style={{ color: 'var(--ink3)' }}>—</span>
  if (d === 0) return <span style={{ color: 'var(--thu)', fontWeight: 600 }}>Hôm nay</span>
  if (d === 1) return <span style={{ color: 'var(--thu)' }}>Hôm qua</span>
  if (d <= 7) return <span style={{ color: 'var(--ink2)' }}>{d} ngày trước</span>
  if (d <= 30) return <span style={{ color: 'var(--ink3)' }}>{d} ngày trước</span>
  return <span style={{ color: 'var(--ink3)', opacity: .7 }}>{Math.floor(d / 30)} tháng trước</span>
}

function VisitCount({ chiTieu }) {
  const est = Math.max(1, Math.round((chiTieu || 0) / 500000))
  return (
    <div style={{ fontFamily: 'var(--serif)', fontSize: 16, fontWeight: 700, color: 'var(--ink)', lineHeight: 1 }}>
      {est}
      <span style={{ fontSize: 10, fontFamily: 'var(--sans)', fontWeight: 400, color: 'var(--ink3)', marginLeft: 3 }}>lượt</span>
    </div>
  )
}

function CRMEmpty({ children }) {
  return (
    <div style={{ padding: 28, border: '1px dashed var(--line)', borderRadius: 'var(--r)', background: 'var(--bg)', color: 'var(--ink3)', textAlign: 'center', fontSize: 13 }}>
      {children}
    </div>
  )
}

function normalizeText(value = '') {
  return String(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function isCardExpired(card) {
  if (!card.ngay_het_han) return false
  const end = new Date(`${card.ngay_het_han}T23:59:59`)
  const now = getNowVN()
  return !Number.isNaN(end.getTime()) && end < now
}

function getCardRemain(card) {
  const total = Math.max(1, card.so_buoi_tong || 1)
  const used = card.so_buoi_da_dung || 0
  return card.so_buoi_con_lai ?? Math.max(0, total - used)
}

function getCardWorkflowStatus(card) {
  const status = normalizeText(card.trang_thai)
  const note = normalizeText(card.ghi_chu)
  if (['tat_toan', 'tat toan', 'chuyen_doi', 'chuyen doi', 'xoa', 'huy'].some(key => status.includes(key) || note.includes(key))) {
    return 'settled'
  }
  if (status.includes('het_buoi') || getCardRemain(card) <= 0) return 'usedUp'
  if (isCardExpired(card)) return 'expired'
  if (status === 'active') return 'active'
  return 'other'
}

const CARD_STATUS_META = {
  active: { title: 'Liệu trình đang sử dụng', label: 'Đang sử dụng' },
  usedUp: { title: 'Đã sử dụng hết', label: 'Đã dùng hết' },
  expired: { title: 'Hết hạn thời gian', label: 'Hết hạn' },
  settled: { title: 'Tất toán / chuyển đổi / xoá nghiệp vụ', label: 'Đã tất toán' },
  other: { title: 'Trạng thái khác', label: 'Khác' },
}

function CardSection({ title, cards, statusKey }) {
  if (!cards.length) return null
  const ended = statusKey !== 'active'
  const label = CARD_STATUS_META[statusKey]?.label
  return (
    <div style={{ marginTop: 24 }}>
      <h4 style={{ margin: '0 0 10px', color: 'var(--ink)' }}>{title}</h4>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 14 }}>
        {cards.map(card => <TreatmentCard key={card.id} card={card} ended={ended} statusLabel={label} />)}
      </div>
    </div>
  )
}

function TreatmentCard({ card, ended = false, statusLabel = null }) {
  const total = Math.max(1, card.so_buoi_tong || 1)
  const used = card.so_buoi_da_dung || 0
  const remain = getCardRemain(card)
  const pct = Math.min(100, Math.round((used / total) * 100))
  const usedValue = Math.round((card.gia_tri_the || 0) * (used / total))

  return (
    <div style={{
      position: 'relative',
      overflow: 'hidden',
      minHeight: 178,
      borderRadius: 12,
      border: ended ? '1px solid var(--line)' : '1px solid rgba(201,169,110,.28)',
      background: ended ? 'var(--bg)' : 'linear-gradient(135deg,rgba(201,169,110,.12),rgba(160,113,79,.05))',
      padding: 18,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start' }}>
        <div style={{ minWidth: 0 }}>
          <h5 style={{ margin: 0, fontSize: 15, color: ended ? 'var(--ink2)' : 'var(--ink)', fontWeight: 900 }}>{card.ten_dich_vu}</h5>
          <div style={{ marginTop: 6, color: 'var(--ink3)', fontSize: 12, fontWeight: 700 }}>{card.ma_the || 'Chưa có mã thẻ'}</div>
          <div style={{ marginTop: 18, color: 'var(--ink3)', fontSize: 12, fontWeight: 800, textTransform: 'uppercase' }}>Liệu trình</div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontFamily: 'var(--serif)', fontSize: 34, fontWeight: 900, color: ended ? 'var(--ink3)' : 'var(--champagne)', lineHeight: 1 }}>{used}/{total}</div>
          <div style={{ marginTop: 6, fontSize: 12, color: 'var(--ink3)' }}>({formatCurrency(card.gia_tri_the || 0)})</div>
        </div>
      </div>
      <div className="bar-h" style={{ marginTop: 18, height: 7, borderRadius: 99 }}>
        <i style={{ width: pct + '%', background: ended ? 'var(--ink3)' : 'var(--grad-gold)', borderRadius: 99 }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginTop: 10, color: 'var(--ink3)', fontSize: 12 }}>
        <span>Số tiền đã sử dụng/Tổng thanh toán</span>
        <span style={{ color: 'var(--ink2)', fontWeight: 800 }}>{formatCurrency(usedValue)}/{formatCurrency(card.gia_tri_the || 0)}</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginTop: 12, fontSize: 12, fontWeight: 800 }}>
        <span style={{ color: remain > 0 ? 'var(--thu)' : 'var(--ink3)' }}>Còn {remain} buổi</span>
        <span style={{ color: ended ? 'var(--ink3)' : 'var(--champagne)' }}>{ended ? 'Đã kết thúc' : 'Đang sử dụng'}</span>
      </div>
    </div>
  )
}

function AdminCRMDetailPage({ customerId }) {
  const [snapshot, setSnapshot] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('info')
  const [expandedOrderId, setExpandedOrderId] = useState(null)
  const [prepaidHistory, setPrepaidHistory] = useState([])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    posService.getCustomerSnapshot(customerId, { cardLimit: 300, historyLimit: 1000, debtLimit: 200 })
      .then(data => { if (!cancelled) setSnapshot(data) })
      .catch(() => { if (!cancelled) setSnapshot(null) })
      .finally(() => { if (!cancelled) setLoading(false) })
    posService.getPrepaidHistory(customerId, 100)
      .then(rows => { if (!cancelled) setPrepaidHistory(rows || []) })
      .catch(() => { if (!cancelled) setPrepaidHistory([]) })
    return () => { cancelled = true }
  }, [customerId])

  if (loading) {
    return <div style={{ padding: 60, textAlign: 'center', color: 'var(--ink3)' }}>Đang tải hồ sơ khách hàng...</div>
  }

  const customer = snapshot?.customer
  if (!customer) {
    return (
      <div>
        <button className="btn ghost" onClick={() => { window.location.href = '/admin/crm' }} style={{ marginBottom: 16 }}>
          <I.ArrowLeft style={{ width: 14, height: 14 }} /> Danh sách khách hàng
        </button>
        <CRMEmpty>Không tìm thấy hồ sơ khách hàng.</CRMEmpty>
      </div>
    )
  }

  const seg = getSegment(customer.tong_chi_tieu)
  const cards = snapshot.cards || []
  const activeCards = snapshot.activeCards || []
  const history = snapshot.history || []
  const debts = snapshot.debtRows || []
  const orderGroups = Object.values(history.reduce((acc, row) => {
    const key = row.don_hang_id || row.ma_don || row.don_hang_chi_tiet_id
    if (!acc[key]) {
      acc[key] = {
        id: key,
        ma_don: row.ma_don || '—',
        ngay: row.ngay,
        created_at: row.created_at,
        trang_thai: row.trang_thai,
        note: '',
        rows: [],
      }
    }
    acc[key].rows.push(row)
    if (row.loai_lich_su === 'dung_the_lieu_trinh' && row.ma_the) {
      acc[key].note = `Sử dụng thẻ liệu trình ${row.ten_dich_vu || ''}. (Mã thẻ: ${row.ma_the})`
    }
    return acc
  }, {})).map(order => {
    const total = order.rows.reduce((sum, row) => sum + (row.thanh_tien || 0), 0)
    const qty = order.rows.reduce((sum, row) => sum + (row.so_luong || 0), 0)
    const staff = [...new Set(order.rows.map(row => row.ktv).filter(Boolean))]
    const staffIncome = staffIncomeRows(order.rows)
    const income = order.rows.reduce((sum, row) => sum + (row.tien_tour || 0) + (row.tien_hoa_hong || 0), 0)
    return { ...order, total, qty, staff, staffIncome, income }
  })
  const treatmentCardGroups = cards.reduce((acc, card) => {
    const key = getCardWorkflowStatus(card)
    acc[key].push(card)
    return acc
  }, { active: [], usedUp: [], expired: [], settled: [], other: [] })
  const activeTreatmentCards = treatmentCardGroups.active
  const endedTreatmentCards = treatmentCardGroups.usedUp
  const cardTotalValue = cards.reduce((sum, card) => sum + (card.gia_tri_the || 0), 0)
  const cardUsedValue = cards.reduce((sum, card) => {
    const total = Math.max(1, card.so_buoi_tong || 1)
    return sum + Math.round((card.gia_tri_the || 0) * ((card.so_buoi_da_dung || 0) / total))
  }, 0)
  const tabs = [
    { k: 'info', l: 'Thông Tin', icon: I.User },
    { k: 'debt', l: 'Công Nợ', icon: I.Receipt, n: snapshot.debtBalance > 0 ? 1 : 0 },
    { k: 'prepaid', l: 'Ví Trả Trước', icon: I.Wallet, n: (customer.so_du_tra_truoc || 0) > 0 ? 1 : 0 },
    { k: 'appointment', l: 'Đặt Hẹn', icon: I.Calendar },
    { k: 'service', l: 'Dịch Vụ Đã Sử Dụng', icon: I.Box, n: orderGroups.length },
    { k: 'cards', l: 'Thẻ Dịch Vụ', icon: I.CreditCard, n: cards.length },
    { k: 'note', l: 'Ghi Chú', icon: I.FileText },
    { k: 'image', l: 'Hình Ảnh', icon: I.Image },
  ]

  return (
    <div>
      <div className="mod-head" style={{ marginBottom: 18 }}>
        <div>
          <button className="btn ghost" onClick={() => { window.location.href = '/admin/crm' }} style={{ marginBottom: 12 }}>
            <I.ArrowLeft style={{ width: 14, height: 14 }} /> Danh sách khách hàng
          </button>
          <div className="ttl">Thông tin khách hàng</div>
          <div className="sub">{customer.ma_kh || customer.id?.slice(0, 8)} · {customer.so_dien_thoai || 'Chưa có SĐT'}</div>
        </div>
        <div className="acts">
          <button className="btn gold" onClick={() => { window.location.href = '/pos' }}>
            <I.Cart style={{ width: 13, height: 13 }} /> Tạo đơn hàng
          </button>
          <button className="btn" onClick={() => window.open(`tel:${customer.so_dien_thoai || ''}`)}>
            <I.Phone style={{ width: 13, height: 13 }} /> Gọi điện
          </button>
        </div>
      </div>

      <div style={{
        background: 'var(--surface)',
        border: '1px solid var(--bord)',
        borderRadius: 'var(--r-lg)',
        boxShadow: 'var(--sh-2)',
        overflow: 'hidden',
      }}>
        <div style={{ padding: '26px 30px 20px', textAlign: 'center', borderBottom: '1px solid var(--line)' }}>
          <div style={{
            width: 92, height: 92, borderRadius: '50%',
            background: AVT_GRAD[seg],
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontFamily: 'var(--serif)', fontSize: 36, fontWeight: 700,
            margin: '0 auto 12px',
            boxShadow: '0 8px 26px rgba(160,113,79,.28)',
          }}>
            {getInitials(customer.ho_ten)}
          </div>
          <div style={{ fontFamily: 'var(--serif)', fontSize: 26, fontWeight: 700, color: 'var(--ink)' }}>{customer.ho_ten}</div>
          <div style={{ marginTop: 8 }}><span className={`seg ${seg}`}>{SEG[seg].l}</span></div>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, minmax(92px, 1fr))',
          gap: 0,
          borderBottom: '1px solid var(--line)',
          overflowX: 'auto',
        }}>
          {tabs.map(tab => {
            const Icon = tab.icon
            const active = activeTab === tab.k
            return (
              <button key={tab.k} type="button" onClick={() => setActiveTab(tab.k)}
                style={{
                  minHeight: 78,
                  border: 0,
                  borderRight: '1px solid var(--line)',
                  borderBottom: active ? '3px solid var(--champagne)' : '3px solid transparent',
                  background: active ? 'rgba(201,169,110,.08)' : 'var(--surface)',
                  color: active ? 'var(--champagne)' : 'var(--ink2)',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  gap: 6,
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontFamily: 'var(--sans)',
                }}>
                <Icon style={{ width: 22, height: 22 }} />
                <span>{tab.l}</span>
                {tab.n > 0 && <span style={{ fontSize: 10, color: 'var(--ink3)' }}>{tab.n}</span>}
              </button>
            )
          })}
        </div>

        <div style={{ padding: 28 }}>
          {activeTab === 'info' && (
            <div>
              <h2 style={{ margin: '0 0 18px', fontFamily: 'var(--serif)', color: 'var(--ink)' }}>Thông tin khách hàng</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                {[
                  ['Mã khách hàng', customer.ma_kh || customer.id?.slice(0, 8)],
                  ['Họ tên', customer.ho_ten || '—'],
                  ['Số điện thoại', customer.so_dien_thoai || '—'],
                  ['Ngày sinh', customer.ngay_sinh ? fmtDate(customer.ngay_sinh) : '—'],
                  ['Tổng chi tiêu', formatCurrency(customer.tong_chi_tieu || 0)],
                  ['Lần cuối đến', customer.lan_cuoi_den ? fmtDate(customer.lan_cuoi_den) : '—'],
                  ['Da liễu / nhu cầu', customer.ghi_chu_da_lieu || '—'],
                  ['Thẻ đang dùng', `${activeCards.length} thẻ`],
                  ['Công nợ', formatCurrency(snapshot.debtBalance || 0)],
                  ['Số dư trả trước', formatCurrency(customer.so_du_tra_truoc || 0)],
                ].map(([label, value]) => (
                  <div key={label} style={{ background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 10, padding: '12px 14px' }}>
                    <div style={{ fontSize: 11, color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 6 }}>{label}</div>
                    <div style={{ fontSize: 14, color: 'var(--ink)', fontWeight: 700 }}>{value}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'debt' && (
            <div>
              <h2 style={{ margin: '0 0 16px', fontFamily: 'var(--serif)', color: 'var(--ink)' }}>Danh sách nợ</h2>
              <div style={{ fontSize: 28, fontFamily: 'var(--serif)', color: snapshot.debtBalance > 0 ? 'var(--danger)' : 'var(--thu)', marginBottom: 16 }}>
                Tổng nợ: {formatCurrency(snapshot.debtBalance || 0)}
              </div>
              {debts.length ? debts.map((d, idx) => (
                <div key={idx} style={{ display: 'grid', gridTemplateColumns: '130px 1fr 140px 140px', gap: 12, padding: '12px 0', borderTop: '1px solid var(--line)', fontSize: 13 }}>
                  <div>{fmtDate(d.ngay)}</div>
                  <div>{d.ghi_chu || d.loai}</div>
                  <div>{formatCurrency(d.so_tien || 0)}</div>
                  <div style={{ fontWeight: 800 }}>{formatCurrency(d.so_du_con_lai || 0)}</div>
                </div>
              )) : <CRMEmpty>Khách hàng không còn công nợ.</CRMEmpty>}
            </div>
          )}

          {activeTab === 'prepaid' && (() => {
            const PRE_META = {
              nap:        { label: 'Nạp tiền',    sign: '+', color: 'var(--thu)' },
              su_dung:    { label: 'Dùng thanh toán', sign: '−', color: 'var(--danger)' },
              hoan:       { label: 'Hoàn lại',    sign: '+', color: 'var(--thu)' },
              dieu_chinh: { label: 'Điều chỉnh',  sign: '',  color: 'var(--ink2)' },
            }
            const soDu = customer.so_du_tra_truoc || 0
            return (
              <div>
                <h2 style={{ margin: '0 0 16px', fontFamily: 'var(--serif)', color: 'var(--ink)' }}>Ví trả trước</h2>
                <div style={{ display: 'flex', gap: 12, marginBottom: 18, flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 200, background: 'rgba(201,169,110,.10)', border: '1px solid rgba(201,169,110,.32)', borderRadius: 'var(--r)', padding: '14px 18px' }}>
                    <div style={{ fontSize: 11, color: '#8a6a35', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 6, fontWeight: 600 }}>Số dư khả dụng</div>
                    <div style={{ fontFamily: 'var(--serif)', fontSize: 30, fontWeight: 700, color: '#8a6a35', lineHeight: 1 }}>{formatCurrency(soDu)}</div>
                  </div>
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, fontFamily: 'var(--serif)', color: 'var(--ink)', marginBottom: 10 }}>
                  Lịch sử giao dịch{prepaidHistory.length ? ` (${prepaidHistory.length})` : ''}
                </div>
                {prepaidHistory.length ? (
                  <div style={{ border: '1px solid var(--line)', borderRadius: 'var(--r)', overflow: 'hidden' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr 130px 130px', gap: 10, padding: '9px 14px', background: 'var(--bg)', fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--ink3)', fontWeight: 700 }}>
                      <div>Ngày</div><div>Loại / Ghi chú</div><div style={{ textAlign: 'right' }}>Số tiền</div><div style={{ textAlign: 'right' }}>Số dư sau</div>
                    </div>
                    {prepaidHistory.map(h => {
                      const m = PRE_META[h.loai] || { label: h.loai, sign: '', color: 'var(--ink2)' }
                      return (
                        <div key={h.id} style={{ display: 'grid', gridTemplateColumns: '90px 1fr 130px 130px', gap: 10, padding: '11px 14px', borderTop: '1px solid var(--line)', fontSize: 12.5, alignItems: 'center' }}>
                          <div style={{ color: 'var(--ink3)' }}>{fmtDate(h.ngay)}</div>
                          <div>
                            <span style={{ fontWeight: 700, color: m.color }}>{m.label}</span>
                            {h.hinh_thuc && <span style={{ fontSize: 11, color: 'var(--ink3)' }}> · {h.hinh_thuc === 'tien_mat' ? 'Tiền mặt' : h.hinh_thuc === 'chuyen_khoan' ? 'CK' : h.hinh_thuc === 'quet_the' ? 'Quẹt thẻ' : h.hinh_thuc}</span>}
                            {h.ghi_chu && <div style={{ fontSize: 11, color: 'var(--ink3)', marginTop: 2 }}>{h.ghi_chu}</div>}
                          </div>
                          <div style={{ textAlign: 'right', fontWeight: 800, color: m.color }}>{m.sign}{formatCurrency(h.so_tien || 0)}</div>
                          <div style={{ textAlign: 'right', fontWeight: 700, color: 'var(--ink2)' }}>{formatCurrency(h.so_du_sau || 0)}</div>
                        </div>
                      )
                    })}
                  </div>
                ) : <CRMEmpty>Khách hàng chưa có giao dịch ví trả trước.</CRMEmpty>}
              </div>
            )
          })()}

          {activeTab === 'appointment' && (
            <CRMEmpty>Tab Đặt Hẹn đã đúng vị trí như MySpa. Bước sau mình sẽ nối dữ liệu lịch hẹn/booking của HSMS vào đây.</CRMEmpty>
          )}

          {activeTab === 'service' && (
            <div>
              <h2 style={{ margin: '0 0 10px', fontFamily: 'var(--serif)', color: 'var(--ink)' }}>Dịch vụ đã sử dụng</h2>
              <div style={{ display: 'flex', gap: 24, marginBottom: 20, color: 'var(--ink2)', fontSize: 15, fontWeight: 700 }}>
                <div>Tổng lượt khách đến: <span style={{ color: 'var(--ink)' }}>{orderGroups.length}</span></div>
                <div>Tổng tiền: <span style={{ color: 'var(--champagne)' }}>{formatCurrency(orderGroups.reduce((sum, order) => sum + order.total, 0))}</span></div>
              </div>
              {orderGroups.length ? (
                <div style={{ border: '1px solid var(--line)', borderRadius: 10, overflowX: 'auto', overflowY: 'hidden' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '140px 140px 105px 60px 80px 60px 110px 170px minmax(140px,1fr)', gap: 10, padding: '12px 14px', background: 'var(--bg)', fontSize: 11, fontWeight: 800, color: 'var(--ink3)', textTransform: 'uppercase', minWidth: 1120 }}>
                    <div>Thời gian</div><div>Mã đơn hàng</div><div>Đơn giá</div><div>VAT</div><div>Giảm giá</div><div>SL</div><div>Tổng tiền</div><div>NV thực hiện</div><div>Ghi chú</div>
                  </div>
                  {orderGroups.map(order => {
                    const open = expandedOrderId === order.id
                    return (
                      <div key={order.id}>
                        <div style={{ display: 'grid', gridTemplateColumns: '140px 140px 105px 60px 80px 60px 110px 170px minmax(140px,1fr)', gap: 10, padding: '13px 14px', borderTop: '1px solid var(--line)', fontSize: 13, alignItems: 'center', background: open ? 'rgba(201,169,110,.06)' : 'var(--surface)', minWidth: 1120 }}>
                          <div>{fmtDate(order.ngay)}</div>
                          <button type="button" onClick={() => setExpandedOrderId(open ? null : order.id)} style={{ border: 0, background: 'transparent', color: 'var(--champagne)', fontWeight: 900, textAlign: 'left', padding: 0, cursor: 'pointer', fontFamily: 'var(--sans)' }}>
                            {order.ma_don}
                          </button>
                          <div>{formatCurrency(order.total)}</div>
                          <div>0</div>
                          <div>0</div>
                          <div>{order.qty || '—'}</div>
                          <div style={{ fontWeight: 800 }}>{formatCurrency(order.total)}</div>
                          <div><StaffIncomeList staff={order.staffIncome} /></div>
                          <div>{order.note || (open ? 'Chi tiết đơn hàng đang mở' : 'Bấm mã đơn để xem chi tiết')}</div>
                        </div>
                        {open && (
                          <div style={{ background: 'var(--bg)', borderTop: '1px solid var(--line)' }}>
                            {order.rows.map(row => (
                                <div key={row.don_hang_chi_tiet_id || `${order.id}-${row.ten_dich_vu}`} style={{ display: 'grid', gridTemplateColumns: '140px 140px 105px 60px 80px 60px 110px 170px minmax(140px,1fr)', gap: 10, padding: '11px 14px 11px 28px', borderTop: '1px solid rgba(0,0,0,.04)', fontSize: 13, color: 'var(--ink2)', alignItems: 'center', minWidth: 1120 }}>
                                  <div>{row.ten_dich_vu || historyLabel(row.loai_lich_su)}</div>
                                  <div style={{ color: 'var(--ink3)' }}>{row.ma_the || ''}</div>
                                  <div>{formatCurrency(row.don_gia || 0)}</div>
                                  <div>0</div>
                                  <div></div>
                                  <div>x{row.so_luong || 1}</div>
                                  <div>{formatCurrency(row.thanh_tien || 0)}</div>
                                  <div>
                                    <StaffIncomeList staff={staffIncomeRows([row])} />
                                  </div>
                                  <div></div>
                                </div>
                              ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              ) : <CRMEmpty>Chưa có lịch sử dịch vụ đã chốt từ POS.</CRMEmpty>}
            </div>
          )}

          {false && activeTab === 'service' && (
            <div>
              <h2 style={{ margin: '0 0 16px', fontFamily: 'var(--serif)', color: 'var(--ink)' }}>Dịch vụ đã sử dụng</h2>
              {history.length ? (
                <div style={{ border: '1px solid var(--line)', borderRadius: 10, overflow: 'hidden' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '120px 130px 1fr 120px 160px 130px', gap: 10, padding: '11px 14px', background: 'var(--bg)', fontSize: 11, fontWeight: 800, color: 'var(--ink3)', textTransform: 'uppercase' }}>
                    <div>Thời gian</div><div>Mã đơn</div><div>Dịch vụ</div><div>Tổng tiền</div><div>NV thực hiện</div><div>Tour / Hoa Hồng</div>
                  </div>
                  {history.map(row => {
                    const income = historyIncome(row)
                    return (
                      <div key={row.don_hang_chi_tiet_id || row.don_hang_id} style={{ display: 'grid', gridTemplateColumns: '120px 130px 1fr 120px 160px 130px', gap: 10, padding: '12px 14px', borderTop: '1px solid var(--line)', fontSize: 13, alignItems: 'center' }}>
                        <div>{fmtDate(row.ngay)}</div>
                        <div style={{ fontWeight: 800 }}>{row.ma_don || '—'}</div>
                        <div>{row.ten_dich_vu || historyLabel(row.loai_lich_su)}</div>
                        <div>{formatCurrency(row.thanh_tien || 0)}</div>
                        <div>{row.ktv || 'Chưa gắn'}</div>
                        <div style={{ color: income?.color || 'var(--ink3)', fontWeight: 800 }}>{income ? `${income.label} ${formatCurrency(income.amount)}` : '—'}</div>
                      </div>
                    )
                  })}
                </div>
              ) : <CRMEmpty>Chưa có lịch sử dịch vụ đã chốt từ POS.</CRMEmpty>}
            </div>
          )}

          {activeTab === 'cards' && (
            <div>
              <h2 style={{ margin: '0 0 18px', fontFamily: 'var(--serif)', color: 'var(--ink)' }}>Thẻ dịch vụ</h2>
              <div style={{ marginBottom: 28 }}>
                <h3 style={{ margin: '0 0 14px', fontFamily: 'var(--serif)', color: 'var(--ink)', fontSize: 20 }}>Thẻ trả trước</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 18 }}>
                  {[
                    ['Tài khoản', 0, 'var(--champagne)'],
                    ['Công nợ', 0, 'var(--danger)'],
                    ['Số dư khả dụng', 0, 'var(--thu)'],
                    ['Đã sử dụng', 0, 'var(--ink)'],
                  ].map(([label, value, color]) => (
                    <div key={label} style={{ background: 'var(--bg)', borderRadius: 10, padding: 16, border: '1px solid var(--line)' }}>
                      <div style={{ fontSize: 12, color: 'var(--ink3)', fontWeight: 700 }}>{label}</div>
                      <div style={{ marginTop: 8, fontFamily: 'var(--serif)', fontSize: 28, fontWeight: 800, color }}>{formatCurrency(value)}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ marginBottom: 28 }}>
                <h3 style={{ margin: '0 0 14px', fontFamily: 'var(--serif)', color: 'var(--ink)', fontSize: 20 }}>Tài khoản thưởng</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 18 }}>
                  {['Tổng tiền thưởng', 'Đã sử dụng', 'Số dư khả dụng'].map(label => (
                    <div key={label} style={{ background: 'var(--bg)', borderRadius: 10, padding: 16, border: '1px solid var(--line)' }}>
                      <div style={{ fontSize: 12, color: 'var(--ink3)', fontWeight: 700 }}>{label}</div>
                      <div style={{ marginTop: 8, fontFamily: 'var(--serif)', fontSize: 28, fontWeight: 800, color: 'var(--champagne)' }}>{formatCurrency(0)}</div>
                    </div>
                  ))}
                </div>
              </div>
              <h3 style={{ margin: '0 0 14px', fontFamily: 'var(--serif)', color: 'var(--ink)', fontSize: 20 }}>Thẻ liệu trình</h3>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, marginBottom: 14, color: 'var(--ink2)', fontSize: 13, fontWeight: 700 }}>
                <span>Tổng giá trị: {formatCurrency(cardTotalValue)}</span>
                <span>Đã sử dụng: {formatCurrency(cardUsedValue)}</span>
                <span>Đang sử dụng: {activeTreatmentCards.length}</span>
              </div>
              {cards.length ? (
                <>
                  <h4 style={{ margin: '18px 0 10px', color: 'var(--ink)' }}>Liệu trình đang sử dụng</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 14 }}>
                    {activeTreatmentCards.map(card => <TreatmentCard key={card.id} card={card} />)}
                  </div>
                  <h4 style={{ margin: '24px 0 10px', color: 'var(--ink)' }}>Liệu trình đã kết thúc</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 14 }}>
                    {endedTreatmentCards.map(card => <TreatmentCard key={card.id} card={card} ended />)}
                  </div>
                  <CardSection title={CARD_STATUS_META.expired.title} cards={treatmentCardGroups.expired} statusKey="expired" />
                  <CardSection title={CARD_STATUS_META.settled.title} cards={treatmentCardGroups.settled} statusKey="settled" />
                  <CardSection title={CARD_STATUS_META.other.title} cards={treatmentCardGroups.other} statusKey="other" />
                </>
              ) : <CRMEmpty>Khách chưa có thẻ dịch vụ/thẻ liệu trình.</CRMEmpty>}
            </div>
          )}

          {false && activeTab === 'cards' && (
            <div>
              <h2 style={{ margin: '0 0 16px', fontFamily: 'var(--serif)', color: 'var(--ink)' }}>Thẻ dịch vụ</h2>
              {cards.length ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
                  {cards.map(card => {
                    const pct = card.so_buoi_tong > 0 ? Math.min(100, Math.round((card.so_buoi_da_dung / card.so_buoi_tong) * 100)) : 0
                    return (
                      <div key={card.id} style={{ border: '1px solid var(--line)', borderRadius: 10, padding: 14, background: 'var(--bg)' }}>
                        <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--ink)' }}>{card.ten_dich_vu}</div>
                        <div style={{ fontSize: 12, color: 'var(--ink3)', marginTop: 4 }}>{card.ma_the || 'Chưa có mã thẻ'} · {card.trang_thai}</div>
                        <div className="bar-h" style={{ marginTop: 12, height: 6 }}><i style={{ width: pct + '%', background: 'var(--grad-gold)' }} /></div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 12 }}>
                          <span>Còn {card.so_buoi_con_lai || 0} buổi</span>
                          <span>{card.so_buoi_da_dung || 0}/{card.so_buoi_tong || 0}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : <CRMEmpty>Khách chưa có thẻ dịch vụ/thẻ liệu trình.</CRMEmpty>}
            </div>
          )}

          {activeTab === 'note' && (
            <div>
              <h2 style={{ margin: '0 0 16px', fontFamily: 'var(--serif)', color: 'var(--ink)' }}>Ghi chú</h2>
              <div style={{ border: '1px solid var(--line)', borderRadius: 10, padding: 16, background: 'var(--bg)', minHeight: 120 }}>
                {customer.ghi_chu_da_lieu || 'Chưa có ghi chú chăm sóc. Bước sau sẽ thêm lịch sử ghi chú theo từng lần tư vấn.'}
              </div>
            </div>
          )}

          {activeTab === 'image' && (
            <div>
              <h2 style={{ margin: '0 0 16px', fontFamily: 'var(--serif)', color: 'var(--ink)' }}>Hình ảnh</h2>
              <CRMEmpty>Chưa có album hình ảnh. Tab này sẽ dùng cho ảnh trước/sau điều trị như MySpa.</CRMEmpty>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function AdminCRMPage() {
  const match = window.location.pathname.match(/^\/admin\/crm\/khach-hang\/([^/]+)/)
  if (match?.[1]) return <AdminCRMDetailPage customerId={decodeURIComponent(match[1])} />
  return <AdminCRMListPage />
}

function AdminCRMListPage() {
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [activeSeg, setActiveSeg] = useState('all')
  const [sortBy, setSortBy] = useState('chi_tieu')
  const [selected, setSelected] = useState(null)
  const [showNew, setShowNew] = useState(false)
  const [newForm, setNewForm] = useState({ ho_ten: '', so_dien_thoai: '', ngay_sinh: '', ghi_chu_da_lieu: '' })
  const [saving, setSaving] = useState(false)
  const [cards, setCards] = useState([])
  const [loadingCards, setLoadingCards] = useState(false)
  const [snapshot, setSnapshot] = useState(null)
  const [loadingSnapshot, setLoadingSnapshot] = useState(false)
  const [activeCustomerTab, setActiveCustomerTab] = useState('info')

  useEffect(() => { loadCustomers() }, [])

  useEffect(() => {
    setActiveCustomerTab('info')
  }, [selected?.id])

  useEffect(() => {
    if (!selected?.id) { setCards([]); return }
    setLoadingCards(true)
    supabase.from('the_lieu_trinh')
      .select('*')
      .eq('khach_hang_id', selected.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => { setCards(data || []); setLoadingCards(false) })
  }, [selected?.id])

  useEffect(() => {
    let cancelled = false
    if (!selected?.id) {
      setSnapshot(null)
      setLoadingSnapshot(false)
      return
    }
    setLoadingSnapshot(true)
    posService.getCustomerSnapshot(selected.id)
      .then(data => {
        if (!cancelled) setSnapshot(data)
      })
      .catch(() => {
        if (!cancelled) setSnapshot(null)
      })
      .finally(() => {
        if (!cancelled) setLoadingSnapshot(false)
      })
    return () => { cancelled = true }
  }, [selected?.id])

  const handleCreate = async () => {
    if (!newForm.ho_ten.trim() || !newForm.so_dien_thoai.trim()) return
    setSaving(true)
    const { error } = await supabase.from('khach_hang').insert({
      ho_ten: newForm.ho_ten.trim(),
      so_dien_thoai: newForm.so_dien_thoai.trim(),
      ngay_sinh: newForm.ngay_sinh || null,
      ghi_chu_da_lieu: newForm.ghi_chu_da_lieu || null,
    })
    setSaving(false)
    if (!error) {
      setShowNew(false)
      setNewForm({ ho_ten: '', so_dien_thoai: '', ngay_sinh: '', ghi_chu_da_lieu: '' })
      loadCustomers()
    }
  }

  const loadCustomers = async () => {
    setLoading(true)
    // Tải batch 1 (1000 KH top chi tiêu) → hiển thị ngay, các batch sau load background
    const PAGE = 1000
    const { data: firstBatch } = await supabase
      .from('khach_hang')
      .select('*')
      .order('tong_chi_tieu', { ascending: false, nullsFirst: false })
      .range(0, PAGE - 1)
    setCustomers(firstBatch || [])
    setLoading(false)  // ← UI mở khoá ngay với 1000 KH đầu

    // Background: load các batch còn lại
    let from = PAGE
    const all = [...(firstBatch || [])]
    while (firstBatch && firstBatch.length === PAGE) {
      const { data, error } = await supabase
        .from('khach_hang')
        .select('*')
        .order('tong_chi_tieu', { ascending: false, nullsFirst: false })
        .range(from, from + PAGE - 1)
      if (error || !data || data.length === 0) break
      all.push(...data)
      setCustomers([...all])
      if (data.length < PAGE) break
      from += PAGE
    }
  }

  // Stats
  const total = customers.length
  const vipN = customers.filter(c => getSegment(c.tong_chi_tieu) === 'vip').length
  const regN = customers.filter(c => getSegment(c.tong_chi_tieu) === 'reg').length
  const newN = customers.filter(c => getSegment(c.tong_chi_tieu) === 'new').length
  const slpN = customers.filter(c => getSegment(c.tong_chi_tieu) === 'slp').length
  const totalRev = customers.reduce((s, c) => s + (c.tong_chi_tieu || 0), 0)
  const avgLTV = total > 0 ? Math.round(totalRev / total) : 0
  const activeN = customers.filter(c => {
    const d = daysSince(c.lan_cuoi_den)
    return d !== null && d <= 30
  }).length
  const returnRate = total > 0 ? Math.round(activeN / total * 100) : 0
  const maxSpend = customers[0]?.tong_chi_tieu || 1

  // Filter + sort
  const filtered = customers
    .filter(c => {
      if (activeSeg !== 'all' && getSegment(c.tong_chi_tieu) !== activeSeg) return false
      if (search) {
        const q = search.toLowerCase()
        if (!c.ho_ten?.toLowerCase().includes(q) && !c.so_dien_thoai?.includes(search)) return false
      }
      return true
    })
    .sort((a, b) => {
      if (sortBy === 'recency') {
        if (!a.lan_cuoi_den) return 1
        if (!b.lan_cuoi_den) return -1
        return new Date(b.lan_cuoi_den) - new Date(a.lan_cuoi_den)
      }
      if (sortBy === 'name') return (a.ho_ten || '').localeCompare(b.ho_ten || '', 'vi')
      return (b.tong_chi_tieu || 0) - (a.tong_chi_tieu || 0)
    })

  const chips = [
    { k: 'all', l: 'Tất cả', n: total },
    { k: 'vip', l: 'VIP', n: vipN },
    { k: 'reg', l: 'Thường xuyên', n: regN },
    { k: 'new', l: 'Mới', n: newN },
    { k: 'slp', l: 'Ngủ đông', n: slpN },
  ]

  const INP = {
    width: '100%', padding: '10px 12px', borderRadius: 10,
    border: '1px solid var(--bord)', fontSize: 14,
    background: 'var(--surface)', color: 'var(--ink)',
    fontFamily: 'var(--sans)', outline: 'none', boxSizing: 'border-box',
  }

  return (
    <>
    {/* ── Modal Khách Mới ── */}
    {showNew && (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(26,18,9,.55)', zIndex: 1000 }}
        onClick={() => setShowNew(false)}>
        <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: 'calc(100vw - var(--side-w, 248px))', maxWidth: '100vw', background: 'var(--surface)', padding: 28, overflowY: 'auto', boxShadow: '-6px 0 40px rgba(26,18,9,.3)', animation: 'rpSlideIn .22s ease' }}
          onClick={e => e.stopPropagation()}>
          <div style={{ fontFamily: 'var(--serif)', fontSize: 22, fontWeight: 700, color: 'var(--ink)', marginBottom: 6 }}>Thêm Khách Hàng</div>
          <div style={{ fontSize: 12, color: 'var(--ink3)', marginBottom: 22 }}>Nhập thông tin để tạo hồ sơ mới</div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 5 }}>Họ Tên *</div>
              <input style={INP} placeholder="Nguyễn Thị Lan" value={newForm.ho_ten}
                onChange={e => setNewForm(s => ({ ...s, ho_ten: e.target.value }))} autoFocus />
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 5 }}>Số Điện Thoại *</div>
              <input style={INP} placeholder="0901234567" value={newForm.so_dien_thoai}
                onChange={e => setNewForm(s => ({ ...s, so_dien_thoai: e.target.value }))} inputMode="tel" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 5 }}>Ngày Sinh</div>
                <input type="date" style={INP} value={newForm.ngay_sinh}
                  onChange={e => setNewForm(s => ({ ...s, ngay_sinh: e.target.value }))} />
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 5 }}>Ghi Chú Da</div>
                <input style={INP} placeholder="Nhạy cảm, mụn..." value={newForm.ghi_chu_da_lieu}
                  onChange={e => setNewForm(s => ({ ...s, ghi_chu_da_lieu: e.target.value }))} />
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
            <button onClick={() => setShowNew(false)} className="btn ghost" style={{ flex: 1, justifyContent: 'center' }}>Hủy</button>
            <button onClick={handleCreate} disabled={saving || !newForm.ho_ten.trim() || !newForm.so_dien_thoai.trim()}
              className="btn gold" style={{ flex: 2, justifyContent: 'center', opacity: saving ? .7 : 1 }}>
              {saving ? 'Đang lưu...' : 'Tạo Hồ Sơ'}
            </button>
          </div>
        </div>
      </div>
    )}

    <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>

      {/* ── MAIN ── */}
      <div style={{ flex: 1, minWidth: 0 }}>

        {/* mod-head */}
        <div className="mod-head" style={{ marginBottom: 20 }}>
          <div>
            <div className="ttl">CRM Khách Hàng</div>
            <div className="sub">
              {total.toLocaleString('vi-VN')} hồ sơ · {vipN} VIP · {activeN} hoạt động 30 ngày
            </div>
          </div>
          <div className="acts">
            <button className="btn">
              <I.Speaker style={{ width: 13, height: 13 }} /> Gửi Chiến Dịch
            </button>
            <button className="btn ghost">
              <I.Filter style={{ width: 13, height: 13 }} /> Lọc Nâng Cao
            </button>
            <button className="btn gold" onClick={() => setShowNew(true)}>
              <I.Plus style={{ width: 13, height: 13 }} /> Khách Mới
            </button>
          </div>
        </div>

        {/* Strip KPIs */}
        <div className="strip" style={{ gridTemplateColumns: 'repeat(4,1fr)', marginBottom: 20 }}>
          <div className="it">
            <div className="l">Tổng Hồ Sơ</div>
            <div className="v">{total.toLocaleString('vi-VN')}<span className="cur"> KH</span></div>
          </div>
          <div className="it">
            <div className="l">Khách VIP</div>
            <div className="v">
              {vipN}
              <span className="cur"> · {total > 0 ? Math.round(vipN / total * 100) : 0}%</span>
            </div>
          </div>
          <div className="it">
            <div className="l">Hoạt Động 30 Ngày</div>
            <div className="v">{returnRate}<span className="cur">%</span></div>
          </div>
          <div className="it">
            <div className="l">LTV Trung Bình</div>
            <div className="v">{fmtCompact(avgLTV)}</div>
          </div>
        </div>

        {/* Filters row */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 14, flexWrap: 'wrap' }}>
          {chips.map(x => (
            <button
              key={x.k}
              className={`chip${x.k === activeSeg ? ' active' : ''}`}
              onClick={() => setActiveSeg(x.k)}
              style={{ padding: '7px 14px', fontSize: '12.5px' }}>
              {x.l}
              <span style={{ opacity: .6, marginLeft: 5 }}>{x.n}</span>
            </button>
          ))}
          <div style={{ flex: 1 }} />
          <div className="search" style={{ maxWidth: 280, margin: 0 }}>
            <I.Search />
            <input
              placeholder="Tìm tên, SĐT..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
            style={{
              border: '1px solid var(--bord)', borderRadius: 8, padding: '8px 12px',
              fontSize: 13, background: 'var(--surface)', color: 'var(--ink)', cursor: 'pointer',
            }}>
            <option value="chi_tieu">Chi tiêu ↓</option>
            <option value="recency">Gần nhất</option>
            <option value="name">Tên A-Z</option>
          </select>
        </div>

        {/* CRM Table */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px', color: 'var(--ink3)' }}>
            <div style={{
              width: 44, height: 72, margin: '0 auto 16px',
              background: 'var(--grad-arch)', borderRadius: '999px 999px 12px 12px', opacity: .3,
              animation: 'floatGlow 3s ease-in-out infinite alternate',
            }} />
            Đang tải danh sách khách hàng...
          </div>
        ) : (
          <div className="crm-list">
            <div className="crm-row h">
              <div className="av" />
              <div>Khách Hàng</div>
              <div>Liên Hệ</div>
              <div>Phân Loại</div>
              <div>Lượt Ghé</div>
              <div>Lần Cuối</div>
              <div>Tổng Chi Tiêu</div>
              <div />
            </div>

            {filtered.slice(0, 50).map(c => {
              const seg = getSegment(c.tong_chi_tieu)
              const isActive = selected?.id === c.id
              const barPct = Math.min(100, ((c.tong_chi_tieu || 0) / maxSpend) * 100)
              return (
                <div
                  className="crm-row"
                  key={c.id}
                  style={{
                    cursor: 'pointer',
                    ...(isActive ? {
                      background: 'rgba(201,169,110,.07)',
                      borderLeft: '3px solid var(--champagne)',
                    } : {}),
                  }}
                  onClick={() => { window.location.href = `/admin/crm/khach-hang/${c.id}` }}>
                  <div className="av" style={{ background: AVT_GRAD[seg] }}>
                    {getInitials(c.ho_ten)}
                  </div>

                  <div className="nm">
                    {c.ho_ten}
                    {c.ghi_chu_da_lieu && <small>{c.ghi_chu_da_lieu}</small>}
                  </div>

                  <div style={{ fontSize: 12 }}>
                    <div style={{ color: 'var(--ink2)', fontWeight: 500 }}>{c.so_dien_thoai || '—'}</div>
                    {c.ngay_sinh && (
                      <div style={{ color: 'var(--ink3)', marginTop: 2 }}>
                        {new Date(c.ngay_sinh).getFullYear()}
                      </div>
                    )}
                  </div>

                  <div>
                    <span className={`seg ${seg}`}>{SEG[seg].l}</span>
                  </div>

                  <div>
                    <VisitCount chiTieu={c.tong_chi_tieu} />
                  </div>

                  <div style={{ fontSize: 12 }}>
                    <DayLabel dateStr={c.lan_cuoi_den} />
                  </div>

                  <div>
                    <div style={{ fontFamily: 'var(--serif)', fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>
                      {formatCurrency(c.tong_chi_tieu || 0)}
                    </div>
                    <div className="bar-h" style={{ marginTop: 4 }}>
                      <i style={{
                        width: barPct + '%',
                        background: seg === 'vip' ? 'var(--grad-gold)' : seg === 'slp' ? 'var(--ink3)' : 'var(--primary)',
                      }} />
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 4 }}>
                    <button
                      className="icon-btn"
                      style={{ width: 28, height: 28 }}
                      onClick={e => { e.stopPropagation(); window.open(`tel:${c.so_dien_thoai}`) }}>
                      <I.Phone style={{ width: 12, height: 12 }} />
                    </button>
                  </div>
                </div>
              )
            })}

            {filtered.length === 0 && (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--ink3)', fontSize: 13 }}>
                Không tìm thấy khách hàng phù hợp
              </div>
            )}
            {filtered.length > 50 && (
              <div style={{ textAlign: 'center', padding: '14px', color: 'var(--ink3)', fontSize: 12, borderTop: '1px solid var(--line)' }}>
                Đang hiển thị 50 / {filtered.length} kết quả — dùng bộ lọc hoặc tìm kiếm để thu hẹp
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── CUSTOMER DETAIL PANEL ── */}
      {selected && (() => {
        const seg = getSegment(selected.tong_chi_tieu)
        const d = daysSince(selected.lan_cuoi_den)
        const barPct = Math.min(100, ((selected.tong_chi_tieu || 0) / maxSpend) * 100)
        const detailTabs = [
          { k: 'info', l: 'Thông tin', icon: I.User },
          { k: 'cards', l: 'Thẻ dịch vụ', icon: I.CreditCard, n: cards.length },
          { k: 'service', l: 'Dịch vụ', icon: I.Box, n: snapshot?.history?.length || 0 },
          { k: 'debt', l: 'Công nợ', icon: I.Receipt, n: snapshot?.debtBalance > 0 ? 1 : 0 },
          { k: 'note', l: 'Ghi chú', icon: I.FileText },
          { k: 'image', l: 'Hình ảnh', icon: I.Image },
        ]
        return (
          <aside style={{
            width: 430, flexShrink: 0,
            background: 'var(--surface)',
            border: '1px solid var(--bord)',
            borderRadius: 'var(--r-lg)',
            boxShadow: 'var(--sh-2)',
            padding: 20,
            animation: 'viewIn .3s var(--ease-out) both',
            position: 'sticky', top: 24,
          }}>
            {/* Close */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
              <button
                className="icon-btn"
                style={{ width: 26, height: 26, fontSize: 14 }}
                onClick={() => setSelected(null)}>
                ✕
              </button>
            </div>

            {/* Avatar + Name */}
            <div style={{ textAlign: 'center', marginBottom: 18 }}>
              <div style={{
                width: 68, height: 68, borderRadius: '50%',
                background: AVT_GRAD[seg],
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 28, fontFamily: 'var(--serif)', fontWeight: 700, color: '#fff',
                margin: '0 auto 10px',
                boxShadow: '0 6px 20px rgba(160,113,79,.35)',
              }}>
                {getInitials(selected.ho_ten)}
              </div>
              <div style={{ fontFamily: 'var(--serif)', fontSize: 17, fontWeight: 700, color: 'var(--ink)', lineHeight: 1.2 }}>
                {selected.ho_ten}
              </div>
              <div style={{ marginTop: 6 }}>
                <span className={`seg ${seg}`}>{SEG[seg].l}</span>
              </div>
            </div>

            {/* Info rows */}
            <div style={{
              background: 'var(--bg)',
              borderRadius: 'var(--r)',
              padding: '12px 14px',
              marginBottom: 14,
              display: 'flex', flexDirection: 'column', gap: 10,
            }}>
              {[
                { l: 'SĐT', v: selected.so_dien_thoai || '—' },
                {
                  l: 'Ngày sinh',
                  v: selected.ngay_sinh
                    ? new Date(selected.ngay_sinh).toLocaleDateString('vi-VN')
                    : '—',
                },
                {
                  l: 'Lần cuối đến',
                  v: d === null ? '—' : d === 0 ? 'Hôm nay' : d === 1 ? 'Hôm qua' : `${d} ngày trước`,
                },
                { l: 'Da liễu', v: selected.ghi_chu_da_lieu || '—' },
              ].map((row, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'flex-start' }}>
                  <div style={{ fontSize: 11, color: 'var(--ink3)', fontWeight: 600, letterSpacing: '.07em', textTransform: 'uppercase', flexShrink: 0 }}>
                    {row.l}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--ink)', fontWeight: 500, textAlign: 'right' }}>
                    {row.v}
                  </div>
                </div>
              ))}
            </div>

            {/* Tổng chi tiêu card */}
            <div style={{
              background: seg === 'vip'
                ? 'linear-gradient(135deg,rgba(201,169,110,.15),rgba(160,113,79,.1))'
                : 'var(--bg)',
              border: seg === 'vip' ? '1px solid rgba(201,169,110,.3)' : '1px solid var(--line)',
              borderRadius: 'var(--r)',
              padding: '14px',
              marginBottom: 14,
            }}>
              <div style={{ fontSize: 11, color: 'var(--ink3)', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 6 }}>
                Tổng Chi Tiêu
              </div>
              <div style={{
                fontFamily: 'var(--serif)', fontSize: 22, fontWeight: 700,
                color: seg === 'vip' ? 'var(--champagne)' : 'var(--ink)',
              }}>
                {formatCurrency(selected.tong_chi_tieu || 0)}
              </div>
              <div className="bar-h" style={{ marginTop: 10, height: 6, borderRadius: 3 }}>
                <i style={{
                  width: barPct + '%',
                  background: seg === 'vip' ? 'var(--grad-gold)' : 'var(--primary)',
                  borderRadius: 3,
                }} />
              </div>
            </div>

            {/* Thẻ Liệu Trình */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3,1fr)',
              gap: 6,
              borderBottom: '1px solid var(--line)',
              paddingBottom: 10,
              marginBottom: 14,
            }}>
              {detailTabs.map(tab => {
                const Icon = tab.icon
                const active = activeCustomerTab === tab.k
                return (
                  <button key={tab.k} type="button" onClick={() => setActiveCustomerTab(tab.k)}
                    style={{
                      border: `1px solid ${active ? 'rgba(201,169,110,.45)' : 'var(--line)'}`,
                      background: active ? 'linear-gradient(135deg,rgba(201,169,110,.16),rgba(160,113,79,.08))' : 'var(--bg)',
                      color: active ? 'var(--champagne)' : 'var(--ink2)',
                      borderRadius: 10,
                      padding: '8px 6px',
                      minHeight: 58,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 4,
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: 'pointer',
                      fontFamily: 'var(--sans)',
                    }}>
                    <Icon style={{ width: 16, height: 16 }} />
                    <span style={{ whiteSpace: 'nowrap' }}>{tab.l}</span>
                    {tab.n > 0 && <span style={{ fontSize: 10, color: active ? 'var(--ink)' : 'var(--ink3)', fontWeight: 800 }}>{tab.n}</span>}
                  </button>
                )
              })}
            </div>

            {activeCustomerTab === 'info' && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 8 }}>
                  Hồ Sơ Khách Hàng
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {[
                    { l: 'Mã KH', v: selected.ma_kh || selected.id?.slice(0, 8) || '—' },
                    { l: 'Điện thoại', v: selected.so_dien_thoai || '—' },
                    { l: 'Ngày sinh', v: selected.ngay_sinh ? new Date(selected.ngay_sinh).toLocaleDateString('vi-VN') : '—' },
                    { l: 'Phân hạng', v: SEG[seg].l },
                    { l: 'Lần cuối', v: d === null ? '—' : d === 0 ? 'Hôm nay' : d === 1 ? 'Hôm qua' : `${d} ngày trước` },
                    { l: 'Tổng chi tiêu', v: formatCurrency(selected.tong_chi_tieu || 0) },
                  ].map(row => (
                    <div key={row.l} style={{ background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 10, padding: '9px 10px' }}>
                      <div style={{ fontSize: 10, color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 4 }}>{row.l}</div>
                      <div style={{ fontSize: 12, color: 'var(--ink)', fontWeight: 700 }}>{row.v}</div>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 8, background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 10, padding: '10px 12px' }}>
                  <div style={{ fontSize: 10, color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 4 }}>Thông tin da/liệu trình quan tâm</div>
                  <div style={{ fontSize: 12, color: 'var(--ink2)', lineHeight: 1.45 }}>{selected.ghi_chu_da_lieu || 'Chưa có ghi chú da liễu trong hồ sơ'}</div>
                </div>
              </div>
            )}

            {activeCustomerTab === 'cards' && (loadingCards ? (
              <div style={{ textAlign: 'center', padding: '12px', fontSize: 12, color: 'var(--ink3)', marginBottom: 14 }}>Đang tải thẻ...</div>
            ) : cards.length > 0 ? (
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 8 }}>
                  Thẻ Liệu Trình ({cards.length})
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {cards.slice(0, 6).map(card => {
                    const pct = card.so_buoi_tong > 0 ? Math.round((card.so_buoi_da_dung / card.so_buoi_tong) * 100) : 0
                    const con = (card.so_buoi_tong || 0) - (card.so_buoi_da_dung || 0)
                    const expired = card.ngay_het_han && new Date(card.ngay_het_han) < new Date()
                    return (
                      <div key={card.id} style={{
                        background: expired ? 'var(--bg)' : 'linear-gradient(135deg,rgba(201,169,110,.08),rgba(160,113,79,.04))',
                        border: `1px solid ${expired ? 'var(--line)' : 'rgba(201,169,110,.25)'}`,
                        borderRadius: 10, padding: '10px 12px',
                      }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: expired ? 'var(--ink3)' : 'var(--ink)', marginBottom: 4 }}>
                          {card.ten_dich_vu}
                        </div>
                        <div className="bar-h" style={{ height: 4, marginBottom: 5 }}>
                          <i style={{ width: pct + '%', background: expired ? 'var(--ink3)' : 'var(--grad-gold)', borderRadius: 2 }} />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--ink3)' }}>
                          <span style={{ color: expired ? 'var(--danger)' : 'var(--thu)', fontWeight: 600 }}>
                            {expired ? 'Hết hạn' : `Còn ${con} buổi`}
                          </span>
                          <span>{card.so_buoi_da_dung}/{card.so_buoi_tong}</span>
                        </div>
                      </div>
                    )
                  })}
                  {cards.length > 6 && (
                    <div style={{ fontSize: 11, color: 'var(--ink3)', textAlign: 'center', padding: '2px 0' }}>
                      +{cards.length - 6} thẻ khác trong hồ sơ
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div style={{ padding: '16px', borderRadius: 10, background: 'var(--bg)', border: '1px dashed var(--line)', fontSize: 12, color: 'var(--ink3)', textAlign: 'center', marginBottom: 14 }}>
                Khách chưa có thẻ dịch vụ/thẻ liệu trình
              </div>
            ))}

            {/* POS history */}
            {activeCustomerTab === 'service' && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 8 }}>
                Lịch Sử POS
              </div>
              {loadingSnapshot ? (
                <div style={{ textAlign: 'center', padding: '12px', fontSize: 12, color: 'var(--ink3)' }}>Đang tải lịch sử...</div>
              ) : snapshot?.history?.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {snapshot.history.slice(0, 6).map(row => {
                    const income = historyIncome(row)
                    return (
                      <div key={row.don_hang_chi_tiet_id || row.don_hang_id} style={{
                        background: 'var(--bg)',
                        border: '1px solid var(--line)',
                        borderRadius: 10,
                        padding: '9px 10px',
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'flex-start' }}>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {row.ten_dich_vu || 'Dịch vụ'}
                            </div>
                            <div style={{ fontSize: 10.5, color: 'var(--ink3)', marginTop: 2 }}>
                              {fmtDate(row.ngay)} · {historyLabel(row.loai_lich_su)}
                              {row.ma_don ? ` · ${row.ma_don}` : ''}
                            </div>
                          </div>
                          <div style={{ flexShrink: 0, fontSize: 10.5, color: 'var(--ink3)', fontWeight: 700 }}>
                            {formatCurrency(row.thanh_tien || 0)}
                          </div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginTop: 7, fontSize: 11 }}>
                          <span style={{ color: 'var(--ink2)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {row.ktv || 'Chưa gắn nhân viên'}
                          </span>
                          {income && (
                            <span style={{ color: income.color, fontWeight: 800, flexShrink: 0 }}>
                              {income.label} {formatCurrency(income.amount)}
                            </span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div style={{ padding: '12px', borderRadius: 10, background: 'var(--bg)', border: '1px dashed var(--line)', fontSize: 12, color: 'var(--ink3)', textAlign: 'center' }}>
                  Chưa có lịch sử POS đã chốt
                </div>
              )}
            </div>
            )}

            {/* Debt */}
            {activeCustomerTab === 'debt' && (
              <div style={{
                background: snapshot?.debtBalance > 0 ? 'rgba(180,70,55,.08)' : 'var(--bg)',
                border: snapshot?.debtBalance > 0 ? '1px solid rgba(180,70,55,.22)' : '1px solid var(--line)',
                borderRadius: 'var(--r)',
                padding: '12px 14px',
                marginBottom: 14,
              }}>
                <div style={{ fontSize: 11, color: 'var(--ink3)', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 5 }}>
                  Công Nợ
                </div>
                <div style={{ fontFamily: 'var(--serif)', fontSize: 20, fontWeight: 700, color: 'var(--danger)' }}>
                  {formatCurrency(snapshot?.debtBalance || 0)}
                </div>
                <div style={{ display: 'none', fontSize: 11, color: 'var(--ink3)', marginTop: 4 }}>
                  Cần thu khi khách thanh toán phần còn thiếu
                </div>
                <div style={{ fontSize: 11, color: 'var(--ink3)', marginTop: 4 }}>
                  {snapshot?.debtBalance > 0 ? 'Cần thu khi khách thanh toán phần còn thiếu' : 'Khách hàng không còn công nợ'}
                </div>
              </div>
            )}

            {activeCustomerTab === 'note' && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 8 }}>
                  Ghi Chú Chăm Sóc
                </div>
                <div style={{ background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 10, padding: '12px', fontSize: 12, color: 'var(--ink2)', lineHeight: 1.5 }}>
                  {selected.ghi_chu_da_lieu || 'Chưa có ghi chú chăm sóc. Bước sau mình sẽ nối phần lưu ghi chú theo từng lần tư vấn giống MySpa.'}
                </div>
              </div>
            )}

            {activeCustomerTab === 'image' && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 8 }}>
                  Hình Ảnh Khách Hàng
                </div>
                <div style={{ minHeight: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', border: '1px dashed var(--line)', borderRadius: 10, color: 'var(--ink3)', fontSize: 12, textAlign: 'center', padding: 16 }}>
                  Chưa có album hình ảnh. Tab này giữ đúng vị trí như MySpa để mình nối ảnh trước/sau điều trị ở pha kế tiếp.
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button
                className="btn gold"
                style={{ justifyContent: 'center', width: '100%' }}
                onClick={() => window.open(`tel:${selected.so_dien_thoai}`)}>
                <I.Phone style={{ width: 13, height: 13 }} /> Gọi Điện
              </button>
              <button className="btn ghost" style={{ justifyContent: 'center', width: '100%' }}>
                <I.Calendar style={{ width: 13, height: 13 }} /> Đặt Lịch Hẹn
              </button>
              <button className="btn ghost" style={{ justifyContent: 'center', width: '100%' }}>
                <I.Speaker style={{ width: 13, height: 13 }} /> Gửi Tin Nhắn
              </button>
            </div>
          </aside>
        )
      })()}
    </div>
    </>
  )
}
