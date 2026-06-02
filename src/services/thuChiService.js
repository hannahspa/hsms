import { supabase } from '../lib/supabase'

const sumMoney = rows => (rows || []).reduce((sum, row) => sum + (row.so_tien || 0), 0)

const sortByCreatedDesc = rows => rows.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))

const daysInMonth = (year, month) => {
  if (month === 2) {
    return ((year % 4 === 0 && year % 100 !== 0) || year % 400 === 0) ? 29 : 28
  }
  return [4, 6, 9, 11].includes(month) ? 30 : 31
}

const previousDateISO = (date) => {
  let [year, month, day] = String(date).split('-').map(Number)
  day -= 1
  if (day < 1) {
    month -= 1
    if (month < 1) {
      year -= 1
      month = 12
    }
    day = daysInMonth(year, month)
  }

  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export const thuChiService = {
  async getDailyTransactions(date) {
    const [incomeRes, expenseRes] = await Promise.all([
      supabase.from('doanh_thu').select('*').eq('ngay', date).order('created_at', { ascending: false }),
      supabase.from('chi_phi').select('*').eq('ngay', date).order('created_at', { ascending: false }),
    ])

    if (incomeRes.error) throw incomeRes.error
    if (expenseRes.error) throw expenseRes.error

    return sortByCreatedDesc([
      ...(incomeRes.data || []).map(row => ({ ...row, _t: 'thu' })),
      ...(expenseRes.data || []).map(row => ({ ...row, _t: 'chi' })),
    ])
  },

  async getCashDepositData(date) {
    const [{ data: dtTm, error: dtError }, { data: cpTm, error: cpError }, { data: viList, error: viError }] = await Promise.all([
      supabase.from('doanh_thu').select('so_tien').eq('ngay', date).eq('hinh_thuc', 'tien_mat'),
      supabase.from('chi_phi').select('so_tien').eq('ngay', date).eq('hinh_thuc_thanh_toan', 'tien_mat'),
      supabase.from('so_du_vi_thuc_te').select('*'),
    ])

    if (dtError) throw dtError
    if (cpError) throw cpError
    if (viError) throw viError

    const prev = previousDateISO(date)
    const [{ data: prevIncome, error: prevIncomeError }, { data: prevExpense, error: prevExpenseError }] = await Promise.all([
      supabase.from('doanh_thu').select('so_tien').eq('ngay', prev).eq('hinh_thuc', 'tien_mat'),
      supabase.from('chi_phi').select('so_tien').eq('ngay', prev).eq('hinh_thuc_thanh_toan', 'tien_mat'),
    ])

    if (prevIncomeError) throw prevIncomeError
    if (prevExpenseError) throw prevExpenseError

    const thuTm = sumMoney(dtTm)
    const chiTm = sumMoney(cpTm)
    const prevThu = sumMoney(prevIncome)
    const prevChi = sumMoney(prevExpense)
    const amHomTrc = prevThu - prevChi < 0 ? Math.abs(prevThu - prevChi) : 0
    const tmVi = viList?.find(v => v.loai === 'tien_mat')
    const mbVi = viList?.find(v => v.loai === 'chuyen_khoan')

    let daNop = 0
    if (tmVi && mbVi) {
      const { data: transfers, error: transferError } = await supabase
        .from('chuyen_khoan_noi_bo')
        .select('so_tien')
        .eq('ngay', date)
        .eq('tu_vi_id', tmVi.id)
        .eq('den_vi_id', mbVi.id)

      if (transferError) throw transferError
      daNop = sumMoney(transfers)
    }

    return {
      thuTm,
      chiTm,
      amHomTrc,
      phaiNop: Math.max(0, thuTm - chiTm - amHomTrc),
      daNop,
      prev,
      tmVi,
      mbVi,
    }
  },

  async getHistory(fromDate, toDate) {
    const [incomeRes, expenseRes, transferRes] = await Promise.all([
      supabase.from('doanh_thu').select('*').gte('ngay', fromDate).lte('ngay', toDate).order('created_at', { ascending: false }),
      supabase.from('chi_phi').select('*').gte('ngay', fromDate).lte('ngay', toDate).order('created_at', { ascending: false }),
      supabase.from('chuyen_khoan_noi_bo').select('*').gte('ngay', fromDate).lte('ngay', toDate).order('created_at', { ascending: false }),
    ])

    if (incomeRes.error) throw incomeRes.error
    if (expenseRes.error) throw expenseRes.error
    if (transferRes.error) throw transferRes.error

    return sortByCreatedDesc([
      ...(incomeRes.data || []).map(row => ({ ...row, _t: 'thu' })),
      ...(expenseRes.data || []).map(row => ({ ...row, _t: 'chi' })),
      ...(transferRes.data || []).map(row => ({ ...row, _t: 'ck' })),
    ])
  },
}
