// Gọi backend Mini App (edge function miniapp trên VPS).
import { API_BASE, SUPABASE_ANON_KEY } from '../config'
import { layXacThuc } from './auth'

async function call(action, extra = {}, { auth = true } = {}) {
  const body = { action, ...extra }
  if (auth) Object.assign(body, await layXacThuc())
  const res = await fetch(API_BASE, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_ANON_KEY,
      Authorization: 'Bearer ' + SUPABASE_ANON_KEY,
    },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({ ok: false, error: 'Phản hồi không hợp lệ' }))
  if (!data.ok) throw new Error(data.error || 'Có lỗi xảy ra')
  return data
}

export const api = {
  theCuaToi:      ()        => call('the_cua_toi'),
  voucherCuaToi:  ()        => call('voucher_cua_toi'),
  danhSachDichVu: ()        => call('danh_sach_dich_vu', {}, { auth: false }),
  uuDai:          ()        => call('uu_dai', {}, { auth: false }),
  datLich:        (payload) => call('dat_lich', payload),
  vongQuay:       ()        => call('vong_quay'),
  lichHenCuaToi:  ()        => call('lich_hen_cua_toi'),
  lichSuDichVu:   ()        => call('lich_su_dich_vu'),
  danhGia:        (payload) => call('danh_gia', payload),
}
