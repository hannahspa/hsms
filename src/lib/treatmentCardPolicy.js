export function normalizeText(value = '') {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

export function getCardComboService(card = {}) {
  const services = card.combo?.dich_vu || card.meta?.dichVuCombo || []
  if (!Array.isArray(services) || services.length === 0) return null

  const cardName = normalizeText(card.ten_dich_vu)
  return services.find(row => {
    const serviceName = normalizeText(row.ten_dich_vu || row.ten || '')
    return serviceName && (cardName.includes(serviceName) || serviceName.includes(cardName.replace(/bao hanh.*/, '').trim()))
  }) || services[0]
}

export function getTreatmentCardDisplayValue(card = {}) {
  const metaValue = Number(
    card.meta?.giaTriHienThi
      ?? card.meta?.displayValue
      ?? card.meta?.display_value
      ?? card.meta?.myspaServiceValue
      ?? 0
  )
  if (metaValue > 0) return metaValue

  const comboService = getCardComboService(card)
  const serviceValue = Number(comboService?.don_gia || comboService?.gia_ban || 0)
  if (card.combo_id && serviceValue > 0) return serviceValue

  const comboValue = Number(card.combo?.gia_ban || card.combo?.menh_gia || 0)
  if (card.combo_id && comboValue > 0) return comboValue

  return Number(card.gia_tri_the || 0)
}

export function isWarrantyHairRemovalCard(card = {}) {
  const haystack = normalizeText([
    card.ten_dich_vu,
    card.combo?.ten_combo,
    card.combo?.nhom_dich_vu,
    card.meta?.combo_name,
  ].filter(Boolean).join(' '))

  const isHairRemoval = haystack.includes('triet long')
  const isWarranty = haystack.includes('bao hanh')
  const isCombo = !!card.combo_id || card.loai_the === 'combo_lieu_trinh' || card.meta?.loai === 'combo_lieu_trinh'

  return isCombo && isHairRemoval && isWarranty
}

export function getWarrantyTourLimit(card = {}) {
  return isWarrantyHairRemovalCard(card)
    ? Number(card.meta?.tourLimit ?? card.combo?.tour_limit ?? 10)
    : null
}

export function buildTreatmentPolicy(card = {}, usage = {}) {
  const isWarrantyHairRemoval = isWarrantyHairRemovalCard(card)
  const tourLimit = getWarrantyTourLimit(card)
  const usedCount = Number(card.so_buoi_da_dung || 0)
  const paidTourSessions = Number(usage.paidTourSessions || 0)
  const countedSessions = Math.max(usedCount, paidTourSessions)
  const nextSessionNumber = countedSessions + 1
  const isFreeWarrantySession = isWarrantyHairRemoval && tourLimit != null && nextSessionNumber > tourLimit

  return {
    isWarrantyHairRemoval,
    tourLimit,
    usedCount,
    nextSessionNumber,
    isFreeWarrantySession,
    minGapDays: isWarrantyHairRemoval ? 14 : null,
    allowedStaffIds: usage.allowedStaffIds || [],
    allowedStaffNames: usage.allowedStaffNames || [],
    paidTourSessions,
    lastUseDate: usage.lastUseDate || null,
    suggestedTour: isFreeWarrantySession ? 0 : Number(usage.suggestedTour || 0),
  }
}
