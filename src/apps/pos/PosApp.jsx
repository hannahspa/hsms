import { useState, useEffect, useCallback, useRef } from 'react'
import { posService } from '../../services/posService'
import { supabase } from '../../lib/supabase'
import { formatCurrency, getNowVN } from '../../lib/utils'
import { useAuth } from '../../context/AuthContext'
import I from '../../components/shared/Icons'
import PosOrderHistory from './PosOrderHistory'

const PTTT_OPTS = [
  { id: 'tien_mat',     label: 'Tiền mặt',     icon: '💵' },
  { id: 'chuyen_khoan', label: 'Chuyển khoản', icon: '🏦' },
  { id: 'quet_the',     label: 'Quẹt thẻ',     icon: '💳' },
]

function parseVND(s) { return parseInt(String(s).replace(/\D/g, ''), 10) || 0 }
function getInitials(name) {
  if (!name) return '?'
  const p = name.trim().split(' ')
  return (p[p.length - 1][0] || '').toUpperCase()
}

// ── Toggle switch ──────────────────────────────────────────────────────────────
function Toggle({ on, onChange, label }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', userSelect: 'none' }}>
      <div onClick={() => onChange(!on)} style={{
        width: 38, height: 21, borderRadius: 11, position: 'relative',
        background: on ? 'var(--champagne)' : 'rgba(0,0,0,.18)', transition: 'background .2s', flexShrink: 0,
      }}>
        <div style={{
          position: 'absolute', top: 2.5, left: on ? 19 : 2.5,
          width: 16, height: 16, borderRadius: '50%', background: '#fff',
          transition: 'left .18s', boxShadow: '0 1px 4px rgba(0,0,0,.25)',
        }} />
      </div>
      {label && <span style={{ fontSize: 12.5, color: 'var(--ink2)' }}>{label}</span>}
    </label>
  )
}

// ── Thẻ liệu trình card (horizontal) ─────────────────────────────────────────
function LieuTrinhCard({ card, onUse }) {
  const pct = card.so_buoi_tong > 0 ? (card.so_buoi_da_dung / card.so_buoi_tong) * 100 : 0
  const usedAmt = card.gia_tri_the > 0 ? Math.round((card.so_buoi_da_dung / card.so_buoi_tong) * card.gia_tri_the) : 0
  return (
    <div style={{
      minWidth: 195, maxWidth: 210, flexShrink: 0, borderRadius: 12, padding: '12px 14px',
      background: 'linear-gradient(135deg,#C9A96E 0%,#A0714F 55%,#7D5A3C 100%)',
      color: '#fff', boxShadow: '0 4px 16px rgba(160,113,79,.3)',
    }}>
      <div style={{ fontSize: 11.5, fontWeight: 700, lineHeight: 1.3, marginBottom: 2 }}>
        {card.ten_dich_vu} ({card.so_buoi_da_dung}/{card.so_buoi_tong})
      </div>
      <div style={{ fontSize: 9.5, opacity: .75, marginBottom: 8 }}>
        {card.ma_the || '—'} · {formatCurrency(card.gia_tri_the || 0)}
      </div>
      <div style={{ height: 3, background: 'rgba(255,255,255,.25)', borderRadius: 2, marginBottom: 5 }}>
        <div style={{ height: '100%', borderRadius: 2, background: '#fff', width: `${pct}%` }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 9.5, opacity: .7 }}>
          {formatCurrency(usedAmt)}/{formatCurrency(card.gia_tri_the || 0)}
        </span>
        <button onClick={() => onUse(card)} style={{
          background: 'rgba(255,255,255,.25)', border: '1px solid rgba(255,255,255,.4)',
          borderRadius: 6, padding: '3px 10px', color: '#fff', cursor: 'pointer',
          fontSize: 11, fontWeight: 700, fontFamily: 'var(--sans)',
        }}>→ Dùng</button>
      </div>
    </div>
  )
}

// ── Cart line (right panel) ───────────────────────────────────────────────────
function CartLine({ item, onRemove, onQtyChange, selectedCustomer, onCardCreated }) {
  const [qty, setQty] = useState(item.so_luong || 1)
  const [isNewCard, setIsNewCard] = useState(false)
  const [sobuoi, setSobuoi] = useState(10)
  const [ngayHetHan, setNgayHetHan] = useState('')
  const [creatingCard, setCreatingCard] = useState(false)

  const name = item.dich_vu?.ten || item.san_pham?.ten || item.the_lieu_trinh?.ten_dich_vu || '—'
  const giaGoc = item.dich_vu?.gia_co_ban || item.don_gia || 0
  const nv = item.nhan_vien
  const isDichVu = item.loai_item === 'dich_vu'

  const changeQty = async (n) => {
    if (n < 1) return
    setQty(n)
    await onQtyChange(item.id, n, item.don_gia)
  }

  const handleCreateCard = async () => {
    if (!selectedCustomer?.id) return alert('Cần chọn khách hàng trước khi tạo thẻ')
    if (!ngayHetHan) return alert('Vui lòng nhập ngày hết hạn')
    if (sobuoi < 1) return alert('Số buổi phải lớn hơn 0')
    setCreatingCard(true)
    try {
      const { error } = await supabase.from('the_lieu_trinh').insert({
        khach_hang_id: selectedCustomer.id,
        ten_dich_vu: name,
        so_buoi_tong: sobuoi,
        so_buoi_da_dung: 0,
        so_buoi_con_lai: sobuoi,
        gia_tri_the: (item.thanh_tien || 0),
        ngay_het_han: ngayHetHan,
        trang_thai: 'active',
      })
      if (error) throw error
      alert(`Đã tạo thẻ "${name}" — ${sobuoi} buổi cho ${selectedCustomer.ho_ten}`)
      setIsNewCard(false)
      if (onCardCreated) onCardCreated()
    } catch (err) { alert('Lỗi tạo thẻ: ' + err.message) }
    finally { setCreatingCard(false) }
  }

  return (
    <div style={{ padding: '10px 0', borderBottom: '1px solid var(--line)' }}>
      {/* Row 1: xóa + tên + qty + giá */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
        <button onClick={() => onRemove(item.id)} style={{
          background: 'none', border: 'none', color: '#DC3545',
          cursor: 'pointer', fontSize: 14, padding: '0 2px', lineHeight: 1, flexShrink: 0,
        }}>✕</button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ink)', lineHeight: 1.3 }}>{name}</div>
          {giaGoc > 0 && item.thanh_tien !== giaGoc && (
            <div style={{ fontSize: 10, color: 'var(--ink3)', textDecoration: 'line-through' }}>
              {formatCurrency(giaGoc)}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 3, flexShrink: 0 }}>
          <button onClick={() => changeQty(qty - 1)} style={{
            width: 22, height: 22, border: '1px solid var(--bord)', borderRadius: 4,
            background: 'var(--bg)', cursor: 'pointer', fontSize: 14, lineHeight: 1,
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink2)',
          }}>−</button>
          <span style={{ fontSize: 12, fontWeight: 700, minWidth: 18, textAlign: 'center', color: 'var(--ink)' }}>{qty}</span>
          <button onClick={() => changeQty(qty + 1)} style={{
            width: 22, height: 22, border: '1px solid var(--bord)', borderRadius: 4,
            background: 'var(--bg)', cursor: 'pointer', fontSize: 14, lineHeight: 1,
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink2)',
          }}>+</button>
        </div>
        <div style={{ fontSize: 13, fontWeight: 700, fontFamily: 'var(--serif)', color: 'var(--ink)', minWidth: 72, textAlign: 'right', flexShrink: 0 }}>
          {formatCurrency(item.thanh_tien || 0)}
        </div>
      </div>

      {/* Row 2: NV commission */}
      {nv && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 5, paddingLeft: 20 }}>
          <div style={{
            width: 22, height: 22, borderRadius: '50%',
            background: 'linear-gradient(135deg,#C9A96E,#A0714F)', color: '#2a1d14',
            fontSize: 9, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>{getInitials(nv.ho_ten)}</div>
          <span style={{ fontSize: 11, color: 'var(--ink2)' }}>{nv.ho_ten}</span>
          <span style={{ fontSize: 10, color: 'var(--champagne)', fontWeight: 700, marginLeft: 'auto' }}>
            HH: {formatCurrency(item.commission_tien || 0)}
          </span>
        </div>
      )}

      {/* Row 3: Checkbox "Thẻ liệu trình" — chỉ hiện cho dịch vụ */}
      {isDichVu && (
        <div style={{ paddingLeft: 20, marginTop: 5 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer', width: 'fit-content' }}>
            <input
              type="checkbox"
              checked={isNewCard}
              onChange={e => setIsNewCard(e.target.checked)}
              style={{ accentColor: 'var(--champagne)', width: 13, height: 13 }}
            />
            <span style={{ fontSize: 11, color: 'var(--ink3)' }}>Thẻ liệu trình</span>
          </label>

          {/* Form tạo thẻ mới */}
          {isNewCard && (
            <div style={{
              marginTop: 8, padding: '10px 12px',
              background: 'rgba(201,169,110,.08)', border: '1px solid rgba(201,169,110,.2)',
              borderRadius: 8,
            }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--champagne)', marginBottom: 8 }}>
                Tạo thẻ liệu trình mới
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                {/* Số buổi */}
                <div>
                  <div style={{ fontSize: 10, color: 'var(--ink3)', marginBottom: 3 }}>Số buổi LT</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <button onClick={() => setSobuoi(Math.max(1, sobuoi - 1))} style={{
                      width: 22, height: 22, border: '1px solid var(--bord)', borderRadius: 4,
                      background: '#fff', cursor: 'pointer', fontSize: 14,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>−</button>
                    <input
                      value={sobuoi}
                      onChange={e => setSobuoi(Math.max(1, parseInt(e.target.value) || 1))}
                      style={{
                        width: 40, border: '1px solid var(--bord)', borderRadius: 5,
                        padding: '3px 0', fontSize: 13, fontWeight: 700, textAlign: 'center',
                        outline: 'none', background: '#fff',
                      }}
                    />
                    <button onClick={() => setSobuoi(sobuoi + 1)} style={{
                      width: 22, height: 22, border: '1px solid var(--bord)', borderRadius: 4,
                      background: '#fff', cursor: 'pointer', fontSize: 14,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>+</button>
                  </div>
                </div>
                {/* Ngày hết hạn */}
                <div>
                  <div style={{ fontSize: 10, color: 'var(--ink3)', marginBottom: 3 }}>Ngày hết hạn</div>
                  <input
                    type="date"
                    value={ngayHetHan}
                    onChange={e => setNgayHetHan(e.target.value)}
                    style={{
                      width: '100%', border: '1px solid var(--bord)', borderRadius: 6,
                      padding: '5px 8px', fontSize: 12, outline: 'none',
                      background: '#fff', boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 11, color: 'var(--ink3)' }}>
                  Giá trị thẻ: <b style={{ color: 'var(--ink)' }}>{formatCurrency(item.thanh_tien || 0)}</b>
                </span>
                <button
                  onClick={handleCreateCard}
                  disabled={creatingCard || !ngayHetHan}
                  style={{
                    padding: '6px 14px', border: 'none', borderRadius: 7,
                    background: creatingCard || !ngayHetHan ? 'var(--bg2)' : 'var(--champagne)',
                    color: creatingCard || !ngayHetHan ? 'var(--ink3)' : '#2a1d14',
                    fontSize: 12, fontWeight: 700, cursor: creatingCard || !ngayHetHan ? 'not-allowed' : 'pointer',
                    fontFamily: 'var(--sans)',
                  }}
                >
                  {creatingCard ? 'Đang tạo…' : 'Tạo thẻ'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── PosCreateOrder (toàn bộ hook ở đây) ──────────────────────────────────────
function PosCreateOrder() {
  const { user } = useAuth()

  // Order
  const [currentOrder, setCurrentOrder] = useState(null)
  const [lineItems, setLineItems] = useState([])

  // Customer
  const [isGuest, setIsGuest] = useState(true)
  const [saveInfo, setSaveInfo] = useState(false)
  const [guestName, setGuestName] = useState('')
  const [guestPhone, setGuestPhone] = useState('')
  const [guestEmail, setGuestEmail] = useState('')
  const [selectedCustomer, setSelectedCustomer] = useState(null)
  const [customerCards, setCustomerCards] = useState([])
  const [custSearch, setCustSearch] = useState('')
  const [custResults, setCustResults] = useState([])
  const [custOpen, setCustOpen] = useState(false)
  const [custLoading, setCustLoading] = useState(false)

  // Catalog
  const [catalogTab, setCatalogTab] = useState('dich_vu')
  const [cat, setCat] = useState('all')
  const [search, setSearch] = useState('')
  const [dichVuList, setDichVuList] = useState([])

  // Right panel
  const [rightTab, setRightTab] = useState('don_hang')
  const [giamDVPct, setGiamDVPct] = useState('')
  const [vatPct, setVatPct] = useState('')
  const [maKM, setMaKM] = useState('')
  const [nhapTien, setNhapTien] = useState('')
  const [pttt, setPttt] = useState('tien_mat')
  const [sendSMS, setSendSMS] = useState(false)
  const [sendZNS, setSendZNS] = useState(true)
  const [todayStats, setTodayStats] = useState({ soDon: 0, tongThu: 0 })
  const [loading, setLoading] = useState(false)

  const custTimer = useRef(null)
  const orderId = currentOrder?.id

  // ── Load ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    posService.getServices().then(d => setDichVuList(d || []))
    posService.getTodayStats().then(s => setTodayStats(s))
    // Auto-tạo đơn khi vào trang
    posService.createOrder({ nguoiTao: user?.id, khachHangId: null })
      .then(order => setCurrentOrder(order))
      .catch(console.error)
  }, [])

  useEffect(() => {
    if (!orderId) return
    posService.getLineItems(orderId).then(items => setLineItems(items || []))
  }, [orderId])

  useEffect(() => {
    if (!selectedCustomer?.id) { setCustomerCards([]); return }
    posService.getCustomerCards(selectedCustomer.id)
      .then(cards => setCustomerCards(cards || []))
      .catch(() => setCustomerCards([]))
  }, [selectedCustomer?.id])

  // ── Customer search ─────────────────────────────────────────────────────────
  const searchCustomers = useCallback(async (q) => {
    if (!q || q.length < 2) { setCustResults([]); return }
    setCustLoading(true)
    try { setCustResults(await posService.searchCustomers(q, 6)) }
    finally { setCustLoading(false) }
  }, [])

  const onCustChange = (v) => {
    setCustSearch(v)
    setCustOpen(true)
    clearTimeout(custTimer.current)
    custTimer.current = setTimeout(() => searchCustomers(v), 280)
  }

  const pickCustomer = (c) => {
    setSelectedCustomer(c)
    setCustSearch(c.ho_ten)
    setCustOpen(false)
    setCustResults([])
  }

  const clearCustomer = () => {
    setSelectedCustomer(null)
    setCustSearch('')
    setCustResults([])
    setCustomerCards([])
  }

  // ── Handlers ────────────────────────────────────────────────────────────────
  const ensureOrder = async () => {
    if (orderId) return orderId
    const order = await posService.createOrder({ nguoiTao: user?.id, khachHangId: selectedCustomer?.id || null })
    setCurrentOrder(order)
    return order.id
  }

  const handleAddService = async (dv) => {
    try {
      const oid = await ensureOrder()
      const added = await posService.addLineItem(oid, {
        loai_item: 'dich_vu', dich_vu_id: dv.id,
        so_luong: 1, don_gia: dv.gia_co_ban, thanh_tien: dv.gia_co_ban,
      })
      setLineItems(p => [...p, added])
    } catch (err) { alert('Lỗi: ' + err.message) }
  }

  const handleAddCard = async (card) => {
    try {
      const oid = await ensureOrder()
      const added = await posService.addLineItem(oid, {
        loai_item: 'the_lieu_trinh', the_lieu_trinh_id: card.id,
        so_luong: 1, don_gia: 0, thanh_tien: 0,
      })
      setLineItems(p => [...p, added])
    } catch (err) { alert('Lỗi: ' + err.message) }
  }

  const handleRemoveItem = async (id) => {
    try {
      await posService.removeLineItem(id)
      setLineItems(p => p.filter(i => i.id !== id))
    } catch (err) { alert('Lỗi: ' + err.message) }
  }

  const handleQtyChange = async (id, qty, donGia) => {
    try {
      const updated = await posService.updateLineItemQty(id, qty, donGia)
      setLineItems(p => p.map(i => i.id === id ? { ...i, ...updated } : i))
    } catch (err) { alert('Lỗi: ' + err.message) }
  }

  const handleCreateGuest = async () => {
    if (!guestName.trim()) return
    try {
      const { data, error } = await supabase
        .from('khach_hang')
        .insert({ ho_ten: guestName.trim(), so_dien_thoai: guestPhone.trim() || null })
        .select().single()
      if (error) throw error
      setSelectedCustomer(data)
      setIsGuest(false)
      setCustSearch(data.ho_ten)
      setGuestName(''); setGuestPhone(''); setGuestEmail('')
    } catch (err) { alert('Lỗi tạo KH: ' + err.message) }
  }

  const handleVoidOrder = async () => {
    if (!orderId || !confirm('Hủy đơn và tạo đơn mới?')) return
    try {
      await posService.voidOrder(orderId)
      const order = await posService.createOrder({ nguoiTao: user?.id, khachHangId: null })
      setCurrentOrder(order)
      setLineItems([])
      setNhapTien(''); setGiamDVPct(''); setVatPct(''); setMaKM('')
    } catch (err) { alert('Lỗi: ' + err.message) }
  }

  const handleCheckout = async (andPrint = false) => {
    if (!orderId || lineItems.length === 0) return alert('Giỏ hàng trống')
    const giamAmt = Math.round(tongHang * (parseFloat(giamDVPct) || 0) / 100)
    const vatAmt2 = Math.round((tongHang - giamAmt) * (parseFloat(vatPct) || 0) / 100)
    const tienDaTra = parseVND(nhapTien)
    const conNo = Math.max(0, tongCuoi - tienDaTra)
    setLoading(true)
    try {
      if (tienDaTra > 0) {
        await posService.addPayment(orderId, { hinhThuc: pttt, soTien: Math.min(tienDaTra, tongCuoi) })
      }
      await posService.finalizeOrder(orderId, { giamGia: giamAmt, conNo })
      const order = await posService.createOrder({ nguoiTao: user?.id, khachHangId: null })
      setCurrentOrder(order)
      setLineItems([])
      setNhapTien(''); setGiamDVPct(''); setVatPct(''); setMaKM('')
      const stats = await posService.getTodayStats()
      setTodayStats(stats)
      if (andPrint) alert('Chức năng in đang phát triển')
    } catch (err) { alert('Lỗi thanh toán: ' + err.message) }
    finally { setLoading(false) }
  }

  // ── Computed ────────────────────────────────────────────────────────────────
  const tongHang = lineItems.reduce((s, i) => s + (i.thanh_tien || 0), 0)
  const giamDVAmt = Math.round(tongHang * (parseFloat(giamDVPct) || 0) / 100)
  const vatAmt = Math.round((tongHang - giamDVAmt) * (parseFloat(vatPct) || 0) / 100)
  const tongCuoi = Math.max(0, tongHang - giamDVAmt + vatAmt)
  const tienNhapNum = parseVND(nhapTien)
  const tienThua = Math.max(0, tienNhapNum - tongCuoi)
  const conLai = Math.max(0, tongCuoi - tienNhapNum)

  const categories = ['all', ...new Set(dichVuList.map(d => d.danh_muc).filter(Boolean))]
  const filteredDV = dichVuList.filter(dv => {
    if (cat !== 'all' && dv.danh_muc !== cat) return false
    if (search && !dv.ten.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const nowVN = getNowVN()
  const dateStr = nowVN.toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 65px)', overflow: 'hidden', background: 'var(--bg)', margin: '-26px -28px -40px' }}>

      {/* ═══ LEFT PANEL (60%) ═══ */}
      <div style={{ flex: '0 0 60%', display: 'flex', flexDirection: 'column', overflow: 'hidden', borderRight: '1px solid var(--line)' }}>

        {/* Left header */}
        <div style={{
          padding: '10px 16px', borderBottom: '1px solid var(--line)',
          background: 'var(--surface)', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, fontFamily: 'var(--serif)', color: 'var(--ink)' }}>Tạo Đơn Hàng</div>
            <div style={{ fontSize: 11, color: 'var(--ink3)', marginTop: 1 }}>
              {user?.ho_ten} · {todayStats.soDon} đơn hôm nay · {formatCurrency(todayStats.tongThu)}
              {currentOrder?.ma_don && (
                <span style={{ marginLeft: 8, color: 'var(--champagne)', fontWeight: 700 }}>· {currentOrder.ma_don}</span>
              )}
            </div>
          </div>
          <button className="btn" style={{ fontSize: 12 }}
            onClick={() => window.location.href = '/pos/danh-sach'}>
            <I.Receipt style={{ width: 13, height: 13 }} /> Danh Sách
          </button>
        </div>

        {/* ── CUSTOMER SECTION ── */}
        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--line)', background: '#fafaf9', flexShrink: 0 }}>

          {/* Toggle row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 12 }}>
            <Toggle on={isGuest} onChange={(v) => { setIsGuest(v); if (!v) { setGuestName(''); setGuestPhone(''); setGuestEmail('') } }} label="Khách lẻ" />
            {isGuest && <Toggle on={saveInfo} onChange={setSaveInfo} label="Lưu thông tin khách hàng" />}
          </div>

          {isGuest ? (
            /* ── Khách lẻ: form 3 cột + nút + ── */
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 36px', gap: 8, alignItems: 'end' }}>
              {[
                { label: 'Tên khách hàng', val: guestName, set: setGuestName, ph: 'Tên KH…', type: 'text' },
                { label: 'Số điện thoại',  val: guestPhone, set: setGuestPhone, ph: 'SĐT…',   type: 'tel' },
                { label: 'Email',           val: guestEmail, set: setGuestEmail, ph: 'Email…', type: 'email' },
              ].map(f => (
                <div key={f.label}>
                  <div style={{ fontSize: 10, color: 'var(--ink3)', marginBottom: 3 }}>{f.label}</div>
                  <input value={f.val} onChange={e => f.set(e.target.value)}
                    placeholder={f.ph} type={f.type}
                    style={{
                      width: '100%', border: '1px solid var(--bord)', borderRadius: 8,
                      padding: '7px 10px', fontSize: 13, outline: 'none',
                      background: '#fff', color: 'var(--ink)', fontFamily: 'var(--sans)', boxSizing: 'border-box',
                    }}
                  />
                </div>
              ))}
              <button onClick={handleCreateGuest} disabled={!guestName.trim()}
                title="Tạo khách hàng mới"
                style={{
                  width: 36, height: 36, border: 'none', borderRadius: 8,
                  background: guestName.trim() ? 'var(--champagne)' : 'var(--bg2)',
                  color: guestName.trim() ? '#2a1d14' : 'var(--ink3)',
                  cursor: guestName.trim() ? 'pointer' : 'not-allowed',
                  fontSize: 22, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>+</button>
            </div>
          ) : (
            /* ── Khách cũ: search + form sau khi chọn ── */
            <div style={{ position: 'relative' }}>
              <div style={{ fontSize: 10, color: 'var(--ink3)', marginBottom: 3 }}>Tìm theo tên, số điện thoại hoặc email</div>
              <div style={{ position: 'relative' }}>
                <input value={custSearch} onChange={e => onCustChange(e.target.value)}
                  onFocus={() => setCustOpen(true)}
                  placeholder="Tìm nhanh KH…"
                  style={{
                    width: '100%', border: '1px solid var(--bord)', borderRadius: 8,
                    padding: '9px 36px 9px 12px', fontSize: 13, outline: 'none',
                    background: '#fff', color: 'var(--ink)', fontFamily: 'var(--sans)', boxSizing: 'border-box',
                  }}
                />
                <div style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--champagne)' }}>
                  <I.Search style={{ width: 15, height: 15 }} />
                </div>
              </div>

              {/* Dropdown */}
              {custOpen && (custResults.length > 0 || (custSearch.length >= 2 && !custLoading)) && (
                <div style={{
                  position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100, marginTop: 4,
                  background: '#fff', border: '1px solid var(--bord)', borderRadius: 10,
                  boxShadow: '0 8px 30px rgba(0,0,0,.12)', overflow: 'hidden',
                }}>
                  {custResults.length === 0 ? (
                    <div style={{ padding: '14px', fontSize: 13, color: 'var(--ink3)', textAlign: 'center' }}>
                      {custLoading ? 'Đang tìm…' : 'Không tìm thấy khách hàng'}
                    </div>
                  ) : custResults.map(c => (
                    <button key={c.id} onClick={() => pickCustomer(c)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                        padding: '10px 14px', border: 'none', background: 'none',
                        cursor: 'pointer', borderBottom: '1px solid var(--line)', fontFamily: 'var(--sans)',
                      }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: '50%',
                        background: 'linear-gradient(135deg,#C9A96E,#A0714F)',
                        color: '#2a1d14', fontSize: 13, fontWeight: 700,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                      }}>{getInitials(c.ho_ten)}</div>
                      <div style={{ flex: 1, textAlign: 'left' }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>{c.ho_ten}</div>
                        <div style={{ fontSize: 11, color: 'var(--ink3)' }}>
                          {c.so_dien_thoai}
                          {c.ma_kh && <span style={{ marginLeft: 6, color: 'var(--champagne)', fontWeight: 600 }}>{c.ma_kh}</span>}
                        </div>
                      </div>
                      <span style={{
                        fontSize: 10, background: 'var(--grad-gold)', color: '#2a1d14',
                        padding: '2px 8px', borderRadius: 999, fontWeight: 700, flexShrink: 0,
                      }}>Hannah Spa</span>
                    </button>
                  ))}
                </div>
              )}
              {custOpen && <div style={{ position: 'fixed', inset: 0, zIndex: 99 }} onClick={() => setCustOpen(false)} />}

              {/* Sau khi chọn KH */}
              {selectedCustomer && (
                <div style={{ marginTop: 10 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 36px', gap: 8, alignItems: 'end', marginBottom: 8 }}>
                    {[
                      { label: 'Tên khách hàng', val: selectedCustomer.ho_ten },
                      { label: 'Số điện thoại',  val: selectedCustomer.so_dien_thoai || '' },
                      { label: 'Email',           val: selectedCustomer.email || '' },
                    ].map(f => (
                      <div key={f.label}>
                        <div style={{ fontSize: 10, color: 'var(--ink3)', marginBottom: 3 }}>{f.label}</div>
                        <input readOnly value={f.val} placeholder="—"
                          style={{
                            width: '100%', border: '1px solid var(--bord)', borderRadius: 8,
                            padding: '7px 10px', fontSize: 13, background: '#f5f0ea',
                            color: 'var(--ink)', fontFamily: 'var(--sans)', boxSizing: 'border-box', outline: 'none',
                          }}
                        />
                      </div>
                    ))}
                    <button onClick={clearCustomer} style={{
                      width: 36, height: 36, border: '1px solid var(--bord)', borderRadius: 8,
                      background: '#fff', color: 'var(--ink3)', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
                    }}>✕</button>
                  </div>

                  {/* Số dư */}
                  <div style={{ display: 'flex', gap: 20, fontSize: 12, color: 'var(--ink3)', marginBottom: 10 }}>
                    <span>Số dư khả dụng: <b style={{ color: 'var(--champagne)' }}>0đ</b></span>
                    <span>Tài khoản thưởng: <b style={{ color: 'var(--champagne)' }}>0đ</b></span>
                  </div>

                  {/* Thẻ liệu trình đang sử dụng */}
                  {customerCards.length > 0 && (
                    <div style={{ maxHeight: 180, overflowY: 'auto' }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 8 }}>
                        Liệu trình đang sử dụng
                      </div>
                      <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4 }}>
                        {customerCards.filter(c => c.so_buoi_con_lai > 0).map(card => (
                          <LieuTrinhCard key={card.id} card={card} onUse={handleAddCard} />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── CATALOG ── */}
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

          {/* Catalog tabs */}
          <div style={{ display: 'flex', borderBottom: '2px solid var(--line)', background: '#fff', flexShrink: 0 }}>
            {[
              { key: 'the_dich_vu', label: 'Thẻ dịch vụ' },
              { key: 'dich_vu',     label: 'Dịch vụ' },
              { key: 'san_pham',    label: 'Sản phẩm' },
            ].map(t => (
              <button key={t.key} onClick={() => { setCatalogTab(t.key); setCat('all'); setSearch('') }}
                style={{
                  padding: '10px 20px', border: 'none', background: 'none', fontSize: 13,
                  fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--sans)', whiteSpace: 'nowrap',
                  color: catalogTab === t.key ? 'var(--champagne)' : 'var(--ink3)',
                  borderBottom: catalogTab === t.key ? '2px solid var(--champagne)' : '2px solid transparent',
                  marginBottom: -2, transition: 'all .15s',
                }}>{t.label}</button>
            ))}
          </div>

          {/* Tab: Dịch vụ */}
          {catalogTab === 'dich_vu' && (
            <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <div style={{ padding: '10px 16px 0', flexShrink: 0 }}>
                <div className="search" style={{ maxWidth: '100%' }}>
                  <I.Search />
                  <input placeholder="Tìm nhanh dịch vụ" value={search} onChange={e => setSearch(e.target.value)} />
                  {search && <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', color: 'var(--ink3)', cursor: 'pointer' }}>✕</button>}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6, padding: '8px 16px', overflowX: 'auto', flexShrink: 0 }}>
                {categories.map(c => (
                  <button key={c} onClick={() => setCat(c)} style={{
                    padding: '5px 12px', border: '1px solid var(--bord)', borderRadius: 20, whiteSpace: 'nowrap',
                    background: c === cat ? 'var(--champagne)' : 'transparent',
                    color: c === cat ? '#2a1d14' : 'var(--ink3)',
                    fontSize: 11.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--sans)', transition: 'all .15s',
                  }}>{c === 'all' ? 'Tất cả' : c}</button>
                ))}
              </div>
              <div className="pos-grid" style={{ flex: 1, overflowY: 'auto', padding: '0 16px 16px' }}>
                {filteredDV.map(dv => (
                  <div key={dv.id} className={`pos-item k${(dv.ten?.charCodeAt(0) || 1) % 6 + 1}`}
                    style={{ cursor: 'pointer' }} onClick={() => handleAddService(dv)}>
                    <div className="arch-thumb" />
                    <div className="n">{dv.ten}</div>
                    <div className="meta">{dv.thoi_luong_phut || dv.thoi_gian_phut || 0} phút</div>
                    <div className="price">{formatCurrency(dv.gia_co_ban || 0)}</div>
                  </div>
                ))}
                {filteredDV.length === 0 && (
                  <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '40px', color: 'var(--ink3)', fontSize: 13 }}>
                    {search ? `Không tìm thấy "${search}"` : 'Không có dịch vụ'}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tab: Thẻ dịch vụ */}
          {catalogTab === 'the_dich_vu' && (
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
              {!selectedCustomer ? (
                <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--ink3)' }}>
                  <div style={{ fontSize: 36, marginBottom: 10 }}>🎫</div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>Chọn khách hàng trước</div>
                  <div style={{ fontSize: 12, marginTop: 4 }}>Thẻ liệu trình sẽ hiển thị sau khi chọn KH</div>
                </div>
              ) : customerCards.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--ink3)' }}>
                  <div style={{ fontSize: 36, marginBottom: 10 }}>🎫</div>
                  <div style={{ fontSize: 14 }}>Khách hàng chưa có thẻ liệu trình</div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {customerCards.map(card => (
                    <button key={card.id} onClick={() => handleAddCard(card)}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '14px 16px', background: 'var(--surface)',
                        border: '1px solid rgba(201,169,110,.2)', borderRadius: 10,
                        cursor: 'pointer', textAlign: 'left', fontFamily: 'var(--sans)',
                      }}>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>
                          {card.ten_dich_vu} ({card.so_buoi_da_dung}/{card.so_buoi_tong})
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--ink3)', marginTop: 4, display: 'flex', gap: 12 }}>
                          <span>Còn <b style={{ color: 'var(--champagne)' }}>{card.so_buoi_con_lai}</b> buổi</span>
                          {card.ngay_het_han && <span>Hết hạn: {new Date(card.ngay_het_han).toLocaleDateString('vi-VN')}</span>}
                        </div>
                      </div>
                      <span style={{
                        background: 'var(--grad-gold)', color: '#2a1d14',
                        fontSize: 11, fontWeight: 700, padding: '5px 12px', borderRadius: 999, flexShrink: 0,
                      }}>+ Dùng</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tab: Sản phẩm */}
          {catalogTab === 'san_pham' && (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink3)' }}>
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <div style={{ fontSize: 36, marginBottom: 10 }}>📦</div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>Sản phẩm</div>
                <div style={{ fontSize: 12, marginTop: 4 }}>Tính năng đang phát triển</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ═══ RIGHT PANEL (40%) ═══ */}
      <aside style={{ flex: '0 0 40%', display: 'flex', flexDirection: 'column', background: '#fff', overflow: 'hidden' }}>

        {/* Right header */}
        <div style={{
          padding: '0 16px', borderBottom: '1px solid var(--line)', flexShrink: 0,
          background: 'linear-gradient(135deg,#3d2c20 0%,#2a1d14 100%)',
        }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#f3e6d2', fontFamily: 'var(--serif)', paddingTop: 12, marginBottom: 8 }}>
            Thông tin đơn hàng
          </div>
          <div style={{ display: 'flex' }}>
            {[['don_hang', 'Đơn hàng'], ['vat_tu', 'Vật tư tiêu hao']].map(([k, lbl]) => (
              <button key={k} onClick={() => setRightTab(k)}
                style={{
                  padding: '8px 14px', border: 'none', background: 'none', cursor: 'pointer',
                  fontSize: 12.5, fontWeight: 700, fontFamily: 'var(--sans)',
                  color: rightTab === k ? '#C9A96E' : 'rgba(243,230,210,.45)',
                  borderBottom: rightTab === k ? '2px solid #C9A96E' : '2px solid transparent',
                  transition: 'all .15s',
                }}>{lbl}</button>
            ))}
          </div>
        </div>

        {rightTab === 'don_hang' && (<>
          {/* KH info row */}
          <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--line)', background: '#fafaf9', flexShrink: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                {selectedCustomer ? (
                  <>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--champagne)' }}>{selectedCustomer.ho_ten}</div>
                    <div style={{ fontSize: 11, color: 'var(--ink3)', marginTop: 1 }}>
                      {selectedCustomer.so_dien_thoai}
                      {selectedCustomer.ma_kh && <span style={{ marginLeft: 6 }}>{selectedCustomer.ma_kh}</span>}
                    </div>
                  </>
                ) : (
                  <div style={{ fontSize: 13, color: 'var(--ink3)', fontStyle: 'italic' }}>Khách lẻ</div>
                )}
              </div>
              <div style={{ textAlign: 'right' }}>
                {currentOrder?.ma_don && (
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink)' }}>Mã: {currentOrder.ma_don}</div>
                )}
                <div style={{ fontSize: 10, color: 'var(--ink3)', marginTop: 1 }}>{dateStr}</div>
              </div>
            </div>
          </div>

          {/* Cart header */}
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 70px 80px',
            padding: '5px 14px', background: '#f5f0ea', flexShrink: 0,
            fontSize: 10, fontWeight: 700, color: 'var(--ink3)', letterSpacing: '.06em', textTransform: 'uppercase',
          }}>
            <span>DV/SP</span>
            <span style={{ textAlign: 'center' }}>SL</span>
            <span style={{ textAlign: 'right' }}>Thành tiền</span>
          </div>

          {/* Cart items */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '0 14px' }}>
            {lineItems.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 12px', color: 'var(--ink3)', fontSize: 13 }}>
                <div style={{
                  width: 28, height: 46, margin: '0 auto 12px',
                  background: 'var(--grad-arch)', borderRadius: '999px 999px 6px 6px', opacity: .2,
                }} />
                Chọn dịch vụ từ danh mục bên trái
              </div>
            ) : lineItems.map(item => (
              <CartLine
                key={item.id}
                item={item}
                onRemove={handleRemoveItem}
                onQtyChange={handleQtyChange}
                selectedCustomer={selectedCustomer}
                onCardCreated={() => posService.getCustomerCards(selectedCustomer?.id).then(c => setCustomerCards(c || []))}
              />
            ))}
          </div>

          {/* Summary */}
          <div style={{ borderTop: '1px solid var(--line)', padding: '10px 14px', flexShrink: 0, background: '#fafaf9' }}>

            {/* Mã KM */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
              <input value={maKM} onChange={e => setMaKM(e.target.value)} placeholder="Mã khuyến mại"
                style={{
                  flex: 1, border: '1px solid var(--bord)', borderRadius: 6,
                  padding: '5px 8px', fontSize: 12, background: '#fff', outline: 'none', fontFamily: 'var(--sans)',
                }}
              />
              <button style={{
                padding: '5px 12px', border: 'none', borderRadius: 6,
                background: 'var(--champagne)', color: '#2a1d14', fontWeight: 700, fontSize: 11, cursor: 'pointer', fontFamily: 'var(--sans)',
              }}>ÁP DỤNG</button>
            </div>

            {/* Tạm tính */}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 5 }}>
              <span style={{ color: 'var(--ink3)' }}>Tạm tính</span>
              <span style={{ fontWeight: 700, fontFamily: 'var(--serif)' }}>{formatCurrency(tongHang)}</span>
            </div>

            {/* Giảm giá DV */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4, fontSize: 12 }}>
              <span style={{ color: 'var(--ink3)', flex: 1 }}>Giảm giá DV</span>
              <span style={{ color: 'var(--ink3)' }}>−</span>
              <input value={giamDVPct} onChange={e => setGiamDVPct(e.target.value)} placeholder="0"
                style={{ width: 40, border: '1px solid var(--bord)', borderRadius: 5, padding: '3px 5px', fontSize: 12, textAlign: 'center', outline: 'none', background: '#fff' }}
              />
              <span style={{ color: 'var(--ink3)' }}>%</span>
              <span style={{ fontWeight: 700, color: 'var(--chi)', minWidth: 65, textAlign: 'right', fontFamily: 'var(--serif)' }}>
                {giamDVAmt > 0 ? `−${formatCurrency(giamDVAmt)}` : '0'}
              </span>
            </div>

            {/* VAT */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 8, fontSize: 12 }}>
              <span style={{ color: 'var(--ink3)', flex: 1 }}>VAT</span>
              <span style={{ color: 'var(--ink3)' }}>+</span>
              <input value={vatPct} onChange={e => setVatPct(e.target.value)} placeholder="0"
                style={{ width: 40, border: '1px solid var(--bord)', borderRadius: 5, padding: '3px 5px', fontSize: 12, textAlign: 'center', outline: 'none', background: '#fff' }}
              />
              <span style={{ color: 'var(--ink3)' }}>%</span>
              <span style={{ fontWeight: 700, color: 'var(--thu)', minWidth: 65, textAlign: 'right', fontFamily: 'var(--serif)' }}>
                {vatAmt > 0 ? formatCurrency(vatAmt) : '0'}
              </span>
            </div>

            {/* Tổng cộng */}
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '8px 0', borderTop: '1px solid var(--line)', borderBottom: '1px solid var(--line)', marginBottom: 8,
            }}>
              <span style={{ fontSize: 15, fontWeight: 700, fontFamily: 'var(--serif)', color: 'var(--ink)' }}>Tổng cộng</span>
              <span style={{ fontSize: 17, fontWeight: 700, color: 'var(--thu)', fontFamily: 'var(--serif)' }}>{formatCurrency(tongCuoi)}</span>
            </div>

            {/* Nhận */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span style={{ fontSize: 12, color: 'var(--ink3)', flex: 1 }}>Nhận</span>
              <input value={nhapTien}
                onChange={e => setNhapTien(e.target.value)}
                onFocus={() => { if (!nhapTien && tongCuoi > 0) setNhapTien(String(tongCuoi)) }}
                placeholder="0"
                style={{
                  width: 110, border: '1px solid var(--bord)', borderRadius: 6,
                  padding: '6px 8px', fontSize: 14, fontFamily: 'var(--serif)',
                  fontWeight: 700, textAlign: 'right', outline: 'none', background: '#fff',
                }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 8 }}>
              <span style={{ color: 'var(--ink3)' }}>Tiền thừa</span>
              <span style={{ fontWeight: 700, fontFamily: 'var(--serif)', color: tienThua > 0 ? 'var(--thu)' : 'var(--ink3)' }}>
                {formatCurrency(tienThua)}
              </span>
            </div>

            {/* PTTT */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 5, marginBottom: 6 }}>
              {PTTT_OPTS.map(p => (
                <button key={p.id} onClick={() => setPttt(p.id)}
                  style={{
                    padding: '6px 4px', borderRadius: 7, cursor: 'pointer', fontFamily: 'var(--sans)',
                    border: `2px solid ${pttt === p.id ? 'var(--champagne)' : 'var(--bord)'}`,
                    background: pttt === p.id ? 'rgba(201,169,110,.12)' : 'transparent',
                    color: pttt === p.id ? 'var(--champagne)' : 'var(--ink3)',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                    fontSize: 10.5, fontWeight: 700, transition: 'all .15s',
                  }}>
                  <span style={{ fontSize: 15 }}>{p.icon}</span>
                  <span style={{ textAlign: 'center', lineHeight: 1.2 }}>{p.label}</span>
                </button>
              ))}
            </div>

            {conLai > 0 && tienNhapNum > 0 && (
              <div style={{ fontSize: 12, color: 'var(--chi)', textAlign: 'center', fontWeight: 600 }}>
                Còn thiếu: {formatCurrency(conLai)}
              </div>
            )}
          </div>

          {/* ── Bottom action bar ── */}
          <div style={{
            borderTop: '2px solid var(--line)', padding: '10px 14px', flexShrink: 0,
            background: 'linear-gradient(135deg,#3d2c20 0%,#2a1d14 100%)',
          }}>
            <div style={{ display: 'flex', gap: 16, marginBottom: 10 }}>
              <Toggle on={sendSMS} onChange={setSendSMS}
                label={<span style={{ color: 'rgba(243,230,210,.65)', fontSize: 11 }}>Gửi SMS khi thanh toán đơn hàng</span>} />
              <Toggle on={sendZNS} onChange={setSendZNS}
                label={<span style={{ color: 'rgba(243,230,210,.65)', fontSize: 11 }}>Gửi ZNS cảm ơn khách hàng</span>} />
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={handleVoidOrder} title="Hủy đơn / Đơn mới"
                style={{
                  width: 40, height: 40, border: '1px solid rgba(243,230,210,.2)', borderRadius: 8,
                  background: 'rgba(255,255,255,.08)', color: 'rgba(243,230,210,.7)',
                  cursor: 'pointer', fontSize: 17, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>←</button>
              <button
                disabled={!orderId || lineItems.length === 0}
                onClick={() => alert('Đã lưu đơn nháp')}
                style={{
                  flex: '0 0 auto', padding: '0 16px', height: 40, border: '1px solid rgba(243,230,210,.3)',
                  borderRadius: 8, background: 'rgba(255,255,255,.1)', color: '#f3e6d2',
                  cursor: 'pointer', fontSize: 13, fontWeight: 700, fontFamily: 'var(--sans)',
                }}>Lưu</button>
              <button
                disabled={loading || lineItems.length === 0 || !orderId}
                onClick={() => handleCheckout(false)}
                style={{
                  flex: 1, height: 40, border: 'none', borderRadius: 8,
                  background: 'var(--champagne)', color: '#2a1d14',
                  cursor: 'pointer', fontSize: 13, fontWeight: 700, fontFamily: 'var(--sans)',
                  opacity: loading || lineItems.length === 0 || !orderId ? 0.6 : 1,
                }}>Thanh toán</button>
              <button
                disabled={loading || lineItems.length === 0 || !orderId}
                onClick={() => handleCheckout(true)}
                style={{
                  flex: '0 0 auto', padding: '0 14px', height: 40, border: 'none', borderRadius: 8,
                  background: 'linear-gradient(135deg,#C9A96E,#A0714F)', color: '#2a1d14',
                  cursor: 'pointer', fontSize: 12.5, fontWeight: 700, fontFamily: 'var(--sans)',
                  opacity: loading || lineItems.length === 0 || !orderId ? 0.6 : 1, whiteSpace: 'nowrap',
                }}>Thanh toán & in</button>
            </div>
          </div>
        </>)}

        {rightTab === 'vat_tu' && (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink3)' }}>
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <div style={{ fontSize: 36, marginBottom: 10 }}>🧴</div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>Vật tư tiêu hao</div>
              <div style={{ fontSize: 12, marginTop: 4 }}>Tính năng đang phát triển</div>
            </div>
          </div>
        )}
      </aside>
    </div>
  )
}

// ── Router ────────────────────────────────────────────────────────────────────
export default function PosApp() {
  const path = window.location.pathname
  if (path === '/pos/danh-sach') {
    return <PosOrderHistory onResumeOrder={() => { window.location.href = '/pos' }} />
  }
  return <PosCreateOrder />
}
