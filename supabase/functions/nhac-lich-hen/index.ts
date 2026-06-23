// nhac-lich-hen — Nhắc khách trước giờ hẹn qua ZNS (template 'nhac_lich').
// Cron chạy mỗi tối ~18h: quét lịch hẹn NGÀY MAI chưa hủy/chưa xong, có SĐT, chưa nhắc → gửi ZNS → đánh dấu.
//
// Modes:
//  - { mode:'run' }   → CRON: nhắc tất cả lịch ngày mai chưa nhắc.
//  - { mode:'test', ngay? } → chạy thử cho 1 ngày cụ thể (mặc định ngày mai), KHÔNG đánh dấu.
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

const SPA_ADDRESS = '39 Nam Kỳ Khởi Nghĩa, Ninh Kiều, Cần Thơ'
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' }
const json = (o: unknown, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } })

// yyyy-mm-dd → dd/mm/yyyy
function dmy(iso: string) {
  if (!iso) return ''
  const [y, m, d] = String(iso).slice(0, 10).split('-')
  return `${d}/${m}/${y}`
}
// Ngày VN hôm nay + n ngày → yyyy-mm-dd
function ngayVN(offset = 0) {
  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }))
  now.setDate(now.getDate() + offset)
  return now.toISOString().slice(0, 10)
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  try {
    const body = await req.json().catch(() => ({}))
    const mode = body.mode || 'run'
    const isTest = mode === 'test'
    const ngay = body.ngay || ngayVN(1)   // mặc định: ngày mai

    // ZNS đã cấu hình template nhắc lịch chưa?
    const { data: cfg } = await supabase.from('marketing_ai_config').select('value').eq('key', 'zns_nhac_lich').maybeSingle()
    if (!cfg?.value) return json({ ok: true, skipped: 'zns_nhac_lich chưa cấu hình' })

    const { data: rows, error } = await supabase.from('lich_hen')
      .select('id, ten_khach, sdt_khach, ten_dich_vu, dich_vu_list, ngay_hen, gio_hen, trang_thai, nhac_zns_luc')
      .eq('ngay_hen', ngay)
      .in('trang_thai', ['cho_xac_nhan', 'da_xac_nhan'])
      .not('sdt_khach', 'is', null)
      .is('nhac_zns_luc', null)
      .limit(200)
    if (error) throw error

    const results: any[] = []
    let sent = 0
    for (const r of (rows || [])) {
      const dv = r.ten_dich_vu
        || (Array.isArray(r.dich_vu_list) ? r.dich_vu_list.map((x: any) => x?.ten || x?.ten_dich_vu).filter(Boolean).join(', ') : '')
        || 'Dịch vụ tại Hannah Spa'
      const params = {
        customer_name: r.ten_khach || 'Quý khách',
        booking_code: 'LH-' + String(r.id).slice(0, 8).toUpperCase(),
        schedule_time: `${String(r.gio_hen || '').slice(0, 5)} ${dmy(r.ngay_hen)}`.trim(),
        service: dv,
        address: SPA_ADDRESS,
      }
      if (isTest) { results.push({ id: r.id, params, test: true }); continue }
      try {
        const z = await supabase.functions.invoke('zalo-zns', {
          body: { template_key: 'nhac_lich', phone: r.sdt_khach, params },
        })
        const ok = !z.error && (z.data?.ok !== false)
        if (ok) {
          await supabase.from('lich_hen').update({ nhac_zns_luc: new Date().toISOString() }).eq('id', r.id)
          sent++
        }
        results.push({ id: r.id, ten: r.ten_khach, ok, zns: z.data || z.error })
      } catch (e) {
        results.push({ id: r.id, ten: r.ten_khach, ok: false, error: String(e) })
      }
    }
    return json({ ok: true, ngay, tong: (rows || []).length, da_gui: sent, results })
  } catch (e) {
    return json({ ok: false, error: String(e?.message || e) }, 500)
  }
})
