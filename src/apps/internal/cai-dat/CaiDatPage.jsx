import { useState } from 'react'
import { LUX } from '../../../constants/lux'
import { useAuth } from '../../../context/AuthContext'
import QuanLyDanhMuc from './components/QuanLyDanhMuc'
import QuanLyDoanhThu from './components/QuanLyDoanhThu'
import QuanLyVi from './components/QuanLyVi'
import ThongTinSpa from './components/ThongTinSpa'
import HoSoNhanVien from './components/HoSoNhanVien'
import DoiMatKhau from './components/DoiMatKhau'
import DonChungTu from './components/DonChungTu'
import QuanLyUser from './components/QuanLyUser'

export default function CaiDatPage({ user }) {
  const isAdmin = user?.vai_tro === 'admin'
  const { logout } = useAuth()
  const[activeModal, setActiveModal] = useState(null)

  const handleMenuClick = (item) => {
    if (item.admin && !isAdmin) {
      alert('🔒 Bạn không có quyền truy cập tính năng này!');
      return;
    }
    setActiveModal(item.id)
  }

  const sections = [
    { title: 'Quản Lý Tài Chính', items:[
      { id: 'dm_doanh_thu', icon: '💰', label: 'Danh Mục Doanh Thu', sub: '1 nhóm • 4 hình thức',    admin: true },
      { id: 'dm_chi_phi',   icon: '📋', label: 'Danh Mục Chi Phí',   sub: 'Thêm / Sửa / Khóa',      admin: true },
      { id: 'quan_ly_vi',   icon: '💳', label: 'Quản Lý Ví / Két',   sub: 'Tiền Mặt • MB • TP Bank', admin: true },
    ]},
    { title: 'Hệ Thống & Nhân Sự', items:[
      { id: 'thong_tin',    icon: '🏠', label: 'Thông Tin Spa',       sub: 'Hannah Beauty & Spa',    admin: true  },
      { id: 'nhan_vien',    icon: '👥', label: 'Hồ Sơ Nhân Viên',    sub: '10 nhân viên (Lương/Phép)',admin: true  },
      { id: 'quan_ly_user', icon: '👤', label: 'Quản Lý User',       sub: 'Thêm / Sửa / Xoá user đăng nhập', admin: true  },
      { id: 'don_chung_tu', icon: '🗑️', label: 'Dọn Chứng Từ Cũ',    sub: 'Quản lý dung lượng storage', admin: true  },
      { id: 'mat_khau',     icon: '🔐', label: 'Đổi Mật Khẩu',        sub: 'Bảo mật tài khoản cá nhân', admin: false },
    ]},
  ]

  return (
    <div style={{ padding: '24px 16px', background: LUX.bg, minHeight: '100vh' }}>

      <h2 style={{ fontSize: '24px', fontWeight: '700', color: LUX.ink, marginBottom: '20px', fontFamily: LUX.fontSerif }}>Cài Đặt</h2>

      {/* User card */}
      <div style={{ background: LUX.heroGrad, borderRadius: LUX.radiusLg, padding: '24px 20px', marginBottom: '24px', boxShadow: LUX.shadow, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '-40px', right: '-40px', width: '150px', height: '150px', background: 'radial-gradient(circle, rgba(255,255,255,0.15) 0%, transparent 60%)', borderRadius: '50%' }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', position: 'relative' }}>
          <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'rgba(255,255,255,0.15)', border: '2px solid rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }}>
            {isAdmin ? '👑' : '💁'}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ color: '#FFFBF5', fontWeight: '700', fontSize: '18px', letterSpacing: '0.5px', fontFamily: LUX.fontSerif }}>{user?.ten || user?.ho_ten || 'Người dùng'}</div>
            <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '12px', marginTop: '4px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '4px', fontFamily: LUX.fontSans }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#86EFAC' }} />
              {isAdmin ? 'Quản Trị Viên (Admin)' : 'Nhân Viên Spa'}
            </div>
          </div>
          <button
            onClick={async () => { await logout(); window.location.replace('/') }}
            style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '12px', color: 'white', padding: '10px 16px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontFamily: LUX.fontSans, whiteSpace: 'nowrap' }}
          >
            <span style={{ fontSize: '16px' }}>🚪</span> Đăng Xuất
          </button>
        </div>
      </div>

      {/* Settings sections */}
      {sections.map(section => (
        <div key={section.title} style={{ marginBottom: '24px' }}>
          <div style={{ fontSize: '10px', letterSpacing: '1.5px', color: LUX.ink3, textTransform: 'uppercase', fontWeight: '600', marginBottom: '12px', paddingLeft: '8px', fontFamily: LUX.fontSans }}>
            {section.title}
          </div>
          <div style={{ background: LUX.surface2, borderRadius: LUX.radiusLg, boxShadow: LUX.shadowSm, border: `1px solid ${LUX.line}`, overflow: 'hidden' }}>
            {section.items.map((item, i) => {
              const locked = item.admin && !isAdmin
              return (
                <div key={item.id}>
                  <button
                    onClick={() => handleMenuClick(item)}
                    style={{ display: 'flex', alignItems: 'center', gap: '16px', width: '100%', padding: '16px 20px', background: 'none', border: 'none', cursor: locked ? 'not-allowed' : 'pointer', opacity: locked ? 0.5 : 1, transition: 'all 0.2s' }}
                    onMouseEnter={e => { if (!locked) e.currentTarget.style.background = LUX.bg }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'none' }}
                    onMouseDown={e => { if (!locked) e.currentTarget.style.transform = 'scale(0.98)' }}
                    onMouseUp={e => { if (!locked) e.currentTarget.style.transform = 'scale(1)' }}
                  >
                    <div style={{ width: '44px', height: '44px', borderRadius: '14px', background: `linear-gradient(135deg, ${LUX.surface}, ${LUX.line})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
                        {item.icon}
                    </div>
                    <div style={{ flex: 1, textAlign: 'left' }}>
                      <div style={{ fontWeight: '600', fontSize: '15px', color: LUX.ink, fontFamily: LUX.fontSans }}>{item.label}</div>
                      <div style={{ fontSize: '11px', color: LUX.ink3, marginTop: '2px', fontFamily: LUX.fontSans }}>{item.sub}</div>
                    </div>
                    <div style={{ color: locked ? LUX.ink3 : LUX.taupe, fontSize: locked ? '16px' : '20px' }}>
                        {locked ? '🔒' : '›'}
                    </div>
                  </button>
                  {i < section.items.length - 1 && <div style={{ height: '1px', background: LUX.line, margin: '0 20px' }} />}
                </div>
              )
            })}
          </div>
        </div>
      ))}

      {/* Logout */}
      <div style={{ padding: '0 8px', marginTop: '30px' }}>
          <button style={{ width: '100%', padding: '16px', background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: LUX.radius, color: '#C0392B', fontSize: '15px', fontWeight: '600', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer', transition: 'all 0.2s', fontFamily: LUX.fontSans }}
                  onMouseDown={e => e.currentTarget.style.transform = 'scale(0.98)'}
                  onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
                  onClick={async () => { await logout(); window.location.replace('/') }}
          >
              <span style={{ fontSize: '18px' }}>🚪</span> Đăng Xuất
          </button>
      </div>

      {/* Footer */}
      <div style={{ textAlign: 'center', padding: '24px 0 120px', color: LUX.ink3, fontSize: '11px', fontFamily: LUX.fontSans }}>
        <div style={{ marginBottom: '6px', fontWeight: '600', letterSpacing: '0.5px' }}>🌸 HANNAH SPA MANAGEMENT</div>
        <div style={{ opacity: 0.8 }}>Version 1.0.0 — Financial Module</div>
      </div>

      {activeModal === 'dm_doanh_thu' && <QuanLyDoanhThu onClose={() => setActiveModal(null)} />}
      {activeModal === 'dm_chi_phi'   && <QuanLyDanhMuc onClose={() => setActiveModal(null)} />}
      {activeModal === 'quan_ly_vi'   && <QuanLyVi onClose={() => setActiveModal(null)} />}
      {activeModal === 'thong_tin'    && <ThongTinSpa onClose={() => setActiveModal(null)} />}
      {activeModal === 'nhan_vien'    && <HoSoNhanVien onClose={() => setActiveModal(null)} />}
      {activeModal === 'don_chung_tu' && <DonChungTu onClose={() => setActiveModal(null)} />}
      {activeModal === 'quan_ly_user' && <QuanLyUser onClose={() => setActiveModal(null)} />}
      {activeModal === 'mat_khau'     && <DoiMatKhau onClose={() => setActiveModal(null)} />}
    </div>
  )
}
