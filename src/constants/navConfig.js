// ═══════════════════════════════════════════════════════════════════════════════
// HSMS Navigation Config — Phân quyền theo vai trò
// Hỗ trợ menu cha-con (children) cho sidebar xổ xuống
// ═══════════════════════════════════════════════════════════════════════════════

export const ADMIN_NAV = [
  { sec: 'Tổng Quan' },
  { id: 'dashboard', icon: '📊', label: 'Dashboard', path: '/admin/dashboard' },

  { sec: 'Vận Hành' },
  { id: 'pos', icon: '🛒', label: 'POS Bán Hàng', path: '/pos', pill: 'Mới' },

  // ── SỔ THU CHI (menu cha xổ xuống) ──
  { id: 'sothuchi', icon: '💰', label: 'Sổ Thu Chi', children: [
    { id: 'tongquan', icon: '📊', label: 'Tổng Quan', path: '/SoThuChi' },
    { id: 'doisoat', icon: '📋', label: 'Đối Soát Ngày', path: '/SoThuChi/doi-soat' },
    { id: 'nhap lieu', icon: '📝', label: 'Nhập Thu Chi', path: '/SoThuChi/nhap-lieu' },
    { id: 'baocao', icon: '📈', label: 'Báo Cáo', path: '/SoThuChi/bao-cao' },
    { id: 'settings', icon: '⚙️', label: 'Cài Đặt', path: '/SoThuChi/cai-dat' },
  ]},

  { sec: 'Quản Lý' },
  { id: 'nhansu', icon: '👥', label: 'Nhân Sự', path: '/admin/nhan-su' },
  { id: 'crm', icon: '💝', label: 'CRM Khách Hàng', path: '/admin/crm' },
  { id: 'the-lieu-trinh', icon: '🎫', label: 'Thẻ Liệu Trình', path: '/admin/the-lieu-trinh' },
  { id: 'commission', icon: '💹', label: 'Hoa Hồng KTV', path: '/admin/commission' },
  { id: 'kho', icon: '📦', label: 'Kho Hàng', path: '/admin/kho-hang' },
  { id: 'khuyenmai', icon: '🏷️', label: 'Khuyến Mãi', path: '/admin/khuyen-mai' },
  { id: 'marketing', icon: '📣', label: 'Marketing', path: '/admin/marketing' },
  { id: 'web', icon: '🌐', label: 'Nội Dung Web', path: '/admin/trang-chu' },
]

export const LETAN_NAV = [
  { sec: 'Vận Hành' },
  { id: 'pos', icon: '🛒', label: 'POS Bán Hàng', path: '/pos' },

  // ── SỔ THU CHI (menu cha xổ xuống) ──
  { id: 'sothuchi', icon: '💰', label: 'Sổ Thu Chi', children: [
    { id: 'tongquan', icon: '📊', label: 'Tổng Quan', path: '/SoThuChi' },
    { id: 'doisoat', icon: '📋', label: 'Đối Soát Ngày', path: '/SoThuChi/doi-soat' },
    { id: 'nhap lieu', icon: '📝', label: 'Nhập Thu Chi', path: '/SoThuChi/nhap-lieu' },
    { id: 'settings', icon: '⚙️', label: 'Cài Đặt', path: '/SoThuChi/cai-dat' },
  ]},
]

export const KTV_NAV = [
  { sec: 'Cá Nhân' },
  { id: 'lich', icon: '📅', label: 'Lịch Làm Việc', path: '/checkin/lich' },
  { id: 'luong', icon: '💰', label: 'Bảng Lương', path: '/checkin/luong' },
]

/**
 * Lấy nav items theo vai trò
 * @param {'admin'|'le_tan'|'ktv'|'tap_vu'} role
 * @returns {Array} nav items
 */
export function getNavByRole(role) {
  if (role === 'admin') return ADMIN_NAV
  if (role === 'le_tan') return LETAN_NAV
  return KTV_NAV
}
