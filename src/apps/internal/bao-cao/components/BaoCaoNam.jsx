import { useState, useEffect } from 'react'
import { supabase } from '../../../../lib/supabase'
import { formatCurrency, getNowVN, fmtCompact } from '../../../../lib/utils'
import I from '../../../../components/shared/Icons'

export default function BaoCaoNam({ onBack }) {
  const now = getNowVN()
  const [nam, setNam] = useState(now.getFullYear())
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    // Fetch từng tháng
    const promises = []
    for (let m = 1; m <= 12; m++) {
      const start = `${nam}-${String(m).padStart(2, '0')}-01`
      const lastDay = new Date(nam, m, 0).getDate()
      const end = `${nam}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
      promises.push(supabase.from('doanh_thu').select('so_tien, hinh_thuc').gte('ngay', start).lte('ngay', end))
      promises.push(supabase.from('chi_phi').select('so_tien').gte('ngay', start).lte('ngay', end))
    }
    Promise.all(promises).then(results => {
      const months = []
      let tongThuNam = 0, tongChiNam = 0
      for (let m = 0; m < 12; m++) {
        const dtRes = results[m * 2]; const cpRes = results[m * 2 + 1]
        const thucThu = (dtRes.data || []).filter(r => r.hinh_thuc !== 'the_tra_truoc').reduce((s, r) => s + (r.so_tien || 0), 0)
        const tongChi = (cpRes.data || []).reduce((s, r) => s + (r.so_tien || 0), 0)
        months.push({ thang: m + 1, thucThu, tongChi, loiNhuan: thucThu - tongChi })
        tongThuNam += thucThu; tongChiNam += tongChi
      }
      // Top 5 tháng
      const top5 = [...months].sort((a, b) => b.thucThu - a.thucThu).slice(0, 5)
      setData({ months, tongThuNam, tongChiNam, top5 })
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [nam])

  const MONTHS = ['', 'T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12']
  const maxVal = data ? Math.max(...data.months.map(m => Math.max(m.thucThu, m.tongChi)), 1) : 1

  if (loading) return <div style={{ padding: 60, textAlign: 'center', color: 'var(--ink3)' }}>Đang tải...</div>

  return (
    <div style={{ padding: '22px 24px', flex: 1, overflow: 'auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={onBack} className="icon-btn" style={{ width: 36, height: 36 }}><I.ArrowLeft style={{ width: 16, height: 16 }} /></button>
          <div>
            <div style={{ fontFamily: 'var(--serif)', fontSize: 26, fontWeight: 700, color: 'var(--ink)' }}>Báo Cáo Năm</div>
            <div style={{ fontSize: 12, color: 'var(--ink3)' }}>Tổng kết 12 tháng trong năm</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={() => setNam(n => n - 1)} className="icon-btn" style={{ width: 36, height: 36 }}>‹</button>
          <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink)', fontFamily: 'var(--serif)', minWidth: 80, textAlign: 'center' }}>{nam}</span>
          <button onClick={() => setNam(n => n + 1)} className="icon-btn" style={{ width: 36, height: 36 }}>›</button>
        </div>
      </div>

      <div className="strip" style={{ gridTemplateColumns: 'repeat(3,1fr)', marginBottom: 16 }}>
        <div className="it"><div className="l">TỔNG THU NĂM</div><div className="v" style={{ color: '#426a2c' }}>{fmtCompact(data.tongThuNam)}</div><div className="d">Thực thu 12 tháng</div></div>
        <div className="it"><div className="l">TỔNG CHI NĂM</div><div className="v" style={{ color: '#843a23' }}>{fmtCompact(data.tongChiNam)}</div><div className="d">12 tháng</div></div>
        <div className="it"><div className="l">LỢI NHUẬN</div><div className="v" style={{ color: data.tongThuNam - data.tongChiNam >= 0 ? '#426a2c' : '#843a23' }}>{fmtCompact(data.tongThuNam - data.tongChiNam)}</div><div className="d">{data.tongThuNam > 0 ? Math.round((data.tongThuNam - data.tongChiNam) / data.tongThuNam * 100) : 0}% biên LN</div></div>
      </div>

      {/* Bar chart 12 tháng */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-h">
          <div className="card-t"><div className="arch-i"><I.TrendUp style={{ width: 13, height: 13, color: '#8a6a52' }} /></div><h3>Thu Chi 12 Tháng</h3></div>
          <div className="legend"><span><i style={{ background: '#6e8a5e' }} />Thu</span><span><i style={{ background: '#b85a4a' }} />Chi</span></div>
        </div>
        <div className="card-b">
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 180 }}>
            {data.months.map((m, i) => {
              const hThu = (m.thucThu / maxVal) * 160
              const hChi = (m.tongChi / maxVal) * 160
              const isCurrent = m.thang === now.getMonth() + 1 && nam === now.getFullYear()
              return (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
                  <div style={{ display: 'flex', gap: 3, alignItems: 'flex-end', height: 160 }}>
                    <div style={{ width: 10, height: Math.max(hThu, 1), borderRadius: '3px 3px 0 0', background: isCurrent ? 'var(--grad-gold)' : '#6e8a5e', opacity: isCurrent ? 1 : 0.6 }} />
                    <div style={{ width: 10, height: Math.max(hChi, 1), borderRadius: '3px 3px 0 0', background: '#b85a4a', opacity: 0.6 }} />
                  </div>
                  <span style={{ fontSize: 10, fontWeight: isCurrent ? 700 : 500, color: isCurrent ? 'var(--espresso)' : 'var(--ink3)', marginTop: 6 }}>{MONTHS[m.thang]}</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Top 5 tháng */}
      <div className="card">
        <div className="card-h"><div className="card-t"><div className="arch-i"><I.Star style={{ width: 13, height: 13, color: '#c9a96e' }} /></div><h3>Top 5 Tháng Doanh Thu Cao Nhất</h3></div></div>
        <div className="card-b" style={{ padding: 0 }}>
          <table className="tbl">
            <thead><tr><th style={{ paddingLeft: 20 }}>#</th><th>Tháng</th><th>Doanh Thu</th><th>Chi Phí</th><th className="amount" style={{ paddingRight: 20 }}>Lợi Nhuận</th></tr></thead>
            <tbody>
              {data.top5.map((m, i) => (
                <tr key={i}>
                  <td style={{ paddingLeft: 20, fontWeight: 700, color: i === 0 ? 'var(--champagne)' : 'var(--ink3)' }}>#{i + 1}</td>
                  <td style={{ fontWeight: 600 }}>Tháng {m.thang}/{nam}</td>
                  <td style={{ color: '#426a2c', fontWeight: 600 }}>{formatCurrency(m.thucThu)}</td>
                  <td style={{ color: '#843a23', fontWeight: 600 }}>{formatCurrency(m.tongChi)}</td>
                  <td className="amount" style={{ paddingRight: 20, color: m.loiNhuan >= 0 ? '#426a2c' : '#843a23', fontWeight: 700 }}>{formatCurrency(m.loiNhuan)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
