import { useState } from 'react'
import { useAuth } from '../../../context/AuthContext'
import I from '../../../components/shared/Icons'
import QuanLyDanhMuc from './components/QuanLyDanhMuc'
import QuanLyDoanhThu from './components/QuanLyDoanhThu'
import QuanLyVi from './components/QuanLyVi'
import ThongTinSpa from './components/ThongTinSpa'
import HoSoNhanVien from './components/HoSoNhanVien'
import DoiMatKhau from './components/DoiMatKhau'
import DonChungTu from './components/DonChungTu'
import QuanLyUser from './components/QuanLyUser'

const S = {
  page: { padding: '22px 24px', background: 'var(--bg)', minHeight: '100vh' },
  userCard: { background: 'var(--grad-gold)', borderRadius: 'var(--r-lg)', padding: '24px 20px', marginBottom: 24, boxShadow: 'var(--sh-2)', position: 'relative', overflow: 'hidden' },
  userGlow: { position: 'absolute', top: -40, right: -40, width: 150, height: 150, background: 'radial-gradient(circle, rgba(255,255,255,0.15) 0%, transparent 60%)', borderRadius: '50%' },
  userRow: { display: 'flex', alignItems: 'center', gap: 16, position: 'relative' },
  avatar: (isAdmin) => ({ width: 60, height: 60, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', border: '2px solid rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }),
  userName: { color: '#FFFBF5', fontWeight: 700, fontSize: 18, letterSpacing: '0.5px', fontFamily: 'var(--serif)' },
  userRole: { color: 'rgba(255,255,255,0.8)', fontSize: 12, marginTop: 4, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'var(--sans)' },
  statusDot: { width: 6, height: 6, borderRadius: '50%', background: '#86EFAC' },
  logoutBtn: { background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 12, color: '#fff', padding: '10px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'var(--sans)', whiteSpace: 'nowrap' },
  sectionTitle: { fontSize: 10, letterSpacing: '1.5px', color: 'var(--ink3)', textTransform: 'uppercase', fontWeight: 600, marginBottom: 12, marginTop: 24, paddingLeft: 8, fontFamily: 'var(--sans)' },
  menuCard: { background: 'var(--surface2)', borderRadius: 'var(--r-lg)', boxShadow: 'var(--sh-1)', border: '1px solid var(--line)', overflow: 'hidden' },
  menuBtn: (locked) => ({ display: 'flex', alignItems: 'center', gap: 16, width: '100%', padding: '16px 20px', background: 'none', border: 'none', cursor: locked ? 'not-allowed' : 'pointer', opacity: locked ? 0.5 : 1, transition: 'background .2s', textAlign: 'left' }),
  menuIcon: { width: 44, height: 44, borderRadius: 14, background: 'linear-gradient(135deg, var(--surface), var(--line))', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' },
  menuLabel: { fontWeight: 600, fontSize: 15, color: 'var(--ink)', fontFamily: 'var(--sans)' },
  menuSub: { fontSize: 11, color: 'var(--ink3)', marginTop: 2, fontFamily: 'var(--sans)' },
  menuArrow: (locked) => ({ color: locked ? 'var(--ink3)' : 'var(--espresso)', fontSize: 20 }),
  divider: { height: 1, background: 'var(--line)', margin: '0 20px' },
  logoutCard: { padding: '0 8px', marginTop: 30 },
  logoutBtn2: { width: '100%', padding: 16, background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: 'var(--r)', color: '#C0392B', fontSize: 15, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer', transition: 'all .2s', fontFamily: 'var(--sans)' },
  footer: { textAlign: 'center', padding: '24px 0 120px', color: 'var(--ink3)', fontSize: 11, fontFamily: 'var(--sans)' },
}

const menuIconMap = {
  dm_doanh_thu: I.Tag,
  dm_chi_phi: I.Receipt,
  quan_ly_vi: I.Wallet,
  thong_tin: I.Store,
  nhan_vien: I.Users,
  quan_ly_user: I.Shield,
  don_chung_tu: I.Trash,
  mat_khau: I.Cog,
}

export default function CaiDatPage({ user }) {
  const isAdmin = user?.vai_tro === 'admin'
  const { logout } = useAuth()
  const [activeModal, setActiveModal] = useState(null)

  const handleMenuClick = (item) => {
    if (item.admin && !isAdmin) {
      alert('Bạn không có quyền truy cập tính năng này!')
      return
    }
    setActiveModal(item.id)
  }

  const sections = [
    {
      title: 'Quản Lý Tài Chính', items: [
        { id: 'dm_doanh_thu', label: 'Danh Mục Doanh Thu', sub: '1 nhóm · 4 hình thức', admin: true },
        { id: 'dm_chi_phi', label: 'Danh Mục Chi Phí', sub: 'Thêm / Sửa / Khóa', admin: true },
        { id: 'quan_ly_vi', label: 'Quản Lý Ví / Két', sub: 'Tiền Mặt · MB · TP Bank', admin: true },
      ],
    },
    {
      title: 'Hệ Thống & Nhân Sự', items: [
        { id: 'thong_tin', label: 'Thông Tin Spa', sub: 'Hannah Beauty & Spa', admin: true },
        { id: 'nhan_vien', label: 'Hồ Sơ Nhân Viên', sub: '10 nhân viên (Lương/Phép)', admin: true },
        { id: 'quan_ly_user', label: 'Quản Lý User', sub: 'Thêm / Sửa / Xóa user đăng nhập', admin: true },
        { id: 'don_chung_tu', label: 'Dọn Chứng Từ Cũ', sub: 'Quản lý dung lượng storage', admin: true },
        { id: 'mat_khau', label: 'Đổi Mật Khẩu', sub: 'Bảo mật tài khoản cá nhân', admin: false },
      ],
    },
  ]

  const handleLogout = async () => { await logout(); window.location.replace('/') }

  return (
    <div style={S.page}>
      <div className="mod-head" style={{ marginBottom: 20 }}>
        <div>
          <div className="ttl">Cài Đặt</div>
          <div className="sub">{isAdmin ? 'Quản Trị Viên' : 'Nhân Viên'} · Hannah Beauty & Spa</div>
        </div>
      </div>

      {/* User card */}
      <div style={S.userCard}>
        <div style={S.userGlow} />
        <div style={S.userRow}>
          <div style={S.avatar(isAdmin)}>
            {isAdmin ? <I.Star style={{ width: 28, height: 28, color: '#fff' }} /> : <I.User style={{ width: 28, height: 28, color: '#fff' }} />}
          </div>
          <div style={{ flex: 1 }}>
            <div style={S.userName}>{user?.ten || user?.ho_ten || 'Người dùng'}</div>
            <div style={S.userRole}>
              <div style={S.statusDot} />
              {isAdmin ? 'Quản Trị Viên (Admin)' : 'Nhân Viên Spa'}
            </div>
          </div>
          <button onClick={handleLogout} style={S.logoutBtn}>
            <I.Logout style={{ width: 14, height: 14 }} /> Đăng Xuất
          </button>
        </div>
      </div>

      {/* Settings sections */}
      {sections.map((section, si) => (
        <div key={section.title}>
          <div style={{ ...S.sectionTitle, marginTop: si === 0 ? 0 : 24 }}>{section.title}</div>
          <div style={S.menuCard}>
            {section.items.map((item, i) => {
              const locked = item.admin && !isAdmin
              const Icon = menuIconMap[item.id] || I.Cog
              return (
                <div key={item.id}>
                  <button
                    onClick={() => handleMenuClick(item)}
                    style={S.menuBtn(locked)}
                    onMouseEnter={e => { if (!locked) e.currentTarget.style.background = 'var(--bg)' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'none' }}
                  >
                    <div style={S.menuIcon}>
                      <Icon style={{ width: 20, height: 20, color: locked ? 'var(--ink3)' : 'var(--espresso)' }} />
                    </div>
                    <div style={{ flex: 1, textAlign: 'left' }}>
                      <div style={S.menuLabel}>{item.label}</div>
                      <div style={S.menuSub}>{item.sub}</div>
                    </div>
                    <div style={S.menuArrow(locked)}>{locked ? <I.Shield style={{ width: 16, height: 16 }} /> : '›'}</div>
                  </button>
                  {i < section.items.length - 1 && <div style={S.divider} />}
                </div>
              )
            })}
          </div>
        </div>
      ))}

      {/* Logout */}
      <div style={S.logoutCard}>
        <button style={S.logoutBtn2} onClick={handleLogout}>
          <I.Logout style={{ width: 16, height: 16 }} /> Đăng Xuất
        </button>
      </div>

      {/* Footer */}
      <div style={S.footer}>
        <div style={{ marginBottom: 6, fontWeight: 600, letterSpacing: '0.5px' }}>HANNAH SPA MANAGEMENT</div>
        <div style={{ opacity: 0.8 }}>Version 1.0.0 — Financial Module</div>
      </div>

      {/* Modals */}
      {activeModal === 'dm_doanh_thu' && <QuanLyDoanhThu onClose={() => setActiveModal(null)} />}
      {activeModal === 'dm_chi_phi' && <QuanLyDanhMuc onClose={() => setActiveModal(null)} />}
      {activeModal === 'quan_ly_vi' && <QuanLyVi onClose={() => setActiveModal(null)} />}
      {activeModal === 'thong_tin' && <ThongTinSpa onClose={() => setActiveModal(null)} />}
      {activeModal === 'nhan_vien' && <HoSoNhanVien onClose={() => setActiveModal(null)} />}
      {activeModal === 'don_chung_tu' && <DonChungTu onClose={() => setActiveModal(null)} />}
      {activeModal === 'quan_ly_user' && <QuanLyUser onClose={() => setActiveModal(null)} />}
      {activeModal === 'mat_khau' && <DoiMatKhau onClose={() => setActiveModal(null)} />}
    </div>
  )
}
