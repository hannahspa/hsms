/* global React */
function Gallery() {
  const cells = [
    { vi: 'Phòng trị liệu · Suite Lily', cls: 'g1' },
    { vi: 'Tinh dầu thiên nhiên', cls: 'g2' },
    { vi: 'Sảnh đón · ánh chiều', cls: 'g3' },
    { vi: 'Mặt nạ collagen', cls: 'g4' },
    { vi: 'Bồn ngâm cánh hồng', cls: 'g5' },
    { vi: 'Nến đậu nành thủ công', cls: 'g6' },
    { vi: 'Vườn thiền nội thất', cls: 'g7' },
  ];
  return (
    <section id="gallery" className="hs-gallery" data-screen-label="07 Gallery">
      <div className="container">
        <div className="hs-gallery-head">
          <div>
            <div className="eyebrow"><span className="dot"></span>Thư viện · Gallery</div>
            <h2 className="h-section" style={{marginTop: 24}}>
              Một thoáng <em>Hannah,</em><br/>qua ánh nến và linen.
            </h2>
          </div>
          <p className="lede" style={{maxWidth: 420}}>
            Không gian được thiết kế bởi studio Tropical Space — vật liệu thật,
            ánh sáng mềm, ít chữ, nhiều khoảng thở.
          </p>
        </div>
        <div className="hs-gallery-grid">
          {cells.map((c, i) => (
            <div className={`hs-gal-cell ${c.cls} ph`} key={i}>
              <span className="ph-label">{c.vi}</span>
            </div>
          ))}
        </div>
      </div>
      <style>{`
        .hs-gallery { background: var(--bg-alt); }
        .hs-gallery-head {
          display: grid;
          grid-template-columns: 1.4fr 1fr;
          gap: 60px;
          align-items: end;
          margin-bottom: 60px;
        }
        .hs-gallery-grid {
          display: grid;
          grid-template-columns: repeat(6, 1fr);
          grid-auto-rows: 180px;
          gap: 14px;
        }
        .hs-gal-cell { border-radius: 4px; }
        .g1 { grid-column: span 3; grid-row: span 2; }
        .g2 { grid-column: span 3; }
        .g3 { grid-column: span 2; grid-row: span 2; }
        .g4 { grid-column: span 1; }
        .g5 { grid-column: span 2; }
        .g6 { grid-column: span 2; }
        .g7 { grid-column: span 4; }
        @media (max-width: 980px) {
          .hs-gallery-head { grid-template-columns: 1fr; gap: 32px; }
          .hs-gallery-grid { grid-template-columns: repeat(2, 1fr); grid-auto-rows: 160px; }
          .g1, .g2, .g3, .g4, .g5, .g6, .g7 { grid-column: span 1; grid-row: auto; }
        }
      `}</style>
    </section>
  );
}
window.Gallery = Gallery;
