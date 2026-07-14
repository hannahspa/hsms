import { formatCurrency, todayISO } from '../../lib/utils'
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

export function LieuTrinhCard({ card, onUse, onGiaHan }) {
  const pct = card.so_buoi_tong > 0 ? (card.so_buoi_da_dung / card.so_buoi_tong) * 100 : 0
  const displayValue = getTreatmentCardDisplayValue(card)
  // Nợ tính trên GIÁ BÁN THỰC (gia_ban_thuc — sau KM), không phải giá gốc/mệnh giá.
  // Thẻ cũ chưa có gia_ban_thuc → fallback gia_tri_the như trước (migration 146).
  const originalValue = Number(card.gia_ban_thuc ?? card.gia_tri_the_goc ?? card.gia_tri_the ?? 0)
  const paidValue = Number(card.da_thanh_toan ?? originalValue)
  const conNo = Math.max(0, originalValue - paidValue)
  const du30pct = paidValue >= Math.round(originalValue * 0.30)
  const coNo = conNo > 0

  // ── Thời hạn thẻ: ĐỌC TRỰC TIẾP ngay_het_han. NULL = VÔ THỜI HẠN ──
  // (KHÔNG tự tính ngày mua + 1 năm — chính sách: thẻ số lần cũ vô thời hạn)
  const khongGH = card.is_khong_gioi_han || !card.ngay_het_han
  const hetHan = !khongGH && card.ngay_het_han < todayISO()
  const hetBuoi = (card.so_buoi_con_lai ?? (card.so_buoi_tong - card.so_buoi_da_dung)) <= 0
  const hanText = khongGH
    ? 'HH: Không giới hạn'
    : `HH: ${String(card.ngay_het_han).split('-').reverse().join('/')}${hetHan ? ' (đã hết hạn)' : ''}`

  // ── Màu nền phân loại trạng thái (giống MySpa) ──
  //   Hết hạn → xám trầm · Có nợ → đỏ · Hoạt động → champagne
  const bg = hetHan
    ? 'linear-gradient(135deg,#6E6E6E 0%,#565656 55%,#3F3F3F 100%)'
    : coNo
      ? 'linear-gradient(135deg,#8e2218 0%,#C0392B 55%,#922b21 100%)'
      : 'linear-gradient(135deg,#C9A96E 0%,#A0714F 55%,#7D5A3C 100%)'
  const shadow = hetHan
    ? '0 2px 8px rgba(80,80,80,.3)'
    : coNo ? '0 2px 8px rgba(192,57,43,.35)' : '0 2px 8px rgba(160,113,79,.25)'

  return (
    <div style={{
      minWidth: 0, // width do lưới cha quyết định (grid 4 ô kiểu MySpa)
      borderRadius: 8,
      padding: '7px 10px',
      background: bg,
      color: '#fff',
      boxShadow: shadow,
      opacity: hetHan ? .92 : 1,
    }}>
      {(hetHan || hetBuoi) && (
        <div style={{
          display: 'inline-block', fontSize: 8, fontWeight: 800, letterSpacing: '.04em',
          background: hetHan ? 'rgba(0,0,0,.28)' : 'rgba(255,255,255,.22)',
          border: '1px solid rgba(255,255,255,.35)', borderRadius: 4,
          padding: '1px 5px', marginBottom: 3,
        }}>
          {hetHan ? '⏳ HẾT HẠN' : '✓ HẾT BUỔI'}
        </div>
      )}
      <div style={{ fontSize: 10.5, fontWeight: 700, lineHeight: 1.3, marginBottom: 1 }}>
        {card.ten_dich_vu}
      </div>
      <div style={{ fontSize: 9, opacity: .8, marginBottom: 2 }}>
        {card.so_buoi_da_dung}/{card.so_buoi_tong} buổi · {formatCurrency(displayValue || 0)}
      </div>
      <div style={{
        fontSize: 9, fontWeight: hetHan ? 800 : 600, marginBottom: coNo ? 3 : 5,
        color: hetHan ? '#FFD9D4' : undefined, opacity: hetHan ? 1 : .85,
      }}>
        ⏳ {hanText}
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 4 }}>
        <span style={{ fontSize: 8.5, opacity: .7, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{card.ma_the || '-'}</span>
        {onGiaHan && (hetHan || !khongGH) && (
          <button onClick={() => onGiaHan(card)} style={{
            background: 'rgba(255,255,255,.18)',
            border: '1px solid rgba(255,255,255,.4)',
            borderRadius: 5, padding: '2px 7px', color: '#fff', cursor: 'pointer',
            fontSize: 10, fontWeight: 700, fontFamily: 'var(--sans)', flexShrink: 0,
          }}>Gia hạn</button>
        )}
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
          flexShrink: 0,
        }}>Dùng</button>
      </div>
    </div>
  )
}
