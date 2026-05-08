/* global React */
function Hero() {
  return (
    <section id="top" className="hs-hero" data-screen-label="01 Hero">
      <div className="hs-hero-grain"></div>

      <div className="hs-hero-grid container">
        <div className="hs-hero-side hs-hero-side-l">
          <div className="hs-hero-meta">
            <span className="label">Est. 2014</span>
            <span className="hs-hero-divider"></span>
            <span className="label">Sài Gòn · Việt Nam</span>
          </div>
          <div className="hs-hero-vert">
            <span>Scroll</span>
            <span className="hs-hero-vert-line"></span>
            <span>↓</span>
          </div>
        </div>

        <div className="hs-hero-center">
          <div className="eyebrow reveal in"><span className="dot"></span>Hannah Spa & Wellness</div>
          <h1 className="hs-hero-title reveal in">
            Nghệ thuật<br/>
            <em>chạm đến</em><br/>
            thân &amp; tâm
          </h1>
          <p className="hs-hero-bilingual">The art of touching body &amp; soul</p>

          <div className="hs-hero-actions">
            <a href="#booking" className="btn btn-primary">Đặt lịch trị liệu <span className="arrow"></span></a>
            <a href="#services" className="btn btn-ghost">Khám phá dịch vụ</a>
          </div>
        </div>

        <div className="hs-hero-side hs-hero-side-r">
          <div className="hs-hero-quote">
            <span className="hs-hero-quote-mark">“</span>
            <p>
              Một giờ tại Hannah là một hành trình quay trở về với chính mình —
              chậm hơn một nhịp, sâu hơn một hơi thở.
            </p>
            <span className="hs-hero-quote-author">— Linh Trần, khách hàng từ 2019</span>
          </div>
        </div>
      </div>

      <div className="hs-hero-imagery container">
        <div className="hs-hero-img hs-hero-img-1 ph">
          <span className="ph-label">Therapist hands · close-up · warm light</span>
        </div>
        <div className="hs-hero-img hs-hero-img-2 ph">
          <span className="ph-label">Treatment room · candles · linen</span>
        </div>
        <div className="hs-hero-img hs-hero-img-3 ph">
          <span className="ph-label">Botanical oil pour</span>
        </div>
      </div>

      <div className="hs-hero-stats container">
        <div className="hs-stat">
          <div className="hs-stat-num">11<span>+</span></div>
          <div className="hs-stat-label">Năm kinh nghiệm<br/><span className="bilingual">years of practice</span></div>
        </div>
        <div className="hs-stat">
          <div className="hs-stat-num">28</div>
          <div className="hs-stat-label">Liệu trình độc quyền<br/><span className="bilingual">signature treatments</span></div>
        </div>
        <div className="hs-stat">
          <div className="hs-stat-num">14k<span>+</span></div>
          <div className="hs-stat-label">Khách hàng tin yêu<br/><span className="bilingual">loyal guests</span></div>
        </div>
        <div className="hs-stat">
          <div className="hs-stat-num">4.9</div>
          <div className="hs-stat-label">Đánh giá trung bình<br/><span className="bilingual">average rating</span></div>
        </div>
      </div>

      <style>{`
        .hs-hero {
          padding: 160px 0 100px;
          min-height: 100vh;
          position: relative;
          overflow: hidden;
        }
        .hs-hero-grain {
          position: absolute; inset: 0;
          background:
            radial-gradient(900px 600px at 12% 20%, color-mix(in oklab, var(--champagne) 22%, transparent), transparent 70%),
            radial-gradient(700px 500px at 88% 70%, color-mix(in oklab, var(--sage) 14%, transparent), transparent 70%);
          pointer-events: none;
        }
        .hs-hero-grid {
          display: grid;
          grid-template-columns: 1fr 2fr 1fr;
          gap: 40px;
          position: relative;
          z-index: 2;
          align-items: stretch;
        }
        .hs-hero-side { display: flex; flex-direction: column; justify-content: space-between; }
        .hs-hero-side-l { padding-top: 8px; }
        .hs-hero-meta {
          display: flex; flex-direction: column; gap: 10px;
        }
        .hs-hero-divider {
          width: 28px; height: 1px; background: var(--line);
        }
        .hs-hero-vert {
          writing-mode: vertical-rl;
          transform: rotate(180deg);
          display: flex; align-items: center; gap: 14px;
          font-family: var(--mono); font-size: 10px;
          letter-spacing: 0.28em; text-transform: uppercase;
          color: var(--ink-mute);
          align-self: flex-start;
        }
        .hs-hero-vert-line {
          width: 1px; height: 50px; background: var(--ink-mute);
        }

        .hs-hero-center { text-align: center; padding-top: 12px; }
        .hs-hero-title {
          font-family: var(--serif);
          font-weight: 300;
          font-size: clamp(56px, 8.5vw, 144px);
          line-height: 0.96;
          letter-spacing: -0.025em;
          margin-top: 28px;
        }
        .hs-hero-title em {
          font-family: var(--display);
          font-style: normal;
          font-weight: 400;
          color: var(--terracotta);
        }
        .hs-hero-bilingual {
          font-family: var(--serif);
          font-style: italic;
          color: var(--ink-mute);
          margin-top: 22px;
          font-size: 18px;
        }
        .hs-hero-actions {
          display: flex; gap: 14px; justify-content: center;
          margin-top: 40px; flex-wrap: wrap;
        }

        .hs-hero-side-r { align-items: flex-end; }
        .hs-hero-quote {
          max-width: 240px;
          padding: 24px 0 0;
          border-top: 1px solid var(--line);
          position: relative;
          align-self: flex-end;
          margin-top: auto;
        }
        .hs-hero-quote-mark {
          position: absolute; top: -42px; right: 0;
          font-family: var(--display);
          font-size: 80px;
          line-height: 1;
          color: var(--terracotta);
        }
        .hs-hero-quote p {
          font-family: var(--serif);
          font-size: 16px;
          font-style: italic;
          line-height: 1.45;
          color: var(--ink-soft);
        }
        .hs-hero-quote-author {
          display: block; margin-top: 14px;
          font-family: var(--mono);
          font-size: 10px;
          letter-spacing: 0.18em; text-transform: uppercase;
          color: var(--ink-mute);
        }

        .hs-hero-imagery {
          margin-top: 80px;
          display: grid;
          grid-template-columns: 1.2fr 1fr 1fr;
          gap: 16px;
          position: relative; z-index: 2;
        }
        .hs-hero-img { border-radius: 4px; }
        .hs-hero-img-1 { aspect-ratio: 4/5; }
        .hs-hero-img-2 { aspect-ratio: 3/4; margin-top: 60px; }
        .hs-hero-img-3 { aspect-ratio: 4/5; margin-top: 30px; }

        .hs-hero-stats {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 24px;
          margin-top: 80px;
          padding-top: 40px;
          border-top: 1px solid var(--line);
          position: relative; z-index: 2;
        }
        .hs-stat-num {
          font-family: var(--serif);
          font-weight: 300;
          font-size: 56px;
          line-height: 1;
          letter-spacing: -0.02em;
        }
        .hs-stat-num span {
          font-family: var(--display);
          color: var(--terracotta);
          font-size: 36px;
          margin-left: 4px;
        }
        .hs-stat-label {
          font-size: 13px;
          color: var(--ink-soft);
          margin-top: 12px;
          line-height: 1.4;
        }

        @media (max-width: 980px) {
          .hs-hero-grid { grid-template-columns: 1fr; }
          .hs-hero-side { display: none; }
          .hs-hero-imagery { grid-template-columns: 1fr 1fr; }
          .hs-hero-img-3 { display: none; }
          .hs-hero-stats { grid-template-columns: repeat(2, 1fr); }
        }
      `}</style>
    </section>
  );
}

window.Hero = Hero;
