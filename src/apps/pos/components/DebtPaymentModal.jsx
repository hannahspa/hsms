import { formatCurrency } from '../../../lib/utils'
import { C, FONT } from '../../../constants/colors'
import { parseVND, fmtInput } from '../posShared'

const DEBT_PAYMENT_METHODS = [
  { id: 'tien_mat', label: '💵 Tiền Mặt' },
  { id: 'chuyen_khoan', label: '🏦 Chuyển Khoản' },
  { id: 'quet_the', label: '💳 Quẹt Thẻ' },
]

export default function DebtPaymentModal({
  modal,
  amount,
  method,
  loading,
  onAmountChange,
  onMethodChange,
  onPay,
  onClose,
}) {
  if (!modal) return null

  const amountValue = parseVND(amount)
  const isFromCheckout = !!modal.fromCheckout

  const handleBackdropClick = (event) => {
    if (event.target === event.currentTarget && !loading) onClose()
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,.5)',
    }} onClick={handleBackdropClick}>
      <div style={{
        position: 'absolute', top: 0, right: 0, bottom: 0, width: 'calc(100vw - var(--side-w, 248px))', maxWidth: '100vw',
        background: '#fff', padding: '24px 28px', overflowY: 'auto',
        boxShadow: '-6px 0 40px rgba(0,0,0,.28)', animation: 'rpSlideIn .22s ease',
      }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 16 }}>
          <div style={{
            width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
            background: isFromCheckout ? 'rgba(230,126,34,.1)' : 'rgba(192,57,43,.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
          }}>
            {isFromCheckout ? '⚠️' : '💸'}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: 15, color: C.ink, lineHeight: 1.2 }}>
              {isFromCheckout ? 'Yêu Cầu Thanh Toán Để Tiếp Tục' : 'Thu Nợ Thẻ Liệu Trình'}
            </div>
            <div style={{ fontSize: 12, color: C.ink2, marginTop: 2 }}>
              {isFromCheckout
                ? `Thẻ "${modal.the.ten_dich_vu}" cần thanh toán thêm trước khi dùng buổi tiếp theo`
                : modal.the.ten_dich_vu
              }
            </div>
          </div>
        </div>

        <div style={{
          background: isFromCheckout ? 'rgba(230,126,34,.06)' : 'rgba(192,57,43,.06)',
          border: `1px solid ${isFromCheckout ? 'rgba(230,126,34,.25)' : 'rgba(192,57,43,.2)'}`,
          borderRadius: 8, padding: '8px 12px', marginBottom: 14,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span style={{ fontSize: 12, color: C.ink2 }}>
            {isFromCheckout ? 'Cần thanh toán tối thiểu' : 'Còn nợ'}
          </span>
          <span style={{
            fontSize: 16, fontWeight: 800, fontFamily: FONT.serif,
            color: isFromCheckout ? '#E67E22' : '#C0392B',
          }}>
            {formatCurrency(modal.the.con_no)}
          </span>
        </div>

        <label style={{ fontSize: 12, fontWeight: 700, color: C.ink2, display: 'block', marginBottom: 5 }}>
          Số tiền thu
        </label>
        <input
          value={amountValue ? fmtInput(amountValue) : ''}
          onChange={e => onAmountChange(String(parseVND(e.target.value)))}
          placeholder="Nhập số tiền..."
          disabled={loading}
          style={{
            width: '100%', boxSizing: 'border-box', marginBottom: 12,
            border: '1.5px solid var(--bord)', borderRadius: 8, padding: '9px 12px',
            fontSize: 16, fontFamily: FONT.sans, outline: 'none',
          }}
        />

        <label style={{ fontSize: 12, fontWeight: 700, color: C.ink2, display: 'block', marginBottom: 6 }}>
          Hình thức thanh toán
        </label>
        <div style={{ display: 'flex', gap: 6, marginBottom: 18 }}>
          {DEBT_PAYMENT_METHODS.map(p => (
            <button key={p.id} onClick={() => onMethodChange(p.id)} disabled={loading}
              style={{
                flex: 1, padding: '7px 4px', cursor: 'pointer', fontFamily: FONT.sans,
                border: `1.5px solid ${method === p.id ? C.champagne : C.line}`,
                borderRadius: 8, fontSize: 11, fontWeight: method === p.id ? 700 : 400,
                background: method === p.id ? 'rgba(201,169,110,.12)' : 'none',
                color: method === p.id ? C.champagne : C.ink2,
                transition: 'all .15s',
              }}>
              {p.label}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={onClose}
            disabled={loading}
            style={{
              flex: 1, padding: '10px 0', border: `1px solid ${C.line}`, borderRadius: 8,
              background: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
              fontFamily: FONT.sans, color: C.ink2,
            }}>
            Huỷ
          </button>
          <button
            onClick={onPay}
            disabled={!amountValue || loading}
            style={{
              flex: 2, padding: '10px 0', border: 'none', borderRadius: 8,
              background: !amountValue || loading
                ? 'rgba(0,0,0,.1)'
                : 'linear-gradient(135deg,#C0392B 0%,#8e2218 100%)',
              color: !amountValue || loading ? C.ink3 : '#fff',
              cursor: !amountValue || loading ? 'not-allowed' : 'pointer',
              fontSize: 14, fontWeight: 800, fontFamily: FONT.sans,
              transition: 'all .15s',
            }}>
            {loading ? 'Đang xử lý...' : `Thu ${amountValue ? formatCurrency(amountValue) : '...'}`}
          </button>
        </div>
      </div>
    </div>
  )
}
