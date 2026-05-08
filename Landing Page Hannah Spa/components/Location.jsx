/* global React */
function Location() {
  return (
    <section id="location" className="hs-loc" data-screen-label="11 Location">
      <div className="container">
        <div className="hs-loc-grid">
          <div className="hs-loc-info">
            <div className="eyebrow"><span className="dot"></span>Địa chỉ · Visit us</div>
            <h2 className="h-section" style={{marginTop: 24}}>
              Một biệt thự nhỏ<br/>giữa <em>Thảo Điền.</em>
            </h2>
            <div className="hs-loc-address">
              <div className="hs-loc-line">
                <span className="label">Flagship</span>
                <p>Số 18 đường Số 6, Phường Thảo Điền,<br/>TP. Thủ Đức, TP. Hồ Chí Minh</p>
              </div>
              <div className="hs-loc-line">
                <span className="label">Chi nhánh</span>
                <p>Tầng 3, Saigon Centre — 65 Lê Lợi, Quận 1</p>
              </div>
            </div>
            <div className="hs-loc-actions">
              <a href="#" className="btn btn-primary">Chỉ đường <span className="arrow"></span></a>
              <a href="#" className="btn btn-ghost">Đặt taxi đưa đón</a>
            </div>
          </div>
          <div className="hs-loc-map ph">
            <span className="ph-label">Map · Thảo Điền · 10.8021° N, 106.7355° E</span>
            <div className="hs-map-pin">
              <div className="hs-pin-ring"></div>
              <div className="hs-pin-dot"></div>
            </div>
          </div>
        </div>
      </div>
      <style>{`
        .hs-loc { background: var(--bg-alt); }
        .hs-loc-grid {
          display: grid;
          grid-template-columns: 1fr 1.2fr;
          gap: 60px;
          align-items: stretch;
        }
        .hs-loc-info { display: flex; flex-direction: column; }
        .hs-loc-address { margin-top: 48px; display: grid; gap: 24px; }
        .hs-loc-line p {
          font-family: var(--serif);
          font-size: 22px;
          line-height: 1.4;
          margin-top: 8px;
        }
        .hs-loc-actions { margin-top: auto; padding-top: 40px; display: flex; gap: 12px; flex-wrap: wrap; }
        .hs-loc-map {
          position: relative;
          min-height: 460px;
          border-radius: 4px;
          background:
            repeating-linear-gradient(135deg, rgba(31,27,23,.04) 0 1px, transparent 1px 14px),
            linear-gradient(135deg, var(--bg-alt), var(--cream));
        }
        .hs-map-pin {
          position: absolute;
          top: 45%; left: 55%;
          width: 28px; height: 28px;
        }
        .hs-pin-ring {
          position: absolute; inset: -8px;
          border: 1px solid var(--terracotta);
          border-radius: 50%;
          animation: pinRing 2s ease-out infinite;
        }
        .hs-pin-dot {
          position: absolute; inset: 0;
          background: var(--terracotta);
          border-radius: 50%;
          box-shadow: 0 0 0 4px var(--cream);
        }
        @keyframes pinRing {
          0% { transform: scale(.7); opacity: 1; }
          100% { transform: scale(2.4); opacity: 0; }
        }
        @media (max-width: 980px) {
          .hs-loc-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </section>
  );
}
window.Location = Location;
