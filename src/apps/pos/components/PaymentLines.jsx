import { formatCurrency } from '../../../lib/utils'
import { C, FONT } from '../../../constants/colors'
import { parseVND, fmtInput, paymentDisplayLabel } from '../posShared'

export default function PaymentLines({
  payLines,
  paymentOptions,
  total,
  debt,
  hasCustomer,
  prepaidBalance = 0,
  prepaidUsed = 0,
  onAddLine,
  onRemoveLine,
  onUpdateLine,
}) {
  const prepaidOver = prepaidUsed > prepaidBalance
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', gap: 6, marginBottom: 5, paddingLeft: 26 }}>
        <div style={{ flex: 5, fontSize: 9, fontWeight: 700, color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: '.05em' }}>Thanh toán</div>
        <div style={{ flex: 4, fontSize: 9, fontWeight: 700, color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: '.05em' }}>Còn</div>
        <div style={{ flex: 7, fontSize: 9, fontWeight: 700, color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: '.05em' }}>PTTT</div>
      </div>

      {payLines.map((line, idx) => {
        const prevPaid = payLines.slice(0, idx).reduce((sum, row) => sum + row.soTien, 0)
        const remaining = Math.max(0, total - prevPaid - line.soTien)

        return (
          <div key={line._id} style={{ display: 'flex', gap: 6, marginBottom: 6, alignItems: 'center' }}>
            {idx === 0 ? (
              <button onClick={onAddLine} style={{ width: 22, height: 32, border: 'none', borderRadius: 4, background: C.thu, color: '#fff', cursor: 'pointer', fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, lineHeight: 1 }}>+</button>
            ) : (
              <button onClick={() => onRemoveLine(line._id)} style={{ width: 22, height: 32, border: 'none', background: 'none', color: C.chi, cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, padding: 0 }}>x</button>
            )}

            <input
              value={fmtInput(line.soTien)}
              onChange={e => onUpdateLine(line._id, 'soTien', parseVND(e.target.value))}
              placeholder="0"
              style={{ flex: 5, border: '1.5px solid var(--bord)', borderRadius: 6, padding: '5px 6px', fontSize: 12, fontWeight: 700, textAlign: 'right', outline: 'none', background: '#fff', minWidth: 0 }}
            />

            <input readOnly value={remaining > 0 ? fmtInput(remaining) : '0'}
              style={{ flex: 4, border: `1px solid ${C.line}`, borderRadius: 6, padding: '5px 5px', fontSize: 11, textAlign: 'right', background: C.bg, color: remaining > 0 ? C.chi : C.thu, cursor: 'default', minWidth: 0 }}
            />

            <select
              value={line.hinhThuc}
              onChange={e => onUpdateLine(line._id, 'hinhThuc', e.target.value)}
              style={{
                flex: 7,
                border: `1.5px solid ${!line.hinhThuc ? '#C0392B' : 'var(--bord)'}`,
                borderRadius: 6,
                padding: '5px 8px',
                fontSize: 11.5,
                outline: 'none',
                background: '#fff',
                color: line.hinhThuc ? 'var(--ink)' : 'var(--ink3)',
                cursor: 'pointer',
                minWidth: 0,
                height: 32,
                fontFamily: 'var(--sans)',
                appearance: 'auto',
              }}
            >
              <option value="">-- Chọn PTTT --</option>
              {paymentOptions.map(p => <option key={p.id} value={p.id}>{paymentDisplayLabel(p)}</option>)}
            </select>
          </div>
        )
      })}

      {/* Cảnh báo dùng thẻ trả trước vượt số dư */}
      {payLines.some(l => l.hinhThuc === 'the_tra_truoc') && (
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 8px', borderRadius: 6, marginBottom: 6, fontSize: 11.5,
          background: prepaidOver ? 'rgba(192,57,43,.07)' : 'rgba(201,169,110,.10)',
          border: `1px solid ${prepaidOver ? 'rgba(192,57,43,.3)' : 'rgba(201,169,110,.35)'}` }}>
          <span style={{ color: prepaidOver ? C.chi : '#8a6a35', fontWeight: 700 }}>
            {prepaidOver ? '⚠ Vượt số dư trả trước' : '👛 Dùng ví trả trước'}
          </span>
          <span style={{ fontWeight: 800, color: prepaidOver ? C.chi : '#8a6a35', fontFamily: FONT.serif }}>
            {formatCurrency(prepaidUsed)} / {formatCurrency(prepaidBalance)}
          </span>
        </div>
      )}

      {debt > 0 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 8px', borderRadius: 6, background: 'rgba(192,57,43,.06)', border: '1px solid rgba(192,57,43,.2)', fontSize: 12 }}>
          <span style={{ color: C.ink3 }}>{hasCustomer ? 'Ghi nợ KH' : 'Còn thiếu ⚠'}</span>
          <span style={{ fontWeight: 700, color: C.chi, fontFamily: FONT.serif }}>{formatCurrency(debt)}</span>
        </div>
      )}
    </div>
  )
}
