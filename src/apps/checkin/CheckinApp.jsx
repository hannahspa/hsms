import { useState } from 'react'
import CheckinLogin from './CheckinLogin'
import CheckinHome from './CheckinHome'

export default function CheckinApp() {
  const [nhanVien, setNhanVien] = useState(null)

  if (!nhanVien) return (
    <CheckinLogin onLogin={setNhanVien} />
  )

  return (
    <CheckinHome
      nhanVien={nhanVien}
      onLogout={() => setNhanVien(null)}
    />
  )
}