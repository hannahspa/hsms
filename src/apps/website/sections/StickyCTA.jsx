import { useState, useEffect } from 'react'

export default function StickyCTA() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    const fn = () => setShow(window.scrollY > 1200)
    window.addEventListener('scroll', fn, { passive: true })
    fn()
    return () => window.removeEventListener('scroll', fn)
  }, [])

  return (
    <a
      href="#dat-lich"
      className={`lp-sticky ${show ? 'lp-sticky-show' : ''}`}
      aria-label="Đặt lịch ngay"
    >
      <span className="lp-sticky-pulse"></span>
      <div>
        <div className="lp-sticky-title">Đặt lịch ngay</div>
        <div className="lp-sticky-sub">Còn slot hôm nay · 0379 080 909</div>
      </div>
      <span className="lp-arrow"></span>

      <style>{`
        .lp-sticky {
          position: fixed; bottom: 24px; right: 24px; z-index: 40;
          display: flex; align-items: center; gap: 14px;
          background: var(--ink); color: var(--cream);
          padding: 14px 22px 14px 18px; border-radius: 999px;
          box-shadow: 0 18px 48px -18px rgba(31,27,23,0.65);
          opacity: 0; pointer-events: none;
          transform: translateY(20px);
          transition: opacity .4s, transform .4s, background .25s;
          text-decoration: none;
        }
        .lp-sticky-show { opacity: 1; pointer-events: auto; transform: none; }
        .lp-sticky:hover { background: var(--terracotta); }
        .lp-sticky-pulse {
          width: 10px; height: 10px; border-radius: 50%;
          background: #6FCF8E; flex-shrink: 0;
          animation: lp-pulse-dot 1.6s infinite;
        }
        .lp-sticky-title {
          font-family: var(--serif); font-size: 16px; line-height: 1.1;
        }
        .lp-sticky-sub {
          font-family: var(--mono); font-size: 9px;
          letter-spacing: 0.18em; text-transform: uppercase;
          opacity: 0.65; margin-top: 2px;
        }
        @media (max-width: 720px) {
          .lp-sticky { display: none !important; }
        }
      `}</style>
    </a>
  )
}
