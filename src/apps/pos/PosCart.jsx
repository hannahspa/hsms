import { formatCurrency } from '../../lib/utils'
import { LUX } from '../../constants/lux'
import { COLORS } from '../../constants/colors'
import { TRANG_THAI_DON_HANG } from '../../constants/enums'

const S = {
  container: {
    flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0,
  },
  header: {
    padding: '10px 16px', borderBottom: `1px solid ${LUX.line}`,
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  },
  headerTitle: {
    fontWeight: 700, fontSize: '14px', color: LUX.ink,
  },
  orderBadge: (status) => {
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
  itemsList: {
    flex: 1, overflowY: 'auto', padding: '8px',
  },
  itemCard: {
    background: LUX.surface2, borderRadius: LUX.radiusSm, padding: '10px 12px',
    marginBottom: '6px', border: `1px solid ${LUX.line}`,
    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
  },
  itemLeft: { flex: 1 },
  itemName: {
    fontWeight: 600, fontSize: '13px', color: LUX.ink, marginBottom: '2px',
  },
  itemMeta: {
    fontSize: '11px', color: LUX.ink3, display: 'flex', gap: '12px',
  },
  itemRight: {
    textAlign: 'right', minWidth: '80px',
  },
  itemPrice: {
    fontWeight: 700, fontSize: '14px', color: LUX.ink,
  },
  deleteBtn: {
    background: 'transparent', border: 'none', color: LUX.danger,
    cursor: 'pointer', fontSize: '16px', padding: '2px 4px',
  },
  footer: {
    borderTop: `1.5px solid ${LUX.line}`, padding: '12px 16px',
    background: LUX.surface2,
  },
  totalRow: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: '8px',
  },
  totalLabel: { fontSize: '14px', color: LUX.ink2, fontWeight: 600 },
  totalAmount: { fontSize: '20px', fontWeight: 800, color: COLORS.primary },
  btnRow: { display: 'flex', gap: '8px' },
  btn: {
    flex: 1, padding: '12px', borderRadius: LUX.radiusSm, border: 'none',
    fontSize: '14px', fontWeight: 700, cursor: 'pointer',
  },
  btnCheckout: {
    background: COLORS.grad, color: '#fff',
  },
  btnVoid: {
    background: 'transparent', color: LUX.danger,
    border: `1.5px solid ${LUX.danger}`,
  },
  emptyState: {
    textAlign: 'center', padding: '60px 20px', color: LUX.ink3, fontSize: '14px',
  },
  paymentList: {
    borderTop: `1px solid ${LUX.line}`, padding: '8px 16px',
  },
  paymentItem: {
    display: 'flex', justifyContent: 'space-between', fontSize: '13px',
    padding: '4px 0', color: LUX.ink2,
  },
}

const STATUS_LABELS = {
  draft: 'Đang soạn',
  da_thanh_toan: 'Đã thanh toán',
  no_mot_phan: 'Nợ một phần',
  huy: 'Đã hủy',
}

const ITEM_TYPE_LABELS = {
  dich_vu: 'DV',
  san_pham: 'SP',
  the_lieu_trinh: 'Thẻ',
}

export default function PosCart({
  order, lineItems, payments, selectedCustomer,
  tongHang, loading, onNewOrder, onRemoveItem, onUpdateQty,
  onCheckout, onVoidOrder,
}) {
  const hasOrder = order && order.trang_thai === 'draft'

  const renderContent = () => {
    if (!order) {
      return (
        <div style={S.emptyState}>
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>🛒</div>
          <div>Chưa có đơn hàng</div>
          <button
            style={{ ...S.btn, ...S.btnCheckout, marginTop: '16px', flex: 'none', width: 'auto', padding: '10px 24px' }}
            onClick={onNewOrder}
          >
            + Tạo Đơn Mới
          </button>
        </div>
      )
    }

    if (order.trang_thai !== 'draft') {
      return (
        <div style={S.emptyState}>
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>✓</div>
          <div>Đơn {order.ma_don}</div>
          <div style={{ marginTop: '4px', fontSize: '12px' }}>
            {STATUS_LABELS[order.trang_thai]} — {formatCurrency(order.thuc_thu)}
          </div>
          <button
            style={{ ...S.btn, ...S.btnCheckout, marginTop: '16px', flex: 'none', width: 'auto', padding: '10px 24px' }}
            onClick={onNewOrder}
          >
            + Tạo Đơn Mới
          </button>
        </div>
      )
    }

    return (
      <>
        <div style={S.itemsList}>
          {lineItems.length === 0 ? (
            <div style={{ ...S.emptyState, padding: '30px 0' }}>
              <div style={{ fontSize: '28px', marginBottom: '8px' }}>📋</div>
              <div>Chọn dịch vụ/sản phẩm từ danh mục bên trái</div>
            </div>
          ) : (
            lineItems.map(item => (
              <div key={item.id} style={S.itemCard}>
                <div style={S.itemLeft}>
                  <div style={S.itemName}>
                    {item.dich_vu?.ten || item.san_pham?.ten || item.the_lieu_trinh?.ten_dich_vu || '—'}
                  </div>
                  <div style={S.itemMeta}>
                    <span>[{ITEM_TYPE_LABELS[item.loai_item]}]</span>
                    {item.nhan_vien?.ho_ten && <span>KTV: {item.nhan_vien.ho_ten}</span>}
                    <span>SL: {item.so_luong}</span>
                  </div>
                </div>
                <div style={S.itemRight}>
                  <div style={S.itemPrice}>{formatCurrency(item.thanh_tien)}</div>
                  <button style={S.deleteBtn} onClick={() => onRemoveItem(item.id)}>✕</button>
                </div>
              </div>
            ))
          )}
        </div>

        {payments.length > 0 && (
          <div style={S.paymentList}>
            <div style={{ fontSize: '12px', fontWeight: 600, color: LUX.ink2, marginBottom: '4px' }}>Đã thanh toán:</div>
            {payments.map(p => (
              <div key={p.id} style={S.paymentItem}>
                <span>{p.hinh_thuc === 'tien_mat' ? '💵 TM' : p.hinh_thuc === 'chuyen_khoan' ? '🏦 CK' : p.hinh_thuc === 'quet_the' ? '💳 QT' : '🎫 TT'}</span>
                <span>{formatCurrency(p.so_tien)}</span>
              </div>
            ))}
          </div>
        )}

        <div style={S.footer}>
          <div style={S.totalRow}>
            <span style={S.totalLabel}>Tổng cộng</span>
            <span style={S.totalAmount}>{formatCurrency(tongHang)}</span>
          </div>
          {selectedCustomer && (
            <div style={{ ...S.totalRow, marginTop: '-4px' }}>
              <span style={{ fontSize: '11px', color: LUX.ink3 }}>
                KH: {selectedCustomer.ho_ten} — {selectedCustomer.so_dien_thoai}
              </span>
            </div>
          )}
          <div style={S.btnRow}>
            <button
              style={{ ...S.btn, ...S.btnCheckout }}
              onClick={onCheckout}
              disabled={lineItems.length === 0 || loading}
            >
              💰 Thanh Toán
            </button>
            <button
              style={{ ...S.btn, ...S.btnVoid }}
              onClick={onVoidOrder}
              disabled={loading}
            >
              Hủy Đơn
            </button>
          </div>
        </div>
      </>
    )
  }

  return (
    <div style={S.container}>
      <div style={S.header}>
        <span style={S.headerTitle}>
          {order ? `Đơn ${order.ma_don || '#mới'}` : 'Giỏ Hàng'}
        </span>
        {order && <span style={S.orderBadge(order.trang_thai)}>{STATUS_LABELS[order.trang_thai]}</span>}
      </div>
      {renderContent()}
    </div>
  )
}
