import { useState, useEffect } from 'react'
import { supabase } from '../../../../lib/supabase'
import { formatCurrency, getNowVN } from '../../../../lib/utils'
import I from '../../../../components/shared/Icons'

export default function BaoCaoDongTien({ onBack }) {
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
      supabase.from('vi').select('*').eq('is_active', true).order('thu_tu'),
      supabase.from('doanh_thu').select('so_tien, hinh_thuc').gte('ngay', start).lte('ngay', end),
      supabase.from('chi_phi').select('so_tien, hinh_thuc_thanh_toan').gte('ngay', start).lte('ngay', end),
      supabase.from('chuyen_khoan_noi_bo').select('so_tien, tu_vi_id, den_vi_id').gte('ngay', start).lte('ngay', end),
    ]).then(([rVi, rDT, rCP, rCK]) => {
      const viList = rVi.data || []
      const dtList = rDT.data || []
      const cpList = rCP.data || []
      const ckList = rCK.data || []

      // Dòng tiền từng ví
      const cashflow = viList.map(vi => {
        const thuVao = dtList.filter(r => r.hinh_thuc === vi.loai).reduce((s, r) => s + (r.so_tien || 0), 0)
        const chiRa = cpList.filter(r => r.hinh_thuc_thanh_toan === vi.loai).reduce((s, r) => s + (r.so_tien || 0), 0)
        const ckDi = ckList.filter(r => r.tu_vi_id === vi.id).reduce((s, r) => s + (r.so_tien || 0), 0)
        const ckDen = ckList.filter(r => r.den_vi_id === vi.id).reduce((s, r) => s + (r.so_tien || 0), 0)
        const soDuDau = vi.so_du_dau || 0
        const soDuCuoi = soDuDau + thuVao - chiRa - ckDi + ckDen
        return { ten: vi.ten, loai: vi.loai, soDuDau, thuVao, chiRa, ckDi, ckDen, soDuCuoi }
      })

      // Tổng cộng
      const tong = {
        soDuDau: cashflow.reduce((s, c) => s + c.soDuDau, 0),
        thuVao: cashflow.reduce((s, c) => s + c.thuVao, 0),
        chiRa: cashflow.reduce((s, c) => s + c.chiRa, 0),
        ckDi: cashflow.reduce((s, c) => s + c.ckDi, 0),
        ckDen: cashflow.reduce((s, c) => s + c.ckDen, 0),
        soDuCuoi: cashflow.reduce((s, c) => s + c.soDuCuoi, 0),
      }

      setData({ cashflow, tong, lastDay })
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [thang, nam])

  const changeMonth = (delta) => { let m = thang + delta; let y = nam; if (m > 12) { m = 1; y++ } if (m < 1) { m = 12; y-- }; setThang(m); setNam(y) }

  if (loading) return <div style={{ padding: 60, textAlign: 'center', color: 'var(--ink3)' }}>Đang tải...</div>

  const viIcons = { tien_mat: '💵', chuyen_khoan: '🏦', quet_the: '💳' }
  const viGradients = {
    tien_mat: 'linear-gradient(180deg,#e0eedd,#bfd5b8)',
    chuyen_khoan: 'linear-gradient(180deg,#dde9f3,#a8c5dc)',
    quet_the: 'linear-gradient(180deg,#f0dcc0,#d4a574)',
  }

  return (
    <div style={{ padding: '22px 24px', flex: 1, overflow: 'auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={onBack} className="icon-btn" style={{ width: 36, height: 36 }}><I.ArrowLeft style={{ width: 16, height: 16 }} /></button>
          <div>
            <div style={{ fontFamily: 'var(--serif)', fontSize: 26, fontWeight: 700, color: 'var(--ink)' }}>Báo Cáo Dòng Tiền</div>
            <div style={{ fontSize: 12, color: 'var(--ink3)' }}>Lưu chuyển tiền tệ</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={() => changeMonth(-1)} className="icon-btn" style={{ width: 36, height: 36 }}>‹</button>
          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)', fontFamily: 'var(--serif)', minWidth: 140, textAlign: 'center' }}>Tháng {thang}/{nam}</span>
          <button onClick={() => changeMonth(1)} className="icon-btn" style={{ width: 36, height: 36 }}>›</button>
        </div>
      </div>

      {/* Tổng hợp */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-h"><div className="card-t"><div className="arch-i"><I.Wallet style={{ width: 13, height: 13, color: '#8a6a52' }} /></div><h3>Lưu Chuyển Tiền Tệ — Tháng {thang}/{nam}</h3></div></div>
        <div className="card-b" style={{ padding: 0 }}>
          <table className="tbl">
            <thead><tr><th style={{ paddingLeft: 20 }}>Chỉ Tiêu</th><th>Tiền Mặt</th><th>MB Bank</th><th>TP Bank</th><th className="amount" style={{ paddingRight: 20 }}>Tổng</th></tr></thead>
            <tbody>
              <tr>
                <td style={{ paddingLeft: 20, fontWeight: 600 }}>Số dư đầu kỳ</td>
                {data.cashflow.map((c, i) => <td key={i}>{formatCurrency(c.soDuDau)}</td>)}
                <td className="amount" style={{ paddingRight: 20, fontWeight: 700 }}>{formatCurrency(data.tong.soDuDau)}</td>
              </tr>
              <tr>
                <td style={{ paddingLeft: 20, fontWeight: 600, color: '#426a2c' }}>➕ Thu vào</td>
                {data.cashflow.map((c, i) => <td key={i} style={{ color: '#426a2c' }}>+{formatCurrency(c.thuVao)}</td>)}
                <td className="amount" style={{ paddingRight: 20, color: '#426a2c', fontWeight: 700 }}>+{formatCurrency(data.tong.thuVao)}</td>
              </tr>
              <tr>
                <td style={{ paddingLeft: 20, fontWeight: 600, color: '#843a23' }}>➖ Chi ra</td>
                {data.cashflow.map((c, i) => <td key={i} style={{ color: '#843a23' }}>−{formatCurrency(c.chiRa)}</td>)}
                <td className="amount" style={{ paddingRight: 20, color: '#843a23', fontWeight: 700 }}>−{formatCurrency(data.tong.chiRa)}</td>
              </tr>
              <tr>
                <td style={{ paddingLeft: 20, fontWeight: 600, color: '#6C3483' }}>🔄 CK đi</td>
                {data.cashflow.map((c, i) => <td key={i} style={{ color: '#6C3483' }}>−{formatCurrency(c.ckDi)}</td>)}
                <td className="amount" style={{ paddingRight: 20, color: '#6C3483', fontWeight: 700 }}>−{formatCurrency(data.tong.ckDi)}</td>
              </tr>
              <tr>
                <td style={{ paddingLeft: 20, fontWeight: 600, color: '#6C3483' }}>🔄 CK đến</td>
                {data.cashflow.map((c, i) => <td key={i} style={{ color: '#6C3483' }}>+{formatCurrency(c.ckDen)}</td>)}
                <td className="amount" style={{ paddingRight: 20, color: '#6C3483', fontWeight: 700 }}>+{formatCurrency(data.tong.ckDen)}</td>
              </tr>
              <tr style={{ background: 'var(--bg2)' }}>
                <td style={{ paddingLeft: 20, fontWeight: 700, fontSize: 13 }}>Số dư cuối kỳ</td>
                {data.cashflow.map((c, i) => <td key={i} style={{ fontWeight: 700 }}>{formatCurrency(c.soDuCuoi)}</td>)}
                <td className="amount" style={{ paddingRight: 20, fontWeight: 700, fontSize: 14 }}>{formatCurrency(data.tong.soDuCuoi)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Hiển thị từng ví */}
      <div className="rec-grid">
        {data.cashflow.map((c, i) => (
          <div className="rec-box" key={i}>
            <h4>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div className="ic-pill" style={{ background: viGradients[c.loai] || '' }}>{viIcons[c.loai] || '💰'}</div>
                {c.ten}
              </div>
            </h4>
            <div className="rec-row"><span>Số dư đầu kỳ</span><span>{formatCurrency(c.soDuDau)}</span></div>
            <div className="rec-row"><span>➕ Thu vào</span><span style={{ color: '#426a2c' }}>+{formatCurrency(c.thuVao)}</span></div>
            <div className="rec-row"><span>➖ Chi ra</span><span style={{ color: '#843a23' }}>−{formatCurrency(c.chiRa)}</span></div>
            <div className="rec-row"><span>🔄 CK ròng</span><span style={{ color: '#6C3483' }}>{c.ckDen - c.ckDi >= 0 ? '+' : ''}{formatCurrency(c.ckDen - c.ckDi)}</span></div>
            <div className="rec-row tot"><span>Số dư cuối kỳ</span><span>{formatCurrency(c.soDuCuoi)}</span></div>
          </div>
        ))}
      </div>
    </div>
  )
}
