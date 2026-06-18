import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
const VERIFY_TOKEN = Deno.env.get('MARKETING_WEBHOOK_VERIFY_TOKEN') || ''
const WEBHOOK_SECRET = Deno.env.get('MARKETING_WEBHOOK_SECRET') || ''

const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-marketing-webhook-secret',
}

const json = (obj: unknown, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

type MarketingChannel = 'facebook' | 'zalo' | 'website' | 'khac'

type NormalizedMessage = {
  kenh: MarketingChannel
  direction: 'inbound' | 'outbound' | 'internal'
  platform_user_id?: string
  platform_message_id?: string
  ho_ten?: string
  so_dien_thoai?: string
  noi_dung: string
  attachments?: unknown[]
  page_id?: string
  page_name?: string
  conversation_id?: string
  from_platform_user_id?: string
  recipient_id?: string
  customer_id?: string
  created_at?: string
  chien_dich_id?: string
  metadata?: Record<string, unknown>
}

function requireEnv() {
  if (!SUPABASE_URL) throw new Error('Thieu SUPABASE_URL')
  if (!SERVICE_KEY) throw new Error('Thieu SUPABASE_SERVICE_ROLE_KEY')
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

function isFacebookWebhook(body: any) {
  return body?.object === 'page' || Array.isArray(body?.entry)
}

function hasValidSecret(req: Request, body: Record<string, unknown>) {
  if (isFacebookWebhook(body)) return true
  if (!WEBHOOK_SECRET) return true
  const header = req.headers.get('x-marketing-webhook-secret') || ''
  const bodySecret = typeof body.secret === 'string' ? body.secret : ''
  return header === WEBHOOK_SECRET || bodySecret === WEBHOOK_SECRET
}

function isoFromMetaTimestamp(value: unknown) {
  const n = Number(value || 0)
  if (!n) return new Date().toISOString()
  return new Date(n > 100000000000 ? n : n * 1000).toISOString()
}

function stableId(parts: unknown[]) {
  return parts
    .map((part) => String(part || '').trim())
    .filter(Boolean)
    .join(':')
    .slice(0, 500)
}

function textFromFacebookEvent(event: any) {
  return event?.message?.text
    || event?.postback?.title
    || event?.postback?.payload
    || event?.referral?.ref
    || ''
}

function attachmentsFromFacebookEvent(event: any) {
  if (Array.isArray(event?.message?.attachments)) return event.message.attachments
  return []
}

function normalizeFacebook(body: any): NormalizedMessage[] {
  const entries = Array.isArray(body.entry) ? body.entry : []
  const out: NormalizedMessage[] = []

  for (const entry of entries) {
    const pageId = String(entry.id || '')
    const messaging = Array.isArray(entry.messaging) ? entry.messaging : []
    for (const event of messaging) {
      if (event?.delivery || event?.read || event?.reaction) continue

      const senderId = String(event?.sender?.id || '')
      const recipientId = String(event?.recipient?.id || pageId || '')
      const isPageSender = senderId && pageId && senderId === pageId
      const customerId = isPageSender ? recipientId : senderId
      const text = textFromFacebookEvent(event)
      const attachments = attachmentsFromFacebookEvent(event)
      if (!text && attachments.length === 0) continue

      const createdAt = isoFromMetaTimestamp(event?.timestamp || entry.time)
      const messageId = String(
        event?.message?.mid
        || event?.postback?.mid
        || stableId(['fb_webhook', pageId, customerId, event?.timestamp, text || attachments.length]),
      )
      const conversationId = stableId(['fb', pageId, customerId])

      out.push({
        kenh: 'facebook',
        direction: isPageSender ? 'outbound' : 'inbound',
        platform_user_id: customerId || undefined,
        platform_message_id: messageId,
        ho_ten: isPageSender ? undefined : event?.sender?.name,
        noi_dung: text,
        attachments,
        page_id: pageId || undefined,
        conversation_id: conversationId || undefined,
        from_platform_user_id: senderId || undefined,
        recipient_id: customerId || undefined,
        customer_id: customerId || undefined,
        created_at: createdAt,
        metadata: {
          source: 'meta_webhook',
          page_id: pageId || null,
          customer_id: customerId || null,
          recipient_id: customerId || null,
          conversation_id: conversationId || null,
          event_timestamp: event?.timestamp || entry.time || null,
          raw_message: event,
          raw_entry: entry,
        },
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
    direction: 'inbound',
    platform_user_id: userId,
    platform_message_id: body.message?.msg_id || body.message_id || stableId(['zalo', userId, Date.now(), text]),
    noi_dung: text,
    metadata: { source: 'zalo_webhook', raw: body, event_name: eventName },
  }]
}

function normalizeDirect(body: any): NormalizedMessage[] {
  const msg = body.message || body
  const text = msg.noi_dung || msg.text
  if (!text) return []
  return [{
    kenh: msg.kenh || 'website',
    direction: msg.direction || 'inbound',
    platform_user_id: msg.platform_user_id,
    platform_message_id: msg.platform_message_id || stableId([msg.kenh || 'website', msg.platform_user_id, Date.now(), text]),
    ho_ten: msg.ho_ten,
    so_dien_thoai: msg.so_dien_thoai,
    noi_dung: text,
    chien_dich_id: msg.chien_dich_id,
    metadata: msg.metadata || { source: 'direct_webhook', raw: body },
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

function messageRow(message: NormalizedMessage) {
  const isOut = message.direction === 'outbound'
  return {
    kenh: message.kenh,
    direction: message.direction,
    platform_message_id: message.platform_message_id || null,
    sender_type: isOut ? 'staff' : 'customer',
    sender_name: message.ho_ten || (isOut ? message.page_name || 'Hannah Spa' : null),
    noi_dung: message.noi_dung || '',
    attachments: message.attachments || [],
    trang_thai: isOut ? 'sent' : 'received',
    sent_at: isOut ? message.created_at || new Date().toISOString() : null,
    metadata: message.metadata || {},
    created_at: message.created_at || new Date().toISOString(),
    conversation_id: message.conversation_id || null,
    from_platform_user_id: message.from_platform_user_id || null,
    recipient_id: message.recipient_id || null,
  }
}

async function saveRawMessage(message: NormalizedMessage) {
  const row = messageRow(message)
  const hasStableId = !!row.platform_message_id
  const query = hasStableId
    ? supabase.from('marketing_messages').upsert(row, { onConflict: 'kenh,platform_message_id' })
    : supabase.from('marketing_messages').insert(row)
  const { data, error } = await query
    .select('id, platform_message_id, created_at')
    .single()
  if (error) throw error
  return data
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method === 'GET') return verifyGet(req) || json({ error: 'verify_failed' }, 403)

  try {
    requireEnv()
    const body = await req.json().catch(() => ({}))
    if (!hasValidSecret(req, body)) return json({ error: 'invalid_webhook_secret' }, 401)

    const messages = normalize(body)
    if (messages.length === 0) return json({ ok: true, processed: 0, note: 'no_supported_message' })

    const results = []
    for (const message of messages) {
      const raw = await saveRawMessage(message)

      results.push({
        ok: true,
        raw_message_id: raw?.id || null,
        platform_message_id: message.platform_message_id || null,
        realtime_segment: message.kenh === 'facebook',
      })
    }

    return json({ ok: true, processed: results.length, results })
  } catch (e) {
    return json({ ok: false, error: e instanceof Error ? e.message : String(e) }, 500)
  }
})
