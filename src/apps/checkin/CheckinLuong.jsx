import { useState, useEffect, useCallback } from 'react'
import { checkinApi } from './checkinApi'
import { LUX } from '../../constants/lux'
import { formatCurrency, getNowVN } from '../../lib/utils'
import { tinhLuong, getDaysInMonth } from '../../lib/luong'
import './styles.css'

const TRANG_THAI_LABEL = {
  chua_tinh: { label: 'Dự Kiến', color: '#B8A898', bg: '#F9F6F3' },
  da_tinh: { label: 'Đã Tính', color: '#1E40AF', bg: '#EFF6FF' },
  da_chot: { label: 'Đã Chốt', color: '#166534', bg: '#DCFCE7' },
}

const HERO = {
  background: `radial-gradient(circle at 100% 0%, rgba(212,165,116,0.4), transparent 55%), linear-gradient(155deg,#4a3528 0%,#3d2c20 50%,#2e2018 100%)`,
  color: '#f5ede0', position: 'relative', overflow: 'hidden',
}

const backArrow = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
)

export default function CheckinLuong({ nhanVien, onBack }) {
  const now = getNowVN()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [requesting, setRequesting] = useState(false)
  const [requestSent, setRequestSent] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`
    const endDate = `${year}-${String(month).padStart(2, '0')}-${String(getDaysInMonth(year, month)).padStart(2, '0')}`

    const isLeTanNv = nhanVien.vi_tri === 'le_tan'
    // 1 RPC an toàn: trả dữ liệu lương CỦA CHÍNH NV (server không lộ của người khác).
    // Bọc lại thành các *Res.data để giữ nguyên toàn bộ logic tính lương phía dưới.
    const _d = await checkinApi.luong(month, year)
    const ccRes  = { data: _d?.cham_cong || [] }
    const blRes  = { data: _d?.bang_luong || null }
    const quyRes = { data: _d?.quy_ngay_off || null }
    const thuNhapRes = { data: _d?.pos_thu_nhap || [] }
    const detailRes  = { data: (_d?.chi_tiet || []).map(r => ({
      id: r.id, thanh_tien: r.thanh_tien, tien_tour: r.tien_tour, tien_hoa_hong: r.tien_hoa_hong,
      ti_le_hoa_hong: r.ti_le_hoa_hong, loai_item: r.loai_item,
      dich_vu: r.ten ? { ten: r.ten } : null, san_pham: null, the_lieu_trinh: null,
      don_hang: { ngay: r.ngay, ma_don: r.ma_don, trang_thai: r.trang_thai, khach_hang: { ho_ten: r.khach } },
    })) }
    const kdSumRes = { data: _d?.letan_kd || null }
    const leTanRes = { data: _d?.letan_ids || [] }
    const kdDetail = (detailRes.data || [])
      .filter(r => (r.tien_tour || 0) > 0 || (r.tien_hoa_hong || 0) > 0)
      .sort((a, b) => String(a.don_hang?.ngay).localeCompare(String(b.don_hang?.ngay)))

    const quy = quyRes.data
    const bl  = blRes.data

    // Tổng hợp thu nhập POS real-time
    const posRows = thuNhapRes.data || []
    const posTour    = posRows.filter(r => r.loai === 'tour').reduce((s, r) => s + (r.so_tien || 0), 0)
    const posHoaHong = posRows.filter(r => r.loai === 'hoa_hong').reduce((s, r) => s + (r.so_tien || 0), 0)

    // ── Lễ Tân: Lương KD theo CÔNG THỨC doanh số (không phải tour thật) ──
    let luongKDLeTan = 0
    if (isLeTanNv) {
      const kd = kdSumRes.data || { tong_dt: 0, dt_my_pham: 0, doanh_so: [] }
      const leTanIds = new Set((leTanRes.data || []).map(r => r.id))
      const dsMap = {}; (kd.doanh_so || []).forEach(x => { if (x?.nv) dsMap[x.nv] = x.ds || 0 })
      const dsLeTanTong = [...leTanIds].reduce((s, id) => s + (dsMap[id] || 0), 0)
      const coSo1 = Math.max(0, 150000000 - dsLeTanTong - (kd.dt_my_pham || 0))
      luongKDLeTan = Math.round(coSo1 * 0.01) + Math.round(Math.max(0, (kd.tong_dt || 0) - 150000000) * 0.015)
    }

    // Nếu Kỳ 2 đã chốt → dùng snapshot bang_luong, chưa chốt → real-time.
    // Lễ Tân: tien_tour = LƯƠNG KD công thức; KTV: tien_tour = tour thật từ POS.
    const isLKDChot = ['da_chot', 'da_phat_luong'].includes(bl?.trang_thai_lkd || '')
    const tienTourEff  = isLKDChot ? (bl?.tien_tour || 0) : (isLeTanNv ? luongKDLeTan : posTour)
    const hoaHongDVEff = isLKDChot ? (bl?.hoa_hong_dv || 0) : posHoaHong

    // Truyền POS data vào tinhLuong qua bangLuongRow
    const blForCalc = bl
      ? { ...bl, tien_tour: tienTourEff, hoa_hong_dv: hoaHongDVEff }
      : { tien_tour: tienTourEff, hoa_hong_dv: hoaHongDVEff }

    // For current month: cap at today for real-time
    const nowRef = getNowVN()
    const isCurrent = month === nowRef.getMonth() + 1 && year === nowRef.getFullYear()
    const todayRef = isCurrent ? nowRef.getDate() : null
    const calc = tinhLuong(nhanVien, ccRes.data || [], [], blForCalc, year, month, {
      so_da_tich_luy: quy?.so_ngay_tich || 0,
      so_da_dung: quy?.so_ngay_da_dung || 0,
      so_dung_thang_nay: quy?.so_dung_thang_nay || 0,
      lich_su_dung: quy?.lich_su_dung || [],
    }, todayRef)

    // ── Hỗ trợ làm tròn — CHỈ Khánh Duy (T5/2026 lên 8tr, từ T6/2026 lên 9tr) ──
    let hoTro = 0
    if (isLKDChot) {
      hoTro = bl?.ho_tro || 0
    } else if (nhanVien.ho_ten.includes('Khánh Duy')) {
      const nguongBu = (year > 2026 || (year === 2026 && month >= 6)) ? 9000000 : 8000000
      const tongLC = calc.luongCoBan + calc.tienTangCa - calc.tienPhat - calc.truKyQuy - calc.truUngLuong
      const tongKD = hoaHongDVEff + tienTourEff + (calc.thuongDatDoanhSo || 0)
      hoTro = (tongLC + tongKD) < nguongBu ? nguongBu - (tongLC + tongKD) : 0
    }

    setData({
      calc,
      official: bl || null,
      trangThaiLC: bl?.trang_thai_lc || bl?.trang_thai || 'chua_tinh',
      trangThaiLKD: bl?.trang_thai_lkd || 'chua_tinh',
      quyNgayOff: quy || null,
      kdDetail,
      hoTro,
    })
    setLoading(false)
  }, [year, month, nhanVien.id])

  useEffect(() => { loadData() }, [loadData])

  const prevMonth = () => { if (month === 1) { setYear(y => y - 1); setMonth(12) } else setMonth(m => m - 1) }
  const nextMonth = () => {
    const vn = getNowVN()
    if (year === vn.getFullYear() && month === vn.getMonth() + 1) return
    if (month === 12) { setYear(y => y + 1); setMonth(1) } else setMonth(m => m + 1)
  }

  const handleRequestDungNgayLe = async () => {
    if (requesting || requestSent || !data) return
    // ovCanBu = TỔNG TRỌNG SỐ ngày OFF vượt chưa bù (T7/CN tính 2) → đúng số quỹ cần
    const ovCanBu = (data.calc.ngayVuotChuaBu || []).reduce((s, x) => s + (x.trong_so || 0), 0)
    const conLai = data.calc.soNgayLeTichLuy - data.calc.soNgayLeDaDung
    const soNgayMuonDung = Math.min(ovCanBu, conLai)

    if (soNgayMuonDung <= 0) return

    setRequesting(true)
    try {
      const res = await checkinApi.xinDungNgayLe({ soNgay: soNgayMuonDung, ov: ovCanBu, thang: month, nam: year })
      // success = true cho cả tạo mới lẫn 'already' (đã gửi trước đó) — giữ
      // trạng thái "đã gửi" BỀN, không reset sau 5s để NV không bấm lại tạo trùng.
      if (res?.success) setRequestSent(true)
    } catch { /* phiên hết hạn */ }
    setRequesting(false)
  }

  const c = data?.calc
  const bl = data?.official
  const stLC = TRANG_THAI_LABEL[data?.trangThaiLC] || TRANG_THAI_LABEL.chua_tinh
  const stLKD = TRANG_THAI_LABEL[data?.trangThaiLKD] || TRANG_THAI_LABEL.chua_tinh

  const showLC = c ? ((bl && bl.trang_thai_lc && bl.trang_thai_lc !== 'chua_tinh')
    ? { luongCoBan: bl.luong_co_ban, tienTangCa: bl.tien_tang_ca, tienPhat: bl.tien_phat, truKyQuy: bl.tru_ky_quy, truUngLuong: bl.tru_ung_luong }
    : { luongCoBan: c.luongCoBan, tienTangCa: c.tienTangCa, tienPhat: c.tienPhat, truKyQuy: c.truKyQuy, truUngLuong: c.truUngLuong })
    : { luongCoBan: 0, tienTangCa: 0, tienPhat: 0, truKyQuy: 0, truUngLuong: 0 }

  const tongKy1 = showLC.luongCoBan + showLC.tienTangCa - showLC.tienPhat - showLC.truKyQuy - showLC.truUngLuong

  const showLKD = c ? ((bl && bl.trang_thai_lkd && bl.trang_thai_lkd !== 'chua_tinh')
    ? { hoaHongDV: bl.hoa_hong_dv || 0, tienTour: bl.tien_tour || 0, thuongDS: bl.hoa_hong_the || 0 }
    : { hoaHongDV: c.hoaHongDV || 0, tienTour: c.tienTour || 0, thuongDS: c.thuongDatDoanhSo || 0 })
    : { hoaHongDV: 0, tienTour: 0, thuongDS: 0 }

  const hoTro = data?.hoTro || 0
  const tongKy2 = showLKD.hoaHongDV + showLKD.tienTour + showLKD.thuongDS + hoTro
  const tongLinh = tongKy1 + tongKy2

  return (
    <div style={{ minHeight: '100vh', background: LUX.bg, fontFamily: LUX.fontSans, paddingBottom: 40 }}>

      {/* Header */}
      <header style={{ ...HERO, padding: '20px 22px 28px', display: 'flex', alignItems: 'center', gap: 14 }}>
        <button onClick={onBack} style={{
          width: 38, height: 38, borderRadius: '50%', background: 'rgba(255,255,255,0.10)',
          border: '1px solid rgba(245,237,224,0.18)', color: '#f5ede0',
          display: 'grid', placeItems: 'center', cursor: 'pointer', backdropFilter: 'blur(8px)',
        }}>
          {backArrow}
        </button>
        <div>
          <div style={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(245,237,224,0.55)', marginBottom: 4 }}>Hannah Spa</div>
          <h2 style={{ fontFamily: LUX.fontSerif, fontSize: 26, fontWeight: 600, margin: 0, lineHeight: 1, letterSpacing: '-0.01em' }}>Lương tháng</h2>
        </div>
      </header>

      <div style={{ padding: '0 18px' }} className="stagger">

        {/* Month selector */}
        <div />
        <div style={{ margin: '-16px 0 0', background: LUX.surface2, border: `1px solid ${LUX.line}`, borderRadius: LUX.radius, padding: '14px 18px', boxShadow: LUX.shadow, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button onClick={prevMonth} style={{ width: 32, height: 32, borderRadius: '50%', background: LUX.surface, border: `1px solid ${LUX.line}`, cursor: 'pointer', color: LUX.ink2, display: 'grid', placeItems: 'center' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: LUX.fontSerif, fontSize: 20, fontWeight: 600, color: LUX.espresso, lineHeight: 1 }}>
              Tháng {month}/{year}
            </div>
            {c && (
              <div style={{ fontSize: 10, letterSpacing: '0.10em', textTransform: 'uppercase', color: LUX.ink3, marginTop: 4 }}>
                Giới hạn {nhanVien.gioi_han_off_thang || 3} ngày OFF có lương/tháng
              </div>
            )}
          </div>
          <button onClick={nextMonth} style={{ width: 32, height: 32, borderRadius: '50%', background: LUX.surface, border: `1px solid ${LUX.line}`, cursor: 'pointer', color: LUX.ink2, display: 'grid', placeItems: 'center' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: LUX.ink3 }}>Đang tải...</div>
        ) : c && (
          <>
            {/* ── Salary Hero Card ── */}
            <div style={{
              marginTop: 12, borderRadius: LUX.radiusLg, padding: '24px 22px', color: '#f5ede0',
              background: `radial-gradient(circle at 100% 100%, rgba(212,165,116,0.45), transparent 60%), linear-gradient(155deg,#4a3528 0%,#3d2c20 100%)`,
              position: 'relative', overflow: 'hidden',
            }}>
              {/* Background decoration */}
              <div style={{ position: 'absolute', bottom: -60, right: -10, fontSize: 200, fontFamily: LUX.fontSerif, fontWeight: 600, color: 'rgba(212,165,116,0.08)', lineHeight: 1 }}>$</div>

              <div style={{ position: 'relative' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <div style={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(245,237,224,0.6)', fontWeight: 500 }}>
                    {bl ? 'Tổng thực nhận' : 'Dự kiến nhận'}
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <div style={{ background: stLC.bg, color: stLC.color, padding: '4px 10px', borderRadius: 999, fontSize: 10, fontWeight: 600 }}>
                      Kỳ 1 · {stLC.label}
                    </div>
                    <div style={{ background: stLKD.bg, color: stLKD.color, padding: '4px 10px', borderRadius: 999, fontSize: 10, fontWeight: 600 }}>
                      Kỳ 2 · {stLKD.label}
                    </div>
                  </div>
                </div>

                <div style={{ fontFamily: LUX.fontSerif, fontSize: 48, fontWeight: 600, lineHeight: 1, margin: '4px 0 18px', letterSpacing: '-0.01em' }}>
                  {formatCurrency(tongLinh)}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
                  {[
                    { label: 'Ngày Công', value: c.ngayCong.toFixed(1), sub: `/${c.soNgayThang} ngày` },
                    { label: 'Đi Làm', value: c.soNgayDiLam, sub: 'buổi' },
                    { label: 'Tăng Ca', value: c.tongTangCa.toFixed(1), sub: 'giờ' },
                  ].map(item => (
                    <div key={item.label} style={{ background: 'rgba(245,237,224,0.10)', border: '1px solid rgba(245,237,224,0.12)', borderRadius: 14, padding: '12px 10px', textAlign: 'center', backdropFilter: 'blur(8px)' }}>
                      <div style={{ fontFamily: LUX.fontSerif, fontSize: 22, fontWeight: 600, lineHeight: 1 }}>
                        {item.value}<span style={{ fontSize: 11, opacity: 0.7, fontWeight: 500 }}>{item.sub}</span>
                      </div>
                      <div style={{ fontSize: 10, letterSpacing: '0.10em', textTransform: 'uppercase', opacity: 0.6, marginTop: 4 }}>{item.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ── OFF Summary ── */}
            <div style={{ marginTop: 12, background: LUX.surface2, border: `1px solid ${LUX.line}`, borderRadius: LUX.radius, padding: 18 }}>
              <h3 style={{ fontFamily: LUX.fontSerif, fontSize: 18, fontWeight: 600, margin: '0 0 12px', color: LUX.espresso }}>Tổng Hợp Công Tháng</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {[
                  { icon: '✅', label: 'Ngày Công Thực Tế', value: `${c.ngayCong.toFixed(1)} ngày`, color: LUX.sage },
                  { icon: '⏰', label: 'Tăng Ca', value: `${c.tongTangCa.toFixed(2)} giờ`, color: '#1A5276' },
                  { icon: '🏢', label: 'Số Ngày Đi Làm', value: `${c.soNgayDiLam} buổi`, color: LUX.taupe },
                  { icon: '🌸', label: 'OFF Có Lương', value: `${c.soOffCoLuong}/${nhanVien.gioi_han_off_thang || 3} ngày`, color: '#1E40AF' },
                  { icon: '🚫', label: 'OFF Vượt / OV', value: `${c.soOffPhepVuot + c.soOffOV} ngày`, color: (c.soOffPhepVuot + c.soOffOV) > 0 ? LUX.danger : LUX.ink3 },
                  { icon: '🌙', label: 'OFF T7 / CN', value: `${c.soOffT7CN} ngày`, color: '#8B6914' },
                  ...(c.soPhamT7X > 0 ? [{ icon: '❌', label: 'Vi Phạm T7/CN', value: `${c.soPhamT7X} ngày`, color: '#991B1B' }] : []),
                ].map((item, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px', background: LUX.surface, borderRadius: 12 }}>
                    <div style={{ width: 30, height: 30, borderRadius: 9, display: 'grid', placeItems: 'center', background: LUX.surface2, color: item.color, fontSize: 14, flexShrink: 0 }}>{item.icon}</div>
                    <div>
                      <div style={{ fontSize: 10, letterSpacing: '0.06em', color: LUX.ink3 }}>{item.label}</div>
                      <div style={{ fontFamily: LUX.fontSerif, fontSize: 16, fontWeight: 600, color: item.color, lineHeight: 1, marginTop: 2 }}>{item.value}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Holiday credit */}
              <div style={{ marginTop: 12, background: 'linear-gradient(180deg,#fdf3e0,#f9ead0)', border: '1px solid #ecd9b3', borderRadius: 12, padding: '12px 14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: LUX.espresso, marginBottom: 6 }}>
                  🎉 Ngày Lễ Tích Luỹ
                </div>
                <div style={{ display: 'flex', gap: 16, fontSize: 11, color: LUX.ink2 }}>
                  <span>Đã tích: <b>{c.soNgayLeTichLuy}</b> ngày</span>
                  <span>Đã dùng: <b>{c.soNgayLeDaDung}</b> ngày</span>
                  <span>Còn lại: <b>{c.soNgayLeTichLuy - c.soNgayLeDaDung}</b> ngày</span>
                </div>
                {c.soNgayLeDungThangNay > 0 && (
                  <div style={{ marginTop: 6, fontSize: 11, color: LUX.sage, fontWeight: 600 }}>
                    Tháng này đã dùng {c.soNgayLeDungThangNay} ngày lễ tích luỹ để bù OV
                  </div>
                )}

                {/* Xin dùng quỹ ngày lễ bù OFF vượt → tạo yêu cầu, admin duyệt */}
                {(() => {
                  // ovCanBu = TỔNG TRỌNG SỐ ngày OFF vượt chưa bù (T7/CN = 2 quỹ/ngày)
                  const ovCanBu = (c.ngayVuotChuaBu || []).reduce((s, x) => s + (x.trong_so || 0), 0)
                  const coT7CN = (c.ngayVuotChuaBu || []).some(x => (x.trong_so || 0) >= 2)
                  const conLai = c.soNgayLeTichLuy - c.soNgayLeDaDung
                  const soNgayMuonDung = Math.min(ovCanBu, conLai)
                  if (soNgayMuonDung <= 0) return null
                  return (
                    <div style={{ marginTop: 10, padding: '12px 14px', borderRadius: 10, background: '#fff', border: '1px dashed #C9A96E', fontFamily: LUX.fontSans, fontSize: 12, color: '#7a5520', lineHeight: 1.45 }}>
                      💬 Bạn còn <b>{conLai}</b> ngày quỹ lễ & cần <b>{ovCanBu}</b> ngày quỹ để bù OFF vượt tháng này.
                      {coT7CN && <span style={{ display: 'block', marginTop: 4, color: '#a83c28', fontWeight: 600 }}>⚠️ Có ngày OFF T7/CN — mỗi ngày tốn 2 ngày quỹ để bù.</span>}
                      Gửi yêu cầu dùng <b>{soNgayMuonDung}</b> ngày quỹ để bù — quản lý sẽ duyệt.
                      {requestSent ? (
                        <div style={{ marginTop: 10, padding: '9px 12px', borderRadius: 9, background: '#DCFCE7', color: '#166534', fontWeight: 600, textAlign: 'center' }}>
                          ✓ Đã gửi yêu cầu — chờ quản lý duyệt
                        </div>
                      ) : (
                        <button
                          onClick={handleRequestDungNgayLe}
                          disabled={requesting}
                          style={{
                            marginTop: 10, width: '100%', padding: '11px 16px', borderRadius: 10, border: 'none',
                            background: requesting ? '#d8c3a0' : 'linear-gradient(135deg,#c9a96e,#a87f4f)',
                            color: '#fff', fontFamily: LUX.fontSans, fontSize: 13, fontWeight: 700,
                            cursor: requesting ? 'default' : 'pointer', letterSpacing: '0.02em',
                          }}>
                          {requesting ? 'Đang gửi...' : `Xin dùng ${soNgayMuonDung} ngày quỹ lễ bù OFF vượt`}
                        </button>
                      )}
                    </div>
                  )
                })()}
              </div>
            </div>

            {/* ── Kỳ 1 · Lương Cứng ── */}
            <div style={{ marginTop: 12, background: LUX.surface2, border: `1px solid ${LUX.line}`, borderRadius: LUX.radius, overflow: 'hidden' }}>
              <div style={{ padding: '12px 18px', borderBottom: `1px solid ${LUX.line}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 18 }}>💰</span>
                  <span style={{ fontFamily: LUX.fontSerif, fontSize: 18, fontWeight: 600, color: LUX.espresso }}>Kỳ 1 · Lương Cứng</span>
                </div>
                <span style={{ background: stLC.bg, color: stLC.color, padding: '4px 10px', borderRadius: 999, fontSize: 10, fontWeight: 600 }}>{stLC.label}</span>
              </div>
              <div style={{ padding: '4px 18px' }}>
                {[
                  { icon: '📅', label: 'Lương cơ bản', note: `${nhanVien.luong_cung?.toLocaleString('vi-VN')}₫ ÷ ${c.soNgayThang} × ${c.ngayCong.toFixed(1)} ngày`, value: showLC.luongCoBan, plus: true },
                  { icon: '⏰', label: 'Tăng ca', note: `${c.tongTangCa.toFixed(2)} giờ × 25.000₫`, value: showLC.tienTangCa, plus: true, hide: !showLC.tienTangCa },
                  { icon: '⚠️', label: 'Phạt nghỉ T7/CN không phép', note: `${c.soPhamT7X} ngày × (T7: -300k, CN: -500k)`, value: showLC.tienPhat, plus: false, hide: !showLC.tienPhat },
                  { icon: '🔒', label: 'Trừ ký quỹ', note: nhanVien.ky_quy_trang_thai === 'dang_dong' ? 'Đang đóng (500k/tháng)' : 'Đã hoàn tất', value: showLC.truKyQuy, plus: false, hide: !showLC.truKyQuy },
                  { icon: '💳', label: 'Trừ ứng lương tháng trước', note: 'Hoàn trả ứng lương', value: showLC.truUngLuong, plus: false, hide: !showLC.truUngLuong },
                ].filter(item => !item.hide).map((item, i) => (
                  <div key={item.label} style={{ display: 'grid', gridTemplateColumns: '38px 1fr auto', gap: 12, alignItems: 'center', padding: '14px 0', borderTop: i === 0 ? 'none' : `1px solid ${LUX.line}` }}>
                    <div style={{ width: 38, height: 38, borderRadius: 11, background: LUX.surface, color: LUX.taupe, display: 'grid', placeItems: 'center', fontSize: 16 }}>{item.icon}</div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: LUX.espresso, lineHeight: 1.1 }}>{item.label}</div>
                      <div style={{ fontFamily: LUX.fontMono, fontSize: 10, color: LUX.ink3, marginTop: 4 }}>{item.note}</div>
                    </div>
                    <div style={{ fontFamily: LUX.fontSerif, fontSize: 18, fontWeight: 600, color: item.plus ? LUX.sage : item.value > 0 ? LUX.rose : LUX.ink3 }}>
                      {item.plus ? '+' : item.value > 0 ? '−' : ''}{formatCurrency(item.value)}
                    </div>
                  </div>
                ))}
                <div style={{ borderTop: `1.5px solid ${LUX.line}`, padding: '16px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontFamily: LUX.fontSerif, fontSize: 16, fontWeight: 600, color: LUX.espresso }}>Kỳ 1</span>
                  <span style={{ fontFamily: LUX.fontSerif, fontSize: 24, fontWeight: 700, color: LUX.espresso }}>{formatCurrency(tongKy1)}</span>
                </div>
              </div>
            </div>

            {/* ── Kỳ 2 · Lương Kinh Doanh ── */}
            <div style={{ marginTop: 10, background: LUX.surface2, border: `1px solid ${LUX.line}`, borderRadius: LUX.radius, overflow: 'hidden' }}>
              <div style={{ padding: '12px 18px', borderBottom: `1px solid ${LUX.line}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 18 }}>📊</span>
                  <span style={{ fontFamily: LUX.fontSerif, fontSize: 18, fontWeight: 600, color: LUX.espresso }}>Kỳ 2 · Lương Kinh Doanh</span>
                </div>
                <span style={{ background: stLKD.bg, color: stLKD.color, padding: '4px 10px', borderRadius: 999, fontSize: 10, fontWeight: 600 }}>{stLKD.label}</span>
              </div>
              <div style={{ padding: '4px 18px' }}>
                {(() => {
                  const isLeTan = nhanVien.vi_tri === 'le_tan'
                  const items = isLeTan
                    ? [
                        { icon: '📐', label: 'Lương Kinh Doanh (công thức)', note: 'Tự động theo doanh thu POS', value: showLKD.tienTour, plus: true, hide: !showLKD.tienTour },
                        { icon: '💆', label: 'Hoa Hồng (bán SP/thẻ)', note: '⚡ Real-time từ HSMS POS', value: showLKD.hoaHongDV, plus: true, hide: !showLKD.hoaHongDV },
                        { icon: '🎯', label: 'Thưởng Đạt Doanh Số', note: 'Admin nhập tay', value: showLKD.thuongDS, plus: true, hide: !showLKD.thuongDS },
                        { icon: '⭐', label: 'Hỗ trợ làm tròn', note: 'Bù lên mức tối thiểu tháng', value: hoTro, plus: true, hide: !hoTro },
                      ]
                    : [
                        { icon: '💆', label: 'Hoa Hồng DV', note: '⚡ Real-time từ HSMS POS', value: showLKD.hoaHongDV, plus: true, hide: !showLKD.hoaHongDV },
                        { icon: '✈️', label: 'Tiền Tour', note: '⚡ Real-time từ HSMS POS', value: showLKD.tienTour, plus: true, hide: !showLKD.tienTour },
                        { icon: '🎯', label: 'Thưởng Đạt Doanh Số', note: 'Admin nhập tay', value: showLKD.thuongDS, plus: true, hide: !showLKD.thuongDS },
                      ]
                  return (
                    <>
                      {items.filter(item => !item.hide).map((item, i) => (
                        <div key={item.label} style={{ display: 'grid', gridTemplateColumns: '38px 1fr auto', gap: 12, alignItems: 'center', padding: '14px 0', borderTop: i === 0 ? 'none' : `1px solid ${LUX.line}` }}>
                          <div style={{ width: 38, height: 38, borderRadius: 11, background: LUX.surface, color: LUX.taupe, display: 'grid', placeItems: 'center', fontSize: 16 }}>{item.icon}</div>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: LUX.espresso, lineHeight: 1.1 }}>{item.label}</div>
                            <div style={{ fontFamily: LUX.fontMono, fontSize: 10, color: LUX.ink3, marginTop: 4 }}>{item.note}</div>
                          </div>
                          <div style={{ fontFamily: LUX.fontSerif, fontSize: 18, fontWeight: 600, color: LUX.sage }}>
                            +{formatCurrency(item.value)}
                          </div>
                        </div>
                      ))}
                      {!showLKD.hoaHongDV && !showLKD.tienTour && !showLKD.thuongDS && (
                        <div style={{ padding: '18px 0', textAlign: 'center', color: LUX.ink3, fontSize: 12, fontStyle: 'italic' }}>
                          Tháng này chưa có hoa hồng hoặc tiền tour được ghi nhận
                        </div>
                      )}
                      <div style={{ borderTop: `1.5px solid ${LUX.line}`, padding: '16px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontFamily: LUX.fontSerif, fontSize: 16, fontWeight: 600, color: LUX.espresso }}>Kỳ 2</span>
                        <span style={{ fontFamily: LUX.fontSerif, fontSize: 24, fontWeight: 700, color: LUX.espresso }}>{formatCurrency(tongKy2)}</span>
                      </div>

                      {/* Chi tiết từng lượt — KTV xem rõ: STT, ngày, dịch vụ, khách, tour, hoa hồng */}
                      {data?.kdDetail?.length > 0 && (
                        <div style={{ marginTop: 8 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
                            <span style={{ fontFamily: LUX.fontSerif, fontSize: 15, fontWeight: 600, color: LUX.espresso }}>Chi Tiết Lượt Phục Vụ</span>
                            <span style={{ fontFamily: LUX.fontSans, fontSize: 11, color: LUX.ink3 }}>{data.kdDetail.length} lượt</span>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {data.kdDetail.map((r, idx) => {
                              const ten = r.dich_vu?.ten || r.san_pham?.ten || r.the_lieu_trinh?.ten_dich_vu || 'Dịch vụ'
                              const ngay = (r.don_hang?.ngay || '').split('-').reverse().join('/')
                              const khach = r.don_hang?.khach_hang?.ho_ten || 'Khách lẻ'
                              const tour = r.tien_tour || 0
                              const hh = r.tien_hoa_hong || 0
                              return (
                                <div key={r.id} style={{ background: '#fff', border: `1px solid ${LUX.line}`, borderRadius: 14, padding: '12px 13px', boxShadow: LUX.shadowSm }}>
                                  {/* Hàng 1: STT + tên dịch vụ + ngày */}
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <span style={{ width: 26, height: 26, flexShrink: 0, borderRadius: 8, background: 'linear-gradient(135deg,#c9a96e,#a87f4f)', color: '#fff', fontFamily: LUX.fontSerif, fontWeight: 700, fontSize: 13, display: 'grid', placeItems: 'center' }}>{idx + 1}</span>
                                    <span style={{ fontFamily: LUX.fontSans, fontSize: 13.5, fontWeight: 700, color: LUX.espresso, flex: 1, minWidth: 0, lineHeight: 1.25 }}>{ten}</span>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontFamily: LUX.fontSans, fontSize: 11, color: LUX.ink3, whiteSpace: 'nowrap' }}>
                                      📅 {ngay}
                                    </span>
                                  </div>
                                  {/* Hàng 2: khách hàng + doanh số */}
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, margin: '8px 0 0', paddingLeft: 36 }}>
                                    <span style={{ fontFamily: LUX.fontSans, fontSize: 12, color: LUX.ink2, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>👤 {khach}</span>
                                    <span style={{ fontFamily: LUX.fontSans, fontSize: 11, color: LUX.ink3, whiteSpace: 'nowrap' }}>DS {formatCurrency(r.thanh_tien || 0)}</span>
                                  </div>
                                  {/* Hàng 3: tiền tour + hoa hồng (badge) */}
                                  <div style={{ display: 'flex', gap: 8, marginTop: 9, paddingLeft: 36 }}>
                                    {tour > 0 && (
                                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'rgba(160,113,79,.10)', border: '1px solid rgba(160,113,79,.25)', borderRadius: 8, padding: '5px 9px' }}>
                                        <span style={{ fontSize: 11, color: LUX.taupe, fontWeight: 600 }}>Tiền Tour</span>
                                        <span style={{ fontFamily: LUX.fontSerif, fontSize: 14, fontWeight: 700, color: LUX.taupe }}>{formatCurrency(tour)}</span>
                                      </span>
                                    )}
                                    {hh > 0 && (
                                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'rgba(201,169,110,.12)', border: '1px solid rgba(201,169,110,.32)', borderRadius: 8, padding: '5px 9px' }}>
                                        <span style={{ fontSize: 11, color: '#8a6a35', fontWeight: 600 }}>Hoa Hồng</span>
                                        <span style={{ fontFamily: LUX.fontSerif, fontSize: 14, fontWeight: 700, color: '#8a6a35' }}>{formatCurrency(hh)}</span>
                                      </span>
                                    )}
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}
                    </>
                  )
                })()}
              </div>
            </div>

            {/* ── Tổng 2 Kỳ ── */}
            <div style={{ marginTop: 10, background: 'linear-gradient(135deg,#fdf3e0,#f9ead0)', border: '1px solid #ecd9b3', borderRadius: LUX.radius, padding: '18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontFamily: LUX.fontSerif, fontSize: 18, fontWeight: 600, color: LUX.espresso }}>Tổng Thực Nhận</span>
              <span style={{ fontFamily: LUX.fontSerif, fontSize: 28, fontWeight: 700, color: LUX.espresso, letterSpacing: '-0.01em' }}>{formatCurrency(tongLinh)}</span>
            </div>

            {/* Status Notes */}
            <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ background: stLC.bg, borderRadius: 12, padding: '12px 14px', border: `1px solid ${stLC.color}20`, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <span style={{ fontSize: 14 }}>💰</span>
                <div style={{ fontSize: 12, color: stLC.color, lineHeight: 1.6, fontWeight: 500 }}>
                  {data?.trangThaiLC === 'da_chot'
                    ? `Kỳ 1 đã chốt — Lương cứng thực nhận: ${formatCurrency(tongKy1)}`
                    : data?.trangThaiLC === 'da_tinh'
                      ? 'Kỳ 1 đã được Admin tính. Chờ chốt chính thức.'
                      : `Kỳ 1 dự kiến — Admin sẽ chốt Lương Cứng ngày 05/${month}/${year}`
                  }
                </div>
              </div>
              <div style={{ background: stLKD.bg, borderRadius: 12, padding: '12px 14px', border: `1px solid ${stLKD.color}20`, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <span style={{ fontSize: 14 }}>📊</span>
                <div style={{ fontSize: 12, color: stLKD.color, lineHeight: 1.6, fontWeight: 500 }}>
                  {data?.trangThaiLKD === 'da_chot'
                    ? `Kỳ 2 đã chốt — Lương KD thực nhận: ${formatCurrency(tongKy2)}`
                    : data?.trangThaiLKD === 'da_tinh'
                      ? 'Kỳ 2 đã được Admin tính. Chờ chốt chính thức.'
                      : `Kỳ 2 dự kiến — Admin sẽ chốt Lương Kinh Doanh ngày 15/${month}/${year}`
                  }
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
