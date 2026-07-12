import { useState, useEffect, useCallback } from 'react'
import { checkinApi } from './checkinApi'
import { LUX } from '../../constants/lux'
import { formatCurrency, getNowVN } from '../../lib/utils'
import './styles.css'

const HERO = {
  background: `radial-gradient(circle at 100% 0%, rgba(212,165,116,0.4), transparent 55%), linear-gradient(155deg,#4a3528 0%,#3d2c20 50%,#2e2018 100%)`,
  color: '#f5ede0', position: 'relative', overflow: 'hidden',
}

const backArrow = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 18l-6-6 6-6"/>
  </svg>
)

// Tông Hannah: Tour = taupe/nâu, Hoa Hồng = champagne gold
const TOUR_COLOR = '#a0714f', TOUR_BG = 'rgba(160,113,79,.10)'
const HH_COLOR = '#8a6a35', HH_BG = 'rgba(201,169,110,.14)'
const LOAI_CONFIG = {
  tour:     { label: 'Tiền Tour',    icon: '✈️', color: TOUR_COLOR, bg: TOUR_BG },
  hoa_hong: { label: 'Hoa Hồng DV', icon: '💆', color: HH_COLOR, bg: HH_BG },
  // Legacy key (không còn data mới nhưng giữ để hiển thị data cũ nếu có)
  commission: { label: 'Hoa Hồng DV', icon: '💆', color: HH_COLOR, bg: HH_BG },
}

function fmtDate(d) {
  if (!d) return ''
  const [y, m, day] = d.split('-')
  return `${day}/${m}/${y}`
}

function fmtMonth(y, m) {
  return `Tháng ${m}/${y}`
}

export default function CheckinThuNhap({ _nhanVien, onBack }) {
  const now = getNowVN()
  const curYear  = now.getFullYear()
  const curMonth = now.getMonth() + 1

  // mode: 'month' | 'all'
  const [mode, setMode] = useState('month')
  const [year, setYear]   = useState(curYear)
  const [month, setMonth] = useState(curMonth)

  const [rows, setRows]     = useState([])
  const [summary, setSummary] = useState(null) // { tourTotal, commTotal, count }
  const [allSummary, setAllSummary] = useState(null) // tổng all-time
  const [loading, setLoading] = useState(true)

  // 1 call RPC: trả chi_tiet (tháng) + all_rows (toàn thời gian). Client tự tính tổng.
  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const d = await checkinApi.thuNhap(month, year)
      const allRows = d?.all_rows || []
      const tourAll = allRows.filter(r => r.loai === 'tour').reduce((s, r) => s + (r.so_tien || 0), 0)
      const commAll = allRows.filter(r => r.loai === 'hoa_hong').reduce((s, r) => s + (r.so_tien || 0), 0)
      setAllSummary({ tourTotal: tourAll, commTotal: commAll, count: allRows.length })

      if (mode === 'month') {
        const list = (d?.chi_tiet || []).map(r => ({
          id: r.id, ngay: r.ngay,
          ten: r.ten || (r.loai_item === 'the_moi' ? 'Bán thẻ liệu trình' : 'Dịch vụ'),
          khach: r.khach || 'Khách lẻ',
          thanh_tien: r.thanh_tien || 0, tien_tour: r.tien_tour || 0, tien_hoa_hong: r.tien_hoa_hong || 0,
        }))
        setSummary({
          tourTotal: list.reduce((s, r) => s + r.tien_tour, 0),
          commTotal: list.reduce((s, r) => s + r.tien_hoa_hong, 0),
          count: list.length,
        })
        setRows(list)
      } else {
        setSummary({ tourTotal: tourAll, commTotal: commAll, count: allRows.length })
        setRows(allRows)
      }
    } catch { /* phiên hết hạn */ }
    setLoading(false)
  }, [mode, year, month])

  useEffect(() => { loadData() }, [loadData])

  const prevMonth = () => {
    if (month === 1) { setYear(y => y - 1); setMonth(12) } else setMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (year === curYear && month === curMonth) return
    if (month === 12) { setYear(y => y + 1); setMonth(1) } else setMonth(m => m + 1)
  }

  // Group rows theo tháng (dùng khi mode = 'all')
  const grouped = (() => {
    const map = {}
    for (const r of rows) {
      const key = r.ngay.slice(0, 7) // YYYY-MM
      if (!map[key]) map[key] = []
      map[key].push(r)
    }
    return Object.entries(map).sort((a, b) => b[0].localeCompare(a[0]))
  })()

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
          <h2 style={{ fontFamily: LUX.fontSerif, fontSize: 26, fontWeight: 600, margin: 0, lineHeight: 1, letterSpacing: '-0.01em' }}>Thu Nhập</h2>
        </div>
      </header>

      <div style={{ padding: '0 18px' }} className="stagger">

        {/* ── All-Time Tổng Quan ── */}
        {allSummary && (
          <>
            <div />
            <div style={{
              margin: '-16px 0 12px', borderRadius: LUX.radiusLg, padding: '20px 22px', color: '#f5ede0',
              background: `radial-gradient(circle at 100% 100%, rgba(212,165,116,0.4), transparent 60%), linear-gradient(155deg,#4a3528 0%,#3d2c20 100%)`,
              position: 'relative', overflow: 'hidden',
            }}>
              <div style={{ position: 'absolute', bottom: -55, right: -10, fontSize: 160, fontFamily: LUX.fontSerif, fontWeight: 600, color: 'rgba(212,165,116,0.10)', lineHeight: 1 }}>₫</div>
              <div style={{ position: 'relative' }}>
                <div style={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(245,237,224,0.60)', marginBottom: 10 }}>
                  Tổng tích lũy — toàn thời gian ({allSummary.count} giao dịch)
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {[
                    { label: 'Tiền Tour',    icon: '✈️', value: allSummary.tourTotal },
                    { label: 'Hoa Hồng DV', icon: '💆', value: allSummary.commTotal },
                  ].map(item => (
                    <div key={item.label} style={{ background: 'rgba(245,237,224,0.10)', border: '1px solid rgba(245,237,224,0.12)', borderRadius: 14, padding: '14px 12px', backdropFilter: 'blur(8px)' }}>
                      <div style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(245,237,224,0.60)', marginBottom: 6 }}>
                        {item.icon} {item.label}
                      </div>
                      <div style={{ fontFamily: LUX.fontSerif, fontSize: 20, fontWeight: 700, lineHeight: 1, letterSpacing: '-0.01em' }}>
                        {formatCurrency(item.value)}
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 12, borderTop: '1px solid rgba(245,237,224,0.15)', paddingTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 11, color: 'rgba(245,237,224,0.60)', letterSpacing: '0.06em' }}>Tổng cộng</span>
                  <span style={{ fontFamily: LUX.fontSerif, fontSize: 26, fontWeight: 700, letterSpacing: '-0.01em' }}>
                    {formatCurrency(allSummary.tourTotal + allSummary.commTotal)}
                  </span>
                </div>
              </div>
            </div>
          </>
        )}

        {/* ── Bộ Lọc Mode ── */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
          {[{ id: 'month', label: 'Theo Tháng' }, { id: 'all', label: 'Toàn Bộ' }].map(m => (
            <button key={m.id} onClick={() => setMode(m.id)}
              style={{
                flex: 1, padding: '10px', borderRadius: 12, border: mode === m.id ? `2px solid ${LUX.espresso}` : `1px solid ${LUX.line}`,
                background: mode === m.id ? LUX.surface : LUX.surface2,
                color: mode === m.id ? LUX.espresso : LUX.ink3,
                fontFamily: LUX.fontSans, fontSize: 13, fontWeight: mode === m.id ? 700 : 400,
                cursor: 'pointer', transition: 'all .15s',
              }}>
              {m.label}
            </button>
          ))}
        </div>

        {/* ── Month Selector (chỉ hiện khi mode = month) ── */}
        {mode === 'month' && (
          <div style={{ background: LUX.surface2, border: `1px solid ${LUX.line}`, borderRadius: LUX.radius, padding: '12px 18px', boxShadow: LUX.shadow, display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <button onClick={prevMonth} style={{ width: 32, height: 32, borderRadius: '50%', background: LUX.surface, border: `1px solid ${LUX.line}`, cursor: 'pointer', color: LUX.ink2, display: 'grid', placeItems: 'center' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
            </button>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: LUX.fontSerif, fontSize: 20, fontWeight: 600, color: LUX.espresso, lineHeight: 1 }}>
                Tháng {month}/{year}
              </div>
              {summary && (
                <div style={{ fontSize: 10, letterSpacing: '0.10em', textTransform: 'uppercase', color: LUX.ink3, marginTop: 4 }}>
                  {summary.count} giao dịch
                </div>
              )}
            </div>
            <button onClick={nextMonth} style={{ width: 32, height: 32, borderRadius: '50%', background: LUX.surface, border: `1px solid ${LUX.line}`, cursor: year === curYear && month === curMonth ? 'default' : 'pointer', color: year === curYear && month === curMonth ? LUX.line : LUX.ink2, display: 'grid', placeItems: 'center' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
            </button>
          </div>
        )}

        {/* ── Summary Tháng (chỉ mode = month) ── */}
        {mode === 'month' && summary && !loading && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
            {[
              { label: 'Tiền Tour', icon: '✈️', value: summary.tourTotal, color: TOUR_COLOR, bg: TOUR_BG },
              { label: 'Hoa Hồng', icon: '💆', value: summary.commTotal, color: HH_COLOR, bg: HH_BG },
            ].map(item => (
              <div key={item.label} style={{ background: item.bg, borderRadius: 14, padding: '14px 14px', border: `1px solid ${item.color}20` }}>
                <div style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: item.color, marginBottom: 6, fontWeight: 600 }}>
                  {item.icon} {item.label}
                </div>
                <div style={{ fontFamily: LUX.fontSerif, fontSize: 22, fontWeight: 700, color: item.color }}>
                  {formatCurrency(item.value)}
                </div>
              </div>
            ))}
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: LUX.ink3 }}>Đang tải...</div>
        ) : rows.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0', color: LUX.ink3 }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🕊️</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: LUX.ink2 }}>Chưa có dữ liệu</div>
            <div style={{ fontSize: 12, color: LUX.ink3, marginTop: 6 }}>
              {mode === 'month' ? `Tháng ${month}/${year} chưa có tour hoặc hoa hồng` : 'Chưa có dữ liệu nào được ghi nhận'}
            </div>
          </div>
        ) : mode === 'month' ? (
          /* ── Danh sách lượt phục vụ (mode = month): STT · DV · ngày · khách · tour · HH ── */
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', margin: '0 2px 10px' }}>
              <span style={{ fontFamily: LUX.fontSerif, fontSize: 17, fontWeight: 600, color: LUX.espresso }}>Chi Tiết Tháng {month}/{year}</span>
              <span style={{ fontFamily: LUX.fontSans, fontSize: 11, color: LUX.ink3 }}>{rows.length} lượt</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {rows.map((r, idx) => (
                <div key={r.id} style={{ background: '#fff', border: `1px solid ${LUX.line}`, borderRadius: 14, padding: '12px 13px', boxShadow: LUX.shadowSm }}>
                  {/* Hàng 1: STT + tên dịch vụ + ngày */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ width: 26, height: 26, flexShrink: 0, borderRadius: 8, background: 'linear-gradient(135deg,#c9a96e,#a87f4f)', color: '#fff', fontFamily: LUX.fontSerif, fontWeight: 700, fontSize: 13, display: 'grid', placeItems: 'center' }}>{idx + 1}</span>
                    <span style={{ fontFamily: LUX.fontSans, fontSize: 13.5, fontWeight: 700, color: LUX.espresso, flex: 1, minWidth: 0, lineHeight: 1.25 }}>{r.ten}</span>
                    <span style={{ fontFamily: LUX.fontSans, fontSize: 11, color: LUX.ink3, whiteSpace: 'nowrap' }}>📅 {fmtDate(r.ngay)}</span>
                  </div>
                  {/* Hàng 2: khách hàng + doanh số */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, margin: '8px 0 0', paddingLeft: 36 }}>
                    <span style={{ fontFamily: LUX.fontSans, fontSize: 12, color: LUX.ink2, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>👤 {r.khach}</span>
                    <span style={{ fontFamily: LUX.fontSans, fontSize: 11, color: LUX.ink3, whiteSpace: 'nowrap' }}>DS {formatCurrency(r.thanh_tien)}</span>
                  </div>
                  {/* Hàng 3: tiền tour + hoa hồng */}
                  <div style={{ display: 'flex', gap: 8, marginTop: 9, paddingLeft: 36 }}>
                    {r.tien_tour > 0 && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: TOUR_BG, border: `1px solid ${TOUR_COLOR}40`, borderRadius: 8, padding: '5px 9px' }}>
                        <span style={{ fontSize: 11, color: TOUR_COLOR, fontWeight: 600 }}>Tiền Tour</span>
                        <span style={{ fontFamily: LUX.fontSerif, fontSize: 14, fontWeight: 700, color: TOUR_COLOR }}>{formatCurrency(r.tien_tour)}</span>
                      </span>
                    )}
                    {r.tien_hoa_hong > 0 && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: HH_BG, border: `1px solid ${HH_COLOR}40`, borderRadius: 8, padding: '5px 9px' }}>
                        <span style={{ fontSize: 11, color: HH_COLOR, fontWeight: 600 }}>Hoa Hồng</span>
                        <span style={{ fontFamily: LUX.fontSerif, fontSize: 14, fontWeight: 700, color: HH_COLOR }}>{formatCurrency(r.tien_hoa_hong)}</span>
                      </span>
                    )}
                  </div>
                </div>
              ))}
              {/* Tổng tháng */}
              <div style={{ borderRadius: LUX.radius, padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'linear-gradient(135deg,#fdf3e0,#f9ead0)', border: '1px solid #ecd9b3', marginTop: 2 }}>
                <span style={{ fontFamily: LUX.fontSerif, fontSize: 16, fontWeight: 600, color: LUX.espresso }}>Tổng tháng {month}/{year}</span>
                <span style={{ fontFamily: LUX.fontSerif, fontSize: 23, fontWeight: 700, color: LUX.espresso }}>
                  {formatCurrency((summary?.tourTotal || 0) + (summary?.commTotal || 0))}
                </span>
              </div>
            </div>
          </div>
        ) : (
          /* ── Group theo tháng (mode = all) ── */
          <div>
            {grouped.map(([monthKey, monthRows]) => {
              const [y, m] = monthKey.split('-')
              const mTour = monthRows.filter(r => r.loai === 'tour').reduce((s, r) => s + (r.so_tien || 0), 0)
              const mComm = monthRows.filter(r => r.loai === 'hoa_hong').reduce((s, r) => s + (r.so_tien || 0), 0)
              return (
                <div key={monthKey} style={{ marginBottom: 10, background: LUX.surface2, border: `1px solid ${LUX.line}`, borderRadius: LUX.radius, overflow: 'hidden' }}>
                  {/* Header tháng */}
                  <div style={{ padding: '10px 16px', background: 'linear-gradient(180deg,#fdf3e0,#f9ead0)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontFamily: LUX.fontSerif, fontSize: 16, fontWeight: 600, color: LUX.espresso }}>
                      {fmtMonth(y, parseInt(m))}
                    </span>
                    <div style={{ display: 'flex', gap: 10, fontSize: 12 }}>
                      {mTour > 0 && <span style={{ color: TOUR_COLOR, fontWeight: 600 }}>✈️ {formatCurrency(mTour)}</span>}
                      {mComm > 0 && <span style={{ color: HH_COLOR, fontWeight: 600 }}>💆 {formatCurrency(mComm)}</span>}
                    </div>
                  </div>
                  {/* Rows */}
                  {monthRows.map((r, _i) => {
                    const cfg = LOAI_CONFIG[r.loai] || { label: r.loai, icon: '📌', color: LUX.ink2, bg: LUX.surface2 }
                    return (
                      <div key={r.id} style={{
                        display: 'grid', gridTemplateColumns: '36px 1fr auto', gap: 10, alignItems: 'center',
                        padding: '12px 16px', borderTop: `1px solid ${LUX.line}`,
                      }}>
                        <div style={{ width: 36, height: 36, borderRadius: 10, background: cfg.bg, display: 'grid', placeItems: 'center', fontSize: 16, flexShrink: 0 }}>
                          {cfg.icon}
                        </div>
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 600, color: LUX.espresso, marginBottom: 1 }}>{cfg.label}</div>
                          <div style={{ fontSize: 10, color: LUX.ink3 }}>
                            {fmtDate(r.ngay)}
                            {r.ghi_chu ? ` · ${r.ghi_chu}` : ''}
                          </div>
                        </div>
                        <div style={{ fontFamily: LUX.fontSerif, fontSize: 15, fontWeight: 700, color: cfg.color }}>
                          +{formatCurrency(r.so_tien)}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
