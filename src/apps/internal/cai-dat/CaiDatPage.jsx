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

const SECTIONS = [
  {
    title: 'Quản Lý Tài Chính',
    items: [
      { id: 'dm_doanh_thu', icon: '🏷️', label: 'Danh Mục Doanh Thu', sub: '1 nhóm · 4 hình thức', admin: true },
      { id: 'dm_chi_phi',   icon: '📂', label: 'Danh Mục Chi Phí',   sub: 'Thêm / Sửa / Khoá',   admin: true },
      { id: 'quan_ly_vi',   icon: '🏦', label: 'Quản Lý Ví / Két',   sub: 'Tiền Mặt · MB · TP Bank', admin: true },
    ],
  },
  {
    title: 'Hệ Thống & Nhân Sự',
    items: [
      { id: 'thong_tin',   icon: '🏪', label: 'Thông Tin Spa',      sub: 'Hannah Beauty & Spa',       admin: true  },
      { id: 'nhan_vien',   icon: '👥', label: 'Hồ Sơ Nhân Viên',   sub: '10 nhân viên',              admin: true  },
      { id: 'quan_ly_user',icon: '🛡️', label: 'Quản Lý User',       sub: 'Thêm / Sửa / Xoá user',   admin: true  },
      { id: 'don_chung_tu',icon: '🗑️', label: 'Dọn Chứng Từ Cũ',   sub: 'Quản lý dung lượng',       admin: true  },
      { id: 'mat_khau',    icon: '🔑', label: 'Đổi Mật Khẩu',      sub: 'Bảo mật tài khoản',        admin: false },
    ],
  },
]

function SettingCard({ item, isAdmin, onClick }) {
  const locked = item.admin && !isAdmin
  const [hover, setHover] = useState(false)
  return (
    <button
      onClick={() => !locked && onClick(item.id)}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
        gap: 10, padding: '20px 20px 18px',
        background: hover && !locked ? 'var(--surface2)' : 'var(--surface)',
        border: '1px solid var(--line)',
        borderRadius: 'var(--r)',
        boxShadow: hover && !locked ? 'var(--sh-2)' : 'var(--sh-1)',
        cursor: locked ? 'not-allowed' : 'pointer',
        opacity: locked ? 0.45 : 1,
        transition: 'all .18s',
        textAlign: 'left', fontFamily: 'inherit',
        width: '100%',
      }}
    >
      <div style={{
        width: 46, height: 46, borderRadius: 14,
        background: locked ? 'var(--bg2)' : 'linear-gradient(135deg,var(--surface2),var(--bg2))',
        border: '1px solid var(--line)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 22, flexShrink: 0,
        boxShadow: locked ? 'none' : 'var(--sh-1)',
      }}>{item.icon}</div>
      <div>
        <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--ink)', fontFamily: 'var(--sans)', marginBottom: 3 }}>
          {item.label}
        </div>
        <div style={{ fontSize: 11.5, color: 'var(--ink3)', fontFamily: 'var(--sans)' }}>
          {locked ? '🔒 Chỉ Admin' : item.sub}
        </div>
      </div>
    </button>
  )
}

export default function CaiDatPage({ user }) {
  const isAdmin = user?.vai_tro === 'admin'
  const { logout } = useAuth()
  const [activeModal, setActiveModal] = useState(null)

  const handleLogout = async () => { await logout(); window.location.replace('/') }

  return (
    <div style={{ padding: '22px 24px' }}>

      {/* ── MOD-HEAD ── */}
      <div className="mod-head" style={{ marginBottom: 20 }}>
        <div>
          <div className="ttl">Cài Đặt</div>
          <div className="sub">{isAdmin ? 'Quản Trị Viên' : 'Nhân Viên'} · Hannah Beauty &amp; Spa</div>
        </div>
        <div className="acts">
          <button onClick={handleLogout} className="btn" style={{ color: 'var(--danger)', borderColor: 'var(--danger)', gap: 6 }}>
            <I.Logout style={{ width: 13, height: 13 }} /> Đăng Xuất
          </button>
        </div>
      </div>

      {/* ── USER STRIP ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 16,
        background: 'var(--grad-gold)',
        borderRadius: 'var(--r-lg)', padding: '18px 24px',
        marginBottom: 24, boxShadow: 'var(--sh-2)',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: -30, right: -30, width: 120, height: 120, background: 'radial-gradient(circle,rgba(255,255,255,.15) 0%,transparent 60%)', borderRadius: '50%' }} />
        <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(255,255,255,0.18)', border: '2px solid rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          {isAdmin
            ? <I.Star style={{ width: 26, height: 26, color: '#fff' }} />
            : <I.User style={{ width: 26, height: 26, color: '#fff' }} />}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ color: '#FFFBF5', fontWeight: 700, fontSize: 17, fontFamily: 'var(--serif)', letterSpacing: '.3px' }}>
            {user?.ho_ten || user?.ten || 'Người Dùng'}
          </div>
          <div style={{ color: 'rgba(255,255,255,.8)', fontSize: 12, marginTop: 3, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#86EFAC', flexShrink: 0 }} />
            {isAdmin ? 'Quản Trị Viên (Admin)' : 'Nhân Viên Spa'} · {user?.email || ''}
          </div>
        </div>
        <div style={{ color: 'rgba(255,255,255,.5)', fontSize: 11, textAlign: 'right', fontFamily: 'var(--sans)' }}>
          <div>Hannah Beauty &amp; Spa</div>
          <div style={{ marginTop: 2 }}>HSMS v1.0</div>
        </div>
      </div>

      {/* ── SETTINGS SECTIONS ── */}
      {SECTIONS.map((section) => (
        <div key={section.title} style={{ marginBottom: 28 }}>
          <div style={{
            fontSize: 10, letterSpacing: '1.6px', color: 'var(--ink3)',
            textTransform: 'uppercase', fontWeight: 700,
            marginBottom: 12, paddingLeft: 2, fontFamily: 'var(--sans)',
          }}>
            {section.title}
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${Math.min(section.items.length, 4)}, 1fr)`,
            gap: 12,
          }}>
            {section.items.map(item => (
              <SettingCard
                key={item.id}
                item={item}
                isAdmin={isAdmin}
                onClick={(id) => setActiveModal(id)}
              />
            ))}
          </div>
        </div>
      ))}

      {/* ── DANGER ZONE ── */}
      <div style={{
        marginTop: 8, padding: '16px 20px',
        background: '#FEF2F2', border: '1px solid #FCA5A5',
        borderRadius: 'var(--r)', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div>
          <div style={{ fontWeight: 600, fontSize: 14, color: '#991B1B', fontFamily: 'var(--sans)' }}>Đăng Xuất Hệ Thống</div>
          <div style={{ fontSize: 12, color: '#B91C1C', marginTop: 2 }}>Thoát tài khoản và quay về trang đăng nhập</div>
        </div>
        <button onClick={handleLogout} style={{
          background: '#C0392B', border: 'none', borderRadius: 10,
          color: '#fff', padding: '10px 20px', fontSize: 13, fontWeight: 600,
          cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
          fontFamily: 'var(--sans)',
        }}>
          <I.Logout style={{ width: 14, height: 14 }} /> Đăng Xuất
        </button>
      </div>

      <div style={{ textAlign: 'center', padding: '20px 0 8px', color: 'var(--ink3)', fontSize: 11, fontFamily: 'var(--sans)' }}>
        Hannah Spa Management System · v1.0 · hannahspa.vn
      </div>

      {/* ── MODALS ── */}
      {activeModal === 'dm_doanh_thu' && <QuanLyDoanhThu onClose={() => setActiveModal(null)} />}
      {activeModal === 'dm_chi_phi'   && <QuanLyDanhMuc  onClose={() => setActiveModal(null)} />}
      {activeModal === 'quan_ly_vi'   && <QuanLyVi       onClose={() => setActiveModal(null)} />}
      {activeModal === 'thong_tin'    && <ThongTinSpa    onClose={() => setActiveModal(null)} />}
      {activeModal === 'nhan_vien'    && <HoSoNhanVien   onClose={() => setActiveModal(null)} />}
      {activeModal === 'don_chung_tu' && <DonChungTu     onClose={() => setActiveModal(null)} />}
      {activeModal === 'quan_ly_user' && <QuanLyUser     onClose={() => setActiveModal(null)} />}
      {activeModal === 'mat_khau'     && <DoiMatKhau     onClose={() => setActiveModal(null)} />}
    </div>
  )
}
