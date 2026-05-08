/* global React */
const { useState: useStateB } = React;

function Booking() {
  const [form, setForm] = useStateB({
    name: '', phone: '', service: 'Signature Facial', date: '', time: '10:00', therapist: 'Bất kỳ', notes: ''
  });
  const [sent, setSent] = useStateB(false);
  const upd = (k, v) => setForm(f => ({...f, [k]: v}));
  const submit = (e) => { e.preventDefault(); setSent(true); };

  return (
    <section id="booking" className="hs-booking" data-screen-label="09 Booking">
      <div className="container">
        <div className="hs-booking-grid">
          <div className="hs-booking-side">
            <div className="eyebrow"><span className="dot"></span>Đặt lịch · Reservation</div>
            <h2 className="h-section" style={{marginTop: 24}}>
              Giữ chỗ <em>cho chính mình.</em>
            </h2>
            <p className="lede" style={{marginTop: 24, maxWidth: 420}}>
              Chúng tôi sẽ phản hồi trong vòng 30 phút trong giờ làm việc.
              Khách hàng mới được tặng tư vấn da chuyên sâu.
            </p>

            <div className="hs-booking-info">
              <div>
                <div className="label">Hotline</div>
                <div className="hs-booking-info-val">028 7300 8888</div>
              </div>
              <div>
                <div className="label">Zalo / WhatsApp</div>
                <div className="hs-booking-info-val">+84 909 268 868</div>
              </div>
              <div>
                <div className="label">Email</div>
                <div className="hs-booking-info-val">hello@hannahspa.vn</div>
              </div>
            </div>

            <div className="hs-booking-hours">
              <div className="label">Giờ mở cửa</div>
              <div className="hs-hours-row"><span>Thứ 2 – Thứ 6</span><span>09:30 – 22:00</span></div>
              <div className="hs-hours-row"><span>Thứ 7 – CN</span><span>09:00 – 23:00</span></div>
              <div className="hs-hours-row"><span>Lễ / Tết</span><span>10:00 – 21:00</span></div>
            </div>
          </div>

          <form className="hs-booking-form" onSubmit={submit}>
            {sent ? (
              <div className="hs-booking-thanks">
                <div className="hs-thanks-mark">✦</div>
                <h3>Cảm ơn {form.name || 'bạn'}.</h3>
                <p>Chúng tôi đã nhận yêu cầu đặt lịch và sẽ gọi xác nhận trong ít phút nữa.</p>
                <button type="button" className="btn btn-ghost" onClick={() => setSent(false)}>
                  Đặt lịch khác
                </button>
              </div>
            ) : (
              <>
                <div className="hs-form-row">
                  <div className="hs-field">
                    <label>Họ và tên</label>
                    <input type="text" required value={form.name} onChange={e => upd('name', e.target.value)} placeholder="Nguyễn Hannah" />
                  </div>
                  <div className="hs-field">
                    <label>Số điện thoại</label>
                    <input type="tel" required value={form.phone} onChange={e => upd('phone', e.target.value)} placeholder="0909 ..." />
                  </div>
                </div>
                <div className="hs-field">
                  <label>Liệu trình mong muốn</label>
                  <select value={form.service} onChange={e => upd('service', e.target.value)}>
                    <option>Signature Facial</option>
                    <option>Full Body Therapy</option>
                    <option>Aromatherapy Ritual</option>
                    <option>Hot Stone Therapy</option>
                    <option>Couple Retreat</option>
                    <option>Skin Consultation</option>
                  </select>
                </div>
                <div className="hs-form-row">
                  <div className="hs-field">
                    <label>Ngày</label>
                    <input type="date" required value={form.date} onChange={e => upd('date', e.target.value)} />
                  </div>
                  <div className="hs-field">
                    <label>Giờ</label>
                    <select value={form.time} onChange={e => upd('time', e.target.value)}>
                      {['09:30','10:30','13:00','14:30','16:00','17:30','19:00','20:30'].map(t => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="hs-field">
                    <label>Chuyên viên</label>
                    <select value={form.therapist} onChange={e => upd('therapist', e.target.value)}>
                      <option>Bất kỳ</option>
                      <option>Hannah Nguyễn</option>
                      <option>Thảo Mai</option>
                      <option>Mỹ Linh</option>
                      <option>Quỳnh Anh</option>
                    </select>
                  </div>
                </div>
                <div className="hs-field">
                  <label>Ghi chú thêm (tuỳ chọn)</label>
                  <textarea rows="3" value={form.notes} onChange={e => upd('notes', e.target.value)} placeholder="Vùng cơ thể đang căng cứng, dị ứng, mong muốn riêng..."></textarea>
                </div>
                <button type="submit" className="btn btn-primary hs-form-submit">
                  Xác nhận đặt lịch <span className="arrow"></span>
                </button>
              </>
            )}
          </form>
        </div>
      </div>

      <style>{`
        .hs-booking { background: var(--bg-alt); }
        .hs-booking-grid {
          display: grid;
          grid-template-columns: 1fr 1.2fr;
          gap: 80px;
          align-items: start;
        }
        .hs-booking-info {
          margin-top: 56px;
          display: grid;
          gap: 24px;
        }
        .hs-booking-info-val {
          font-family: var(--serif);
          font-size: 22px;
          margin-top: 4px;
        }
        .hs-booking-hours {
          margin-top: 40px;
          padding-top: 28px;
          border-top: 1px solid var(--line);
        }
        .hs-hours-row {
          display: flex;
          justify-content: space-between;
          padding: 10px 0;
          font-size: 14px;
          border-bottom: 1px dotted var(--line);
        }
        .hs-hours-row:last-child { border-bottom: none; }
        .hs-hours-row span:last-child {
          font-family: var(--serif); font-size: 17px;
        }

        .hs-booking-form {
          background: var(--bg);
          padding: 48px;
          border-radius: 4px;
          display: flex; flex-direction: column;
          gap: 22px;
        }
        .hs-form-row {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
          gap: 22px;
        }
        .hs-field { display: flex; flex-direction: column; gap: 8px; }
        .hs-field label {
          font-family: var(--mono);
          font-size: 10px;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          color: var(--ink-mute);
        }
        .hs-field input,
        .hs-field select,
        .hs-field textarea {
          font-family: var(--serif);
          font-size: 18px;
          padding: 14px 0;
          border: none;
          border-bottom: 1px solid var(--line);
          background: transparent;
          color: var(--ink);
          outline: none;
          transition: border-color .2s;
          width: 100%;
        }
        .hs-field input:focus,
        .hs-field select:focus,
        .hs-field textarea:focus {
          border-bottom-color: var(--terracotta);
        }
        .hs-field textarea {
          resize: vertical;
          font-family: var(--sans);
          font-size: 15px;
        }
        .hs-form-submit { align-self: flex-start; margin-top: 12px; }

        .hs-booking-thanks {
          text-align: center;
          padding: 60px 20px;
        }
        .hs-thanks-mark {
          font-family: var(--display);
          font-size: 48px;
          color: var(--terracotta);
        }
        .hs-booking-thanks h3 {
          font-family: var(--serif);
          font-size: 36px;
          font-weight: 400;
          margin-top: 16px;
        }
        .hs-booking-thanks p {
          color: var(--ink-soft);
          margin-top: 12px;
          margin-bottom: 28px;
        }

        @media (max-width: 980px) {
          .hs-booking-grid { grid-template-columns: 1fr; }
          .hs-booking-form { padding: 28px; }
        }
      `}</style>
    </section>
  );
}
window.Booking = Booking;
