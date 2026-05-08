/* global React */
const { useState: useStateN } = React;

function Newsletter() {
  const [email, setEmail] = useStateN('');
  const [done, setDone] = useStateN(false);
  return (
    <section id="newsletter" className="hs-news compact" data-screen-label="12 Newsletter">
      <div className="container">
        <div className="hs-news-card">
          <div>
            <div className="eyebrow" style={{color: 'var(--champagne)'}}>
              <span className="dot" style={{background: 'var(--champagne)'}}></span>
              Thư hàng tháng
            </div>
            <h2 className="hs-news-title">
              Một lá thư nhỏ —<br/>
              <em>về sự chậm rãi.</em>
            </h2>
          </div>
          <form className="hs-news-form" onSubmit={(e) => { e.preventDefault(); setDone(true); }}>
            {done ? (
              <div className="hs-news-thanks">✦ Cảm ơn bạn — kiểm tra hộp thư nhé.</div>
            ) : (
              <>
                <input
                  type="email" required
                  placeholder="email@cua-ban.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                />
                <button type="submit" className="btn btn-light">Đăng ký <span className="arrow"></span></button>
              </>
            )}
            <p className="hs-news-fine">Mỗi tháng một thư · Tin tức trị liệu, công thức tinh dầu, ưu đãi sớm.</p>
          </form>
        </div>
      </div>
      <style>{`
        .hs-news { background: var(--bg); }
        .hs-news-card {
          background: var(--bg-deep);
          color: var(--cream);
          border-radius: 6px;
          padding: 80px;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 60px;
          align-items: center;
          position: relative;
          overflow: hidden;
        }
        .hs-news-card::before {
          content: ""; position: absolute;
          top: -50%; right: -10%;
          width: 600px; height: 600px;
          background: radial-gradient(circle, color-mix(in oklab, var(--terracotta) 30%, transparent), transparent 60%);
          pointer-events: none;
        }
        .hs-news-title {
          font-family: var(--serif);
          font-weight: 300;
          font-size: clamp(40px, 4.5vw, 64px);
          line-height: 1;
          margin-top: 24px;
          letter-spacing: -0.02em;
        }
        .hs-news-title em {
          font-family: var(--display);
          font-style: normal;
          color: var(--champagne);
        }
        .hs-news-form {
          display: flex; flex-wrap: wrap; gap: 12px;
          position: relative; z-index: 2;
        }
        .hs-news-form input {
          flex: 1; min-width: 220px;
          padding: 18px 22px;
          background: transparent;
          border: 1px solid rgba(245,240,232,.25);
          border-radius: 999px;
          color: var(--cream);
          font-family: var(--serif);
          font-size: 17px;
          outline: none;
          transition: border-color .25s;
        }
        .hs-news-form input::placeholder { color: rgba(245,240,232,.4); }
        .hs-news-form input:focus { border-color: var(--champagne); }
        .hs-news-fine {
          width: 100%;
          font-size: 12px;
          opacity: 0.6;
          margin-top: 6px;
        }
        .hs-news-thanks {
          font-family: var(--serif);
          font-size: 22px;
          color: var(--champagne);
          padding: 18px 0;
        }
        @media (max-width: 980px) {
          .hs-news-card { grid-template-columns: 1fr; padding: 48px 32px; gap: 40px; }
        }
      `}</style>
    </section>
  );
}
window.Newsletter = Newsletter;
