import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../context/AuthContext'
import { formatCurrency, todayISO, getNowVN, addDays, fmtCompact } from '../../../lib/utils'
import I from '../../../components/shared/Icons'
import FormDoanhThu from '../thu-chi/forms/FormDoanhThu'
import FormChiPhi from '../thu-chi/forms/FormChiPhi'

const TABS = [
  { k: 'ngay', l: 'Hôm nay' },
  { k: 'tuan', l: '7 ngày' },
  { k: 'thang', l: 'Tháng này' },
  { k: 'nam', l: 'Năm nay' },
]

// ════════════════ DONUT CHART (copy từ Demo Finance.jsx) ════════════════
function Donut({ segments, size = 140, ring = 18 }) {
  const r = (size - ring) / 2
  const cx = size / 2, cy = size / 2
  const total = segments.reduce((s, e) => s + e.v, 0) || 1
  let acc = 0
  return (
    <svg viewBox={`0 0 ${size} ${size}`} style={{ width: size, height: size, flexShrink: 0 }}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#e8dcc8" strokeWidth={ring} />
      {segments.map((s, i) => {
        const len = 2 * Math.PI * r
        const part = (s.v / total) * len
        const off = acc
        acc += part
        return (
          <circle key={i} cx={cx} cy={cy} r={r} fill="none"
            stroke={s.c} strokeWidth={ring} strokeLinecap="butt"
            strokeDasharray={`${part} ${len - part}`}
            strokeDashoffset={-off}
            transform={`rotate(-90 ${cx} ${cy})`} />
        )
      })}
      <text x={cx} y={cy - 4} textAnchor="middle" fontSize="11" fill="#8e7a68" fontFamily="Inter" fontWeight="600" letterSpacing="1.5">TỔNG</text>
      <text x={cx} y={cy + 14} textAnchor="middle" fontSize="18" fill="#2a201a" fontFamily="var(--serif)" fontWeight="700">{Math.round(total / 1000)}M</text>
    </svg>
  )
}

// ════════════════ BAR CHART (copy từ Demo Finance.jsx — BarsThuChi) ════════════════
function BarsThuChi({ data }) {
  const days = data.length || 30
  const max = Math.max(...data.map(d => d.in + d.out), 1) * 1.15
  const W = 620, H = 180, padL = 30, padR = 10, padT = 10, padB = 24
  const innerW = W - padL - padR, innerH = H - padT - padB
  const bw = (innerW / days) * 0.6
  const cw = innerW / days

  const yGrid = []
  for (let g = 0; g <= max; g += Math.ceil(max / 5)) yGrid.push(g)

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 180, display: 'block' }}>
      {yGrid.map(g => (
        <g key={g}>
          <line x1={padL} x2={W - padR} y1={padT + innerH - (g / max) * innerH} y2={padT + innerH - (g / max) * innerH}
            stroke="#e8dcc8" strokeDasharray={g === 0 ? '' : '2 3'} />
          <text x={padL - 6} y={padT + innerH - (g / max) * innerH + 3} textAnchor="end" fontSize="9.5" fill="#8e7a68" fontFamily="Inter">
            {g >= 1000000 ? (g / 1000000).toFixed(1) + 'M' : g >= 1000 ? (g / 1000).toFixed(0) + 'k' : g}
          </text>
        </g>
      ))}
      {data.map((d, i) => {
        const x = padL + i * cw
        const hi = (d.in / max) * innerH
        const ho = (d.out / max) * innerH
        return (
          <g key={i}>
            <rect x={x + cw / 2 - bw / 2} y={padT + innerH - hi} width={bw * 0.45} height={hi} fill="#6e8a5e" rx="1" />
            <rect x={x + cw / 2 + 1} y={padT + innerH - ho} width={bw * 0.45} height={ho} fill="#b85a4a" rx="1" />
            {i % 5 === 4 && (
              <text x={x + cw / 2} y={H - 8} textAnchor="middle" fontSize="9" fill="#8e7a68" fontFamily="Inter">
                {i + 1}
              </text>
            )}
          </g>
        )
      })}
    </svg>
  )
}

// ════════════════ MAIN PAGE ════════════════
export default function TongQuanPage({ onOpenForm }) {
  const { user } = useAuth()
  const [tab, setTab] = useState('thang')
  const [data, setData] = useState({ tongThu: 0, tongChi: 0, barData: [], byHinhThuc: [], viList: [], history: [] })
  const [loading, setLoading] = useState(true)
  const [editingTx, setEditingTx] = useState(null)    // { loai:'doanh_thu'|'chi_phi', data: {...} }
  const [deletingTx, setDeletingTx] = useState(null)  // transaction đang confirm xoá
  const [deleting, setDeleting] = useState(false)

  const today = todayISO()
  const now = getNowVN()
  const [refreshKey, setRefreshKey] = useState(0)

  const handleDelete = async () => {
    if (!deletingTx) return
    setDeleting(true)
    try {
      const table = deletingTx.loai === 'doanh_thu' ? 'doanh_thu' : 'chi_phi'
      const { error } = await supabase.from(table).delete().eq('id', deletingTx.data.id)
      if (error) throw error
      setDeletingTx(null)
      setRefreshKey(k => k + 1)
    } catch (err) {
      alert('Lỗi xoá: ' + err.message)
    } finally {
      setDeleting(false)
    }
  }

  useEffect(() => {
    setLoading(true)
    let start = today, end = today
    if (tab === 'ngay') { start = today; end = today }
    else if (tab === 'tuan') { start = addDays(today, -6); end = today }
    else if (tab === 'thang') { start = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`; end = today }
    else if (tab === 'nam') { start = `${now.getFullYear()}-01-01`; end = today }

    Promise.all([
      supabase.from('doanh_thu').select('id, so_tien, hinh_thuc, ngay, dien_giai, chung_tu_url, created_at').gte('ngay', start).lte('ngay', end).order('ngay', { ascending: false }),
      supabase.from('chi_phi').select('id, so_tien, hinh_thuc_thanh_toan, ngay, dien_giai, chung_tu_url, vi_id, danh_muc_id, nguoi_nhap, created_at').gte('ngay', start).lte('ngay', end).order('ngay', { ascending: false }),
      supabase.from('so_du_vi_thuc_te').select('*'),
    ]).then(([rDT, rCP, rVi]) => {
      const dtList = rDT.data || []
      const cpList = rCP.data || []
      const tongThu = dtList.filter(r => r.hinh_thuc !== 'the_tra_truoc').reduce((s, r) => s + (r.so_tien || 0), 0)
      const tongChi = cpList.reduce((s, r) => s + (r.so_tien || 0), 0)

      // Tính theo hình thức cho donut chart
      const byHT = {}
      dtList.filter(r => r.hinh_thuc !== 'the_tra_truoc').forEach(r => {
        const key = r.hinh_thuc === 'tien_mat' ? 'Tiền Mặt' : r.hinh_thuc === 'chuyen_khoan' ? 'CK' : r.hinh_thuc === 'quet_the' ? 'Quẹt Thẻ' : 'Khác'
        byHT[key] = (byHT[key] || 0) + (r.so_tien || 0)
      })
      const byHinhThuc = Object.entries(byHT).map(([k, v]) => ({ l: k, v }))

      // Dữ liệu bar chart theo ngày
      const dayMap = {}
      dtList.forEach(r => { const d = r.ngay; if (!dayMap[d]) dayMap[d] = { in: 0, out: 0 }; dayMap[d].in += (r.so_tien || 0) })
      cpList.forEach(r => { const d = r.ngay; if (!dayMap[d]) dayMap[d] = { in: 0, out: 0 }; dayMap[d].out += (r.so_tien || 0) })
      const barData = Object.entries(dayMap).sort((a, b) => a[0].localeCompare(b[0])).map(([, v]) => v)

      // Gộp doanh thu + chi phí thành history cho ledger, sắp xếp theo ngày + thời gian
      const history = [
        ...dtList.map(r => ({ ...r, loai: 'doanh_thu' })),
        ...cpList.map(r => ({ ...r, loai: 'chi_phi' })),
      ].sort((a, b) => {
        if (a.ngay !== b.ngay) return b.ngay.localeCompare(a.ngay)
        return (b.created_at || '').localeCompare(a.created_at || '')
      })

      setData({ tongThu, tongChi, barData, byHinhThuc, viList: rVi.data || [], history })
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [tab, today, refreshKey])

  const periodLabel = tab === 'ngay' ? 'Hôm nay' : tab === 'tuan' ? '7 ngày gần nhất' : tab === 'thang' ? `Tháng ${now.getMonth() + 1}/${now.getFullYear()}` : `Năm ${now.getFullYear()}`

  // Màu cho donut segments
  const donutColors = ['#c9a96e', '#a87366', '#6e8a5e', '#8a6a6e']
  const donutSegments = data.byHinhThuc.map((ht, i) => ({ v: ht.v, c: donutColors[i % 4], l: ht.l }))

  return (
    <div style={{ padding: '22px 24px', flex: 1, overflow: 'auto' }}>
      {/* ── MODULE HEADER — copy chính xác từ Demo FinanceScreen ── */}
      <div className="mod-head" style={{ marginBottom: 16 }}>
        <div>
          <div className="ttl">Thu Chi & Báo Cáo</div>
          <div className="sub">{periodLabel} · Đối soát đến 23:59 · {user?.ho_ten || 'Admin'}</div>
        </div>
        <div className="acts">
          <div className="subtabs">
            {TABS.map(t => (
              <div key={t.k} className={`st${tab === t.k ? ' active' : ''}`} onClick={() => setTab(t.k)}>{t.l}</div>
            ))}
          </div>
        </div>
      </div>

      {/* ── WALLET CARDS — copy chính xác từ Demo ── */}
      <div className="wallets" style={{ marginBottom: 16 }}>
        {(data.viList || []).map(vi => (
          <div key={vi.id} className={`wallet ${vi.loai === 'tien_mat' ? 'cash' : vi.loai === 'chuyen_khoan' ? 'bank' : 'epay'}`}>
            <div>
              <div className="nm">{vi.ten}{vi.loai === 'tien_mat' ? ' · Két Quầy' : vi.loai === 'chuyen_khoan' ? ' · *9821' : ' · *4567'}</div>
              <div className="vl">{formatCurrency(vi.so_du_hien_tai)}</div>
            </div>
            <div className="sb">Số dư cập nhật {today.split('-').reverse().join('/')}</div>
          </div>
        ))}
      </div>

      {/* ── STRIP — copy chính xác từ Demo ── */}
      <div className="strip" style={{ gridTemplateColumns: 'repeat(4,1fr)', marginBottom: 16 }}>
        <div className="it">
          <div className="l">Tổng Thu {tab === 'ngay' ? 'Hôm Nay' : 'Kỳ'}</div>
          <div className="v" style={{ color: '#426a2c' }}>{fmtCompact(data.tongThu)}</div>
          <div className="d up">{tab === 'ngay' ? 'Hôm nay' : 'Kỳ này'}</div>
        </div>
        <div className="it">
          <div className="l">Tổng Chi {tab === 'ngay' ? 'Hôm Nay' : 'Kỳ'}</div>
          <div className="v" style={{ color: '#843a23' }}>{fmtCompact(data.tongChi)}</div>
          <div className="d dn">{tab === 'ngay' ? 'Hôm nay' : 'Kỳ này'}</div>
        </div>
        <div className="it">
          <div className="l">Lợi Nhuận Gộp</div>
          <div className="v">{fmtCompact(data.tongThu - data.tongChi)}</div>
          <div className="d up">Biên {data.tongThu > 0 ? Math.round((data.tongThu - data.tongChi) / data.tongThu * 100) : 0}%</div>
        </div>
        <div className="it">
          <div className="l">Tổng Tài Sản</div>
          <div className="v">{fmtCompact((data.viList || []).reduce((s, v) => s + (v.so_du_hien_tai || 0), 0))}</div>
          <div className="d">3 ví</div>
        </div>
      </div>

      {/* ── CHARTS ROW — copy chính xác từ Demo fin-grid ── */}
      <div className="fin-grid" style={{ marginBottom: 16 }}>
        {/* Bar Chart: Thu & Chi */}
        <div className="card">
          <div className="card-h">
            <div className="card-t">
              <div className="arch-i"><I.TrendUp style={{ width: 13, height: 13, color: '#8a6a52' }} /></div>
              <h3>Thu & Chi {Math.max(data.barData.length, 1)} Ngày</h3>
            </div>
            <div className="legend">
              <span><i style={{ background: '#6e8a5e' }} />Thu</span>
              <span><i style={{ background: '#b85a4a' }} />Chi</span>
            </div>
          </div>
          <div className="card-b">
            {loading ? (
              <div style={{ textAlign: 'center', padding: 40, color: 'var(--ink3)' }}>Đang tải...</div>
            ) : data.barData.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, color: 'var(--ink3)', fontSize: 13 }}>Chưa có dữ liệu trong kỳ này.<br />Thử chọn khoảng thời gian khác.</div>
            ) : (
              <BarsThuChi data={data.barData} />
            )}
          </div>
        </div>

        {/* Donut Chart: Cơ Cấu Doanh Thu */}
        <div className="card">
          <div className="card-h">
            <div className="card-t">
              <div className="arch-i"><I.Tag style={{ width: 13, height: 13, color: '#8a6a52' }} /></div>
              <h3>Cơ Cấu Doanh Thu</h3>
            </div>
            <span className="chip">{tab === 'ngay' ? 'Hôm nay' : tab === 'tuan' ? '7 ngày' : tab === 'thang' ? 'Tháng' : 'Năm'}</span>
          </div>
          <div className="card-b">
            {data.byHinhThuc.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, color: 'var(--ink3)', fontSize: 13 }}>Chưa có dữ liệu doanh thu<br />trong kỳ này.</div>
            ) : (
              <div className="donut-wrap">
                <Donut size={140} ring={20} segments={donutSegments} />
                <div className="donut-leg">
                  {donutSegments.map((s, i) => (
                    <div className="row" key={i}>
                      <span className="sw" style={{ background: s.c }} />
                      <span>{s.l}</span>
                      <b>{fmtCompact(s.v)}</b>
                      <span className="pct">{Math.round(s.v / (data.tongThu || 1) * 100)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── LỊCH SỬ GIAO DỊCH — phân loại theo ngày, nguồn tiền ── */}
      <div className="card">
        <div className="card-h">
          <div className="card-t">
            <div className="arch-i"><I.Receipt style={{ width: 13, height: 13, color: '#8a6a52' }} /></div>
            <h3>Lịch Sử Giao Dịch</h3>
            <span className="sub">{data.history.length} giao dịch</span>
          </div>
          <div className="card-actions">
            <button className="chip active">Tất cả</button>
            <button className="chip">Thu</button>
            <button className="chip">Chi</button>
          </div>
        </div>
        <div style={{ padding: 0 }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--ink3)' }}>Đang tải...</div>
          ) : data.history.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--ink3)' }}>Chưa có giao dịch trong kỳ</div>
          ) : (
            <table className="ledger">
              <thead><tr>
                <th>Ngày</th>
                <th>Loại</th>
                <th>Diễn Giải</th>
                <th>Nguồn Tiền</th>
                <th className="r">Số Tiền</th>
                <th className="r" style={{ width: 80 }}>Thao Tác</th>
              </tr></thead>
              <tbody>
                {data.history.slice(0, 25).map((tx, i) => {
                  const isThu = tx.loai === 'doanh_thu'
                  const isChi = tx.loai === 'chi_phi'
                  const tagClass = isThu ? 'sv' : 'ut'
                  const tagLabel = isThu ? 'Doanh Thu' : 'Chi Phí'
                  // Nguồn tiền: với doanh thu là hinh_thuc, với chi phí là hinh_thuc_thanh_toan
                  const ptKey = isThu ? tx.hinh_thuc : tx.hinh_thuc_thanh_toan
                  const methodLabel = ptKey === 'tien_mat' ? 'Tiền Mặt' : ptKey === 'chuyen_khoan' ? 'Chuyển Khoản' : ptKey === 'quet_the' ? 'Quẹt Thẻ' : ptKey === 'the_tra_truoc' ? 'Thẻ Trả Trước' : '—'
                  const methodClass = ptKey === 'tien_mat' ? 'cash' : ptKey === 'chuyen_khoan' ? 'transfer' : ptKey === 'quet_the' ? 'card' : 'pkg'
                  const amtClass = isChi ? 'amt out' : 'amt in'
                  const amtPrefix = isChi ? '−' : '+'
                  return (
                    <tr key={i}>
                      <td style={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums', color: 'var(--ink3)', fontSize: 12 }}>
                        {tx.ngay ? tx.ngay.split('-').reverse().join('/') : '—'}
                      </td>
                      <td><span className={`tag ${tagClass}`}>{tagLabel}</span></td>
                      <td className="nm">{tx.dien_giai || tx.mo_ta || 'Giao dịch'}</td>
                      <td><span className={`method ${methodClass}`}>{methodLabel}</span></td>
                      <td className={amtClass}>{amtPrefix}{formatCurrency(tx.so_tien)}đ</td>
                      <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <button onClick={() => setEditingTx({ loai: tx.loai, data: tx })}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, padding: '2px 6px', color: 'var(--espresso)', borderRadius: 6, marginRight: 2 }}
                          title="Sửa">✏️</button>
                        <button onClick={() => setDeletingTx({ loai: tx.loai, data: tx })}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, padding: '2px 6px', color: '#C0392B', borderRadius: 6 }}
                          title="Xoá">🗑️</button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ── FORM SỬA ── */}
      {editingTx && editingTx.loai === 'doanh_thu' && (
        <FormDoanhThu
          user={user}
          viList={data.viList}
          initialData={editingTx.data}
          onClose={() => setEditingTx(null)}
          onSaved={(type, msg) => {
            if (type === 'success') setRefreshKey(k => k + 1)
            setEditingTx(null)
          }}
        />
      )}
      {editingTx && editingTx.loai === 'chi_phi' && (
        <FormChiPhi
          user={user}
          viList={data.viList}
          initialData={editingTx.data}
          onClose={() => setEditingTx(null)}
          onSaved={(type, msg) => {
            if (type === 'success') setRefreshKey(k => k + 1)
            setEditingTx(null)
          }}
        />
      )}

      {/* ── XÁC NHẬN XOÁ ── */}
      {deletingTx && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(42,32,26,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 600 }}>
          <div style={{ background: 'var(--surface)', borderRadius: 20, padding: '24px 28px', maxWidth: 380, width: '90%', boxShadow: '0 12px 48px rgba(0,0,0,0.25)', textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
            <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--ink)', marginBottom: 8, fontFamily: 'var(--serif)' }}>Xác Nhận Xoá</div>
            <div style={{ fontSize: 13, color: 'var(--ink2)', marginBottom: 6, fontFamily: 'var(--sans)' }}>
              {deletingTx.loai === 'doanh_thu' ? 'Doanh Thu' : 'Chi Phí'} — {formatCurrency(deletingTx.data.so_tien)}
            </div>
            <div style={{ fontSize: 12, color: 'var(--ink3)', marginBottom: 20, fontFamily: 'var(--sans)' }}>
              {deletingTx.data.dien_giai || 'Không có diễn giải'}
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button onClick={() => setDeletingTx(null)} disabled={deleting}
                style={{ padding: '10px 24px', borderRadius: 12, border: '1px solid var(--line)', background: 'var(--surface)', color: 'var(--ink)', fontSize: 14, cursor: 'pointer', fontFamily: 'var(--sans)' }}>
                Huỷ
              </button>
              <button onClick={handleDelete} disabled={deleting}
                style={{ padding: '10px 24px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg,#E57373,#C0392B)', color: '#fff', fontSize: 14, fontWeight: 600, cursor: deleting ? 'not-allowed' : 'pointer', fontFamily: 'var(--sans)', opacity: deleting ? 0.6 : 1 }}>
                {deleting ? 'Đang xoá...' : 'Xoá'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
