import { useState, useEffect } from 'react'
import CheckinLogin from './CheckinLogin'
import CheckinHome from './CheckinHome'
import { checkinApi, getToken } from './checkinApi'
import { LUX } from '../../constants/lux'

export default function CheckinApp() {
  const [nhanVien, setNhanVien] = useState(null)
  const [booting, setBooting]   = useState(true)

  // Khôi phục phiên đăng nhập cũ (token còn hạn) → không phải nhập PIN lại
  useEffect(() => {
    if (!getToken()) { setBooting(false); return }
    checkinApi.me()
      .then(nv => { if (nv) setNhanVien(nv) })
      .finally(() => setBooting(false))
  }, [])

  const handleLogout = async () => {
    await checkinApi.dangXuat()
    setNhanVien(null)
  }

  if (booting) return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: LUX.bg, fontFamily: LUX.fontSans, color: LUX.ink3 }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 28, marginBottom: 10 }}>🌸</div>
        <div style={{ fontSize: 13 }}>Đang tải...</div>
      </div>
    </div>
  )

  if (!nhanVien) return <CheckinLogin onLogin={setNhanVien} />

  return <CheckinHome nhanVien={nhanVien} onLogout={handleLogout} />
}
