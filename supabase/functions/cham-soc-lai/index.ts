// cham-soc-lai — Module chăm sóc lại khách có thẻ liệu trình còn buổi.
// Cơ chế: 20h30 chốt 40 khách cho ngày mai (ưu tiên ấm trước), 9h sáng tự gửi ZNS 40 khách đã chốt.
//
// Modes:
//  - { mode:'chot' }   → CRON 20h30: đồng bộ hàng đợi + chốt 40 khách cho ngày mai.
//  - { mode:'gui' }    → CRON 9h00: gửi ZNS 40 khách đã chốt cho hôm nay.
//  - { mode:'stats' }  → UI: thống kê hôm nay / ngày mai / hàng đợi (cũ-mới).
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' }
const json = (o: unknown, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } })
const SO_LUONG_NGAY = 40

function todayVN() {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' })).toISOString().slice(0, 10)
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  try {
    const body = await req.json().catch(() => ({}))
    const mode = body.mode || 'stats'
    const soLuong = Number(body.so_luong || SO_LUONG_NGAY)

    // ── 20h30: đồng bộ hàng đợi + chốt danh sách cho ngày mai ──
    if (mode === 'chot') {
      const { data: synced } = await supabase.rpc('cham_soc_sync_hang_doi')
      const { data: chot, error } = await supabase.rpc('cham_soc_chot_lich', { p_so_luong: soLuong, p_ngay: null })
      if (error) throw error
      return json({ ok: true, da_them_vao_hang_doi: synced ?? 0, da_chot: chot ?? 0 })
    }

    // ── 9h00: gửi ZNS cho khách đã chốt (ngày dự kiến <= hôm nay) ──
    if (mode === 'gui') {
      // ZNS sẵn sàng?
      const { data: cfg } = await supabase.from('marketing_ai_config').select('value').eq('key', 'zns_moi_quay_lai').maybeSingle()
      if (!cfg?.value && body.force !== true) return json({ ok: true, skipped: 'zns_moi_quay_lai chưa cấu hình' })

      const today = todayVN()
      const { data: rows, error } = await supabase.from('cham_soc_hang_doi')
        .select('*').eq('trang_thai', 'da_chot').lte('ngay_du_kien', today)
        .order('uu_tien', { ascending: true }).limit(soLuong)
      if (error) throw error

      let daGui = 0, loi = 0
      const results: any[] = []
      for (const r of (rows || [])) {
        const noiDung = `ZNS chăm sóc lại: ${r.ten_dich_vu} còn ${r.so_buoi_con_lai} buổi`
        let sent = false, msgId: string | null = null, znsErr: any = null
        try {
          const z = await supabase.functions.invoke('zalo-zns', {
            body: { template_key: 'moi_quay_lai', phone: r.so_dien_thoai, params: {
              customer_name: r.ho_ten || 'Quý khách',
              service: r.ten_dich_vu || 'liệu trình',
              remain_time: String(r.so_buoi_con_lai ?? ''),
            } },
          })
          if (z.data?.ok) { sent = true; msgId = z.data.msg_id || null }
          else znsErr = z.data?.error || z.error
        } catch (e) { znsErr = String(e) }

        if (sent) {
          await supabase.from('cham_soc_hang_doi').update({
            trang_thai: 'da_gui', gui_luc: new Date().toISOString(), msg_id: msgId,
            ket_qua_gui: 'da_gui', noi_dung: noiDung, updated_at: new Date().toISOString(),
          }).eq('id', r.id)
          // Đồng bộ bộ đếm nhịp với hệ thống nhắc thẻ (lich_su per thẻ)
          if (r.the_dai_dien_id) {
            await supabase.rpc('ghi_nhan_nhac_lieu_trinh', {
              p_the_id: r.the_dai_dien_id, p_kenh: 'zns', p_noi_dung: noiDung, p_ket_qua: 'da_gui',
            }).then(() => {}, () => {})
          }
          daGui++
          results.push({ ho_ten: r.ho_ten, ket_qua: 'da_gui' })
        } else {
          await supabase.from('cham_soc_hang_doi').update({
            trang_thai: 'gui_loi', ket_qua_gui: String(znsErr).slice(0, 200), updated_at: new Date().toISOString(),
          }).eq('id', r.id)
          loi++
          results.push({ ho_ten: r.ho_ten, ket_qua: 'gui_loi', ly_do: znsErr })
        }
      }
      return json({ ok: true, da_gui: daGui, loi, tong_chot: (rows || []).length, results })
    }

    // ── stats: cho UI ──
    if (mode === 'stats') {
      const today = todayVN()
      const { data: all } = await supabase.from('cham_soc_hang_doi')
        .select('trang_thai, la_khach_moi, ngay_du_kien, gui_luc, da_xem, da_quan_tam_oa')
        .limit(5000)
      const rows = all || []
      const homNayGui = rows.filter(r => r.trang_thai !== 'cho_gui' && r.gui_luc && String(r.gui_luc).slice(0, 10) === today)
      const ngayMai = rows.filter(r => r.trang_thai === 'da_chot')
      const choGui = rows.filter(r => r.trang_thai === 'cho_gui')
      const cnt = (arr: any[]) => ({ tong: arr.length, moi: arr.filter(r => r.la_khach_moi).length, cu: arr.filter(r => !r.la_khach_moi).length })
      return json({ ok: true,
        hom_nay: { ...cnt(homNayGui), da_xem: homNayGui.filter(r => r.da_xem).length, quan_tam_oa: homNayGui.filter(r => r.da_quan_tam_oa).length },
        ngay_mai: cnt(ngayMai),
        hang_doi: { ...cnt(choGui), uoc_tinh_ngay: Math.ceil(choGui.length / SO_LUONG_NGAY) },
      })
    }

    return json({ ok: false, error: 'mode không hợp lệ' }, 400)
  } catch (e) {
    return json({ ok: false, error: String(e?.message || e) }, 500)
  }
})
