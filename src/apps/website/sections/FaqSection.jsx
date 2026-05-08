import { useState } from 'react'

const FAQS = [
  {
    q: 'Hannah Spa mở cửa mấy giờ?',
    a: 'Hannah Spa phục vụ từ 9:15 đến 20:00 hàng ngày, kể cả Thứ Bảy và Chủ Nhật. Spa ngưng nhận khách mới lúc 19:30 để đảm bảo mỗi khách được phục vụ trọn vẹn.',
  },
  {
    q: 'Tôi có cần đặt lịch trước không?',
    a: 'Chúng tôi khuyến khích đặt lịch trước qua Facebook hoặc điện thoại để được ưu tiên giờ và chuyên viên. Khách vãng lai vẫn được đón tiếp nếu còn chỗ trống, tuy nhiên có thể phải chờ.',
  },
  {
    q: 'Dịch vụ có phù hợp cho da nhạy cảm không?',
    a: 'Hoàn toàn phù hợp. Trước mỗi liệu trình, chuyên viên sẽ phân tích tình trạng da và điều chỉnh sản phẩm, cường độ điều trị phù hợp với từng loại da, kể cả da nhạy cảm.',
  },
  {
    q: 'Thanh toán bằng những hình thức nào?',
    a: 'Hannah Spa chấp nhận tiền mặt, chuyển khoản ngân hàng và quẹt thẻ tín dụng/ghi nợ (Visa, Mastercard). Không thu thêm phí khi thanh toán bằng thẻ.',
  },
  {
    q: 'Phòng điều trị có riêng tư không?',
    a: 'Có. Hannah Spa có 3 tầng với các phòng điều trị riêng biệt cho từng loại dịch vụ. Mỗi phòng đều có cửa đóng riêng, đảm bảo sự riêng tư và thoải mái tuyệt đối.',
  },
  {
    q: 'Sau liệu trình cần lưu ý điều gì?',
    a: 'Sau mỗi liệu trình, KTV sẽ tư vấn chi tiết. Thông thường: hạn chế tiếp xúc ánh nắng trực tiếp, không trang điểm trong 4-6 giờ với dịch vụ da, uống đủ nước và dưỡng ẩm đúng cách.',
  },
  {
    q: 'Có thể hủy hoặc đổi lịch không?',
    a: 'Được phép hủy/đổi lịch miễn phí nếu thông báo trước ít nhất 2 giờ. Vui lòng nhắn Facebook sớm để chúng tôi sắp xếp phục vụ khách khác.',
  },
  {
    q: 'Triệt lông cần bao nhiêu buổi để thấy kết quả?',
    a: 'Thông thường 4-8 buổi tùy vùng cần điều trị và màu tóc. Chuyên viên sẽ tư vấn lộ trình cụ thể sau khi đánh giá tình trạng lông tại chỗ — hoàn toàn miễn phí.',
  },
]

function FaqItem({ faq, isOpen, onToggle }) {
  return (
    <div className="lp-faq-item">
      <button className="lp-faq-q" onClick={onToggle}>
        <span className={`lp-faq-q-text ${isOpen ? 'open' : ''}`}>{faq.q}</span>
        <span className={`lp-faq-icon ${isOpen ? 'open' : ''}`}>+</span>
      </button>
      <div className={`lp-faq-a ${isOpen ? 'open' : ''}`}>
        <p>{faq.a}</p>
      </div>
    </div>
  )
}

export default function FaqSection({ items }) {
  const ACTIVE = (items && items.length > 0)
    ? items.map(f => ({ q: f.q, a: f.a }))
    : FAQS
  const [openIdx, setOpenIdx] = useState(0)
  const toggle = i => setOpenIdx(openIdx === i ? -1 : i)
  const mid = Math.ceil(ACTIVE.length / 2)
  const col1 = ACTIVE.slice(0, mid)
  const col2 = ACTIVE.slice(mid)

  return (
    <section id="faq" className="lp-faq">
      <div className="lp-container">
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 'clamp(40px,6vw,64px)' }} className="lp-reveal">
          <div className="lp-eyebrow" style={{ justifyContent: 'center' }}>
            <span className="lp-dot"></span>Câu hỏi thường gặp · FAQ
          </div>
          <h2 className="lp-h-section" style={{ marginTop: 20 }}>
            Bạn cần <em>biết gì?</em>
          </h2>
          <p style={{ fontFamily: 'var(--serif)', fontSize: 18, color: 'var(--ink-soft)', marginTop: 16, maxWidth: 440, margin: '16px auto 0' }}>
            Những câu hỏi thường gặp về dịch vụ, đặt lịch và quy trình tại Hannah Spa
          </p>
        </div>

        {/* 2-col grid */}
        <div className="lp-faq-grid lp-reveal">
          <div>
            {col1.map((faq, i) => (
              <FaqItem key={i} faq={faq} isOpen={openIdx === i} onToggle={() => toggle(i)} />
            ))}
          </div>
          <div>
            {col2.map((faq, i) => (
              <FaqItem key={i+4} faq={faq} isOpen={openIdx === i+4} onToggle={() => toggle(i+4)} />
            ))}
          </div>
        </div>

        {/* CTA bar */}
        <div className="lp-faq-cta lp-reveal">
          <div>
            <div className="lp-faq-cta-title">Vẫn còn thắc mắc?</div>
            <div className="lp-faq-cta-sub">Nhắn Facebook — chúng tôi phản hồi trong vài phút!</div>
          </div>
          <div className="lp-faq-cta-btns">
            <a href="https://www.facebook.com/hannahspact" target="_blank" rel="noopener noreferrer"
              className="lp-btn lp-btn-primary">
              💬 Nhắn Facebook <span className="lp-arrow"></span>
            </a>
            <a href="tel:0379080909" className="lp-btn lp-btn-ghost">
              📞 0379 080 909
            </a>
          </div>
        </div>
      </div>

      <style>{`
        .lp-faq { background: var(--bg-alt); }
        .lp-faq-grid {
          display: grid; grid-template-columns: 1fr 1fr;
          gap: 0 60px;
        }
        .lp-faq-item { border-bottom: 1px solid var(--line); }
        .lp-faq-q {
          width: 100%; background: none; border: none;
          padding: 20px 0; cursor: pointer;
          display: flex; align-items: center; justify-content: space-between; gap: 16px;
          text-align: left;
        }
        .lp-faq-q-text {
          font-family: var(--serif); font-size: 18px; font-weight: 400;
          color: var(--ink-soft); line-height: 1.3; flex: 1;
          transition: color .2s;
        }
        .lp-faq-q-text.open { color: var(--ink); }
        .lp-faq-icon {
          width: 26px; height: 26px; border-radius: 50%; flex-shrink: 0;
          background: rgba(168,126,92,0.12);
          display: flex; align-items: center; justify-content: center;
          color: var(--terracotta); font-size: 16px; font-weight: 300;
          transition: transform .3s, background .2s;
        }
        .lp-faq-icon.open { transform: rotate(45deg); background: var(--terracotta); color: var(--cream); }
        .lp-faq-a {
          display: grid; grid-template-rows: 0fr;
          transition: grid-template-rows .35s ease;
        }
        .lp-faq-a.open { grid-template-rows: 1fr; }
        .lp-faq-a > p {
          overflow: hidden; min-height: 0;
          font-family: var(--sans); font-size: 14px;
          color: var(--ink-soft); line-height: 1.72;
          padding-bottom: 20px; padding-right: 40px;
        }
        .lp-faq-cta {
          margin-top: 64px; padding: 36px 40px;
          background: var(--bg); border-radius: 4px;
          border: 1px solid var(--line);
          display: flex; align-items: center; justify-content: space-between;
          flex-wrap: wrap; gap: 20px;
        }
        .lp-faq-cta-title { font-family: var(--serif); font-size: 24px; font-weight: 400; color: var(--ink); margin-bottom: 4px; }
        .lp-faq-cta-sub { font-size: 14px; color: var(--ink-soft); }
        .lp-faq-cta-btns { display: flex; gap: 10px; flex-wrap: wrap; }
        @media (max-width: 900px) {
          .lp-faq-grid { grid-template-columns: 1fr; }
          .lp-faq-cta { padding: 24px; }
          .lp-faq-cta-title { font-size: 20px; }
        }
      `}</style>
    </section>
  )
}
