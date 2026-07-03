// ═══════════════════════════════════════════════════════════════════════════
// BỘ TEST LƯƠNG — src/lib/luong.js (tinhLuong + hệ số chấm công)
// Chạy:  npm run test:luong
// (rolldown bundle vì luong.js dùng import không đuôi — Node ESM không tự resolve)
//
// Mục đích: chốt an toàn hàm tính lương TRƯỚC khi cắt MySpa. Mỗi lần sửa
// luong.js PHẢI chạy lại bộ test này — sai 1 case là sai tiền lương thật.
// ═══════════════════════════════════════════════════════════════════════════
import assert from 'node:assert/strict'
import {
  tinhLuong, getDaysInMonth, getDayOfWeek, leTanCaInfo,
  tinhHeSoChamCong, tinhTangCaChamCong,
  DON_GIA_TANG_CA, KY_QUY_MOIS,
} from '../src/lib/luong.js'

const YEAR = 2026, MONTH = 6
const DAYS = getDaysInMonth(YEAR, MONTH)          // 30 ngày
const iso = d => `${YEAR}-${String(MONTH).padStart(2, '0')}-${String(d).padStart(2, '0')}`

// Phân loại ngày thường / cuối tuần của tháng test (động, không phụ thuộc lịch)
const weekdays = [], weekends = []
for (let d = 1; d <= DAYS; d++) {
  const dow = getDayOfWeek(iso(d))
  ;(dow === 0 || dow === 6 ? weekends : weekdays).push(d)
}

const NV = { ho_ten: 'Test KTV', vi_tri: 'ktv', luong_cung: 3000000, gioi_han_off_thang: 3 }

// Tạo chấm công đủ tháng: mặc định đi làm full; override từng ngày qua `except`
//   except[d] = null        → KHÔNG có bản ghi (no-show)
//   except[d] = {...row}    → bản ghi tuỳ chỉnh (OFF / về sớm / tăng ca)
function fullMonth(except = {}) {
  const rows = []
  for (let d = 1; d <= DAYS; d++) {
    if (d in except) {
      if (except[d] === null) continue
      rows.push({ ngay: iso(d), ...except[d] })
      continue
    }
    rows.push({ ngay: iso(d), loai: 'di_lam', gio_vao: '09:15:00', gio_ra: '20:00:00', he_so: 1 })
  }
  return rows
}

let pass = 0, fail = 0
function t(name, fn) {
  try { fn(); pass++; console.log('  ✓', name) }
  catch (e) { fail++; console.error('  ✗', name, '\n     ', e.message) }
}

console.log(`\nTEST LƯƠNG — tháng ${MONTH}/${YEAR} (${DAYS} ngày, ${weekdays.length} ngày thường, ${weekends.length} ngày T7/CN)\n`)

// ── 1. Đi làm full tháng → đủ công, đủ lương cứng ────────────────────────────
t('Full tháng: ngày công = số ngày tháng, lương cơ bản = lương cứng', () => {
  const r = tinhLuong(NV, fullMonth(), [], null, YEAR, MONTH)
  assert.equal(r.ngayCong, DAYS)
  assert.equal(r.luongCoBan, NV.luong_cung)
  assert.equal(r.soNgayKhongCheckin, 0)
})

// ── 2. OFF phép ngày thường trong hạn (≤3) → KHÔNG trừ lương ────────────────
t('OFF phép 2 ngày thường (hạn 3): không trừ công', () => {
  const [d1, d2] = weekdays
  const r = tinhLuong(NV, fullMonth({ [d1]: { loai: 'off_phep' }, [d2]: { loai: 'off_phep' } }), [], null, YEAR, MONTH)
  assert.equal(r.ngayCong, DAYS)
  assert.equal(r.soOffCoLuong, 2)
})

// ── 3. OFF phép vượt hạn → phần vượt trừ lương ───────────────────────────────
t('OFF phép 4 ngày thường (hạn 3): trừ đúng 1 ngày công', () => {
  const [d1, d2, d3, d4] = weekdays
  const r = tinhLuong(NV, fullMonth({
    [d1]: { loai: 'off_phep' }, [d2]: { loai: 'off_phep' },
    [d3]: { loai: 'off_phep' }, [d4]: { loai: 'off_phep' },
  }), [], null, YEAR, MONTH)
  assert.equal(r.ngayCong, DAYS - 1)
})

// ── 4. OFF T7/CN → trọng số ×2 ───────────────────────────────────────────────
t('OFF phép 1 ngày T7/CN (hạn 3): tốn 2 đơn vị quỹ, vẫn trong hạn → đủ công', () => {
  const d = weekends[0]
  const r = tinhLuong(NV, fullMonth({ [d]: { loai: 'off_phep' } }), [], null, YEAR, MONTH)
  assert.equal(r.ngayCong, DAYS)          // 2 đơn vị ≤ hạn 3 → có lương
})

t('OFF T7 ghi rõ (off_t7): trừ 2 ngày công', () => {
  const d = weekends[0]
  const r = tinhLuong(NV, fullMonth({ [d]: { loai: 'off_t7' } }), [], null, YEAR, MONTH)
  assert.equal(r.ngayCong, DAYS - 2)
})

// ── 5. No-show (ngày đã qua không check-in) = OFF ────────────────────────────
t('No-show 1 ngày thường (tháng đã khép): tính như OFF phép trong hạn', () => {
  const d = weekdays[0]
  const r = tinhLuong(NV, fullMonth({ [d]: null }), [], null, YEAR, MONTH)
  assert.equal(r.soNgayKhongCheckin, 1)
  assert.equal(r.ngayCong, DAYS)          // trong hạn 3 → không trừ
})

// ── 6. B1: NV vào làm giữa tháng ─────────────────────────────────────────────
t('B1: vào làm ngày 20 → ngày 1–19 KHÔNG bị no-show, công = số ngày còn lại', () => {
  const nvMoi = { ...NV, ngay_bat_dau: iso(20) }
  const cc = []
  for (let d = 20; d <= DAYS; d++) cc.push({ ngay: iso(d), loai: 'di_lam', gio_vao: '09:15:00', gio_ra: '20:00:00', he_so: 1 })
  const r = tinhLuong(nvMoi, cc, [], null, YEAR, MONTH)
  assert.equal(r.soNgayKhongCheckin, 0)
  assert.equal(r.ngayTruocVaoLam, 19)
  assert.equal(r.ngayCong, DAYS - 19)
  assert.equal(r.luongCoBan, Math.round((NV.luong_cung / DAYS) * (DAYS - 19)))
})

t('B1: KHÔNG có ngay_bat_dau (dữ liệu cũ) → hành xử như trước, no-show đủ', () => {
  const cc = []
  for (let d = 20; d <= DAYS; d++) cc.push({ ngay: iso(d), loai: 'di_lam', gio_vao: '09:15:00', gio_ra: '20:00:00', he_so: 1 })
  const r = tinhLuong(NV, cc, [], null, YEAR, MONTH)
  assert.equal(r.soNgayKhongCheckin, 19)
})

t('B1: vào làm từ THÁNG TRƯỚC → tháng này tính đủ như bình thường', () => {
  const nvCu = { ...NV, ngay_bat_dau: `2026-01-15` }
  const r = tinhLuong(nvCu, fullMonth(), [], null, YEAR, MONTH)
  assert.equal(r.ngayTruocVaoLam, 0)
  assert.equal(r.ngayCong, DAYS)
})

// ── 7. Về sớm (he_so < 1) → trừ phần thiếu ───────────────────────────────────
t('KTV về sớm he_so=0.79: trừ 0.21 ngày công', () => {
  const d = weekdays[0]
  const r = tinhLuong(NV, fullMonth({ [d]: { loai: 'di_lam', gio_vao: '09:15:00', gio_ra: '17:44:00', he_so: 0.79 } }), [], null, YEAR, MONTH)
  assert.equal(r.ngayCong, +(DAYS - 0.21).toFixed(2))
})

// ── 8. Tăng ca tự động từ giờ ra ─────────────────────────────────────────────
t('Tăng ca: ra 20:50 → 0.75h = 18.750đ; ra 20:10 (<15p) → 0', () => {
  const [d1, d2] = weekdays
  const r = tinhLuong(NV, fullMonth({
    [d1]: { loai: 'di_lam', gio_vao: '09:15:00', gio_ra: '20:50:00', he_so: 1 },
    [d2]: { loai: 'di_lam', gio_vao: '09:15:00', gio_ra: '20:10:00', he_so: 1 },
  }), [], null, YEAR, MONTH)
  assert.equal(r.tongTangCa, 0.75)
  assert.equal(r.tienTangCa, Math.round(0.75 * DON_GIA_TANG_CA))
})

// ── 9. Ký quỹ chỉ trừ khi đang đóng ──────────────────────────────────────────
t('Ký quỹ: dang_dong trừ 500k, khác thì 0', () => {
  const r1 = tinhLuong({ ...NV, ky_quy_trang_thai: 'dang_dong' }, fullMonth(), [], null, YEAR, MONTH)
  const r2 = tinhLuong(NV, fullMonth(), [], null, YEAR, MONTH)
  assert.equal(r1.truKyQuy, KY_QUY_MOIS)
  assert.equal(r2.truKyQuy, 0)
})

// ── 10. Lễ Tân Ca A: về 18:00 ngày thường vẫn full công ──────────────────────
t('Lễ Tân Ca A về 18:00 ngày thường: hệ số 1, Ca A', () => {
  const d = weekdays[0]
  const info = leTanCaInfo('le_tan', iso(d), '09:15:00', '18:00:00')
  assert.equal(info.ca, 'A')
  assert.equal(info.heSo, 1)
})

// ── 11. Hệ số chấm công dùng chung (Checkin + Admin) ─────────────────────────
t('tinhHeSoChamCong: 9:15→20:00 = 1; tinhTangCaChamCong: 20:30 → 0.5h', () => {
  assert.equal(tinhHeSoChamCong('09:15', '20:00'), 1)
  assert.equal(tinhTangCaChamCong('20:30'), 0.5)
  assert.equal(tinhTangCaChamCong('20:10'), 0)
})

// ── 12. Realtime giữa tháng (todayRef): tương lai không bị tính no-show ──────
t('todayRef=15: ngày 16+ chưa tới không bị no-show', () => {
  const cc = []
  for (let d = 1; d <= 15; d++) cc.push({ ngay: iso(d), loai: 'di_lam', gio_vao: '09:15:00', gio_ra: '20:00:00', he_so: 1 })
  const r = tinhLuong(NV, cc, [], null, YEAR, MONTH, null, 15)
  assert.equal(r.soNgayKhongCheckin, 0)
})

console.log(`\nKẾT QUẢ: ${pass} PASS · ${fail} FAIL\n`)
process.exit(fail > 0 ? 1 : 0)
