import { useState, useEffect, useMemo } from 'react'
import { checkinApi } from './checkinApi'
import { LUX } from '../../constants/lux'
import { getNowVN } from '../../lib/utils'
import { tinhLuong, leTanCaInfo } from '../../lib/luong'
import './styles.css'

const CA_VAO_CHUAN = { h: 9, m: 15 }
const CA_RA_CHUAN = { h: 20, m: 0 }

function toPhut(timeStr) {
  const [h, m] = (timeStr || '0:0').split(':').map(Number)
  return h * 60 + m
}

const HERO = {
  background: `radial-gradient(circle at 100% 0%, rgba(212,165,116,0.4), transparent 55%), linear-gradient(155deg,#4a3528 0%,#3d2c20 50%,#2e2018 100%)`,
  color: '#f5ede0', position: 'relative', overflow: 'hidden',
}

const backArrow = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
)

export default function CheckinLich({ nhanVien, onBack }) {
  const now = getNowVN()
  const [thang, setThang] = useState(now.getMonth() + 1)
  const [nam, setNam] = useState(now.getFullYear())
  const [chamCongData, setChamCongData] = useState([])
  const [offData, setOffData] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => { fetchData() }, [thang, nam])

  const fetchData = async () => {
    setLoading(true)
    try {
      const d = await checkinApi.lich(thang, nam)
      setChamCongData(d?.cham_cong || [])
      setOffData((d?.dang_ky_off || []).filter(o => ['cho_duyet', 'duoc_duyet'].includes(o.trang_thai)))
    } catch { /* phiên hết hạn → CheckinApp xử lý khi thao tác lại */ }
    setLoading(false)
  }

  const daysInMonth = new Date(nam, thang, 0).getDate()
  const firstDayOfWeek = new Date(nam, thang - 1, 1).getDay()

  const chamCongMap = useMemo(() => {
    const map = {}
    chamCongData.forEach(r => {
      const day = parseInt(r.ngay.split('-')[2])
      map[day] = { ...r, source: 'cham_cong' }
    })
    return map
  }, [chamCongData])

  const offMap = useMemo(() => {
    const map = {}
    offData.forEach(r => {
      const day = parseInt(r.ngay_off.split('-')[2])
      if (!chamCongMap[day]) map[day] = { ...r, source: 'dang_ky_off', loai: r.loai_off }
    })
    return map
  }, [offData, chamCongMap])

  const tongKet = useMemo(() => {
    const nowRef = getNowVN()
    const isCurrent = thang === nowRef.getMonth() + 1 && nam === nowRef.getFullYear()
    const todayRef = isCurrent ? nowRef.getDate() : null
    const calc = tinhLuong(nhanVien, chamCongData, offData, null, nam, thang, null, todayRef)
    return {
      ngayCong: calc.ngayCong,
      tangCa: calc.tongTangCa,
      offPhep: calc.soOffCoLuong,
      offOV: calc.soOffPhepVuot + calc.soOffOV,
      offT7: calc.soOffT7CN,
      viPham: calc.soPhamT7X,
      soNgayDiLam: calc.soNgayDiLam,
    }
  }, [chamCongData, offData, nhanVien, nam, thang])

  const getDayStyle = (day) => {
    const cc = chamCongMap[day] || offMap[day]
    const date = new Date(nam, thang - 1, day)
    const isWeekend = date.getDay() === 0 || date.getDay() === 6
    const isFuture = date > now
    const isToday = date.toDateString() === now.toDateString()

    if (isFuture) return {
      bg: 'transparent', textColor: LUX.ink4, numColor: LUX.ink4,
      label: '', subLabel: '', border: `1px solid ${LUX.line}`, isMuted: true,
    }

    if (!cc) return {
      bg: isWeekend ? '#F8F3F0' : '#FEF2F2', textColor: isWeekend ? LUX.ink3 : '#991B1B',
      numColor: isWeekend ? LUX.ink3 : '#991B1B',
      label: isWeekend ? '' : '?', subLabel: '',
      border: `1px solid ${isWeekend ? LUX.line : '#FECACA'}`, isMuted: false,
    }

    if (cc.source === 'dang_ky_off') {
      const isPending = cc.trang_thai === 'cho_duyet'
      return {
        bg: isPending ? '#FFF9F0' : 'rgba(184,122,106,0.15)',
        textColor: isPending ? '#8B6914' : LUX.rose, numColor: isPending ? '#8B6914' : LUX.rose,
        label: 'OFF', subLabel: isPending ? 'Chờ' : '',
        border: `1px solid ${isPending ? '#FDE68A' : 'rgba(184,122,106,0.3)'}`, isMuted: false,
      }
    }

    if (cc.loai !== 'di_lam') return {
      bg: 'rgba(184,122,106,0.15)', textColor: LUX.rose, numColor: LUX.rose,
      label: 'OFF', subLabel: '', border: `1px solid rgba(184,122,106,0.3)`, isMuted: false,
    }

    if (cc.gio_vao && !cc.gio_ra) return {
      bg: '#FFF9F0', textColor: '#8B6914', numColor: '#8B6914',
      label: '', subLabel: 'Làm', border: '1px solid #FDE68A', isMuted: false,
    }

    // Lễ Tân ngày thường: dùng hệ số theo mốc 18:00 + nhãn Ca A/Ca B
    const lt = leTanCaInfo(nhanVien.vi_tri, cc.ngay, cc.gio_vao, cc.gio_ra)
    const caLbl = lt ? `Ca ${lt.ca}` : ''
    const heSo = lt ? lt.heSo : (cc.he_so ?? 0)
    const pct = Math.round(heSo * 100)
    const vaoPhut = cc.gio_vao ? toPhut(cc.gio_vao.slice(0, 5)) : 0
    const chuanVao = CA_VAO_CHUAN.h * 60 + CA_VAO_CHUAN.m
    const treLate = Math.max(0, vaoPhut - chuanVao)

    if (pct >= 100 && treLate === 0) return {
      bg: 'rgba(122,138,106,0.15)', textColor: LUX.sage, numColor: LUX.sage,
      label: caLbl || 'OK', subLabel: '', border: `1px solid rgba(122,138,106,0.3)`, isMuted: false,
    }
    if (pct >= 100) return {
      bg: '#FDF6EE', textColor: LUX.taupe, numColor: LUX.taupe,
      label: caLbl || 'OK', subLabel: treLate > 0 ? `+${treLate}p` : '',
      border: `1px solid ${LUX.champagne}40`, isMuted: false,
    }
    if (pct >= 50) return {
      bg: 'rgba(212,146,74,0.15)', textColor: '#d4924a', numColor: '#d4924a',
      label: `${pct}%`, subLabel: treLate > 0 ? `+${treLate}p` : '',
      border: `1px solid rgba(212,146,74,0.3)`, isMuted: false,
    }
    return {
      bg: '#FEF2F2', textColor: '#C0392B', numColor: '#C0392B',
      label: `${pct}%`, subLabel: '', border: '1px solid #FECACA', isMuted: false,
    }
  }

  const prevMonth = () => { if (thang === 1) { setThang(12); setNam(n => n - 1) } else setThang(t => t - 1) }
  const nextMonth = () => { if (thang === 12) { setThang(1); setNam(n => n + 1) } else setThang(t => t + 1) }

  const statStyle = (mb, mc) => ({
    background: LUX.surface2, border: `1px solid ${LUX.line}`, borderRadius: LUX.radiusSm,
    padding: '12px 10px', textAlign: 'center', transition: 'transform 0.25s',
    cursor: 'default',
  })

  return (
    <div style={{ minHeight: '100vh', background: LUX.bg, fontFamily: LUX.fontSans, paddingBottom: 40 }}>

      {/* Header */}
      <header style={{ ...HERO, padding: '20px 22px 36px', display: 'flex', alignItems: 'center', gap: 14 }}>
        <button onClick={onBack} style={{
          width: 38, height: 38, borderRadius: '50%', background: 'rgba(255,255,255,0.10)',
          border: '1px solid rgba(245,237,224,0.18)', color: '#f5ede0',
          display: 'grid', placeItems: 'center', cursor: 'pointer', backdropFilter: 'blur(8px)',
        }}>
          {backArrow}
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(245,237,224,0.55)', marginBottom: 4 }}>Hannah Spa</div>
          <h2 style={{ fontFamily: LUX.fontSerif, fontSize: 26, fontWeight: 600, margin: 0, lineHeight: 1, letterSpacing: '-0.01em' }}>Lịch công tháng</h2>
        </div>
      </header>

      {/* Month pill */}
      <div style={{
        margin: '-18px 22px 0', position: 'relative',
        background: 'rgba(255,255,255,0.10)', border: '1px solid rgba(245,237,224,0.18)',
        borderRadius: 14, padding: '10px 14px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        backdropFilter: 'blur(8px)',
      }}>
        <button onClick={prevMonth} style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(245,237,224,0.08)', color: '#f5ede0', cursor: 'pointer', display: 'grid', placeItems: 'center', border: 'none' }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
        </button>
        <div style={{ fontFamily: LUX.fontSerif, fontSize: 18, fontWeight: 600, color: '#f5ede0' }}>
          Tháng {thang} &middot; {nam}
        </div>
        <button onClick={nextMonth} style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(245,237,224,0.08)', color: '#f5ede0', cursor: 'pointer', display: 'grid', placeItems: 'center', border: 'none' }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
        </button>
      </div>

      <div style={{ padding: '0 18px' }} className="stagger">

        {/* ── Stat Row 1 ── */}
        <div />
        <div style={{ margin: '-16px 0 0', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
          {[
            { label: 'Ngày Công', value: tongKet.ngayCong.toFixed(1), color: '#5a6a4a', bg: '#eef2e7', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg> },
            { label: 'Tăng Ca', value: `${tongKet.tangCa}h`, color: '#a07a45', bg: '#fbe8d4', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2 2"/></svg> },
            { label: 'Vi Phạm', value: tongKet.viPham, color: tongKet.viPham > 0 ? '#c25a4a' : LUX.ink3, bg: tongKet.viPham > 0 ? '#fdeede' : LUX.surface, icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l9 17H3z"/><path d="M12 10v4M12 17v.5"/></svg> },
          ].map(item => (
            <div key={item.label} style={statStyle()}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: item.bg, color: item.color, display: 'grid', placeItems: 'center', margin: '0 auto 6px' }}>{item.icon}</div>
              <div style={{ fontFamily: LUX.fontSerif, fontSize: 22, fontWeight: 600, lineHeight: 1, color: LUX.espresso }}>{item.value}</div>
              <div style={{ fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: LUX.ink3, marginTop: 4 }}>{item.label}</div>
            </div>
          ))}
        </div>

        {/* ── Stat Row 2 ── */}
        <div style={{ marginTop: 8, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
          {[
            { label: 'OFF Có Lương', value: tongKet.offPhep, color: '#8a4a35', bg: '#f1e3df' },
            { label: 'OFF Ko Lương', value: tongKet.offOV, color: '#c25a4a', bg: '#fdeede' },
            { label: 'OFF T7/CN x2', value: tongKet.offT7, color: '#a07a45', bg: '#f5e9d4' },
          ].map(item => (
            <div key={item.label} style={statStyle()}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: item.bg, color: item.color, display: 'grid', placeItems: 'center', margin: '0 auto 6px' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 4c1.5 2.5 4 3.5 4 6a4 4 0 11-8 0c0-2.5 2.5-3.5 4-6z"/></svg>
              </div>
              <div style={{ fontFamily: LUX.fontSerif, fontSize: 22, fontWeight: 600, lineHeight: 1, color: LUX.espresso }}>{item.value}</div>
              <div style={{ fontSize: 9, letterSpacing: '0.06em', textTransform: 'uppercase', color: LUX.ink3, marginTop: 4, lineHeight: 1.2 }}>{item.label}</div>
            </div>
          ))}
        </div>

        {/* ── Calendar ── */}
        <div style={{ marginTop: 14, background: LUX.surface2, border: `1px solid ${LUX.line}`, borderRadius: LUX.radius, padding: '16px 14px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4 }}>
            {['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'].map((d, i) => (
              <div key={d} style={{ textAlign: 'center', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: (i === 0 || i === 6) ? LUX.rose : LUX.ink3, padding: '6px 0', fontWeight: 600 }}>{d}</div>
            ))}
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: LUX.ink3 }}>Đang tải...</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4 }}>
              {Array.from({ length: firstDayOfWeek }).map((_, i) => <div key={`e-${i}`} />)}
              {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                const style = getDayStyle(day)
                const date = new Date(nam, thang - 1, day)
                const isToday = date.toDateString() === now.toDateString()
                const isWeekend = date.getDay() === 0 || date.getDay() === 6

                return (
                  <div key={day} style={{
                    aspectRatio: '1', borderRadius: 10, padding: 4,
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    background: style.bg, border: isToday ? `2px solid ${LUX.gold}` : style.border,
                    opacity: style.isMuted ? 0.35 : 1, cursor: style.isMuted ? 'default' : 'pointer',
                    transition: 'all 0.2s', position: 'relative',
                    ...(isToday ? { background: 'rgba(212,165,116,0.08)' } : {}),
                  }}>
                    <div style={{
                      fontSize: 13, fontWeight: isToday ? 700 : 600, color: isToday ? LUX.champagne2 : style.numColor,
                      lineHeight: 1, marginTop: 2,
                      ...(isWeekend && !style.isMuted ? { color: LUX.rose } : {}),
                    }}>{day}</div>
                    {style.label && (
                      <div style={{ fontSize: 8, letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 600, color: style.textColor, marginTop: 'auto' }}>
                        {isToday ? 'HÔM NAY' : style.label}
                      </div>
                    )}
                    {style.subLabel && (
                      <div style={{ fontSize: 7, fontWeight: 600, color: style.textColor, opacity: 0.85, lineHeight: 1, marginTop: 1 }}>{style.subLabel}</div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* ── Legend ── */}
        <div style={{ marginTop: 12, background: LUX.surface2, border: `1px solid ${LUX.line}`, borderRadius: LUX.radius, padding: '14px 16px' }}>
          <div style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: LUX.ink3, fontWeight: 600, marginBottom: 10 }}>Chú thích</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {[
              { swatch: 'rgba(122,138,106,0.25)', border: '1px solid rgba(122,138,106,0.4)', text: 'Đúng giờ 100%' },
              { swatch: 'rgba(212,146,74,0.25)', border: '1px solid rgba(212,146,74,0.4)', text: 'Trễ / về sớm' },
              { swatch: 'rgba(184,122,106,0.25)', border: '1px solid rgba(184,122,106,0.4)', text: 'OFF có lương' },
              { swatch: 'rgba(212,165,116,0.15)', border: `2px solid ${LUX.gold}`, text: 'Hôm nay' },
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, background: LUX.surface, padding: '8px 10px', borderRadius: 10, fontSize: 12, color: LUX.ink2 }}>
                <span style={{ width: 16, height: 16, borderRadius: 5, flexShrink: 0, background: item.swatch, border: item.border }} />
                {item.text}
              </div>
            ))}
          </div>
        </div>

        <div style={{ textAlign: 'center', paddingTop: 18, fontSize: 11, color: LUX.ink3, letterSpacing: '0.06em' }}>
          {tongKet.soNgayDiLam} ngày làm việc &middot; Tháng {thang}
        </div>
      </div>
    </div>
  )
}
