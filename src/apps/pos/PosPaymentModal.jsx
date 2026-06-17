import { useState, useCallback } from 'react'
import { formatCurrency } from '../../lib/utils'
import { HINH_THUC_THU } from '../../constants/enums'
import { notify } from '../../components/ui/notify'

function parseVND(s) { return parseInt(String(s).replace(/\D/g, ''), 10) || 0 }
function fmtInput(n) { return n > 0 ? new Intl.NumberFormat('vi-VN').format(n) : '' }

const PTTT_LIST = HINH_THUC_THU

let _id = 0
const newLine = (soTien = 0, hinhThuc = '') => ({ _id: ++_id, soTien, hinhThuc })

export default function PosPaymentModal({ tongHang, selectedCustomer, onConfirm, onCancel }) {
  const [giamGia, setGiamGia]   = useState(0)
  const [lines, setLines]       = useState([newLine(tongHang, 'tien_mat')])
  const [ghiChu, setGhiChu]     = useState('')

  const tongSauGiam = Math.max(0, tongHang - giamGia)
  const tongNhan    = lines.reduce((s, l) => s + l.soTien, 0)
  const tienThua    = Math.max(0, tongNhan - tongSauGiam)
  const conNo       = Math.max(0, tongSauGiam - tongNhan)
  const canConfirm  = !!selectedCustomer && tongNhan > 0 && (tongNhan >= tongSauGiam || conNo > 0)

  const updateLine = (id, field, val) =>
    setLines(p => p.map(l => l._id === id ? { ...l, [field]: val } : l))

  const addLine = () => setLines(p => [...p, newLine(Math.max(0, conNo), '')])
  const removeLine = (id) => setLines(p => p.filter(l => l._id !== id))

  // Khi gõ số tiền lớn = auto phân bổ vào line đó
  const handleSoTien = (id, raw) => {
    const val = parseVND(raw)
    updateLine(id, 'soTien', val)
  }

  const handleConfirm = () => {
    const payments = lines
      .filter(l => l.soTien > 0 && l.hinhThuc)
      .map(l => ({ hinhThuc: l.hinhThuc, soTien: l.soTien }))

    if (!selectedCustomer) {
      notify('Vui lòng chọn khách hàng trước khi chốt đơn để CRM và đối soát dữ liệu được ghi nhận đầy đủ.', 'warn')
      return
    }
    if (payments.length === 0) {
      notify('Vui lòng nhập ít nhất 1 khoản thanh toán và chọn hình thức', 'warn')
      return
    }
    // Nếu còn nợ mà không có KH → chặn
    if (conNo > 0 && !selectedCustomer) {
      notify('Khách lẻ phải thanh toán đủ. Vui lòng chọn khách hàng để ghi nợ.', 'warn')
      return
    }
    onConfirm({ giamGia, payments, ghiChu })
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,.5)',
    }} onClick={onCancel}>
      <div style={{
        position: 'absolute', top: 0, right: 0, bottom: 0, width: 'calc(100vw - var(--side-w, 248px))', maxWidth: '100vw',
        background: '#fff', display: 'flex', flexDirection: 'column',
        boxShadow: '-6px 0 40px rgba(0,0,0,.28)', animation: 'rpSlideIn .22s ease',
      }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{
          padding: '16px 20px 12px',
          background: 'linear-gradient(135deg,#3d2c20 0%,#2a1d14 100%)',
          borderRadius: '16px 16px 0 0', flexShrink: 0,
        }}>
          <div style={{ fontSize: 17, fontWeight: 700, fontFamily: 'var(--serif)', color: '#f3e6d2' }}>
            Thanh Toán
          </div>
          {selectedCustomer && (
            <div style={{ fontSize: 12, color: 'rgba(243,230,210,.6)', marginTop: 2 }}>
              {selectedCustomer.ho_ten} · {selectedCustomer.so_dien_thoai}
            </div>
          )}
        </div>

        {/* Scrollable body */}
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '16px 20px' }}>

          {/* Tổng + Giảm giá */}
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16,
            padding: 14, background: '#fafaf9', borderRadius: 10, border: '1px solid var(--line)',
          }}>
            <div>
              <div style={{ fontSize: 10, color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 4 }}>
                Tạm tính
              </div>
              <div style={{ fontSize: 18, fontWeight: 700, fontFamily: 'var(--serif)', color: 'var(--ink)' }}>
                {formatCurrency(tongHang)}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 10, color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 4 }}>
                Giảm giá (VNĐ)
              </div>
              <input
                value={giamGia > 0 ? fmtInput(giamGia) : ''}
                onChange={e => setGiamGia(parseVND(e.target.value))}
                placeholder="0đ"
                style={{
                  width: '100%', boxSizing: 'border-box',
                  border: '1.5px solid var(--bord)', borderRadius: 7,
                  padding: '5px 10px', fontSize: 14, fontWeight: 700, outline: 'none',
                  background: '#fff', fontFamily: 'var(--sans)', color: '#C0392B',
                }}
              />
            </div>
          </div>

          {/* Tổng cộng */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '10px 14px', background: '#f0ebe4', borderRadius: 8, marginBottom: 16,
          }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)', fontFamily: 'var(--serif)' }}>Tổng cộng</span>
            <span style={{ fontSize: 20, fontWeight: 800, color: '#2D7A4F', fontFamily: 'var(--serif)' }}>
              {formatCurrency(tongSauGiam)}
            </span>
          </div>

          {/* PTTT Lines */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink2)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 8 }}>
              Hình thức thanh toán
            </div>
            {lines.map((line, idx) => {
              // Số tiền đã phân bổ trước line này
              const daPhanBo = lines.slice(0, idx).reduce((s, l) => s + l.soTien, 0)
              const conLai   = Math.max(0, tongSauGiam - daPhanBo)
              return (
                <div key={line._id} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'stretch' }}>
                  {/* Số tiền */}
                  <div style={{ flex: 1 }}>
                    {idx === 0 && (
                      <div style={{ fontSize: 10, color: 'var(--ink3)', marginBottom: 3 }}>Số tiền</div>
                    )}
                    <input
                      value={fmtInput(line.soTien)}
                      onChange={e => handleSoTien(line._id, e.target.value)}
                      placeholder={formatCurrency(conLai)}
                      style={{
                        width: '100%', boxSizing: 'border-box',
                        border: '1.5px solid var(--bord)', borderRadius: 8,
                        padding: '8px 10px', fontSize: 15, fontWeight: 700, outline: 'none',
                        background: '#fff', fontFamily: 'var(--sans)', color: 'var(--ink)',
                        textAlign: 'right',
                      }}
                    />
                  </div>

                  {/* PTTT */}
                  <div style={{ flex: 1 }}>
                    {idx === 0 && (
                      <div style={{ fontSize: 10, color: 'var(--ink3)', marginBottom: 3 }}>Hình thức</div>
                    )}
                    <select
                      value={line.hinhThuc}
                      onChange={e => updateLine(line._id, 'hinhThuc', e.target.value)}
                      style={{
                        width: '100%', border: '1.5px solid var(--bord)', borderRadius: 8,
                        padding: '8px 10px', fontSize: 13, outline: 'none',
                        background: '#fff', color: line.hinhThuc ? 'var(--ink)' : 'var(--ink3)',
                        fontFamily: 'var(--sans)', cursor: 'pointer',
                        appearance: 'auto', height: 40,
                      }}
                    >
                      <option value="">-- Chọn PTTT --</option>
                      {PTTT_LIST.map(p => (
                        <option key={p.id} value={p.id}>{p.icon} {p.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Nút xóa (chỉ hiện từ line 2 trở đi) */}
                  {lines.length > 1 && (
                    <button onClick={() => removeLine(line._id)} style={{
                      alignSelf: 'flex-end',
                      width: 36, height: 40, border: '1px solid var(--bord)', borderRadius: 8,
                      background: '#fff', color: '#DC3545', cursor: 'pointer', fontSize: 16,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>✕</button>
                  )}
                </div>
              )
            })}

            {/* Nút thêm PTTT */}
            <button onClick={addLine} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 12px', border: '1px dashed var(--bord)', borderRadius: 8,
              background: 'none', color: 'var(--champagne)', cursor: 'pointer',
              fontSize: 12, fontWeight: 700, fontFamily: 'var(--sans)',
            }}>
              + Thêm phương thức
            </button>
          </div>

          {/* Tổng nhận / Tiền thừa / Còn nợ */}
          <div style={{
            padding: 14, background: '#fafaf9', borderRadius: 10,
            border: '1px solid var(--line)', marginBottom: 14,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13 }}>
              <span style={{ color: 'var(--ink3)' }}>Tổng nhận</span>
              <span style={{ fontWeight: 700, fontFamily: 'var(--serif)', color: 'var(--ink)' }}>
                {formatCurrency(tongNhan)}
              </span>
            </div>
            {tienThua > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span style={{ color: 'var(--ink3)' }}>Tiền thừa trả lại</span>
                <span style={{ fontWeight: 700, fontFamily: 'var(--serif)', color: '#2D7A4F' }}>
                  {formatCurrency(tienThua)}
                </span>
              </div>
            )}
            {conNo > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span style={{ color: 'var(--ink3)' }}>
                  {selectedCustomer ? 'Ghi nợ KH' : 'Còn thiếu'}
                </span>
                <span style={{ fontWeight: 700, fontFamily: 'var(--serif)', color: '#C0392B' }}>
                  {formatCurrency(conNo)}
                  {!selectedCustomer && <span style={{ fontSize: 10, marginLeft: 4 }}>⚠️ cần TT đủ</span>}
                </span>
              </div>
            )}
          </div>

          {/* Ghi chú */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink2)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 6 }}>
              Ghi chú
            </div>
            <textarea
              value={ghiChu}
              onChange={e => setGhiChu(e.target.value)}
              placeholder="Ghi chú đơn hàng (tùy chọn)…"
              rows={2}
              style={{
                width: '100%', boxSizing: 'border-box',
                border: '1.5px solid var(--bord)', borderRadius: 8,
                padding: '8px 10px', fontSize: 13, outline: 'none', resize: 'none',
                background: '#fff', color: 'var(--ink)', fontFamily: 'var(--sans)',
              }}
            />
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '12px 20px', borderTop: '1px solid var(--line)', flexShrink: 0,
          display: 'flex', gap: 10,
        }}>
          <button onClick={onCancel} style={{
            flex: 1, height: 44, border: '1.5px solid var(--bord)', borderRadius: 10,
            background: '#fff', color: 'var(--ink2)', cursor: 'pointer', fontSize: 14, fontWeight: 600, fontFamily: 'var(--sans)',
          }}>Hủy</button>
          <button onClick={handleConfirm} disabled={!canConfirm} style={{
            flex: 2, height: 44, border: 'none', borderRadius: 10,
            background: canConfirm
              ? (conNo > 0 ? 'linear-gradient(135deg,#C0392B,#922b21)' : 'linear-gradient(135deg,#C9A96E 0%,#A0714F 45%,#7D5A3C 100%)')
              : 'var(--line)',
            color: canConfirm ? '#fff' : 'var(--ink3)',
            cursor: canConfirm ? 'pointer' : 'not-allowed',
            fontSize: 14, fontWeight: 700, fontFamily: 'var(--sans)', transition: 'all .15s',
          }}>
            {conNo > 0 && selectedCustomer
              ? `Ghi Nợ ${formatCurrency(conNo)} & Chốt Đơn`
              : `Xác Nhận — ${formatCurrency(tongSauGiam)}`
            }
          </button>
        </div>
      </div>
    </div>
  )
}
