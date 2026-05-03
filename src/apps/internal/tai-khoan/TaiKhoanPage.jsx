import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../../lib/supabase'
import { COLORS } from '../../../constants/colors'
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

  // Filter lịch sử theo ví được chọn — dùng vi_id thay vì UUID string trong mo_ta
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

  // Nếu đang xem chi tiết 1 giao dịch
  if (selectedGD) return (
    <ChiTietGiaoDich
      giaoDich={selectedGD}
      user={user}
      viList={viList}
      onBack={() => setSelectedGD(null)}
      onUpdated={() => {
        setSelectedGD(null)
        // Reload history
        supabase.from('lich_su_giao_dich_tong_hop').select('*').order('ngay', { ascending: false })
          .then(r => setHistory(r.data || []))
      }}
    />
  )

  // DatePicker Modal
  if (showDatePicker) return (
    <div style={{ position:'fixed',inset:0,backgroundColor:'rgba(0,0,0,0.5)',display:'flex',alignItems:'flex-end',zIndex:999 }}
      onClick={() => setShowDatePicker(false)}>
      <div style={{ background:COLORS.bg,borderRadius:'24px 24px 0 0',width:'100%',maxWidth:'420px',margin:'0 auto',padding:'24px 20px 40px' }}
        onClick={e => e.stopPropagation()}>
        <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'20px' }}>
          <h3 style={{ fontSize:'18px',fontWeight:'800',color:COLORS.text }}>Chọn thời gian</h3>
          <button onClick={() => setShowDatePicker(false)} style={{ background:'none',border:'none',fontSize:'20px',color:COLORS.textMute,cursor:'pointer' }}>✕</button>
        </div>
        <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px',marginBottom:'24px' }}>
          {[
            { label:'Hôm nay',    type:'hom_nay'     },
            { label:'Hôm qua',    type:'hom_qua'     },
            { label:'Tháng này',  type:'thang_nay'   },
            { label:'Tháng trước',type:'thang_truoc' },
          ].map(item => (
            <button key={item.type} onClick={() => applyQuickDate(item.type)}
              style={{ padding:'12px',borderRadius:'12px',border:`1px solid ${COLORS.border}`,background:COLORS.card,fontWeight:'600',color:COLORS.text,cursor:'pointer' }}>
              {item.label}
            </button>
          ))}
        </div>
        <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px',marginBottom:'20px' }}>
          <div style={{ background:COLORS.card,borderRadius:'12px',padding:'12px',border:`1px solid ${COLORS.border}` }}>
            <div style={{ fontSize:'10px',color:COLORS.textMute,marginBottom:'4px' }}>Từ ngày</div>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
              style={{ width:'100%',border:'none',outline:'none',background:'transparent',fontWeight:'700',color:COLORS.text }} />
          </div>
          <div style={{ background:COLORS.card,borderRadius:'12px',padding:'12px',border:`1px solid ${COLORS.border}` }}>
            <div style={{ fontSize:'10px',color:COLORS.textMute,marginBottom:'4px' }}>Đến ngày</div>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
              style={{ width:'100%',border:'none',outline:'none',background:'transparent',fontWeight:'700',color:COLORS.text }} />
          </div>
        </div>
        <button onClick={() => setShowDatePicker(false)}
          style={{ width:'100%',padding:'16px',borderRadius:'16px',background:COLORS.grad,color:'white',fontWeight:'800',border:'none',fontSize:'15px',cursor:'pointer' }}>
          Áp dụng
        </button>
      </div>
    </div>
  )

  // Chi tiết ví
  if (selectedVi) return (
    <div style={{ padding:'24px 16px',background:'#FAF7F4',minHeight:'100vh',paddingBottom:'100px' }}>
      <button onClick={() => setSelectedVi(null)}
        style={{ background:'none',border:'none',color:COLORS.primary,fontWeight:'800',fontSize:'15px',marginBottom:'16px',display:'flex',alignItems:'center',gap:'5px',cursor:'pointer' }}>
        <span style={{ fontSize:'20px' }}>‹</span> Quay lại
      </button>

      {/* Card ví */}
      <div style={{ background:COLORS.grad,borderRadius:'24px',padding:'24px',color:'white',marginBottom:'20px',boxShadow:'0 10px 30px rgba(139,94,60,0.2)',position:'relative',overflow:'hidden' }}>
        <div style={{ position:'absolute',right:'-20px',top:'-20px',fontSize:'120px',opacity:'0.08' }}>{selectedVi.icon}</div>
        <h2 style={{ fontSize:'22px',fontWeight:'800',marginBottom:'16px',position:'relative' }}>{selectedVi.ten}</h2>
        <div style={{ fontSize:'12px',opacity:0.8,textTransform:'uppercase',letterSpacing:'1px',marginBottom:'4px' }}>Số dư hiện tại</div>
        <div style={{ fontSize:'38px',fontWeight:'800',letterSpacing:'-1px' }}>
          {isAdmin ? formatCurrency(selectedVi.so_du_hien_tai) : formatCurrencyHide()}
        </div>
      </div>

      {/* Bộ lọc thời gian */}
      <button onClick={() => setShowDatePicker(true)}
        style={{ width:'100%',display:'flex',justifyContent:'space-between',alignItems:'center',padding:'16px 20px',background:COLORS.card,borderRadius:'20px',border:`1px solid ${COLORS.border}`,marginBottom:'16px',boxShadow:COLORS.shadow,cursor:'pointer' }}>
        <div style={{ display:'flex',alignItems:'center',gap:'10px' }}>
          <span style={{ fontSize:'18px' }}>📅</span>
          <div style={{ textAlign:'left' }}>
            <div style={{ fontSize:'11px',color:COLORS.textMute,fontWeight:'600' }}>Thời gian hiển thị</div>
            <div style={{ fontWeight:'700',color:COLORS.text,fontSize:'14px' }}>{fmt(startDate)} — {fmt(endDate)}</div>
          </div>
        </div>
        <span style={{ color:COLORS.primary,fontSize:'20px' }}>›</span>
      </button>

      {/* Stats */}
      <div style={{ display:'flex',gap:'12px',marginBottom:'16px' }}>
        {[
          { label:'TỔNG THU', value:stats.thu, color:COLORS.thu },
          { label:'TỔNG CHI', value:stats.chi, color:COLORS.chi },
        ].map(item => (
          <div key={item.label} style={{ flex:1,background:COLORS.card,padding:'16px',borderRadius:'20px',textAlign:'center',border:`1px solid ${COLORS.border}`,boxShadow:COLORS.shadow }}>
            <div style={{ fontSize:'10px',color:COLORS.textMute,textTransform:'uppercase',letterSpacing:'1px',marginBottom:'6px',fontWeight:'700' }}>{item.label}</div>
            <div style={{ color:item.color,fontWeight:'800',fontSize:'16px' }}>{formatCurrency(item.value)}</div>
          </div>
        ))}
      </div>

      {/* Danh sách giao dịch — click được */}
      <div style={{ background:COLORS.card,borderRadius:'24px',padding:'20px',border:`1px solid ${COLORS.border}`,boxShadow:COLORS.shadow }}>
        <div style={{ fontWeight:'800',fontSize:'15px',color:COLORS.text,marginBottom:'16px' }}>Chi tiết giao dịch</div>
        {filteredHistory.length === 0 ? (
          <div style={{ textAlign:'center',padding:'30px 0',color:COLORS.textMute,fontSize:'13px' }}>
            Không có giao dịch trong khoảng thời gian này
          </div>
        ) : (
          filteredHistory.map((item, i) => (
            <button key={item.id || i}
              onClick={() => setSelectedGD(item)}
              style={{ display:'flex',justifyContent:'space-between',alignItems:'center',padding:'14px 0',borderBottom:i<filteredHistory.length-1?`1px solid ${COLORS.border}`:'none',width:'100%',background:'none',border:'none',cursor:'pointer',textAlign:'left' }}>
              <div style={{ display:'flex',alignItems:'center',gap:'12px' }}>
                <div style={{ width:'40px',height:'40px',borderRadius:'12px',background:item.loai==='thu'?'#F0FDF4':item.loai==='chi'?'#FEF2F2':'#F5F3FF',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'16px',flexShrink:0 }}>
                  {getGDIcon(item)}
                </div>
                <div>
                  <div style={{ fontWeight:'700',fontSize:'13px',color:COLORS.text }}>{getGDLabel(item)}</div>
                  <div style={{ fontSize:'11px',color:COLORS.textMute,marginTop:'2px' }}>
                    {fmt(item.ngay)}{item.dien_giai ? ` • ${item.dien_giai}` : ''}
                  </div>
                </div>
              </div>
              <div style={{ display:'flex',alignItems:'center',gap:'8px' }}>
                <div style={{ fontWeight:'800',fontSize:'14px',color:item.loai==='thu'?COLORS.thu:item.loai==='chi'?COLORS.chi:COLORS.chuyenKhoan,textAlign:'right' }}>
                  {item.loai==='chi'?'-':item.loai==='thu'?'+':''}{formatCurrency(item.so_tien)}
                </div>
                <span style={{ color:COLORS.textMute,fontSize:'14px' }}>›</span>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  )

  if (loading) return (
    <div style={{ padding:'60px',textAlign:'center',color:COLORS.textMute,fontSize:'14px' }}>
      ✨ Đang tải dữ liệu tài khoản...
    </div>
  )

  return (
    <div style={{ padding:'24px 16px',background:'#FAF7F4',minHeight:'100vh' }}>
      <h2 style={{ fontSize:'24px',fontWeight:'800',color:COLORS.text,marginBottom:'24px' }}>Tài Khoản</h2>
      <div style={{ display:'grid',gap:'16px',paddingBottom:'100px' }}>
        {viList.map(vi => (
          <button key={vi.id} onClick={() => setSelectedVi(vi)}
            style={{ width:'100%',padding:'24px 20px',background:COLORS.card,borderRadius:'24px',border:`1px solid ${COLORS.border}`,display:'flex',justifyContent:'space-between',alignItems:'center',cursor:'pointer',boxShadow:'0 10px 30px rgba(139,94,60,0.06)' }}>
            <div style={{ display:'flex',alignItems:'center',gap:'16px' }}>
              <div style={{ width:'56px',height:'56px',borderRadius:'16px',background:'linear-gradient(135deg,#FFF,#F5EDE6)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'28px',boxShadow:'0 4px 12px rgba(0,0,0,0.04)' }}>
                {vi.icon}
              </div>
              <div style={{ textAlign:'left' }}>
                <div style={{ fontWeight:'800',fontSize:'16px',color:COLORS.text }}>{vi.ten}</div>
                <div style={{ fontSize:'12px',color:COLORS.textMute,marginTop:'4px' }}>Xem chi tiết giao dịch</div>
              </div>
            </div>
            <div style={{ textAlign:'right' }}>
              <div style={{ fontWeight:'800',fontSize:'16px',color:isAdmin?COLORS.primary:COLORS.textMute }}>
                {isAdmin ? formatCurrency(vi.so_du_hien_tai) : formatCurrencyHide()}
              </div>
              <div style={{ fontSize:'20px',color:COLORS.primary,marginTop:'2px' }}>›</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}