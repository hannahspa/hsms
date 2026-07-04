import { useState } from 'react'
import { todayISO } from '../../../../lib/utils'
import DatePicker from '../../../../components/shared/DatePicker'
import Modal from '../../../../components/ui/Modal'
import { C } from '../../../../constants/colors'
import { theLieuTrinhService } from '../../../../services/theLieuTrinhService'

function fmtDate(iso) {
  if (!iso) return '-'
  const [y, m, d] = String(iso).slice(0, 10).split('-')
  return `${d}/${m}/${y}`
}

export default function ModalCheckoutBuoi({ card, onClose, onDone }) {
  const [ngay, setNgay] = useState(todayISO())
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [ghiChu, setGhiChu] = useState('')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  const remain = (card.so_buoi_tong || 0) - (card.so_buoi_da_dung || 0)
  const remainingAfterUse = Math.max(0, remain - 1)

  const handleSave = async () => {
    if (remain <= 0) {
      setErr('Thẻ đã hết buổi.')
      return
    }
    setSaving(true)
    setErr('')
    try {
      await theLieuTrinhService.checkoutSession({
        card,
        ngaySuDung: ngay,
        ghiChu,
        nguoiGhi: 'admin',
      })
      await onDone()
    } catch (e) {
      setErr(e.message || 'Không ghi nhận được buổi sử dụng.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <Modal open onClose={onClose} size="sm" icon="✓"
        title="Ghi nhận sử dụng 1 buổi"
        subtitle={`${card.ten_dich_vu} · ${card.khach_hang?.ho_ten || '-'}`}
        footer={
          <>
            <button onClick={onClose} style={{ padding: '10px 18px', borderRadius: 10, border: `1px solid ${C.border}`, background: C.bg, fontFamily: 'var(--sans)', fontWeight: 700, fontSize: 14, cursor: 'pointer', color: C.textSub }}>
              Hủy
            </button>
            <button
              onClick={handleSave}
              disabled={saving || remain <= 0}
              style={{ padding: '10px 22px', borderRadius: 10, border: 'none', background: remain <= 0 ? '#ccc' : C.grad, color: '#fff', fontFamily: 'var(--sans)', fontWeight: 700, fontSize: 14, cursor: remain <= 0 ? 'not-allowed' : 'pointer' }}
            >
              {saving ? 'Đang lưu...' : 'Xác nhận sử dụng 1 buổi'}
            </button>
          </>
        }>
        <div style={{
          background: remain <= 1 ? '#fdf3e0' : '#eef5e8',
          border: `1px solid ${remain <= 1 ? '#e8c96a' : '#a5c87a'}`,
          borderRadius: 10,
          padding: '10px 14px',
          marginBottom: 16,
          fontSize: 13,
          fontWeight: 700,
          color: remain <= 1 ? '#a07030' : '#2D7A4F',
        }}>
          {remain <= 0
            ? 'Thẻ đã hết buổi'
            : remain === 1
              ? `Buổi cuối cùng, còn ${remain} buổi`
              : `Còn lại ${remain} buổi, sau khi dùng còn ${remainingAfterUse}`}
        </div>

        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.textSub, textTransform: 'uppercase', marginBottom: 6 }}>Ngày sử dụng</div>
          <button
            type="button"
            onClick={() => setShowDatePicker(true)}
            style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: `1px solid ${C.border}`, background: '#fff', fontFamily: 'var(--sans)', fontSize: 14, boxSizing: 'border-box', textAlign: 'left', cursor: 'pointer', color: C.text }}
          >
            📅 {fmtDate(ngay)}
          </button>
        </div>

        <div style={{ marginBottom: 4 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.textSub, textTransform: 'uppercase', marginBottom: 6 }}>Ghi chú tùy chọn</div>
          <input
            type="text"
            value={ghiChu}
            onChange={e => setGhiChu(e.target.value)}
            placeholder="Ví dụ: Tái khám, dịch vụ kết hợp..."
            style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: `1px solid ${C.border}`, fontFamily: 'var(--sans)', fontSize: 14, boxSizing: 'border-box' }}
          />
        </div>

        {err && <div style={{ color: C.chi, fontSize: 12, marginTop: 10 }}>{err}</div>}
      </Modal>

      <DatePicker
        open={showDatePicker}
        selectedDate={ngay}
        onClose={() => setShowDatePicker(false)}
        onConfirm={(value) => {
          setNgay(value)
          setShowDatePicker(false)
        }}
      />
    </>
  )
}
