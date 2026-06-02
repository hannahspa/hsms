import { useState, useEffect, Fragment } from 'react'
import { supabase } from '../../../lib/supabase'
import { formatCurrency, getNowVN } from '../../../lib/utils'
import I from '../../../components/shared/Icons'

const COLORS = ['#c9a96e', '#a87366', '#6e8a5e', '#8a6a6e', '#5a8db8', '#b85a4a', '#7a6a8a', '#3e5a32', '#8a5a2a', '#5a6a8a']

const daysInMonth = (year, month) => {
  if (month === 2) {
    return ((year % 4 === 0 && year % 100 !== 0) || year % 400 === 0) ? 29 : 28
  }
  return [4, 6, 9, 11].includes(month) ? 30 : 31
}

const monthRange = (nam, thang) => {
  const start = `${nam}-${String(thang).padStart(2, '0')}-01`
  const end = `${nam}-${String(thang).padStart(2, '0')}-${String(daysInMonth(nam, thang)).padStart(2, '0')}`
  return { start, end }
}
const pct = (cur, prev) => prev > 0 ? Math.round((cur - prev) / prev * 100) : (cur > 0 ? 100 : 0)

export default function KiemSoatChiPhi() {
  const now = getNowVN()
  // Đầu tháng (ngày ≤ 7): mặc định review THÁNG TRƯỚC (tháng vừa kết thúc)
  const reviewPrev = now.getDate() <= 7
  const initMonth = reviewPrev ? (now.getMonth() === 0 ? 12 : now.getMonth()) : now.getMonth() + 1
  const initYear = reviewPrev && now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear()
  const [thang, setThang] = useState(initMonth)
  const [nam, setNam] = useState(initYear)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(null) // id nhóm đang sổ ra

  useEffect(() => {
    setLoading(true)
    const cur = monthRange(nam, thang)
    const pm = thang === 1 ? 12 : thang - 1
    const py = thang === 1 ? nam - 1 : nam
    const prev = monthRange(py, pm)
    // 6 tháng gần nhất
    const months = []
    for (let i = 5; i >= 0; i--) {
      let m = thang - i, y = nam
      while (m < 1) { m += 12; y-- }
      months.push({ m, y, ...monthRange(y, m) })
    }
    const sixStart = months[0].start
    const sixEnd = months[5].end

    Promise.all([
      supabase.from('chi_phi').select('so_tien, danh_muc_id, dien_giai, ngay, hinh_thuc_thanh_toan').gte('ngay', cur.start).lte('ngay', cur.end),
      supabase.from('chi_phi').select('so_tien, danh_muc_id').gte('ngay', prev.start).lte('ngay', prev.end),
      supabase.from('chi_phi').select('so_tien, ngay').gte('ngay', sixStart).lte('ngay', sixEnd),
      supabase.from('doanh_thu').select('so_tien, hinh_thuc').gte('ngay', cur.start).lte('ngay', cur.end),
      supabase.from('danh_muc_chi_phi').select('*'),
    ]).then(([rCur, rPrev, rSix, rDT, rDM]) => {
      const dmList = rDM.data || []
      const nhomList = dmList.filter(d => d.parent_id === null)
      const hangMuc = dmList.filter(d => d.parent_id !== null)
      const hmToNhom = {}; hangMuc.forEach(h => { hmToNhom[h.id] = h.parent_id })
      const nhomTen = {}; nhomList.forEach(n => { nhomTen[n.id] = { ten: n.ten, icon: n.icon } })

      const curCP = rCur.data || []
      const prevCP = rPrev.data || []
      const tongCur = curCP.reduce((s, r) => s + (r.so_tien || 0), 0)
      const tongPrev = prevCP.reduce((s, r) => s + (r.so_tien || 0), 0)

      // Theo nhóm cha
      const byNhomCur = {}, byNhomPrev = {}
      nhomList.forEach(n => { byNhomCur[n.id] = 0; byNhomPrev[n.id] = 0 })
      curCP.forEach(r => { const n = hmToNhom[r.danh_muc_id]; if (n != null && byNhomCur[n] != null) byNhomCur[n] += r.so_tien || 0 })
      prevCP.forEach(r => { const n = hmToNhom[r.danh_muc_id]; if (n != null && byNhomPrev[n] != null) byNhomPrev[n] += r.so_tien || 0 })
      const nhomData = nhomList.map(n => ({
        id: n.id, ten: n.ten, icon: n.icon,
        cur: byNhomCur[n.id], prev: byNhomPrev[n.id], delta: byNhomCur[n.id] - byNhomPrev[n.id],
        pct: pct(byNhomCur[n.id], byNhomPrev[n.id]),
      })).filter(n => n.cur > 0 || n.prev > 0).sort((a, b) => b.cur - a.cur)

      // Cảnh báo: nhóm tăng > 25% VÀ chênh > 500k
      const canhBao = nhomData.filter(n => n.delta > 500000 && n.pct >= 25).sort((a, b) => b.delta - a.delta)

      // Top 10 khoản chi lớn nhất
      const dmTen = {}; dmList.forEach(d => { dmTen[d.id] = d.ten })
      const topChi = [...curCP].sort((a, b) => (b.so_tien || 0) - (a.so_tien || 0)).slice(0, 10)
        .map(r => ({ ...r, danh_muc: dmTen[r.danh_muc_id] || '—' }))

      // Chi tiết giao dịch theo nhóm (để sổ ra khi click)
      const nhomChiTiet = {}
      nhomList.forEach(n => { nhomChiTiet[n.id] = [] })
      curCP.forEach(r => {
        const nid = hmToNhom[r.danh_muc_id]
        if (nid != null && nhomChiTiet[nid]) {
          nhomChiTiet[nid].push({ ngay: r.ngay, dien_giai: r.dien_giai || 'Chi phí', hangMuc: dmTen[r.danh_muc_id] || '—', so_tien: r.so_tien || 0 })
        }
      })
      Object.values(nhomChiTiet).forEach(arr => arr.sort((a, b) => b.so_tien - a.so_tien))

      // 6 tháng
      const sixData = months.map(mm => {
        const tong = (rSix.data || []).filter(r => r.ngay >= mm.start && r.ngay <= mm.end).reduce((s, r) => s + (r.so_tien || 0), 0)
        return { label: `T${mm.m}`, value: tong }
      })

      // Doanh thu tháng để tính lãi/lỗ
      const dtThuc = (rDT.data || []).filter(r => ['tien_mat', 'chuyen_khoan', 'quet_the'].includes(r.hinh_thuc)).reduce((s, r) => s + (r.so_tien || 0), 0)

      setData({ tongCur, tongPrev, nhomData, canhBao, topChi, sixData, dtThuc, loiNhuan: dtThuc - tongCur, dmTen, nhomChiTiet })
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [thang, nam])

  const changeMonth = d => { let m = thang + d, y = nam; if (m > 12) { m = 1; y++ } if (m < 1) { m = 12; y-- } setThang(m); setNam(y) }

  if (loading) return <div style={{ padding: 60, textAlign: 'center', color: 'var(--ink3)' }}>Đang tải dữ liệu chi phí...</div>
  if (!data) return <div style={{ padding: 60, textAlign: 'center', color: 'var(--ink3)' }}>Không tải được dữ liệu</div>

  const changePct = pct(data.tongCur, data.tongPrev)
  const maxSix = Math.max(...data.sixData.map(s => s.value), 1)

  return (
    <div style={{ padding: '22px 24px', flex: 1, overflow: 'auto' }}>
      {/* HEADER */}
      <div className="mod-head" style={{ marginBottom: 16 }}>
        <div>
          <div className="ttl" style={{ letterSpacing: '-.01em' }}>Kiểm Soát Chi Phí</div>
          <div className="sub">Theo dõi & phát hiện khoản chi bất thường</div>
        </div>
        <div className="acts">
          <button onClick={() => changeMonth(-1)} className="icon-btn" style={{ width: 34, height: 34 }}>‹</button>
          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)', fontFamily: 'var(--serif)', minWidth: 130, textAlign: 'center' }}>Tháng {thang}/{nam}</span>
          <button onClick={() => changeMonth(1)} className="icon-btn" style={{ width: 34, height: 34 }}>›</button>
        </div>
      </div>

      {/* KPI */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
        <KpiCard label="Tổng Chi Tháng Này" value={data.tongCur} tone="bad"
          sub={<DeltaText pct={changePct} prevLabel={`Tháng trước: ${formatCurrency(data.tongPrev)}`} invert />} />
        <KpiCard label="Thực Thu Tháng Này" value={data.dtThuc} tone="good" sub={<span style={{ color: 'var(--ink3)' }}>Tiền mặt + CK + quẹt thẻ</span>} />
        <KpiCard label={data.loiNhuan >= 0 ? 'Lợi Nhuận' : 'Đang Lỗ'} value={data.loiNhuan} tone={data.loiNhuan >= 0 ? 'good' : 'bad'}
          sub={<span style={{ color: 'var(--ink3)' }}>Thực thu − Tổng chi</span>} />
        <KpiCard label="Số Cảnh Báo" value={`${data.canhBao.length}`} isText tone={data.canhBao.length > 0 ? 'bad' : 'good'}
          sub={<span style={{ color: 'var(--ink3)' }}>Nhóm chi tăng bất thường</span>} />
      </div>

      {/* CẢNH BÁO BẤT THƯỜNG */}
      {data.canhBao.length > 0 && (
        <div className="card" style={{ marginBottom: 16, border: '1px solid #e8b4a4', background: '#fdf3ef' }}>
          <div className="card-h" style={{ borderBottom: '1px solid #f0d4c8' }}>
            <div className="card-t"><div className="arch-i" style={{ background: '#f5d4c8' }}>⚠️</div><h3 style={{ color: '#b85a4a' }}>Cảnh Báo Chi Tăng Bất Thường</h3></div>
          </div>
          <div className="card-b" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {data.canhBao.map(n => (
              <div key={n.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'var(--surface2)', borderRadius: 8, border: '1px solid #f0d4c8' }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>{n.icon} {n.ten}</span>
                <span style={{ fontSize: 12.5 }}>
                  <span style={{ color: 'var(--ink3)' }}>{formatCurrency(n.prev)} → </span>
                  <span style={{ fontWeight: 700, color: '#b85a4a' }}>{formatCurrency(n.cur)}</span>
                  <span style={{ marginLeft: 8, background: '#f5d4c8', color: '#b85a4a', padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 700 }}>+{n.pct}%</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.1fr) minmax(0,1fr)', gap: 16, alignItems: 'start' }}>
        {/* TOP 10 KHOẢN CHI */}
        <div className="card">
          <div className="card-h"><div className="card-t"><div className="arch-i"><I.Receipt style={{ width: 13, height: 13, color: '#8a6a52' }} /></div><h3>Top 10 Khoản Chi Lớn Nhất</h3></div></div>
          <div className="card-b" style={{ padding: 0 }}>
            {data.topChi.length === 0 ? <div style={{ padding: 30, textAlign: 'center', color: 'var(--ink3)' }}>Chưa có chi phí</div> : (
              <table className="tbl">
                <thead><tr><th style={{ paddingLeft: 20 }}>#</th><th>Diễn Giải</th><th>Danh Mục</th><th className="amount" style={{ paddingRight: 20 }}>Số Tiền</th></tr></thead>
                <tbody>
                  {data.topChi.map((r, i) => (
                    <tr key={i}>
                      <td style={{ paddingLeft: 20, color: 'var(--ink3)', fontWeight: 700 }}>{i + 1}</td>
                      <td className="desc" style={{ maxWidth: 220 }}>{r.dien_giai || 'Chi phí'}</td>
                      <td style={{ fontSize: 11.5, color: 'var(--ink2)', fontWeight: 600 }}>{r.danh_muc}</td>
                      <td className="amount" style={{ paddingRight: 20, fontFamily: 'var(--sans)', fontVariantNumeric: 'tabular-nums', fontWeight: 750, color: '#b85a4a' }}>{formatCurrency(r.so_tien)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* CỘT PHẢI: Xu hướng 6 tháng + Donut cơ cấu */}
        <div style={{ display: 'grid', gap: 16 }}>
          <div className="card">
            <div className="card-h"><div className="card-t"><div className="arch-i"><I.TrendUp style={{ width: 13, height: 13, color: '#8a6a52' }} /></div><h3>Xu Hướng Chi 6 Tháng</h3></div></div>
            <div className="card-b">
              <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-around', gap: 10, height: 168, paddingTop: 10 }}>
                {data.sixData.map((s, i) => {
                  const h = Math.round(s.value / maxSix * 138)
                  const isCur = i === data.sixData.length - 1
                  return (
                    <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flex: 1 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--ink3)', fontFamily: 'var(--sans)' }}>{Math.round(s.value / 1000000)}M</div>
                      <div style={{ width: '70%', maxWidth: 44, height: Math.max(h, 3), borderRadius: '6px 6px 0 0', background: isCur ? 'linear-gradient(180deg,#c9a96e,#a87f4f)' : '#d4c4ad' }} />
                      <div style={{ fontSize: 11, fontWeight: isCur ? 700 : 500, color: isCur ? 'var(--ink)' : 'var(--ink3)' }}>{s.label}</div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* DONUT CƠ CẤU NHÓM CHI */}
          <div className="card">
            <div className="card-h"><div className="card-t"><div className="arch-i"><I.Tag style={{ width: 13, height: 13, color: '#8a6a52' }} /></div><h3>Cơ Cấu Chi Theo Nhóm</h3></div></div>
            <div className="card-b">
              {data.nhomData.length === 0 ? (
                <div style={{ padding: 30, textAlign: 'center', color: 'var(--ink3)' }}>Chưa có dữ liệu</div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
                  <DonutChart segments={data.nhomData.map((n, i) => ({ v: n.cur, c: COLORS[i % COLORS.length] }))} total={data.tongCur} />
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
                    {data.nhomData.map((n, i) => {
                      const tt = data.tongCur > 0 ? Math.round(n.cur / data.tongCur * 100) : 0
                      return (
                        <div key={n.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11.5 }}>
                          <span style={{ width: 10, height: 10, borderRadius: 3, background: COLORS[i % COLORS.length], flexShrink: 0 }} />
                          <span style={{ flex: 1, color: 'var(--ink2)', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{n.icon} {n.ten}</span>
                          <span style={{ fontWeight: 700, color: 'var(--ink)' }}>{tt}%</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* PHÂN TÍCH NHÓM (so sánh tháng trước) */}
      <div className="card" style={{ marginTop: 16 }}>
        <div className="card-h"><div className="card-t"><div className="arch-i"><I.Tag style={{ width: 13, height: 13, color: '#8a6a52' }} /></div><h3>Chi Phí Theo Nhóm — So Với Tháng Trước</h3></div></div>
        <div className="card-b" style={{ padding: 0 }}>
          <table className="tbl">
            <thead><tr><th style={{ paddingLeft: 20 }}>Nhóm <span style={{ fontSize: 9, color: 'var(--ink4)', textTransform: 'none', letterSpacing: 0 }}>(bấm để xem chi tiết)</span></th><th className="amount">Tháng Trước</th><th className="amount">Tháng Này</th><th className="amount">Thay Đổi</th><th style={{ paddingRight: 20, width: 160 }}>Tỷ Trọng</th></tr></thead>
            <tbody>
              {data.nhomData.map((n, i) => {
                const tt = data.tongCur > 0 ? Math.round(n.cur / data.tongCur * 100) : 0
                const isOpen = expanded === n.id
                const chiTiet = data.nhomChiTiet[n.id] || []
                return (
                  <Fragment key={n.id}>
                    <tr onClick={() => setExpanded(isOpen ? null : n.id)} style={{ cursor: 'pointer', background: isOpen ? 'rgba(201,169,110,0.08)' : 'transparent' }}>
                      <td style={{ paddingLeft: 20, fontWeight: 700, color: 'var(--ink)' }}>
                        <span style={{ display: 'inline-block', width: 14, color: 'var(--ink3)', transition: 'transform .15s', transform: isOpen ? 'rotate(90deg)' : 'none' }}>›</span>
                        {n.icon} {n.ten}
                        <span style={{ marginLeft: 6, fontSize: 10.5, color: 'var(--ink4)', fontWeight: 500 }}>({chiTiet.length})</span>
                      </td>
                      <td className="amount" style={{ color: 'var(--ink3)', fontFamily: 'var(--sans)', fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(n.prev)}</td>
                      <td className="amount" style={{ fontWeight: 750, fontFamily: 'var(--sans)', fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(n.cur)}</td>
                      <td className="amount" style={{ fontFamily: 'var(--sans)', fontVariantNumeric: 'tabular-nums' }}>
                        <span style={{ color: n.delta > 0 ? '#b85a4a' : n.delta < 0 ? '#2d6a2d' : 'var(--ink3)', fontWeight: 700 }}>
                          {n.delta > 0 ? '+' : ''}{formatCurrency(n.delta)} {n.prev > 0 && <span style={{ fontSize: 10.5 }}>({n.pct > 0 ? '+' : ''}{n.pct}%)</span>}
                        </span>
                      </td>
                      <td style={{ paddingRight: 20 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ flex: 1, height: 7, background: 'var(--line)', borderRadius: 999, overflow: 'hidden' }}>
                            <div style={{ width: tt + '%', height: '100%', background: COLORS[i % COLORS.length], borderRadius: 999 }} />
                          </div>
                          <span style={{ fontSize: 11, color: 'var(--ink3)', fontWeight: 600, minWidth: 30 }}>{tt}%</span>
                        </div>
                      </td>
                    </tr>
                    {isOpen && (
                      <tr>
                        <td colSpan={5} style={{ padding: 0, background: 'rgba(201,169,110,0.04)' }}>
                          {chiTiet.length === 0 ? (
                            <div style={{ padding: '12px 20px', fontSize: 12, color: 'var(--ink3)' }}>Không có khoản chi nào trong nhóm này</div>
                          ) : (
                            <div style={{ padding: '4px 20px 10px 48px' }}>
                              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                                <tbody>
                                  {chiTiet.map((c, j) => {
                                    const [y, m, d] = c.ngay.split('-')
                                    return (
                                      <tr key={j} style={{ borderBottom: '1px solid rgba(232,220,200,0.5)' }}>
                                        <td style={{ padding: '6px 10px 6px 0', color: 'var(--ink3)', whiteSpace: 'nowrap', width: 70 }}>{d}/{m}</td>
                                        <td style={{ padding: '6px 10px', color: 'var(--ink)', fontWeight: 500 }}>{c.dien_giai}</td>
                                        <td style={{ padding: '6px 10px', color: 'var(--ink3)', fontSize: 11, whiteSpace: 'nowrap' }}>{c.hangMuc}</td>
                                        <td style={{ padding: '6px 0', textAlign: 'right', fontWeight: 700, color: '#b85a4a', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{formatCurrency(c.so_tien)}</td>
                                      </tr>
                                    )
                                  })}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })}
            </tbody>
            <tfoot>
              <tr style={{ borderTop: '2px solid var(--line2)' }}>
                <td style={{ paddingLeft: 20, fontWeight: 800, color: 'var(--ink)', padding: '12px 12px 12px 20px' }}>TỔNG CỘNG</td>
                <td className="amount" style={{ color: 'var(--ink3)', fontWeight: 700 }}>{formatCurrency(data.tongPrev)}</td>
                <td className="amount" style={{ fontWeight: 800, color: '#b85a4a' }}>{formatCurrency(data.tongCur)}</td>
                <td className="amount" style={{ fontWeight: 700, color: changePct > 0 ? '#b85a4a' : '#2d6a2d' }}>{data.tongCur - data.tongPrev > 0 ? '+' : ''}{formatCurrency(data.tongCur - data.tongPrev)}</td>
                <td style={{ paddingRight: 20 }}></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  )
}

function KpiCard({ label, value, tone, sub, isText }) {
  const colors = { dark: 'var(--ink)', good: '#2d6a2d', bad: '#b85a4a' }
  return (
    <div className="it" style={{ padding: '16px 18px' }}>
      <div className="l" style={{ fontSize: 10, letterSpacing: '.12em', fontWeight: 750 }}>{label}</div>
      <div style={{ fontFamily: 'var(--sans)', fontVariantNumeric: 'tabular-nums', fontSize: 23, fontWeight: 800, color: colors[tone] || colors.dark, marginTop: 6 }}>
        {isText ? value : formatCurrency(value)}
      </div>
      <div style={{ fontSize: 11.5, marginTop: 6 }}>{sub}</div>
    </div>
  )
}

function DonutChart({ segments, total, size = 130, ring = 20 }) {
  const r = (size - ring) / 2, cx = size / 2, cy = size / 2
  const len = 2 * Math.PI * r
  let acc = 0
  return (
    <svg viewBox={`0 0 ${size} ${size}`} style={{ width: size, height: size, flexShrink: 0 }}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#e8dcc8" strokeWidth={ring} />
      {total > 0 && segments.map((s, i) => {
        const part = (s.v / total) * len
        const off = acc; acc += part
        return <circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={s.c} strokeWidth={ring}
          strokeDasharray={`${part} ${len - part}`} strokeDashoffset={-off} transform={`rotate(-90 ${cx} ${cy})`} />
      })}
      <text x={cx} y={cy - 1} textAnchor="middle" fontSize="9" fill="#8e7a68" fontFamily="Inter" fontWeight="600">TỔNG CHI</text>
      <text x={cx} y={cy + 14} textAnchor="middle" fontSize="15" fill="#2a201a" fontFamily="var(--serif)" fontWeight="700">{Math.round(total / 1000000)}M</text>
    </svg>
  )
}

function DeltaText({ pct, prevLabel, invert }) {
  // invert: với chi phí, tăng = xấu (đỏ), giảm = tốt (xanh)
  const up = pct > 0
  const good = invert ? !up : up
  return (
    <span>
      <span style={{ background: good ? '#e8f2e3' : '#f5e0d8', color: good ? '#2d6a2d' : '#b85a4a', padding: '1px 7px', borderRadius: 999, fontSize: 10.5, fontWeight: 700 }}>
        {up ? '▲' : '▼'} {Math.abs(pct)}%
      </span>
      <span style={{ color: 'var(--ink3)', marginLeft: 6, fontSize: 11 }}>{prevLabel}</span>
    </span>
  )
}
