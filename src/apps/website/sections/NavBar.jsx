import { useState, useEffect } from 'react'

const LINKS = [
  ['#ve-chung-toi', 'Câu chuyện'],
  ['#dich-vu',      'Dịch vụ'],
  ['#thu-vien',     'Thư viện'],
  ['#danh-gia',     'Đánh giá'],
  ['#dat-lich',     'Đặt lịch'],
]

export default function NavBar() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', h, { passive: true })
    return () => window.removeEventListener('scroll', h)
  }, [])

  return (
    <nav className={`lp-nav ${scrolled ? 'lp-nav-scrolled' : ''}`}>
      <div className="lp-nav-inner lp-container">
        {/* Logo */}
        <a href="#top" className="lp-nav-logo">
          <span className="lp-nav-mark">H</span>
          <span className="lp-nav-text">
            <span className="lp-nav-name">Hannah</span>
            <span className="lp-nav-sub">beauty &amp; spa</span>
          </span>
        </a>

        {/* Desktop links */}
        <div className="lp-nav-links">
          {LINKS.map(([href, vi]) => (
            <a key={href} href={href} className="lp-nav-link">{vi}</a>
          ))}
        </div>

        {/* Actions */}
        <div className="lp-nav-actions">
          <a href="tel:0379080909" className="lp-nav-phone">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 10.8 19.79 19.79 0 010 2.18 2 2 0 012 0h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 14.92z"/>
            </svg>
            0379 080 909
          </a>
          <a href="#dat-lich" className="lp-btn lp-btn-primary lp-nav-cta">
            Đặt lịch <span className="lp-arrow"></span>
          </a>
          <button className="lp-burger" onClick={() => setOpen(v => !v)} aria-label="Menu">
            <span></span><span></span>
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="lp-mobile-menu" onClick={() => setOpen(false)}>
          {LINKS.map(([href, vi]) => (
            <a key={href} href={href} className="lp-mobile-link">{vi}</a>
          ))}
          <a href="#dat-lich" className="lp-btn lp-btn-primary" style={{ marginTop: 16 }}>
            Đặt lịch ngay
          </a>
        </div>
      )}

      <style>{`
        .lp-nav {
          position: fixed; top: 0; left: 0; right: 0; z-index: 50;
          padding: 22px 0;
          transition: background .35s ease, padding .35s ease, border-color .35s;
          border-bottom: 1px solid transparent;
        }
        .lp-nav-scrolled {
          background: rgba(245,240,232,0.92);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          padding: 14px 0;
          border-bottom-color: var(--line);
        }
        .lp-nav-inner {
          display: flex; align-items: center; justify-content: space-between;
          gap: 40px;
        }
        .lp-nav-logo { display: flex; align-items: center; gap: 12px; }
        .lp-nav-mark {
          width: 40px; height: 40px; border-radius: 50%;
          background: var(--ink); color: var(--cream);
          display: flex; align-items: center; justify-content: center;
          font-family: var(--display); font-size: 20px;
          flex-shrink: 0;
        }
        .lp-nav-text { display: flex; flex-direction: column; line-height: 1; gap: 4px; }
        .lp-nav-name { font-family: var(--serif); font-size: 20px; font-weight: 400; letter-spacing: -0.01em; }
        .lp-nav-sub { font-family: var(--mono); font-size: 8px; letter-spacing: 0.24em; text-transform: uppercase; color: var(--ink-mute); }
        .lp-nav-links { display: flex; gap: 32px; }
        .lp-nav-link {
          font-size: 13px; color: var(--ink); position: relative; padding: 4px 0;
          transition: color .2s;
        }
        .lp-nav-link::after {
          content: ""; position: absolute; bottom: -2px; left: 50%;
          width: 0; height: 1px; background: var(--terracotta);
          transition: width .3s, left .3s;
        }
        .lp-nav-link:hover::after { width: 60%; left: 20%; }
        .lp-nav-actions { display: flex; align-items: center; gap: 14px; }
        .lp-nav-phone {
          display: flex; align-items: center; gap: 6px;
          font-family: var(--mono); font-size: 11px; letter-spacing: 0.12em;
          color: var(--ink-soft); transition: color .2s;
        }
        .lp-nav-phone:hover { color: var(--terracotta); }
        .lp-nav-cta { padding: 12px 20px !important; font-size: 11px !important; }
        .lp-burger {
          display: none; flex-direction: column; gap: 5px;
          width: 32px; height: 32px;
          align-items: center; justify-content: center;
        }
        .lp-burger span { display: block; width: 22px; height: 1px; background: var(--ink); }
        .lp-mobile-menu {
          position: fixed; inset: 0; top: 68px;
          background: var(--bg); z-index: 49;
          padding: 48px 24px;
          display: flex; flex-direction: column; gap: 32px;
          align-items: center;
        }
        .lp-mobile-link { font-family: var(--serif); font-size: 30px; color: var(--ink); }
        @media (max-width: 900px) {
          .lp-nav-links, .lp-nav-phone { display: none; }
          .lp-burger { display: flex; }
          .lp-nav-cta { display: none !important; }
        }
      `}</style>
    </nav>
  )
}
