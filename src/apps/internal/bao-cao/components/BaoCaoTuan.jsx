import { useState, useEffect } from 'react'
import { supabase } from '../../../../lib/supabase'
import { formatCurrency, todayISO, getNowVN, formatDateInput } from '../../../../lib/utils'
import DatePicker from '../../../../components/shared/DatePicker'
import I from '../../../../components/shared/Icons'

function getWeekRange(date) {
  const d = new Date(date)
  const day = d.getDay()
  const diffToMon = day === 0 ? -6 : 1 - day
  const mon = new Date(d); mon.setDate(d.getDate() + diffToMon)
  const sun = new Date(mon); sun.setDate(mon.getDate() + 6)
  return {
    start: mon.toISOString().slice(0, 10),
    end: sun.toISOString().slice(0, 10),
    label: `${formatDateInput(mon.toISOString().slice(0, 10))} - ${formatDateInput(sun.toISOString().slice(0, 10))}`,
    mon,
  }
}

export default function BaoCaoTuan({ onBack }) {
  const today = todayISO()
  const [week, setWeek] = useState(getWeekRange(today))
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      supabase.from('doanh_thu').select('so_tien, hinh_thuc, ngay').gte('ngay', week.start).lte('ngay', week.end).order('ngay'),
      supabase.from('chi_phi').select('so_tien, ngay').gte('ngay', week.start).lte('ngay', week.end).order('ngay'),
    ]).then(([rDT, rCP]) => {
      const dtList = rDT.data || []
      const cpList = rCP.data || []
      const thucThu = dtList.filter(r => r.hinh_thuc !== 'the_tra_truoc').reduce((s, r) => s + (r.so_tien || 0), 0)
      const tongChi = cpList.reduce((s, r) => s + (r.so_tien || 0), 0)

      // Theo ngày trong tuần
      const byDay = {}
      for (let i = 0; i < 7; i++) {
        const d = new Date(week.mon); d.setDate(d.getDate() + i)
        const iso = d.toISOString().slice(0, 10)
        byDay[iso] = { thu: 0, chi: 0, label: `T${(i + 2) > 7 ? (i + 2) % 7 : i + 2}`, date: iso }
      }
      dtList.forEach(r => { if (byDay[r.ngay] && r.hinh_thuc !== 'the_tra_truoc') byDay[r.ngay].thu += (r.so_tien || 0) })
      cpList.forEach(r => { if (byDay[r.ngay]) byDay[r.ngay].chi += (r.so_tien || 0) })
      const days = Object.values(byDay)

      setData({ dtList, cpList, thucThu, tongChi, days })
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [week.start])

  const changeWeek = (delta) => {
    const d = new Date(week.mon); d.setDate(d.getDate() + delta * 7)
    setWeek(getWeekRange(d.toISOString().slice(0, 10)))
  }

  if (loading) return <div style={{ padding: 60, textAlign: 'center', color: 'var(--ink3)' }}>Đang tải...</div>

  const maxVal = Math.max(...data.days.map(d => Math.max(d.thu, d.chi)), 1)

  return (
    <div style={{ padding: '22px 24px', flex: 1, overflow: 'auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={onBack} className="icon-btn" style={{ width: 36, height: 36 }}><I.ArrowLeft style={{ width: 16, height: 16 }} /></button>
          <div>
            <div style={{ fontFamily: 'var(--serif)', fontSize: 26, fontWeight: 700, color: 'var(--ink)' }}>Báo Cáo Tuần</div>
            <div style={{ fontSize: 12, color: 'var(--ink3)' }}>{week.label}</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={() => changeWeek(-1)} className="icon-btn" style={{ width: 36, height: 36 }}>‹</button>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', fontFamily: 'var(--sans)', padding: '0 8px' }}>{week.label}</span>
          <button onClick={() => changeWeek(1)} className="icon-btn" style={{ width: 36, height: 36 }}>›</button>
        </div>
      </div>

      {/* Stats */}
      <div className="strip" style={{ gridTemplateColumns: 'repeat(3,1fr)', marginBottom: 16 }}>
        <div className="it"><div className="l">THỰC THU TUẦN</div><div className="v" style={{ color: '#426a2c' }}>{formatCurrency(data.thucThu)}</div><div className="d">{data.dtList.length} giao dịch</div></div>
        <div className="it"><div className="l">TỔNG CHI TUẦN</div><div className="v" style={{ color: '#843a23' }}>{formatCurrency(data.tongChi)}</div><div className="d">{data.cpList.length} khoản chi</div></div>
        <div className="it"><div className="l">LỢI NHUẬN</div><div className="v" style={{ color: data.thucThu - data.tongChi >= 0 ? '#426a2c' : '#843a23' }}>{formatCurrency(data.thucThu - data.tongChi)}</div><div className="d">Thu - Chi</div></div>
      </div>

      {/* Bar chart 7 ngày */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-h">
          <div className="card-t"><div className="arch-i"><I.TrendUp style={{ width: 13, height: 13, color: '#8a6a52' }} /></div><h3>Thu Chi 7 Ngày</h3></div>
          <div className="legend"><span><i style={{ background: '#6e8a5e' }} />Thu</span><span><i style={{ background: '#b85a4a' }} />Chi</span></div>
        </div>
        <div className="card-b">
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, height: 180, padding: '0 8px' }}>
            {data.days.map((d, i) => {
              const hThu = (d.thu / maxVal) * 150
              const hChi = (d.chi / maxVal) * 150
              const isToday = d.date === today
              return (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, height: '100%', justifyContent: 'flex-end' }}>
                  <div style={{ display: 'flex', gap: 3, alignItems: 'flex-end', height: 150 }}>
                    <div style={{ width: 14, height: Math.max(hThu, 2), borderRadius: '3px 3px 0 0', background: isToday ? 'var(--grad-gold)' : '#6e8a5e', opacity: isToday ? 1 : 0.65 }} />
                    <div style={{ width: 14, height: Math.max(hChi, 2), borderRadius: '3px 3px 0 0', background: '#b85a4a', opacity: 0.65 }} />
                  </div>
                  <span style={{ fontSize: 9, color: isToday ? 'var(--espresso)' : 'var(--ink3)', fontWeight: isToday ? 700 : 400 }}>{d.label}</span>
                  <span style={{ fontSize: 8, color: 'var(--ink3)', fontWeight: 600 }}>{d.thu > 0 ? (d.thu / 1000).toFixed(0) + 'k' : ''}</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Bảng tổng hợp */}
      <div className="card">
        <div className="card-h">
          <div className="card-t"><div className="arch-i"><I.Receipt style={{ width: 13, height: 13, color: '#8a6a52' }} /></div><h3>Chi Tiết Từng Ngày</h3></div>
        </div>
        <div className="card-b" style={{ padding: 0 }}>
          <table className="tbl">
            <thead><tr><th style={{ paddingLeft: 20 }}>Ngày</th><th>Thứ</th><th>Doanh Thu</th><th>Chi Phí</th><th className="amount" style={{ paddingRight: 20 }}>Lợi Nhuận</th></tr></thead>
            <tbody>
              {data.days.map((d, i) => (
                <tr key={i}>
                  <td style={{ paddingLeft: 20, fontWeight: 600, fontSize: 12 }}>{formatDateInput(d.date)}</td>
                  <td style={{ fontSize: 12, color: 'var(--ink3)' }}>{d.label}</td>
                  <td style={{ color: '#426a2c', fontWeight: 600 }}>{d.thu > 0 ? formatCurrency(d.thu) : '—'}</td>
                  <td style={{ color: '#843a23', fontWeight: 600 }}>{d.chi > 0 ? formatCurrency(d.chi) : '—'}</td>
                  <td className="amount" style={{ paddingRight: 20, color: d.thu - d.chi >= 0 ? '#426a2c' : '#843a23', fontWeight: 700 }}>
                    {d.thu > 0 || d.chi > 0 ? formatCurrency(d.thu - d.chi) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
