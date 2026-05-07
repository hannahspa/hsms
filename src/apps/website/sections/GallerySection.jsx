import { LUX } from '../../../constants/lux'

// TODO: Khi có ảnh thật — thêm prop `img` vào mỗi item và render <img src={item.img} />
const GALLERY = [
  { emoji: '🌺', label: 'Không Gian Spa',     bg: 'linear-gradient(145deg,#4a3528,#6b4a35)' },
  { emoji: '💆', label: 'Phòng Massage',       bg: 'linear-gradient(145deg,#2d4a3a,#1d3a2a)' },
  { emoji: '✨', label: 'Điều Trị Da',         bg: 'linear-gradient(145deg,#4a2d3d,#3a1d2d)' },
  { emoji: '🌸', label: 'Chăm Sóc Mặt',       bg: 'linear-gradient(145deg,#4a3a1d,#3a2a0d)' },
  { emoji: '🛁', label: 'Tắm Trắng',           bg: 'linear-gradient(145deg,#3a3a4a,#2a2a3a)' },
  { emoji: '💎', label: 'Sản Phẩm Cao Cấp',   bg: 'linear-gradient(145deg,#3a2a1d,#2a1a0d)' },
]

export default function GallerySection() {
  return (
    <section style={{ background: '#2e1e14', padding: 'clamp(60px,10vw,100px) clamp(20px,5vw,60px)' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>

        {/* Header */}
        <div className="lp-anim" style={{ textAlign: 'center', marginBottom: 'clamp(36px,5vw,56px)' }}>
          <div style={{
            display: 'inline-block',
            fontFamily: LUX.fontSans, fontSize: 11, fontWeight: 700,
            color: 'rgba(212,165,116,0.65)', letterSpacing: '3px', textTransform: 'uppercase',
            border: '1px solid rgba(212,165,116,0.25)',
            padding: '6px 20px', borderRadius: 50, marginBottom: 16,
          }}>
            Không Gian
          </div>
          <h2 style={{
            fontFamily: LUX.fontSerif, fontSize: 'clamp(28px,5vw,44px)',
            fontWeight: 600, color: 'rgba(255,255,255,0.92)',
            margin: '0 0 12px', lineHeight: 1.2,
          }}>
            Không Gian Hannah Spa
          </h2>
          <p style={{
            fontFamily: LUX.fontSans, fontSize: 15,
            color: 'rgba(255,255,255,0.38)',
            maxWidth: 480, margin: '0 auto', lineHeight: 1.7,
          }}>
            Môi trường thư giãn sang trọng, tinh tế — được thiết kế để mang lại trải nghiệm tốt nhất
          </p>
        </div>

        {/* Gallery grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))',
          gap: 12,
        }}>
          {GALLERY.map((item, i) => (
            <div key={item.label} className="lp-anim" style={{ transitionDelay: `${i * 0.06}s`, height: 220 }}>
              <div
                style={{
                  width: '100%', height: '100%',
                  borderRadius: LUX.radius,
                  background: item.bg,
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center',
                  gap: 10, position: 'relative', overflow: 'hidden',
                  cursor: 'pointer',
                  transition: 'transform 0.3s ease',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = 'scale(1.02)'
                  e.currentTarget.querySelector('.gal-overlay').style.opacity = '1'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'scale(1)'
                  e.currentTarget.querySelector('.gal-overlay').style.opacity = '0'
                }}
              >
                {/* Placeholder */}
                <span style={{ fontSize: 36, opacity: 0.55 }}>{item.emoji}</span>
                <span style={{
                  fontFamily: LUX.fontSans, fontSize: 12,
                  color: 'rgba(255,255,255,0.45)',
                  letterSpacing: '1px', textTransform: 'uppercase',
                }}>
                  {item.label}
                </span>

                {/* Hover overlay */}
                <div className="gal-overlay" style={{
                  position: 'absolute', inset: 0,
                  background: 'rgba(212,165,116,0.1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  opacity: 0, transition: 'opacity 0.3s',
                }}>
                  <span style={{ fontSize: 22 }}>🔍</span>
                </div>

                {/* Bottom gradient */}
                <div style={{ position:'absolute',inset:0,background:'linear-gradient(to top,rgba(0,0,0,0.28),transparent 55%)',pointerEvents:'none' }} />
              </div>
            </div>
          ))}
        </div>

        <p className="lp-anim" style={{
          textAlign: 'center',
          fontFamily: LUX.fontSans, fontSize: 12,
          color: 'rgba(255,255,255,0.2)',
          marginTop: 24, fontStyle: 'italic',
        }}>
          * Ảnh thực tế sẽ được cập nhật sớm
        </p>
      </div>
    </section>
  )
}
