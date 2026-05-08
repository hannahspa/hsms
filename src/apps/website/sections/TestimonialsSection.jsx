import { useState } from 'react'

const REVIEWS = [
  {
    name: 'Nguyễn Thị Lan Anh',
    role: 'Giáo viên · Ninh Kiều',
    rating: 5,
    text: 'Tôi đến Hannah đã hơn 2 năm và không nơi nào khác có thể thay thế được. Các chị ở đây không chỉ làm đẹp mà còn biết lắng nghe — mỗi lần đến là một lần được nạp lại năng lượng.',
  },
  {
    name: 'Trần Minh Châu',
    role: 'Kinh doanh · Bình Thuỷ',
    rating: 5,
    text: 'Phòng triệt lông sạch sẽ, riêng tư và chuyên viên rất chuyên nghiệp. Sau 3 lần điều trị đã thấy rõ kết quả. Giá cả hợp lý, không bị ép mua thêm — rất tin tưởng.',
  },
  {
    name: 'Lê Hương Giang',
    role: 'Nội trợ · Cần Thơ',
    rating: 5,
    text: 'Lần đầu tôi đến chỉ định làm móng, nhưng được tư vấn thêm về da miễn phí. Chị chuyên viên phân tích rất tận tình, không hề cảm thấy bị ép buộc. Từ đó trở thành khách quen.',
  },
  {
    name: 'Phạm Thu Hiền',
    role: 'Kế toán · Ô Môn',
    rating: 5,
    text: 'Không gian 3 tầng của Hannah rất đẹp và thoáng. Tôi hay đặt gói gội đầu kết hợp massage — chỉ 60 phút mà căng thẳng cả tuần tan biến hết. Sẽ tiếp tục ủng hộ mãi!',
  },
]

export default function TestimonialsSection({ items }) {
  const ACTIVE = (items && items.length > 0)
    ? items.map(r => ({ name: r.name, role: r.role, rating: r.rating || 5, text: r.text }))
    : REVIEWS
  const [idx, setIdx] = useState(0)
  const safeIdx = Math.min(idx, ACTIVE.length - 1)
  const cur = ACTIVE[safeIdx]
  const initials = cur.name.split(' ').slice(-2).map(w => w[0]).join('')

  return (
    <section id="danh-gia" className="lp-tt">
      <div className="lp-container">
        <div className="lp-tt-grid">
          {/* Left */}
          <div className="lp-tt-side lp-reveal">
            <div className="lp-eyebrow"><span className="lp-dot"></span>Cảm nhận · Voices</div>
            <h2 className="lp-h-section" style={{ marginTop: 24 }}>
              5.0<span className="lp-tt-star">★</span><br />
              <em>từ những người</em><br />chọn quay lại.
            </h2>
            <div className="lp-tt-meta">
              <div>
                <strong>500+</strong>
                <span>đánh giá Google</span>
              </div>
              <div>
                <strong>95%</strong>
                <span>khách hàng quay lại</span>
              </div>
            </div>
          </div>

          {/* Right — card */}
          <div className="lp-tt-card lp-reveal" style={{ transitionDelay: '.1s' }}>
            <div className="lp-tt-mark">"</div>
            <p className="lp-tt-text">{cur.text}</p>
            <div className="lp-tt-stars">{'★'.repeat(cur.rating)}</div>
            <div className="lp-tt-author">
              <div className="lp-tt-avatar">{initials}</div>
              <div>
                <div className="lp-tt-name">{cur.name}</div>
                <div className="lp-tt-role">{cur.role}</div>
              </div>
            </div>
            <div className="lp-tt-controls">
              <button onClick={() => setIdx((safeIdx - 1 + ACTIVE.length) % ACTIVE.length)} aria-label="Trước">←</button>
              <span className="lp-tt-count">
                {String(safeIdx + 1).padStart(2, '0')} / {String(ACTIVE.length).padStart(2, '0')}
              </span>
              <button onClick={() => setIdx((safeIdx + 1) % ACTIVE.length)} aria-label="Sau">→</button>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .lp-tt { background: var(--bg); }
        .lp-tt-grid {
          display: grid; grid-template-columns: 1fr 1.1fr;
          gap: 80px; align-items: center;
        }
        .lp-tt-star { color: var(--terracotta); font-family: var(--display); }
        .lp-tt-meta {
          margin-top: 48px; display: flex; gap: 40px;
          padding-top: 28px; border-top: 1px solid var(--line);
        }
        .lp-tt-meta div { font-size: 13px; color: var(--ink-soft); display: flex; flex-direction: column; gap: 4px; }
        .lp-tt-meta strong {
          font-family: var(--serif); font-weight: 400;
          font-size: 32px; color: var(--ink);
        }
        .lp-tt-card {
          background: var(--bg-alt); padding: 52px 52px 36px;
          border-radius: 4px; position: relative;
        }
        .lp-tt-mark {
          font-family: var(--display); font-size: 110px; line-height: 0.8;
          color: var(--terracotta); position: absolute; top: 18px; left: 32px;
        }
        .lp-tt-text {
          font-family: var(--serif); font-size: 24px; font-weight: 300;
          font-style: italic; line-height: 1.45; color: var(--ink);
          margin-top: 56px;
        }
        .lp-tt-stars { color: var(--terracotta); font-size: 13px; letter-spacing: 4px; margin-top: 24px; }
        .lp-tt-author {
          display: flex; align-items: center; gap: 14px;
          margin-top: 16px; padding-top: 22px;
          border-top: 1px solid var(--line);
        }
        .lp-tt-avatar {
          width: 50px; height: 50px; border-radius: 50%; flex-shrink: 0;
          background: var(--ink); color: var(--cream);
          display: flex; align-items: center; justify-content: center;
          font-family: var(--serif); font-size: 18px;
        }
        .lp-tt-name { font-family: var(--serif); font-size: 19px; }
        .lp-tt-role { font-family: var(--mono); font-size: 9px; letter-spacing: 0.18em; text-transform: uppercase; color: var(--ink-mute); margin-top: 2px; }
        .lp-tt-controls { display: flex; align-items: center; gap: 20px; margin-top: 28px; }
        .lp-tt-controls button {
          width: 42px; height: 42px; border-radius: 50%;
          border: 1px solid var(--line); font-size: 16px;
          transition: background .2s, color .2s, border-color .2s;
        }
        .lp-tt-controls button:hover { background: var(--ink); color: var(--cream); border-color: var(--ink); }
        .lp-tt-count { font-family: var(--mono); font-size: 11px; letter-spacing: 0.18em; color: var(--ink-mute); }
        @media (max-width: 900px) {
          .lp-tt-grid { grid-template-columns: 1fr; gap: 48px; }
          .lp-tt-card { padding: 36px 28px 28px; }
          .lp-tt-text { font-size: 19px; margin-top: 40px; }
          .lp-tt-mark { font-size: 80px; left: 20px; top: 14px; }
        }
      `}</style>
    </section>
  )
}
