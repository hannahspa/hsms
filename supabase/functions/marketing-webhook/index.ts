import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const VERIFY_TOKEN = Deno.env.get('MARKETING_WEBHOOK_VERIFY_TOKEN') || ''
const WEBHOOK_SECRET = Deno.env.get('MARKETING_WEBHOOK_SECRET') || ''

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-marketing-webhook-secret',
}

const json = (obj: unknown, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

type NormalizedMessage = {
  kenh: 'facebook' | 'zalo' | 'website' | 'khac'
  platform_user_id?: string
  platform_message_id?: string
  ho_ten?: string
  so_dien_thoai?: string
  noi_dung: string
  chien_dich_id?: string
  metadata?: Record<string, unknown>
}

function verifyGet(req: Request) {
  const url = new URL(req.url)
  const mode = url.searchParams.get('hub.mode')
  const token = url.searchParams.get('hub.verify_token') || url.searchParams.get('verify_token')
  const challenge = url.searchParams.get('hub.challenge') || url.searchParams.get('challenge')
  if (!VERIFY_TOKEN || token !== VERIFY_TOKEN) return null
  if (mode === 'subscribe' && challenge) return new Response(challenge, { headers: cors })
  return json({ ok: true, verified: true })
}

function hasValidSecret(req: Request, body: Record<string, unknown>) {
  if (!WEBHOOK_SECRET) return true
  const header = req.headers.get('x-marketing-webhook-secret') || ''
  const bodySecret = typeof body.secret === 'string' ? body.secret : ''
  return header === WEBHOOK_SECRET || bodySecret === WEBHOOK_SECRET
}

function normalizeFacebook(body: any): NormalizedMessage[] {
  const entries = Array.isArray(body.entry) ? body.entry : []
  const out: NormalizedMessage[] = []
  for (const entry of entries) {
    const messaging = Array.isArray(entry.messaging) ? entry.messaging : []
    for (const m of messaging) {
      const text = m?.message?.text || m?.postback?.payload
      if (!text) continue
      out.push({
        kenh: 'facebook',
        platform_user_id: m?.sender?.id,
        platform_message_id: m?.message?.mid,
        noi_dung: text,
        metadata: { raw: m, page_id: entry.id },
      })
    }
  }
  return out
}

function normalizeZalo(body: any): NormalizedMessage[] {
  const eventName = body.event_name || body.event
  const text = body.message?.text || body.message?.msg || body.text
  const userId = body.sender?.id || body.user_id || body.from_id
  if (!eventName || !text) return []
  return [{
    kenh: 'zalo',
    platform_user_id: userId,
    platform_message_id: body.message?.msg_id || body.message_id,
    noi_dung: text,
    metadata: { raw: body, event_name: eventName },
  }]
}

function normalizeDirect(body: any): NormalizedMessage[] {
  const msg = body.message || body
  if (!msg.noi_dung && !msg.text) return []
  return [{
    kenh: msg.kenh || 'website',
    platform_user_id: msg.platform_user_id,
    platform_message_id: msg.platform_message_id,
    ho_ten: msg.ho_ten,
    so_dien_thoai: msg.so_dien_thoai,
    noi_dung: msg.noi_dung || msg.text,
    chien_dich_id: msg.chien_dich_id,
    metadata: msg.metadata || { raw: body },
  }]
}

function normalize(body: Record<string, unknown>) {
  const anyBody = body as any
  const facebook = normalizeFacebook(anyBody)
  if (facebook.length) return facebook

  const zalo = normalizeZalo(anyBody)
  if (zalo.length) return zalo

  return normalizeDirect(anyBody)
}

async function invokeMarketingAI(message: NormalizedMessage) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/marketing-ai`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ mode: 'inbox_webhook', message }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data?.error || JSON.stringify(data))
  return data
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method === 'GET') return verifyGet(req) || json({ error: 'verify_failed' }, 403)

  try {
    const body = await req.json().catch(() => ({}))
    if (!hasValidSecret(req, body)) return json({ error: 'invalid_webhook_secret' }, 401)

    const messages = normalize(body)
    if (messages.length === 0) return json({ ok: true, processed: 0, note: 'no_supported_message' })

    const results = []
    for (const m of messages) results.push(await invokeMarketingAI(m))
    return json({ ok: true, processed: results.length, results })
  } catch (e) {
    return json({ error: String(e) }, 500)
  }
})
