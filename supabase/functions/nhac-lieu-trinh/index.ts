// nhac-lieu-trinh — Nhắc thẻ liệu trình tự động.
// Khách có thẻ còn buổi nhưng lâu chưa quay lại → cứ ~10 ngày nhắc 1 nhịp, kịch bản AI leo thang
// (nhắc nhẹ → lợi ích/sắp hết hạn → sale chéo + KM) để tăng tỷ lệ quay lại dùng tiếp.
//
// Modes:
//  - { mode:'scan' }                         → danh sách thẻ đang theo dõi (cho UI), ưu tiên thẻ đến hạn nhắc.
//  - { mode:'suggest', the_id }              → AI sinh kịch bản nhắc cho nhịp tiếp theo (không gửi, không ghi).
//  - { mode:'send', the_id, kenh, noi_dung } → ghi nhận 1 nhịp nhắc (+ gửi ZNS nếu kenh='zns').
//  - { mode:'mark', the_id, trang_thai }     → đổi trạng thái theo dõi (da_quay_lai/tam_dung/theo_doi).
//  - { mode:'run', limit? }                  → CRON: quét thẻ đến hạn → tự sinh kịch bản + gửi + ghi log.
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const DEEPSEEK_API_KEY = Deno.env.get('DEEPSEEK_API_KEY') || ''
const DEEPSEEK_MODEL = Deno.env.get('DEEPSEEK_MODEL') || Deno.env.get('DEEPSEEK_MODEL_FAST') || 'deepseek-v4-flash'
const DEEPSEEK_BASE_URL = Deno.env.get('DEEPSEEK_BASE_URL') || 'https://api.deepseek.com'

const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' }
const json = (o: unknown, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } })

const MAX_NHAC = 6  // tối đa 6 nhịp (~60 ngày) rồi tự tạm dừng để không làm phiền khách

function money(n: number) { return new Intl.NumberFormat('vi-VN').format(Number(n) || 0) + 'đ' }

// ── AI sinh kịch bản nhắc (DeepSeek, OpenAI-compatible) ──
async function callAI(system: string, input: unknown): Promise<{ ok: boolean; text: string; error?: string }> {
  if (!DEEPSEEK_API_KEY) return { ok: false, text: '', error: 'missing_deepseek_config' }
  try {
    const res = await fetch(`${DEEPSEEK_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${DEEPSEEK_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: DEEPSEEK_MODEL,
        max_tokens: 1200,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: typeof input === 'string' ? input : JSON.stringify(input) },
        ],
      }),
    })
    const data = await res.json()
    if (!res.ok) return { ok: false, text: '', error: data?.error?.message || JSON.stringify(data) }
    const text = (data?.choices || []).map((c: any) => c?.message?.content || '').join('\n').trim()
    return { ok: true, text }
  } catch (e) {
    return { ok: false, text: '', error: String(e) }
  }
}

// Hiến pháp giọng nói + nhịp leo thang
function buildSystemPrompt(promosText: string) {
  return [
    'Bạn là trợ lý chăm sóc khách của Hannah Beauty & Spa (Cần Thơ) — spa cao cấp, giọng ấm áp, lịch sự, tinh tế, xưng "Hannah Spa" gọi khách là "chị/anh" theo tên.',
    'Nhiệm vụ: soạn 1 tin nhắn ngắn (Zalo/SMS, 2-4 câu, có thể chèn 1-2 emoji nhẹ) mời khách quay lại dùng tiếp thẻ liệu trình CÒN BUỔI, kèm 1 gợi ý cho nhân viên về cách sale chéo/ưu đãi.',
    'Quy tắc nhịp (cadence) — soạn KHÁC NHAU theo "nhip":',
    '  • nhip 1: nhắc nhẹ nhàng, quan tâm sức khỏe/làn da, nhắc còn buổi, mời chọn lịch thuận tiện. KHÔNG ép, KHÔNG giảm giá.',
    '  • nhip 2: nhấn lợi ích duy trì liệu trình đều đặn + nhắc khéo kẻo quên/thẻ có hạn; gợi ý chốt lịch trong tuần.',
    '  • nhip 3 trở lên: tặng thêm ưu đãi/quà nhỏ hoặc khuyến mãi đang chạy để tạo lý do quay lại ngay; gợi ý nhân viên sale chéo dịch vụ phù hợp.',
    'Tuyệt đối KHÔNG bịa thông tin giá/khuyến mãi không có trong dữ liệu. Nếu có KM đang chạy phù hợp thì nhắc đúng.',
    promosText ? `Khuyến mãi đang chạy (dùng nếu phù hợp):\n${promosText}` : 'Hiện không có khuyến mãi nào đang chạy — không được bịa khuyến mãi.',
    'Trả về JSON thuần (không markdown): {"tin_nhan":"...","goi_y_nhan_vien":"...","kenh_de_xuat":"zalo|goi|zns"}',
  ].join('\n')
}

async function getActivePromos(): Promise<string> {
  try {
    const today = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' })).toISOString().slice(0, 10)
    const { data } = await supabase
      .from('khuyen_mai')
      .select('ten, gia_goc, gia_km, phan_tram_giam, thoi_gian_ket_thuc, is_active')
      .eq('is_active', true)
      .limit(20)
    const rows = (data || []).filter((k: any) => !k.thoi_gian_ket_thuc || String(k.thoi_gian_ket_thuc).slice(0, 10) >= today)
    if (!rows.length) return ''
    return rows.map((k: any) => `- ${k.ten}: ${money(k.gia_km)} (gốc ${money(k.gia_goc)}, giảm ${k.phan_tram_giam || 0}%)`).join('\n')
  } catch { return '' }
}

async function suggestForCard(card: any, promosText: string) {
  const nhip = Number(card.so_lan_nhac || 0) + 1
  const input = {
    ten_khach: card.ho_ten || 'Quý khách',
    dich_vu_the: card.ten_dich_vu,
    so_buoi_con: card.so_buoi_con_lai,
    so_buoi_tong: card.so_buoi_tong,
    so_ngay_vang: card.so_ngay_vang,
    ngay_het_han: card.ngay_het_han,
    nhip,
  }
  const ai = await callAI(buildSystemPrompt(promosText), input)
  let parsed: any = {}
  if (ai.ok) {
    try {
      const cleaned = ai.text.trim().replace(/^```json/i, '').replace(/^```/, '').replace(/```$/, '').trim()
      parsed = JSON.parse(cleaned)
    } catch { parsed = { tin_nhan: ai.text } }
  }
  // Fallback nếu AI lỗi — vẫn có kịch bản dùng được
  if (!parsed.tin_nhan) {
    parsed.tin_nhan = `Hannah Spa thân gửi chị ${card.ho_ten || ''}! Thẻ ${card.ten_dich_vu} của mình vẫn còn ${card.so_buoi_con_lai} buổi. Mình sắp xếp ghé lại để Hannah chăm sóc tiếp nhé, chị muốn hẹn ngày nào ạ? 🌸`
    parsed.goi_y_nhan_vien = nhip >= 3 ? 'Gợi ý ưu đãi nhỏ + sale chéo dịch vụ phù hợp lịch sử khách.' : 'Nhắc nhẹ, hỏi lịch rảnh để chốt hẹn.'
    parsed.kenh_de_xuat = 'zalo'
  }
  return { nhip, ...parsed, ai_ok: ai.ok, ai_error: ai.error }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  try {
    const body = await req.json().catch(() => ({}))
    const mode = body.mode || 'scan'

    // ── SCAN: danh sách thẻ đang theo dõi (UI) ──
    if (mode === 'scan') {
      const { data, error } = await supabase
        .from('v_nhac_lieu_trinh')
        .select('*')
        .order('den_han_nhac', { ascending: false })
        .order('so_ngay_vang', { ascending: false })
        .limit(Number(body.limit || 500))
      if (error) throw error
      const rows = data || []
      const stats = {
        tong: rows.length,
        den_han: rows.filter((r: any) => r.den_han_nhac).length,
        quay_lai: rows.filter((r: any) => r.da_quay_lai_sau_nhac).length,
        dang_theo_doi: rows.filter((r: any) => r.trang_thai_cham_soc === 'theo_doi').length,
      }
      return json({ ok: true, rows, stats })
    }

    // ── SUGGEST: sinh kịch bản cho 1 thẻ (không gửi) ──
    if (mode === 'suggest') {
      if (!body.the_id) return json({ ok: false, error: 'thieu the_id' }, 400)
      const { data: card, error } = await supabase.from('v_nhac_lieu_trinh').select('*').eq('the_id', body.the_id).maybeSingle()
      if (error) throw error
      if (!card) return json({ ok: false, error: 'khong_tim_thay_the' }, 404)
      const promos = await getActivePromos()
      const out = await suggestForCard(card, promos)
      return json({ ok: true, ...out })
    }

    // ── SEND: ghi nhận 1 nhịp nhắc (+ ZNS nếu kenh='zns') ──
    if (mode === 'send') {
      if (!body.the_id || !body.noi_dung) return json({ ok: false, error: 'thieu_the_id_hoac_noi_dung' }, 400)
      const kenh = body.kenh || 'thu_cong'
      let ketQua = 'da_gui'
      let znsResult: any = null

      if (kenh === 'zns') {
        const { data: card } = await supabase.from('v_nhac_lieu_trinh').select('*').eq('the_id', body.the_id).maybeSingle()
        if (card?.so_dien_thoai) {
          try {
            const r = await supabase.functions.invoke('zalo-zns', {
              body: { template_key: 'moi_quay_lai', phone: card.so_dien_thoai, params: {
                customer_name: card.ho_ten || 'Quý khách',
                service: card.ten_dich_vu || 'liệu trình',
                remain_time: String(card.so_buoi_con_lai ?? ''),
              } },
            })
            znsResult = r.data || r.error
            if (r.error || r.data?.ok === false) ketQua = 'gui_loi'
          } catch (e) { ketQua = 'gui_loi'; znsResult = String(e) }
        } else { ketQua = 'thieu_sdt' }
      }

      const { data: row, error } = await supabase.rpc('ghi_nhan_nhac_lieu_trinh', {
        p_the_id: body.the_id, p_kenh: kenh, p_noi_dung: body.noi_dung, p_ket_qua: ketQua,
      })
      if (error) throw error
      return json({ ok: true, row, ket_qua: ketQua, zns: znsResult })
    }

    // ── MARK: đổi trạng thái theo dõi ──
    if (mode === 'mark') {
      if (!body.the_id || !body.trang_thai) return json({ ok: false, error: 'thieu_tham_so' }, 400)
      const { data: row, error } = await supabase.rpc('dat_trang_thai_nhac_lieu_trinh', {
        p_the_id: body.the_id, p_trang_thai: body.trang_thai,
      })
      if (error) throw error
      return json({ ok: true, row })
    }

    // ── RUN (cron): quét đến hạn → sinh + gửi + ghi ──
    if (mode === 'run') {
      const limit = Number(body.limit || 15)
      // Kênh gửi tự động (ZNS) đã sẵn sàng chưa? Chưa cấu hình template → THOÁT SỚM (không AI, không lặp, tránh timeout).
      const { data: cfgRow } = await supabase.from('marketing_ai_config').select('value').eq('key', 'zns_moi_quay_lai').maybeSingle()
      const znsReady = !!(cfgRow?.value) && body.force !== true
      const { data: dueRows } = await supabase.from('v_nhac_lieu_trinh').select('the_id').eq('den_han_nhac', true).limit(2000)
      if (!znsReady) {
        return json({
          ok: true, skipped: 'zns_chua_san_sang',
          tong_den_han: (dueRows || []).length,
          ghi_chu: 'Kênh ZNS tự động chưa cấu hình (thiếu marketing_ai_config.zns_moi_quay_lai) hoặc chưa nạp tiền ZBS. Cron đang ở chế độ chờ — nhân viên dùng trang Nhắc Thẻ LT để gửi thủ công. Khi ZNS sống, cron tự gửi.',
        })
      }
      const { data, error } = await supabase.from('v_nhac_lieu_trinh').select('*').eq('den_han_nhac', true).limit(500)
      if (error) throw error
      const promos = await getActivePromos()
      const results: any[] = []
      let daGui = 0, daQuayLai = 0, tamDung = 0

      for (const card of (data || [])) {
        // Khách đã quay lại sau lần nhắc trước → đánh dấu, không nhắc nữa
        if (card.da_quay_lai_sau_nhac) {
          await supabase.rpc('dat_trang_thai_nhac_lieu_trinh', { p_the_id: card.the_id, p_trang_thai: 'da_quay_lai' })
          daQuayLai++; continue
        }
        // Quá số nhịp tối đa → tạm dừng
        if (Number(card.so_lan_nhac || 0) >= MAX_NHAC) {
          await supabase.rpc('dat_trang_thai_nhac_lieu_trinh', { p_the_id: card.the_id, p_trang_thai: 'tam_dung' })
          tamDung++; continue
        }
        if (daGui >= limit) break  // tránh Edge timeout, mẻ sau cron tiếp

        // Gửi tự động qua ZNS bằng TEMPLATE cố định (KHÔNG gọi AI → nhanh, không timeout, tự động 100%).
        // CHỈ ghi nhận (tăng nhịp) khi GỬI THẬT thành công — chưa gửi được thì để hôm sau thử lại.
        const nhip = Number(card.so_lan_nhac || 0) + 1
        let znsResult: any = null, sent = false
        try {
          const r = await supabase.functions.invoke('zalo-zns', {
            body: { template_key: 'moi_quay_lai', phone: card.so_dien_thoai, params: {
              customer_name: card.ho_ten || 'Quý khách',
              service: card.ten_dich_vu || 'liệu trình',
              remain_time: String(card.so_buoi_con_lai ?? ''),
            } },
          })
          znsResult = r.data || r.error
          if (r.data?.ok) sent = true
        } catch (e) { znsResult = String(e) }

        if (sent) {
          await supabase.rpc('ghi_nhan_nhac_lieu_trinh', {
            p_the_id: card.the_id, p_kenh: 'zns',
            p_noi_dung: `ZNS tự động: ${card.ten_dich_vu} còn ${card.so_buoi_con_lai} buổi (nhịp ${nhip})`,
            p_ket_qua: 'da_gui',
          })
          daGui++
          results.push({ the_id: card.the_id, ho_ten: card.ho_ten, nhip, kenh: 'zns', ket_qua: 'da_gui' })
        } else {
          // Chưa gửi được → bỏ qua, không tăng nhịp (chờ kênh sống). Báo để giám sát.
          results.push({ the_id: card.the_id, ho_ten: card.ho_ten, nhip, kenh: 'cho_kenh', ket_qua: 'chua_gui_duoc', ly_do: znsResult?.error || znsResult })
        }
      }

      return json({ ok: true, da_gui: daGui, da_quay_lai: daQuayLai, tam_dung: tamDung, tong_den_han: (data || []).length, results })
    }

    return json({ ok: false, error: 'mode_khong_hop_le' }, 400)
  } catch (e: any) {
    return json({ ok: false, error: e.message || String(e) }, 500)
  }
})
