import { useEffect, useState } from 'react'
import { COLORS } from '../../constants/colors'

export default function SplashScreen({ onDone }) {
  const [fade, setFade] = useState(false)

  useEffect(() => {
    const t1 = setTimeout(() => setFade(true), 2000)
    const t2 = setTimeout(() => onDone(), 2600)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [])

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: COLORS.grad,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      zIndex: 999,
      opacity: fade ? 0 : 1,
      transition: 'opacity 0.6s ease',
    }}>
      <style>{`
        @keyframes pulse{0%,100%{opacity:0.3;transform:scale(0.8)}50%{opacity:1;transform:scale(1.2)}}
        @keyframes splash-logo-in {
          0%   { opacity: 0; transform: scale(0.85); }
          60%  { opacity: 1; transform: scale(1.02); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes splash-text-in {
          0%   { opacity: 0; transform: translateY(10px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .splash-logo    { opacity: 0; animation: splash-logo-in 0.7s cubic-bezier(0.22,0.61,0.36,1) 0.1s forwards; }
        .splash-tagline { opacity: 0; animation: splash-text-in 0.5s ease 0.6s forwards; }
        .splash-title   { opacity: 0; animation: splash-text-in 0.55s ease 0.9s forwards; }
        .splash-dots    { opacity: 0; animation: splash-text-in 0.4s ease 1.2s forwards; }
      `}</style>

      <div className="splash-logo" style={{
        width: '180px', height: '180px', borderRadius: '50%',
        background: 'rgba(255,255,255,0.08)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: '20px',
        boxShadow: '0 0 60px rgba(201,169,110,0.3), 0 0 120px rgba(201,169,110,0.15)'
      }}>
        <img src="/logo.png" alt="Hannah" style={{
          width: '150px',
          filter: 'brightness(0) saturate(100%) invert(90%) sepia(20%) saturate(400%) hue-rotate(5deg) brightness(110%)'
        }} />
      </div>

      <div className="splash-tagline" style={{
        color: 'rgba(255,255,255,0.75)', fontSize: '12px',
        fontStyle: 'italic', letterSpacing: '2px', textAlign: 'center',
        marginBottom: '18px',
      }}>
        Giữ Mãi Nét Thanh Xuân Của Bạn
      </div>

      <div className="splash-title" style={{
        color: '#FFFBF5', fontSize: '32px', fontWeight: '800',
        letterSpacing: '6px', textAlign: 'center',
        textShadow: '0 2px 12px rgba(0,0,0,0.15)',
        marginBottom: '32px',
      }}>
        SỔ THU CHI
      </div>

      <div className="splash-dots" style={{ display: 'flex', gap: '6px' }}>
        {[0,1,2].map(i => (
          <div key={i} style={{
            width: '6px', height: '6px', borderRadius: '50%',
            backgroundColor: 'rgba(255,255,255,0.5)',
            animation: `pulse 1.2s ease-in-out ${i*0.2}s infinite`
          }} />
        ))}
      </div>
    </div>
  )
}
