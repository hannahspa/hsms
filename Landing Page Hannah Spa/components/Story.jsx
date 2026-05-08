/* global React */
function Story() {
  return (
    <section id="story" className="hs-story" data-screen-label="02 Story">
      <div className="container">
        <div className="hs-story-grid">
          <div className="hs-story-images">
            <div className="hs-story-img hs-story-img-main ph">
              <span className="ph-label">Founder portrait · Hannah Nguyễn</span>
            </div>
            <div className="hs-story-img hs-story-img-secondary ph">
              <span className="ph-label">Apothecary shelf · botanicals</span>
            </div>
            <div className="hs-story-badge">
              <div className="hs-story-badge-num">2014</div>
              <div className="hs-story-badge-label">Established</div>
            </div>
          </div>

          <div className="hs-story-content">
            <div className="eyebrow"><span className="dot"></span>Câu chuyện · Our story</div>
            <h2 className="h-section">
              Một không gian nhỏ,<br/>
              <em>nhịp thở chậm,</em><br/>
              tâm an mỗi ngày.
            </h2>
            <p className="lede" style={{marginTop: 28}}>
              Hannah Spa được sinh ra từ niềm tin rằng vẻ đẹp đích thực bắt đầu
              từ sự bình an bên trong. Chúng tôi kết hợp y học cổ truyền Á Đông
              với khoa học chăm sóc da hiện đại — trong một không gian được
              chăm chút đến từng chi tiết.
            </p>

            <div className="hs-story-pillars">
              <div className="hs-pillar">
                <div className="hs-pillar-num">01</div>
                <div className="hs-pillar-title">Nguyên liệu thuần khiết</div>
                <div className="hs-pillar-en">Pure ingredients</div>
                <p>Tinh dầu cô lạnh, thảo mộc hữu cơ trồng tại Đà Lạt, không paraben.</p>
              </div>
              <div className="hs-pillar">
                <div className="hs-pillar-num">02</div>
                <div className="hs-pillar-title">Chuyên viên tận tâm</div>
                <div className="hs-pillar-en">Devoted therapists</div>
                <p>Đội ngũ được đào tạo 800+ giờ, am hiểu giải phẫu và năng lượng.</p>
              </div>
              <div className="hs-pillar">
                <div className="hs-pillar-num">03</div>
                <div className="hs-pillar-title">Không gian như nhà</div>
                <div className="hs-pillar-en">A second home</div>
                <p>Sáu phòng riêng tư, ánh nến, hương trầm và sự tĩnh tại tuyệt đối.</p>
              </div>
            </div>

            <div style={{marginTop: 40}}>
              <a href="#team" className="btn btn-ghost">Gặp đội ngũ <span className="arrow"></span></a>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .hs-story { background: var(--bg); }
        .hs-story-grid {
          display: grid;
          grid-template-columns: 1fr 1.1fr;
          gap: 100px;
          align-items: start;
        }
        .hs-story-images {
          position: relative;
          height: 720px;
        }
        .hs-story-img-main {
          position: absolute;
          top: 0; left: 0;
          width: 78%;
          height: 540px;
          border-radius: 4px;
        }
        .hs-story-img-secondary {
          position: absolute;
          bottom: 0; right: 0;
          width: 60%;
          height: 280px;
          border-radius: 4px;
        }
        .hs-story-badge {
          position: absolute;
          top: 480px; left: 0;
          background: var(--ink);
          color: var(--cream);
          width: 130px; height: 130px;
          border-radius: 50%;
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          z-index: 2;
        }
        .hs-story-badge-num {
          font-family: var(--display);
          font-size: 38px;
        }
        .hs-story-badge-label {
          font-family: var(--mono);
          font-size: 10px;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          margin-top: 4px;
          color: var(--champagne);
        }
        .hs-story-content { padding-top: 20px; }
        .hs-story-pillars {
          margin-top: 56px;
          display: grid; gap: 36px;
        }
        .hs-pillar {
          display: grid;
          grid-template-columns: 60px 1fr;
          gap: 24px;
          padding-bottom: 32px;
          border-bottom: 1px solid var(--line);
        }
        .hs-pillar:last-child { border-bottom: none; }
        .hs-pillar-num {
          font-family: var(--display);
          font-size: 28px;
          color: var(--terracotta);
          line-height: 1;
        }
        .hs-pillar-title {
          font-family: var(--serif);
          font-size: 26px;
          font-weight: 400;
          line-height: 1.1;
          grid-column: 2;
        }
        .hs-pillar-en {
          font-family: var(--mono);
          font-size: 10px;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: var(--ink-mute);
          margin-top: 4px;
          grid-column: 2;
        }
        .hs-pillar p {
          color: var(--ink-soft);
          font-size: 15px;
          margin-top: 12px;
          grid-column: 2;
        }

        @media (max-width: 980px) {
          .hs-story-grid { grid-template-columns: 1fr; gap: 60px; }
          .hs-story-images { height: 520px; }
          .hs-story-img-main { height: 380px; width: 80%; }
          .hs-story-img-secondary { height: 200px; }
          .hs-story-badge { top: 340px; width: 100px; height: 100px; }
          .hs-story-badge-num { font-size: 28px; }
        }
      `}</style>
    </section>
  );
}
window.Story = Story;
