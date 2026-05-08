/* global React */
const { useState: useStateSvc } = React;

function Services() {
  const services = [
    {
      no: '01',
      vi: 'Chăm sóc da mặt',
      en: 'Signature Facial',
      desc: 'Liệu trình 6 bước, kết hợp serum vitamin C cô đặc và massage Kobido Nhật Bản giúp da bừng sáng tức thì.',
      duration: '90 phút',
      from: '850K',
      tags: ['Brightening', 'Anti-age', 'Sensitive']
    },
    {
      no: '02',
      vi: 'Massage body toàn thân',
      en: 'Full Body Therapy',
      desc: 'Kỹ thuật Thụy Điển kết hợp huyệt đạo Á Đông, áp suất tùy chỉnh — giải toả căng thẳng sâu tới mô cơ.',
      duration: '75 phút',
      from: '720K',
      tags: ['Deep tissue', 'Lymphatic', 'Relax']
    },
    {
      no: '03',
      vi: 'Trị liệu tinh dầu',
      en: 'Aromatherapy Ritual',
      desc: 'Phối tinh dầu cá nhân hoá theo tình trạng cảm xúc trong ngày — oải hương, đàn hương, ngọc lan tây.',
      duration: '60 phút',
      from: '650K',
      tags: ['Calming', 'Sleep', 'Mood']
    },
    {
      no: '04',
      vi: 'Đá nóng Himalaya',
      en: 'Hot Stone Therapy',
      desc: 'Đá basalt được hâm 52°C, đặt dọc luân xa — sưởi ấm, cân bằng năng lượng và thông kinh lạc.',
      duration: '90 phút',
      from: '980K',
      tags: ['Warming', 'Energy', 'Circulation']
    },
    {
      no: '05',
      vi: 'Gói đôi · Couple Suite',
      en: 'Couple Retreat',
      desc: 'Hai chuyên viên đồng bộ trong phòng đôi riêng tư — cho người thương, cha mẹ, hoặc bạn thân.',
      duration: '120 phút',
      from: '2.4M',
      tags: ['Private', 'Champagne', 'Romantic']
    },
    {
      no: '06',
      vi: 'Tư vấn da chuyên sâu',
      en: 'Skin Consultation',
      desc: 'Soi da công nghệ Visia, phân tích 8 chỉ số và lộ trình 12 tuần được thiết kế riêng.',
      duration: '45 phút',
      from: 'Miễn phí',
      tags: ['Diagnosis', '12-week plan', '1:1']
    },
  ];
  const [active, setActive] = useStateSvc(0);
  const cur = services[active];

  return (
    <section id="services" className="hs-services" data-screen-label="03 Services">
      <div className="container">
        <div className="hs-services-head">
          <div>
            <div className="eyebrow"><span className="dot"></span>Menu dịch vụ · Treatments</div>
            <h2 className="h-section" style={{marginTop: 24}}>
              Sáu liệu trình<br/>
              <em>được thiết kế</em><br/>
              cho từng nhịp sống.
            </h2>
          </div>
          <p className="lede" style={{maxWidth: 460}}>
            Mỗi liệu trình là một hành trình riêng — bắt đầu bằng một tách trà
            ấm, kết thúc trong sự nhẹ bẫng của thân thể đã được lắng nghe.
          </p>
        </div>

        <div className="hs-services-body">
          <ul className="hs-services-list">
            {services.map((s, i) => (
              <li
                key={s.no}
                className={`hs-svc-row ${i === active ? 'active' : ''}`}
                onMouseEnter={() => setActive(i)}
                onClick={() => setActive(i)}
              >
                <span className="hs-svc-no">{s.no}</span>
                <div className="hs-svc-name">
                  <div className="hs-svc-vi">{s.vi}</div>
                  <div className="hs-svc-en">{s.en}</div>
                </div>
                <span className="hs-svc-duration">{s.duration}</span>
                <span className="hs-svc-from">từ <em>{s.from}</em></span>
                <span className="hs-svc-arrow">→</span>
              </li>
            ))}
          </ul>

          <div className="hs-services-preview">
            <div className="hs-svc-preview-img ph">
              <span className="ph-label">{cur.en} · room atmosphere</span>
            </div>
            <div className="hs-svc-preview-info">
              <div className="hs-svc-preview-no">{cur.no} / 06</div>
              <h3 className="hs-svc-preview-title">{cur.vi}</h3>
              <p className="hs-svc-preview-en">{cur.en}</p>
              <p className="hs-svc-preview-desc">{cur.desc}</p>
              <div className="hs-svc-preview-tags">
                {cur.tags.map(t => <span key={t}>{t}</span>)}
              </div>
              <a href="#booking" className="btn btn-primary" style={{marginTop: 28}}>
                Đặt liệu trình này <span className="arrow"></span>
              </a>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .hs-services { background: var(--bg-alt); }
        .hs-services-head {
          display: grid;
          grid-template-columns: 1.4fr 1fr;
          gap: 80px;
          align-items: end;
          margin-bottom: 80px;
        }
        .hs-services-body {
          display: grid;
          grid-template-columns: 1.1fr 1fr;
          gap: 60px;
          align-items: start;
        }
        .hs-services-list {
          list-style: none;
          border-top: 1px solid var(--line);
        }
        .hs-svc-row {
          display: grid;
          grid-template-columns: 60px 1fr auto auto 24px;
          gap: 24px;
          padding: 28px 0;
          border-bottom: 1px solid var(--line);
          align-items: center;
          cursor: pointer;
          transition: padding .35s ease, color .25s;
        }
        .hs-svc-row.active {
          padding-left: 16px;
          padding-right: 16px;
          background: color-mix(in oklab, var(--cream) 60%, transparent);
        }
        .hs-svc-no {
          font-family: var(--display);
          font-size: 22px;
          color: var(--terracotta);
        }
        .hs-svc-vi {
          font-family: var(--serif);
          font-size: 26px;
          font-weight: 400;
          line-height: 1.1;
        }
        .hs-svc-en {
          font-family: var(--mono);
          font-size: 10px;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: var(--ink-mute);
          margin-top: 4px;
        }
        .hs-svc-duration {
          font-size: 13px;
          color: var(--ink-soft);
        }
        .hs-svc-from {
          font-size: 13px;
          color: var(--ink-soft);
        }
        .hs-svc-from em {
          font-family: var(--serif);
          font-style: normal;
          font-size: 22px;
          font-weight: 400;
          color: var(--ink);
          margin-left: 6px;
        }
        .hs-svc-arrow {
          color: var(--ink-mute);
          transition: transform .3s, color .3s;
        }
        .hs-svc-row.active .hs-svc-arrow {
          color: var(--terracotta);
          transform: translateX(4px);
        }

        .hs-services-preview {
          position: sticky; top: 100px;
          background: var(--bg);
          border-radius: 4px;
          overflow: hidden;
        }
        .hs-svc-preview-img {
          aspect-ratio: 4/3;
          width: 100%;
        }
        .hs-svc-preview-info {
          padding: 36px;
        }
        .hs-svc-preview-no {
          font-family: var(--mono);
          font-size: 11px;
          letter-spacing: 0.22em;
          color: var(--ink-mute);
        }
        .hs-svc-preview-title {
          font-family: var(--serif);
          font-size: 38px;
          font-weight: 400;
          line-height: 1.05;
          margin-top: 12px;
        }
        .hs-svc-preview-en {
          font-family: var(--display);
          color: var(--terracotta);
          margin-top: 6px;
          font-size: 18px;
        }
        .hs-svc-preview-desc {
          color: var(--ink-soft);
          margin-top: 18px;
          font-size: 15px;
          line-height: 1.6;
        }
        .hs-svc-preview-tags {
          display: flex; flex-wrap: wrap; gap: 8px;
          margin-top: 22px;
        }
        .hs-svc-preview-tags span {
          font-family: var(--mono);
          font-size: 10px;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          padding: 6px 10px;
          border: 1px solid var(--line);
          border-radius: 999px;
          color: var(--ink-soft);
        }

        @media (max-width: 980px) {
          .hs-services-head { grid-template-columns: 1fr; gap: 32px; }
          .hs-services-body { grid-template-columns: 1fr; }
          .hs-svc-row { grid-template-columns: 40px 1fr auto; }
          .hs-svc-row .hs-svc-duration,
          .hs-svc-row .hs-svc-arrow { display: none; }
          .hs-services-preview { position: static; }
        }
      `}</style>
    </section>
  );
}
window.Services = Services;
