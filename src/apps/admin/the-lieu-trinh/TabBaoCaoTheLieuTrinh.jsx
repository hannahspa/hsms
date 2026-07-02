import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../../lib/supabase'
import { formatCurrency, getNowVN } from '../../../lib/utils'
import ModalCheckoutBuoi from './components/ModalCheckoutBuoi'

const LUX = {
  bg: '#FAF7F4', card: '#FFFFFF', border: 'rgba(160,113,79,0.12)',
  shadow: '0 4px 24px rgba(139,94,60,0.10)', text: '#1A1209',
  sub: '#8B7355', mute: '#B8A898',
  gold: '#C9A96E', primary: '#A0714F',
  grad: 'linear-gradient(135deg,#C9A96E 0%,#A0714F 45%,#7D5A3C 100%)',
  thu: '#2D7A4F', chi: '#C0392B',
  green: '#eef5e8', greenText: '#2D7A4F', greenBorder: '#a5c87a',
}

function fmtDate(iso) {
  if (!iso) return '-'
  const [y, m, d] = String(iso).slice(0, 10).split('-')
  return `${d}/${m}/${y}`
}

function fmtCompact(n) {
  if (!n) return '0₫'
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)} tỷ`
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)} tr`
  return `${Math.round(n / 1e3)}k`
}

function getDaysInMonth(year, month) {
  if (month === 2) {
    return ((year % 4 === 0 && year % 100 !== 0) || year % 400 === 0) ? 29 : 28
  }
  return [4, 6, 9, 11].includes(month) ? 30 : 31
}

// ── Biểu đồ Bar ngang (CSS thuần) ───────────────────────────────────────────
function HBarChart({ data, colorFn, labelKey = 'label', valueKey = 'count', subKey, maxBars = 8 }) {
  const top = [...data].sort((a, b) => b[valueKey] - a[valueKey]).slice(0, maxBars)
  const max = top[0]?.[valueKey] || 1
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {top.map((row, i) => {
        const pct = Math.max(4, Math.round((row[valueKey] / max) * 100))
        const color = colorFn ? colorFn(i, row) : LUX.gold
        return (
          <div key={row[labelKey] + i}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <div style={{ width: 20, height: 20, borderRadius: 6, background: color, color: '#fff', fontSize: 10, fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{i + 1}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: LUX.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{row[labelKey]}</div>
                {subKey && <div style={{ fontSize: 11, color: LUX.sub }}>{row[subKey]}</div>}
              </div>
              <div style={{ fontSize: 14, fontWeight: 900, color, flexShrink: 0 }}>{row[valueKey]}</div>
            </div>
            <div style={{ height: 8, borderRadius: 6, background: '#f0eae2', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 6, transition: 'width .6s ease' }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}
// Palette màu đẹp
const PALETTE = ['#C9A96E','#A0714F','#2D7A4F','#1A5276','#6C3483','#C0392B','#E67E22','#16A085']
const getColor = (i) => PALETTE[i % PALETTE.length]

// ── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({ icon, label, value, sub, color = LUX.primary, accent = '#fdf6ec' }) {
  return (
    <div style={{ background: accent, border: `1px solid ${color}30`, borderRadius: 14, padding: '18px 20px' }}>
      <div style={{ fontSize: 22, marginBottom: 6 }}>{icon}</div>
      <div style={{ fontSize: 24, fontWeight: 900, fontFamily: 'var(--serif, serif)', color }}>{value}</div>
      <div style={{ fontSize: 12, fontWeight: 700, color: LUX.sub, marginTop: 2 }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: LUX.mute, marginTop: 4 }}>{sub}</div>}
    </div>
  )
}

// ── Section Header ────────────────────────────────────────────────────────────
function SecHeader({ icon, title, sub, action }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
      <div>
        <div style={{ fontSize: 11, fontWeight: 900, color: LUX.sub, textTransform: 'uppercase', letterSpacing: '.1em' }}>{icon} {title}</div>
        {sub && <div style={{ fontSize: 12, color: LUX.mute, marginTop: 2 }}>{sub}</div>}
      </div>
      {action}
    </div>
  )
}

// ── Modal Checkout Buổi ──────────────────────────────────────────────────────
export default function TabBaoCaoTheLieuTrinh({ onCheckout }) {
  const now = getNowVN()
  const [thang, setThang] = useState(now.getMonth() + 1)
  const [nam,   setNam]   = useState(now.getFullYear())

  const [theBan,        setTheBan]        = useState([])
  const [lichSu,        setLichSu]        = useState([])
  const [doanhThuTong,  setDoanhThuTong]  = useState(0)
  const [loading,       setLoading]       = useState(false)
  const [checkoutCard,  setCheckoutCard]  = useState(null)
  const [activeView,    setActiveView]    = useState('overview') // 'overview' | 'detail' | 'history'

  const startDate = `${nam}-${String(thang).padStart(2,'0')}-01`
  const endDate   = (() => {
    const lastDay = getDaysInMonth(nam, thang)
    return `${nam}-${String(thang).padStart(2,'0')}-${String(lastDay).padStart(2,'0')}`
  })()

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [rBan, rLich, rDT] = await Promise.all([
        supabase.from('the_lieu_trinh')
          .select('id, ma_the, ten_dich_vu, danh_muc, so_buoi_tong, so_buoi_da_dung, so_buoi_con_lai, gia_tri_the, ngay_mua, trang_thai, khach_hang:khach_hang_id(ho_ten, so_dien_thoai)')
          .gte('ngay_mua', startDate)
          .lte('ngay_mua', endDate)
          .order('ngay_mua', { ascending: false }),

        supabase.from('the_lieu_trinh_su_dung')
          .select('id, ngay_su_dung, ghi_chu, nguoi_ghi, created_at, the:the_lieu_trinh_id(id, ma_the, ten_dich_vu, danh_muc, so_buoi_tong, so_buoi_da_dung, khach_hang:khach_hang_id(ho_ten, so_dien_thoai))')
          .gte('ngay_su_dung', startDate)
          .lte('ngay_su_dung', endDate)
          .order('ngay_su_dung', { ascending: false })
          .order('created_at', { ascending: false }),

        // Tổng doanh thu tháng (từ bảng doanh_thu) — để tính %
        supabase.from('doanh_thu')
          .select('so_tien')
          .gte('ngay', startDate)
          .lte('ngay', endDate),
      ])

      setTheBan(rBan.data || [])
      setLichSu(rLich.data || [])
      const tongDT = (rDT.data || []).reduce((s, r) => s + (r.so_tien || 0), 0)
      setDoanhThuTong(tongDT)
    } catch (e) { console.error('TabBaoCao:', e) }
    finally { setLoading(false) }
  }, [thang, nam])

  useEffect(() => { fetchData() }, [fetchData])

  const prevMonth = () => { if (thang === 1) { setThang(12); setNam(y => y - 1) } else setThang(t => t - 1) }
  const nextMonth = () => { if (thang === 12) { setThang(1); setNam(y => y + 1) } else setThang(t => t + 1) }

  // ── Tổng hợp KPI
  const tongGiaTri  = theBan.reduce((s, t) => s + (t.gia_tri_the || 0), 0)
  const tongBuoi    = theBan.reduce((s, t) => s + (t.so_buoi_tong || 0), 0)
  const tongLuotDung = lichSu.length
  const pctDoanhThu = doanhThuTong > 0 ? Math.round((tongGiaTri / doanhThuTong) * 100) : 0

  // ── Phân tích dịch vụ bán nhiều (group theo ten_dich_vu)
  const dvBanMap = {}
  theBan.forEach(t => {
    const key = t.ten_dich_vu || 'Không xác định'
    if (!dvBanMap[key]) dvBanMap[key] = { label: key, count: 0, tongTien: 0, tongBuoi: 0 }
    dvBanMap[key].count++
    dvBanMap[key].tongTien += t.gia_tri_the || 0
    dvBanMap[key].tongBuoi += t.so_buoi_tong || 0
  })
  const dvBanList = Object.values(dvBanMap)
    .map(d => ({ ...d, sub: fmtCompact(d.tongTien) }))
    .sort((a, b) => b.count - a.count)

  // ── Phân tích dịch vụ khách sử dụng nhiều (từ lichSu)
  const dvDungMap = {}
  lichSu.forEach(r => {
    const key = r.the?.ten_dich_vu || 'Không xác định'
    if (!dvDungMap[key]) dvDungMap[key] = { label: key, count: 0 }
    dvDungMap[key].count++
  })
  const dvDungList = Object.values(dvDungMap).sort((a, b) => b.count - a.count)

  // ── Phân tích nhóm danh mục bán nhiều
  const dmBanMap = {}
  theBan.forEach(t => {
    const key = t.danh_muc || 'Khác'
    if (!dmBanMap[key]) dmBanMap[key] = { label: key, count: 0, tongTien: 0 }
    dmBanMap[key].count++
    dmBanMap[key].tongTien += t.gia_tri_the || 0
  })
  const dmBanList = Object.values(dmBanMap)
    .map(d => ({ ...d, sub: `${d.count} thẻ · ${fmtCompact(d.tongTien)}` }))
    .sort((a, b) => b.tongTien - a.tongTien)

  // ── Thẻ gần hết buổi (cảnh báo)
  const theSapHet = theBan.filter(t => {
    const remain = (t.so_buoi_tong || 0) - (t.so_buoi_da_dung || 0)
    return remain > 0 && remain <= 2
  })

  const viewBtnStyle = (v) => ({
    padding: '8px 18px', borderRadius: 20, border: 'none', cursor: 'pointer', fontFamily: 'var(--sans)', fontWeight: 700, fontSize: 13,
    background: activeView === v ? LUX.grad : 'transparent',
    color: activeView === v ? '#fff' : LUX.sub,
    transition: 'all .2s',
  })

  return (
    <>
      {/* ── Header + tháng picker ── */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontFamily: 'var(--serif, serif)', fontSize: 22, fontWeight: 900, color: LUX.text, marginBottom: 4 }}>
          Báo Cáo Thẻ Liệu Trình
        </div>
        <div style={{ fontSize: 13, color: LUX.sub }}>Phân tích doanh số · Lịch sử sử dụng · Công cụ lập kế hoạch KM</div>
      </div>

      {/* Tháng picker */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, background: LUX.card, borderRadius: 12, padding: '10px 16px', border: `1px solid ${LUX.border}`, boxShadow: LUX.shadow }}>
        <button onClick={prevMonth} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: LUX.sub, padding: '2px 8px' }}>‹</button>
        <div style={{ fontFamily: 'var(--serif, serif)', fontWeight: 700, fontSize: 20, color: LUX.text, flex: 1, textAlign: 'center' }}>
          Tháng {thang} / {nam}
        </div>
        <button onClick={nextMonth} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: LUX.sub, padding: '2px 8px' }}>›</button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: LUX.sub }}>⏳ Đang tải dữ liệu...</div>
      ) : (
        <>
          {/* ── KPI Cards ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 24 }}>
            <KpiCard icon="🏷️" label="Thẻ bán ra" value={theBan.length} sub={`${tongBuoi} buổi cam kết`} color={LUX.primary} accent="#fdf6ec" />
            <KpiCard icon="💰" label="Doanh số thẻ" value={fmtCompact(tongGiaTri)} sub={formatCurrency(tongGiaTri)} color={LUX.thu} accent="#eef5e8" />
            <KpiCard icon="📊" label="% Doanh thu tổng" value={`${pctDoanhThu}%`} sub={`Tổng DT: ${fmtCompact(doanhThuTong)}`} color="#1A5276" accent="#eaf3fb" />
            <KpiCard icon="✅" label="Buổi đã sử dụng" value={tongLuotDung} sub={`Trong tháng ${thang}/${nam}`} color="#6C3483" accent="#f5eef8" />
          </div>

          {/* ── Cảnh báo thẻ gần hết ── */}
          {theSapHet.length > 0 && (
            <div style={{ background: '#fdf3e0', border: '1px solid #e8c96a', borderRadius: 12, padding: '14px 18px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 20 }}>⚠️</span>
              <div>
                <div style={{ fontWeight: 700, fontSize: 13, color: '#a07030' }}>
                  {theSapHet.length} thẻ bán trong tháng này sắp hết buổi (≤2 buổi còn lại)
                </div>
                <div style={{ fontSize: 12, color: '#b88a40', marginTop: 2 }}>
                  {theSapHet.map(t => t.khach_hang?.ho_ten || t.ma_the).join(' · ')}
                </div>
              </div>
            </div>
          )}

          {/* ── Tab view switcher ── */}
          <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: '#f5f0eb', borderRadius: 24, padding: 4, width: 'fit-content' }}>
            <button style={viewBtnStyle('overview')} onClick={() => setActiveView('overview')}>📊 Phân Tích</button>
            <button style={viewBtnStyle('detail')} onClick={() => setActiveView('detail')}>🏷️ Danh Sách Thẻ</button>
            <button style={viewBtnStyle('history')} onClick={() => setActiveView('history')}>📅 Lịch Sử Dùng</button>
          </div>

          {/* ════════ VIEW: PHÂN TÍCH ════════ */}
          {activeView === 'overview' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

              {/* Dịch vụ bán nhiều nhất */}
              <div style={{ background: LUX.card, borderRadius: 14, padding: '20px 22px', border: `1px solid ${LUX.border}`, boxShadow: LUX.shadow }}>
                <SecHeader icon="🏆" title="Dịch vụ bán thẻ nhiều nhất" sub={`Top ${Math.min(dvBanList.length, 8)} — số thẻ bán ra`} />
                {dvBanList.length === 0
                  ? <div style={{ color: LUX.mute, fontSize: 13, textAlign: 'center', padding: '20px 0' }}>Chưa có dữ liệu</div>
                  : <HBarChart data={dvBanList} colorFn={(i) => getColor(i)} valueKey="count" subKey="sub" />
                }
              </div>

              {/* Dịch vụ khách dùng nhiều nhất */}
              <div style={{ background: LUX.card, borderRadius: 14, padding: '20px 22px', border: `1px solid ${LUX.border}`, boxShadow: LUX.shadow }}>
                <SecHeader icon="✨" title="Dịch vụ khách đến dùng buổi nhiều" sub={`Top ${Math.min(dvDungList.length, 8)} — số lượt sử dụng`} />
                {dvDungList.length === 0
                  ? <div style={{ color: LUX.mute, fontSize: 13, textAlign: 'center', padding: '20px 0' }}>Chưa có lịch sử sử dụng trong tháng này</div>
                  : <HBarChart data={dvDungList} colorFn={(i) => getColor(i + 2)} valueKey="count" />
                }
              </div>

              {/* Nhóm danh mục */}
              <div style={{ background: LUX.card, borderRadius: 14, padding: '20px 22px', border: `1px solid ${LUX.border}`, boxShadow: LUX.shadow }}>
                <SecHeader icon="📂" title="Nhóm danh mục bán nhiều" sub="Theo tổng doanh số" />
                {dmBanList.length === 0
                  ? <div style={{ color: LUX.mute, fontSize: 13, textAlign: 'center', padding: '20px 0' }}>Chưa có dữ liệu</div>
                  : <HBarChart data={dmBanList} colorFn={(i) => getColor(i + 4)} valueKey="tongTien" subKey="sub"
                      labelKey="label" maxBars={6} />
                }
                {dmBanList.length > 0 && (
                  <div style={{ marginTop: 12, fontSize: 11, color: LUX.mute }}>* Giá trị thanh ngang = tổng tiền</div>
                )}
              </div>

              {/* Bảng chi tiết từng dịch vụ — công cụ lập KM */}
              <div style={{ background: LUX.card, borderRadius: 14, padding: '20px 22px', border: `1px solid ${LUX.border}`, boxShadow: LUX.shadow }}>
                <SecHeader icon="🎯" title="Bảng lập kế hoạch KM" sub="So sánh dịch vụ bán vs. dùng → ưu tiên khuyến mãi" />
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <thead>
                      <tr style={{ borderBottom: `1px solid ${LUX.border}` }}>
                        <th style={{ textAlign: 'left', padding: '6px 4px', color: LUX.sub, fontWeight: 700 }}>Dịch vụ</th>
                        <th style={{ textAlign: 'right', padding: '6px 4px', color: LUX.sub, fontWeight: 700 }}>Bán</th>
                        <th style={{ textAlign: 'right', padding: '6px 4px', color: LUX.sub, fontWeight: 700 }}>Dùng</th>
                        <th style={{ textAlign: 'right', padding: '6px 4px', color: LUX.sub, fontWeight: 700 }}>Doanh số</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dvBanList.map((dv, i) => {
                        const dungCount = dvDungMap[dv.label]?.count || 0
                        return (
                          <tr key={dv.label} style={{ borderBottom: `1px solid ${LUX.border}20` }}>
                            <td style={{ padding: '7px 4px', fontWeight: 600 }}>
                              <span style={{ width: 18, height: 18, borderRadius: 5, background: getColor(i), display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 9, fontWeight: 900, marginRight: 6 }}>{i+1}</span>
                              {dv.label}
                            </td>
                            <td style={{ textAlign: 'right', padding: '7px 4px', fontWeight: 700, color: LUX.primary }}>{dv.count}</td>
                            <td style={{ textAlign: 'right', padding: '7px 4px', fontWeight: 700, color: LUX.thu }}>{dungCount}</td>
                            <td style={{ textAlign: 'right', padding: '7px 4px', fontWeight: 700 }}>{fmtCompact(dv.tongTien)}</td>
                          </tr>
                        )
                      })}
                      {dvBanList.length === 0 && (
                        <tr><td colSpan={4} style={{ textAlign: 'center', padding: '20px 0', color: LUX.mute }}>Không có dữ liệu</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
                <div style={{ marginTop: 16, padding: '12px 14px', background: '#fdf6ec', borderRadius: 10, border: `1px solid ${LUX.gold}30` }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: LUX.primary, marginBottom: 6 }}>💡 GỢI Ý LẬP KM THÁNG SAU</div>
                  {dvBanList.length > 0 ? (
                    <div style={{ fontSize: 11, color: LUX.sub, lineHeight: 1.7 }}>
                      {dvBanList[0] && <div>• <b>{dvBanList[0].label}</b> bán tốt nhất ({dvBanList[0].count} thẻ) → duy trì, thêm ưu đãi combo</div>}
                      {dvBanList.length > 1 && dvBanList[dvBanList.length - 1].count < 2 && (
                        <div>• <b>{dvBanList[dvBanList.length - 1].label}</b> bán chậm ({dvBanList[dvBanList.length - 1].count} thẻ) → cân nhắc giảm giá hoặc bundling</div>
                      )}
                      {dvDungList.length > 0 && <div>• Khách hay đến dùng <b>{dvDungList[0]?.label}</b> ({dvDungList[0]?.count} lượt) → dịch vụ có retention cao</div>}
                      {theSapHet.length > 0 && <div>• {theSapHet.length} thẻ sắp hết buổi → liên hệ khách gia hạn hoặc upsell thẻ mới</div>}
                    </div>
                  ) : (
                    <div style={{ fontSize: 11, color: LUX.mute }}>Chưa có dữ liệu bán thẻ trong tháng này</div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ════════ VIEW: DANH SÁCH THẺ ════════ */}
          {activeView === 'detail' && (
            <div>
              <SecHeader icon="🏷️" title={`Thẻ bán ra trong tháng — ${theBan.length} thẻ`} sub={`Tổng ${fmtCompact(tongGiaTri)} · ${tongBuoi} buổi cam kết`} />
              {theBan.length === 0 ? (
                <div style={{ background: LUX.card, borderRadius: 14, padding: '40px 20px', textAlign: 'center', color: LUX.mute, border: `1px solid ${LUX.border}` }}>
                  Không có thẻ nào bán ra trong tháng {thang}/{nam}
                </div>
              ) : (
                <div style={{ background: LUX.card, borderRadius: 14, border: `1px solid ${LUX.border}`, boxShadow: LUX.shadow, overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: '#f5f0eb' }}>
                        <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: LUX.sub, textTransform: 'uppercase' }}>Mã thẻ</th>
                        <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: LUX.sub, textTransform: 'uppercase' }}>Khách hàng</th>
                        <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: LUX.sub, textTransform: 'uppercase' }}>Dịch vụ</th>
                        <th style={{ padding: '12px 8px', textAlign: 'right', fontSize: 11, fontWeight: 700, color: LUX.sub, textTransform: 'uppercase' }}>Buổi</th>
                        <th style={{ padding: '12px 8px', textAlign: 'right', fontSize: 11, fontWeight: 700, color: LUX.sub, textTransform: 'uppercase' }}>Giá trị</th>
                        <th style={{ padding: '12px 8px', textAlign: 'right', fontSize: 11, fontWeight: 700, color: LUX.sub, textTransform: 'uppercase' }}>Ngày mua</th>
                        <th style={{ padding: '12px 16px 12px 8px' }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {theBan.map((t, i) => {
                        const remain = (t.so_buoi_tong || 0) - (t.so_buoi_da_dung || 0)
                        const warning = remain > 0 && remain <= 2
                        return (
                          <tr key={t.id} style={{ borderBottom: `1px solid ${LUX.border}`, background: warning ? '#fffdf0' : i % 2 === 0 ? '#fff' : '#faf7f4' }}>
                            <td style={{ padding: '12px 16px' }}>
                              <span style={{ fontWeight: 900, fontSize: 12, color: LUX.gold }}>{t.ma_the || '-'}</span>
                              {warning && <span style={{ marginLeft: 6, fontSize: 10, color: '#a07030', fontWeight: 700 }}>⚠️ sắp hết</span>}
                            </td>
                            <td style={{ padding: '12px 8px' }}>
                              <div style={{ fontWeight: 700, fontSize: 13, color: LUX.text }}>{t.khach_hang?.ho_ten || 'Khách vãng lai'}</div>
                              <div style={{ fontSize: 11, color: LUX.sub }}>{t.khach_hang?.so_dien_thoai || ''}</div>
                            </td>
                            <td style={{ padding: '12px 8px', fontSize: 13, color: LUX.text }}>{t.ten_dich_vu}</td>
                            <td style={{ padding: '12px 8px', textAlign: 'right' }}>
                              <div style={{ fontWeight: 700, fontSize: 13 }}>{t.so_buoi_da_dung || 0}/{t.so_buoi_tong > 0 ? t.so_buoi_tong : '?'}</div>
                              <div style={{ fontSize: 11, color: remain <= 0 ? LUX.chi : LUX.sub }}>còn {remain} buổi</div>
                            </td>
                            <td style={{ padding: '12px 8px', textAlign: 'right', fontWeight: 700, color: LUX.gold }}>
                              {t.gia_tri_the > 0 ? fmtCompact(t.gia_tri_the) : '-'}
                            </td>
                            <td style={{ padding: '12px 8px', textAlign: 'right', fontSize: 12, color: LUX.sub }}>{fmtDate(t.ngay_mua)}</td>
                            <td style={{ padding: '12px 16px 12px 8px' }}>
                              {remain > 0 && (
                                <button onClick={() => setCheckoutCard({ ...t })}
                                  style={{ padding: '5px 12px', borderRadius: 8, border: `1px solid ${LUX.gold}`, background: '#fdf6ec', color: LUX.primary, fontFamily: 'var(--sans)', fontWeight: 700, fontSize: 11, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                                  ✓ Dùng buổi
                                </button>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                    <tfoot>
                      <tr style={{ background: '#f5f0eb', borderTop: `2px solid ${LUX.border}` }}>
                        <td colSpan={3} style={{ padding: '10px 16px', fontWeight: 700, fontSize: 13, color: LUX.text }}>
                          Tổng cộng — {theBan.length} thẻ
                        </td>
                        <td style={{ padding: '10px 8px', textAlign: 'right', fontWeight: 700, color: LUX.sub }}>{tongBuoi} buổi</td>
                        <td style={{ padding: '10px 8px', textAlign: 'right', fontWeight: 900, color: LUX.gold, fontSize: 14 }}>{fmtCompact(tongGiaTri)}</td>
                        <td colSpan={2}></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ════════ VIEW: LỊCH SỬ DÙNG ════════ */}
          {activeView === 'history' && (
            <div>
              <SecHeader icon="📅" title={`Lịch sử sử dụng buổi — ${lichSu.length} lượt`} sub={`Tháng ${thang}/${nam}`} />
              {lichSu.length === 0 ? (
                <div style={{ background: LUX.card, borderRadius: 14, padding: '40px 20px', textAlign: 'center', color: LUX.mute, border: `1px solid ${LUX.border}` }}>
                  <div style={{ fontSize: 32, marginBottom: 10 }}>📅</div>
                  <div>Chưa có lịch sử sử dụng buổi trong tháng {thang}/{nam}</div>
                  <div style={{ fontSize: 12, marginTop: 8 }}>Dùng nút "✓ Dùng buổi" trong tab Danh Sách Thẻ để ghi nhận</div>
                </div>
              ) : (
                <div style={{ background: LUX.card, borderRadius: 14, border: `1px solid ${LUX.border}`, boxShadow: LUX.shadow, overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: '#f5f0eb' }}>
                        <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: LUX.sub, textTransform: 'uppercase' }}>Ngày dùng</th>
                        <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: LUX.sub, textTransform: 'uppercase' }}>Khách hàng</th>
                        <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: LUX.sub, textTransform: 'uppercase' }}>Dịch vụ</th>
                        <th style={{ padding: '12px 8px', textAlign: 'right', fontSize: 11, fontWeight: 700, color: LUX.sub, textTransform: 'uppercase' }}>Tiến độ</th>
                        <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: LUX.sub, textTransform: 'uppercase' }}>Ghi chú</th>
                        <th style={{ padding: '12px 16px 12px 8px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: LUX.sub, textTransform: 'uppercase' }}>Người ghi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lichSu.map((r, i) => {
                        const the = r.the || {}
                        const tong = the.so_buoi_tong || 0
                        const dung = the.so_buoi_da_dung || 0
                        const pct  = tong > 0 ? Math.min(100, Math.round((dung / tong) * 100)) : 0
                        return (
                          <tr key={r.id} style={{ borderBottom: `1px solid ${LUX.border}`, background: i % 2 === 0 ? '#fff' : '#faf7f4' }}>
                            <td style={{ padding: '12px 16px', fontWeight: 700, color: LUX.text }}>{fmtDate(r.ngay_su_dung)}</td>
                            <td style={{ padding: '12px 8px' }}>
                              <div style={{ fontWeight: 700, fontSize: 13, color: LUX.text }}>{the.khach_hang?.ho_ten || '—'}</div>
                              <div style={{ fontSize: 11, color: LUX.sub }}>{the.khach_hang?.so_dien_thoai || ''}</div>
                            </td>
                            <td style={{ padding: '12px 8px' }}>
                              <div style={{ fontSize: 13, color: LUX.text }}>{the.ten_dich_vu || '—'}</div>
                              <div style={{ fontSize: 11, color: LUX.sub }}>{the.ma_the || ''}</div>
                            </td>
                            <td style={{ padding: '12px 8px', textAlign: 'right' }}>
                              {tong > 0 ? (
                                <>
                                  <div style={{ fontWeight: 700, fontSize: 12, color: pct >= 100 ? LUX.chi : LUX.text }}>{dung}/{tong}</div>
                                  <div style={{ height: 4, borderRadius: 3, background: '#f0eae2', marginTop: 4, overflow: 'hidden', width: 60, marginLeft: 'auto' }}>
                                    <div style={{ height: '100%', width: `${pct}%`, background: pct >= 100 ? LUX.chi : LUX.grad, borderRadius: 3 }} />
                                  </div>
                                </>
                              ) : '—'}
                            </td>
                            <td style={{ padding: '12px 8px', fontSize: 12, color: LUX.sub }}>{r.ghi_chu || '-'}</td>
                            <td style={{ padding: '12px 16px 12px 8px', fontSize: 11, color: LUX.mute }}>{r.nguoi_ghi || '-'}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Modal checkout */}
      {checkoutCard && (
        <ModalCheckoutBuoi
          card={checkoutCard}
          onClose={() => setCheckoutCard(null)}
          onDone={() => {
            setCheckoutCard(null)
            fetchData()
            if (onCheckout) onCheckout()
          }}
        />
      )}
    </>
  )
}
