import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import I from '../shared/Icons'

const ROLE_LABEL = {
  admin: 'Quản Trị Viên',
  le_tan: 'Lễ Tân',
  ktv: 'Kỹ Thuật Viên',
  tap_vu: 'Tạp Vụ',
}

const PAGE_TITLES = {
  '/admin':                          'Tổng Quan',
  '/admin/dashboard':                'Dashboard',
  '/admin/nhan-su':                  'Hồ Sơ Nhân Viên',
  '/admin/nhan-su/tong-quan':        'Tổng Quan NS',
  '/admin/nhan-su/ho-so':            'Hồ Sơ NV',
  '/admin/nhan-su/lich-ca':          'Lịch Ca',
  '/admin/nhan-su/xet-duyet':        'Xét Duyệt OFF',
  '/admin/nhan-su/bang-luong':       'Lương Cứng',
  '/admin/nhan-su/luong-kinh-doanh': 'Lương Kinh Doanh',
  '/admin/nhan-su/quy-ngay-le':      'Quỹ Ngày Lễ',
  '/admin/crm':                      'CRM Khách Hàng',
  '/admin/the-lieu-trinh':           'Thẻ Liệu Trình',
  '/admin/kho-hang':                 'Kho Hàng',
  '/admin/kho-hang/san-pham':        'Sản Phẩm',
  '/admin/kho-hang/giao-dich':       'Nhật Ký Nhập/Xuất',
  '/admin/kho-hang/bao-cao':         'Báo Cáo Kho',
  '/admin/khuyen-mai':               'Khuyến Mãi',
  '/admin/khuyen-mai/roi':           'Phân Tích ROI',
  '/admin/marketing':                'Tổng Quan Marketing',
  '/admin/marketing/hop-thu':        'Hộp Thư Khách',
  '/admin/marketing/fanpage-noi-dung': 'Fanpage & Nội Dung',
  '/admin/marketing/khach-tiem-nang': 'Khách Tiềm Năng',
  '/admin/marketing/tu-dong':        'Chiến Dịch Tự Động',
  '/admin/marketing/cham-soc-sau-dich-vu': 'Chiến Dịch Tự Động',
  '/admin/marketing/cham-soc-lai':   'Chiến Dịch Tự Động',
  '/admin/marketing/win-back':       'Chiến Dịch Tự Động',
  '/admin/marketing/khach-le':       'Chiến Dịch Tự Động',
  '/admin/marketing/chien-dich':     'Chiến Dịch',
  '/admin/marketing/khach-remarketing': 'Khách & Remarketing',
  '/admin/marketing/huan-luyen':     'Huấn Luyện AI',
  '/admin/marketing/cau-hinh-kenh':  'Cấu Hình Kênh',
  '/admin/cham-soc-khach':           'Hôm Nay Cần Chạm',
  '/admin/nhac-lieu-trinh':          'Soạn Tay AI (Nhắc Thẻ)',
  '/admin/trang-chu':                'Nội Dung Web',
  '/SoThuChi':                       'Sổ Thu Chi',
  '/SoThuChi/nhap-lieu':             'Nhập Thu Chi',
  '/SoThuChi/doi-soat':              'Đối Soát',
  '/SoThuChi/chot-ngay':             'Chốt Ngày',
  '/SoThuChi/bao-cao':               'Báo Cáo',
  '/SoThuChi/cai-dat':               'Cài Đặt',
  '/pos':                            'Bán Hàng',
}

const NHANSU_ITEMS = [
  { label: 'Tổng Quan',    path: '/admin/nhan-su/tong-quan' },
  { label: 'Hồ Sơ Nhân Viên', path: '/admin/nhan-su/ho-so' },
  { label: 'Lịch Ca',      path: '/admin/nhan-su/lich-ca' },
  { label: 'Xét Duyệt',   path: '/admin/nhan-su/xet-duyet' },
  { label: 'Lương Cứng',  path: '/admin/nhan-su/bang-luong' },
  { label: 'Lương Kinh Doanh', path: '/admin/nhan-su/luong-kinh-doanh' },
  { label: 'Quỹ Ngày Lễ', path: '/admin/nhan-su/quy-ngay-le' },
]

const MORE_ADMIN = [
  { label: 'Kho Hàng',       path: '/admin/kho-hang',        icon: '📦' },
  { label: 'CRM',             path: '/admin/crm',             icon: '💝' },
  { label: 'Hộp Thư',         path: '/admin/marketing/hop-thu', icon: '💬' },
  { label: 'Thẻ LT',         path: '/admin/the-lieu-trinh',  icon: '🎫' },
  { label: 'Khuyến Mãi',     path: '/admin/khuyen-mai',      icon: '🏷️' },
  { label: 'Marketing',       path: '/admin/marketing',       icon: '📣' },
  { label: 'Nội Dung Web',   path: '/admin/trang-chu',       icon: '🌐' },
  { label: 'Checkin NV',     path: '/checkin',               icon: '📱' },
]

const MORE_LETAN = [
  { label: 'Hộp Thư',   path: '/admin/marketing/hop-thu', icon: '💬' },
  { label: 'Cần Chạm',  path: '/admin/cham-soc-khach', icon: '📞' },
  { label: 'CD Tự Động', path: '/admin/marketing/tu-dong', icon: '🤖' },
  { label: 'CRM',       path: '/admin/crm', icon: '💝' },
  { label: 'Cài Đặt',   path: '/SoThuChi/cai-dat', icon: '⚙️' },
]

const BOTTOM_ADMIN = [
  { id: 'dashboard', label: 'Tổng Quan', Icon: I.Dashboard, path: '/admin/dashboard' },
  { id: 'sothuchi',  label: 'Thu Chi',   Icon: I.Wallet,    path: '/SoThuChi' },
  { id: 'pos',       label: 'Bán Hàng',  Icon: I.Cart,      path: '/pos' },
  { id: 'nhansu',    label: 'Nhân Sự',   Icon: I.Users,     hasChildren: true },
  { id: 'more',      label: 'Thêm',      Icon: I.More,      isMore: true },
]

const BOTTOM_LETAN = [
  { id: 'sothuchi', label: 'Thu Chi', Icon: I.Wallet, path: '/SoThuChi' },
  { id: 'pos',      label: 'Bán Hàng', Icon: I.Cart,   path: '/pos' },
  { id: 'more',     label: 'Thêm',    Icon: I.More,   isMore: true },
]

function getInitials(name) {
  if (!name) return 'H'
  const p = name.trim().split(' ')
  return (p[p.length - 1][0] || '').toUpperCase()
}

const C = {
  espresso:   '#3d2c20',
  espressoDk: '#2a1d14',
  champagne:  '#C9A96E',
  cream:      '#f3e6d2',
  creamFaint: 'rgba(243,230,210,0.45)',
  border:     'rgba(201,169,110,0.15)',
  overlay:    'rgba(201,169,110,0.10)',
  white06:    'rgba(255,255,255,0.06)',
  white08:    'rgba(255,255,255,0.08)',
  white20:    'rgba(255,255,255,0.20)',
}

// ── Sheet chung ──────────────────────────────────────────────────────────────
function Sheet({ onClose, title, children }) {
  return (
    <>
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,.65)',
        zIndex: 200, backdropFilter: 'blur(3px)',
      }} />
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 201,
        background: C.espresso,
        borderRadius: '22px 22px 0 0',
        boxShadow: '0 -8px 40px rgba(0,0,0,.5)',
        paddingBottom: 'calc(env(safe-area-inset-bottom,0px) + 20px)',
        animation: 'mbSlideUp .25s cubic-bezier(.2,.8,.3,1)',
      }}>
        <style>{`@keyframes mbSlideUp{from{transform:translateY(100%);opacity:.6}to{transform:translateY(0);opacity:1}}`}</style>
        <div style={{ width: 40, height: 4, borderRadius: 2, background: C.white20, margin: '12px auto 0' }} />
        <div style={{ padding: '16px 20px 12px', borderBottom: `1px solid ${C.white08}` }}>
          <div style={{ fontFamily: 'var(--serif)', fontSize: 20, fontWeight: 700, color: C.cream }}>
            {title}
          </div>
        </div>
        {children}
      </div>
    </>
  )
}

// ── Main ─────────────────────────────────────────────────────────────────────
export default function MobileShell({ children }) {
  const { user, logout } = useAuth()
  const [sheet, setSheet] = useState(null)
  const path = window.location.pathname
  const role = user?.vai_tro || 'admin'

  const isAdmin = role === 'admin'
  const nav = isAdmin ? BOTTOM_ADMIN : BOTTOM_LETAN
  const moreItems = isAdmin ? MORE_ADMIN : MORE_LETAN
  const pageTitle = PAGE_TITLES[path] || 'Hannah Spa'

  const isNavActive = (item) => {
    if (item.hasChildren) return path.startsWith('/admin/nhan-su')
    if (!item.path) return false
    return path === item.path || (item.path !== '/' && path.startsWith(item.path + '/'))
  }

  const handleNavClick = (item) => {
    if (item.isMore)        { setSheet('more');   return }
    if (item.hasChildren)   { setSheet('nhansu'); return }
    window.location.href = item.path
  }

  const handleLogout = async () => { await logout(); window.location.replace('/') }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', fontFamily: 'var(--sans)', overflowX: 'hidden' }}>

      {/* ── HEADER ─────────────────────────────────────────────────────────── */}
      <header style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        height: 56,
        background: `linear-gradient(180deg, ${C.espresso} 0%, ${C.espressoDk} 100%)`,
        display: 'flex', alignItems: 'center', padding: '0 14px 0 16px',
        gap: 10, borderBottom: `1px solid ${C.white08}`,
      }}>
        <img src="/logo.png" alt="Hannah Spa" style={{ height: 26, width: 'auto', flexShrink: 0 }} />

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontFamily: 'var(--serif)', fontSize: 15, fontWeight: 700, color: C.cream,
            lineHeight: 1.15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {pageTitle}
          </div>
          <div style={{ fontSize: 9.5, color: C.creamFaint, letterSpacing: '.1em', textTransform: 'uppercase' }}>
            {ROLE_LABEL[role] || 'Admin'}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{
            width: 30, height: 30, borderRadius: '50%',
            background: 'var(--grad-gold)', color: C.espressoDk,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, fontWeight: 700, flexShrink: 0,
          }}>
            {getInitials(user?.ho_ten)}
          </div>
          <button onClick={handleLogout} style={{
            width: 30, height: 30, borderRadius: 8,
            background: C.white06, border: 'none',
            color: C.creamFaint, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <I.Logout style={{ width: 13, height: 13 }} />
          </button>
        </div>
      </header>

      {/* ── CONTENT ─────────────────────────────────────────────────────────── */}
      <div style={{ paddingTop: 56, paddingBottom: 72 }}>
        {children}
      </div>

      {/* ── BOTTOM NAV ──────────────────────────────────────────────────────── */}
      <nav style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 100,
        background: `linear-gradient(180deg, ${C.espressoDk} 0%, #221510 100%)`,
        borderTop: `1px solid ${C.border}`,
        display: 'flex', alignItems: 'stretch',
        paddingBottom: 'env(safe-area-inset-bottom,0px)',
        minHeight: 64,
      }}>
        {nav.map(item => {
          const active = isNavActive(item)
          return (
            <button key={item.id} onClick={() => handleNavClick(item)} style={{
              flex: 1, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', gap: 3,
              border: 'none', background: 'none', cursor: 'pointer',
              padding: '10px 4px 8px',
              color: active ? C.champagne : C.creamFaint,
              position: 'relative', transition: 'color .15s',
            }}>
              {active && (
                <div style={{
                  position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
                  width: 32, height: 2.5, borderRadius: '0 0 3px 3px',
                  background: `linear-gradient(90deg,#C9A96E,#A0714F)`,
                  boxShadow: '0 1px 6px rgba(201,169,110,.5)',
                }} />
              )}
              <item.Icon style={{ width: 21, height: 21 }} />
              <span style={{
                fontSize: 9.5, fontWeight: active ? 700 : 500,
                letterSpacing: '.02em', lineHeight: 1,
              }}>
                {item.label}
              </span>
            </button>
          )
        })}
      </nav>

      {/* ── NHÂN SỰ SHEET ───────────────────────────────────────────────────── */}
      {sheet === 'nhansu' && (
        <Sheet onClose={() => setSheet(null)} title="Nhân Sự">
          <div style={{ padding: '6px 0 0' }}>
            {NHANSU_ITEMS.map(item => {
              const active = path === item.path
              return (
                <button key={item.path}
                  onClick={() => { setSheet(null); window.location.href = item.path }}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center',
                    padding: '14px 20px', border: 'none', background: 'none',
                    cursor: 'pointer', textAlign: 'left', gap: 12,
                    borderLeft: active ? `3px solid ${C.champagne}` : '3px solid transparent',
                    transition: 'background .12s',
                  }}
                  onTouchStart={e => e.currentTarget.style.background = C.white06}
                  onTouchEnd={e => e.currentTarget.style.background = 'none'}
                >
                  <span style={{
                    flex: 1, fontSize: 14.5, fontWeight: active ? 700 : 500,
                    color: active ? C.champagne : 'rgba(243,230,210,.8)',
                  }}>
                    {item.label}
                  </span>
                  {active
                    ? <span style={{ fontSize: 11, color: C.champagne }}>●</span>
                    : <span style={{ fontSize: 15, color: 'rgba(243,230,210,.25)' }}>›</span>
                  }
                </button>
              )
            })}
          </div>
        </Sheet>
      )}

      {/* ── MORE SHEET ──────────────────────────────────────────────────────── */}
      {sheet === 'more' && (
        <Sheet onClose={() => setSheet(null)} title="Các Module">
          <div style={{ padding: '16px 16px 0', display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
            {moreItems.map(item => (
              <button key={item.path}
                onClick={() => { setSheet(null); window.location.href = item.path }}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  gap: 8, padding: '18px 8px',
                  background: C.white06, border: `1px solid ${C.white08}`,
                  borderRadius: 14, cursor: 'pointer', transition: 'background .12s',
                }}
                onTouchStart={e => e.currentTarget.style.background = C.overlay}
                onTouchEnd={e => e.currentTarget.style.background = C.white06}
              >
                <span style={{ fontSize: 26, lineHeight: 1 }}>{item.icon}</span>
                <span style={{
                  fontSize: 11, fontWeight: 600, textAlign: 'center', lineHeight: 1.3,
                  color: 'rgba(243,230,210,.8)',
                }}>
                  {item.label}
                </span>
              </button>
            ))}
          </div>
        </Sheet>
      )}
    </div>
  )
}
