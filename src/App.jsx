import { AuthProvider, useAuth } from './context/AuthContext'
import { AppProvider }  from './context/AppContext'
import InternalApp from './apps/internal/InternalApp'
import CheckinApp from './apps/checkin/CheckinApp'
import AdminApp from './apps/admin/AdminApp'
import LoginPage from './apps/auth/LoginPage'

function RequireAuth({ children, requireAdmin }) {
  const { user, loading } = useAuth()
  
  if (loading) return <div style={{ padding: '40px', textAlign: 'center', fontFamily: 'sans-serif' }}>Đang tải hệ thống...</div>
  
  if (!user) return <LoginPage />
  
  if (requireAdmin && user.vai_tro !== 'admin') {
    return (
      <div style={{ padding: '40px', textAlign: 'center', fontFamily: 'sans-serif' }}>
        <h2 style={{ color: '#991B1B' }}>⛔ Không có quyền truy cập</h2>
        <p>Bạn cần quyền Quản trị viên (Admin) để xem trang này.</p>
        <button onClick={() => window.location.href = '/app'} style={{ padding: '10px 20px', marginTop: '20px', cursor: 'pointer' }}>
          Quay lại trang Lễ Tân
        </button>
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
