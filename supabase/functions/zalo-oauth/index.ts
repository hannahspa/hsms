// Zalo OA OAuth v4 (PKCE) — lấy + tự gia hạn Access Token cho HSMS gọi API Zalo/ZNS.
// Token lưu trong marketing_ai_config (key zalo_access_token / zalo_refresh_token / zalo_token_expire).
// Secret/app_id đặt ở VPS env, KHÔNG hardcode.
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const APP_ID = Deno.env.get('ZALO_APP_ID') || ''
const APP_SECRET = Deno.env.get('ZALO_APP_SECRET') || ''
const REDIRECT = Deno.env.get('ZALO_OAUTH_REDIRECT') || ''
const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type' }
const jsonRes = (o: unknown, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } })
const htmlRes = (t: string) => new Response(`<!doctype html><meta charset="utf-8"><body style="font-family:system-ui;padding:48px;text-align:center;color:#1A1209"><h2>${t}</h2></body>`, { headers: { 'Content-Type': 'text/html; charset=utf-8' } })

async function setCfg(key: string, value: string) {
  await supabase.from('marketing_ai_config').upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' })
}
async function getCfg(key: string) {
  const { data } = await supabase.from('marketing_ai_config').select('value').eq('key', key).maybeSingle()
  return data?.value || ''
}

function b64url(buf: Uint8Array) {
  return btoa(String.fromCharCode(...buf)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
async function sha256b64url(s: string) {
  const h = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s))
  return b64url(new Uint8Array(h))
}

async function exchange(params: Record<string, string>) {
  const res = await fetch('https://oauth.zaloapp.com/v4/oa/access_token', {
    method: 'POST',
    headers: { secret_key: APP_SECRET, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(params).toString(),
  })
  return await res.json()
}

async function saveTokens(t: any) {
  if (!t || !t.access_token) return false
  await setCfg('zalo_access_token', t.access_token)
  if (t.refresh_token) await setCfg('zalo_refresh_token', t.refresh_token)
  await setCfg('zalo_token_expire', String(Date.now() + (Number(t.expires_in || 3600) - 120) * 1000))
  return true
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (!APP_ID || !APP_SECRET || !REDIRECT) return jsonRes({ error: 'thieu_cau_hinh_zalo_env' }, 500)

  // POST: refresh token (cron) hoặc kiểm tra trạng thái
  if (req.method === 'POST') {
    const body = await req.json().catch(() => ({}))
    if (body.mode === 'status') {
      const exp = Number(await getCfg('zalo_token_expire') || 0)
      return jsonRes({ has_token: !!(await getCfg('zalo_access_token')), has_refresh: !!(await getCfg('zalo_refresh_token')), expire_at: exp, valid: exp > Date.now() })
    }
    const rt = await getCfg('zalo_refresh_token')
    if (!rt) return jsonRes({ error: 'chua_co_refresh_token', hint: 'Mo GET /zalo-oauth de cap quyen lan dau' }, 400)
    const t = await exchange({ refresh_token: rt, app_id: APP_ID, grant_type: 'refresh_token' })
    const ok = await saveTokens(t)
    return jsonRes({ ok, error: ok ? null : t })
  }

  const url = new URL(req.url)
  const code = url.searchParams.get('code')

  // GET có code: Zalo redirect về sau khi admin đồng ý → đổi code lấy token
  if (code) {
    const verifier = await getCfg('zalo_pkce_verifier')
    const t = await exchange({ code, app_id: APP_ID, grant_type: 'authorization_code', code_verifier: verifier })
    const ok = await saveTokens(t)
    return ok
      ? htmlRes('✅ Kết nối Zalo OA thành công!<br/><br/>Bạn có thể đóng tab này và quay lại HSMS.')
      : htmlRes('❌ Lỗi lấy token Zalo:<br/><pre style="text-align:left;font-size:13px">' + JSON.stringify(t) + '</pre>')
  }

  // GET không code: bắt đầu OAuth — tạo PKCE rồi chuyển sang trang cấp quyền Zalo
  const verifier = b64url(crypto.getRandomValues(new Uint8Array(48)))
  await setCfg('zalo_pkce_verifier', verifier)
  const challenge = await sha256b64url(verifier)
  const perm = `https://oauth.zaloapp.com/v4/oa/permission?app_id=${APP_ID}&redirect_uri=${encodeURIComponent(REDIRECT)}&code_challenge=${challenge}&state=hsms`
  return Response.redirect(perm, 302)
})
