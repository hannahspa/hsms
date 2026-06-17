import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { C, FONT, RADIUS } from '../../constants/colors'

/**
 * Modal — hộp thoại chuẩn HSMS (dùng chung TOÀN hệ thống).
 * LUÔN createPortal → document.body (tránh ancestor transform làm lệch).
 *
 * Props:
 *  - open        : boolean
 *  - onClose     : () => void
 *  - title       : string | node (header)
 *  - subtitle    : string (dưới title)
 *  - icon        : node/emoji (trước title)
 *  - footer      : node (thanh nút đáy) — nếu không có thì ẩn
 *  - size        : 'sm'(420) | 'md'(560) | 'lg'(760) | 'xl'(960)
 *  - children    : nội dung
 *  - closeOnOverlay (mặc định true)
 */
const SIZES = { sm: 420, md: 560, lg: 760, xl: 960 }

export default function Modal({ open, onClose, title, subtitle, icon, footer, size = 'md', children, closeOnOverlay = true }) {
  useEffect(() => {
    if (!open) return undefined
    const onEsc = (e) => { if (e.key === 'Escape') onClose?.() }
    window.addEventListener('keydown', onEsc)
    return () => window.removeEventListener('keydown', onEsc)
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div
      onClick={closeOnOverlay ? onClose : undefined}
      style={{
        position: 'fixed', inset: 0, zIndex: 100000,
        background: 'rgba(26,18,9,0.42)', backdropFilter: 'blur(3px)', WebkitBackdropFilter: 'blur(3px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
        animation: 'hsmsModalFade .2s ease',
      }}
    >
      <style>{`
        @keyframes hsmsModalFade { from { opacity: 0 } to { opacity: 1 } }
        @keyframes hsmsModalIn { from { opacity: 0; transform: translateY(10px) scale(.98) } to { opacity: 1; transform: none } }
      `}</style>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: SIZES[size] || SIZES.md, maxHeight: '90vh',
          display: 'flex', flexDirection: 'column',
          background: C.card, borderRadius: RADIUS.lg, overflow: 'hidden',
          boxShadow: '0 24px 64px rgba(26,18,9,0.34)', border: `1px solid ${C.border}`,
          animation: 'hsmsModalIn .24s cubic-bezier(.22,.61,.36,1)',
        }}
      >
        {/* Header */}
        {(title || icon) && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '18px 22px', borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
            {icon && <span style={{ fontSize: 22, lineHeight: 1, flexShrink: 0 }}>{icon}</span>}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: FONT.serif, fontSize: 18, fontWeight: 700, color: C.text, lineHeight: 1.25 }}>{title}</div>
              {subtitle && <div style={{ fontFamily: FONT.sans, fontSize: 12, color: C.textSub, marginTop: 2 }}>{subtitle}</div>}
            </div>
            <button onClick={onClose} aria-label="Đóng" style={{
              width: 32, height: 32, borderRadius: 9, flexShrink: 0, cursor: 'pointer',
              border: `1px solid ${C.border}`, background: C.bg, color: C.textSub,
              fontSize: 17, lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>✕</button>
          </div>
        )}

        {/* Body (cuộn) */}
        <div style={{ padding: '20px 22px', overflowY: 'auto', flex: 1 }}>
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, padding: '14px 22px', borderTop: `1px solid ${C.border}`, background: C.bg, flexShrink: 0 }}>
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  )
}
