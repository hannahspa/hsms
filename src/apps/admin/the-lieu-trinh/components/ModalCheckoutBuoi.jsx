import { useState } from 'react'
import { todayISO } from '../../../../lib/utils'
import DatePicker from '../../../../components/shared/DatePicker'
import { theLieuTrinhService } from '../../../../services/theLieuTrinhService'

const LUX = {
  bg: '#FAF7F4',
  card: '#FFFFFF',
  border: 'rgba(160,113,79,0.12)',
  shadow: '0 4px 24px rgba(139,94,60,0.10)',
  text: '#1A1209',
  sub: '#8B7355',
  gold: '#C9A96E',
  grad: 'linear-gradient(135deg,#C9A96E 0%,#A0714F 45%,#7D5A3C 100%)',
  chi: '#C0392B',
  green: '#eef5e8',
  greenText: '#2D7A4F',
  greenBorder: '#a5c87a',
}

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
      <div
        style={{ position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(26,22,18,.5)' }}
        onClick={onClose}
      >
        <div
          style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: 'calc(100vw - var(--side-w, 248px))', maxWidth: '100vw', background: LUX.card, boxShadow: '-6px 0 40px rgba(26,22,18,.3)', overflowY: 'auto', animation: 'rpSlideIn .22s ease' }}
          onClick={e => e.stopPropagation()}
        >
          <div style={{ padding: '18px 22px', borderBottom: `1px solid ${LUX.border}` }}>
            <div style={{ fontSize: 17, fontWeight: 900, fontFamily: 'var(--serif, serif)', color: LUX.text }}>Ghi nhận sử dụng 1 buổi</div>
            <div style={{ fontSize: 12, color: LUX.sub, marginTop: 3 }}>
              {card.ten_dich_vu} · {card.khach_hang?.ho_ten || '-'}
            </div>
          </div>

          <div style={{ padding: '18px 22px' }}>
            <div style={{
              background: remain <= 1 ? '#fdf3e0' : LUX.green,
              border: `1px solid ${remain <= 1 ? '#e8c96a' : LUX.greenBorder}`,
              borderRadius: 10,
              padding: '10px 14px',
              marginBottom: 16,
              fontSize: 13,
              fontWeight: 700,
              color: remain <= 1 ? '#a07030' : LUX.greenText,
            }}>
              {remain <= 0
                ? 'Thẻ đã hết buổi'
                : remain === 1
                  ? `Buổi cuối cùng, còn ${remain} buổi`
                  : `Còn lại ${remain} buổi, sau khi dùng còn ${remainingAfterUse}`}
            </div>

            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: LUX.sub, textTransform: 'uppercase', marginBottom: 6 }}>Ngày sử dụng</div>
              <button
                type="button"
                onClick={() => setShowDatePicker(true)}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: `1px solid ${LUX.border}`, background: '#fff', fontFamily: 'var(--sans)', fontSize: 14, boxSizing: 'border-box', textAlign: 'left', cursor: 'pointer', color: LUX.text }}
              >
                {fmtDate(ngay)}
              </button>
            </div>

            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: LUX.sub, textTransform: 'uppercase', marginBottom: 6 }}>Ghi chú tùy chọn</div>
              <input
                type="text"
                value={ghiChu}
                onChange={e => setGhiChu(e.target.value)}
                placeholder="Ví dụ: Tái khám, dịch vụ kết hợp..."
                style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: `1px solid ${LUX.border}`, fontFamily: 'var(--sans)', fontSize: 14, boxSizing: 'border-box' }}
              />
            </div>

            {err && <div style={{ color: LUX.chi, fontSize: 12, marginBottom: 10 }}>{err}</div>}

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={onClose} style={{ flex: 1, padding: 12, borderRadius: 10, border: `1px solid ${LUX.border}`, background: LUX.bg, fontFamily: 'var(--sans)', fontWeight: 700, fontSize: 14, cursor: 'pointer', color: LUX.sub }}>
                Hủy
              </button>
              <button
                onClick={handleSave}
                disabled={saving || remain <= 0}
                style={{ flex: 2, padding: 12, borderRadius: 10, border: 'none', background: remain <= 0 ? '#ccc' : LUX.grad, color: '#fff', fontFamily: 'var(--sans)', fontWeight: 700, fontSize: 14, cursor: remain <= 0 ? 'not-allowed' : 'pointer' }}
              >
                {saving ? 'Đang lưu...' : 'Xác nhận sử dụng 1 buổi'}
              </button>
            </div>
          </div>
        </div>
      </div>

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
