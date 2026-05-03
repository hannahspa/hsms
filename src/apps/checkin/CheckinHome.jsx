import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { COLORS } from '../../constants/colors'
import { formatCurrency, todayISO } from '../../lib/utils'
import CheckinChamCong from './CheckinChamCong'
import CheckinDangKyOff from './CheckinDangKyOff'
import CheckinDoiPin from './CheckinDoiPin'
import CheckinLich from './CheckinLich'

const VI_TRI_LABEL = { ktv: 'Kỹ Thuật Viên', le_tan: 'Lễ Tân', tap_vu: 'Tạp Vụ' }

export default function CheckinHome({ nhanVien, onLogout }) {
  const [tab,        setTab]        = useState('home')
  const [chamCong,   setChamCong]   = useState(null)
  const [loading,    setLoading]    = useState(true)
  const [time,       setTime]       = useState(getNowVN())

  const today = todayISO()

  useEffect(() => {
    const getNowVN = () => {
      const now = getNowVN()
      const utcMs = now.getTime() + now.getTimezoneOffset() * 60000
      return new Date(utcMs + 7 * 60 * 60000)
    }
    const timer = setInterval(() => setTime(getNowVN()), 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    loadChamCong()
  }, [])

  const loadChamCong = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('cham_cong')
      .select('*')
      .eq('nhan_vien_id', nhanVien.id)
      .eq('ngay', today)
      .maybeSingle()
    setChamCong(data || null)
    setLoading(false)
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

  const formatTime = (t) => {
    return t.toLocaleTimeString('vi-VN', { hour:'2-digit', minute:'2-digit', second:'2-digit', hour12: false })
  }

  const formatDateFull = (t) => {
    const days = ['Chủ Nhật','Thứ Hai','Thứ Ba','Thứ Tư','Thứ Năm','Thứ Sáu','Thứ Bảy']
    return `${days[t.getDay()]}, ${String(t.getDate()).padStart(2,'0')}/${String(t.getMonth()+1).padStart(2,'0')}/${t.getFullYear()}`
  }

  const getStatusChamCong = () => {
    if (!chamCong) return { label: 'Chưa check-in', color: COLORS.textMute, icon: '⏰' }
    if (chamCong.gio_vao && !chamCong.gio_ra) return { label: 'Đang làm việc', color: '#2D7A4F', icon: '✅' }
    if (chamCong.gio_vao && chamCong.gio_ra) return { label: 'Đã check-out', color: COLORS.primary, icon: '🏁' }
    return { label: chamCong.loai, color: COLORS.textMute, icon: '📋' }
  }

  const status = getStatusChamCong()

  if (tab === 'cham-cong') return (
    <CheckinChamCong
      nhanVien={nhanVien}
      chamCong={chamCong}
      onBack={() => { setTab('home'); loadChamCong() }}
      onUpdated={loadChamCong}
    />
  )

  if (tab === 'dang-ky-off') return (
    <CheckinDangKyOff
      nhanVien={nhanVien}
      onBack={() => setTab('home')}
    />
  )
if (tab === 'lich') return (
  <CheckinLich
    nhanVien={nhanVien}
    onBack={() => setTab('home')}
  />
)
  if (tab === 'doi-pin') return (
    <CheckinDoiPin
      nhanVien={nhanVien}
      onBack={() => setTab('home')}
    />
  )

  return (
    <div style={{ minHeight:'100vh', background:'#FAF7F4', paddingBottom:'40px' }}>

      {/* Header */}
      <div style={{ background:COLORS.grad, padding:'48px 20px 28px', position:'relative' }}>
        <button onClick={onLogout}
          style={{ position:'absolute', right:'20px', top:'48px', background:'rgba(255,255,255,0.2)', border:'none', borderRadius:'12px', padding:'8px 14px', color:'white', fontSize:'12px', fontWeight:'700', cursor:'pointer' }}>
          Đăng xuất
        </button>

        <div style={{ display:'flex', alignItems:'center', gap:'16px' }}>
          {/* Avatar */}
          <div style={{ width:'64px', height:'64px', borderRadius:'50%', overflow:'hidden', border:'3px solid rgba(255,255,255,0.5)', flexShrink:0 }}>
            {nhanVien.avatar_url ? (
              <img src={nhanVien.avatar_url} alt={nhanVien.ho_ten} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
            ) : (
              <div style={{ width:'100%', height:'100%', background:getAvatarColor(nhanVien.ho_ten), display:'flex', alignItems:'center', justifyContent:'center', fontSize:'24px', fontWeight:'800', color:'white' }}>
                {getInitials(nhanVien.ho_ten)}
              </div>
            )}
          </div>
          <div>
            <div style={{ color:'rgba(255,255,255,0.8)', fontSize:'13px' }}>Xin chào,</div>
            <div style={{ color:'white', fontSize:'20px', fontWeight:'800' }}>{nhanVien.ho_ten}</div>
            <div style={{ color:'rgba(255,255,255,0.75)', fontSize:'12px', marginTop:'2px' }}>
              {VI_TRI_LABEL[nhanVien.vi_tri]}
            </div>
          </div>
        </div>
      </div>

      <div style={{ padding:'20px 16px' }}>

        {/* Đồng hồ */}
        <div style={{ background:COLORS.card, borderRadius:'24px', padding:'24px', marginBottom:'16px', textAlign:'center', border:`1px solid ${COLORS.border}`, boxShadow:COLORS.shadow }}>
          <div style={{ fontSize:'42px', fontWeight:'800', color:COLORS.text, letterSpacing:'-1px', fontVariantNumeric:'tabular-nums' }}>
            {formatTime(time)}
          </div>
          <div style={{ fontSize:'14px', color:COLORS.textMute, marginTop:'4px' }}>
            {formatDateFull(time)}
          </div>
        </div>

        {/* Trạng thái hôm nay */}
        <div style={{ background:COLORS.card, borderRadius:'24px', padding:'20px', marginBottom:'16px', border:`1px solid ${COLORS.border}`, boxShadow:COLORS.shadow }}>
          <div style={{ fontSize:'13px', color:COLORS.textMute, fontWeight:'600', marginBottom:'12px', textTransform:'uppercase', letterSpacing:'0.5px' }}>
            Hôm nay
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:'12px', marginBottom:'16px' }}>
            <div style={{ fontSize:'32px' }}>{status.icon}</div>
            <div>
              <div style={{ fontWeight:'800', fontSize:'16px', color:status.color }}>{status.label}</div>
              {chamCong?.gio_vao && (
                <div style={{ fontSize:'12px', color:COLORS.textMute, marginTop:'2px' }}>
                  Vào: {chamCong.gio_vao?.slice(0,5)}
                  {chamCong.gio_ra && ` • Ra: ${chamCong.gio_ra?.slice(0,5)}`}
                </div>
              )}
            </div>
          </div>

          {/* Nút Check-in / Check-out */}
          {!loading && (
            <button onClick={() => setTab('cham-cong')} style={{
              width:'100%', padding:'16px', borderRadius:'16px',
              background: !chamCong ? COLORS.grad :
                         chamCong.gio_vao && !chamCong.gio_ra ? 'linear-gradient(135deg,#C0392B,#E74C3C)' :
                         'linear-gradient(135deg,#95A5A6,#7F8C8D)',
              color:'white', border:'none', fontWeight:'800', fontSize:'16px', cursor:'pointer',
              boxShadow:'0 4px 16px rgba(160,113,79,0.3)'
            }}>
              {!chamCong ? '👆 Check-in' :
               chamCong.gio_vao && !chamCong.gio_ra ? '🏁 Check-out' :
               '✅ Đã hoàn thành'}
            </button>
          )}
        </div>

        {/* Menu chức năng */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'12px' }}>
          {[
            { icon:'📅', label:'Lịch Tháng',   desc:'Xem công tháng này', tab:'lich',         color:'#F0FDF4' },
            { icon:'🗓️', label:'Đăng Ký OFF',  desc:'Xin nghỉ phép',      tab:'dang-ky-off',  color:'#EBF5FB' },
            { icon:'🔑', label:'Đổi PIN',      desc:'Thay đổi mật khẩu',  tab:'doi-pin',      color:'#FEF9E7' },
          ].map(item => (
            <button key={item.tab} onClick={() => setTab(item.tab)}
              style={{ background:item.color, borderRadius:'20px', padding:'20px 16px', border:`1px solid ${COLORS.border}`, cursor:'pointer', textAlign:'left', boxShadow:COLORS.shadow }}>
              <div style={{ fontSize:'28px', marginBottom:'8px' }}>{item.icon}</div>
              <div style={{ fontWeight:'700', fontSize:'14px', color:COLORS.text }}>{item.label}</div>
              <div style={{ fontSize:'11px', color:COLORS.textMute, marginTop:'2px' }}>{item.desc}</div>
            </button>
          ))}
        </div>

      </div>
    </div>
  )
}