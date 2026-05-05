/**
 * TinhLuong — Shared salary calculation for all modules
 *
 * Logic nghiep vu:
 * - Moi NV co gioi_han_off_thang (mac dinh 3, Khanh Duy=4)
 * - off_phep trong dinh muc → co luong
 * - off_phep vuot dinh muc → OV (khong luong)
 * - off_t7: T7/CN co ly do → x2 ngay cong
 * - off_t7x: T7/CN khong ly do → x2 ngay cong + phat (T7:300k, CN:500k)
 * - Ngay le tich luy: di lam ngay le → +1 ngay OFF co luong
 */

import { getNowVN } from './utils'

// Constants
export const DON_GIA_TANG_CA = 25000
export const KY_QUY_MOIS     = 500000
export const PHAT_T7X_SAT    = 300000
export const PHAT_T7X_SUN    = 500000

// Vietnamese national holidays 2026
const HOLIDAYS_2026 = [
  '2026-01-01', // Tet Duong Lich
  '2026-02-16', // Tet Am Lich (29 Tet)
  '2026-02-17', // Tet Am Lich (Mung 1)
  '2026-02-18', // Tet Am Lich (Mung 2)
  '2026-04-30', // Giai Phong
  '2026-05-01', // Quoc Te Lao Dong
  '2026-09-02', // Quoc Khanh
]

export function isHoliday(dateStr) {
  if (!dateStr) return false
  return HOLIDAYS_2026.includes(String(dateStr).substring(0, 10))
}

export function getDaysInMonth(year, month) {
  return new Date(year, month, 0).getDate()
}

export function getDayOfWeek(dateStr) {
  const [y, m, d] = dateStr.substring(0, 10).split('-').map(Number)
  return new Date(y, m - 1, d).getDay()
}

export function isWeekend(dateStr) {
  return getDayOfWeek(dateStr) === 0 || getDayOfWeek(dateStr) === 6
}

/**
 * Tinh toan luong cho 1 nhan vien trong 1 thang
 *
 * @param {object} nv - nhan_vien row (ho_ten, luong_cung, gioi_han_off_thang, ky_quy_trang_thai)
 * @param {Array}  chamCongList - cham_cong rows (ngay, loai, he_so, tang_ca_gio, gio_ra)
 * @param {Array}  dangKyOffList - dang_ky_off rows (ngay_off as ngay, loai_off as loai)
 *                                  chi lay trang_thai='duoc_duyet'
 * @param {object} bangLuongRow - bang_luong row (tru_ung_luong, hoa_hong, trang_thai)
 * @param {number} year
 * @param {number} month
 * @param {object} quyNgayOff - { so_da_tich_luy, so_da_dung, so_dung_thang_nay }
 */
export function tinhLuong(nv, chamCongList = [], dangKyOffList = [], bangLuongRow = null, year, month, quyNgayOff = null) {
  const soNgayThang = getDaysInMonth(year, month)
  const gioiHanOff  = nv.gioi_han_off_thang || 3

  // ═══════════════════════════════════════════
  // PASS 1: Collect all OFF records sorted by date
  // ═══════════════════════════════════════════
  const ccDateSet = new Set()
  const allOff = []

  // From cham_cong — OFF days
  chamCongList.forEach(r => {
    if (!r.ngay) return
    if (r.loai !== 'di_lam') {
      ccDateSet.add(r.ngay)
      allOff.push({ ngay: r.ngay.substring(0, 10), loai: r.loai, source: 'cham_cong' })
    }
  })

  // From dang_ky_off — avoid duplicates
  dangKyOffList.forEach(r => {
    const day = String(r.ngay_off || r.ngay || '').substring(0, 10)
    if (!day || ccDateSet.has(day)) return
    allOff.push({ ngay: day, loai: r.loai_off || r.loai, source: 'dang_ky_off' })
  })

  allOff.sort((a, b) => a.ngay.localeCompare(b.ngay))

  // ═══════════════════════════════════════════
  // PASS 2: Categorize OFF
  // ═══════════════════════════════════════════
  const offPhepList = allOff.filter(o => o.loai === 'off_phep')
  const offOVList   = allOff.filter(o => o.loai === 'off_ov')
  const offT7List   = allOff.filter(o => o.loai === 'off_t7')
  const offT7XList  = allOff.filter(o => o.loai === 'off_t7x')

  // First gioiHanOff off_phep → có lương, rest → OV
  const soOffCoLuong   = Math.min(gioiHanOff, offPhepList.length)
  const soOffPhepVuot  = Math.max(0, offPhepList.length - gioiHanOff)

  // Holiday credit: can offset OV
  // quyNgayOff.so_dung_thang_nay = how many holiday days admin applied this month
  const soNgayLeDungThangNay = quyNgayOff?.so_dung_thang_nay || 0

  // OV can be offset by holiday credits (1:1)
  const tongOV = soOffPhepVuot + offOVList.length
  const soOVConLai = Math.max(0, tongOV - soNgayLeDungThangNay)

  // ═══════════════════════════════════════════
  // PASS 3: Ngày không lương
  // ═══════════════════════════════════════════
  let ngayKhongLuong = 0

  // Excess OFF phép → OV: 1 day each
  ngayKhongLuong += soOffPhepVuot

  // Explicit OV: 1 day each
  ngayKhongLuong += offOVList.length

  // T7/CN: 2 days each
  ngayKhongLuong += offT7List.length * 2
  ngayKhongLuong += offT7XList.length * 2

  // Holiday credit applied → reduce OV impact
  ngayKhongLuong -= soNgayLeDungThangNay

  // Partial day deductions (he_so < 1)
  chamCongList.filter(r => r.loai === 'di_lam' && r.gio_ra).forEach(r => {
    ngayKhongLuong += (1 - (r.he_so ?? 1))
  })

  // ═══════════════════════════════════════════
  // PASS 4: Tăng ca & Phạt
  // ═══════════════════════════════════════════
  const tongTangCa = chamCongList
    .filter(r => r.loai === 'di_lam')
    .reduce((s, r) => s + (r.tang_ca_gio || 0), 0)

  const tienPhat = offT7XList.reduce((sum, o) => {
    const dow = getDayOfWeek(o.ngay)
    return sum + (dow === 0 ? PHAT_T7X_SUN : PHAT_T7X_SAT)
  }, 0)

  // ═══════════════════════════════════════════
  // PASS 5: Salary components
  // ═══════════════════════════════════════════
  const ngayCong    = Math.max(0, soNgayThang - ngayKhongLuong)
  const luongCoBan  = Math.round((nv.luong_cung / soNgayThang) * ngayCong)
  const tienTangCa  = Math.round(tongTangCa * DON_GIA_TANG_CA)
  const truKyQuy    = nv.ky_quy_trang_thai === 'dang_dong' ? KY_QUY_MOIS : 0
  const truUngLuong = bangLuongRow?.tru_ung_luong ?? 0
  const hoaHong     = bangLuongRow?.hoa_hong ?? 0
  const hoaHongDV   = bangLuongRow?.hoa_hong_dv ?? 0
  const hoaHongThe  = bangLuongRow?.hoa_hong_the ?? 0
  const tienTour    = bangLuongRow?.tien_tour ?? 0
  const tongKinhDoanh = hoaHongDV + hoaHongThe + tienTour
  const tongLinh    = Math.max(0, luongCoBan + tienTangCa + hoaHong + tongKinhDoanh - tienPhat - truKyQuy - truUngLuong)

  // Tổng ngày le tich luy
  const soNgayLeTichLuy = quyNgayOff?.so_da_tich_luy || 0
  const soNgayLeDaDung  = quyNgayOff?.so_da_dung || 0

  return {
    // Raw month info
    soNgayThang,
    ngayCong: +ngayCong.toFixed(2),

    // OFF detail
    soOffCoLuong,                               // OFF trong dinh muc
    soOffPhepVuot,                               // OFF vuot dinh muc (-> OV)
    soOffOV: offOVList.length,                  // OFF khong luong truc tiep
    soOffT7CN: offT7List.length + offT7XList.length,
    soPhamT7X: offT7XList.length,

    // Holiday
    soNgayLeTichLuy,
    soNgayLeDaDung,
    soNgayLeDungThangNay,

    // Attendance
    tongTangCa: +tongTangCa.toFixed(2),
    soNgayDiLam: chamCongList.filter(r => r.loai === 'di_lam').length,

    // Salary — Kỳ 1 (Lương Cứng)
    luongCoBan,
    tienTangCa,
    tienPhat,
    truKyQuy,
    truUngLuong,
    hoaHong,
    tongLuongCung: luongCoBan + tienTangCa - tienPhat - truKyQuy - truUngLuong,

    // Salary — Kỳ 2 (Lương Kinh Doanh)
    hoaHongDV,
    hoaHongThe,
    tienTour,
    tongKinhDoanh,

    // Tổng
    tongLinh,
  }
}
