import { ABOUT_IMG, HERO_BG } from '../../../constants/galleryImages'

const PILLARS = [
  {
    no: '01',
    vi: 'Chuyên nghiệp tận tâm',
    en: 'Devoted professionals',
    desc: 'Đội ngũ 9 chuyên viên được đào tạo bài bản, luôn chu đáo và cẩn thận trong từng thao tác kỹ thuật.',
  },
  {
    no: '02',
    vi: 'Sản phẩm cao cấp',
    en: 'Premium products',
    desc: 'Sử dụng mỹ phẩm nhập khẩu chính hãng, không paraben — an toàn cho mọi loại da, kể cả da nhạy cảm.',
  },
  {
    no: '03',
    vi: 'Không gian riêng tư',
    en: 'Private sanctuary',
    desc: 'Ba tầng với các phòng điều trị riêng biệt, cửa đóng kín — đảm bảo sự thoải mái và riêng tư tuyệt đối.',
  },
]

export default function AboutSection() {
  return (
    <section id="ve-chung-toi" className="lp-about">
      <div className="lp-container">
        <div className="lp-about-grid">
          {/* Images column */}
          <div className="lp-about-images">
            <div className="lp-about-img-main">
              <img src={ABOUT_IMG} alt="Sảnh đón Hannah Beauty & Spa" loading="lazy" />
            </div>
            <div className="lp-about-img-secondary">
              <img src={HERO_BG} alt="Mặt tiền Hannah Beauty & Spa" loading="lazy" />
            </div>
            <div className="lp-about-badge">
              <div className="lp-about-badge-num">2019</div>
              <div className="lp-about-badge-label">Thành lập</div>
            </div>
          </div>

          {/* Content column */}
          <div className="lp-about-content lp-reveal">
            <div className="lp-eyebrow"><span className="lp-dot"></span>Câu chuyện · Our story</div>
            <h2 className="lp-h-section" style={{ marginTop: 24 }}>
              Không gian nhỏ,<br/>
              <em>tâm huyết lớn,</em><br/>
              nét xuân mãi xanh.
            </h2>
            <p className="lp-lede" style={{ marginTop: 28 }}>
              Thành lập năm 2019 tại trung tâm Ninh Kiều, Hannah Beauty &amp; Spa
              được xây dựng từ niềm tin rằng mỗi người phụ nữ đều xứng đáng
              được chăm sóc trong không gian sang trọng và an toàn.
            </p>

            {/* Pillars */}
            <div className="lp-about-pillars">
              {PILLARS.map(p => (
                <div key={p.no} className="lp-pillar">
                  <div className="lp-pillar-no">{p.no}</div>
                  <div className="lp-pillar-body">
                    <div className="lp-pillar-title">{p.vi}</div>
                    <div className="lp-pillar-en">{p.en}</div>
                    <p className="lp-pillar-desc">{p.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 40 }}>
              <a href="#dich-vu" className="lp-btn lp-btn-ghost">
                Xem dịch vụ <span className="lp-arrow"></span>
              </a>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .lp-about { background: var(--bg); }
        .lp-about-grid {
          display: grid; grid-template-columns: 1fr 1.1fr;
          gap: 100px; align-items: start;
        }
        .lp-about-images { position: relative; height: 680px; }
        .lp-about-img-main {
          position: absolute; top: 0; left: 0;
          width: 78%; height: 520px;
          border-radius: 4px; overflow: hidden;
        }
        .lp-about-img-main img,
        .lp-about-img-secondary img { width: 100%; height: 100%; object-fit: cover; }
        .lp-about-img-secondary {
          position: absolute; bottom: 0; right: 0;
          width: 58%; height: 270px;
          border-radius: 4px; overflow: hidden;
        }
        .lp-about-badge {
          position: absolute; top: 460px; left: 0;
          background: var(--ink); color: var(--cream);
          width: 120px; height: 120px; border-radius: 50%;
          display: flex; flex-direction: column;
          align-items: center; justify-content: center; z-index: 2;
        }
        .lp-about-badge-num { font-family: var(--display); font-size: 32px; }
        .lp-about-badge-label {
          font-family: var(--mono); font-size: 9px;
          letter-spacing: 0.22em; text-transform: uppercase;
          margin-top: 4px; color: var(--champagne);
        }
        .lp-about-content { padding-top: 20px; }
        .lp-about-pillars { margin-top: 52px; display: grid; gap: 0; }
        .lp-pillar {
          display: grid; grid-template-columns: 56px 1fr;
          gap: 20px; padding: 28px 0;
          border-bottom: 1px solid var(--line);
        }
        .lp-pillar:last-child { border-bottom: none; }
        .lp-pillar-no { font-family: var(--display); font-size: 26px; color: var(--terracotta); line-height: 1; padding-top: 4px; }
        .lp-pillar-title { font-family: var(--serif); font-size: 24px; font-weight: 400; line-height: 1.1; }
        .lp-pillar-en { font-family: var(--mono); font-size: 9px; letter-spacing: 0.18em; text-transform: uppercase; color: var(--ink-mute); margin-top: 4px; }
        .lp-pillar-desc { color: var(--ink-soft); font-size: 14px; margin-top: 10px; line-height: 1.6; }
        @media (max-width: 900px) {
          .lp-about-grid { grid-template-columns: 1fr; gap: 60px; }
          .lp-about-images { height: 480px; }
          .lp-about-img-main { height: 340px; width: 80%; }
          .lp-about-img-secondary { height: 190px; }
          .lp-about-badge { top: 300px; width: 96px; height: 96px; }
          .lp-about-badge-num { font-size: 24px; }
        }
      `}</style>
    </section>
  )
}
