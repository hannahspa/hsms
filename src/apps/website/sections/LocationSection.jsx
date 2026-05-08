const HOURS = [
  { day: 'Thứ Hai – Thứ Sáu', time: '9:15 – 20:00' },
  { day: 'Thứ Bảy',           time: '9:15 – 20:00' },
  { day: 'Chủ Nhật',          time: '9:15 – 20:00' },
  { day: 'Ngưng nhận khách',  time: '19:30',         note: true },
]

const CONTACT = [
  {
    icon: '📍',
    label: 'Địa chỉ',
    value: '39 Nam Kỳ Khởi Nghĩa\nP.Tân An, Ninh Kiều, Cần Thơ',
    href: 'https://maps.google.com/?q=39+Nam+Ky+Khoi+Nghia+Can+Tho',
  },
  {
    icon: '📞',
    label: 'Điện thoại',
    value: '0379 080 909',
    href: 'tel:0379080909',
  },
  {
    icon: '💬',
    label: 'Facebook',
    value: 'Hannah Spa Cần Thơ',
    href: 'https://www.facebook.com/hannahspact',
  },
]

export default function LocationSection() {
  return (
    <section className="lp-location">
      <div className="lp-container">
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 'clamp(40px,6vw,60px)' }} className="lp-reveal">
          <div className="lp-eyebrow" style={{ justifyContent: 'center' }}>
            <span className="lp-dot"></span>Địa điểm · Location
          </div>
          <h2 className="lp-h-section" style={{ marginTop: 20 }}>
            Tìm <em>chúng tôi</em>
          </h2>
          <p style={{ fontFamily: 'var(--serif)', fontSize: 18, color: 'var(--ink-soft)', marginTop: 16 }}>
            Trung tâm Ninh Kiều, dễ tìm — gần công viên 3/2
          </p>
        </div>

        {/* Grid */}
        <div className="lp-location-grid lp-reveal">
          {/* Left: info + hours */}
          <div className="lp-location-info">
            {/* Contact */}
            {CONTACT.map(item => (
              <div key={item.label} className="lp-loc-contact">
                <div className="lp-loc-icon">{item.icon}</div>
                <div>
                  <div className="lp-label" style={{ marginBottom: 6 }}>{item.label}</div>
                  <a
                    href={item.href}
                    target={item.href.startsWith('http') ? '_blank' : undefined}
                    rel={item.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                    className="lp-loc-val"
                  >
                    {item.value}
                  </a>
                </div>
              </div>
            ))}

            {/* Hours */}
            <div className="lp-loc-hours">
              <div className="lp-label" style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>⏰</span> Giờ mở cửa
              </div>
              {HOURS.map((h, i) => (
                <div key={i} className="lp-hours-row">
                  <span className="lp-hours-day">
                    {h.day}
                    {h.note && <em className="lp-hours-note"> (ngưng nhận khách)</em>}
                  </span>
                  <span className={`lp-hours-time ${h.note ? 'lp-hours-note-time' : ''}`}>{h.time}</span>
                </div>
              ))}
              {/* Open now indicator */}
              <div className="lp-loc-open">
                <span className="lp-loc-dot"></span>
                <span>Đang mở cửa hôm nay</span>
                <span className="lp-loc-until">đến 20:00</span>
              </div>
            </div>

            {/* CTA */}
            <a href="https://www.facebook.com/hannahspact" target="_blank" rel="noopener noreferrer"
              className="lp-btn lp-btn-primary" style={{ alignSelf: 'flex-start' }}>
              Nhắn tin Facebook <span className="lp-arrow"></span>
            </a>
          </div>

          {/* Right: map */}
          <div className="lp-location-map">
            <iframe
              title="Hannah Beauty & Spa — Bản đồ"
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3928.8742774793297!2d105.7770086!3d10.0349686!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x31a0895a498b7a09%3A0x3e7e97fdab0c7c8b!2s39%20Nam%20K%E1%BB%B3%20Kh%E1%BB%9Fi%20Ngh%C4%A9a%2C%20T%C3%A2n%20An%2C%20Ninh%20Ki%E1%BB%81u%2C%20C%E1%BA%A7n%20Th%C6%A1!5e0!3m2!1sen!2s!4v1683500000000"
              width="100%" height="100%"
              style={{ border: 0, display: 'block', minHeight: 420 }}
              allowFullScreen=""
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </div>
      </div>

      <style>{`
        .lp-location { background: var(--bg); }
        .lp-location-grid {
          display: grid; grid-template-columns: 1fr 1.4fr;
          gap: 60px; align-items: start;
        }
        .lp-location-info { display: flex; flex-direction: column; gap: 28px; }
        .lp-loc-contact { display: flex; gap: 16px; align-items: flex-start; }
        .lp-loc-icon {
          width: 44px; height: 44px; border-radius: 12px; flex-shrink: 0;
          background: rgba(168,126,92,0.12); border: 1px solid rgba(168,126,92,0.2);
          display: flex; align-items: center; justify-content: center; font-size: 18px;
        }
        .lp-loc-val {
          font-family: var(--serif); font-size: 18px; color: var(--ink);
          white-space: pre-line; line-height: 1.5; transition: color .2s;
        }
        .lp-loc-val:hover { color: var(--terracotta); }
        .lp-loc-hours {
          background: var(--bg-alt); border-radius: 4px;
          padding: 22px 24px; border: 1px solid var(--line);
        }
        .lp-hours-row {
          display: flex; justify-content: space-between; align-items: baseline;
          padding: 8px 0; border-bottom: 1px dashed var(--line);
          font-size: 13px;
        }
        .lp-hours-row:last-of-type { border-bottom: none; }
        .lp-hours-day { color: var(--ink-soft); }
        .lp-hours-note { font-size: 11px; color: var(--ink-mute); }
        .lp-hours-time { font-family: var(--mono); font-size: 13px; font-weight: 500; color: var(--ink); }
        .lp-hours-note-time { color: #C0392B; }
        .lp-loc-open {
          margin-top: 14px; padding-top: 14px; border-top: 1px solid var(--line);
          display: flex; align-items: center; gap: 8px;
          font-size: 12px; color: #2D7A4F; font-weight: 500;
        }
        .lp-loc-dot {
          width: 8px; height: 8px; border-radius: 50%; background: #2D7A4F;
          box-shadow: 0 0 0 3px rgba(45,122,79,0.2); flex-shrink: 0;
        }
        .lp-loc-until { color: var(--ink-mute); margin-left: auto; }
        .lp-location-map {
          border-radius: 4px; overflow: hidden;
          border: 1px solid var(--line);
          height: 100%; min-height: 460px;
        }
        @media (max-width: 900px) {
          .lp-location-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </section>
  )
}
