import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../../../lib/supabase'
import { COLORS } from '../../../../constants/colors'
import { formatCurrency, todayISO } from '../../../../lib/utils'
import DatePicker from '../../../../components/shared/DatePicker'

const DAYS = ['CN','T2','T3','T4','T5','T6','T7']

function formatDateVN(isoStr) {
  const d = new Date(isoStr + 'T00:00:00')
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`
}

function formatDateFull(isoStr) {
  const d = new Date(isoStr + 'T00:00:00')
  return `${DAYS[d.getDay()]}, ${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`
}

function getDateRange(tab, currentDate) {
  const now = new Date(currentDate)
  if (tab === 'ngay') {
    const end   = new Date(now)
    const start = new Date(now)
    start.setDate(start.getDate() - 29)
    return {
      start: start.toISOString().split('T')[0],
      end:   end.toISOString().split('T')[0],
      label: `${formatDateVN(start.toISOString().split('T')[0])} - ${formatDateVN(end.toISOString().split('T')[0])}`
    }
  }
  if (tab === 'thang') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1)
    const end   = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    return {
      start: start.toISOString().split('T')[0],
      end:   end.toISOString().split('T')[0],
      label: `Tháng ${now.getMonth()+1}/${now.getFullYear()}`
    }
  }
  if (tab === 'nam') {
    const start = new Date(now.getFullYear(), 0, 1)
    const end   = new Date(now.getFullYear(), 11, 31)
    return {
      start: start.toISOString().split('T')[0],
      end:   end.toISOString().split('T')[0],
      label: `Năm ${now.getFullYear()}`
    }
  }
}

// ── AREA CHART ───────────────────────────────────────────
function AreaChart({ data, color }) {
  if (!data || data.length === 0) return null
  const maxVal = Math.max(...data.map(d => d.value), 1)
  const W = 340, H = 120, PAD = 8
  const points = data.map((d, i) => ({
    x: PAD + (i / Math.max(data.length - 1, 1)) * (W - PAD * 2),
    y: H - PAD - (d.value / maxVal) * (H - PAD * 2)
  }))
  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
  const areaPath = `${linePath} L ${points[points.length-1].x} ${H} L ${points[0].x} ${H} Z`
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: '120px' }}>
      <defs>
        <linearGradient id="chiAreaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={color} stopOpacity="0.35"/>
          <stop offset="100%" stopColor={color} stopOpacity="0.02"/>
        </linearGradient>
      </defs>
      <path d={areaPath} fill="url(#chiAreaGrad)" />
      <path d={linePath} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
      {points.map((p, i) => data[i].value > 0 && (
        <circle key={i} cx={p.x} cy={p.y} r="3" fill={color} />
      ))}
    </svg>
  )
}

export default function PhanTichChiPhi({ onBack }) {
  const [tab, setTab]                 = useState('ngay')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [data, setData]               = useState([])
  const [danhMuc, setDanhMuc]         = useState([])
  const [loading, setLoading]         = useState(false)
  const [showPicker, setShowPicker]   = useState(false)
  const [expandedNhom, setExpandedNhom] = useState(null)

  const range = useMemo(() => getDateRange(tab, currentDate), [tab, currentDate])

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      try {
        const [cp, dm] = await Promise.all([
          supabase.from('chi_phi').select('*')
            .gte('ngay', range.start).lte('ngay', range.end).order('ngay'),
          supabase.from('danh_muc_chi_phi').select('*'),
        ])
        setData(cp.data || [])
        setDanhMuc(dm.data || [])
      } catch(e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [range])

  const tongChi = data.reduce((s, r) => s + r.so_tien, 0)
  const tbNgay  = tongChi > 0 ? Math.round(tongChi / Math.max(
    [...new Set(data.map(r => r.ngay))].length, 1
  )) : 0

  // Phân tích theo nhóm + hạng mục
  const phanTichNhom = useMemo(() => {
    const nhomMap = {}
    data.forEach(cp => {
      const child  = danhMuc.find(d => d.id === cp.danh_muc_id)
      const parent = child ? danhMuc.find(d => d.id === child.parent_id) : null
      const nhomId   = parent?.id   || 'khac'
      const nhomTen  = parent?.ten  || 'Khác'
      const nhomIcon = parent?.icon || '🏷️'
      const hmTen    = child?.ten   || 'Khác'
      const hmId     = child?.id    || 'khac'

      if (!nhomMap[nhomId]) {
        nhomMap[nhomId] = { id: nhomId, ten: nhomTen, icon: nhomIcon, tong: 0, hangMuc: {} }
      }
      nhomMap[nhomId].tong += cp.so_tien

      if (!nhomMap[nhomId].hangMuc[hmId]) {
        nhomMap[nhomId].hangMuc[hmId] = { ten: hmTen, tong: 0 }
      }
      nhomMap[nhomId].hangMuc[hmId].tong += cp.so_tien
    })

    return Object.values(nhomMap)
      .sort((a, b) => b.tong - a.tong)
      .map(n => ({
        ...n,
        hangMuc: Object.values(n.hangMuc).sort((a, b) => b.tong - a.tong)
      }))
  }, [data, danhMuc])

  // Chart data
  const chartData = useMemo(() => {
    if (tab === 'ngay') {
      return Array.from({ length: 30 }, (_, i) => {
        const d = new Date(range.end + 'T00:00:00')
        d.setDate(d.getDate() - (29 - i))
        const iso = d.toISOString().split('T')[0]
        const total = data.filter(r => r.ngay === iso).reduce((s, r) => s + r.so_tien, 0)
        return { label: String(d.getDate()), value: total }
      })
    }
    if (tab === 'thang') {
      const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate()
      return Array.from({ length: daysInMonth }, (_, i) => {
        const day = i + 1
        const iso = `${currentDate.getFullYear()}-${String(currentDate.getMonth()+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`
        const total = data.filter(r => r.ngay === iso).reduce((s, r) => s + r.so_tien, 0)
        return { label: String(day), value: total }
      })
    }
    if (tab === 'nam') {
      return Array.from({ length: 12 }, (_, i) => {
        const m = i + 1
        const monthStr = `${currentDate.getFullYear()}-${String(m).padStart(2,'0')}`
        const total = data.filter(r => r.ngay.startsWith(monthStr)).reduce((s, r) => s + r.so_tien, 0)
        return { label: `T${m}`, value: total }
      })
    }
    return []
  }, [data, tab, range, currentDate])

  const prevPeriod = () => {
    const d = new Date(currentDate)
    if (tab === 'ngay')  d.setDate(d.getDate() - 30)
    if (tab === 'thang') d.setMonth(d.getMonth() - 1)
    if (tab === 'nam')   d.setFullYear(d.getFullYear() - 1)
    setCurrentDate(d)
  }
  const nextPeriod = () => {
    const d = new Date(currentDate)
    if (tab === 'ngay')  d.setDate(d.getDate() + 30)
    if (tab === 'thang') d.setMonth(d.getMonth() + 1)
    if (tab === 'nam')   d.setFullYear(d.getFullYear() + 1)
    setCurrentDate(d)
  }

  return (
    <div style={{ background: '#FAF7F4', minHeight: '100vh', paddingBottom: '100px' }}>

      <DatePicker
        open={showPicker}
        selectedDate={todayISO()}
        onClose={() => setShowPicker(false)}
        onConfirm={(iso) => { setCurrentDate(new Date(iso + 'T00:00:00')); setShowPicker(false) }}
      />

      {/* Header */}
      <div style={{ background: COLORS.grad, padding: '44px 20px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <button onClick={onBack} style={{
            width: '36px', height: '36px', borderRadius: '50%',
            background: 'rgba(255,255,255,0.2)', border: '1.5px solid rgba(255,255,255,0.3)',
            color: 'white', fontSize: '18px', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>←</button>
          <div style={{ color: 'white', fontWeight: '700', fontSize: '18px' }}>Phân Tích Chi Phí</div>
        </div>

        <div style={{ display: 'flex', background: 'rgba(255,255,255,0.15)', borderRadius: '12px', padding: '3px' }}>
          {['ngay','thang','nam'].map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              flex: 1, padding: '8px', borderRadius: '10px', border: 'none',
              background: tab === t ? 'white' : 'transparent',
              color: tab === t ? COLORS.primary : 'rgba(255,255,255,0.8)',
              fontWeight: tab === t ? '700' : '500', fontSize: '13px', cursor: 'pointer',
              transition: 'all 0.2s'
            }}>
              {t === 'ngay' ? 'Ngày' : t === 'thang' ? 'Tháng' : 'Năm'}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: '16px' }}>

        {/* Navigator */}
        <div style={{
          background: COLORS.card, borderRadius: '16px', padding: '12px 16px',
          marginBottom: '14px', boxShadow: COLORS.shadow, border: `1px solid ${COLORS.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between'
        }}>
          <button onClick={prevPeriod} style={{ background: 'none', border: 'none', fontSize: '20px', color: COLORS.textSub, cursor: 'pointer', padding: '4px 8px' }}>‹</button>
          <button onClick={() => setShowPicker(true)} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: '8px'
          }}>
            <span style={{ fontSize: '16px' }}>📅</span>
            <span style={{ fontSize: '13px', fontWeight: '700', color: COLORS.primary }}>{range.label}</span>
          </button>
          <button onClick={nextPeriod} style={{ background: 'none', border: 'none', fontSize: '20px', color: COLORS.textSub, cursor: 'pointer', padding: '4px 8px' }}>›</button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px', color: COLORS.textMute }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>📉</div>
            <div style={{ fontSize: '13px' }}>Đang tải dữ liệu...</div>
          </div>
        ) : (
          <>
            {/* Biểu đồ */}
            <div style={{ background: COLORS.card, borderRadius: '24px', padding: '20px', marginBottom: '14px', boxShadow: COLORS.shadow, border: `1px solid ${COLORS.border}` }}>
              <AreaChart data={chartData} color={COLORS.chi} />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '16px', paddingTop: '16px', borderTop: `1px solid ${COLORS.border}` }}>
                <div>
                  <div style={{ fontSize: '11px', color: COLORS.textMute, marginBottom: '2px' }}>Tổng Chi Tiêu</div>
                  <div style={{ fontWeight: '800', fontSize: '18px', color: COLORS.chi }}>{formatCurrency(tongChi)}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '11px', color: COLORS.textMute, marginBottom: '2px' }}>Trung bình / ngày</div>
                  <div style={{ fontWeight: '700', fontSize: '15px', color: COLORS.text }}>{formatCurrency(tbNgay)}</div>
                </div>
              </div>
            </div>

            {/* Phân tích theo nhóm */}
            {phanTichNhom.length === 0 ? (
              <div style={{ background: COLORS.card, borderRadius: '24px', padding: '40px 20px', textAlign: 'center', boxShadow: COLORS.shadow, border: `1px solid ${COLORS.border}` }}>
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>📋</div>
                <div style={{ fontSize: '13px', color: COLORS.textMute }}>Không có khoản chi nào trong kỳ này</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {phanTichNhom.map(nhom => {
                  const percent = tongChi > 0 ? (nhom.tong / tongChi) * 100 : 0
                  const isExpanded = expandedNhom === nhom.id
                  return (
                    <div key={nhom.id} style={{ background: COLORS.card, borderRadius: '20px', overflow: 'hidden', boxShadow: COLORS.shadow, border: `1px solid ${COLORS.border}` }}>
                      {/* Nhóm header */}
                      <button
                        onClick={() => setExpandedNhom(isExpanded ? null : nhom.id)}
                        style={{ display: 'flex', alignItems: 'center', width: '100%', padding: '16px 20px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
                      >
                        <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'linear-gradient(135deg,#FFF5F5,#FFE4E4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0, marginRight: '12px' }}>
                          {nhom.icon}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                            <span style={{ fontWeight: '700', fontSize: '14px', color: COLORS.text }}>{nhom.ten}</span>
                            <span style={{ fontWeight: '700', fontSize: '14px', color: COLORS.chi }}>{formatCurrency(nhom.tong)}</span>
                          </div>
                          {/* Progress bar */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ flex: 1, height: '6px', background: '#F8F3F0', borderRadius: '3px', overflow: 'hidden' }}>
                              <div style={{ width: `${percent}%`, height: '100%', background: COLORS.chi, borderRadius: '3px', transition: 'width 0.5s ease' }} />
                            </div>
                            <span style={{ fontSize: '11px', color: COLORS.textMute, fontWeight: '600', minWidth: '30px' }}>{percent.toFixed(0)}%</span>
                          </div>
                        </div>
                        <span style={{ color: COLORS.textMute, fontSize: '16px', marginLeft: '8px', transition: 'transform 0.2s', transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}>›</span>
                      </button>

                      {/* Hạng mục con */}
                      {isExpanded && (
                        <div style={{ borderTop: `1px solid ${COLORS.border}`, padding: '8px 20px 12px' }}>
                          {nhom.hangMuc.map((hm, i) => (
                            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0 8px 52px' }}>
                              <span style={{ fontSize: '13px', color: COLORS.textSub }}>{hm.ten}</span>
                              <span style={{ fontSize: '13px', fontWeight: '600', color: COLORS.chi }}>{formatCurrency(hm.tong)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}

                {/* Tổng */}
                <div style={{ background: 'linear-gradient(135deg,#FFF5F5,#FFE4E4)', borderRadius: '20px', padding: '16px 20px', border: 'rgba(192,57,43,0.2) 1px solid' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: '800', fontSize: '15px', color: COLORS.text }}>Tổng Chi Phí</span>
                    <span style={{ fontWeight: '800', fontSize: '18px', color: COLORS.chi }}>{formatCurrency(tongChi)}</span>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}