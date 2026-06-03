import { useState, useEffect } from 'react'
import { supabase } from '../../../../lib/supabase'
import { formatCurrency, getNowVN } from '../../../../lib/utils'
import I from '../../../../components/shared/Icons'

const HINH_THUC = [
  { id: 'tien_mat', label: 'Tiền Mặt', icon: '💵', color: '#3e5a32' },
  { id: 'chuyen_khoan', label: 'Chuyển Khoản', icon: '🏦', color: '#1a4f70' },
  { id: 'quet_the', label: 'Quẹt Thẻ', icon: '💳', color: '#5e2f74' },
  { id: 'the_tra_truoc', label: 'Thẻ Trả Trước', icon: '🎫', color: '#6e4a1f' },
]

export default function PhanTichDoanhThu({ onBack }) {
  const now = getNowVN()
  const [thang, setThang] = useState(now.getMonth() + 1)
  const [nam, setNam] = useState(now.getFullYear())
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    const start = `${nam}-${String(thang).padStart(2, '0')}-01`
    const endDate = new Date(nam, thang, 0)
    const end = `${nam}-${String(thang).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`

    let prevStart, prevEnd
    if (thang === 1) {
      prevStart = `${nam - 1}-12-01`; prevEnd = `${nam - 1}-12-31`
    } else {
      const prevM = thang - 1
      const prevLastDay = new Date(nam, prevM, 0).getDate()
      prevStart = `${nam}-${String(prevM).padStart(2, '0')}-01`
      prevEnd = `${nam}-${String(prevM).padStart(2, '0')}-${String(prevLastDay).padStart(2, '0')}`
    }

    Promise.all([
      supabase.from('doanh_thu').select('so_tien, hinh_thuc, ngay, dien_giai').gte('ngay', start).lte('ngay', end).order('ngay', { ascending: false }),
      supabase.from('doanh_thu').select('so_tien, hinh_thuc').gte('ngay', prevStart).lte('ngay', prevEnd),
    ]).then(([rDT, rPrev]) => {
      const dtList = rDT.data || []
      const prevList = rPrev.data || []
      const byHT = {}
      HINH_THUC.forEach(ht => {
        const total = dtList.filter(r => r.hinh_thuc === ht.id).reduce((s, r) => s + (r.so_tien || 0), 0)
        const prevTotal = prevList.filter(r => r.hinh_thuc === ht.id).reduce((s, r) => s + (r.so_tien || 0), 0)
        byHT[ht.id] = { ...ht, total, prevTotal, count: dtList.filter(r => r.hinh_thuc === ht.id).length }
      })
      const tongDoanhThu = dtList.reduce((s, r) => s + (r.so_tien || 0), 0)
      const thucThu = dtList.filter(r => r.hinh_thuc !== 'the_tra_truoc').reduce((s, r) => s + (r.so_tien || 0), 0)
      const prevThucThu = prevList.filter(r => r.hinh_thuc !== 'the_tra_truoc').reduce((s, r) => s + (r.so_tien || 0), 0)
      setData({ dtList, byHT, tongDoanhThu, thucThu, prevThucThu })
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [thang, nam])

  const changeMonth = (delta) => {
    let m = thang + delta; let y = nam
    if (m > 12) { m = 1; y++ }
    if (m < 1) { m = 12; y-- }
    setThang(m); setNam(y)
  }

  if (loading) return <div style={{ padding: 60, textAlign: 'center', color: 'var(--ink3)' }}>Đang tải...</div>

  const donutColors = ['#c9a96e', '#a87366', '#6e8a5e', '#8a6a6e']
  const donutSegs = HINH_THUC.map((ht, i) => ({ v: data.byHT[ht.id]?.total || 0, c: donutColors[i], l: ht.label }))
  const pctChange = data.prevThucThu > 0 ? Math.round((data.thucThu - data.prevThucThu) / data.prevThucThu * 100) : 0

  return (
    <div style={{ padding: '22px 24px', flex: 1, overflow: 'auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={onBack} className="icon-btn" style={{ width: 36, height: 36 }}><I.ArrowLeft style={{ width: 16, height: 16 }} /></button>
          <div>
            <div style={{ fontFamily: 'var(--serif)', fontSize: 26, fontWeight: 700, color: 'var(--ink)' }}>Phân Tích Doanh Thu</div>
            <div style={{ fontSize: 12, color: 'var(--ink3)' }}>Theo hình thức thu</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={() => changeMonth(-1)} className="icon-btn" style={{ width: 36, height: 36 }}>‹</button>
          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)', fontFamily: 'var(--serif)', minWidth: 140, textAlign: 'center' }}>Tháng {thang}/{nam}</span>
          <button onClick={() => changeMonth(1)} className="icon-btn" style={{ width: 36, height: 36 }}>›</button>
        </div>
      </div>

      <div className="strip" style={{ gridTemplateColumns: 'repeat(3,1fr)', marginBottom: 16 }}>
        <div className="it"><div className="l">TỔNG DOANH THU</div><div className="v" style={{ color: '#426a2c' }}>{formatCurrency(data.tongDoanhThu)}</div><div className="d">{data.dtList.length} giao dịch</div></div>
        <div className="it"><div className="l">THỰC THU</div><div className="v" style={{ color: '#426a2c' }}>{formatCurrency(data.thucThu)}</div><div className="d">Không tính thẻ TT</div></div>
        <div className="it"><div className="l">SO THÁNG TRƯỚC</div>
          <div className="v" style={{ color: pctChange >= 0 ? '#426a2c' : '#843a23' }}>{pctChange >= 0 ? '↑' : '↓'} {Math.abs(pctChange)}%</div>
          <div className="d">Thực thu tháng trước: {formatCurrency(data.prevThucThu)}</div>
        </div>
      </div>

      <div className="fin-grid" style={{ marginBottom: 16 }}>
        <div className="card">
          <div className="card-h">
            <div className="card-t"><div className="arch-i"><I.Tag style={{ width: 13, height: 13, color: '#8a6a52' }} /></div><h3>Cơ Cấu Doanh Thu</h3></div>
            <span className="chip">Tháng {thang}</span>
          </div>
          <div className="card-b">
            <div className="donut-wrap">
              <DonutChart segments={donutSegs} total={data.tongDoanhThu || 1} />
              <div className="donut-leg">
                {HINH_THUC.map((ht, i) => (
                  <div className="row" key={i}><span className="sw" style={{ background: donutColors[i] }} /><span>{ht.label}</span><b>{formatCurrency(data.byHT[ht.id]?.total || 0)}</b></div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-h"><div className="card-t"><div className="arch-i"><I.Receipt style={{ width: 13, height: 13, color: '#8a6a52' }} /></div><h3>Chi Tiết Theo Hình Thức</h3></div></div>
          <div className="card-b">
            {HINH_THUC.map((ht, i) => {
              const info = data.byHT[ht.id]
              const pct = data.tongDoanhThu > 0 ? Math.round((info?.total || 0) / data.tongDoanhThu * 100) : 0
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, background: 'var(--bg2)', border: '1px solid var(--line)', marginBottom: i < 3 ? 8 : 0 }}>
                  <div style={{ fontSize: 22 }}>{ht.icon}</div>
                  <div style={{ flex: 1 }}><div style={{ fontWeight: 600, fontSize: 13, color: 'var(--ink)' }}>{ht.label}</div><div style={{ fontSize: 11, color: 'var(--ink3)' }}>{info?.count || 0} giao dịch · {pct}%</div></div>
                  <div style={{ fontFamily: 'var(--serif)', fontSize: 16, fontWeight: 700, color: ht.color }}>{formatCurrency(info?.total || 0)}</div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

function DonutChart({ segments, total, size = 140, ring = 18 }) {
  const r = (size - ring) / 2; const cx = size / 2, cy = size / 2
  let acc = 0
  return (
    <svg viewBox={`0 0 ${size} ${size}`} style={{ width: size, height: size, flexShrink: 0 }}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#e8dcc8" strokeWidth={ring} />
      {segments.map((s, i) => {
        const len = 2 * Math.PI * r; const part = (s.v / total) * len; const off = acc; acc += part
        return <circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={s.c} strokeWidth={ring} strokeDasharray={`${part} ${len - part}`} strokeDashoffset={-off} transform={`rotate(-90 ${cx} ${cy})`} />
      })}
      <text x={cx} y={cy - 2} textAnchor="middle" fontSize="10" fill="#8e7a68" fontFamily="Inter" fontWeight="600">THU</text>
      <text x={cx} y={cy + 14} textAnchor="middle" fontSize="16" fill="#2a201a" fontFamily="var(--serif)" fontWeight="700">{total >= 1000000 ? (total / 1000000).toFixed(1) + 'M' : total >= 1000 ? Math.round(total / 1000) + 'k' : total}</text>
    </svg>
  )
}
