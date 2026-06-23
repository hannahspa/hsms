// cham-soc-lai — Chăm sóc lại khách có thẻ liệu trình còn buổi. TỰ ĐỘNG, mỗi sáng 9h.
//   • Nhóm A "đúng nhịp": khách dùng thẻ ĐÚNG ~10 ngày trước, chưa nhắc lần nào → gửi HẾT.
//   • Nhóm B "tồn đọng": khách cũ đến hạn còn lại → 40 khách/ngày (ưu tiên ấm).
//
// Modes:
//  - { mode:'gui' }      → CRON 9h: gửi ZNS nhóm A (hết) + nhóm B (40), ghi nhật ký.
//  - { mode:'preview' }  → UI: danh sách DỰ KIẾN gửi NGÀY MAI (không gửi, không ghi).
//  - { mode:'stats' }    → UI: thống kê hôm nay + ngày mai (đúng nhịp / tồn đọng).
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' }
const json = (o: unknown, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } })
const SO_TON_DONG = 40        // số khách data cũ gửi mỗi ngày
const NHIP = 10               // nhịp nhắc: 10 ngày kể từ lần dùng thẻ
const A_MIN = 10, A_MAX = 13  // "đúng nhịp": vắng 10–13 ngày (đệm phòng cron lỗi 1-2 hôm)

function todayVN() {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' })).toISOString().slice(0, 10)
}

// Lấy 2 nhóm theo "độ lệch ngày" off (0 = hôm nay, 1 = ngày mai để xem trước)
async function layHaiNhom(off = 0) {
  // Nhóm A đúng nhịp: chưa nhắc + vắng nằm trong cửa sổ (dịch theo off để preview ngày mai)
  const { data: A } = await supabase.from('v_nhac_lieu_trinh').select('*')
    .eq('den_han_nhac', true).eq('so_lan_nhac', 0)
    .gte('so_ngay_vang', A_MIN - off).lte('so_ngay_vang', A_MAX - off)
    .order('so_ngay_vang', { ascending: true }).limit(500)
  const aIds = new Set((A || []).map((x: any) => x.the_id))
  // Nhóm B tồn đọng: tất cả đến hạn còn lại, ưu tiên ấm, lấy 40
  const { data: Ball } = await supabase.from('v_nhac_lieu_trinh').select('*')
    .eq('den_han_nhac', true).order('so_ngay_vang', { ascending: true }).limit(2000)
  const B = (Ball || []).filter((x: any) => !aIds.has(x.the_id)).slice(0, SO_TON_DONG)
  // map mã thẻ
  const ids = [...(A || []), ...B].map((x: any) => x.the_id)
  let maMap: Record<string, string> = {}
  if (ids.length) {
    const { data: thes } = await supabase.from('the_lieu_trinh').select('id, ma_the').in('id', ids)
    maMap = Object.fromEntries((thes || []).map((t: any) => [t.id, t.ma_the]))
  }
  const tag = (arr: any[], nhom: string) => (arr || []).map((c: any) => ({ ...c, nhom, ma_the: maMap[c.the_id] || null }))
  return { A: tag(A || [], 'dung_nhip'), B: tag(B, 'ton_dong') }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  try {
    const body = await req.json().catch(() => ({}))
    const mode = body.mode || 'stats'

    // ── PREVIEW: danh sách dự kiến NGÀY MAI ──
    if (mode === 'preview') {
      const { A, B } = await layHaiNhom(1)
      return json({ ok: true, dung_nhip: A, ton_dong: B })
    }

    // ── STATS ──
    if (mode === 'stats') {
      const today = todayVN()
      const { data: homNay } = await supabase.from('cham_soc_hang_doi').select('nhom, trang_thai, da_xem, da_quan_tam_oa').eq('ngay_du_kien', today)
      const mai = await layHaiNhom(1)
      const dem = (arr: any[], nhom: string) => arr.filter(r => r.nhom === nhom).length
      const rowsHN = homNay || []
      return json({ ok: true,
        hom_nay: {
          dung_nhip: dem(rowsHN, 'dung_nhip'), ton_dong: dem(rowsHN, 'ton_dong'), tong: rowsHN.length,
          da_gui: rowsHN.filter(r => ['da_gui', 'da_xem', 'da_quan_tam', 'da_quay_lai'].includes(r.trang_thai)).length,
          da_xem: rowsHN.filter(r => r.da_xem).length, quan_tam_oa: rowsHN.filter(r => r.da_quan_tam_oa).length,
          loi: rowsHN.filter(r => r.trang_thai === 'gui_loi').length,
        },
        ngay_mai: { dung_nhip: mai.A.length, ton_dong: mai.B.length, tong: mai.A.length + mai.B.length },
      })
    }

    // ── GỬI (cron 9h): nhóm A (hết) + nhóm B (40) ──
    if (mode === 'gui') {
      const { data: cfg } = await supabase.from('marketing_ai_config').select('value').eq('key', 'zns_moi_quay_lai').maybeSingle()
      if (!cfg?.value && body.force !== true) return json({ ok: true, skipped: 'zns_moi_quay_lai chưa cấu hình' })
      const today = todayVN()
      const { A, B } = await layHaiNhom(0)
      const all = [...A, ...B]
      let daGui = 0, loi = 0, boQua = 0
      const results: any[] = []
      for (const card of all) {
        // Ghi nhật ký trước (1 thẻ/ngày) — trùng (đã ghi hôm nay / đã bỏ qua) thì skip
        const ins = await supabase.from('cham_soc_hang_doi').insert({
          the_dai_dien_id: card.the_id, khach_hang_id: card.khach_hang_id, ma_the: card.ma_the,
          ho_ten: card.ho_ten, so_dien_thoai: card.so_dien_thoai, ten_dich_vu: card.ten_dich_vu,
          so_buoi_con_lai: card.so_buoi_con_lai, so_the: 1, so_ngay_vang: card.so_ngay_vang,
          nhom: card.nhom, uu_tien: card.so_ngay_vang, ngay_du_kien: today, trang_thai: 'da_chot',
        }).select('id').single()
        if (ins.error) { boQua++; continue }   // unique → đã có dòng hôm nay
        const noiDung = `ZNS chăm sóc lại: ${card.ten_dich_vu} còn ${card.so_buoi_con_lai} buổi (${card.nhom === 'dung_nhip' ? 'đúng nhịp' : 'tồn đọng'})`
        let sent = false, msgId: string | null = null, znsErr: any = null
        try {
          const z = await supabase.functions.invoke('zalo-zns', {
            body: { template_key: 'moi_quay_lai', phone: card.so_dien_thoai, params: {
              customer_name: card.ho_ten || 'Quý khách', service: card.ten_dich_vu || 'liệu trình',
              remain_time: String(card.so_buoi_con_lai ?? ''),
            } },
          })
          if (z.data?.ok) { sent = true; msgId = z.data.msg_id || null } else znsErr = z.data?.error || z.error
        } catch (e) { znsErr = String(e) }

        if (sent) {
          await supabase.from('cham_soc_hang_doi').update({
            trang_thai: 'da_gui', gui_luc: new Date().toISOString(), msg_id: msgId, ket_qua_gui: 'da_gui', noi_dung: noiDung,
          }).eq('id', ins.data.id)
          await supabase.rpc('ghi_nhan_nhac_lieu_trinh', { p_the_id: card.the_id, p_kenh: 'zns', p_noi_dung: noiDung, p_ket_qua: 'da_gui' }).then(() => {}, () => {})
          daGui++; results.push({ ho_ten: card.ho_ten, ma_the: card.ma_the, nhom: card.nhom, ket_qua: 'da_gui' })
        } else {
          await supabase.from('cham_soc_hang_doi').update({ trang_thai: 'gui_loi', ket_qua_gui: String(znsErr).slice(0, 200) }).eq('id', ins.data.id)
          loi++; results.push({ ho_ten: card.ho_ten, ma_the: card.ma_the, nhom: card.nhom, ket_qua: 'gui_loi', ly_do: znsErr })
        }
      }
      return json({ ok: true, ngay: today, dung_nhip: A.length, ton_dong: B.length, da_gui: daGui, loi, bo_qua: boQua, results })
    }

    return json({ ok: false, error: 'mode không hợp lệ' }, 400)
  } catch (e) {
    return json({ ok: false, error: String(e?.message || e) }, 500)
  }
})
