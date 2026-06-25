// Lấy thông tin xác thực SĐT khách qua Zalo Mini App SDK.
// getAccessToken() + getPhoneNumber() → backend đổi ra SĐT thật (graph.zalo.me).
import { DUNG_ZALO_AUTH } from '../config'

let _cache = null

export async function layXacThuc() {
  if (!DUNG_ZALO_AUTH) {
    // Chế độ test trình duyệt: dùng SĐT lưu trong localStorage
    const phone = localStorage.getItem('hannah_test_phone') || ''
    return { phone }
  }
  if (_cache) return _cache
  const { getAccessToken, getPhoneNumber } = await import('zmp-sdk/apis')
  const access_token = await getAccessToken()
  const pn = await getPhoneNumber()           // { token }
  _cache = { access_token, phone_token: pn?.token }
  return _cache
}

export function datSdtTest(phone) {
  localStorage.setItem('hannah_test_phone', phone)
}
