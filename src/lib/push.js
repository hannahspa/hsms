// ─── Web Push client helper (KTV bật thông báo lịch hẹn) ──────────────────
import { supabase } from './supabase'

// Khóa công khai VAPID (an toàn để lộ ở client)
const VAPID_PUBLIC_KEY = 'BKLMcq1nQxeOttIG27U5_14czFHc2gkeEN-TqNnywlh3M26ENJ7TlGUnyIPe43j7HnqNro-Uexpm0GudW7fFyUM'

export const pushSupported = () =>
  typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const arr = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i)
  return arr
}

async function ensureSW() {
  const existing = await navigator.serviceWorker.getRegistration('/sw.js')
  return existing || navigator.serviceWorker.register('/sw.js')
}

// Trạng thái: 'unsupported' | 'denied' | 'default' | 'granted-on' | 'granted-off'
export async function getPushState() {
  if (!pushSupported()) return 'unsupported'
  if (Notification.permission === 'denied') return 'denied'
  if (Notification.permission === 'default') return 'default'
  try {
    const reg = await navigator.serviceWorker.getRegistration('/sw.js')
    const sub = reg ? await reg.pushManager.getSubscription() : null
    return sub ? 'granted-on' : 'granted-off'
  } catch { return 'granted-off' }
}

// Bật thông báo cho 1 nhân viên (KTV) — xin quyền + subscribe + lưu DB
export async function enablePush(nhanVienId) {
  if (!pushSupported()) throw new Error('Trình duyệt không hỗ trợ thông báo đẩy')
  const perm = await Notification.requestPermission()
  if (perm !== 'granted') throw new Error('Bạn chưa cho phép thông báo')

  const reg = await ensureSW()
  await navigator.serviceWorker.ready
  let sub = await reg.pushManager.getSubscription()
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    })
  }
  const json = sub.toJSON()
  const { error } = await supabase.from('push_subscriptions').upsert({
    nhan_vien_id: nhanVienId || null,
    endpoint: sub.endpoint,
    p256dh: json.keys?.p256dh,
    auth: json.keys?.auth,
    user_agent: navigator.userAgent.slice(0, 200),
  }, { onConflict: 'endpoint' })
  if (error) throw error
  return true
}

export async function disablePush() {
  try {
    const reg = await navigator.serviceWorker.getRegistration('/sw.js')
    const sub = reg ? await reg.pushManager.getSubscription() : null
    if (sub) {
      await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
      await sub.unsubscribe()
    }
  } catch (_) { /* ignore */ }
  return true
}
