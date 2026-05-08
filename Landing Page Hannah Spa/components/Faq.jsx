/* global React */
const { useState: useStateF } = React;

function Faq() {
  const items = [
    { q: 'Tôi cần đặt lịch trước bao lâu?',
      a: 'Khuyến nghị đặt trước 24–48 giờ để chọn được khung giờ và chuyên viên mong muốn. Vào cuối tuần, chúng tôi thường kín lịch trước 3–5 ngày.' },
    { q: 'Lần đầu đến Hannah, tôi nên chuẩn bị gì?',
      a: 'Bạn chỉ cần đến trước 15 phút để dùng trà, ngâm chân và tư vấn nhanh. Chúng tôi cung cấp khăn choàng, dép, đồ lót dùng một lần và tủ đồ riêng có khoá.' },
    { q: 'Có dịch vụ dành cho nam giới không?',
      a: 'Có. Khoảng 30% khách hàng của chúng tôi là nam, với liệu trình dành riêng và chuyên viên nam khi yêu cầu.' },
    { q: 'Thời gian liệu trình có chính xác như niêm yết?',
      a: 'Hannah cam kết đủ phút trị liệu thực, không tính thời gian thay đồ và đón tiếp. Nếu thiếu, chúng tôi tặng buổi mới hoàn toàn miễn phí.' },
    { q: 'Tôi có thể tặng voucher cho người thân?',
      a: 'Tất nhiên. Voucher giấy thủ công và voucher điện tử đều có sẵn — cá nhân hoá theo dịp và tên người nhận.' },
    { q: 'Chính sách huỷ/đổi lịch ra sao?',
      a: 'Miễn phí huỷ/đổi nếu thông báo trước 6 giờ. Trong vòng 6 giờ, chúng tôi tính 30% chi phí. No-show: 100%.' },
  ];
  const [open, setOpen] = useStateF(0);
  return (
    <section id="faq" className="hs-faq" data-screen-label="10 FAQ">
      <div className="container">
        <div className="hs-faq-grid">
          <div>
            <div className="eyebrow"><span className="dot"></span>FAQ · Câu hỏi thường gặp</div>
            <h2 className="h-section" style={{marginTop: 24}}>
              Bạn còn<br/>điều gì <em>thắc mắc?</em>
            </h2>
            <p className="lede" style={{marginTop: 28, maxWidth: 360}}>
              Nếu chưa có câu trả lời ở đây, đội ngũ Hannah luôn sẵn sàng trả lời
              qua hotline hoặc Zalo trong vòng vài phút.
            </p>
          </div>
          <div className="hs-faq-list">
            {items.map((it, i) => (
              <div className={`hs-faq-item ${open === i ? 'open' : ''}`} key={i}>
                <button className="hs-faq-q" onClick={() => setOpen(open === i ? -1 : i)}>
                  <span className="hs-faq-no">0{i+1}</span>
                  <span className="hs-faq-q-text">{it.q}</span>
                  <span className="hs-faq-toggle">{open === i ? '−' : '+'}</span>
                </button>
                <div className="hs-faq-a"><p>{it.a}</p></div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <style>{`
        .hs-faq { background: var(--bg); }
        .hs-faq-grid {
          display: grid;
          grid-template-columns: 1fr 1.4fr;
          gap: 80px;
          align-items: start;
        }
        .hs-faq-list { border-top: 1px solid var(--line); }
        .hs-faq-item { border-bottom: 1px solid var(--line); }
        .hs-faq-q {
          width: 100%;
          display: grid;
          grid-template-columns: 50px 1fr 30px;
          gap: 20px;
          padding: 28px 0;
          text-align: left;
          align-items: center;
          font-family: var(--serif);
          font-size: 22px;
          font-weight: 400;
          color: var(--ink);
          transition: color .25s;
        }
        .hs-faq-q:hover { color: var(--terracotta); }
        .hs-faq-no {
          font-family: var(--display);
          font-size: 18px;
          color: var(--terracotta);
        }
        .hs-faq-toggle {
          font-family: var(--serif);
          font-size: 28px;
          color: var(--ink-mute);
          text-align: right;
        }
        .hs-faq-a {
          max-height: 0;
          overflow: hidden;
          transition: max-height .4s ease, padding .4s;
          padding: 0 70px 0;
        }
        .hs-faq-item.open .hs-faq-a {
          max-height: 240px;
          padding: 0 70px 28px;
        }
        .hs-faq-a p {
          color: var(--ink-soft);
          font-size: 15px;
          line-height: 1.65;
          max-width: 640px;
        }
        @media (max-width: 980px) {
          .hs-faq-grid { grid-template-columns: 1fr; gap: 40px; }
          .hs-faq-q { grid-template-columns: 36px 1fr 24px; font-size: 18px; }
          .hs-faq-a, .hs-faq-item.open .hs-faq-a { padding-left: 56px; }
        }
      `}</style>
    </section>
  );
}
window.Faq = Faq;
