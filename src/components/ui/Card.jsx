import { C, RADIUS, SPACE, FONT } from '../../constants/colors'

/** Card — khối nội dung chuẩn. title (tuỳ chọn) + children. */
export default function Card({ title, icon, right, children, pad = true, style }) {
  return (
    <div style={{ background: C.card, borderRadius: RADIUS.lg, border: `1px solid ${C.border}`, boxShadow: C.shadowSm, overflow: 'hidden', ...style }}>
      {(title || right) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '13px 18px', borderBottom: `1px solid ${C.border}` }}>
          {icon && <span style={{ fontSize: 17 }}>{icon}</span>}
          <div style={{ flex: 1, fontFamily: FONT.serif, fontSize: 16, fontWeight: 700, color: C.text }}>{title}</div>
          {right}
        </div>
      )}
      <div style={{ padding: pad ? SPACE.lg : 0 }}>{children}</div>
    </div>
  )
}
