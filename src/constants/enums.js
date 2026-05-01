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
  TIEN_MAT:  'tien_mat',
  NGAN_HANG: 'ngan_hang',
}

export const HINH_THUC_THU = [
  { id: 'tien_mat',      label: 'Tiền Mặt',        icon: '💵', vi: 'Tiền Mặt'   },
  { id: 'chuyen_khoan',  label: 'Chuyển Khoản',     icon: '🏦', vi: 'MB Bank'    },
  { id: 'quet_the',      label: 'Quẹt Thẻ',         icon: '💳', vi: 'TP Bank'    },
  { id: 'the_tra_truoc', label: 'Thẻ Trả Trước',    icon: '🎫', vi: 'Tiền Mặt'  },
]

export const MOCK_USERS = {
  admin:  { ten: 'Cao Quốc Nam', vai_tro: 'admin'  },
  le_tan: { ten: 'Khánh Duy',    vai_tro: 'le_tan' },
  ktv:    { ten: 'Cẩm My',       vai_tro: 'ktv'    },
}
