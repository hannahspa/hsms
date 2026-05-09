import { useState, useEffect } from 'react'
import { supabase } from '../../../../lib/supabase'
import { LUX } from '../../../../constants/lux'
import { formatCurrency, todayISO, formatDateInput } from '../../../../lib/utils'
import { HINH_THUC_THU } from '../../../../constants/enums'
import DatePicker from '../../../../components/shared/DatePicker'
import ImageUpload from '../../../../components/shared/ImageUpload'

function getViName(loaiVi, viList) {
  if (!loaiVi) return 'Thẻ Trả Trước (không vào ví)'
  const vi = viList.find(v => v.loai === loaiVi)
  return vi ? vi.ten : loaiVi
}

export default function FormDoanhThu({ user, onClose, onSaved, viList = [] }) {
  const [soTien,      setSoTien]      = useState('')
  const [hinhThuc,    setHinhThuc]    = useState(null)
  const [ngay,        setNgay]        = useState(todayISO())
  const [dienGiai,    setDienGiai]    = useState('')
  const [chungTuUrl,  setChungTuUrl]  = useState(null)
  const [saving,      setSaving]      = useState(false)
  const [showLich,    setShowLich]    = useState(false)

  const handleSave = async () => {
    if (!soTien || parseInt(soTien) <= 0) return onSaved('error', 'Vui lòng nhập số tiền!')
    if (!hinhThuc) return onSaved('error', 'Vui lòng chọn hình thức thu!')

    setSaving(true)
    try {
      const { error } = await supabase.from('doanh_thu').insert({
        ngay: ngay, hinh_thuc: hinhThuc.id, so_tien: parseInt(soTien), dien_giai: dienGiai || null,
        nguoi_nhap: user?.ho_ten || null,
        chung_tu_url: chungTuUrl,
      })
      if (error) throw error
      onSaved('success', `Đã thu ${formatCurrency(parseInt(soTien))} thành công!`)
      onClose()
    } catch (err) {
      onSaved('error', 'Lỗi: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(42,32,26,0.55)', display: 'flex', alignItems: 'flex-end', zIndex: 500 }} onClick={e => { if (e.target === e.currentTarget) onClose() }}>

      <DatePicker open={showLich} selectedDate={ngay} onClose={() => setShowLich(false)} onConfirm={(newDate) => { setNgay(newDate); setShowLich(false); }} />

      <div style={{ background: LUX.surface, borderRadius: '24px 24px 0 0', width: '100%', maxWidth: '520px', margin: '0 auto', maxHeight: '92vh', overflowY: 'auto', animation: 'slideUp 0.3s ease' }}>
        <style>{`@keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}`}</style>

        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '12px', paddingBottom: '4px' }}><div style={{ width: '40px', height: '4px', borderRadius: '2px', backgroundColor: LUX.line2 }} /></div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#F0FDF4', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>💰</div>
            <div><div style={{ fontWeight: '700', fontSize: '16px', color: LUX.ink, fontFamily: LUX.fontSerif }}>Doanh Thu</div><div style={{ fontSize: '11px', color: LUX.ink3, fontFamily: LUX.fontSans }}>Nhập doanh thu mới</div></div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: LUX.ink3 }}>✕</button>
        </div>

        <div style={{ padding: '0 16px 32px' }}>
          <div style={{ background: LUX.surface2, borderRadius: LUX.radius, padding: '20px', marginBottom: '12px', boxShadow: LUX.shadowSm, border: `1px solid ${LUX.line}`, textAlign: 'center' }}>
            <div style={{ fontSize: '12px', color: LUX.ink3, marginBottom: '8px', letterSpacing: '1px', textTransform: 'uppercase', fontFamily: LUX.fontSans }}>Số Tiền</div>
            <input type="number" placeholder="0" value={soTien} onChange={e => setSoTien(e.target.value.replace(/\D/g, ''))} style={{ width: '100%', border: 'none', outline: 'none', fontSize: '36px', fontWeight: '700', textAlign: 'center', background: 'transparent', color: soTien ? '#2D7A4F' : LUX.line2, fontFamily: LUX.fontMono }} />
            {soTien && <div style={{ fontSize: '14px', color: '#2D7A4F', fontWeight: '600', marginTop: '4px', fontFamily: LUX.fontSans }}>{new Intl.NumberFormat('vi-VN').format(parseInt(soTien))} đ</div>}
          </div>

          <div style={{ background: LUX.surface2, borderRadius: LUX.radius, padding: '18px 20px', marginBottom: '12px', boxShadow: LUX.shadowSm, border: `1px solid ${LUX.line}` }}>
            <div style={{ fontSize: '12px', color: LUX.ink3, marginBottom: '14px', letterSpacing: '1px', textTransform: 'uppercase', fontFamily: LUX.fontSans }}>Hình Thức Thu</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              {HINH_THUC_THU.map(ht => (
                <button key={ht.id} onClick={() => setHinhThuc(ht)} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 14px', borderRadius: LUX.radiusSm, border: hinhThuc?.id === ht.id ? `2px solid ${LUX.taupe}` : `1px solid ${LUX.line}`, background: hinhThuc?.id === ht.id ? LUX.surface : LUX.surface2, cursor: 'pointer', transition: 'all 0.15s' }}>
                  <span style={{ fontSize: '22px' }}>{ht.icon}</span><span style={{ fontSize: '12px', fontWeight: hinhThuc?.id === ht.id ? '600' : '400', color: hinhThuc?.id === ht.id ? LUX.taupe : LUX.ink, fontFamily: LUX.fontSans }}>{ht.label}</span>
                  {hinhThuc?.id === ht.id && <span style={{ marginLeft: 'auto', color: LUX.taupe, fontSize: '14px' }}>✓</span>}
                </button>
              ))}
            </div>
            {hinhThuc && <div style={{ marginTop: '12px', padding: '10px', background: `${LUX.taupe}08`, borderRadius: '10px', fontSize: '12px', color: LUX.ink2, textAlign: 'center', fontWeight: '500', fontFamily: LUX.fontSans }}>💡 Tiền sẽ tự động cập nhật vào: <b style={{color: LUX.taupe}}>{getViName(hinhThuc.loaiVi, viList)}</b></div>}
          </div>

          <div onClick={() => setShowLich(true)} style={{ display: 'flex', alignItems: 'center', gap: '12px', background: LUX.surface2, borderRadius: LUX.radius, padding: '16px 20px', marginBottom: '12px', boxShadow: LUX.shadowSm, border: `1px solid ${LUX.line}`, cursor: 'pointer' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '11px', background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>📅</div>
            <div style={{ flex: 1 }}><div style={{ fontSize: '11px', color: LUX.ink3, marginBottom: '2px', fontFamily: LUX.fontSans }}>Ngày Thu</div><div style={{ fontSize: '15px', fontWeight: '600', color: LUX.ink, fontFamily: LUX.fontSans }}>{formatDateInput(ngay)}</div></div>
            <div style={{ fontSize: '18px', color: LUX.ink3 }}>›</div>
          </div>

          <div style={{ background: LUX.surface2, borderRadius: LUX.radius, padding: '16px 20px', marginBottom: '12px', boxShadow: LUX.shadowSm, border: `1px solid ${LUX.line}` }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '11px', background: '#FDF4FF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0 }}>📝</div>
              <div style={{ flex: 1 }}><div style={{ fontSize: '11px', color: LUX.ink3, marginBottom: '4px', fontFamily: LUX.fontSans }}>Diễn Giải</div><textarea placeholder="Ghi chú thêm (không bắt buộc)..." value={dienGiai} onChange={e => setDienGiai(e.target.value)} rows={2} style={{ width: '100%', border: 'none', outline: 'none', fontSize: '14px', color: LUX.ink, background: 'transparent', resize: 'none', fontFamily: LUX.fontSans }} /></div>
            </div>
          </div>

          <ImageUpload
            onUploaded={(url) => setChungTuUrl(url)}
            onRemove={() => setChungTuUrl(null)}
          />

          <button onClick={handleSave} disabled={saving} style={{ width: '100%', padding: '16px', background: saving ? LUX.ink3 : 'linear-gradient(135deg,#2D7A4F,#1A5A3A)', border: 'none', borderRadius: LUX.radius, color: 'white', fontSize: '16px', fontWeight: '600', cursor: saving ? 'not-allowed' : 'pointer', boxShadow: '0 6px 20px rgba(45,122,79,0.35)', transition: 'all 0.2s', fontFamily: LUX.fontSans }}>
            {saving ? '⏳ Đang lưu...' : '💾 Lưu Doanh Thu'}
          </button>
        </div>
      </div>
    </div>
  )
}
