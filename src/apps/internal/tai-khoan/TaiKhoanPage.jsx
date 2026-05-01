import { COLORS } from '../../../constants/colors'
import { formatCurrency, formatCurrencyHide } from '../../../lib/utils'

export default function TaiKhoanPage({ viList, user }) {
  const isAdmin = user.vai_tro === 'admin'
  return (
    <div style={{ padding: '24px 16px' }}>
      <h2 style={{ fontSize: '22px', fontWeight: '800', color: COLORS.text, marginBottom: '16px' }}>Tài Khoản</h2>

      <div style={{ background: COLORS.grad, borderRadius: '20px', padding: '20px 22px', marginBottom: '14px', boxShadow: '0 4px 24px rgba(139,94,60,0.25)' }}>
        <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: '11px', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '4px' }}>Tổng Tài Sản</div>
        <div style={{ color: '#FFFBF5', fontSize: '30px', fontWeight: '800' }}>
          {isAdmin ? formatCurrency(viList.reduce((s,v)=>s+(v.so_du_dau||0),0)) : formatCurrencyHide()}
        </div>
      </div>

      <div style={{ background: COLORS.card, borderRadius: '22px', padding: '18px 20px', boxShadow: COLORS.shadow, border: `1px solid ${COLORS.border}`, marginBottom: '14px' }}>
        {viList.map((vi, i) => (
          <div key={vi.id}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'linear-gradient(135deg,#F9F0E8,#F0DDD0)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>{vi.icon}</div>
                <div>
                  <div style={{ fontWeight: '600', fontSize: '15px', color: COLORS.text }}>{vi.ten}</div>
                  <div style={{ fontSize: '12px', color: COLORS.textMute, marginTop: '2px' }}>
                    {vi.loai === 'tien_mat' ? 'Tiền mặt tại quầy' : vi.ten === 'MB Bank' ? 'Tài khoản chính' : 'Quẹt thẻ • về 3-7 ngày'}
                  </div>
                </div>
              </div>
              <div style={{ fontWeight: '700', fontSize: '15px', color: isAdmin ? COLORS.thu : COLORS.textMute }}>
                {isAdmin ? formatCurrency(vi.so_du_dau) : formatCurrencyHide()}
              </div>
            </div>
            {i < viList.length-1 && <div style={{ height: '1px', background: 'linear-gradient(90deg,transparent,rgba(160,113,79,0.1),transparent)' }} />}
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
        {['Tất cả','💵 Tiền Mặt','🏦 MB Bank','💳 TP Bank'].map((f,i) => (
          <button key={f} style={{
            padding: '7px 14px', borderRadius: '20px', fontSize: '12px',
            border: i===0 ? 'none' : `1px solid rgba(160,113,79,0.2)`,
            background: i===0 ? 'linear-gradient(135deg,#C9A96E,#A0714F)' : 'white',
            color: i===0 ? 'white' : COLORS.textSub,
            fontWeight: i===0 ? '700' : '400', cursor: 'pointer'
          }}>{f}</button>
        ))}
      </div>

      <div style={{ background: COLORS.card, borderRadius: '22px', padding: '28px', textAlign: 'center', boxShadow: COLORS.shadow, border: `1px solid ${COLORS.border}`, marginBottom: '100px' }}>
        <div style={{ fontSize: '32px', marginBottom: '8px' }}>💳</div>
        <div style={{ fontSize: '13px', color: COLORS.textMute }}>Chưa có giao dịch</div>
      </div>
    </div>
  )
}
