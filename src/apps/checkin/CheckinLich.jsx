import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../lib/supabase'
import { COLORS } from '../../constants/colors'

const CA_VAO_CHUAN = { h: 9,  m: 15 }
const CA_RA_CHUAN  = { h: 20, m: 0  }

function toPhut(timeStr) {
  const [h, m] = (timeStr || '0:0').split(':').map(Number)
  return h * 60 + m
}

const LOAI_CONFIG = {
  di_lam:   { bg:'#F5EDE6', color:'#7D5A3C', icon:'✅' },
  off_phep: { bg:'#FDF6EE', color:'#A0714F', icon:'🌸' },
  off_ov:   { bg:'#FEF2F2', color:'#C0392B', icon:'🚫' },
  off_t7:   { bg:'#FAF0E6', color:'#8B6914', icon:'🌙' },
  off_t7x:  { bg:'#FEE2E2', color:'#991B1B', icon:'❌' },
}

export default function CheckinLich({ nhanVien, onBack }) {
  const now = new Date()
  const [thang,        setThang]        = useState(now.getMonth() + 1)
  const [nam,          setNam]          = useState(now.getFullYear())
  const [chamCongData, setChamCongData] = useState([])
  const [offData,      setOffData]      = useState([])
  const [loading,      setLoading]      = useState(false)

  useEffect(() => { fetchData() }, [thang, nam])

  const fetchData = async () => {
    setLoading(true)
    const startDate = `${nam}-${String(thang).padStart(2,'0')}-01`
    const lastDay   = new Date(nam, thang, 0).getDate()
    const endDate   = `${nam}-${String(thang).padStart(2,'0')}-${String(lastDay).padStart(2,'0')}`

    const [ccRes, offRes] = await Promise.all([
      supabase.from('cham_cong').select('*')
        .eq('nhan_vien_id', nhanVien.id)
        .gte('ngay', startDate).lte('ngay', endDate).order('ngay'),
      supabase.from('dang_ky_off').select('*')
        .eq('nhan_vien_id', nhanVien.id)
        .gte('ngay_off', startDate).lte('ngay_off', endDate)
        .in('trang_thai', ['cho_duyet', 'duoc_duyet'])
    ])

    setChamCongData(ccRes.data || [])
    setOffData(offRes.data || [])
    setLoading(false)
  }

  const daysInMonth    = new Date(nam, thang, 0).getDate()
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
      if (!chamCongMap[day]) {
        map[day] = { ...r, source: 'dang_ky_off', loai: r.loai_off }
      }
    })
    return map
  }, [offData, chamCongMap])

  const tongKet = useMemo(() => {
    // Bắt đầu từ tổng số ngày trong tháng
    const soNgayThang = daysInMonth
    let ngayKhongLuong = 0
    let tangCa  = 0
    let offPhep = 0
    let offOV   = 0
    let offT7   = 0
    let viPham  = 0

    // Từ cham_cong — tính tăng ca và vi phạm
    chamCongData.forEach(r => {
      if (r.loai === 'di_lam') {
        tangCa += r.tang_ca_gio || 0
        // Nếu he_so < 1 → phần thiếu tính vào không lương
        if (r.gio_ra) {
          ngayKhongLuong += (1 - (r.he_so ?? 1))
        }
      } else if (r.loai === 'off_ov')  { offOV++;   ngayKhongLuong += 1 }
      else if (r.loai === 'off_t7x')  { viPham++;  ngayKhongLuong += 2 }
      else if (r.loai === 'off_t7')   { offT7++;   ngayKhongLuong += 2 }
      else if (r.loai === 'off_phep') { offPhep++ }
    })

    // Từ dang_ky_off
    offData.forEach(r => {
      const day = parseInt(r.ngay_off.split('-')[2])
      if (!chamCongMap[day]) {
        if (r.loai_off === 'off_phep')      { offPhep++ }
        else if (r.loai_off === 'off_ov')   { offOV++;  ngayKhongLuong += 1 }
        else if (r.loai_off === 'off_t7')   { offT7++;  ngayKhongLuong += 2 }
        else if (r.loai_off === 'off_t7x')  { viPham++; ngayKhongLuong += 2 }
      }
    })

    // Ngày công = Tổng ngày tháng - Ngày không lương
    const ngayCong = Math.max(0, soNgayThang - ngayKhongLuong)

    return { ngayCong, tangCa, offPhep, offOV, offT7, viPham, soNgayThang }
  }, [chamCongData, offData, chamCongMap, daysInMonth])

  const getDayStyle = (day) => {
    const cc        = chamCongMap[day] || offMap[day]
    const date      = new Date(nam, thang - 1, day)
    const isWeekend = date.getDay() === 0 || date.getDay() === 6
    const isFuture  = date > now

    if (isFuture) return {
      bg: 'transparent', color: COLORS.textMute,
      label: '', subLabel: '', border: `1px solid ${COLORS.border}`,
      textColor: COLORS.textMute
    }

    if (!cc) return {
      bg:        isWeekend ? '#F8F3F0' : '#FEF2F2',
      color:     isWeekend ? COLORS.textMute : '#991B1B',
      label:     isWeekend ? '' : '❓',
      subLabel:  '',
      border:    `1px solid ${isWeekend ? COLORS.border : '#FECACA'}`,
      textColor: isWeekend ? COLORS.textMute : '#991B1B'
    }

    // OFF từ dang_ky_off
    if (cc.source === 'dang_ky_off') {
      const cfg = LOAI_CONFIG[cc.loai_off] || LOAI_CONFIG.off_phep
      const isPending = cc.trang_thai === 'cho_duyet'
      return {
        bg: isPending ? '#FFF9F0' : cfg.bg,
        color: isPending ? '#8B6914' : cfg.color,
        label: isPending ? '⏳' : cfg.icon,
        subLabel: isPending ? 'Chờ' : '',
        border: `1px solid ${isPending ? '#FDE68A' : 'transparent'}`,
        textColor: isPending ? '#8B6914' : cfg.color
      }
    }

    // OFF từ cham_cong
    if (cc.loai !== 'di_lam') {
      const cfg = LOAI_CONFIG[cc.loai] || LOAI_CONFIG.off_ov
      return {
        bg: cfg.bg, color: cfg.color, label: cfg.icon,
        subLabel: '', border: '1px solid transparent', textColor: cfg.color
      }
    }

    // Chưa checkout
    if (cc.gio_vao && !cc.gio_ra) {
      return {
        bg: '#FFF9F0', color: '#8B6914', border: '1px solid #FDE68A',
        label: '🕐', subLabel: 'làm', textColor: '#8B6914'
      }
    }

    // Đã checkout
    const heSo  = cc.he_so ?? 0
    const pct   = Math.round(heSo * 100)
    const vaoPhut   = cc.gio_vao ? toPhut(cc.gio_vao.slice(0,5)) : 0
    const chuanVao  = CA_VAO_CHUAN.h * 60 + CA_VAO_CHUAN.m
    const treLate   = Math.max(0, vaoPhut - chuanVao)
    const raPhut    = cc.gio_ra ? toPhut(cc.gio_ra.slice(0,5)) : 0
    const chuanRa   = CA_RA_CHUAN.h * 60 + CA_RA_CHUAN.m
    const veSomPhut = Math.max(0, chuanRa - raPhut)

    let bg, color, border, label, subLabel

    if (pct === 0) {
      bg = '#FEF2F2'; color = '#C0392B'; border = '1px solid #FECACA'
      label = '⚠️'; subLabel = '0%'
    } else if (pct >= 100 && treLate === 0 && veSomPhut === 0) {
      bg = '#F5EDE6'; color = '#7D5A3C'; border = '1px solid #C4956A'
      label = '✅'; subLabel = ''
    } else if (pct >= 100) {
      bg = '#FDF6EE'; color = '#A0714F'; border = '1px solid #C9A96E'
      label = '✅'
      subLabel = treLate > 0 ? `+${treLate}p` : `-${veSomPhut}p`
    } else if (pct >= 75) {
      bg = '#FDF6EE'; color = '#A0714F'; border = '1px solid #C9A96E'
      label = `${pct}%`
      subLabel = treLate > 0 ? `+${treLate}p` : veSomPhut > 0 ? `-${veSomPhut}p` : ''
    } else if (pct >= 50) {
      bg = '#FEF9F0'; color = '#8B5E3C'; border = '1px solid #E8C4A0'
      label = `${pct}%`
      subLabel = treLate > 0 ? `+${treLate}p` : veSomPhut > 0 ? `-${veSomPhut}p` : ''
    } else {
      bg = '#FEF2F2'; color = '#C0392B'; border = '1px solid #FECACA'
      label = `${pct}%`; subLabel = '⚠️'
    }

    if (cc.trang_thai_tang_ca === 'cho_duyet') {
      subLabel = '⏳TC'
    } else if (cc.tang_ca_gio > 0) {
      subLabel = `+${cc.tang_ca_gio}h`
    }

    return { bg, color, border, label, subLabel, textColor: color }
  }

  const prevMonth = () => {
    if (thang === 1) { setThang(12); setNam(n => n - 1) }
    else setThang(t => t - 1)
  }
  const nextMonth = () => {
    if (thang === 12) { setThang(1); setNam(n => n + 1) }
    else setThang(t => t + 1)
  }

  return (
    <div style={{ minHeight:'100vh', background:'#FAF7F4', paddingBottom:'40px' }}>

      <div style={{ background:COLORS.grad, padding:'48px 20px 28px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'12px', marginBottom:'20px' }}>
          <button onClick={onBack}
            style={{ width:'36px', height:'36px', borderRadius:'50%', background:'rgba(255,255,255,0.2)', border:'none', color:'white', fontSize:'18px', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>←</button>
          <div style={{ color:'white', fontWeight:'700', fontSize:'18px' }}>Lịch Công Tháng</div>
        </div>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', background:'rgba(255,255,255,0.15)', borderRadius:'14px', padding:'10px 16px' }}>
          <button onClick={prevMonth} style={{ background:'none', border:'none', color:'white', fontSize:'22px', cursor:'pointer', padding:'4px 8px' }}>‹</button>
          <span style={{ color:'white', fontWeight:'800', fontSize:'16px' }}>Tháng {thang}/{nam}</span>
          <button onClick={nextMonth} style={{ background:'none', border:'none', color:'white', fontSize:'22px', cursor:'pointer', padding:'4px 8px' }}>›</button>
        </div>
      </div>

      <div style={{ padding:'16px' }}>

        {/* Hàng 1: Ngày Công | Tăng Ca | Vi Phạm */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'8px', marginBottom:'8px' }}>
          {[
            { label:'Ngày Công', value: tongKet.ngayCong.toFixed(1), color:'#7D5A3C', bg:'#F5EDE6', icon:'📅' },
            { label:'Tăng Ca',   value: `${tongKet.tangCa}h`,        color:'#A0714F', bg:'#FDF6EE', icon:'⏰' },
            { label:'Vi Phạm',   value: tongKet.viPham, color: tongKet.viPham > 0 ? '#C0392B' : COLORS.textMute, bg: tongKet.viPham > 0 ? '#FEF2F2' : '#FAF7F4', icon:'⚠️' },
          ].map(item => (
            <div key={item.label} style={{ background:item.bg, borderRadius:'16px', padding:'12px', textAlign:'center', border:`1px solid ${COLORS.border}` }}>
              <div style={{ fontSize:'16px', marginBottom:'2px' }}>{item.icon}</div>
              <div style={{ fontSize:'18px', fontWeight:'800', color:item.color }}>{item.value}</div>
              <div style={{ fontSize:'10px', color:COLORS.textMute, marginTop:'2px', fontWeight:'600' }}>{item.label}</div>
            </div>
          ))}
        </div>

        {/* Hàng 2: OFF Có Lương | OFF Không Lương | OFF T7/CN */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'8px', marginBottom:'16px' }}>
          {[
            { label:'OFF Có Lương',    value: tongKet.offPhep, color:'#A0714F', bg:'#FDF6EE', icon:'🌸' },
            { label:'OFF Không Lương', value: tongKet.offOV,   color:'#C0392B', bg:'#FEF2F2', icon:'🚫' },
            { label:'OFF T7/CN (x2)',  value: tongKet.offT7,   color:'#8B6914', bg:'#FFF8ED', icon:'🌙' },
          ].map(item => (
            <div key={item.label} style={{ background:item.bg, borderRadius:'16px', padding:'12px', textAlign:'center', border:`1px solid ${COLORS.border}` }}>
              <div style={{ fontSize:'16px', marginBottom:'2px' }}>{item.icon}</div>
              <div style={{ fontSize:'18px', fontWeight:'800', color:item.color }}>{item.value}</div>
              <div style={{ fontSize:'9px', color:COLORS.textMute, marginTop:'2px', fontWeight:'600', lineHeight:'1.2' }}>{item.label}</div>
            </div>
          ))}
        </div>

        {/* Lịch */}
        <div style={{ background:COLORS.card, borderRadius:'24px', padding:'16px', border:`1px solid ${COLORS.border}`, boxShadow:COLORS.shadow, marginBottom:'12px' }}>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:'3px', marginBottom:'6px' }}>
            {['CN','T2','T3','T4','T5','T6','T7'].map(d => (
              <div key={d} style={{ textAlign:'center', fontSize:'10px', fontWeight:'700', color:d==='CN'||d==='T7'?COLORS.chi:COLORS.textMute, padding:'4px 0' }}>
                {d}
              </div>
            ))}
          </div>

          {loading ? (
            <div style={{ textAlign:'center', padding:'40px', color:COLORS.textMute }}>Đang tải...</div>
          ) : (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:'3px' }}>
              {Array.from({ length: firstDayOfWeek }).map((_, i) => <div key={`e-${i}`} />)}
              {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                const style = getDayStyle(day)
                return (
                  <div key={day} style={{
                    borderRadius:'10px', padding:'3px 2px', textAlign:'center',
                    background: style.bg, border: style.border,
                    minHeight:'52px', display:'flex', flexDirection:'column',
                    alignItems:'center', justifyContent:'center', gap:'1px'
                  }}>
                    <div style={{ fontSize:'10px', fontWeight:'600', color:style.textColor, opacity:0.65 }}>{day}</div>
                    <div style={{ fontSize:'12px', lineHeight:'1.1' }}>{style.label}</div>
                    {style.subLabel ? (
                      <div style={{ fontSize:'7px', fontWeight:'700', color:style.color, opacity:0.85, lineHeight:'1' }}>{style.subLabel}</div>
                    ) : null}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Chú thích */}
        <div style={{ background:COLORS.card, borderRadius:'20px', padding:'16px', border:`1px solid ${COLORS.border}`, boxShadow:COLORS.shadow }}>
          <div style={{ fontSize:'11px', fontWeight:'700', color:COLORS.textMute, marginBottom:'12px', textTransform:'uppercase' }}>Chú thích</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px' }}>
            {[
              { icon:'✅', bg:'#F5EDE6', color:'#7D5A3C', text:'Đúng giờ 100%' },
              { icon:'⚠️', bg:'#FDF6EE', color:'#A0714F', text:'Trễ / về sớm' },
              { icon:'🌸', bg:'#FDF6EE', color:'#A0714F', text:'OFF Có Lương' },
              { icon:'🚫', bg:'#FEF2F2', color:'#C0392B', text:'OFF Không Lương' },
              { icon:'🌙', bg:'#FFF8ED', color:'#8B6914', text:'OFF T7/CN (x2)' },
              { icon:'⏳', bg:'#FFF8ED', color:'#8B6914', text:'Chờ duyệt' },
              { icon:'🕐', bg:'#FDF6EE', color:'#A0714F', text:'Đang làm việc' },
              { icon:'❓', bg:'#FEF2F2', color:'#C0392B', text:'Chưa có data' },
            ].map((item, i) => (
              <div key={i} style={{ display:'flex', alignItems:'center', gap:'8px', padding:'6px 10px', background:item.bg, borderRadius:'12px' }}>
                <span style={{ fontSize:'16px' }}>{item.icon}</span>
                <span style={{ fontSize:'11px', color:item.color, fontWeight:'600' }}>{item.text}</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}