import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../../lib/supabase'
import { LUX } from '../../../constants/lux'
import { formatCurrency, formatCurrencyHide, todayISO , getNowVN} from '../../../lib/utils'
import ChiTietGiaoDich from './ChiTietGiaoDich'

export default function TaiKhoanPage({ user }) {
  const [viList,         setViList]         = useState([])
  const [history,        setHistory]        = useState([])
  const [selectedVi,     setSelectedVi]     = useState(null)
  const [selectedGD,     setSelectedGD]     = useState(null)
  const [loading,        setLoading]        = useState(true)
  const [showDatePicker, setShowDatePicker] = useState(false)

  const today           = todayISO()
  const firstDayOfMonth = today.slice(0, 8) + '01'
  const [startDate, setStartDate] = useState(firstDayOfMonth)
  const [endDate,   setEndDate]   = useState(today)

  const isAdmin = user?.vai_tro === 'admin'

  useEffect(() => {
    async function loadData() {
      try {
        const [viRes, histRes] = await Promise.all([
          supabase.from('so_du_vi_thuc_te').select('*').order('thu_tu'),
          supabase.from('lich_su_giao_dich_tong_hop').select('*').order('ngay', { ascending: false })
        ])
        setViList(viRes.data || [])
        setHistory(histRes.data || [])
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  const filteredHistory = useMemo(() => {
    let base = selectedVi
      ? history.filter(h => h.vi_id === selectedVi.id || h.vi_den_id === selectedVi.id)
      : history
    return base.filter(item => item.ngay >= startDate && item.ngay <= endDate)
  }, [history, selectedVi, startDate, endDate])

  const stats = useMemo(() => ({
    thu: filteredHistory.filter(h => h.loai === 'thu').reduce((s, h) => s + h.so_tien, 0),
    chi: filteredHistory.filter(h => h.loai === 'chi').reduce((s, h) => s + h.so_tien, 0),
  }), [filteredHistory])

  const applyQuickDate = (type) => {
    const d = getNowVN()
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
    const iso = d.toISOString().split('T')[0]
    if (type === 'hom_nay') {
      setStartDate(iso); setEndDate(iso)
    } else if (type === 'hom_qua') {
      const y = new Date(d); y.setDate(y.getDate() - 1)
      const isoY = y.toISOString().split('T')[0]
      setStartDate(isoY); setEndDate(isoY)
    } else if (type === 'thang_nay') {
      setStartDate(iso.slice(0, 8) + '01'); setEndDate(iso)
    } else if (type === 'thang_truoc') {
      const lm = new Date(d.getFullYear(), d.getMonth() - 1, 1)
      const ld = new Date(d.getFullYear(), d.getMonth(), 0)
      lm.setMinutes(lm.getMinutes() - lm.getTimezoneOffset())
      ld.setMinutes(ld.getMinutes() - ld.getTimezoneOffset())
      setStartDate(lm.toISOString().split('T')[0])
      setEndDate(ld.toISOString().split('T')[0])
    }
    setShowDatePicker(false)
  }

  const fmt = (iso) => {
    if (!iso) return ''
    const [y, m, d] = iso.split('-')
    return `${d}/${m}/${y}`
  }

  const getGDLabel = (item) => {
    if (item.loai === 'chuyen_khoan') return `${item.ten_vi_tu || '?'} → ${item.ten_vi_den || '?'}`
    const map = {
      'tien_mat':      '💵 Tiền Mặt',
      'chuyen_khoan':  '🏦 Chuyển Khoản',
      'quet_the':      '💳 Quẹt Thẻ',
      'the_tra_truoc': '🎫 Thẻ Trả Trước',
    }
    return map[item.hinh_thuc] || item.mo_ta || 'Giao dịch'
  }

  const getGDIcon = (item) => {
    if (item.loai === 'chuyen_khoan') return '🔄'
    if (item.loai === 'thu') return '💰'
    return '💸'
  }

  // ── Chi tiết giao dịch ──
  if (selectedGD) return (
    <ChiTietGiaoDich
      giaoDich={selectedGD}
      user={user}
      viList={viList}
      onBack={() => setSelectedGD(null)}
      onUpdated={() => {
        setSelectedGD(null)
        supabase.from('lich_su_giao_dich_tong_hop').select('*').order('ngay', { ascending: false })
          .then(r => setHistory(r.data || []))
      }}
    />
  )

  // ── DatePicker modal ──
  if (showDatePicker) return (
    <div style={{ position:'fixed',inset:0,backgroundColor:'rgba(42,32,26,0.5)',display:'flex',alignItems:'flex-end',zIndex:999 }}
      onClick={() => setShowDatePicker(false)}>
      <div style={{ background:LUX.surface,borderRadius:'24px 24px 0 0',width:'100%',maxWidth:'520px',margin:'0 auto',padding:'24px 20px 40px' }}
        onClick={e => e.stopPropagation()}>
        <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'20px' }}>
          <h3 style={{ fontSize:'18px',fontWeight:'700',color:LUX.ink,fontFamily:LUX.fontSerif }}>Chọn thời gian</h3>
          <button onClick={() => setShowDatePicker(false)} style={{ background:'none',border:'none',fontSize:'20px',color:LUX.ink3,cursor:'pointer' }}>✕</button>
        </div>
        <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px',marginBottom:'24px' }}>
          {[
            { label:'Hôm nay',    type:'hom_nay'     },
            { label:'Hôm qua',    type:'hom_qua'     },
            { label:'Tháng này',  type:'thang_nay'   },
            { label:'Tháng trước',type:'thang_truoc' },
          ].map(item => (
            <button key={item.type} onClick={() => applyQuickDate(item.type)}
              style={{ padding:'12px',borderRadius:LUX.radiusSm,border:`1px solid ${LUX.line}`,background:LUX.surface2,fontWeight:'600',color:LUX.ink,cursor:'pointer',fontFamily:LUX.fontSans }}>
              {item.label}
            </button>
          ))}
        </div>
        <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px',marginBottom:'20px' }}>
          <div style={{ background:LUX.surface2,borderRadius:LUX.radiusSm,padding:'12px',border:`1px solid ${LUX.line}` }}>
            <div style={{ fontSize:'10px',color:LUX.ink3,marginBottom:'4px',fontFamily:LUX.fontSans }}>Từ ngày</div>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
              style={{ width:'100%',border:'none',outline:'none',background:'transparent',fontWeight:'700',color:LUX.ink,fontFamily:LUX.fontSans }} />
          </div>
          <div style={{ background:LUX.surface2,borderRadius:LUX.radiusSm,padding:'12px',border:`1px solid ${LUX.line}` }}>
            <div style={{ fontSize:'10px',color:LUX.ink3,marginBottom:'4px',fontFamily:LUX.fontSans }}>Đến ngày</div>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
              style={{ width:'100%',border:'none',outline:'none',background:'transparent',fontWeight:'700',color:LUX.ink,fontFamily:LUX.fontSans }} />
          </div>
        </div>
        <button onClick={() => setShowDatePicker(false)}
          style={{ width:'100%',padding:'16px',borderRadius:LUX.radius,background:LUX.heroGrad,color:'white',fontWeight:'700',border:'none',fontSize:'15px',cursor:'pointer',fontFamily:LUX.fontSans }}>
          Áp dụng
        </button>
      </div>
    </div>
  )

  // ── Chi tiết ví ──
  if (selectedVi) return (
    <div style={{ padding:'24px 16px',background:LUX.bg,minHeight:'100vh',paddingBottom:'100px' }}>
      <button onClick={() => setSelectedVi(null)}
        style={{ background:'none',border:'none',color:LUX.taupe,fontWeight:'600',fontSize:'15px',marginBottom:'16px',display:'flex',alignItems:'center',gap:'5px',cursor:'pointer',fontFamily:LUX.fontSans }}>
        <span style={{ fontSize:'20px' }}>‹</span> Quay lại
      </button>

      {/* Wallet card */}
      <div style={{ background:LUX.heroGrad,borderRadius:LUX.radiusLg,padding:'24px',color:'white',marginBottom:'20px',boxShadow:LUX.shadow,position:'relative',overflow:'hidden' }}>
        <div style={{ position:'absolute',right:'-20px',top:'-20px',fontSize:'120px',opacity:'0.08' }}>{selectedVi.icon}</div>
        <h2 style={{ fontSize:'22px',fontWeight:'700',marginBottom:'16px',position:'relative',fontFamily:LUX.fontSerif }}>{selectedVi.ten}</h2>
        <div style={{ fontSize:'12px',opacity:0.8,textTransform:'uppercase',letterSpacing:'1px',marginBottom:'4px',fontFamily:LUX.fontSans }}>Số dư hiện tại</div>
        <div style={{ fontSize:'38px',fontWeight:'700',letterSpacing:'-1px',fontFamily:LUX.fontMono }}>
          {isAdmin ? formatCurrency(selectedVi.so_du_hien_tai) : formatCurrencyHide()}
        </div>
      </div>

      {/* Date filter */}
      <button onClick={() => setShowDatePicker(true)}
        style={{ width:'100%',display:'flex',justifyContent:'space-between',alignItems:'center',padding:'16px 20px',background:LUX.surface2,borderRadius:LUX.radius,border:`1px solid ${LUX.line}`,marginBottom:'16px',boxShadow:LUX.shadowSm,cursor:'pointer' }}>
        <div style={{ display:'flex',alignItems:'center',gap:'10px' }}>
          <span style={{ fontSize:'18px' }}>📅</span>
          <div style={{ textAlign:'left' }}>
            <div style={{ fontSize:'11px',color:LUX.ink3,fontWeight:'600',fontFamily:LUX.fontSans }}>Thời gian hiển thị</div>
            <div style={{ fontWeight:'700',color:LUX.ink,fontSize:'14px',fontFamily:LUX.fontSans }}>{fmt(startDate)} — {fmt(endDate)}</div>
          </div>
        </div>
        <span style={{ color:LUX.taupe,fontSize:'20px' }}>›</span>
      </button>

      {/* Stats */}
      <div style={{ display:'flex',gap:'12px',marginBottom:'16px' }}>
        {[
          { label:'TỔNG THU', value:stats.thu, color:'#2D7A4F' },
          { label:'TỔNG CHI', value:stats.chi, color:'#C0392B' },
        ].map(item => (
          <div key={item.label} style={{ flex:1,background:LUX.surface2,padding:'16px',borderRadius:LUX.radius,textAlign:'center',border:`1px solid ${LUX.line}`,boxShadow:LUX.shadowSm }}>
            <div style={{ fontSize:'10px',color:LUX.ink3,textTransform:'uppercase',letterSpacing:'1px',marginBottom:'6px',fontWeight:'600',fontFamily:LUX.fontSans }}>{item.label}</div>
            <div style={{ color:item.color,fontWeight:'700',fontSize:'16px',fontFamily:LUX.fontMono }}>{isAdmin ? formatCurrency(item.value) : formatCurrencyHide()}</div>
          </div>
        ))}
      </div>

      {/* Transaction list */}
      <div style={{ background:LUX.surface2,borderRadius:LUX.radiusLg,padding:'20px',border:`1px solid ${LUX.line}`,boxShadow:LUX.shadowSm }}>
        <div style={{ fontWeight:'700',fontSize:'15px',color:LUX.ink,marginBottom:'16px',fontFamily:LUX.fontSerif }}>Chi tiết giao dịch</div>
        {filteredHistory.length === 0 ? (
          <div style={{ textAlign:'center',padding:'30px 0',color:LUX.ink3,fontSize:'13px',fontFamily:LUX.fontSans }}>
            Không có giao dịch trong khoảng thời gian này
          </div>
        ) : (
          filteredHistory.map((item, i) => (
            <button key={item.id || i}
              onClick={() => setSelectedGD(item)}
              style={{ display:'flex',justifyContent:'space-between',alignItems:'center',padding:'14px 0',borderBottom:i<filteredHistory.length-1?`1px solid ${LUX.line}`:'none',width:'100%',background:'none',border:'none',cursor:'pointer',textAlign:'left' }}>
              <div style={{ display:'flex',alignItems:'center',gap:'12px' }}>
                <div style={{ width:'40px',height:'40px',borderRadius:LUX.radiusSm,background:item.loai==='thu'?'#F0FDF4':item.loai==='chi'?'#FEF2F2':'#F5F3FF',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'16px',flexShrink:0 }}>
                  {getGDIcon(item)}
                </div>
                <div>
                  <div style={{ fontWeight:'600',fontSize:'13px',color:LUX.ink,fontFamily:LUX.fontSans }}>{getGDLabel(item)}</div>
                  <div style={{ fontSize:'11px',color:LUX.ink3,marginTop:'2px',fontFamily:LUX.fontSans }}>
                    {fmt(item.ngay)}{item.dien_giai ? ` • ${item.dien_giai}` : ''}
                  </div>
                </div>
              </div>
              <div style={{ display:'flex',alignItems:'center',gap:'8px' }}>
                <div style={{ fontWeight:'700',fontSize:'14px',color:item.loai==='thu'?'#2D7A4F':item.loai==='chi'?'#C0392B':'#6C3483',textAlign:'right',fontFamily:LUX.fontMono }}>
                  {item.loai==='chi'?'-':item.loai==='thu'?'+':''}{formatCurrency(item.so_tien)}
                </div>
                <span style={{ color:LUX.ink3,fontSize:'14px' }}>›</span>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  )

  if (loading) return (
    <div style={{ padding:'60px',textAlign:'center',color:LUX.ink3,fontSize:'14px',fontFamily:LUX.fontSans }}>
      ✨ Đang tải dữ liệu tài khoản...
    </div>
  )

  // ── Main list ──
  return (
    <div style={{ padding:'24px 16px',background:LUX.bg,minHeight:'100vh' }}>
      <h2 style={{ fontSize:'24px',fontWeight:'700',color:LUX.ink,marginBottom:'24px',fontFamily:LUX.fontSerif }}>Tài Khoản</h2>
      <div className="hsms-stagger" style={{ display:'grid',gap:'16px',paddingBottom:'100px' }}>
        {viList.map(vi => (
          <button key={vi.id} onClick={() => setSelectedVi(vi)}
            style={{ width:'100%',padding:'24px 20px',background:LUX.surface2,borderRadius:LUX.radiusLg,border:`1px solid ${LUX.line}`,display:'flex',justifyContent:'space-between',alignItems:'center',cursor:'pointer',boxShadow:LUX.shadowSm,transition:'all 0.2s ease' }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = LUX.shadow }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = LUX.shadowSm }}
          >
            <div style={{ display:'flex',alignItems:'center',gap:'16px' }}>
              <div style={{ width:'56px',height:'56px',borderRadius:'16px',background:`linear-gradient(135deg,${LUX.surface},${LUX.line})`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'28px',boxShadow:'0 4px 12px rgba(0,0,0,0.04)' }}>
                {vi.icon}
              </div>
              <div style={{ textAlign:'left' }}>
                <div style={{ fontWeight:'700',fontSize:'16px',color:LUX.ink,fontFamily:LUX.fontSerif }}>{vi.ten}</div>
                <div style={{ fontSize:'12px',color:LUX.ink3,marginTop:'4px',fontFamily:LUX.fontSans }}>Xem chi tiết giao dịch</div>
              </div>
            </div>
            <div style={{ textAlign:'right' }}>
              <div style={{ fontWeight:'700',fontSize:'16px',color:isAdmin?LUX.taupe:LUX.ink3,fontFamily:LUX.fontMono }}>
                {isAdmin ? formatCurrency(vi.so_du_hien_tai) : formatCurrencyHide()}
              </div>
              <div style={{ fontSize:'20px',color:LUX.taupe,marginTop:'2px' }}>›</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
