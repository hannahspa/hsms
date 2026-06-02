import { formatCurrency, formatDateInput } from '../../../../lib/utils'
import I from '../../../../components/shared/Icons'

const QUICK_AMOUNTS = [80000, 350000, 500000, 1000000, 1500000, 2000000, 3000000, 5000000]
const PAYMENT_SOURCES = [
  { id: 'tien_mat', label: '💵 Tiền Mặt' },
  { id: 'chuyen_khoan', label: '🏦 CK' },
  { id: 'quet_the', label: '💳 Quẹt Thẻ' },
]

export default function ExpenseEntryForm({
  ngay,
  today,
  soTien,
  setSoTien,
  nhomList,
  nhomId,
  setNhomId,
  hangMucId,
  setHangMucId,
  hmCuaNhom,
  nguonChi,
  setNguonChi,
  dienGiai,
  setDienGiai,
  saving,
  onOpenDate,
  onSave,
}) {
  const amount = parseInt(String(soTien).replace(/\D/g, ''), 10) || 0

  return (
    <div className="card">
      <div className="card-h">
        <div className="card-t">
          <div className="arch-i"><I.Receipt style={{ width: 13, height: 13, color: '#8a6a52' }} /></div>
          <h3>Nhập Chi Phí</h3>
        </div>
      </div>

      <div className="card-b">
        <div style={{ background: 'var(--bg2)', borderRadius: 14, padding: 20, textAlign: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: 10.5, color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: '.14em', fontWeight: 600, marginBottom: 10 }}>Số Tiền Chi</div>
          <input
            type="text"
            inputMode="numeric"
            placeholder="0"
            value={amount ? amount.toLocaleString('vi-VN') : ''}
            onChange={event => setSoTien(event.target.value.replace(/\D/g, ''))}
            style={{ width: '100%', border: 'none', outline: 'none', fontSize: 34, fontWeight: 700, textAlign: 'center', background: 'transparent', color: soTien ? '#C0392B' : 'var(--line2)', fontFamily: 'var(--serif)' }}
            autoFocus
          />
          {soTien && <div style={{ fontSize: 14, color: '#C0392B', fontWeight: 600, marginTop: 4 }}>{formatCurrency(amount)}</div>}
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}>
          <button onClick={onOpenDate} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 10, border: '1px solid var(--line)', background: 'var(--surface2)', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: 'var(--ink)', fontFamily: 'var(--sans)' }}>
            <I.Calendar style={{ width: 13, height: 13, color: 'var(--espresso)' }} />
            {ngay === today ? 'Hôm nay' : formatDateInput(ngay)}
            <span style={{ fontSize: 10, color: 'var(--ink3)' }}>— đổi ngày</span>
          </button>
        </div>

        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16, justifyContent: 'center' }}>
          {QUICK_AMOUNTS.map(value => (
            <button key={value} onClick={() => setSoTien(String(value))} style={{
              padding: '6px 14px', borderRadius: 8,
              border: soTien === String(value) ? '2px solid #C0392B' : '1px solid var(--line)',
              background: soTien === String(value) ? '#FEF2F2' : 'var(--surface2)',
              color: soTien === String(value) ? '#C0392B' : 'var(--ink2)',
              cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: 'var(--sans)',
            }}>
              {value >= 1000000 ? (value / 1000000).toFixed(1) + 'M' : value >= 1000 ? (value / 1000).toFixed(0) + 'K' : value}
            </button>
          ))}
        </div>

        <ChoiceGroup label="Nhóm Chi">
          {nhomList.map(group => (
            <button key={group.id} onClick={() => { setNhomId(group.id); setHangMucId(null) }} style={{
              padding: '8px 14px', borderRadius: 8,
              border: nhomId === group.id ? '2px solid #C0392B' : '1px solid var(--line)',
              background: nhomId === group.id ? '#FEF2F2' : 'var(--surface2)',
              cursor: 'pointer', fontSize: 12, fontWeight: 600,
              color: nhomId === group.id ? '#C0392B' : 'var(--ink2)',
            }}>
              {group.icon} {group.ten}
            </button>
          ))}
        </ChoiceGroup>

        {nhomId && (
          <ChoiceGroup label="Hạng Mục">
            {hmCuaNhom.map(item => (
              <button key={item.id} onClick={() => setHangMucId(item.id)} style={{
                padding: '8px 14px', borderRadius: 8,
                border: hangMucId === item.id ? '2px solid #C0392B' : '1px solid var(--line)',
                background: hangMucId === item.id ? '#FEF2F2' : 'var(--surface2)',
                cursor: 'pointer', fontSize: 12, fontWeight: 600,
                color: hangMucId === item.id ? '#C0392B' : 'var(--ink2)',
              }}>
                {item.icon} {item.ten}
              </button>
            ))}
          </ChoiceGroup>
        )}

        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 10.5, color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: '.1em', fontWeight: 600, marginBottom: 8 }}>Nguồn Tiền Chi</div>
          <div style={{ display: 'flex', gap: 8 }}>
            {PAYMENT_SOURCES.map(source => (
              <button key={source.id} onClick={() => setNguonChi(source.id)} style={{
                flex: 1, padding: '10px', borderRadius: 8,
                border: nguonChi === source.id ? '2px solid #C0392B' : '1px solid var(--line)',
                background: nguonChi === source.id ? '#FEF2F2' : 'var(--surface2)',
                cursor: 'pointer', fontSize: 11, fontWeight: 600,
                color: nguonChi === source.id ? '#C0392B' : 'var(--ink2)',
              }}>
                {source.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--bg2)', borderRadius: 12, padding: '10px 14px', marginBottom: 16 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: '#FDF4FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><I.Edit style={{ width: 16, height: 16, color: '#C0392B' }} /></div>
          <input placeholder="Diễn giải (bắt buộc) *" value={dienGiai} onChange={event => setDienGiai(event.target.value)} style={{ flex: 1, border: 'none', outline: 'none', fontSize: 13.5, color: 'var(--ink)', background: 'transparent', fontFamily: 'var(--sans)' }} />
        </div>

        <button onClick={onSave} disabled={saving} style={{ width: '100%', padding: 15, borderRadius: 'var(--r)', border: 'none', color: '#f8efe1', fontSize: 15, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', background: saving ? 'var(--ink3)' : 'linear-gradient(135deg,#d4a574,#8a6a52)', boxShadow: saving ? 'none' : '0 10px 22px rgba(138,106,82,.22)', fontFamily: 'var(--sans)' }}>
          {saving ? '⏳ Đang lưu...' : '💾 Lưu Chi Phí'}
        </button>
      </div>
    </div>
  )
}

function ChoiceGroup({ label, children }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 10.5, color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: '.1em', fontWeight: 600, marginBottom: 8 }}>{label}</div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>{children}</div>
    </div>
  )
}
