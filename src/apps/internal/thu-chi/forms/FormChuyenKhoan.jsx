import { useState } from 'react'
import { supabase } from '../../../../lib/supabase'
import { COLORS } from '../../../../constants/colors'
import { formatCurrency, todayISO } from '../../../../lib/utils'
import DatePicker from '../../../../components/shared/DatePicker'

export default function FormChuyenKhoan({ viList, onClose, onSaved }) {
  const [soTien,   setSoTien]   = useState('')
  const [ngay,     setNgay]     = useState(todayISO())
  const [dienGiai, setDienGiai] = useState('')
  const [saving,   setSaving]   = useState(false)
  const [showLich, setShowLich] = useState(false)
  const [tuViId,   setTuViId]   = useState(null)
  const [denViId,  setDenViId]  = useState(null)
  const [step,     setStep]     = useState('main')

  const tuVi  = viList?.find(v => v.id === tuViId)
  const denVi = viList?.find(v => v.id === denViId)

  const handleSave = async () => {
    if (!soTien || parseInt(soTien) <= 0)
      return onSaved('error', 'Vui lòng nhập số tiền!')
    if (!tuViId || !denViId)
      return onSaved('error', 'Vui lòng chọn đầy đủ Ví gửi và Ví nhận!')
    if (tuViId === denViId)
      return onSaved('error', 'Ví gửi và Ví nhận không được trùng nhau!')

    setSaving(true)
    try {
      const { error } = await supabase.from('chuyen_khoan_noi_bo').insert({
        ngay,
        tu_vi_id:  tuViId,   // UUID đúng
        den_vi_id: denViId,  // UUID đúng
        so_tien:   parseInt(soTien),
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

  // ── Chọn ví ──
  if (step === 'chon_tu_vi' || step === 'chon_den_vi') {
    const title = step === 'chon_tu_vi' ? 'Chọn Ví Gửi Đi' : 'Chọn Ví Nhận Đến'
    const excludeId = step === 'chon_tu_vi' ? denViId : tuViId
    return (
      <div style={{ position:'fixed',inset:0,backgroundColor:'rgba(0,0,0,0.5)',display:'flex',alignItems:'flex-end',zIndex:600 }}>
        <div style={{ background:COLORS.card,borderRadius:'24px 24px 0 0',width:'100%',maxWidth:'420px',margin:'0 auto',padding:'24px 20px 40px' }}>
          <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'20px' }}>
            <h3 style={{ fontSize:'17px',fontWeight:'700',color:COLORS.text }}>{title}</h3>
            <button onClick={() => setStep('main')} style={{ background:'none',border:'none',fontSize:'20px',cursor:'pointer',color:COLORS.textMute }}>✕</button>
          </div>
          {viList?.filter(v => v.id !== excludeId).map((vi, i, arr) => (
            <div key={vi.id}>
              <button
                onClick={() => {
                  step === 'chon_tu_vi' ? setTuViId(vi.id) : setDenViId(vi.id)
                  setStep('main')
                }}
                style={{ display:'flex',alignItems:'center',gap:'14px',width:'100%',padding:'16px 0',background:'none',border:'none',cursor:'pointer' }}
              >
                <div style={{ width:'44px',height:'44px',borderRadius:'12px',background:'linear-gradient(135deg,#F9F0E8,#F0DDD0)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'22px' }}>{vi.icon}</div>
                <div style={{ textAlign:'left' }}>
                  <div style={{ fontWeight:'600',fontSize:'15px',color:COLORS.text }}>{vi.ten}</div>
                  <div style={{ fontSize:'11px',color:COLORS.textMute }}>{vi.loai === 'tien_mat' ? 'Tiền mặt' : 'Ngân hàng'}</div>
                </div>
              </button>
              {i < arr.length-1 && <div style={{ height:'1px',background:'linear-gradient(90deg,transparent,rgba(160,113,79,0.1),transparent)' }} />}
            </div>
          ))}
        </div>
      </div>
    )
  }

  // ── Form chính ──
  return (
    <div style={{ position:'fixed',inset:0,backgroundColor:'rgba(0,0,0,0.5)',display:'flex',alignItems:'flex-end',zIndex:500 }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>

      <DatePicker open={showLich} selectedDate={ngay}
        onClose={() => setShowLich(false)}
        onConfirm={d => { setNgay(d); setShowLich(false) }} />

      <div style={{ background:COLORS.bg,borderRadius:'24px 24px 0 0',width:'100%',maxWidth:'420px',margin:'0 auto',maxHeight:'92vh',overflowY:'auto',animation:'slideUp 0.3s ease' }}>
        <style>{`@keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}`}</style>

        <div style={{ display:'flex',justifyContent:'center',paddingTop:'12px' }}>
          <div style={{ width:'40px',height:'4px',borderRadius:'2px',backgroundColor:'#E0D4CA' }} />
        </div>

        <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 20px' }}>
          <div style={{ display:'flex',alignItems:'center',gap:'10px' }}>
            <div style={{ width:'36px',height:'36px',borderRadius:'10px',background:'linear-gradient(135deg,#EFF6FF,#DBEAFE)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'18px' }}>🔄</div>
            <div>
              <div style={{ fontWeight:'700',fontSize:'16px',color:COLORS.text }}>Chuyển Khoản Nội Bộ</div>
              <div style={{ fontSize:'11px',color:COLORS.textMute }}>Chuyển giữa các ví</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background:'none',border:'none',fontSize:'20px',color:COLORS.textMute,cursor:'pointer' }}>✕</button>
        </div>

        <div style={{ padding:'0 16px 32px' }}>

          {/* Số tiền */}
          <div style={{ background:COLORS.card,borderRadius:'20px',padding:'20px',marginBottom:'16px',boxShadow:COLORS.shadow,border:`1px solid ${COLORS.border}`,textAlign:'center' }}>
            <div style={{ fontSize:'12px',color:COLORS.textMute,marginBottom:'8px',textTransform:'uppercase',letterSpacing:'1px' }}>Số Tiền Chuyển</div>
            <input type="number" placeholder="0" value={soTien} onChange={e => setSoTien(e.target.value)}
              style={{ width:'100%',border:'none',outline:'none',fontSize:'36px',fontWeight:'800',textAlign:'center',background:'transparent',color:soTien?COLORS.chuyenKhoan:'#D0C0B0' }} />
            {soTien && (
              <div style={{ fontSize:'14px',color:COLORS.chuyenKhoan,fontWeight:'600',marginTop:'4px' }}>
                {new Intl.NumberFormat('vi-VN').format(parseInt(soTien))} đ
              </div>
            )}
          </div>

          {/* Chọn ví */}
          <div style={{ background:COLORS.card,borderRadius:'20px',marginBottom:'16px',boxShadow:COLORS.shadow,border:`1px solid ${COLORS.border}`,overflow:'hidden' }}>

            {/* Từ ví */}
            <button onClick={() => setStep('chon_tu_vi')} style={{ display:'flex',alignItems:'center',justifyContent:'space-between',width:'100%',padding:'16px 20px',background:'none',border:'none',borderBottom:`1px solid ${COLORS.border}`,cursor:'pointer' }}>
              <div style={{ display:'flex',alignItems:'center',gap:'12px' }}>
                <div style={{ width:'40px',height:'40px',borderRadius:'11px',background:'linear-gradient(135deg,#FFF5F5,#FFE4E4)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'20px' }}>
                  {tuVi ? tuVi.icon : '📤'}
                </div>
                <div style={{ textAlign:'left' }}>
                  <div style={{ fontSize:'11px',color:COLORS.textMute,marginBottom:'2px' }}>Từ Tài Khoản</div>
                  <div style={{ fontWeight:'600',fontSize:'14px',color:tuVi?COLORS.text:COLORS.textMute }}>
                    {tuVi ? tuVi.ten : 'Chọn ví gửi...'}
                  </div>
                </div>
              </div>
              <span style={{ color:COLORS.gold,fontSize:'18px' }}>›</span>
            </button>

            {/* Mũi tên giữa */}
            <div style={{ display:'flex',justifyContent:'center',padding:'8px 0',background:'#FAF7F4',position:'relative' }}>
              <div style={{ width:'32px',height:'32px',borderRadius:'50%',background:'white',border:`1px solid ${COLORS.border}`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'16px',boxShadow:'0 2px 8px rgba(0,0,0,0.06)' }}>⬇️</div>
            </div>

            {/* Đến ví */}
            <button onClick={() => setStep('chon_den_vi')} style={{ display:'flex',alignItems:'center',justifyContent:'space-between',width:'100%',padding:'16px 20px',background:'none',border:'none',cursor:'pointer' }}>
              <div style={{ display:'flex',alignItems:'center',gap:'12px' }}>
                <div style={{ width:'40px',height:'40px',borderRadius:'11px',background:'linear-gradient(135deg,#F0FDF4,#DCFCE7)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'20px' }}>
                  {denVi ? denVi.icon : '📥'}
                </div>
                <div style={{ textAlign:'left' }}>
                  <div style={{ fontSize:'11px',color:COLORS.textMute,marginBottom:'2px' }}>Đến Tài Khoản</div>
                  <div style={{ fontWeight:'600',fontSize:'14px',color:denVi?COLORS.text:COLORS.textMute }}>
                    {denVi ? denVi.ten : 'Chọn ví nhận...'}
                  </div>
                </div>
              </div>
              <span style={{ color:COLORS.gold,fontSize:'18px' }}>›</span>
            </button>
          </div>

          {/* Ngày */}
          <div onClick={() => setShowLich(true)} style={{ display:'flex',alignItems:'center',gap:'12px',background:COLORS.card,borderRadius:'20px',padding:'16px 20px',marginBottom:'16px',boxShadow:COLORS.shadow,border:`1px solid ${COLORS.border}`,cursor:'pointer' }}>
            <div style={{ width:'40px',height:'40px',borderRadius:'11px',background:'linear-gradient(135deg,#EFF6FF,#DBEAFE)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'20px' }}>📅</div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:'11px',color:COLORS.textMute,marginBottom:'2px' }}>Ngày Thực Hiện</div>
              <div style={{ fontSize:'15px',fontWeight:'700',color:COLORS.text }}>{displayDate(ngay)}</div>
            </div>
            <div style={{ fontSize:'18px',color:COLORS.textMute }}>›</div>
          </div>

          {/* Diễn giải */}
          <div style={{ background:COLORS.card,borderRadius:'20px',padding:'16px 20px',marginBottom:'24px',boxShadow:COLORS.shadow,border:`1px solid ${COLORS.border}` }}>
            <div style={{ display:'flex',alignItems:'flex-start',gap:'12px' }}>
              <div style={{ width:'40px',height:'40px',borderRadius:'11px',background:'linear-gradient(135deg,#FDF4FF,#FAE8FF)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'20px',flexShrink:0 }}>📝</div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:'11px',color:COLORS.textMute,marginBottom:'4px' }}>Diễn Giải</div>
                <textarea placeholder="Ghi chú nội dung chuyển khoản..." value={dienGiai}
                  onChange={e => setDienGiai(e.target.value)} rows={2}
                  style={{ width:'100%',border:'none',outline:'none',fontSize:'14px',color:COLORS.text,background:'transparent',resize:'none',fontFamily:'inherit' }} />
              </div>
            </div>
          </div>

          {/* Lưu */}
          <button onClick={handleSave} disabled={saving} style={{
            width:'100%',padding:'16px',
            background: saving ? '#C4A882' : 'linear-gradient(135deg,#8B5CF6,#6C3483)',
            border:'none',borderRadius:'18px',color:'white',
            fontSize:'16px',fontWeight:'700',
            cursor: saving?'not-allowed':'pointer',
            boxShadow:'0 6px 20px rgba(108,52,131,0.35)',
            transition:'all 0.2s'
          }}>
            {saving ? '⏳ Đang lưu...' : '💾 Lưu Chuyển Khoản'}
          </button>
        </div>
      </div>
    </div>
  )
}