import { LUX } from '../../../constants/lux'

const ZALO_URL = 'https://zalo.me/0919868868'

const SERVICES = [
  'Chăm Sóc Da Mặt', 'Massage Thư Giãn',
  'Triệt Lông', 'Trị Mụn - Thâm',
  'Tắm Trắng', 'Liệu Trình Combo',
]

const SOCIALS = [
  { label: 'Zalo',     href: ZALO_URL,               char: 'Z', bg: '#0068FF' },
  { label: 'Facebook', href: 'https://facebook.com',  char: 'f', bg: '#1877F2' },
  { label: 'TikTok',   href: 'https://tiktok.com',    char: '▶', bg: '#252525' },
]

const CONTACT = [
  { icon: '📍', text: '39 Nam Kỳ Khởi Nghĩa\nP.Tân An, Ninh Kiều, Cần Thơ' },
  { icon: '⏰', text: '9:15 – 20:00 hàng ngày' },
  { icon: '📞', text: '0919 868 868', href: 'tel:0919868868' },
  { icon: '✉️', text: 'hannahspa.nm@gmail.com', href: 'mailto:hannahspa.nm@gmail.com' },
]

const scrollTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })

export default function FooterSection() {
  return (
    <footer style={{ background: '#2a1c12', padding: 'clamp(48px,8vw,80px) clamp(20px,5vw,60px) 0' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>

        {/* 3-column grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))',
          gap: 'clamp(32px,5vw,60px)',
          paddingBottom: 'clamp(40px,6vw,60px)',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
        }}>
          {/* Brand */}
          <div>
            <img src="/logo.png" alt="Hannah Beauty & Spa"
              style={{ width: 110, height: 'auto', marginBottom: 14, filter: 'brightness(1.08)' }}
            />
            <p style={{
              fontFamily: LUX.fontSans, fontSize: 13,
              color: 'rgba(255,255,255,0.38)',
              lineHeight: 1.75, marginBottom: 20, maxWidth: 240,
            }}>
              Trung tâm chăm sóc sắc đẹp cao cấp tại trung tâm Cần Thơ. Tận tâm vì vẻ đẹp của bạn.
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              {SOCIALS.map(s => (
                <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer"
                  title={s.label}
                  style={{ width:34,height:34,borderRadius:'50%',background:s.bg,color:'white',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:700,textDecoration:'none',opacity:0.8,transition:'all 0.2s' }}
                  onMouseEnter={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'translateY(-2px)' }}
                  onMouseLeave={e => { e.currentTarget.style.opacity = '0.8'; e.currentTarget.style.transform = 'translateY(0)' }}
                >
                  {s.char}
                </a>
              ))}
            </div>
          </div>

          {/* Services */}
          <div>
            <div style={{ fontFamily: LUX.fontSans, fontSize: 11, fontWeight: 700, color: 'rgba(212,165,116,0.55)', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 18 }}>
              Dịch Vụ
            </div>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {SERVICES.map(s => (
                <li key={s}>
                  <a href="#dich-vu"
                    onClick={e => { e.preventDefault(); scrollTo('dich-vu') }}
                    style={{ fontFamily: LUX.fontSans, fontSize: 13, color: 'rgba(255,255,255,0.42)', textDecoration: 'none', transition: 'color 0.2s' }}
                    onMouseEnter={e => e.currentTarget.style.color = 'rgba(212,165,116,0.8)'}
                    onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.42)'}
                  >
                    {s}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <div style={{ fontFamily: LUX.fontSans, fontSize: 11, fontWeight: 700, color: 'rgba(212,165,116,0.55)', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 18 }}>
              Liên Hệ
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {CONTACT.map(item => (
                <div key={item.icon} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <span style={{ fontSize: 13, opacity: 0.55, flexShrink: 0, marginTop: 1 }}>{item.icon}</span>
                  {item.href ? (
                    <a href={item.href} style={{ fontFamily: LUX.fontSans, fontSize: 13, color: 'rgba(255,255,255,0.42)', textDecoration: 'none', whiteSpace: 'pre-line', lineHeight: 1.55, transition: 'color 0.2s' }}
                      onMouseEnter={e => e.currentTarget.style.color = 'rgba(212,165,116,0.8)'}
                      onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.42)'}
                    >
                      {item.text}
                    </a>
                  ) : (
                    <span style={{ fontFamily: LUX.fontSans, fontSize: 13, color: 'rgba(255,255,255,0.42)', whiteSpace: 'pre-line', lineHeight: 1.55 }}>
                      {item.text}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div style={{
          padding: '20px 0',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexWrap: 'wrap', gap: 8,
        }}>
          <div style={{ fontFamily: LUX.fontSans, fontSize: 12, color: 'rgba(255,255,255,0.22)' }}>
            © 2019 – {new Date().getFullYear()} Hannah Beauty &amp; Spa · Cần Thơ
          </div>
          <div style={{ fontFamily: LUX.fontSans, fontSize: 12, color: 'rgba(255,255,255,0.18)' }}>
            hannahspa.vn
          </div>
        </div>
      </div>
    </footer>
  )
}
