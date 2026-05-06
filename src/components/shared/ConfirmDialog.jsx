import { LUX } from '../../constants/lux'

export default function ConfirmDialog({ open, title, message, note, confirmLabel, cancelLabel, onConfirm, onCancel, danger }) {
  if (!open) return null

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(42,32,26,0.6)',
      zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '20px', animation: 'confirm-fade-in 0.2s ease',
    }} onClick={onCancel}>
      <style>{`@keyframes confirm-fade-in{from{opacity:0}to{opacity:1}}@keyframes confirm-scale-in{from{transform:scale(0.92);opacity:0}to{transform:scale(1);opacity:1}}`}</style>
      <div style={{
        background: LUX.surface, borderRadius: LUX.radiusLg, width: '100%', maxWidth: '340px',
        padding: '28px 24px 20px', boxShadow: '0 20px 60px rgba(42,32,26,0.25)',
        animation: 'confirm-scale-in 0.25s cubic-bezier(0.22, 0.61, 0.36, 1)',
        textAlign: 'center',
      }} onClick={e => e.stopPropagation()}>
        {/* Icon */}
        <div style={{
          width: '64px', height: '64px', borderRadius: '20px',
          background: danger
            ? 'linear-gradient(135deg, #fef2f2, #fee2e2)'
            : 'linear-gradient(135deg, #f0fdf4, #dcfce7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '32px', margin: '0 auto 16px',
        }}>
          {danger ? '⚠️' : '💰'}
        </div>

        {/* Title */}
        <div style={{
          fontFamily: LUX.fontSerif, fontSize: '20px', fontWeight: 700,
          color: LUX.espresso, marginBottom: '8px', lineHeight: 1.3,
        }}>
          {title}
        </div>

        {/* Message */}
        <div style={{
          fontFamily: LUX.fontSans, fontSize: '13px', color: LUX.ink2,
          lineHeight: 1.6, marginBottom: note ? '6px' : '22px',
        }}>
          {message}
        </div>

        {/* Note */}
        {note && (
          <div style={{
            fontFamily: LUX.fontSans, fontSize: '10px', color: LUX.ink3,
            background: LUX.surface2, borderRadius: LUX.radiusSm,
            padding: '8px 12px', marginBottom: '22px',
            border: `1px solid ${LUX.line}`,
          }}>
            {note}
          </div>
        )}

        {/* Buttons */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={onCancel}
            style={{
              flex: 1, padding: '13px 16px',
              borderRadius: LUX.radius, border: `1px solid ${LUX.line}`,
              background: LUX.surface2, color: LUX.ink2,
              fontFamily: LUX.fontSans, fontWeight: 700, fontSize: '14px',
              cursor: 'pointer',
            }}>
            {cancelLabel || 'Huỷ'}
          </button>
          <button onClick={onConfirm}
            style={{
              flex: 2, padding: '13px 16px',
              borderRadius: LUX.radius, border: 'none',
              background: danger
                ? 'linear-gradient(135deg, #dc2626, #b91c1c)'
                : 'linear-gradient(135deg, #059669, #047857)',
              color: 'white',
              fontFamily: LUX.fontSans, fontWeight: 700, fontSize: '14px',
              cursor: 'pointer',
              boxShadow: danger
                ? '0 4px 16px rgba(220,38,38,0.3)'
                : '0 4px 16px rgba(5,150,105,0.3)',
            }}>
            {confirmLabel || 'Xác Nhận'}
          </button>
        </div>
      </div>
    </div>
  )
}
