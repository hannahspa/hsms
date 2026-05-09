import { useState } from 'react'
import { formatCurrency, parseVND } from '../../lib/utils'
import { LUX } from '../../constants/lux'
import { COLORS } from '../../constants/colors'
import { HINH_THUC_THU } from '../../constants/enums'

const S = {
  overlay: {
    position: 'fixed', inset: 0, zIndex: 1000,
    background: 'rgba(0,0,0,0.5)', display: 'flex',
    alignItems: 'center', justifyContent: 'center',
  },
  modal: {
    background: LUX.surface2, borderRadius: LUX.radiusLg,
    padding: '24px', width: '420px', maxWidth: '95vw',
    boxShadow: LUX.shadowLg,
  },
  title: {
    fontWeight: 800, fontSize: '18px', color: LUX.ink, marginBottom: '4px',
  },
  subtitle: {
    fontSize: '13px', color: LUX.ink3, marginBottom: '16px',
  },
  dueRow: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '12px 16px', background: LUX.bg, borderRadius: LUX.radiusSm,
    marginBottom: '16px',
  },
  dueLabel: { fontSize: '14px', color: LUX.ink2, fontWeight: 600 },
  dueAmount: { fontSize: '24px', fontWeight: 800, color: COLORS.primary },
  sectionTitle: {
    fontSize: '13px', fontWeight: 700, color: LUX.ink2, marginBottom: '8px',
  },
  paymentMethods: {
    display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px',
  },
  methodRow: {
    display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px',
    borderRadius: LUX.radiusSm, border: `1.5px solid ${LUX.line}`,
  },
  methodLabel: {
    minWidth: '100px', fontSize: '14px', fontWeight: 600, color: LUX.ink,
  },
  amountInput: {
    flex: 1, padding: '8px 12px', borderRadius: '8px', fontSize: '15px',
    border: `1.5px solid ${LUX.line2}`, outline: 'none', textAlign: 'right',
    background: LUX.bg, color: LUX.ink, fontWeight: 600,
  },
  remaining: {
    textAlign: 'right', fontSize: '13px', marginTop: '4px', marginBottom: '12px',
  },
  btnRow: { display: 'flex', gap: '8px', marginTop: '8px' },
  btn: {
    flex: 1, padding: '12px', borderRadius: LUX.radiusSm, border: 'none',
    fontSize: '14px', fontWeight: 700, cursor: 'pointer',
  },
  btnConfirm: {
    background: COLORS.grad, color: '#fff',
  },
  btnCancel: {
    background: 'transparent', color: LUX.ink2,
    border: `1.5px solid ${LUX.line2}`,
  },
}

export default function PosPaymentModal({ tongHang, selectedCustomer, onConfirm, onCancel }) {
  const [amounts, setAmounts] = useState({})
  const [giamGia, setGiamGia] = useState(0)

  const updateAmount = (hinhThuc, val) => {
    setAmounts(prev => ({ ...prev, [hinhThuc]: parseVND(val) }))
  }

  const totalPaid = Object.values(amounts).reduce((s, a) => s + (a || 0), 0)
  const remaining = Math.max(0, tongHang - giamGia - totalPaid)
  const canConfirm = (totalPaid >= (tongHang - giamGia)) || (remaining > 0 && selectedCustomer)

  const handleConfirm = () => {
    const paymentList = Object.entries(amounts)
      .filter(([_, v]) => v > 0)
      .map(([hinhThuc, soTien]) => ({ hinhThuc, soTien }))

    if (paymentList.length === 0) {
      alert('Vui lòng nhập ít nhất 1 khoản thanh toán')
      return
    }
    onConfirm({ giamGia, payments: paymentList })
  }

  return (
    <div style={S.overlay} onClick={onCancel}>
      <div style={S.modal} onClick={e => e.stopPropagation()}>
        <div style={S.title}>💰 Thanh Toán</div>
        <div style={S.subtitle}>Có thể chọn nhiều hình thức trong 1 đơn</div>

        <div style={S.dueRow}>
          <span style={S.dueLabel}>Tổng tiền hàng</span>
          <span style={S.dueAmount}>{formatCurrency(tongHang)}</span>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <div style={S.sectionTitle}>Giảm giá (VNĐ)</div>
          <input
            style={{ ...S.amountInput, textAlign: 'left', width: '100%', boxSizing: 'border-box' }}
            placeholder="0đ"
            value={giamGia > 0 ? formatCurrency(giamGia) : ''}
            onChange={e => setGiamGia(parseVND(e.target.value))}
          />
        </div>

        <div style={S.sectionTitle}>Hình thức thanh toán</div>
        <div style={S.paymentMethods}>
          {HINH_THUC_THU.map(ht => (
            <div key={ht.id} style={S.methodRow}>
              <span style={S.methodLabel}>{ht.icon} {ht.label}</span>
              <input
                style={S.amountInput}
                placeholder="0đ"
                value={amounts[ht.id] > 0 ? formatCurrency(amounts[ht.id]) : ''}
                onChange={e => updateAmount(ht.id, e.target.value)}
              />
            </div>
          ))}
        </div>

        <div style={S.remaining}>
          {remaining > 0 ? (
            <span style={{ color: LUX.danger }}>
              Còn thiếu: {formatCurrency(remaining)}
              {selectedCustomer ? ' (có thể ghi nợ)' : ' (khách lẻ phải TT đủ)'}
            </span>
          ) : totalPaid > 0 ? (
            <span style={{ color: COLORS.thu }}>
              {totalPaid > (tongHang - giamGia) ? `Thừa: ${formatCurrency(totalPaid - tongHang + giamGia)}` : 'Đủ ✓'}
            </span>
          ) : null}
        </div>

        <div style={S.btnRow}>
          <button style={{ ...S.btn, ...S.btnCancel }} onClick={onCancel}>Hủy</button>
          <button style={{ ...S.btn, ...S.btnConfirm }} onClick={handleConfirm} disabled={!canConfirm}>
            {remaining > 0 && selectedCustomer ? 'Ghi Nợ & Chốt Đơn' : 'Xác Nhận Thanh Toán'}
          </button>
        </div>
      </div>
    </div>
  )
}
