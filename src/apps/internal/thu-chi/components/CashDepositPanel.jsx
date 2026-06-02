import { formatCurrency, formatDateInput } from '../../../../lib/utils'
import I from '../../../../components/shared/Icons'

export default function CashDepositPanel({ ngay, loading, data, saving, onDeposit }) {
  return (
    <div className="card">
      <div className="card-h">
        <div className="card-t">
          <div className="arch-i"><I.Wallet style={{ width: 13, height: 13, color: '#8a6a52' }} /></div>
          <h3>Nộp Tiền Mặt → MB Bank</h3>
          <span className="sub">{formatDateInput(ngay)}</span>
        </div>
      </div>

      <div className="card-b">
        {loading ? (
          <div style={{ textAlign: 'center', padding: 30, color: 'var(--ink3)' }}>Đang tính toán...</div>
        ) : data ? (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <AmountCard
                label="Thu Tiền Mặt"
                value={data.thuTm}
                background="#e8f1de"
                border="#6e8a5e20"
                color="#426a2c"
              />
              <AmountCard
                label="Chi Tiền Mặt"
                value={data.chiTm}
                background="#fae0d8"
                border="#b85a4a20"
                color="#843a23"
              />
            </div>

            {data.amHomTrc > 0 && (
              <div style={{ background: '#FFF9F0', borderRadius: 10, padding: '10px 14px', marginBottom: 14, border: '1px solid #F0C080', fontSize: 12, color: '#8B6914', textAlign: 'center' }}>
                🔻 Bù âm ngày {formatDateInput(data.prev)}: <b>{formatCurrency(data.amHomTrc)}</b>
              </div>
            )}

            <div style={{ background: data.phaiNop > 0 ? 'linear-gradient(135deg,#1a4f70,#0d3b5a)' : 'var(--bg2)', borderRadius: 14, padding: 20, textAlign: 'center', marginBottom: 16, color: data.phaiNop > 0 ? '#fff' : 'var(--ink3)' }}>
              <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.14em', fontWeight: 600, opacity: .7 }}>Cần Nộp Hôm Nay</div>
              <div style={{ fontFamily: 'var(--serif)', fontSize: 32, fontWeight: 700, marginTop: 4 }}>
                {data.phaiNop > 0 ? formatCurrency(data.phaiNop) : '0đ — Không cần nộp'}
              </div>
            </div>

            {data.daNop > 0 && (
              <div style={{ background: '#e8f1de', borderRadius: 10, padding: '10px 14px', marginBottom: 14, textAlign: 'center', fontSize: 12, fontWeight: 600, color: '#426a2c' }}>
                ✓ Đã nộp {formatCurrency(data.daNop)} — {data.daNop < data.phaiNop ? <>Còn thiếu <b>{formatCurrency(data.phaiNop - data.daNop)}</b></> : 'Đã nộp đủ'}
              </div>
            )}

            {data.phaiNop > 0 && data.daNop < data.phaiNop && (
              <button onClick={onDeposit} disabled={saving} style={{ width: '100%', padding: 15, borderRadius: 'var(--r)', border: 'none', color: '#f8efe1', fontSize: 15, fontWeight: 700, cursor: 'pointer', background: 'linear-gradient(135deg,#d4a574,#8a6a52)', boxShadow: '0 10px 22px rgba(138,106,82,.22)', fontFamily: 'var(--sans)' }}>
                {saving ? '⏳ Đang lưu...' : `🏦 Xác Nhận Đã Nộp ${formatCurrency(data.phaiNop - data.daNop)}`}
              </button>
            )}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: 20, color: 'var(--ink3)' }}>Không có dữ liệu</div>
        )}
      </div>
    </div>
  )
}

function AmountCard({ label, value, background, border, color }) {
  return (
    <div style={{ background, borderRadius: 12, padding: 14, textAlign: 'center', border: `1px solid ${border}` }}>
      <div style={{ fontSize: 10, color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: '.1em', fontWeight: 600 }}>{label}</div>
      <div style={{ fontFamily: 'var(--serif)', fontSize: 24, fontWeight: 700, color, marginTop: 4 }}>{formatCurrency(value)}</div>
    </div>
  )
}
