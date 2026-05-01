export const formatCurrency = (n) =>
  new Intl.NumberFormat('vi-VN').format(n || 0) + 'đ'

export const formatCurrencyHide = () => '••••••••'

export const formatDate = (date) => {
  const d = new Date(date)
  const days = ['CN','T2','T3','T4','T5','T6','T7']
  return `${days[d.getDay()]} ${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`
}

export const todayISO = () => new Date().toISOString().split('T')[0]
