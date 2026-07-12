import { useState } from 'react'
import { COLORS } from '../../constants/colors'

export default function FABMenu({ onSelect }) {
  const [open, setOpen] = useState(false)

  const options = [
    { id: 'thu', icon: '💰', label: 'Doanh Thu',         bg: 'linear-gradient(135deg,#F0FDF4,#DCFCE7)', color: '#2D7A4F' },
    { id: 'chi', icon: '💸', label: 'Chi Phí',           bg: 'linear-gradient(135deg,#FFF5F5,#FFE4E4)', color: '#C0392B' },
    { id: 'ck',  icon: '🔄', label: 'Chuyển Khoản Nội Bộ', bg: 'linear-gradient(135deg,#EFF6FF,#DBEAFE)', color: '#1A5276' },
  ]

  return (
    <>
      {/* Overlay */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 97 }}
        />
      )}

      {/* Popup menu */}
      {open && (
        <div style={{
          position: 'fixed',
          bottom: '90px',
          left: '50%', transform: 'translateX(-50%)',
          backgroundColor: 'white',
          borderRadius: '20px',
          padding: '8px',
          boxShadow: '0 8px 32px rgba(139,94,60,0.25)',
          border: 'rgba(160,113,79,0.12)',
          zIndex: 98,
          width: '240px',
          animation: 'popUp 0.2s ease'
        }}>
          {options.map((opt, _i) => (
            <button
              key={opt.id}
              onClick={() => { onSelect(opt.id); setOpen(false) }}
              style={{
                display: 'flex', alignItems: 'center', gap: '14px',
                width: '100%', padding: '12px 14px',
                background: 'none', border: 'none',
                borderRadius: '14px', cursor: 'pointer',
                transition: 'background 0.15s'
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#FAF7F4'}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}
            >
              <div style={{
                width: '40px', height: '40px', borderRadius: '12px',
                background: opt.bg, display: 'flex',
                alignItems: 'center', justifyContent: 'center', fontSize: '20px'
              }}>{opt.icon}</div>
              <span style={{ fontWeight: '600', fontSize: '14px', color: opt.color }}>
                {opt.label}
              </span>
            </button>
          ))}
          {/* Arrow down */}
          <div style={{
            position: 'absolute', bottom: '-8px',
            left: '50%', transform: 'translateX(-50%)',
            width: 0, height: 0,
            borderLeft: '8px solid transparent',
            borderRight: '8px solid transparent',
            borderTop: '8px solid white'
          }} />
        </div>
      )}

      {/* FAB Button */}
      <button
        onClick={() => setOpen(!open)}
        style={{
          position: 'absolute', top: '-28px',
          width: '52px', height: '52px', borderRadius: '50%',
          background: open ? COLORS.grad : 'white',
          color: open ? 'white' : '#A0714F',
          fontSize: '28px', border: 'none', cursor: 'pointer',
          boxShadow: '0 4px 16px rgba(139,94,60,0.35)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          lineHeight: 1, transition: 'all 0.2s',
          transform: open ? 'rotate(45deg)' : 'rotate(0deg)'
        }}
        onMouseEnter={e => { if (!open) { e.currentTarget.style.transform = 'scale(1.12)'; e.currentTarget.style.boxShadow = '0 6px 24px rgba(139,94,60,0.5)' }}}
        onMouseLeave={e => { if (!open) { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(139,94,60,0.35)' }}}
      >+</button>
      <style>{`@keyframes popUp{from{opacity:0;transform:translateX(-50%) translateY(10px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}`}</style>
    </>
  )
}
