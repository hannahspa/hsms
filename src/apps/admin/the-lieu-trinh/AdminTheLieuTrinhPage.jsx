import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabase'
import { formatCurrency, getNowVN, todayISO } from '../../../lib/utils'
import I from '../../../components/shared/Icons'

function daysSince(dateStr) {
  if (!dateStr) return null
  return Math.floor((getNowVN() - new Date(dateStr)) / 86400000)
}
function fmtDate(iso) {
  if (!iso) return '—'
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}
function fmtCompact(n) {
  if (!n) return '0đ'
  if (n >= 1e6) return Math.round(n / 1e6) + ' tr'
  return Math.round(n / 1e3) + 'k'
}

const STATUS_CFG = {
  dang_su_dung: { l: 'Đang dùng',  bg: '#eef2e7', color: '#5a6a4a' },
  da_su_dung_het: { l: 'Hết buổi', bg: '#ede9f8', color: '#5a4a8a' },
  het_han:      { l: 'Hết hạn',    bg: '#f5e0da', color: '#843a23' },
  ngung:        { l: 'Ngừng',      bg: '#f5f0e8', color: '#8B7355' },
}

function StatusBadge({ trangThai, ngayHetHan }) {
  const expired = ngayHetHan && new Date(ngayHetHan) < new Date(todayISO())
  const key = expired ? 'het_han' : (trangThai || 'dang_su_dung')
  const cfg = STATUS_CFG[key] || STATUS_CFG.dang_su_dung
  return (
    <span style={{ background: cfg.bg, color: cfg.color, padding: '3px 9px', borderRadius: 8, fontSize: 11, fontWeight: 700 }}>
      {cfg.l}
    </span>
  )
}

export default function AdminTheLieuTrinhPage() {
  const [cards, setCards] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [selected, setSelected] = useState(null)

  useEffect(() => { load() }, [])

  const load = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('the_lieu_trinh')
      .select('*, khach_hang:khach_hang_id(ho_ten, so_dien_thoai)')
      .order('created_at', { ascending: false })
      .limit(500)
    setCards(data || [])
    setLoading(false)
  }

  const today = todayISO()
  const isExpired = c => c.ngay_het_han && c.ngay_het_han < today
  const isDone = c => (c.so_buoi_con_lai || 0) <= 0
  const isActive = c => !isExpired(c) && !isDone(c)
  const isAlmostDone = c => isActive(c) && (c.so_buoi_con_lai || 0) <= 2

  // Stats
  const total = cards.length
  const activeN = cards.filter(isActive).length
  const expiredN = cards.filter(isExpired).length
  const doneN = cards.filter(c => !isExpired(c) && isDone(c)).length
  const almostN = cards.filter(isAlmostDone).length
  const totalValue = cards.reduce((s, c) => s + (c.gia_tri_the || 0), 0)

  // Filter
  const filtered = cards.filter(c => {
    if (filter === 'active' && !isActive(c)) return false
    if (filter === 'expired' && !isExpired(c)) return false
    if (filter === 'done' && !(isDone(c) && !isExpired(c))) return false
    if (filter === 'almost' && !isAlmostDone(c)) return false
    if (search) {
      const q = search.toLowerCase()
      const ten = c.khach_hang?.ho_ten?.toLowerCase() || ''
      const dv = c.ten_dich_vu?.toLowerCase() || ''
      const sdt = c.khach_hang?.so_dien_thoai || ''
      if (!ten.includes(q) && !dv.includes(q) && !sdt.includes(search)) return false
    }
    return true
  })

  const CHIPS = [
    { k: 'all',     l: 'Tất cả',   n: total },
    { k: 'active',  l: 'Đang dùng', n: activeN },
    { k: 'almost',  l: 'Sắp hết',  n: almostN },
    { k: 'done',    l: 'Hết buổi', n: doneN },
    { k: 'expired', l: 'Hết hạn',  n: expiredN },
  ]

  return (
    <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>

      {/* ── MAIN ── */}
      <div style={{ flex: 1, minWidth: 0 }}>

        <div className="mod-head" style={{ marginBottom: 20 }}>
          <div>
            <div className="ttl">Thẻ Liệu Trình</div>
            <div className="sub">
              {total.toLocaleString('vi-VN')} thẻ · {activeN} đang dùng · {almostN} sắp hết buổi
            </div>
          </div>
          <div className="acts">
            <button className="btn ghost">
              <I.Filter style={{ width: 13, height: 13 }} /> Xuất Excel
            </button>
          </div>
        </div>

        <div className="strip" style={{ gridTemplateColumns: 'repeat(4,1fr)', marginBottom: 20 }}>
          <div className="it">
            <div className="l">Tổng Thẻ</div>
            <div className="v">{total.toLocaleString('vi-VN')}</div>
            <div className="d">tất cả trạng thái</div>
          </div>
          <div className="it">
            <div className="l">Đang Hoạt Động</div>
            <div className="v" style={{ color: '#426a2c' }}>{activeN}</div>
            <div className="d">{total > 0 ? Math.round(activeN / total * 100) : 0}% tổng thẻ</div>
          </div>
          <div className="it">
            <div className="l">Sắp Hết Buổi</div>
            <div className="v" style={{ color: almostN > 0 ? '#b08a55' : 'var(--ink)' }}>{almostN}</div>
            <div className="d">còn ≤ 2 buổi</div>
          </div>
          <div className="it">
            <div className="l">Giá Trị Tổng</div>
            <div className="v">{fmtCompact(totalValue)}</div>
            <div className="d">theo giá thẻ</div>
          </div>
        </div>

        {/* Filter + Search */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 14, flexWrap: 'wrap' }}>
          {CHIPS.map(x => (
            <button key={x.k} className={`chip${x.k === filter ? ' active' : ''}`}
              onClick={() => setFilter(x.k)} style={{ padding: '7px 14px', fontSize: '12.5px' }}>
              {x.l} <span style={{ opacity: .6, marginLeft: 5 }}>{x.n}</span>
            </button>
          ))}
          <div style={{ flex: 1 }} />
          <div className="search" style={{ maxWidth: 260, margin: 0 }}>
            <I.Search />
            <input placeholder="Tên KH, dịch vụ, SĐT..."
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px', color: 'var(--ink3)' }}>
            Đang tải danh sách thẻ...
          </div>
        ) : (
          <div className="card" style={{ padding: 0 }}>
            <table className="tbl">
              <thead>
                <tr>
                  <th style={{ paddingLeft: 20 }}>Khách Hàng</th>
                  <th>Dịch Vụ</th>
                  <th>Tiến Độ</th>
                  <th className="amount">Còn Lại</th>
                  <th>Hết Hạn</th>
                  <th className="amount">Giá Trị</th>
                  <th>Trạng Thái</th>
                </tr>
              </thead>
              <tbody>
                {filtered.slice(0, 100).map(c => {
                  const pct = c.so_buoi_tong > 0 ? Math.round((c.so_buoi_da_dung / c.so_buoi_tong) * 100) : 0
                  const con = (c.so_buoi_tong || 0) - (c.so_buoi_da_dung || 0)
                  const expired = isExpired(c)
                  const almost = isAlmostDone(c)
                  return (
                    <tr key={c.id} onClick={() => setSelected(selected?.id === c.id ? null : c)}
                      style={{ cursor: 'pointer', ...(selected?.id === c.id ? { background: 'rgba(201,169,110,.07)', borderLeft: '3px solid var(--champagne)' } : {}) }}>
                      <td style={{ paddingLeft: 20 }}>
                        <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--ink)' }}>
                          {c.khach_hang?.ho_ten || '—'}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--ink3)', marginTop: 2 }}>
                          {c.khach_hang?.so_dien_thoai || ''}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontSize: 13, color: 'var(--ink)', fontWeight: 500 }}>{c.ten_dich_vu}</div>
                        <div style={{ fontSize: 11, color: 'var(--ink3)', marginTop: 2 }}>{c.so_buoi_tong} buổi</div>
                      </td>
                      <td style={{ minWidth: 120 }}>
                        <div className="bar-h" style={{ height: 6, borderRadius: 3 }}>
                          <i style={{
                            width: pct + '%', borderRadius: 3,
                            background: expired ? 'var(--ink3)' : almost ? '#e67e22' : 'var(--grad-gold)',
                          }} />
                        </div>
                        <div style={{ fontSize: 10, color: 'var(--ink3)', marginTop: 3 }}>{pct}%</div>
                      </td>
                      <td className="amount">
                        <span style={{ fontFamily: 'var(--serif)', fontSize: 18, fontWeight: 700, color: expired ? 'var(--ink3)' : almost ? '#e67e22' : con > 0 ? 'var(--thu)' : 'var(--ink3)' }}>
                          {con}
                        </span>
                        <span style={{ fontSize: 10, color: 'var(--ink3)', marginLeft: 3 }}>buổi</span>
                      </td>
                      <td>
                        <div style={{ fontSize: 12, color: expired ? 'var(--danger)' : 'var(--ink2)', fontWeight: expired ? 600 : 400 }}>
                          {fmtDate(c.ngay_het_han)}
                        </div>
                        {!expired && c.ngay_het_han && (() => {
                          const daysLeft = Math.ceil((new Date(c.ngay_het_han) - new Date(today)) / 86400000)
                          if (daysLeft <= 30) return <div style={{ fontSize: 10, color: '#e67e22' }}>Còn {daysLeft} ngày</div>
                          return null
                        })()}
                      </td>
                      <td className="amount">
                        <div style={{ fontFamily: 'var(--serif)', fontSize: 13, fontWeight: 600 }}>
                          {c.gia_tri_the ? formatCurrency(c.gia_tri_the) : '—'}
                        </div>
                      </td>
                      <td>
                        <StatusBadge trangThai={c.trang_thai} ngayHetHan={c.ngay_het_han} />
                      </td>
                    </tr>
                  )
                })}
                {filtered.length === 0 && (
                  <tr><td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: 'var(--ink3)' }}>
                    Không có thẻ phù hợp
                  </td></tr>
                )}
              </tbody>
            </table>
            {filtered.length > 100 && (
              <div style={{ textAlign: 'center', padding: '12px', color: 'var(--ink3)', fontSize: 12, borderTop: '1px solid var(--line)' }}>
                Hiển thị 100 / {filtered.length} — dùng bộ lọc để thu hẹp
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── DETAIL PANEL ── */}
      {selected && (
        <aside style={{
          width: 280, flexShrink: 0,
          background: 'var(--surface)', border: '1px solid var(--bord)',
          borderRadius: 'var(--r-lg)', boxShadow: 'var(--sh-2)',
          padding: 20, animation: 'viewIn .3s var(--ease-out) both',
          position: 'sticky', top: 24,
        }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
            <button className="icon-btn" style={{ width: 26, height: 26, fontSize: 14 }} onClick={() => setSelected(null)}>✕</button>
          </div>

          <div style={{ textAlign: 'center', marginBottom: 16 }}>
            <div style={{
              width: 60, height: 60, borderRadius: '50%', margin: '0 auto 10px',
              background: 'var(--grad-gold)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 24, boxShadow: '0 6px 20px rgba(160,113,79,.3)',
            }}>🎫</div>
            <div style={{ fontFamily: 'var(--serif)', fontSize: 16, fontWeight: 700, color: 'var(--ink)', lineHeight: 1.3 }}>
              {selected.ten_dich_vu}
            </div>
            <div style={{ fontSize: 12, color: 'var(--ink3)', marginTop: 4 }}>
              {selected.khach_hang?.ho_ten}
            </div>
            <div style={{ marginTop: 8 }}>
              <StatusBadge trangThai={selected.trang_thai} ngayHetHan={selected.ngay_het_han} />
            </div>
          </div>

          {/* Progress */}
          <div style={{ background: 'var(--bg)', borderRadius: 'var(--r)', padding: '14px', marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 11, color: 'var(--ink3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.07em' }}>Tiến độ</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)' }}>
                {selected.so_buoi_da_dung}/{selected.so_buoi_tong} buổi
              </span>
            </div>
            <div className="bar-h" style={{ height: 8, borderRadius: 4 }}>
              <i style={{
                width: Math.min(100, selected.so_buoi_tong > 0 ? (selected.so_buoi_da_dung / selected.so_buoi_tong * 100) : 0) + '%',
                borderRadius: 4, background: 'var(--grad-gold)',
              }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
              <span style={{ fontSize: 12, color: 'var(--thu)', fontWeight: 700 }}>
                Còn {(selected.so_buoi_tong || 0) - (selected.so_buoi_da_dung || 0)} buổi
              </span>
              <span style={{ fontSize: 12, color: 'var(--ink3)' }}>
                {selected.so_buoi_tong > 0 ? Math.round(selected.so_buoi_da_dung / selected.so_buoi_tong * 100) : 0}%
              </span>
            </div>
          </div>

          {/* Info */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
            {[
              { l: 'SĐT', v: selected.khach_hang?.so_dien_thoai || '—' },
              { l: 'Hết hạn', v: fmtDate(selected.ngay_het_han) },
              { l: 'Giá trị thẻ', v: selected.gia_tri_the ? formatCurrency(selected.gia_tri_the) : '—' },
            ].map((r, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                <span style={{ fontSize: 11, color: 'var(--ink3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.07em' }}>{r.l}</span>
                <span style={{ fontSize: 13, color: 'var(--ink)', fontWeight: 500 }}>{r.v}</span>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button className="btn gold" style={{ justifyContent: 'center', width: '100%' }}
              onClick={() => window.open(`tel:${selected.khach_hang?.so_dien_thoai}`)}>
              <I.Phone style={{ width: 13, height: 13 }} /> Gọi Nhắc Lịch
            </button>
          </div>
        </aside>
      )}
    </div>
  )
}
