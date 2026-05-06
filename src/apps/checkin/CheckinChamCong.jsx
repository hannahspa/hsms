import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { LUX } from '../../constants/lux'
import { todayISO } from '../../lib/utils'
import './styles.css'

const CA_VAO_CHUAN = { h: 9, m: 15 }
const CA_RA_CHUAN = { h: 20, m: 0 }
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
  const gio = Math.floor(phut / 60)
  const min = phut % 60
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
  if (tre <= 0) return { label: 'Đúng giờ', color: LUX.sage, bg: '#eef2e7', cap: 'dung_gio' }
  if (tre <= 15) return { label: `Trễ ${formatTre(tre)}`, color: '#8B6914', bg: '#FEF9E7', cap: 'tre_nhe' }
  if (tre <= 45) return { label: `Trễ ${formatTre(tre)}`, color: '#C0392B', bg: '#FEF2F2', cap: 'tre_vua' }
  return { label: `Trễ ${formatTre(tre)}`, color: '#991B1B', bg: '#FEE2E2', cap: 'tre_nang' }
}

function phanLoaiRa(gioRa) {
  const diff = toPhut(gioRa) - (CA_RA_CHUAN.h * 60 + CA_RA_CHUAN.m)
  if (diff >= 15) return { label: `Tăng ca ${formatTre(diff)}`, color: '#6B21A8', bg: '#F3E8FF', cap: 'tang_ca' }
  if (diff >= 0) return { label: 'Đúng giờ', color: LUX.sage, bg: '#eef2e7', cap: 'dung_gio' }
  if (diff >= -30) return { label: `Về sớm ${formatTre(Math.abs(diff))}`, color: '#8B6914', bg: '#FEF9E7', cap: 've_som_nhe' }
  if (diff >= -60) return { label: `Về sớm ${formatTre(Math.abs(diff))}`, color: '#C0392B', bg: '#FEF2F2', cap: 've_som_vua' }
  return { label: `Về sớm ${formatTre(Math.abs(diff))}`, color: '#991B1B', bg: '#FEE2E2', cap: 've_som_nhieu' }
}

// GPS
const SPA_COORD = { lat: 10.031917, lng: 105.785083 }
const MAX_DISTANCE_M = 50

function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3
  const phi1 = lat1 * Math.PI / 180
  const phi2 = lat2 * Math.PI / 180
  const deltaPhi = (lat2 - lat1) * Math.PI / 180
  const deltaLambda = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(deltaPhi / 2) ** 2 + Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

const HERO = {
  background: `radial-gradient(circle at 100% 0%, rgba(212,165,116,0.4), transparent 55%), linear-gradient(155deg,#4a3528 0%,#3d2c20 50%,#2e2018 100%)`,
  color: '#f5ede0', position: 'relative', overflow: 'hidden',
}

const backArrow = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
)

const infoIcon = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 7h8M8 11h8M8 15h5"/></svg>
)

export default function CheckinChamCong({ nhanVien, chamCong, onBack, onUpdated }) {
  const [loading, setLoading] = useState(false)
  const [showVeSom, setShowVeSom] = useState(false)
  const [lyDoVeSom, setLyDoVeSom] = useState('')
  const [pendingRa, setPendingRa] = useState(null)
  const [showResult, setShowResult] = useState(null)

  function getNowVN() {
    const now = new Date()
    return new Date(now.getTime() + now.getTimezoneOffset() * 60000 + 7 * 60 * 60000)
  }

  function toTimeStrVN(d) {
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`
  }

  const handleCheckin = async () => {
    if (!navigator.geolocation) {
      alert('Thiết bị của bạn không hỗ trợ định vị GPS!')
      return
    }
    setLoading(true)
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const dist = getDistance(pos.coords.latitude, pos.coords.longitude, SPA_COORD.lat, SPA_COORD.lng)
      if (dist > MAX_DISTANCE_M) {
        alert(`Bạn đang ở quá xa Spa (${Math.round(dist)}m). Vui lòng đến nơi mới được chấm công!`)
        setLoading(false)
        return
      }
      try {
        const now = getNowVN()
        const gioVao = toTimeStrVN(now)
        const info = phanLoaiVao(gioVao)
        const { error } = await supabase.from('cham_cong').insert({
          nhan_vien_id: nhanVien.id, ngay: todayISO(), gio_vao: gioVao,
          loai: 'di_lam', he_so: 0, he_so_tam: 0, tang_ca_gio: 0,
          trang_thai_tang_ca: 'khong_co', nguoi_cham: nhanVien.ho_ten,
        })
        if (error) throw error
        setShowResult({
          type: 'checkin',
          icon: info.cap === 'dung_gio' ? '✅' : '⚠️',
          title: info.cap === 'dung_gio' ? 'Check-in thành công!' : 'Đã check-in — có trễ giờ',
          color: info.color, bg: info.bg,
          rows: [
            { label: 'Giờ vào', value: gioVao.slice(0, 5) },
            { label: 'Trạng thái', value: info.label },
            { label: 'Ca chuẩn', value: '09:15 – 20:00' },
          ],
          note: info.cap !== 'dung_gio' ? 'Bạn vào trễ so với quy định. Ngày công sẽ được tính khi check-out.' : 'Chúc bạn làm việc hiệu quả!',
        })
        onUpdated()
      } catch (e) { alert('Lỗi: ' + e.message) }
      finally { setLoading(false) }
    }, (err) => {
      alert('Không thể lấy vị trí GPS: ' + err.message + '\nVui lòng bật Vị trí (Location) và cấp quyền cho trình duyệt.')
      setLoading(false)
    }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 })
  }

  const handleCheckoutRequest = () => {
    if (!navigator.geolocation) {
      alert('Thiết bị của bạn không hỗ trợ định vị GPS!')
      return
    }
    setLoading(true)
    navigator.geolocation.getCurrentPosition((pos) => {
      const dist = getDistance(pos.coords.latitude, pos.coords.longitude, SPA_COORD.lat, SPA_COORD.lng)
      if (dist > MAX_DISTANCE_M) {
        alert(`Bạn đang ở quá xa Spa (${Math.round(dist)}m). Vui lòng đến Spa mới được check-out!`)
        setLoading(false)
        return
      }
      const now = getNowVN()
      const gioRa = toTimeStrVN(now)
      const info = phanLoaiRa(gioRa)
      if (info.cap === 've_som_vua' || info.cap === 've_som_nhieu') {
        setPendingRa(gioRa)
        setShowVeSom(true)
        setLoading(false)
        return
      }
      confirmCheckout(gioRa, '')
    }, (err) => {
      alert('Không thể lấy vị trí GPS: ' + err.message + '\nVui lòng bật Vị trí (Location) và cấp quyền cho trình duyệt.')
      setLoading(false)
    }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 })
  }

  const confirmCheckout = async (gioRa, lyDo) => {
    setLoading(true)
    setShowVeSom(false)
    try {
      const gioVao = chamCong.gio_vao
      const heSo = tinhHeSo(gioVao, gioRa)
      const tangCaGio = tinhTangCa(gioRa)
      const gioLam = tinhGioLam(gioVao, gioRa)
      const infoRa = phanLoaiRa(gioRa)
      const infoVao = phanLoaiVao(gioVao)
      const trangThaiTangCa = tangCaGio > 0 ? 'cho_duyet' : 'khong_co'

      const { error } = await supabase.from('cham_cong').update({
        gio_ra: gioRa, he_so: heSo, he_so_tam: heSo, tang_ca_gio: 0,
        ly_do_ve_som: lyDo || null, trang_thai_tang_ca: trangThaiTangCa,
      }).eq('id', chamCong.id)
      if (error) throw error

      if (tangCaGio > 0) {
        await supabase.from('yeu_cau_chinh_sua').insert({
          loai_bang: 'cham_cong', ban_ghi_id: chamCong.id,
          loai_yeu_cau: 'duyet_tang_ca',
          du_lieu_cu: { tang_ca_gio: 0 }, du_lieu_moi: { tang_ca_gio: tangCaGio },
          ly_do: `${nhanVien.ho_ten} tăng ca ${tangCaGio}h — check-out lúc ${gioRa.slice(0, 5)}`,
          nguoi_yeu_cau: nhanVien.ho_ten,
        })
      }

      const rows = [
        { label: 'Giờ vào', value: `${gioVao.slice(0, 5)} — ${infoVao.label}` },
        { label: 'Giờ ra', value: `${gioRa.slice(0, 5)} — ${infoRa.label}` },
        { label: 'Giờ làm', value: gioLam },
        { label: 'Ngày công', value: `${Math.round(heSo * 100)}%` },
      ]
      if (tangCaGio > 0) rows.push({ label: 'Tăng ca', value: `${tangCaGio}h — chờ Cao Quốc Nam duyệt` })
      if (lyDo) rows.push({ label: 'Lý do về sớm', value: lyDo })

      setShowResult({
        type: 'checkout',
        icon: heSo >= 1 ? '🎉' : heSo >= 0.75 ? '✅' : heSo >= 0.5 ? '⚠️' : '❌',
        title: 'Check-out thành công!',
        color: heSo >= 1 ? LUX.sage : heSo >= 0.75 ? '#8B6914' : '#C0392B',
        bg: heSo >= 1 ? '#eef2e7' : heSo >= 0.75 ? '#FEF9E7' : '#FEF2F2',
        rows,
        note: heSo >= 1 && tangCaGio === 0 ? '100% ngày công — xuất sắc!'
          : tangCaGio > 0 ? 'Yêu cầu tăng ca đã được gửi cho Cao Quốc Nam duyệt.'
          : `Ngày công ${Math.round(heSo * 100)}% — vui lòng liên hệ quản lý nếu cần.`,
      })
      onUpdated()
    } catch (e) { alert('Lỗi: ' + e.message) }
    finally { setLoading(false) }
  }

  const fmt = (t) => t?.slice(0, 5) || '--:--'
  const isCheckedIn = chamCong?.gio_vao && !chamCong?.gio_ra
  const isCheckedOut = chamCong?.gio_vao && chamCong?.gio_ra
  const gioLamHom = isCheckedOut ? tinhGioLam(chamCong.gio_vao, chamCong.gio_ra) : null

  return (
    <div style={{ minHeight: '100vh', background: LUX.bg, fontFamily: LUX.fontSans }}>

      {/* ── POPUP KẾT QUẢ ── */}
      {showResult && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999, padding: 20 }}>
          <div style={{ background: LUX.surface2, borderRadius: 28, padding: '28px 24px', width: '100%', maxWidth: 360, boxShadow: LUX.shadowLg }}>
            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              <div style={{ fontSize: 56, marginBottom: 8 }}>{showResult.icon}</div>
              <div style={{ fontFamily: LUX.fontSerif, fontSize: 20, fontWeight: 600, color: showResult.color }}>{showResult.title}</div>
            </div>

            <div style={{ background: showResult.bg, borderRadius: 16, padding: 16, marginBottom: 16 }}>
              {showResult.rows.map((row, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '6px 0', borderBottom: i < showResult.rows.length - 1 ? '1px solid rgba(0,0,0,0.06)' : 'none' }}>
                  <span style={{ fontSize: 12, color: LUX.ink3, fontWeight: 600, flexShrink: 0, marginRight: 8 }}>{row.label}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: showResult.color, textAlign: 'right' }}>{row.value}</span>
                </div>
              ))}
            </div>

            <div style={{ fontSize: 12, color: LUX.ink3, textAlign: 'center', marginBottom: 20, lineHeight: 1.5 }}>
              {showResult.note}
            </div>

            <button onClick={() => { setShowResult(null); onBack() }}
              style={{ width: '100%', padding: 16, borderRadius: 16, background: `linear-gradient(135deg, ${LUX.champagne}, ${LUX.taupe})`, color: '#fff', border: 'none', fontFamily: LUX.fontSerif, fontWeight: 600, fontSize: 15, cursor: 'pointer', letterSpacing: '0.04em' }}>
              Đã hiểu
            </button>
          </div>
        </div>
      )}

      {/* ── MODAL VỀ SỚM ── */}
      {showVeSom && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-end', zIndex: 998 }} onClick={() => setShowVeSom(false)}>
          <div style={{ background: LUX.surface, borderRadius: '24px 24px 0 0', width: '100%', maxWidth: 420, margin: '0 auto', padding: '24px 20px 40px' }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 28, textAlign: 'center', marginBottom: 8 }}>⚠️</div>
            <h3 style={{ fontFamily: LUX.fontSerif, fontSize: 18, fontWeight: 600, color: LUX.espresso, textAlign: 'center', margin: '0 0 6px' }}>Về sớm hơn giờ quy định</h3>
            <p style={{ fontSize: 13, color: LUX.ink3, textAlign: 'center', marginBottom: 20 }}>Vui lòng nhập lý do về sớm</p>
            <textarea value={lyDoVeSom} onChange={e => setLyDoVeSom(e.target.value)}
              placeholder="Ví dụ: Có việc gia đình, được phép của quản lý..."
              style={{ width: '100%', padding: 14, borderRadius: 12, border: `1px solid ${LUX.line}`, fontSize: 14, resize: 'none', height: 80, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', marginBottom: 16 }} />
            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={() => setShowVeSom(false)}
                style={{ flex: 1, padding: 14, borderRadius: 14, background: LUX.surface2, border: `1px solid ${LUX.line}`, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', color: LUX.ink }}>
                Hủy
              </button>
              <button onClick={() => {
                if (!lyDoVeSom.trim()) { alert('Vui lòng nhập lý do!'); return }
                confirmCheckout(pendingRa, lyDoVeSom)
              }} disabled={loading}
                style={{ flex: 1, padding: 14, borderRadius: 14, background: `linear-gradient(135deg, ${LUX.champagne}, ${LUX.taupe})`, color: '#fff', border: 'none', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', opacity: loading ? 0.7 : 1 }}>
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── HEADER ── */}
      <header style={{ ...HERO, padding: '20px 22px 28px', display: 'flex', alignItems: 'center', gap: 14 }}>
        <button onClick={onBack} style={{
          width: 38, height: 38, borderRadius: '50%', background: 'rgba(255,255,255,0.10)',
          border: '1px solid rgba(245,237,224,0.18)', color: '#f5ede0',
          display: 'grid', placeItems: 'center', cursor: 'pointer',
          backdropFilter: 'blur(8px)', transition: 'all 0.25s',
        }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.18)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.10)'}
        >
          {backArrow}
        </button>
        <div>
          <div style={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(245,237,224,0.55)', marginBottom: 4 }}>Hannah Spa</div>
          <h2 style={{ fontFamily: LUX.fontSerif, fontSize: 26, fontWeight: 600, margin: 0, lineHeight: 1, letterSpacing: '-0.01em' }}>Chấm công</h2>
        </div>
      </header>

      <div style={{ padding: '0 16px 40px' }} className="stagger">

        {/* ── Info Card ── */}
        <div />
        <div style={{
          margin: '-14px 0 0', background: 'linear-gradient(180deg,#fdf3e0,#f9ead0)',
          borderRadius: LUX.radius, border: '1px solid #ecd9b3', padding: '16px 18px', boxShadow: LUX.shadow,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 600, color: LUX.espresso, letterSpacing: '0.04em', marginBottom: 12 }}>
            <span style={{ color: LUX.taupe }}>{infoIcon}</span>
            Quy định ca làm việc
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, textAlign: 'center' }}>
            {[
              { label: 'Vào ca', value: '09:15' },
              { label: 'Ra ca', value: '20:00' },
              { label: 'Ca chuẩn', value: '10h45' },
            ].map(item => (
              <div key={item.label}>
                <div style={{ fontFamily: LUX.fontSerif, fontSize: 22, fontWeight: 600, color: LUX.espresso, lineHeight: 1 }}>{item.value}</div>
                <div style={{ fontSize: 10, letterSpacing: '0.10em', textTransform: 'uppercase', color: LUX.ink3, marginTop: 4 }}>{item.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Time Pair ── */}
        <div style={{
          marginTop: 12, background: LUX.surface2, border: `1px solid ${LUX.line}`,
          borderRadius: LUX.radius, padding: 18,
          display: 'grid', gridTemplateColumns: '1fr 1px 1fr', gap: 16, alignItems: 'center',
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: LUX.ink3, fontWeight: 600 }}>Giờ vào</div>
            <div style={{ fontFamily: LUX.fontSerif, fontSize: 32, fontWeight: 600, color: chamCong?.gio_vao ? LUX.sage : LUX.ink4, marginTop: 8 }}>
              {fmt(chamCong?.gio_vao)}
            </div>
            {chamCong?.gio_vao && (
              <div style={{ fontSize: 10, fontWeight: 600, padding: '3px 8px', borderRadius: 6, marginTop: 4, display: 'inline-block', background: phanLoaiVao(chamCong.gio_vao).bg, color: phanLoaiVao(chamCong.gio_vao).color }}>
                {phanLoaiVao(chamCong.gio_vao).label}
              </div>
            )}
          </div>
          <div style={{ background: LUX.line, height: 60 }} />
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: LUX.ink3, fontWeight: 600 }}>Giờ ra</div>
            <div style={{ fontFamily: LUX.fontSerif, fontSize: 32, fontWeight: 600, color: chamCong?.gio_ra ? LUX.taupe : LUX.ink4, marginTop: 8 }}>
              {fmt(chamCong?.gio_ra)}
            </div>
            {chamCong?.gio_ra && (
              <div style={{ fontSize: 10, fontWeight: 600, padding: '3px 8px', borderRadius: 6, marginTop: 4, display: 'inline-block', background: phanLoaiRa(chamCong.gio_ra).bg, color: phanLoaiRa(chamCong.gio_ra).color }}>
                {phanLoaiRa(chamCong.gio_ra).label}
              </div>
            )}
          </div>
        </div>

        {/* ── Button ── */}
        <div style={{ marginTop: 14 }}>
          {!chamCong && (
            <button onClick={handleCheckin} disabled={loading} className="btn-shimmer ripple"
              style={{
                width: '100%', padding: 16, borderRadius: 14, border: 'none', cursor: 'pointer',
                background: 'linear-gradient(180deg,#d4a574,#a07a4a)',
                color: '#fdf6e8', fontFamily: LUX.fontSerif, fontWeight: 600, fontSize: 15,
                letterSpacing: '0.04em', opacity: loading ? 0.7 : 1,
                boxShadow: '0 8px 24px -8px rgba(160,122,74,0.55), inset 0 1px 0 rgba(255,255,255,0.3)',
              }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3 8-8"/><path d="M20 12v6a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h9"/></svg>
                {loading ? 'Đang xử lý...' : 'CHECK-IN'}
              </span>
            </button>
          )}
          {isCheckedIn && (
            <button onClick={handleCheckoutRequest} disabled={loading} className="btn-shimmer ripple"
              style={{
                width: '100%', padding: 16, borderRadius: 14, border: 'none', cursor: 'pointer',
                background: 'linear-gradient(180deg,#c06050,#8a3a2a)',
                color: '#fdf6e8', fontFamily: LUX.fontSerif, fontWeight: 600, fontSize: 15,
                letterSpacing: '0.04em', opacity: loading ? 0.7 : 1,
                boxShadow: '0 8px 24px -8px rgba(192,96,80,0.45), inset 0 1px 0 rgba(255,255,255,0.3)',
              }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3 8-8"/><path d="M20 12v6a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h9"/></svg>
                {loading ? 'Đang xử lý...' : 'CHECK-OUT'}
              </span>
            </button>
          )}
          {isCheckedOut && (
            <div style={{ textAlign: 'center', padding: 20, color: LUX.ink3, fontFamily: LUX.fontSerif, fontSize: 16 }}>
              Đã hoàn thành ca làm việc hôm nay!
            </div>
          )}
        </div>

        {/* ── Rules Card ── */}
        <div style={{ marginTop: 16, background: LUX.surface2, border: `1px solid ${LUX.line}`, borderRadius: LUX.radius, padding: 18 }}>
          <div style={{ fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: LUX.ink3, fontWeight: 600, marginBottom: 14 }}>Cách tính ngày công</div>
          {[
            { pct: '100%', desc: 'Vào ≤ 9:15 · Ra ≥ 20:00', sub: 'Đủ ca chuẩn', color: LUX.sage },
            { pct: '75%', desc: 'Làm ≥ 75% ca', sub: 'Khoảng 8 tiếng', color: LUX.gold },
            { pct: '50%', desc: 'Làm ≥ 50% ca', sub: 'Khoảng 5 tiếng', color: '#d4924a' },
            { pct: '25%', desc: 'Làm ≥ 25% ca', sub: 'Khoảng 2.5 tiếng', color: LUX.rose },
            { pct: '0%', desc: 'Làm &lt; 25% ca', sub: 'Không tính công', color: LUX.ink3 },
          ].map((item, i) => (
            <div key={item.pct} style={{ display: 'grid', gridTemplateColumns: '56px 1fr', alignItems: 'center', gap: 12, padding: '10px 0', borderTop: i === 0 ? 'none' : `1px solid ${LUX.line}` }}>
              <div style={{ fontFamily: LUX.fontSerif, fontSize: 22, fontWeight: 600, lineHeight: 1, color: item.color }}>{item.pct}</div>
              <div>
                <div style={{ fontSize: 13, color: LUX.ink2 }}>{item.desc}</div>
                <div style={{ fontSize: 11, color: LUX.ink3, marginTop: 2 }}>{item.sub}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
