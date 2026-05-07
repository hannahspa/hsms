import { LUX } from '../../../constants/lux'

// TODO: Thay bằng review thật từ khách hàng
const REVIEWS = [
  {
    name: 'Nguyễn Thị Lan Anh', initials: 'LA',
    service: 'Chăm Sóc Da Mặt', time: '2 tuần trước',
    bg: 'linear-gradient(135deg,#c8956a,#a0714f)',
    text: 'Mình đã đến Hannah Spa được 6 tháng, da mình thay đổi rõ rệt! Các bạn kỹ thuật viên rất tận tâm, giải thích kỹ từng bước điều trị. Không gian spa ấm cúng, sạch sẽ. Chắc chắn sẽ tiếp tục ủng hộ!',
  },
  {
    name: 'Trần Minh Châu', initials: 'MC',
    service: 'Massage Thư Giãn', time: '1 tháng trước',
    bg: 'linear-gradient(135deg,#7a9a6a,#5a7a4a)',
    text: 'Sau một tuần làm việc căng thẳng, được massage tại Hannah Spa là điều tuyệt vời nhất. Kỹ thuật massage rất chuyên nghiệp, tinh dầu thơm dịu, nhạc nhẹ nhàng thư giãn. Cảm giác hoàn toàn được "sạc lại năng lượng"!',
  },
  {
    name: 'Phạm Hoàng My', initials: 'HM',
    service: 'Liệu Trình Combo', time: '3 tuần trước',
    bg: 'linear-gradient(135deg,#b87a6a,#8a5040)',
    text: 'Đăng ký gói combo 3 tháng, tiết kiệm được khá nhiều mà chất lượng dịch vụ rất tốt. Đặc biệt dịch vụ triệt lông rất ít đau, hiệu quả cao. Nhân viên nhiệt tình, luôn tư vấn phù hợp với từng người.',
  },
]

export default function TestimonialsSection() {
  return (
    <section style={{ background: LUX.surface, padding: 'clamp(60px,10vw,100px) clamp(20px,5vw,60px)' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>

        {/* Header */}
        <div className="lp-anim" style={{ textAlign: 'center', marginBottom: 'clamp(36px,5vw,56px)' }}>
          <div style={{
            display: 'inline-block',
            fontFamily: LUX.fontSans, fontSize: 11, fontWeight: 700,
            color: LUX.champagne, letterSpacing: '3px', textTransform: 'uppercase',
            background: `linear-gradient(135deg,${LUX.gold}20,${LUX.champagne}15)`,
            border: `1px solid ${LUX.gold}40`,
            padding: '6px 20px', borderRadius: 50, marginBottom: 16,
          }}>
            Đánh Giá
          </div>
          <h2 style={{
            fontFamily: LUX.fontSerif, fontSize: 'clamp(28px,5vw,44px)',
            fontWeight: 600, color: LUX.espresso,
            margin: '0 0 12px', lineHeight: 1.2,
          }}>
            Khách Hàng Nói Gì
          </h2>
          <p style={{
            fontFamily: LUX.fontSans, fontSize: 15, color: LUX.ink3,
            maxWidth: 460, margin: '0 auto', lineHeight: 1.7,
          }}>
            Hơn 1000 khách hàng đã tin tưởng và yêu thích dịch vụ tại Hannah Spa
          </p>
        </div>

        {/* Review cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 20 }}>
          {REVIEWS.map((r, i) => (
            <div key={r.name} className="lp-anim" style={{ transitionDelay: `${i * 0.1}s` }}>
              <div style={{
                background: LUX.surface2, borderRadius: LUX.radius,
                padding: '28px 24px',
                border: `1px solid ${LUX.line}`,
                boxShadow: LUX.shadowSm,
                height: '100%', boxSizing: 'border-box',
                display: 'flex', flexDirection: 'column',
              }}>
                {/* Stars */}
                <div style={{ fontSize: 14, marginBottom: 16, letterSpacing: 2 }}>⭐⭐⭐⭐⭐</div>

                {/* Review text */}
                <div style={{
                  fontFamily: LUX.fontSans, fontSize: 14, color: LUX.ink2,
                  lineHeight: 1.75, flex: 1, marginBottom: 20, fontStyle: 'italic',
                }}>
                  "{r.text}"
                </div>

                {/* Author */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingTop: 16, borderTop: `1px solid ${LUX.line}` }}>
                  <div style={{
                    width: 42, height: 42, borderRadius: '50%',
                    background: r.bg,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: LUX.fontSans, fontSize: 14, fontWeight: 700, color: 'white',
                    flexShrink: 0,
                  }}>
                    {r.initials}
                  </div>
                  <div>
                    <div style={{ fontFamily: LUX.fontSans, fontSize: 14, fontWeight: 700, color: LUX.espresso }}>
                      {r.name}
                    </div>
                    <div style={{ fontFamily: LUX.fontSans, fontSize: 11, color: LUX.ink3, marginTop: 2 }}>
                      {r.service} · {r.time}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
