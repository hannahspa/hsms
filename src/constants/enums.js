export const VAI_TRO = {
  ADMIN:   'admin',
  LE_TAN:  'le_tan',
  KTV:     'ktv',
  TAP_VU:  'tap_vu',
}

export const LOAI_GIAO_DICH = {
  THU:           'thu',
  CHI:           'chi',
  CHUYEN_KHOAN:  'chuyen_khoan',
}

export const LOAI_VI = {
  TIEN_MAT:     'tien_mat',
  CHUYEN_KHOAN: 'chuyen_khoan',
  QUET_THE:     'quet_the',
  // 'ngan_hang' đã bị loại bỏ từ migration 009 — chỉ giữ lại để backward compat
  NGAN_HANG:    'ngan_hang',
}

// loaiVi maps to vi.loai — wallet name is dynamic from vi.ten
// the_tra_truoc: loaiVi=null vì không vào cashflow ví nào
export const HINH_THUC_THU = [
  { id: 'tien_mat',      label: 'Tiền Mặt',        icon: '💵', loaiVi: 'tien_mat' },
  { id: 'chuyen_khoan',  label: 'Chuyển Khoản',     icon: '🏦', loaiVi: 'chuyen_khoan' },
  { id: 'quet_the',      label: 'Quẹt Thẻ',         icon: '💳', loaiVi: 'quet_the' },
  { id: 'the_tra_truoc', label: 'Thẻ Trả Trước',    icon: '🎫', loaiVi: null },
]

export const LOAI_ITEM = {
  DICH_VU:       'dich_vu',
  SAN_PHAM:      'san_pham',
  THE_LIEU_TRINH: 'the_lieu_trinh',
}

export const TRANG_THAI_DON_HANG = {
  DRAFT:          'draft',
  DA_THANH_TOAN:  'da_thanh_toan',
  NO_MOT_PHAN:    'no_mot_phan',
  HUY:            'huy',
}

export const LOAI_CONG_NO = {
  PHAT_SINH:  'phat_sinh',
  THANH_TOAN: 'thanh_toan',
  XOA_NO:     'xoa_no',
}

export const NGUON_DOANH_THU = {
  MANUAL:    'manual',
  POS:       'pos',
  MIGRATION: 'migration',
}

export const TRANG_THAI_LICH_HEN = {
  CHO_XAC_NHAN: 'cho_xac_nhan',
  DA_XAC_NHAN:  'da_xac_nhan',
  DA_DEN:       'da_den',
  KHONG_DEN:    'khong_den',
  DA_HUY:       'da_huy',
  ONLINE:       'online',
}

export const HANG_KHACH_HANG = {
  BRONZE: { key: 'bronze', label: 'Đồng', min: 0,        color: '#CD7F32' },
  SILVER: { key: 'silver', label: 'Bạc',  min: 5000000,  color: '#A8A9AD' },
  GOLD:   { key: 'gold',   label: 'Vàng', min: 15000000, color: '#C9A96E' },
}
