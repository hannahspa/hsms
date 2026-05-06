import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../../../lib/supabase'
import { LUX } from '../../../../constants/lux'
import { formatCurrency, todayISO , getNowVN} from '../../../../lib/utils'
import DatePicker from '../../../../components/shared/DatePicker'

const DAYS = ['CN','T2','T3','T4','T5','T6','T7']

function formatDateVN(isoStr) {
  const d = new Date(isoStr + 'T00:00:00')
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`
}

function getWeekRange(baseDate) {
  const d = new Date(baseDate)
  const day = d.getDay()
  const diffToMon = day === 0 ? -6 : 1 - day
  const mon = new Date(d)
  mon.setDate(d.getDate() + diffToMon)
  const sun = new Date(mon)
  sun.setDate(mon.getDate() + 6)
  return {
    start: mon.toISOString().split('T')[0],
    end:   sun.toISOString().split('T')[0],
    label: `${formatDateVN(mon.toISOString().split('T')[0])} - ${formatDateVN(sun.toISOString().split('T')[0])}`
  }
}

function BarChart({ data }) {
  const maxVal = Math.max(...data.map(d => Math.max(d.thu, d.chi)), 1)
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', height: '100px', padding: '0 4px' }}>
      {data.map((d, i) => (
        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', height: '100%' }}>
          <div style={{ flex: 1, width: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', gap: '2px' }}>
            <div style={{ width: '100%', background: '#2D7A4F', borderRadius: '4px 4px 0 0', height: `${(d.thu / maxVal) * 80}%`, minHeight: d.thu > 0 ? '4px' : '0' }} />
            <div style={{ width: '100%', background: '#C0392B', borderRadius: '4px 4px 0 0', height: `${(d.chi / maxVal) * 80}%`, minHeight: d.chi > 0 ? '4px' : '0' }} />
          </div>
          <div style={{ fontSize: '10px', color: LUX.ink3, fontWeight: '600' }}>{d.label}</div>
        </div>
      ))}
    </div>
  )
}

export default function BaoCaoTuan({ onBack }) {
  const [baseDate, setBaseDate]     = useState(getNowVN())
  const [doanhThu, setDoanhThu]     = useState([])
  const [chiPhi,   setChiPhi]       = useState([])
  const [loading,  setLoading]      = useState(false)
  const [showPicker, setShowPicker] = useState(false)

  const range = useMemo(() => getWeekRange(baseDate), [baseDate])

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      try {
        const [dt, cp] = await Promise.all([
          supabase.from('doanh_thu').select('ngay,so_tien,hinh_thuc')
            .gte('ngay', range.start).lte('ngay', range.end),
          supabase.from('chi_phi').select('ngay,so_tien')
            .gte('ngay', range.start).lte('ngay', range.end),
        ])
        setDoanhThu(dt.data || [])
        setChiPhi(cp.data || [])
      } catch(e) { console.error(e) }
      finally { setLoading(false) }
    }
    fetchData()
  }, [range])

  const thucThu  = doanhThu.filter(r => r.hinh_thuc !== 'the_tra_truoc').reduce((s,r) => s+r.so_tien, 0)
  const tongChi  = chiPhi.reduce((s,r) => s+r.so_tien, 0)
  const loiNhuan = thucThu - tongChi

  // 7 ngày trong tuần
  const chartData = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(range.start + 'T00:00:00')
      d.setDate(d.getDate() + i)
      const iso = d.toISOString().split('T')[0]
      const thu = doanhThu.filter(r => r.ngay === iso && r.hinh_thuc !== 'the_tra_truoc').reduce((s,r) => s+r.so_tien, 0)
      const chi = chiPhi.filter(r => r.ngay === iso).reduce((s,r) => s+r.so_tien, 0)
      return { label: DAYS[d.getDay()], thu, chi, iso }
    })
  }, [doanhThu, chiPhi, range])

  const prevWeek = () => { const d = new Date(baseDate); d.setDate(d.getDate()-7); setBaseDate(d) }
  const nextWeek = () => { const d = new Date(baseDate); d.setDate(d.getDate()+7); setBaseDate(d) }

  return (
    <div style={{ background: '#FAF7F4', minHeight: '100vh', paddingBottom: '100px' }}>
      <DatePicker open={showPicker} selectedDate={todayISO()}
        onClose={() => setShowPicker(false)}
        onConfirm={iso => { setBaseDate(new Date(iso+'T00:00:00')); setShowPicker(false) }} />

      {/* Header */}
      <div style={{ background: LUX.heroGrad, padding: '44px 20px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
          <button onClick={onBack} style={{ width:'36px',height:'36px',borderRadius:'50%',background:'rgba(255,255,255,0.2)',border:'1.5px solid rgba(255,255,255,0.3)',color:'white',fontSize:'18px',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center' }}>←</button>
          <div style={{ color:'white',fontWeight:'700',fontSize:'18px' }}>Báo Cáo Tuần</div>
        </div>
        <div style={{ background:'rgba(255,255,255,0.15)',borderRadius:'16px',padding:'12px 16px',display:'flex',alignItems:'center',justifyContent:'space-between' }}>
          <button onClick={prevWeek} style={{ background:'none',border:'none',color:'white',fontSize:'22px',cursor:'pointer',padding:'4px 8px' }}>‹</button>
          <button onClick={() => setShowPicker(true)} style={{ background:'none',border:'none',cursor:'pointer',display:'flex',alignItems:'center',gap:'8px' }}>
            <span style={{ fontSize:'14px' }}>📅</span>
            <span style={{ color:'white',fontWeight:'700',fontSize:'13px' }}>{range.label}</span>
          </button>
          <button onClick={nextWeek} style={{ background:'none',border:'none',color:'white',fontSize:'22px',cursor:'pointer',padding:'4px 8px' }}>›</button>
        </div>
      </div>

      <div style={{ padding:'0 16px', marginTop:'-12px' }}>
        {loading ? (
          <div style={{ textAlign:'center',padding:'60px',color:LUX.ink3 }}>
            <div style={{ fontSize:'32px',marginBottom:'8px' }}>📊</div>
            <div style={{ fontSize:'13px' }}>Đang tải...</div>
          </div>
        ) : (
          <>
            {/* Tổng kết tuần */}
            <div style={{ background:LUX.surface2,borderRadius:'24px',padding:'20px',marginBottom:'14px',boxShadow:LUX.shadowSm,border:`1px solid ${LUX.line}` }}>
              <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'12px',marginBottom:'20px' }}>
                {[
                  { label:'THỰC THU',  value:thucThu,  color:'#2D7A4F' },
                  { label:'TỔNG CHI',  value:tongChi,  color:'#C0392B' },
                  { label:'LỢI NHUẬN',value:loiNhuan, color:loiNhuan>=0?'#2D7A4F':'#C0392B' },
                ].map(item => (
                  <div key={item.label} style={{ textAlign:'center' }}>
                    <div style={{ fontSize:'9px',letterSpacing:'1px',color:LUX.ink3,marginBottom:'4px',fontWeight:'600' }}>{item.label}</div>
                    <div style={{ fontSize:'13px',fontWeight:'800',color:item.color }}>{formatCurrency(item.value)}</div>
                  </div>
                ))}
              </div>
              <BarChart data={chartData} />
              <div style={{ display:'flex',gap:'16px',marginTop:'10px',justifyContent:'center' }}>
                <div style={{ display:'flex',alignItems:'center',gap:'6px' }}>
                  <div style={{ width:'10px',height:'10px',borderRadius:'2px',background:'#2D7A4F' }} />
                  <span style={{ fontSize:'11px',color:LUX.ink2 }}>Thu</span>
                </div>
                <div style={{ display:'flex',alignItems:'center',gap:'6px' }}>
                  <div style={{ width:'10px',height:'10px',borderRadius:'2px',background:'#C0392B' }} />
                  <span style={{ fontSize:'11px',color:LUX.ink2 }}>Chi</span>
                </div>
              </div>
            </div>

            {/* Chi tiết từng ngày */}
            <div style={{ background:LUX.surface2,borderRadius:'24px',overflow:'hidden',boxShadow:LUX.shadowSm,border:`1px solid ${LUX.line}` }}>
              <div style={{ padding:'16px 20px',borderBottom:`1px solid ${LUX.line}` }}>
                <div style={{ fontWeight:'800',fontSize:'14px',color:LUX.ink }}>Chi Tiết Từng Ngày</div>
              </div>
              {chartData.map((d, i) => (
                <div key={d.iso}>
                  <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',padding:'14px 20px' }}>
                    <div>
                      <div style={{ fontWeight:'600',fontSize:'14px',color:LUX.ink }}>{d.label} — {formatDateVN(d.iso)}</div>
                      {d.chi > 0 && <div style={{ fontSize:'11px',color:LUX.ink3,marginTop:'2px' }}>Chi: {formatCurrency(d.chi)}</div>}
                    </div>
                    <div style={{ textAlign:'right' }}>
                      <div style={{ fontWeight:'700',fontSize:'14px',color:d.thu>0?'#2D7A4F':LUX.ink3 }}>{formatCurrency(d.thu)}</div>
                      {d.thu > 0 && d.chi > 0 && (
                        <div style={{ fontSize:'11px',color:d.thu-d.chi>=0?'#2D7A4F':'#C0392B',marginTop:'2px' }}>
                          {d.thu-d.chi>=0?'+':''}{formatCurrency(d.thu-d.chi)}
                        </div>
                      )}
                    </div>
                  </div>
                  {i < chartData.length-1 && <div style={{ height:'1px',background:'linear-gradient(90deg,transparent,rgba(160,113,79,0.1),transparent)',margin:'0 20px' }} />}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}