import { formatCurrency } from '../../../lib/utils'
import { C, FONT } from '../../../constants/colors'
import RightPanel from '../../../components/shared/RightPanel'
import { parseVND, fmtInput } from '../posShared'

const NAP_METHODS = [
  { id: 'tien_mat', label: '💵 Tiền Mặt' },
  { id: 'chuyen_khoan', label: '🏦 Chuyển Khoản' },
  { id: 'quet_the', label: '💳 Quẹt Thẻ' },
]

export default function NapTraTruocModal({
  open,
  customer,
  currentBalance = 0,
  amount,
  method,
  ghiChu,
  loading,
  onAmountChange,
  onMethodChange,
  onGhiChuChange,
  onNap,
  onClose,
}) {
  if (!open) return null

  const amountValue = parseVND(amount)
  const newBalance = currentBalance + amountValue

  return (
    <RightPanel open onClose={loading ? () => {} : onClose} zIndex={9999}
      title="Nạp Ví Trả Trước"
      subtitle={`${customer?.ho_ten || ''}${customer?.so_dien_thoai ? ` · ${customer.so_dien_thoai}` : ''}`}
      footer={
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onClose} disabled={loading}
            style={{ flex: 1, padding: '10px 0', border: `1px solid ${C.line}`, borderRadius: 8, background: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: FONT.sans, color: C.ink2 }}>
            Huỷ
          </button>
          <button onClick={onNap} disabled={!amountValue || loading}
            style={{ flex: 2, padding: '10px 0', border: 'none', borderRadius: 8,
              background: !amountValue || loading ? 'rgba(0,0,0,.1)' : 'linear-gradient(135deg,#C9A96E 0%,#A0714F 100%)',
              color: !amountValue || loading ? C.ink3 : '#fff', cursor: !amountValue || loading ? 'not-allowed' : 'pointer',
              fontSize: 14, fontWeight: 800, fontFamily: FONT.sans, transition: 'all .15s' }}>
            {loading ? 'Đang nạp...' : `Nạp ${amountValue ? formatCurrency(amountValue) : '...'}`}
          </button>
        </div>
      }>
        <div style={{ background: 'rgba(201,169,110,.07)', border: '1px solid rgba(201,169,110,.3)', borderRadius: 8, padding: '8px 12px', marginBottom: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: C.ink2 }}>Số dư hiện tại</span>
          <span style={{ fontSize: 16, fontWeight: 800, fontFamily: FONT.serif, color: '#8a6a35' }}>{formatCurrency(currentBalance)}</span>
        </div>

        <label style={{ fontSize: 12, fontWeight: 700, color: C.ink2, display: 'block', marginBottom: 5 }}>Số tiền nạp</label>
        <input
          value={amountValue ? fmtInput(amountValue) : ''}
          onChange={e => onAmountChange(String(parseVND(e.target.value)))}
          placeholder="Nhập số tiền..."
          disabled={loading}
          autoFocus
          style={{ width: '100%', boxSizing: 'border-box', marginBottom: 12, border: '1.5px solid var(--bord)', borderRadius: 8, padding: '9px 12px', fontSize: 16, fontFamily: FONT.sans, outline: 'none' }}
        />

        <label style={{ fontSize: 12, fontWeight: 700, color: C.ink2, display: 'block', marginBottom: 6 }}>Hình thức nạp (tiền vào ví)</label>
        <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
          {NAP_METHODS.map(p => (
            <button key={p.id} onClick={() => onMethodChange(p.id)} disabled={loading}
              style={{ flex: 1, padding: '7px 4px', cursor: 'pointer', fontFamily: FONT.sans,
                border: `1.5px solid ${method === p.id ? C.champagne : C.line}`, borderRadius: 8,
                fontSize: 11, fontWeight: method === p.id ? 700 : 400,
                background: method === p.id ? 'rgba(201,169,110,.12)' : '#fff',
                color: method === p.id ? C.champagne : C.ink2, transition: 'all .15s' }}>
              {p.label}
            </button>
          ))}
        </div>

        <label style={{ fontSize: 12, fontWeight: 700, color: C.ink2, display: 'block', marginBottom: 5 }}>Ghi chú (tuỳ chọn)</label>
        <input
          value={ghiChu || ''}
          onChange={e => onGhiChuChange(e.target.value)}
          placeholder="VD: nạp gói khuyến mãi..."
          disabled={loading}
          style={{ width: '100%', boxSizing: 'border-box', marginBottom: 14, border: '1.5px solid var(--bord)', borderRadius: 8, padding: '9px 12px', fontSize: 13, fontFamily: FONT.sans, outline: 'none' }}
        />

        {amountValue > 0 && (
          <div style={{ background: 'rgba(45,122,79,.06)', border: '1px solid rgba(45,122,79,.22)', borderRadius: 8, padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: C.ink2 }}>Số dư sau khi nạp</span>
            <span style={{ fontSize: 16, fontWeight: 800, fontFamily: FONT.serif, color: C.thu }}>{formatCurrency(newBalance)}</span>
          </div>
        )}
    </RightPanel>
  )
}
