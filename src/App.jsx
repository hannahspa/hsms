import { lazy, Suspense } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'
import { AppProvider }  from './context/AppContext'
import ErrorBoundary from './components/shared/ErrorBoundary'
import LoginPage from './apps/auth/LoginPage'
import AdminShell from './components/layout/AdminShell'

const InternalApp = lazy(() => import('./apps/internal/InternalApp'))
const CheckinApp = lazy(() => import('./apps/checkin/CheckinApp'))
const AdminApp = lazy(() => import('./apps/admin/AdminApp'))
const LandingPage = lazy(() => import('./apps/website/LandingPage'))
const HomePage = lazy(() => import('./apps/website/HomePage'))
const CustomerMenuApp = lazy(() => import('./apps/customer/CustomerMenuApp'))
const PosApp = lazy(() => import('./apps/pos/PosApp'))

// Các /admin/* paths mà Lễ Tân được phép truy cập (không yêu cầu admin)
// LƯU Ý: /admin/the-lieu-trinh/bao-cao chỉ Admin — phải exclude trước khi check
const LETAN_ALLOWED_ADMIN = [
  '/admin/crm',
  '/admin/the-lieu-trinh',
  '/admin/kho-hang',
  '/admin/marketing/hop-thu',
  '/admin/marketing/khach-tiem-nang',
  '/admin/marketing/cham-soc-sau-dich-vu',
  '/admin/marketing/nhac-lich-lieu-trinh',
]
const LETAN_BLOCKED_ADMIN = ['/admin/the-lieu-trinh/bao-cao'] // báo cáo chỉ Admin

function LoadingScreen() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FAF7F4', fontFamily: 'sans-serif' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '28px', marginBottom: '12px' }}>🌸</div>
        <div style={{ color: '#A0714F', fontWeight: '700', fontSize: '15px' }}>Hannah Beauty & Spa</div>
        <div style={{ color: '#B8A898', fontSize: '13px', marginTop: '6px' }}>Đang tải hệ thống...</div>
      </div>
    </div>
  )
}

function LazyRoute({ children }) {
  return <Suspense fallback={<LoadingScreen />}>{children}</Suspense>
}

function RequireAuth({ children, requireAdmin }) {
  const { user, loading, logout } = useAuth()
  const path = window.location.pathname

  if (loading) return <LoadingScreen />

  if (!user) return <LoginPage />

  // Admin vào /checkin → redirect về /admin (không chặn /SoThuChi)
  if (user.vai_tro === 'admin' && path.startsWith('/checkin')) {
    window.location.replace('/admin')
    return null
  }

  // Lễ Tân được phép vào một số /admin/* nhất định (CRM, Thẻ Liệu Trình)
  // Nhưng KHÔNG được vào /admin/the-lieu-trinh/bao-cao (chỉ Admin)
  const isLeTanBlocked = LETAN_BLOCKED_ADMIN.some(p => path.startsWith(p))
  const isLeTanAllowedAdminPath = !isLeTanBlocked && LETAN_ALLOWED_ADMIN.some(p => path.startsWith(p))

  // Không phải admin cố vào /admin (trừ các path được cho phép riêng)
  if (requireAdmin && user.vai_tro !== 'admin' && !isLeTanAllowedAdminPath) {
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
    return <ErrorBoundary><LazyRoute><CheckinApp /></LazyRoute></ErrorBoundary>
  }

  // Landing page công khai — hannahspa.vn
  if (path === '/' || path === '') return <ErrorBoundary><LazyRoute><LandingPage /></LazyRoute></ErrorBoundary>

  // Portal nội bộ nhân viên
  if (path.startsWith('/portal')) return <ErrorBoundary><LazyRoute><HomePage /></LazyRoute></ErrorBoundary>

  // Menu dịch vụ cho khách (iPad tại quầy)
  if (path.startsWith('/menu')) return <ErrorBoundary><LazyRoute><CustomerMenuApp /></LazyRoute></ErrorBoundary>

  // Shop (sắp ra mắt)
  if (path.startsWith('/shop')) return <ErrorBoundary><LazyRoute><LandingPage /></LazyRoute></ErrorBoundary>

  // POS, Admin, SoThuChi — dùng chung AdminShell
  return (
    <AuthProvider>
      <AppProvider>
        <ErrorBoundary>
          {path.startsWith('/admin') ? (
            <RequireAuth requireAdmin={true}>
              <AdminShell>
                <LazyRoute><AdminApp /></LazyRoute>
              </AdminShell>
            </RequireAuth>
          ) : path.startsWith('/pos') ? (
            <RequireAuth requireAdmin={false}>
              <AdminShell>
                <LazyRoute><PosApp /></LazyRoute>
              </AdminShell>
            </RequireAuth>
          ) : (
            <RequireAuth requireAdmin={false}>
              <AdminShell>
                <LazyRoute><InternalApp /></LazyRoute>
              </AdminShell>
            </RequireAuth>
          )}
        </ErrorBoundary>
      </AppProvider>
    </AuthProvider>
  )
}
