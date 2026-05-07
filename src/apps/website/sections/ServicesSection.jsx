import { LUX } from '../../../constants/lux'

const SERVICES = [
  {
    emoji: '🌸', name: 'Chăm Sóc Da Mặt',
    desc: 'Facial chuyên sâu, thải độc, dưỡng ẩm, trẻ hóa làn da hiệu quả',
    price: 'Từ 200.000đ',
    accent: '#c8956a', bg: 'linear-gradient(135deg,#f8ece0,#f2dcc8)',
  },
  {
    emoji: '💆', name: 'Massage Thư Giãn',
    desc: 'Body massage toàn thân, đá nóng, giải tỏa căng thẳng mệt mỏi',
    price: 'Từ 350.000đ',
    accent: '#6a9a6a', bg: 'linear-gradient(135deg,#eef2e7,#ddecd5)',
  },
  {
    emoji: '✨', name: 'Triệt Lông',
    desc: 'Công nghệ laser hiện đại, an toàn, triệt lông lâu dài bền vững',
    price: 'Từ 150.000đ',
    accent: '#b87a6a', bg: 'linear-gradient(135deg,#f5e4e0,#ecccca)',
  },
  {
    emoji: '🌿', name: 'Trị Mụn - Thâm',
    desc: 'Liệu trình chuyên biệt, điều trị mụn viêm và vết thâm tối màu',
    price: 'Từ 250.000đ',
    accent: '#6a9a7a', bg: 'linear-gradient(135deg,#e5f0ea,#d2e8da)',
  },
  {
    emoji: '🛁', name: 'Tắm Trắng',
    desc: 'Công thức dưỡng trắng toàn thân, da mịn màng và sáng hồng tự nhiên',
    price: 'Từ 400.000đ',
    accent: '#c8a675', bg: 'linear-gradient(135deg,#f5e9d4,#eeddb8)',
  },
  {
    emoji: '💎', name: 'Liệu Trình Combo',
    desc: 'Gói kết hợp đa dịch vụ, ưu đãi tiết kiệm lên đến 30% cho khách hàng',
    price: 'Từ 1.500.000đ',
    accent: '#8a6a52', bg: 'linear-gradient(135deg,#ece2d4,#ddd0bc)',
  },
]

export default function ServicesSection() {
  return (
    <section id="dich-vu" style={{ background: LUX.bg, padding: 'clamp(60px,10vw,100px) clamp(20px,5vw,60px)' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>

        {/* Section header */}
        <div className="lp-anim" style={{ textAlign: 'center', marginBottom: 'clamp(40px,6vw,64px)' }}>
          <div style={{
            display: 'inline-block',
            fontFamily: LUX.fontSans, fontSize: 11, fontWeight: 700,
            color: LUX.champagne, letterSpacing: '3px', textTransform: 'uppercase',
            background: `linear-gradient(135deg,${LUX.gold}20,${LUX.champagne}15)`,
            border: `1px solid ${LUX.gold}40`,
            padding: '6px 20px', borderRadius: 50, marginBottom: 16,
          }}>
            Dịch Vụ Của Chúng Tôi
          </div>
          <h2 style={{
            fontFamily: LUX.fontSerif, fontSize: 'clamp(28px,5vw,44px)',
            fontWeight: 600, color: LUX.espresso,
            margin: '0 0 14px', lineHeight: 1.2,
          }}>
            Dịch Vụ Nổi Bật
          </h2>
          <p style={{
            fontFamily: LUX.fontSans, fontSize: 15,
            color: LUX.ink3, maxWidth: 500, margin: '0 auto', lineHeight: 1.75,
          }}>
            Trải nghiệm làm đẹp cao cấp với đội ngũ chuyên viên tận tâm tại trung tâm Cần Thơ
          </p>
        </div>

        {/* Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))',
          gap: 20,
        }}>
          {SERVICES.map((svc, i) => (
            <div key={svc.name} className="lp-anim" style={{ transitionDelay: `${i * 0.07}s` }}>
              <div
                style={{
                  background: LUX.surface2, borderRadius: LUX.radius,
                  padding: '28px 24px',
                  border: `1px solid ${LUX.line}`,
                  boxShadow: LUX.shadowSm,
                  transition: 'all 0.3s cubic-bezier(0.22,0.61,0.36,1)',
                  position: 'relative', overflow: 'hidden',
                  height: '100%', boxSizing: 'border-box',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.boxShadow = LUX.shadow
                  e.currentTarget.style.transform = 'translateY(-5px)'
                  e.currentTarget.style.borderColor = svc.accent + '40'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.boxShadow = LUX.shadowSm
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.borderColor = LUX.line
                }}
              >
                {/* Top accent */}
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: svc.accent, borderRadius: '18px 18px 0 0' }} />

                {/* Icon */}
                <div style={{
                  width: 56, height: 56, borderRadius: 16,
                  background: svc.bg,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 28, marginBottom: 16,
                  boxShadow: `0 4px 14px ${svc.accent}25`,
                }}>
                  {svc.emoji}
                </div>

                <div style={{ fontFamily: LUX.fontSerif, fontSize: 20, fontWeight: 600, color: LUX.espresso, marginBottom: 8 }}>
                  {svc.name}
                </div>
                <div style={{ fontFamily: LUX.fontSans, fontSize: 13, color: LUX.ink3, lineHeight: 1.65, marginBottom: 18 }}>
                  {svc.desc}
                </div>
                <div style={{
                  display: 'inline-block',
                  fontFamily: LUX.fontSans, fontSize: 12, fontWeight: 700,
                  color: svc.accent,
                  background: `${svc.accent}18`,
                  border: `1px solid ${svc.accent}30`,
                  padding: '5px 14px', borderRadius: 50,
                }}>
                  {svc.price}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="lp-anim" style={{ textAlign: 'center', marginTop: 52 }}>
          <p style={{ fontFamily: LUX.fontSans, fontSize: 13, color: LUX.ink3, marginBottom: 16 }}>
            Liên hệ để được tư vấn miễn phí và nhận ưu đãi đặc biệt
          </p>
          <a href="tel:0919868868" style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '14px 36px',
            background: LUX.goldGrad,
            color: 'white', textDecoration: 'none',
            borderRadius: 50,
            fontFamily: LUX.fontSans, fontWeight: 700, fontSize: 14,
            boxShadow: `0 6px 24px ${LUX.gold}40`,
          }}>
            Gọi Tư Vấn — 0919 868 868
          </a>
        </div>
      </div>
    </section>
  )
}
