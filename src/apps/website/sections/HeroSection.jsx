import { LUX } from '../../../constants/lux'

// TODO: Thay bằng Zalo OA link chính thức của Hannah Spa
const ZALO_URL = 'https://zalo.me/0919868868'

const SOCIALS = [
  { label: 'Zalo',     href: ZALO_URL,                    char: 'Z', bg: '#0068FF' },
  { label: 'Facebook', href: 'https://facebook.com',       char: 'f', bg: '#1877F2' },
  { label: 'TikTok',   href: 'https://tiktok.com',         char: '▶', bg: '#010101' },
]

export default function HeroSection() {
  const scrollTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })

  return (
    <section style={{
      minHeight: '100dvh',
      background: LUX.heroGrad,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      position: 'relative', overflow: 'hidden',
      padding: '80px 24px 120px',
    }}>
      {/* Ambient glows */}
      <div style={{ position:'absolute',top:0,right:0,width:'60%',height:'55%',background:'radial-gradient(ellipse at top right,rgba(212,165,116,0.2) 0%,transparent 65%)',pointerEvents:'none' }} />
      <div style={{ position:'absolute',bottom:0,left:0,width:'50%',height:'40%',background:'radial-gradient(ellipse at bottom left,rgba(160,113,79,0.14) 0%,transparent 60%)',pointerEvents:'none' }} />

      {/* Social float bar — hidden on mobile */}
      <div style={{ position:'absolute',left:20,top:'50%',transform:'translateY(-50%)',display:'flex',flexDirection:'column',gap:10,zIndex:10 }}>
        {SOCIALS.map(s => (
          <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer"
            title={s.label}
            style={{ width:36,height:36,borderRadius:'50%',background:s.bg,color:'white',display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:700,textDecoration:'none',boxShadow:'0 4px 14px rgba(0,0,0,0.35)',opacity:0.8,transition:'all 0.2s' }}
            onMouseEnter={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'scale(1.12)' }}
            onMouseLeave={e => { e.currentTarget.style.opacity = '0.8'; e.currentTarget.style.transform = 'scale(1)' }}
          >
            {s.char}
          </a>
        ))}
      </div>

      {/* Main content */}
      <div style={{ textAlign:'center', position:'relative', zIndex:1, maxWidth:720, width:'100%' }}>
        {/* Logo */}
        <div className="hero-animate" style={{ animationDelay: '0s' }}>
          <img src="/logo.png" alt="Hannah Beauty & Spa"
            style={{ width:'clamp(150px,28vw,230px)', height:'auto', marginBottom:22,
              filter:'brightness(1.05) drop-shadow(0 4px 28px rgba(212,165,116,0.32))' }}
          />
        </div>

        {/* Decorative divider */}
        <div className="hero-animate" style={{ animationDelay:'0.12s', display:'flex', alignItems:'center', justifyContent:'center', gap:12, marginBottom:18 }}>
          <div style={{ width:44, height:1, background:`linear-gradient(to right,transparent,${LUX.gold}80)` }} />
          <div style={{ width:5, height:5, borderRadius:'50%', background:LUX.gold, opacity:0.7 }} />
          <div style={{ width:44, height:1, background:`linear-gradient(to left,transparent,${LUX.gold}80)` }} />
        </div>

        {/* Tagline */}
        <div className="hero-animate" style={{
          animationDelay: '0.22s',
          fontFamily: "'Dancing Script', cursive",
          fontSize: 'clamp(22px,5.5vw,40px)',
          color: LUX.gold,
          letterSpacing: '0.5px',
          marginBottom: 12,
          lineHeight: 1.3,
        }}>
          Giữ Mãi Nét Thanh Xuân Của Bạn
        </div>

        {/* Sub */}
        <div className="hero-animate" style={{
          animationDelay: '0.32s',
          fontFamily: LUX.fontSans, fontSize: 12,
          color: 'rgba(255,255,255,0.38)',
          letterSpacing: '3px', textTransform: 'uppercase',
          marginBottom: 52,
        }}>
          Hannah Beauty &amp; Spa · Cần Thơ · Từ Năm 2019
        </div>

        {/* CTAs */}
        <div className="hero-animate" style={{ animationDelay:'0.44s', display:'flex', gap:14, justifyContent:'center', flexWrap:'wrap' }}>
          <a href="#dat-lich"
            onClick={e => { e.preventDefault(); scrollTo('dat-lich') }}
            style={{
              padding: '16px 40px',
              background: LUX.goldGrad,
              color: 'white', borderRadius: 50,
              fontFamily: LUX.fontSans, fontWeight: 700, fontSize: 15,
              textDecoration: 'none',
              boxShadow: `0 8px 32px ${LUX.gold}50`,
              transition: 'all 0.25s',
              letterSpacing: '0.3px',
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 14px 40px ${LUX.gold}60` }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = `0 8px 32px ${LUX.gold}50` }}
          >
            Đặt Lịch Ngay
          </a>
          <button onClick={() => scrollTo('dich-vu')}
            style={{
              padding: '16px 34px',
              background: 'rgba(255,255,255,0.07)',
              color: 'rgba(255,255,255,0.82)',
              border: '1px solid rgba(255,255,255,0.18)',
              borderRadius: 50,
              fontFamily: LUX.fontSans, fontWeight: 600, fontSize: 15,
              cursor: 'pointer',
              backdropFilter: 'blur(12px)',
              transition: 'all 0.25s',
              letterSpacing: '0.3px',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.14)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.38)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.18)' }}
          >
            Xem Dịch Vụ
          </button>
        </div>
      </div>

      {/* Scroll indicator */}
      <div style={{ position:'absolute', bottom:32, left:'50%', transform:'translateX(-50%)' }}>
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:8, animation:'lp-fade-pulse 2.2s ease-in-out infinite' }}>
          <span style={{ fontFamily:LUX.fontSans, fontSize:10, letterSpacing:'2px', textTransform:'uppercase', color:'rgba(255,255,255,0.35)' }}>
            Cuộn xuống
          </span>
          <div style={{ width:1, height:36, background:'linear-gradient(to bottom,rgba(255,255,255,0.4),transparent)' }} />
        </div>
      </div>
    </section>
  )
}
