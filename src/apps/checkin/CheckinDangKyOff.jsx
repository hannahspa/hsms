import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { COLORS } from '../../constants/colors'
import { todayISO , getNowVN} from '../../lib/utils'

const LOAI_OFF = [
  { value:'off_phep',       label:'OFF Phép',               desc:'≤3 ngày/tháng, không T7/CN',    color:'#DBEAFE', batKhaKhang: false },
  { value:'off_ov',         label:'OFF Không Lương',         desc:'Vượt 3 ngày hoặc ngày thường',  color:'#FEE2E2', batKhaKhang: false },
  { value:'off_t7',         label:'OFF T7/CN Có Lý Do',      desc:'Tính x2 ngày công',             color:'#F3E8FF', batKhaKhang: false },
  { value:'off_t7x',        label:'OFF T7/CN Không Phép',    desc:'Phạt T7: -300k, CN: -500k',     color:'#FEE2E2', batKhaKhang: false },

]

const GIOI_HAN_OFF = { le_tan: 1, ktv: 2, tap_vu: 1 }
const THANG_VN = ['','Tháng 1','Tháng 2','Tháng 3','Tháng 4','Tháng 5','Tháng 6','Tháng 7','Tháng 8','Tháng 9','Tháng 10','Tháng 11','Tháng 12']
const THU_VN   = ['CN','T2','T3','T4','T5','T6','T7']

export default function CheckinDangKyOff({ nhanVien, onBack }) {
  const now = getNowVN()
  const [calThang, setCalThang] = useState(now.getMonth() + 1)
  const [calNam,   setCalNam]   = useState(now.getFullYear())
  const [ngayOff,  setNgayOff]  = useState('')
  const [loaiOff,  setLoaiOff]  = useState('off_phep')
  const [lyDo,     setLyDo]     = useState('')
  const [loading,  setLoading]  = useState(false)
  const [toast,    setToast]    = useState(null)
  const [danhSach, setDanhSach] = useState([])
  const [offMap,   setOffMap]   = useState({}) // {date: [{ho_ten, trang_thai}]}
  const [nvMap,    setNvMap]    = useState({}) // {id: ho_ten}
  const[showInfo, setShowInfo] = useState(null) // ngày đang xem info
  const[soNgayDaOff, setSoNgayDaOff] = useState(0) // Số ngày OFF phép đã dùng trong tháng

  useEffect(() => { loadDanhSach() },[])
  useEffect(() => { loadOffCungBoPhan() }, [calThang, calNam])

  const loadDanhSach = async () => {
    const { data } = await supabase
      .from('dang_ky_off')
      .select('*')
      .eq('nhan_vien_id', nhanVien.id)
      .order('ngay_off', { ascending: false })
      .limit(15)
    setDanhSach(data || [])
  }

  const loadOffCungBoPhan = async () => {
    const startDate = `${calNam}-${String(calThang).padStart(2,'0')}-01`
    const lastDay   = new Date(calNam, calThang, 0).getDate()
    const endDate   = `${calNam}-${String(calThang).padStart(2,'0')}-${String(lastDay).padStart(2,'0')}`

    // Lấy tất cả NV cùng bộ phận
    const { data: nvList } = await supabase
      .from('nhan_vien')
      .select('id, ho_ten')
      .eq('vi_tri', nhanVien.vi_tri)
      .eq('trang_thai', 'dang_lam')

    if (!nvList) return

    // Lưu map id → tên (chỉ lấy tên cuối)
    const map = {}
    nvList.forEach(nv => {
      const parts = nv.ho_ten.trim().split(' ')
      map[nv.id] = parts.length >= 2
        ? parts[parts.length - 2] + ' ' + parts[parts.length - 1]
        : parts[parts.length - 1]
    })
    setNvMap(map)

    const ids = nvList.map(nv => nv.id)

    const { data: offData } = await supabase
      .from('dang_ky_off')
      .select('ngay_off, nhan_vien_id, trang_thai, loai_off')
      .in('nhan_vien_id', ids)
      .gte('ngay_off', startDate)
      .lte('ngay_off', endDate)
      .in('trang_thai',['cho_duyet', 'duoc_duyet'])

    // Tính số ngày OFF phép của user trong tháng
    const myOffCount = (offData ||[]).filter(r => r.nhan_vien_id === nhanVien.id && r.loai_off === 'off_phep').length
    setSoNgayDaOff(myOffCount)

    // Group theo ngày
    const grouped = {}
    ;(offData || []).forEach(r => {
      if (!grouped[r.ngay_off]) grouped[r.ngay_off] = []
      grouped[r.ngay_off].push({ id: r.nhan_vien_id, trang_thai: r.trang_thai })
    })
    setOffMap(grouped)
  }

  const gioiHan = GIOI_HAN_OFF[nhanVien.vi_tri] || 1

  const getNgayInfo = (iso) => {
    const list = offMap[iso] || []
    // Không tính chính mình
    const others = list.filter(r => r.id !== nhanVien.id)
    const myOff  = list.find(r => r.id === nhanVien.id)
    const isFull = others.length >= gioiHan
    const names  = others.map(r => nvMap[r.id] || '?')
    return { others, myOff, isFull, names, total: others.length }
  }

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  const handleSubmit = async () => {
    if (!ngayOff)     { showToast('Vui lòng chọn ngày OFF', 'error'); return }
    if (!lyDo.trim()) { showToast('Vui lòng nhập lý do', 'error'); return }

    const info = getNgayInfo(ngayOff)
    const isFullDay = info.isFull && info.myOff === undefined

    // Nếu đủ người nhưng lý do dài > 20 ký tự → bất khả kháng, vẫn cho gửi
    const batKhaKhang = isFullDay && lyDo.trim().length > 20
    if (isFullDay && !batKhaKhang) {
      showToast('❌ Đủ người OFF! Nhập lý do chi tiết hơn 20 ký tự để gửi yêu cầu đặc biệt.', 'error')
      return
    }

    // Bắt buộc loại OFF T7/CN nếu rơi vào cuối tuần
    const[y, m, d_val] = ngayOff.split('-')
    const dateObj = new Date(y, m - 1, d_val)
    const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6
    if (isWeekend && loaiOff === 'off_phep') {
      showToast('❌ T7/CN không được dùng OFF Phép. Vui lòng chọn loại OFF T7/CN.', 'error')
      return
    }

    setLoading(true)
    try {
      const { error } = await supabase.from('dang_ky_off').insert({
        nhan_vien_id: nhanVien.id,
        ngay_off:     ngayOff,
        loai_off:     loaiOff,
        ly_do:        lyDo,
        trang_thai:   'cho_duyet',
      })
      if (error) throw error
      showToast('✅ Đã gửi đơn — chờ Cao Quốc Nam duyệt!')
      setNgayOff('')
      setLyDo('')
      loadDanhSach()
      loadOffCungBoPhan()
    } catch (e) {
      showToast('Lỗi: ' + e.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  const fmt = (iso) => {
    if (!iso) return ''
    const [y, m, d] = iso.split('-')
    return `${d}/${m}/${y}`
  }

  const getTrangThaiStyle = (tt) => {
    if (tt === 'duoc_duyet') return { color:'#166534', bg:'#DCFCE7', label:'✅ Đã duyệt' }
    if (tt === 'tu_choi')    return { color:'#991B1B', bg:'#FEE2E2', label:'❌ Từ chối' }
    return { color:'#8B6914', bg:'#FEF9E7', label:'⏳ Chờ duyệt' }
  }

  const daysInMonth    = new Date(calNam, calThang, 0).getDate()
  const firstDayOfWeek = new Date(calNam, calThang - 1, 1).getDay()
  const today          = todayISO()

  const prevMonth = () => {
    if (calThang === 1) { setCalThang(12); setCalNam(n => n-1) }
    else setCalThang(t => t-1)
  }
  const nextMonth = () => {
    if (calThang === 12) { setCalThang(1); setCalNam(n => n+1) }
    else setCalThang(t => t+1)
  }

  const getDayISO = (day) =>
    `${calNam}-${String(calThang).padStart(2,'0')}-${String(day).padStart(2,'0')}`

  return (
    <div style={{ minHeight:'100vh', background:'#FAF7F4', paddingBottom:'40px' }}>

      {/* Toast */}
      {toast && (
        <div style={{ position:'fixed', top:'20px', left:'50%', transform:'translateX(-50%)', zIndex:9999, background:toast.type==='error'?COLORS.chi:'#2D7A4F', color:'white', padding:'12px 24px', borderRadius:'12px', fontWeight:'700', fontSize:'13px', boxShadow:'0 4px 20px rgba(0,0,0,0.2)', whiteSpace:'nowrap' }}>
          {toast.msg}
        </div>
      )}

      {/* Popup info ngày */}
      {showInfo && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'flex-end', zIndex:998 }}
          onClick={() => setShowInfo(null)}>
          <div style={{ background:COLORS.bg, borderRadius:'24px 24px 0 0', width:'100%', maxWidth:'420px', margin:'0 auto', padding:'24px 20px 40px' }}
            onClick={e => e.stopPropagation()}>
            {(() => {
              const info = getNgayInfo(showInfo)
              const[y, m, d_val] = showInfo.split('-')
              const isWeekendPopup = new Date(y, m-1, d_val).getDay() === 0 || new Date(y, m-1, d_val).getDay() === 6

              return (
                <>
                  <div style={{ fontWeight:'800', fontSize:'16px', color:COLORS.text, marginBottom:'4px' }}>
                    📅 {fmt(showInfo)} {isWeekendPopup && <span style={{color: '#C0392B', fontSize: '13px', marginLeft: '6px'}}>(Cuối tuần)</span>}
                  </div>
                  <div style={{ fontSize:'12px', color:COLORS.textMute, marginBottom:'16px' }}>
                    {nhanVien.vi_tri === 'le_tan' ? 'Lễ Tân' : 'KTV'} — Giới hạn: {gioiHan} người/ngày
                  </div>

                  {isWeekendPopup && (
                    <div style={{ background:'#FEF2F2', border:'1px dashed #FECACA', borderRadius:'12px', padding:'12px', textAlign:'center', color:'#C0392B', fontWeight:'700', marginBottom:'16px', fontSize:'13px', lineHeight:'1.4' }}>
                      ⚠️ Lưu ý: Đây là ngày T7/CN.<br/>Nếu bạn OFF sẽ bị trừ x2 ngày công!
                    </div>
                  )}

                  {info.others.length === 0 ? (
                    <div style={{ background:'#F0FDF4', borderRadius:'12px', padding:'12px', textAlign:'center', color:'#166534', fontWeight:'700', marginBottom:'16px' }}>
                      ✅ Chưa có ai đăng ký OFF ngày này
                    </div>
                  ) : (
                    <div style={{ marginBottom:'16px' }}>
                      <div style={{ fontSize:'12px', color:COLORS.textMute, fontWeight:'600', marginBottom:'8px' }}>
                        Đã có {info.others.length}/{gioiHan} người đăng ký:
                      </div>
                      {info.others.map((r, i) => (
                        <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 12px', background:COLORS.card, borderRadius:'10px', marginBottom:'6px', border:`1px solid ${COLORS.border}` }}>
                          <span style={{ fontWeight:'700', color:COLORS.text }}>
                            {r.id === nhanVien.id ? '👤 Bạn' : `👤 ${nvMap[r.id] || '?'}`}
                          </span>
                          <span style={{ fontSize:'11px', color: r.trang_thai === 'duoc_duyet' ? '#166534' : '#8B6914', fontWeight:'600' }}>
                            {r.trang_thai === 'duoc_duyet' ? '✅ Đã duyệt' : '⏳ Chờ duyệt'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {info.isFull ? (
                    <>
                      <div style={{ background:'#FEE2E2', borderRadius:'12px', padding:'12px', textAlign:'center', color:'#991B1B', fontWeight:'700', marginBottom:'12px' }}>
                        🔒 Đã đủ {gioiHan}/{gioiHan} người — không thể đăng ký thông thường
                      </div>
                      <button onClick={() => {
                        setNgayOff(showInfo)
                        const [y, m, d_val] = showInfo.split('-')
                        const isWe = new Date(y, m-1, d_val).getDay() === 0 || new Date(y, m-1, d_val).getDay() === 6
                        const limit = nhanVien.gioi_han_off_thang || 3
                        setLoaiOff(isWe ? 'off_t7' : (soNgayDaOff >= limit ? 'off_ov' : 'off_phep'))
                        setShowInfo(null)
                        setTimeout(() => {
                          document.getElementById('ly-do-textarea')?.focus()
                          document.getElementById('ly-do-textarea')?.scrollIntoView({ behavior:'smooth' })
                        }, 300)
                      }}
                        style={{ width:'100%', padding:'14px', borderRadius:'14px', background:'linear-gradient(135deg,#C0392B,#E74C3C)', color:'white', border:'none', fontWeight:'800', fontSize:'13px', cursor:'pointer', marginBottom:'8px' }}>
                        ⚠️ Vẫn Đăng Ký — Lý Do Bất Khả Kháng
                      </button>
                      <div style={{ fontSize:'11px', color:COLORS.textMute, textAlign:'center', marginBottom:'8px' }}>
                        Yêu cầu sẽ gửi Cao Quốc Nam xét duyệt đặc biệt
                      </div>
                    </>
                  ) : (
                    <button onClick={() => {
                      setNgayOff(showInfo)
                      const [y, m, d_val] = showInfo.split('-')
                      const isWe = new Date(y, m-1, d_val).getDay() === 0 || new Date(y, m-1, d_val).getDay() === 6
                      const limit = nhanVien.gioi_han_off_thang || 3
                      setLoaiOff(isWe ? 'off_t7' : (soNgayDaOff >= limit ? 'off_ov' : 'off_phep'))
                      setShowInfo(null)
                    }}
                      style={{ width:'100%', padding:'14px', borderRadius:'14px', background:COLORS.grad, color:'white', border:'none', fontWeight:'800', fontSize:'14px', cursor:'pointer', marginBottom:'8px' }}>
                      Chọn ngày {fmt(showInfo)}
                    </button>
                  )}

                  <button onClick={() => setShowInfo(null)}
                    style={{ width:'100%', padding:'12px', borderRadius:'14px', background:COLORS.card, border:`1px solid ${COLORS.border}`, fontWeight:'700', cursor:'pointer' }}>
                    Đóng
                  </button>
                </>
              )
            })()}
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ background:COLORS.grad, padding:'48px 20px 28px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
          <button onClick={onBack}
            style={{ width:'36px', height:'36px', borderRadius:'50%', background:'rgba(255,255,255,0.2)', border:'none', color:'white', fontSize:'18px', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>←</button>
          <div>
            <div style={{ color:'white', fontWeight:'700', fontSize:'18px' }}>Đăng Ký OFF</div>
            <div style={{ color:'rgba(255,255,255,0.75)', fontSize:'12px', marginTop:'2px' }}>
              {nhanVien.vi_tri === 'le_tan' ? '⚠️ Lễ Tân: max 1 người/ngày' : `⚠️ KTV: max ${gioiHan} người/ngày`}
            </div>
            <div style={{ color:'white', fontSize:'11px', marginTop:'4px', fontWeight:'600', background:'rgba(0,0,0,0.2)', display:'inline-block', padding:'2px 8px', borderRadius:'8px' }}>
              🌟 Phép tháng này: đã dùng {soNgayDaOff}/{nhanVien.gioi_han_off_thang || 3} ngày
            </div>
          </div>
        </div>
      </div>

      <div style={{ padding:'16px' }}>

        {/* Calendar */}
        <div style={{ background:COLORS.card, borderRadius:'24px', padding:'16px', marginBottom:'16px', border:`1px solid ${COLORS.border}`, boxShadow:COLORS.shadow }}>

          {/* Navigator */}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'12px' }}>
            <button onClick={prevMonth} style={{ background:'none', border:'none', fontSize:'22px', color:COLORS.textSub, cursor:'pointer', padding:'4px 8px' }}>‹</button>
            <span style={{ fontWeight:'800', fontSize:'15px', color:COLORS.text }}>{THANG_VN[calThang]} {calNam}</span>
            <button onClick={nextMonth} style={{ background:'none', border:'none', fontSize:'22px', color:COLORS.textSub, cursor:'pointer', padding:'4px 8px' }}>›</button>
          </div>

          {/* Header ngày */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:'3px', marginBottom:'6px' }}>
            {THU_VN.map(d => (
              <div key={d} style={{ textAlign:'center', fontSize:'10px', fontWeight:'700', color:d==='CN'||d==='T7'?COLORS.chi:COLORS.textMute, padding:'2px 0' }}>
                {d}
              </div>
            ))}
          </div>

          {/* Ngày */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:'3px' }}>
            {Array.from({ length: firstDayOfWeek }).map((_, i) => <div key={`e-${i}`} />)}
            {Array.from({ length: daysInMonth }, (_, i) => i+1).map(day => {
              const iso      = getDayISO(day)
              const isPast   = iso < today
              const isToday  = iso === today
              const isSel    = iso === ngayOff
              const date     = new Date(calNam, calThang-1, day)
              const isWeekend = date.getDay() === 0 || date.getDay() === 6
              const info     = getNgayInfo(iso)
              const isMyOff  = info.myOff !== undefined
              const isFull   = info.isFull && !isMyOff

              // Màu nền
              let bg, color, borderStyle
              if (isSel)        { bg = COLORS.primary;  color = 'white';       borderStyle = `2px solid ${COLORS.primary}` }
              else if (isMyOff) { bg = '#DBEAFE';       color = '#1E40AF';     borderStyle = `1px solid #93C5FD` }
              else if (isFull)  { bg = '#FEE2E2';       color = '#991B1B';     borderStyle = `1px solid #FCA5A5` }
              else if (isPast)  { bg = 'transparent';   color = COLORS.textMute; borderStyle = `1px solid ${COLORS.border}` }
              else if (isToday) { bg = '#FFF3E0';       color = COLORS.primary; borderStyle = `2px solid ${COLORS.primary}` }
              else if (isWeekend){ bg = '#FFF5F5';      color = COLORS.chi;    borderStyle = `1px solid #FECACA` }
              else              { bg = COLORS.card;     color = COLORS.text;   borderStyle = `1px solid ${COLORS.border}` }

              return (
                <button key={day}
                  onClick={() => {
                    if (isPast) return
                    // Long tap / click → show info
                    setShowInfo(iso)
                  }}
                  onDoubleClick={() => {
                    if (isPast || isFull) return
                    if (iso === ngayOff) {
                      setNgayOff('')
                    } else {
                      setNgayOff(iso)
                      const [y, m, d_val] = iso.split('-')
                      const isWe = new Date(y, m-1, d_val).getDay() === 0 || new Date(y, m-1, d_val).getDay() === 6
                      const limit = nhanVien.gioi_han_off_thang || 3
                      setLoaiOff(isWe ? 'off_t7' : (soNgayDaOff >= limit ? 'off_ov' : 'off_phep'))
                    }
                  }}
                  style={{
                    borderRadius:'10px', padding:'4px 2px', textAlign:'center',
                    background: bg, border: borderStyle,
                    minHeight:'46px', display:'flex', flexDirection:'column',
                    alignItems:'center', justifyContent:'center', gap:'1px',
                    cursor: isPast ? 'default' : 'pointer',
                    opacity: isPast ? 0.35 : 1,
                    transition: 'all 0.15s'
                  }}>
                  <div style={{ fontSize:'12px', fontWeight: isSel||isToday ? '800' : '600', color }}>{day}</div>

                  {/* Indicator */}
                  {isMyOff && (
                    <div style={{ fontSize:'7px', color:'#1E40AF', fontWeight:'800', lineHeight:'1' }}>OFF</div>
                  )}
                  {!isMyOff && info.others.length > 0 && (
                    <div style={{ fontSize:'7px', color: isFull ? '#991B1B' : '#8B6914', fontWeight:'700', lineHeight:'1' }}>
                      {isFull ? '🔒' : `${info.others.length}/${gioiHan}`}
                    </div>
                  )}
                </button>
              )
            })}
          </div>

          {/* Chú thích */}
          <div style={{ display:'flex', flexWrap:'wrap', gap:'8px', marginTop:'12px' }}>
            {[
              { bg:COLORS.primary, color:'white',    text:'Đang chọn' },
              { bg:'#DBEAFE',      color:'#1E40AF',   text:'OFF của bạn' },
              { bg:'#FEE2E2',      color:'#991B1B',   text:'🔒 Đủ người' },
              { bg:'#FFF3E0',      color:COLORS.primary, text:'Hôm nay' },
            ].map((item,i) => (
              <div key={i} style={{ display:'flex', alignItems:'center', gap:'5px' }}>
                <div style={{ width:'14px', height:'14px', borderRadius:'4px', background:item.bg, border:`1px solid ${item.color}20`, flexShrink:0 }} />
                <span style={{ fontSize:'10px', color:COLORS.textMute }}>{item.text}</span>
              </div>
            ))}
          </div>

          <div style={{ fontSize:'10px', color:COLORS.textMute, textAlign:'center', marginTop:'8px', fontStyle:'italic' }}>
            💡 Tap vào ngày để xem chi tiết • Số trên ô = số người đã OFF
          </div>
        </div>

        {/* Ngày đã chọn */}
        {ngayOff && (
          <div style={{ background:'linear-gradient(135deg,#FFF9F0,#FDEBD0)', borderRadius:'16px', padding:'12px 16px', marginBottom:'16px', border:'1px solid rgba(201,169,110,0.3)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <span style={{ fontSize:'13px', fontWeight:'600', color:COLORS.textSub }}>Ngày OFF đã chọn:</span>
            <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
              <span style={{ fontSize:'15px', fontWeight:'800', color:COLORS.primary }}>{fmt(ngayOff)}</span>
              <button onClick={() => setNgayOff('')}
                style={{ background:'none', border:'none', color:COLORS.textMute, fontSize:'16px', cursor:'pointer' }}>✕</button>
            </div>
          </div>
        )}

        {/* Form */}
        <div style={{ background:COLORS.card, borderRadius:'24px', padding:'20px', marginBottom:'16px', border:`1px solid ${COLORS.border}`, boxShadow:COLORS.shadow }}>
          <div style={{ fontWeight:'800', fontSize:'15px', color:COLORS.text, marginBottom:'16px' }}>📝 Thông Tin Đơn Xin Nghỉ</div>

          <div style={{ marginBottom:'16px' }}>
            <div style={{ fontSize:'12px', color:COLORS.textMute, fontWeight:'600', marginBottom:'8px', textTransform:'uppercase' }}>Loại nghỉ</div>
            <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
              {LOAI_OFF.map(item => {
                let isWeOff = false;
                if (ngayOff) {
                  const [y, m, d_val] = ngayOff.split('-');
                  const d = new Date(y, m-1, d_val).getDay();
                  isWeOff = (d === 0 || d === 6);
                }
                const isDisabled = isWeOff && item.value !== 'off_t7';

                return (
                  <button key={item.value} onClick={() => !isDisabled && setLoaiOff(item.value)}
                    disabled={isDisabled}
                    style={{ padding:'12px 16px', borderRadius:'12px', border:`2px solid ${loaiOff===item.value ? COLORS.primary : COLORS.border}`, background: isDisabled ? '#F9FAFB' : (loaiOff===item.value ? item.color : COLORS.card), cursor: isDisabled ? 'not-allowed' : 'pointer', opacity: isDisabled ? 0.45 : 1, textAlign:'left', transition:'all 0.2s' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                      <div style={{ fontWeight:'700', fontSize:'13px', color: isDisabled ? COLORS.textMute : (loaiOff===item.value ? COLORS.primary : COLORS.text) }}>
                        {item.label}
                      </div>
                      {isDisabled && <span style={{ fontSize:'12px' }}>🔒</span>}
                    </div>
                    <div style={{ fontSize:'11px', color:COLORS.textMute, marginTop:'2px' }}>
                      {isDisabled ? 'Hệ thống đã khóa do bạn chọn T7/CN' : item.desc}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          <div style={{ marginBottom:'20px' }}>
            <div style={{ fontSize:'12px', color:COLORS.textMute, fontWeight:'600', marginBottom:'6px', textTransform:'uppercase' }}>
              Lý do <span style={{ color:COLORS.chi }}>*</span>
            </div>
            <textarea id="ly-do-textarea" value={lyDo} onChange={e => setLyDo(e.target.value)}
              placeholder="Nhập lý do xin nghỉ..."
              style={{ width:'100%', padding:'14px', borderRadius:'12px', border:`1px solid ${COLORS.border}`, fontSize:'14px', resize:'none', height:'80px', outline:'none', boxSizing:'border-box', fontFamily:'inherit' }} />
          </div>

          <button onClick={handleSubmit} disabled={loading || !ngayOff}
            style={{ width:'100%', padding:'16px', borderRadius:'16px', background: ngayOff ? COLORS.grad : '#E5E7EB', color: ngayOff ? 'white' : COLORS.textMute, border:'none', fontWeight:'800', fontSize:'15px', cursor: ngayOff ? 'pointer' : 'not-allowed', transition:'all 0.2s' }}>
            {loading ? 'Đang gửi...' : ngayOff ? `📨 Gửi Đơn OFF ${fmt(ngayOff)}` : '📅 Chọn ngày trước'}
          </button>
        </div>

        {/* Lịch sử */}
        {danhSach.length > 0 && (
          <div style={{ background:COLORS.card, borderRadius:'24px', padding:'20px', border:`1px solid ${COLORS.border}`, boxShadow:COLORS.shadow }}>
            <div style={{ fontWeight:'800', fontSize:'15px', color:COLORS.text, marginBottom:'16px' }}>📋 Lịch Sử Đăng Ký</div>
            {danhSach.map((item, i) => {
              const ts   = getTrangThaiStyle(item.trang_thai)
              const loai = LOAI_OFF.find(l => l.value === item.loai_off)
              return (
                <div key={item.id} style={{ padding:'12px 0', borderBottom:i<danhSach.length-1?`1px solid ${COLORS.border}`:'none' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                    <div>
                      <div style={{ fontWeight:'700', fontSize:'14px', color:COLORS.text }}>{fmt(item.ngay_off)}</div>
                      <div style={{ fontSize:'11px', color:COLORS.textMute, marginTop:'2px' }}>{loai?.label || item.loai_off}</div>
                      <div style={{ fontSize:'11px', color:COLORS.textSub, marginTop:'2px', fontStyle:'italic' }}>{item.ly_do}</div>
                    </div>
                    <div style={{ background:ts.bg, color:ts.color, padding:'4px 10px', borderRadius:'8px', fontSize:'11px', fontWeight:'700', flexShrink:0 }}>
                      {ts.label}
                    </div>
                  </div>
                  {item.ghi_chu_duyet && (
                    <div style={{ fontSize:'11px', color:COLORS.chi, marginTop:'6px', background:'#FEF2F2', padding:'6px 10px', borderRadius:'8px' }}>
                      💬 Cao Quốc Nam: {item.ghi_chu_duyet}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

      </div>
    </div>
  )
}