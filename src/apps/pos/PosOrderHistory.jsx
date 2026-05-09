import { useState, useEffect, useCallback } from 'react'
import { posService } from '../../services/posService'
import { formatCurrency, todayISO } from '../../lib/utils'
import { LUX } from '../../constants/lux'
import { COLORS } from '../../constants/colors'

const S = {
  container: {
    flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, padding: '8px',
  },
  searchBar: {
    display: 'flex', gap: '8px', marginBottom: '12px',
  },
  input: {
    flex: 1, padding: '10px 14px', borderRadius: LUX.radiusSm,
    border: `1.5px solid ${LUX.line2}`, fontSize: '14px',
    outline: 'none', color: LUX.ink, background: LUX.surface2,
  },
  list: {
    flex: 1, overflowY: 'auto',
  },
  card: {
    background: LUX.surface2, borderRadius: LUX.radiusSm, padding: '12px 14px',
    marginBottom: '8px', border: `1px solid ${LUX.line}`,
    cursor: 'pointer', boxShadow: LUX.shadowSm,
  },
  cardHeader: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: '6px',
  },
  maDon: {
    fontWeight: 700, fontSize: '14px', color: LUX.ink,
  },
  statusBadge: (status) => {
    const colors = {
      draft: { bg: '#FFF3CD', text: '#856404' },
      da_thanh_toan: { bg: '#D4EDDA', text: '#155724' },
      no_mot_phan: { bg: '#D6EAF8', text: '#1A5276' },
      huy: { bg: '#F8D7DA', text: '#721C24' },
    }
    const c = colors[status] || colors.draft
    return {
      padding: '3px 10px', borderRadius: '12px', fontSize: '11px',
      fontWeight: 700, background: c.bg, color: c.text,
    }
  },
  cardBody: {
    display: 'flex', justifyContent: 'space-between', fontSize: '13px',
  },
  cardKh: { color: LUX.ink2 },
  cardAmount: {
    fontWeight: 700, color: COLORS.primary, fontSize: '15px',
  },
  empty: {
    textAlign: 'center', padding: '60px 20px', color: LUX.ink3, fontSize: '14px',
  },
}

const STATUS_LABELS = {
  draft: 'Đang soạn',
  da_thanh_toan: 'Đã TT',
  no_mot_phan: 'Nợ',
  huy: 'Đã hủy',
}

export default function PosOrderHistory({ onViewOrder }) {
  const [orders, setOrders] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)

  const loadOrders = useCallback(async () => {
    setLoading(true)
    try {
      const today = todayISO()
      setOrders(await posService.getOrdersByDate(today))
    } catch (_) {} finally { setLoading(false) }
  }, [])

  useEffect(() => { loadOrders() }, [loadOrders])

  const handleSearch = async (q) => {
    setSearch(q)
    if (!q.trim()) { loadOrders(); return }
    try {
      setOrders(await posService.searchOrders(q))
    } catch (_) {}
  }

  const handleVoidOrder = async (e, order) => {
    e.stopPropagation()
    if (!confirm(`Hủy đơn ${order.ma_don}?`)) return
    try {
      await posService.voidOrder(order.id)
      loadOrders()
    } catch (err) {
      alert('Lỗi hủy đơn: ' + err.message)
    }
  }

  return (
    <div style={S.container}>
      <div style={S.searchBar}>
        <input
          style={S.input}
          placeholder="Tìm mã đơn hoặc tên khách hàng..."
          value={search}
          onChange={e => handleSearch(e.target.value)}
        />
      </div>

      <div style={S.list}>
        {orders.length === 0 ? (
          <div style={S.empty}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>📋</div>
            <div>{loading ? 'Đang tải...' : 'Chưa có đơn hàng nào hôm nay'}</div>
          </div>
        ) : (
          orders.map(order => (
            <div key={order.id} style={S.card} onClick={() => onViewOrder(order)}>
              <div style={S.cardHeader}>
                <span style={S.maDon}>{order.ma_don}</span>
                <span style={S.statusBadge(order.trang_thai)}>{STATUS_LABELS[order.trang_thai]}</span>
              </div>
              <div style={S.cardBody}>
                <span style={S.cardKh}>
                  {order.khach_hang?.ho_ten || 'Khách lẻ'}
                </span>
                <span style={S.cardAmount}>{formatCurrency(order.thuc_thu || order.tong_tien_hang)}</span>
              </div>
              {order.con_no > 0 && (
                <div style={{ fontSize: '11px', color: LUX.danger, marginTop: '4px' }}>
                  Còn nợ: {formatCurrency(order.con_no)}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
