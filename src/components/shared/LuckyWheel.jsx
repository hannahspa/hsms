import { useState, useRef, useCallback, useId } from 'react'

// ═══════════════════════════════════════════════════════════════════════
// LuckyWheel — mô phỏng y hệt vòng quay MySpa
//   • 8 ô sặc sỡ · chữ màu theo ô · vành vàng 3D · đèn tròn to nhấp nháy
//   • items: [{ label, icon?, mau? }] · pickIndex(): chọn ô trúng theo xác suất
// ═══════════════════════════════════════════════════════════════════════

const MAU_O = ['#FFD400', '#00BCE4', '#ED1C24', '#FFFFFF', '#EC008C', '#FFC20E', '#8E24AA', '#FFFFFF']
const SO_DEN = 28
const DO_DEN = '#D81E2C'  // đỏ chữ trên nền sáng

function lum(hex) {
  const h = hex.replace('#', '')
  const r = parseInt(h.slice(0, 2), 16) / 255, g = parseInt(h.slice(2, 4), 16) / 255, b = parseInt(h.slice(4, 6), 16) / 255
  return 0.299 * r + 0.587 * g + 0.114 * b
}

export default function LuckyWheel({ items = [], onResult, pickIndex, size = 440, disabled = false }) {
  const [rot, setRot] = useState(0)
  const [busy, setBusy] = useState(false)
  const lockRef = useRef(false)
  const gid = 'w' + useId().replace(/[:]/g, '')

  const n = Math.max(items.length, 1)
  const seg = 360 / n
  const cx = 220, cy = 220, R = 176

  const polar = (ang, r) => {
    const a = (ang - 90) * Math.PI / 180
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)]
  }

  const spin = useCallback(() => {
    if (lockRef.current || disabled || !items.length) return
    lockRef.current = true; setBusy(true)
    const idx = (pickIndex ? pickIndex() : Math.floor(Math.random() * n)) % n
    const dichToi = (360 - (idx * seg + seg / 2)) % 360
    const vong = 360 * (9 + Math.floor(Math.random() * 3))
    const delta = ((dichToi - (rot % 360)) % 360 + 360) % 360
    setRot(rot + vong + delta)
    setTimeout(() => { setBusy(false); lockRef.current = false; onResult?.(items[idx], idx) }, 6100)
  }, [items, n, seg, rot, pickIndex, onResult, disabled])

  return (
    <div style={{ width: size, maxWidth: '100%', margin: '0 auto', position: 'relative', userSelect: 'none' }}>
      <svg viewBox="0 0 440 440" shapeRendering="geometricPrecision" style={{ width: '100%', display: 'block', filter: 'drop-shadow(0 10px 26px rgba(0,0,0,.28))' }}>
        <defs>
          <radialGradient id={`${gid}ring`} cx="50%" cy="42%" r="65%">
            <stop offset="0%" stopColor="#FFF1A8" /><stop offset="45%" stopColor="#FFD23F" />
            <stop offset="80%" stopColor="#F0A500" /><stop offset="100%" stopColor="#C8860B" />
          </radialGradient>
          <radialGradient id={`${gid}bulb`} cx="38%" cy="32%" r="70%">
            <stop offset="0%" stopColor="#FFFFFF" /><stop offset="45%" stopColor="#FFE57A" /><stop offset="100%" stopColor="#E0A100" />
          </radialGradient>
          <radialGradient id={`${gid}hub`} cx="38%" cy="32%" r="72%">
            <stop offset="0%" stopColor="#FFE07A" /><stop offset="55%" stopColor="#FF9D2E" /><stop offset="100%" stopColor="#E07B00" />
          </radialGradient>
        </defs>

        {/* Bánh xe + vành + đèn — QUAY CÙNG NHAU */}
        <g style={{ transformOrigin: '220px 220px', transform: `rotate(${rot}deg)`, transition: busy ? 'transform 6s cubic-bezier(0.13, 0.79, 0.05, 1)' : 'none' }}>
          {/* Vành vàng 3D */}
          <circle cx={cx} cy={cy} r={R + 44} fill="#A85800" />
          <circle cx={cx} cy={cy} r={R + 40} fill={`url(#${gid}ring)`} />
          <circle cx={cx} cy={cy} r={R + 10} fill="#9A4E00" />
          <circle cx={cx} cy={cy} r={R + 6} fill="#FFFFFF" />

          {/* Các ô */}
          {items.map((it, i) => {
            const [x0, y0] = polar(i * seg, R)
            const [x1, y1] = polar((i + 1) * seg, R)
            const large = seg > 180 ? 1 : 0
            const d = `M ${cx} ${cy} L ${x0.toFixed(2)} ${y0.toFixed(2)} A ${R} ${R} 0 ${large} 1 ${x1.toFixed(2)} ${y1.toFixed(2)} Z`
            const mid = i * seg + seg / 2
            const fill = it.mau || MAU_O[i % MAU_O.length]
            const tcol = lum(fill) > 0.45 ? DO_DEN : '#FFFFFF'
            const flip = mid > 90 && mid < 270
            const [lx, ly] = polar(mid, R * 0.60)
            return (
              <g key={i}>
                <path d={d} fill={fill} stroke="#FFFFFF" strokeWidth="2" strokeLinejoin="round" />
                <g transform={`translate(${lx.toFixed(2)} ${ly.toFixed(2)}) rotate(${flip ? mid + 90 : mid - 90})`}>
                  {it.icon && <text textAnchor="middle" x={flip ? -64 : 64} y="6" fontSize="20">{it.icon}</text>}
                  <text textAnchor="middle" y="6" fontSize={n > 8 ? 13 : 15} fontWeight="800"
                    fontFamily="'Lora','Playfair Display',serif" fill={tcol}
                    style={{ letterSpacing: '.2px' }}>{it.label}</text>
                </g>
              </g>
            )
          })}

          {/* Đèn nhấp nháy — gắn trên vành nên QUAY THEO */}
          {Array.from({ length: SO_DEN }, (_, i) => {
            const [bx, by] = polar((i * 360) / SO_DEN, R + 25)
            return (
              <circle key={i} cx={bx} cy={by} r="8.5" fill={`url(#${gid}bulb)`} stroke="#C8860B" strokeWidth="1">
                <animate attributeName="opacity" values="1;0.25;1" dur="0.9s" begin={i % 2 ? '0.45s' : '0s'} repeatCount="indefinite" />
              </circle>
            )
          })}
        </g>

        {/* Hub cố định ở giữa */}
        <circle cx={cx} cy={cy} r="44" fill="#FFFFFF" />
        <circle cx={cx} cy={cy} r="40" fill={`url(#${gid}hub)`} stroke="#C8860B" strokeWidth="2" />
      </svg>

      {/* Kim chỉ */}
      <div style={{
        position: 'absolute', top: '3%', left: '50%', transform: 'translateX(-50%)', zIndex: 5,
        width: 0, height: 0, borderLeft: '16px solid transparent', borderRight: '16px solid transparent',
        borderTop: '34px solid #E1141C', filter: 'drop-shadow(0 3px 4px rgba(0,0,0,.35))',
      }} />

      {/* Nút QUAY (đè lên hub) */}
      <button onClick={spin} disabled={busy || disabled}
        style={{
          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 6,
          width: '17%', height: '17%', borderRadius: '50%', border: 'none', cursor: busy ? 'default' : 'pointer',
          background: 'transparent', color: '#7A1A1A', fontWeight: 900, fontSize: size * 0.043, letterSpacing: '.5px',
          textShadow: '0 1px 1px rgba(255,255,255,.6)', display: 'grid', placeItems: 'center', opacity: busy ? 0.7 : 1,
        }}>
        {busy ? '…' : 'QUAY'}
      </button>
    </div>
  )
}
