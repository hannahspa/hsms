/* global React */
const { useState: useStateP } = React;

function Pricing() {
  const tiers = [
    {
      name: 'Essential',
      vi: 'Khởi đầu',
      tag: 'Đầu tiên đến Hannah',
      price: '850K',
      unit: 'mỗi buổi',
      includes: [
        'Liệu trình signature 60 phút',
        'Trà thảo mộc & ngâm chân',
        'Tư vấn da nhanh 15 phút',
        'Mini-mask sau trị liệu',
      ],
      featured: false,
    },
    {
      name: 'Signature',
      vi: 'Trải nghiệm trọn vẹn',
      tag: 'Phổ biến nhất',
      price: '1.450K',
      unit: 'mỗi buổi',
      includes: [
        'Liệu trình 90 phút theo nhu cầu',
        'Tẩy tế bào chết toàn thân',
        'Mặt nạ collagen vàng 24K',
        'Massage da đầu 15 phút',
        'Bữa nhẹ thuần chay sau trị liệu',
      ],
      featured: true,
    },
    {
      name: 'Sanctuary',
      vi: 'Tịnh dưỡng',
      tag: 'Cho ngày trọn vẹn',
      price: '3.200K',
      unit: 'gói nửa ngày',
      includes: [
        '4 giờ liệu trình tuỳ chỉnh',
        'Phòng riêng có vườn nhỏ',
        'Sauna & xông hơi thảo mộc',
        'Bữa trưa từ đầu bếp riêng',
        'Quà tặng about-care 800K',
      ],
      featured: false,
    },
  ];

  const memberships = [
    { vi: 'Thành viên Bạc', en: 'Silver', price: '6.5M / quý', perk: '5 buổi · ưu đãi 15% · ưu tiên đặt' },
    { vi: 'Thành viên Vàng', en: 'Gold', price: '12M / nửa năm', perk: '10 buổi · ưu đãi 22% · 1 buổi đôi miễn phí' },
    { vi: 'Thành viên Bạch kim', en: 'Platinum', price: '22M / năm', perk: '20 buổi · ưu đãi 30% · concierge cá nhân' },
  ];

  const [tab, setTab] = useStateP('packages');

  return (
    <section id="pricing" className="hs-pricing" data-screen-label="05 Pricing">
      <div className="container">
        <div className="hs-pricing-head">
          <div>
            <div className="eyebrow"><span className="dot"></span>Bảng giá · Investment</div>
            <h2 className="h-section" style={{marginTop: 24}}>
              Minh bạch.<br/>
              <em>Trọn vẹn.</em><br/>
              Không phụ phí.
            </h2>
          </div>
          <div className="hs-pricing-tabs">
            <button
              className={`hs-tab ${tab === 'packages' ? 'on' : ''}`}
              onClick={() => setTab('packages')}
            >Gói dịch vụ</button>
            <button
              className={`hs-tab ${tab === 'membership' ? 'on' : ''}`}
              onClick={() => setTab('membership')}
            >Thẻ thành viên</button>
          </div>
        </div>

        {tab === 'packages' && (
          <div className="hs-tier-grid">
            {tiers.map(t => (
              <div className={`hs-tier ${t.featured ? 'featured' : ''}`} key={t.name}>
                <div className="hs-tier-tag">{t.tag}</div>
                <div className="hs-tier-en">{t.name}</div>
                <h3 className="hs-tier-vi">{t.vi}</h3>
                <div className="hs-tier-price">
                  <span className="hs-tier-from">từ</span>
                  <span className="hs-tier-num">{t.price}</span>
                </div>
                <div className="hs-tier-unit">{t.unit}</div>
                <div className="hs-tier-divider"></div>
                <ul className="hs-tier-list">
                  {t.includes.map(it => (
                    <li key={it}><span>✦</span>{it}</li>
                  ))}
                </ul>
                <a href="#booking" className={`btn ${t.featured ? 'btn-light' : 'btn-ghost'} hs-tier-btn`}>
                  Chọn gói này <span className="arrow"></span>
                </a>
              </div>
            ))}
          </div>
        )}

        {tab === 'membership' && (
          <div className="hs-mem-grid">
            {memberships.map(m => (
              <div className="hs-mem" key={m.en}>
                <div className="hs-mem-en">{m.en}</div>
                <h3 className="hs-mem-vi">{m.vi}</h3>
                <div className="hs-mem-price">{m.price}</div>
                <p className="hs-mem-perk">{m.perk}</p>
                <a href="#booking" className="btn btn-ghost hs-mem-btn">Đăng ký <span className="arrow"></span></a>
              </div>
            ))}
          </div>
        )}

        <div className="hs-pricing-note">
          <span>★</span>
          <p>Giá đã bao gồm VAT. Khách hàng mới được tặng buổi tư vấn da chuyên sâu trị giá 450K. Hủy/đổi lịch miễn phí trước 6 giờ.</p>
        </div>
      </div>

      <style>{`
        .hs-pricing { background: var(--bg-deep); color: var(--cream); }
        .hs-pricing .eyebrow,
        .hs-pricing .h-section { color: var(--cream); }
        .hs-pricing .h-section em { color: var(--champagne); }
        .hs-pricing .eyebrow .dot { background: var(--champagne); }
        .hs-pricing-head {
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 60px;
          align-items: end;
          margin-bottom: 70px;
        }
        .hs-pricing-tabs {
          display: inline-flex;
          padding: 6px;
          border: 1px solid rgba(245,240,232,.15);
          border-radius: 999px;
          gap: 4px;
        }
        .hs-tab {
          padding: 12px 24px;
          font-size: 12px;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: rgba(245,240,232,.6);
          border-radius: 999px;
          transition: background .3s, color .3s;
        }
        .hs-tab.on { background: var(--cream); color: var(--ink); }

        .hs-tier-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 24px;
        }
        .hs-tier {
          padding: 44px 36px;
          border: 1px solid rgba(245,240,232,.12);
          border-radius: 4px;
          display: flex; flex-direction: column;
          background: rgba(245,240,232,.02);
          transition: transform .4s ease, background .3s;
        }
        .hs-tier:hover { transform: translateY(-6px); }
        .hs-tier.featured {
          background: var(--cream);
          color: var(--ink);
          border-color: var(--cream);
        }
        .hs-tier-tag {
          font-family: var(--mono);
          font-size: 10px;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          opacity: 0.7;
        }
        .hs-tier-en {
          font-family: var(--display);
          font-size: 16px;
          margin-top: 22px;
          color: var(--champagne);
        }
        .hs-tier.featured .hs-tier-en { color: var(--terracotta); }
        .hs-tier-vi {
          font-family: var(--serif);
          font-size: 36px;
          font-weight: 400;
          line-height: 1.05;
          margin-top: 6px;
        }
        .hs-tier-price {
          display: flex;
          align-items: baseline;
          gap: 8px;
          margin-top: 28px;
        }
        .hs-tier-from {
          font-family: var(--mono);
          font-size: 11px;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          opacity: 0.7;
        }
        .hs-tier-num {
          font-family: var(--serif);
          font-size: 56px;
          font-weight: 300;
          line-height: 1;
          letter-spacing: -0.02em;
        }
        .hs-tier-unit {
          font-size: 13px;
          opacity: 0.7;
          margin-top: 4px;
        }
        .hs-tier-divider {
          margin: 32px 0 24px;
          height: 1px;
          background: currentColor;
          opacity: 0.15;
        }
        .hs-tier-list {
          list-style: none;
          flex: 1;
          display: flex; flex-direction: column;
          gap: 14px;
        }
        .hs-tier-list li {
          display: flex; gap: 12px;
          font-size: 14px;
          line-height: 1.45;
        }
        .hs-tier-list li span {
          color: var(--terracotta);
          font-size: 11px;
          margin-top: 4px;
        }
        .hs-tier.featured .hs-tier-list li span { color: var(--terracotta); }
        .hs-tier-btn { margin-top: 32px; align-self: flex-start; }

        .hs-mem-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 24px;
        }
        .hs-mem {
          padding: 44px 36px;
          border: 1px solid rgba(245,240,232,.12);
          border-radius: 4px;
          background: rgba(245,240,232,.02);
        }
        .hs-mem-en {
          font-family: var(--display);
          font-size: 16px;
          color: var(--champagne);
        }
        .hs-mem-vi {
          font-family: var(--serif);
          font-size: 32px;
          font-weight: 400;
          margin-top: 8px;
        }
        .hs-mem-price {
          font-family: var(--serif);
          font-size: 28px;
          margin-top: 22px;
          color: var(--cream);
        }
        .hs-mem-perk {
          font-size: 14px;
          opacity: 0.75;
          margin-top: 14px;
          line-height: 1.55;
        }
        .hs-mem-btn { margin-top: 28px; color: var(--cream); border-color: rgba(245,240,232,.25); }
        .hs-mem-btn:hover { border-color: var(--cream); }

        .hs-pricing-note {
          margin-top: 60px;
          display: flex;
          gap: 14px;
          padding: 24px 28px;
          border: 1px dashed rgba(245,240,232,.18);
          border-radius: 4px;
          align-items: center;
        }
        .hs-pricing-note span { color: var(--champagne); font-size: 14px; }
        .hs-pricing-note p { font-size: 13px; opacity: 0.75; }

        @media (max-width: 980px) {
          .hs-pricing-head { grid-template-columns: 1fr; }
          .hs-tier-grid, .hs-mem-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </section>
  );
}
window.Pricing = Pricing;
