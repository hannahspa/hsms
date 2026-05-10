import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import '../../styles/hannah-admin.css'

const NAV_ITEMS = [
  { sec: 'Tổng Quan' },
  { id: 'dashboard', icon: '📊', label: 'Dashboard', path: '/admin/dashboard' },
  { sec: 'Vận Hành' },
  { id: 'pos', icon: '🛒', label: 'POS Bán Hàng', path: '/pos', pill: 'Mới' },
  { id: 'thuchi', icon: '💰', label: 'Thu Chi & Báo Cáo', path: '/SoThuChi' },
  { id: 'doisoat', icon: '📋', label: 'Đối Soát Ngày', path: '/SoThuChi/doi-soat' },
  { sec: 'Quản Lý' },
  { id: 'nhansu', icon: '👥', label: 'Nhân Sự', path: '/admin/nhan-su' },
  { id: 'crm', icon: '💝', label: 'CRM Khách Hàng', path: '/admin/crm' },
  { id: 'kho', icon: '📦', label: 'Kho Hàng', path: '/admin/kho-hang' },
  { id: 'khuyenmai', icon: '🏷️', label: 'Khuyến Mãi', path: '/admin/khuyen-mai' },
  { id: 'marketing', icon: '📣', label: 'Marketing', path: '/admin/marketing' },
  { id: 'web', icon: '🌐', label: 'Nội Dung Web', path: '/admin/trang-chu' },
  { sec: 'Hệ Thống' },
  { id: 'settings', icon: '⚙️', label: 'Cài Đặt', path: '/SoThuChi/cai-dat' },
]

function getInitials(name) {
  if (!name) return 'H'
  const parts = name.trim().split(' ')
  if (parts.length === 1) return parts[0][0]?.toUpperCase() || 'H'
  return (parts[parts.length - 1][0] || '').toUpperCase()
}

export default function AdminShell({ children, title = 'Dashboard', subtitle }) {
  const { user, logout } = useAuth()
  const [now, setNow] = useState(new Date())
  const [mobileOpen, setMobileOpen] = useState(false)
  const path = window.location.pathname

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  const days = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7']
  const dateStr = `${days[now.getDay()]} · ${now.getDate().toString().padStart(2, '0')}/${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getFullYear()}`

  const handleNav = (itemPath) => {
    window.location.href = itemPath
    setMobileOpen(false)
  }

  const handleLogout = async () => {
    await logout()
    window.location.replace('/')
  }

  return (
    <div className="app-shell">
      {/* ── SIDEBAR ── */}
      <aside className={`side${mobileOpen ? ' open' : ''}`}>
        <div className="brand">
          <div className="brand-mark">H</div>
          <div className="brand-text">
            <h1>Hannah <em style={{ fontStyle: 'italic', fontWeight: 500, opacity: .85 }}>spa</em></h1>
            <span>Spa & Beauty · Admin</span>
          </div>
        </div>

        <nav className="side-nav">
          {NAV_ITEMS.map((n, i) =>
            n.sec ? (
              <div className="nav-section" key={i}>{n.sec}</div>
            ) : (
              <button
                key={i}
                className={`nav-item${path.startsWith(n.path) ? ' active' : ''}`}
                onClick={() => handleNav(n.path)}
              >
                <span className="ico">{n.icon}</span>
                <span>{n.label}</span>
                {n.pill && <span className="pill">{n.pill}</span>}
              </button>
            )
          )}
        </nav>

        <div className="side-foot">
          <div className="avatar">{getInitials(user?.ho_ten)}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="user-name">{user?.ho_ten || 'Admin'}</div>
            <div className="user-role">Quản Trị Viên</div>
          </div>
          <button
            onClick={handleLogout}
            style={{
              background: 'rgba(255,255,255,.08)', border: 'none', borderRadius: 8,
              color: 'rgba(243,230,210,.5)', cursor: 'pointer', padding: '4px 8px',
              fontSize: 18,
            }}
            title="Đăng xuất"
          >
            ⏻
          </button>
        </div>
      </aside>

      {/* ── MAIN ── */}
      <div className="main-area">
        {/* Topbar */}
        <header className="topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              className="icon-btn"
              style={{ display: 'none' }}
              id="mobile-menu-btn"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              ☰
            </button>
            <div className="crumbs">
              <div>
                <div className="h">{title}</div>
                <div className="path">
                  {subtitle || <span>Tổng Quan · <b>{dateStr}</b></span>}
                </div>
              </div>
            </div>
          </div>

          <div className="top-actions">
            <button className="btn gold" onClick={() => window.location.href = '/pos'}>
              ＋ Tạo Đơn
            </button>
            <div className="now-clock">
              <div className="t">{now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</div>
              <div className="d">{dateStr}</div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="page">
          {children}
        </div>
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 150,
          }}
        />
      )}

      {/* Mobile menu button */}
      <style>{`
        @media (max-width: 768px) {
          #mobile-menu-btn { display: flex !important; }
        }
      `}</style>
    </div>
  )
}
