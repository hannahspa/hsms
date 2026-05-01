import { useState } from 'react'
import { supabase } from '../../../../lib/supabase'
import { COLORS } from '../../../../constants/colors'
import { formatCurrency, todayISO } from '../../../../lib/utils'
import { HINH_THUC_THU } from '../../../../constants/enums'

export default function FormDoanhThu({ viList, onClose, onSaved }) {
  const [soTien,   setSoTien]   = useState('')
  const [hinhThuc, setHinhThuc] = useState(null)
  const [viId,     setViId]     = useState(null)
  const [ngay,     setNgay]     = useState(todayISO())
  const [dienGiai, setDienGiai] = useState('')
  const [saving,   setSaving]   = useState(false)
  const [step,     setStep]     = useState('main')

  const chonHinhThuc = (ht) => {
    setHinhThuc(ht)
    const viMacDinh = viList.find(v => v.ten === ht.vi)
    if (viMacDinh) setViId(viMacDinh.id)
  }

  const viSelected = viList.find(v => v.id === viId)

  const handleSave = async () => {
    if (!soTien || parseInt(soTien) <= 0) return onSaved('error', 'Vui lòng nhập số tiền!')
    if (!hinhThuc) return onSaved('error', 'Vui lòng chọn hình thức thu!')
    if (!viId)     return onSaved('error', 'Vui lòng chọn ví nhận!')

    setSaving(true)
    try {
      const { data: dmData } = await supabase
        .from('danh_muc').select('id').eq('ten', hinhThuc.label).eq('loai', 'thu').single()

      const { error } = await supabase.from('giao_dich').insert({
        ngay, loai: 'thu',
        so_tien:     parseInt(soTien),
        danh_muc_id: dmData?.id || null,
        vi_id:       viId,
        dien_giai:   dienGiai || null,
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

  if (step === 'chon_vi') {
    return (
      <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-end', zIndex: 500 }}>
        <div style={{ background: COLORS.card, borderRadius: '24px 24px 0 0', width: '100%', maxWidth: '420px', margin: '0 auto', padding: '24px 20px 40px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '17px', fontWeight: '700', color: COLORS.text }}>Chọn Tài Khoản</h3>
            <button onClick={() => setStep('main')} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: COLORS.textMute }}>✕</button>
          </div>
          {viList.map((vi, i) => (
            <div key={vi.id}>
              <button onClick={() => { setViId(vi.id); setStep('main') }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '14px 0', background: 'none', border: 'none', cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '44px', height: '44px', borderRadius: '13px', background: 'linear-gradient(135deg,#F9F0E8,#F0DDD0)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px' }}>{vi.icon}</div>
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontWeight: '600', fontSize: '15px', color: COLORS.text }}>{vi.ten}</div>
                    <div style={{ fontSize: '11px', color: COLORS.textMute }}>{formatCurrency(vi.so_du_dau)}</div>
                  </div>
                </div>
                {viId === vi.id && <span style={{ color: COLORS.primary, fontSize: '20px' }}>✓</span>}
              </button>
              {i < viList.length-1 && <div style={{ height: '1px', background: 'linear-gradient(90deg,transparent,rgba(160,113,79,0.1),transparent)' }} />}
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-end', zIndex: 500 }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{ background: COLORS.bg, borderRadius: '24px 24px 0 0', width: '100%', maxWidth: '420px', margin: '0 auto', maxHeight: '92vh', overflowY: 'auto', animation: 'slideUp 0.3s ease' }}>
        <style>{`@keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}`}</style>

        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '12px', paddingBottom: '4px' }}>
          <div style={{ width: '40px', height: '4px', borderRadius: '2px', backgroundColor: '#E0D4CA' }} />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'linear-gradient(135deg,#F0FDF4,#DCFCE7)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>💰</div>
            <div>
              <div style={{ fontWeight: '700', fontSize: '16px', color: COLORS.text }}>Doanh Thu</div>
              <div style={{ fontSize: '11px', color: COLORS.textMute }}>Nhập doanh thu</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: COLORS.textMute }}>✕</button>
        </div>

        <div style={{ padding: '0 16px 32px' }}>

          {/* Số tiền */}
          <div style={{ background: COLORS.card, borderRadius: '20px', padding: '20px', marginBottom: '12px', boxShadow: COLORS.shadow, border: `1px solid ${COLORS.border}`, textAlign: 'center' }}>
            <div style={{ fontSize: '12px', color: COLORS.textMute, marginBottom: '8px', letterSpacing: '1px', textTransform: 'uppercase' }}>Số Tiền</div>
            <input
              type="number" placeholder="0" value={soTien}
              onChange={e => setSoTien(e.target.value.replace(/\D/g,''))}
              style={{ width: '100%', border: 'none', outline: 'none', fontSize: '36px', fontWeight: '800', textAlign: 'center', background: 'transparent', color: soTien ? COLORS.thu : '#D0C0B0' }}
            />
            {soTien && <div style={{ fontSize: '14px', color: COLORS.thu, fontWeight: '600', marginTop: '4px' }}>{new Intl.NumberFormat('vi-VN').format(parseInt(soTien))} đ</div>}
          </div>

          {/* Hình thức thu */}
          <div style={{ background: COLORS.card, borderRadius: '20px', padding: '18px 20px', marginBottom: '12px', boxShadow: COLORS.shadow, border: `1px solid ${COLORS.border}` }}>
            <div style={{ fontSize: '12px', color: COLORS.textMute, marginBottom: '14px', letterSpacing: '1px', textTransform: 'uppercase' }}>Hình Thức Thu</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              {HINH_THUC_THU.map(ht => (
                <button key={ht.id} onClick={() => chonHinhThuc(ht)} style={{
                  display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 14px', borderRadius: '14px',
                  border: hinhThuc?.id === ht.id ? `2px solid ${COLORS.primary}` : `1px solid ${COLORS.border}`,
                  background: hinhThuc?.id === ht.id ? 'linear-gradient(135deg,#FFF8F0,#F5EDE6)' : 'white',
                  cursor: 'pointer', transition: 'all 0.15s'
                }}>
                  <span style={{ fontSize: '22px' }}>{ht.icon}</span>
                  <span style={{ fontSize: '12px', fontWeight: hinhThuc?.id === ht.id ? '700' : '500', color: hinhThuc?.id === ht.id ? COLORS.primary : COLORS.text }}>{ht.label}</span>
                  {hinhThuc?.id === ht.id && <span style={{ marginLeft: 'auto', color: COLORS.primary, fontSize: '14px' }}>✓</span>}
                </button>
              ))}
            </div>
          </div>

          {/* Ví nhận */}
          <button onClick={() => setStep('chon_vi')} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', background: COLORS.card, borderRadius: '20px', padding: '16px 20px', marginBottom: '12px', boxShadow: COLORS.shadow, border: `1px solid ${COLORS.border}`, cursor: 'pointer' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '11px', background: 'linear-gradient(135deg,#F9F0E8,#F0DDD0)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>{viSelected ? viSelected.icon : '💳'}</div>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: '11px', color: COLORS.textMute, marginBottom: '2px' }}>Ví Nhận Tiền</div>
                <div style={{ fontWeight: '600', fontSize: '14px', color: COLORS.text }}>{viSelected ? viSelected.ten : 'Chọn tài khoản'}</div>
              </div>
            </div>
            <span style={{ color: COLORS.gold, fontSize: '18px' }}>›</span>
          </button>

          {/* Ngày */}
          <div style={{ background: COLORS.card, borderRadius: '20px', padding: '16px 20px', marginBottom: '12px', boxShadow: COLORS.shadow, border: `1px solid ${COLORS.border}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '11px', background: 'linear-gradient(135deg,#EFF6FF,#DBEAFE)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>📅</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '11px', color: COLORS.textMute, marginBottom: '2px' }}>Ngày</div>
                <input type="date" value={ngay} onChange={e => setNgay(e.target.value)} style={{ border: 'none', outline: 'none', fontSize: '14px', fontWeight: '600', color: COLORS.text, background: 'transparent', width: '100%', cursor: 'pointer' }} />
              </div>
            </div>
          </div>

          {/* Diễn giải */}
          <div style={{ background: COLORS.card, borderRadius: '20px', padding: '16px 20px', marginBottom: '24px', boxShadow: COLORS.shadow, border: `1px solid ${COLORS.border}` }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '11px', background: 'linear-gradient(135deg,#FDF4FF,#FAE8FF)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0 }}>📝</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '11px', color: COLORS.textMute, marginBottom: '4px' }}>Diễn Giải</div>
                <textarea placeholder="Ghi chú thêm (không bắt buộc)..." value={dienGiai} onChange={e => setDienGiai(e.target.value)} rows={2}
                  style={{ width: '100%', border: 'none', outline: 'none', fontSize: '14px', color: COLORS.text, background: 'transparent', resize: 'none', fontFamily: 'inherit' }} />
              </div>
            </div>
          </div>

          {/* Lưu */}
          <button onClick={handleSave} disabled={saving} style={{ width: '100%', padding: '16px', background: saving ? '#C4A882' : COLORS.grad, border: 'none', borderRadius: '18px', color: 'white', fontSize: '16px', fontWeight: '700', cursor: saving ? 'not-allowed' : 'pointer', boxShadow: '0 6px 20px rgba(160,113,79,0.4)', transition: 'all 0.2s' }}>
            {saving ? '⏳ Đang lưu...' : '💾 Lưu Doanh Thu'}
          </button>
        </div>
      </div>
    </div>
  )
}
