import { useState, useEffect, useCallback } from 'react'
import { posService } from '../../services/posService'
import { formatCurrency, todayISO } from '../../lib/utils'
import { LUX } from '../../constants/lux'
import { COLORS } from '../../constants/colors'
import { HINH_THUC_THU, TRANG_THAI_DON_HANG } from '../../constants/enums'
import PosProductCatalog from './PosProductCatalog'
import PosCart from './PosCart'
import PosPaymentModal from './PosPaymentModal'
import PosCustomerSelect from './PosCustomerSelect'
import PosOrderHistory from './PosOrderHistory'
import { useAuth } from '../../context/AuthContext'

const S = {
  container: {
    display: 'flex', height: '100vh', background: LUX.bg,
    fontFamily: LUX.fontSans, overflow: 'hidden',
  },
  leftPanel: {
    flex: '1 1 55%', display: 'flex', flexDirection: 'column',
    borderRight: `1px solid ${LUX.line}`, minWidth: 0,
  },
  rightPanel: {
    flex: '0 0 400px', display: 'flex', flexDirection: 'column',
    background: LUX.surface2,
  },
  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '12px 16px', background: LUX.surface2,
    borderBottom: `1px solid ${LUX.line}`, minHeight: '48px',
  },
  headerTitle: {
    fontWeight: 800, fontSize: '16px', color: LUX.ink,
    display: 'flex', alignItems: 'center', gap: '8px',
  },
  headerActions: {
    display: 'flex', gap: '8px', alignItems: 'center',
  },
  todayBadge: {
    padding: '6px 12px', background: LUX.line, borderRadius: LUX.radiusSm,
    fontSize: '13px', color: LUX.ink2, fontWeight: 600,
  },
  btn: {
    padding: '8px 16px', borderRadius: LUX.radiusSm, border: 'none',
    fontSize: '13px', fontWeight: 600, cursor: 'pointer',
    display: 'flex', alignItems: 'center', gap: '6px',
  },
  btnPrimary: {
    background: COLORS.grad, color: '#fff',
  },
  btnOutline: {
    background: 'transparent', color: LUX.ink2,
    border: `1.5px solid ${LUX.line2}`,
  },
  btnDanger: {
    background: LUX.danger, color: '#fff',
  },
  tabs: {
    display: 'flex', borderBottom: `1px solid ${LUX.line}`, padding: '0 16px',
    background: LUX.surface2,
  },
  tab: (active) => ({
    padding: '10px 16px', fontSize: '13px', fontWeight: active ? 700 : 500,
    color: active ? LUX.ink : LUX.ink3, cursor: 'pointer',
    borderBottom: active ? `2px solid ${COLORS.primary}` : '2px solid transparent',
    background: 'transparent', border: 'none',
    marginBottom: '-1px',
  }),
  summaryBar: {
    display: 'flex', gap: '24px', padding: '8px 16px',
    background: 'linear-gradient(90deg, rgba(160,113,79,0.05), transparent)',
    borderBottom: `1px solid ${LUX.line}`,
  },
  statItem: {
    display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px',
  },
  statDot: (color) => ({
    width: '8px', height: '8px', borderRadius: '50%', background: color,
  }),
}

export default function PosApp() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState('pos') // 'pos' | 'history'
  const [currentOrder, setCurrentOrder] = useState(null)
  const [lineItems, setLineItems] = useState([])
  const [payments, setPayments] = useState([])
  const [selectedCustomer, setSelectedCustomer] = useState(null)
  const [showPayment, setShowPayment] = useState(false)
  const [todayStats, setTodayStats] = useState({ soDon: 0, tongThu: 0 })
  const [loading, setLoading] = useState(false)

  const orderId = currentOrder?.id

  const loadTodayStats = useCallback(async () => {
    try { setTodayStats(await posService.getTodayStats()) } catch (_) {}
  }, [])

  useEffect(() => { loadTodayStats() }, [loadTodayStats])

  const loadLineItems = useCallback(async () => {
    if (!orderId) return
    try { setLineItems(await posService.getLineItems(orderId)) } catch (_) {}
  }, [orderId])

  const loadPayments = useCallback(async () => {
    if (!orderId) return
    try { setPayments(await posService.getPayments(orderId)) } catch (_) {}
  }, [orderId])

  useEffect(() => { loadLineItems() }, [loadLineItems])
  useEffect(() => { loadPayments() }, [loadPayments])

  const handleNewOrder = async () => {
    if (currentOrder?.trang_thai === 'draft') {
      if (!confirm('Bạn có đơn hàng đang dang dở. Tạo đơn mới sẽ mất đơn cũ?')) return
    }
    setLoading(true)
    try {
      const order = await posService.createOrder({
        nguoiTao: user?.id,
        khachHangId: selectedCustomer?.id || null,
      })
      setCurrentOrder(order)
      setPayments([])
    } catch (err) {
      alert('Lỗi tạo đơn: ' + err.message)
    } finally { setLoading(false) }
  }

  const handleSelectCustomer = (kh) => setSelectedCustomer(kh)

  const handleAddItem = async (item) => {
    if (!orderId) {
      if (!confirm('Chưa có đơn hàng. Tạo đơn mới?')) return
      await handleNewOrder()
    }
    try {
      const added = await posService.addLineItem(orderId, item)
      setLineItems(prev => [...prev, added])
    } catch (err) {
      alert('Lỗi thêm dòng: ' + err.message)
    }
  }

  const handleRemoveItem = async (itemId) => {
    try {
      await posService.removeLineItem(itemId)
      setLineItems(prev => prev.filter(i => i.id !== itemId))
    } catch (err) {
      alert('Lỗi xóa dòng: ' + err.message)
    }
  }

  const handleUpdateQty = async (itemId, soLuong, donGia) => {
    try {
      const updated = await posService.updateLineItemQty(itemId, soLuong, donGia)
      setLineItems(prev => prev.map(i => i.id === itemId ? updated : i))
    } catch (err) {
      alert('Lỗi cập nhật: ' + err.message)
    }
  }

  const handleCheckout = () => setShowPayment(true)

  const handleConfirmPayment = async ({ giamGia, payments: paymentList }) => {
    setLoading(true)
    try {
      // Add all payments
      for (const p of paymentList) {
        await posService.addPayment(orderId, p)
      }
      // Finalize via RPC
      const result = await posService.finalizeOrder(orderId, { giamGia })
      if (!result.success) {
        alert(result.error)
        return
      }
      setShowPayment(false)
      setCurrentOrder(null)
      loadTodayStats()
      alert(`Đơn ${result.ma_don} đã chốt thành công!`)
    } catch (err) {
      alert('Lỗi chốt đơn: ' + err.message)
    } finally { setLoading(false) }
  }

  const handleVoidOrder = async () => {
    if (!orderId) return
    if (!confirm('Xác nhận hủy đơn hàng này?')) return
    setLoading(true)
    try {
      await posService.voidOrder(orderId)
      setCurrentOrder(null)
      loadTodayStats()
    } catch (err) {
      alert('Lỗi hủy đơn: ' + err.message)
    } finally { setLoading(false) }
  }

  const tongHang = lineItems.reduce((s, i) => s + (i.thanh_tien || 0), 0)

  return (
    <div style={S.container}>
      {/* LEFT PANEL — Catalog */}
      <div style={S.leftPanel}>
        <div style={S.header}>
          <div style={S.headerTitle}>
            <span style={{ fontSize: '20px' }}>💆</span>
            POS Bán Hàng
            <span style={S.todayBadge}>{todayISO()}</span>
          </div>
          <div style={S.headerActions}>
            <button style={{ ...S.btn, ...S.btnOutline }} onClick={() => setActiveTab(activeTab === 'pos' ? 'history' : 'pos')}>
              {activeTab === 'pos' ? '📋 Lịch Sử' : '🛒 Bán Hàng'}
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div style={S.tabs}>
          <button style={S.tab(activeTab === 'pos')} onClick={() => setActiveTab('pos')}>
            🛒 Bán Hàng
          </button>
          <button style={S.tab(activeTab === 'history')} onClick={() => setActiveTab('history')}>
            📋 Lịch Sử Đơn
          </button>
        </div>

        {/* Summary */}
        <div style={S.summaryBar}>
          <div style={S.statItem}>
            <span style={S.statDot(COLORS.primary)} />
            <span style={{ color: LUX.ink2 }}>Hôm nay:</span>
            <strong style={{ color: LUX.ink }}>{todayStats.soDon} đơn</strong>
          </div>
          <div style={S.statItem}>
            <span style={{ color: LUX.ink2 }}>Tổng thu:</span>
            <strong style={{ color: COLORS.thu }}>{formatCurrency(todayStats.tongThu)}</strong>
          </div>
        </div>

        {activeTab === 'pos' ? (
          <PosProductCatalog
            onAddItem={handleAddItem}
            selectedCustomer={selectedCustomer}
            currentOrder={currentOrder}
            onNewOrder={handleNewOrder}
          />
        ) : (
          <PosOrderHistory onViewOrder={async (order) => {
            setCurrentOrder(await posService.getOrder(order.id))
            setActiveTab('pos')
          }} />
        )}
      </div>

      {/* RIGHT PANEL — Cart */}
      <div style={S.rightPanel}>
        <PosCustomerSelect
          selected={selectedCustomer}
          onChange={handleSelectCustomer}
        />
        <PosCart
          order={currentOrder}
          lineItems={lineItems}
          payments={payments}
          selectedCustomer={selectedCustomer}
          tongHang={tongHang}
          loading={loading}
          onNewOrder={handleNewOrder}
          onRemoveItem={handleRemoveItem}
          onUpdateQty={handleUpdateQty}
          onCheckout={handleCheckout}
          onVoidOrder={handleVoidOrder}
        />
      </div>

      {/* Payment Modal */}
      {showPayment && (
        <PosPaymentModal
          tongHang={tongHang}
          selectedCustomer={selectedCustomer}
          onConfirm={handleConfirmPayment}
          onCancel={() => setShowPayment(false)}
        />
      )}
    </div>
  )
}
