import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../../lib/supabase'
import { COLORS } from '../../../constants/colors'
import { formatCurrency, formatCurrencyHide, todayISO } from '../../../lib/utils'

export default function TaiKhoanPage({ user }) {
  const [viList,      setViList]      = useState([])
  const [history,     setHistory]     = useState([])
  const [selectedVi,  setSelectedVi]  = useState(null)
  const [loading,     setLoading]     = useState(true)
  const [showDatePicker, setShowDatePicker] = useState(false)

  const today          = todayISO()
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
      ? history.filter(h => h.mo_ta?.includes(selectedVi.id) || h.dien_giai?.includes(selectedVi.ten))
      : history
    return base.filter(item => item.ngay >= startDate && item.ngay <= endDate)
  }, [history, selectedVi, startDate, endDate])

  const stats = useMemo(() => ({
    thu: filteredHistory
      .filter(h => h.loai === 'thu' && h.mo_ta !== 'the_tra_truoc')
      .reduce((s, h) => s + h.so_tien, 0),
    chi: filteredHistory
      .filter(h => h.loai === 'chi')
      .reduce((s, h) => s + h.so_tien, 0),
  }), [filteredHistory])

  const applyQuickDate = (type) => {
    const d = new Date()
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

  const loaiLabel = (mo_ta) => {
    const map = {
      'tien_mat':      '💵 Tiền Mặt',
      'chuyen_khoan':  '🏦 Chuyển Khoản',
      'quet_the':      '💳 Quẹt Thẻ',
      'the_tra_truoc': '🎫 Thẻ Trả Trước',
    }
    return map[mo_ta] || mo_ta || 'Giao dịch'
  }

  // ── DatePicker Modal ──────────────────────────────────
  if (showDatePicker) return (
    <div style={{ position:'fixed',inset:0,backgroundColor:'rgba(0,0,0,0.5)',display:'flex',alignItems:'flex-end',zIndex:999 }}
      onClick={() => setShowDatePicker(false)}>
      <div style={{ background:COLORS.bg,borderRadius:'24px 24px 0 0',width:'100%',maxWidth:'420px',margin:'0 auto',padding:'24px 20px 40px',animation:'slideUp 0.2s ease' }}
        onClick={e => e.stopPropagation()}>
        <style>{`@keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}`}</style>

        <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'20px' }}>
          <h3 style={{ fontSize:'18px',fontWeight:'800',color:COLORS.text }}>Chọn thời gian</h3>
          <button onClick={() => setShowDatePicker(false)} style={{ background:'none',border:'none',fontSize:'20px',color:COLORS.textMute,cursor:'pointer' }}>✕</button>
        </div>

        <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px',marginBottom:'24px' }}>
          {[
            { label:'Hôm nay',     type:'hom_nay'     },
            { label:'Hôm qua',     type:'hom_qua'     },
            { label:'Tháng này',   type:'thang_nay'   },
            { label:'Tháng trước', type:'thang_truoc' },
          ].map(item => (
            <button key={item.type} onClick={() => applyQuickDate(item.type)} style={{ padding:'12px',borderRadius:'12px',border:`1px solid ${COLORS.border}`,background:COLORS.card,fontWeight:'600',color:COLORS.text,cursor:'pointer' }}>
              {item.label}
            </button>
          ))}
        </div>

        <div style={{ fontSize:'12px',fontWeight:'700',color:COLORS.textMute,textTransform:'uppercase',marginBottom:'12px' }}>Hoặc tùy chọn</div>
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

        <button onClick={() => setShowDatePicker(false)} style={{ width:'100%',padding:'16px',borderRadius:'16px',background:COLORS.grad,color:'white',fontWeight:'800',border:'none',fontSize:'15px',cursor:'pointer' }}>
          Áp dụng
        </button>
      </div>
    </div>
  )

  // ── Chi tiết ví ──────────────────────────────────────
  if (selectedVi) return (
    <div style={{ padding:'24px 16px',background:'#FAF7F4',minHeight:'100vh',paddingBottom:'100px',animation:'fadeIn 0.3s ease' }}>
      <style>{`@keyframes fadeIn{from{opacity:0;transform:translateX(10px)}to{opacity:1;transform:translateX(0)}}`}</style>

      <button onClick={() => setSelectedVi(null)} style={{ background:'none',border:'none',color:COLORS.primary,fontWeight:'800',fontSize:'15px',marginBottom:'16px',display:'flex',alignItems:'center',gap:'5px',cursor:'pointer' }}>
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
      <button onClick={() => setShowDatePicker(true)} style={{ width:'100%',display:'flex',justifyContent:'space-between',alignItems:'center',padding:'16px 20px',background:COLORS.card,borderRadius:'20px',border:`1px solid ${COLORS.border}`,marginBottom:'16px',boxShadow:COLORS.shadow,cursor:'pointer' }}>
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
          { label:'Tổng Thu', value:stats.thu, color:COLORS.thu },
          { label:'Tổng Chi', value:stats.chi, color:COLORS.chi },
        ].map(item => (
          <div key={item.label} style={{ flex:1,background:COLORS.card,padding:'16px',borderRadius:'20px',textAlign:'center',border:`1px solid ${COLORS.border}`,boxShadow:COLORS.shadow }}>
            <div style={{ fontSize:'10px',color:COLORS.textMute,textTransform:'uppercase',letterSpacing:'1px',marginBottom:'6px',fontWeight:'700' }}>{item.label}</div>
            <div style={{ color:item.color,fontWeight:'800',fontSize:'16px' }}>{formatCurrency(item.value)}</div>
          </div>
        ))}
      </div>

      {/* Danh sách giao dịch */}
      <div style={{ background:COLORS.card,borderRadius:'24px',padding:'20px',border:`1px solid ${COLORS.border}`,boxShadow:COLORS.shadow }}>
        <div style={{ fontWeight:'800',fontSize:'15px',color:COLORS.text,marginBottom:'16px' }}>Chi tiết giao dịch</div>
        {filteredHistory.length === 0 ? (
          <div style={{ textAlign:'center',padding:'30px 0',color:COLORS.textMute,fontSize:'13px' }}>
            Không có giao dịch trong khoảng thời gian này
          </div>
        ) : (
          filteredHistory.map((item, i) => (
            <div key={item.id || i} style={{ display:'flex',justifyContent:'space-between',alignItems:'center',padding:'14px 0',borderBottom:i<filteredHistory.length-1?`1px solid ${COLORS.border}`:'none' }}>
              <div style={{ display:'flex',alignItems:'center',gap:'12px' }}>
                <div style={{ width:'40px',height:'40px',borderRadius:'12px',background:item.loai==='thu'?'#F0FDF4':item.loai==='chi'?'#FEF2F2':'#F5F3FF',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'16px' }}>
                  {item.loai === 'thu' ? '💰' : item.loai === 'chi' ? '💸' : '🔄'}
                </div>
                <div>
                  <div style={{ fontWeight:'700',fontSize:'13px',color:COLORS.text }}>
                    {loaiLabel(item.mo_ta)}
                  </div>
                  <div style={{ fontSize:'11px',color:COLORS.textMute,marginTop:'2px' }}>
                    {fmt(item.ngay)} {item.dien_giai ? `• ${item.dien_giai}` : ''}
                  </div>
                </div>
              </div>
              <div style={{ fontWeight:'800',fontSize:'14px',color:item.loai==='thu'?COLORS.thu:item.loai==='chi'?COLORS.chi:COLORS.chuyenKhoan,textAlign:'right' }}>
                {item.loai === 'chi' ? '-' : item.loai === 'thu' ? '+' : ''}
                {formatCurrency(item.so_tien)}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )

  // ── Danh sách ví ─────────────────────────────────────
  if (loading) return (
    <div style={{ padding:'60px',textAlign:'center',color:COLORS.textMute,fontSize:'14px' }}>
      ✨ Đang tải dữ liệu tài khoản...
    </div>
  )

  return (
    <div style={{ padding:'24px 16px',background:'#FAF7F4',minHeight:'100vh',animation:'fadeIn 0.3s ease' }}>
      <style>{`@keyframes fadeIn{from{opacity:0}to{opacity:1}}`}</style>
      <h2 style={{ fontSize:'24px',fontWeight:'800',color:COLORS.text,marginBottom:'24px' }}>Tài Khoản</h2>

      <div style={{ display:'grid',gap:'16px',paddingBottom:'100px' }}>
        {viList.map(vi => (
          <button key={vi.id} onClick={() => setSelectedVi(vi)} style={{ width:'100%',padding:'24px 20px',background:COLORS.card,borderRadius:'24px',border:`1px solid ${COLORS.border}`,display:'flex',justifyContent:'space-between',alignItems:'center',cursor:'pointer',boxShadow:'0 10px 30px rgba(139,94,60,0.06)' }}>
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