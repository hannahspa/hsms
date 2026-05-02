import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { COLORS } from '../../constants/colors'

const VI_TRI_LABEL = { ktv: 'Kỹ Thuật Viên', le_tan: 'Lễ Tân', tap_vu: 'Tạp Vụ' }

export default function CheckinLogin({ onLogin }) {
  const [danhSach,     setDanhSach]     = useState([])
  const [selected,     setSelected]     = useState(null)
  const [pin,          setPin]          = useState('')
  const [loading,      setLoading]      = useState(true)
  const [error,        setError]        = useState('')
  const [pinLoading,   setPinLoading]   = useState(false)

  useEffect(() => {
    supabase.from('nhan_vien')
      .select('id, ho_ten, vi_tri, avatar_url, trang_thai')
      .eq('trang_thai', 'dang_lam')
      .order('ho_ten')
      .then(({ data }) => { setDanhSach(data || []); setLoading(false) })
  }, [])

  const handleSelectNV = (nv) => {
    setSelected(nv)
    setPin('')
    setError('')
  }

  const handlePinPress = (digit) => {
    if (pin.length >= 4) return
    const newPin = pin + digit
    setPin(newPin)
    if (newPin.length === 4) {
      verifyPin(newPin)
    }
  }

  const handleDelete = () => {
    setPin(prev => prev.slice(0, -1))
    setError('')
  }

  const verifyPin = async (inputPin) => {
    setPinLoading(true)
    setError('')
    try {
      const { data } = await supabase
        .from('nhan_vien')
        .select('*')
        .eq('id', selected.id)
        .eq('pin', inputPin)
        .single()

      if (data) {
        onLogin(data)
      } else {
        setError('PIN không đúng, thử lại!')
        setPin('')
      }
    } catch {
      setError('PIN không đúng, thử lại!')
      setPin('')
    } finally {
      setPinLoading(false)
    }
  }

  const getInitials = (name) => {
    const parts = name.trim().split(' ')
    return parts[parts.length - 1].charAt(0).toUpperCase()
  }

  const getAvatarColor = (name) => {
    const colors = ['#A0714F','#C9A96E','#7D5A3C','#B8860B','#8B6914']
    let hash = 0
    for (let c of name) hash += c.charCodeAt(0)
    return colors[hash % colors.length]
  }

  // ── Màn hình chọn nhân viên ──────────────────────────
  if (!selected) return (
    <div style={{ minHeight:'100vh', background:'#FAF7F4', display:'flex', flexDirection:'column' }}>

      {/* Header */}
      <div style={{ background: COLORS.grad, padding:'48px 24px 32px', textAlign:'center' }}>
        <div style={{ fontSize:'36px', marginBottom:'8px' }}>🌸</div>
        <div style={{ color:'white', fontSize:'22px', fontWeight:'800', marginBottom:'4px' }}>
          Hannah Beauty & Spa
        </div>
        <div style={{ color:'rgba(255,255,255,0.8)', fontSize:'14px' }}>
          Chọn tên để điểm danh
        </div>
      </div>

      {/* Danh sách nhân viên */}
      <div style={{ padding:'24px 16px', flex:1 }}>
        {loading ? (
          <div style={{ textAlign:'center', padding:'60px', color:COLORS.textMute }}>
            Đang tải...
          </div>
        ) : (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:'16px' }}>
            {danhSach.map(nv => (
              <button key={nv.id} onClick={() => handleSelectNV(nv)}
                style={{ background:COLORS.card, borderRadius:'20px', padding:'20px 12px', border:`1px solid ${COLORS.border}`, cursor:'pointer', boxShadow:COLORS.shadow, display:'flex', flexDirection:'column', alignItems:'center', gap:'10px', transition:'transform 0.15s' }}
                onTouchStart={e => e.currentTarget.style.transform='scale(0.95)'}
                onTouchEnd={e => e.currentTarget.style.transform='scale(1)'}
              >
                {/* Avatar */}
                <div style={{ width:'64px', height:'64px', borderRadius:'50%', overflow:'hidden', border:`3px solid ${COLORS.primary}`, flexShrink:0 }}>
                  {nv.avatar_url ? (
                    <img src={nv.avatar_url} alt={nv.ho_ten}
                      style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                  ) : (
                    <div style={{ width:'100%', height:'100%', background:getAvatarColor(nv.ho_ten), display:'flex', alignItems:'center', justifyContent:'center', fontSize:'24px', fontWeight:'800', color:'white' }}>
                      {getInitials(nv.ho_ten)}
                    </div>
                  )}
                </div>
                {/* Tên */}
                <div style={{ fontSize:'12px', fontWeight:'700', color:COLORS.text, textAlign:'center', lineHeight:'1.3' }}>
                  {nv.ho_ten.split(' ').slice(-2).join(' ')}
                </div>
                <div style={{ fontSize:'10px', color:COLORS.textMute }}>
                  {VI_TRI_LABEL[nv.vi_tri] || nv.vi_tri}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )

  // ── Màn hình nhập PIN ────────────────────────────────
  return (
    <div style={{ minHeight:'100vh', background:'#FAF7F4', display:'flex', flexDirection:'column', alignItems:'center' }}>

      {/* Header */}
      <div style={{ background:COLORS.grad, width:'100%', padding:'48px 24px 32px', textAlign:'center' }}>
        <button onClick={() => setSelected(null)}
          style={{ position:'absolute', left:'20px', top:'48px', background:'rgba(255,255,255,0.2)', border:'none', borderRadius:'50%', width:'36px', height:'36px', color:'white', fontSize:'18px', cursor:'pointer' }}>
          ←
        </button>
        {/* Avatar lớn */}
        <div style={{ width:'80px', height:'80px', borderRadius:'50%', overflow:'hidden', border:'3px solid rgba(255,255,255,0.5)', margin:'0 auto 12px' }}>
          {selected.avatar_url ? (
            <img src={selected.avatar_url} alt={selected.ho_ten} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
          ) : (
            <div style={{ width:'100%', height:'100%', background:getAvatarColor(selected.ho_ten), display:'flex', alignItems:'center', justifyContent:'center', fontSize:'32px', fontWeight:'800', color:'white' }}>
              {getInitials(selected.ho_ten)}
            </div>
          )}
        </div>
        <div style={{ color:'white', fontSize:'20px', fontWeight:'800' }}>{selected.ho_ten}</div>
        <div style={{ color:'rgba(255,255,255,0.75)', fontSize:'13px', marginTop:'4px' }}>
          {VI_TRI_LABEL[selected.vi_tri]}
        </div>
      </div>

      <div style={{ padding:'40px 24px', width:'100%', maxWidth:'320px' }}>
        {/* PIN dots */}
        <div style={{ textAlign:'center', marginBottom:'8px', fontSize:'14px', fontWeight:'600', color:COLORS.textSub }}>
          Nhập PIN 4 số
        </div>
        <div style={{ display:'flex', justifyContent:'center', gap:'16px', marginBottom:'16px' }}>
          {[0,1,2,3].map(i => (
            <div key={i} style={{
              width:'16px', height:'16px', borderRadius:'50%',
              background: i < pin.length ? COLORS.primary : 'transparent',
              border: `2px solid ${i < pin.length ? COLORS.primary : COLORS.border}`,
              transition:'all 0.2s'
            }} />
          ))}
        </div>

        {/* Error */}
        {error && (
          <div style={{ textAlign:'center', color:COLORS.chi, fontSize:'13px', fontWeight:'600', marginBottom:'16px' }}>
            {error}
          </div>
        )}

        {/* Loading */}
        {pinLoading && (
          <div style={{ textAlign:'center', color:COLORS.textMute, fontSize:'13px', marginBottom:'16px' }}>
            Đang kiểm tra...
          </div>
        )}

        {/* Bàn phím số */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:'12px' }}>
          {[1,2,3,4,5,6,7,8,9].map(n => (
            <button key={n} onClick={() => handlePinPress(String(n))}
              style={{ padding:'20px', borderRadius:'16px', border:`1px solid ${COLORS.border}`, background:COLORS.card, fontSize:'24px', fontWeight:'700', color:COLORS.text, cursor:'pointer', boxShadow:COLORS.shadow, transition:'transform 0.1s' }}
              onTouchStart={e => e.currentTarget.style.transform='scale(0.92)'}
              onTouchEnd={e => e.currentTarget.style.transform='scale(1)'}
            >
              {n}
            </button>
          ))}
          {/* Hàng cuối: trống - 0 - xóa */}
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

        <div style={{ textAlign:'center', marginTop:'24px', fontSize:'12px', color:COLORS.textMute }}>
          PIN mặc định: 1234
        </div>
      </div>
    </div>
  )
}