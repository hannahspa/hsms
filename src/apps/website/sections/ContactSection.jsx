import { useState } from 'react'

const SERVICES = [
  'Gội Đầu Dưỡng Sinh',
  'Massage Body & Đá Nóng',
  'Triệt Lông Công Nghệ Cao',
  'Chăm Sóc Da Công Nghệ Cao',
  'Tắm Trắng & Giảm Béo',
  'Tư vấn da (miễn phí)',
]

export default function ContactSection() {
  const [form, setForm] = useState({ name: '', phone: '', service: SERVICES[0], note: '' })
  const [sent, setSent] = useState(false)
  const upd = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = (e) => {
    e.preventDefault()
    const msg = encodeURIComponent(
      `Xin chào Hannah Spa! Tôi muốn đặt lịch:\nTên: ${form.name}\nSĐT: ${form.phone}\nDịch vụ: ${form.service}${form.note ? `\nGhi chú: ${form.note}` : ''}`
    )
    window.open(`https://www.facebook.com/hannahspact`, '_blank')
    setSent(true)
  }

  return (
    <section id="dat-lich" className="lp-booking">
      <div className="lp-container">
        <div className="lp-booking-grid">
          {/* Left */}
          <div className="lp-booking-side lp-reveal">
            <div className="lp-eyebrow"><span className="lp-dot"></span>Đặt lịch · Reservation</div>
            <h2 className="lp-h-section" style={{ marginTop: 24 }}>
              Giữ chỗ <em>cho chính mình.</em>
            </h2>
            <p className="lp-lede" style={{ marginTop: 24 }}>
              Điền thông tin bên cạnh — chúng tôi sẽ xác nhận qua Facebook trong vòng 30 phút trong giờ làm việc.
            </p>

            <div className="lp-booking-info">
              <div>
                <div className="lp-label">Hotline</div>
                <div className="lp-booking-val">0379 080 909</div>
              </div>
              <div>
                <div className="lp-label">Facebook</div>
                <div className="lp-booking-val">
                  <a href="https://www.facebook.com/hannahspact" target="_blank" rel="noopener noreferrer" style={{ color: 'inherit' }}>
                    Hannah Spa Cần Thơ
                  </a>
                </div>
              </div>
            </div>

            <div className="lp-booking-hours">
              <div className="lp-bk-row"><span>Thứ 2 – Thứ 6</span><span>9:15 – 20:00</span></div>
              <div className="lp-bk-row"><span>Thứ 7 – Chủ Nhật</span><span>9:15 – 20:00</span></div>
              <div className="lp-bk-row lp-bk-note"><span>Ngưng nhận khách</span><span>19:30</span></div>
            </div>
          </div>

          {/* Right — form */}
          <form className="lp-booking-form lp-reveal" style={{ transitionDelay: '.1s' }} onSubmit={handleSubmit}>
            {sent ? (
              <div className="lp-booking-thanks">
                <div className="lp-thanks-mark">✦</div>
                <h3>Cảm ơn {form.name || 'bạn'}!</h3>
                <p>Trang Facebook đã mở — vui lòng nhắn tin để xác nhận lịch. Chúng tôi sẽ phản hồi sớm nhất có thể.</p>
                <button type="button" className="lp-btn lp-btn-ghost" onClick={() => setSent(false)} style={{ marginTop: 24 }}>
                  Đặt lịch khác
                </button>
              </div>
            ) : (
              <>
                <div className="lp-form-row">
                  <div className="lp-field">
                    <label>Họ và tên</label>
                    <input type="text" required value={form.name} onChange={e => upd('name', e.target.value)} placeholder="Nguyễn Thị Lan" />
                  </div>
                  <div className="lp-field">
                    <label>Số điện thoại</label>
                    <input type="tel" required value={form.phone} onChange={e => upd('phone', e.target.value)} placeholder="0909 ..." />
                  </div>
                </div>
                <div className="lp-field">
                  <label>Dịch vụ mong muốn</label>
                  <select value={form.service} onChange={e => upd('service', e.target.value)}>
                    {SERVICES.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div className="lp-field">
                  <label>Ghi chú thêm (tuỳ chọn)</label>
                  <textarea rows="3" value={form.note} onChange={e => upd('note', e.target.value)} placeholder="Thời gian mong muốn, yêu cầu đặc biệt..."></textarea>
                </div>
                <button type="submit" className="lp-btn lp-btn-primary lp-form-submit">
                  Nhắn tin Facebook <span className="lp-arrow"></span>
                </button>
              </>
            )}
          </form>
        </div>
      </div>

      <style>{`
        .lp-booking { background: var(--bg-alt); }
        .lp-booking-grid {
          display: grid; grid-template-columns: 1fr 1.2fr;
          gap: 80px; align-items: start;
        }
        .lp-booking-info { margin-top: 48px; display: grid; gap: 22px; }
        .lp-booking-val { font-family: var(--serif); font-size: 21px; margin-top: 4px; color: var(--ink); }
        .lp-booking-hours {
          margin-top: 32px; padding-top: 24px; border-top: 1px solid var(--line);
        }
        .lp-bk-row {
          display: flex; justify-content: space-between;
          padding: 9px 0; font-size: 13px; color: var(--ink-soft);
          border-bottom: 1px dotted var(--line);
        }
        .lp-bk-row:last-child { border-bottom: none; }
        .lp-bk-row span:last-child { font-family: var(--serif); font-size: 16px; color: var(--ink); }
        .lp-bk-note { color: var(--ink-mute); }
        .lp-bk-note span:last-child { color: #C0392B; font-size: 14px; }

        .lp-booking-form {
          background: var(--bg); padding: 48px; border-radius: 4px;
          display: flex; flex-direction: column; gap: 22px;
        }
        .lp-form-row {
          display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 22px;
        }
        .lp-field { display: flex; flex-direction: column; gap: 8px; }
        .lp-field label {
          font-family: var(--mono); font-size: 10px;
          letter-spacing: 0.22em; text-transform: uppercase; color: var(--ink-mute);
        }
        .lp-field input, .lp-field select, .lp-field textarea {
          font-family: var(--serif); font-size: 18px;
          padding: 12px 0; border: none;
          border-bottom: 1px solid var(--line);
          background: transparent; color: var(--ink); outline: none;
          transition: border-color .2s; width: 100%;
        }
        .lp-field input:focus, .lp-field select:focus, .lp-field textarea:focus {
          border-bottom-color: var(--terracotta);
        }
        .lp-field textarea { resize: vertical; font-family: var(--sans); font-size: 14px; }
        .lp-form-submit { align-self: flex-start; margin-top: 8px; }

        .lp-booking-thanks { text-align: center; padding: 48px 20px; }
        .lp-thanks-mark { font-family: var(--display); font-size: 48px; color: var(--terracotta); }
        .lp-booking-thanks h3 { font-family: var(--serif); font-size: 32px; font-weight: 400; margin-top: 14px; }
        .lp-booking-thanks p { color: var(--ink-soft); margin-top: 12px; line-height: 1.6; font-size: 14px; }

        @media (max-width: 900px) {
          .lp-booking-grid { grid-template-columns: 1fr; gap: 48px; }
          .lp-booking-form { padding: 28px; }
        }
      `}</style>
    </section>
  )
}
