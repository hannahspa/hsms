export function daysInMonth(year, month) {
  if (month === 2) {
    return ((year % 4 === 0 && year % 100 !== 0) || year % 400 === 0) ? 29 : 28
  }
  return [4, 6, 9, 11].includes(month) ? 30 : 31
}

export function addDaysISO(iso, delta) {
  let [year, month, day] = String(iso).split('-').map(Number)
  day += Number(delta || 0)

  while (day < 1) {
    month -= 1
    if (month < 1) {
      year -= 1
      month = 12
    }
    day += daysInMonth(year, month)
  }

  while (day > daysInMonth(year, month)) {
    day -= daysInMonth(year, month)
    month += 1
    if (month > 12) {
      year += 1
      month = 1
    }
  }

  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export function getWeekdayISO(iso) {
  let [year, month, day] = String(iso).split('-').map(Number)
  if (!year || !month || !day) return 0

  const monthOffsets = [0, 3, 2, 5, 0, 3, 5, 1, 4, 6, 2, 4]
  if (month < 3) year -= 1
  return (
    year +
    Math.floor(year / 4) -
    Math.floor(year / 100) +
    Math.floor(year / 400) +
    monthOffsets[month - 1] +
    day
  ) % 7
}

export function addMonthsISO(iso, delta) {
  let [year, month, day] = String(iso).split('-').map(Number)
  month += Number(delta || 0)

  while (month < 1) {
    year -= 1
    month += 12
  }

  while (month > 12) {
    year += 1
    month -= 12
  }

  day = Math.min(day, daysInMonth(year, month))
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export function addYearsISO(iso, delta) {
  let [year, month, day] = String(iso).split('-').map(Number)
  year += Number(delta || 0)
  day = Math.min(day, daysInMonth(year, month))
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export function addDurationISO(iso, amount = 1, unit = 'year') {
  if (unit === 'day') return addDaysISO(iso, amount)
  if (unit === 'month') return addMonthsISO(iso, amount)
  return addYearsISO(iso, amount)
}
