import { createPortal } from 'react-dom'
import { LUX } from '../../constants/lux'

// ── PANEL CHUẨN HSMS ──
// Panel trượt từ phải, full chiều cao, bám sát mép menu trái (var --side-w).
// Dùng cho mọi popup hiển thị NỘI DUNG / BIỂU MẪU (không dùng cho hộp xác nhận nhỏ).
// Render qua createPortal(body) để position:fixed bám viewport (tránh ancestor transform).
//
// Props:
//   open      : boolean
//   onClose   : () => void  (bấm nền / nút ✕)
//   title, subtitle : header mặc định (nền gradient)
//   headerGrad: override màu nền header
//   headerExtra: node chèn trước nút ✕ (vd badge trạng thái)
//   header    : node thay TOÀN BỘ header mặc định (nếu cần tuỳ biến)
//   footer    : node cố định ở đáy (nút hành động)
//   bodyStyle : style ghi đè cho vùng nội dung cuộn
//   zIndex    : mặc định 10000
//   children  : nội dung

let _kf = false
function ensureKf() {
  if (_kf || typeof document === 'undefined') return
  _kf = true
  const s = document.createElement('style')
  s.textContent = '@keyframes rpSlideIn{from{transform:translateX(100%)}to{transform:translateX(0)}}'
  document.head.appendChild(s)
}

export default function RightPanel({
  open, onClose, title, subtitle, headerGrad, headerExtra, header, footer,
  bodyStyle, zIndex = 10000, children,
}) {
  if (!open) return null
  ensureKf()
  return createPortal(
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(42,32,26,0.4)', zIndex }}
      onClick={onClose}>
      <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: 'calc(100vw - var(--side-w, 248px))', maxWidth: '100vw', background: LUX.bg, display: 'flex', flexDirection: 'column', boxShadow: '-6px 0 40px rgba(42,32,26,0.28)', animation: 'rpSlideIn .22s ease' }}
        onClick={e => e.stopPropagation()}>

        {header !== undefined ? header : (title || onClose) && (
          <div style={{ background: headerGrad || LUX.heroGrad, padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              {title && <div style={{ fontFamily: LUX.fontSerif, fontWeight: 600, fontSize: 22, color: 'white', lineHeight: 1.2 }}>{title}</div>}
              {subtitle && <div style={{ fontFamily: LUX.fontSans, fontSize: 12.5, color: 'rgba(255,255,255,0.8)', marginTop: 3 }}>{subtitle}</div>}
            </div>
            {headerExtra}
            <button onClick={onClose} title="Đóng"
              style={{ width: 36, height: 36, borderRadius: 11, border: '1px solid rgba(255,255,255,0.35)', background: 'rgba(255,255,255,0.15)', color: 'white', fontSize: 19, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1, flexShrink: 0 }}>×</button>
          </div>
        )}

        <div style={{ flex: 1, overflowY: 'auto', padding: '18px 24px', ...bodyStyle }}>
          {children}
        </div>

        {footer && (
          <div style={{ flexShrink: 0, borderTop: `1px solid ${LUX.line}`, background: LUX.bg, padding: '14px 24px' }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  , document.body)
}
