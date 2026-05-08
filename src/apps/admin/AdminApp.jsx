import { useAuth } from '../../context/AuthContext'
import AdminNhanSuPage from './nhan-su/AdminNhanSuPage'
import AdminKhuyenMaiPage from './khuyen-mai/AdminKhuyenMaiPage'
import AdminHomepagePage from './trang-chu/AdminHomepagePage'
import { COLORS } from '../../constants/colors'

export default function AdminApp() {
  const path = window.location.pathname
  const { user, logout } = useAuth()

  const handleLogout = async () => {
    await logout()
    window.location.replace('/')
  }

  if (path.startsWith('/admin/nhan-su'))    return <AdminNhanSuPage />
  if (path.startsWith('/admin/khuyen-mai')) return <AdminKhuyenMaiPage />
  if (path.startsWith('/admin/trang-chu'))  return <AdminHomepagePage />

  return (
    <div style={{ minHeight: '100vh', background: COLORS.bg, fontFamily: 'sans-serif' }}>

      {/* Top bar */}
      <div style={{ background: COLORS.grad, padding: '40px 20px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: '12px', fontWeight: '600' }}>Xin chào,</div>
            <div style={{ color: 'white', fontWeight: '800', fontSize: '20px', marginTop: '2px' }}>
              {user?.ho_ten || 'Quản Trị Viên'}
            </div>
            <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '12px', marginTop: '2px' }}>
              Hannah Spa • Cần Thơ
            </div>
          </div>
          <button onClick={handleLogout}
            style={{ background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '12px', padding: '8px 14px', color: 'white', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}>
            Đăng xuất
          </button>
        </div>
      </div>

      {/* Menu */}
      <div style={{ padding: '24px 20px' }}>
        <div style={{ color: COLORS.textMute, fontSize: '13px', fontWeight: '600', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Chọn phân hệ
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <button onClick={() => window.location.href = '/admin/nhan-su'}
            style={{ padding: '20px', background: COLORS.grad, color: 'white', border: 'none', borderRadius: '18px', fontWeight: '800', fontSize: '15px', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '14px', boxShadow: COLORS.shadow }}>
            <span style={{ fontSize: '28px' }}>👥</span>
            <div>
              <div>Quản Lý Nhân Sự</div>
              <div style={{ fontSize: '12px', fontWeight: '500', opacity: 0.85, marginTop: '2px' }}>
                Chấm công · OFF · Bảng lương
              </div>
            </div>
          </button>

          <button onClick={() => window.location.href = '/admin/khuyen-mai'}
            style={{ padding: '20px', background: COLORS.card, color: COLORS.text, border: `1px solid ${COLORS.border}`, borderRadius: '18px', fontWeight: '800', fontSize: '15px', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '14px', boxShadow: COLORS.shadow }}>
            <span style={{ fontSize: '28px' }}>🏷️</span>
            <div>
              <div>Quản Lý Khuyến Mãi</div>
              <div style={{ fontSize: '12px', fontWeight: '500', color: COLORS.textMute, marginTop: '2px' }}>
                Tạo đợt KM · Badge giảm giá · Quản lý
              </div>
            </div>
          </button>

          <button onClick={() => window.location.href = '/admin/trang-chu'}
            style={{ padding: '20px', background: COLORS.card, color: COLORS.text, border: `1px solid ${COLORS.border}`, borderRadius: '18px', fontWeight: '800', fontSize: '15px', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '14px', boxShadow: COLORS.shadow }}>
            <span style={{ fontSize: '28px' }}>🌐</span>
            <div>
              <div>Nội Dung Trang Chủ</div>
              <div style={{ fontSize: '12px', fontWeight: '500', color: COLORS.textMute, marginTop: '2px' }}>
                Hero · Liên hệ · FAQ · Đánh giá
              </div>
            </div>
          </button>

          <button onClick={() => window.location.href = '/app'}
            style={{ padding: '20px', background: COLORS.card, color: COLORS.text, border: `1px solid ${COLORS.border}`, borderRadius: '18px', fontWeight: '800', fontSize: '15px', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '14px', boxShadow: COLORS.shadow }}>
            <span style={{ fontSize: '28px' }}>💰</span>
            <div>
              <div>Quản Lý Thu Chi</div>
              <div style={{ fontSize: '12px', fontWeight: '500', color: COLORS.textMute, marginTop: '2px' }}>
                Doanh thu · Chi phí · Báo cáo
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  )
}
