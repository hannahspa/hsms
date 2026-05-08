/* global React */
function Footer() {
  return (
    <footer className="hs-foot" data-screen-label="Footer">
      <div className="container">
        <div className="hs-foot-top">
          <div className="hs-foot-brand">
            <div className="hs-foot-logo">
              <span className="hs-foot-mark">H</span>
              <span>
                <span className="hs-foot-name">Hannah</span>
                <span className="hs-foot-sub">spa & wellness</span>
              </span>
            </div>
            <p className="hs-foot-tagline">
              Một nơi để chậm lại, lắng nghe, và quay về với chính mình.
            </p>
          </div>
          <div className="hs-foot-cols">
            <div>
              <div className="label">Khám phá</div>
              <a href="#story">Câu chuyện</a>
              <a href="#services">Dịch vụ</a>
              <a href="#pricing">Bảng giá</a>
              <a href="#team">Chuyên viên</a>
            </div>
            <div>
              <div className="label">Hỗ trợ</div>
              <a href="#faq">FAQ</a>
              <a href="#booking">Đặt lịch</a>
              <a href="#location">Địa chỉ</a>
              <a href="#">Voucher quà tặng</a>
            </div>
            <div>
              <div className="label">Theo dõi</div>
              <a href="#">Instagram</a>
              <a href="#">TikTok</a>
              <a href="#">Facebook</a>
              <a href="#">Zalo OA</a>
            </div>
          </div>
        </div>
        <div className="hs-foot-bot">
          <div>© 2014–2026 Hannah Spa & Wellness Co., Ltd. · GPDKKD 0312 458 220</div>
          <div className="hs-foot-bot-r">
            <a href="#">Chính sách bảo mật</a>
            <a href="#">Điều khoản</a>
            <a href="#">Cookies</a>
          </div>
        </div>
      </div>
      <div className="hs-foot-mega">Hannah</div>

      <style>{`
        .hs-foot {
          background: var(--bg-deep);
          color: var(--cream);
          padding: 100px 0 0;
          position: relative;
          overflow: hidden;
        }
        .hs-foot-top {
          display: grid;
          grid-template-columns: 1fr 1.5fr;
          gap: 80px;
          padding-bottom: 80px;
        }
        .hs-foot-logo { display: flex; align-items: center; gap: 14px; }
        .hs-foot-mark {
          width: 48px; height: 48px;
          border-radius: 50%;
          background: var(--cream); color: var(--ink);
          display: flex; align-items: center; justify-content: center;
          font-family: var(--display); font-size: 24px;
        }
        .hs-foot-name {
          display: block;
          font-family: var(--serif); font-size: 26px;
        }
        .hs-foot-sub {
          font-family: var(--mono);
          font-size: 10px;
          letter-spacing: 0.24em;
          text-transform: uppercase;
          color: var(--champagne);
        }
        .hs-foot-tagline {
          margin-top: 24px;
          font-family: var(--serif);
          font-size: 18px;
          font-style: italic;
          opacity: 0.75;
          max-width: 320px;
          line-height: 1.4;
        }
        .hs-foot-cols {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 40px;
        }
        .hs-foot-cols > div { display: flex; flex-direction: column; gap: 14px; }
        .hs-foot-cols .label { color: var(--champagne); margin-bottom: 8px; }
        .hs-foot-cols a {
          font-family: var(--serif);
          font-size: 18px;
          opacity: 0.85;
          transition: opacity .2s, color .2s;
        }
        .hs-foot-cols a:hover { color: var(--champagne); opacity: 1; }
        .hs-foot-bot {
          display: flex;
          justify-content: space-between;
          gap: 24px;
          padding: 28px 0;
          border-top: 1px solid rgba(245,240,232,.12);
          font-size: 12px;
          opacity: 0.6;
          flex-wrap: wrap;
        }
        .hs-foot-bot-r { display: flex; gap: 20px; }
        .hs-foot-mega {
          font-family: var(--display);
          font-size: clamp(160px, 28vw, 460px);
          line-height: 0.78;
          text-align: center;
          color: rgba(245,240,232,.06);
          padding: 0 0 60px;
          letter-spacing: -0.04em;
          user-select: none;
        }
        @media (max-width: 980px) {
          .hs-foot-top { grid-template-columns: 1fr; gap: 56px; }
          .hs-foot-cols { grid-template-columns: 1fr 1fr; }
        }
      `}</style>
    </footer>
  );
}
window.Footer = Footer;
