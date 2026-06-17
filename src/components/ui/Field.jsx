import { C, FONT, RADIUS } from '../../constants/colors'

const base = {
  width: '100%', boxSizing: 'border-box',
  padding: '10px 14px', borderRadius: RADIUS.md, border: `1px solid ${C.border}`,
  fontSize: 13.5, fontFamily: FONT.sans, color: C.text, background: C.card, outline: 'none',
  transition: 'border-color .15s',
}

/** Field — nhãn + control. label trên, hint dưới (tuỳ chọn). */
export function Field({ label, hint, children, style }) {
  return (
    <div style={{ marginBottom: 14, ...style }}>
      {label && (
        <div style={{ fontFamily: FONT.sans, fontSize: 11, fontWeight: 700, color: C.textSub, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 6 }}>{label}</div>
      )}
      {children}
      {hint && <div style={{ fontSize: 11, color: C.textMute, marginTop: 5, fontStyle: 'italic' }}>{hint}</div>}
    </div>
  )
}

export function Input({ style, ...props }) {
  return <input {...props} style={{ ...base, ...style }} onFocus={e => (e.target.style.borderColor = C.primary)} onBlur={e => (e.target.style.borderColor = C.border)} />
}

export function Textarea({ style, rows = 3, ...props }) {
  return <textarea rows={rows} {...props} style={{ ...base, resize: 'vertical', ...style }} onFocus={e => (e.target.style.borderColor = C.primary)} onBlur={e => (e.target.style.borderColor = C.border)} />
}

export function Select({ style, children, ...props }) {
  return <select {...props} style={{ ...base, cursor: 'pointer', ...style }}>{children}</select>
}
