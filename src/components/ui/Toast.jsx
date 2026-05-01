import { useEffect } from 'react'

export default function Toast({ msg, type, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3000)
    return () => clearTimeout(t)
  }, [])

  return (
    <div style={{
      position: 'fixed', top: '20px',
      left: '50%', transform: 'translateX(-50%)',
      background: type === 'success' ? '#2D7A4F' : '#C0392B',
      color: 'white', padding: '12px 24px',
      borderRadius: '24px', fontSize: '13px',
      fontWeight: '600', zIndex: 9999,
      boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
      animation: 'slideDown 0.3s ease'
    }}>
      {type === 'success' ? '✅ ' : '❌ '}{msg}
      <style>{`@keyframes slideDown{from{opacity:0;transform:translateX(-50%) translateY(-10px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}`}</style>
    </div>
  )
}
