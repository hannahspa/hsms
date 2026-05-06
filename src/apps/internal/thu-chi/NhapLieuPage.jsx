import { LUX } from '../../../constants/lux'

export default function NhapLieuPage({ onOpenForm }) {
  return (
    <div style={{ padding: '24px 16px' }}>
      <div style={{ marginBottom: '22px' }}>
        <h2 style={{ fontSize: '22px', fontWeight: '700', color: LUX.ink, marginBottom: '4px', fontFamily: LUX.fontSerif }}>Nhập Liệu</h2>
        <p style={{ fontSize: '13px', color: LUX.ink3, fontFamily: LUX.fontSans }}>Chọn loại giao dịch để nhập</p>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '100px' }}>
        {[
          { icon: '💰', label: 'Nhập Doanh Thu',        sub: 'Tiền mặt • Chuyển khoản • Quẹt thẻ • Thẻ trả trước', accent: '#2D7A4F', bg: '#F0FDF4', action: 'thu' },
          { icon: '📋', label: 'Nhập Chi Phí',           sub: '37 danh mục • 6 nhóm chi phí',                        accent: '#C0392B', bg: '#FEF2F2', action: 'chi' },
          { icon: '🔄', label: 'Chuyển Khoản Nội Bộ',   sub: 'Tiền Mặt → MB • TP → MB • MB → Tiền Mặt',             accent: '#6C3483', bg: '#F5F3FF', action: 'ck'  },
        ].map(item => (
          <button key={item.label} onClick={() => onOpenForm(item.action)}
            style={{ display: 'flex', alignItems: 'center', gap: '16px', background: LUX.surface2, border: `1px solid ${LUX.line}`, borderRadius: LUX.radius, padding: '18px 20px', width: '100%', cursor: 'pointer', textAlign: 'left', boxShadow: LUX.shadowSm, transition: 'all 0.25s ease' }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = LUX.shadow }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = LUX.shadowSm }}
          >
            <div style={{ width: '54px', height: '54px', borderRadius: '15px', background: item.bg, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '26px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>{item.icon}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: '600', fontSize: '15px', color: LUX.ink, marginBottom: '3px', fontFamily: LUX.fontSans }}>{item.label}</div>
              <div style={{ fontSize: '12px', color: LUX.ink3, fontFamily: LUX.fontSans }}>{item.sub}</div>
            </div>
            <div style={{ color: LUX.gold, fontSize: '20px' }}>›</div>
          </button>
        ))}
      </div>
    </div>
  )
}
