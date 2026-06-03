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
export const KY_QUY_TONG     = 12
export const KY_QUY_THUONG   = 500000
export const PHAT_T7X_SAT    = 300000
export const PHAT_T7X_SUN    = 500000

// Vietnamese national holidays
const HOLIDAYS = [
  // 2026
  '2026-01-01', // Tet Duong Lich
  '2026-02-16', // Tet Am Lich (29 Tet)
  '2026-02-17', // Tet Am Lich (Mung 1)
  '2026-02-18', // Tet Am Lich (Mung 2)
  '2026-04-30', // Giai Phong
  '2026-05-01', // Quoc Te Lao Dong
  '2026-09-02', // Quoc Khanh
  // 2027
  '2027-01-01', // Tet Duong Lich
  '2027-02-05', // Tet Am Lich (29 Tet)
  '2027-02-06', // Tet Am Lich (Mung 1)
  '2027-02-07', // Tet Am Lich (Mung 2)
  '2027-04-30', // Giai Phong
  '2027-05-01', // Quoc Te Lao Dong
  '2027-09-02', // Quoc Khanh
]

export function isHoliday(dateStr) {
  if (!dateStr) return false
  return HOLIDAYS.includes(String(dateStr).substring(0, 10))
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
 * @param {number} todayRef - (optional) day of month to cap at. If provided, only data up to this day is counted.
 *                            Used for current month real-time tracking.
 */
export function tinhLuong(nv, chamCongList = [], dangKyOffList = [], bangLuongRow = null, year, month, quyNgayOff = null, todayRef = null) {
  const soNgayThangFull = getDaysInMonth(year, month)
  // If todayRef is provided, cap the effective month length for real-time tracking
  const soNgayThang = todayRef ? Math.min(todayRef, soNgayThangFull) : soNgayThangFull
  const gioiHanOff  = nv.gioi_han_off_thang || 3

  // ═══════════════════════════════════════════
  // PASS 1: Collect all OFF records sorted by date
  // Nguồn duy nhất: cham_cong thực tế (loai != 'di_lam')
  // dang_ky_off chỉ là lịch điều phối nhân sự — KHÔNG dùng để tính lương
  // ═══════════════════════════════════════════
  const allOff = []

  // From cham_cong — OFF days (only up to todayRef if provided)
  chamCongList.forEach(r => {
    if (!r.ngay) return
    const day = r.ngay.substring(0, 10)
    if (todayRef) {
      const d = parseInt(day.substring(8, 10))
      if (d > todayRef) return  // skip future days in current month
    }
    if (r.loai !== 'di_lam') {
      allOff.push({ ngay: day, loai: r.loai, source: 'cham_cong' })
    }
  })

  allOff.sort((a, b) => a.ngay.localeCompare(b.ngay))

  // ─── Ngày KHÔNG check-in (không có bản ghi chấm công) = NGHỈ ───
  // Quy tắc: ngày ĐÃ QUA mà không check-in → tính như OFF phép. KHÔNG tính ngày
  // hôm nay (đang diễn ra) & ngày tương lai.
  const recordedDays = new Set()
  chamCongList.forEach(r => {
    if (!r.ngay) return
    const d = parseInt(String(r.ngay).substring(8, 10), 10)
    if (todayRef && d > todayRef) return
    recordedDays.add(d)
  })
  const lastPastDay = todayRef ? todayRef - 1 : soNgayThangFull
  const noShowDates = []
  for (let d = 1; d <= lastPastDay; d++) {
    if (!recordedDays.has(d)) noShowDates.push(`${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`)
  }
  const soNgayKhongCheckin = noShowDates.length

  // ═══════════════════════════════════════════
  // PASS 2: Categorize OFF
  // ═══════════════════════════════════════════
  const offPhepList = allOff.filter(o => o.loai === 'off_phep')
  const offOVList   = allOff.filter(o => o.loai === 'off_ov')
  const offT7List   = allOff.filter(o => o.loai === 'off_t7')
  const offT7XList  = allOff.filter(o => o.loai === 'off_t7x')

  // Gộp OFF phép (đã ghi) + ngày không check-in.
  // QUY TẮC: mỗi ngày OFF tính theo TRỌNG SỐ — T7/CN ×2, ngày thường ×1 (kể cả
  // trong hạn). Hạn = gioiHanOff ĐƠN VỊ. Đơn vị trong hạn = có lương; vượt = trừ.
  const phepPoolDates = [...offPhepList.map(o => o.ngay), ...noShowDates].sort()
  const wOf = (ds) => { const dow = getDayOfWeek(ds); return (dow === 0 || dow === 6) ? 2 : 1 }
  const phepWeight   = phepPoolDates.reduce((s, ds) => s + wOf(ds), 0)
  const soOffCoLuong = Math.min(gioiHanOff, phepWeight)        // đơn vị off có lương
  const truVuotPhep  = Math.max(0, phepWeight - gioiHanOff)    // đơn vị off bị trừ lương
  const soOffPhepVuot = truVuotPhep                            // hiển thị

  const soNgayLeDungThangNay = quyNgayOff?.so_dung_thang_nay || 0

  // ═══════════════════════════════════════════
  // PASS 3: Ngày không lương (số ngày bị trừ lương)
  // ═══════════════════════════════════════════
  let ngayKhongLuong = 0
  ngayKhongLuong += truVuotPhep                                 // vượt phép: T7/CN ×2, thường ×1
  ngayKhongLuong += offOVList.length                            // OV ghi rõ: ×1
  ngayKhongLuong += (offT7List.length + offT7XList.length) * 2  // T7/CN ghi rõ: ×2

  // Quỹ ngày lễ bù 1:1 vào số ngày bị trừ
  const soNgayLeBuOV = Math.min(soNgayLeDungThangNay, ngayKhongLuong)
  ngayKhongLuong -= soNgayLeBuOV

  // Partial day deductions (he_so < 1) — only up to todayRef
  chamCongList.filter(r => {
    if (r.loai !== 'di_lam' || !r.gio_ra) return false
    if (!r.ngay) return false
    if (todayRef) {
      const d = parseInt(String(r.ngay).substring(8, 10))
      if (d > todayRef) return false
    }
    return true
  }).forEach(r => {
    ngayKhongLuong += (1 - (r.he_so ?? 1))
  })

  // ═══════════════════════════════════════════
  // PASS 4: Tăng ca & Phạt (only up to todayRef)
  // ═══════════════════════════════════════════
  // Tăng ca TỰ ĐỘNG: giờ ra sau 20:00 → block 15 phút (mỗi block 0.25h × 25k).
  // < 15 phút không tính. Vd ra 20:50 → 50' → 3 block = 0.75h.
  const otHoursFromGioRa = (gioRa) => {
    if (!gioRa) return 0
    const p = String(gioRa).split(':')
    const mins = (parseInt(p[0], 10) || 0) * 60 + (parseInt(p[1], 10) || 0)
    const past = mins - 20 * 60
    if (past < 15) return 0
    return Math.floor(past / 15) * 0.25
  }
  const tongTangCa = chamCongList
    .filter(r => {
      if (r.loai !== 'di_lam') return false
      if (todayRef && r.ngay) {
        const d = parseInt(String(r.ngay).substring(8, 10))
        if (d > todayRef) return false
      }
      return true
    })
    .reduce((s, r) => s + otHoursFromGioRa(r.gio_ra), 0)

  const tienPhat = offT7XList.reduce((sum, o) => {
    const dow = getDayOfWeek(o.ngay)
    return sum + (dow === 0 ? PHAT_T7X_SUN : PHAT_T7X_SAT)
  }, 0)

  // ═══════════════════════════════════════════
  // PASS 5: Salary components
  // ═══════════════════════════════════════════
  const ngayCong    = Math.max(0, soNgayThang - ngayKhongLuong)
  // luongCoBan always uses FULL month as denominator for daily rate
  const luongCoBan  = Math.round((nv.luong_cung / soNgayThangFull) * ngayCong)
  const tienTangCa  = Math.round(tongTangCa * DON_GIA_TANG_CA)
  const truKyQuy    = nv.ky_quy_trang_thai === 'dang_dong' ? KY_QUY_MOIS : 0
  const truUngLuong = bangLuongRow?.tru_ung_luong ?? 0
  const hoaHong     = bangLuongRow?.hoa_hong ?? 0
  const hoaHongDV       = bangLuongRow?.hoa_hong_dv ?? 0
  const tienTour        = bangLuongRow?.tien_tour ?? 0
  const thuongDatDoanhSo = bangLuongRow?.hoa_hong_the ?? 0  // dung cot hoa_hong_the
  const tongKinhDoanh   = hoaHongDV + tienTour + thuongDatDoanhSo
  const tongLinh    = Math.max(0, luongCoBan + tienTangCa + hoaHong + tongKinhDoanh - tienPhat - truKyQuy - truUngLuong)

  // Tổng ngày le tich luy
  const soNgayLeTichLuy = quyNgayOff?.so_da_tich_luy || 0
  const soNgayLeDaDung  = quyNgayOff?.so_da_dung || 0

  // Days worked — only up to todayRef
  const soNgayDiLamEff = todayRef
    ? chamCongList.filter(r => {
        if (r.loai !== 'di_lam') return false
        if (!r.ngay) return false
        const d = parseInt(String(r.ngay).substring(8, 10))
        return d <= todayRef
      }).length
    : chamCongList.filter(r => r.loai === 'di_lam').length

  return {
    // Raw month info (soNgayThang = capped for current month, full for past months)
    soNgayThang: todayRef ? soNgayThangFull : soNgayThang,
    ngayCong: +ngayCong.toFixed(2),

    // OFF detail
    soNgayKhongCheckin,                          // ngày đã qua không check-in (= nghỉ)
    soOffCoLuong,                               // OFF trong dinh muc
    soOffPhepVuot,                               // OFF vuot dinh muc (-> OV)
    soOffOV: offOVList.length,                  // OFF khong luong truc tiep
    soOffT7CN: offT7List.length + offT7XList.length,
    soPhamT7X: offT7XList.length,

    // Holiday
    soNgayLeTichLuy,
    soNgayLeDaDung,
    soNgayLeDungThangNay,
    soNgayLeBuOV,

    // Attendance
    tongTangCa: +tongTangCa.toFixed(2),
    soNgayDiLam: soNgayDiLamEff,

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
    tienTour,
    thuongDatDoanhSo,
    tongKinhDoanh,

    // Tổng
    tongLinh,
  }
}
