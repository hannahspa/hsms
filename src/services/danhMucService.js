import { supabase } from '../lib/supabase'

export const danhMucService = {
  async getAll() {
    const { data, error } = await supabase
      .from('danh_muc').select('*')
      .eq('is_active', true).order('thu_tu')
    if (error) throw error
    return data
  },

  async getByLoai(loai) {
    const { data, error } = await supabase
      .from('danh_muc').select('*')
      .eq('loai', loai).eq('is_active', true).order('thu_tu')
    if (error) throw error
    return data
  }
}
