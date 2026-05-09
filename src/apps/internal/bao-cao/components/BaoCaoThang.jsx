import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../../../lib/supabase'
import { LUX } from '../../../../constants/lux'
import { formatCurrency , getNowVN} from '../../../../lib/utils'
import DatePicker from '../../../../components/shared/DatePicker'

function AreaChart({ data, color }) {
  if (!data || data.length === 0) return null
  const maxVal = Math.max(...data.map(d => d.value), 1)
  const W = 340, H = 100, PAD = 8
  const points = data.map((d, i) => ({
    x: PAD + (i / Math.max(data.length-1,1)) * (W-PAD*2),
    y: H - PAD - (d.value / maxVal) * (H-PAD*2)
  }))
  const linePath = points.map((p,i) => `${i===0?'M':'L'} ${p.x} ${p.y}`).join(' ')
  const areaPath = `${linePath} L ${points[points.length-1].x} ${H} L ${points[0].x} ${H} Z`
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width:'100%',height:'100px' }}>
      <defs>
        <linearGradient id={`grad${color.replace('#','')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35"/>
          <stop offset="100%" stopColor={color} stopOpacity="0.02"/>
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#grad${color.replace('#','')})`} />
      <path d={linePath} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

export default function BaoCaoThang({ onBack }) {
  const [currentDate, setCurrentDate] = useState(getNowVN())
  const [doanhThu, setDoanhThu]       = useState([])
  const [chiPhi,   setChiPhi]         = useState([])
  const [danhMuc,  setDanhMuc]        = useState([])
  const [loading,  setLoading]        = useState(false)
  const [showPicker, setShowPicker]   = useState(false)
  const [expandedDay, setExpandedDay] = useState(null)

  const year  = currentDate.getFullYear()
  const month = currentDate.getMonth() + 1
  const firstDay = `${year}-${String(month).padStart(2,'0')}-01`
  const lastDay  = new Date(year, month, 0).toISOString().split('T')[0]

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      try {
        const [dt, cp, dm] = await Promise.all([
          supabase.from('doanh_thu').select('*').gte('ngay',firstDay).lte('ngay',lastDay),
          supabase.from('chi_phi').select('*').gte('ngay',firstDay).lte('ngay',lastDay),
          supabase.from('danh_muc_chi_phi').select('*'),
        ])
        setDoanhThu(dt.data||[])
        setChiPhi(cp.data||[])
        setDanhMuc(dm.data||[])
      } catch(e) { console.error(e) }
      finally { setLoading(false) }
    }
    fetchData()
  }, [firstDay, lastDay])

  const thucThu  = doanhThu.filter(r=>r.hinh_thuc!=='the_tra_truoc').reduce((s,r)=>s+r.so_tien,0)
  const tongDT   = doanhThu.reduce((s,r)=>s+r.so_tien,0)
  const tongChi  = chiPhi.reduce((s,r)=>s+r.so_tien,0)
  const loiNhuan = thucThu - tongChi

  const daysInMonth = new Date(year, month, 0).getDate()

  const thuChart = useMemo(() => Array.from({length:daysInMonth},(_,i)=>{
    const iso = `${year}-${String(month).padStart(2,'0')}-${String(i+1).padStart(2,'0')}`
    return { label:String(i+1), value: doanhThu.filter(r=>r.ngay===iso&&r.hinh_thuc!=='the_tra_truoc').reduce((s,r)=>s+r.so_tien,0) }
  }),[doanhThu,year,month,daysInMonth])

  const chiChart = useMemo(() => Array.from({length:daysInMonth},(_,i)=>{
    const iso = `${year}-${String(month).padStart(2,'0')}-${String(i+1).padStart(2,'0')}`
    return { label:String(i+1), value: chiPhi.filter(r=>r.ngay===iso).reduce((s,r)=>s+r.so_tien,0) }
  }),[chiPhi,year,month,daysInMonth])

  const chiPhiNhom = useMemo(() => {
    const map = {}
    chiPhi.forEach(cp => {
      const child  = danhMuc.find(d=>d.id===cp.danh_muc_id)
      const parent = child ? danhMuc.find(d=>d.id===child.parent_id) : null
      const key = parent?.ten || 'Khác'
      if (!map[key]) map[key] = { icon:parent?.icon||'🏷️', tong:0 }
      map[key].tong += cp.so_tien
    })
    return Object.entries(map).map(([name,v])=>({name,icon:v.icon,tong:v.tong})).sort((a,b)=>b.tong-a.tong)
  },[chiPhi,danhMuc])

  const prevMonth = () => setCurrentDate(new Date(year,month-2,1))
  const nextMonth = () => setCurrentDate(new Date(year,month,1))

  return (
    <div style={{ background:'#FAF7F4',minHeight:'100vh',paddingBottom:'100px' }}>
      <DatePicker open={showPicker} selectedDate={`${year}-${String(month).padStart(2,'0')}-01`}
        onClose={()=>setShowPicker(false)}
        onConfirm={iso=>{ setCurrentDate(new Date(iso+'T00:00:00')); setShowPicker(false) }} />

      {/* Header */}
      <div style={{ background:LUX.heroGrad,padding:'44px 20px 24px' }}>
        <div style={{ display:'flex',alignItems:'center',gap:'12px',marginBottom:'20px' }}>
          <button onClick={onBack} style={{ width:'36px',height:'36px',borderRadius:'50%',background:'rgba(255,255,255,0.2)',border:'1.5px solid rgba(255,255,255,0.3)',color:'white',fontSize:'18px',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center' }}>←</button>
          <div style={{ color:'white',fontWeight:'700',fontSize:'18px' }}>Báo Cáo Tháng</div>
        </div>
        <div style={{ background:'rgba(255,255,255,0.15)',borderRadius:'16px',padding:'12px 16px',display:'flex',alignItems:'center',justifyContent:'space-between' }}>
          <button onClick={prevMonth} style={{ background:'none',border:'none',color:'white',fontSize:'22px',cursor:'pointer',padding:'4px 8px' }}>‹</button>
          <button onClick={()=>setShowPicker(true)} style={{ background:'none',border:'none',cursor:'pointer',display:'flex',alignItems:'center',gap:'8px' }}>
            <span>📅</span>
            <span style={{ color:'white',fontWeight:'700',fontSize:'14px' }}>Tháng {month}/{year}</span>
          </button>
          <button onClick={nextMonth} style={{ background:'none',border:'none',color:'white',fontSize:'22px',cursor:'pointer',padding:'4px 8px' }}>›</button>
        </div>
      </div>

      <div style={{ padding:'0 16px',marginTop:'-12px' }}>
        {loading ? (
          <div style={{ textAlign:'center',padding:'60px',color:LUX.ink3 }}>
            <div style={{ fontSize:'32px',marginBottom:'8px' }}>📊</div>
            <div style={{ fontSize:'13px' }}>Đang tổng hợp...</div>
          </div>
        ) : (
          <>
            {/* Tổng kết */}
            <div style={{ background:LUX.heroGrad,borderRadius:'24px',padding:'20px',marginBottom:'14px',boxShadow:'0 8px 24px rgba(139,94,60,0.2)' }}>
              <div style={{ fontSize:'11px',color:'rgba(255,255,255,0.7)',letterSpacing:'1px',marginBottom:'4px' }}>LỢI NHUẬN THÁNG {month}/{year}</div>
              <div style={{ fontSize:'32px',fontWeight:'800',color:'white',marginBottom:'16px' }}>{formatCurrency(loiNhuan)}</div>
              <div style={{ display:'flex',justifyContent:'space-between',borderTop:'1px solid rgba(255,255,255,0.2)',paddingTop:'14px' }}>
                <div>
                  <div style={{ fontSize:'10px',color:'rgba(255,255,255,0.6)',marginBottom:'2px' }}>THỰC THU</div>
                  <div style={{ fontWeight:'700',fontSize:'16px',color:'#A3E635' }}>{formatCurrency(thucThu)}</div>
                </div>
                <div style={{ textAlign:'right' }}>
                  <div style={{ fontSize:'10px',color:'rgba(255,255,255,0.6)',marginBottom:'2px' }}>TỔNG CHI</div>
                  <div style={{ fontWeight:'700',fontSize:'16px',color:'#FCA5A5' }}>{formatCurrency(tongChi)}</div>
                </div>
              </div>
            </div>

            {/* Biểu đồ Thu */}
            <div style={{ background:LUX.surface2,borderRadius:'24px',padding:'20px',marginBottom:'14px',boxShadow:LUX.shadowSm,border:`1px solid ${LUX.line}` }}>
              <div style={{ fontWeight:'700',fontSize:'14px',color:'#2D7A4F',marginBottom:'12px' }}>📈 Doanh Thu Theo Ngày</div>
              <AreaChart data={thuChart} color={'#2D7A4F'} />
              <div style={{ display:'flex',justifyContent:'space-between',marginTop:'12px',paddingTop:'12px',borderTop:`1px solid ${LUX.line}` }}>
                <div>
                  <div style={{ fontSize:'11px',color:LUX.ink3 }}>Tổng Doanh Thu</div>
                  <div style={{ fontWeight:'700',color:'#2D7A4F' }}>{formatCurrency(tongDT)}</div>
                </div>
                <div style={{ textAlign:'right' }}>
                  <div style={{ fontSize:'11px',color:LUX.ink3 }}>Thực Thu</div>
                  <div style={{ fontWeight:'700',color:'#2D7A4F' }}>{formatCurrency(thucThu)}</div>
                </div>
              </div>
            </div>

            {/* Biểu đồ Chi */}
            <div style={{ background:LUX.surface2,borderRadius:'24px',padding:'20px',marginBottom:'14px',boxShadow:LUX.shadowSm,border:`1px solid ${LUX.line}` }}>
              <div style={{ fontWeight:'700',fontSize:'14px',color:'#C0392B',marginBottom:'12px' }}>📉 Chi Phí Theo Ngày</div>
              <AreaChart data={chiChart} color={'#C0392B'} />
              <div style={{ display:'flex',justifyContent:'space-between',marginTop:'12px',paddingTop:'12px',borderTop:`1px solid ${LUX.line}` }}>
                <div>
                  <div style={{ fontSize:'11px',color:LUX.ink3 }}>Tổng Chi Phí</div>
                  <div style={{ fontWeight:'700',color:'#C0392B' }}>{formatCurrency(tongChi)}</div>
                </div>
                <div style={{ textAlign:'right' }}>
                  <div style={{ fontSize:'11px',color:LUX.ink3 }}>TB/ngày</div>
                  <div style={{ fontWeight:'700',color:LUX.ink }}>{formatCurrency(Math.round(tongChi/daysInMonth))}</div>
                </div>
              </div>
            </div>

            {/* Phân tích chi phí */}
            {chiPhiNhom.length > 0 && (
              <div style={{ background:LUX.surface2,borderRadius:'24px',padding:'20px',marginBottom:'14px',boxShadow:LUX.shadowSm,border:`1px solid ${LUX.line}` }}>
                <div style={{ fontWeight:'800',fontSize:'14px',color:LUX.ink,marginBottom:'16px' }}>📊 Phân Tích Chi Phí Theo Nhóm</div>
                {chiPhiNhom.map((item,i) => {
                  const pct = tongChi > 0 ? (item.tong/tongChi)*100 : 0
                  return (
                    <div key={i} style={{ marginBottom:i<chiPhiNhom.length-1?'14px':'0' }}>
                      <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'6px' }}>
                        <div style={{ display:'flex',alignItems:'center',gap:'8px' }}>
                          <span style={{ fontSize:'16px' }}>{item.icon}</span>
                          <span style={{ fontWeight:'600',fontSize:'13px',color:LUX.ink }}>{item.name}</span>
                        </div>
                        <span style={{ fontWeight:'700',fontSize:'13px',color:'#C0392B' }}>{formatCurrency(item.tong)}</span>
                      </div>
                      <div style={{ display:'flex',alignItems:'center',gap:'8px' }}>
                        <div style={{ flex:1,height:'6px',background:'#F8F3F0',borderRadius:'3px',overflow:'hidden' }}>
                          <div style={{ width:`${pct}%`,height:'100%',background:LUX.taupe,borderRadius:'3px' }} />
                        </div>
                        <span style={{ fontSize:'10px',color:LUX.ink3,width:'28px',textAlign:'right' }}>{pct.toFixed(0)}%</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* ── Chi Tiết Từng Ngày (click để mở rộng) ── */}
            <div style={{ background:LUX.surface2,borderRadius:'24px',padding:'20px',marginBottom:'14px',boxShadow:LUX.shadowSm,border:`1px solid ${LUX.line}` }}>
              <div style={{ fontWeight:'800',fontSize:'14px',color:LUX.ink,marginBottom:'4px' }}>📋 Chi Tiết Từng Ngày</div>
              <div style={{ fontSize:'11px',color:LUX.ink3,marginBottom:'16px' }}>Bấm vào từng ngày để xem chi tiết doanh thu & chi phí</div>
              {Array.from({length: daysInMonth}, (_, i) => {
                const day = i + 1
                const iso = `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`
                const dtDay = doanhThu.filter(r => r.ngay === iso)
                const cpDay = chiPhi.filter(r => r.ngay === iso)
                const thuDay = dtDay.filter(r => r.hinh_thuc !== 'the_tra_truoc').reduce((s, r) => s + r.so_tien, 0)
                const chiDay = cpDay.reduce((s, r) => s + r.so_tien, 0)
                const lnDay = thuDay - chiDay
                const hasData = dtDay.length > 0 || cpDay.length > 0
                const isExpanded = expandedDay === iso

                return (
                  <div key={iso}>
                    <button
                      onClick={() => setExpandedDay(isExpanded ? null : iso)}
                      style={{
                        display: 'grid', gridTemplateColumns: '40px 1fr 90px 90px 70px',
                        width: '100%', padding: '10px 0', alignItems: 'center',
                        background: isExpanded ? '#FAF7F4' : 'transparent',
                        border: 'none', cursor: 'pointer', textAlign: 'left',
                        borderRadius: isExpanded ? '10px' : '0',
                        margin: isExpanded ? '2px -8px' : '0',
                        paddingLeft: isExpanded ? '8px' : '0',
                        paddingRight: isExpanded ? '8px' : '0',
                      }}
                    >
                      <span style={{ fontWeight: '600', fontSize: '13px', color: hasData ? LUX.ink : LUX.ink3 }}>{day}</span>
                      <span style={{ fontSize: '11px', color: hasData ? LUX.ink : LUX.ink3 }}>
                        {['CN','T2','T3','T4','T5','T6','T7'][new Date(year, month-1, day).getDay()]}
                      </span>
                      <span style={{ fontWeight: '600', fontSize: '12px', color: thuDay > 0 ? '#2D7A4F' : LUX.ink3, textAlign: 'right' }}>
                        {thuDay > 0 ? formatCurrency(thuDay) : '—'}
                      </span>
                      <span style={{ fontWeight: '600', fontSize: '12px', color: chiDay > 0 ? '#C0392B' : LUX.ink3, textAlign: 'right' }}>
                        {chiDay > 0 ? formatCurrency(chiDay) : '—'}
                      </span>
                      <span style={{ fontWeight: '700', fontSize: '12px', color: hasData ? (lnDay >= 0 ? '#2D7A4F' : '#C0392B') : LUX.ink3, textAlign: 'right' }}>
                        {hasData ? formatCurrency(lnDay) : '—'}
                      </span>
                    </button>

                    {/* Expanded detail */}
                    {isExpanded && (
                      <div style={{ padding: '10px 0 14px 20px', borderLeft: '3px solid #A0714F20', marginLeft: '8px' }}>
                        {/* Doanh thu detail */}
                        {dtDay.length > 0 && (
                          <div style={{ marginBottom: '10px' }}>
                            <div style={{ fontSize: '10px', fontWeight: '700', color: '#2D7A4F', marginBottom: '6px', letterSpacing: '0.5px' }}>DOANH THU</div>
                            {['tien_mat','chuyen_khoan','quet_the','the_tra_truoc'].map(ht => {
                              const htTotal = dtDay.filter(r => r.hinh_thuc === ht).reduce((s, r) => s + r.so_tien, 0)
                              if (htTotal === 0) return null
                              const labels = { tien_mat: '💵 Tiền Mặt', chuyen_khoan: '🏦 Chuyển Khoản', quet_the: '💳 Quẹt Thẻ', the_tra_truoc: '🎫 Thẻ TT' }
                              return (
                                <div key={ht} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', padding: '3px 0', color: LUX.ink2 }}>
                                  <span>{labels[ht]}</span>
                                  <span style={{ fontWeight: '600', color: '#2D7A4F' }}>{formatCurrency(htTotal)}</span>
                                </div>
                              )
                            })}
                          </div>
                        )}
                        {/* Chi phi detail */}
                        {cpDay.length > 0 && (
                          <div>
                            <div style={{ fontSize: '10px', fontWeight: '700', color: '#C0392B', marginBottom: '6px', letterSpacing: '0.5px' }}>CHI PHÍ</div>
                            {cpDay.map(cp => {
                              const child = danhMuc.find(d => d.id === cp.danh_muc_id)
                              const parent = child ? danhMuc.find(d => d.id === child.parent_id) : null
                              return (
                                <div key={cp.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', padding: '3px 0', color: LUX.ink2 }}>
                                  <span>{(parent?.icon || '') + ' ' + (child?.ten || cp.dien_giai || 'Chi phí')}</span>
                                  <span style={{ fontWeight: '600', color: '#C0392B' }}>{formatCurrency(cp.so_tien)}</span>
                                </div>
                              )
                            })}
                          </div>
                        )}
                        {dtDay.length === 0 && cpDay.length === 0 && (
                          <div style={{ fontSize: '11px', color: LUX.ink3 }}>Không có giao dịch</div>
                        )}
                      </div>
                    )}

                    {day < daysInMonth && <div style={{ height: '1px', background: 'linear-gradient(90deg,transparent,rgba(160,113,79,0.08),transparent)' }} />}
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}