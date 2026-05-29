import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
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

const LOAI_CONFIG = {
  tour:     { label: 'Tiền Tour',    icon: '✈️', color: '#1A5276', bg: '#D6EAF8' },
  hoa_hong: { label: 'Hoa Hồng DV', icon: '💆', color: '#145A32', bg: '#D5F5E3' },
  // Legacy key (không còn data mới nhưng giữ để hiển thị data cũ nếu có)
  commission: { label: 'Hoa Hồng DV', icon: '💆', color: '#145A32', bg: '#D5F5E3' },
}

function fmtDate(d) {
  if (!d) return ''
  const [y, m, day] = d.split('-')
  return `${day}/${m}/${y}`
}

function fmtMonth(y, m) {
  return `Tháng ${m}/${y}`
}

export default function CheckinThuNhap({ nhanVien, onBack }) {
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

  // Tải tổng all-time 1 lần
  useEffect(() => {
    supabase
      .from('nhan_vien_thu_nhap')
      .select('loai, so_tien')
      .eq('nhan_vien_id', nhanVien.id)
      .eq('is_test', false)
      .then(({ data }) => {
        if (!data) return
        const tourTotal  = data.filter(r => r.loai === 'tour').reduce((s, r) => s + (r.so_tien || 0), 0)
        const commTotal  = data.filter(r => r.loai === 'hoa_hong').reduce((s, r) => s + (r.so_tien || 0), 0)
        setAllSummary({ tourTotal, commTotal, count: data.length })
      })
  }, [nhanVien.id])

  const loadData = useCallback(async () => {
    setLoading(true)
    let q = supabase
      .from('nhan_vien_thu_nhap')
      .select('id,ngay,loai,so_tien,doanh_so_tinh,ti_le,ghi_chu,nguon')
      .eq('nhan_vien_id', nhanVien.id)
      .eq('is_test', false)
      .order('ngay', { ascending: false })
      .order('created_at', { ascending: false })

    if (mode === 'month') {
      const pad  = n => String(n).padStart(2, '0')
      const daysInMonth = new Date(year, month, 0).getDate()
      q = q
        .gte('ngay', `${year}-${pad(month)}-01`)
        .lte('ngay', `${year}-${pad(month)}-${pad(daysInMonth)}`)
    }

    const { data, error } = await q
    if (error) { setLoading(false); return }

    const list = data || []
    const tourTotal  = list.filter(r => r.loai === 'tour').reduce((s, r) => s + (r.so_tien || 0), 0)
    const commTotal  = list.filter(r => r.loai === 'hoa_hong').reduce((s, r) => s + (r.so_tien || 0), 0)
    setSummary({ tourTotal, commTotal, count: list.length })
    setRows(list)
    setLoading(false)
  }, [nhanVien.id, mode, year, month])

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
              { label: 'Tiền Tour', icon: '✈️', value: summary.tourTotal, color: '#1A5276', bg: '#D6EAF8' },
              { label: 'Hoa Hồng', icon: '💆', value: summary.commTotal, color: '#145A32', bg: '#D5F5E3' },
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
          /* ── Danh sách giao dịch theo ngày (mode = month) ── */
          <div style={{ background: LUX.surface2, border: `1px solid ${LUX.line}`, borderRadius: LUX.radius, overflow: 'hidden' }}>
            <div style={{ padding: '12px 18px', borderBottom: `1px solid ${LUX.line}` }}>
              <span style={{ fontFamily: LUX.fontSerif, fontSize: 17, fontWeight: 600, color: LUX.espresso }}>
                Chi Tiết Tháng {month}/{year}
              </span>
            </div>
            <div style={{ padding: '4px 0' }}>
              {rows.map((r, i) => {
                const cfg = LOAI_CONFIG[r.loai] || { label: r.loai, icon: '📌', color: LUX.ink2, bg: LUX.surface2 }
                return (
                  <div key={r.id} style={{
                    display: 'grid', gridTemplateColumns: '40px 1fr auto', gap: 12, alignItems: 'center',
                    padding: '14px 18px', borderTop: i === 0 ? 'none' : `1px solid ${LUX.line}`,
                  }}>
                    <div style={{ width: 40, height: 40, borderRadius: 12, background: cfg.bg, display: 'grid', placeItems: 'center', fontSize: 18, flexShrink: 0 }}>
                      {cfg.icon}
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: LUX.espresso }}>{cfg.label}</span>
                        <span style={{ fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: cfg.color, background: cfg.bg, padding: '2px 6px', borderRadius: 999, fontWeight: 600 }}>
                          {r.nguon === 'myspa_commission' ? 'MySpa' : r.nguon === 'pos' ? 'POS' : r.nguon}
                        </span>
                      </div>
                      <div style={{ fontSize: 11, color: LUX.ink3, lineHeight: 1.4 }}>
                        {fmtDate(r.ngay)}
                        {r.ghi_chu ? ` · ${r.ghi_chu}` : ''}
                        {r.doanh_so_tinh ? ` · DS: ${formatCurrency(r.doanh_so_tinh)}` : ''}
                        {r.ti_le ? ` (${r.ti_le}%)` : ''}
                      </div>
                    </div>
                    <div style={{ fontFamily: LUX.fontSerif, fontSize: 17, fontWeight: 700, color: cfg.color, textAlign: 'right' }}>
                      +{formatCurrency(r.so_tien)}
                    </div>
                  </div>
                )
              })}
              {/* Tổng tháng */}
              <div style={{ borderTop: `1.5px solid ${LUX.line}`, padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'linear-gradient(180deg,#fdf3e0,#f9ead0)' }}>
                <span style={{ fontFamily: LUX.fontSerif, fontSize: 15, fontWeight: 600, color: LUX.espresso }}>
                  Tổng tháng {month}/{year}
                </span>
                <span style={{ fontFamily: LUX.fontSerif, fontSize: 22, fontWeight: 700, color: LUX.espresso }}>
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
                      {mTour > 0 && <span style={{ color: '#1A5276', fontWeight: 600 }}>✈️ {formatCurrency(mTour)}</span>}
                      {mComm > 0 && <span style={{ color: '#145A32', fontWeight: 600 }}>💆 {formatCurrency(mComm)}</span>}
                    </div>
                  </div>
                  {/* Rows */}
                  {monthRows.map((r, i) => {
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
