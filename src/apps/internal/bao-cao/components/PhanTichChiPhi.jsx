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
  const [currentDate, setCurrentDate] = useState(getNowVN())
  const [data, setData]               = useState([])
  const [danhMuc, setDanhMuc]         = useState([])
  const [loading, setLoading]         = useState(false)
  const [showPicker, setShowPicker]   = useState(false)

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

  const phanTichNhom = useMemo(() => {
    const nhomMap = {}
    data.forEach(cp => {
      const child  = danhMuc.find(d => d.id === cp.danh_muc_id)
      const parent = child ? danhMuc.find(d => d.id === child.parent_id) : null
      const nhomId   = parent?.id   || 'khac'
      const nhomTen  = parent?.ten  || 'Khác'
      const nhomIcon = parent?.icon || '🏷️'
      const hmTen    = child?.ten   || 'Khác'
      const hmId     = child?.id    || cp.danh_muc_id || 'khac'

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

  const chartData = useMemo(() => {
    if (tab === 'ngay') {
      return Array.from({ length: 30 }, (_, i) => {
        const d = new Date(range.end + 'T00:00:00')
        d.setDate(d.getDate() - (29 - i))
        const iso = d.toISOString().split('T')[0]
        return { label: String(d.getDate()), value: data.filter(r => r.ngay === iso).reduce((s, r) => s + r.so_tien, 0) }
      })
    }
    if (tab === 'thang') {
      const days = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate()
      return Array.from({ length: days }, (_, i) => {
        const iso = `${currentDate.getFullYear()}-${String(currentDate.getMonth()+1).padStart(2,'0')}-${String(i+1).padStart(2,'0')}`
        return { label: String(i+1), value: data.filter(r => r.ngay === iso).reduce((s, r) => s + r.so_tien, 0) }
      })
    }
    if (tab === 'nam') {
      return Array.from({ length: 12 }, (_, i) => {
        const monthStr = `${currentDate.getFullYear()}-${String(i+1).padStart(2,'0')}`
        return { label: `T${i+1}`, value: data.filter(r => r.ngay.startsWith(monthStr)).reduce((s, r) => s + r.so_tien, 0) }
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
      <div style={{ background: LUX.heroGrad, padding: '44px 20px 20px' }}>
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

        {/* Navigator */}
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
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>📉</div>
            <div style={{ fontSize: '13px' }}>Đang tải dữ liệu...</div>
          </div>
        ) : (
          <>
            {/* Biểu đồ */}
            <div style={{ background: LUX.surface2, borderRadius: '24px', padding: '20px', marginBottom: '14px', boxShadow: LUX.shadowSm, border: `1px solid ${LUX.line}` }}>
              <AreaChart data={chartData} color={'#C0392B'} />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '16px', paddingTop: '16px', borderTop: `1px solid ${LUX.line}` }}>
                <div>
                  <div style={{ fontSize: '11px', color: LUX.ink3, marginBottom: '2px' }}>Tổng Chi Tiêu</div>
                  <div style={{ fontWeight: '800', fontSize: '18px', color: '#C0392B' }}>{formatCurrency(tongChi)}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '11px', color: LUX.ink3, marginBottom: '2px' }}>Trung bình / ngày</div>
                  <div style={{ fontWeight: '700', fontSize: '15px', color: LUX.ink }}>{formatCurrency(tbNgay)}</div>
                </div>
              </div>
            </div>

            {/* Danh sách hạng mục */}
            {phanTichNhom.length === 0 ? (
              <div style={{ background: LUX.surface2, borderRadius: '24px', padding: '40px 20px', textAlign: 'center', boxShadow: LUX.shadowSm, border: `1px solid ${LUX.line}` }}>
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>📋</div>
                <div style={{ fontSize: '13px', color: LUX.ink3 }}>Không có khoản chi nào trong kỳ này</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>

                {/* Flat list — từng hạng mục con */}
                {phanTichNhom.flatMap(nhom =>
                  nhom.hangMuc.map((hm, i) => {
                    const percent = tongChi > 0 ? (hm.tong / tongChi) * 100 : 0
                    return (
                      <div key={`${nhom.id}-${i}`} style={{
                        background: LUX.surface2, borderRadius: '16px', padding: '14px 16px',
                        boxShadow: LUX.shadowSm, border: `1px solid ${LUX.line}`
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                          {/* Icon nhóm cha */}
                          <div style={{
                            width: '36px', height: '36px', borderRadius: '10px',
                            background: 'linear-gradient(135deg,#FFF5F5,#FFE4E4)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '18px', flexShrink: 0
                          }}>
                            {nhom.icon}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            {/* Tên nhóm cha nhỏ bên trên */}
                            <div style={{ fontSize: '10px', color: LUX.ink3, fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                              {nhom.ten}
                            </div>
                            {/* Tên hạng mục con — TO và RÕ */}
                            <div style={{ fontSize: '14px', fontWeight: '700', color: LUX.ink, marginTop: '1px' }}>
                              {hm.ten}
                            </div>
                          </div>
                          <div style={{ fontWeight: '800', fontSize: '15px', color: '#C0392B', flexShrink: 0 }}>
                            {formatCurrency(hm.tong)}
                          </div>
                        </div>

                        {/* Progress bar */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ flex: 1, height: '5px', background: '#F0EBE6', borderRadius: '3px', overflow: 'hidden' }}>
                            <div style={{
                              width: `${percent}%`, height: '100%',
                              background: '#C0392B', borderRadius: '3px',
                              transition: 'width 0.5s ease'
                            }} />
                          </div>
                          <span style={{ fontSize: '11px', color: LUX.ink3, fontWeight: '600', minWidth: '36px', textAlign: 'right' }}>
                            {percent.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    )
                  })
                )}

                {/* Tổng */}
                <div style={{
                  background: 'linear-gradient(135deg,#FFF5F5,#FFE4E4)',
                  borderRadius: '20px', padding: '16px 20px',
                  border: '1px solid rgba(192,57,43,0.2)', marginTop: '4px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: '800', fontSize: '15px', color: LUX.ink }}>Tổng Chi Phí</span>
                    <span style={{ fontWeight: '800', fontSize: '18px', color: '#C0392B' }}>{formatCurrency(tongChi)}</span>
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