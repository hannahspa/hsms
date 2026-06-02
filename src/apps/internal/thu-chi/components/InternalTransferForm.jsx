import { formatCurrency, formatDateInput } from '../../../../lib/utils'
import I from '../../../../components/shared/Icons'

const QUICK_AMOUNTS = [80000, 350000, 500000, 1000000, 1500000, 2000000, 3000000, 5000000]

export default function InternalTransferForm({
  ngay,
  today,
  soTien,
  setSoTien,
  ckTu,
  setCkTu,
  ckDen,
  setCkDen,
  dienGiai,
  setDienGiai,
  saving,
  onOpenDate,
  onSave,
}) {
  return (
    <div className="card">
      <div className="card-h">
        <div className="card-t">
          <div className="arch-i"><I.Bank style={{ width: 13, height: 13, color: '#8a6a52' }} /></div>
          <h3>Chuyển Khoản Nội Bộ</h3>
        </div>
      </div>

      <div className="card-b">
        <MoneyBox soTien={soTien} setSoTien={setSoTien} />

        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}>
          <button onClick={onOpenDate} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 10, border: '1px solid var(--line)', background: 'var(--surface2)', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: 'var(--ink)', fontFamily: 'var(--sans)' }}>
            <I.Calendar style={{ width: 13, height: 13, color: 'var(--espresso)' }} />
            {ngay === today ? 'Hôm nay' : formatDateInput(ngay)}
            <span style={{ fontSize: 10, color: 'var(--ink3)' }}>— đổi ngày</span>
          </button>
        </div>

        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16, justifyContent: 'center' }}>
          {QUICK_AMOUNTS.map(amount => (
            <button key={amount} onClick={() => setSoTien(String(amount))} style={{
              padding: '6px 14px', borderRadius: 8,
              border: soTien === String(amount) ? '2px solid #6C3483' : '1px solid var(--line)',
              background: soTien === String(amount) ? '#F5F3FF' : 'var(--surface2)',
              color: soTien === String(amount) ? '#6C3483' : 'var(--ink2)',
              cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: 'var(--sans)',
            }}>
              {amount >= 1000000 ? (amount / 1000000).toFixed(1) + 'M' : amount >= 1000 ? (amount / 1000).toFixed(0) + 'K' : amount}
            </button>
          ))}
        </div>

        <div style={{ background: 'var(--bg2)', borderRadius: 14, padding: 16, marginBottom: 16 }}>
          <TransferDirection
            label="Từ:"
            options={[
              { id: 'tien_mat', label: '💵 Tiền Mặt' },
              { id: 'quet_the', label: '💳 TP Bank' },
              { id: 'chuyen_khoan', label: '🏦 MB Bank' },
            ]}
            value={ckTu}
            onSelect={(value) => {
              setCkTu(value)
              setCkDen(value === 'chuyen_khoan' ? 'tien_mat' : 'chuyen_khoan')
            }}
          />

          <div style={{ display: 'flex', justifyContent: 'center', padding: '4px 0 8px' }}><span style={{ fontSize: 20 }}>⬇</span></div>

          <TransferDirection
            label="Đến:"
            options={[
              { id: 'tien_mat', label: '💵 Tiền Mặt' },
              { id: 'chuyen_khoan', label: '🏦 MB Bank' },
            ].filter(option => option.id !== ckTu)}
            value={ckDen}
            onSelect={setCkDen}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--bg2)', borderRadius: 12, padding: '10px 14px', marginBottom: 16 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: '#FDF4FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><I.Edit style={{ width: 16, height: 16, color: '#6C3483' }} /></div>
          <input placeholder="Ghi chú (không bắt buộc)..." value={dienGiai} onChange={event => setDienGiai(event.target.value)} style={{ flex: 1, border: 'none', outline: 'none', fontSize: 13.5, color: 'var(--ink)', background: 'transparent', fontFamily: 'var(--sans)' }} />
        </div>

        <button onClick={onSave} disabled={saving} style={{ width: '100%', padding: 15, borderRadius: 'var(--r)', border: 'none', color: '#f8efe1', fontSize: 15, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', background: saving ? 'var(--ink3)' : 'linear-gradient(135deg,#d4a574,#8a6a52)', boxShadow: saving ? 'none' : '0 10px 22px rgba(138,106,82,.22)', fontFamily: 'var(--sans)' }}>
          {saving ? '⏳ Đang lưu...' : '💾 Lưu Chuyển Khoản'}
        </button>
      </div>
    </div>
  )
}

function MoneyBox({ soTien, setSoTien }) {
  const amount = parseInt(String(soTien).replace(/\D/g, ''), 10) || 0

  return (
    <div style={{ background: 'var(--bg2)', borderRadius: 14, padding: 20, textAlign: 'center', marginBottom: 16 }}>
      <div style={{ fontSize: 10.5, color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: '.14em', fontWeight: 600, marginBottom: 10 }}>Số Tiền Chuyển</div>
      <input
        type="text"
        inputMode="numeric"
        placeholder="0"
        value={amount ? amount.toLocaleString('vi-VN') : ''}
        onChange={event => setSoTien(event.target.value.replace(/\D/g, ''))}
        style={{ width: '100%', border: 'none', outline: 'none', fontSize: 34, fontWeight: 700, textAlign: 'center', background: 'transparent', color: soTien ? '#6C3483' : 'var(--line2)', fontFamily: 'var(--serif)' }}
        autoFocus
      />
      {soTien && <div style={{ fontSize: 14, color: '#6C3483', fontWeight: 600, marginTop: 4 }}>{formatCurrency(amount)}</div>}
    </div>
  )
}

function TransferDirection({ label, options, value, onSelect }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: label === 'Từ:' ? 10 : 0 }}>
      <span style={{ fontWeight: 600, fontSize: 13, minWidth: 50 }}>{label}</span>
      {options.map(option => (
        <button key={option.id} onClick={() => onSelect(option.id)} style={{
          flex: 1, padding: '10px', borderRadius: 8,
          border: value === option.id ? '2px solid #6C3483' : '1px solid var(--line)',
          background: value === option.id ? '#F5F3FF' : 'var(--surface2)',
          cursor: 'pointer', fontSize: 11, fontWeight: 600,
          color: value === option.id ? '#6C3483' : 'var(--ink2)',
        }}>
          {option.label}
        </button>
      ))}
    </div>
  )
}
