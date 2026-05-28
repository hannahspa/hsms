// ─── Commission Rules (bảng cứng, Admin có thể override) ──────────────────────
// KM_ref% = số buổi tặng / số buổi mua × 100 + % giảm giá trực tiếp
// Chỉ để cảnh báo, không phải giá trị KM cho khách hàng
//
// BẢNG COMMISSION:
//   KTV chỉ tư vấn + KM < 30%   → KTV 10%, LT 0%
//   KTV chỉ tư vấn + KM ≥ 30%   → KTV 5%,  LT 0%
//   LT chỉ tư vấn + bất kỳ      → KTV 0%,  LT 3%
//   KTV + LT + KM < 30%          → KTV 7%,  LT 3%
//   KTV + LT + KM ≥ 30%          → KTV 5%,  LT 3%

const KM_NGUONG = 30        // ngưỡng KM%
const COMM_LT   = 3         // lễ tân mặc định
const COMM_KTV_CAO   = 10   // KTV, KM < 30%, chỉ 1 mình
const COMM_KTV_TRUNG = 7    // KTV, KM < 30%, có thêm LT
const COMM_KTV_THAP  = 5    // KTV, KM ≥ 30%

/**
 * Tính KM_ref% từ tham số bán thẻ.
 * - Tặng buổi: soBuoiTang / soBuoiMua × 100
 * - Giảm giá:  phanTramGiam (nhập trực tiếp)
 * - Cả 2:      cộng lại (chỉ tham khảo cảnh báo)
 * @returns {number} KM_ref% (>= 0)
 */
export function calcKmRefPct({ soBuoiMua = 0, soBuoiTang = 0, phanTramGiam = 0 } = {}) {
  const kmTang = soBuoiMua > 0
    ? (soBuoiTang / soBuoiMua) * 100
    : 0
  return Math.round((kmTang + Number(phanTramGiam)) * 100) / 100
}

/**
 * Tính tỷ lệ commission cho KTV và LT dựa trên rule cứng.
 * @param {number}  kmRefPct   - KM_ref% đã tính
 * @param {boolean} coKtv      - có KTV tư vấn
 * @param {boolean} coLeTan    - có Lễ Tân tư vấn
 * @returns {{ tiLeKtv: number, tiLeLt: number, label: string }}
 */
export function calcCommissionRates(kmRefPct = 0, coKtv = false, coLeTan = false) {
  let tiLeKtv = 0
  let tiLeLt  = 0
  let label   = ''

  if (coKtv && coLeTan) {
    tiLeKtv = COMM_KTV_THAP               // luôn 5% khi có LT kèm KM ≥ 30%
    if (kmRefPct < KM_NGUONG) {
      tiLeKtv = COMM_KTV_TRUNG            // 7% nếu KM < 30%
    }
    tiLeLt = COMM_LT
    label = `KM ${kmRefPct.toFixed(0)}% — KTV ${tiLeKtv}% + LT ${tiLeLt}%`
  } else if (coKtv) {
    tiLeKtv = kmRefPct >= KM_NGUONG ? COMM_KTV_THAP : COMM_KTV_CAO
    label = `KM ${kmRefPct.toFixed(0)}% — KTV ${tiLeKtv}%`
  } else if (coLeTan) {
    tiLeLt = COMM_LT
    label = `LT tư vấn — LT ${tiLeLt}%`
  }

  return { tiLeKtv, tiLeLt, label }
}

/**
 * Cảnh báo màu sắc theo KM_ref%
 * < 30%  → info (xanh lá)
 * ≥ 30%  → warning (cam)
 * ≥ 50%  → danger (đỏ)
 */
export function kmRefAlert(kmRefPct = 0) {
  if (kmRefPct >= 50) return { color: '#C0392B', bg: '#fdecea', level: 'danger',  text: 'KM rất cao ≥ 50%' }
  if (kmRefPct >= 30) return { color: '#E67E22', bg: '#fef3e2', level: 'warning', text: `KM ${kmRefPct.toFixed(0)}% ≥ 30% — commission giảm` }
  return             { color: '#27AE60', bg: '#eafaf1', level: 'ok',      text: `KM ${kmRefPct.toFixed(0)}% < 30% — commission tiêu chuẩn` }
}

// ─── Legacy helpers (giữ nguyên để không break code cũ) ──────────────────────

export function getMyspaCommissionRule(service, role = 'ktv') {
  const myspa = service?.promotion_config?.myspa
  if (!myspa) return null
  const key  = role === 'le_tan' ? 'commission_le_tan' : 'commission_ktv'
  const rule = myspa[key]
  if (!rule || !rule.type) return null
  return {
    type:    rule.type,
    amount:  Number(rule.amount  || 0),
    percent: Number(rule.percent || 0),
    raw:     rule.raw || '',
  }
}

export function getCommissionPercent(service, role = 'ktv') {
  const rule = getMyspaCommissionRule(service, role)
  if (rule?.percent > 0) return rule.percent
  return Number(service?.ti_le_hoa_hong || 0)
}

export function calcServiceCommission(service, amount, role = 'ktv', quantity = 1) {
  const rule = getMyspaCommissionRule(service, role)
  if (rule?.type === 'absolute' && rule.amount > 0) {
    return Math.round(rule.amount * Math.max(1, Number(quantity || 1)))
  }
  const pct = getCommissionPercent(service, role)
  return Math.round(Number(amount || 0) * pct / 100)
}

export function serviceSalePrice(service) {
  return Number(service?.gia_co_ban || 0)
}
