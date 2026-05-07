import { AuthProvider, useAuth } from './context/AuthContext'
import { AppProvider }  from './context/AppContext'
import InternalApp from './apps/internal/InternalApp'
import CheckinApp from './apps/checkin/CheckinApp'
import AdminApp from './apps/admin/AdminApp'
import LandingPage from './apps/website/LandingPage'
import HomePage from './apps/website/HomePage'
import LoginPage from './apps/auth/LoginPage'

function RequireAuth({ children, requireAdmin }) {
  const { user, loading, logout } = useAuth()
  const path = window.location.pathname

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FAF7F4', fontFamily: 'sans-serif' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '28px', marginBottom: '12px' }}>🌸</div>
        <div style={{ color: '#A0714F', fontWeight: '700', fontSize: '15px' }}>Hannah Beauty & Spa</div>
        <div style={{ color: '#B8A898', fontSize: '13px', marginTop: '6px' }}>Đang tải hệ thống...</div>
      </div>
    </div>
  )

  if (!user) return <LoginPage />

  // Admin vào /checkin → redirect về /admin (không chặn /SoThuChi)
  if (user.vai_tro === 'admin' && path.startsWith('/checkin')) {
    window.location.replace('/admin')
    return null
  }

  // Không phải admin cố vào /admin
  if (requireAdmin && user.vai_tro !== 'admin') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FAF7F4', padding: '20px', fontFamily: 'sans-serif' }}>
        <div style={{ textAlign: 'center', maxWidth: '320px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>⛔</div>
          <div style={{ fontWeight: '800', fontSize: '18px', color: '#1A1209', marginBottom: '8px' }}>Không có quyền truy cập</div>
          <div style={{ color: '#8B7355', fontSize: '14px', marginBottom: '24px' }}>Trang này chỉ dành cho Quản trị viên.</div>
          <button onClick={() => window.location.replace('/SoThuChi')}
            style={{ padding: '12px 24px', background: 'linear-gradient(135deg, #C9A96E 0%, #A0714F 100%)', color: 'white', border: 'none', borderRadius: '14px', fontWeight: '700', fontSize: '14px', cursor: 'pointer', marginRight: '10px' }}>
            Về trang SoThuChi
          </button>
          <button onClick={logout}
            style={{ padding: '12px 24px', background: 'transparent', color: '#8B7355', border: '1px solid #D4B896', borderRadius: '14px', fontWeight: '700', fontSize: '14px', cursor: 'pointer' }}>
            Đăng xuất
          </button>
        </div>
      </div>
    )
  }

  return children
}

export default function App() {
  const path = window.location.pathname

  if (path.startsWith('/checkin')) {
    return <CheckinApp />
  }

  // Landing page công khai — hannahspa.vn
  if (path === '/' || path === '') return <LandingPage />

  // Portal nội bộ nhân viên
  if (path.startsWith('/portal')) return <HomePage />

  // Menu & shop (sắp ra mắt)
  if (path.startsWith('/menu') || path.startsWith('/shop')) return <LandingPage />

  return (
    <AuthProvider>
      <AppProvider>
        {path.startsWith('/admin') ? (
          <RequireAuth requireAdmin={true}>
            <AdminApp />
          </RequireAuth>
        ) : (
          <RequireAuth requireAdmin={false}>
            <InternalApp />
          </RequireAuth>
        )}
      </AppProvider>
    </AuthProvider>
  )
}
