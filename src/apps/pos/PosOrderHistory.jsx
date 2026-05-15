import { useState, useEffect, useCallback } from 'react'
import { posService } from '../../services/posService'
import { formatCurrency, todayISO, getNowVN } from '../../lib/utils'
import DatePicker from '../../components/shared/DatePicker'
import I from '../../components/shared/Icons'

// ─── Constants ──────────────────────────────────────────────────────────────
const STATUS_MAP = {
  draft:         { label: 'Chờ thanh toán', dot: '#F0AD4E', bg: 'rgba(240,173,78,.12)',  color: '#996a00' },
  da_thanh_toan: { label: 'Đã thanh toán',  dot: '#28A745', bg: 'rgba(40,167,69,.11)',   color: '#1a5e2e' },
  no_mot_phan:   { label: 'Đang nợ',        dot: '#17A2B8', bg: 'rgba(23,162,184,.12)',  color: '#0c5460' },
  huy:           { label: 'Đã bị xóa',      dot: '#DC3545', bg: 'rgba(220,53,69,.11)',   color: '#7c1a24' },
}

const STATUS_TABS = [
  { key: 'all',           label: 'Tất cả' },
  { key: 'draft',         label: 'Chờ thanh toán' },
  { key: 'da_thanh_toan', label: 'Đã thanh toán' },
  { key: 'no_mot_phan',   label: 'Đang nợ' },
  { key: 'huy',           label: 'Đã bị xóa' },
]

const PTTT_LABEL = {
  tien_mat: 'Tiền Mặt', chuyen_khoan: 'Chuyển Khoản',
  quet_the: 'Quẹt Thẻ', the_lieu_trinh: 'Thẻ LT',
}

function fmtDateTime(isoStr) {
  if (!isoStr) return ''
  try {
    const d = new Date(isoStr)
    const date = d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
    const time = d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    return { date, time }
  } catch { return { date: '', time: '' } }
}

function getYesterdayISO() {
  const d = getNowVN(); d.setDate(d.getDate() - 1)
  return d.toISOString().slice(0, 10)
}

// ─── Modal chi tiết đơn ─────────────────────────────────────────────────────
function OrderDetailModal({ order, onClose, onVoid, onEdit }) {
  const [detail, setDetail] = useState({ items: [], payments: [] })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      posService.getLineItems(order.id),
      posService.getPayments(order.id),
    ]).then(([items, payments]) => {
      setDetail({ items, payments })
    }).catch(() => setDetail({ items: [], payments: [] }))
      .finally(() => setLoading(false))
  }, [order.id])

  const st = STATUS_MAP[order.trang_thai] || STATUS_MAP.draft
  const { date, time } = fmtDateTime(order.created_at)

  return (
    <>
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)',
        zIndex: 500, backdropFilter: 'blur(2px)',
      }} />
      <div style={{
        position: 'fixed', top: '50%', left: '50%',
        transform: 'translate(-50%,-50%)',
        width: 520, maxHeight: '88vh', overflowY: 'auto',
        background: 'var(--surface)', borderRadius: 'var(--r-lg)',
        boxShadow: 'var(--sh-3)', zIndex: 501,
        animation: 'scaleIn .2s ease',
      }}>
        {/* Header modal */}
        <div style={{
          padding: '20px 24px 16px',
          borderBottom: '1px solid var(--line)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          position: 'sticky', top: 0, background: 'var(--surface)', zIndex: 1,
        }}>
          <div>
            <div style={{ fontFamily: 'var(--serif)', fontSize: 20, fontWeight: 700, color: 'var(--champagne)' }}>
              {order.ma_don}
            </div>
            <div style={{ fontSize: 12, color: 'var(--ink3)', marginTop: 2 }}>
              {date} · {time}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700,
              background: st.bg, color: st.color,
              display: 'flex', alignItems: 'center', gap: 5,
            }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: st.dot, display: 'inline-block' }} />
              {st.label}
            </span>
            <button onClick={onClose} className="icon-btn" style={{ width: 28, height: 28, fontSize: 15 }}>✕</button>
          </div>
        </div>

        <div style={{ padding: '20px 24px' }}>
          {/* KH info */}
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20,
            background: 'var(--bg)', borderRadius: 'var(--r)', padding: '14px 16px',
          }}>
            <div>
              <div style={{ fontSize: 10, color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: '.1em', fontWeight: 600, marginBottom: 3 }}>Khách hàng</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>
                {order.khach_hang?.ho_ten || <span style={{ fontStyle: 'italic', fontWeight: 400, color: 'var(--ink3)' }}>Khách lẻ</span>}
              </div>
              {order.khach_hang?.so_dien_thoai && (
                <div style={{ fontSize: 12, color: 'var(--ink3)', marginTop: 2 }}>{order.khach_hang.so_dien_thoai}</div>
              )}
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 10, color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: '.1em', fontWeight: 600, marginBottom: 3 }}>Tổng thu</div>
              <div style={{ fontFamily: 'var(--serif)', fontSize: 22, fontWeight: 700, color: '#426a2c' }}>
                {formatCurrency(order.thuc_thu || order.thanh_tien || 0)}
              </div>
              {(order.con_no || 0) > 0 && (
                <div style={{ fontSize: 12, color: 'var(--chi)', fontWeight: 700, marginTop: 2 }}>
                  Còn nợ: {formatCurrency(order.con_no)}
                </div>
              )}
            </div>
          </div>

          {/* Hình thức TT */}
          {!loading && detail.payments.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 10 }}>Thanh Toán</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {detail.payments.map(p => (
                  <div key={p.id} style={{
                    padding: '6px 14px', borderRadius: 999, fontSize: 12, fontWeight: 600,
                    background: 'var(--bg2)', border: '1px solid var(--line)',
                    color: 'var(--ink2)', display: 'flex', gap: 6, alignItems: 'center',
                  }}>
                    <span>{PTTT_LABEL[p.hinh_thuc] || p.hinh_thuc}</span>
                    <span style={{ fontWeight: 700, color: 'var(--ink)' }}>{formatCurrency(p.so_tien)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Dịch vụ */}
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 10 }}>
            Chi Tiết ({detail.items.length} dịch vụ)
          </div>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '20px', color: 'var(--ink3)' }}>Đang tải...</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 20 }}>
              {detail.items.map(item => {
                const ten = item.dich_vu?.ten || item.san_pham?.ten || item.the_lieu_trinh?.ten_dich_vu || 'Dịch vụ'
                return (
                  <div key={item.id} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '10px 14px', background: 'var(--bg)',
                    borderRadius: 'var(--r)', border: '1px solid var(--line)',
                  }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', marginBottom: 2 }}>{ten}</div>
                      <div style={{ fontSize: 11, color: 'var(--ink3)', display: 'flex', gap: 10 }}>
                        <span>SL: {item.so_luong}</span>
                        {item.nhan_vien?.ho_ten && (
                          <span style={{ color: 'var(--champagne)' }}>
                            {item.nhan_vien.ho_ten.trim().split(' ').pop()}
                          </span>
                        )}
                        {(item.tien_hoa_hong || 0) > 0 && (
                          <span style={{ color: '#426a2c' }}>HH: {formatCurrency(item.tien_hoa_hong)}</span>
                        )}
                      </div>
                    </div>
                    <div style={{ fontFamily: 'var(--serif)', fontSize: 14, fontWeight: 700, color: 'var(--ink)', flexShrink: 0 }}>
                      {formatCurrency(item.thanh_tien || 0)}
                    </div>
                  </div>
                )
              })}
              {detail.items.length === 0 && (
                <div style={{ textAlign: 'center', padding: 20, color: 'var(--ink3)', fontSize: 13 }}>Không có dịch vụ</div>
              )}
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', borderTop: '1px solid var(--line)', paddingTop: 16 }}>
            {order.trang_thai !== 'huy' && (
              <button onClick={onVoid} style={{
                padding: '8px 16px', borderRadius: 'var(--r)', border: '1px solid rgba(220,53,69,.3)',
                background: 'rgba(220,53,69,.07)', color: '#c0392b',
                fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--sans)',
              }}>
                Hủy đơn
              </button>
            )}
            <button onClick={onClose} className="btn" style={{ fontSize: 12 }}>Đóng</button>
            {order.trang_thai === 'draft' && (
              <button onClick={() => onEdit(order)} className="btn gold" style={{ fontSize: 12 }}>
                Mở đơn & Thanh Toán
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

// ─── Main ────────────────────────────────────────────────────────────────────
export default function PosOrderHistory({ onResumeOrder }) {
  const [dateTab, setDateTab]       = useState('today')
  const [date, setDate]             = useState(todayISO())
  const [showPicker, setShowPicker] = useState(false)
  const [search, setSearch]         = useState('')
  const [statusTab, setStatusTab]   = useState('all')
  const [orders, setOrders]         = useState([])
  const [loading, setLoading]       = useState(false)
  const [detailOrder, setDetailOrder] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setDetailOrder(null)
    try {
      setOrders(await posService.getOrdersByDate(date))
    } catch (_) {} finally { setLoading(false) }
  }, [date])

  useEffect(() => { load() }, [load])

  const handleSearch = async (q) => {
    setSearch(q)
    if (!q.trim()) { load(); return }
    setLoading(true)
    try {
      setOrders(await posService.searchOrders(q))
    } catch (_) {} finally { setLoading(false) }
  }

  const handleDateTab = (tab) => {
    setSearch(''); setStatusTab('all')
    setDateTab(tab)
    if (tab === 'today')     setDate(todayISO())
    else if (tab === 'yesterday') setDate(getYesterdayISO())
    else setShowPicker(true)
  }

  const handleVoid = async () => {
    if (!detailOrder || !confirm(`Hủy đơn ${detailOrder.ma_don}?`)) return
    try {
      await posService.voidOrder(detailOrder.id)
      setDetailOrder(null)
      load()
    } catch (err) { alert('Lỗi: ' + err.message) }
  }

  const filteredOrders = orders.filter(o => {
    if (statusTab !== 'all' && o.trang_thai !== statusTab) return false
    return true
  })

  const countByStatus = (key) => orders.filter(o => key === 'all' || o.trang_thai === key).length

  const labelDate = dateTab === 'today' ? 'Hôm nay'
    : dateTab === 'yesterday' ? 'Hôm qua'
    : date ? date.split('-').reverse().join('/') : '—'

  return (
    <div>
      {/* ── Header ── */}
      <div className="mod-head" style={{ marginBottom: 16 }}>
        <div>
          <div className="ttl">Danh Sách Đơn Hàng</div>
          <div className="sub">
            {search.trim()
              ? `Tìm "${search}" · ${filteredOrders.length} kết quả`
              : `${labelDate} · ${filteredOrders.length} đơn`}
          </div>
        </div>
        <div className="acts">
          {/* Date tabs */}
          {[
            { key: 'today',     label: 'Hôm nay' },
            { key: 'yesterday', label: 'Hôm qua' },
            { key: 'pick',      label: '📅 Ngày khác' },
          ].map(t => (
            <button key={t.key} onClick={() => handleDateTab(t.key)}
              className={dateTab === t.key ? 'btn gold' : 'btn'}
              style={{ fontSize: 12 }}>
              {t.label}
            </button>
          ))}
          <button className="btn gold" onClick={() => window.location.href = '/pos'}>
            <I.Plus style={{ width: 13, height: 13 }} /> Tạo Đơn Hàng
          </button>
        </div>
      </div>

      {/* ── Search + Status tabs ── */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 14, alignItems: 'center' }}>
        <div className="search" style={{ flex: 1, maxWidth: 380 }}>
          <I.Search />
          <input
            placeholder="Tìm mã đơn, tên khách hàng, SĐT…"
            value={search}
            onChange={e => handleSearch(e.target.value)}
          />
          {search && (
            <button onClick={() => { setSearch(''); load() }}
              style={{ background: 'none', border: 'none', color: 'var(--ink3)', cursor: 'pointer', fontSize: 14 }}>
              ✕
            </button>
          )}
        </div>

        {/* Status filter chips */}
        <div style={{ display: 'flex', gap: 6 }}>
          {STATUS_TABS.map(t => {
            const cnt = countByStatus(t.key)
            const active = statusTab === t.key
            return (
              <button key={t.key} onClick={() => setStatusTab(t.key)}
                style={{
                  padding: '5px 12px', borderRadius: 20, border: '1px solid var(--line)',
                  fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
                  background: active ? 'var(--grad-gold)' : 'var(--surface)',
                  color: active ? '#2a1d14' : 'var(--ink3)',
                  boxShadow: active ? '0 2px 8px rgba(160,113,79,.25)' : 'none',
                  transition: 'all .15s',
                }}>
                {t.label}
                {cnt > 0 && <span style={{ marginLeft: 5, opacity: .7 }}>({cnt})</span>}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Table ── */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--ink3)' }}>Đang tải...</div>
      ) : filteredOrders.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '60px', color: 'var(--ink3)' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
          <div style={{ fontFamily: 'var(--serif)', fontSize: 16, marginBottom: 6 }}>
            {search.trim() ? 'Không tìm thấy đơn nào' : 'Chưa có đơn hàng'}
          </div>
          <div style={{ fontSize: 13 }}>
            {search.trim() ? 'Thử từ khóa khác' : `Không có đơn nào trong ngày ${labelDate}`}
          </div>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="tbl" style={{ tableLayout: 'fixed', width: '100%' }}>
            <colgroup>
              <col style={{ width: 160 }} />
              <col style={{ width: 160 }} />
              <col style={{ width: 130 }} />
              <col style={{ width: 140 }} />
              <col style={{ width: 120 }} />
              <col />
              <col style={{ width: 120 }} />
            </colgroup>
            <thead>
              <tr>
                <th style={{ paddingLeft: 20 }}>Mã ĐH / Giờ</th>
                <th>Khách Hàng</th>
                <th>Trạng Thái</th>
                <th>NV / Commission</th>
                <th className="amount">Đơn Giá</th>
                <th className="amount">Tổng / Còn Nợ</th>
                <th style={{ paddingRight: 20, textAlign: 'center' }}>Thao Tác</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map(o => {
                const st = STATUS_MAP[o.trang_thai] || STATUS_MAP.draft
                const { date: d, time: t } = fmtDateTime(o.created_at)
                const hasLieuTrinh = o.trang_thai_note?.includes('lieu_trinh')

                return (
                  <tr key={o.id} style={{ borderBottom: '1px solid var(--line)' }}>
                    {/* Mã ĐH */}
                    <td style={{ paddingLeft: 20 }}>
                      <div style={{ fontWeight: 700, fontFamily: 'var(--serif)', fontSize: 13, color: 'var(--champagne)' }}>
                        {o.ma_don}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--ink3)', marginTop: 2 }}>{d} · {t}</div>
                    </td>

                    {/* Khách hàng */}
                    <td>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>
                        {o.khach_hang?.ho_ten || (
                          <span style={{ color: 'var(--ink3)', fontStyle: 'italic', fontWeight: 400 }}>Khách lẻ</span>
                        )}
                      </div>
                      {o.khach_hang?.so_dien_thoai && (
                        <div style={{ fontSize: 11, color: 'var(--ink3)', marginTop: 1 }}>{o.khach_hang.so_dien_thoai}</div>
                      )}
                      {hasLieuTrinh && (
                        <span style={{
                          display: 'inline-block', marginTop: 3,
                          fontSize: 9.5, fontWeight: 700, padding: '1px 6px',
                          borderRadius: 4, background: 'rgba(108,52,131,.12)', color: '#6c3483',
                        }}>Liệu trình</span>
                      )}
                    </td>

                    {/* Trạng thái */}
                    <td>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 5,
                        padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                        background: st.bg, color: st.color,
                      }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: st.dot, flexShrink: 0 }} />
                        {st.label}
                      </span>
                    </td>

                    {/* NV / Commission */}
                    <td>
                      <div style={{ fontSize: 12, color: 'var(--ink2)' }}>
                        {o.nguoi_tao_ten || '—'}
                      </div>
                      {(o.tong_hoa_hong || 0) > 0 && (
                        <div style={{ fontSize: 11, color: '#426a2c', fontWeight: 600, marginTop: 1 }}>
                          HH: {formatCurrency(o.tong_hoa_hong)}
                        </div>
                      )}
                    </td>

                    {/* Đơn giá */}
                    <td className="amount">
                      <div style={{ fontFamily: 'var(--serif)', fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>
                        {formatCurrency(o.thanh_tien || 0)}
                      </div>
                      {(o.giam_gia || 0) > 0 && (
                        <div style={{ fontSize: 11, color: 'var(--chi)', marginTop: 1 }}>
                          Giảm: {formatCurrency(o.giam_gia)}
                        </div>
                      )}
                    </td>

                    {/* Tổng / Nợ */}
                    <td className="amount">
                      <div style={{ fontFamily: 'var(--serif)', fontSize: 15, fontWeight: 700, color: '#426a2c' }}>
                        {formatCurrency(o.thuc_thu || o.thanh_tien || 0)}
                      </div>
                      {(o.con_no || 0) > 0 && (
                        <div style={{ fontSize: 11, color: 'var(--chi)', fontWeight: 700, marginTop: 1 }}>
                          Nợ: {formatCurrency(o.con_no)}
                        </div>
                      )}
                    </td>

                    {/* Thao tác */}
                    <td style={{ paddingRight: 16 }}>
                      <div style={{ display: 'flex', gap: 5, justifyContent: 'center' }}>
                        {/* Xem chi tiết */}
                        <button
                          onClick={() => setDetailOrder(o)}
                          title="Xem chi tiết"
                          style={{
                            width: 28, height: 28, borderRadius: 6, border: 'none',
                            background: 'rgba(23,162,184,.12)', color: '#0c5460',
                            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>
                          <I.Info style={{ width: 13, height: 13 }} />
                        </button>

                        {/* Mở đơn & TT (chỉ khi draft) */}
                        {o.trang_thai === 'draft' && onResumeOrder && (
                          <button
                            onClick={() => onResumeOrder(o)}
                            title="Mở đơn & Thanh toán"
                            style={{
                              width: 28, height: 28, borderRadius: 6, border: 'none',
                              background: 'rgba(40,167,69,.12)', color: '#1a5e2e',
                              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                            <I.Edit style={{ width: 13, height: 13 }} />
                          </button>
                        )}

                        {/* In (placeholder) */}
                        <button
                          title="In hoá đơn"
                          style={{
                            width: 28, height: 28, borderRadius: 6, border: 'none',
                            background: 'rgba(52,131,208,.12)', color: '#1a5276',
                            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            opacity: 0.55,
                          }}>
                          <I.FileText style={{ width: 13, height: 13 }} />
                        </button>

                        {/* Hủy (chỉ khi chưa hủy) */}
                        {o.trang_thai !== 'huy' && (
                          <button
                            onClick={() => { setDetailOrder(o); setTimeout(() => {}, 0) }}
                            title="Hủy đơn"
                            style={{
                              width: 28, height: 28, borderRadius: 6, border: 'none',
                              background: 'rgba(220,53,69,.10)', color: '#c0392b',
                              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                            <I.Trash style={{ width: 13, height: 13 }} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── DatePicker ── */}
      <DatePicker
        open={showPicker}
        selectedDate={date}
        onClose={() => setShowPicker(false)}
        onConfirm={(iso) => { setDate(iso); setDateTab('pick'); setShowPicker(false) }}
      />

      {/* ── Detail Modal ── */}
      {detailOrder && (
        <OrderDetailModal
          order={detailOrder}
          onClose={() => setDetailOrder(null)}
          onVoid={handleVoid}
          onEdit={(o) => { setDetailOrder(null); onResumeOrder?.(o); window.location.href = '/pos' }}
        />
      )}
    </div>
  )
}
