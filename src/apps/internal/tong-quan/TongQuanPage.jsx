import { COLORS } from '../../../constants/colors'
import { formatCurrency, formatCurrencyHide } from '../../../lib/utils'

function HeaderTongQuan({ user, viList }) {
  const isAdmin = user.vai_tro === 'admin'
  const isLeTan = user.vai_tro === 'le_tan'
  const tongTS  = viList.reduce((s, v) => s + (v.so_du_dau || 0), 0)

  return (
    <div style={{ background: COLORS.grad, padding: '44px 22px 52px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: '11px' }}>Xin chào!</div>
          <div style={{ color: '#FFF8F0', fontWeight: '700', fontSize: '16px' }}>{user.ten}</div>
        </div>
        <button style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(255,255,255,0.18)', border: '1.5px solid rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', cursor: 'pointer' }}>🔔</button>
      </div>

      {isAdmin && (
        <div>
          <div style={{ textAlign: 'center', marginBottom: '16px' }}>
            <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '11px', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '4px' }}>Tổng Tài Sản</div>
            <div style={{ color: '#FFFBF5', fontSize: '32px', fontWeight: '800', letterSpacing: '-1px' }}>{formatCurrency(tongTS)}</div>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            {[{ label: 'Doanh Thu', value: formatCurrency(0), color: '#86EFAC' }, { label: 'Chi Phí', value: formatCurrency(0), color: '#FCA5A5' }].map(s => (
              <div key={s.label} style={{ flex: 1, background: 'rgba(255,255,255,0.13)', borderRadius: '13px', padding: '12px', border: '1px solid rgba(255,255,255,0.2)' }}>
                <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '10px', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '4px' }}>{s.label}</div>
                <div style={{ color: s.color, fontWeight: '700', fontSize: '15px' }}>{s.value}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {isLeTan && (
        <div>
          <div style={{ textAlign: 'center', marginBottom: '16px' }}>
            <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '11px', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '4px' }}>Tổng Tài Sản</div>
            <div style={{ color: '#FFFBF5', fontSize: '32px', fontWeight: '800' }}>{formatCurrencyHide()}</div>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            {[{ label: 'Doanh Thu Hôm Nay', value: formatCurrency(0), color: '#86EFAC' }, { label: 'Chi Phí Hôm Nay', value: formatCurrency(0), color: '#FCA5A5' }].map(s => (
              <div key={s.label} style={{ flex: 1, background: 'rgba(255,255,255,0.13)', borderRadius: '13px', padding: '12px', border: '1px solid rgba(255,255,255,0.2)' }}>
                <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '10px', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '4px' }}>{s.label}</div>
                <div style={{ color: s.color, fontWeight: '700', fontSize: '15px' }}>{s.value}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!isAdmin && !isLeTan && (
        <div style={{ textAlign: 'center' }}>
          <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', fontStyle: 'italic' }}>Chào mừng đến Hannah Beauty & Spa 🌸</div>
        </div>
      )}
    </div>
  )
}

export default function TongQuanPage({ viList, user, onOpenForm }) {
  return (
    <div>
      <HeaderTongQuan user={user} viList={viList} />
      <div style={{ padding: '0 16px', marginTop: '-20px' }}>

        {/* Card Tài khoản */}
        <div style={{ background: COLORS.card, borderRadius: '22px', padding: '18px 20px', marginBottom: '14px', boxShadow: COLORS.shadow, border: `1px solid ${COLORS.border}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <span style={{ fontWeight: '700', fontSize: '15px', color: COLORS.text }}>Tài khoản</span>
            <span style={{ fontSize: '11px', padding: '3px 10px', background: 'linear-gradient(135deg,#F5EDE6,#EDD9C8)', color: COLORS.primary, borderRadius: '20px', fontWeight: '600' }}>3 ví</span>
          </div>
          {viList.map((vi, i) => (
            <div key={vi.id}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '44px', height: '44px', borderRadius: '13px', background: 'linear-gradient(135deg,#F9F0E8,#F0DDD0)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px' }}>{vi.icon}</div>
                  <div>
                    <div style={{ fontWeight: '600', fontSize: '14px', color: COLORS.text }}>{vi.ten}</div>
                    <div style={{ fontSize: '11px', color: COLORS.textMute, marginTop: '1px' }}>{vi.loai === 'tien_mat' ? 'Tiền mặt' : 'Ngân hàng'}</div>
                  </div>
                </div>
                <div style={{ fontWeight: '700', fontSize: '14px', color: user.vai_tro === 'admin' ? COLORS.thu : COLORS.textMute }}>
                  {user.vai_tro === 'admin' ? formatCurrency(vi.so_du_dau) : formatCurrencyHide()}
                </div>
              </div>
              {i < viList.length-1 && <div style={{ height: '1px', background: 'linear-gradient(90deg,transparent,rgba(160,113,79,0.1),transparent)' }} />}
            </div>
          ))}
        </div>

        {/* Thao tác nhanh */}
        <div style={{ background: COLORS.card, borderRadius: '22px', padding: '18px 20px', marginBottom: '14px', boxShadow: COLORS.shadow, border: `1px solid ${COLORS.border}` }}>
          <div style={{ fontWeight: '700', fontSize: '15px', color: COLORS.text, marginBottom: '16px' }}>Thao tác nhanh</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '8px' }}>
            {[
              { icon: '💰', label: 'Doanh Thu',  bg: 'linear-gradient(135deg,#F0FDF4,#DCFCE7)', action: 'thu' },
              { icon: '💸', label: 'Chi Phí',    bg: 'linear-gradient(135deg,#FFF5F5,#FFE4E4)', action: 'chi' },
              { icon: '🔄', label: 'Chuyển Khoản', bg: 'linear-gradient(135deg,#EFF6FF,#DBEAFE)', action: 'ck' },
              { icon: '📊', label: 'Báo cáo',    bg: 'linear-gradient(135deg,#FDF4FF,#FAE8FF)', action: 'bc'  },
            ].map(item => (
              <button key={item.label} onClick={() => onOpenForm(item.action)}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '7px', background: 'none', border: 'none', cursor: 'pointer', transition: 'transform 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.08)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                onMouseDown={e => e.currentTarget.style.transform = 'scale(0.93)'}
                onMouseUp={e => e.currentTarget.style.transform = 'scale(1.08)'}
              >
                <div style={{ width: '52px', height: '52px', borderRadius: '16px', background: item.bg, fontSize: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>{item.icon}</div>
                <span style={{ fontSize: '10px', color: COLORS.textSub, textAlign: 'center', lineHeight: '1.3', fontWeight: '500' }}>{item.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Giao dịch gần đây */}
        <div style={{ background: COLORS.card, borderRadius: '22px', padding: '18px 20px', marginBottom: '100px', boxShadow: COLORS.shadow, border: `1px solid ${COLORS.border}` }}>
          <div style={{ fontWeight: '700', fontSize: '15px', color: COLORS.text, marginBottom: '16px' }}>Giao Dịch Gần Đây</div>
          <div style={{ textAlign: 'center', padding: '28px 0', color: COLORS.textMute }}>
            <div style={{ fontSize: '38px', marginBottom: '10px' }}>📋</div>
            <div style={{ fontSize: '13px', fontWeight: '600', color: COLORS.textSub }}>Chưa có giao dịch nào</div>
            <div style={{ fontSize: '11px', marginTop: '4px' }}>Nhấn + để thêm giao dịch đầu tiên</div>
          </div>
        </div>
      </div>
    </div>
  )
}
