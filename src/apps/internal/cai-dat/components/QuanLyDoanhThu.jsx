import { LUX } from '../../../../constants/lux'
import { HINH_THUC_THU } from '../../../../constants/enums'

export default function QuanLyDoanhThu({ onClose }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(42,32,26,0.55)', display: 'flex', alignItems: 'flex-end', zIndex: 600 }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{ background: LUX.surface2, borderRadius: '24px 24px 0 0', width: '100%', maxWidth: '520px', margin: '0 auto', padding: '24px 20px 40px', maxHeight: '80vh', overflowY: 'auto' }}
        onClick={e => e.stopPropagation()}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <h3 style={{ fontSize: '17px', fontWeight: '700', color: LUX.ink, fontFamily: LUX.fontSerif }}>Danh Mục Doanh Thu</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: LUX.ink3 }}>✕</button>
        </div>
        <p style={{ fontSize: '12px', color: LUX.ink3, marginBottom: '20px', fontFamily: LUX.fontSans }}>
          4 hình thức thu cố định — tiền tự động cập nhật vào ví tương ứng
        </p>

        {HINH_THUC_THU.map((ht, i) => (
          <div key={ht.id}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 0' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: '#F0FDF4', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>
                {ht.icon}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: '600', fontSize: '15px', color: LUX.ink, fontFamily: LUX.fontSans }}>{ht.label}</div>
                <div style={{ fontSize: '12px', color: LUX.ink3, fontFamily: LUX.fontSans }}>
                  Vào ví: <b style={{ color: LUX.taupe }}>{ht.vi}</b>
                </div>
              </div>
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#F0FDF4', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2D7A4F', fontSize: '14px' }}>✓</div>
            </div>
            {i < HINH_THUC_THU.length - 1 && <div style={{ height: '1px', background: LUX.line }} />}
          </div>
        ))}

        <div style={{ marginTop: '20px', padding: '12px', background: '#FFF9F0', borderRadius: '12px', border: '1px solid #F0C080' }}>
          <div style={{ fontSize: '12px', color: '#8B6914', fontFamily: LUX.fontSans }}>
            💡 <b>Thẻ Trả Trước</b> tính vào Doanh Thu nhưng <b>không</b> tính vào Thực Thu (dòng tiền thật). KH cũ còn thẻ, không bán mới.
          </div>
        </div>
      </div>
    </div>
  )
}
