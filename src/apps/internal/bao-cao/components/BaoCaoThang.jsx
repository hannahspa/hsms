import { useState, useEffect } from 'react'
import { supabase } from '../../../../lib/supabase'
import { formatCurrency, getNowVN, formatDateInput } from '../../../../lib/utils'
import I from '../../../../components/shared/Icons'

export default function BaoCaoThang({ onBack }) {
  const now = getNowVN()
  const [thang, setThang] = useState(now.getMonth() + 1)
  const [nam, setNam] = useState(now.getFullYear())
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    const start = `${nam}-${String(thang).padStart(2, '0')}-01`
    const lastDay = new Date(nam, thang, 0).getDate()
    const end = `${nam}-${String(thang).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

    Promise.all([
      supabase.from('doanh_thu').select('so_tien, hinh_thuc, ngay').gte('ngay', start).lte('ngay', end).order('ngay'),
      supabase.from('chi_phi').select('so_tien, ngay').gte('ngay', start).lte('ngay', end).order('ngay'),
    ]).then(([rDT, rCP]) => {
      const dtList = rDT.data || []
      const cpList = rCP.data || []
      const thucThu = dtList.filter(r => r.hinh_thuc !== 'the_tra_truoc').reduce((s, r) => s + (r.so_tien || 0), 0)
      const tongChi = cpList.reduce((s, r) => s + (r.so_tien || 0), 0)

      // Theo ngày
      const byDay = {}
      for (let d = 1; d <= lastDay; d++) {
        const iso = `${nam}-${String(thang).padStart(2, '0')}-${String(d).padStart(2, '0')}`
        byDay[iso] = { thu: 0, chi: 0, day: d }
      }
      dtList.forEach(r => { if (byDay[r.ngay] && r.hinh_thuc !== 'the_tra_truoc') byDay[r.ngay].thu += (r.so_tien || 0) })
      cpList.forEach(r => { if (byDay[r.ngay]) byDay[r.ngay].chi += (r.so_tien || 0) })
      const days = Object.values(byDay)

      // Theo hình thức
      const tienMat = dtList.filter(r => r.hinh_thuc === 'tien_mat').reduce((s, r) => s + (r.so_tien || 0), 0)
      const chuyenKhoan = dtList.filter(r => r.hinh_thuc === 'chuyen_khoan').reduce((s, r) => s + (r.so_tien || 0), 0)
      const quetThe = dtList.filter(r => r.hinh_thuc === 'quet_the').reduce((s, r) => s + (r.so_tien || 0), 0)
      const theTT = dtList.filter(r => r.hinh_thuc === 'the_tra_truoc').reduce((s, r) => s + (r.so_tien || 0), 0)

      setData({ dtList, cpList, thucThu, tongChi, days, tienMat, chuyenKhoan, quetThe, theTT, lastDay })
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [thang, nam])

  const changeMonth = (delta) => { let m = thang + delta; let y = nam; if (m > 12) { m = 1; y++ } if (m < 1) { m = 12; y-- }; setThang(m); setNam(y) }

  if (loading) return <div style={{ padding: 60, textAlign: 'center', color: 'var(--ink3)' }}>Đang tải...</div>

  const maxVal = Math.max(...data.days.map(d => Math.max(d.thu, d.chi)), 1)

  return (
    <div style={{ padding: '22px 24px', flex: 1, overflow: 'auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={onBack} className="icon-btn" style={{ width: 36, height: 36 }}><I.ArrowLeft style={{ width: 16, height: 16 }} /></button>
          <div>
            <div style={{ fontFamily: 'var(--serif)', fontSize: 26, fontWeight: 700, color: 'var(--ink)' }}>Báo Cáo Tháng</div>
            <div style={{ fontSize: 12, color: 'var(--ink3)' }}>Biểu đồ và phân tích theo tháng</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={() => changeMonth(-1)} className="icon-btn" style={{ width: 36, height: 36 }}>‹</button>
          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)', fontFamily: 'var(--serif)', minWidth: 140, textAlign: 'center' }}>Tháng {thang}/{nam}</span>
          <button onClick={() => changeMonth(1)} className="icon-btn" style={{ width: 36, height: 36 }}>›</button>
        </div>
      </div>

      <div className="strip" style={{ gridTemplateColumns: 'repeat(3,1fr)', marginBottom: 16 }}>
        <div className="it"><div className="l">THỰC THU</div><div className="v" style={{ color: '#426a2c' }}>{formatCurrency(data.thucThu)}</div><div className="d">{data.dtList.length} giao dịch</div></div>
        <div className="it"><div className="l">TỔNG CHI</div><div className="v" style={{ color: '#843a23' }}>{formatCurrency(data.tongChi)}</div><div className="d">{data.cpList.length} khoản</div></div>
        <div className="it"><div className="l">LỢI NHUẬN</div><div className="v" style={{ color: data.thucThu - data.tongChi >= 0 ? '#426a2c' : '#843a23' }}>{formatCurrency(data.thucThu - data.tongChi)}</div><div className="d">{data.thucThu > 0 ? Math.round((data.thucThu - data.tongChi) / data.thucThu * 100) : 0}% biên lợi nhuận</div></div>
      </div>

      {/* Bar chart theo ngày */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-h">
          <div className="card-t"><div className="arch-i"><I.TrendUp style={{ width: 13, height: 13, color: '#8a6a52' }} /></div><h3>Thu Chi {data.lastDay} Ngày</h3></div>
          <div className="legend"><span><i style={{ background: '#6e8a5e' }} />Thu</span><span><i style={{ background: '#b85a4a' }} />Chi</span></div>
        </div>
        <div className="card-b">
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 150 }}>
            {data.days.map((d, i) => {
              const hThu = (d.thu / maxVal) * 130
              const hChi = (d.chi / maxVal) * 130
              return (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
                  <div style={{ width: '100%', maxWidth: 6, height: Math.max(hThu, 0.5), background: '#6e8a5e', borderRadius: '1px 1px 0 0', opacity: 0.6 }} />
                  <div style={{ width: '100%', maxWidth: 6, height: Math.max(hChi, 0.5), background: '#b85a4a', borderRadius: '1px 1px 0 0', opacity: 0.6, marginTop: 1 }} />
                  {i % 5 === 0 && <span style={{ fontSize: 7, color: 'var(--ink3)', marginTop: 2 }}>{d.day}</span>}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Theo hình thức */}
      <div className="card">
        <div className="card-h"><div className="card-t"><div className="arch-i"><I.Tag style={{ width: 13, height: 13, color: '#8a6a52' }} /></div><h3>Doanh Thu Theo Hình Thức</h3></div></div>
        <div className="card-b">
          <div className="donut-wrap">
            <DonutChart segments={[
              { v: data.tienMat, c: '#c9a96e', l: 'Tiền Mặt' },
              { v: data.chuyenKhoan, c: '#a87366', l: 'Chuyển Khoản' },
              { v: data.quetThe, c: '#6e8a5e', l: 'Quẹt Thẻ' },
              { v: data.theTT, c: '#8a6a6e', l: 'Thẻ Trả Trước' },
            ]} total={data.thucThu + data.theTT || 1} />
            <div className="donut-leg">
              {[
                { l: 'Tiền Mặt', v: data.tienMat, c: '#c9a96e' },
                { l: 'Chuyển Khoản', v: data.chuyenKhoan, c: '#a87366' },
                { l: 'Quẹt Thẻ', v: data.quetThe, c: '#6e8a5e' },
                { l: 'Thẻ Trả Trước', v: data.theTT, c: '#8a6a6e' },
              ].map((s, i) => (
                <div className="row" key={i}><span className="sw" style={{ background: s.c }} /><span>{s.l}</span><b>{formatCurrency(s.v)}</b></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function DonutChart({ segments, total, size = 140, ring = 18 }) {
  const r = (size - ring) / 2; const cx = size / 2, cy = size / 2; let acc = 0
  return (
    <svg viewBox={`0 0 ${size} ${size}`} style={{ width: size, height: size, flexShrink: 0 }}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#e8dcc8" strokeWidth={ring} />
      {segments.map((s, i) => {
        const len = 2 * Math.PI * r; const part = (s.v / total) * len; const off = acc; acc += part
        return <circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={s.c} strokeWidth={ring} strokeDasharray={`${part} ${len - part}`} strokeDashoffset={-off} transform={`rotate(-90 ${cx} ${cy})`} />
      })}
      <text x={cx} y={cy - 2} textAnchor="middle" fontSize="10" fill="#8e7a68" fontFamily="Inter" fontWeight="600">THÁNG</text>
      <text x={cx} y={cy + 14} textAnchor="middle" fontSize="16" fill="#2a201a" fontFamily="var(--serif)" fontWeight="700">{Math.round(total / 1000000)}M</text>
    </svg>
  )
}
