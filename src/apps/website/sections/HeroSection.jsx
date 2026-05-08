import { IMMERSION_SECTIONS } from '../../../constants/galleryImages'

const STATS = [
  { num: '7',   sup: '+', label: 'Năm kinh nghiệm',    sub: 'years of dedication' },
  { num: '9',   sup: '',  label: 'Chuyên viên tay nghề', sub: 'certified therapists' },
  { num: '5K',  sup: '+', label: 'Khách hàng tin yêu',  sub: 'happy guests' },
  { num: '5.0', sup: '',  label: 'Đánh giá trung bình', sub: 'average rating' },
]

// Banner chính — sảnh đón sang trọng
const BANNER = IMMERSION_SECTIONS[0].images[0]

export default function HeroSection() {
  return (
    <section id="top" className="lp-hero">
      {/* Ambient grain overlay */}
      <div className="lp-hero-grain"></div>

      <div className="lp-hero-grid lp-container">
        {/* Left column */}
        <div className="lp-hero-side lp-hero-side-l">
          <div className="lp-hero-meta">
            <span className="lp-label">Est. 2019</span>
            <span className="lp-hero-divider"></span>
            <span className="lp-label">Cần Thơ · Việt Nam</span>
          </div>
          <div className="lp-hero-vert">
            <span>Scroll</span>
            <span className="lp-hero-vert-line"></span>
            <span>↓</span>
          </div>
        </div>

        {/* Center column */}
        <div className="lp-hero-center">
          <div className="lp-eyebrow lp-reveal" style={{ justifyContent: 'center' }}>
            <span className="lp-dot"></span>Hannah Beauty &amp; Spa
          </div>
          <h1 className="lp-h-display lp-hero-title lp-reveal" style={{ transitionDelay: '.08s' }}>
            Giữ mãi<br/>
            <em>nét thanh xuân</em><br/>
            của bạn
          </h1>
          <p className="lp-hero-bilingual lp-reveal" style={{ transitionDelay: '.16s' }}>
            The art of timeless beauty, Cần Thơ
          </p>
          <div className="lp-hero-actions lp-reveal" style={{ transitionDelay: '.22s' }}>
            <a href="#dat-lich" className="lp-btn lp-btn-primary">
              Đặt lịch ngay <span className="lp-arrow"></span>
            </a>
            <a href="#dich-vu" className="lp-btn lp-btn-ghost">Khám phá dịch vụ</a>
          </div>
        </div>

        {/* Right column */}
        <div className="lp-hero-side lp-hero-side-r">
          <div className="lp-hero-quote">
            <span className="lp-hero-quote-mark">"</span>
            <p>
              Đến với Hannah là trở về với chính mình — nơi mỗi buổi chăm sóc là một món quà bạn trao cho bản thân.
            </p>
            <span className="lp-hero-quote-author">— Khách hàng thân thiết từ 2020</span>
          </div>
        </div>
      </div>

      {/* Banner trung tâm */}
      <div className="lp-hero-banner lp-container">
        <div className="lp-hero-banner-wrap">
          <img src={BANNER} alt="Hannah Beauty & Spa — Không gian sang trọng tại Cần Thơ" loading="eager" />
          <div className="lp-hero-banner-overlay">
            <span className="lp-label" style={{ color: 'rgba(250,246,238,0.75)', letterSpacing: '0.22em' }}>
              39 Nam Kỳ Khởi Nghĩa · Ninh Kiều · Cần Thơ · Từ năm 2019
            </span>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="lp-hero-stats lp-container lp-stagger">
        {STATS.map(s => (
          <div key={s.label} className="lp-stat">
            <div className="lp-stat-num">
              {s.num}<span>{s.sup}</span>
            </div>
            <div className="lp-stat-label">
              {s.label}<br />
              <span className="lp-bilingual">{s.sub}</span>
            </div>
          </div>
        ))}
      </div>

      <style>{`
        .lp-hero {
          padding: 160px 0 100px;
          min-height: 100vh;
          position: relative;
          overflow: hidden;
        }
        .lp-hero-grain {
          position: absolute; inset: 0; pointer-events: none;
          background:
            radial-gradient(800px 500px at 10% 15%, rgba(212,184,150,0.22), transparent 70%),
            radial-gradient(600px 400px at 90% 75%, rgba(168,126,92,0.10), transparent 70%);
        }
        .lp-hero-grid {
          display: grid;
          grid-template-columns: 1fr 2fr 1fr;
          gap: 40px;
          position: relative; z-index: 2;
          align-items: stretch;
        }
        .lp-hero-side { display: flex; flex-direction: column; justify-content: space-between; }
        .lp-hero-side-l { padding-top: 8px; }
        .lp-hero-meta { display: flex; flex-direction: column; gap: 10px; }
        .lp-hero-divider { width: 28px; height: 1px; background: var(--line); }
        .lp-hero-vert {
          writing-mode: vertical-rl; transform: rotate(180deg);
          display: flex; align-items: center; gap: 14px;
          font-family: var(--mono); font-size: 9px;
          letter-spacing: 0.28em; text-transform: uppercase;
          color: var(--ink-mute); align-self: flex-start;
        }
        .lp-hero-vert-line { width: 1px; height: 48px; background: var(--ink-mute); }
        .lp-hero-center { text-align: center; padding-top: 12px; }
        .lp-hero-title {
          margin-top: 28px;
          color: var(--ink);
        }
        .lp-hero-title em { color: var(--terracotta); }
        .lp-hero-bilingual {
          font-family: var(--serif); font-style: italic;
          color: var(--ink-mute); margin-top: 20px; font-size: 17px;
        }
        .lp-hero-actions {
          display: flex; gap: 14px; justify-content: center;
          margin-top: 40px; flex-wrap: wrap;
        }
        .lp-hero-side-r { align-items: flex-end; }
        .lp-hero-quote {
          max-width: 240px; padding: 22px 0 0;
          border-top: 1px solid var(--line);
          position: relative; align-self: flex-end; margin-top: auto;
        }
        .lp-hero-quote-mark {
          position: absolute; top: -40px; right: 0;
          font-family: var(--display); font-size: 76px; line-height: 1;
          color: var(--terracotta);
        }
        .lp-hero-quote p {
          font-family: var(--serif); font-size: 15px;
          font-style: italic; line-height: 1.5; color: var(--ink-soft);
        }
        .lp-hero-quote-author {
          display: block; margin-top: 12px;
          font-family: var(--mono); font-size: 9px;
          letter-spacing: 0.18em; text-transform: uppercase; color: var(--ink-mute);
        }
        .lp-hero-banner {
          margin-top: 72px; position: relative; z-index: 2;
        }
        .lp-hero-banner-wrap {
          border-radius: 28px; overflow: hidden;
          aspect-ratio: 16/7;
          position: relative;
          box-shadow: 0 32px 80px -20px rgba(31,27,23,0.28);
        }
        .lp-hero-banner-wrap img { width: 100%; height: 100%; object-fit: cover; }
        .lp-hero-banner-overlay {
          position: absolute; bottom: 0; left: 0; right: 0;
          padding: 20px 32px;
          background: linear-gradient(transparent, rgba(31,27,23,0.52));
          display: flex; align-items: flex-end;
        }
        .lp-hero-stats {
          display: grid; grid-template-columns: repeat(4, 1fr);
          gap: 24px; margin-top: 80px;
          padding-top: 40px; border-top: 1px solid var(--line);
          position: relative; z-index: 2;
        }
        .lp-stat-num {
          font-family: var(--serif); font-weight: 300;
          font-size: 52px; line-height: 1; letter-spacing: -0.02em;
        }
        .lp-stat-num span { font-family: var(--display); color: var(--terracotta); font-size: 32px; margin-left: 3px; }
        .lp-stat-label { font-size: 13px; color: var(--ink-soft); margin-top: 10px; line-height: 1.4; }
        .lp-bilingual { color: var(--ink-mute); font-style: italic; font-family: var(--serif); font-size: 0.82em; }
        @media (max-width: 900px) {
          .lp-hero { padding: 120px 0 80px; min-height: auto; }
          .lp-hero-grid { grid-template-columns: 1fr; }
          .lp-hero-side { display: none; }
          .lp-hero-banner-wrap { aspect-ratio: 4/3; border-radius: 20px; }
          .lp-hero-stats { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 480px) {
          .lp-hero-banner-wrap { aspect-ratio: 1/1; border-radius: 16px; }
        }
      `}</style>
    </section>
  )
}
