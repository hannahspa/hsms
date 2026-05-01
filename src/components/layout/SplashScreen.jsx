import { useEffect, useState } from 'react'
import { COLORS } from '../../constants/colors'

export default function SplashScreen({ onDone }) {
  const [fade, setFade] = useState(false)

  useEffect(() => {
    const t1 = setTimeout(() => setFade(true), 1800)
    const t2 = setTimeout(() => onDone(), 2400)
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
      <div style={{
        width: '220px', height: '220px', borderRadius: '50%',
        background: 'rgba(255,255,255,0.08)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: '24px',
        boxShadow: '0 0 60px rgba(201,169,110,0.3), 0 0 120px rgba(201,169,110,0.15)'
      }}>
        <img src="/logo.png" alt="Hannah" style={{
          width: '180px',
          filter: 'brightness(0) saturate(100%) invert(90%) sepia(20%) saturate(400%) hue-rotate(5deg) brightness(110%)'
        }} />
      </div>
      <div style={{
        color: 'rgba(255,255,255,0.85)', fontSize: '13px',
        fontStyle: 'italic', letterSpacing: '2px', textAlign: 'center'
      }}>
        Giữ Mãi Nét Thanh Xuân Của Bạn
      </div>
      <div style={{ display: 'flex', gap: '6px', marginTop: '40px' }}>
        {[0,1,2].map(i => (
          <div key={i} style={{
            width: '6px', height: '6px', borderRadius: '50%',
            backgroundColor: 'rgba(255,255,255,0.5)',
            animation: `pulse 1.2s ease-in-out ${i*0.2}s infinite`
          }} />
        ))}
      </div>
      <style>{`@keyframes pulse{0%,100%{opacity:0.3;transform:scale(0.8)}50%{opacity:1;transform:scale(1.2)}}`}</style>
    </div>
  )
}
