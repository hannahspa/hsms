/* global React */
const { useState: useStateS, useEffect: useEffectS } = React;

function StickyCTA() {
  const [show, setShow] = useStateS(false);
  useEffectS(() => {
    const onScroll = () => setShow(window.scrollY > 800);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  return (
    <a href="#booking" className={`hs-sticky ${show ? 'show' : ''}`}>
      <span className="hs-sticky-dot"></span>
      <div>
        <div className="hs-sticky-title">Đặt lịch ngay</div>
        <div className="hs-sticky-sub">Còn slot hôm nay · Hotline 028 7300 8888</div>
      </div>
      <span className="arrow"></span>
      <style>{`
        .hs-sticky {
          position: fixed;
          bottom: 24px; right: 24px;
          z-index: 40;
          display: flex; align-items: center; gap: 14px;
          background: var(--ink); color: var(--cream);
          padding: 14px 22px 14px 18px;
          border-radius: 999px;
          box-shadow: 0 18px 50px -20px rgba(31,27,23,.6);
          opacity: 0; pointer-events: none;
          transform: translateY(20px);
          transition: opacity .4s, transform .4s;
        }
        .hs-sticky.show { opacity: 1; pointer-events: auto; transform: none; }
        .hs-sticky:hover { background: var(--terracotta); }
        .hs-sticky-dot {
          width: 10px; height: 10px;
          border-radius: 50%;
          background: #6FCF8E;
          box-shadow: 0 0 0 4px rgba(111,207,142,.25);
          animation: pulseDot 1.6s infinite;
        }
        @keyframes pulseDot {
          0%, 100% { box-shadow: 0 0 0 4px rgba(111,207,142,.25); }
          50% { box-shadow: 0 0 0 8px rgba(111,207,142,.05); }
        }
        .hs-sticky-title {
          font-family: var(--serif);
          font-size: 16px;
          line-height: 1.1;
        }
        .hs-sticky-sub {
          font-family: var(--mono);
          font-size: 9px;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          opacity: 0.7;
          margin-top: 2px;
        }
        @media (max-width: 720px) {
          .hs-sticky-sub { display: none; }
          .hs-sticky { padding: 12px 18px; bottom: 16px; right: 16px; }
        }
      `}</style>
    </a>
  );
}
window.StickyCTA = StickyCTA;
