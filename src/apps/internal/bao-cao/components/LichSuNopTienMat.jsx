import { useState, useEffect } from 'react'
import { supabase } from '../../../../lib/supabase'
import { formatCurrency, todayISO, getNowVN, formatDateInput, addDays } from '../../../../lib/utils'
import I from '../../../../components/shared/Icons'

export default function LichSuNopTienMat({ onBack }) {
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

    // Lấy ví Tiền Mặt và MB Bank
    supabase.from('vi').select('*').eq('is_active', true).then(rVi => {
      const viList = rVi.data || []
      const tmVi = viList.find(v => v.loai === 'tien_mat')
      const mbVi = viList.find(v => v.loai === 'chuyen_khoan')
      if (!tmVi || !mbVi) { setData({ history: [], tongNop: 0, tmVi: null, mbVi: null }); setLoading(false); return }

      Promise.all([
        supabase.from('chuyen_khoan_noi_bo').select('*').eq('tu_vi_id', tmVi.id).eq('den_vi_id', mbVi.id).gte('ngay', start).lte('ngay', end).order('ngay', { ascending: false }),
        supabase.from('doanh_thu').select('so_tien, ngay').eq('hinh_thuc', 'tien_mat').gte('ngay', start).lte('ngay', end),
        supabase.from('chi_phi').select('so_tien, ngay').eq('hinh_thuc_thanh_toan', 'tien_mat').gte('ngay', start).lte('ngay', end),
      ]).then(([rCK, rDT, rCP]) => {
        const ckList = rCK.data || []
        const dtByDay = {}; (rDT.data || []).forEach(r => { dtByDay[r.ngay] = (dtByDay[r.ngay] || 0) + (r.so_tien || 0) })
        const cpByDay = {}; (rCP.data || []).forEach(r => { cpByDay[r.ngay] = (cpByDay[r.ngay] || 0) + (r.so_tien || 0) })

        // Nhóm theo ngày
        const dayMap = {}
        for (let d = 1; d <= lastDay; d++) {
          const iso = `${nam}-${String(thang).padStart(2, '0')}-${String(d).padStart(2, '0')}`
          dayMap[iso] = { ngay: iso, dtTm: dtByDay[iso] || 0, cpTm: cpByDay[iso] || 0, ckNop: 0, daNop: 0 }
        }
        ckList.forEach(ck => { if (dayMap[ck.ngay]) dayMap[ck.ngay].daNop += (ck.so_tien || 0) })
        const history = Object.values(dayMap).filter(d => d.dtTm > 0 || d.cpTm > 0 || d.daNop > 0).sort((a, b) => b.ngay.localeCompare(a.ngay))
        const tongNop = ckList.reduce((s, r) => s + (r.so_tien || 0), 0)
        const tongPhaiNop = history.reduce((s, d) => s + d.dtTm - d.cpTm, 0)

        setData({ history, tongNop, tongPhaiNop, tmVi, mbVi, ckList })
        setLoading(false)
      })
    }).catch(() => setLoading(false))
  }, [thang, nam])

  const changeMonth = (delta) => { let m = thang + delta; let y = nam; if (m > 12) { m = 1; y++ } if (m < 1) { m = 12; y-- }; setThang(m); setNam(y) }

  if (loading) return <div style={{ padding: 60, textAlign: 'center', color: 'var(--ink3)' }}>Đang tải...</div>

  return (
    <div style={{ padding: '22px 24px', flex: 1, overflow: 'auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={onBack} className="icon-btn" style={{ width: 36, height: 36 }}><I.ArrowLeft style={{ width: 16, height: 16 }} /></button>
          <div>
            <div style={{ fontFamily: 'var(--serif)', fontSize: 26, fontWeight: 700, color: 'var(--ink)' }}>Lịch Sử Nộp Tiền Mặt</div>
            <div style={{ fontSize: 12, color: 'var(--ink3)' }}>Tiền Mặt → MB Bank từng ngày</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={() => changeMonth(-1)} className="icon-btn" style={{ width: 36, height: 36 }}>‹</button>
          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)', fontFamily: 'var(--serif)', minWidth: 140, textAlign: 'center' }}>Tháng {thang}/{nam}</span>
          <button onClick={() => changeMonth(1)} className="icon-btn" style={{ width: 36, height: 36 }}>›</button>
        </div>
      </div>

      {/* Tổng kết */}
      <div className="strip" style={{ gridTemplateColumns: 'repeat(3,1fr)', marginBottom: 16 }}>
        <div className="it"><div className="l">ĐÃ NỘP MB</div><div className="v" style={{ color: '#1a4f70' }}>{formatCurrency(data.tongNop)}</div><div className="d">{data.ckList.length} lần nộp</div></div>
        <div className="it"><div className="l">PHẢI NỘP</div><div className="v" style={{ color: '#426a2c' }}>{formatCurrency(data.tongPhaiNop)}</div><div className="d">Thu TM − Chi TM</div></div>
        <div className="it"><div className="l">CHÊNH LỆCH</div>
          <div className="v" style={{ color: data.tongNop >= data.tongPhaiNop ? '#426a2c' : '#843a23' }}>
            {formatCurrency(data.tongNop - data.tongPhaiNop)}
          </div>
          <div className="d">{data.tongNop >= data.tongPhaiNop ? '✅ Đã nộp đủ' : '⚠️ Chưa nộp đủ'}</div>
        </div>
      </div>

      {/* Bảng chi tiết */}
      <div className="card">
        <div className="card-h"><div className="card-t"><div className="arch-i"><I.Receipt style={{ width: 13, height: 13, color: '#8a6a52' }} /></div><h3>Chi Tiết Nộp Tiền Mặt → MB Bank</h3><span className="sub">{data.history.length} ngày</span></div></div>
        <div className="card-b" style={{ padding: 0 }}>
          {data.history.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 30, color: 'var(--ink3)' }}>Không có dữ liệu trong tháng</div>
          ) : (
            <table className="tbl">
              <thead><tr><th style={{ paddingLeft: 20 }}>Ngày</th><th>Thu TM</th><th>Chi TM</th><th>Phải Nộp</th><th>Đã Nộp MB</th><th className="amount" style={{ paddingRight: 20 }}>Trạng Thái</th></tr></thead>
              <tbody>
                {data.history.map((d, i) => {
                  const phaiNop = d.dtTm - d.cpTm
                  const status = d.daNop >= phaiNop ? 'ok' : phaiNop <= 0 ? 'ok' : 'warn'
                  return (
                    <tr key={i}>
                      <td style={{ paddingLeft: 20, fontWeight: 600 }}>{formatDateInput(d.ngay)}</td>
                      <td style={{ color: '#426a2c', fontWeight: 600 }}>{d.dtTm > 0 ? formatCurrency(d.dtTm) : '—'}</td>
                      <td style={{ color: '#843a23', fontWeight: 600 }}>{d.cpTm > 0 ? formatCurrency(d.cpTm) : '—'}</td>
                      <td style={{ fontWeight: 600 }}>{phaiNop > 0 ? formatCurrency(phaiNop) : '—'}</td>
                      <td>{d.daNop > 0 ? formatCurrency(d.daNop) : '—'}</td>
                      <td className="amount" style={{ paddingRight: 20 }}>
                        <span style={{
                          padding: '3px 8px', borderRadius: 999, fontSize: 10.5, fontWeight: 600,
                          background: status === 'ok' ? '#e8f1de' : '#fbf3df',
                          color: status === 'ok' ? '#426a2c' : '#5e441b',
                        }}>
                          {status === 'ok' ? '✓ Đã nộp' : '⚠ Chưa nộp'}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
