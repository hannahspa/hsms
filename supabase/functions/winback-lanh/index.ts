// winback-lanh — Khai thác lại khách LẠNH (mua thẻ 3 năm + lần cuối đến spa >90 ngày).
// 21:00 chốt 50 khách/ngày (ưu tiên 2026→2023) + sinh voucher mã riêng; 9:00 gửi ZNS uu_dai_voucher kèm mã.
//
// Modes: { mode:'chot' } 21h · { mode:'gui' } 9h · { mode:'stats' } UI · { mode:'preview' } xem trước.
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(SUPABASE_URL, SERVICE_KEY)
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' }
const json = (o: unknown, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } })
const SO_NGAY = 50

function todayVN() { return new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' })).toISOString().slice(0, 10) }
function dmy(iso: string) { if (!iso) return ''; const [y, m, d] = String(iso).slice(0, 10).split('-'); return `${d}/${m}/${y}` }
const NHOM_TEN: Record<string, string> = { cham_soc_da: 'Chăm Sóc Da', thu_gian: 'Massage / Gội Thư Giãn', triet_long: 'Triệt Lông' }

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  try {
    const body = await req.json().catch(() => ({}))
    const mode = body.mode || 'stats'

    if (mode === 'preview') {
      const { data } = await supabase.from('v_winback_khach_lanh').select('*')
        .not('nhom_so_thich', 'is', null).order('nam_lan_cuoi', { ascending: false }).order('so_ngay_vang', { ascending: true }).limit(SO_NGAY)
      return json({ ok: true, danh_sach: data || [] })
    }

    if (mode === 'stats') {
      const today = todayVN()
      const { data: hd } = await supabase.from('winback_hang_doi').select('trang_thai, nhom_so_thich, da_den, gui_luc, ngay_du_kien')
      const rows = hd || []
      const conLai = await supabase.from('v_winback_khach_lanh').select('khach_hang_id', { count: 'exact', head: true }).not('nhom_so_thich', 'is', null)
      return json({ ok: true,
        tong_da_xu_ly: rows.length,
        hom_nay_gui: rows.filter(r => r.gui_luc && String(r.gui_luc).slice(0, 10) === today).length,
        da_den: rows.filter(r => r.da_den).length,
        loi: rows.filter(r => r.trang_thai === 'gui_loi').length,
        con_lai_chua_xu_ly: Math.max(0, (conLai.count || 0) - rows.length),
      })
    }

    if (mode === 'chot') {
      const { data: cnt, error } = await supabase.rpc('winback_chot', { p_so_luong: SO_NGAY, p_ngay: null })
      if (error) throw error
      return json({ ok: true, da_chot: cnt ?? 0 })
    }

    if (mode === 'gui') {
      const { data: cfg } = await supabase.from('marketing_ai_config').select('value').eq('key', 'zns_uu_dai_voucher').maybeSingle()
      if (!cfg?.value && body.force !== true) return json({ ok: true, skipped: 'zns_uu_dai_voucher chưa cấu hình (chờ template ZBS)' })
      const today = todayVN()
      const { data: rows } = await supabase.from('winback_hang_doi')
        .select('*').eq('trang_thai', 'da_chot').lte('ngay_du_kien', today)
        .order('nam_lan_cuoi', { ascending: false }).limit(SO_NGAY)
      let daGui = 0, loi = 0
      const results: any[] = []
      for (const r of (rows || [])) {
        // hạn voucher
        const { data: vm } = await supabase.from('voucher_ma').select('han_dung').eq('code', r.voucher_code).maybeSingle()
        let sent = false, msgId: string | null = null, znsErr: any = null
        try {
          const z = await supabase.functions.invoke('zalo-zns', {
            body: { template_key: 'uu_dai_voucher', phone: r.so_dien_thoai, params: {
              customer_name: r.ho_ten || 'Quý khách',
              service: NHOM_TEN[r.nhom_so_thich] || 'dịch vụ',
              voucher: r.voucher_code,
              discount: String(r.phan_tram) + '%',
              expiry: vm?.han_dung ? dmy(vm.han_dung) : '',
            } },
          })
          if (z.data?.ok) { sent = true; msgId = z.data.msg_id || null } else znsErr = z.data?.error || z.error
        } catch (e) { znsErr = String(e) }
        if (sent) {
          await supabase.from('winback_hang_doi').update({ trang_thai: 'da_gui', gui_luc: new Date().toISOString(), msg_id: msgId, ket_qua_gui: 'da_gui' }).eq('id', r.id)
          daGui++; results.push({ ho_ten: r.ho_ten, voucher: r.voucher_code, nhom: r.nhom_so_thich, ket_qua: 'da_gui' })
        } else {
          await supabase.from('winback_hang_doi').update({ trang_thai: 'gui_loi', ket_qua_gui: String(znsErr).slice(0, 200) }).eq('id', r.id)
          loi++; results.push({ ho_ten: r.ho_ten, ket_qua: 'gui_loi', ly_do: znsErr })
        }
      }
      return json({ ok: true, ngay: today, da_gui: daGui, loi, tong_chot: (rows || []).length, results })
    }

    return json({ ok: false, error: 'mode không hợp lệ' }, 400)
  } catch (e) {
    return json({ ok: false, error: String(e?.message || e) }, 500)
  }
})
