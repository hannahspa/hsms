import { useState, useEffect } from 'react'
import { posService } from '../../services/posService'
import { formatCurrency } from '../../lib/utils'
import { printReceipt } from '../../lib/printReceipt'
import {
  STATUS_MAP, fmtDateTime, orderItemName, itemStaffName, itemIncomeInfo,
  itemTypeLabel, shortStaffName, historyTypeLabel, ledgerStatusLabel, paymentMethodLabel,
} from './orderHistoryUtils'

// Panel chi tiết đơn — tách từ PosOrderHistory.jsx (Phase 2). Không đổi logic.
const PTTT_OPTIONS = [
  { value: 'tien_mat', label: 'Tiền Mặt' },
  { value: 'chuyen_khoan', label: 'Chuyển Khoản' },
  { value: 'quet_the', label: 'Quẹt Thẻ' },
  { value: 'the_tra_truoc', label: 'Thẻ Trả Trước' },
]

export default function OrderDetailPanel({ order, onClose, onVoid, onEdit, canVoid = true, isAdmin = false }) {
  const [detail, setDetail] = useState({ items: [], payments: [], ledger: [], customerSnapshot: null })
  const [loading, setLoading] = useState(true)
  const [savingPttt, setSavingPttt] = useState(null)   // id payment đang đổi PTTT

  const reloadDetail = () => {
    setLoading(true)
    return Promise.all([
      posService.getLineItems(order.id),
      posService.getPayments(order.id),
      posService.getOrderStaffLedger(order.id),
      posService.getCustomerSnapshot(order.khach_hang_id),
    ]).then(([items, payments, ledger, customerSnapshot]) => setDetail({ items, payments, ledger, customerSnapshot }))
      .catch(() => setDetail({ items: [], payments: [], ledger: [], customerSnapshot: null }))
      .finally(() => setLoading(false))
  }

  useEffect(() => { reloadDetail() }, [order.id, order.khach_hang_id])

  const handleChangePttt = async (payment, newHinhThuc) => {
    if (!newHinhThuc || newHinhThuc === payment.hinh_thuc) return
    setSavingPttt(payment.id)
    try {
      await posService.updatePaymentMethod(payment.id, newHinhThuc)
      await reloadDetail()
    } catch (e) {
      alert('Lỗi đổi hình thức thanh toán: ' + e.message)
    } finally {
      setSavingPttt(null)
    }
  }

  const st = STATUS_MAP[order.trang_thai] || STATUS_MAP.draft
  const { date, time } = fmtDateTime(order.created_at, order.ngay)
  const orderTotal = order.tong_tien_hang || order.thanh_tien || 0
  const snap = detail.customerSnapshot
  const customer = snap?.customer || order.khach_hang
  const boughtCards = detail.items.filter(i => i.loai_item === 'the_moi')
  const usedCards = detail.items.filter(i => i.loai_item === 'the_lieu_trinh')
  const productItems = detail.items.filter(i => i.loai_item === 'san_pham')
  const serviceItems = detail.items.filter(i => i.loai_item === 'dich_vu')

  const handlePrint = () => {
    printReceipt({
      order,
      items: detail.items.map(it => ({
        ten: orderItemName(it),
        so_luong: it.so_luong,
        don_gia: it.don_gia,
        thanh_tien: it.thanh_tien,
        staffName: itemStaffName(it),
      })),
      payments: detail.payments,
      customer,
      thuNgan: order.nguoi_tao_ten || '',
    })
  }

  return (
    <>
      <style>{`@keyframes slideInRight { from { transform: translateX(100%) } to { transform: translateX(0) } }`}</style>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.32)', zIndex: 490 }} />
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: 'min(780px, 96vw)',
        background: '#fff', zIndex: 491, display: 'flex', flexDirection: 'column',
        boxShadow: '-6px 0 40px rgba(0,0,0,.22)', animation: 'slideInRight .22s ease',
      }}>

        {}
        <div style={{ background: '#fff', flexShrink: 0, borderBottom: '1px solid var(--line)' }}>
          <div style={{ padding: '14px 20px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: 15, fontWeight: 800, fontFamily: 'var(--serif)', color: 'var(--ink)' }}>
              Thông tin đơn hàng
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                background: st.bg, color: st.color,
              }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: st.dot, flexShrink: 0 }} />
                {st.label}
              </span>
              <button onClick={onClose} style={{ background: 'var(--bg)', border: '1px solid var(--line)', width: 28, height: 28, borderRadius: 8, cursor: 'pointer', color: 'var(--ink2)', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
            </div>
          </div>
        </div>

        {}
        <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--line)', flexShrink: 0, background: '#fafaf9' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--champagne)', fontFamily: 'var(--serif)' }}>
                {customer?.ho_ten || <span style={{ fontStyle: 'italic', color: 'var(--ink3)', fontWeight: 400 }}>Khách lẻ</span>}
              </div>
              {customer?.so_dien_thoai && (
                <div style={{ fontSize: 12, color: 'var(--ink3)', marginTop: 2 }}>{customer.so_dien_thoai}</div>
              )}
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', fontFamily: 'var(--serif)' }}>{order.ma_don}</div>
              <div style={{ fontSize: 11, color: 'var(--ink3)', marginTop: 1 }}>{date} · {time}</div>
            </div>
          </div>
        </div>

        {}
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>

          {}
          <div style={{ display: 'flex', padding: '7px 20px', background: '#f0ebe4', fontSize: 10, fontWeight: 700, color: 'var(--ink3)', letterSpacing: '.06em', textTransform: 'uppercase', gap: 4 }}>
            <span style={{ flex: 1 }}>DV / SP</span>
            <span style={{ width: 30, textAlign: 'center' }}>SL</span>
            <span style={{ width: 70, textAlign: 'right' }}>Giảm giá</span>
            <span style={{ width: 90, textAlign: 'right' }}>Thành tiền</span>
          </div>

          {}
          <div style={{ padding: '0 20px', borderBottom: '1px solid var(--line)' }}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '24px', color: 'var(--ink3)', fontSize: 13 }}>Đang tải...</div>
            ) : detail.items.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px', color: 'var(--ink3)', fontSize: 13 }}>Không có dịch vụ</div>
            ) : detail.items.map(item => {
              const ten = orderItemName(item)
              const discAmt = Math.max(0, (item.don_gia || 0) * (item.so_luong || 1) - (item.thanh_tien || 0))
              const staffName = itemStaffName(item)
              const income = itemIncomeInfo(item)
              const typeLabel = itemTypeLabel(item)
              return (
                <div key={item.id} style={{ padding: '8px 0', borderBottom: '1px solid var(--line)' }}>
                  <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                    <div style={{ flex: 1, fontSize: 12.5, fontWeight: 600, color: 'var(--ink)', lineHeight: 1.3 }}>
                      <span style={{
                        display: 'inline-flex', marginRight: 6, marginBottom: 2,
                        padding: '1px 6px', borderRadius: 4, fontSize: 9.5,
                        fontWeight: 800, color: '#8a6335', background: 'rgba(201,169,110,.14)',
                      }}>
                        {typeLabel}
                      </span>
                      {ten}
                    </div>
                    <div style={{ width: 30, textAlign: 'center', fontSize: 12, color: 'var(--ink3)' }}>{item.so_luong}</div>
                    <div style={{ width: 70, textAlign: 'right', fontSize: 12, color: discAmt > 0 ? '#C0392B' : 'var(--ink3)' }}>
                      {discAmt > 0 ? formatCurrency(discAmt) : '0'}
                    </div>
                    <div style={{ width: 90, textAlign: 'right', fontSize: 13, fontWeight: 700, fontFamily: 'var(--serif)', color: 'var(--ink)' }}>
                      {formatCurrency(item.thanh_tien || 0)}
                    </div>
                  </div>
                  {}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3, paddingLeft: 2 }}>
                    <span style={{ fontSize: 10.5, color: 'var(--ink3)' }}>{formatCurrency(item.don_gia || 0)}</span>
                    <span style={{ fontSize: 10, color: 'var(--ink3)' }}>·</span>
                    {staffName ? (
                      <>
                        {item.nhan_vien?.avatar_url && (
                          <img src={item.nhan_vien.avatar_url} alt={staffName}
                            style={{ width: 26, height: 26, borderRadius: '50%', objectFit: 'cover', border: '1px solid rgba(160,113,79,.3)', flexShrink: 0 }} />
                        )}
                        <span style={{ fontSize: 12, color: 'var(--champagne)', fontWeight: 700 }}>{shortStaffName(staffName)}</span>
                        {(income.amount || 0) > 0 && (
                          <span style={{ fontSize: 11, color: '#2D7A4F', fontWeight: 700 }}>
                            {income.label}: {formatCurrency(income.amount)}
                          </span>
                        )}
                      </>
                    ) : (
                      <span style={{ fontSize: 10.5, color: 'var(--ink3)', fontStyle: 'italic' }}>
                        {item.meta?.myspaStaffStatus === 'chua_co_ten' ? 'Chưa có tên NV từ MySpa' : 'Không rõ KTV'}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {!loading && customer && (
            <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--line)', background: '#fffdf9' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 9 }}>
                <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: '.08em' }}>
                  Hồ sơ CRM khách hàng
                </div>
                <button
                  onClick={() => { window.location.href = '/admin/crm' }}
                  style={{ border: 'none', background: 'transparent', color: 'var(--champagne)', fontSize: 11, fontWeight: 800, cursor: 'pointer' }}>
                  Mở CRM
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginBottom: 10 }}>
                {[
                  { l: 'Tổng chi', v: formatCurrency(customer.tong_chi_tieu || 0), c: '#2D7A4F' },
                  { l: 'Lượt đến', v: customer.so_lan_den || 0, c: 'var(--ink)' },
                  { l: 'Thẻ còn', v: snap?.activeCards?.length || 0, c: 'var(--champagne)' },
                  { l: 'Công nợ', v: formatCurrency(snap?.debtBalance || 0), c: (snap?.debtBalance || 0) > 0 ? '#C0392B' : 'var(--ink)' },
                ].map(x => (
                  <div key={x.l} style={{ border: '1px solid var(--line)', borderRadius: 8, padding: '8px 9px', background: '#fff' }}>
                    <div style={{ fontSize: 9.5, color: 'var(--ink3)', textTransform: 'uppercase', fontWeight: 800 }}>{x.l}</div>
                    <div style={{ fontSize: 13, color: x.c, fontWeight: 800, fontFamily: 'var(--serif)', marginTop: 2 }}>{x.v}</div>
                  </div>
                ))}
              </div>

              {snap?.cards?.length > 0 && (
                <div style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 10.5, fontWeight: 800, color: 'var(--ink2)', marginBottom: 5 }}>Thẻ liệu trình của khách</div>
                  <div style={{ display: 'grid', gap: 5 }}>
                    {snap.cards.slice(0, 3).map(card => (
                      <div key={card.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 11.5, border: '1px solid var(--line)', borderRadius: 7, padding: '6px 8px', background: '#fafaf9' }}>
                        <span style={{ color: 'var(--ink)', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{card.ten_dich_vu}</span>
                        <span style={{ color: card.trang_thai === 'active' ? '#2D7A4F' : 'var(--ink3)', fontWeight: 800, flexShrink: 0 }}>
                          {card.so_buoi_con_lai}/{card.so_buoi_tong} buổi
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {snap?.history?.length > 0 && (
                <div>
                  <div style={{ fontSize: 10.5, fontWeight: 800, color: 'var(--ink2)', marginBottom: 5 }}>Lịch sử gần nhất</div>
                  <div style={{ display: 'grid', gap: 5 }}>
                    {snap.history.slice(0, 4).map((h, idx) => (
                      <div key={`${h.don_hang_chi_tiet_id || h.ma_don}-${idx}`} style={{ display: 'grid', gridTemplateColumns: '72px 1fr auto', gap: 8, alignItems: 'center', fontSize: 11.5 }}>
                        <span style={{ color: 'var(--ink3)' }}>{h.ngay?.split('-').reverse().join('/')}</span>
                        <span style={{ color: 'var(--ink)', fontWeight: 650, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.ten_dich_vu}</span>
                        <span style={{ color: h.loai_lich_su === 'dung_the_lieu_trinh' ? '#2D7A4F' : 'var(--champagne)', fontWeight: 800 }}>
                          {historyTypeLabel(h.loai_lich_su)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {!loading && (
            <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--line)', background: '#fafaf9' }}>
              <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 8 }}>
                Luồng dữ liệu phát sinh từ đơn này
              </div>
              <div style={{ display: 'grid', gap: 7 }}>
                {[
                  { ok: !!customer, l: 'CRM khách hàng', v: customer ? `${customer.ho_ten || 'Khách'} · ${serviceItems.length + usedCards.length} dịch vụ ghi nhận` : 'Khách lẻ, không ghi hồ sơ CRM' },
                  { ok: boughtCards.length > 0 || usedCards.length > 0, l: 'Thẻ liệu trình', v: boughtCards.length > 0 ? `Bán mới ${boughtCards.length} thẻ` : usedCards.length > 0 ? `Dùng ${usedCards.length} buổi/thẻ` : 'Không phát sinh thẻ' },
                  { ok: productItems.length > 0, l: 'Kho hàng', v: productItems.length > 0 ? `Xuất ${productItems.length} dòng sản phẩm` : 'Không xuất kho sản phẩm' },
                  { ok: detail.ledger.length > 0, l: 'Tour / Hoa hồng', v: detail.ledger.length > 0 ? `${detail.ledger.length} khoản thu nhập nhân viên` : 'Chưa có phát sinh nhân viên' },
                ].map(x => (
                  <div key={x.l} style={{ display: 'grid', gridTemplateColumns: '18px 112px 1fr', gap: 8, alignItems: 'center', fontSize: 12 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: x.ok ? '#2D7A4F' : '#B8A898', justifySelf: 'center' }} />
                    <span style={{ color: 'var(--ink2)', fontWeight: 800 }}>{x.l}</span>
                    <span style={{ color: 'var(--ink)', fontWeight: 600 }}>{x.v}</span>
                  </div>
                ))}
              </div>

              {detail.ledger.length > 0 && (
                <div style={{ marginTop: 10, display: 'grid', gap: 5 }}>
                  {detail.ledger.map(row => (
                    <div key={row.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, border: '1px solid var(--line)', background: '#fff', borderRadius: 7, padding: '6px 8px', fontSize: 11.5 }}>
                      <span style={{ color: 'var(--ink)', fontWeight: 700 }}>
                        {shortStaffName(row.nhan_vien?.ho_ten || 'Nhân viên')} · {row.loai === 'hoa_hong' ? 'Hoa Hồng' : 'Tour'}
                      </span>
                      <span style={{ color: '#2D7A4F', fontWeight: 800 }}>{formatCurrency(row.so_tien || 0)}</span>
                      <span style={{ color: 'var(--ink3)', fontWeight: 700 }}>{ledgerStatusLabel(row.trang_thai)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {}
          <div style={{ padding: '12px 20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 13 }}>
              <span style={{ color: 'var(--ink3)' }}>Tổng đơn</span>
              <span style={{ fontWeight: 700, fontFamily: 'var(--serif)' }}>{formatCurrency(orderTotal)}</span>
            </div>
            {(order.giam_gia || 0) > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 13 }}>
                <span style={{ color: 'var(--ink3)' }}>Giảm giá</span>
                <span style={{ fontWeight: 700, color: '#C0392B' }}>−{formatCurrency(order.giam_gia)}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderTop: '1px solid var(--line)', marginTop: 4 }}>
              <span style={{ fontSize: 15, fontWeight: 700, fontFamily: 'var(--serif)', color: 'var(--ink)' }}>Tổng cộng</span>
              <span style={{ fontSize: 18, fontWeight: 800, fontFamily: 'var(--serif)', color: '#2D7A4F' }}>
                {formatCurrency(order.thuc_thu || orderTotal)}
              </span>
            </div>
            {(order.con_no || 0) > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginTop: 2 }}>
                <span style={{ color: 'var(--ink3)' }}>Còn nợ</span>
                <span style={{ fontWeight: 700, color: '#C0392B' }}>{formatCurrency(order.con_no)}</span>
              </div>
            )}

            {!loading && detail.payments.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 7 }}>Đã thanh toán</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {detail.payments.map(p => (
                    <div key={p.id} style={{ padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--ink2)', display: 'flex', alignItems: 'center', gap: 6 }}>
                      {isAdmin && order.trang_thai !== 'huy' ? (
                        <select
                          value={p.hinh_thuc}
                          disabled={savingPttt === p.id}
                          onChange={e => handleChangePttt(p, e.target.value)}
                          title="Đổi hình thức thanh toán (đồng bộ doanh thu)"
                          style={{ border: '1px solid var(--bord)', borderRadius: 12, padding: '2px 6px', fontSize: 11.5, fontWeight: 700, color: 'var(--ink2)', background: '#fff', cursor: 'pointer', fontFamily: 'var(--sans)', outline: 'none' }}>
                          {PTTT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                      ) : (
                        <span>{paymentMethodLabel(p.hinh_thuc)}</span>
                      )}
                      <span style={{ fontWeight: 700, color: 'var(--ink)' }}>{formatCurrency(p.so_tien)}</span>
                      {savingPttt === p.id && <span style={{ fontSize: 10, color: 'var(--ink3)' }}>…</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {}
        <div style={{ padding: '12px 20px', borderTop: '1px solid var(--line)', flexShrink: 0, display: 'flex', gap: 8, background: '#fafaf9' }}>
          {order.trang_thai !== 'huy' && canVoid && (
            <button onClick={onVoid} style={{ padding: '0 14px', height: 40, border: '1px solid rgba(192,57,43,.35)', borderRadius: 8, background: 'rgba(192,57,43,.06)', color: '#C0392B', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--sans)' }}>
              Hủy đơn
            </button>
          )}
          {order.trang_thai !== 'huy' && !canVoid && (
            <span style={{ padding: '0 12px', height: 40, display: 'inline-flex', alignItems: 'center', fontSize: 11, color: 'var(--ink3)', fontStyle: 'italic' }}>
              Đơn cũ · liên hệ Admin hủy
            </span>
          )}
          <div style={{ flex: 1 }} />
          <button onClick={handlePrint} disabled={loading} style={{ padding: '0 16px', height: 40, border: '1px solid var(--bord)', borderRadius: 8, background: '#fff', color: 'var(--ink2)', fontSize: 12.5, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'var(--sans)', display: 'inline-flex', alignItems: 'center', gap: 6, opacity: loading ? 0.6 : 1 }}>
            🖨 In hóa đơn
          </button>
          <button onClick={onClose} style={{ padding: '0 16px', height: 40, border: '1px solid var(--line)', borderRadius: 8, background: '#fff', color: 'var(--ink2)', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--sans)' }}>
            Đóng
          </button>
          {order.trang_thai === 'draft' && (
            <button onClick={() => { onClose(); onEdit?.(order) }} style={{ padding: '0 16px', height: 40, border: 'none', borderRadius: 8, background: 'var(--grad, var(--champagne))', color: '#2a1d14', fontSize: 12.5, fontWeight: 800, cursor: 'pointer', fontFamily: 'var(--sans)' }}>
              Mở & Thanh toán
            </button>
          )}
        </div>
      </div>
    </>
  )
}
