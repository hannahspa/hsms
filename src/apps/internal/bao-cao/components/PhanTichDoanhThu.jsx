import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../../../lib/supabase'
import { LUX } from '../../../../constants/lux'
import { formatCurrency, todayISO , getNowVN} from '../../../../lib/utils'
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
    // 30 ngày gần nhất
    const end = new Date(now)
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

// ── AREA CHART CSS THUẦN ─────────────────────────────────
function AreaChart({ data, color }) {
  if (!data || data.length === 0) return null
  const maxVal = Math.max(...data.map(d => d.value), 1)
  const W = 340, H = 120, PAD = 8

  const points = data.map((d, i) => ({
    x: PAD + (i / (data.length - 1)) * (W - PAD * 2),
    y: H - PAD - (d.value / maxVal) * (H - PAD * 2)
  }))

  const linePath  = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
  const areaPath  = `${linePath} L ${points[points.length-1].x} ${H} L ${points[0].x} ${H} Z`

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: '120px' }}>
      <defs>
        <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={color} stopOpacity="0.35"/>
          <stop offset="100%" stopColor={color} stopOpacity="0.02"/>
        </linearGradient>
      </defs>
      <path d={areaPath} fill="url(#areaGrad)" />
      <path d={linePath} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
      {points.map((p, i) => data[i].value > 0 && (
        <circle key={i} cx={p.x} cy={p.y} r="3" fill={color} />
      ))}
    </svg>
  )
}

export default function PhanTichDoanhThu({ onBack }) {
  const [tab, setTab]               = useState('ngay')
  const [currentDate, setCurrentDate] = useState(getNowVN())
  const [data, setData]             = useState([])
  const [loading, setLoading]       = useState(false)
  const [showPicker, setShowPicker] = useState(false)
  const [pickerTarget, setPickerTarget] = useState(null)

  const range = useMemo(() => getDateRange(tab, currentDate), [tab, currentDate])

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      try {
        const { data: dt } = await supabase
          .from('doanh_thu').select('ngay, so_tien, hinh_thuc')
          .gte('ngay', range.start).lte('ngay', range.end)
          .order('ngay')
        setData(dt || [])
      } catch(e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [range])

  // Group by ngày
  const byNgay = useMemo(() => {
    const map = {}
    data.forEach(r => {
      if (!map[r.ngay]) map[r.ngay] = 0
      if (r.hinh_thuc !== 'the_tra_truoc') map[r.ngay] += r.so_tien
    })
    return Object.entries(map)
      .map(([ngay, value]) => ({ ngay, value }))
      .sort((a, b) => b.ngay.localeCompare(a.ngay))
  }, [data])

  const thucThu = data
    .filter(r => r.hinh_thuc !== 'the_tra_truoc')
    .reduce((s, r) => s + r.so_tien, 0)

  const tbNgay = byNgay.length > 0 ? Math.round(thucThu / byNgay.length) : 0

  // Chart data (30 ngày)
  const chartData = useMemo(() => {
    if (tab === 'ngay') {
      return Array.from({ length: 30 }, (_, i) => {
        const d = new Date(range.end + 'T00:00:00')
        d.setDate(d.getDate() - (29 - i))
        const iso = d.toISOString().split('T')[0]
        const found = byNgay.find(b => b.ngay === iso)
        return { label: String(d.getDate()), value: found?.value || 0 }
      })
    }
    if (tab === 'thang') {
      const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate()
      return Array.from({ length: daysInMonth }, (_, i) => {
        const day = i + 1
        const iso = `${currentDate.getFullYear()}-${String(currentDate.getMonth()+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`
        const found = byNgay.find(b => b.ngay === iso)
        return { label: String(day), value: found?.value || 0 }
      })
    }
    if (tab === 'nam') {
      return Array.from({ length: 12 }, (_, i) => {
        const m = i + 1
        const monthStr = `${currentDate.getFullYear()}-${String(m).padStart(2,'0')}`
        const total = data
          .filter(r => r.ngay.startsWith(monthStr) && r.hinh_thuc !== 'the_tra_truoc')
          .reduce((s, r) => s + r.so_tien, 0)
        return { label: `T${m}`, value: total }
      })
    }
    return []
  }, [data, tab, range, byNgay, currentDate])

  // Navigation
  const prevPeriod = () => {
    const d = new Date(currentDate)
    if (tab === 'ngay')   d.setDate(d.getDate() - 30)
    if (tab === 'thang')  d.setMonth(d.getMonth() - 1)
    if (tab === 'nam')    d.setFullYear(d.getFullYear() - 1)
    setCurrentDate(d)
  }
  const nextPeriod = () => {
    const d = new Date(currentDate)
    if (tab === 'ngay')   d.setDate(d.getDate() + 30)
    if (tab === 'thang')  d.setMonth(d.getMonth() + 1)
    if (tab === 'nam')    d.setFullYear(d.getFullYear() + 1)
    setCurrentDate(d)
  }

  return (
    <div style={{ background: '#FAF7F4', minHeight: '100vh', paddingBottom: '100px' }}>

      <DatePicker
        open={showPicker}
        selectedDate={todayISO()}
        onClose={() => setShowPicker(false)}
        onConfirm={(iso) => {
          setCurrentDate(new Date(iso + 'T00:00:00'))
          setShowPicker(false)
        }}
      />

      {/* Header */}
      <div style={{ background: LUX.heroGrad, padding: '44px 20px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <button onClick={onBack} style={{
            width: '36px', height: '36px', borderRadius: '50%',
            background: 'rgba(255,255,255,0.2)', border: '1.5px solid rgba(255,255,255,0.3)',
            color: 'white', fontSize: '18px', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>←</button>
          <div style={{ color: 'white', fontWeight: '700', fontSize: '18px' }}>Phân Tích Doanh Thu</div>
        </div>

        {/* Tab Ngày / Tháng / Năm */}
        <div style={{ display: 'flex', background: 'rgba(255,255,255,0.15)', borderRadius: '12px', padding: '3px' }}>
          {['ngay','thang','nam'].map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              flex: 1, padding: '8px', borderRadius: '10px', border: 'none',
              background: tab === t ? 'white' : 'transparent',
              color: tab === t ? LUX.taupe : 'rgba(255,255,255,0.8)',
              fontWeight: tab === t ? '700' : '500', fontSize: '13px', cursor: 'pointer',
              transition: 'all 0.2s'
            }}>
              {t === 'ngay' ? 'Ngày' : t === 'thang' ? 'Tháng' : 'Năm'}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: '16px' }}>

        {/* Date range navigator */}
        <div style={{
          background: LUX.surface2, borderRadius: '16px', padding: '12px 16px',
          marginBottom: '14px', boxShadow: LUX.shadowSm, border: `1px solid ${LUX.line}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between'
        }}>
          <button onClick={prevPeriod} style={{ background: 'none', border: 'none', fontSize: '20px', color: LUX.ink2, cursor: 'pointer', padding: '4px 8px' }}>‹</button>
          <button onClick={() => setShowPicker(true)} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: '8px'
          }}>
            <span style={{ fontSize: '16px' }}>📅</span>
            <span style={{ fontSize: '13px', fontWeight: '700', color: LUX.taupe }}>{range.label}</span>
          </button>
          <button onClick={nextPeriod} style={{ background: 'none', border: 'none', fontSize: '20px', color: LUX.ink2, cursor: 'pointer', padding: '4px 8px' }}>›</button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px', color: LUX.ink3 }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>📈</div>
            <div style={{ fontSize: '13px' }}>Đang tải dữ liệu...</div>
          </div>
        ) : (
          <>
            {/* Biểu đồ */}
            <div style={{ background: LUX.surface2, borderRadius: '24px', padding: '20px', marginBottom: '14px', boxShadow: LUX.shadowSm, border: `1px solid ${LUX.line}` }}>
              <AreaChart data={chartData} color={'#2D7A4F'} />

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '16px', paddingTop: '16px', borderTop: `1px solid ${LUX.line}` }}>
                <div>
                  <div style={{ fontSize: '11px', color: LUX.ink3, marginBottom: '2px' }}>Tổng Thu</div>
                  <div style={{ fontWeight: '800', fontSize: '18px', color: '#2D7A4F' }}>{formatCurrency(thucThu)}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '11px', color: LUX.ink3, marginBottom: '2px' }}>Trung bình / ngày</div>
                  <div style={{ fontWeight: '700', fontSize: '15px', color: LUX.ink }}>{formatCurrency(tbNgay)}</div>
                </div>
              </div>
            </div>

            {/* Danh sách theo ngày */}
            {byNgay.length === 0 ? (
              <div style={{ background: LUX.surface2, borderRadius: '24px', padding: '40px 20px', textAlign: 'center', boxShadow: LUX.shadowSm, border: `1px solid ${LUX.line}` }}>
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>📊</div>
                <div style={{ fontSize: '13px', color: LUX.ink3 }}>Không có doanh thu trong kỳ này</div>
              </div>
            ) : (
              <div style={{ background: LUX.surface2, borderRadius: '24px', padding: '4px 0', boxShadow: LUX.shadowSm, border: `1px solid ${LUX.line}` }}>
                {byNgay.map((item, i) => (
                  <div key={item.ngay}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px' }}>
                      <div>
                        <div style={{ fontWeight: '600', fontSize: '14px', color: LUX.ink }}>
                          {formatDateFull(item.ngay)}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: '700', fontSize: '15px', color: '#2D7A4F' }}>
                          {formatCurrency(item.value)}
                        </span>
                        <span style={{ color: LUX.ink3, fontSize: '16px' }}>›</span>
                      </div>
                    </div>
                    {i < byNgay.length - 1 && (
                      <div style={{ height: '1px', background: 'linear-gradient(90deg,transparent,rgba(160,113,79,0.1),transparent)', margin: '0 20px' }} />
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}