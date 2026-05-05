import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { LUX } from '../../constants/lux'
import './styles.css'

const HERO = {
  background: `radial-gradient(circle at 100% 0%, rgba(212,165,116,0.4), transparent 55%), linear-gradient(155deg,#4a3528 0%,#3d2c20 50%,#2e2018 100%)`,
  color: '#f5ede0', position: 'relative', overflow: 'hidden',
}

const backArrow = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
)

const stepInfo = [
  { title: 'Nhập PIN Hiện Tại', icon: '🔑' },
  { title: 'Nhập PIN Mới', icon: '✨' },
  { title: 'Xác Nhận PIN Mới', icon: '✅' },
]

export default function CheckinDoiPin({ nhanVien, onBack }) {
  const [step, setStep] = useState(1)
  const [pinCu, setPinCu] = useState('')
  const [pinMoi, setPinMoi] = useState('')
  const [pinXacNhan, setPinXacNhan] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const currentPin = step === 1 ? pinCu : step === 2 ? pinMoi : pinXacNhan
  const setCurrentPin = step === 1 ? setPinCu : step === 2 ? setPinMoi : setPinXacNhan

  const handlePinPress = async (digit) => {
    if (currentPin.length >= 4) return
    const newPin = currentPin + digit
    setCurrentPin(newPin)
    setError('')

    if (newPin.length === 4) {
      if (step === 1) {
        setLoading(true)
        const { data } = await supabase.from('nhan_vien').select('id').eq('id', nhanVien.id).eq('pin', newPin).maybeSingle()
        setLoading(false)
        if (data) { setStep(2) }
        else { setError('PIN cũ không đúng!'); setTimeout(() => setPinCu(''), 500) }
      } else if (step === 2) {
        setStep(3)
      } else {
        if (newPin !== pinMoi) {
          setError('PIN xác nhận không khớp!')
          setTimeout(() => { setPinMoi(''); setPinXacNhan(''); setStep(2) }, 1000)
        } else {
          setLoading(true)
          const { error: err } = await supabase.from('nhan_vien').update({ pin: pinMoi }).eq('id', nhanVien.id)
          setLoading(false)
          if (!err) { setSuccess(true); setTimeout(() => onBack(), 2000) }
          else { setError('Lỗi lưu PIN, thử lại!') }
        }
      }
    }
  }

  const handleDelete = () => { setCurrentPin(prev => prev.slice(0, -1)); setError('') }
  const info = stepInfo[step - 1]

  if (success) return (
    <div style={{ minHeight: '100vh', background: LUX.bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: LUX.fontSans }}>
      <div style={{ fontSize: 64, marginBottom: 16, animation: 'fadeUp 0.5s cubic-bezier(.2,.8,.2,1)' }}>🎉</div>
      <div style={{ fontFamily: LUX.fontSerif, fontSize: 22, fontWeight: 600, color: LUX.espresso }}>Đổi PIN thành công!</div>
      <div style={{ fontSize: 13, color: LUX.ink3, marginTop: 8 }}>Đang quay lại...</div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: LUX.bg, fontFamily: LUX.fontSans }}>

      {/* Header */}
      <header style={{ ...HERO, padding: '20px 22px 28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
          <button onClick={onBack} style={{
            width: 38, height: 38, borderRadius: '50%', background: 'rgba(255,255,255,0.10)',
            border: '1px solid rgba(245,237,224,0.18)', color: '#f5ede0',
            display: 'grid', placeItems: 'center', cursor: 'pointer', backdropFilter: 'blur(8px)',
          }}>
            {backArrow}
          </button>
          <div>
            <div style={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(245,237,224,0.55)', marginBottom: 4 }}>Bảo mật</div>
            <h2 style={{ fontFamily: LUX.fontSerif, fontSize: 26, fontWeight: 600, margin: 0, lineHeight: 1, letterSpacing: '-0.01em' }}>Đổi PIN</h2>
          </div>
        </div>

        {/* Step indicator */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8 }}>
          {[1, 2, 3].map(s => (
            <div key={s} style={{
              width: s === step ? 24 : 8, height: 8, borderRadius: 4,
              background: s <= step ? '#f5ede0' : 'rgba(245,237,224,0.3)',
              transition: 'all 0.3s cubic-bezier(.2,.8,.2,1)',
            }} />
          ))}
        </div>
      </header>

      <div style={{ padding: '40px 24px', maxWidth: 320, margin: '0 auto' }} className="stagger">
        <div />
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>{info.icon}</div>
          <div style={{ fontFamily: LUX.fontSerif, fontSize: 18, fontWeight: 600, color: LUX.espresso }}>{info.title}</div>
        </div>

        {/* PIN dots */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginBottom: 16 }}>
          {[0, 1, 2, 3].map(i => (
            <div key={i} style={{
              width: 16, height: 16, borderRadius: '50%',
              background: i < currentPin.length ? LUX.gold : 'transparent',
              border: `2px solid ${i < currentPin.length ? LUX.gold : LUX.line2}`,
              transition: 'all 0.2s',
              boxShadow: i < currentPin.length ? `0 0 10px ${LUX.gold}60` : 'none',
            }} />
          ))}
        </div>

        {error && (
          <div style={{ textAlign: 'center', color: LUX.danger, fontSize: 13, fontWeight: 600, marginBottom: 16 }}>
            {error}
          </div>
        )}
        {loading && (
          <div style={{ textAlign: 'center', color: LUX.ink3, fontSize: 13, marginBottom: 16 }}>
            Đang xử lý...
          </div>
        )}

        {/* Keypad */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
            <button key={n} onClick={() => handlePinPress(String(n))}
              className="ripple"
              style={{
                padding: 20, borderRadius: 16, border: `1px solid ${LUX.line}`,
                background: LUX.surface2, fontFamily: LUX.fontSerif, fontSize: 28, fontWeight: 600,
                color: LUX.espresso, cursor: 'pointer', boxShadow: LUX.shadowSm, transition: 'all 0.15s',
              }}
              onTouchStart={e => { e.currentTarget.style.transform = 'scale(0.93)'; addRipple(e) }}
              onTouchEnd={e => e.currentTarget.style.transform = 'none'}
            >{n}</button>
          ))}
          <div />
          <button onClick={() => handlePinPress('0')}
            className="ripple"
            style={{
              padding: 20, borderRadius: 16, border: `1px solid ${LUX.line}`,
              background: LUX.surface2, fontFamily: LUX.fontSerif, fontSize: 28, fontWeight: 600,
              color: LUX.espresso, cursor: 'pointer', boxShadow: LUX.shadowSm, transition: 'all 0.15s',
            }}
            onTouchStart={e => { e.currentTarget.style.transform = 'scale(0.93)'; addRipple(e) }}
            onTouchEnd={e => e.currentTarget.style.transform = 'none'}
          >0</button>
          <button onClick={handleDelete}
            style={{
              padding: 20, borderRadius: 16, border: `1px solid ${LUX.line}`,
              background: LUX.surface2, fontFamily: LUX.fontSans, fontSize: 20,
              color: LUX.ink2, cursor: 'pointer', boxShadow: LUX.shadowSm, transition: 'all 0.15s',
            }}
            onTouchStart={e => e.currentTarget.style.transform = 'scale(0.93)'}
            onTouchEnd={e => e.currentTarget.style.transform = 'none'}
          >⌫</button>
        </div>
      </div>
    </div>
  )
}

function addRipple(e) {
  const btn = e.currentTarget
  const rect = btn.getBoundingClientRect()
  const size = Math.max(rect.width, rect.height)
  const x = (e.touches?.[0]?.clientX || rect.left + rect.width / 2) - rect.left - size / 2
  const y = (e.touches?.[0]?.clientY || rect.top + rect.height / 2) - rect.top - size / 2
  const wave = document.createElement('span')
  wave.className = 'r-wave'
  wave.style.cssText = `width:${size}px;height:${size}px;left:${x}px;top:${y}px`
  btn.appendChild(wave)
  setTimeout(() => wave.remove(), 600)
}
