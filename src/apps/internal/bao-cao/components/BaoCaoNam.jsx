import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../../../lib/supabase'
import { COLORS } from '../../../../constants/colors'
import { formatCurrency } from '../../../../lib/utils'

function BarChart({ data }) {
  const maxVal = Math.max(...data.map(d => Math.max(d.thu,d.chi)), 1)
  return (
    <div style={{ display:'flex',alignItems:'flex-end',gap:'4px',height:'120px',padding:'0 4px' }}>
      {data.map((d,i) => (
        <div key={i} style={{ flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:'2px',height:'100%' }}>
          <div style={{ flex:1,width:'100%',display:'flex',flexDirection:'column',justifyContent:'flex-end',gap:'2px' }}>
            <div style={{ width:'100%',background:COLORS.thu,borderRadius:'3px 3px 0 0',height:`${(d.thu/maxVal)*90}%`,minHeight:d.thu>0?'3px':'0',transition:'height 0.5s ease' }} />
            <div style={{ width:'100%',background:COLORS.chi,borderRadius:'3px 3px 0 0',height:`${(d.chi/maxVal)*90}%`,minHeight:d.chi>0?'3px':'0',transition:'height 0.5s ease' }} />
          </div>
          <div style={{ fontSize:'9px',color:COLORS.textMute,fontWeight:'600' }}>{d.label}</div>
        </div>
      ))}
    </div>
  )
}

export default function BaoCaoNam({ onBack }) {
  const [year, setYear]           = useState(new Date().getFullYear())
  const [doanhThu, setDoanhThu]   = useState([])
  const [chiPhi,   setChiPhi]     = useState([])
  const [loading,  setLoading]    = useState(false)

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      try {
        const [dt, cp] = await Promise.all([
          supabase.from('doanh_thu').select('ngay,so_tien,hinh_thuc')
            .gte('ngay',`${year}-01-01`).lte('ngay',`${year}-12-31`),
          supabase.from('chi_phi').select('ngay,so_tien')
            .gte('ngay',`${year}-01-01`).lte('ngay',`${year}-12-31`),
        ])
        setDoanhThu(dt.data||[])
        setChiPhi(cp.data||[])
      } catch(e) { console.error(e) }
      finally { setLoading(false) }
    }
    fetchData()
  }, [year])

  const thucThu  = doanhThu.filter(r=>r.hinh_thuc!=='the_tra_truoc').reduce((s,r)=>s+r.so_tien,0)
  const tongChi  = chiPhi.reduce((s,r)=>s+r.so_tien,0)
  const loiNhuan = thucThu - tongChi

  const chartData = useMemo(() => Array.from({length:12},(_,i) => {
    const m = String(i+1).padStart(2,'0')
    const prefix = `${year}-${m}`
    const thu = doanhThu.filter(r=>r.ngay.startsWith(prefix)&&r.hinh_thuc!=='the_tra_truoc').reduce((s,r)=>s+r.so_tien,0)
    const chi = chiPhi.filter(r=>r.ngay.startsWith(prefix)).reduce((s,r)=>s+r.so_tien,0)
    return { label:`T${i+1}`, thu, chi, loiNhuan:thu-chi }
  }),[doanhThu,chiPhi,year])

  return (
    <div style={{ background:'#FAF7F4',minHeight:'100vh',paddingBottom:'100px' }}>

      {/* Header */}
      <div style={{ background:COLORS.grad,padding:'44px 20px 24px' }}>
        <div style={{ display:'flex',alignItems:'center',gap:'12px',marginBottom:'20px' }}>
          <button onClick={onBack} style={{ width:'36px',height:'36px',borderRadius:'50%',background:'rgba(255,255,255,0.2)',border:'1.5px solid rgba(255,255,255,0.3)',color:'white',fontSize:'18px',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center' }}>←</button>
          <div style={{ color:'white',fontWeight:'700',fontSize:'18px' }}>Báo Cáo Năm</div>
        </div>
        <div style={{ background:'rgba(255,255,255,0.15)',borderRadius:'16px',padding:'12px 16px',display:'flex',alignItems:'center',justifyContent:'space-between' }}>
          <button onClick={()=>setYear(y=>y-1)} style={{ background:'none',border:'none',color:'white',fontSize:'22px',cursor:'pointer',padding:'4px 8px' }}>‹</button>
          <span style={{ color:'white',fontWeight:'700',fontSize:'16px' }}>Năm {year}</span>
          <button onClick={()=>setYear(y=>y+1)} style={{ background:'none',border:'none',color:'white',fontSize:'22px',cursor:'pointer',padding:'4px 8px' }}>›</button>
        </div>
      </div>

      <div style={{ padding:'0 16px',marginTop:'-12px' }}>
        {loading ? (
          <div style={{ textAlign:'center',padding:'60px',color:COLORS.textMute }}>
            <div style={{ fontSize:'32px',marginBottom:'8px' }}>📊</div>
            <div style={{ fontSize:'13px' }}>Đang tổng hợp năm {year}...</div>
          </div>
        ) : (
          <>
            {/* Tổng kết năm */}
            <div style={{ background:COLORS.grad,borderRadius:'24px',padding:'20px',marginBottom:'14px',boxShadow:'0 8px 24px rgba(139,94,60,0.2)' }}>
              <div style={{ fontSize:'11px',color:'rgba(255,255,255,0.7)',letterSpacing:'1px',marginBottom:'4px' }}>LỢI NHUẬN NĂM {year}</div>
              <div style={{ fontSize:'34px',fontWeight:'800',color:'white',marginBottom:'16px' }}>{formatCurrency(loiNhuan)}</div>
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

            {/* Biểu đồ 12 tháng */}
            <div style={{ background:COLORS.card,borderRadius:'24px',padding:'20px',marginBottom:'14px',boxShadow:COLORS.shadow,border:`1px solid ${COLORS.border}` }}>
              <div style={{ fontWeight:'800',fontSize:'14px',color:COLORS.text,marginBottom:'16px' }}>Tình Hình Thu Chi {year}</div>
              <BarChart data={chartData} />
              <div style={{ display:'flex',gap:'16px',marginTop:'10px',justifyContent:'center' }}>
                <div style={{ display:'flex',alignItems:'center',gap:'6px' }}>
                  <div style={{ width:'10px',height:'10px',borderRadius:'2px',background:COLORS.thu }} />
                  <span style={{ fontSize:'11px',color:COLORS.textSub }}>Thu</span>
                </div>
                <div style={{ display:'flex',alignItems:'center',gap:'6px' }}>
                  <div style={{ width:'10px',height:'10px',borderRadius:'2px',background:COLORS.chi }} />
                  <span style={{ fontSize:'11px',color:COLORS.textSub }}>Chi</span>
                </div>
              </div>
            </div>

            {/* Bảng 12 tháng */}
            <div style={{ background:COLORS.card,borderRadius:'24px',overflow:'hidden',boxShadow:COLORS.shadow,border:`1px solid ${COLORS.border}` }}>
              <div style={{ padding:'16px 20px',borderBottom:`1px solid ${COLORS.border}` }}>
                <div style={{ fontWeight:'800',fontSize:'14px',color:COLORS.text }}>Chi Tiết Từng Tháng</div>
              </div>
              {chartData.map((d,i) => (
                <div key={i}>
                  <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',padding:'14px 20px' }}>
                    <div style={{ fontWeight:'600',fontSize:'14px',color:COLORS.text }}>Tháng {i+1}</div>
                    <div style={{ textAlign:'right' }}>
                      <div style={{ fontWeight:'700',fontSize:'14px',color:d.thu>0?COLORS.thu:COLORS.textMute }}>{formatCurrency(d.thu)}</div>
                      {d.chi > 0 && <div style={{ fontSize:'11px',color:COLORS.chi,marginTop:'2px' }}>Chi: {formatCurrency(d.chi)}</div>}
                      {(d.thu>0||d.chi>0) && (
                        <div style={{ fontSize:'11px',color:d.loiNhuan>=0?COLORS.thu:COLORS.chi,marginTop:'1px',fontWeight:'600' }}>
                          {d.loiNhuan>=0?'▲':'▼'} {formatCurrency(Math.abs(d.loiNhuan))}
                        </div>
                      )}
                    </div>
                  </div>
                  {i < 11 && <div style={{ height:'1px',background:'linear-gradient(90deg,transparent,rgba(160,113,79,0.1),transparent)',margin:'0 20px' }} />}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}