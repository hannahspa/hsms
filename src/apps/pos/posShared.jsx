import { formatCurrency } from '../../lib/utils'
import { getTreatmentCardDisplayValue } from '../../lib/treatmentCardPolicy'

export function parseVND(value) {
  return parseInt(String(value).replace(/\D/g, ''), 10) || 0
}

export function fmtInput(value) {
  return value > 0 ? new Intl.NumberFormat('vi-VN').format(value) : ''
}

export function fmtDate(value) {
  if (!value) return ''
  const [y, m, d] = String(value).split('-')
  return d && m && y ? `${d}/${m}/${y}` : value
}

export function getInitials(name) {
  if (!name) return '?'
  const parts = name.trim().split(' ')
  return (parts[parts.length - 1][0] || '').toUpperCase()
}

export function shortName(name) {
  if (!name) return ''
  const parts = name.trim().split(/\s+/)
  return parts.slice(-2).join(' ')
}

export function NvAvatar({ nv, size = 36 }) {
  if (nv?.avatar_url) {
    return (
      <img
        src={nv.avatar_url}
        alt={nv.ho_ten || ''}
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          objectFit: 'cover',
          flexShrink: 0,
          border: '1px solid rgba(160,113,79,.25)',
        }}
      />
    )
  }

  return (
    <div style={{
      width: size,
      height: size,
      borderRadius: '50%',
      flexShrink: 0,
      background: 'linear-gradient(135deg,#C9A96E,#A0714F)',
      color: '#2a1d14',
      fontSize: Math.round(size * 0.36),
      fontWeight: 700,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      {getInitials(nv?.ho_ten)}
    </div>
  )
}

export function paymentDisplayLabel(method) {
  if (method.id === 'chuyen_khoan') return 'Chuyển Khoản - MB Bank'
  if (method.id === 'quet_the') return 'Quẹt Thẻ - TP Bank'
  return method.label
}

export function Toggle({ on, onChange, label }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', userSelect: 'none' }}>
      <div onClick={() => onChange(!on)} style={{
        width: 38,
        height: 21,
        borderRadius: 11,
        position: 'relative',
        background: on ? 'var(--champagne)' : 'rgba(0,0,0,.18)',
        transition: 'background .2s',
        flexShrink: 0,
      }}>
        <div style={{
          position: 'absolute',
          top: 2.5,
          left: on ? 19 : 2.5,
          width: 16,
          height: 16,
          borderRadius: '50%',
          background: '#fff',
          transition: 'left .18s',
          boxShadow: '0 1px 4px rgba(0,0,0,.25)',
        }} />
      </div>
      {label && <span style={{ fontSize: 12.5, color: 'var(--ink2)' }}>{label}</span>}
    </label>
  )
}

export function LieuTrinhCard({ card, onUse }) {
  const pct = card.so_buoi_tong > 0 ? (card.so_buoi_da_dung / card.so_buoi_tong) * 100 : 0
  const displayValue = getTreatmentCardDisplayValue(card)
  const originalValue = Number(card.gia_tri_the_goc ?? card.gia_tri_the ?? 0)
  const paidValue = Number(card.da_thanh_toan ?? originalValue)
  const conNo = Math.max(0, originalValue - paidValue)
  const du30pct = paidValue >= Math.round(originalValue * 0.30)
  const coNo = conNo > 0

  return (
    <div style={{
      minWidth: 160,
      maxWidth: 175,
      flexShrink: 0,
      borderRadius: 8,
      padding: '7px 10px',
      background: coNo
        ? 'linear-gradient(135deg,#8e2218 0%,#C0392B 55%,#922b21 100%)'
        : 'linear-gradient(135deg,#C9A96E 0%,#A0714F 55%,#7D5A3C 100%)',
      color: '#fff',
      boxShadow: coNo
        ? '0 2px 8px rgba(192,57,43,.35)'
        : '0 2px 8px rgba(160,113,79,.25)',
    }}>
      <div style={{ fontSize: 10.5, fontWeight: 700, lineHeight: 1.3, marginBottom: 1 }}>
        {card.ten_dich_vu}
      </div>
      <div style={{ fontSize: 9, opacity: .8, marginBottom: coNo ? 3 : 5 }}>
        {card.so_buoi_da_dung}/{card.so_buoi_tong} buổi · {formatCurrency(displayValue || 0)}
      </div>
      {coNo && (
        <div style={{
          fontSize: 9,
          fontWeight: 700,
          marginBottom: 4,
          background: du30pct ? 'rgba(255,255,255,.18)' : 'rgba(255,50,50,.35)',
          border: '1px solid rgba(255,255,255,.3)',
          borderRadius: 4,
          padding: '2px 6px',
          lineHeight: 1.4,
        }}>
          {`Nợ ${formatCurrency(conNo)}`}
        </div>
      )}
      <div style={{ height: 2, background: 'rgba(255,255,255,.25)', borderRadius: 2, marginBottom: 5 }}>
        <div style={{ height: '100%', borderRadius: 2, background: '#fff', width: `${pct}%` }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 8.5, opacity: .7 }}>{card.ma_the || '-'}</span>
        <button onClick={() => onUse(card)} style={{
          background: 'rgba(255,255,255,.25)',
          border: '1px solid rgba(255,255,255,.4)',
          borderRadius: 5,
          padding: '2px 8px',
          color: '#fff',
          cursor: 'pointer',
          fontSize: 10,
          fontWeight: 700,
          fontFamily: 'var(--sans)',
        }}>Dùng</button>
      </div>
    </div>
  )
}
