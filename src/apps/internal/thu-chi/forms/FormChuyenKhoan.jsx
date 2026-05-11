import { useState } from 'react'
import { supabase } from '../../../../lib/supabase'
import { LUX } from '../../../../constants/lux'
import { formatCurrency, todayISO, formatDateInput } from '../../../../lib/utils'
import DatePicker from '../../../../components/shared/DatePicker'

export default function FormChuyenKhoan({ viList, user, onClose, onSaved }) {
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

    // Kiểm tra số dư chỉ với Lễ Tân — Admin có thể nhập dữ liệu lịch sử không cần kiểm tra
    if (user?.vai_tro !== 'admin') {
      const { data: freshVi } = await supabase
        .from('so_du_vi_thuc_te')
        .select('so_du_hien_tai')
        .eq('id', tuViId)
        .single()
      const soDuTu = freshVi?.so_du_hien_tai ?? tuVi?.so_du_hien_tai ?? 0
      if (parseInt(soTien) > soDuTu) {
        return onSaved('error', `Số Dư ${tuVi?.ten || 'Ví Nguồn'} không đủ để chuyển khoản tiền này.`)
      }
    }

    setSaving(true)
    try {
      const { error } = await supabase.from('chuyen_khoan_noi_bo').insert({
        ngay,
        tu_vi_id:  tuViId,
        den_vi_id: denViId,
        so_tien:   parseInt(soTien),
        dien_giai: dienGiai || null,
        nguoi_thuc_hien: user?.ho_ten || null,
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

  const overlayBg = 'rgba(42,32,26,0.55)'

  // ── Chọn ví ──
  if (step === 'chon_tu_vi' || step === 'chon_den_vi') {
    const title = step === 'chon_tu_vi' ? 'Chọn Ví Gửi Đi' : 'Chọn Ví Nhận Đến'
    const excludeId = step === 'chon_tu_vi' ? denViId : tuViId
    return (
      <div style={{ position:'fixed',inset:0,backgroundColor:overlayBg,display:'flex',alignItems:'flex-end',zIndex:600 }}>
        <div style={{ background:LUX.surface2,borderRadius:'24px 24px 0 0',width:'100%',maxWidth:'520px',margin:'0 auto',padding:'24px 20px 40px' }}>
          <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'20px' }}>
            <h3 style={{ fontSize:'17px',fontWeight:'700',color:LUX.ink,fontFamily:LUX.fontSerif }}>{title}</h3>
            <button onClick={() => setStep('main')} style={{ background:'none',border:'none',fontSize:'20px',cursor:'pointer',color:LUX.ink3 }}>✕</button>
          </div>
          {viList?.filter(v => v.id !== excludeId && (step === 'chon_den_vi' || v.loai !== 'tien_mat')).map((vi, i, arr) => (
            <div key={vi.id}>
              <button
                onClick={() => {
                  step === 'chon_tu_vi' ? setTuViId(vi.id) : setDenViId(vi.id)
                  setStep('main')
                }}
                style={{ display:'flex',alignItems:'center',gap:'14px',width:'100%',padding:'16px 0',background:'none',border:'none',cursor:'pointer' }}
              >
                <div style={{ width:'44px',height:'44px',borderRadius:'12px',background:`linear-gradient(135deg,${LUX.surface},${LUX.line})`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'22px' }}>{vi.icon}</div>
                <div style={{ textAlign:'left' }}>
                  <div style={{ fontWeight:'600',fontSize:'15px',color:LUX.ink,fontFamily:LUX.fontSans }}>{vi.ten}</div>
                  <div style={{ fontSize:'11px',color:LUX.ink3,fontFamily:LUX.fontSans }}>{vi.loai === 'tien_mat' ? 'Tiền mặt' : 'Ngân hàng'}</div>
                </div>
              </button>
              {i < arr.length-1 && <div style={{ height:'1px',background:LUX.line }} />}
            </div>
          ))}
        </div>
      </div>
    )
  }

  // ── Form chính ──
  return (
    <div style={{ position:'fixed',inset:0,backgroundColor:overlayBg,display:'flex',alignItems:'flex-end',zIndex:500 }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>

      <DatePicker open={showLich} selectedDate={ngay}
        onClose={() => setShowLich(false)}
        onConfirm={d => { setNgay(d); setShowLich(false) }} />

      <div style={{ background:LUX.surface,borderRadius:'24px 24px 0 0',width:'100%',maxWidth:'520px',margin:'0 auto',maxHeight:'92vh',overflowY:'auto',animation:'slideUp 0.3s ease' }}>
        <style>{`@keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}`}</style>

        <div style={{ display:'flex',justifyContent:'center',paddingTop:'12px' }}>
          <div style={{ width:'40px',height:'4px',borderRadius:'2px',backgroundColor:LUX.line2 }} />
        </div>

        <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 20px' }}>
          <div style={{ display:'flex',alignItems:'center',gap:'10px' }}>
            <div style={{ width:'36px',height:'36px',borderRadius:'10px',background:'#EFF6FF',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'18px' }}>🔄</div>
            <div>
              <div style={{ fontWeight:'700',fontSize:'16px',color:LUX.ink,fontFamily:LUX.fontSerif }}>Chuyển Khoản Nội Bộ</div>
              <div style={{ fontSize:'11px',color:LUX.ink3,fontFamily:LUX.fontSans }}>Quẹt thẻ về MB hoặc rút tiền mặt</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background:'none',border:'none',fontSize:'20px',color:LUX.ink3,cursor:'pointer' }}>✕</button>
        </div>

        <div style={{ padding:'0 16px 32px' }}>

          {/* Số tiền */}
          <div style={{ background:LUX.surface2,borderRadius:LUX.radius,padding:'20px',marginBottom:'16px',boxShadow:LUX.shadowSm,border:`1px solid ${LUX.line}`,textAlign:'center' }}>
            <div style={{ fontSize:'12px',color:LUX.ink3,marginBottom:'8px',textTransform:'uppercase',letterSpacing:'1px',fontFamily:LUX.fontSans }}>Số Tiền Chuyển</div>
            <input type="number" placeholder="0" value={soTien} onChange={e => setSoTien(e.target.value.replace(/\D/g, ''))}
              style={{ width:'100%',border:'none',outline:'none',fontSize:'36px',fontWeight:'700',textAlign:'center',background:'transparent',color:soTien?'#6C3483':LUX.line2,fontFamily:LUX.fontMono }} />
            {soTien && (
              <div style={{ fontSize:'14px',color:'#6C3483',fontWeight:'600',marginTop:'4px',fontFamily:LUX.fontSans }}>
                {new Intl.NumberFormat('vi-VN').format(parseInt(soTien))} đ
              </div>
            )}
          </div>

          {/* Chọn ví */}
          <div style={{ background:LUX.surface2,borderRadius:LUX.radius,marginBottom:'16px',boxShadow:LUX.shadowSm,border:`1px solid ${LUX.line}`,overflow:'hidden' }}>

            {/* Từ ví */}
            <button onClick={() => setStep('chon_tu_vi')} style={{ display:'flex',alignItems:'center',justifyContent:'space-between',width:'100%',padding:'16px 20px',background:'none',border:'none',borderBottom:`1px solid ${LUX.line}`,cursor:'pointer' }}>
              <div style={{ display:'flex',alignItems:'center',gap:'12px' }}>
                <div style={{ width:'40px',height:'40px',borderRadius:'11px',background:'#FEF2F2',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'20px' }}>
                  {tuVi ? tuVi.icon : '📤'}
                </div>
                <div style={{ textAlign:'left' }}>
                  <div style={{ fontSize:'11px',color:LUX.ink3,marginBottom:'2px',fontFamily:LUX.fontSans }}>Từ Tài Khoản</div>
                  <div style={{ fontWeight:'600',fontSize:'14px',color:tuVi?LUX.ink:LUX.ink3,fontFamily:LUX.fontSans }}>
                    {tuVi ? tuVi.ten : 'Chọn ví gửi...'}
                  </div>
                </div>
              </div>
              <span style={{ color:LUX.gold,fontSize:'18px' }}>›</span>
            </button>

            {/* Mũi tên giữa */}
            <div style={{ display:'flex',justifyContent:'center',padding:'8px 0',background:LUX.surface,position:'relative' }}>
              <div style={{ width:'32px',height:'32px',borderRadius:'50%',background:LUX.surface2,border:`1px solid ${LUX.line}`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'16px',boxShadow:LUX.shadowSm }}>⬇️</div>
            </div>

            {/* Đến ví */}
            <button onClick={() => setStep('chon_den_vi')} style={{ display:'flex',alignItems:'center',justifyContent:'space-between',width:'100%',padding:'16px 20px',background:'none',border:'none',cursor:'pointer' }}>
              <div style={{ display:'flex',alignItems:'center',gap:'12px' }}>
                <div style={{ width:'40px',height:'40px',borderRadius:'11px',background:'#F0FDF4',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'20px' }}>
                  {denVi ? denVi.icon : '📥'}
                </div>
                <div style={{ textAlign:'left' }}>
                  <div style={{ fontSize:'11px',color:LUX.ink3,marginBottom:'2px',fontFamily:LUX.fontSans }}>Đến Tài Khoản</div>
                  <div style={{ fontWeight:'600',fontSize:'14px',color:denVi?LUX.ink:LUX.ink3,fontFamily:LUX.fontSans }}>
                    {denVi ? denVi.ten : 'Chọn ví nhận...'}
                  </div>
                </div>
              </div>
              <span style={{ color:LUX.gold,fontSize:'18px' }}>›</span>
            </button>
          </div>

          {/* Ngày */}
          <div onClick={() => setShowLich(true)} style={{ display:'flex',alignItems:'center',gap:'12px',background:LUX.surface2,borderRadius:LUX.radius,padding:'16px 20px',marginBottom:'16px',boxShadow:LUX.shadowSm,border:`1px solid ${LUX.line}`,cursor:'pointer' }}>
            <div style={{ width:'40px',height:'40px',borderRadius:'11px',background:'#EFF6FF',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'20px' }}>📅</div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:'11px',color:LUX.ink3,marginBottom:'2px',fontFamily:LUX.fontSans }}>Ngày Thực Hiện</div>
              <div style={{ fontSize:'15px',fontWeight:'600',color:LUX.ink,fontFamily:LUX.fontSans }}>{formatDateInput(ngay)}</div>
            </div>
            <div style={{ fontSize:'18px',color:LUX.ink3 }}>›</div>
          </div>

          {/* Diễn giải */}
          <div style={{ background:LUX.surface2,borderRadius:LUX.radius,padding:'16px 20px',marginBottom:'24px',boxShadow:LUX.shadowSm,border:`1px solid ${LUX.line}` }}>
            <div style={{ display:'flex',alignItems:'flex-start',gap:'12px' }}>
              <div style={{ width:'40px',height:'40px',borderRadius:'11px',background:'#FDF4FF',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'20px',flexShrink:0 }}>📝</div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:'11px',color:LUX.ink3,marginBottom:'4px',fontFamily:LUX.fontSans }}>Diễn Giải</div>
                <textarea placeholder="Ghi chú nội dung chuyển khoản..." value={dienGiai}
                  onChange={e => setDienGiai(e.target.value)} rows={2}
                  style={{ width:'100%',border:'none',outline:'none',fontSize:'14px',color:LUX.ink,background:'transparent',resize:'none',fontFamily:LUX.fontSans }} />
              </div>
            </div>
          </div>

          {/* Lưu */}
          <button onClick={handleSave} disabled={saving} style={{
            width:'100%',padding:'16px',
            background: saving ? LUX.ink3 : 'linear-gradient(135deg,#8B5CF6,#6C3483)',
            border:'none',borderRadius:LUX.radius,color:'white',
            fontSize:'16px',fontWeight:'600',
            cursor: saving?'not-allowed':'pointer',
            boxShadow:'0 6px 20px rgba(108,52,131,0.35)',
            transition:'all 0.2s',
            fontFamily:LUX.fontSans
          }}>
            {saving ? '⏳ Đang lưu...' : '💾 Lưu Chuyển Khoản'}
          </button>
        </div>
      </div>
    </div>
  )
}
