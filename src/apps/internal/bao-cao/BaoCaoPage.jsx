import { COLORS } from '../../../constants/colors'
import { useClock } from '../../../hooks/useClock'

export default function BaoCaoPage() {
  const { date } = useClock()
  return (
    <div style={{ padding: '24px 16px' }}>
      <h2 style={{ fontSize: '22px', fontWeight: '800', color: COLORS.text, marginBottom: '16px' }}>Báo Cáo</h2>

      <div style={{ display: 'flex', background: 'rgba(160,113,79,0.08)', borderRadius: '14px', padding: '4px', marginBottom: '16px', gap: '4px' }}>
        {['Theo Ngày','Khoảng Ngày','Theo Tháng'].map((t,i) => (
          <button key={t} style={{ flex: 1, padding: '9px 4px', borderRadius: '10px', border: 'none', background: i===0 ? COLORS.grad : 'transparent', color: i===0 ? 'white' : COLORS.textSub, fontWeight: i===0 ? '700' : '400', fontSize: '12px', cursor: 'pointer' }}>{t}</button>
        ))}
      </div>

      <div style={{ background: COLORS.card, borderRadius: '18px', padding: '14px 20px', marginBottom: '14px', boxShadow: COLORS.shadow, border: `1px solid ${COLORS.border}` }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button style={{ width: '32px', height: '32px', borderRadius: '50%', border: `1px solid ${COLORS.border}`, background: 'none', cursor: 'pointer', color: COLORS.textSub, fontSize: '16px' }}>‹</button>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontWeight: '700', color: COLORS.text, fontSize: '15px' }}>Hôm nay</div>
            <div style={{ fontSize: '11px', color: COLORS.textMute }}>{date}</div>
          </div>
          <button style={{ width: '32px', height: '32px', borderRadius: '50%', border: `1px solid ${COLORS.border}`, background: 'none', cursor: 'pointer', color: COLORS.textSub, fontSize: '16px' }}>›</button>
        </div>
      </div>

      <div style={{ background: COLORS.card, borderRadius: '18px', padding: '18px 20px', marginBottom: '12px', boxShadow: COLORS.shadow, border: `1px solid ${COLORS.border}` }}>
        <div style={{ fontSize: '11px', letterSpacing: '1px', color: COLORS.textMute, textTransform: 'uppercase', fontWeight: '600', marginBottom: '12px' }}>💰 Doanh Thu</div>
        {[{ icon: '💵', label: 'Tiền Mặt' },{ icon: '🏦', label: 'Chuyển Khoản MB' },{ icon: '💳', label: 'Quẹt Thẻ TP' },{ icon: '🎫', label: 'Thẻ Trả Trước' }].map((dm,i,arr) => (
          <div key={dm.label}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '18px' }}>{dm.icon}</span>
                <span style={{ fontSize: '14px', color: COLORS.text }}>{dm.label}</span>
              </div>
              <span style={{ fontWeight: '600', color: COLORS.thu, fontSize: '14px' }}>0đ</span>
            </div>
            {i < arr.length-1 && <div style={{ height: '1px', background: 'linear-gradient(90deg,transparent,rgba(160,113,79,0.1),transparent)' }} />}
          </div>
        ))}
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0 0', borderTop: `2px solid rgba(160,113,79,0.1)`, marginTop: '4px' }}>
          <span style={{ fontWeight: '700', fontSize: '14px', color: COLORS.text }}>Tổng Doanh Thu</span>
          <span style={{ fontWeight: '800', fontSize: '16px', color: COLORS.thu }}>0đ</span>
        </div>
      </div>

      <div style={{ background: COLORS.card, borderRadius: '18px', padding: '18px 20px', marginBottom: '12px', boxShadow: COLORS.shadow, border: `1px solid ${COLORS.border}` }}>
        <div style={{ fontSize: '11px', letterSpacing: '1px', color: COLORS.textMute, textTransform: 'uppercase', fontWeight: '600', marginBottom: '12px' }}>📋 Chi Phí Chi Tiết</div>
        <div style={{ textAlign: 'center', padding: '16px 0', color: COLORS.textMute, fontSize: '13px' }}>Chưa có chi phí trong ngày này</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0 0', borderTop: `2px solid rgba(160,113,79,0.1)`, marginTop: '4px' }}>
          <span style={{ fontWeight: '700', fontSize: '14px', color: COLORS.text }}>Tổng Chi Phí</span>
          <span style={{ fontWeight: '800', fontSize: '16px', color: COLORS.chi }}>0đ</span>
        </div>
      </div>

      <div style={{ background: COLORS.grad, borderRadius: '18px', padding: '20px', marginBottom: '100px', boxShadow: '0 4px 24px rgba(139,94,60,0.25)' }}>
        {[{ label: 'Tổng Doanh Thu', value: '0đ', color: '#86EFAC' },{ label: 'Tổng Chi Phí', value: '0đ', color: '#FCA5A5' },{ label: 'Lợi Nhuận', value: '0đ', color: '#FDE68A' }].map((row,i) => (
          <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: i<2 ? '1px solid rgba(255,255,255,0.15)' : 'none' }}>
            <span style={{ color: 'rgba(255,255,255,0.75)', fontSize: '13px' }}>{row.label}</span>
            <span style={{ color: row.color, fontWeight: '700', fontSize: '15px' }}>{row.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
