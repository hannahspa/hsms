/* global React */
function Process() {
  const steps = [
    { n: 'I', vi: 'Đón tiếp', en: 'Welcome', t: '10 phút', d: 'Trà thảo mộc, ngâm chân nước ấm với muối Hi-mã-lạp-sơn và cánh hồng khô.' },
    { n: 'II', vi: 'Thấu hiểu', en: 'Consult', t: '5 phút', d: 'Chuyên viên trò chuyện, soi da, lắng nghe vùng cơ thể đang cần được chăm sóc nhất.' },
    { n: 'III', vi: 'Thanh tẩy', en: 'Cleanse', t: '15 phút', d: 'Tẩy tế bào chết toàn thân bằng đường nâu hữu cơ và tinh dầu hạnh nhân ngọt.' },
    { n: 'IV', vi: 'Trị liệu', en: 'Treatment', t: '45–60 phút', d: 'Liệu trình chính được thực hiện bởi chuyên viên cao cấp, theo nhịp thở của bạn.' },
    { n: 'V', vi: 'Tĩnh tại', en: 'Rest', t: '15 phút', d: 'Nghỉ ngơi trong phòng riêng với một tách trà mật ong gừng nóng và bánh nhỏ.' },
  ];
  return (
    <section id="process" className="hs-process" data-screen-label="04 Process">
      <div className="container">
        <div className="hs-process-head">
          <div className="eyebrow"><span className="dot"></span>Quy trình · The ritual</div>
          <h2 className="h-section" style={{marginTop: 24, maxWidth: 900}}>
            Năm bước, <em>một hành trình</em><br/>
            quay về bên trong.
          </h2>
        </div>

        <div className="hs-process-rail">
          <div className="hs-process-line"></div>
          <div className="hs-process-steps">
            {steps.map((s, i) => (
              <div className="hs-step" key={s.n}>
                <div className="hs-step-dot">
                  <span>{s.n}</span>
                </div>
                <div className="hs-step-time">{s.t}</div>
                <h3 className="hs-step-title">{s.vi}</h3>
                <div className="hs-step-en">{s.en}</div>
                <p className="hs-step-desc">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        .hs-process { background: var(--bg); }
        .hs-process-head { margin-bottom: 80px; }
        .hs-process-rail { position: relative; }
        .hs-process-line {
          position: absolute;
          top: 30px; left: 5%; right: 5%;
          height: 1px;
          background: linear-gradient(to right, transparent, var(--line) 10%, var(--line) 90%, transparent);
        }
        .hs-process-steps {
          position: relative;
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 32px;
        }
        .hs-step {
          text-align: center;
          padding: 0 8px;
        }
        .hs-step-dot {
          width: 60px; height: 60px;
          border-radius: 50%;
          background: var(--bg);
          border: 1px solid var(--line);
          display: flex; align-items: center; justify-content: center;
          margin: 0 auto;
          position: relative; z-index: 2;
          transition: background .3s, border-color .3s, transform .3s;
        }
        .hs-step-dot span {
          font-family: var(--display);
          font-size: 20px;
          color: var(--terracotta);
        }
        .hs-step:hover .hs-step-dot {
          background: var(--ink);
          border-color: var(--ink);
          transform: scale(1.06);
        }
        .hs-step:hover .hs-step-dot span { color: var(--champagne); }
        .hs-step-time {
          font-family: var(--mono);
          font-size: 10px;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          color: var(--ink-mute);
          margin-top: 22px;
        }
        .hs-step-title {
          font-family: var(--serif);
          font-size: 28px;
          font-weight: 400;
          margin-top: 10px;
          line-height: 1.1;
        }
        .hs-step-en {
          font-family: var(--display);
          color: var(--terracotta);
          font-size: 16px;
          margin-top: 4px;
        }
        .hs-step-desc {
          font-size: 14px;
          color: var(--ink-soft);
          margin-top: 14px;
          line-height: 1.55;
          text-wrap: pretty;
        }

        @media (max-width: 980px) {
          .hs-process-steps { grid-template-columns: 1fr 1fr; gap: 40px; }
          .hs-process-line { display: none; }
        }
        @media (max-width: 560px) {
          .hs-process-steps { grid-template-columns: 1fr; }
        }
      `}</style>
    </section>
  );
}
window.Process = Process;
