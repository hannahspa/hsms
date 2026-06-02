import { getStatusKey } from '../theLieuTrinhUtils'

const STATUS_CFG = {
  active: { label: 'Đang dùng', bg: '#eef2e7', color: '#4f6a3d' },
  done: { label: 'Hết buổi', bg: '#ede9f8', color: '#5a4a8a' },
  expired: { label: 'Hết hạn', bg: '#f5e0da', color: '#843a23' },
  closed: { label: 'Đóng thẻ', bg: '#f5f0e8', color: '#8B7355' },
  converted: { label: 'Chuyển đổi', bg: '#e8f0f5', color: '#315a72' },
}

export function StatusBadge({ card }) {
  const cfg = STATUS_CFG[getStatusKey(card)] || STATUS_CFG.active

  return (
    <span style={{ background: cfg.bg, color: cfg.color, padding: '3px 9px', borderRadius: 8, fontSize: 11, fontWeight: 800, whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center' }}>
      {cfg.label}
    </span>
  )
}

export function ComboStatus({ combo }) {
  const active = combo.trang_thai === 'active'

  return (
    <span style={{
      background: active ? '#eef2e7' : '#f5f0e8',
      color: active ? '#4f6a3d' : '#8B7355',
      padding: '3px 9px',
      borderRadius: 8,
      fontSize: 11,
      fontWeight: 800,
    }}>
      {active ? 'Active' : 'Block'}
    </span>
  )
}
