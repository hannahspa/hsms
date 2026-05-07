import { LUX } from '../../../constants/lux'
import { IMMERSION_SECTIONS } from '../../../constants/galleryImages'
import LazyImage from '../../../components/shared/LazyImage'

export default function AtmosphereSection() {
  return (
    <section style={{ background: '#2e1e14' }}>
      {IMMERSION_SECTIONS.map((section, i) => {
        const isEven = i % 2 === 0
        const mainImg = section.images[0]
        const secondImg = section.images[1]

        return (
          <div key={section.id} className="lp-anim">
            {/* Full-width banner */}
            <div style={{
              position: 'relative',
              minHeight: 'clamp(420px, 70vh, 650px)',
              display: 'flex', alignItems: 'center',
              overflow: 'hidden',
            }}>
              {/* Background image */}
              <div style={{ position: 'absolute', inset: 0 }}>
                <LazyImage
                  src={mainImg}
                  alt={section.title}
                  aspectRatio="auto"
                  rootMargin="400px"
                />
                {/* Warm overlay — gradient matching brand */}
                <div style={{
                  position: 'absolute', inset: 0,
                  background: `
                    linear-gradient(
                      ${isEven ? '105deg' : '255deg'},
                      rgba(30,18,12,0.82) 0%,
                      rgba(30,18,12,0.52) 38%,
                      rgba(30,18,12,0.25) 62%,
                      rgba(30,18,12,0.15) 100%
                    )
                  `,
                }} />
                {/* Gold accent glow */}
                <div style={{
                  position: 'absolute',
                  [isEven ? 'left' : 'right']: 0,
                  top: 0, width: '50%', height: '100%',
                  background: `radial-gradient(ellipse at ${isEven ? 'left' : 'right'} center, rgba(212,165,116,0.08) 0%, transparent 70%)`,
                  pointerEvents: 'none',
                }} />
              </div>

              {/* Content overlay */}
              <div style={{
                position: 'relative', zIndex: 1,
                maxWidth: 1100, margin: '0 auto',
                width: '100%', padding: 'clamp(40px,8vw,80px) clamp(24px,5vw,60px)',
                display: 'flex',
                justifyContent: isEven ? 'flex-start' : 'flex-end',
              }}>
                <div style={{
                  maxWidth: 440,
                }}>
                  {/* Small label */}
                  <div style={{
                    display: 'inline-block',
                    fontFamily: LUX.fontSans, fontSize: 10, fontWeight: 700,
                    color: 'rgba(212,165,116,0.6)', letterSpacing: '3px',
                    textTransform: 'uppercase',
                    border: '1px solid rgba(212,165,116,0.2)',
                    padding: '5px 16px', borderRadius: 50,
                    marginBottom: 20,
                  }}>
                    Không Gian
                  </div>

                  <h3 style={{
                    fontFamily: LUX.fontSerif,
                    fontSize: 'clamp(26px,4vw,42px)',
                    fontWeight: 600,
                    color: 'rgba(255,255,255,0.92)',
                    margin: '0 0 14px', lineHeight: 1.2,
                    letterSpacing: '0.2px',
                  }}>
                    {section.title}
                  </h3>

                  <div style={{
                    width: 48, height: 2,
                    background: 'linear-gradient(to right, rgba(212,165,116,0.7), transparent)',
                    marginBottom: 18,
                  }} />

                  <p style={{
                    fontFamily: LUX.fontSans, fontSize: 15,
                    color: 'rgba(255,255,255,0.42)',
                    lineHeight: 1.75, margin: 0,
                  }}>
                    {section.subtitle}
                  </p>
                </div>
              </div>

              {/* Bottom fade to next section */}
              <div style={{
                position: 'absolute', bottom: 0, left: 0, right: 0,
                height: 60,
                background: 'linear-gradient(to bottom, transparent, #2e1e14)',
                pointerEvents: 'none',
              }} />
            </div>

            {/* Optional second image — smaller accent card */}
            {secondImg && (
              <div style={{
                maxWidth: 1100, margin: '0 auto',
                padding: '0 clamp(24px,5vw,60px)',
                position: 'relative', zIndex: 2,
                marginTop: -30,
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: isEven ? 'flex-end' : 'flex-start',
                }}>
                  <div style={{
                    width: 'clamp(200px, 35%, 320px)',
                    borderRadius: LUX.radiusLg,
                    overflow: 'hidden',
                    boxShadow: '0 20px 50px rgba(0,0,0,0.4)',
                    border: '2px solid rgba(212,165,116,0.12)',
                  }}>
                    <LazyImage
                      src={secondImg}
                      alt={`${section.title} — góc nhìn khác`}
                      aspectRatio="4/3"
                      rootMargin="400px"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Spacer between sections */}
            <div style={{ height: 'clamp(40px,6vw,80px)' }} />
          </div>
        )
      })}

      {/* Closing quote */}
      <div className="lp-anim" style={{
        textAlign: 'center',
        padding: 'clamp(40px,6vw,80px) clamp(24px,5vw,60px) clamp(60px,8vw,100px)',
      }}>
        <div style={{
          fontFamily: "'Dancing Script', cursive",
          fontSize: 'clamp(24px,4vw,36px)',
          color: 'rgba(212,165,116,0.55)',
          lineHeight: 1.6, maxWidth: 600, margin: '0 auto',
        }}>
          "Mỗi góc nhỏ tại Hannah Spa đều được chăm chút<br />
          để bạn cảm thấy được yêu thương và trân trọng."
        </div>
      </div>
    </section>
  )
}
