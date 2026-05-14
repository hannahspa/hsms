import { useState, useEffect, useCallback, useRef } from 'react'
import { posService } from '../../services/posService'
import { formatCurrency, todayISO, getNowVN } from '../../lib/utils'
import { useAuth } from '../../context/AuthContext'
import I from '../../components/shared/Icons'

// ─── Constants ────────────────────────────────────────────────────────────────
const PTTT_CFG = [
  { id: 'tien_mat',     label: 'Tiền Mặt',    icon: '💵', color: '#2D7A4F' },
  { id: 'chuyen_khoan', label: 'Chuyển Khoản', icon: '🏦', color: '#1A5276' },
  { id: 'quet_the',     label: 'Quẹt Thẻ',    icon: '💳', color: '#6C3483' },
]

const ITEM_LABEL = { dich_vu: 'DV', san_pham: 'SP', the_lieu_trinh: 'Thẻ' }

function getInitials(name) {
  if (!name) return '?'
  const p = name.trim().split(' ')
  return (p[p.length - 1][0] || '').toUpperCase()
}

function parseVND(s) {
  return parseInt(String(s).replace(/\D/g, ''), 10) || 0
}

// ─── CustomerSelector ─────────────────────────────────────────────────────────
function CustomerSelector({ selected, onSelect }) {
  const [q, setQ] = useState('')
  const [results, setResults] = useState([])
  const [open, setOpen] = useState(false)
  const [searching, setSearching] = useState(false)
  const timer = useRef(null)

  const search = useCallback(async (query) => {
    if (!query || query.length < 2) { setResults([]); return }
    setSearching(true)
    try { setResults(await posService.searchCustomers(query, 8)) }
    finally { setSearching(false) }
  }, [])

  const onChange = e => {
    const v = e.target.value
    setQ(v); setOpen(true)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => search(v), 280)
  }

  const pick = c => { onSelect(c); setOpen(false); setQ(''); setResults([]) }
  const clear = () => { onSelect(null); setQ(''); setResults([]) }

  if (selected) {
    return (
      <div className="pos-cust">
        <div className="avatar" style={{ background: 'linear-gradient(135deg,#C9A96E,#A0714F)', color: '#2a1d14' }}>
          {getInitials(selected.ho_ten)}
        </div>
        <div className="info" style={{ flex: 1 }}>
          <div className="n">{selected.ho_ten}</div>
          <div className="m">
            {selected.so_dien_thoai || 'Không có SĐT'}
            {selected.tong_chi_tieu > 0 && ` · ${formatCurrency(selected.tong_chi_tieu)}`}
          </div>
        </div>
        <button onClick={clear} style={{
          background: 'none', border: 'none', color: 'var(--ink3)',
          cursor: 'pointer', fontSize: 15, padding: '4px 6px', lineHeight: 1,
        }}>✕</button>
      </div>
    )
  }

  return (
    <div style={{ position: 'relative' }}>
      <div className="pos-cust" style={{ padding: '10px 14px' }}>
        <div className="avatar" style={{ background: 'var(--grad-arch)', flexShrink: 0, fontSize: 13 }}>?</div>
        <input
          value={q}
          onChange={onChange}
          onFocus={() => setOpen(true)}
          placeholder="Tìm khách hàng (tên, SĐT)…"
          style={{
            flex: 1, border: 'none', background: 'transparent', outline: 'none',
            fontSize: 13, color: 'var(--ink)', fontFamily: 'var(--sans)',
          }}
        />
        {searching && <span style={{ fontSize: 11, color: 'var(--ink3)', animation: 'fadeUp .2s' }}>…</span>}
      </div>

      {open && (results.length > 0 || (q.length >= 2 && !searching)) && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 60,
          background: 'var(--surface)', border: '1px solid var(--bord)',
          borderRadius: 12, boxShadow: 'var(--sh-3)', overflow: 'hidden',
          animation: 'scaleIn .18s var(--ease-out) both',
        }}>
          {results.length === 0 ? (
            <div style={{ padding: '14px', fontSize: 13, color: 'var(--ink3)', textAlign: 'center' }}>
              Không tìm thấy · <span style={{ color: 'var(--champagne)' }}>Thêm mới</span>
            </div>
          ) : results.map(c => (
            <button
              key={c.id}
              onClick={() => pick(c)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                width: '100%', padding: '10px 14px', border: 'none',
                background: 'transparent', cursor: 'pointer', textAlign: 'left',
                borderBottom: '1px solid var(--line)', fontFamily: 'var(--sans)',
              }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%', background: 'var(--grad-arch)',
                flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 700, color: '#2a1d14',
              }}>{getInitials(c.ho_ten)}</div>
              <div style={{ flex: 1, textAlign: 'left' }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>{c.ho_ten}</div>
                <div style={{ fontSize: 11, color: 'var(--ink3)', marginTop: 1 }}>{c.so_dien_thoai}</div>
              </div>
              {c.tong_chi_tieu > 0 && (
                <div style={{ fontSize: 11, color: 'var(--champagne)', fontWeight: 700 }}>
                  {formatCurrency(c.tong_chi_tieu)}
                </div>
              )}
            </button>
          ))}
        </div>
      )}
      {open && <div style={{ position: 'fixed', inset: 0, zIndex: 59 }} onClick={() => setOpen(false)} />}
    </div>
  )
}

// ─── CartLine ─────────────────────────────────────────────────────────────────
function CartLine({ item, onRemove, onQtyChange }) {
  const [qty, setQty] = useState(item.so_luong)
  const name = item.dich_vu?.ten || item.san_pham?.ten || item.the_lieu_trinh?.ten_dich_vu || '—'

  const changeQty = async (n) => {
    if (n < 1) return
    setQty(n)
    await onQtyChange(item.id, n, item.don_gia)
  }

  return (
    <div className="cart-line" style={{ alignItems: 'flex-start', gap: 10 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 13, fontWeight: 600, color: 'var(--ink)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>{name}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
          <span style={{
            fontSize: 9, letterSpacing: '.06em', textTransform: 'uppercase',
            background: 'var(--bg2)', border: '1px solid var(--line)',
            padding: '1px 5px', borderRadius: 4, color: 'var(--ink3)', fontWeight: 700,
          }}>{ITEM_LABEL[item.loai_item]}</span>
          {/* Qty stepper */}
          <button onClick={() => changeQty(qty - 1)} style={{
            width: 20, height: 20, border: '1px solid var(--line)', borderRadius: 4,
            background: 'var(--bg)', cursor: 'pointer', fontSize: 15, color: 'var(--ink2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1,
          }}>−</button>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)', minWidth: 18, textAlign: 'center' }}>
            {qty}
          </span>
          <button onClick={() => changeQty(qty + 1)} style={{
            width: 20, height: 20, border: '1px solid var(--line)', borderRadius: 4,
            background: 'var(--bg)', cursor: 'pointer', fontSize: 15, color: 'var(--ink2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1,
          }}>+</button>
          {item.nhan_vien && (
            <span style={{ fontSize: 10, color: 'var(--champagne)', marginLeft: 2 }}>
              {item.nhan_vien.ho_ten}
            </span>
          )}
        </div>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ fontFamily: 'var(--serif)', fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>
          {formatCurrency(item.thanh_tien)}
        </div>
        <button onClick={() => onRemove(item.id)} style={{
          background: 'none', border: 'none', color: 'var(--ink3)',
          cursor: 'pointer', fontSize: 13, padding: '2px 4px', marginTop: 2,
        }}>✕</button>
      </div>
    </div>
  )
}

// ─── Main PosApp ──────────────────────────────────────────────────────────────
export default function PosApp() {
  const { user } = useAuth()
  const [currentOrder, setCurrentOrder] = useState(null)
  const [lineItems, setLineItems] = useState([])
  const [selectedCustomer, setSelectedCustomer] = useState(null)
  const [customerCards, setCustomerCards] = useState([])
  const [loading, setLoading] = useState(false)
  const [dichVuList, setDichVuList] = useState([])
  const [cat, setCat] = useState('all')
  const [search, setSearch] = useState('')
  const [todayStats, setTodayStats] = useState({ soDon: 0, tongThu: 0 })
  // Payment state
  const [activePay, setActivePay] = useState('tien_mat')
  const [payAmounts, setPayAmounts] = useState({ tien_mat: '', chuyen_khoan: '', quet_the: '' })
  const [giamGia, setGiamGia] = useState('')

  const orderId = currentOrder?.id

  useEffect(() => {
    posService.getServices().then(d => setDichVuList(d || []))
    posService.getTodayStats().then(s => setTodayStats(s))
  }, [])

  const loadLineItems = useCallback(async () => {
    if (!orderId) return
    setLineItems(await posService.getLineItems(orderId) || [])
  }, [orderId])

  useEffect(() => { loadLineItems() }, [loadLineItems])

  // Load thẻ liệu trình khi chọn khách hàng
  useEffect(() => {
    if (!selectedCustomer?.id) { setCustomerCards([]); return }
    posService.getCustomerCards(selectedCustomer.id)
      .then(cards => setCustomerCards(cards || []))
      .catch(() => setCustomerCards([]))
  }, [selectedCustomer?.id])

  // ── Order handlers ──
  const handleNewOrder = async () => {
    if (currentOrder?.trang_thai === 'draft' && !confirm('Đơn đang dở. Tạo đơn mới?')) return
    setLoading(true)
    try {
      const order = await posService.createOrder({ nguoiTao: user?.id, khachHangId: selectedCustomer?.id || null })
      setCurrentOrder(order)
      setLineItems([])
      setPayAmounts({ tien_mat: '', chuyen_khoan: '', quet_the: '' })
      setGiamGia('')
    } catch (err) { alert('Lỗi: ' + err.message) }
    finally { setLoading(false) }
  }

  const handleAddItem = async (item) => {
    let oid = orderId
    if (!oid) {
      if (!confirm('Chưa có đơn. Tạo đơn mới?')) return
      setLoading(true)
      try {
        const order = await posService.createOrder({ nguoiTao: user?.id, khachHangId: selectedCustomer?.id || null })
        setCurrentOrder(order)
        oid = order.id
      } catch (err) { alert('Lỗi: ' + err.message); setLoading(false); return }
      setLoading(false)
    }
    try {
      const added = await posService.addLineItem(oid, item)
      setLineItems(p => [...p, added])
    } catch (err) { alert('Lỗi thêm dịch vụ: ' + err.message) }
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

  const handleAddCard = async (card) => {
    let oid = orderId
    if (!oid) {
      if (!confirm('Chưa có đơn. Tạo đơn mới?')) return
      setLoading(true)
      try {
        const order = await posService.createOrder({ nguoiTao: user?.id, khachHangId: selectedCustomer?.id || null })
        setCurrentOrder(order)
        oid = order.id
      } catch (err) { alert('Lỗi: ' + err.message); setLoading(false); return }
      setLoading(false)
    }
    try {
      const added = await posService.addLineItem(oid, {
        loai_item: 'the_lieu_trinh',
        the_lieu_trinh_id: card.id,
        so_luong: 1,
        don_gia: 0,
        thanh_tien: 0,
      })
      setLineItems(p => [...p, added])
    } catch (err) { alert('Lỗi thêm thẻ: ' + err.message) }
  }

  const handleVoidOrder = async () => {
    if (!orderId || !confirm('Hủy đơn hàng này?')) return
    try {
      await posService.voidOrder(orderId)
      setCurrentOrder(null)
      setLineItems([])
    } catch (err) { alert('Lỗi: ' + err.message) }
  }

  const handleCheckout = async () => {
    if (!orderId || lineItems.length === 0) return
    const giam = parseVND(giamGia)
    const tongSauGiam = Math.max(0, tongHang - giam)
    const totalPaid = PTTT_CFG.reduce((s, p) => s + parseVND(payAmounts[p.id]), 0)

    if (totalPaid < tongSauGiam) {
      if (!confirm(`Còn thiếu ${formatCurrency(tongSauGiam - totalPaid)}. Ghi nợ và chốt đơn?`)) return
    }

    setLoading(true)
    try {
      // Ghi thanh toán từng PTTT
      for (const p of PTTT_CFG) {
        const amt = parseVND(payAmounts[p.id])
        if (amt > 0) {
          await posService.addPayment(orderId, { hinhThuc: p.id, soTien: amt })
        }
      }
      const conNo = Math.max(0, tongSauGiam - PTTT_CFG.reduce((s, p) => s + parseVND(payAmounts[p.id]), 0))
      await posService.finalizeOrder(orderId, { giamGia: giam, conNo })
      // Reset
      setCurrentOrder(null)
      setLineItems([])
      setPayAmounts({ tien_mat: '', chuyen_khoan: '', quet_the: '' })
      setGiamGia('')
      const stats = await posService.getTodayStats()
      setTodayStats(stats)
    } catch (err) { alert('Lỗi thanh toán: ' + err.message) }
    finally { setLoading(false) }
  }

  // ── Computed values ──
  const tongHang = lineItems.reduce((s, i) => s + (i.thanh_tien || 0), 0)
  const giamGiaNum = parseVND(giamGia)
  const tongSauGiam = Math.max(0, tongHang - giamGiaNum)
  const tongDaTra = PTTT_CFG.reduce((s, p) => s + parseVND(payAmounts[p.id]), 0)
  const conLai = Math.max(0, tongSauGiam - tongDaTra)
  const thoiLai = Math.max(0, tongDaTra - tongSauGiam)

  const categories = ['all', ...new Set(dichVuList.map(d => d.danh_muc).filter(Boolean))]
  const filteredDV = dichVuList.filter(dv => {
    if (cat !== 'all' && dv.danh_muc !== cat) return false
    if (search && !dv.ten.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  return (
    <div>
      {/* ── Today Strip ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <div style={{ fontFamily: 'var(--serif)', fontSize: 22, fontWeight: 700, letterSpacing: '-.005em', color: 'var(--ink)' }}>
            POS Bán Hàng
          </div>
          <div style={{ fontSize: 12, color: 'var(--ink3)', marginTop: 2 }}>
            {user?.ho_ten || 'Thu Ngân'} · Hôm nay: {todayStats.soDon} đơn · {formatCurrency(todayStats.tongThu)}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {orderId && (
            <div style={{ fontSize: 12, color: 'var(--champagne)', fontWeight: 600, background: 'rgba(201,169,110,.12)', padding: '5px 12px', borderRadius: 999, border: '1px solid rgba(201,169,110,.25)' }}>
              Đơn {currentOrder?.ma_don || '#—'}
            </div>
          )}
          {!orderId
            ? <button className="btn gold" onClick={handleNewOrder} disabled={loading}>
                <I.Plus style={{ width: 13, height: 13 }} /> Tạo Đơn Mới
              </button>
            : <button className="btn" onClick={handleNewOrder} disabled={loading}>
                <I.Plus style={{ width: 13, height: 13 }} /> Đơn Mới
              </button>
          }
        </div>
      </div>

      {/* ── POS Layout ── */}
      <div className="pos">
        {/* LEFT — Catalog */}
        <div className="pos-left">
          {/* Category tabs */}
          <div className="pos-cats">
            {categories.map(c => (
              <button
                key={c}
                className={`pos-cat${c === cat ? ' active' : ''}`}
                onClick={() => setCat(c)}>
                {c === 'all' ? 'TẤT CẢ' : c.toUpperCase()}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="search" style={{ margin: '0 0 14px', maxWidth: '100%' }}>
            <I.Search />
            <input
              placeholder="Tìm dịch vụ, sản phẩm…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', color: 'var(--ink3)', cursor: 'pointer', fontSize: 14 }}>✕</button>
            )}
          </div>

          {/* Service grid */}
          <div className="pos-grid">
            {filteredDV.map(dv => (
              <div
                key={dv.id}
                className={`pos-item k${(dv.ten?.charCodeAt(0) || 1) % 6 + 1}`}
                style={{ cursor: 'pointer' }}
                onClick={() => handleAddItem({
                  loai_item: 'dich_vu',
                  dich_vu_id: dv.id,
                  so_luong: 1,
                  don_gia: dv.gia_co_ban,
                  thanh_tien: dv.gia_co_ban,
                })}>
                <div className="arch-thumb" />
                <div className="n">{dv.ten}</div>
                <div className="meta">{dv.thoi_luong_phut || dv.thoi_gian_phut || 0} phút</div>
                <div className="price">{formatCurrency(dv.gia_co_ban || 0)}</div>
              </div>
            ))}
            {filteredDV.length === 0 && (
              <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '40px 20px', color: 'var(--ink3)', fontSize: 13 }}>
                {search ? `Không tìm thấy dịch vụ nào cho "${search}"` : 'Không có dịch vụ'}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT — Cart */}
        <aside className="pos-right">
          {/* Customer selector */}
          <CustomerSelector selected={selectedCustomer} onSelect={setSelectedCustomer} />

          {/* Thẻ liệu trình của khách */}
          {customerCards.length > 0 && (
            <div style={{ borderBottom: '1px solid var(--line)', padding: '8px 12px' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 6 }}>
                🎫 Thẻ liệu trình ({customerCards.length})
              </div>
              {customerCards.map(card => (
                <button
                  key={card.id}
                  onClick={() => handleAddCard(card)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    width: '100%', padding: '7px 10px', marginBottom: 4,
                    background: 'rgba(201,169,110,.08)', border: '1px solid rgba(201,169,110,.22)',
                    borderRadius: 8, cursor: 'pointer', textAlign: 'left', fontFamily: 'var(--sans)',
                  }}
                >
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)' }}>{card.ten_dich_vu}</div>
                    <div style={{ fontSize: 10, color: 'var(--ink3)', marginTop: 1 }}>
                      Còn {card.so_buoi_con_lai} buổi · Hết {card.ngay_het_han ? new Date(card.ngay_het_han).toLocaleDateString('vi-VN') : '—'}
                    </div>
                  </div>
                  <span style={{ fontSize: 11, color: 'var(--champagne)', fontWeight: 700, marginLeft: 8, flexShrink: 0 }}>
                    + Dùng
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Cart header */}
          <div style={{
            padding: '10px 16px 6px',
            fontSize: 10.5, color: 'var(--ink3)',
            letterSpacing: '.14em', textTransform: 'uppercase', fontWeight: 700,
            borderBottom: '1px solid var(--line)',
          }}>
            Giỏ hàng ({lineItems.length} dịch vụ)
          </div>

          {/* Cart items */}
          <div className="pos-cart">
            {lineItems.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '36px 12px', color: 'var(--ink3)', fontSize: 13 }}>
                <div style={{
                  width: 36, height: 60, margin: '0 auto 12px',
                  background: 'var(--grad-arch)', borderRadius: '999px 999px 10px 10px', opacity: .25,
                }} />
                Chọn dịch vụ hoặc sản phẩm từ danh mục
              </div>
            ) : (
              lineItems.map(item => (
                <CartLine
                  key={item.id}
                  item={item}
                  onRemove={handleRemoveItem}
                  onQtyChange={handleQtyChange}
                />
              ))
            )}
          </div>

          {/* Footer */}
          <div className="pos-foot">
            {/* Giảm giá */}
            {lineItems.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, padding: '0 2px' }}>
                <span style={{ fontSize: 11.5, color: 'var(--ink3)', whiteSpace: 'nowrap' }}>Giảm giá:</span>
                <input
                  value={giamGia}
                  onChange={e => setGiamGia(e.target.value)}
                  placeholder="0đ"
                  style={{
                    flex: 1, border: '1px solid var(--bord)', borderRadius: 8,
                    padding: '6px 10px', fontSize: 13, background: 'var(--bg)',
                    color: 'var(--chi)', fontFamily: 'var(--serif)', outline: 'none',
                  }}
                />
              </div>
            )}

            {/* Total */}
            <div className="total">
              <span className="l">Tổng Cộng</span>
              <span className="v">{formatCurrency(tongHang)}</span>
            </div>
            {giamGiaNum > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--chi)', padding: '2px 0 6px' }}>
                <span>Giảm giá</span>
                <span>-{formatCurrency(giamGiaNum)}</span>
              </div>
            )}
            {giamGiaNum > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 15, fontFamily: 'var(--serif)', color: 'var(--ink)', padding: '0 0 10px', borderBottom: '1px solid var(--line)' }}>
                <span>Thực Thu</span>
                <span style={{ color: 'var(--thu)' }}>{formatCurrency(tongSauGiam)}</span>
              </div>
            )}

            {/* Payment methods */}
            <div style={{ marginTop: 10 }}>
              <div style={{ fontSize: 10.5, color: 'var(--ink3)', letterSpacing: '.12em', textTransform: 'uppercase', fontWeight: 700, marginBottom: 8 }}>
                Hình Thức Thanh Toán
              </div>
              <div className="pos-pays" style={{ gridTemplateColumns: 'repeat(3,1fr)', marginBottom: 10 }}>
                {PTTT_CFG.map(p => (
                  <button
                    key={p.id}
                    className={`pos-pay${activePay === p.id ? ' active' : ''}`}
                    onClick={() => setActivePay(p.id)}
                    style={{
                      flexDirection: 'column', gap: 2, padding: '8px 6px',
                      height: 'auto', alignItems: 'center',
                      borderColor: activePay === p.id ? p.color : parseVND(payAmounts[p.id]) > 0 ? `${p.color}80` : undefined,
                      background: activePay === p.id ? `${p.color}18` : parseVND(payAmounts[p.id]) > 0 ? `${p.color}08` : undefined,
                    }}>
                    <span>{p.icon}</span>
                    <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.04em' }}>{p.label.toUpperCase()}</span>
                    {parseVND(payAmounts[p.id]) > 0 && (
                      <span style={{ fontSize: 11, color: p.color, fontWeight: 700, fontFamily: 'var(--serif)' }}>
                        {formatCurrency(parseVND(payAmounts[p.id]))}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* Amount input for active PTTT */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <span style={{ fontSize: 11.5, color: 'var(--ink3)', whiteSpace: 'nowrap' }}>
                  {PTTT_CFG.find(p => p.id === activePay)?.label}:
                </span>
                <input
                  value={payAmounts[activePay]}
                  onChange={e => setPayAmounts(prev => ({ ...prev, [activePay]: e.target.value }))}
                  onFocus={e => {
                    if (!payAmounts[activePay] && conLai > 0) {
                      setPayAmounts(prev => ({ ...prev, [activePay]: String(conLai) }))
                    }
                  }}
                  placeholder="0"
                  style={{
                    flex: 1, border: '1px solid var(--bord)', borderRadius: 8,
                    padding: '8px 12px', fontSize: 15, fontFamily: 'var(--serif)',
                    fontWeight: 700, color: 'var(--ink)', background: 'var(--bg)', outline: 'none',
                  }}
                />
              </div>

              {/* Summary */}
              {lineItems.length > 0 && (
                <div style={{ fontSize: 12, color: 'var(--ink3)', marginBottom: 10, display: 'flex', justifyContent: 'space-between' }}>
                  <span>Đã nhập: {formatCurrency(tongDaTra)}</span>
                  {conLai > 0
                    ? <span style={{ color: 'var(--chi)' }}>Còn lại: {formatCurrency(conLai)}</span>
                    : thoiLai > 0
                    ? <span style={{ color: 'var(--thu)' }}>Thối lại: {formatCurrency(thoiLai)}</span>
                    : <span style={{ color: 'var(--thu)' }}>✓ Đủ tiền</span>
                  }
                </div>
              )}
            </div>

            {/* Checkout button */}
            <button
              className="btn gold"
              style={{ width: '100%', justifyContent: 'center', padding: '14px', fontSize: 14, fontWeight: 700 }}
              onClick={handleCheckout}
              disabled={loading || lineItems.length === 0 || !orderId}>
              <I.Receipt style={{ width: 16, height: 16 }} />
              {loading ? 'Đang xử lý…' : 'THANH TOÁN'}
            </button>

            {orderId && (
              <button
                className="btn ghost"
                style={{ width: '100%', marginTop: 6, justifyContent: 'center', color: 'var(--chi)', fontSize: 12 }}
                onClick={handleVoidOrder}>
                Hủy Đơn
              </button>
            )}
          </div>
        </aside>
      </div>
    </div>
  )
}
