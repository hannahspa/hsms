// Cấu hình Mini App Hannah Spa
// ⚠️ Điền ANON KEY của Supabase VPS (giống VITE_SUPABASE_ANON_KEY của web HSMS).
//    Anon key chỉ để qua cổng gateway; mọi truy vấn data đều xác thực SĐT phía backend.
export const API_BASE = 'https://api.hannahspa.vn/functions/v1/miniapp'
export const SUPABASE_ANON_KEY = 'PASTE_ANON_KEY_HERE'

// Bật khi chạy thật trong Zalo (lấy SĐT qua getPhoneNumber). Tắt = dùng SĐT nhập tay để test trên trình duyệt.
export const DUNG_ZALO_AUTH = true

// OA Hannah Spa — dùng cho nút "Chat với Hannah" (mở chat OA) trong Mini App.
export const OA_ID = '3846632539612664683'

export const MAU = {
  bg: '#FAF7F4', card: '#FFFFFF', gold: '#C9A96E', primary: '#A0714F',
  espresso: '#7D5A3C', text: '#1A1209', textSub: '#8B7355', textMute: '#B8A898',
  thu: '#2D7A4F', chi: '#C0392B',
  grad: 'linear-gradient(135deg, #C9A96E 0%, #A0714F 45%, #7D5A3C 100%)',
  border: 'rgba(160,113,79,0.14)',
}
