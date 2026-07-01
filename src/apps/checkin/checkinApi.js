// checkinApi.js — Lớp gọi RPC an toàn cho app KTV (/checkin)
// Quản lý "session_token" NGẦM (nhân viên không thấy): đăng nhập PIN → server cấp
// token → mọi thao tác kèm token → server chỉ trả/ghi dữ liệu CỦA CHÍNH NV đó.
// Thay cho việc đọc thẳng bảng nhan_vien/bang_luong/cham_cong bằng anon key.
import { supabase } from '../../lib/supabase'

const TOKEN_KEY = 'hsms_checkin_token'

export const getToken = () => {
  try { return localStorage.getItem(TOKEN_KEY) } catch { return null }
}
export const setToken = (t) => {
  try { t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY) } catch { /* ignore */ }
}

// Lỗi phiên hết hạn → buộc đăng nhập lại
export class PhienHetHan extends Error {
  constructor() { super('PHIEN_HET_HAN'); this.code = 'PHIEN_HET_HAN' }
}

async function callRpc(fn, params = {}) {
  const { data, error } = await supabase.rpc(fn, params)
  if (error) {
    if (String(error.message || '').includes('PHIEN_HET_HAN')) {
      setToken(null)
      throw new PhienHetHan()
    }
    throw error
  }
  return data
}

export const checkinApi = {
  // ── Đăng nhập / phiên ──
  async dsNhanVien() {
    const { data, error } = await supabase.rpc('checkin_ds_nhan_vien')
    if (error) throw error
    return data || []
  },
  async dangNhap(nhanVienId, pinHash) {
    const { data, error } = await supabase.rpc('checkin_dang_nhap', {
      p_nhan_vien_id: nhanVienId, p_pin_hash: pinHash,
    })
    if (error) throw error
    if (data?.success && data.token) setToken(data.token)
    return data
  },
  async me() {
    if (!getToken()) return null
    try { return await callRpc('checkin_me', { p_token: getToken() }) }
    catch (e) { if (e.code === 'PHIEN_HET_HAN') return null; throw e }
  },
  async dangXuat() {
    const t = getToken(); setToken(null)
    if (t) { try { await supabase.rpc('checkin_dang_xuat', { p_token: t }) } catch { /* ignore */ } }
  },

  // ── Đọc dữ liệu (của chính NV) ──
  home:    ()          => callRpc('checkin_home',     { p_token: getToken() }),
  lich:    (thang, nam) => callRpc('checkin_lich',     { p_token: getToken(), p_thang: thang, p_nam: nam }),
  luong:   (thang, nam) => callRpc('checkin_luong',    { p_token: getToken(), p_thang: thang, p_nam: nam }),
  thuNhap: (thang, nam) => callRpc('checkin_thu_nhap', { p_token: getToken(), p_thang: thang, p_nam: nam }),
  offData: (thang, nam) => callRpc('checkin_off_data', { p_token: getToken(), p_thang: thang, p_nam: nam }),

  // ── Ghi (chấm công + selfie + gps, off, pin, avatar) ──
  chamCong: ({ action, gio, heSo = 0, tangCa = 0, lyDo = null, selfieUrl, lat, lng }) =>
    callRpc('checkin_cham_cong', {
      p_token: getToken(), p_action: action, p_gio: gio, p_he_so: heSo,
      p_tang_ca: tangCa, p_ly_do: lyDo, p_selfie_url: selfieUrl, p_lat: lat, p_lng: lng,
    }),
  boSungGioRa: ({ chamCongId, gioRa, heSo, tangCa = 0 }) =>
    callRpc('checkin_bo_sung_gio_ra', {
      p_token: getToken(), p_cham_cong_id: chamCongId, p_gio_ra: gioRa, p_he_so: heSo, p_tang_ca: tangCa,
    }),
  dangKyOff: ({ ngayOff, loaiOff, lyDo }) =>
    callRpc('checkin_dang_ky_off', {
      p_token: getToken(), p_ngay_off: ngayOff, p_loai_off: loaiOff, p_ly_do: lyDo,
    }),
  xinDoiNgayOff: ({ offId, ngayCu, loaiOff, ngayMoi }) =>
    callRpc('checkin_xin_doi_off', {
      p_token: getToken(), p_off_id: offId, p_ngay_cu: ngayCu, p_loai_off: loaiOff, p_ngay_moi: ngayMoi,
    }),
  xinDungNgayLe: ({ soNgay, ov, thang, nam }) =>
    callRpc('checkin_xin_dung_ngay_le', { p_token: getToken(), p_so_ngay: soNgay, p_ov: ov, p_thang: thang, p_nam: nam }),
  doiPin:    (hashCu, hashMoi) => callRpc('checkin_doi_pin',    { p_token: getToken(), p_pin_hash_cu: hashCu, p_pin_hash_moi: hashMoi }),
  doiAvatar: (url)            => callRpc('checkin_doi_avatar', { p_token: getToken(), p_url: url }),
}
