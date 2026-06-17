import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { posService } from '../../services/posService'
import { formatCurrency } from '../../lib/utils'
import { notify, confirmDialog } from '../../components/ui/notify'
import { printReceipt } from '../../lib/printReceipt'
import DatePicker from '../../components/shared/DatePicker'
import {
  STATUS_MAP, fmtDateTime, orderItemName, itemStaffName, itemIncomeInfo,
  itemTypeLabel, shortStaffName, historyTypeLabel, ledgerStatusLabel, paymentMethodLabel,
} from './orderHistoryUtils'

// Panel chi tiết đơn — tách từ PosOrderHistory.jsx (Phase 2).
const PTTT_OPTIONS = [
  { value: 'tien_mat', label: 'Tiền Mặt' },
  { value: 'chuyen_khoan', label: 'Chuyển Khoản' },
  { value: 'quet_the', label: 'Quẹt Thẻ' },
  { value: 'the_tra_truoc', label: 'Thẻ Trả Trước' },
]

export default function OrderDetailPanel({ order, onClose, onVoid, onEdit, onDeleted, canVoid = true, isAdmin = false }) {
  const [detail, setDetail] = useState({ items: [], payments: [], ledger: [], customerSnapshot: null })
  const [loading, setLoading] = useState(true)
  const [savingPttt, setSavingPttt] = useState(null)   // id payment đang đổi PTTT
  const [busy, setBusy] = useState(false)

  // Admin: sửa ngày + giờ tạo đơn ngay trên panel
  const [editingDT, setEditingDT] = useState(false)
  const [showDate, setShowDate] = useState(false)
  const [dNgay, setDNgay] = useState('')
  const [dGio, setDGio] = useState('')
  const [savingDT, setSavingDT] = useState(false)

  // Admin: mở đơn để SỬA — KHÔNG đảo ngược ngay (giữ nguyên đơn gốc).
  // Việc hoàn thẻ/kho/doanh thu + ghi lại CHỈ chạy khi admin bấm "Cập Nhật Đơn".
  // → Thoát giữa chừng = đơn gốc nguyên trạng; không còn chồng chéo / nhân đôi.
  const handleReopen = async () => {
    if (!(await confirmDialog({ title: 'Mở đơn để sửa', message: 'Mở đơn này để sửa?', note: 'Đơn gốc được GIỮ NGUYÊN cho tới khi bấm "Cập Nhật Đơn". Thoát mà chưa cập nhật thì đơn không thay đổi.', confirmLabel: 'Mở sửa' }))) return
    onClose()
    onEdit?.(order)   // → /pos?resume=order.id&mode=edit (sửa local, an toàn)
  }

  // Admin: xóa vĩnh viễn đơn đã hủy
  const handleHardDelete = async () => {
    if (!(await confirmDialog({ title: 'Xoá vĩnh viễn đơn', message: 'Xóa VĨNH VIỄN đơn đã hủy này?', note: 'Thao tác KHÔNG thể hoàn tác.', danger: true, confirmLabel: 'Xoá vĩnh viễn' }))) return
    setBusy(true)
    try {
      await posService.hardDeleteOrder(order.id)
      onClose()
      onDeleted?.()
    } catch (e) { notify('Lỗi xóa đơn: ' + e.message, 'error'); setBusy(false) }
  }

  // Admin: khôi phục đơn đã hủy (dựng lại thẻ/kho/doanh thu)
  const handleRestore = async () => {
    if (!(await confirmDialog({ title: 'Khôi phục đơn', message: 'Khôi phục đơn này?', note: 'Thẻ liệu trình, kho, doanh thu, hoa hồng của đơn sẽ được dựng lại như lúc chốt.', confirmLabel: 'Khôi phục' }))) return
    setBusy(true)
    try {
      await posService.restoreOrder(order.id)
      onClose()
      onDeleted?.()   // reload danh sách
    } catch (e) { notify('Lỗi khôi phục đơn: ' + e.message, 'error'); setBusy(false) }
  }

  const handleSaveDateTime = async () => {
    if (!dNgay) return
    setSavingDT(true)
    try {
      const hhmm = (dGio || '00:00').slice(0, 5)
      const createdAtISO = new Date(`${dNgay}T${hhmm}:00+07:00`).toISOString()
      await posService.updateOrderDateTime(order.id, dNgay, createdAtISO)
      order.ngay = dNgay
      order.created_at = createdAtISO
      setEditingDT(false)
      onDeleted?.()   // làm mới danh sách để hiện ngày mới
    } catch (e) { notify('Lỗi đổi ngày giờ: ' + e.message, 'error') }
    finally { setSavingDT(false) }
  }

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
      notify('Lỗi đổi hình thức thanh toán: ' + e.message, 'error')
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
  // Dòng "đồng tư vấn thẻ" (KTV thứ 2) chỉ để ghi hoa hồng — ẩn khỏi danh sách hàng & hoá đơn
  const productItems = detail.items.filter(i => i.loai_item === 'san_pham' && !i.meta?.dongTuVanThe)
  const serviceItems = detail.items.filter(i => i.loai_item === 'dich_vu')
  const totalPaid = detail.payments.reduce((s, p) => s + (p.so_tien || 0), 0)
  const twoCol = typeof window !== 'undefined' && window.innerWidth >= 980

  const handlePrint = () => {
    printReceipt({
      order,
      items: detail.items.filter(it => !it.meta?.dongTuVanThe).map(it => ({
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

  // ── Khối: bảng dịch vụ / sản phẩm ──────────────────────────────
  const itemsBlock = (
    <>
      <div style={{ display: 'flex', padding: '7px 20px', background: '#f0ebe4', fontSize: 10, fontWeight: 700, color: 'var(--ink3)', letterSpacing: '.06em', textTransform: 'uppercase', gap: 4 }}>
        <span style={{ flex: 1 }}>DV / SP · KTV · Tour/HH</span>
        <span style={{ width: 30, textAlign: 'center' }}>SL</span>
        <span style={{ width: 76, textAlign: 'right' }}>Giảm giá</span>
        <span style={{ width: 96, textAlign: 'right' }}>Thành tiền</span>
      </div>
      <div style={{ padding: '0 20px' }}>
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
          // Chi tiết bán thẻ liệu trình (lấy từ meta) — hiện đầy đủ như màn bán hàng
          const meta = item.meta || {}
          const isCardSale = item.loai_item === 'the_moi'
          const kmPct = Math.round(Number(meta.kmRefPct || meta.phanTramGiam || 0))
          const giaBanBuoi = Number(meta.giaBanBuoi || meta.giaGocBuoi || item.don_gia || 0)
          const giaGocBuoi = Number(meta.giaGocBuoi || item.don_gia || 0)
          const soBuoiMua = Number(meta.soBuoiMua || item.so_luong || 0)
          const soBuoiTang = Number(meta.soBuoiTang || 0)
          const cardThanhTien = Number(meta.giaTriThe || giaBanBuoi * soBuoiMua || item.thanh_tien || 0)
          const tiLeKtv = Number(meta.tiLeCommKtv || 0)
          const tiLeLt = Number(meta.tiLeCommLt || 0)
          return (
            <div key={item.id} style={{ padding: '9px 0', borderBottom: '1px solid var(--line)' }}>
              <div style={{ display: 'flex', gap: 4, alignItems: 'flex-start' }}>
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
                <div style={{ width: 76, textAlign: 'right', fontSize: 12, color: discAmt > 0 ? '#C0392B' : 'var(--ink3)' }}>
                  {discAmt > 0 ? formatCurrency(discAmt) : '0'}
                </div>
                <div style={{ width: 96, textAlign: 'right', fontSize: 13, fontWeight: 700, fontFamily: 'var(--serif)', color: 'var(--ink)' }}>
                  {formatCurrency(item.thanh_tien || 0)}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, paddingLeft: 2 }}>
                <span style={{ fontSize: 10.5, color: 'var(--ink3)' }}>Đơn giá {formatCurrency(item.don_gia || 0)}</span>
                <span style={{ fontSize: 10, color: 'var(--ink3)' }}>·</span>
                {staffName ? (
                  <>
                    {item.nhan_vien?.avatar_url && (
                      <img src={item.nhan_vien.avatar_url} alt={staffName}
                        style={{ width: 24, height: 24, borderRadius: '50%', objectFit: 'cover', border: '1px solid rgba(160,113,79,.3)', flexShrink: 0 }} />
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

              {/* Chi tiết BÁN THẺ — đầy đủ như màn bán hàng: giá gốc, KM%, buổi mua/tặng, hết hạn */}
              {isCardSale && (
                <div style={{ marginTop: 7, padding: '9px 11px', background: 'rgba(201,169,110,.08)', border: '1px solid rgba(201,169,110,.28)', borderRadius: 9, fontSize: 11.5, color: 'var(--ink2)', lineHeight: 1.7 }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '2px 16px' }}>
                    <span>Giá bán/buổi:&nbsp;
                      <b style={{ color: 'var(--champagne)', fontFamily: 'var(--serif)' }}>{formatCurrency(giaBanBuoi)}</b>
                      {kmPct > 0 && giaGocBuoi > giaBanBuoi && (
                        <span style={{ textDecoration: 'line-through', color: 'var(--ink3)', marginLeft: 6 }}>{formatCurrency(giaGocBuoi)}</span>
                      )}
                    </span>
                    <span>Số buổi:&nbsp;<b style={{ color: 'var(--ink)' }}>{soBuoiMua}</b>{soBuoiTang > 0 && <> + tặng <b style={{ color: '#2D7A4F' }}>{soBuoiTang}</b></>}</span>
                    {kmPct > 0 && (
                      <span style={{ fontWeight: 800, color: kmPct >= 50 ? '#C0392B' : kmPct >= 30 ? '#E67E22' : '#27AE60' }}>KM {kmPct}%</span>
                    )}
                  </div>
                  <div style={{ color: 'var(--ink3)' }}>
                    {formatCurrency(giaBanBuoi)} × {soBuoiMua} buổi{soBuoiTang > 0 ? ` (+${soBuoiTang} tặng)` : ''} =&nbsp;
                    <b style={{ color: 'var(--ink)' }}>{formatCurrency(cardThanhTien)}</b>
                  </div>
                  <div>
                    Ngày hết hạn:&nbsp;
                    <b style={{ color: meta.ngayHetHan ? 'var(--ink)' : 'var(--ink3)' }}>
                      {meta.ngayHetHan ? String(meta.ngayHetHan).split('-').reverse().join('/') : 'Không giới hạn ∞'}
                    </b>
                  </div>
                  {(tiLeKtv > 0 || tiLeLt > 0) && (
                    <div style={{ color: 'var(--ink3)' }}>
                      Hoa hồng: <b style={{ color: '#426a2c' }}>KTV {tiLeKtv}%</b>
                      {tiLeLt > 0 && <> · <b style={{ color: '#426a2c' }}>Lễ tân {tiLeLt}%</b></>}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </>
  )

  // ── Khối: ghi chú ──────────────────────────────────────────────
  const noteBlock = (order.ghi_chu || order.ghi_chu_don) && (
    <div style={{ padding: '10px 20px', borderTop: '1px solid var(--line)', background: '#fffdf9' }}>
      <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 4 }}>Ghi chú đơn</div>
      <div style={{ fontSize: 12.5, color: 'var(--ink)', lineHeight: 1.45, whiteSpace: 'pre-wrap' }}>{order.ghi_chu || order.ghi_chu_don}</div>
    </div>
  )

  // ── Khối: tổng tiền + thanh toán ───────────────────────────────
  const totalsBlock = (
    <div style={{ padding: '13px 20px', borderTop: '1px solid var(--line)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 13 }}>
        <span style={{ color: 'var(--ink3)' }}>Tổng tiền hàng</span>
        <span style={{ fontWeight: 700, fontFamily: 'var(--serif)' }}>{formatCurrency(orderTotal)}</span>
      </div>
      {(order.giam_gia || 0) > 0 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 13 }}>
          <span style={{ color: 'var(--ink3)' }}>Giảm giá</span>
          <span style={{ fontWeight: 700, color: '#C0392B' }}>−{formatCurrency(order.giam_gia)}</span>
        </div>
      )}
      {(order.vat || 0) > 0 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 13 }}>
          <span style={{ color: 'var(--ink3)' }}>VAT</span>
          <span style={{ fontWeight: 700 }}>+{formatCurrency(order.vat)}</span>
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

      <div style={{ marginTop: 13 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 7 }}>
          <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: '.08em' }}>Phương thức thanh toán</span>
          {detail.payments.length > 0 && (
            <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--ink2)' }}>Đã trả {formatCurrency(totalPaid)}</span>
          )}
        </div>
        {loading ? null : detail.payments.length === 0 ? (
          <div style={{ fontSize: 12, color: order.trang_thai === 'draft' ? '#996a00' : 'var(--ink3)', fontStyle: 'italic' }}>
            {order.trang_thai === 'draft' ? 'Chưa thanh toán' : 'Không có dữ liệu thanh toán'}
          </div>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {detail.payments.map(p => (
              <div key={p.id} style={{ padding: '5px 12px', borderRadius: 10, fontSize: 12, fontWeight: 600, background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--ink2)', display: 'flex', alignItems: 'center', gap: 7 }}>
                {isAdmin && order.trang_thai !== 'huy' ? (
                  <select
                    value={p.hinh_thuc}
                    disabled={savingPttt === p.id}
                    onChange={e => handleChangePttt(p, e.target.value)}
                    title="Đổi hình thức thanh toán (đồng bộ doanh thu)"
                    style={{ border: '1px solid var(--bord)', borderRadius: 8, padding: '2px 6px', fontSize: 11.5, fontWeight: 700, color: 'var(--ink2)', background: '#fff', cursor: 'pointer', fontFamily: 'var(--sans)', outline: 'none' }}>
                    {PTTT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                ) : (
                  <span>{paymentMethodLabel(p.hinh_thuc)}</span>
                )}
                <span style={{ fontWeight: 800, color: 'var(--ink)', fontFamily: 'var(--serif)' }}>{formatCurrency(p.so_tien)}</span>
                {savingPttt === p.id && <span style={{ fontSize: 10, color: 'var(--ink3)' }}>…</span>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )

  // ── Khối: hồ sơ CRM khách ──────────────────────────────────────
  const crmBlock = !loading && customer && (
    <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--line)' }}>
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

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 8, marginBottom: 10 }}>
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
            {snap.cards.slice(0, 4).map(card => (
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
  )

  // ── Khối: luồng dữ liệu phát sinh ──────────────────────────────
  const flowBlock = !loading && (
    <div style={{ padding: '12px 20px' }}>
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
  )

  return createPortal(
    <>
      <style>{`@keyframes slideInRight { from { transform: translateX(100%) } to { transform: translateX(0) } }`}</style>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.32)', zIndex: 490 }} />
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: 'min(1040px, calc(100vw - 256px))',
        background: '#fff', zIndex: 491, display: 'flex', flexDirection: 'column',
        boxShadow: '-6px 0 40px rgba(0,0,0,.22)', animation: 'slideInRight .22s ease',
      }}>

        {/* Header tiêu đề + trạng thái */}
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

        {/* Header khách hàng + mã đơn + ngày giờ (sửa được) */}
        <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--line)', flexShrink: 0, background: '#fafaf9' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
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
              {editingDT ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 5, justifyContent: 'flex-end', position: 'relative' }}>
                  <button onClick={() => setShowDate(true)}
                    style={{ border: '1px solid var(--bord)', borderRadius: 7, padding: '4px 9px', background: '#fff', fontSize: 12, fontWeight: 700, color: 'var(--ink)', cursor: 'pointer', fontFamily: 'var(--sans)' }}>
                    📅 {dNgay ? dNgay.split('-').reverse().join('/') : 'Chọn ngày'}
                  </button>
                  <input value={dGio} onChange={e => setDGio(e.target.value)} placeholder="HH:MM" maxLength={5}
                    style={{ width: 58, border: '1px solid var(--bord)', borderRadius: 7, padding: '4px 6px', fontSize: 12, fontWeight: 700, color: 'var(--ink)', textAlign: 'center', fontFamily: 'var(--sans)', outline: 'none' }} />
                  <button onClick={handleSaveDateTime} disabled={savingDT}
                    style={{ border: 'none', borderRadius: 7, width: 30, height: 28, background: '#2D7A4F', color: '#fff', fontSize: 14, fontWeight: 800, cursor: savingDT ? 'wait' : 'pointer' }}>✓</button>
                  <button onClick={() => setEditingDT(false)}
                    style={{ border: '1px solid var(--line)', borderRadius: 7, width: 30, height: 28, background: '#fff', color: 'var(--ink3)', fontSize: 13, cursor: 'pointer' }}>✕</button>
                  <DatePicker open={showDate} selectedDate={dNgay} onClose={() => setShowDate(false)}
                    onConfirm={(iso) => { setDNgay(iso); setShowDate(false) }} />
                </div>
              ) : (
                <div style={{ fontSize: 11, color: 'var(--ink3)', marginTop: 3, display: 'flex', alignItems: 'center', gap: 7, justifyContent: 'flex-end' }}>
                  <span>{date} · {time}</span>
                  {isAdmin && order.trang_thai !== 'huy' && (
                    <button title="Sửa ngày / giờ tạo đơn"
                      onClick={() => { setDNgay(order.ngay || (order.created_at || '').slice(0, 10)); setDGio(time); setEditingDT(true) }}
                      style={{ border: '1px solid var(--bord)', borderRadius: 6, padding: '2px 7px', background: '#fff', color: '#8a6335', fontSize: 11, fontWeight: 800, cursor: 'pointer' }}>
                      ✎ Sửa
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Thân — 2 cột: trái = đơn hàng, phải = khách + luồng dữ liệu */}
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: twoCol ? '1.5fr 1fr' : '1fr', alignItems: 'start' }}>
            <div style={{ borderRight: twoCol ? '1px solid var(--line)' : 'none', minWidth: 0 }}>
              {itemsBlock}
              {noteBlock}
              {totalsBlock}
            </div>
            <div style={{ minWidth: 0, background: '#fffdf9' }}>
              {crmBlock}
              {flowBlock}
            </div>
          </div>
        </div>

        {/* Footer hành động */}
        <div style={{ padding: '12px 20px', borderTop: '1px solid var(--line)', flexShrink: 0, display: 'flex', gap: 8, background: '#fafaf9' }}>
          {order.trang_thai !== 'huy' && isAdmin && (
            <button onClick={onVoid} disabled={busy} style={{ padding: '0 14px', height: 40, border: '1px solid rgba(192,57,43,.35)', borderRadius: 8, background: 'rgba(192,57,43,.06)', color: '#C0392B', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--sans)' }}>
              Hủy đơn
            </button>
          )}
          {isAdmin && order.trang_thai !== 'huy' && order.trang_thai !== 'draft' && (
            <button onClick={handleReopen} disabled={busy} style={{ padding: '0 14px', height: 40, border: '1px solid var(--bord)', borderRadius: 8, background: 'rgba(160,113,79,.08)', color: '#8a6335', fontSize: 12.5, fontWeight: 700, cursor: busy ? 'wait' : 'pointer', fontFamily: 'var(--sans)' }}>
              ✎ Sửa đơn
            </button>
          )}
          {isAdmin && order.trang_thai === 'huy' && (
            <button onClick={handleRestore} disabled={busy} style={{ padding: '0 14px', height: 40, border: '1px solid rgba(45,122,79,.4)', borderRadius: 8, background: 'rgba(45,122,79,.08)', color: '#2D7A4F', fontSize: 12.5, fontWeight: 700, cursor: busy ? 'wait' : 'pointer', fontFamily: 'var(--sans)' }}>
              ↺ Khôi phục đơn
            </button>
          )}
          {isAdmin && order.trang_thai === 'huy' && (
            <button onClick={handleHardDelete} disabled={busy} style={{ padding: '0 14px', height: 40, border: '1px solid rgba(192,57,43,.35)', borderRadius: 8, background: 'rgba(192,57,43,.06)', color: '#C0392B', fontSize: 12.5, fontWeight: 700, cursor: busy ? 'wait' : 'pointer', fontFamily: 'var(--sans)' }}>
              🗑 Xóa vĩnh viễn
            </button>
          )}
          {/* Lễ tân: đề xuất sửa đơn → gửi Admin duyệt (không tự áp). Đơn đã hủy thì không sửa. */}
          {!isAdmin && order.trang_thai !== 'huy' && (
            <button onClick={handleReopen} disabled={busy} style={{ padding: '0 14px', height: 40, border: '1px solid var(--bord)', borderRadius: 8, background: 'rgba(160,113,79,.08)', color: '#8a6335', fontSize: 12.5, fontWeight: 700, cursor: busy ? 'wait' : 'pointer', fontFamily: 'var(--sans)' }}>
              ✏️ Đề Xuất Sửa Đơn
            </button>
          )}
          {!isAdmin && order.trang_thai === 'huy' && (
            <span style={{ padding: '0 12px', height: 40, display: 'inline-flex', alignItems: 'center', fontSize: 11, color: 'var(--ink3)', fontStyle: 'italic' }}>
              Đơn đã hủy — không sửa được
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
    </>,
    document.body
  )
}
