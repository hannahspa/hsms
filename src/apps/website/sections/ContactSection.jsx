import { LUX } from '../../../constants/lux'

// TODO: Thay bằng Zalo OA link chính thức
const ZALO_URL = 'https://zalo.me/0919868868'

const INFO = [
  {
    icon: '📍', label: 'Địa Chỉ',
    value: '39 Nam Kỳ Khởi Nghĩa, P.Tân An\nNinh Kiều, Cần Thơ',
  },
  {
    icon: '⏰', label: 'Giờ Mở Cửa',
    value: '9:15 – 20:00 hàng ngày\n(Ngưng nhận khách lúc 19:30)',
  },
  {
    icon: '📞', label: 'Điện Thoại',
    value: '0919 868 868', href: 'tel:0919868868',
  },
]

const SOCIALS = [
  { label: 'Zalo',     href: ZALO_URL,               char: 'Z', bg: '#0068FF' },
  { label: 'Facebook', href: 'https://facebook.com',  char: 'f', bg: '#1877F2' },
  { label: 'TikTok',   href: 'https://tiktok.com',    char: '▶', bg: '#010101' },
]

export default function ContactSection() {
  return (
    <section id="dat-lich" style={{ background: LUX.bg, padding: 'clamp(60px,10vw,100px) clamp(20px,5vw,60px)' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>

        {/* Header */}
        <div className="lp-anim" style={{ textAlign: 'center', marginBottom: 'clamp(40px,6vw,64px)' }}>
          <div style={{
            display: 'inline-block',
            fontFamily: LUX.fontSans, fontSize: 11, fontWeight: 700,
            color: LUX.champagne, letterSpacing: '3px', textTransform: 'uppercase',
            background: `linear-gradient(135deg,${LUX.gold}20,${LUX.champagne}15)`,
            border: `1px solid ${LUX.gold}40`,
            padding: '6px 20px', borderRadius: 50, marginBottom: 16,
          }}>
            Liên Hệ &amp; Đặt Lịch
          </div>
          <h2 style={{
            fontFamily: LUX.fontSerif, fontSize: 'clamp(28px,5vw,44px)',
            fontWeight: 600, color: LUX.espresso,
            margin: '0 0 12px', lineHeight: 1.2,
          }}>
            Đặt Lịch Hôm Nay
          </h2>
          <p style={{
            fontFamily: LUX.fontSans, fontSize: 15, color: LUX.ink3,
            maxWidth: 480, margin: '0 auto', lineHeight: 1.7,
          }}>
            Liên hệ ngay qua Zalo hoặc điện thoại để được tư vấn và đặt lịch dịch vụ
          </p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))',
          gap: 'clamp(32px,5vw,60px)',
          alignItems: 'start',
        }}>
          {/* Info column */}
          <div className="lp-anim">
            <h3 style={{ fontFamily: LUX.fontSerif, fontSize: 24, fontWeight: 600, color: LUX.espresso, margin: '0 0 28px' }}>
              Thông Tin Liên Hệ
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20, marginBottom: 32 }}>
              {INFO.map(item => (
                <div key={item.label} style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 12,
                    background: `linear-gradient(135deg,${LUX.gold}20,${LUX.champagne}15)`,
                    border: `1px solid ${LUX.gold}30`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 20, flexShrink: 0,
                  }}>
                    {item.icon}
                  </div>
                  <div>
                    <div style={{
                      fontFamily: LUX.fontSans, fontSize: 11, fontWeight: 700,
                      color: LUX.champagne, letterSpacing: '1.5px', textTransform: 'uppercase',
                      marginBottom: 4,
                    }}>
                      {item.label}
                    </div>
                    {item.href ? (
                      <a href={item.href} style={{ fontFamily: LUX.fontSans, fontSize: 15, color: LUX.espresso, fontWeight: 600, textDecoration: 'none' }}>
                        {item.value}
                      </a>
                    ) : (
                      <div style={{ fontFamily: LUX.fontSans, fontSize: 14, color: LUX.ink2, lineHeight: 1.6, whiteSpace: 'pre-line' }}>
                        {item.value}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Social */}
            <div style={{ paddingTop: 24, borderTop: `1px solid ${LUX.line}` }}>
              <div style={{ fontFamily: LUX.fontSans, fontSize: 11, fontWeight: 700, color: LUX.ink3, letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: 14 }}>
                Theo Dõi Chúng Tôi
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                {SOCIALS.map(s => (
                  <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer"
                    title={s.label}
                    style={{ width: 40, height: 40, borderRadius: '50%', background: s.bg, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, textDecoration: 'none', boxShadow: `0 4px 12px ${s.bg}40`, transition: 'transform 0.2s' }}
                    onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1) translateY(-2px)'}
                    onMouseLeave={e => e.currentTarget.style.transform = 'scale(1) translateY(0)'}
                  >
                    {s.char}
                  </a>
                ))}
              </div>
            </div>
          </div>

          {/* CTA card */}
          <div className="lp-anim" style={{ transitionDelay: '0.1s' }}>
            <div style={{
              background: 'linear-gradient(145deg,#4a3528,#3d2c20)',
              borderRadius: LUX.radiusLg,
              padding: 'clamp(28px,5vw,44px)',
              boxShadow: LUX.shadowLg,
              position: 'relative', overflow: 'hidden',
            }}>
              <div style={{ position:'absolute',top:'-40%',right:'-30%',width:'80%',height:'80%',background:'radial-gradient(circle,rgba(212,165,116,0.18) 0%,transparent 65%)',borderRadius:'50%',pointerEvents:'none' }} />

              <div style={{ position: 'relative', zIndex: 1 }}>
                <div style={{
                  fontFamily: LUX.fontSerif,
                  fontSize: 'clamp(20px,3.5vw,28px)',
                  fontWeight: 600, color: 'rgba(255,255,255,0.92)',
                  marginBottom: 10, lineHeight: 1.3,
                }}>
                  Sẵn Sàng Trải Nghiệm?
                </div>
                <p style={{
                  fontFamily: LUX.fontSans, fontSize: 14,
                  color: 'rgba(255,255,255,0.48)',
                  lineHeight: 1.75, marginBottom: 32,
                }}>
                  Đặt lịch qua Zalo để được ưu tiên phục vụ. Tư vấn miễn phí, không ràng buộc.
                </p>

                {/* Primary — Zalo */}
                <a href={ZALO_URL} target="_blank" rel="noopener noreferrer"
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                    padding: '18px 24px',
                    background: LUX.goldGrad,
                    color: 'white', textDecoration: 'none',
                    borderRadius: 14,
                    fontFamily: LUX.fontSans, fontWeight: 700, fontSize: 15,
                    boxShadow: `0 8px 32px ${LUX.gold}45`,
                    marginBottom: 12, transition: 'all 0.25s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 14px 40px ${LUX.gold}55` }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)';  e.currentTarget.style.boxShadow = `0 8px 32px ${LUX.gold}45` }}
                >
                  <span style={{ fontSize: 18 }}>💬</span>
                  Đặt Lịch Qua Zalo
                </a>

                {/* Secondary — Call */}
                <a href="tel:0919868868"
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                    padding: '16px 24px',
                    background: 'rgba(255,255,255,0.07)',
                    color: 'rgba(255,255,255,0.8)', textDecoration: 'none',
                    border: '1px solid rgba(255,255,255,0.15)',
                    borderRadius: 14,
                    fontFamily: LUX.fontSans, fontWeight: 600, fontSize: 14,
                    transition: 'all 0.25s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.13)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)' }}
                >
                  <span style={{ fontSize: 16 }}>📞</span>
                  Gọi Ngay — 0919 868 868
                </a>

                <p style={{ fontFamily: LUX.fontSans, fontSize: 11, color: 'rgba(255,255,255,0.25)', textAlign: 'center', marginTop: 18, lineHeight: 1.5 }}>
                  9:15 – 20:00 · 39 Nam Kỳ Khởi Nghĩa, Cần Thơ
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
