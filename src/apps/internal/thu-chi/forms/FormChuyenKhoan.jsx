import { useState } from 'react'
import { supabase } from '../../../../lib/supabase'
import { COLORS } from '../../../../constants/colors'
import { formatCurrency, todayISO } from '../../../../lib/utils'
import { HINH_THUC_THU } from '../../../../constants/enums'
import DatePicker from '../../../../components/shared/DatePicker'

// LƯU Ý: Dòng dưới đây cực kỳ quan trọng để sửa lỗi trắng màn hình
export default function FormChuyenKhoan({ onClose, onSaved }) {
  const [soTien,   setSoTien]   = useState('')
  const [ngay,     setNgay]     = useState(todayISO())
  const [dienGiai, setDienGiai] = useState('')
  const [saving,   setSaving]   = useState(false)
  const [showLich, setShowLich] = useState(false)
  
  const [tuVi,     setTuVi]     = useState(null) 
  const [denVi,    setDenVi]    = useState(null) 
  const [step,     setStep]     = useState('main')

  const handleSave = async () => {
    if (!soTien || parseInt(soTien) <= 0) return onSaved('error', 'Vui lòng nhập số tiền!')
    if (!tuVi || !denVi) return onSaved('error', 'Vui lòng chọn đầy đủ Ví gửi và Ví nhận!')
    if (tuVi.id === denVi.id) return onSaved('error', 'Ví gửi và Ví nhận không được trùng nhau!')
    
    setSaving(true)
    try {
      const { error } = await supabase.from('chuyen_khoan_noi_bo').insert({
        ngay: ngay,
        tu_vi_id: tuVi.label, 
        den_vi_id: denVi.label,
        so_tien: parseInt(soTien),
        dien_giai: dienGiai || null,
      })
      if (error) throw error
      onSaved('success', `Đã chuyển ${formatCurrency(parseInt(soTien))} thành công!`)
      onClose()
    } catch (err) {
      onSaved('error', 'Lỗi: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const displayDate = (isoDate) => {
    const [y, m, d] = isoDate.split('-')
    return `${d}/${m}/${y}`
  }

  if (step === 'chon_tu_vi' || step === 'chon_den_vi') {
    return (
      <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-end', zIndex: 600 }}>
        <div style={{ background: COLORS.card, borderRadius: '24px 24px 0 0', width: '100%', maxWidth: '420px', margin: '0 auto', padding: '24px 20px 40px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '17px', fontWeight: '700', color: COLORS.text }}>{step === 'chon_tu_vi' ? 'Chọn Ví Gửi Đi' : 'Chọn Ví Nhận Đến'}</h3>
            <button onClick={() => setStep('main')} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: COLORS.textMute }}>✕</button>
          </div>
          {HINH_THUC_THU.filter(v => v.id !== 'the_tra_truoc').map((v, i) => (
            <div key={v.id}>
              <button onClick={() => { step === 'chon_tu_vi' ? setTuVi(v) : setDenVi(v); setStep('main'); }} style={{ display: 'flex', alignItems: 'center', gap: '14px', width: '100%', padding: '16px 0', background: 'none', border: 'none', cursor: 'pointer' }}>
                <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: COLORS.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px' }}>{v.icon}</div>
                <div style={{ fontWeight: '600', fontSize: '15px', color: COLORS.text }}>{v.label}</div>
              </button>
              {i < HINH_THUC_THU.filter(v => v.id !== 'the_tra_truoc').length - 1 && <div style={{ height: '1px', background: COLORS.border }} />}
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-end', zIndex: 500 }} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <DatePicker open={showLich} selectedDate={ngay} onClose={() => setShowLich(false)} onConfirm={(d) => { setNgay(d); setShowLich(false); }} />

      <div style={{ background: COLORS.bg, borderRadius: '24px 24px 0 0', width: '100%', maxWidth: '420px', margin: '0 auto', maxHeight: '92vh', overflowY: 'auto', animation: 'slideUp 0.3s ease' }}>
        <style>{`@keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}`}</style>
        
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '12px' }}><div style={{ width: '40px', height: '4px', borderRadius: '2px', backgroundColor: '#E0D4CA' }} /></div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'linear-gradient(135deg,#EFF6FF,#DBEAFE)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>🔄</div>
            <div style={{ fontWeight: '700', fontSize: '16px', color: COLORS.text }}>Chuyển Khoản Nội Bộ</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '20px', color: COLORS.textMute }}>✕</button>
        </div>

        <div style={{ padding: '0 16px 32px' }}>
          
          <div style={{ background: COLORS.card, borderRadius: '20px', padding: '20px', marginBottom: '16px', boxShadow: COLORS.shadow, border: `1px solid ${COLORS.border}`, textAlign: 'center' }}>
            <div style={{ fontSize: '12px', color: COLORS.textMute, marginBottom: '8px', textTransform: 'uppercase' }}>Số Tiền Chuyển</div>
            <input type="number" placeholder="0" value={soTien} onChange={e => setSoTien(e.target.value)} style={{ width: '100%', border: 'none', outline: 'none', fontSize: '36px', fontWeight: '800', textAlign: 'center', background: 'transparent', color: COLORS.chuyenKhoan }} />
          </div>

          <div style={{ background: COLORS.card, borderRadius: '20px', padding: '10px 20px', marginBottom: '16px', boxShadow: COLORS.shadow, border: `1px solid ${COLORS.border}`, position: 'relative' }}>
            <div onClick={() => setStep('chon_tu_vi')} style={{ padding: '12px 0', cursor: 'pointer' }}>
                <div style={{ fontSize: '11px', color: COLORS.textMute, marginBottom: '4px' }}>Từ tài khoản</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ fontSize: '20px' }}>{tuVi?.icon || '🏦'}</div>
                    <div style={{ fontWeight: '600', fontSize: '15px', color: tuVi ? COLORS.text : COLORS.textMute }}>{tuVi ? tuVi.label : 'Chọn ví gửi...'}</div>
                </div>
            </div>
            <div style={{ height: '1px', background: COLORS.border, margin: '4px 0', position: 'relative' }}>
                <div style={{ position: 'absolute', right: '0', top: '-14px', width: '28px', height: '28px', background: 'white', border: `1px solid ${COLORS.border}`, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', color: COLORS.primary }}>🔃</div>
            </div>
            <div onClick={() => setStep('chon_den_vi')} style={{ padding: '12px 0', cursor: 'pointer' }}>
                <div style={{ fontSize: '11px', color: COLORS.textMute, marginBottom: '4px' }}>Đến tài khoản</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ fontSize: '20px' }}>{denVi?.icon || '🏦'}</div>
                    <div style={{ fontWeight: '600', fontSize: '15px', color: denVi ? COLORS.text : COLORS.textMute }}>{denVi ? denVi.label : 'Chọn ví nhận...'}</div>
                </div>
            </div>
          </div>

          <div onClick={() => setShowLich(true)} style={{ display: 'flex', alignItems: 'center', gap: '12px', background: COLORS.card, borderRadius: '20px', padding: '16px 20px', marginBottom: '16px', boxShadow: COLORS.shadow, border: `1px solid ${COLORS.border}`, cursor: 'pointer' }}>
            <div style={{ fontSize: '20px' }}>📅</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '11px', color: COLORS.textMute }}>Ngày thực hiện</div>
              <div style={{ fontSize: '15px', fontWeight: '700', color: COLORS.text }}>{displayDate(ngay)}</div>
            </div>
          </div>

          <div style={{ background: COLORS.card, borderRadius: '20px', padding: '16px 20px', marginBottom: '24px', boxShadow: COLORS.shadow, border: `1px solid ${COLORS.border}` }}>
            <div style={{ fontSize: '11px', color: COLORS.textMute, marginBottom: '4px' }}>Diễn giải</div>
            <textarea placeholder="Ghi chú nội dung chuyển khoản..." value={dienGiai} onChange={e => setDienGiai(e.target.value)} rows={2} style={{ width: '100%', border: 'none', outline: 'none', fontSize: '14px', color: COLORS.text, background: 'transparent', resize: 'none' }} />
          </div>

          <button onClick={handleSave} disabled={saving} style={{ width: '100%', padding: '16px', background: COLORS.chuyenKhoan, border: 'none', borderRadius: '18px', color: 'white', fontSize: '16px', fontWeight: '700', cursor: 'pointer', boxShadow: '0 6px 20px rgba(108,52,131,0.3)' }}>
            {saving ? '⏳ Đang lưu...' : '💾 Lưu Chuyển Khoản'}
          </button>
        </div>
      </div>
    </div>
  )
}