import { supabase } from '../lib/supabase'

export const giaoDichService = {
  async create(payload) {
    const { data, error } = await supabase
      .from('giao_dich').insert(payload).select().single()
    if (error) throw error
    return data
  },

  async getByNgay(ngay) {
    const { data, error } = await supabase
      .from('giao_dich')
      .select('*, danh_muc(*), vi:vi_id(*)')
      .eq('ngay', ngay)
      .order('created_at', { ascending: false })
    if (error) throw error
    return data
  },

  async getByThang(thang, nam) {
    const start = `${nam}-${String(thang).padStart(2,'0')}-01`
    const end   = `${nam}-${String(thang).padStart(2,'0')}-31`
    const { data, error } = await supabase
      .from('giao_dich')
      .select('*, danh_muc(*), vi:vi_id(*)')
      .gte('ngay', start).lte('ngay', end)
      .order('ngay', { ascending: false })
    if (error) throw error
    return data
  },

  async delete(id) {
    const { error } = await supabase
      .from('giao_dich').delete().eq('id', id)
    if (error) throw error
  }
}
