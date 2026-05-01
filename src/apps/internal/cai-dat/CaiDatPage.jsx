import { useState } from 'react'
import { COLORS } from '../../../constants/colors'
import QuanLyDanhMuc from './components/QuanLyDanhMuc' // Import file anh vừa tạo

export default function CaiDatPage({ user }) {
  const isAdmin = user?.vai_tro === 'admin'
  const[activeModal, setActiveModal] = useState(null) // Quản lý việc đóng/mở popup

  // Xử lý sự kiện khi bấm vào các menu
  const handleMenuClick = (item) => {
    // 1. Kiểm tra quyền
    if (item.admin && !isAdmin) {
      alert('🔒 Bạn không có quyền truy cập tính năng này!');
      return;
    }
    
    // 2. Mở đúng chức năng
    if (item.id === 'dm_chi_phi') {
        setActiveModal('dm_chi_phi'); // Mở popup Quản lý danh mục
    } else {
        alert(`🚧 Đang phát triển tính năng: ${item.label}`);
    }
  }

  // Danh sách các menu cài đặt
  const sections = [
    { title: 'Quản Lý Tài Chính', items:[
      { id: 'dm_doanh_thu', icon: '💰', label: 'Danh Mục Doanh Thu', sub: '1 nhóm • 4 hình thức',    admin: true },
      { id: 'dm_chi_phi',   icon: '📋', label: 'Danh Mục Chi Phí',   sub: 'Thêm / Sửa / Khóa',      admin: true },
      { id: 'quan_ly_vi',   icon: '💳', label: 'Quản Lý Ví / Két',   sub: 'Tiền Mặt • MB • TP Bank', admin: true },
    ]},
    { title: 'Hệ Thống & Nhân Sự', items:[
      { id: 'thong_tin',    icon: '🏠', label: 'Thông Tin Spa',       sub: 'Hannah Beauty & Spa',    admin: true  },
      { id: 'nhan_vien',    icon: '👥', label: 'Hồ Sơ Nhân Viên',    sub: '10 nhân viên (Lương/Phép)',admin: true  },
      { id: 'mat_khau',     icon: '🔐', label: 'Đổi Mật Khẩu',        sub: 'Bảo mật tài khoản cá nhân', admin: false },
    ]},
  ]

  return (
    <div style={{ padding: '24px 16px', background: '#FAF7F4', minHeight: '100vh', animation: 'fadeIn 0.3s ease' }}>
      <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }`}</style>
      
      <h2 style={{ fontSize: '24px', fontWeight: '800', color: COLORS.text, marginBottom: '20px' }}>Cài Đặt</h2>
      
      {/* 1. THẺ THÔNG TIN NGƯỜI DÙNG (LUXURY STYLE) */}
      <div style={{ background: COLORS.grad, borderRadius: '24px', padding: '24px 20px', marginBottom: '24px', boxShadow: '0 10px 30px rgba(139,94,60,0.2)', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '-40px', right: '-40px', width: '150px', height: '150px', background: 'radial-gradient(circle, rgba(255,255,255,0.15) 0%, transparent 60%)', borderRadius: '50%' }} />
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', position: 'relative' }}>
          <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'rgba(255,255,255,0.15)', border: '2px solid rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }}>
            {isAdmin ? '👑' : '💁'}
          </div>
          <div>
            <div style={{ color: '#FFFBF5', fontWeight: '800', fontSize: '18px', letterSpacing: '0.5px' }}>{user?.ten || 'Người dùng'}</div>
            <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '12px', marginTop: '4px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#86EFAC' }} />
              {isAdmin ? 'Quản Trị Viên (Admin)' : 'Nhân Viên Spa'}
            </div>
          </div>
        </div>
      </div>

      {/* 2. CÁC MENU CÀI ĐẶT */}
      {sections.map(section => (
        <div key={section.title} style={{ marginBottom: '24px' }}>
          <div style={{ fontSize: '11px', letterSpacing: '1.5px', color: COLORS.textMute, textTransform: 'uppercase', fontWeight: '700', marginBottom: '12px', paddingLeft: '8px' }}>
            {section.title}
          </div>
          <div style={{ background: COLORS.card, borderRadius: '24px', boxShadow: '0 8px 24px rgba(139,94,60,0.04)', border: `1px solid ${COLORS.border}`, overflow: 'hidden' }}>
            {section.items.map((item, i) => {
              const locked = item.admin && !isAdmin
              return (
                <div key={item.id}>
                  <button 
                    onClick={() => handleMenuClick(item)}
                    style={{ display: 'flex', alignItems: 'center', gap: '16px', width: '100%', padding: '16px 20px', background: 'none', border: 'none', cursor: locked ? 'not-allowed' : 'pointer', opacity: locked ? 0.5 : 1, transition: 'all 0.2s' }}
                    onMouseEnter={e => { if (!locked) e.currentTarget.style.background = '#FAF7F4' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'none' }}
                    onMouseDown={e => { if (!locked) e.currentTarget.style.transform = 'scale(0.98)' }}
                    onMouseUp={e => { if (!locked) e.currentTarget.style.transform = 'scale(1)' }}
                  >
                    <div style={{ width: '44px', height: '44px', borderRadius: '14px', background: 'linear-gradient(135deg, #FDFBF9, #F5EDE6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
                        {item.icon}
                    </div>
                    <div style={{ flex: 1, textAlign: 'left' }}>
                      <div style={{ fontWeight: '700', fontSize: '15px', color: COLORS.text }}>{item.label}</div>
                      <div style={{ fontSize: '11px', color: COLORS.textMute, marginTop: '2px' }}>{item.sub}</div>
                    </div>
                    <div style={{ color: locked ? '#D0C0B0' : COLORS.primary, fontSize: locked ? '16px' : '20px' }}>
                        {locked ? '🔒' : '›'}
                    </div>
                  </button>
                  {i < section.items.length - 1 && <div style={{ height: '1.5px', background: '#F8F3F0', margin: '0 20px' }} />}
                </div>
              )
            })}
          </div>
        </div>
      ))}

      {/* 3. NÚT ĐĂNG XUẤT */}
      <div style={{ padding: '0 8px', marginTop: '30px' }}>
          <button style={{ width: '100%', padding: '16px', background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: '20px', color: '#C0392B', fontSize: '15px', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer', transition: 'all 0.2s' }}
                  onMouseDown={e => e.currentTarget.style.transform = 'scale(0.98)'}
                  onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
                  onClick={() => alert('Chức năng Đăng Xuất sẽ được kích hoạt ở Phase Nhân Sự.')}
          >
              <span style={{ fontSize: '18px' }}>🚪</span> Đăng Xuất
          </button>
      </div>

      {/* FOOTER */}
      <div style={{ textAlign: 'center', padding: '24px 0 120px', color: COLORS.textMute, fontSize: '11px' }}>
        <div style={{ marginBottom: '6px', fontWeight: '600', letterSpacing: '0.5px' }}>🌸 HANNAH SPA MANAGEMENT</div>
        <div style={{ opacity: 0.8 }}>Version 1.0.0 — Financial Module</div>
      </div>

      {/* TÍNH NĂNG QUẢN LÝ DANH MỤC SẼ ĐƯỢC HIỂN THỊ TẠI ĐÂY KHI CLICK */}
      {activeModal === 'dm_chi_phi' && (
          <QuanLyDanhMuc onClose={() => setActiveModal(null)} />
      )}
    </div>
  )
}