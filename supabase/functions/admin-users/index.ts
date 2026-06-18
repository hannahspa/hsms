const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''
const SUPABASE_PUBLIC_URL = Deno.env.get('SUPABASE_PUBLIC_URL') || ''
const HSMS_PUBLIC_API_URL = Deno.env.get('HSMS_PUBLIC_API_URL') || 'https://api.hannahspa.vn'
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
const REST_BASE = HSMS_PUBLIC_API_URL || SUPABASE_PUBLIC_URL || SUPABASE_URL
const AUTH_BASE = HSMS_PUBLIC_API_URL

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const json = (obj: unknown, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

function fail(message: string, status = 400) {
  return json({ ok: false, error: message }, status)
}

function getBearer(req: Request) {
  const auth = req.headers.get('Authorization') || ''
  return auth.startsWith('Bearer ') ? auth.slice(7) : ''
}

async function supabaseFetch(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers)
  headers.set('apikey', SERVICE_KEY)
  headers.set('Authorization', `Bearer ${SERVICE_KEY}`)
  headers.set('Content-Type', headers.get('Content-Type') || 'application/json')

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort('Supabase request timeout'), 8000)
  const res = await fetch(`${REST_BASE}${path}`, { ...init, headers, signal: controller.signal })
    .finally(() => clearTimeout(timer))
  const text = await res.text()
  const data = text ? JSON.parse(text) : null
  if (!res.ok) throw new Error(data?.msg || data?.message || data?.error || text || `HTTP ${res.status}`)
  return data
}

async function getUserFromToken(token: string) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort('Auth request timeout'), 8000)
  const res = await fetch(`${AUTH_BASE}/auth/v1/user`, {
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${token}`,
    },
    signal: controller.signal,
  }).finally(() => clearTimeout(timer))
  const data = await res.json().catch(() => null)
  if (!res.ok || !data?.id) throw new Error('Phien dang nhap khong hop le')
  return data
}

async function requireAdmin(req: Request) {
  const token = getBearer(req)
  if (!token) throw new Error('Ban can dang nhap lai')
  const user = await getUserFromToken(token)
  const profiles = await supabaseFetch(`/rest/v1/profiles?id=eq.${encodeURIComponent(user.id)}&select=id,vai_tro&limit=1`)
  if (profiles?.[0]?.vai_tro !== 'admin') throw new Error('Chi admin moi duoc quan ly user')
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (!REST_BASE || !AUTH_BASE || !SERVICE_KEY) return fail('VPS chua cau hinh Supabase URL hoac SERVICE_ROLE_KEY', 500)

  try {
    const body = await req.json().catch(() => ({}))
    const action = String(body.action || '')
    if (action === 'health') {
      return json({
        ok: true,
        rest_base: REST_BASE.includes('api.hannahspa.vn') ? 'caddy_public' : 'fallback',
        auth_base: AUTH_BASE.includes('api.hannahspa.vn') ? 'caddy_bypass' : 'custom',
      })
    }

    await requireAdmin(req)

    const id = String(body.id || '')
    const email = String(body.email || '').trim()
    const password = body.password ? String(body.password) : ''
    const hoTen = String(body.ho_ten || '').trim()
    const vaiTro = String(body.vai_tro || 'ktv')

    if (action === 'create') {
      if (!email || !password || !hoTen) return fail('Thieu thong tin tao user')
      const created = await supabaseFetch('/auth/v1/admin/users', {
        method: 'POST',
        body: JSON.stringify({
          email,
          password,
          email_confirm: true,
          user_metadata: { ho_ten: hoTen },
        }),
      })
      const userId = created?.id
      if (!userId) return fail('Khong lay duoc id user moi', 500)

      await supabaseFetch('/rest/v1/profiles?on_conflict=id', {
        method: 'POST',
        headers: { Prefer: 'resolution=merge-duplicates' },
        body: JSON.stringify({
          id: userId,
          ho_ten: hoTen,
          email,
          vai_tro: vaiTro,
        }),
      })

      return json({ ok: true, id: userId })
    }

    if (action === 'update') {
      if (!id || !hoTen) return fail('Thieu thong tin cap nhat user')
      const authUpdate: Record<string, unknown> = { user_metadata: { ho_ten: hoTen } }
      if (password) authUpdate.password = password

      await supabaseFetch(`/auth/v1/admin/users/${encodeURIComponent(id)}`, {
        method: 'PUT',
        body: JSON.stringify(authUpdate),
      })
      await supabaseFetch(`/rest/v1/profiles?id=eq.${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: JSON.stringify({ ho_ten: hoTen, vai_tro: vaiTro }),
      })

      return json({ ok: true })
    }

    if (action === 'delete') {
      if (!id) return fail('Thieu id user')
      await supabaseFetch(`/auth/v1/admin/users/${encodeURIComponent(id)}`, { method: 'DELETE' })
      await supabaseFetch(`/rest/v1/profiles?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE' })
      return json({ ok: true })
    }

    return fail('Action khong hop le')
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    const status = message.includes('admin') || message.includes('dang nhap') ? 403 : 500
    return fail(message, status)
  }
})
