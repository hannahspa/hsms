import { supabase } from '../lib/supabase'

// ─── Lịch sử MySpa (2019 → 16/07/2026) — CHỈ ĐỌC từ view staging ───────────────
// Nguồn: bảng myspa_ban_hang_raw (90.299 dòng) + các view v_myspa_*.
// Dùng để TRA CỨU tham khảo (khách đã làm gì/ai làm, thẻ ai làm buổi nào) và cấp
// danh sách KTV cho tính năng triệt bảo hành. KHÔNG ghi, KHÔNG đụng dữ liệu HSMS.

const normPhone = (s) => String(s || '').replace(/\D/g, '').replace(/^84/, '0')
const normDv = (s) => String(s || '').toLowerCase().replace(/\s*\(.*?\)\s*/g, '').trim()

export const myspaHistoryService = {
  // Lịch sử 1 KHÁCH: đến ngày nào, làm dịch vụ gì, ai làm
  async getCustomerHistory(sdt, limit = 300) {
    const phone = normPhone(sdt)
    if (phone.length < 8) return []
    const { data, error } = await supabase
      .from('v_myspa_lich_su_khach')
      .select('ngay, ma_don, ten_dv, nhom_dv, ktv, ma_the, la_dung_the')
      .eq('sdt', phone)
      .order('ngay', { ascending: false })
      .limit(limit)
    if (error) { console.warn('MySpa lịch sử khách:', error.message); return [] }
    return data || []
  },

  // Lịch sử 1 THẺ: buổi nào, ai làm, khi nào (nối bằng mã thẻ THE-LT)
  async getCardHistory(maThe, limit = 100) {
    if (!maThe) return []
    const { data, error } = await supabase
      .from('v_myspa_lich_su_the')
      .select('ngay, ma_don, ten_dv, ktv, buoi_so, buoi_tong')
      .eq('ma_the', maThe)
      .order('ngay', { ascending: true })
      .limit(limit)
    if (error) { console.warn('MySpa lịch sử thẻ:', error.message); return [] }
    return data || []
  },

  // DANH SÁCH KTV được phép triệt bảo hành cho khách + dịch vụ này.
  // Kết hợp 2 nguồn: (1) theo mã thẻ; (2) theo SĐT + tên dịch vụ (bù buổi cũ thiếu mã).
  async getWarrantyStaff({ maThe = null, sdt = null, tenDichVu = null } = {}) {
    const byName = new Map()   // ktv → { ktv, so_buoi, lan_cuoi }
    const add = (rows) => (rows || []).forEach(r => {
      if (!r.ktv) return
      const cur = byName.get(r.ktv) || { ktv: r.ktv, so_buoi: 0, lan_cuoi: null }
      cur.so_buoi += Number(r.so_buoi || 0)
      if (!cur.lan_cuoi || (r.lan_cuoi && r.lan_cuoi > cur.lan_cuoi)) cur.lan_cuoi = r.lan_cuoi
      byName.set(r.ktv, cur)
    })

    if (maThe) {
      const { data } = await supabase
        .from('v_myspa_the_ktv')
        .select('ktv, so_buoi, lan_cuoi')
        .eq('ma_the', maThe)
      add(data)
    }
    if (sdt && tenDichVu) {
      const phone = normPhone(sdt)
      const { data } = await supabase
        .from('v_myspa_khach_dv_ktv')
        .select('ktv, so_buoi, lan_cuoi')
        .eq('sdt', phone)
        .eq('dv_norm', normDv(tenDichVu))
      add(data)
    }
    // Nhiều buổi nhất lên đầu (anh Nam: "ai triệt nhiều nhất hoặc có trong danh sách")
    return [...byName.values()].sort((a, b) => b.so_buoi - a.so_buoi)
  },
}
