import { useState, useRef, useCallback } from 'react'

// ═══════════════════════════════════════════════════════════════════════
// LuckyWheel — Bánh xe quay may mắn (Hannah Luxury)
// Dùng chung: POS (khách mua thẻ → quay), Mini App, trang Khuyến Mãi.
//
// props:
//   items   : [{ label, icon?, mau? }]  — danh sách ô (2..12 ô)
//   onResult: (item, index) => void     — gọi khi quay xong
//   pickIndex: () => number             — (tuỳ chọn) chọn ô trúng theo xác suất; mặc định ngẫu nhiên
//   size    : px (mặc định 340)
// ═══════════════════════════════════════════════════════════════════════

const MAU_O = ['#C9A96E', '#7D5A3C', '#B08A55', '#A0714F'] // gold ↔ nâu luân phiên
const VIEN = '#8B5E3C'

export default function LuckyWheel({ items = [], onResult, pickIndex, size = 340, disabled = false }) {
  const [rot, setRot] = useState(0)
  const [busy, setBusy] = useState(false)
  const lockRef = useRef(false)

  const n = Math.max(items.length, 1)
  const seg = 360 / n
  const cx = 150, cy = 150, R = 146

  const polar = (ang, r) => {
    const a = (ang - 90) * Math.PI / 180
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)]
  }

  const spin = useCallback(() => {
    if (lockRef.current || disabled || !items.length) return
    lockRef.current = true
    setBusy(true)
    const idx = (pickIndex ? pickIndex() : Math.floor(Math.random() * n)) % n
    // đưa giữa ô idx lên đỉnh (kim chỉ ở top)
    const dichToi = (360 - (idx * seg + seg / 2)) % 360
    const vong = 360 * (6 + Math.floor(Math.random() * 2))
    const delta = ((dichToi - (rot % 360)) % 360 + 360) % 360
    const newRot = rot + vong + delta
    setRot(newRot)
    setTimeout(() => {
      setBusy(false); lockRef.current = false
      onResult?.(items[idx], idx)
    }, 4700)
  }, [items, n, seg, rot, pickIndex, onResult, disabled])

  // chấm bi trang trí quanh vành
  const dots = Array.from({ length: n * 2 }, (_, i) => {
    const [x, y] = polar((i * 360) / (n * 2), R + 2)
    return <circle key={i} cx={x} cy={y} r="3.2" fill="#FFF7EC" opacity={i % 2 ? 0.55 : 0.95} />
  })

  return (
    <div style={{ width: size, maxWidth: '100%', margin: '0 auto', userSelect: 'none' }}>
      <div style={{ position: 'relative', width: '100%', paddingBottom: '100%' }}>
        {/* Kim chỉ (top) */}
        <div style={{
          position: 'absolute', top: -6, left: '50%', transform: 'translateX(-50%)', zIndex: 5,
          width: 0, height: 0, borderLeft: '15px solid transparent', borderRight: '15px solid transparent',
          borderTop: `26px solid ${C_chi()}`, filter: 'drop-shadow(0 3px 4px rgba(0,0,0,.28))',
        }} />

        {/* Bánh xe */}
        <svg viewBox="0 0 300 300" style={{
          position: 'absolute', inset: 0, width: '100%', height: '100%',
          transform: `rotate(${rot}deg)`,
          transition: busy ? 'transform 4.6s cubic-bezier(0.15, 0.9, 0.18, 1)' : 'none',
          filter: 'drop-shadow(0 10px 26px rgba(125,90,60,.32))',
        }}>
          <circle cx={cx} cy={cy} r={R + 6} fill={VIEN} />
          {items.map((it, i) => {
            const [x0, y0] = polar(i * seg, R)
            const [x1, y1] = polar((i + 1) * seg, R)
            const large = seg > 180 ? 1 : 0
            const d = `M ${cx} ${cy} L ${x0.toFixed(2)} ${y0.toFixed(2)} A ${R} ${R} 0 ${large} 1 ${x1.toFixed(2)} ${y1.toFixed(2)} Z`
            const mid = i * seg + seg / 2
            const [lx, ly] = polar(mid, R * 0.64)
            const fill = it.mau || MAU_O[i % MAU_O.length]
            return (
              <g key={i}>
                <path d={d} fill={fill} stroke="rgba(255,255,255,.45)" strokeWidth="1.2" />
                <g transform={`translate(${lx.toFixed(2)} ${ly.toFixed(2)}) rotate(${(mid > 90 && mid < 270) ? mid + 180 : mid})`}>
                  <text textAnchor="middle" dominantBaseline="middle" fontSize={n > 8 ? 9 : 11} fontWeight="800"
                    fill="#FFFCF6" style={{ letterSpacing: '.2px' }}>
                    {it.icon ? it.icon + '  ' : ''}{it.label}
                  </text>
                </g>
              </g>
            )
          })}
          {dots}
          <circle cx={cx} cy={cy} r="30" fill="#FFFCF6" stroke={VIEN} strokeWidth="3" />
        </svg>

        {/* Nút QUAY ở giữa */}
        <button onClick={spin} disabled={busy || disabled}
          style={{
            position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 6,
            width: '21%', height: '21%', borderRadius: '50%', border: '3px solid #fff', cursor: busy ? 'default' : 'pointer',
            background: 'linear-gradient(135deg,#C9A96E,#A0714F 55%,#7D5A3C)', color: '#fff',
            fontWeight: 900, fontSize: size * 0.045, lineHeight: 1.1, letterSpacing: '.5px',
            boxShadow: '0 4px 14px rgba(125,90,60,.45)', display: 'grid', placeItems: 'center',
            opacity: busy ? 0.85 : 1, transition: 'transform .12s',
          }}>
          {busy ? '...' : 'QUAY'}
        </button>
      </div>
    </div>
  )
}

function C_chi() { return '#C0392B' }
