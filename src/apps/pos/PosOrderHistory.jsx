import { useState, useEffect, useCallback } from 'react'
import { posService } from '../../services/posService'
import { formatCurrency, todayISO } from '../../lib/utils'
import DatePicker from '../../components/shared/DatePicker'
import I from '../../components/shared/Icons'
import { useAuth } from '../../context/AuthContext'
import { printReceipt } from '../../lib/printReceipt'
import OrderDetailPanel from './OrderDetailPanel'
import {
  STATUS_MAP, STATUS_TABS, PAGE_SIZE, DATE_TABS,
  shortStaffName, fmtDateTime, displayDate,
  getYesterdayISO, getWeekStartISO, getMonthStartISO, paymentMethodLabel,
  orderItemName, treatmentOrderNote,
  itemStaffName, orderItemsPreview, orderMatchesType,
} from './orderHistoryUtils'

// Main
export default function PosOrderHistory({ onResumeOrder }) {
  const { user } = useAuth()
  const isAdmin   = user?.vai_tro === 'admin'
  const [dateTab, setDateTab]       = useState('today')  // mặc định Hôm nay → tối ưu load
  const [date, setDate]             = useState(todayISO())
  const [showPicker, setShowPicker] = useState(false)
  const [rangePicker, setRangePicker] = useState(null)
  const [search, setSearch]         = useState('')
  const [activeSearch, setActiveSearch] = useState('')
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [fromDate, setFromDate]     = useState(todayISO())
  const [toDate, setToDate]         = useState(todayISO())
  const [orderTypeFilter, setOrderTypeFilter] = useState('all')
  const [statusTab, setStatusTab]   = useState('all')
  const [orders, setOrders]         = useState([])
  const [totalOrders, setTotalOrders] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [loading, setLoading]       = useState(false)
  const [detailOrder, setDetailOrder] = useState(null)
  const [printingId, setPrintingId] = useState(null)

  // In nhanh từ bảng — load chi tiết đơn rồi in ngay, không cần mở panel
  const handleQuickPrint = async (o) => {
    if (printingId) return
    setPrintingId(o.id)
    try {
      const [items, payments, snap] = await Promise.all([
        posService.getLineItems(o.id),
        posService.getPayments(o.id),
        posService.getCustomerSnapshot(o.khach_hang_id),
      ])
      printReceipt({
        order: o,
        items: items.map(it => ({
          ten: orderItemName(it),
          so_luong: it.so_luong,
          don_gia: it.don_gia,
          thanh_tien: it.thanh_tien,
          staffName: itemStaffName(it),
        })),
        payments,
        customer: snap?.customer || o.khach_hang,
        thuNgan: o.nguoi_tao_ten || '',
      })
    } catch (err) {
      alert('Lỗi khi in hóa đơn: ' + (err?.message || err))
    } finally {
      setPrintingId(null)
    }
  }

  // Tính khoảng ngày theo tab — mặc định Hôm nay để không load toàn bộ
  const computeRange = useCallback(() => {
    const today = todayISO()
    switch (dateTab) {
      case 'today':     return { fromDate: today, toDate: today }
      case 'yesterday': { const y = getYesterdayISO(); return { fromDate: y, toDate: y } }
      case 'week':      return { fromDate: getWeekStartISO(), toDate: today }
      case 'month':     return { fromDate: getMonthStartISO(), toDate: today }
      case 'range':
      case 'advanced':  return { fromDate, toDate }
      case 'pick':      return { fromDate: date, toDate: date }
      case 'all':       return {}
      default:          return { fromDate: today, toDate: today }
    }
  }, [dateTab, fromDate, toDate, date])

  const load = useCallback(async (page = 1) => {
    setLoading(true)
    setDetailOrder(null)
    try {
      const result = await posService.getOrdersPage({ page, pageSize: PAGE_SIZE, search: activeSearch, ...computeRange() })
      setOrders(result.orders)
      setTotalOrders(result.total)
      setCurrentPage(page)
    } catch (_) {} finally { setLoading(false) }
  }, [computeRange, activeSearch])

  useEffect(() => { load() }, [load])

  const handleSearch = (q) => {
    setSearch(q)
  }

  const runSearch = () => {
    setActiveSearch(search.trim())
  }

  const clearSearch = () => {
    setSearch('')
    setActiveSearch('')
  }

  // Chọn tab thời gian — load tự chạy qua useEffect (computeRange đổi)
  const handleDatePick = (key) => {
    setSearch('')
    setActiveSearch('')
    setStatusTab('all')
    setShowAdvanced(false)
    setDateTab(key)
  }

  const handleDateTab = (tab) => {
    setSearch(''); setActiveSearch(''); setStatusTab('all')
    setDateTab(tab)
    if (tab === 'today') {
      const today = todayISO()
      setDate(today); setFromDate(today); setToDate(today)
    }
    else if (tab === 'yesterday') {
      const yesterday = getYesterdayISO()
      setDate(yesterday); setFromDate(yesterday); setToDate(yesterday)
    }
    else setShowPicker(true)
  }

  const handleAdvancedSearch = async () => {
    setLoading(true)
    setDetailOrder(null)
    setDateTab('advanced')
    try {
      const result = await posService.getOrdersPage({ page: 1, pageSize: PAGE_SIZE, fromDate, toDate, search: activeSearch })
      setOrders(result.orders)
      setTotalOrders(result.total)
      setCurrentPage(1)
    } catch (_) {} finally { setLoading(false) }
  }

  const resetAdvancedSearch = () => {
    const today = todayISO()
    setSearch('')
    setActiveSearch('')
    setStatusTab('all')
    setOrderTypeFilter('all')
    setFromDate(today)
    setToDate(today)
    setDate(today)
    setShowAdvanced(false)
    setDateTab('today')   // về mặc định Hôm nay — load tự chạy qua useEffect
  }

  const handleVoid = async () => {
    if (!detailOrder) return
    // Lễ Tân chỉ được hủy đơn trong ngày hôm nay
    if (!isAdmin && detailOrder.ngay !== todayISO()) {
      alert('Lễ Tân chỉ được hủy đơn trong ngày hôm nay.\nĐơn cũ cần liên hệ Admin để xử lý.')
      return
    }
    if (!confirm(`Hủy đơn ${detailOrder.ma_don}?`)) return
    try {
      await posService.voidOrder(detailOrder.id)
      setDetailOrder(null)
      load(currentPage)
    } catch (err) { alert('Lỗi: ' + err.message) }
  }

  const filteredOrders = orders.filter(o => {
    if (statusTab !== 'all' && o.trang_thai !== statusTab) return false
    if (!orderMatchesType(o, orderTypeFilter)) return false
    const keyword = activeSearch.trim().toLowerCase()
    if (keyword) {
      const haystack = [
        o.ma_don,
        o.khach_hang?.ho_ten,
        o.khach_hang?.so_dien_thoai,
        o.item_summary,
        orderItemsPreview(o),
        ...(o.staff_compensations || []).map(s => s.name),
      ].filter(Boolean).join(' ').toLowerCase()
      if (!haystack.includes(keyword)) return false
    }
    return true
  })

  const countByStatus = (key) => orders.filter(o => key === 'all' || o.trang_thai === key).length
  const totalPages = Math.max(1, Math.ceil(totalOrders / PAGE_SIZE))
  const pageStart = totalOrders === 0 ? 0 : ((currentPage - 1) * PAGE_SIZE) + 1
  const pageEnd = Math.min(totalOrders, currentPage * PAGE_SIZE)

  const RANGE_LABEL = { today: 'Hôm nay', yesterday: 'Hôm qua', week: 'Tuần này', month: 'Tháng này', all: 'Tất cả đơn hàng' }
  const labelDate = RANGE_LABEL[dateTab]
    || ((dateTab === 'range' || dateTab === 'advanced')
        ? `${fromDate.split('-').reverse().join('/')} - ${toDate.split('-').reverse().join('/')}`
        : (date ? date.split('-').reverse().join('/') : '—'))

  return (
    <div>
      {}
      <div className="mod-head" style={{ marginBottom: 16 }}>
        <div>
          <div className="ttl">Danh Sách Đơn Hàng</div>
          <div className="sub">
            {activeSearch.trim()
              ? `Tìm "${activeSearch}" · ${totalOrders.toLocaleString('vi-VN')} kết quả`
              : `${labelDate} · ${totalOrders.toLocaleString('vi-VN')} đơn`}
          </div>
        </div>
      </div>

      {}
      <div className="card" style={{ padding: 16, marginBottom: 14, borderRadius: 8 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(260px,1fr) 120px 190px', gap: 12, alignItems: 'center' }}>
          <div className="search" style={{ maxWidth: 'none' }}>
            <I.Search />
            <input
              placeholder="Mã ĐH / tên / SĐT KH / ghi chú"
              value={search}
              onChange={e => handleSearch(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') runSearch() }}
            />
            {search && (
              <button onClick={clearSearch}
                style={{ background: 'none', border: 'none', color: 'var(--ink3)', cursor: 'pointer', fontSize: 14 }}>
                ×
              </button>
            )}
          </div>
          <button className="btn gold" onClick={runSearch} style={{ height: 38, justifyContent: 'center' }}>
            Tìm kiếm
          </button>
          <button
            onClick={() => setShowAdvanced(v => !v)}
            className={showAdvanced ? 'btn gold' : 'btn'}
            style={{ height: 38, justifyContent: 'center' }}>
            Tìm kiếm nâng cao
          </button>
        </div>

        {/* Bộ lọc thời gian — mặc định Hôm nay để tối ưu load */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 12, alignItems: 'center', paddingTop: 12, borderTop: '1px solid var(--line)' }}>
          {DATE_TABS.map(t => {
            const active = dateTab === t.key
            return (
              <button key={t.key} onClick={() => handleDatePick(t.key)}
                style={{
                  padding: '5px 14px', borderRadius: 20, border: '1px solid var(--line)',
                  fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap',
                  background: active ? 'var(--grad-gold)' : 'var(--surface)',
                  color: active ? '#2a1d14' : 'var(--ink3)',
                  boxShadow: active ? '0 2px 8px rgba(160,113,79,.25)' : 'none',
                  transition: 'all .15s',
                }}>
                {t.label}
              </button>
            )
          })}
          {dateTab === 'range' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 4 }}>
              <button type="button" onClick={() => setRangePicker('from')}
                style={{ height: 32, border: '1px solid var(--line)', borderRadius: 8, padding: '0 10px', background: '#fff', color: 'var(--ink2)', fontSize: 12.5, cursor: 'pointer', fontFamily: 'var(--sans)' }}>
                {displayDate(fromDate)}
              </button>
              <span style={{ color: 'var(--ink3)' }}>→</span>
              <button type="button" onClick={() => setRangePicker('to')}
                style={{ height: 32, border: '1px solid var(--line)', borderRadius: 8, padding: '0 10px', background: '#fff', color: 'var(--ink2)', fontSize: 12.5, cursor: 'pointer', fontFamily: 'var(--sans)' }}>
                {displayDate(toDate)}
              </button>
            </div>
          )}
        </div>

        {showAdvanced && (
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(3, minmax(160px, 1fr)) 160px 160px',
            gap: 12, marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--line)',
          }}>
            <select value={statusTab} onChange={e => setStatusTab(e.target.value)} style={{ height: 36, border: '1px solid var(--line)', borderRadius: 8, padding: '0 10px', background: '#fff', color: 'var(--ink2)' }}>
              {STATUS_TABS.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
            </select>
            <select value={orderTypeFilter} onChange={e => setOrderTypeFilter(e.target.value)} style={{ height: 36, border: '1px solid var(--line)', borderRadius: 8, padding: '0 10px', background: '#fff', color: 'var(--ink2)' }}>
              <option value="all">Chọn loại đơn hàng...</option>
              <option value="service">Có dịch vụ</option>
              <option value="card_use">Sử dụng liệu trình</option>
              <option value="card_sale">Bán thẻ / combo</option>
              <option value="product">Có sản phẩm</option>
              <option value="debt">Có công nợ</option>
            </select>
            <button type="button" onClick={() => setRangePicker('from')} style={{ height: 36, border: '1px solid var(--line)', borderRadius: 8, padding: '0 10px', background: '#fff', color: 'var(--ink2)', textAlign: 'left', cursor: 'pointer', fontFamily: 'var(--sans)' }}>
              Từ {displayDate(fromDate)}
            </button>
            <button type="button" onClick={() => setRangePicker('to')} style={{ height: 36, border: '1px solid var(--line)', borderRadius: 8, padding: '0 10px', background: '#fff', color: 'var(--ink2)', textAlign: 'left', cursor: 'pointer', fontFamily: 'var(--sans)' }}>
              Đến {displayDate(toDate)}
            </button>
            <button className="btn gold" onClick={handleAdvancedSearch} style={{ height: 36, justifyContent: 'center' }}>Lọc</button>
            <button className="btn" onClick={resetAdvancedSearch} style={{ height: 36, justifyContent: 'center' }}>Khôi phục</button>
          </div>
        )}

        {!showAdvanced && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 12 }}>
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
        )}
      </div>

      {}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--ink3)' }}>Đang tải...</div>
      ) : filteredOrders.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '60px', color: 'var(--ink3)' }}>
          <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'center', color: 'var(--champagne)' }}>
            <I.FileText style={{ width: 40, height: 40 }} />
          </div>
          <div style={{ fontFamily: 'var(--serif)', fontSize: 16, marginBottom: 6 }}>
            {activeSearch.trim() ? 'Không tìm thấy đơn nào' : 'Chưa có đơn hàng'}
          </div>
          <div style={{ fontSize: 13 }}>
            {activeSearch.trim() ? 'Thử từ khóa khác' : 'Chưa có đơn hàng phù hợp với bộ lọc hiện tại'}
          </div>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="tbl" style={{ tableLayout: 'fixed', width: '100%' }}>
            <colgroup>
              <col style={{ width: '12%' }} />
              <col style={{ width: '12%' }} />
              <col style={{ width: '9%' }} />
              <col style={{ width: '13%' }} />
              <col style={{ width: '8%' }} />
              <col style={{ width: '7%' }} />
              <col style={{ width: '19%' }} />
              <col style={{ width: '13%' }} />
              <col style={{ width: '7%' }} />
            </colgroup>
            <thead>
              <tr>
                <th style={{ paddingLeft: 16 }}>Mã ĐH / Giờ</th>
                <th>Khách Hàng</th>
                <th>Trạng Thái</th>
                <th>NV / Tour / Hoa Hồng</th>
                <th className="amount">Đơn giá</th>
                <th className="amount">Giảm giá</th>
                <th className="amount">Tổng / Thu / Nợ</th>
                <th>Ghi chú</th>
                <th style={{ paddingRight: 16, textAlign: 'center' }}>Thao Tác</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map(o => {
                const st = STATUS_MAP[o.trang_thai] || STATUS_MAP.draft
                const { date: d, time: t } = fmtDateTime(o.created_at, o.ngay)
                const treatmentNote = treatmentOrderNote(o)
                const itemsPreview = orderItemsPreview(o)
                const hasLieuTrinh = treatmentNote || o.trang_thai_note?.includes('lieu_trinh')
                const orderTotal = o.tong_tien_hang || o.thanh_tien || 0
                const paidTotal = o.da_thu_tong ?? o.thuc_thu ?? 0
                const creatorName = o.nguoi_tao_ten || 'HSMS'
                const paymentText = (o.payments || []).length > 0
                  ? (o.payments || []).map(p => `${paymentMethodLabel(p.hinh_thuc)}: ${formatCurrency(p.so_tien)}`).join(' · ')
                  : 'Không thu tiền'

                return (
                  <tr
                    key={o.id}
                    onClick={() => setDetailOrder(o)}
                    title="Bấm để mở đầy đủ thông tin đơn hàng"
                    style={{ borderBottom: '1px solid var(--line)', cursor: 'pointer' }}
                  >
                    {}
                    <td style={{ paddingLeft: 16 }}>
                      <div style={{ fontWeight: 700, fontFamily: 'var(--serif)', fontSize: 13, color: 'var(--champagne)' }}>
                        {o.ma_don}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                        <span style={{ fontSize: 11, color: 'var(--ink3)' }}>{d} · {t}</span>
                      </div>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 5 }}>
                        {hasLieuTrinh && (
                          <span style={{
                            display: 'inline-block',
                            fontSize: 9.5, fontWeight: 800, padding: '1px 6px',
                            borderRadius: 4, background: 'rgba(201,169,110,.18)', color: '#8a6335',
                          }}>Liệu trình</span>
                        )}
                        {(o.items || []).length > 1 && (
                          <span style={{
                            display: 'inline-block',
                            fontSize: 9.5, fontWeight: 800, padding: '1px 6px',
                            borderRadius: 4, background: 'rgba(61,44,32,.08)', color: 'var(--ink3)',
                          }}>{(o.items || []).length} dòng</span>
                        )}
                      </div>
                    </td>

                    {}
                    <td>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>
                        {o.khach_hang?.ho_ten || (
                          <span style={{ color: 'var(--ink3)', fontStyle: 'italic', fontWeight: 400 }}>Khách lẻ</span>
                        )}
                      </div>
                      {o.khach_hang?.so_dien_thoai && (
                        <div style={{ fontSize: 11, color: 'var(--ink3)', marginTop: 1 }}>{o.khach_hang.so_dien_thoai}</div>
                      )}
                    </td>

                    {}
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

                    {}
                    <td>
                      {(o.staff_compensations || []).length > 0 ? (
                        <div style={{ display: 'grid', gap: 3 }}>
                          {(o.staff_compensations || []).map(s => (
                            <div key={s.id || s.name}>
                              <div style={{ fontSize: 12, color: 'var(--ink)', fontWeight: 650, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {s.short_name || shortStaffName(s.name)}
                              </div>
                              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 1 }}>
                                {(s.tour || 0) > 0 && (
                                  <span style={{ fontSize: 10.5, color: '#1A5276', fontWeight: 700 }}>
                                    Tour {formatCurrency(s.tour)}
                                  </span>
                                )}
                                {(s.hoaHong || 0) > 0 && (
                                  <span style={{ fontSize: 10.5, color: '#426a2c', fontWeight: 700 }}>
                                    Hoa Hồng {formatCurrency(s.hoaHong)}
                                  </span>
                                )}
                                {(s.tour || 0) === 0 && (s.hoaHong || 0) === 0 && (
                                  <span style={{ fontSize: 10.5, color: 'var(--ink3)' }}>Chưa có tiền</span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div style={{ fontSize: 12, color: 'var(--ink3)' }}>—</div>
                      )}
                    </td>

                    {}
                    <td className="amount">
                      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)' }}>{formatCurrency(o.don_gia_tong || orderTotal)}</div>
                    </td>

                    <td className="amount">
                      <div style={{ fontSize: 12, color: (o.giam_gia_tong || 0) > 0 ? '#C0392B' : 'var(--ink3)', fontWeight: (o.giam_gia_tong || 0) > 0 ? 700 : 500 }}>
                        {formatCurrency(o.giam_gia_tong || 0)}
                      </div>
                    </td>

                    <td className="amount">
                      <div style={{ fontSize: 10.5, color: 'var(--ink3)', marginBottom: 1 }}>
                        Tổng: {formatCurrency(orderTotal)}
                      </div>
                      <div style={{ fontFamily: 'var(--serif)', fontSize: 15, fontWeight: 700, color: '#426a2c' }}>
                        Thu: {formatCurrency(paidTotal || orderTotal)}
                      </div>
                      {(o.con_no || 0) > 0 && (
                        <div style={{ fontSize: 11, color: 'var(--chi)', fontWeight: 700, marginTop: 1 }}>
                          Công nợ: {formatCurrency(o.con_no)}
                        </div>
                      )}
                      <div style={{ fontSize: 10.5, color: 'var(--ink3)', marginTop: 2, lineHeight: 1.25 }}>{paymentText}</div>
                    </td>

                    <td style={{ overflow: 'hidden' }}>
                      <div style={{
                        fontSize: 11.5, color: 'var(--ink2)', lineHeight: 1.35,
                        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                      }}>
                        {treatmentNote || o.ghi_chu || itemsPreview || o.item_summary || '—'}
                      </div>
                      {(o.items || []).some(i => i.loai_item === 'the_moi') && (
                        <span style={{
                          display: 'inline-block', marginTop: 4,
                          fontSize: 9.5, fontWeight: 700, padding: '1px 6px',
                          borderRadius: 4, background: 'rgba(201,169,110,.16)', color: '#8a6335',
                        }}>Bán thẻ</span>
                      )}
                    </td>

                    {}
                    <td style={{ paddingRight: 12 }}>
                      <div style={{ display: 'flex', gap: 5, justifyContent: 'center' }}>
                        {}
                        <button
                          onClick={(e) => { e.stopPropagation(); setDetailOrder(o) }}
                          title="Xem chi tiết"
                          style={{
                            width: 28, height: 28, borderRadius: 6, border: 'none',
                            background: 'rgba(23,162,184,.12)', color: '#0c5460',
                            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>
                          <I.Info style={{ width: 13, height: 13 }} />
                        </button>

                        {}
                          {o.trang_thai === 'draft' && onResumeOrder && (
                          <button
                            onClick={(e) => { e.stopPropagation(); onResumeOrder(o) }}
                            title="Mở đơn & Thanh toán"
                            style={{
                              width: 28, height: 28, borderRadius: 6, border: 'none',
                              background: 'rgba(40,167,69,.12)', color: '#1a5e2e',
                              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                            <I.Edit style={{ width: 13, height: 13 }} />
                          </button>
                        )}

                        {}
                        <button
                          onClick={(e) => { e.stopPropagation(); handleQuickPrint(o) }}
                          disabled={printingId === o.id}
                          title="In hoá đơn"
                          style={{
                            width: 28, height: 28, borderRadius: 6, border: 'none',
                            background: 'rgba(52,131,208,.12)', color: '#1a5276',
                            cursor: printingId === o.id ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            opacity: printingId === o.id ? 0.5 : 1,
                          }}>
                          <I.FileText style={{ width: 13, height: 13 }} />
                        </button>

                        {}
                        {o.trang_thai !== 'huy' && (
                          <button
                            onClick={(e) => { e.stopPropagation(); setDetailOrder(o); setTimeout(() => {}, 0) }}
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
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 16px', borderTop: '1px solid var(--line)', background: '#fffdf9',
          }}>
            <div style={{ fontSize: 12, color: 'var(--ink3)' }}>
              Hiển thị {pageStart.toLocaleString('vi-VN')}-{pageEnd.toLocaleString('vi-VN')} / {totalOrders.toLocaleString('vi-VN')} đơn
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button
                className="btn"
                disabled={currentPage <= 1 || loading}
                onClick={() => load(Math.max(1, currentPage - 1))}
                style={{ height: 32, opacity: currentPage <= 1 ? .45 : 1 }}>
                <I.ArrowLeft style={{ width: 13, height: 13 }} /> Trang trước
              </button>
              <span style={{ fontSize: 12, color: 'var(--ink2)', fontWeight: 700, minWidth: 86, textAlign: 'center' }}>
                {currentPage} / {totalPages}
              </span>
              <button
                className="btn"
                disabled={currentPage >= totalPages || loading}
                onClick={() => load(Math.min(totalPages, currentPage + 1))}
                style={{ height: 32, opacity: currentPage >= totalPages ? .45 : 1 }}>
                Trang sau <I.ArrowLeft style={{ width: 13, height: 13, transform: 'rotate(180deg)' }} />
              </button>
            </div>
          </div>
        </div>
      )}

      {}
      <DatePicker
        open={showPicker}
        selectedDate={date}
        onClose={() => setShowPicker(false)}
        onConfirm={(iso) => { setDate(iso); setFromDate(iso); setToDate(iso); setDateTab('pick'); setShowPicker(false) }}
      />

      <DatePicker
        open={!!rangePicker}
        selectedDate={rangePicker === 'to' ? toDate : fromDate}
        onClose={() => setRangePicker(null)}
        onConfirm={(iso) => {
          if (rangePicker === 'from') {
            setFromDate(iso)
            if (iso > toDate) setToDate(iso)
          } else {
            setToDate(iso)
            if (iso < fromDate) setFromDate(iso)
          }
          setRangePicker(null)
        }}
      />

      {}
      {detailOrder && (
        <OrderDetailPanel
          order={detailOrder}
          onClose={() => setDetailOrder(null)}
          onVoid={handleVoid}
          canVoid={isAdmin || detailOrder.ngay === todayISO()}
          onEdit={(o) => { setDetailOrder(null); onResumeOrder?.(o); window.location.href = '/pos?resume=' + o.id }}
        />
      )}
    </div>
  )
}
