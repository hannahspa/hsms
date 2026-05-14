import { supabase } from '../lib/supabase'

export const viService = {
  async getAll() {
    const { data, error } = await supabase
      .from('vi').select('*').order('thu_tu')
    if (error) throw error
    return data
  },

  async getActive() {
    const { data, error } = await supabase
      .from('vi').select('id,ten,loai').eq('is_active', true).order('thu_tu')
    if (error) throw error
    return data
  },

  async getById(id) {
    const { data, error } = await supabase
      .from('vi').select('*').eq('id', id).single()
    if (error) throw error
    return data
  },

  async updateSoDu(id, soDu) {
    const { data, error } = await supabase
      .from('vi').update({ so_du_dau: soDu }).eq('id', id)
    if (error) throw error
    return data
  }
}
