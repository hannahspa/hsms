import { useState, useEffect, useCallback } from 'react'
import { posService } from '../../services/posService'
import { formatCurrency, todayISO, getNowVN } from '../../lib/utils'
import DatePicker from '../../components/shared/DatePicker'
import I from '../../components/shared/Icons'

const STATUS_MAP = {
  draft:         { label: 'Đang soạn', bg: 'rgba(133,100,4,.13)',  color: '#856404' },
  da_thanh_toan: { label: 'Đã TT',     bg: 'rgba(66,106,44,.13)',   color: '#426a2c' },
  no_mot_phan:   { label: 'Còn nợ',    bg: 'rgba(26,82,118,.13)',   color: '#1A5276' },
  huy:           { label: 'Đã hủy',    bg: 'rgba(192,57,43,.13)',   color: '#C0392B' },
}

const PTTT_LABEL = {
  tien_mat: 'Tiền Mặt', chuyen_khoan: 'Chuyển Khoản',
  quet_the: 'Quẹt Thẻ', the_lieu_trinh: 'Thẻ LT',
}

function getYesterdayISO() {
  const d = getNowVN()
  d.setDate(d.getDate() - 1)
  return d.toISOString().slice(0, 10)
}

function fmtTime(isoStr) {
  if (!isoStr) return ''
  try { return new Date(isoStr).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) }
  catch { return '' }
}

export default function PosOrderHistory({ onResumeOrder }) {
  const [dateTab, setDateTab]     = useState('today')
  const [date, setDate]           = useState(todayISO())
  const [showPicker, setShowPicker] = useState(false)
  const [search, setSearch]       = useState('')
  const [orders, setOrders]       = useState([])
  const [loading, setLoading]     = useState(false)
  const [selected, setSelected]   = useState(null)
  const [detail, setDetail]       = useState({ items: [], payments: [] })
  const [loadingDetail, setLoadingDetail] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setSelected(null)
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
    setSearch('')
    setDateTab(tab)
    if (tab === 'today') setDate(todayISO())
    else if (tab === 'yesterday') setDate(getYesterdayISO())
    else setShowPicker(true)
  }

  const handlePickerConfirm = (iso) => {
    setDate(iso)
    setDateTab('pick')
    setShowPicker(false)
  }

  const openDetail = async (order) => {
    if (selected?.id === order.id) { setSelected(null); return }
    setSelected(order)
    setLoadingDetail(true)
    try {
      const [items, payments] = await Promise.all([
        posService.getLineItems(order.id),
        posService.getPayments(order.id),
      ])
      setDetail({ items, payments })
    } catch (_) {
      setDetail({ items: [], payments: [] })
    } finally { setLoadingDetail(false) }
  }

  const handleVoid = async () => {
    if (!selected || !confirm(`Hủy đơn ${selected.ma_don}?`)) return
    try {
      await posService.voidOrder(selected.id)
      setSelected(null)
      load()
    } catch (err) { alert('Lỗi: ' + err.message) }
  }

  const labelDate = dateTab === 'today' ? 'Hôm nay' : dateTab === 'yesterday' ? 'Hôm qua'
    : date ? date.split('-').reverse().join('/') : '—'

  return (
    <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>

      {/* ── LEFT — Danh sách ── */}
      <div style={{ flex: 1, minWidth: 0 }}>

        {/* Header */}
        <div className="mod-head" style={{ marginBottom: 16 }}>
          <div>
            <div className="ttl">Danh Sách Bán Hàng</div>
            <div className="sub">
              {search.trim()
                ? `Kết quả tìm "${search}" · ${orders.length} đơn`
                : `${labelDate} · ${orders.length} đơn`}
            </div>
          </div>
          <div className="acts">
            {[
              { key: 'today',     label: 'Hôm nay' },
              { key: 'yesterday', label: 'Hôm qua' },
              { key: 'pick',      label: '📅 Chọn ngày' },
            ].map(t => (
              <button key={t.key} onClick={() => handleDateTab(t.key)}
                style={{
                  padding: '5px 14px', borderRadius: 20, border: 'none',
                  fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  background: dateTab === t.key
                    ? 'linear-gradient(135deg,#C9A96E,#A0714F)'
                    : 'var(--bg)',
                  color: dateTab === t.key ? '#fff' : 'var(--ink3)',
                  boxShadow: dateTab === t.key ? '0 2px 8px rgba(160,113,79,.3)' : 'none',
                  transition: 'all .15s',
                }}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Search */}
        <div className="search" style={{ marginBottom: 14 }}>
          <I.Search />
          <input
            placeholder="Tìm mã đơn, tên khách hàng…"
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

        {/* Content */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px', color: 'var(--ink3)' }}>Đang tải...</div>
        ) : orders.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '60px', color: 'var(--ink3)' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
            <div style={{ fontFamily: 'var(--serif)', fontSize: 16, marginBottom: 6 }}>
              {search.trim() ? `Không tìm thấy đơn nào` : 'Chưa có đơn hàng'}
            </div>
            <div style={{ fontSize: 13 }}>
              {search.trim() ? 'Thử tìm với từ khóa khác' : 'Đơn hàng sẽ hiện ở đây sau khi tạo'}
            </div>
          </div>
        ) : (
          <div className="card" style={{ padding: 0 }}>
            <table className="tbl">
              <thead>
                <tr>
                  <th style={{ paddingLeft: 20 }}>Mã Đơn</th>
                  <th>Khách Hàng</th>
                  <th>Giờ</th>
                  <th className="amount">Thực Thu</th>
                  <th style={{ paddingRight: 20 }}>Trạng Thái</th>
                </tr>
              </thead>
              <tbody>
                {orders.map(o => {
                  const st = STATUS_MAP[o.trang_thai] || STATUS_MAP.draft
                  const isActive = selected?.id === o.id
                  return (
                    <tr key={o.id} onClick={() => openDetail(o)}
                      style={{
                        cursor: 'pointer',
                        ...(isActive ? { background: 'rgba(201,169,110,.07)', borderLeft: '3px solid var(--champagne)' } : {}),
                      }}>
                      <td style={{ paddingLeft: 20 }}>
                        <span style={{ fontWeight: 700, fontFamily: 'var(--serif)', fontSize: 13, color: 'var(--champagne)' }}>
                          {o.ma_don}
                        </span>
                      </td>
                      <td>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>
                          {o.khach_hang?.ho_ten || <span style={{ color: 'var(--ink3)', fontStyle: 'italic', fontWeight: 400 }}>Khách lẻ</span>}
                        </div>
                        {o.khach_hang?.so_dien_thoai && (
                          <div style={{ fontSize: 11, color: 'var(--ink3)' }}>{o.khach_hang.so_dien_thoai}</div>
                        )}
                      </td>
                      <td style={{ fontSize: 12, color: 'var(--ink3)' }}>
                        {fmtTime(o.created_at)}
                      </td>
                      <td className="amount">
                        <div style={{ fontFamily: 'var(--serif)', fontSize: 16, fontWeight: 700, color: 'var(--thu)' }}>
                          {formatCurrency(o.thuc_thu || o.thanh_tien || 0)}
                        </div>
                        {(o.con_no || 0) > 0 && (
                          <div style={{ fontSize: 11, color: 'var(--chi)', fontWeight: 600 }}>
                            Nợ: {formatCurrency(o.con_no)}
                          </div>
                        )}
                      </td>
                      <td style={{ paddingRight: 20 }}>
                        <span style={{ background: st.bg, color: st.color, padding: '3px 9px', borderRadius: 8, fontSize: 11, fontWeight: 700 }}>
                          {st.label}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── RIGHT — Detail panel ── */}
      {selected && (
        <aside style={{
          width: 300, flexShrink: 0,
          background: 'var(--surface)', border: '1px solid var(--bord)',
          borderRadius: 'var(--r-lg)', boxShadow: 'var(--sh-2)',
          padding: 20, animation: 'viewIn .3s var(--ease-out) both',
          position: 'sticky', top: 24, maxHeight: '85vh', overflowY: 'auto',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ fontFamily: 'var(--serif)', fontSize: 16, fontWeight: 700, color: 'var(--ink)' }}>
              {selected.ma_don}
            </div>
            <button className="icon-btn" style={{ width: 26, height: 26, fontSize: 14 }} onClick={() => setSelected(null)}>✕</button>
          </div>

          {/* Tổng */}
          <div style={{
            background: 'rgba(66,106,44,.08)', border: '1px solid rgba(66,106,44,.18)',
            borderRadius: 'var(--r)', padding: '14px 16px', marginBottom: 14,
          }}>
            <div style={{ fontSize: 10, color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: '.1em', fontWeight: 600, marginBottom: 4 }}>
              Thực Thu
            </div>
            <div style={{ fontFamily: 'var(--serif)', fontSize: 28, fontWeight: 700, color: '#426a2c' }}>
              {formatCurrency(selected.thuc_thu || selected.thanh_tien || 0)}
            </div>
            <div style={{ fontSize: 12, color: 'var(--ink3)', marginTop: 4 }}>
              {selected.khach_hang?.ho_ten || 'Khách lẻ'}
              {(selected.con_no || 0) > 0 && (
                <span style={{ color: 'var(--chi)', fontWeight: 600, marginLeft: 6 }}>
                  · Nợ {formatCurrency(selected.con_no)}
                </span>
              )}
            </div>
          </div>

          {/* PTTT */}
          {detail.payments.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 8 }}>
                Hình Thức TT
              </div>
              {detail.payments.map(p => (
                <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5, fontSize: 13 }}>
                  <span style={{ color: 'var(--ink2)' }}>{PTTT_LABEL[p.hinh_thuc] || p.hinh_thuc}</span>
                  <span style={{ fontWeight: 600, color: 'var(--ink)' }}>{formatCurrency(p.so_tien)}</span>
                </div>
              ))}
            </div>
          )}

          {/* Dịch vụ */}
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 10 }}>
            Chi Tiết ({detail.items.length})
          </div>
          {loadingDetail ? (
            <div style={{ textAlign: 'center', padding: '20px', color: 'var(--ink3)', fontSize: 13 }}>Đang tải...</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
              {detail.items.map(item => {
                const ten = item.dich_vu?.ten || item.san_pham?.ten
                  || item.the_lieu_trinh?.ten_dich_vu || 'Dịch vụ'
                return (
                  <div key={item.id} style={{ background: 'var(--bg)', borderRadius: 10, padding: '10px 12px', border: '1px solid var(--line)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)', flex: 1, marginRight: 8 }}>{ten}</div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--thu)', flexShrink: 0 }}>
                        {formatCurrency(item.thanh_tien || 0)}
                      </div>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--ink3)' }}>
                      SL: {item.so_luong}
                      {item.nhan_vien?.ho_ten && ` · ${item.nhan_vien.ho_ten.trim().split(' ').slice(-1)[0]}`}
                      {(item.tien_hoa_hong || 0) > 0 && (
                        <span style={{ color: '#426a2c', marginLeft: 4 }}>
                          HH: {formatCurrency(item.tien_hoa_hong)}
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
              {detail.items.length === 0 && !loadingDetail && (
                <div style={{ textAlign: 'center', padding: '16px', color: 'var(--ink3)', fontSize: 13 }}>Không có dịch vụ</div>
              )}
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {selected.trang_thai === 'draft' && onResumeOrder && (
              <button className="btn gold" style={{ width: '100%', justifyContent: 'center' }}
                onClick={() => onResumeOrder(selected)}>
                Tiếp Tục Đơn Này
              </button>
            )}
            {selected.trang_thai !== 'huy' && (
              <button onClick={handleVoid}
                style={{
                  width: '100%', padding: '10px', borderRadius: 'var(--r)',
                  border: '1px solid rgba(192,57,43,.3)', background: 'rgba(192,57,43,.06)',
                  color: 'var(--chi)', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                }}>
                Hủy Đơn Hàng
              </button>
            )}
          </div>
        </aside>
      )}

      <DatePicker
        open={showPicker}
        selectedDate={date}
        onClose={() => { setShowPicker(false); if (dateTab === 'pick' && !date) setDateTab('today') }}
        onConfirm={handlePickerConfirm}
      />
    </div>
  )
}
