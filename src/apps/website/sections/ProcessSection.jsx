import { LUX } from '../../../constants/lux'

const STEPS = [
  {
    num: '01',
    icon: '💬',
    title: 'Đặt Lịch & Tư Vấn',
    time: '5 phút',
    desc: 'Liên hệ qua Facebook hoặc điện thoại. Nhân viên tư vấn lộ trình phù hợp và đặt lịch ưu tiên miễn phí.',
  },
  {
    num: '02',
    icon: '🌿',
    title: 'Chào Đón & Phân Tích',
    time: '10 phút',
    desc: 'Được chào đón bằng trà thảo mộc. Chuyên viên phân tích tình trạng da và lắng nghe nhu cầu của bạn.',
  },
  {
    num: '03',
    icon: '✨',
    title: 'Làm Sạch & Chuẩn Bị',
    time: '15 phút',
    desc: 'Làm sạch sâu và chuẩn bị cho liệu trình. Không gian riêng tư, nhạc thư giãn và ánh sáng ấm áp.',
  },
  {
    num: '04',
    icon: '💎',
    title: 'Thực Hiện Điều Trị',
    time: '45 – 75 phút',
    desc: 'KTV chuyên nghiệp thực hiện liệu trình với thiết bị cao cấp theo đúng lộ trình đã được tư vấn.',
  },
  {
    num: '05',
    icon: '🌸',
    title: 'Dưỡng Da & Hướng Dẫn',
    time: '10 phút',
    desc: 'Dưỡng da sau liệu trình. Tư vấn chi tiết chăm sóc tại nhà và đặt lịch buổi tiếp theo.',
  },
]

export default function ProcessSection() {
  return (
    <section id="quy-trinh" style={{
      background: LUX.surface2,
      padding: 'clamp(60px,10vw,110px) clamp(20px,4vw,60px)',
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Decorative ambient glow */}
      <div style={{
        position: 'absolute', top: '20%', left: '50%', transform: 'translateX(-50%)',
        width: '70%', maxWidth: 700, height: '60%',
        background: `radial-gradient(ellipse, ${LUX.gold}06 0%, transparent 65%)`,
        pointerEvents: 'none',
      }} />

      <div style={{ maxWidth: 1100, margin: '0 auto', position: 'relative' }}>

        {/* ── Header ── */}
        <div className="lp-anim" style={{ textAlign: 'center', marginBottom: 'clamp(48px,7vw,72px)' }}>
          <div style={{
            display: 'inline-block',
            fontFamily: LUX.fontSans, fontSize: 11, fontWeight: 700,
            color: LUX.champagne, letterSpacing: '3px', textTransform: 'uppercase',
            background: `linear-gradient(135deg,${LUX.gold}20,${LUX.champagne}15)`,
            border: `1px solid ${LUX.gold}40`,
            padding: '6px 20px', borderRadius: 50, marginBottom: 16,
          }}>
            Quy Trình Dịch Vụ
          </div>
          <h2 style={{
            fontFamily: LUX.fontSerif, fontSize: 'clamp(28px,5vw,48px)',
            fontWeight: 600, color: LUX.espresso,
            margin: '0 0 14px', lineHeight: 1.15,
          }}>
            Hành Trình Làm Đẹp<br />
            <em style={{ fontStyle: 'italic', color: LUX.champagne }}>Của Bạn</em>
          </h2>
          <p style={{
            fontFamily: LUX.fontSans, fontSize: 15, color: LUX.ink3,
            maxWidth: 480, margin: '0 auto', lineHeight: 1.72,
          }}>
            Mỗi buổi điều trị được thiết kế như một hành trình — từ khi bước vào đến khi rời khỏi Hannah Spa, bạn luôn cảm thấy được yêu thương.
          </p>
        </div>

        {/* ── Steps ── */}
        <div className="lp-process-row">
          {/* Connector line (desktop only) */}
          <div className="lp-process-line" />

          {STEPS.map((step, i) => (
            <div
              key={step.num}
              className="lp-anim lp-process-step"
              style={{
                transitionDelay: `${i * 0.1}s`,
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', textAlign: 'center',
                position: 'relative', zIndex: 1,
              }}
            >
              {/* Number circle */}
              <div className="lp-process-num" style={{ marginBottom: 20 }}>
                <div style={{
                  width: 56, height: 56, borderRadius: '50%',
                  background: 'white',
                  border: `2px solid ${LUX.gold}35`,
                  boxShadow: `0 4px 18px ${LUX.gold}20, 0 0 0 6px ${LUX.gold}08`,
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto',
                  position: 'relative',
                }}>
                  {/* Step icon */}
                  <div style={{ fontSize: 18, lineHeight: 1 }}>{step.icon}</div>

                  {/* Step number badge */}
                  <div style={{
                    position: 'absolute', top: -6, right: -6,
                    width: 20, height: 20, borderRadius: '50%',
                    background: LUX.goldGrad,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: LUX.fontMono, fontSize: 9, fontWeight: 700, color: 'white',
                    border: '2px solid white',
                  }}>
                    {i + 1}
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="lp-process-content">
                {/* Time tag */}
                <div style={{
                  display: 'inline-block',
                  fontFamily: LUX.fontMono, fontSize: 10,
                  color: LUX.champagne2, letterSpacing: '0.5px',
                  background: `${LUX.gold}12`,
                  border: `1px solid ${LUX.gold}25`,
                  padding: '3px 10px', borderRadius: 50, marginBottom: 10,
                }}>
                  {step.time}
                </div>

                {/* Title */}
                <div style={{
                  fontFamily: LUX.fontSerif, fontSize: 'clamp(15px,2vw,17px)',
                  fontWeight: 600, color: LUX.espresso,
                  marginBottom: 8, lineHeight: 1.3,
                }}>
                  {step.title}
                </div>

                {/* Description */}
                <div style={{
                  fontFamily: LUX.fontSans, fontSize: 13, color: LUX.ink3,
                  lineHeight: 1.68,
                }}>
                  {step.desc}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Bottom CTA strip ── */}
        <div className="lp-anim" style={{
          marginTop: 'clamp(48px,7vw,80px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: 20, flexWrap: 'wrap',
        }}>
          <div style={{
            fontFamily: LUX.fontSerif, fontSize: 'clamp(16px,2.5vw,20px)',
            color: LUX.ink2, fontStyle: 'italic',
          }}>
            "Mỗi liệu trình là một trải nghiệm — không chỉ làm đẹp."
          </div>
          <a href="https://www.facebook.com/hannahspact" target="_blank" rel="noopener noreferrer"
            style={{
              padding: '12px 28px',
              background: LUX.goldGrad,
              color: 'white', textDecoration: 'none', borderRadius: 50,
              fontFamily: LUX.fontSans, fontWeight: 700, fontSize: 14,
              boxShadow: `0 6px 22px ${LUX.gold}40`,
              transition: 'all 0.25s', whiteSpace: 'nowrap',
            }}
            onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
          >
            Đặt Lịch Ngay →
          </a>
        </div>
      </div>
    </section>
  )
}
