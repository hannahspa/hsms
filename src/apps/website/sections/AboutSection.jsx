import { LUX } from '../../../constants/lux'

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

        {/* Visual column */}
        <div className="lp-anim" style={{ position: 'relative' }}>
          {/* Main dark card */}
          <div style={{
            borderRadius: LUX.radiusLg,
            background: 'linear-gradient(145deg,#4a3528,#3d2c20)',
            padding: 'clamp(28px,5vw,48px)',
            boxShadow: LUX.shadowLg,
            position: 'relative', overflow: 'hidden',
          }}>
            <div style={{ position:'absolute',top:'-30%',right:'-20%',width:'70%',height:'70%',background:'radial-gradient(circle,rgba(212,165,116,0.2) 0%,transparent 65%)',borderRadius:'50%',pointerEvents:'none' }} />

            <div style={{
              fontFamily: LUX.fontSerif,
              fontSize: 'clamp(17px,2.8vw,22px)',
              fontStyle: 'italic',
              color: 'rgba(212,165,116,0.88)',
              lineHeight: 1.6, marginBottom: 24,
              position: 'relative',
            }}>
              "Vẻ đẹp thật sự đến từ sự tự tin và chăm sóc bản thân đúng cách."
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width:40,height:40,borderRadius:'50%',background:LUX.goldGrad,display:'flex',alignItems:'center',justifyContent:'center',fontSize:18 }}>
                🌸
              </div>
              <div>
                <div style={{ fontFamily: LUX.fontSans, fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.85)' }}>
                  Hannah Beauty &amp; Spa
                </div>
                <div style={{ fontFamily: LUX.fontSans, fontSize: 11, color: 'rgba(255,255,255,0.38)', marginTop: 2 }}>
                  Cần Thơ · Từ năm 2019
                </div>
              </div>
            </div>

            <div style={{ display:'flex',gap:8,flexWrap:'wrap',marginTop:24,paddingTop:20,borderTop:'1px solid rgba(255,255,255,0.08)' }}>
              {BADGES.map(b => (
                <span key={b} style={{
                  fontFamily: LUX.fontSans, fontSize: 11, fontWeight: 600,
                  color: 'rgba(212,165,116,0.7)',
                  background: 'rgba(212,165,116,0.1)',
                  border: '1px solid rgba(212,165,116,0.2)',
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
