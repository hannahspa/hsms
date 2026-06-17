import { C, FONT, RADIUS } from '../../constants/colors'

/**
 * Button — nút chuẩn HSMS.
 * variant: 'primary'(gradient gold) | 'secondary'(viền) | 'danger'(đỏ) | 'ghost' | 'success'
 * size: 'sm' | 'md' | 'lg'  ·  block: full width  ·  icon: node trước label
 */
const PADS = { sm: '7px 14px', md: '10px 18px', lg: '13px 22px' }
const FS   = { sm: 12.5, md: 13.5, lg: 14.5 }

function styleFor(variant) {
  switch (variant) {
    case 'secondary': return { background: C.card, color: C.primary, border: `1px solid ${C.border}` }
    case 'danger':    return { background: 'linear-gradient(135deg,#E74C3C,#C0392B)', color: '#fff', border: 'none', boxShadow: '0 4px 14px rgba(192,57,43,.28)' }
    case 'success':   return { background: 'linear-gradient(135deg,#2D7A4F,#1f5c3a)', color: '#fff', border: 'none', boxShadow: '0 4px 14px rgba(45,122,79,.28)' }
    case 'ghost':     return { background: 'transparent', color: C.textSub, border: 'none' }
    default:          return { background: C.grad, color: '#fff', border: 'none', boxShadow: '0 4px 14px rgba(160,113,79,.30)' }
  }
}

export default function Button({ variant = 'primary', size = 'md', block, icon, children, disabled, style, ...props }) {
  return (
    <button
      disabled={disabled}
      style={{
        ...styleFor(variant),
        padding: PADS[size], borderRadius: RADIUS.full, fontFamily: FONT.sans, fontWeight: 700, fontSize: FS[size],
        cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.55 : 1,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7,
        width: block ? '100%' : undefined, transition: 'filter .15s, transform .05s', whiteSpace: 'nowrap',
        ...style,
      }}
      {...props}
    >
      {icon && <span style={{ display: 'inline-flex', fontSize: 15 }}>{icon}</span>}
      {children}
    </button>
  )
}
