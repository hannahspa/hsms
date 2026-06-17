// ═══════════════════════════════════════════════════════════════════════════════
// notify + confirmDialog — tiện ích thông báo/xác nhận IMPERATIVE dùng chung
// Gọi từ bất cứ đâu (admin / internal / pos / checkin) không cần Provider.
// Tự mount vào document.body → thay alert()/window.confirm() thô.
// Theo Design System HSMS (token C / FONT / RADIUS).
// ═══════════════════════════════════════════════════════════════════════════════
import { C, FONT, RADIUS } from '../../constants/colors'

let stylesInjected = false
function injectStyles() {
  if (stylesInjected) return
  stylesInjected = true
  const s = document.createElement('style')
  s.textContent = `
    @keyframes hsmsToastIn { from { opacity:0; transform:translateY(-10px) } to { opacity:1; transform:none } }
    @keyframes hsmsOverlayIn { from { opacity:0 } to { opacity:1 } }
    @keyframes hsmsBoxIn { from { opacity:0; transform:translateY(10px) scale(.98) } to { opacity:1; transform:none } }
  `
  document.head.appendChild(s)
}

let toastHost
function getToastHost() {
  if (toastHost && document.body.contains(toastHost)) return toastHost
  injectStyles()
  toastHost = document.createElement('div')
  toastHost.style.cssText = 'position:fixed;top:20px;left:50%;transform:translateX(-50%);z-index:100050;display:flex;flex-direction:column;gap:8px;align-items:center;pointer-events:none'
  document.body.appendChild(toastHost)
  return toastHost
}

/**
 * notify(msg, type) — toast nổi giữa-trên màn hình, tự ẩn sau ~2.8s.
 * type: 'success' (mặc định) | 'error' | 'warn'
 */
export function notify(msg, type = 'success') {
  const host = getToastHost()
  const el = document.createElement('div')
  const isOk = type === 'success'
  const isWarn = type === 'warn' || type === 'info'
  const bg = isOk ? C.thu : isWarn ? C.primary : C.chi
  const icon = isOk ? '✅' : isWarn ? 'ℹ️' : '❌'
  el.textContent = `${icon}  ${msg}`
  el.style.cssText = `background:${bg};color:#fff;padding:12px 22px;border-radius:${RADIUS.full}px;font:600 13px ${FONT.sans};box-shadow:0 8px 28px rgba(0,0,0,.22);animation:hsmsToastIn .28s cubic-bezier(.22,.61,.36,1);max-width:90vw;text-align:center;pointer-events:auto`
  host.appendChild(el)
  setTimeout(() => {
    el.style.transition = 'opacity .25s, transform .25s'
    el.style.opacity = '0'
    el.style.transform = 'translateY(-8px)'
    setTimeout(() => el.remove(), 260)
  }, 2800)
}
notify.success = (m) => notify(m, 'success')
notify.error = (m) => notify(m, 'error')
notify.warn = (m) => notify(m, 'warn')

/**
 * confirmDialog(opts) → Promise<boolean>
 * opts: { title, message, note, confirmLabel, cancelLabel, danger }
 * Dùng: if (!(await confirmDialog({ message:'Xoá?', danger:true }))) return
 */
export function confirmDialog(opts = {}) {
  const {
    title = 'Xác nhận', message = '', note = '',
    confirmLabel = 'Xác Nhận', cancelLabel = 'Huỷ', danger = false,
  } = opts
  injectStyles()
  return new Promise((resolve) => {
    const overlay = document.createElement('div')
    overlay.style.cssText = `position:fixed;inset:0;z-index:100060;background:rgba(26,18,9,.42);backdrop-filter:blur(3px);-webkit-backdrop-filter:blur(3px);display:flex;align-items:center;justify-content:center;padding:20px;animation:hsmsOverlayIn .2s ease`

    const box = document.createElement('div')
    box.style.cssText = `width:100%;max-width:420px;background:${C.card};border-radius:${RADIUS.lg}px;overflow:hidden;box-shadow:0 24px 64px rgba(26,18,9,.34);border:1px solid ${C.border};animation:hsmsBoxIn .24s cubic-bezier(.22,.61,.36,1);font-family:${FONT.sans}`

    const confirmBg = danger ? 'linear-gradient(135deg,#E74C3C,#C0392B)' : 'linear-gradient(135deg,#2D7A4F,#1f5c3a)'
    box.innerHTML = `
      <div style="display:flex;align-items:center;gap:12px;padding:18px 22px;border-bottom:1px solid ${C.border}">
        <span style="font-size:22px;line-height:1">${danger ? '⚠️' : '❓'}</span>
        <div style="font-family:${FONT.serif};font-size:18px;font-weight:700;color:${C.text}">${title}</div>
      </div>
      <div style="padding:20px 22px;font-size:13.5px;color:${C.textSub};line-height:1.6">${message}
        ${note ? `<div style="display:flex;gap:7px;margin-top:12px;font-size:11.5px;color:${C.textMute};font-style:italic;line-height:1.5"><span>💡</span><span>${note}</span></div>` : ''}
      </div>
      <div style="display:flex;justify-content:flex-end;gap:10px;padding:14px 22px;border-top:1px solid ${C.border};background:${C.bg}">
        <button data-act="cancel" style="background:${C.card};color:${C.primary};border:1px solid ${C.border};padding:10px 18px;border-radius:${RADIUS.full}px;font:700 13.5px ${FONT.sans};cursor:pointer">${cancelLabel}</button>
        <button data-act="ok" style="background:${confirmBg};color:#fff;border:none;padding:10px 18px;border-radius:${RADIUS.full}px;font:700 13.5px ${FONT.sans};cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,.18)">${confirmLabel}</button>
      </div>`

    const close = (val) => {
      window.removeEventListener('keydown', onKey)
      overlay.remove()
      resolve(val)
    }
    const onKey = (e) => { if (e.key === 'Escape') close(false); if (e.key === 'Enter') close(true) }

    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(false) })
    box.querySelector('[data-act="cancel"]').addEventListener('click', () => close(false))
    box.querySelector('[data-act="ok"]').addEventListener('click', () => close(true))
    window.addEventListener('keydown', onKey)

    overlay.appendChild(box)
    document.body.appendChild(overlay)
  })
}

export default notify
