export const ADMIN_NAV = [
  { sec: 'Tổng Quan' },
  { id: 'dashboard', icon: '📊', label: 'Dashboard', path: '/admin/dashboard' },

  { sec: 'Vận Hành' },
  { id: 'pos', icon: '🛒', label: 'Bán Hàng', children: [
    { id: 'pos-tao', label: 'Tạo Đơn Hàng', path: '/pos' },
    { id: 'pos-ds', label: 'Danh Sách Bán Hàng', path: '/pos/danh-sach' },
  ]},
  { id: 'lichhen', icon: '📅', label: 'Lịch Hẹn', path: '/SoThuChi/lich-hen' },

  { id: 'sothuchi', icon: '💰', label: 'Sổ Thu Chi', children: [
    { id: 'tongquan', label: 'Tổng Quan', path: '/SoThuChi' },
    { id: 'danhsach', label: 'Danh Sách Thu Chi', path: '/SoThuChi/danh-sach' },
    { id: 'doisoat', label: 'Đối Soát Ngày', path: '/SoThuChi/doi-soat' },
    { id: 'chotngay', label: 'Chốt Ngày', path: '/SoThuChi/chot-ngay' },
    { id: 'nhap lieu', label: 'Nhập Thu Chi', path: '/SoThuChi/nhap-lieu' },
    { id: 'kiemsoatchi', label: 'Kiểm Soát Chi Phí', path: '/SoThuChi/kiem-soat-chi' },
    { id: 'baocao', label: 'Báo Cáo', path: '/SoThuChi/bao-cao' },
    { id: 'settings', label: 'Cài Đặt', path: '/SoThuChi/cai-dat' },
  ]},

  { sec: 'Quản Lý' },
  { id: 'nhansu', icon: '👥', label: 'Nhân Sự', children: [
    { id: 'ns-tongquan', label: 'Tổng Quan', path: '/admin/nhan-su/tong-quan' },
    { id: 'ns-hosonv', label: 'Hồ Sơ Nhân Viên', path: '/admin/nhan-su/ho-so' },
    { id: 'ns-lichca', label: 'Lịch Ca', path: '/admin/nhan-su/lich-ca' },
    { id: 'ns-xetduyet', label: 'Xét Duyệt', path: '/admin/nhan-su/xet-duyet' },
    { id: 'ns-luongcung', label: 'Lương Cứng', path: '/admin/nhan-su/bang-luong' },
    { id: 'ns-luongkd', label: 'Lương Kinh Doanh', path: '/admin/nhan-su/luong-kinh-doanh' },
    { id: 'ns-baocaohh', label: 'Báo Cáo Hoa Hồng / Tour', path: '/admin/nhan-su/bao-cao-thu-nhap' },
    { id: 'ns-quyngayle', label: 'Quỹ Ngày Lễ', path: '/admin/nhan-su/quy-ngay-le' },
  ]},

  { id: 'crm', icon: '💝', label: 'CRM Khách Hàng', path: '/admin/crm' },
  { id: 'dichvu', icon: '💎', label: 'Dịch Vụ', children: [
    { id: 'dv-danhsach', label: 'Danh Sách Dịch Vụ', path: '/admin/dich-vu' },
    { id: 'dv-danhmuc', label: 'Danh Mục Dịch Vụ', path: '/admin/dich-vu/danh-muc' },
  ]},
  { id: 'the-lieu-trinh', icon: '🎫', label: 'Thẻ Liệu Trình', children: [
    { id: 'tlt-danhsach', label: 'Danh Sách Thẻ',    path: '/admin/the-lieu-trinh' },
    { id: 'tlt-combo',    label: 'Combo Liệu Trình',  path: '/admin/the-lieu-trinh/combo' },
    { id: 'tlt-baocao',   label: 'Báo Cáo Thẻ',         path: '/admin/the-lieu-trinh/bao-cao' },
  ]},

  { id: 'kho', icon: '📦', label: 'Kho Hàng', children: [
    { id: 'kho-tongquan', label: 'Tổng Quan', path: '/admin/kho-hang' },
    { id: 'kho-sanpham', label: 'Sản Phẩm', path: '/admin/kho-hang/san-pham' },
    { id: 'kho-giaodich', label: 'Nhập / Xuất', path: '/admin/kho-hang/giao-dich' },
    { id: 'kho-chietrot', label: 'Chiết Rót', path: '/admin/kho-hang/chiet-rot' },
    { id: 'kho-baocao', label: 'Báo Cáo', path: '/admin/kho-hang/bao-cao' },
  ]},

  { id: 'khuyenmai', icon: '🏷️', label: 'Khuyến Mãi', children: [
    { id: 'km-danhsach', label: 'Danh Sách', path: '/admin/khuyen-mai' },
    { id: 'km-roi', label: 'Phân Tích ROI', path: '/admin/khuyen-mai/roi' },
  ]},

  { id: 'marketing', icon: '📣', label: 'Marketing', children: [
    { id: 'mkt-dashboard', label: 'Dashboard', path: '/admin/marketing' },
    { id: 'mkt-chiendich', label: 'Chiến Dịch', path: '/admin/marketing/chien-dich' },
    { id: 'mkt-chiphi', label: 'Chi Phí', path: '/admin/marketing/chi-phi' },
  ]},

  { id: 'web', icon: '🌐', label: 'Nội Dung Web', path: '/admin/trang-chu' },
]

export const LETAN_NAV = [
  { sec: 'Vận Hành' },
  { id: 'pos', icon: '🛒', label: 'Bán Hàng', children: [
    { id: 'pos-tao',    label: 'Tạo Đơn Hàng',       path: '/pos' },
    { id: 'pos-ds',     label: 'Danh Sách Bán Hàng',  path: '/pos/danh-sach' },
  ]},
  { id: 'lichhen', icon: '📅', label: 'Lịch Hẹn', path: '/SoThuChi/lich-hen' },

  { id: 'sothuchi', icon: '💰', label: 'Sổ Thu Chi', children: [
    { id: 'danhsach',   label: 'Danh Sách Thu Chi', path: '/SoThuChi/danh-sach' },
    { id: 'doisoat',    label: 'Đối Soát Ngày',   path: '/SoThuChi/doi-soat' },
    { id: 'chotngay',   label: 'Chốt Ngày',        path: '/SoThuChi/chot-ngay' },
    { id: 'nhap lieu',  label: 'Nhập Thu Chi',     path: '/SoThuChi/nhap-lieu' },
    { id: 'settings',   label: 'Cài Đặt',          path: '/SoThuChi/cai-dat' },
  ]},

  { id: 'kho', icon: '📦', label: 'Kho Hàng', children: [
    { id: 'kho-tongquan', label: 'Tổng Quan',   path: '/admin/kho-hang' },
    { id: 'kho-sanpham',  label: 'Sản Phẩm',    path: '/admin/kho-hang/san-pham' },
    { id: 'kho-giaodich', label: 'Nhập / Xuất', path: '/admin/kho-hang/giao-dich' },
    { id: 'kho-baocao',   label: 'Báo Cáo',     path: '/admin/kho-hang/bao-cao' },
  ]},

  { sec: 'Khách Hàng' },
  { id: 'crm',          icon: '💝', label: 'CRM Khách Hàng',  path: '/admin/crm' },
  { id: 'the-lieu-trinh', icon: '🎫', label: 'Thẻ Liệu Trình', path: '/admin/the-lieu-trinh' },
]

export const KTV_NAV = [
  { sec: 'Cá Nhân' },
  { id: 'lich', icon: '📅', label: 'Lịch Làm Việc', path: '/checkin/lich' },
  { id: 'luong', icon: '💰', label: 'Bảng Lương', path: '/checkin/luong' },
]

export function getNavByRole(role) {
  if (role === 'admin') return ADMIN_NAV
  if (role === 'le_tan') return LETAN_NAV
  return KTV_NAV
}
