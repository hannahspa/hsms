import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { LUX } from '../../constants/lux'
import { todayISO, getNowVN } from '../../lib/utils'
import CheckinChamCong from './CheckinChamCong'
import CheckinDangKyOff from './CheckinDangKyOff'
import CheckinDoiPin from './CheckinDoiPin'
import CheckinLich from './CheckinLich'
import CheckinLuong from './CheckinLuong'
import CheckinThuNhap from './CheckinThuNhap'
import CheckinDoiAvatar from './CheckinDoiAvatar'
import './styles.css'

const VI_TRI_LABEL = { ktv: 'Kỹ Thuật Viên', le_tan: 'Lễ Tân', tap_vu: 'Tạp Vụ' }
const DAY_NAMES = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy']

const AVATAR_GRAD = [
  'linear-gradient(135deg,#d4a574,#b08a55)',
  'linear-gradient(135deg,#a07a5c,#6a4a35)',
  'linear-gradient(135deg,#8a6a52,#5a4030)',
  'linear-gradient(135deg,#b87a6a,#8a4a35)',
  'linear-gradient(135deg,#8a9a7a,#5a6a4a)',
]
function getGrad(name) { let h = 0; for (const c of name) h += c.charCodeAt(0); return AVATAR_GRAD[h % AVATAR_GRAD.length] }
function getInitials(name) { const p = name.trim().split(' '); return p[p.length - 1].charAt(0).toUpperCase() }

const HERO = {
  background: `radial-gradient(circle at 100% 0%, rgba(212,165,116,0.4), transparent 55%), linear-gradient(155deg,#4a3528 0%,#3d2c20 50%,#2e2018 100%)`,
  color: '#f5ede0', position: 'relative', overflow: 'hidden',
}

// ── Icons ──
const ICN = {
  calendar: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>,
  off: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="5" width="16" height="15" rx="2"/><path d="M9 3v4M15 3v4M4 10h16M9 14l2 2 4-4"/></svg>,
  wallet: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M3 11h18"/><circle cx="8" cy="15.5" r="1.5"/><path d="M14 16h4M7 7l3-3h4l3 3"/></svg>,
  lock: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="6" y="11" width="12" height="10" rx="2"/><path d="M9 11V8a3 3 0 016 0v3"/><circle cx="12" cy="16" r="1.5"/></svg>,
  clock: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2 2M5 3l3 2M19 3l-3 2"/></svg>,
  check: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
  flag: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>,
  chevron: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>,
  checkin: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3 8-8"/><path d="M20 12v6a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h9"/></svg>,
}

const SHORTCUTS = [
  { tab: 'lich',        accent: '#7a8a6a', icnBg: '#eef2e7', title: 'Lịch Tháng',    desc: 'Xem công tháng này',    icon: ICN.calendar },
  { tab: 'dang-ky-off', accent: '#b87a6a', icnBg: '#f1e3df', title: 'Đăng Ký OFF',   desc: 'Xin nghỉ phép',         icon: ICN.off      },
  { tab: 'luong',       accent: '#c8a675', icnBg: '#f5e9d4', title: 'Lương Tháng',   desc: 'Xem chi tiết lương',    icon: ICN.wallet   },
  { tab: 'thu-nhap',    accent: '#1a5276', icnBg: '#d6eaf8', title: 'Lương Kinh Doanh', desc: 'Tiền Tour & Hoa Hồng',  icon: <span style={{fontSize:20}}>💰</span> },
  { tab: 'doi-pin',     accent: '#8a6a52', icnBg: '#ece2d4', title: 'Đổi PIN',        desc: 'Thay đổi mật khẩu',    icon: ICN.lock     },
  { tab: 'doi-avatar',  accent: '#a07a5c', icnBg: '#f5e8d4', title: 'Ảnh Đại Diện',  desc: 'Thay ảnh, cắt tròn',   icon: <span style={{fontSize:20}}>📷</span> },
]

export default function CheckinHome({ nhanVien, onLogout }) {
  const [tab,       setTab]       = useState('home')
  const [chamCong,  setChamCong]  = useState(null)
  const [loading,   setLoading]   = useState(true)
  const [time,      setTime]      = useState(getNowVN())
  const [avatarUrl, setAvatarUrl] = useState(nhanVien.avatar_url || null)

  const today = todayISO()

  useEffect(() => {
    const timer = setInterval(() => setTime(getNowVN()), 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => { loadChamCong() }, [])

  const loadChamCong = async () => {
    setLoading(true)
    const { data } = await supabase.from('cham_cong').select('*')
      .eq('nhan_vien_id', nhanVien.id).eq('ngay', today).maybeSingle()
    setChamCong(data || null)
    setLoading(false)
  }

  const hh = String(time.getHours()).padStart(2, '0')
  const mm = String(time.getMinutes()).padStart(2, '0')
  const ss = String(time.getSeconds()).padStart(2, '0')

  const getStatus = () => {
    if (!chamCong)
      return { label: 'Chưa check-in', sub: 'Hạn vào ca: 09:15', color: LUX.ink3, icnColor: LUX.ink3, icnBg: '#f5f0e8', icnBd: LUX.line, icon: ICN.clock, btnLabel: 'Check-in ngay', btnKind: 'in' }
    if (chamCong.gio_vao && !chamCong.gio_ra)
      return { label: 'Đang làm việc', sub: `Vào lúc ${(chamCong.gio_vao || '').slice(0, 5)}`, color: LUX.sage, icnColor: LUX.sage, icnBg: '#eef2e7', icnBd: '#b8d4b8', icon: ICN.check, btnLabel: 'Check-out', btnKind: 'out' }
    if (chamCong.gio_vao && chamCong.gio_ra)
      return { label: 'Đã hoàn thành ca', sub: `${(chamCong.gio_vao || '').slice(0, 5)} → ${(chamCong.gio_ra || '').slice(0, 5)}`, color: LUX.champagne2, icnColor: LUX.gold, icnBg: '#f5e8d4', icnBd: '#d4c090', icon: ICN.flag, btnLabel: 'Đã hoàn thành', btnKind: 'done' }
    return { label: chamCong.loai, sub: '', color: LUX.ink3, icnColor: LUX.ink3, icnBg: LUX.surface, icnBd: LUX.line, icon: ICN.clock, btnLabel: 'Chi tiết', btnKind: 'in' }
  }

  const st = getStatus()

  if (tab === 'cham-cong') return <CheckinChamCong nhanVien={nhanVien} chamCong={chamCong} onBack={() => { setTab('home'); loadChamCong() }} onUpdated={loadChamCong} />
  if (tab === 'dang-ky-off') return <CheckinDangKyOff nhanVien={nhanVien} onBack={() => setTab('home')} />
  if (tab === 'lich') return <CheckinLich nhanVien={nhanVien} onBack={() => setTab('home')} />
  if (tab === 'doi-pin')    return <CheckinDoiPin    nhanVien={nhanVien} onBack={() => setTab('home')} />
  if (tab === 'luong')      return <CheckinLuong      nhanVien={nhanVien} onBack={() => setTab('home')} />
  if (tab === 'thu-nhap')  return <CheckinThuNhap    nhanVien={nhanVien} onBack={() => setTab('home')} />
  if (tab === 'doi-avatar') return <CheckinDoiAvatar  nhanVien={{ ...nhanVien, avatar_url: avatarUrl }} onBack={() => setTab('home')} onUpdated={url => setAvatarUrl(url)} />

  return (
    <div style={{ minHeight: '100vh', background: LUX.bg, fontFamily: LUX.fontSans, backgroundImage: 'radial-gradient(circle at 20% 0%, rgba(200,166,117,0.10), transparent 50%), radial-gradient(circle at 80% 100%, rgba(138,106,82,0.08), transparent 50%)' }}>

      {/* ── Hero ── */}
      <header style={{ ...HERO, padding: '22px 22px 30px', display: 'flex', alignItems: 'center', gap: 14 }}>
        {/* Avatar — bấm để đổi ảnh */}
        <button onClick={() => setTab('doi-avatar')} style={{ position: 'relative', width: 56, height: 56, flexShrink: 0, background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', overflow: 'hidden', boxShadow: '0 4px 16px -4px rgba(212,165,116,0.5), inset 0 -2px 4px rgba(0,0,0,0.15)' }}>
            {avatarUrl
              ? <img src={avatarUrl} alt={nhanVien.ho_ten} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <div style={{ width: '100%', height: '100%', background: getGrad(nhanVien.ho_ten), display: 'grid', placeItems: 'center' }}>
                  <span style={{ fontFamily: LUX.fontSerif, fontSize: 22, fontWeight: 600, color: '#f5ede0' }}>{getInitials(nhanVien.ho_ten)}</span>
                </div>
            }
          </div>
          {/* Camera badge */}
          <div style={{ position: 'absolute', bottom: -2, right: -2, width: 20, height: 20, borderRadius: '50%', background: LUX.goldGrad, display: 'grid', placeItems: 'center', fontSize: 10, border: '1.5px solid rgba(42,32,26,0.8)', boxShadow: '0 1px 4px rgba(0,0,0,0.3)' }}>
            📷
          </div>
        </button>

        {/* Greeting */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(245,237,224,0.55)', marginBottom: 3 }}>Xin chào</div>
          <div style={{ fontFamily: LUX.fontSerif, fontSize: 26, fontWeight: 600, lineHeight: 1, letterSpacing: '-0.01em', marginBottom: 4 }}>{nhanVien.ho_ten}</div>
          <div style={{ fontSize: 12, color: 'rgba(245,237,224,0.65)', letterSpacing: '0.04em' }}>{VI_TRI_LABEL[nhanVien.vi_tri]}</div>
        </div>

        {/* Logout pill */}
        <button onClick={onLogout} className="ripple" style={{
          flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 6,
          background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(245,237,224,0.18)',
          color: '#f5ede0', padding: '8px 14px', borderRadius: 999, fontSize: 12, fontWeight: 500,
          cursor: 'pointer', backdropFilter: 'blur(8px)', transition: 'all 0.25s',
          fontFamily: 'inherit',
        }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.16)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
        >
          Đăng xuất
        </button>
      </header>

      {/* ── Clock Card ── */}
      <div style={{ margin: '-16px 18px 0', background: LUX.surface2, borderRadius: LUX.radius, border: `1px solid ${LUX.line}`, boxShadow: LUX.shadow, padding: 22, textAlign: 'center', position: 'relative', overflow: 'hidden' }} className="stagger">
        <div />
        <div style={{ fontFamily: LUX.fontSerif, fontSize: 56, fontWeight: 600, color: LUX.espresso, lineHeight: 1, letterSpacing: '-0.02em' }}>
          {hh}<span style={{ color: LUX.champagne }}>:</span>{mm}
          <span style={{ fontSize: 28, color: LUX.champagne2, fontWeight: 500, marginLeft: 4, animation: 'blink 1s steps(2) infinite' }}>{ss}</span>
        </div>
        <div style={{ fontSize: 12, letterSpacing: '0.12em', textTransform: 'uppercase', color: LUX.ink3, marginTop: 8 }}>
          {DAY_NAMES[time.getDay()]} &middot; {String(time.getDate()).padStart(2, '0')}.{String(time.getMonth() + 1).padStart(2, '0')}.{time.getFullYear()}
        </div>
      </div>

      {/* ── Status / Checkin Card ── */}
      <div style={{ margin: '12px 18px 0', background: LUX.surface2, borderRadius: LUX.radius, border: `1px solid ${LUX.line}`, padding: 18, position: 'relative', overflow: 'hidden' }} className="stagger">
        <div />
        <div style={{ fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: LUX.ink3, fontWeight: 600 }}>Hôm nay</div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '12px 0 16px' }}>
          <div style={{
            width: 38, height: 38, borderRadius: 12, flexShrink: 0, display: 'grid', placeItems: 'center',
            background: st.icnBg, border: `1px solid ${st.icnBd}`, color: st.icnColor,
          }}>
            {st.icon}
          </div>
          <div>
            <div style={{ fontFamily: LUX.fontSerif, fontSize: 16, fontWeight: 600, color: st.color }}>{st.label}</div>
            {st.sub && <div style={{ fontFamily: LUX.fontSans, fontSize: 11, color: LUX.ink3, marginTop: 2, letterSpacing: '0.06em' }}>{st.sub}</div>}
          </div>
        </div>

        {!loading && (
          <button onClick={() => setTab('cham-cong')} className="btn-shimmer ripple"
            style={{
              width: '100%', padding: '16px', borderRadius: 14, border: 'none', cursor: 'pointer',
              background: st.btnKind === 'out' ? 'linear-gradient(180deg,#c06050,#8a3a2a)'
                : st.btnKind === 'done' ? LUX.surface
                : 'linear-gradient(180deg,#d4a574,#a07a4a)',
              color: st.btnKind === 'done' ? LUX.ink3 : '#fdf6e8',
              fontFamily: LUX.fontSerif, fontWeight: 600, fontSize: 15, letterSpacing: '0.04em',
              boxShadow: st.btnKind === 'done' ? 'none'
                : st.btnKind === 'out' ? '0 4px 14px rgba(192,96,80,0.35)'
                : '0 8px 24px -8px rgba(160,122,74,0.55), inset 0 1px 0 rgba(255,255,255,0.3)',
              transition: 'transform 0.2s',
            }}
            onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'none'}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              {st.btnKind === 'in' ? ICN.checkin : null}
              {st.btnLabel}
            </span>
          </button>
        )}
      </div>

      {/* ── Shortcut Grid 2×2 ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, padding: '14px 18px 28px' }} className="stagger">
        {SHORTCUTS.map((item, i) => (
          <button key={item.tab} onClick={() => setTab(item.tab)}
            style={{
              background: LUX.surface2, border: `1px solid ${LUX.line}`, borderRadius: LUX.radius,
              padding: 16, cursor: 'pointer', textAlign: 'left', position: 'relative', overflow: 'hidden',
              transition: 'all 0.3s cubic-bezier(.2,.8,.2,1)', fontFamily: 'inherit', color: LUX.ink,
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'translateY(-2px)'
              e.currentTarget.style.borderColor = item.accent
              e.currentTarget.style.boxShadow = LUX.shadow
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'none'
              e.currentTarget.style.borderColor = LUX.line
              e.currentTarget.style.boxShadow = 'none'
            }}
          >
            {/* Accent glow */}
            <div style={{
              position: 'absolute', right: -20, bottom: -20, width: 80, height: 80, borderRadius: '50%',
              background: item.accent, opacity: 0.06, transition: 'all 0.4s cubic-bezier(.2,.8,.2,1)',
              ...(i === 0 ? {} : {}),
            }} />

            <div style={{
              width: 38, height: 38, borderRadius: 11, display: 'grid', placeItems: 'center',
              background: item.icnBg, color: item.accent, marginBottom: 14,
              transition: 'transform 0.3s cubic-bezier(.2,.8,.2,1)',
            }}>
              {item.icon}
            </div>

            <div style={{ position: 'absolute', top: 16, right: 16, color: LUX.ink4, transition: 'all 0.25s' }}>
              {ICN.chevron}
            </div>

            <div style={{ fontFamily: LUX.fontSerif, fontSize: 18, fontWeight: 600, lineHeight: 1, color: LUX.espresso, marginBottom: 3 }}>
              {item.title}
            </div>
            <div style={{ fontSize: 11, color: LUX.ink3, letterSpacing: '0.04em' }}>
              {item.desc}
            </div>
          </button>
        ))}
      </div>

      <div style={{ textAlign: 'center', padding: '18px 0 28px', fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: LUX.ink3 }}>
        Hannah Spa &middot; {String(time.getDate()).padStart(2, '0')}.{String(time.getMonth() + 1).padStart(2, '0')}.{time.getFullYear()}
      </div>
    </div>
  )
}
