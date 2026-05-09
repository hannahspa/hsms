import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { LUX } from '../../constants/lux'
import { todayISO, getNowVN } from '../../lib/utils'
import './styles.css'

const LOAI_OFF = [
  { value: 'off_phep', label: 'OFF Phép', desc: '≤3 ngày/tháng, không T7/CN', color: '#DBEAFE' },
  { value: 'off_ov', label: 'OFF Không Lương', desc: 'Vượt 3 ngày hoặc ngày thường', color: '#FEE2E2' },
  { value: 'off_t7', label: 'OFF T7/CN Có Lý Do', desc: 'Tính x2 ngày công', color: '#F3E8FF' },
  { value: 'off_t7x', label: 'OFF T7/CN Không Phép', desc: 'Phạt T7: -300k, CN: -500k', color: '#FEE2E2' },
]

const GIOI_HAN_OFF = { le_tan: 1, ktv: 2, tap_vu: 1 }

const HERO = {
  background: `radial-gradient(circle at 100% 0%, rgba(212,165,116,0.4), transparent 55%), linear-gradient(155deg,#4a3528 0%,#3d2c20 50%,#2e2018 100%)`,
  color: '#f5ede0', position: 'relative', overflow: 'hidden',
}

const backArrow = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
)

export default function CheckinDangKyOff({ nhanVien, onBack }) {
  const now = getNowVN()
  const [calThang, setCalThang] = useState(now.getMonth() + 1)
  const [calNam, setCalNam] = useState(now.getFullYear())
  const [ngayOff, setNgayOff] = useState('')
  const [loaiOff, setLoaiOff] = useState('off_phep')
  const [lyDo, setLyDo] = useState('')
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState(null)
  const [danhSach, setDanhSach] = useState([])
  const [offMap, setOffMap] = useState({})
  const [nvMap, setNvMap] = useState({})
  const [showInfo, setShowInfo] = useState(null)
  const [soNgayDaOff, setSoNgayDaOff] = useState(0)

  useEffect(() => { loadDanhSach() }, [])
  useEffect(() => { loadOffCungBoPhan() }, [calThang, calNam])

  const loadDanhSach = async () => {
    const { data } = await supabase.from('dang_ky_off').select('*')
      .eq('nhan_vien_id', nhanVien.id).order('ngay_off', { ascending: false }).limit(15)
    setDanhSach(data || [])
  }

  const loadOffCungBoPhan = async () => {
    const startDate = `${calNam}-${String(calThang).padStart(2, '0')}-01`
    const lastDay = new Date(calNam, calThang, 0).getDate()
    const endDate = `${calNam}-${String(calThang).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
    const { data: nvList } = await supabase.from('nhan_vien').select('id, ho_ten')
      .eq('vi_tri', nhanVien.vi_tri).eq('trang_thai', 'dang_lam')
    if (!nvList) return

    const map = {}
    nvList.forEach(nv => {
      const parts = nv.ho_ten.trim().split(' ')
      map[nv.id] = parts.length >= 2 ? parts[parts.length - 2] + ' ' + parts[parts.length - 1] : parts[parts.length - 1]
    })
    setNvMap(map)

    const ids = nvList.map(nv => nv.id)
    const { data: offData } = await supabase.from('dang_ky_off')
      .select('ngay_off, nhan_vien_id, trang_thai, loai_off')
      .in('nhan_vien_id', ids).gte('ngay_off', startDate).lte('ngay_off', endDate)
      .in('trang_thai', ['cho_duyet', 'duoc_duyet'])

    const myOffCount = (offData || []).filter(r => r.nhan_vien_id === nhanVien.id && r.loai_off === 'off_phep').length
    setSoNgayDaOff(myOffCount)

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
    const others = list.filter(r => r.id !== nhanVien.id)
    const myOff = list.find(r => r.id === nhanVien.id)
    const isFull = others.length >= gioiHan
    const names = others.map(r => nvMap[r.id] || '?')
    return { others, myOff, isFull, names, total: others.length }
  }

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  const handleSubmit = async () => {
    if (!ngayOff) { showToast('Vui lòng chọn ngày OFF', 'error'); return }
    if (!lyDo.trim()) { showToast('Vui lòng nhập lý do', 'error'); return }

    const info = getNgayInfo(ngayOff)
    const isFullDay = info.isFull && info.myOff === undefined
    const batKhaKhang = isFullDay && lyDo.trim().length > 20
    if (isFullDay && !batKhaKhang) {
      showToast('Đủ người OFF! Nhập lý do chi tiết hơn 20 ký tự để gửi yêu cầu đặc biệt.', 'error')
      return
    }

    const [y, m, d_val] = ngayOff.split('-')
    const dateObj = new Date(y, m - 1, d_val)
    const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6
    if (isWeekend && loaiOff === 'off_phep') {
      showToast('T7/CN không được dùng OFF Phép. Vui lòng chọn loại OFF T7/CN.', 'error')
      return
    }

    setLoading(true)
    try {
      const { error } = await supabase.rpc('insert_dang_ky_off', {
        p_nhan_vien_id: nhanVien.id,
        p_ngay_off: ngayOff,
        p_loai_off: loaiOff,
        p_ly_do: lyDo,
        p_bat_kha_khang: batKhaKhang,
      })
      if (error) throw error
      showToast('Đã gửi đơn — chờ Cao Quốc Nam duyệt!')
      setNgayOff(''); setLyDo('')
      loadDanhSach(); loadOffCungBoPhan()
    } catch (e) { showToast('Lỗi: ' + e.message, 'error') }
    finally { setLoading(false) }
  }

  const fmt = (iso) => {
    if (!iso) return ''
    const [y, m, d] = iso.split('-')
    return `${d}/${m}/${y}`
  }

  const getTrangThaiStyle = (tt) => {
    if (tt === 'duoc_duyet') return { color: '#166534', bg: '#DCFCE7', label: 'Đã duyệt' }
    if (tt === 'tu_choi') return { color: '#991B1B', bg: '#FEE2E2', label: 'Từ chối' }
    return { color: '#8B6914', bg: '#FEF9E7', label: 'Chờ duyệt' }
  }

  const daysInMonth = new Date(calNam, calThang, 0).getDate()
  const firstDayOfWeek = new Date(calNam, calThang - 1, 1).getDay()
  const today = todayISO()

  const prevMonth = () => { if (calThang === 1) { setCalThang(12); setCalNam(n => n - 1) } else setCalThang(t => t - 1) }
  const nextMonth = () => { if (calThang === 12) { setCalThang(1); setCalNam(n => n + 1) } else setCalThang(t => t + 1) }
  const getDayISO = (day) => `${calNam}-${String(calThang).padStart(2, '0')}-${String(day).padStart(2, '0')}`

  return (
    <div style={{ minHeight: '100vh', background: LUX.bg, fontFamily: LUX.fontSans, paddingBottom: 40 }}>

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)', zIndex: 9999, background: toast.type === 'error' ? LUX.danger : LUX.sage, color: '#fff', padding: '12px 24px', borderRadius: 12, fontWeight: 600, fontSize: 13, boxShadow: LUX.shadowLg, whiteSpace: 'nowrap' }}>
          {toast.msg}
        </div>
      )}

      {/* Popup info ngày */}
      {showInfo && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-end', zIndex: 998 }} onClick={() => setShowInfo(null)}>
          <div style={{ background: LUX.surface, borderRadius: '24px 24px 0 0', width: '100%', maxWidth: 420, margin: '0 auto', padding: '24px 20px 40px' }} onClick={e => e.stopPropagation()}>
            {(() => {
              const info = getNgayInfo(showInfo)
              const [y, m, d_val] = showInfo.split('-')
              const isWk = new Date(y, m - 1, d_val).getDay() === 0 || new Date(y, m - 1, d_val).getDay() === 6
              return (
                <>
                  <div style={{ fontFamily: LUX.fontSerif, fontSize: 18, fontWeight: 600, color: LUX.espresso, marginBottom: 4 }}>
                    {fmt(showInfo)} {isWk && <span style={{ color: LUX.rose, fontSize: 13, marginLeft: 6 }}>(Cuối tuần)</span>}
                  </div>
                  <div style={{ fontSize: 12, color: LUX.ink3, marginBottom: 16 }}>
                    {nhanVien.vi_tri === 'le_tan' ? 'Lễ Tân' : 'KTV'} — Giới hạn: {gioiHan} người/ngày
                  </div>

                  {isWk && (
                    <div style={{ background: '#FEF2F2', border: '1px dashed #FECACA', borderRadius: 12, padding: 12, textAlign: 'center', color: LUX.danger, fontWeight: 600, marginBottom: 16, fontSize: 13, lineHeight: 1.4 }}>
                      Đây là ngày T7/CN. Nếu bạn OFF sẽ bị trừ x2 ngày công!
                    </div>
                  )}

                  {info.others.length === 0 ? (
                    <div style={{ background: '#eef2e7', borderRadius: 12, padding: 12, textAlign: 'center', color: LUX.sage, fontWeight: 600, marginBottom: 16 }}>
                      Chưa có ai đăng ký OFF ngày này
                    </div>
                  ) : (
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ fontSize: 12, color: LUX.ink3, fontWeight: 600, marginBottom: 8 }}>
                        Đã có {info.others.length}/{gioiHan} người đăng ký:
                      </div>
                      {info.others.map((r, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: LUX.surface2, borderRadius: 10, marginBottom: 6, border: `1px solid ${LUX.line}` }}>
                          <span style={{ fontWeight: 600, color: LUX.espresso }}>{nvMap[r.id] || '?'}</span>
                          <span style={{ fontSize: 11, color: r.trang_thai === 'duoc_duyet' ? LUX.sage : '#8B6914', fontWeight: 600 }}>
                            {r.trang_thai === 'duoc_duyet' ? 'Đã duyệt' : 'Chờ duyệt'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {info.isFull ? (
                    <>
                      <div style={{ background: '#FEE2E2', borderRadius: 12, padding: 12, textAlign: 'center', color: '#991B1B', fontWeight: 600, marginBottom: 12 }}>
                        Đã đủ {gioiHan}/{gioiHan} người — không thể đăng ký thông thường
                      </div>
                      <button onClick={() => {
                        setNgayOff(showInfo)
                        const [y, m, d_val] = showInfo.split('-')
                        const isWe = new Date(y, m - 1, d_val).getDay() === 0 || new Date(y, m - 1, d_val).getDay() === 6
                        const limit = nhanVien.gioi_han_off_thang || 3
                        setLoaiOff(isWe ? 'off_t7' : (soNgayDaOff >= limit ? 'off_ov' : 'off_phep'))
                        setShowInfo(null)
                        setTimeout(() => {
                          const el = document.getElementById('ly-do-textarea')
                          el?.focus(); el?.scrollIntoView({ behavior: 'smooth' })
                        }, 300)
                      }} style={{ width: '100%', padding: 14, borderRadius: 14, background: `linear-gradient(135deg,${LUX.danger},#E74C3C)`, color: '#fff', border: 'none', fontFamily: 'inherit', fontWeight: 700, fontSize: 13, cursor: 'pointer', marginBottom: 8 }}>
                        Vẫn Đăng Ký — Lý Do Bất Khả Kháng
                      </button>
                      <div style={{ fontSize: 11, color: LUX.ink3, textAlign: 'center', marginBottom: 8 }}>
                        Yêu cầu sẽ gửi Cao Quốc Nam xét duyệt đặc biệt
                      </div>
                    </>
                  ) : (
                    <button onClick={() => {
                      setNgayOff(showInfo)
                      const [y, m, d_val] = showInfo.split('-')
                      const isWe = new Date(y, m - 1, d_val).getDay() === 0 || new Date(y, m - 1, d_val).getDay() === 6
                      const limit = nhanVien.gioi_han_off_thang || 3
                      setLoaiOff(isWe ? 'off_t7' : (soNgayDaOff >= limit ? 'off_ov' : 'off_phep'))
                      setShowInfo(null)
                    }} style={{ width: '100%', padding: 14, borderRadius: 14, background: LUX.goldGrad, color: '#fff', border: 'none', fontFamily: 'inherit', fontWeight: 700, fontSize: 14, cursor: 'pointer', marginBottom: 8 }}>
                      Chọn ngày {fmt(showInfo)}
                    </button>
                  )}

                  <button onClick={() => setShowInfo(null)} style={{ width: '100%', padding: 12, borderRadius: 14, background: LUX.surface2, border: `1px solid ${LUX.line}`, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', color: LUX.ink }}>
                    Đóng
                  </button>
                </>
              )
            })()}
          </div>
        </div>
      )}

      {/* Header */}
      <header style={{ ...HERO, padding: '20px 22px 34px', display: 'flex', alignItems: 'center', gap: 14 }}>
        <button onClick={onBack} style={{
          width: 38, height: 38, borderRadius: '50%', background: 'rgba(255,255,255,0.10)',
          border: '1px solid rgba(245,237,224,0.18)', color: '#f5ede0',
          display: 'grid', placeItems: 'center', cursor: 'pointer', backdropFilter: 'blur(8px)',
        }}>
          {backArrow}
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(245,237,224,0.55)', marginBottom: 4 }}>Đơn xin nghỉ</div>
          <h2 style={{ fontFamily: LUX.fontSerif, fontSize: 26, fontWeight: 600, margin: 0, lineHeight: 1, letterSpacing: '-0.01em' }}>Đăng ký OFF</h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
            <span style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(245,237,224,0.16)', color: 'rgba(245,237,224,0.85)', fontSize: 11, padding: '6px 10px', borderRadius: 999, display: 'inline-flex', alignItems: 'center', gap: 5, backdropFilter: 'blur(8px)' }}>
              {nhanVien.vi_tri === 'le_tan' ? 'Lễ Tân: max 1' : `KTV: max ${gioiHan}`}/ngày
            </span>
            <span style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(245,237,224,0.16)', color: 'rgba(245,237,224,0.85)', fontSize: 11, padding: '6px 10px', borderRadius: 999, display: 'inline-flex', alignItems: 'center', gap: 5, backdropFilter: 'blur(8px)' }}>
              Phép: {soNgayDaOff}/{nhanVien.gioi_han_off_thang || 3} ngày
            </span>
          </div>
        </div>
      </header>

      <div style={{ padding: '0 18px' }} className="stagger">

        {/* Calendar */}
        <div />
        <div style={{ margin: '-16px 0 0', background: LUX.surface2, border: `1px solid ${LUX.line}`, borderRadius: LUX.radius, padding: 18, boxShadow: LUX.shadow }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <button onClick={prevMonth} style={{ width: 28, height: 28, borderRadius: '50%', background: LUX.surface, border: `1px solid ${LUX.line}`, cursor: 'pointer', color: LUX.ink2, display: 'grid', placeItems: 'center' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
            </button>
            <div style={{ fontFamily: LUX.fontSerif, fontSize: 20, fontWeight: 600, color: LUX.espresso }}>
              Tháng {calThang} &middot; {calNam}
            </div>
            <button onClick={nextMonth} style={{ width: 28, height: 28, borderRadius: '50%', background: LUX.surface, border: `1px solid ${LUX.line}`, cursor: 'pointer', color: LUX.ink2, display: 'grid', placeItems: 'center' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 3, marginBottom: 6 }}>
            {['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'].map((d, i) => (
              <div key={d} style={{ textAlign: 'center', fontSize: 10, fontWeight: 700, color: (i === 0 || i === 6) ? LUX.rose : LUX.ink3, padding: '2px 0' }}>{d}</div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 3 }}>
            {Array.from({ length: firstDayOfWeek }).map((_, i) => <div key={`e-${i}`} />)}
            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
              const iso = getDayISO(day)
              const isPast = iso < today
              const isToday = iso === today
              const isSel = iso === ngayOff
              const date = new Date(calNam, calThang - 1, day)
              const isWeekend = date.getDay() === 0 || date.getDay() === 6
              const info = getNgayInfo(iso)
              const isMyOff = info.myOff !== undefined
              const isFull = info.isFull && !isMyOff

              let bg, color, borderStyle
              if (isSel) { bg = LUX.taupe; color = '#fff'; borderStyle = `2px solid ${LUX.taupe}` }
              else if (isMyOff) { bg = 'rgba(122,138,106,0.18)'; color = LUX.sage; borderStyle = '1px solid rgba(122,138,106,0.4)' }
              else if (isFull) { bg = '#FEE2E2'; color = '#991B1B'; borderStyle = '1px solid #FCA5A5' }
              else if (isPast) { bg = 'transparent'; color = LUX.ink4; borderStyle = `1px solid ${LUX.line}` }
              else if (isToday) { bg = 'rgba(212,165,116,0.08)'; color = LUX.champagne2; borderStyle = `2px solid ${LUX.gold}` }
              else if (isWeekend) { bg = '#FFF5F5'; color = LUX.rose; borderStyle = '1px solid #FECACA' }
              else { bg = LUX.surface2; color = LUX.espresso; borderStyle = `1px solid ${LUX.line}` }

              return (
                <button key={day} onClick={() => { if (isPast) return; setShowInfo(iso) }}
                  onDoubleClick={() => {
                    if (isPast || isFull) return
                    if (iso === ngayOff) { setNgayOff('') }
                    else {
                      setNgayOff(iso)
                      const [y, m, d_val] = iso.split('-')
                      const isWe = new Date(y, m - 1, d_val).getDay() === 0 || new Date(y, m - 1, d_val).getDay() === 6
                      const limit = nhanVien.gioi_han_off_thang || 3
                      setLoaiOff(isWe ? 'off_t7' : (soNgayDaOff >= limit ? 'off_ov' : 'off_phep'))
                    }
                  }}
                  style={{
                    borderRadius: 10, padding: '4px 2px', textAlign: 'center',
                    background: bg, border: borderStyle, minHeight: 46,
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1,
                    cursor: isPast ? 'default' : 'pointer', opacity: isPast ? 0.35 : 1,
                    transition: 'all 0.15s', fontFamily: 'inherit', color: 'inherit',
                  }}>
                  <div style={{ fontSize: 12, fontWeight: isSel || isToday ? 800 : 600, color }}>{day}</div>
                  {isMyOff && <div style={{ fontSize: 7, color: LUX.sage, fontWeight: 800, lineHeight: 1 }}>OFF</div>}
                  {!isMyOff && info.others.length > 0 && (
                    <div style={{ fontSize: 7, color: isFull ? '#991B1B' : '#8B6914', fontWeight: 700, lineHeight: 1 }}>
                      {isFull ? 'FULL' : `${info.others.length}/${gioiHan}`}
                    </div>
                  )}
                </button>
              )
            })}
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
            {[
              { bg: LUX.taupe, color: '#fff', text: 'Đang chọn' },
              { bg: 'rgba(122,138,106,0.18)', color: LUX.sage, text: 'OFF của bạn' },
              { bg: '#FEE2E2', color: '#991B1B', text: 'Đủ người' },
              { bg: 'rgba(212,165,116,0.08)', color: LUX.champagne2, text: 'Hôm nay' },
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <div style={{ width: 14, height: 14, borderRadius: 4, background: item.bg, border: `1px solid ${item.color}20`, flexShrink: 0 }} />
                <span style={{ fontSize: 10, color: LUX.ink3 }}>{item.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Ngày đã chọn */}
        {ngayOff && (
          <div style={{ marginTop: 12, background: 'linear-gradient(180deg,#fdf3e0,#f9ead0)', borderRadius: LUX.radius, padding: '12px 16px', border: '1px solid #ecd9b3', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: LUX.ink2 }}>Ngày OFF đã chọn:</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontFamily: LUX.fontSerif, fontSize: 16, fontWeight: 600, color: LUX.taupe }}>{fmt(ngayOff)}</span>
              <button onClick={() => setNgayOff('')} style={{ background: 'none', border: 'none', color: LUX.ink3, fontSize: 16, cursor: 'pointer' }}>×</button>
            </div>
          </div>
        )}

        {/* Off type selection */}
        <div style={{ marginTop: 14 }}>
          <div style={{ fontFamily: LUX.fontSerif, fontSize: 18, fontWeight: 600, color: LUX.espresso, margin: '0 4px 10px', display: 'flex', alignItems: 'center', gap: 8 }}>
            Loại nghỉ phép
          </div>
          {LOAI_OFF.map(item => {
            let isWeOff = false
            if (ngayOff) {
              const [y, m, d_val] = ngayOff.split('-')
              const d = new Date(y, m - 1, d_val).getDay()
              isWeOff = (d === 0 || d === 6)
            }
            const isDisabled = isWeOff && item.value !== 'off_t7'
            const isActive = loaiOff === item.value

            return (
              <button key={item.value} onClick={() => !isDisabled && setLoaiOff(item.value)} disabled={isDisabled}
                style={{
                  width: '100%', padding: '14px 16px', borderRadius: LUX.radius, cursor: isDisabled ? 'not-allowed' : 'pointer',
                  marginBottom: 8, display: 'grid', gridTemplateColumns: '1fr auto', gap: 10, alignItems: 'center',
                  border: `1.5px solid ${isActive ? LUX.taupe : LUX.line}`,
                  background: isActive ? 'linear-gradient(180deg,#fdf3e0,#f9ead0)' : LUX.surface2,
                  opacity: isDisabled ? 0.45 : 1, textAlign: 'left',
                  transition: 'all 0.25s', fontFamily: 'inherit', color: 'inherit',
                }}>
                <div>
                  <div style={{ fontFamily: LUX.fontSerif, fontSize: 17, fontWeight: 600, color: LUX.espresso, lineHeight: 1, marginBottom: 4 }}>{item.label}</div>
                  <div style={{ fontSize: 11, color: LUX.ink3, letterSpacing: '0.02em' }}>{isDisabled ? 'Hệ thống đã khóa do bạn chọn T7/CN' : item.desc}</div>
                </div>
                <div style={{
                  width: 18, height: 18, borderRadius: '50%', border: `2px solid ${isActive ? LUX.taupe : LUX.line2}`,
                  background: isActive ? LUX.taupe : 'transparent', flexShrink: 0, position: 'relative',
                }}>
                  {isActive && <div style={{ position: 'absolute', inset: 3, borderRadius: '50%', background: '#fdf6e8' }} />}
                </div>
              </button>
            )
          })}
        </div>

        {/* Form */}
        <div style={{ marginTop: 14, background: LUX.surface2, border: `1px solid ${LUX.line}`, borderRadius: LUX.radius, padding: 20 }}>
          <div style={{ fontFamily: LUX.fontSerif, fontSize: 18, fontWeight: 600, color: LUX.espresso, marginBottom: 16 }}>Thông Tin Đơn Xin Nghỉ</div>

          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 12, color: LUX.ink3, fontWeight: 600, marginBottom: 6, textTransform: 'uppercase' }}>
              Lý do <span style={{ color: LUX.danger }}>*</span>
            </div>
            <textarea id="ly-do-textarea" value={lyDo} onChange={e => setLyDo(e.target.value)}
              placeholder="Nhập lý do xin nghỉ..."
              style={{ width: '100%', padding: 14, borderRadius: 12, border: `1px solid ${LUX.line}`, fontSize: 14, resize: 'none', height: 80, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }} />
          </div>

          <button onClick={handleSubmit} disabled={loading || !ngayOff}
            className="btn-shimmer"
            style={{
              width: '100%', padding: 16, borderRadius: 16, border: 'none', cursor: ngayOff ? 'pointer' : 'not-allowed',
              background: ngayOff ? LUX.goldGrad : '#E5E7EB',
              color: ngayOff ? '#fff' : LUX.ink3, fontFamily: LUX.fontSerif, fontWeight: 600, fontSize: 15,
              letterSpacing: '0.04em', transition: 'all 0.2s',
              boxShadow: ngayOff ? '0 8px 24px -8px rgba(160,122,74,0.45)' : 'none',
            }}>
            {loading ? 'Đang gửi...' : ngayOff ? `Gửi Đơn OFF ${fmt(ngayOff)}` : 'Chọn ngày trước'}
          </button>
        </div>

        {/* Lịch sử */}
        {danhSach.length > 0 && (
          <div style={{ marginTop: 14, background: LUX.surface2, border: `1px solid ${LUX.line}`, borderRadius: LUX.radius, padding: 20 }}>
            <div style={{ fontFamily: LUX.fontSerif, fontSize: 18, fontWeight: 600, color: LUX.espresso, marginBottom: 16 }}>Lịch Sử Đăng Ký</div>
            {danhSach.map((item, i) => {
              const ts = getTrangThaiStyle(item.trang_thai)
              const loai = LOAI_OFF.find(l => l.value === item.loai_off)
              return (
                <div key={item.id} style={{ padding: '12px 0', borderBottom: i < danhSach.length - 1 ? `1px solid ${LUX.line}` : 'none' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14, color: LUX.espresso }}>{fmt(item.ngay_off)}</div>
                      <div style={{ fontSize: 11, color: LUX.ink3, marginTop: 2 }}>{loai?.label || item.loai_off}</div>
                      <div style={{ fontSize: 11, color: LUX.ink2, marginTop: 2, fontStyle: 'italic' }}>{item.ly_do}</div>
                    </div>
                    <div style={{ background: ts.bg, color: ts.color, padding: '4px 10px', borderRadius: 8, fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                      {ts.label}
                    </div>
                  </div>
                  {item.ghi_chu_duyet && (
                    <div style={{ fontSize: 11, color: LUX.danger, marginTop: 6, background: '#FEF2F2', padding: '6px 10px', borderRadius: 8 }}>
                      Cao Quốc Nam: {item.ghi_chu_duyet}
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
