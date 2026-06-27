import { useState, useRef, useCallback, useId } from 'react'

// ═══════════════════════════════════════════════════════════════════════
// LuckyWheel — Bánh xe quay may mắn SẶC SỠ + đèn chớp nháy (kiểu hội chợ)
//   • Nhiều màu rực rỡ · to · quay mượt · viền đèn LED nhấp nháy
//   • items: [{ label, icon?, mau? }]  ·  pickIndex(): chọn ô trúng theo xác suất
// ═══════════════════════════════════════════════════════════════════════

const MAU_O = ['#E84118', '#F39C12', '#FBC531', '#44BD32', '#00A8A8', '#0097E6', '#8C7AE6', '#E84393']
const SO_DEN = 24

export default function LuckyWheel({ items = [], onResult, pickIndex, size = 420, disabled = false }) {
  const [rot, setRot] = useState(0)
  const [busy, setBusy] = useState(false)
  const lockRef = useRef(false)
  const uid = useId().replace(/[:]/g, '')

  const n = Math.max(items.length, 1)
  const seg = 360 / n
  const cx = 200, cy = 200, R = 178

  const polar = (ang, r) => {
    const a = (ang - 90) * Math.PI / 180
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)]
  }

  const spin = useCallback(() => {
    if (lockRef.current || disabled || !items.length) return
    lockRef.current = true
    setBusy(true)
    const idx = (pickIndex ? pickIndex() : Math.floor(Math.random() * n)) % n
    const dichToi = (360 - (idx * seg + seg / 2)) % 360
    const vong = 360 * (9 + Math.floor(Math.random() * 3))
    const delta = ((dichToi - (rot % 360)) % 360 + 360) % 360
    setRot(rot + vong + delta)
    setTimeout(() => {
      setBusy(false); lockRef.current = false
      onResult?.(items[idx], idx)
    }, 6100)
  }, [items, n, seg, rot, pickIndex, onResult, disabled])

  const den = Array.from({ length: SO_DEN }, (_, i) => {
    const ang = (i * 360) / SO_DEN
    return (
      <div key={i} className={`hw-bulb ${uid} ${i % 2 ? 'odd' : 'even'}`}
        style={{ transform: `rotate(${ang}deg) translateY(-${size / 2 - 9}px)` }} />
    )
  })

  return (
    <div style={{ width: size, maxWidth: '100%', margin: '0 auto', userSelect: 'none' }}>
      <style>{`
        @keyframes hw-blink-${uid} { 0%,100%{opacity:1;box-shadow:0 0 10px 3px #FFE57A,0 0 4px 1px #fff} 50%{opacity:.28;box-shadow:0 0 3px 0 #C9931F} }
        .hw-wrap-${uid}{position:relative;width:100%;padding-bottom:100%;}
        .hw-bulb.${uid}{position:absolute;top:50%;left:50%;width:13px;height:13px;margin:-6.5px;border-radius:50%;
          background:radial-gradient(circle at 35% 30%,#FFFDF0,#FFD23F 60%,#E59400);animation:hw-blink-${uid} .9s infinite ease-in-out;}
        .hw-bulb.${uid}.odd{animation-delay:.45s}
      `}</style>

      <div className={`hw-wrap-${uid}`}>
        {/* Vành đèn nhấp nháy (cố định, không quay) */}
        {den}

        {/* Kim chỉ */}
        <div style={{
          position: 'absolute', top: '1%', left: '50%', transform: 'translateX(-50%)', zIndex: 8,
          width: 0, height: 0, borderLeft: '17px solid transparent', borderRight: '17px solid transparent',
          borderTop: '34px solid #E1141C', filter: 'drop-shadow(0 3px 5px rgba(0,0,0,.35))',
        }} />
        <div style={{
          position: 'absolute', top: '0.5%', left: '50%', transform: 'translateX(-50%)', zIndex: 9,
          width: 16, height: 16, borderRadius: '50%', background: '#fff', border: '3px solid #E1141C',
        }} />

        {/* Bánh xe quay */}
        <svg viewBox="0 0 400 400" shapeRendering="geometricPrecision"
          style={{
            position: 'absolute', top: '6%', left: '6%', width: '88%', height: '88%', zIndex: 4,
            transform: `rotate(${rot}deg)`,
            transition: busy ? 'transform 6s cubic-bezier(0.12, 0.78, 0.06, 1)' : 'none',
            filter: 'drop-shadow(0 8px 22px rgba(0,0,0,.3))',
          }}>
          {/* vành ngoài che mép */}
          <circle cx={cx} cy={cy} r={R + 16} fill="#FFFFFF" />
          <circle cx={cx} cy={cy} r={R + 11} fill="#7D1A1A" />
          <circle cx={cx} cy={cy} r={R + 5} fill="#FFD23F" />
          {items.map((it, i) => {
            const [x0, y0] = polar(i * seg, R)
            const [x1, y1] = polar((i + 1) * seg, R)
            const large = seg > 180 ? 1 : 0
            const d = `M ${cx} ${cy} L ${x0.toFixed(2)} ${y0.toFixed(2)} A ${R} ${R} 0 ${large} 1 ${x1.toFixed(2)} ${y1.toFixed(2)} Z`
            const mid = i * seg + seg / 2
            const [lx, ly] = polar(mid, R * 0.66)
            const fill = it.mau || MAU_O[i % MAU_O.length]
            const flip = mid > 90 && mid < 270
            return (
              <g key={i}>
                <path d={d} fill={fill} stroke="#FFFFFF" strokeWidth="2" strokeLinejoin="round" />
                <g transform={`translate(${lx.toFixed(2)} ${ly.toFixed(2)}) rotate(${flip ? mid + 180 : mid})`}>
                  {it.icon && <text textAnchor="middle" y="-11" fontSize="22">{it.icon}</text>}
                  <text textAnchor="middle" y="7" fontSize={n > 8 ? 12 : 14} fontWeight="900"
                    fill="#FFFFFF" style={{ paintOrder: 'stroke', stroke: 'rgba(0,0,0,.22)', strokeWidth: 2.5, letterSpacing: '.3px' }}>
                    {it.label}
                  </text>
                </g>
              </g>
            )
          })}
          <circle cx={cx} cy={cy} r="40" fill="#FFFFFF" stroke="#7D1A1A" strokeWidth="4" />
        </svg>

        {/* Nút QUAY giữa */}
        <button onClick={spin} disabled={busy || disabled}
          style={{
            position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 7,
            width: '19%', height: '19%', borderRadius: '50%', border: '4px solid #fff', cursor: busy ? 'default' : 'pointer',
            background: 'radial-gradient(circle at 38% 32%, #FF6B5B, #E1141C 65%, #B00C12)', color: '#fff',
            fontWeight: 900, fontSize: size * 0.05, letterSpacing: '.5px',
            boxShadow: '0 5px 16px rgba(177,12,18,.55)', display: 'grid', placeItems: 'center',
            opacity: busy ? 0.9 : 1,
          }}>
          {busy ? '…' : 'QUAY'}
        </button>
      </div>
    </div>
  )
}
