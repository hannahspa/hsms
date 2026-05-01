import { COLORS } from '../../../constants/colors'

export default function NhapLieuPage({ onOpenForm }) {
  return (
    <div style={{ padding: '24px 16px' }}>
      <div style={{ marginBottom: '22px' }}>
        <h2 style={{ fontSize: '22px', fontWeight: '800', color: COLORS.text, marginBottom: '4px' }}>Nhập Liệu</h2>
        <p style={{ fontSize: '13px', color: COLORS.textMute }}>Chọn loại giao dịch để nhập</p>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '100px' }}>
        {[
          { icon: '💰', label: 'Nhập Doanh Thu',        sub: 'Tiền mặt • Chuyển khoản • Quẹt thẻ • Thẻ trả trước', bg: 'linear-gradient(135deg,#F0FDF4,#DCFCE7)', action: 'thu' },
          { icon: '📋', label: 'Nhập Chi Phí',           sub: '37 danh mục • 6 nhóm chi phí',                        bg: 'linear-gradient(135deg,#FFF5F5,#FFE4E4)', action: 'chi' },
          { icon: '🔄', label: 'Chuyển Khoản Nội Bộ',   sub: 'Tiền Mặt → MB • TP → MB • MB → Tiền Mặt',             bg: 'linear-gradient(135deg,#EFF6FF,#DBEAFE)', action: 'ck'  },
        ].map(item => (
          <button key={item.label} onClick={() => onOpenForm(item.action)}
            style={{ display: 'flex', alignItems: 'center', gap: '16px', background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: '18px', padding: '18px 20px', width: '100%', cursor: 'pointer', textAlign: 'left', boxShadow: COLORS.shadow, transition: 'all 0.2s' }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 32px rgba(160,113,79,0.18)' }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = COLORS.shadow }}
          >
            <div style={{ width: '54px', height: '54px', borderRadius: '15px', background: item.bg, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '26px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>{item.icon}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: '700', fontSize: '15px', color: COLORS.text, marginBottom: '3px' }}>{item.label}</div>
              <div style={{ fontSize: '12px', color: COLORS.textMute }}>{item.sub}</div>
            </div>
            <div style={{ color: COLORS.gold, fontSize: '20px' }}>›</div>
          </button>
        ))}
      </div>
    </div>
  )
}
