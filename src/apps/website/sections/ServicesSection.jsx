import { useState } from 'react'
import { IMMERSION_SECTIONS, ABOUT_IMG } from '../../../constants/galleryImages'

const SERVICES = [
  {
    no: '01',
    vi: 'Gội đầu dưỡng sinh',
    en: 'Scalp & Hair Therapy',
    desc: '5 giường gội cao cấp — massage đầu dưỡng sinh kết hợp tinh dầu thảo mộc, thư giãn hệ thần kinh, phục hồi sức sống cho da đầu và tóc. Chỉ 60 phút, căng thẳng cả tuần tan biến.',
    duration: '45 – 60 phút',
    from: 'Liên hệ',
    tags: ['Massage đầu', 'Tinh dầu', 'Thư giãn'],
    img: IMMERSION_SECTIONS[2].images[0],
  },
  {
    no: '02',
    vi: 'Massage body & đá nóng',
    en: 'Body Massage & Hot Stone',
    desc: 'Kết hợp kỹ thuật massage toàn thân với nhiệt đá bazan tự nhiên — thư giãn cơ sâu, kích thích tuần hoàn, giải phóng độc tố. Cảm giác nhẹ bẫng và tái sinh sau mỗi buổi.',
    duration: '60 – 90 phút',
    from: 'Liên hệ',
    tags: ['Đá nóng', 'Thư giãn cơ', 'Detox'],
    img: IMMERSION_SECTIONS[1].images[1],
  },
  {
    no: '03',
    vi: 'Triệt lông công nghệ cao',
    en: 'Advanced Laser Hair Removal',
    desc: 'Công nghệ laser thế hệ mới — an toàn, không đau, hiệu quả vĩnh viễn sau 6–8 buổi. Phòng riêng tư, chuyên viên được đào tạo chuyên sâu, phù hợp mọi loại da.',
    duration: '30 – 60 phút',
    from: 'Liên hệ',
    tags: ['Không đau', 'Vĩnh viễn', 'An toàn'],
    img: IMMERSION_SECTIONS[3].images[0],
  },
  {
    no: '04',
    vi: 'Chăm sóc da công nghệ cao',
    en: 'Advanced Skin Care',
    desc: 'Phân tích da chuyên sâu kết hợp thiết bị hiện đại — điều trị mụn, trắng sáng, chống lão hóa, thu nhỏ lỗ chân lông. Liệu trình cá nhân hóa cho từng loại da.',
    duration: '60 – 90 phút',
    from: 'Liên hệ',
    tags: ['Công nghệ', 'Cá nhân hóa', 'Hiệu quả'],
    img: IMMERSION_SECTIONS[1].images[0],
  },
  {
    no: '05',
    vi: 'Tắm trắng & giảm béo',
    en: 'Whitening & Slimming Therapy',
    desc: 'Liệu trình tắm trắng toàn thân với tinh chất thiên nhiên kết hợp công nghệ giảm béo không xâm lấn — da trắng sáng, săn chắc, vóc dáng thon gọn hiệu quả.',
    duration: '60 – 120 phút',
    from: 'Liên hệ',
    tags: ['Trắng sáng', 'Săn chắc', 'Thon gọn'],
    img: ABOUT_IMG,
  },
]

export default function ServicesSection() {
  const [active, setActive] = useState(0)
  const cur = SERVICES[active]

  return (
    <section id="dich-vu" className="lp-svc-section">
      <div className="lp-container">
        {/* Header */}
        <div className="lp-section-head lp-reveal">
          <div>
            <div className="lp-eyebrow"><span className="lp-dot"></span>Menu dịch vụ · Treatments</div>
            <h2 className="lp-h-section" style={{ marginTop: 24 }}>
              Năm liệu trình<br/>
              <em>được thiết kế</em><br/>
              cho từng bạn.
            </h2>
          </div>
          <p className="lp-lede">
            Mỗi dịch vụ là một hành trình riêng — bắt đầu bằng nụ cười
            đón tiếp, kết thúc trong cảm giác nhẹ bẫng và tươi mới.
          </p>
        </div>

        {/* Body */}
        <div className="lp-svc-body">
          {/* List */}
          <ul className="lp-svc-list">
            {SERVICES.map((s, i) => (
              <li
                key={s.no}
                className={`lp-svc-row ${i === active ? 'active' : ''}`}
                onMouseEnter={() => setActive(i)}
                onClick={() => setActive(i)}
              >
                <span className="lp-svc-no">{s.no}</span>
                <div className="lp-svc-name">
                  <div className="lp-svc-vi">{s.vi}</div>
                  <div className="lp-svc-en">{s.en}</div>
                </div>
                <span className="lp-svc-duration">{s.duration}</span>
                <span className="lp-svc-arrow">→</span>
              </li>
            ))}
          </ul>

          {/* Preview */}
          <div className="lp-svc-preview">
            <div className="lp-svc-preview-img">
              <img src={cur.img} alt={cur.vi} key={cur.no} />
            </div>
            <div className="lp-svc-preview-info">
              <div className="lp-label">{cur.no} / 05</div>
              <h3 className="lp-svc-preview-title">{cur.vi}</h3>
              <p className="lp-svc-preview-en">{cur.en}</p>
              <p className="lp-svc-preview-desc">{cur.desc}</p>
              <div className="lp-svc-preview-tags">
                {cur.tags.map(t => <span key={t}>{t}</span>)}
              </div>
              <a href="https://www.facebook.com/hannahspact" target="_blank" rel="noopener noreferrer"
                className="lp-btn lp-btn-primary" style={{ marginTop: 28 }}>
                Đặt dịch vụ này <span className="lp-arrow"></span>
              </a>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .lp-svc-section { background: var(--bg-alt); }
        .lp-svc-body {
          display: grid;
          grid-template-columns: 1.1fr 1fr;
          gap: 60px; align-items: start;
        }
        .lp-svc-list { list-style: none; border-top: 1px solid var(--line); }
        .lp-svc-row {
          display: grid;
          grid-template-columns: 56px 1fr auto 24px;
          gap: 20px; padding: 24px 0;
          border-bottom: 1px solid var(--line);
          align-items: center; cursor: pointer;
          transition: padding .35s ease;
        }
        .lp-svc-row.active {
          padding-left: 14px; padding-right: 14px;
          background: rgba(250,246,238,0.6);
        }
        .lp-svc-no { font-family: var(--display); font-size: 20px; color: var(--terracotta); }
        .lp-svc-vi { font-family: var(--serif); font-size: 24px; font-weight: 400; line-height: 1.1; }
        .lp-svc-en { font-family: var(--mono); font-size: 9px; letter-spacing: 0.18em; text-transform: uppercase; color: var(--ink-mute); margin-top: 4px; }
        .lp-svc-duration { font-size: 12px; color: var(--ink-soft); }
        .lp-svc-from { font-size: 12px; color: var(--ink-soft); }
        .lp-svc-from em { font-family: var(--serif); font-style: normal; font-size: 20px; font-weight: 400; color: var(--ink); margin-left: 6px; }
        .lp-svc-arrow { color: var(--ink-mute); transition: transform .3s, color .3s; }
        .lp-svc-row.active .lp-svc-arrow { color: var(--terracotta); transform: translateX(4px); }
        .lp-svc-preview {
          position: sticky; top: 100px;
          background: var(--bg); border-radius: 16px; overflow: hidden;
        }
        .lp-svc-preview-img { aspect-ratio: 4/3; width: 100%; overflow: hidden; }
        .lp-svc-preview-img img { width: 100%; height: 100%; object-fit: cover; transition: opacity .4s; }
        .lp-svc-preview-info { padding: 32px; }
        .lp-svc-preview-title { font-family: var(--serif); font-size: 34px; font-weight: 400; line-height: 1.05; margin-top: 10px; }
        .lp-svc-preview-en { font-family: var(--display); font-style: italic; color: var(--terracotta); margin-top: 6px; font-size: 17px; }
        .lp-svc-preview-desc { color: var(--ink-soft); margin-top: 16px; font-size: 14px; line-height: 1.65; }
        .lp-svc-preview-tags { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 20px; }
        .lp-svc-preview-tags span {
          font-family: var(--mono); font-size: 9px;
          letter-spacing: 0.16em; text-transform: uppercase;
          padding: 5px 10px; border: 1px solid var(--line);
          border-radius: 999px; color: var(--ink-soft);
        }
        @media (max-width: 900px) {
          .lp-svc-body { grid-template-columns: 1fr; }
          .lp-svc-row { grid-template-columns: 40px 1fr 24px; }
          .lp-svc-row .lp-svc-duration { display: none; }
          .lp-svc-preview { position: static; }
        }
      `}</style>
    </section>
  )
}
