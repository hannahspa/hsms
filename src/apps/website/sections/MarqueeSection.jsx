const DEFAULT_ITEMS = [
  'Gội Đầu Dưỡng Sinh',
  'Massage Body · Massage Đá Nóng',
  'Triệt Lông Công Nghệ Cao',
  'Chăm Sóc Da Công Nghệ Cao',
  'Tắm Trắng & Giảm Béo',
]

export default function MarqueeSection({ items }) {
  const ITEMS = (items && items.length > 0) ? items : DEFAULT_ITEMS
  const DOUBLE = [...ITEMS, ...ITEMS]
  return (
    <div className="lp-marquee-wrap">
      <div className="lp-marquee-track">
        {DOUBLE.map((item, i) => (
          <div key={i} className="lp-marquee-item">
            <em>{item}</em>
            <span className="lp-marquee-star">✦</span>
          </div>
        ))}
      </div>
      <style>{`
        .lp-marquee-wrap {
          overflow: hidden;
          border-top: 1px solid var(--line);
          border-bottom: 1px solid var(--line);
          padding: 28px 0;
          background: var(--bg);
        }
        .lp-marquee-track {
          display: flex; gap: 60px;
          white-space: nowrap; width: max-content;
        }
        .lp-marquee-item {
          font-family: var(--serif); font-size: 36px; font-weight: 300;
          color: var(--ink);
          display: flex; align-items: center; gap: 60px;
        }
        .lp-marquee-item em { font-family: var(--display); font-style: normal; color: var(--terracotta); }
        .lp-marquee-star { color: var(--terracotta); font-size: 14px; }
      `}</style>
    </div>
  )
}
