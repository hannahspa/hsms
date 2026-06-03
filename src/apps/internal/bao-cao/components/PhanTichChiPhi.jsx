import { useState, useEffect } from 'react'
import { supabase } from '../../../../lib/supabase'
import { formatCurrency, getNowVN } from '../../../../lib/utils'
import I from '../../../../components/shared/Icons'

export default function PhanTichChiPhi({ onBack }) {
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

    Promise.all([
      supabase.from('chi_phi').select('so_tien, danh_muc_id').gte('ngay', start).lte('ngay', end),
      supabase.from('danh_muc_chi_phi').select('*').eq('is_active', true).order('thu_tu'),
    ]).then(([rCP, rDM]) => {
      const cpList = rCP.data || []
      const dmList = rDM.data || []
      const nhomList = dmList.filter(d => d.parent_id === null)
      const hangMucList = dmList.filter(d => d.parent_id !== null)

      // Tính tổng theo nhóm
      const byNhom = {}
      nhomList.forEach(n => { byNhom[n.id] = { ten: n.ten, icon: n.icon, total: 0, items: [] } })
      hangMucList.forEach(hm => {
        const tong = cpList.filter(cp => cp.danh_muc_id === hm.id).reduce((s, cp) => s + (cp.so_tien || 0), 0)
        const nhomId = hm.parent_id
        if (byNhom[nhomId]) {
          byNhom[nhomId].total += tong
          if (tong > 0) byNhom[nhomId].items.push({ ten: hm.ten, tong })
        }
      })
      const tongChi = cpList.reduce((s, r) => s + (r.so_tien || 0), 0)

      setData({ nhomList: Object.values(byNhom).filter(n => n.total > 0), tongChi, cpList })
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

  const donutColors = ['#c9a96e', '#a87366', '#6e8a5e', '#8a6a6e', '#5a8db8', '#b85a4a']

  return (
    <div style={{ padding: '22px 24px', flex: 1, overflow: 'auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={onBack} className="icon-btn" style={{ width: 36, height: 36 }}><I.ArrowLeft style={{ width: 16, height: 16 }} /></button>
          <div>
            <div style={{ fontFamily: 'var(--serif)', fontSize: 26, fontWeight: 700, color: 'var(--ink)' }}>Phân Tích Chi Phí</div>
            <div style={{ fontSize: 12, color: 'var(--ink3)' }}>Theo nhóm & hạng mục</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={() => changeMonth(-1)} className="icon-btn" style={{ width: 36, height: 36 }}>‹</button>
          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)', fontFamily: 'var(--serif)', minWidth: 140, textAlign: 'center' }}>
            Tháng {thang}/{nam}
          </span>
          <button onClick={() => changeMonth(1)} className="icon-btn" style={{ width: 36, height: 36 }}>›</button>
        </div>
      </div>

      {/* Tổng chi + Donut */}
      <div className="fin-grid" style={{ marginBottom: 16 }}>
        <div className="card">
          <div className="card-h">
            <div className="card-t"><div className="arch-i"><I.Tag style={{ width: 13, height: 13, color: '#8a6a52' }} /></div><h3>Tổng Chi Phí: {formatCurrency(data.tongChi)}</h3></div>
          </div>
          <div className="card-b">
            {data.nhomList.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 30, color: 'var(--ink3)' }}>Không có chi phí trong tháng này</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {data.nhomList.map((n, i) => {
                  const pct = data.tongChi > 0 ? Math.round(n.total / data.tongChi * 100) : 0
                  return (
                    <div key={i}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                        <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ink)' }}>{n.icon} {n.ten}</span>
                        <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--ink2)' }}>{formatCurrency(n.total)} <span style={{ color: 'var(--ink3)', fontWeight: 400 }}>({pct}%)</span></span>
                      </div>
                      <div className="bar-h"><i style={{ width: pct + '%', background: donutColors[i % donutColors.length] }} /></div>
                      {/* Hạng mục con */}
                      {n.items.length > 0 && (
                        <div style={{ marginTop: 4, marginLeft: 20 }}>
                          {n.items.map((hm, j) => (
                            <div key={j} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--ink3)', padding: '2px 0' }}>
                              <span>{hm.ten}</span><span style={{ fontWeight: 500 }}>{formatCurrency(hm.tong)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Donut Chart */}
        <div className="card">
          <div className="card-h">
            <div className="card-t"><div className="arch-i"><I.Tag style={{ width: 13, height: 13, color: '#8a6a52' }} /></div><h3>Cơ Cấu Chi Phí</h3></div>
          </div>
          <div className="card-b">
            {data.nhomList.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 30, color: 'var(--ink3)' }}>Chưa có dữ liệu</div>
            ) : (
              <div className="donut-wrap">
                <DonutChart segments={data.nhomList.map((n, i) => ({ v: n.total, c: donutColors[i % donutColors.length], l: n.ten }))} total={data.tongChi} />
                <div className="donut-leg">
                  {data.nhomList.map((n, i) => (
                    <div className="row" key={i}>
                      <span className="sw" style={{ background: donutColors[i % donutColors.length] }} />
                      <span>{n.ten}</span>
                      <b>{formatCurrency(n.total)}</b>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Donut Chart (copy từ Demo) ──
function DonutChart({ segments, total, size = 140, ring = 18 }) {
  const r = (size - ring) / 2; const cx = size / 2, cy = size / 2
  let acc = 0
  return (
    <svg viewBox={`0 0 ${size} ${size}`} style={{ width: size, height: size, flexShrink: 0 }}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#e8dcc8" strokeWidth={ring} />
      {segments.map((s, i) => {
        const len = 2 * Math.PI * r
        const part = (s.v / total) * len
        const off = acc; acc += part
        return <circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={s.c} strokeWidth={ring} strokeDasharray={`${part} ${len - part}`} strokeDashoffset={-off} transform={`rotate(-90 ${cx} ${cy})`} />
      })}
      <text x={cx} y={cy - 2} textAnchor="middle" fontSize="10" fill="#8e7a68" fontFamily="Inter" fontWeight="600">CHI</text>
      <text x={cx} y={cy + 14} textAnchor="middle" fontSize="16" fill="#2a201a" fontFamily="var(--serif)" fontWeight="700">{total >= 1000000 ? (total / 1000000).toFixed(1) + 'M' : total >= 1000 ? Math.round(total / 1000) + 'k' : total}</text>
    </svg>
  )
}
