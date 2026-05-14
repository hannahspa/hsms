import { useState, useEffect, createElement } from 'react'
import { useAuth } from '../../context/AuthContext'
import { getNavByRole } from '../../constants/navConfig'
import { getNowVN } from '../../lib/utils'
import I from '../shared/Icons'
import '../../styles/hannah-admin.css'
import '../../styles/modules.css'

const ROLE_LABEL = {
  admin: 'Quản Trị Viên',
  le_tan: 'Lễ Tân',
  ktv: 'Kỹ Thuật Viên',
  tap_vu: 'Tạp Vụ',
}

// Map icon key từ navConfig sang Icons component
const ICON_MAP = {
  dashboard: I.Dashboard,
  pos: I.Cart,
  sothuchi: I.Wallet,
  thuchi: I.Wallet,
  doisoat: I.Receipt,
  nhansu: I.Users,
  crm: I.Heart,
  'the-lieu-trinh': I.CreditCard,
  commission: I.Award,
  kho: I.Box,
  khuyenmai: I.Tag,
  marketing: I.Speaker,
  web: I.Globe,
  settings: I.Cog,
  tongquan: I.Dashboard,
  taikhoan: I.Wallet,
  baocao: I.Coin,
  'nhap lieu': I.Receipt,
}

function getInitials(name) {
  if (!name) return 'H'
  const parts = name.trim().split(' ')
  if (parts.length === 1) return parts[0][0]?.toUpperCase() || 'H'
  return (parts[parts.length - 1][0] || '').toUpperCase()
}

export default function AdminShell({ children }) {
  const { user, logout } = useAuth()
  const [now, setNow] = useState(getNowVN())
  const [mobileOpen, setMobileOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [openMenus, setOpenMenus] = useState({})
  const path = window.location.pathname

  const role = user?.vai_tro || 'admin'
  const navItems = getNavByRole(role)

  // Tự động mở menu cha nếu path khớp với children
  useEffect(() => {
    const next = { ...openMenus }
    navItems.forEach(n => {
      if (n.children) {
        const matched = n.children.some(c => path === c.path || (c.path !== '/SoThuChi' && path.startsWith(c.path + '/')))
        if (matched) next[n.id] = true
      }
    })
    setOpenMenus(next)
  }, [path])

  useEffect(() => {
    const t = setInterval(() => setNow(getNowVN()), 1000)
    return () => clearInterval(t)
  }, [])

  const DAYS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7']
  const dateStr = `${DAYS[now.getDay()]} · ${now.getDate().toString().padStart(2, '0')}/${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getFullYear()}`
  const timeStr = now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })

  const handleNav = (itemPath) => {
    window.location.href = itemPath
    setMobileOpen(false)
  }

  const toggleMenu = (id) => {
    setOpenMenus(prev => ({ ...prev, [id]: !prev[id] }))
  }

  const handleLogout = async () => {
    await logout()
    window.location.replace('/')
  }

  const isChildActive = (children) => {
    return children?.some(c => path === c.path || (c.path !== '/SoThuChi' && path.startsWith(c.path + '/')))
  }

  return (
    <div className={`app${collapsed ? ' collapsed' : ''}`}>
      {/* ── SIDEBAR ── */}
      <aside className={`side${mobileOpen ? ' open' : ''}${collapsed ? ' collapsed' : ''}`}>
        <button className="side-toggle" onClick={() => setCollapsed(!collapsed)} title={collapsed ? 'Mở rộng menu' : 'Thu gọn menu'}>
          {collapsed ? '▶' : '◀'}
        </button>
        <div className="brand">
          <div className="brand-mark">H</div>
          {!collapsed && (
            <div className="brand-text">
              <h1>Hannah <em style={{ fontStyle: 'italic', fontWeight: 500, opacity: .85 }}>spa</em></h1>
              <span>Spa & Beauty · {ROLE_LABEL[role] || 'Admin'}</span>
            </div>
          )}
        </div>

        <nav className="side-nav">
          {navItems.map((n, i) => {
            if (n.sec) {
              return collapsed ? null : <div className="nav-section" key={i}>{n.sec}</div>
            }

            // Menu cha có children → accordion
            if (n.children) {
              const isOpen = openMenus[n.id]
              const hasActiveChild = isChildActive(n.children)
              const parentIcon = ICON_MAP[n.id]
              return (
                <div key={i} className={`nav-group${isOpen ? ' open' : ''}`}>
                  <button
                    className={`nav-item nav-parent${hasActiveChild ? ' active' : ''}`}
                    onClick={() => toggleMenu(n.id)}
                  >
                    {parentIcon
                      ? createElement(parentIcon, { className: 'ico' })
                      : <span className="ico">{n.icon}</span>
                    }
                    {!collapsed && (
                      <>
                        <span>{n.label}</span>
                        <span className={`nav-arrow${isOpen ? ' open' : ''}`}>▾</span>
                      </>
                    )}
                  </button>
                  {isOpen && !collapsed && (
                    <div className="nav-children">
                      {n.children.map((child, ci) => {
                        const isActive = path === child.path || (child.path !== '/SoThuChi' && path.startsWith(child.path + '/'))
                        const childIcon = ICON_MAP[child.id]
                        return (
                          <button
                            key={ci}
                            className={`nav-item nav-child${isActive ? ' active' : ''}`}
                            onClick={() => handleNav(child.path)}
                          >
                            <span className="ico-arr">›</span>
                            <span>{child.label}</span>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            }

            // Menu item thường
            const icon = ICON_MAP[n.id]
            return (
              <button
                key={i}
                className={`nav-item${path === n.path || (n.path !== '/SoThuChi' && path.startsWith(n.path + '/')) ? ' active' : ''}`}
                onClick={() => handleNav(n.path)}
              >
                {icon
                  ? createElement(icon, { className: 'ico' })
                  : <span className="ico">{n.icon}</span>
                }
                {!collapsed && <span>{n.label}</span>}
                {n.pill && !collapsed && <span className="pill">{n.pill}</span>}
              </button>
            )
          })}
        </nav>

        {!collapsed && (
          <div className="side-foot">
            <div className="avatar">{getInitials(user?.ho_ten)}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="user-name">{user?.ho_ten || 'Admin'}</div>
              <div className="user-role">{ROLE_LABEL[role] || 'Quản Trị Viên'}</div>
            </div>
            <button
              onClick={handleLogout}
              style={{
                background: 'rgba(255,255,255,.08)', border: 'none', borderRadius: 8,
                color: 'rgba(243,230,210,.5)', cursor: 'pointer', padding: '4px 8px',
                fontSize: 18, lineHeight: 1,
              }}
              title="Đăng xuất"
            >
              ⏻
            </button>
          </div>
        )}
        {collapsed && (
          <button
            onClick={handleLogout}
            style={{
              background: 'rgba(255,255,255,.08)', border: 'none', borderRadius: 8,
              color: 'rgba(243,230,210,.5)', cursor: 'pointer', padding: '8px', margin: 'auto 12px 14px',
              fontSize: 16, lineHeight: 1,
            }}
            title="Đăng xuất"
          >
            ⏻
          </button>
        )}
      </aside>

      {/* ── MAIN ── */}
      <div className="main">
        {/* Topbar */}
        <header className="topbar">
          <div className="crumbs">
            <div>
              <div className="h">Dashboard</div>
              <div className="path">{ROLE_LABEL[role] || 'Admin'} · <b>{dateStr}</b></div>
            </div>
          </div>

          <div className="search">
            <I.Search />
            <input placeholder="Tìm khách hàng, dịch vụ, hoá đơn…" />
            <kbd>⌘K</kbd>
          </div>

          <div className="top-actions">
            <button className="icon-btn"><I.Filter style={{ width: 16, height: 16 }} /></button>
            <button className="icon-btn"><I.Bell style={{ width: 17, height: 17 }} /><span className="dot" /></button>
            {role !== 'ktv' && (
              <button className="btn gold" onClick={() => window.location.href = '/pos'}>
                <I.Plus style={{ width: 14, height: 14 }} /> Tạo Đơn
              </button>
            )}
            <div className="now-clock">
              <div className="t">{timeStr}</div>
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
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 150 }}
        />
      )}

      {/* Mobile hamburger */}
      <style>{`
        @media (max-width: 768px) {
          .mobile-hamburger { display: flex !important; }
        }
      `}</style>
    </div>
  )
}
