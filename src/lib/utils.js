export const DAYS = ['CN','T2','T3','T4','T5','T6','T7']

export const formatCurrency = (n) =>
  new Intl.NumberFormat('vi-VN').format(n || 0) + 'đ'

export const formatCurrencyHide = () => '••••••••'

export const formatDate = (isoDate) => {
  if (!isoDate) return ''
  const [y, m, d] = String(isoDate).substring(0, 10).split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return `${DAYS[date.getDay()]} ${String(d).padStart(2,'0')}/${String(m).padStart(2,'0')}/${y}`
}

export const formatDateFull = (isoStr) => {
  if (!isoStr) return ''
  const d = new Date(isoStr + 'T00:00:00')
  return `${DAYS[d.getDay()]}, ${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`
}

export const getNowVN = () => {
  const now = new Date()
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60000
  return new Date(utcMs + 7 * 60 * 60000)
}

export const todayISO = () => {
  const d = getNowVN()
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

export const nowTimeVN = () => {
  const d = getNowVN()
  return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}-${String(d.getSeconds()).padStart(2,'0')}`
}

export const formatDateInput = (isoDate) => {
  if (!isoDate) return ''
  const [y, m, dd] = isoDate.split('-')
  return `${dd}/${m}/${y}`
}