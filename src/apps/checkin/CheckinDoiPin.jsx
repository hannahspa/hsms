import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { COLORS } from '../../constants/colors'

export default function CheckinDoiPin({ nhanVien, onBack }) {
  const [step,       setStep]       = useState(1) // 1=pin cũ, 2=pin mới, 3=xác nhận
  const [pinCu,      setPinCu]      = useState('')
  const [pinMoi,     setPinMoi]     = useState('')
  const [pinXacNhan, setPinXacNhan] = useState('')
  const [error,      setError]      = useState('')
  const [loading,    setLoading]    = useState(false)
  const [success,    setSuccess]    = useState(false)

  const currentPin = step === 1 ? pinCu : step === 2 ? pinMoi : pinXacNhan
  const setCurrentPin = step === 1 ? setPinCu : step === 2 ? setPinMoi : setPinXacNhan

  const handlePinPress = async (digit) => {
    if (currentPin.length >= 4) return
    const newPin = currentPin + digit
    setCurrentPin(newPin)
    setError('')

    if (newPin.length === 4) {
      if (step === 1) {
        // Verify pin cũ
        setLoading(true)
        const { data } = await supabase
          .from('nhan_vien').select('id').eq('id', nhanVien.id).eq('pin', newPin).maybeSingle()
        setLoading(false)
        if (data) {
          setStep(2)
        } else {
          setError('PIN cũ không đúng!')
          setTimeout(() => setPinCu(''), 500)
        }
      } else if (step === 2) {
        setStep(3)
      } else {
        // Xác nhận pin mới
        if (newPin !== pinMoi) {
          setError('PIN xác nhận không khớp!')
          setTimeout(() => { setPinMoi(''); setPinXacNhan(''); setStep(2) }, 1000)
        } else {
          // Lưu pin mới
          setLoading(true)
          const { error: err } = await supabase
            .from('nhan_vien').update({ pin: pinMoi }).eq('id', nhanVien.id)
          setLoading(false)
          if (!err) {
            setSuccess(true)
            setTimeout(() => onBack(), 2000)
          } else {
            setError('Lỗi lưu PIN, thử lại!')
          }
        }
      }
    }
  }

  const handleDelete = () => {
    setCurrentPin(prev => prev.slice(0, -1))
    setError('')
  }

  const getStepInfo = () => {
    if (step === 1) return { title:'Nhập PIN Hiện Tại', icon:'🔑' }
    if (step === 2) return { title:'Nhập PIN Mới', icon:'✨' }
    return { title:'Xác Nhận PIN Mới', icon:'✅' }
  }

  const info = getStepInfo()
  const displayPin = currentPin

  if (success) return (
    <div style={{ minHeight:'100vh', background:'#FAF7F4', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
      <div style={{ fontSize:'64px', marginBottom:'16px' }}>🎉</div>
      <div style={{ fontSize:'20px', fontWeight:'800', color:COLORS.text }}>Đổi PIN thành công!</div>
      <div style={{ fontSize:'13px', color:COLORS.textMute, marginTop:'8px' }}>Đang quay lại...</div>
    </div>
  )

  return (
    <div style={{ minHeight:'100vh', background:'#FAF7F4' }}>

      {/* Header */}
      <div style={{ background:COLORS.grad, padding:'48px 20px 28px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'12px', marginBottom:'20px' }}>
          <button onClick={onBack}
            style={{ width:'36px', height:'36px', borderRadius:'50%', background:'rgba(255,255,255,0.2)', border:'none', color:'white', fontSize:'18px', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
            ←
          </button>
          <div style={{ color:'white', fontWeight:'700', fontSize:'18px' }}>Đổi PIN</div>
        </div>

        {/* Step indicator */}
        <div style={{ display:'flex', justifyContent:'center', gap:'8px' }}>
          {[1,2,3].map(s => (
            <div key={s} style={{ width: s === step ? '24px' : '8px', height:'8px', borderRadius:'4px', background: s <= step ? 'white' : 'rgba(255,255,255,0.3)', transition:'all 0.3s' }} />
          ))}
        </div>
      </div>

      <div style={{ padding:'40px 24px', maxWidth:'320px', margin:'0 auto' }}>
        <div style={{ textAlign:'center', marginBottom:'32px' }}>
          <div style={{ fontSize:'40px', marginBottom:'8px' }}>{info.icon}</div>
          <div style={{ fontSize:'16px', fontWeight:'700', color:COLORS.text }}>{info.title}</div>
        </div>

        {/* PIN dots */}
        <div style={{ display:'flex', justifyContent:'center', gap:'16px', marginBottom:'16px' }}>
          {[0,1,2,3].map(i => (
            <div key={i} style={{
              width:'16px', height:'16px', borderRadius:'50%',
              background: i < displayPin.length ? COLORS.primary : 'transparent',
              border:`2px solid ${i < displayPin.length ? COLORS.primary : COLORS.border}`,
              transition:'all 0.2s'
            }} />
          ))}
        </div>

        {error && (
          <div style={{ textAlign:'center', color:COLORS.chi, fontSize:'13px', fontWeight:'600', marginBottom:'16px' }}>
            {error}
          </div>
        )}
        {loading && (
          <div style={{ textAlign:'center', color:COLORS.textMute, fontSize:'13px', marginBottom:'16px' }}>
            Đang xử lý...
          </div>
        )}

        {/* Bàn phím số */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:'12px' }}>
          {[1,2,3,4,5,6,7,8,9].map(n => (
            <button key={n} onClick={() => handlePinPress(String(n))}
              style={{ padding:'20px', borderRadius:'16px', border:`1px solid ${COLORS.border}`, background:COLORS.card, fontSize:'24px', fontWeight:'700', color:COLORS.text, cursor:'pointer', boxShadow:COLORS.shadow }}>
              {n}
            </button>
          ))}
          <div />
          <button onClick={() => handlePinPress('0')}
            style={{ padding:'20px', borderRadius:'16px', border:`1px solid ${COLORS.border}`, background:COLORS.card, fontSize:'24px', fontWeight:'700', color:COLORS.text, cursor:'pointer', boxShadow:COLORS.shadow }}>
            0
          </button>
          <button onClick={handleDelete}
            style={{ padding:'20px', borderRadius:'16px', border:`1px solid ${COLORS.border}`, background:COLORS.card, fontSize:'20px', color:COLORS.textSub, cursor:'pointer', boxShadow:COLORS.shadow }}>
            ⌫
          </button>
        </div>
      </div>
    </div>
  )
}