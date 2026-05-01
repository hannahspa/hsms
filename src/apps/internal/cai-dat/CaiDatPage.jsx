import { COLORS } from '../../../constants/colors'

export default function CaiDatPage({ user }) {
  const isAdmin = user.vai_tro === 'admin'
  const sections = [
    { title: 'Quản Lý Tài Chính', items: [
      { icon: '💰', label: 'Danh Mục Doanh Thu', sub: '1 nhóm • 4 hạng mục',    admin: false },
      { icon: '📋', label: 'Danh Mục Chi Phí',   sub: '6 nhóm • 37 hạng mục',   admin: false },
      { icon: '💳', label: 'Quản Lý Ví',          sub: 'Tiền Mặt • MB • TP Bank', admin: true  },
    ]},
    { title: 'Hệ Thống', items: [
      { icon: '🏠', label: 'Thông Tin Spa',       sub: 'Hannah Beauty & Spa',    admin: true  },
      { icon: '👥', label: 'Quản Lý Nhân Viên',   sub: '10 nhân viên',           admin: true  },
      { icon: '🔐', label: 'Đổi Mật Khẩu',        sub: 'Bảo mật tài khoản',     admin: false },
    ]},
  ]
  return (
    <div style={{ padding: '24px 16px' }}>
      <h2 style={{ fontSize: '22px', fontWeight: '800', color: COLORS.text, marginBottom: '20px' }}>Cài Đặt</h2>
      <div style={{ background: COLORS.grad, borderRadius: '20px', padding: '20px', marginBottom: '20px', boxShadow: '0 4px 24px rgba(139,94,60,0.25)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: 'rgba(255,255,255,0.2)', border: '2px solid rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>
            {user.vai_tro === 'admin' ? '👑' : user.vai_tro === 'le_tan' ? '💁' : '💆'}
          </div>
          <div>
            <div style={{ color: '#FFF8F0', fontWeight: '700', fontSize: '16px' }}>{user.ten}</div>
            <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: '12px', marginTop: '2px' }}>
              {user.vai_tro === 'admin' ? '👑 Quản Trị Viên' : user.vai_tro === 'le_tan' ? '💁 Lễ Tân' : '💆 Kỹ Thuật Viên'}
            </div>
          </div>
        </div>
      </div>
      {sections.map(section => (
        <div key={section.title} style={{ marginBottom: '20px' }}>
          <div style={{ fontSize: '11px', letterSpacing: '1px', color: COLORS.textMute, textTransform: 'uppercase', fontWeight: '600', marginBottom: '10px', paddingLeft: '4px' }}>{section.title}</div>
          <div style={{ background: COLORS.card, borderRadius: '18px', boxShadow: COLORS.shadow, border: `1px solid ${COLORS.border}`, overflow: 'hidden' }}>
            {section.items.map((item, i) => {
              const locked = item.admin && !isAdmin
              return (
                <div key={item.label}>
                  <button style={{ display: 'flex', alignItems: 'center', gap: '14px', width: '100%', padding: '15px 18px', background: 'none', border: 'none', cursor: locked ? 'not-allowed' : 'pointer', opacity: locked ? 0.4 : 1, transition: 'background 0.15s' }}
                    onMouseEnter={e => { if (!locked) e.currentTarget.style.background = COLORS.bg }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'none' }}
                  >
                    <div style={{ width: '40px', height: '40px', borderRadius: '11px', background: 'linear-gradient(135deg,#F9F0E8,#F0DDD0)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>{item.icon}</div>
                    <div style={{ flex: 1, textAlign: 'left' }}>
                      <div style={{ fontWeight: '600', fontSize: '14px', color: COLORS.text }}>{item.label}</div>
                      <div style={{ fontSize: '11px', color: COLORS.textMute, marginTop: '1px' }}>{item.sub}</div>
                    </div>
                    <div style={{ color: locked ? '#D0C0B0' : COLORS.gold, fontSize: '18px' }}>{locked ? '🔒' : '›'}</div>
                  </button>
                  {i < section.items.length-1 && <div style={{ height: '1px', background: 'linear-gradient(90deg,transparent,rgba(160,113,79,0.1),transparent)', margin: '0 18px' }} />}
                </div>
              )
            })}
          </div>
        </div>
      ))}
      <div style={{ textAlign: 'center', padding: '16px 0 100px', color: COLORS.textMute, fontSize: '11px' }}>
        <div style={{ marginBottom: '4px' }}>🌸 Hannah Spa Management System</div>
        <div>v1.0.0 — Phase 2</div>
      </div>
    </div>
  )
}
