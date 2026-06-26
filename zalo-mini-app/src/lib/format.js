export const fmt = (n) => (n ? new Intl.NumberFormat('vi-VN').format(n) + 'đ' : '—')
export const fmtDate = (d) => (d ? String(d).slice(0, 10).split('-').reverse().join('/') : '')

// Nhãn khuyến mãi giống trang Khuyến Mãi HSMS
export function kmBadge(km) {
  if (!km) return ''
  if (km.loai_km === 'mua_x_tang_y') return `Mua ${km.mua_x} tặng ${km.tang_y}`
  if (km.loai_km === 'mua_n_giam_pct') return `Mua ${km.mua_x} giảm ${km.pct_giam_lan}%`
  const goc = +km.gia_goc || 0, kmg = +km.gia_km || 0
  if (goc && kmg) {
    const pct = Math.round(((goc - kmg) / goc) * 100)
    return pct > 0 ? `Giảm ${pct}%` : fmt(goc - kmg)
  }
  return 'Ưu đãi'
}

export const TT_LICH = {
  cho_xac_nhan: { lb: 'Chờ xác nhận', bg: '#FFF4E3', c: '#B8791F' },
  da_xac_nhan:  { lb: 'Đã xác nhận', bg: '#EAF4EA', c: '#2D7A4F' },
  da_xong:      { lb: 'Đã xong',     bg: '#F0EDE8', c: '#8B7355' },
  huy:          { lb: 'Đã huỷ',      bg: '#FDECEA', c: '#C0392B' },
}
