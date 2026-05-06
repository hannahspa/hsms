import { LUX } from '../../../../constants/lux'

export default function ThongTinSpa({ onClose }) {
  const info = [
    { label: 'Tên doanh nghiệp', value: 'Hannah Beauty & Spa' },
    { label: 'Địa chỉ',          value: '39 Nam Kỳ Khởi Nghĩa, P.Tân An, Ninh Kiều, Cần Thơ' },
    { label: 'Thành lập',        value: '15/04/2019' },
    { label: 'Giờ làm việc',     value: '9:15 – 20:00 (ngưng nhận khách 19:30)' },
    { label: 'Email',            value: 'hannahspa.nm@gmail.com' },
    { label: 'Website',          value: 'hannahspa.vn' },
    { label: 'POS',              value: 'myspa.vn (nguồn hoa hồng KTV)' },
    { label: 'Ngân hàng chính',  value: 'MB Bank' },
    { label: 'Ngân hàng quẹt thẻ', value: 'TP Bank (về sau 3-7 ngày)' },
    { label: 'Chủ sở hữu',       value: 'Cao Quốc Nam — quản lý từ Mỹ' },
  ]

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(42,32,26,0.55)', display: 'flex', alignItems: 'flex-end', zIndex: 600 }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{ background: LUX.surface2, borderRadius: '24px 24px 0 0', width: '100%', maxWidth: '520px', margin: '0 auto', padding: '24px 20px 40px', maxHeight: '80vh', overflowY: 'auto' }}
        onClick={e => e.stopPropagation()}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <h3 style={{ fontSize: '17px', fontWeight: '700', color: LUX.ink, fontFamily: LUX.fontSerif }}>Thông Tin Spa</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: LUX.ink3 }}>✕</button>
        </div>
        <p style={{ fontSize: '12px', color: LUX.ink3, marginBottom: '16px', fontFamily: LUX.fontSans }}>Thông tin doanh nghiệp — cập nhật trong code</p>

        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <img src="/logo.png" alt="Hannah Spa" style={{ width: '120px', height: 'auto', marginBottom: '8px' }} />
          <div style={{ fontSize: '14px', color: LUX.taupe, fontFamily: "'Dancing Script', cursive" }}>Giữ Mãi Nét Thanh Xuân Của Bạn</div>
        </div>

        {info.map((row, i) => (
          <div key={row.label}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', alignItems: 'flex-start' }}>
              <span style={{ fontSize: '12px', color: LUX.ink3, fontFamily: LUX.fontSans, flexShrink: 0 }}>{row.label}</span>
              <span style={{ fontSize: '13px', fontWeight: '600', color: LUX.ink, textAlign: 'right', maxWidth: '60%', fontFamily: LUX.fontSans }}>{row.value}</span>
            </div>
            {i < info.length - 1 && <div style={{ height: '1px', background: LUX.line }} />}
          </div>
        ))}
      </div>
    </div>
  )
}
