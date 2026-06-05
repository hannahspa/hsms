import { FONT } from '../../constants/colors'

// ── Avatar nhân viên DÙNG CHUNG toàn hệ thống ──────────────────────────────
// Có avatar_url (ảnh thật) → hiện ảnh tròn. Không có → initials gradient thanh lịch.
// Gradient chọn theo tên để mỗi NV có 1 tông riêng, nhất quán mọi nơi.

const GRADS = [
  'linear-gradient(135deg,#c9a96e,#a87f4f)',
  'linear-gradient(135deg,#c4998a,#a87366)',
  'linear-gradient(135deg,#94a085,#6e8a5e)',
  'linear-gradient(135deg,#8a6a6e,#634a4e)',
  'linear-gradient(135deg,#a88a6a,#6b4a35)',
  'linear-gradient(135deg,#b89a7a,#8a6a52)',
]

function initialsOf(name) {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  return (parts[parts.length - 1][0] || '?').toUpperCase()
}

export default function StaffAvatar({ nv, size = 36, radius, style }) {
  const r = radius != null ? radius : '50%'
  const base = { width: size, height: size, borderRadius: r, flexShrink: 0 }

  if (nv?.avatar_url) {
    return (
      <img
        src={nv.avatar_url}
        alt={nv.ho_ten || ''}
        style={{
          ...base,
          objectFit: 'cover',
          border: '1px solid rgba(201,169,110,.4)',
          boxShadow: '0 1px 4px rgba(139,94,60,.18)',
          ...style,
        }}
      />
    )
  }

  const grad = GRADS[Math.abs((nv?.ho_ten || '?').charCodeAt(0)) % GRADS.length]
  return (
    <div style={{
      ...base,
      background: grad,
      color: '#fff',
      fontFamily: FONT.serif,
      fontWeight: 600,
      fontSize: Math.round(size * 0.44),
      display: 'grid',
      placeItems: 'center',
      letterSpacing: '.01em',
      border: '1px solid rgba(255,255,255,.18)',
      boxShadow: '0 1px 4px rgba(139,94,60,.18)',
      ...style,
    }}>
      {initialsOf(nv?.ho_ten)}
    </div>
  )
}
