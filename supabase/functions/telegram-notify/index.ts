// telegram-notify — bắn thông báo LỊCH HẸN vào nhóm Telegram nhân sự NGAY khi lễ tân bấm Đặt Lịch
// (16/07/2026 — anh Nam: cron 5 phút chậm, muốn "bấm phát là có thông báo liền").
// Client (ModalDatHen) invoke với { lich_hen_id } sau khi insert thành công.
// Gửi xong set lich_hen.tg_bao_luc — cron 5' chỉ gửi dòng NULL (lưới an toàn), không trùng tin.
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
)
const TG_TOKEN = Deno.env.get('TELEGRAM_TOKEN') ?? ''

const esc = (s: unknown) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

// Tên gọi thân mật: "chị" + 2 chữ cuối (spa toàn nữ)
const tenGon = (hoTen: string) => hoTen.trim().split(/\s+/).slice(-2).join(' ')

// Mỗi dịch vụ 1 dòng 🌷; dịch vụ trùng nhau gộp số lượng "🌷 2 Massage..." (anh Nam 17/07)
function dongDichVu(lh: Record<string, any>): string[] {
  const list = Array.isArray(lh.dich_vu_list) ? lh.dich_vu_list : []
  const names = [
    String(lh.ten_dich_vu || '').trim(),
    ...list.map((d: any) => String(d?.ten_dich_vu || d?.ten || '').trim()),
  ].filter(Boolean)
  if (!names.length) return ['🌷 Dịch vụ']
  const dem = new Map<string, number>()
  for (const n of names) dem.set(n, (dem.get(n) || 0) + 1)
  return [...dem.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([n, c]) => `🌷 ${c > 1 ? c + ' ' : ''}${esc(n)}`)
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  try {
    const body = await req.json().catch(() => ({}))
    const id = String(body.lich_hen_id || '').trim()
    if (!id) return json({ error: 'Thieu lich_hen_id' }, 400)
    if (!TG_TOKEN) return json({ error: 'Thieu TELEGRAM_TOKEN (env container functions)' }, 500)

    const [{ data: lh }, { data: cfg }] = await Promise.all([
      supabase.from('lich_hen')
        .select('id, ten_khach, ngay_hen, gio_hen, ten_dich_vu, dich_vu_list, ghi_chu, trang_thai, tg_bao_luc, tg_message_id, ly_do_huy, nhan_vien:nhan_vien_id(ho_ten, telegram_chat_id)')
        .eq('id', id).maybeSingle(),
      supabase.from('marketing_ai_config').select('value').eq('key', 'telegram_group').maybeSingle(),
    ])
    if (!lh) return json({ error: 'Khong tim thay lich hen' }, 404)
    const group = String(cfg?.value || '').trim()
    if (!group) return json({ error: 'Chua cau hinh telegram_group' }, 400)

    // ── DỜI LỊCH (20/07) — đổi giờ/ngày; reply vào tin đặt gốc ──
    if (body.type === 'doi') {
      const gioCu = String(body.gio_cu || '').slice(0, 5)
      const gioMoi = String(lh.gio_hen || '').slice(0, 5)
      const homNayDoi = lh.ngay_hen === new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 10)
      const ngayViDoi = String(lh.ngay_hen || '').split('-').reverse().slice(0, 2).join('/')
      const ngayCu = String(body.ngay_cu || '').split('-').reverse().slice(0, 2).join('/')
      const doiNgay = body.ngay_cu && body.ngay_cu !== lh.ngay_hen
      const textDoi = ['🔄 ĐỔI GIỜ HẸN 🌸',
        `👤 ${esc(lh.ten_khach || 'Khách')}`,
        ...dongDichVu(lh),
        doiNgay
          ? `⏰ Dời: ${esc(ngayCu)} ${esc(gioCu)} → ${esc(ngayViDoi)} ${esc(gioMoi)} ✨`
          : `⏰ Dời giờ: ${esc(gioCu)} → ${esc(gioMoi)}${homNayDoi ? ' hôm nay' : ` ngày ${ngayViDoi}`} ✨`,
        'Cả nhà cập nhật lịch nha 🌸',
      ].join('\n')
      const resDoi = await fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: group, text: textDoi, parse_mode: 'HTML',
          ...(lh.tg_message_id ? { reply_parameters: { message_id: Number(lh.tg_message_id), allow_sending_without_reply: true } } : {}),
        }),
      })
      const tgDoi = await resDoi.json().catch(() => ({}))
      if (!tgDoi.ok) return json({ error: 'Telegram: ' + JSON.stringify(tgDoi).slice(0, 200) }, 500)
      return json({ ok: true, sent: true, type: 'doi' })
    }

    // ── KHÁCH HỦY HẸN (17/07) — báo nhóm để KTV khỏi chờ; không đụng tg_bao_luc ──
    if (body.type === 'huy') {
      const homNayHuy = lh.ngay_hen === new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 10)
      const ngayViHuy = String(lh.ngay_hen || '').split('-').reverse().slice(0, 2).join('/')
      const textHuy = ['😔 KHÁCH HỦY HẸN',
        `👤 ${esc(lh.ten_khach || 'Khách')}`,
        ...dongDichVu(lh),
        `⏰ ${esc(String(lh.gio_hen || '').slice(0, 5))}${homNayHuy ? ' hôm nay' : ` ngày ${ngayViHuy}`}`,
        ...(lh.ly_do_huy ? [`📝 Lý do: ${esc(lh.ly_do_huy)}`] : []),
        'Cả nhà cập nhật lịch trống nha 🌸',
      ].join('\n')
      const resHuy = await fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: group, text: textHuy, parse_mode: 'HTML',
          // Reply vào đúng tin đặt hẹn của lịch này (nếu bot từng báo) — thread liền mạch
          ...(lh.tg_message_id ? {
            reply_parameters: { message_id: Number(lh.tg_message_id), allow_sending_without_reply: true },
          } : {}),
        }),
      })
      const tgHuy = await resHuy.json().catch(() => ({}))
      if (!tgHuy.ok) return json({ error: 'Telegram: ' + JSON.stringify(tgHuy).slice(0, 200) }, 500)
      return json({ ok: true, sent: true, type: 'huy' })
    }

    if (lh.tg_bao_luc) return json({ ok: true, skipped: 'da_bao' })
    if (['huy', 'tu_choi'].includes(lh.trang_thai)) return json({ ok: true, skipped: 'lich_huy' })

    // Dòng KTV — giọng dễ thương như người thật (anh Nam 16/07); có telegram_chat_id → tag thẳng
    let dongKtv = '💖 Chị yêu nào làm cũng được ạ'
    const nv = lh.nhan_vien as any
    if (nv?.ho_ten) {
      const ten = esc(tenGon(nv.ho_ten))
      dongKtv = nv.telegram_chat_id
        ? `💖 Khách Book chị <a href="tg://user?id=${esc(nv.telegram_chat_id)}">${ten}</a> ạ`
        : `💖 Khách Book chị ${ten} ạ`
    }

    const homNay = lh.ngay_hen === new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 10)
    const ngayVi = String(lh.ngay_hen || '').split('-').reverse().slice(0, 2).join('/')
    // Khách triệt BẢO HÀNH (20/07): liệt kê các KTV có tên trong danh sách triệt
    const bhKtv = Array.isArray(body.bao_hanh_ktv) ? body.bao_hanh_ktv.filter(Boolean) : []
    const dongBaoHanh = bhKtv.length
      ? [`💖 Các chị có tên trong danh sách Triệt: ${esc(bhKtv.map((n: string) => tenGon(String(n))).join(' - '))}`]
      : []
    const text = ['🔔 CÓ KHÁCH ĐẶT HẸN 🌸',
      `👤 ${esc(lh.ten_khach || 'Khách')}`,
      dongKtv,
      ...dongBaoHanh,
      ...dongDichVu(lh).map(d => bhKtv.length ? `${d} (Khách Bảo Hành)` : d),
      `⏰ ${esc(String(lh.gio_hen || '').slice(0, 5))}${homNay ? ' hôm nay ✨' : ` ngày ${ngayVi} 📆`}`,
      ...(lh.ghi_chu ? [`📝 ${esc(lh.ghi_chu)}`] : []),
    ].join('\n')

    const res = await fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: group, text, parse_mode: 'HTML' }),
    })
    const tg = await res.json().catch(() => ({}))
    if (!tg.ok) return json({ error: 'Telegram: ' + JSON.stringify(tg).slice(0, 200) }, 500)

    await supabase.from('lich_hen').update({
      tg_bao_luc: new Date().toISOString(),
      // Lưu message_id để tin hủy sau này REPLY vào đúng tin đặt này
      tg_message_id: tg.result?.message_id || null,
    }).eq('id', id)
    return json({ ok: true, sent: true })
  } catch (e) {
    return json({ error: String(e?.message || e) }, 500)
  }
})
