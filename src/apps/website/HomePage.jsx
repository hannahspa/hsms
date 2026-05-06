import { useState, useEffect } from 'react'
import { LUX } from '../../constants/lux'

const BREAKPOINT = 768

const MODULES = [
  {
    key: 'checkin',
    title: 'Check-in',
    subtitle: 'Nhân Viên',
    desc: 'Chấm công · Đăng ký OFF · Xem lương',
    icon: '📱',
    href: '/checkin',
    accent: '#7a8a6a',
    bg: '#eef2e7',
    active: true,
  },
  {
    key: 'sothuchi',
    title: 'SoThuChi',
    subtitle: 'Lễ Tân',
    desc: 'Doanh thu · Chi phí · Chuyển khoản · Báo cáo',
    icon: '💰',
    href: '/SoThuChi',
    accent: '#c8a675',
    bg: '#f5e9d4',
    active: true,
  },
  {
    key: 'admin',
    title: 'Admin',
    subtitle: 'Chủ Spa',
    desc: 'Nhân sự · Bảng lương · Duyệt OFF · Hồ sơ',
    icon: '👑',
    href: '/admin',
    accent: '#b87a6a',
    bg: '#f1e3df',
    active: true,
  },
  {
    key: 'menu',
    title: 'Menu',
    subtitle: 'Dịch Vụ',
    desc: 'Xem dịch vụ · Bảng giá · Đặt lịch',
    icon: '💆',
    href: '/menu',
    accent: '#8a6a52',
    bg: '#ece2d4',
    active: false,
  },
  {
    key: 'shop',
    title: 'Shop',
    subtitle: 'Mỹ Phẩm',
    desc: 'Sản phẩm làm đẹp · Mua online',
    icon: '🛍️',
    href: '/shop',
    accent: '#d4a574',
    bg: '#f5ede0',
    active: false,
  },
]

export default function HomePage() {
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= BREAKPOINT)
  const [hovered, setHovered] = useState(null)

  useEffect(() => {
    const onResize = () => setIsDesktop(window.innerWidth >= BREAKPOINT)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&family=Inter:wght@300;400;500;600;700&family=Dancing+Script:wght@400;500;600&display=swap');
        @keyframes portal-fade-up {
          from { opacity: 0; transform: translateY(28px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes portal-float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
        .portal-card {
          transition: all 0.35s cubic-bezier(0.22, 0.61, 0.36, 1);
          cursor: pointer;
        }
        .portal-card:hover {
          transform: translateY(-4px);
        }
        .portal-card-coming {
          cursor: default;
          opacity: 0.55;
        }
        .portal-card-coming:hover {
          transform: none;
        }
      `}</style>

      <div style={{
        minHeight: '100vh',
        background: LUX.bg,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: isDesktop ? '60px 40px' : '40px 20px',
        fontFamily: LUX.fontSans,
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Background ambient */}
        <div style={{
          position: 'absolute', top: '-200px', right: '-150px',
          width: '600px', height: '600px',
          background: 'radial-gradient(circle, rgba(212,165,116,0.12) 0%, transparent 60%)',
          borderRadius: '50%', pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', bottom: '-150px', left: '-100px',
          width: '500px', height: '500px',
          background: 'radial-gradient(circle, rgba(160,113,79,0.08) 0%, transparent 60%)',
          borderRadius: '50%', pointerEvents: 'none',
        }} />

        {/* Content */}
        <div style={{
          position: 'relative', zIndex: 1,
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          maxWidth: '600px', width: '100%',
        }}>
          {/* Logo */}
          <div style={{
            animation: 'portal-fade-up 0.7s cubic-bezier(0.22, 0.61, 0.36, 1) both',
          }}>
            <img
              src="/logo.png"
              alt="Hannah Beauty & Spa"
              style={{
                width: isDesktop ? '220px' : '180px',
                height: 'auto',
                marginBottom: '8px',
              }}
            />
          </div>

          {/* Tagline */}
          <div style={{
            fontFamily: "'Dancing Script', cursive",
            fontSize: isDesktop ? '22px' : '18px',
            color: LUX.taupe,
            marginBottom: '6px',
            letterSpacing: '0.5px',
            animation: 'portal-fade-up 0.7s 0.1s cubic-bezier(0.22, 0.61, 0.36, 1) both',
          }}>
            Giữ Mãi Nét Thanh Xuân Của Bạn
          </div>

          {/* Subtitle */}
          <div style={{
            fontSize: '12px',
            color: LUX.ink3,
            marginBottom: isDesktop ? '40px' : '32px',
            letterSpacing: '1px',
            textTransform: 'uppercase',
            fontFamily: LUX.fontSans,
            animation: 'portal-fade-up 0.7s 0.15s cubic-bezier(0.22, 0.61, 0.36, 1) both',
          }}>
            Cổng Chính Hệ Thống
          </div>

          {/* Module cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: isDesktop ? 'repeat(3, 1fr)' : 'repeat(2, 1fr)',
            gap: isDesktop ? '16px' : '12px',
            width: '100%',
            marginBottom: isDesktop ? '48px' : '36px',
          }}>
            {MODULES.map((mod, i) => {
              const isHovered = hovered === mod.key
              return (
                <a
                  key={mod.key}
                  href={mod.active ? mod.href : undefined}
                  onClick={e => { if (!mod.active) e.preventDefault() }}
                  className={mod.active ? 'portal-card' : 'portal-card portal-card-coming'}
                  onMouseEnter={() => setHovered(mod.key)}
                  onMouseLeave={() => setHovered(null)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '8px',
                    background: isHovered && mod.active ? mod.bg : LUX.surface2,
                    border: `1px solid ${isHovered && mod.active ? mod.accent + '40' : LUX.line}`,
                    borderRadius: LUX.radiusLg,
                    padding: isDesktop ? '24px 16px' : '20px 12px',
                    textDecoration: 'none',
                    boxShadow: isHovered && mod.active ? LUX.shadow : LUX.shadowSm,
                    animation: `portal-fade-up 0.6s ${0.2 + i * 0.08}s cubic-bezier(0.22, 0.61, 0.36, 1) both`,
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                >
                  {/* Coming soon badge */}
                  {!mod.active && (
                    <div style={{
                      position: 'absolute', top: '8px', right: '8px',
                      fontSize: '9px', fontWeight: '600',
                      color: LUX.ink3, background: LUX.line,
                      padding: '2px 8px', borderRadius: '20px',
                      fontFamily: LUX.fontSans, letterSpacing: '0.5px',
                    }}>
                      SẮP RA MẮT
                    </div>
                  )}

                  {/* Icon */}
                  <div style={{
                    width: '52px', height: '52px',
                    borderRadius: '16px',
                    background: isHovered && mod.active
                      ? `linear-gradient(135deg, ${mod.accent}22, ${mod.accent}10)`
                      : `linear-gradient(135deg, ${LUX.surface}, ${LUX.line})`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '26px',
                    transition: 'transform 0.3s ease',
                    transform: isHovered && mod.active ? 'scale(1.08)' : 'scale(1)',
                  }}>
                    {mod.icon}
                  </div>

                  {/* Title + subtitle */}
                  <div style={{ textAlign: 'center' }}>
                    <div style={{
                      fontWeight: '700',
                      fontSize: isDesktop ? '16px' : '14px',
                      color: mod.active ? LUX.ink : LUX.ink3,
                      fontFamily: LUX.fontSerif,
                      letterSpacing: '0.3px',
                    }}>
                      {mod.title}
                    </div>
                    <div style={{
                      fontSize: '11px',
                      color: mod.active ? mod.accent : LUX.ink3,
                      fontWeight: '600',
                      marginTop: '1px',
                      fontFamily: LUX.fontSans,
                    }}>
                      {mod.subtitle}
                    </div>
                  </div>

                  {/* Description */}
                  <div style={{
                    fontSize: '10px',
                    color: LUX.ink3,
                    textAlign: 'center',
                    lineHeight: '1.5',
                    fontFamily: LUX.fontSans,
                    maxWidth: '140px',
                  }}>
                    {mod.desc}
                  </div>
                </a>
              )
            })}
          </div>

          {/* Footer */}
          <div style={{
            textAlign: 'center',
            animation: 'portal-fade-up 0.7s 0.7s cubic-bezier(0.22, 0.61, 0.36, 1) both',
          }}>
            <div style={{
              fontSize: '13px',
              color: LUX.ink,
              fontWeight: '600',
              fontFamily: LUX.fontSerif,
              marginBottom: '4px',
            }}>
              📍 39 Nam Kỳ Khởi Nghĩa, P.Tân An, Ninh Kiều, Cần Thơ
            </div>
            <div style={{
              fontSize: '11px',
              color: LUX.ink3,
              fontFamily: LUX.fontSans,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px',
            }}>
              <span>⏰ 9:15 – 20:00</span>
              <span style={{ color: LUX.line2 }}>|</span>
              <span>📞 0919 868 868</span>
            </div>
            <div style={{
              fontSize: '10px',
              color: LUX.ink3,
              marginTop: '16px',
              opacity: 0.7,
              fontFamily: LUX.fontSans,
            }}>
              © 2019 – {new Date().getFullYear()} Hannah Beauty & Spa
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
