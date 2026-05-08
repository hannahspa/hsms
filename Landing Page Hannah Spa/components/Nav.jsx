/* global React */
const { useState, useEffect, useRef } = React;

// ====================== NAV ======================
function Nav({ tweaks, setTweak }) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', h);
    return () => window.removeEventListener('scroll', h);
  }, []);

  const links = [
    ['#story', 'Câu chuyện', 'Story'],
    ['#services', 'Dịch vụ', 'Services'],
    ['#pricing', 'Bảng giá', 'Pricing'],
    ['#team', 'Chuyên viên', 'Team'],
    ['#gallery', 'Thư viện', 'Gallery'],
    ['#booking', 'Đặt lịch', 'Booking'],
  ];

  return (
    <nav className={`hs-nav ${scrolled ? 'scrolled' : ''}`} data-screen-label="Nav">
      <div className="hs-nav-inner container">
        <a href="#top" className="hs-logo">
          <span className="hs-logo-mark">H</span>
          <span className="hs-logo-text">
            <span className="hs-logo-name">Hannah</span>
            <span className="hs-logo-sub">spa & wellness</span>
          </span>
        </a>

        <div className="hs-nav-links">
          {links.map(([href, vi, en]) => (
            <a key={href} href={href} className="hs-nav-link">
              <span>{vi}</span>
              <span className="hs-nav-link-en">{en}</span>
            </a>
          ))}
        </div>

        <div className="hs-nav-actions">
          <button
            className="hs-theme-toggle"
            onClick={() => setTweak('dark', !tweaks.dark)}
            aria-label="Toggle theme"
          >
            {tweaks.dark ? '☀' : '☾'}
          </button>
          <a href="#booking" className="btn btn-primary hs-nav-cta">
            Đặt lịch <span className="arrow"></span>
          </a>
          <button className="hs-burger" onClick={() => setOpen(!open)} aria-label="Menu">
            <span></span><span></span>
          </button>
        </div>
      </div>

      {open && (
        <div className="hs-mobile-menu" onClick={() => setOpen(false)}>
          {links.map(([href, vi]) => (
            <a key={href} href={href} className="hs-mobile-link">{vi}</a>
          ))}
          <a href="#booking" className="btn btn-primary" style={{marginTop: 24}}>Đặt lịch</a>
        </div>
      )}

      <style>{`
        .hs-nav {
          position: fixed; top: 0; left: 0; right: 0; z-index: 50;
          padding: 22px 0;
          transition: background .35s ease, padding .35s ease, border-color .35s;
          border-bottom: 1px solid transparent;
        }
        .hs-nav.scrolled {
          background: color-mix(in oklab, var(--bg) 88%, transparent);
          backdrop-filter: blur(20px);
          padding: 14px 0;
          border-bottom-color: var(--line);
        }
        .hs-nav-inner {
          display: flex; align-items: center; justify-content: space-between;
          gap: 40px;
        }
        .hs-logo { display: flex; align-items: center; gap: 12px; }
        .hs-logo-mark {
          width: 42px; height: 42px;
          border-radius: 50%;
          background: var(--ink);
          color: var(--cream);
          display: flex; align-items: center; justify-content: center;
          font-family: var(--display);
          font-size: 22px;
          letter-spacing: -0.04em;
        }
        .hs-logo-text { display: flex; flex-direction: column; line-height: 1; gap: 4px; }
        .hs-logo-name {
          font-family: var(--serif);
          font-size: 22px;
          font-weight: 400;
          letter-spacing: -0.01em;
        }
        .hs-logo-sub {
          font-family: var(--mono);
          font-size: 9px;
          letter-spacing: 0.24em;
          text-transform: uppercase;
          color: var(--ink-mute);
        }
        .hs-nav-links {
          display: flex; gap: 38px;
        }
        .hs-nav-link {
          font-size: 14px;
          color: var(--ink);
          position: relative;
          padding: 6px 0;
          display: inline-flex;
          flex-direction: column;
          align-items: center;
          line-height: 1.1;
        }
        .hs-nav-link-en {
          font-family: var(--mono);
          font-size: 9px;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: var(--ink-mute);
          margin-top: 3px;
        }
        .hs-nav-link::after {
          content: ""; position: absolute; bottom: -2px; left: 50%;
          width: 0; height: 1px;
          background: var(--terracotta);
          transition: width .3s, left .3s;
        }
        .hs-nav-link:hover::after { width: 60%; left: 20%; }
        .hs-nav-actions { display: flex; align-items: center; gap: 14px; }
        .hs-theme-toggle {
          width: 40px; height: 40px; border-radius: 50%;
          border: 1px solid var(--line);
          font-size: 16px;
          transition: background .25s, border-color .25s;
        }
        .hs-theme-toggle:hover { background: var(--bg-alt); border-color: var(--ink); }
        .hs-nav-cta { padding: 14px 22px; font-size: 12px; }
        .hs-burger {
          display: none;
          flex-direction: column; gap: 5px;
          width: 32px; height: 32px;
          align-items: center; justify-content: center;
        }
        .hs-burger span {
          display: block; width: 22px; height: 1px; background: var(--ink);
        }
        .hs-mobile-menu {
          position: fixed; inset: 0; top: 70px;
          background: var(--bg);
          padding: 40px 24px;
          display: flex; flex-direction: column; gap: 28px;
          align-items: center;
        }
        .hs-mobile-link {
          font-family: var(--serif);
          font-size: 28px;
        }
        @media (max-width: 980px) {
          .hs-nav-links { display: none; }
          .hs-burger { display: flex; }
          .hs-nav-cta { display: none; }
        }
      `}</style>
    </nav>
  );
}

window.Nav = Nav;
