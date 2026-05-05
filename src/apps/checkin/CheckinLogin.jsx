import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { LUX } from '../../constants/lux'
import './styles.css'

const VI_TRI_LABEL = { ktv: 'Kỹ Thuật Viên', le_tan: 'Lễ Tân', tap_vu: 'Tạp Vụ' }

const AVATAR_GRAD = [
  'linear-gradient(135deg,#d4a574,#b08a55)',
  'linear-gradient(135deg,#a07a5c,#6a4a35)',
  'linear-gradient(135deg,#8a6a52,#5a4030)',
  'linear-gradient(135deg,#b87a6a,#8a4a35)',
  'linear-gradient(135deg,#8a9a7a,#5a6a4a)',
  'linear-gradient(135deg,#5a4030,#2e2018)',
]

function getInitials(name) {
  const parts = name.trim().split(' ')
  return parts[parts.length - 1].charAt(0).toUpperCase()
}
function getGrad(name) {
  let h = 0; for (const c of name) h += c.charCodeAt(0)
  return AVATAR_GRAD[h % AVATAR_GRAD.length]
}

const HERO = {
  background: `radial-gradient(circle at 100% 0%, rgba(212,165,116,0.4), transparent 55%), linear-gradient(155deg,#4a3528 0%,#3d2c20 50%,#2e2018 100%)`,
  color: '#f5ede0',
  position: 'relative',
  overflow: 'hidden',
}

const brandMark = (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#f5ede0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2c1.5 3 4.5 4 4.5 7a4.5 4.5 0 11-9 0c0-3 3-4 4.5-7z"/>
    <path d="M12 13v8M9 18h6"/>
  </svg>
)

const backArrow = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 18l-6-6 6-6"/>
  </svg>
)

export default function CheckinLogin({ onLogin }) {
  const [danhSach,   setDanhSach]   = useState([])
  const [selected,   setSelected]   = useState(null)
  const [pin,        setPin]        = useState('')
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState('')
  const [pinLoading, setPinLoading] = useState(false)

  useEffect(() => {
    supabase.from('nhan_vien')
      .select('id, ho_ten, vi_tri, avatar_url, trang_thai')
      .eq('trang_thai', 'dang_lam').order('ho_ten')
      .then(({ data }) => { setDanhSach(data || []); setLoading(false) })
  }, [])

  const handleSelectNV = (nv) => { setSelected(nv); setPin(''); setError('') }

  const handlePinPress = (digit) => {
    if (pin.length >= 4) return
    const newPin = pin + digit
    setPin(newPin)
    if (newPin.length === 4) verifyPin(newPin)
  }

  const handleDelete = () => { setPin(p => p.slice(0, -1)); setError('') }

  const verifyPin = async (inputPin) => {
    setPinLoading(true); setError('')
    try {
      const { data } = await supabase.from('nhan_vien')
        .select('*').eq('id', selected.id).eq('pin', inputPin).single()
      if (data) { onLogin(data) }
      else { setError('PIN không đúng, thử lại!'); setPin('') }
    } catch { setError('PIN không đúng, thử lại!'); setPin('') }
    finally { setPinLoading(false) }
  }

  // ═══════════════════ SCREEN 1: CHỌN NHÂN VIÊN ═══════════════════
  if (!selected) return (
    <div style={{ minHeight: '100vh', background: LUX.bg, display: 'flex', flexDirection: 'column', fontFamily: LUX.fontSans }}>

      {/* Hero */}
      <div style={{ ...HERO, padding: '40px 24px 48px', textAlign: 'center' }}>
        {/* Brand mark */}
        <div className="brand-float" style={{ width: 56, height: 56, borderRadius: '50%', margin: '0 auto 18px', background: 'rgba(245,237,224,0.12)', border: '1px solid rgba(245,237,224,0.22)', display: 'grid', placeItems: 'center', backdropFilter: 'blur(8px)' }}>
          {brandMark}
        </div>

        <h1 style={{ fontFamily: LUX.fontSerif, fontSize: 32, fontWeight: 600, letterSpacing: '-0.01em', lineHeight: 1.05, margin: '0 0 8px' }}>
          Hannah Beauty &amp; Spa
        </h1>
        <div style={{ fontSize: 11, letterSpacing: '0.24em', textTransform: 'uppercase', color: 'rgba(245,237,224,0.55)', marginBottom: 20 }}>
          Hệ thống điểm danh
        </div>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'rgba(245,237,224,0.78)', background: 'rgba(255,255,255,0.07)', padding: '8px 16px', borderRadius: 999, border: '1px solid rgba(245,237,224,0.12)' }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: LUX.gold, display: 'inline-block', flexShrink: 0, animation: 'pulse 1.6s cubic-bezier(.4,0,.2,1) infinite' }} />
          Chọn tên để bắt đầu ca làm
        </div>
      </div>

      {/* Staff grid */}
      <div style={{ padding: '22px 16px 32px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }} className="stagger">
        {loading ? (
          <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: 60, color: LUX.ink3, fontSize: 13 }}>Đang tải...</div>
        ) : danhSach.map(nv => (
          <button key={nv.id} onClick={() => handleSelectNV(nv)}
            style={{
              background: LUX.surface2, border: `1px solid ${LUX.line}`, borderRadius: LUX.radius,
              padding: '16px 8px 14px', cursor: 'pointer', textAlign: 'center', position: 'relative',
              overflow: 'hidden', transition: 'all 0.3s cubic-bezier(.2,.8,.2,1)',
              fontFamily: 'inherit', color: 'inherit',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = LUX.champagne; e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = LUX.shadow }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = LUX.line; e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none' }}
            onTouchStart={e => e.currentTarget.style.transform = 'scale(0.96)'}
            onTouchEnd={e => e.currentTarget.style.transform = 'none'}
          >
            <div style={{
              width: 54, height: 54, borderRadius: '50%', margin: '0 auto 10px',
              display: 'grid', placeItems: 'center', overflow: 'hidden',
              background: nv.avatar_url ? 'transparent' : getGrad(nv.ho_ten),
              boxShadow: 'inset 0 -2px 4px rgba(0,0,0,0.15), inset 0 2px 4px rgba(255,255,255,0.2)',
              transition: 'transform 0.3s cubic-bezier(.2,.8,.2,1)',
            }}>
              {nv.avatar_url
                ? <img src={nv.avatar_url} alt={nv.ho_ten} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <span style={{ fontFamily: LUX.fontSerif, fontWeight: 600, fontSize: 22, color: '#f5ede0' }}>{getInitials(nv.ho_ten)}</span>
              }
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, color: LUX.espresso, lineHeight: 1.1 }}>
              {nv.ho_ten.trim().split(' ').slice(-2).join(' ')}
            </div>
            <div style={{ fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: LUX.ink3, marginTop: 4 }}>
              {nv.vi_tri === 'le_tan' ? 'Lễ Tân' : nv.vi_tri === 'ktv' ? 'KTV' : 'Tạp Vụ'}
            </div>
          </button>
        ))}
      </div>

      <div style={{ textAlign: 'center', paddingBottom: 28, fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: LUX.ink3 }}>
        Hannah Spa &middot; v2.6
      </div>
    </div>
  )

  // ═══════════════════ SCREEN 2: NHẬP PIN ═══════════════════
  return (
    <div style={{ minHeight: '100vh', background: LUX.bg, display: 'flex', flexDirection: 'column', fontFamily: LUX.fontSans }}>

      {/* Hero */}
      <div style={{ ...HERO, padding: '40px 24px 44px', textAlign: 'center' }}>
        {/* Back */}
        <button onClick={() => setSelected(null)}
          style={{
            position: 'absolute', left: 20, top: 44, width: 38, height: 38,
            borderRadius: '50%', background: 'rgba(255,255,255,0.10)',
            border: '1px solid rgba(245,237,224,0.18)', color: '#f5ede0',
            display: 'grid', placeItems: 'center', cursor: 'pointer',
            backdropFilter: 'blur(8px)', transition: 'all 0.25s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.18)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.10)'}
        >
          {backArrow}
        </button>

        {/* Avatar lớn */}
        <div style={{
          width: 80, height: 80, borderRadius: '50%', overflow: 'hidden', margin: '0 auto 14px',
          background: selected.avatar_url ? 'transparent' : getGrad(selected.ho_ten),
          display: 'grid', placeItems: 'center',
          boxShadow: '0 8px 32px -8px rgba(0,0,0,0.4), inset 0 -2px 4px rgba(0,0,0,0.15)',
        }}>
          {selected.avatar_url
            ? <img src={selected.avatar_url} alt={selected.ho_ten} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <span style={{ fontFamily: LUX.fontSerif, fontWeight: 600, fontSize: 32, color: '#f5ede0' }}>{getInitials(selected.ho_ten)}</span>
          }
        </div>
        <div style={{ fontFamily: LUX.fontSerif, fontSize: 26, fontWeight: 600, lineHeight: 1, letterSpacing: '-0.01em' }}>
          {selected.ho_ten}
        </div>
        <div style={{ fontSize: 12, color: 'rgba(245,237,224,0.65)', marginTop: 6, letterSpacing: '0.08em' }}>
          {VI_TRI_LABEL[selected.vi_tri]}
        </div>
      </div>

      {/* PIN input area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '36px 24px 40px', maxWidth: 340, margin: '0 auto', width: '100%' }}>

        {/* Label */}
        <div style={{ fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', color: LUX.ink3, marginBottom: 20, fontWeight: 600 }}>
          Nhập PIN 4 số
        </div>

        {/* PIN dots */}
        <div style={{ display: 'flex', gap: 18, marginBottom: error ? 16 : 28 }}>
          {[0, 1, 2, 3].map(i => (
            <div key={i} style={{
              width: 14, height: 14, borderRadius: '50%',
              background: i < pin.length ? LUX.gold : 'transparent',
              border: `2px solid ${i < pin.length ? LUX.gold : LUX.line2}`,
              transition: 'all 0.2s',
              boxShadow: i < pin.length ? `0 0 10px ${LUX.gold}60` : 'none',
            }} />
          ))}
        </div>

        {/* Error / loading */}
        {error && (
          <div style={{ color: LUX.danger, fontSize: 13, fontWeight: 600, marginBottom: 18, textAlign: 'center' }}>
            {error}
          </div>
        )}
        {pinLoading && (
          <div style={{ color: LUX.ink3, fontSize: 12, marginBottom: 18, letterSpacing: '0.06em' }}>
            Đang kiểm tra...
          </div>
        )}

        {/* Keypad */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, width: '100%' }}>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
            <button key={n} onClick={() => handlePinPress(String(n))}
              className="ripple"
              style={{
                padding: '22px 0', borderRadius: LUX.radiusSm, border: `1px solid ${LUX.line}`,
                background: LUX.surface2, fontFamily: LUX.fontSerif, fontSize: 28, fontWeight: 600,
                color: LUX.espresso, cursor: 'pointer', boxShadow: LUX.shadowSm,
                transition: 'all 0.15s', letterSpacing: '-0.01em',
              }}
              onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.93)'; addRipple(e) }}
              onMouseUp={e => e.currentTarget.style.transform = 'none'}
              onTouchStart={e => { e.currentTarget.style.transform = 'scale(0.93)'; addRipple(e) }}
              onTouchEnd={e => e.currentTarget.style.transform = 'none'}
            >{n}</button>
          ))}
          <div />
          <button onClick={() => handlePinPress('0')}
            className="ripple"
            style={{
              padding: '22px 0', borderRadius: LUX.radiusSm, border: `1px solid ${LUX.line}`,
              background: LUX.surface2, fontFamily: LUX.fontSerif, fontSize: 28, fontWeight: 600,
              color: LUX.espresso, cursor: 'pointer', boxShadow: LUX.shadowSm, transition: 'all 0.15s',
            }}
            onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.93)'; addRipple(e) }}
            onMouseUp={e => e.currentTarget.style.transform = 'none'}
            onTouchStart={e => { e.currentTarget.style.transform = 'scale(0.93)'; addRipple(e) }}
            onTouchEnd={e => e.currentTarget.style.transform = 'none'}
          >0</button>
          <button onClick={handleDelete}
            style={{
              padding: '22px 0', borderRadius: LUX.radiusSm, border: `1px solid ${LUX.line}`,
              background: LUX.surface2, fontFamily: LUX.fontSans, fontSize: 18,
              color: LUX.ink2, cursor: 'pointer', boxShadow: LUX.shadowSm, transition: 'all 0.15s',
            }}
            onTouchStart={e => e.currentTarget.style.transform = 'scale(0.93)'}
            onTouchEnd={e => e.currentTarget.style.transform = 'none'}
          >⌫</button>
        </div>

        <div style={{ marginTop: 24, fontSize: 11, color: LUX.ink3, letterSpacing: '0.04em', textAlign: 'center' }}>
          PIN mặc định: 1234
        </div>
      </div>
    </div>
  )
}

function addRipple(e) {
  const btn = e.currentTarget
  const rect = btn.getBoundingClientRect()
  const size = Math.max(rect.width, rect.height)
  const x = (e.clientX || e.touches?.[0]?.clientX || rect.left + rect.width / 2) - rect.left - size / 2
  const y = (e.clientY || e.touches?.[0]?.clientY || rect.top + rect.height / 2) - rect.top - size / 2
  const wave = document.createElement('span')
  wave.className = 'r-wave'
  wave.style.cssText = `width:${size}px;height:${size}px;left:${x}px;top:${y}px`
  btn.appendChild(wave)
  setTimeout(() => wave.remove(), 600)
}
