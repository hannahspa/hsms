import { LUX } from '../../../constants/lux'
import { ABOUT_IMG } from '../../../constants/galleryImages'
import LazyImage from '../../../components/shared/LazyImage'

const STATS = [
  { num: '7+',    label: 'Năm Kinh Nghiệm'     },
  { num: '10',    label: 'Chuyên Viên'          },
  { num: '1000+', label: 'Khách Hàng Hài Lòng' },
]

const BADGES = ['Chuyên nghiệp', 'Tận tâm', 'Cao cấp', 'Uy tín']

export default function AboutSection() {
  return (
    <section style={{ background: LUX.surface2, padding: 'clamp(60px,10vw,100px) clamp(20px,5vw,60px)' }}>
      <div style={{
        maxWidth: 1100, margin: '0 auto',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))',
        gap: 'clamp(40px,6vw,80px)',
        alignItems: 'center',
      }}>

        {/* Text column */}
        <div>
          <div className="lp-anim" style={{
            display: 'inline-block',
            fontFamily: LUX.fontSans, fontSize: 11, fontWeight: 700,
            color: LUX.champagne, letterSpacing: '3px', textTransform: 'uppercase',
            border: `1px solid ${LUX.gold}40`,
            padding: '6px 20px', borderRadius: 50, marginBottom: 20,
          }}>
            Về Chúng Tôi
          </div>

          <h2 className="lp-anim" style={{
            fontFamily: LUX.fontSerif, fontSize: 'clamp(26px,4.5vw,38px)',
            fontWeight: 600, color: LUX.espresso,
            lineHeight: 1.25, margin: '0 0 20px',
          }}>
            Nơi Sắc Đẹp Và<br />Sự Thư Giãn Gặp Nhau
          </h2>

          <p className="lp-anim" style={{
            fontFamily: LUX.fontSans, fontSize: 15, color: LUX.ink2,
            lineHeight: 1.8, marginBottom: 14,
          }}>
            Thành lập năm 2019, Hannah Beauty &amp; Spa là điểm đến chăm sóc sắc đẹp được yêu thích
            tại trung tâm Cần Thơ. Chúng tôi mang đến những dịch vụ làm đẹp chuyên nghiệp trong
            không gian sang trọng, ấm cúng.
          </p>

          <p className="lp-anim" style={{
            fontFamily: LUX.fontSans, fontSize: 15, color: LUX.ink2,
            lineHeight: 1.8, marginBottom: 36,
          }}>
            Đội ngũ chuyên viên được đào tạo bài bản, luôn tận tâm và chu đáo — đảm bảo mỗi
            khách hàng đều được trải nghiệm dịch vụ tốt nhất với sản phẩm cao cấp.
          </p>

          {/* Stats row */}
          <div className="lp-anim" style={{ display: 'flex', gap: 'clamp(20px,4vw,40px)', flexWrap: 'wrap' }}>
            {STATS.map(s => (
              <div key={s.label}>
                <div style={{
                  fontFamily: LUX.fontSerif, fontSize: 'clamp(32px,5vw,44px)',
                  fontWeight: 700, color: LUX.champagne,
                  lineHeight: 1, marginBottom: 4,
                }}>
                  {s.num}
                </div>
                <div style={{
                  fontFamily: LUX.fontSans, fontSize: 12,
                  color: LUX.ink3, fontWeight: 600, letterSpacing: '0.5px',
                }}>
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Visual column — real spa photo, lazy loaded */}
        <div className="lp-anim" style={{ position: 'relative' }}>
          <div style={{
            borderRadius: LUX.radiusLg,
            overflow: 'hidden',
            boxShadow: LUX.shadowLg,
          }}>
            <LazyImage
              src={ABOUT_IMG}
              alt="Sảnh đón Hannah Beauty & Spa"
              aspectRatio="4/5"
              rootMargin="250px"
            />

            {/* Badges overlay */}
            <div style={{
              position: 'absolute', bottom: 0, left: 0, right: 0,
              height: '50%',
              background: 'linear-gradient(to top, rgba(45,30,20,0.80), transparent)',
              pointerEvents: 'none',
            }} />
            <div style={{
              position: 'absolute', bottom: 20, left: 20, right: 20,
              display: 'flex', gap: 6, flexWrap: 'wrap',
            }}>
              {BADGES.map(b => (
                <span key={b} style={{
                  fontFamily: LUX.fontSans, fontSize: 11, fontWeight: 600,
                  color: 'rgba(255,255,255,0.9)',
                  background: 'rgba(0,0,0,0.35)',
                  backdropFilter: 'blur(8px)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  padding: '4px 12px', borderRadius: 50,
                }}>
                  {b}
                </span>
              ))}
            </div>
          </div>

          {/* Floating rating card */}
          <div style={{
            position: 'absolute', bottom: -20, right: -16,
            background: LUX.surface2,
            borderRadius: LUX.radius,
            padding: '14px 18px',
            boxShadow: LUX.shadow,
            border: `1px solid ${LUX.line}`,
          }}>
            <div style={{ fontFamily: LUX.fontSans, fontSize: 11, color: LUX.ink3, marginBottom: 4 }}>
              Đánh giá trung bình
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontFamily: LUX.fontSerif, fontSize: 22, fontWeight: 700, color: LUX.espresso }}>5.0</span>
              <span style={{ fontSize: 13 }}>⭐⭐⭐⭐⭐</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
