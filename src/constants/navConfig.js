// ═══════════════════════════════════════════════════════════════════════════════
// HSMS Navigation Config — Phân quyền theo vai trò
// Hỗ trợ menu cha-con (children) cho sidebar xổ xuống
// ═══════════════════════════════════════════════════════════════════════════════

export const ADMIN_NAV = [
  { sec: 'Tổng Quan' },
  { id: 'dashboard', icon: '📊', label: 'Dashboard', path: '/admin/dashboard' },

  { sec: 'Vận Hành' },
  { id: 'pos', icon: '🛒', label: 'POS Bán Hàng', path: '/pos', pill: 'Mới' },

  // ── SỔ THU CHI ──
  { id: 'sothuchi', icon: '💰', label: 'Sổ Thu Chi', children: [
    { id: 'tongquan',  label: 'Tổng Quan',      path: '/SoThuChi' },
    { id: 'doisoat',   label: 'Đối Soát Ngày',  path: '/SoThuChi/doi-soat' },
    { id: 'nhap lieu', label: 'Nhập Thu Chi',   path: '/SoThuChi/nhap-lieu' },
    { id: 'baocao',    label: 'Báo Cáo',         path: '/SoThuChi/bao-cao' },
    { id: 'settings',  label: 'Cài Đặt',         path: '/SoThuChi/cai-dat' },
  ]},

  { sec: 'Quản Lý' },

  // ── NHÂN SỰ ──
  { id: 'nhansu', icon: '👥', label: 'Nhân Sự', children: [
    { id: 'ns-danhsach',  label: 'Danh Sách NV', path: '/admin/nhan-su' },
    { id: 'ns-tongquan',  label: 'Tổng Quan',    path: '/admin/nhan-su/tong-quan' },
    { id: 'ns-hosonv',    label: 'Hồ Sơ NV',     path: '/admin/nhan-su/ho-so' },
    { id: 'ns-lichca',    label: 'Lịch Ca',       path: '/admin/nhan-su/lich-ca' },
    { id: 'ns-xetduyet',  label: 'Xét Duyệt',    path: '/admin/nhan-su/xet-duyet' },
    { id: 'ns-bangluong', label: 'Bảng Lương',   path: '/admin/nhan-su/bang-luong' },
  ]},

  { id: 'crm', icon: '💝', label: 'CRM Khách Hàng', path: '/admin/crm' },
  { id: 'the-lieu-trinh', icon: '🎫', label: 'Thẻ Liệu Trình', path: '/admin/the-lieu-trinh' },
  { id: 'commission', icon: '💹', label: 'Hoa Hồng KTV', path: '/admin/commission' },

  // ── KHO HÀNG ──
  { id: 'kho', icon: '📦', label: 'Kho Hàng', children: [
    { id: 'kho-tongquan', label: 'Tổng Quan',   path: '/admin/kho-hang' },
    { id: 'kho-sanpham',  label: 'Sản Phẩm',    path: '/admin/kho-hang/san-pham' },
    { id: 'kho-giaodich', label: 'Nhập / Xuất', path: '/admin/kho-hang/giao-dich' },
    { id: 'kho-chietrot', label: 'Chiết Rót',   path: '/admin/kho-hang/chiet-rot' },
    { id: 'kho-baocao',   label: 'Báo Cáo',     path: '/admin/kho-hang/bao-cao' },
  ]},

  // ── KHUYẾN MÃI ──
  { id: 'khuyenmai', icon: '🏷️', label: 'Khuyến Mãi', children: [
    { id: 'km-danhsach', label: 'Danh Sách',      path: '/admin/khuyen-mai' },
    { id: 'km-roi',      label: 'Phân Tích ROI',  path: '/admin/khuyen-mai/roi' },
  ]},

  // ── MARKETING ──
  { id: 'marketing', icon: '📣', label: 'Marketing', children: [
    { id: 'mkt-dashboard', label: 'Dashboard',   path: '/admin/marketing' },
    { id: 'mkt-chiendich', label: 'Chiến Dịch',  path: '/admin/marketing/chien-dich' },
    { id: 'mkt-chiphi',    label: 'Chi Phí',     path: '/admin/marketing/chi-phi' },
  ]},

  { id: 'web', icon: '🌐', label: 'Nội Dung Web', path: '/admin/trang-chu' },
]

export const LETAN_NAV = [
  { sec: 'Vận Hành' },
  { id: 'pos', icon: '🛒', label: 'POS Bán Hàng', path: '/pos' },

  // ── SỔ THU CHI ──
  { id: 'sothuchi', icon: '💰', label: 'Sổ Thu Chi', children: [
    { id: 'tongquan',  label: 'Tổng Quan',     path: '/SoThuChi' },
    { id: 'doisoat',   label: 'Đối Soát Ngày', path: '/SoThuChi/doi-soat' },
    { id: 'nhap lieu', label: 'Nhập Thu Chi',  path: '/SoThuChi/nhap-lieu' },
    { id: 'settings',  label: 'Cài Đặt',        path: '/SoThuChi/cai-dat' },
  ]},
]

export const KTV_NAV = [
  { sec: 'Cá Nhân' },
  { id: 'lich',  icon: '📅', label: 'Lịch Làm Việc', path: '/checkin/lich' },
  { id: 'luong', icon: '💰', label: 'Bảng Lương',    path: '/checkin/luong' },
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
