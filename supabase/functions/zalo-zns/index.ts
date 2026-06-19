// Zalo ZNS — gửi tin giao dịch/chăm sóc theo template tới SĐT khách (hóa đơn, đặt lịch, thẻ, nhắc lịch...).
// Gọi: POST { template_key | template_id, phone, params:{...}, tracking_id? }
// template_key đọc template_id từ marketing_ai_config (zns_<key>). Token OA tự refresh.
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const APP_ID = Deno.env.get('ZALO_APP_ID') || ''
const APP_SECRET = Deno.env.get('ZALO_APP_SECRET') || ''
const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type' }
const jsonRes = (o: unknown, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } })

async function cfg(key: string): Promise<string> {
  const { data } = await supabase.from('marketing_ai_config').select('value').eq('key', key).maybeSingle()
  return data?.value || ''
}
async function setCfg(key: string, value: string) {
  await supabase.from('marketing_ai_config').upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' })
}

// Lấy OA access token, tự refresh nếu hết hạn
async function getZaloToken(): Promise<string> {
  const at = await cfg('zalo_access_token')
  const exp = Number(await cfg('zalo_token_expire') || 0)
  if (at && Date.now() < exp) return at
  const rt = await cfg('zalo_refresh_token')
  if (!rt) throw new Error('Chưa kết nối Zalo OA — chạy zalo-oauth')
  const resp = await fetch('https://oauth.zaloapp.com/v4/oa/access_token', {
    method: 'POST',
    headers: { secret_key: APP_SECRET, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ refresh_token: rt, app_id: APP_ID, grant_type: 'refresh_token' }).toString(),
  })
  const t = await resp.json()
  if (!t.access_token) throw new Error(`Refresh token lỗi: ${JSON.stringify(t)}`)
  await setCfg('zalo_access_token', t.access_token)
  if (t.refresh_token) await setCfg('zalo_refresh_token', t.refresh_token)
  await setCfg('zalo_token_expire', String(Date.now() + (Number(t.expires_in || 3600) - 120) * 1000))
  return t.access_token
}

// Chuẩn hóa SĐT về dạng 84xxxxxxxxx (ZNS yêu cầu)
function normPhone(p: string): string {
  let d = String(p || '').replace(/\D/g, '')
  if (d.startsWith('0')) d = '84' + d.slice(1)
  else if (d.startsWith('84')) { /* ok */ }
  else if (d.length === 9) d = '84' + d
  return d
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  try {
    const body = await req.json().catch(() => ({}))

    // mode status: kiểm tra đã cấu hình template_id nào
    if (body.mode === 'status') {
      const keys = ['zns_nhac_lich', 'zns_cham_soc', 'zns_moi_quay_lai', 'zns_xac_nhan_lich', 'zns_hoa_don', 'zns_the_lieu_trinh']
      const out: Record<string, boolean> = {}
      for (const k of keys) out[k] = !!(await cfg(k))
      return jsonRes({ ok: true, configured: out, has_token: !!(await cfg('zalo_access_token')) })
    }

    const phone = normPhone(body.phone)
    if (!phone || phone.length < 11) return jsonRes({ ok: false, error: 'sdt_khong_hop_le', phone }, 400)

    // template_id: ưu tiên truyền trực tiếp, hoặc theo template_key đọc config
    let templateId = String(body.template_id || '')
    if (!templateId && body.template_key) templateId = await cfg(`zns_${body.template_key}`)
    if (!templateId) return jsonRes({ ok: false, error: 'chua_cau_hinh_template', hint: `Thiếu zns_${body.template_key || '?'} trong marketing_ai_config` }, 400)

    const token = await getZaloToken()
    const payload: Record<string, unknown> = {
      phone,
      template_id: templateId,
      template_data: body.params || {},
      tracking_id: body.tracking_id || `hsms_${Date.now()}`,
    }
    const resp = await fetch('https://business.openapi.zalo.me/message/template', {
      method: 'POST',
      headers: { access_token: token, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const data = await resp.json()
    const ok = data.error === 0 || data.error === undefined
    // Ghi log gửi ZNS
    try {
      await supabase.from('marketing_messages').insert({
        kenh: 'zalo', direction: 'outbound', sender_type: 'system', sender_name: 'Hannah Spa (ZNS)',
        noi_dung: `[ZNS ${body.template_key || templateId}] ${JSON.stringify(body.params || {})}`,
        attachments: [], ai_safety_level: 'normal', trang_thai: ok ? 'sent' : 'failed',
        recipient_id: phone, conversation_id: `zns:${phone}`,
        metadata: { source: 'zns', template_key: body.template_key, template_id: templateId, result: data },
      })
    } catch { /* log lỗi không chặn */ }

    if (!ok) return jsonRes({ ok: false, error: data.message || JSON.stringify(data), zalo: data }, 200)
    return jsonRes({ ok: true, msg_id: data.data?.msg_id, sent_time: data.data?.sent_time, quota: data.data?.quota })
  } catch (e: any) {
    return jsonRes({ ok: false, error: e.message || String(e) }, 500)
  }
})
