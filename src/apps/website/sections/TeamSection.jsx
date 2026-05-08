import { LUX } from '../../../constants/lux'

const TEAM = [
  {
    name: 'Khánh Duy',
    fullName: 'Đỗ Thị Khánh Duy',
    role: 'Lễ Tân',
    spec: 'Quản lý lịch đặt & chăm sóc khách hàng',
    initials: 'KD',
    grad: 'linear-gradient(135deg, #c8956a 0%, #a0714f 100%)',
    years: '4+ năm',
  },
  {
    name: 'Ngọc Phương',
    fullName: 'Hồ Ngọc Phương',
    role: 'Lễ Tân',
    spec: 'Tư vấn dịch vụ & đón tiếp khách hàng',
    initials: 'NP',
    grad: 'linear-gradient(135deg, #b87a6a 0%, #8a5040 100%)',
    years: '3+ năm',
  },
  {
    name: 'Thúy Hoanh',
    fullName: 'Nguyễn Thị Thúy Hoanh',
    role: 'KTV',
    spec: 'Chăm sóc da mặt & nâng cơ RF',
    initials: 'TH',
    grad: 'linear-gradient(135deg, #c8a675 0%, #9a7a50 100%)',
    years: '5+ năm',
  },
  {
    name: 'Anh Thư',
    fullName: 'Nguyễn Hoàng Anh Thư',
    role: 'KTV',
    spec: 'Triệt lông laser & điều trị da',
    initials: 'AT',
    grad: 'linear-gradient(135deg, #7a9a6a 0%, #5a7a4a 100%)',
    years: '4+ năm',
  },
  {
    name: 'Tường Uyên',
    fullName: 'Nguyễn Thị Tường Uyên',
    role: 'KTV',
    spec: 'Massage thư giãn & body treatment',
    initials: 'TU',
    grad: 'linear-gradient(135deg, #9a8a6a 0%, #7a6a4a 100%)',
    years: '3+ năm',
  },
  {
    name: 'Cẩm My',
    fullName: 'Lê Thị Cẩm My',
    role: 'KTV',
    spec: 'Tắm trắng & chăm sóc body',
    initials: 'CM',
    grad: 'linear-gradient(135deg, #b87a8a 0%, #8a5060 100%)',
    years: '4+ năm',
  },
  {
    name: 'Bé Thôn',
    fullName: 'Trương Thị Bé Thôn',
    role: 'KTV',
    spec: 'Trị mụn chuyên sâu & điều trị thâm',
    initials: 'BT',
    grad: 'linear-gradient(135deg, #6a9a8a 0%, #4a7a6a 100%)',
    years: '2+ năm',
  },
  {
    name: 'Phương Linh',
    fullName: 'Lê Hoàng Phương Linh',
    role: 'KTV',
    spec: 'Chăm sóc da & tư vấn làm đẹp',
    initials: 'PL',
    grad: 'linear-gradient(135deg, #aa7a9a 0%, #7a5070 100%)',
    years: '4+ năm',
  },
  {
    name: 'Hoa Đào',
    fullName: 'Nguyễn Hoa Đào',
    role: 'KTV',
    spec: 'Gội đầu thư giãn & dưỡng tóc',
    initials: 'HĐ',
    grad: 'linear-gradient(135deg, #c8856a 0%, #a0654a 100%)',
    years: '2+ năm',
  },
]

export default function TeamSection() {
  return (
    <section id="doi-ngu" style={{
      background: '#1e120a',
      padding: 'clamp(60px,10vw,110px) clamp(20px,4vw,60px)',
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Ambient glow */}
      <div style={{
        position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
        width: '80%', maxWidth: 800, height: '50%',
        background: `radial-gradient(ellipse, ${LUX.gold}06 0%, transparent 65%)`,
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', bottom: 0, right: '-10%',
        width: '40%', height: '50%',
        background: 'radial-gradient(ellipse at right bottom, rgba(184,122,106,0.06) 0%, transparent 60%)',
        pointerEvents: 'none',
      }} />

      <div style={{ maxWidth: 1100, margin: '0 auto', position: 'relative' }}>

        {/* ── Header ── */}
        <div className="lp-anim" style={{ textAlign: 'center', marginBottom: 'clamp(40px,6vw,64px)' }}>
          <div style={{
            display: 'inline-block',
            fontFamily: LUX.fontSans, fontSize: 11, fontWeight: 700,
            color: 'rgba(212,165,116,0.60)', letterSpacing: '3px', textTransform: 'uppercase',
            border: '1px solid rgba(212,165,116,0.20)',
            padding: '6px 20px', borderRadius: 50, marginBottom: 16,
          }}>
            Đội Ngũ Chuyên Viên
          </div>

          <h2 style={{
            fontFamily: LUX.fontSerif, fontSize: 'clamp(28px,5vw,48px)',
            fontWeight: 600, color: 'rgba(255,255,255,0.90)',
            margin: '0 0 14px', lineHeight: 1.15,
          }}>
            9 Chuyên Viên Tận Tâm
          </h2>

          <p style={{
            fontFamily: LUX.fontSans, fontSize: 15,
            color: 'rgba(255,255,255,0.35)',
            maxWidth: 480, margin: '0 auto', lineHeight: 1.72,
          }}>
            Được đào tạo bài bản và không ngừng nâng cao kỹ năng — đội ngũ Hannah Spa luôn mang đến trải nghiệm tốt nhất cho bạn
          </p>
        </div>

        {/* ── Team grid ── */}
        <div className="lp-team-grid">
          {TEAM.map((member, i) => (
            <div
              key={member.initials}
              className="lp-anim"
              style={{ transitionDelay: `${i * 0.06}s` }}
            >
              <div
                style={{
                  padding: '24px 18px 20px',
                  borderRadius: LUX.radius,
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  textAlign: 'center',
                  transition: 'all 0.3s cubic-bezier(0.22,0.61,0.36,1)',
                  cursor: 'default',
                  position: 'relative',
                  overflow: 'hidden',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.08)'
                  e.currentTarget.style.borderColor = 'rgba(212,165,116,0.18)'
                  e.currentTarget.style.transform = 'translateY(-4px)'
                  e.currentTarget.style.boxShadow = `0 16px 40px rgba(0,0,0,0.30)`
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.04)'
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = 'none'
                }}
              >
                {/* Role badge */}
                <div style={{
                  position: 'absolute', top: 12, right: 12,
                  fontFamily: LUX.fontSans, fontSize: 9, fontWeight: 700,
                  color: member.role === 'Lễ Tân'
                    ? 'rgba(212,165,116,0.85)'
                    : 'rgba(255,255,255,0.30)',
                  letterSpacing: '1px', textTransform: 'uppercase',
                  background: member.role === 'Lễ Tân'
                    ? 'rgba(212,165,116,0.12)'
                    : 'rgba(255,255,255,0.06)',
                  border: member.role === 'Lễ Tân'
                    ? '1px solid rgba(212,165,116,0.20)'
                    : '1px solid rgba(255,255,255,0.08)',
                  padding: '3px 8px', borderRadius: 50,
                }}>
                  {member.role}
                </div>

                {/* Avatar */}
                <div style={{
                  width: 64, height: 64, borderRadius: '50%',
                  background: member.grad,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 14px',
                  fontFamily: LUX.fontSans, fontSize: 18, fontWeight: 800,
                  color: 'white',
                  boxShadow: '0 6px 20px rgba(0,0,0,0.35)',
                  border: '2px solid rgba(255,255,255,0.08)',
                  letterSpacing: '-0.5px',
                }}>
                  {member.initials}
                </div>

                {/* Name */}
                <div style={{
                  fontFamily: LUX.fontSerif, fontSize: 16, fontWeight: 600,
                  color: 'rgba(255,255,255,0.85)',
                  marginBottom: 4,
                }}>
                  {member.name}
                </div>

                {/* Specialty */}
                <div style={{
                  fontFamily: LUX.fontSans, fontSize: 11,
                  color: 'rgba(255,255,255,0.28)',
                  lineHeight: 1.5, marginBottom: 12,
                }}>
                  {member.spec}
                </div>

                {/* Experience */}
                <div style={{
                  display: 'inline-block',
                  fontFamily: LUX.fontMono, fontSize: 10, fontWeight: 600,
                  color: 'rgba(212,165,116,0.60)',
                  letterSpacing: '0.5px',
                  background: 'rgba(212,165,116,0.08)',
                  border: '1px solid rgba(212,165,116,0.15)',
                  padding: '3px 10px', borderRadius: 50,
                }}>
                  {member.years} KN
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Bottom note ── */}
        <div className="lp-anim" style={{
          textAlign: 'center', marginTop: 'clamp(36px,5vw,56px)',
          paddingTop: 'clamp(28px,4vw,40px)',
          borderTop: '1px solid rgba(255,255,255,0.05)',
        }}>
          <div style={{
            fontFamily: "'Dancing Script', cursive",
            fontSize: 'clamp(18px,3vw,24px)',
            color: 'rgba(212,165,116,0.45)',
            lineHeight: 1.6,
          }}>
            "Chúng tôi không chỉ chăm sóc làn da — chúng tôi chăm sóc cảm xúc của bạn."
          </div>
        </div>
      </div>
    </section>
  )
}
