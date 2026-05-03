import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { COLORS } from '../../constants/colors'
import { todayISO } from '../../lib/utils'

const CA_VAO_CHUAN  = { h: 9,  m: 15 }
const CA_RA_CHUAN   = { h: 20, m: 0  }
const PHUT_CA_CHUAN = (CA_RA_CHUAN.h * 60 + CA_RA_CHUAN.m) - (CA_VAO_CHUAN.h * 60 + CA_VAO_CHUAN.m)

function toPhut(timeStr) {
  const [h, m] = (timeStr || '0:0').split(':').map(Number)
  return h * 60 + m
}

function tinhHeSo(gioVao, gioRa) {
  const lam = Math.max(0, toPhut(gioRa) - toPhut(gioVao))
  const pct = Math.min(100, (lam / PHUT_CA_CHUAN) * 100)
  return Math.round(pct) / 100
}

function tinhTangCa(gioRa) {
  const diff = toPhut(gioRa) - (CA_RA_CHUAN.h * 60 + CA_RA_CHUAN.m)
  if (diff < 15) return 0
  return Math.round(diff / 60 * 100) / 100
}

function tinhGioLam(gioVao, gioRa) {
  const phut = Math.max(0, toPhut(gioRa) - toPhut(gioVao))
  const gio  = Math.floor(phut / 60)
  const min  = phut % 60
  if (gio === 0) return `${min} phút`
  if (min === 0) return `${gio} giờ`
  return `${gio} giờ ${min} phút`
}

function formatTre(phut) {
  const gio = Math.floor(Math.abs(phut) / 60)
  const min = Math.abs(phut) % 60
  if (gio === 0) return `${min} phút`
  if (min === 0) return `${gio} giờ`
  return `${gio} giờ ${min} phút`
}

function phanLoaiVao(gioVao) {
  const tre = toPhut(gioVao) - (CA_VAO_CHUAN.h * 60 + CA_VAO_CHUAN.m)
  if (tre <= 0)  return { label:`✅ Đúng giờ`,                  color:'#166534', bg:'#DCFCE7', cap:'dung_gio' }
  if (tre <= 15) return { label:`⚠️ Trễ ${formatTre(tre)}`,     color:'#8B6914', bg:'#FEF9E7', cap:'tre_nhe' }
  if (tre <= 45) return { label:`⚠️ Trễ ${formatTre(tre)}`,     color:'#C0392B', bg:'#FEF2F2', cap:'tre_vua' }
  return         { label:`🚨 Trễ ${formatTre(tre)}`,            color:'#991B1B', bg:'#FEE2E2', cap:'tre_nang' }
}

function phanLoaiRa(gioRa) {
  const diff = toPhut(gioRa) - (CA_RA_CHUAN.h * 60 + CA_RA_CHUAN.m)
  if (diff >= 15)  return { label:`⏰ Tăng ca ${formatTre(diff)}`,          color:'#6B21A8', bg:'#F3E8FF', cap:'tang_ca' }
  if (diff >= 0)   return { label:'✅ Đúng giờ',                            color:'#166534', bg:'#DCFCE7', cap:'dung_gio' }
  if (diff >= -30) return { label:`⚠️ Về sớm ${formatTre(Math.abs(diff))}`, color:'#8B6914', bg:'#FEF9E7', cap:'ve_som_nhe' }
  if (diff >= -60) return { label:`⚠️ Về sớm ${formatTre(Math.abs(diff))}`, color:'#C0392B', bg:'#FEF2F2', cap:'ve_som_vua' }
  return           { label:`🚨 Về sớm ${formatTre(Math.abs(diff))}`,        color:'#991B1B', bg:'#FEE2E2', cap:'ve_som_nhieu' }
}

// Tọa độ Hannah Spa (39 Nam Kỳ Khởi Nghĩa, Cần Thơ)
const SPA_COORD = { lat: 10.0333, lng: 105.7833 }
const MAX_DISTANCE_M = 50 // Sai số cho phép: 50 mét

function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3 // Bán kính trái đất (mét)
  const phi1 = lat1 * Math.PI/180
  const phi2 = lat2 * Math.PI/180
  const deltaPhi = (lat2-lat1) * Math.PI/180
  const deltaLambda = (lon2-lon1) * Math.PI/180

  const a = Math.sin(deltaPhi/2) * Math.sin(deltaPhi/2) +
            Math.cos(phi1) * Math.cos(phi2) *
            Math.sin(deltaLambda/2) * Math.sin(deltaLambda/2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
  return R * c
}

export default function CheckinChamCong({ nhanVien, chamCong, onBack, onUpdated }) {
  const [loading,     setLoading]     = useState(false)
  const [showVeSom,   setShowVeSom]   = useState(false)
  const [lyDoVeSom,   setLyDoVeSom]   = useState('')
  const [pendingRa,   setPendingRa]   = useState(null)
  const [showResult,  setShowResult]  = useState(null) // popup kết quả

  const getNow = () => {
    const now = new Date()
    const utcMs = now.getTime() + now.getTimezoneOffset() * 60000
    return new Date(utcMs + 7 * 60 * 60000)
  }

  const toTimeStrVN = (d) =>
    `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}:${String(d.getSeconds()).padStart(2,'0')}`

  const handleCheckin = async () => {
    if (!navigator.geolocation) {
      alert("❌ Thiết bị của bạn không hỗ trợ định vị GPS!")
      return
    }

    setLoading(true)
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const dist = getDistance(pos.coords.latitude, pos.coords.longitude, SPA_COORD.lat, SPA_COORD.lng)
      if (dist > MAX_DISTANCE_M) {
        alert(`❌ Bạn đang ở quá xa Spa (${Math.round(dist)}m). Vui lòng đến nơi mới được chấm công!`)
        setLoading(false)
        return
      }

      try {
        const now    = getNowVN()
        const gioVao = toTimeStrVN(now)
        const info   = phanLoaiVao(gioVao)

        const { error } = await supabase.from('cham_cong').insert({
        nhan_vien_id:        nhanVien.id,
        ngay:                todayISO(),
        gio_vao:             gioVao,
        loai:                'di_lam',
        he_so:               0,
        he_so_tam:           0,
        tang_ca_gio:         0,
        trang_thai_tang_ca:  'khong_co',
        nguoi_cham:          nhanVien.ho_ten,
      })
      if (error) throw error

      // Hiện popup kết quả check-in
      setShowResult({
        type:    'checkin',
        icon:    info.cap === 'dung_gio' ? '✅' : '⚠️',
        title:   info.cap === 'dung_gio' ? 'Check-in thành công!' : 'Đã check-in — có trễ giờ',
        color:   info.color,
        bg:      info.bg,
        rows: [
          { label:'Giờ vào',   value: gioVao.slice(0,5) },
          { label:'Trạng thái', value: info.label },
          { label:'Ca chuẩn',  value: '09:15 – 20:00' },
        ],
        note: info.cap !== 'dung_gio' ? `Bạn vào trễ so với quy định. Ngày công sẽ được tính khi check-out.` : `Chúc bạn làm việc hiệu quả! 💪`,
      })
      onUpdated()
      } catch (e) {
        alert('Lỗi: ' + e.message)
      } finally {
        setLoading(false)
      }
    }, (err) => {
      alert("❌ Không thể lấy vị trí GPS: " + err.message + "\nVui lòng bật Vị trí (Location) và cấp quyền cho trình duyệt.")
      setLoading(false)
    }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 })
  }

  const handleCheckoutRequest = () => {
    if (!navigator.geolocation) {
      alert("❌ Thiết bị của bạn không hỗ trợ định vị GPS!")
      return
    }

    setLoading(true)
    navigator.geolocation.getCurrentPosition((pos) => {
      const dist = getDistance(pos.coords.latitude, pos.coords.longitude, SPA_COORD.lat, SPA_COORD.lng)
      if (dist > MAX_DISTANCE_M) {
        alert(`❌ Bạn đang ở quá xa Spa (${Math.round(dist)}m). Vui lòng đến Spa mới được check-out!`)
        setLoading(false)
        return
      }

      const now   = getNowVN()
      const gioRa = toTimeStrVN(now)
      const info  = phanLoaiRa(gioRa)
      if (info.cap === 've_som_vua' || info.cap === 've_som_nhieu') {
        setPendingRa(gioRa)
        setShowVeSom(true)
        setLoading(false)
        return
      }
      confirmCheckout(gioRa, '')
    }, (err) => {
      alert("❌ Không thể lấy vị trí GPS: " + err.message + "\nVui lòng bật Vị trí (Location) và cấp quyền cho trình duyệt.")
      setLoading(false)
    }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 })
  }

  const confirmCheckout = async (gioRa, lyDo) => {
    setLoading(true)
    setShowVeSom(false)
    try {
      const gioVao    = chamCong.gio_vao
      const heSo      = tinhHeSo(gioVao, gioRa)
      const tangCaGio = tinhTangCa(gioRa)
      const gioLam    = tinhGioLam(gioVao, gioRa)
      const infoRa    = phanLoaiRa(gioRa)
      const infoVao   = phanLoaiVao(gioVao)
      const trangThaiTangCa = tangCaGio > 0 ? 'cho_duyet' : 'khong_co'

      const { error } = await supabase.from('cham_cong')
        .update({
          gio_ra:             gioRa,
          he_so:              heSo,
          he_so_tam:          heSo,
          tang_ca_gio:        0,
          ly_do_ve_som:       lyDo || null,
          trang_thai_tang_ca: trangThaiTangCa,
        })
        .eq('id', chamCong.id)
      if (error) throw error

      if (tangCaGio > 0) {
        await supabase.from('yeu_cau_chinh_sua').insert({
          loai_bang:     'cham_cong',
          ban_ghi_id:    chamCong.id,
          loai_yeu_cau:  'duyet_tang_ca',
          du_lieu_cu:    { tang_ca_gio: 0 },
          du_lieu_moi:   { tang_ca_gio: tangCaGio },
          ly_do:         `${nhanVien.ho_ten} tăng ca ${tangCaGio}h — check-out lúc ${gioRa.slice(0,5)}`,
          nguoi_yeu_cau: nhanVien.ho_ten,
        })
      }

      // Hiện popup kết quả checkout
      const rows = [
        { label:'Giờ vào',    value: gioVao.slice(0,5) + ' — ' + infoVao.label },
        { label:'Giờ ra',     value: gioRa.slice(0,5)  + ' — ' + infoRa.label  },
        { label:'Giờ làm',    value: gioLam },
        { label:'Ngày công',  value: `${Math.round(heSo * 100)}%` },
      ]
      if (tangCaGio > 0) {
        rows.push({ label:'Tăng ca', value: `${tangCaGio}h — chờ Cao Quốc Nam duyệt ⏳` })
      }
      if (lyDo) {
        rows.push({ label:'Lý do về sớm', value: lyDo })
      }

      setShowResult({
        type:  'checkout',
        icon:  heSo >= 1 ? '🎉' : heSo >= 0.75 ? '✅' : heSo >= 0.5 ? '⚠️' : '❌',
        title: 'Check-out thành công!',
        color: heSo >= 1 ? '#166534' : heSo >= 0.75 ? '#8B6914' : '#C0392B',
        bg:    heSo >= 1 ? '#DCFCE7' : heSo >= 0.75 ? '#FEF9E7' : '#FEF2F2',
        rows,
        note: heSo >= 1 && tangCaGio === 0
          ? '100% ngày công — xuất sắc! 🌟'
          : tangCaGio > 0
          ? 'Yêu cầu tăng ca đã được gửi cho Cao Quốc Nam duyệt.'
          : `Ngày công ${Math.round(heSo*100)}% — vui lòng liên hệ quản lý nếu cần.`,
      })
      onUpdated()
    } catch (e) {
      alert('Lỗi: ' + e.message)
    } finally {
      setLoading(false)
    }
  }

  const fmt          = (t) => t?.slice(0,5) || '--:--'
  const isCheckedIn  = chamCong?.gio_vao && !chamCong?.gio_ra
  const isCheckedOut = chamCong?.gio_vao &&  chamCong?.gio_ra
  const previewHeSo  = isCheckedIn
    ? tinhHeSo(chamCong.gio_vao, toTimeStrVN(getNow()))
    : null

  // Tổng giờ làm nếu đã checkout
  const gioLamHom = isCheckedOut
    ? tinhGioLam(chamCong.gio_vao, chamCong.gio_ra)
    : null

  return (
    <div style={{ minHeight:'100vh', background:'#FAF7F4' }}>

      {/* ── POPUP KẾT QUẢ ── */}
      {showResult && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:999, padding:'20px' }}>
          <div style={{ background:'white', borderRadius:'28px', padding:'28px 24px', width:'100%', maxWidth:'360px', boxShadow:'0 20px 60px rgba(0,0,0,0.3)' }}>
            {/* Icon lớn */}
            <div style={{ textAlign:'center', marginBottom:'16px' }}>
              <div style={{ fontSize:'56px', marginBottom:'8px' }}>{showResult.icon}</div>
              <div style={{ fontSize:'18px', fontWeight:'800', color:showResult.color }}>{showResult.title}</div>
            </div>

            {/* Bảng thông tin */}
            <div style={{ background:showResult.bg, borderRadius:'16px', padding:'16px', marginBottom:'16px' }}>
              {showResult.rows.map((row, i) => (
                <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', padding:'6px 0', borderBottom: i < showResult.rows.length-1 ? `1px solid rgba(0,0,0,0.06)` : 'none' }}>
                  <span style={{ fontSize:'12px', color:'#666', fontWeight:'600', flexShrink:0, marginRight:'8px' }}>{row.label}</span>
                  <span style={{ fontSize:'12px', fontWeight:'800', color:showResult.color, textAlign:'right' }}>{row.value}</span>
                </div>
              ))}
            </div>

            {/* Ghi chú */}
            <div style={{ fontSize:'12px', color:'#888', textAlign:'center', marginBottom:'20px', lineHeight:'1.5' }}>
              {showResult.note}
            </div>

            {/* Nút đóng */}
            <button
              onClick={() => { setShowResult(null); onBack() }}
              style={{ width:'100%', padding:'16px', borderRadius:'16px', background:COLORS.grad, color:'white', border:'none', fontWeight:'800', fontSize:'15px', cursor:'pointer' }}>
              Đã hiểu ✓
            </button>
          </div>
        </div>
      )}

      {/* ── MODAL VỀ SỚM ── */}
      {showVeSom && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'flex-end', zIndex:998 }}
          onClick={() => setShowVeSom(false)}>
          <div style={{ background:COLORS.bg, borderRadius:'24px 24px 0 0', width:'100%', maxWidth:'420px', margin:'0 auto', padding:'24px 20px 40px' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ fontSize:'28px', textAlign:'center', marginBottom:'8px' }}>⚠️</div>
            <h3 style={{ fontSize:'17px', fontWeight:'800', color:COLORS.text, textAlign:'center', marginBottom:'6px' }}>Về sớm hơn giờ quy định</h3>
            <p style={{ fontSize:'13px', color:COLORS.textMute, textAlign:'center', marginBottom:'20px' }}>Vui lòng nhập lý do về sớm</p>
            <textarea value={lyDoVeSom} onChange={e => setLyDoVeSom(e.target.value)}
              placeholder="Ví dụ: Có việc gia đình, được phép của quản lý..."
              style={{ width:'100%', padding:'14px', borderRadius:'12px', border:`1px solid ${COLORS.border}`, fontSize:'14px', resize:'none', height:'80px', outline:'none', boxSizing:'border-box', fontFamily:'inherit', marginBottom:'16px' }} />
            <div style={{ display:'flex', gap:'12px' }}>
              <button onClick={() => setShowVeSom(false)}
                style={{ flex:1, padding:'14px', borderRadius:'14px', background:COLORS.card, border:`1px solid ${COLORS.border}`, fontWeight:'700', cursor:'pointer' }}>
                Hủy
              </button>
              <button onClick={() => {
                if (!lyDoVeSom.trim()) { alert('Vui lòng nhập lý do!'); return }
                confirmCheckout(pendingRa, lyDoVeSom)
              }} disabled={loading}
                style={{ flex:1, padding:'14px', borderRadius:'14px', background:COLORS.grad, color:'white', border:'none', fontWeight:'800', cursor:'pointer' }}>
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ background:COLORS.grad, padding:'48px 20px 28px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
          <button onClick={onBack}
            style={{ width:'36px', height:'36px', borderRadius:'50%', background:'rgba(255,255,255,0.2)', border:'none', color:'white', fontSize:'18px', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>←</button>
          <div style={{ color:'white', fontWeight:'700', fontSize:'18px' }}>Chấm Công</div>
        </div>
      </div>

      <div style={{ padding:'24px 16px' }}>

        {/* Quy định ca */}
        <div style={{ background:'linear-gradient(135deg,#FFF9F0,#FDEBD0)', borderRadius:'20px', padding:'14px 16px', marginBottom:'16px', border:'1px solid rgba(201,169,110,0.3)' }}>
          <div style={{ fontSize:'12px', fontWeight:'700', color:'#8B6914', marginBottom:'6px' }}>📋 Quy định ca làm việc</div>
          <div style={{ display:'flex', justifyContent:'space-around' }}>
            {[
              { label:'Vào ca',   value:'09:15' },
              { label:'Ra ca',    value:'20:00' },
              { label:'Ca chuẩn',value:'10h45' },
            ].map(item => (
              <div key={item.label} style={{ textAlign:'center' }}>
                <div style={{ fontSize:'11px', color:COLORS.textMute }}>{item.label}</div>
                <div style={{ fontSize:'16px', fontWeight:'800', color:COLORS.text }}>{item.value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Thông tin giờ */}
        <div style={{ background:COLORS.card, borderRadius:'24px', padding:'24px', marginBottom:'16px', border:`1px solid ${COLORS.border}`, boxShadow:COLORS.shadow }}>
          <div style={{ display:'flex', justifyContent:'space-around', marginBottom:'16px' }}>
            <div style={{ textAlign:'center' }}>
              <div style={{ fontSize:'11px', color:COLORS.textMute, fontWeight:'600', textTransform:'uppercase', marginBottom:'6px' }}>Giờ Vào</div>
              <div style={{ fontSize:'32px', fontWeight:'800', color:chamCong?.gio_vao?'#166534':COLORS.textMute }}>{fmt(chamCong?.gio_vao)}</div>
              {chamCong?.gio_vao && (
                <div style={{ fontSize:'10px', fontWeight:'700', padding:'3px 8px', borderRadius:'6px', marginTop:'4px', display:'inline-block', background:phanLoaiVao(chamCong.gio_vao).bg, color:phanLoaiVao(chamCong.gio_vao).color }}>
                  {phanLoaiVao(chamCong.gio_vao).label}
                </div>
              )}
            </div>
            <div style={{ width:'1px', background:COLORS.border }} />
            <div style={{ textAlign:'center' }}>
              <div style={{ fontSize:'11px', color:COLORS.textMute, fontWeight:'600', textTransform:'uppercase', marginBottom:'6px' }}>Giờ Ra</div>
              <div style={{ fontSize:'32px', fontWeight:'800', color:chamCong?.gio_ra?COLORS.primary:COLORS.textMute }}>{fmt(chamCong?.gio_ra)}</div>
              {chamCong?.gio_ra && (
                <div style={{ fontSize:'10px', fontWeight:'700', padding:'3px 8px', borderRadius:'6px', marginTop:'4px', display:'inline-block', background:phanLoaiRa(chamCong.gio_ra).bg, color:phanLoaiRa(chamCong.gio_ra).color }}>
                  {phanLoaiRa(chamCong.gio_ra).label}
                </div>
              )}
            </div>
          </div>

          {/* Preview % khi đang làm */}
          {isCheckedIn && previewHeSo !== null && (
            <div style={{ background:'#F0FDF4', borderRadius:'12px', padding:'12px', textAlign:'center', marginBottom:'12px', border:'1px solid #BBF7D0' }}>
              <div style={{ fontSize:'11px', color:COLORS.textMute, marginBottom:'4px' }}>Ngày công tạm tính</div>
              <div style={{ fontSize:'28px', fontWeight:'800', color:'#166534' }}>{Math.round(previewHeSo*100)}%</div>
              <div style={{ fontSize:'11px', color:COLORS.textMute, marginTop:'2px' }}>Ra đúng 20:00 → 100%</div>
            </div>
          )}

          {/* Tổng kết sau checkout */}
          {isCheckedOut && (
            <div style={{ background:'#F8F3F0', borderRadius:'16px', padding:'16px', border:`1px solid ${COLORS.border}` }}>
              <div style={{ display:'flex', justifyContent:'space-around' }}>
                <div style={{ textAlign:'center' }}>
                  <div style={{ fontSize:'11px', color:COLORS.textMute, marginBottom:'4px' }}>Tổng giờ làm</div>
                  <div style={{ fontSize:'18px', fontWeight:'800', color:COLORS.text }}>{gioLamHom}</div>
                </div>
                <div style={{ width:'1px', background:COLORS.border }} />
                <div style={{ textAlign:'center' }}>
                  <div style={{ fontSize:'11px', color:COLORS.textMute, marginBottom:'4px' }}>Ngày công</div>
                  <div style={{ fontSize:'18px', fontWeight:'800', color: chamCong.he_so >= 1 ? '#166534' : chamCong.he_so >= 0.75 ? '#8B6914' : COLORS.chi }}>
                    {Math.round((chamCong.he_so ?? 0) * 100)}%
                  </div>
                </div>
              </div>

              {/* Trạng thái tăng ca */}
              {chamCong.trang_thai_tang_ca === 'cho_duyet' && (
                <div style={{ background:'#F3E8FF', borderRadius:'10px', padding:'10px', textAlign:'center', marginTop:'12px' }}>
                  <div style={{ fontSize:'12px', fontWeight:'700', color:'#6B21A8' }}>⏳ Tăng ca chờ Cao Quốc Nam duyệt</div>
                </div>
              )}
              {chamCong.trang_thai_tang_ca === 'da_duyet' && (
                <div style={{ background:'#DCFCE7', borderRadius:'10px', padding:'10px', textAlign:'center', marginTop:'12px' }}>
                  <div style={{ fontSize:'12px', fontWeight:'700', color:'#166534' }}>
                    ✅ Tăng ca {chamCong.tang_ca_gio}h đã duyệt • +{(chamCong.tang_ca_gio*25000).toLocaleString('vi-VN')}đ
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Nút hành động */}
        {!chamCong && (
          <button onClick={handleCheckin} disabled={loading}
            style={{ width:'100%', padding:'20px', borderRadius:'20px', background:COLORS.grad, color:'white', border:'none', fontWeight:'800', fontSize:'18px', cursor:'pointer', boxShadow:'0 6px 20px rgba(160,113,79,0.35)', opacity:loading?0.7:1 }}>
            {loading ? 'Đang xử lý...' : '👆 CHECK-IN'}
          </button>
        )}
        {isCheckedIn && (
          <button onClick={handleCheckoutRequest} disabled={loading}
            style={{ width:'100%', padding:'20px', borderRadius:'20px', background:'linear-gradient(135deg,#C0392B,#E74C3C)', color:'white', border:'none', fontWeight:'800', fontSize:'18px', cursor:'pointer', boxShadow:'0 6px 20px rgba(192,57,43,0.35)', opacity:loading?0.7:1 }}>
            {loading ? 'Đang xử lý...' : '🏁 CHECK-OUT'}
          </button>
        )}
        {isCheckedOut && (
          <div style={{ textAlign:'center', padding:'20px', color:COLORS.textMute, fontSize:'14px' }}>
            ✅ Đã hoàn thành ca làm việc hôm nay!
          </div>
        )}

        {/* Bảng quy đổi % */}
        <div style={{ background:COLORS.card, borderRadius:'16px', padding:'14px 16px', marginTop:'16px', border:`1px solid ${COLORS.border}` }}>
          <div style={{ fontSize:'11px', fontWeight:'700', color:COLORS.textMute, marginBottom:'8px', textTransform:'uppercase' }}>Cách tính ngày công</div>
          {[
            { pct:'100%', desc:'Vào ≤ 9:15 • Ra ≥ 20:00',        color:'#166534' },
            { pct:'75%',  desc:'Làm ≥ 75% ca (~8 tiếng)',         color:'#8B6914' },
            { pct:'50%',  desc:'Làm ≥ 50% ca (~5 tiếng)',         color:'#C0392B' },
            { pct:'25%',  desc:'Làm ≥ 25% ca (~2.5 tiếng)',       color:'#991B1B' },
            { pct:'0%',   desc:'Làm < 25% ca (không tính công)',   color:COLORS.textMute },
          ].map(item => (
            <div key={item.pct} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'6px 0', borderBottom:`1px solid ${COLORS.border}` }}>
              <span style={{ fontSize:'13px', fontWeight:'800', color:item.color, minWidth:'40px' }}>{item.pct}</span>
              <span style={{ fontSize:'12px', color:COLORS.textSub }}>{item.desc}</span>
            </div>
          ))}
        </div>

      </div>
    </div>
  )
}