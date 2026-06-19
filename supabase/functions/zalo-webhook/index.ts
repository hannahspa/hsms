// Zalo OA Webhook — nhận tin nhắn/sự kiện từ OA, chuẩn hóa và lưu vào marketing_messages (chung schema với Facebook).
// Cấu hình: app Zalo → Webhook → https://api.hannahspa.vn/functions/v1/zalo-webhook
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const OA_ID = Deno.env.get('ZALO_OA_ID') || ''

const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type' }
const jsonRes = (o: unknown, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } })

function stableId(...parts: (string | undefined | null)[]) {
  return parts.filter(Boolean).join(':').slice(0, 500)
}

type ZaloMsg = {
  event_name?: string
  sender?: { id: string }
  recipient?: { id: string }
  message?: { text?: string; msg_id?: string; attachments?: any[] }
  user_id_by_app?: string
  timestamp?: string
  app_id?: string
}

function normalizeZaloEvent(event: ZaloMsg) {
  const userId = event.sender?.id || event.user_id_by_app || ''
  const eventName = event.event_name || ''
  const text = event.message?.text || ''
  const attachments = event.message?.attachments || []
  const msgId = event.message?.msg_id || stableId('zalo', userId, event.timestamp || String(Date.now()), text)

  // Zalo gửi nhiều loại event — chỉ xử lý tin nhắn người dùng gửi
  if (eventName === 'oa_send_text' || eventName === 'oa_send_image' || eventName === 'oa_send_file' || eventName === 'oa_send_sticker') {
    return {
      kenh: 'zalo',
      direction: 'inbound',
      platform_user_id: userId,
      platform_message_id: msgId,
      sender_name: null,
      noi_dung: text || (attachments.length ? `[${eventName === 'oa_send_image' ? 'Hình ảnh' : eventName === 'oa_send_file' ? 'File' : 'Sticker'}]` : ''),
      attachments,
      conversation_id: stableId('zalo', userId),
      from_platform_user_id: userId,
      recipient_id: OA_ID,
      sender_type: 'customer',
      trang_thai: 'received',
      metadata: { source: 'zalo_webhook', raw_event: eventName, oa_id: OA_ID },
      created_at: new Date(Number(event.timestamp || Date.now())).toISOString(),
    }
  }
  // user_received_message / user_seen_message… — lưu metadata, không tạo dòng chat
  if (eventName === 'user_received_message' || eventName === 'user_seen_message') {
    return null // không lưu, chỉ để log
  }
  return null
}

async function getZaloToken(): Promise<string> {
  const { data } = await supabase.from('marketing_ai_config').select('value').eq('key', 'zalo_access_token').maybeSingle()
  if (!data?.value) throw new Error('Chưa có Zalo OA Access Token — chạy zalo-oauth trước')
  const exp = Number((await supabase.from('marketing_ai_config').select('value').eq('key', 'zalo_token_expire').maybeSingle()).data?.value || 0)
  if (Date.now() > exp) {
    // Tự gia hạn token
    const APP_ID = Deno.env.get('ZALO_APP_ID') || ''
    const APP_SECRET = Deno.env.get('ZALO_APP_SECRET') || ''
    const { data: rt } = await supabase.from('marketing_ai_config').select('value').eq('key', 'zalo_refresh_token').maybeSingle()
    if (!rt?.value) throw new Error('Refresh token hết hạn — chạy lại zalo-oauth')
    const resp = await fetch('https://oauth.zaloapp.com/v4/oa/access_token', {
      method: 'POST',
      headers: { secret_key: APP_SECRET, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ refresh_token: rt.value, app_id: APP_ID, grant_type: 'refresh_token' }).toString(),
    })
    const t = await resp.json()
    if (!t.access_token) throw new Error(`Refresh token lỗi: ${JSON.stringify(t)}`)
    await supabase.from('marketing_ai_config').upsert({ key: 'zalo_access_token', value: t.access_token, updated_at: new Date().toISOString() }, { onConflict: 'key' })
    if (t.refresh_token) await supabase.from('marketing_ai_config').upsert({ key: 'zalo_refresh_token', value: t.refresh_token, updated_at: new Date().toISOString() }, { onConflict: 'key' })
    await supabase.from('marketing_ai_config').upsert({ key: 'zalo_token_expire', value: String(Date.now() + (Number(t.expires_in || 3600) - 120) * 1000), updated_at: new Date().toISOString() }, { onConflict: 'key' })
    return t.access_token
  }
  return data.value
}

async function sendZaloMessage(userId: string, text: string) {
  const token = await getZaloToken()
  const resp = await fetch('https://openapi.zalo.me/v4/oa/message/text', {
    method: 'POST',
    headers: { access_token: token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ recipient: { user_id: userId }, message: { text } }),
  })
  const data = await resp.json()
  if (!resp.ok || data.error) throw new Error(data.message || JSON.stringify(data))
  return data
}

serve(async (req) => {
  // Zalo webhook verification + health check — phải trả 200 OK
  if (req.method === 'GET') return jsonRes({ ok: true, ts: Date.now() })
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    // Nếu là POST với mode → gửi tin (từ Hộp Thư gọi)
    const body = await req.json().catch(() => ({}))
    if (body.mode === 'send_message') {
      const token = await getZaloToken()
      const resp = await fetch('https://openapi.zalo.me/v4/oa/message/text', {
        method: 'POST',
        headers: { access_token: token, 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipient: { user_id: body.user_id }, message: { text: body.text } }),
      })
      const data = await resp.json()
      if (!resp.ok || data.error) throw new Error(data.message || JSON.stringify(data))
      // Lưu outgoing message
      await supabase.from('marketing_messages').insert({
        kenh: 'zalo', direction: 'outbound', sender_type: 'staff', sender_name: 'Hannah Spa',
        noi_dung: body.text, trang_thai: 'sent', platform_message_id: data.message_id || data.msg_id,
        conversation_id: stableId('zalo', String(body.user_id)),
        from_platform_user_id: OA_ID, recipient_id: String(body.user_id),
        metadata: { source: 'hsms_send', oa_id: OA_ID },
      }).select('id').single().catch(() => {})
      return jsonRes({ ok: true, message_id: data.message_id || data.msg_id })
    }

    // Mặc định: xử lý webhook từ Zalo
    const events: ZaloMsg[] = Array.isArray(body) ? body : (body.events || [body])
    let saved = 0
    for (const event of events) {
      const row = normalizeZaloEvent(event)
      if (!row) continue
      try {
        const { data: existing } = await supabase.from('marketing_messages')
          .select('id').eq('platform_message_id', row.platform_message_id).maybeSingle()
        if (existing) continue
      } catch { /* OK */ }

      const { error } = await supabase.from('marketing_messages').insert(row)
      if (!error) saved++
    }
    return jsonRes({ ok: true, processed: saved, total: events.length })
  } catch (e: any) {
    return jsonRes({ ok: false, error: e.message || String(e) }, 500)
  }
})
