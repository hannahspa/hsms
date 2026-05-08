/* global React */
const { useState: useStateT } = React;

function Testimonials() {
  const tt = [
    { name: 'Linh Trần', role: 'CEO · Saigon Studio', rating: 5,
      text: 'Hannah là nơi tôi đến mỗi tháng để "khởi động lại" chính mình. Đôi tay của Thảo Mai biết đúng từng điểm cơ thể tôi đang căng thẳng nhất.' },
    { name: 'Mark Wilson', role: 'Resident, Q.2', rating: 5,
      text: 'A genuine Vietnamese spa experience that respects both ancient practice and modern hygiene. Booking the couple suite for our anniversary — magical evening.' },
    { name: 'Phương Dung', role: 'Mẹ của 2 con', rating: 5,
      text: 'Sau sinh, tôi mất hai năm mới dám yêu lại bản thân. Buổi đầu tiên ở Hannah, tôi đã khóc — vì lần đầu thấy mình được lắng nghe đến vậy.' },
    { name: 'Anna Kim', role: 'Travel Writer', rating: 5,
      text: 'Of all spas I reviewed across SE Asia, Hannah stands out for its thoughtful pacing — they don\'t rush a single minute of the ritual.' },
  ];
  const [i, setI] = useStateT(0);
  const cur = tt[i];
  return (
    <section id="testimonials" className="hs-tt" data-screen-label="08 Testimonials">
      <div className="container">
        <div className="hs-tt-grid">
          <div className="hs-tt-side">
            <div className="eyebrow"><span className="dot"></span>Cảm nhận · Voices</div>
            <h2 className="h-section" style={{marginTop: 24}}>
              4.9<span style={{color: 'var(--terracotta)', fontFamily: 'var(--display)'}}>★</span><br/>
              <em>từ những người</em><br/>chọn quay lại.
            </h2>
            <div className="hs-tt-meta">
              <div><strong>2,840+</strong> đánh giá Google</div>
              <div><strong>96%</strong> khách hàng quay lại</div>
            </div>
          </div>

          <div className="hs-tt-card">
            <div className="hs-tt-mark">"</div>
            <p className="hs-tt-text">{cur.text}</p>
            <div className="hs-tt-stars">{'★'.repeat(cur.rating)}</div>
            <div className="hs-tt-author">
              <div className="hs-tt-avatar ph"><span className="ph-label">Avatar</span></div>
              <div>
                <div className="hs-tt-name">{cur.name}</div>
                <div className="hs-tt-role">{cur.role}</div>
              </div>
            </div>
            <div className="hs-tt-controls">
              <button onClick={() => setI((i - 1 + tt.length) % tt.length)} aria-label="prev">←</button>
              <span className="hs-tt-count">{String(i+1).padStart(2,'0')} / {String(tt.length).padStart(2,'0')}</span>
              <button onClick={() => setI((i + 1) % tt.length)} aria-label="next">→</button>
            </div>
          </div>
        </div>
      </div>
      <style>{`
        .hs-tt { background: var(--bg); }
        .hs-tt-grid {
          display: grid;
          grid-template-columns: 1fr 1.1fr;
          gap: 80px;
          align-items: center;
        }
        .hs-tt-meta {
          margin-top: 48px;
          display: flex;
          gap: 40px;
          padding-top: 28px;
          border-top: 1px solid var(--line);
        }
        .hs-tt-meta div { font-size: 13px; color: var(--ink-soft); }
        .hs-tt-meta strong {
          display: block;
          font-family: var(--serif);
          font-weight: 400;
          font-size: 32px;
          color: var(--ink);
          margin-bottom: 4px;
        }

        .hs-tt-card {
          background: var(--bg-alt);
          padding: 56px 56px 36px;
          border-radius: 4px;
          position: relative;
        }
        .hs-tt-mark {
          font-family: var(--display);
          font-size: 120px;
          line-height: 0.8;
          color: var(--terracotta);
          position: absolute;
          top: 20px; left: 36px;
        }
        .hs-tt-text {
          font-family: var(--serif);
          font-size: 26px;
          font-weight: 300;
          font-style: italic;
          line-height: 1.4;
          color: var(--ink);
          margin-top: 60px;
          text-wrap: pretty;
        }
        .hs-tt-stars {
          color: var(--terracotta);
          font-size: 14px;
          letter-spacing: 4px;
          margin-top: 28px;
        }
        .hs-tt-author {
          display: flex;
          align-items: center;
          gap: 14px;
          margin-top: 16px;
          padding-top: 24px;
          border-top: 1px solid var(--line);
        }
        .hs-tt-avatar {
          width: 52px; height: 52px;
          border-radius: 50%;
        }
        .hs-tt-avatar::before { border-radius: 50%; }
        .hs-tt-name {
          font-family: var(--serif);
          font-size: 20px;
        }
        .hs-tt-role {
          font-family: var(--mono);
          font-size: 10px;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: var(--ink-mute);
          margin-top: 2px;
        }
        .hs-tt-controls {
          display: flex; align-items: center; gap: 20px;
          margin-top: 32px;
        }
        .hs-tt-controls button {
          width: 44px; height: 44px;
          border-radius: 50%;
          border: 1px solid var(--line);
          font-size: 16px;
          transition: background .2s, color .2s, border-color .2s;
        }
        .hs-tt-controls button:hover {
          background: var(--ink); color: var(--cream); border-color: var(--ink);
        }
        .hs-tt-count {
          font-family: var(--mono);
          font-size: 12px;
          letter-spacing: 0.18em;
          color: var(--ink-mute);
        }
        @media (max-width: 980px) {
          .hs-tt-grid { grid-template-columns: 1fr; }
          .hs-tt-card { padding: 36px 28px 28px; }
          .hs-tt-text { font-size: 20px; margin-top: 40px; }
          .hs-tt-mark { font-size: 80px; left: 20px; top: 14px; }
        }
      `}</style>
    </section>
  );
}
window.Testimonials = Testimonials;
