// Edge Function: send-push — gửi Web Push cho 1 nhân viên (KTV)
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.6.7'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const VAPID_PUBLIC = Deno.env.get('VAPID_PUBLIC_KEY')!
const VAPID_PRIVATE = Deno.env.get('VAPID_PRIVATE_KEY')!
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') || 'mailto:hannahspa.nm@gmail.com'

const supabase = createClient(SUPABASE_URL, SERVICE_KEY)
webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE)

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
const json = (obj: unknown, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  try {
    const { nhan_vien_id, title, body, url } = await req.json()
    if (!nhan_vien_id) return json({ error: 'thieu nhan_vien_id' }, 400)

    const { data: subs } = await supabase
      .from('push_subscriptions').select('*').eq('nhan_vien_id', nhan_vien_id)
    if (!subs || subs.length === 0) return json({ sent: 0, note: 'KTV chua bat thong bao' })

    const payload = JSON.stringify({
      title: title || 'Hannah Spa',
      body: body || '',
      url: url || '/checkin',
      tag: 'lich-hen',
    })

    let sent = 0, removed = 0
    for (const s of subs) {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          payload,
        )
        sent++
      } catch (e) {
        const code = (e as { statusCode?: number }).statusCode
        if (code === 404 || code === 410) {
          await supabase.from('push_subscriptions').delete().eq('id', s.id)
          removed++
        }
      }
    }
    return json({ sent, removed })
  } catch (e) {
    return json({ error: String(e) }, 500)
  }
})
