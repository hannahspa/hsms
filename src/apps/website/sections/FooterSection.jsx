const LINKS = [
  {
    heading: 'Khám phá',
    items: [
      { href: '#ve-chung-toi', label: 'Câu chuyện' },
      { href: '#dich-vu',      label: 'Dịch vụ' },
      { href: '#thu-vien',     label: 'Thư viện' },
      { href: '#danh-gia',     label: 'Đánh giá' },
    ],
  },
  {
    heading: 'Hỗ trợ',
    items: [
      { href: '#dat-lich',     label: 'Đặt lịch' },
      { href: '#faq',          label: 'FAQ' },
      { href: 'tel:0379080909',label: 'Gọi ngay' },
      { href: 'https://www.facebook.com/hannahspact', label: 'Facebook' },
    ],
  },
  {
    heading: 'Theo dõi',
    items: [
      { href: 'https://www.facebook.com/hannahspact', label: 'Facebook' },
      { href: '#', label: 'Instagram' },
      { href: '#', label: 'TikTok' },
      { href: '#', label: 'YouTube' },
    ],
  },
]

export default function FooterSection() {
  return (
    <footer className="lp-foot">
      <div className="lp-container">
        <div className="lp-foot-top">
          {/* Brand */}
          <div className="lp-foot-brand">
            <div className="lp-foot-logo">
              <span className="lp-foot-mark">H</span>
              <span>
                <span className="lp-foot-name">Hannah</span>
                <span className="lp-foot-sub">beauty &amp; spa</span>
              </span>
            </div>
            <p className="lp-foot-tagline">
              Nơi sắc đẹp và sự thư giãn gặp nhau —<br />một điểm đến, ngàn kỷ niệm.
            </p>
            <div className="lp-foot-address">
              <div>📍 39 Nam Kỳ Khởi Nghĩa, P.Tân An</div>
              <div>Ninh Kiều, Cần Thơ</div>
              <div style={{ marginTop: 8 }}>📞 0379 080 909</div>
              <div>💬 fb.com/hannahspact</div>
            </div>
          </div>

          {/* Link columns */}
          <div className="lp-foot-cols">
            {LINKS.map(col => (
              <div key={col.heading}>
                <div className="lp-label lp-foot-col-head">{col.heading}</div>
                {col.items.map(item => (
                  <a
                    key={item.label}
                    href={item.href}
                    target={item.href.startsWith('http') ? '_blank' : undefined}
                    rel={item.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                    className="lp-foot-link"
                  >
                    {item.label}
                  </a>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Bottom bar */}
        <div className="lp-foot-bot">
          <div>© 2019–2026 Hannah Beauty &amp; Spa · Cần Thơ, Việt Nam</div>
          <div className="lp-foot-bot-r">
            <a href="#">Chính sách bảo mật</a>
            <a href="#">Điều khoản</a>
          </div>
        </div>
      </div>

      {/* Mega text */}
      <div className="lp-foot-mega" aria-hidden="true">Hannah</div>

      <style>{`
        .lp-foot {
          background: var(--bg-deep); color: var(--cream);
          padding: 100px 0 0; position: relative; overflow: hidden;
        }
        .lp-foot-top {
          display: grid; grid-template-columns: 1fr 1.5fr;
          gap: 80px; padding-bottom: 80px;
        }
        .lp-foot-logo { display: flex; align-items: center; gap: 14px; }
        .lp-foot-mark {
          width: 46px; height: 46px; border-radius: 50%;
          background: var(--cream); color: var(--ink);
          display: flex; align-items: center; justify-content: center;
          font-family: var(--display); font-size: 22px; flex-shrink: 0;
        }
        .lp-foot-name { display: block; font-family: var(--serif); font-size: 24px; }
        .lp-foot-sub {
          font-family: var(--mono); font-size: 9px;
          letter-spacing: 0.24em; text-transform: uppercase; color: var(--champagne);
        }
        .lp-foot-tagline {
          margin-top: 22px; font-family: var(--serif);
          font-size: 17px; font-style: italic; opacity: 0.72;
          max-width: 300px; line-height: 1.5;
        }
        .lp-foot-address {
          margin-top: 20px; font-size: 13px;
          color: rgba(212,184,150,0.72); line-height: 1.7;
          font-family: var(--mono); letter-spacing: 0.04em;
        }
        .lp-foot-cols {
          display: grid; grid-template-columns: repeat(3, 1fr); gap: 36px;
        }
        .lp-foot-cols > div { display: flex; flex-direction: column; gap: 14px; }
        .lp-foot-col-head { color: var(--champagne); margin-bottom: 6px; }
        .lp-foot-link {
          font-family: var(--serif); font-size: 18px;
          opacity: 0.8; transition: opacity .2s, color .2s;
        }
        .lp-foot-link:hover { color: var(--champagne); opacity: 1; }
        .lp-foot-bot {
          display: flex; justify-content: space-between; gap: 24px;
          padding: 24px 0; border-top: 1px solid rgba(212,184,150,0.12);
          font-size: 11px; opacity: 0.55; flex-wrap: wrap;
          font-family: var(--mono); letter-spacing: 0.06em;
        }
        .lp-foot-bot-r { display: flex; gap: 20px; }
        .lp-foot-mega {
          font-family: var(--display);
          font-size: clamp(140px, 26vw, 440px);
          line-height: 0.78; text-align: center;
          color: rgba(212,184,150,0.05);
          padding: 0 0 60px; letter-spacing: -0.04em;
          user-select: none;
        }
        @media (max-width: 900px) {
          .lp-foot-top { grid-template-columns: 1fr; gap: 56px; }
          .lp-foot-cols { grid-template-columns: 1fr 1fr; }
        }
      `}</style>
    </footer>
  )
}
