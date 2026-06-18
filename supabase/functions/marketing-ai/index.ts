import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
// AI provider: DeepSeek (OpenAI-compatible). Key/model đặt trong env trên VPS, KHÔNG hardcode.
// Uyển chuyển 2 model:
//  - FAST (deepseek-v4-flash): việc lặp/realtime (triage, trả lời inbox, tìm SĐT) — nhanh, rẻ, tránh Edge timeout.
//  - PRO  (deepseek-v4-pro):   việc suy luận sâu gọi 1 lần (kế hoạch nội dung, soạn bài, phân tích điều hành).
const DEEPSEEK_API_KEY = Deno.env.get('DEEPSEEK_API_KEY') || ''
const DEEPSEEK_MODEL_FAST = Deno.env.get('DEEPSEEK_MODEL') || Deno.env.get('DEEPSEEK_MODEL_FAST') || 'deepseek-v4-flash'
const DEEPSEEK_MODEL_PRO = Deno.env.get('DEEPSEEK_MODEL_PRO') || 'deepseek-v4-pro'
const DEEPSEEK_BASE_URL = Deno.env.get('DEEPSEEK_BASE_URL') || 'https://api.deepseek.com'

const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const json = (obj: unknown, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

type MarketingChannel = 'facebook' | 'zalo' | 'tiktok' | 'google' | 'website' | 'khac'

type IncomingMessage = {
  kenh?: MarketingChannel
  direction?: 'inbound' | 'outbound' | 'internal'
  platform_user_id?: string
  platform_message_id?: string
  ho_ten?: string
  so_dien_thoai?: string
  noi_dung?: string
  attachments?: unknown[]
  conversation_id?: string
  from_platform_user_id?: string
  recipient_id?: string
  created_at?: string
  chien_dich_id?: string
  metadata?: Record<string, unknown>
}

function getNowVN() {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }))
}

function todayISO() {
  return getNowVN().toISOString().slice(0, 10)
}

function money(n: number) {
  return new Intl.NumberFormat('vi-VN').format(n || 0) + 'đ'
}

function extractTextFromResponse(data: Record<string, unknown>) {
  // DeepSeek/OpenAI Chat Completions: { choices: [{ message: { content: '...' } }] }
  const choices = Array.isArray((data as any)?.choices) ? (data as any).choices : []
  const parts: string[] = []
  for (const c of choices) {
    const content = c?.message?.content
    if (typeof content === 'string') parts.push(content)
  }
  return parts.join('\n').trim()
}

async function callAI(system: string, input: unknown, tier: 'fast' | 'pro' = 'fast') {
  if (!DEEPSEEK_API_KEY) {
    return {
      ok: false,
      text: '',
      note: 'missing_deepseek_config',
    }
  }

  const model = tier === 'pro' ? DEEPSEEK_MODEL_PRO : DEEPSEEK_MODEL_FAST
  const res = await fetch(`${DEEPSEEK_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      // deepseek-v4-pro/flash là model suy luận: tốn ~256-360 token reasoning trước khi trả lời.
      // Để trần cao tránh câu trả lời bị cắt cụt (finish_reason=length); token thừa không tính phí.
      model,
      max_tokens: 4096,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: typeof input === 'string' ? input : JSON.stringify(input) },
      ],
    }),
  })

  const data = await res.json()
  if (!res.ok) {
    return { ok: false, text: '', error: data?.error?.message || JSON.stringify(data) }
  }
  return { ok: true, text: extractTextFromResponse(data as Record<string, unknown>), raw: data }
}

async function logRun(mode: string, status: 'success' | 'error', input: unknown, result: unknown, errorMessage = '') {
  await supabase.from('marketing_automation_runs').insert({
    mode,
    status,
    input_payload: input || {},
    result_payload: result || {},
    error_message: errorMessage || null,
  })
}

function safeJSON(text: string, fallback: Record<string, unknown>) {
  try {
    const cleaned = text.trim().replace(/^```json/i, '').replace(/^```/, '').replace(/```$/, '').trim()
    return JSON.parse(cleaned)
  } catch {
    return fallback
  }
}

// Lọc enum mức an toàn về giá trị DB hợp lệ (AI có thể trả 'safe'/'high'/...).
function safeLevel(v: unknown): 'normal' | 'needs_review' | 'blocked' {
  const s = String(v || '').trim().toLowerCase()
  if (['blocked', 'block', 'spam', 'danger', 'high', 'cao'].includes(s)) return 'blocked'
  if (['needs_review', 'review', 'warning', 'medium', 'caution', 'can_xem'].includes(s)) return 'needs_review'
  return 'normal'
}

// ── HIẾN PHÁP TƯ VẤN ── kiến thức cứng về spa nạp vào mọi gợi ý của AI (giọng + giá + nguyên tắc bán).
// Sửa nhanh: cập nhật DEFAULT_PLAYBOOK rồi deploy; hoặc tạo row cau_hinh.key='marketing_sales_playbook' (ưu tiên DB nếu có).
const DEFAULT_PLAYBOOK = `THƯƠNG HIỆU
- Hannah Beauty & Spa — spa làm đẹp & chăm sóc da uy tín tại Cần Thơ (từ 2019).
- Địa chỉ: 39 Nam Kỳ Khởi Nghĩa, P.Tân An, Ninh Kiều, Cần Thơ.
- Giờ mở cửa: 9:15–20:00 mỗi ngày (nhận khách tới 19:30). Nên hẹn trước.
- Đặt lịch: nhắn Zalo/Fanpage hoặc để lại SĐT để spa gọi lại. KHÔNG tự phát số hotline (chưa cấu hình) — hãy XIN SĐT/Zalo của khách.

GIỌNG NÓI
- Xưng "em", gọi khách "chị" (mặc định) hoặc "anh" nếu rõ là nam.
- Ấm áp, gần gũi kiểu người Cần Thơ, sang trọng nhưng không khách sáo. Ngắn gọn 1–3 câu, emoji nhẹ vừa phải.

NGUYÊN TẮC BÁN HÀNG (chống trả lời hời hợt)
1. LUÔN trả lời đúng điều khách hỏi rồi DẪN DẮT thêm một bước — không trả lời cụt 1 câu rồi để đó.
2. Hỏi rõ nhu cầu (vùng nào, tình trạng da, mục tiêu) để tư vấn trúng.
3. Hỏi giá: nêu KHOẢNG giá theo gói + mời để lại SĐT/Zalo nhận bảng giá chi tiết & ưu đãi. KHÔNG bịa số cứng ngoài khoảng giá.
4. Chủ động gợi combo/ưu đãi phù hợp; upsell nhẹ nhàng nếu hợp lý.
5. LUÔN kết bằng MỘT lời mời hành động rõ: chốt khung giờ / để lại SĐT / hẹn tư vấn.
6. Khách cũ: chào theo tên, nhắc đúng thẻ/buổi còn lại, mời dùng tiếp hoặc gia hạn.
7. Khách trả lời ngắn ("ok","dạ"): chốt bước tiếp theo cụ thể, đừng hỏi lại điều đã rõ.
8. KHÔNG hứa chữa khỏi bệnh, KHÔNG tự giảm giá, KHÔNG cam kết kết quả tuyệt đối.
9. Ca y khoa/dị ứng/bỏng/khiếu nại/hoàn tiền → trấn an + chuyển nhân viên thật (requires_human).

NHÓM DỊCH VỤ & KHOẢNG GIÁ (tham khảo, đừng đọc nguyên văn)
- Chăm Sóc Da Mặt: 80.000–1.400.000đ (cấy collagen, trị mụn, ủ trắng, nám).
- Combo Khuyến Mãi: 99.000–1.000.000đ (combo cặp đôi, body thư giãn).
- Công Nghệ Cao – Laser: 200.000–5.000.000đ (Hifu, RF trẻ hóa, Meso).
- Gội Đầu dưỡng sinh: 29.000–400.000đ.
- Massage Body: 69.000–990.000đ (cổ vai gáy, body bùn, foot care).
- Peel Da Sinh Học: 760.000–1.200.000đ.
- Phun Xăm môi/mày: 1.000.000–3.500.000đ.
- Triệt Lông: 180.000–3.500.000đ (nách, tay, chân, mặt).
- Tắm Trắng Toàn Thân: 120.000–1.300.000đ.
- Tẩy Tế Bào Chết / Phụ Thu: 10.000–180.000đ.
- Nhiều dịch vụ bán theo THẺ LIỆU TRÌNH nhiều buổi — ưu đãi hơn lẻ; gợi ý khi khách quan tâm gói dài.

KỊCH BẢN BÁN THEO NHÓM (mạch khéo léo — KHÔNG bổ nhào hỏi SĐT ngay khi khách mới hỏi)
Bước 1: Chào + công nhận nhu cầu của khách.
Bước 2: Hỏi 1–2 câu khơi gợi tình trạng/mong muốn cụ thể.
Bước 3: Tư vấn lợi ích + gói phù hợp + nêu KHUYẾN MÃI đang chạy nếu trùng dịch vụ khách hỏi.
Bước 4: Mời trải nghiệm / gợi chốt khung giờ ghé.
Bước 5: CHỈ khi khách đã thể hiện quan tâm rõ → xin SĐT/Zalo một cách TỰ NHIÊN để giữ ưu đãi & đặt lịch.
- Triệt lông: khơi "mình muốn triệt vùng nào, đã từng triệt chưa ạ" → nhấn công nghệ êm dịu, triệt tận gốc + gói nhiều buổi tiết kiệm hơn.
- Da mặt/mụn/nám: hỏi tình trạng da hiện tại → tư vấn liệu trình theo buổi + cách chăm tại nhà.
- Massage/gội dưỡng sinh: khơi "dạo này mình hay mỏi vai gáy/căng thẳng không ạ" → mời trải nghiệm thư giãn + combo.
- Tắm trắng/phun xăm: hỏi mong muốn cụ thể → tư vấn gói + lưu ý trước/sau khi làm.
Nếu khách hỏi trống ("bảng giá", "tư vấn") → giới thiệu giá trị + hỏi nhu cầu trước, rồi mới mời để lại liên hệ.

KIẾN THỨC CHUYÊN MÔN (tư vấn KHOA HỌC, nói để khách tin tưởng — KHÔNG chẩn đoán bệnh, KHÔNG cam kết khỏi 100%)
- Triệt lông: lông mọc theo chu kỳ, laser/IPL hiệu quả nhất khi lông ở giai đoạn phát triển nên cần nhiều buổi. Thường 6–10 buổi, mỗi buổi cách nhau ~3–4 tuần (mặt) đến ~4–6 tuần (chân/thân). Sau khi hết liệu trình, duy trì ~6–12 tháng/lần. → Nhắc khách đi ĐÚNG lịch để hiệu quả, lỡ buổi sẽ phải kéo dài.
- Chăm sóc da: da tái tạo theo chu kỳ ~28 ngày. Trị mụn/nám/peel cần liệu trình đều (giai đoạn đầu 1–2 lần/tuần, sau giãn dần) + chăm tại nhà + chống nắng. Hiệu quả tích lũy qua từng buổi.
- Massage/dưỡng sinh: hiệu quả thư giãn & tuần hoàn tốt nhất khi làm đều đặn (vd hằng tuần).
- Luôn nói lợi ích theo nhu cầu khách, dẫn chứng nhẹ nhàng (nhiều khách ở spa đã cải thiện), không phóng đại.

CROSS-SELL & NHẮC QUAY LẠI (tăng giá trị mỗi khách, làm khéo — không gượng ép)
- Khách đang theo liệu trình (còn buổi): ưu tiên MỜI ĐI ĐÚNG LỊCH buổi tiếp theo (hiệu quả + giữ chân), nhắc nhẹ số buổi còn lại trong hồ sơ.
- Khách triệt lông xong/đang triệt 1 vùng (vd nách): khen kết quả + gợi ý vùng liên quan (bikini, tay, chân, mặt) — "nhiều chị làm combo nhiều vùng vừa tiện vừa tiết kiệm hơn".
- Khách chăm sóc da cơ bản: sau khi da ổn, gợi ý nâng cấp gói cao cấp hơn (cấy collagen, Hifu/RF trẻ hóa, peel) đúng mục tiêu da của khách.
- Nếu đang có KHUYẾN MÃI phù hợp → dùng KM để tạo lý do chốt ngay ("đợt này bên em đang ưu đãi … chị tranh thủ nha").
- Chỉ gợi 1–2 lựa chọn mỗi lần, bám nhu cầu thật; không liệt kê tràn lan gây rối.`

let _playbookCache: { text: string; at: number } | null = null
async function getPlaybook(): Promise<string> {
  if (_playbookCache && Date.now() - _playbookCache.at < 5 * 60 * 1000) return _playbookCache.text
  let text = DEFAULT_PLAYBOOK
  try {
    const { data } = await supabase.from('marketing_ai_config').select('value').eq('key', 'sales_playbook').maybeSingle()
    if (data?.value && String(data.value).trim().length > 50) text = String(data.value)
  } catch { /* bảng chưa sẵn → dùng default */ }
  _playbookCache = { text, at: Date.now() }
  return text
}

// Gán chủ đề tư vấn theo từ khóa (rẻ, không tốn AI) — dùng cho mining + retrieval mẫu vàng.
function detectTopic(t: string): string {
  const s = (t || '').toLowerCase()
  if (/triệt|triet|lông|long nach|wax/.test(s)) return 'triet_long'
  if (/mụn|mun|nám|nam|da mặt|da mat|tàn nhang|peel|collagen|thâm|tham/.test(s)) return 'da_mat'
  if (/massage|cổ vai gáy|co vai gay|body|bấm huyệt|foot|chân|chan/.test(s)) return 'massage'
  if (/gội|goi|gàu|gau|dưỡng sinh|duong sinh/.test(s)) return 'goi'
  if (/tắm trắng|tam trang|trắng da|trang da/.test(s)) return 'tam_trang'
  if (/phun|xăm|xam|môi|moi|mày|may|chân mày/.test(s)) return 'phun_xam'
  if (/giá|gia|bao nhiêu|bao nhieu|nhiêu|combo|khuyến mãi|khuyen mai|km/.test(s)) return 'gia'
  if (/đặt|dat lich|lịch|lich hen|hẹn|hen|book|khung giờ|gio nao/.test(s)) return 'dat_lich'
  return 'khac'
}

// Lấy mẫu vàng (cách lễ tân thật trả lời tốt) cùng chủ đề → nạp few-shot vào prompt gợi ý.
async function getGoldExamples(topic: string, limit = 3): Promise<string> {
  try {
    let q = supabase.from('marketing_ai_examples')
      .select('khach_hoi, le_tan_tra_loi, chu_de, diem, da_duyet')
      .order('da_duyet', { ascending: false })
      .order('diem', { ascending: false })
      .limit(limit)
    if (topic && topic !== 'khac') q = q.eq('chu_de', topic)
    const { data } = await q
    if (!data || !data.length) return ''
    return data
      .map((e: any) => `Khách: ${String(e.khach_hoi).slice(0, 200)}\nLễ tân: ${String(e.le_tan_tra_loi).slice(0, 400)}`)
      .join('\n---\n')
  } catch { return '' }
}

// ── KHUYẾN MÃI ĐANG CHẠY ── đọc động từ bảng khuyen_mai (anh Nam nhập ở /admin/khuyen-mai) → AI báo đúng giá KM.
let _promoCache: { text: string; at: number } | null = null
async function getActivePromotions(): Promise<string> {
  if (_promoCache && Date.now() - _promoCache.at < 5 * 60 * 1000) return _promoCache.text
  let text = ''
  try {
    const today = new Date().toISOString().slice(0, 10)
    const { data } = await supabase.from('khuyen_mai')
      .select('ten, mo_ta, gia_goc, gia_km, ngay_ket_thuc, dich_vu:dich_vu_id(ten)')
      .eq('trang_thai', 'active')
      .gte('ngay_ket_thuc', today)
      .order('ngay_ket_thuc', { ascending: true })
      .limit(30)
    const fmt = (n: number) => new Intl.NumberFormat('vi-VN').format(n) + 'đ'
    const lines = (data || []).map((k: any) => {
      const dv = k.dich_vu?.ten ? ` [${k.dich_vu.ten}]` : ''
      const pct = k.gia_goc > 0 ? Math.round((k.gia_goc - k.gia_km) / k.gia_goc * 100) : 0
      return `- ${k.ten}${dv}: chỉ còn ${fmt(k.gia_km)} (giá gốc ${fmt(k.gia_goc)}, giảm ${pct}%) — đến hết ${k.ngay_ket_thuc}`
    })
    text = lines.join('\n')
  } catch { /* khuyen_mai chưa sẵn → bỏ qua */ }
  _promoCache = { text, at: Date.now() }
  return text
}

// Gộp block khuyến mãi để nạp vào prompt (báo đúng giá KM, cấm bịa chương trình).
function promoBlock(promos: string): string {
  return promos
    ? `KHUYẾN MÃI ĐANG CHẠY HÔM NAY (khi khách hỏi dịch vụ trùng tên, BÁO ĐÚNG giá KM này; KHÔNG bịa chương trình khác):\n${promos}`
    : 'HÔM NAY KHÔNG CÓ KHUYẾN MÃI ĐANG CHẠY — không tự bịa chương trình giảm giá; chỉ nêu khoảng giá tham khảo.'
}

function fallbackInboxAnalysis(noiDung: string) {
  const text = (noiDung || '').toLowerCase()
  const isBooking = text.includes('đặt') || text.includes('lich') || text.includes('lịch') || text.includes('hẹn')
  const isPrice = text.includes('giá') || text.includes('bao nhiêu') || text.includes('combo')
  const isMedical = text.includes('trị') || text.includes('mụn') || text.includes('nám') || text.includes('sẹo')
  const intent = isBooking ? 'dat_lich' : isPrice ? 'hoi_gia' : isMedical ? 'tu_van_da' : 'hoi_thong_tin'
  const safety = isMedical ? 'needs_review' : 'normal'
  const reply = isBooking
    ? 'Dạ Hannah Spa đã nhận được tin nhắn của mình. Chị cho em xin khung giờ mong muốn và số điện thoại để bên em giữ lịch tư vấn nhé.'
    : isPrice
      ? 'Dạ em gửi mình thông tin dịch vụ và chương trình phù hợp. Mình cho em biết tình trạng da hoặc nhu cầu chính để em tư vấn sát hơn nhé.'
      : 'Dạ Hannah Spa chào mình. Em có thể hỗ trợ mình về dịch vụ, bảng giá hoặc đặt lịch ạ.'
  return {
    intent,
    lead_status: isBooking ? 'dang_tu_van' : 'moi',
    lead_score: isBooking ? 70 : isPrice ? 55 : 35,
    safety_level: safety,
    suggested_reply: reply,
    next_best_action: isBooking ? 'Xin số điện thoại và chốt khung giờ đặt hẹn' : 'Hỏi nhu cầu chính và gợi ý dịch vụ phù hợp',
    requires_human: safety !== 'normal',
  }
}

function extractPhone(text: string) {
  const cleanText = String(text || '').replace(/https?:\/\/\S+/gi, ' ').replace(/\b(?:zalo|facebook|fb)\.me\/\S+/gi, ' ')
  const matches = cleanText.match(/(?:\+?84|0)(?:[\s.-]?\d){8,10}/g) || []
  for (const raw of matches) {
    const digits = raw.replace(/\D/g, '')
    const phone = digits.startsWith('84') && digits.length === 11 ? `0${digits.slice(2)}` : digits
    if (/^0\d{9}$/.test(phone)) return phone
  }
  return null
}

function extractCustomerPhone(text: string) {
  if (!text || isLikelyPagePromo(text)) return null
  const phone = extractPhone(text)
  if (!phone) return null
  const hannahPhones = new Set(['0379080909'])
  if (hannahPhones.has(phone)) return null
  return phone
}

function normalizeText(text: string) {
  return String(text || '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
}

function isLikelyPagePromo(text: string) {
  const t = normalizeText(text)
  return (
    (t.includes('lien he dat lich') && t.includes('hannah spa')) ||
    (t.includes('zalo oa') && t.includes('hotline hannah spa')) ||
    t.includes('5 dieu khien khach hang nho mai') ||
    t.includes('hannah spa cho khach hang co mot trai nghiem') ||
    t.includes('doi ngu chuyen vien giau kinh nghiem')
  )
}

function isLowSignalFanpageNoise(text: string) {
  const t = normalizeText(text).replace(/\s+/g, ' ').trim()
  return [
    '',
    '.',
    '@neu bat',
    'nguoi theo doi',
    'người theo dõi',
  ].includes(t)
}

function isPageOwnedSource(sourceId: unknown, pageIds: Set<string>) {
  return !!sourceId && pageIds.has(String(sourceId))
}

async function getConnectedPageIds() {
  const { data } = await supabase.from('marketing_connected_pages')
    .select('page_id')
    .eq('kenh', 'facebook')
  return new Set((data || []).map((page: any) => String(page.page_id)))
}

// ── Context Layer (GĐ1): nạp hồ sơ khách 360 cho AI ──────────────────────────
// Tra khách cũ theo SĐT (hoặc lấy SĐT từ segment theo platform_user_id), kèm thẻ còn buổi.
// Chỉ lấy dữ liệu tối thiểu cần để AI tư vấn; KHÔNG đẩy số tiền chi tiết/SĐT ra prompt ngoài cần thiết.
async function buildCustomerContext(phone?: string | null, platformUserId?: string | null) {
  // ── NỀN NHẬN DIỆN ──
  // Thứ tự ưu tiên tìm khach_hang_id:
  //   1) bản đồ nhận diện đã chốt (marketing_customer_identities theo platform_user_id) — bắt khách cũ inbox lại
  //   2) SĐT lấy trực tiếp từ tin
  //   3) SĐT suy ra từ segment theo platform_user_id
  let khachHangId: string | null = null
  let resolvedPhone = phone ? (extractPhone(phone) || phone) : null

  if (platformUserId) {
    const { data: ident } = await supabase.from('marketing_customer_identities')
      .select('khach_hang_id, phone_norm, confidence')
      .eq('platform_user_id', platformUserId)
      .not('khach_hang_id', 'is', null)
      .order('confidence', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (ident?.khach_hang_id) khachHangId = ident.khach_hang_id
    if (!resolvedPhone && ident?.phone_norm) resolvedPhone = ident.phone_norm
  }

  if (!resolvedPhone && !khachHangId && platformUserId) {
    const { data: seg } = await supabase.from('marketing_fanpage_customer_segments')
      .select('phone_norm')
      .eq('platform_user_id', platformUserId)
      .not('phone_norm', 'is', null)
      .limit(1)
      .maybeSingle()
    if (seg?.phone_norm) resolvedPhone = seg.phone_norm
  }

  // Đọc hồ sơ giàu từ view tổng hợp POS (thẻ đang có, dịch vụ đã dùng, mục tiêu tư vấn, gợi ý upsell).
  let intel: any = null
  if (khachHangId) {
    const { data } = await supabase.from('v_customer_pos_intelligence')
      .select('*').eq('khach_hang_id', khachHangId).limit(1).maybeSingle()
    intel = data
  }
  if (!intel && resolvedPhone) {
    const { data } = await supabase.from('v_customer_pos_intelligence')
      .select('*').eq('phone_norm', resolvedPhone).limit(1).maybeSingle()
    if (data) { intel = data; khachHangId = data.khach_hang_id }
  }

  if (!intel) return { is_returning: false }

  return {
    is_returning: true,
    khach_hang_id: intel.khach_hang_id,
    ho_ten: intel.ho_ten || null,
    so_dien_thoai: intel.so_dien_thoai || resolvedPhone || null,
    lan_cuoi_den: intel.lan_cuoi_den || null,
    so_don: Number(intel.so_don || 0),
    tong_chi_tieu: Number(intel.tong_chi_tieu || 0),
    da_chi_tieu: Number(intel.tong_chi_tieu || 0) > 0,
    so_the_active: Number(intel.so_the_active || 0),
    tong_buoi_con: Number(intel.tong_buoi_con || 0),
    the_dang_co: intel.the_dang_co || null,        // thẻ liệu trình còn buổi (text tổng hợp)
    dich_vu_da_dung: intel.dich_vu_da_dung || null, // thói quen — dịch vụ khách hay dùng
    dich_vu_gan_nhat: intel.dich_vu_gan_nhat || null,
    muc_tieu_tu_van: intel.muc_tieu_tu_van || null, // gợi ý nên tư vấn gì
    goi_y_upsell: intel.goi_y_upsell || null,
    ghi_chu_da_lieu: intel.ghi_chu_da_lieu || null,
  }
}

async function analyzeMarketingText(payload: Record<string, unknown>) {
  const noiDung = String(payload.noi_dung || '')
  const fallback = fallbackInboxAnalysis(noiDung)
  // GĐ2: nạp ngữ cảnh khách trước khi gọi AI → nhận định cũ/mới + tư vấn bám lịch sử thật.
  const phone = (payload.so_dien_thoai as string) || extractPhone(noiDung) || null
  const context = await buildCustomerContext(phone, (payload.platform_user_id as string) || null)
  const playbook = await getPlaybook()
  const promos = await getActivePromotions()
  const ai = await callAI(
    [
      'Bạn là lễ tân tư vấn của Hannah Beauty & Spa (Cần Thơ) — thân thiện, chuyên nghiệp, xưng "em", gọi khách "chị/anh".',
      '── HIẾN PHÁP TƯ VẤN (bám sát tuyệt đối) ──',
      playbook,
      '── HẾT HIẾN PHÁP ──',
      promoBlock(promos),
      'Nhiệm vụ: phân loại tin nhắn/bình luận Fanpage và soạn gợi ý trả lời cho lễ tân copy gửi khách.',
      'intent ∈ {dat_lich, hoi_gia, tu_van_da, hoi_the_lieu_trinh, khieu_nai, spam, remarketing, hoi_thong_tin}.',
      'lead_status ∈ {moi, dang_tu_van, da_dat_hen, da_den, da_mua, mat_co_hoi, spam}. safety_level ∈ {normal, needs_review, blocked}. lead_score 0-100.',
      'Dùng trường "khach_context": is_returning=true là KHÁCH CŨ — chào theo tên, nhắc ĐÚNG thẻ/số buổi còn lại có trong context, gợi ý dùng tiếp hoặc gia hạn; is_returning=false là khách mới — chào mời, xin SĐT/Zalo để tư vấn.',
      'suggested_reply (và goi_y_tu_van): viết NHƯ người thật, 2-4 câu tiếng Việt tự nhiên ấm áp, TRẢ LỜI ĐÚNG điều khách hỏi, kết bằng MỘT bước cụ thể (xin SĐT / mời chốt giờ / hẹn tư vấn). Khách hỏi giá thì hỏi rõ nhu cầu rồi mời để lại SĐT (giá tùy dịch vụ — KHÔNG tự bịa số tiền). TUYỆT ĐỐI không bịa số buổi/dịch vụ ngoài context, không hứa chữa khỏi bệnh, không tự ý giảm giá.',
      'Ví dụ — khách nhắn "triệt lông nách giá nhiêu": suggested_reply = "Dạ Hannah Spa chào chị ạ. Triệt lông nách bên em có nhiều gói tùy số buổi và tình trạng da. Chị cho em xin số điện thoại hoặc Zalo để em gửi bảng giá + ưu đãi phù hợp nhất nha. Mình đang muốn triệt thêm vùng nào nữa không ạ?"',
      'Ví dụ — khách cũ còn 2 buổi massage: "Dạ chào chị [tên], thẻ Massage của chị còn 2 buổi nè. Chị sắp xếp ghé dùng tiếp cho đều nha, em giữ lịch giúp mình. Chị muốn đến khung giờ nào ạ?"',
      'Ca y khoa / khiếu nại / hoàn tiền / dị ứng / bị bỏng → requires_human=true.',
      'CHỈ trả về JSON đúng các khóa: intent, lead_status, lead_score, safety_level, suggested_reply, next_best_action, requires_human, summary, khach_cu, goi_y_tu_van.',
    ].join('\n'),
    { ...payload, khach_context: context },
  )
  const parsed = ai.ok ? safeJSON(ai.text, fallback) : fallback
  // Đính kèm cờ khách cũ để các bước sau (UI/lead) dùng được kể cả khi AI quên trả.
  if (parsed && typeof parsed === 'object' && parsed.khach_cu == null) {
    parsed.khach_cu = !!context.is_returning
  }
  return parsed
}

async function findOrCreateLead(msg: IncomingMessage, analysis: Record<string, any>) {
  const kenh = msg.kenh || 'facebook'
  let lead: any = null

  if (msg.platform_user_id) {
    const { data } = await supabase.from('marketing_leads')
      .select('*')
      .eq('kenh', kenh)
      .eq('platform_user_id', msg.platform_user_id)
      .maybeSingle()
    lead = data
  }

  if (!lead && msg.so_dien_thoai) {
    const { data } = await supabase.from('marketing_leads')
      .select('*')
      .eq('so_dien_thoai', msg.so_dien_thoai)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    lead = data
  }

  // Lọc enum: AI (DeepSeek/khác) có thể trả lead_status tự do ('new_lead'...) → ép về giá trị DB hợp lệ.
  const VALID_LEAD_STATUS = new Set(['moi', 'dang_tu_van', 'da_dat_hen', 'da_den', 'da_mua', 'mat_co_hoi', 'spam'])
  const rawStatus = String(analysis.lead_status || '').trim()
  const trangThai = VALID_LEAD_STATUS.has(rawStatus) ? rawStatus : 'moi'
  // Ép điểm về số nguyên >= 0 (AI có thể trả chữ/null → NaN → vi phạm NOT NULL).
  const scoreNum = Number(analysis.lead_score)
  const diemTiemNang = Number.isFinite(scoreNum) ? Math.min(100, Math.max(0, Math.round(scoreNum))) : 0

  const payload = {
    kenh,
    chien_dich_id: msg.chien_dich_id || null,
    platform_user_id: msg.platform_user_id || null,
    ho_ten: msg.ho_ten || null,
    so_dien_thoai: msg.so_dien_thoai || extractPhone(String(msg.noi_dung || '')),
    nhu_cau: String(msg.noi_dung || '').slice(0, 500),
    trang_thai: trangThai,
    diem_tiem_nang: diemTiemNang,
    first_message_at: lead?.first_message_at || new Date().toISOString(),
    last_message_at: new Date().toISOString(),
    ngay_tao: lead?.ngay_tao || todayISO(),
    ai_intent: analysis.intent || null,
    ai_summary: analysis.summary || null,
    ai_next_best_action: analysis.next_best_action || null,
    metadata: { ...(lead?.metadata || {}), ...(msg.metadata || {}) },
  }

  if (lead) {
    const { data, error } = await supabase.from('marketing_leads')
      .update(payload)
      .eq('id', lead.id)
      .select('*')
      .single()
    if (error) throw error
    return data
  }

  const { data, error } = await supabase.from('marketing_leads')
    .insert(payload)
    .select('*')
    .single()
  if (error) throw error
  return data
}

async function handleInbox(payload: IncomingMessage) {
  if (!payload.noi_dung) return { error: 'thieu_noi_dung' }

  const ai = await callAI(
    [
      'Bạn là AI lễ tân Marketing cho Hannah Beauty & Spa tại Cần Thơ.',
      'Nhiệm vụ: phân loại tin nhắn, chấm điểm lead, soạn trả lời ngắn gọn bằng tiếng Việt.',
      'Không cam kết điều trị khỏi bệnh da liễu. Không tự giảm giá ngoài chương trình. Khi có rủi ro y khoa/khiếu nại/hoàn tiền thì requires_human=true.',
      'Chỉ trả về JSON: intent, lead_status, lead_score, safety_level, suggested_reply, next_best_action, requires_human, summary.',
    ].join('\n'),
    payload,
  )

  const analysis = ai.ok
    ? safeJSON(ai.text, fallbackInboxAnalysis(payload.noi_dung))
    : fallbackInboxAnalysis(payload.noi_dung)

  const lead = await findOrCreateLead(payload, analysis)

  const messagePayload = {
    lead_id: lead.id,
    kenh: payload.kenh || 'facebook',
    direction: payload.direction || 'inbound',
    platform_message_id: payload.platform_message_id || null,
    sender_type: 'customer',
    sender_name: payload.ho_ten || null,
    noi_dung: payload.noi_dung,
    attachments: payload.attachments || [],
    ai_intent: analysis.intent || null,
    ai_confidence: analysis.lead_score ? Number(analysis.lead_score) / 100 : null,
    ai_suggested_reply: analysis.suggested_reply || null,
    ai_safety_level: safeLevel(analysis.safety_level),
    trang_thai: 'received',
    metadata: payload.metadata || {},
    created_at: payload.created_at || new Date().toISOString(),
    conversation_id: payload.conversation_id || null,
    from_platform_user_id: payload.from_platform_user_id || null,
    recipient_id: payload.recipient_id || null,
  }

  let message: any = null
  if (payload.platform_message_id) {
    const { data: existing, error: findMessageError } = await supabase.from('marketing_messages')
      .select('*')
      .eq('kenh', payload.kenh || 'facebook')
      .eq('platform_message_id', payload.platform_message_id)
      .maybeSingle()
    if (findMessageError) throw findMessageError

    if (existing?.id) {
      const { data: updated, error: updateMessageError } = await supabase.from('marketing_messages')
        .update({
          lead_id: lead.id,
          ai_intent: analysis.intent || null,
          ai_confidence: analysis.lead_score ? Number(analysis.lead_score) / 100 : null,
          ai_suggested_reply: analysis.suggested_reply || null,
          ai_safety_level: safeLevel(analysis.safety_level),
        })
        .eq('id', existing.id)
        .select('*')
        .single()
      if (updateMessageError) throw updateMessageError
      message = updated
    }
  }

  if (!message) {
    const { data: inserted, error: insertMessageError } = await supabase.from('marketing_messages')
      .insert(messagePayload)
      .select('*')
      .single()
    if (insertMessageError) throw insertMessageError
    message = inserted
  }

  const requiresApproval = analysis.requires_human || analysis.safety_level !== 'normal'
  const action = await createReplyActionOnce({
    action_type: 'reply_message',
    title: requiresApproval ? 'Duyệt câu trả lời cho khách' : 'Gợi ý trả lời khách',
    recommendation: analysis.suggested_reply || '',
    ly_do: analysis.next_best_action || '',
    risk_level: requiresApproval ? 'medium' : 'low',
    requires_approval: requiresApproval,
    lead_id: lead.id,
    message_id: message.id,
    proposed_payload: {
      reply: analysis.suggested_reply,
      platform_user_id: payload.platform_user_id,
      kenh: payload.kenh || 'facebook',
    },
  })

  if (requiresApproval && action?.id) {
    await supabase.from('marketing_approval_queue').insert({
      ai_action_id: action.id,
      loai: 'message_reply',
      title: 'Duyệt trả lời khách',
      payload: { lead_id: lead.id, message_id: message.id, reply: analysis.suggested_reply },
    })
  }

  return { lead, message, action, ai_configured: ai.ok, analysis }
}

async function createReplyActionOnce(input: {
  action_type: string
  title: string
  lead_id?: string | null
  message_id?: string | null
  recommendation: string
  ly_do: string
  risk_level: 'low' | 'medium' | 'high'
  requires_approval: boolean
  proposed_payload: Record<string, unknown>
}) {
  let query = supabase.from('marketing_ai_actions')
    .select('id')
    .eq('action_type', input.action_type)
    .in('trang_thai', ['de_xuat', 'cho_duyet', 'dang_chay'])
    .limit(1)

  if (input.message_id) query = query.eq('message_id', input.message_id)
  else if (input.lead_id) query = query.eq('lead_id', input.lead_id)

  const { data: existing } = await query
  if (existing && existing.length > 0) return null

  const { data, error } = await supabase.from('marketing_ai_actions')
    .insert({
      action_type: input.action_type,
      scope: 'inbox',
      title: input.title,
      recommendation: input.recommendation,
      ly_do: input.ly_do,
      risk_level: input.risk_level,
      requires_approval: input.requires_approval,
      trang_thai: input.requires_approval ? 'cho_duyet' : 'de_xuat',
      lead_id: input.lead_id || null,
      message_id: input.message_id || null,
      proposed_payload: input.proposed_payload,
    })
    .select('*')
    .single()
  if (error) throw error
  return data
}

function optLimit(body: Record<string, unknown>, key: string, fallback: number, max: number) {
  const value = Number(body[key] || fallback)
  return Math.min(Math.max(Number.isFinite(value) ? value : fallback, 1), max)
}

async function handleFanpageTriage(body: Record<string, unknown> = {}) {
  const messageLimit = optLimit(body, 'message_limit', 25, 100)
  const commentLimit = optLimit(body, 'comment_limit', 25, 100)
  const pageIds = await getConnectedPageIds()

  const { data: messages, error: msgError } = await supabase.from('marketing_messages')
    .select('*')
    .eq('kenh', 'facebook')
    .eq('direction', 'inbound')
    .or('lead_id.is.null,ai_intent.is.null')
    .order('created_at', { ascending: false })
    .limit(messageLimit)
  if (msgError) throw msgError

  const { data: comments, error: commentError } = await supabase.from('marketing_page_comments')
    .select('*')
    .or('lead_id.is.null,ai_intent.is.null')
    .order('created_time', { ascending: false })
    .limit(commentLimit)
  if (commentError) throw commentError

  const processedMessages: any[] = []
  const ignoredMessages: any[] = []
  for (const message of messages || []) {
    const rawFrom = message.metadata?.raw_message?.from || {}
    const conversationId = message.conversation_id || message.metadata?.conversation_id || null
    const platformUserId = message.from_platform_user_id
      || rawFrom.id
      || message.metadata?.from_platform_user_id
      || message.platform_message_id
    if (
      isPageOwnedSource(platformUserId, pageIds) ||
      isPageOwnedSource(rawFrom.id, pageIds) ||
      message.sender_type === 'staff' ||
      isLikelyPagePromo(message.noi_dung || '') ||
      isLowSignalFanpageNoise(message.noi_dung || '')
    ) {
      const { data: ignored, error: ignoreError } = await supabase.from('marketing_messages')
        .update({
          ai_intent: 'page_owned_content',
          ai_confidence: 1,
          ai_safety_level: 'blocked',
          metadata: {
            ...(message.metadata || {}),
            ignored_by_triage: {
              reason: 'page_owned_or_promo_content',
              processed_at: new Date().toISOString(),
            },
          },
        })
        .eq('id', message.id)
        .select('id,ai_intent')
        .single()
      if (ignoreError) throw ignoreError
      ignoredMessages.push(ignored)
      continue
    }

    const analysis = await analyzeMarketingText({
      type: 'inbox',
      noi_dung: message.noi_dung,
      sender_name: message.sender_name,
      so_dien_thoai: extractPhone(message.noi_dung || '') || undefined,
      platform_user_id: String(platformUserId || ''),
      created_at: message.created_at,
      metadata: message.metadata || {},
    })
    const lead = await findOrCreateLead({
      kenh: 'facebook',
      platform_user_id: String(platformUserId || conversationId || ''),
      platform_message_id: message.platform_message_id || undefined,
      ho_ten: message.sender_name || rawFrom.name || undefined,
      so_dien_thoai: extractPhone(message.noi_dung || '') || undefined,
      noi_dung: message.noi_dung || '',
      metadata: {
        ...(message.metadata || {}),
        source: 'fanpage_inbox_triage',
        message_id: message.id,
        conversation_id: conversationId,
      },
    }, analysis)

    const { data: updated, error: updateError } = await supabase.from('marketing_messages')
      .update({
        lead_id: lead.id,
        ai_intent: analysis.intent || null,
        ai_confidence: analysis.lead_score ? Number(analysis.lead_score) / 100 : null,
        ai_suggested_reply: analysis.suggested_reply || null,
        ai_safety_level: safeLevel(analysis.safety_level),
        metadata: {
          ...(message.metadata || {}),
          ai_triage: {
            processed_at: new Date().toISOString(),
            analysis,
          },
        },
      })
      .eq('id', message.id)
      .select('id,lead_id,ai_intent,ai_suggested_reply')
      .single()
    if (updateError) throw updateError

    const needsAction = Number(analysis.lead_score || 0) >= 55 || analysis.requires_human
    if (needsAction && analysis.suggested_reply) {
      await createReplyActionOnce({
        action_type: 'reply_message',
        title: analysis.requires_human ? 'Duyet tra loi inbox Fanpage' : 'Goi y tra loi inbox Fanpage',
        lead_id: lead.id,
        message_id: message.id,
        recommendation: analysis.suggested_reply,
        ly_do: analysis.next_best_action || 'AI phan loai lead tu inbox Fanpage.',
        risk_level: analysis.requires_human ? 'medium' : 'low',
        requires_approval: true,
        proposed_payload: {
          reply: analysis.suggested_reply,
          source: 'fanpage_inbox',
          platform_message_id: message.platform_message_id,
          conversation_id: conversationId,
        },
      })
    }

    processedMessages.push(updated)
  }

  const processedComments: any[] = []
  const ignoredComments: any[] = []
  for (const comment of comments || []) {
    if (
      isPageOwnedSource(comment.from_id, pageIds) ||
      isPageOwnedSource(comment.raw?.from?.id, pageIds) ||
      isLikelyPagePromo(comment.message || '') ||
      isLowSignalFanpageNoise(comment.message || '')
    ) {
      const { data: ignored, error: ignoreError } = await supabase.from('marketing_page_comments')
        .update({
          ai_intent: 'page_owned_content',
          sentiment: 'spam',
          raw: {
            ...(comment.raw || {}),
            ignored_by_triage: {
              reason: 'page_owned_or_promo_content',
              processed_at: new Date().toISOString(),
            },
          },
        })
        .eq('id', comment.id)
        .select('id,ai_intent')
        .single()
      if (ignoreError) throw ignoreError
      ignoredComments.push(ignored)
      continue
    }

    const analysis = await analyzeMarketingText({
      type: 'comment',
      noi_dung: comment.message,
      sender_name: comment.from_name,
      created_at: comment.created_time,
      metadata: comment.raw || {},
    })
    const lead = await findOrCreateLead({
      kenh: 'facebook',
      platform_user_id: comment.from_id || comment.platform_comment_id,
      platform_message_id: comment.platform_comment_id,
      ho_ten: comment.from_name || undefined,
      so_dien_thoai: extractPhone(comment.message || '') || undefined,
      noi_dung: comment.message || '',
      metadata: {
        source: 'fanpage_comment_triage',
        comment_id: comment.id,
        platform_comment_id: comment.platform_comment_id,
        platform_post_id: comment.platform_post_id,
        raw_comment: comment.raw || {},
      },
    }, analysis)

    const { data: updated, error: updateError } = await supabase.from('marketing_page_comments')
      .update({
        lead_id: lead.id,
        ai_intent: analysis.intent || null,
        ai_suggested_reply: analysis.suggested_reply || null,
        sentiment: analysis.safety_level || 'normal',
        raw: {
          ...(comment.raw || {}),
          ai_triage: {
            processed_at: new Date().toISOString(),
            analysis,
          },
        },
      })
      .eq('id', comment.id)
      .select('id,lead_id,ai_intent,ai_suggested_reply')
      .single()
    if (updateError) throw updateError

    const needsAction = Number(analysis.lead_score || 0) >= 55 || analysis.requires_human
    if (needsAction && analysis.suggested_reply) {
      await createReplyActionOnce({
        action_type: 'reply_comment',
        title: analysis.requires_human ? 'Duyet tra loi comment Fanpage' : 'Goi y tra loi comment Fanpage',
        lead_id: lead.id,
        recommendation: analysis.suggested_reply,
        ly_do: analysis.next_best_action || 'AI phan loai lead tu comment Fanpage.',
        risk_level: analysis.requires_human ? 'medium' : 'low',
        requires_approval: true,
        proposed_payload: {
          reply: analysis.suggested_reply,
          source: 'fanpage_comment',
          comment_id: comment.id,
          platform_comment_id: comment.platform_comment_id,
          platform_post_id: comment.platform_post_id,
        },
      })
    }

    processedComments.push(updated)
  }

  await logRun('triage_fanpage', 'success', body, {
    messages: processedMessages.length,
    comments: processedComments.length,
    ignored_messages: ignoredMessages.length,
    ignored_comments: ignoredComments.length,
    message_limit: messageLimit,
    comment_limit: commentLimit,
  })

  return {
    messages: processedMessages.length,
    comments: processedComments.length,
    ignored_messages: ignoredMessages.length,
    ignored_comments: ignoredComments.length,
    message_limit: messageLimit,
    comment_limit: commentLimit,
  }
}

async function handleFanpageLeadCleanup(body: Record<string, unknown> = {}) {
  const limit = optLimit(body, 'limit', 500, 2000)
  const pageIds = await getConnectedPageIds()
  const now = new Date().toISOString()

  const { data: leads, error: leadError } = await supabase.from('marketing_leads')
    .select('id,platform_user_id,ho_ten,so_dien_thoai,khach_hang_id,nhu_cau,metadata,trang_thai')
    .eq('kenh', 'facebook')
    .is('khach_hang_id', null)
    .limit(limit)
  if (leadError) throw leadError

  const fakeLeads = (leads || []).filter((lead: any) => {
    if (isLikelyPagePromo(lead.nhu_cau || '')) return true
    if (lead.so_dien_thoai) return false
    if (isPageOwnedSource(lead.platform_user_id, pageIds)) return true
    return isLowSignalFanpageNoise(lead.nhu_cau || '')
  })

  let leadsMarked = 0
  for (const lead of fakeLeads) {
    const { error } = await supabase.from('marketing_leads')
      .update({
        trang_thai: 'spam',
        diem_tiem_nang: 0,
        ai_intent: 'page_owned_content',
        ai_next_best_action: 'Bo qua - noi dung cua fanpage, khong phai khach hang.',
        metadata: {
          ...(lead.metadata || {}),
          cleanup: {
            reason: 'page_owned_or_promo_content',
            processed_at: now,
          },
        },
      })
      .eq('id', lead.id)
    if (error) throw error
    leadsMarked += 1
  }

  const { data: comments, error: commentError } = await supabase.from('marketing_page_comments')
    .select('id,from_id,page_id,message,raw')
    .or('ai_intent.is.null,ai_intent.neq.page_owned_content')
    .limit(limit)
  if (commentError) throw commentError

  let commentsIgnored = 0
  for (const comment of comments || []) {
    if (
      !isPageOwnedSource(comment.from_id, pageIds) &&
      !isPageOwnedSource(comment.raw?.from?.id, pageIds) &&
      !isLikelyPagePromo(comment.message || '') &&
      !isLowSignalFanpageNoise(comment.message || '')
    ) continue

    const { error } = await supabase.from('marketing_page_comments')
      .update({
        ai_intent: 'page_owned_content',
        sentiment: 'spam',
        raw: {
          ...(comment.raw || {}),
          cleanup: {
            reason: 'page_owned_or_promo_content',
            processed_at: now,
          },
        },
      })
      .eq('id', comment.id)
    if (error) throw error
    commentsIgnored += 1
  }

  const result = {
    scanned_leads: (leads || []).length,
    leads_marked_spam: leadsMarked,
    comments_ignored: commentsIgnored,
    limit,
  }
  await logRun('cleanup_fanpage_leads', 'success', body, result)
  return result
}

async function findOrCreateCustomerByPhone(phone: string, name: string | null) {
  const hoTen = String(name || '').trim() || `Khach Facebook ${phone.slice(-4)}`
  const { data: existing, error: findError } = await supabase.from('khach_hang')
    .select('id,ho_ten,so_dien_thoai')
    .eq('so_dien_thoai', phone)
    .maybeSingle()
  if (findError) throw findError
  if (existing?.id) return { id: existing.id, created: false }

  const { data, error } = await supabase.from('khach_hang')
    .insert({
      ho_ten: hoTen,
      so_dien_thoai: phone,
      nguon: 'Facebook',
      is_active: true,
      ghi_chu_da_lieu: 'Tao tu dong tu hoi thoai Fanpage co so dien thoai.',
    })
    .select('id')
    .single()
  if (error) throw error
  return { id: data.id, created: true }
}

async function fetchFanpageMessagesSince(sinceDate: string, limit: number) {
  const rows: any[] = []
  const pageSize = 1000
  for (let offset = 0; offset < limit; offset += pageSize) {
    const from = offset
    const to = Math.min(offset + pageSize - 1, limit - 1)
    let query = supabase.from('marketing_messages')
      .select('id,lead_id,kenh,direction,sender_type,sender_name,noi_dung,platform_message_id,metadata,created_at')
      .eq('kenh', 'facebook')
      .order('created_at', { ascending: false })
      .range(from, to)

    if (sinceDate) query = query.gte('created_at', sinceDate)
    const { data, error } = await query
    if (error) throw error
    rows.push(...(data || []))
    if (!data || data.length < pageSize) break
  }
  return rows
}

function hasFanpageBuyingSignal(text: string) {
  const t = normalizeText(text)
  return [
    'dat lich',
    'hen lich',
    'book',
    'gia',
    'bang gia',
    'menu',
    'massage',
    'goi dau',
    'triet',
    'mun',
    'nam',
    'tu van',
    'combo',
    'lieu trinh',
    'dia chi',
    'con trong',
  ].some(key => t.includes(key))
}

async function findExistingLeadForConversation(entry: any) {
  const leadIds = Array.from(entry.lead_ids || [])
  if (leadIds.length > 0) {
    const { data } = await supabase.from('marketing_leads')
      .select('*')
      .eq('id', leadIds[0])
      .maybeSingle()
    if (data) return data
  }

  if (entry.platform_user_id) {
    const { data } = await supabase.from('marketing_leads')
      .select('*')
      .eq('kenh', 'facebook')
      .eq('platform_user_id', entry.platform_user_id)
      .maybeSingle()
    if (data) return data
  }

  if (entry.phone) {
    const { data } = await supabase.from('marketing_leads')
      .select('*')
      .eq('kenh', 'facebook')
      .eq('so_dien_thoai', entry.phone)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (data) return data
  }

  return null
}

async function handleFanpageAudienceStats(body: Record<string, unknown> = {}) {
  const sinceDate = String(body.since_date || '2025-11-25')
  const limit = optLimit(body, 'limit', 30000, 50000)
  const pageIds = await getConnectedPageIds()
  const messages = await fetchFanpageMessagesSince(sinceDate, limit)

  const conversations = new Map<string, any>()
  let inboundMessages = 0
  let outboundMessages = 0
  let internalSyncRows = 0
  let ignoredPageOwned = 0

  for (const message of messages || []) {
    if (message.direction === 'outbound') outboundMessages += 1
    if (message.direction === 'internal') internalSyncRows += 1
    if (message.direction !== 'inbound' || message.sender_type !== 'customer') continue
    inboundMessages += 1

    const rawFrom = message.metadata?.raw_message?.from || {}
    if (isPageOwnedSource(rawFrom.id, pageIds) || isLikelyPagePromo(message.noi_dung || '')) {
      ignoredPageOwned += 1
      continue
    }

    const conversationId = String(message.metadata?.conversation_id || rawFrom.id || message.platform_message_id || message.id)
    if (!conversations.has(conversationId)) {
      conversations.set(conversationId, {
        conversation_id: conversationId,
        phone: null,
        texts: [],
      })
    }

    const entry = conversations.get(conversationId)
    if (message.noi_dung) entry.texts.push(String(message.noi_dung))
    if (!entry.phone) entry.phone = extractCustomerPhone(message.noi_dung || '')
  }

  let withPhone = 0
  let withBuyingSignal = 0
  let previousInboxOnly = 0
  for (const entry of conversations.values()) {
    const text = entry.texts.join('\n').slice(0, 3000)
    const hasSignal = hasFanpageBuyingSignal(text)
    if (entry.phone) withPhone += 1
    if (hasSignal) withBuyingSignal += 1
    if (!entry.phone && !hasSignal) previousInboxOnly += 1
  }

  return {
    since_date: sinceDate,
    scanned_messages: messages.length,
    inbound_messages: inboundMessages,
    outbound_messages: outboundMessages,
    internal_sync_rows: internalSyncRows,
    ignored_page_owned: ignoredPageOwned,
    all_inbox_conversations: conversations.size,
    conversations_with_phone: withPhone,
    conversations_with_buying_signal: withBuyingSignal,
    previous_inbox_only: previousInboxOnly,
    limit,
  }
}

async function handleFanpageAudienceSync(body: Record<string, unknown> = {}) {
  const sinceDate = String(body.since_date || '2025-11-25')
  const limit = optLimit(body, 'limit', 5000, 20000)
  const createLeads = body.create_leads !== false
  const createCustomers = body.create_customers === true
  const pageIds = await getConnectedPageIds()
  const now = new Date().toISOString()
  const messages = await fetchFanpageMessagesSince(sinceDate, limit)

  const conversations = new Map<string, any>()
  let inboundMessages = 0
  let outboundMessages = 0
  let ignoredPageOwned = 0

  for (const message of messages || []) {
    if (message.direction === 'outbound') outboundMessages += 1
    if (message.direction !== 'inbound' || message.sender_type !== 'customer') continue
    inboundMessages += 1

    const rawFrom = message.metadata?.raw_message?.from || {}
    if (isPageOwnedSource(rawFrom.id, pageIds) || isLikelyPagePromo(message.noi_dung || '')) {
      ignoredPageOwned += 1
      continue
    }

    const conversationId = String(message.metadata?.conversation_id || rawFrom.id || message.platform_message_id || message.id)
    if (!conversations.has(conversationId)) {
      conversations.set(conversationId, {
        conversation_id: conversationId,
        platform_user_id: rawFrom.id || null,
        sender_name: message.sender_name || rawFrom.name || null,
        phone: null,
        lead_ids: new Set<string>(),
        message_ids: [],
        texts: [],
        first_at: message.created_at || now,
        last_at: message.created_at || now,
      })
    }

    const entry = conversations.get(conversationId)
    entry.message_ids.push(message.id)
    if (message.lead_id) entry.lead_ids.add(String(message.lead_id))
    if (!entry.sender_name && (message.sender_name || rawFrom.name)) entry.sender_name = message.sender_name || rawFrom.name
    if (!entry.platform_user_id && rawFrom.id) entry.platform_user_id = rawFrom.id
    if (message.noi_dung) entry.texts.push(String(message.noi_dung))
    if (!entry.phone) entry.phone = extractCustomerPhone(message.noi_dung || '')
    if (message.created_at && message.created_at < entry.first_at) entry.first_at = message.created_at
    if (message.created_at && message.created_at > entry.last_at) entry.last_at = message.created_at
  }

  let withPhone = 0
  let withBuyingSignal = 0
  let leadsCreated = 0
  let leadsUpdated = 0
  let customersCreated = 0
  let customersLinked = 0

  for (const entry of conversations.values()) {
    const text = entry.texts.join('\n').slice(0, 1600)
    const hasSignal = hasFanpageBuyingSignal(text)
    if (entry.phone) withPhone += 1
    if (hasSignal) withBuyingSignal += 1
    if (!createLeads) continue

    let customerId: string | null = null
    if (createCustomers && entry.phone) {
      const customer = await findOrCreateCustomerByPhone(entry.phone, entry.sender_name)
      customerId = customer.id
      if (customer.created) customersCreated += 1
    }

    const fallback = fallbackInboxAnalysis(text)
    const analysis = {
      ...fallback,
      lead_status: entry.phone || hasSignal ? fallback.lead_status : 'moi',
      lead_score: entry.phone ? Math.max(Number(fallback.lead_score || 0), 65) : hasSignal ? Math.max(Number(fallback.lead_score || 0), 45) : 20,
      intent: hasSignal ? fallback.intent : 'nguoi_tung_inbox',
      next_best_action: entry.phone
        ? 'Goi lai/xac nhan nhu cau va chot lich neu phu hop.'
        : hasSignal
          ? 'Nhan tin cham lai, xin SDT neu khach co nhu cau dat lich.'
          : 'Luu vao tep nguoi tung inbox Fanpage, chua can uu tien.',
    }

    const existing = await findExistingLeadForConversation(entry)
    const payload = {
      kenh: 'facebook' as MarketingChannel,
      platform_user_id: String(entry.platform_user_id || entry.conversation_id),
      ho_ten: entry.sender_name || undefined,
      so_dien_thoai: entry.phone || undefined,
      noi_dung: text || 'Nguoi tung inbox Fanpage',
      metadata: {
        source: 'fanpage_all_inbox_audience',
        conversation_id: entry.conversation_id,
        message_count: entry.message_ids.length,
        first_message_at: entry.first_at,
        last_message_at: entry.last_at,
        audience_bucket: entry.phone ? 'co_sdt' : hasSignal ? 'co_tin_hieu_quan_tam' : 'nguoi_tung_inbox',
        synced_at: now,
      },
    }

    const lead = existing || await findOrCreateLead(payload, analysis)
    if (existing) {
      const nextScore = Math.max(Number(existing.diem_tiem_nang || 0), Number(analysis.lead_score || 0))
      const { error: updateError } = await supabase.from('marketing_leads')
        .update({
          ho_ten: existing.ho_ten || entry.sender_name || null,
          so_dien_thoai: existing.so_dien_thoai || entry.phone || null,
          khach_hang_id: existing.khach_hang_id || customerId,
          nhu_cau: existing.nhu_cau || text.slice(0, 500) || 'Nguoi tung inbox Fanpage',
          trang_thai: existing.trang_thai || 'moi',
          diem_tiem_nang: nextScore,
          ai_intent: existing.ai_intent || analysis.intent,
          ai_next_best_action: existing.ai_next_best_action || analysis.next_best_action,
          first_message_at: existing.first_message_at || entry.first_at,
          last_message_at: entry.last_at || existing.last_message_at || now,
          metadata: {
            ...(existing.metadata || {}),
            ...(payload.metadata || {}),
          },
        })
        .eq('id', existing.id)
      if (updateError) throw updateError
      leadsUpdated += 1
      if (!existing.khach_hang_id && customerId) customersLinked += 1
    } else {
      leadsCreated += 1
      if (customerId) {
        await supabase.from('marketing_leads').update({ khach_hang_id: customerId }).eq('id', lead.id)
        customersLinked += 1
      }
    }

    const targetLeadId = existing?.id || lead.id
    if (targetLeadId && entry.message_ids.length > 0) {
      await supabase.from('marketing_messages')
        .update({ lead_id: targetLeadId })
        .in('id', entry.message_ids)
        .is('lead_id', null)
    }
  }

  const result = {
    since_date: sinceDate,
    scanned_messages: messages.length,
    inbound_messages: inboundMessages,
    outbound_messages: outboundMessages,
    ignored_page_owned: ignoredPageOwned,
    all_inbox_conversations: conversations.size,
    conversations_with_phone: withPhone,
    conversations_with_buying_signal: withBuyingSignal,
    leads_created: leadsCreated,
    leads_updated: leadsUpdated,
    customers_created: customersCreated,
    customers_linked: customersLinked,
    create_leads: createLeads,
    create_customers: createCustomers,
    limit,
  }
  await logRun('sync_fanpage_audience', 'success', body, result)
  return result
}

async function handleResolveConversationPhones(body: Record<string, unknown> = {}) {
  const limit = optLimit(body, 'limit', 3000, 10000)
  const createCustomers = body.create_customers !== false
  const pageIds = await getConnectedPageIds()
  const now = new Date().toISOString()

  const { data: messages, error } = await supabase.from('marketing_messages')
    .select('id,lead_id,kenh,direction,sender_type,sender_name,noi_dung,platform_message_id,metadata,created_at')
    .eq('kenh', 'facebook')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error

  const conversations = new Map<string, any>()
  for (const message of messages || []) {
    const rawFrom = message.metadata?.raw_message?.from || {}
    if (
      message.direction !== 'inbound' ||
      message.sender_type !== 'customer' ||
      isPageOwnedSource(rawFrom.id, pageIds) ||
      isLikelyPagePromo(message.noi_dung || '') ||
      isLowSignalFanpageNoise(message.noi_dung || '')
    ) continue

    const conversationId = String(message.metadata?.conversation_id || rawFrom.id || message.platform_message_id || message.id)
    if (!conversations.has(conversationId)) {
      conversations.set(conversationId, {
        conversation_id: conversationId,
        platform_user_id: rawFrom.id || null,
        sender_name: message.sender_name || rawFrom.name || null,
        phone: null,
        lead_ids: new Set<string>(),
        message_ids: [],
        texts: [],
        newest_at: message.created_at || now,
      })
    }

    const entry = conversations.get(conversationId)
    entry.message_ids.push(message.id)
    if (message.lead_id) entry.lead_ids.add(String(message.lead_id))
    if (!entry.sender_name && (message.sender_name || rawFrom.name)) entry.sender_name = message.sender_name || rawFrom.name
    if (!entry.platform_user_id && rawFrom.id) entry.platform_user_id = rawFrom.id
    if (message.noi_dung) entry.texts.push(String(message.noi_dung))
    if (!entry.phone) entry.phone = extractCustomerPhone(message.noi_dung || '')
  }

  let conversationsWithPhone = 0
  let leadsCreated = 0
  let leadsUpdated = 0
  let messagesLinked = 0
  let customersCreated = 0
  let customersLinked = 0

  for (const entry of conversations.values()) {
    if (!entry.phone) continue
    conversationsWithPhone += 1

    let customerId: string | null = null
    if (createCustomers) {
      const customer = await findOrCreateCustomerByPhone(entry.phone, entry.sender_name)
      customerId = customer.id
      if (customer.created) customersCreated += 1
    }

    const text = entry.texts.join('\n').slice(0, 1200)
    const analysis = fallbackInboxAnalysis(text)
    let leadIds = Array.from(entry.lead_ids)

    if (leadIds.length === 0) {
      const lead = await findOrCreateLead({
        kenh: 'facebook',
        platform_user_id: String(entry.platform_user_id || entry.conversation_id),
        ho_ten: entry.sender_name || undefined,
        so_dien_thoai: entry.phone,
        noi_dung: text,
        metadata: {
          source: 'fanpage_conversation_phone_scan',
          conversation_id: entry.conversation_id,
          phone_resolved_at: now,
        },
      }, {
        ...analysis,
        lead_score: Math.max(Number(analysis.lead_score || 0), 65),
      })
      leadIds = [lead.id]
      leadsCreated += 1
    }

    const { data: leadRows, error: leadError } = await supabase.from('marketing_leads')
      .select('id,ho_ten,so_dien_thoai,khach_hang_id,nhu_cau,trang_thai,diem_tiem_nang,ai_intent,ai_next_best_action,metadata')
      .in('id', leadIds)
      .eq('kenh', 'facebook')
      .neq('trang_thai', 'spam')
    if (leadError) throw leadError

    for (const lead of leadRows || []) {
      const nextScore = Math.max(Number(lead.diem_tiem_nang || 0), Number(analysis.lead_score || 0), 65)
      const { error: updateError } = await supabase.from('marketing_leads')
        .update({
          ho_ten: lead.ho_ten || entry.sender_name || null,
          so_dien_thoai: lead.so_dien_thoai || entry.phone,
          khach_hang_id: lead.khach_hang_id || customerId,
          nhu_cau: lead.nhu_cau || text.slice(0, 500),
          trang_thai: lead.trang_thai === 'moi' ? (analysis.lead_status || 'dang_tu_van') : lead.trang_thai,
          diem_tiem_nang: nextScore,
          ai_intent: lead.ai_intent || analysis.intent || null,
          ai_next_best_action: lead.ai_next_best_action || analysis.next_best_action || 'Goi lai va chot lich hen cho khach co so dien thoai.',
          last_message_at: entry.newest_at || now,
          metadata: {
            ...(lead.metadata || {}),
            conversation_phone_scan: {
              conversation_id: entry.conversation_id,
              platform_user_id: entry.platform_user_id,
              phone: entry.phone,
              resolved_at: now,
              message_count: entry.message_ids.length,
            },
          },
        })
        .eq('id', lead.id)
      if (updateError) throw updateError
      leadsUpdated += 1
      if (!lead.khach_hang_id && customerId) customersLinked += 1
    }

    if (leadIds[0] && entry.message_ids.length > 0) {
      const { data: linked, error: msgError } = await supabase.from('marketing_messages')
        .update({ lead_id: leadIds[0] })
        .in('id', entry.message_ids)
        .is('lead_id', null)
        .select('id')
      if (msgError) throw msgError
      messagesLinked += linked?.length || 0
    }
  }

  const identityResult = await handleResolveIdentities()
  const result = {
    scanned_messages: (messages || []).length,
    scanned_conversations: conversations.size,
    conversations_with_phone: conversationsWithPhone,
    leads_created: leadsCreated,
    leads_updated: leadsUpdated,
    customers_created: customersCreated,
    customers_linked: customersLinked,
    messages_linked: messagesLinked,
    identities: identityResult,
    limit,
  }
  await logRun('resolve_conversation_phones', 'success', body, result)
  return result
}

async function handleAttributionBridge(body: Record<string, unknown> = {}) {
  const daysAfter = Number(body.days_after || 90)
  try {
    await supabase.rpc('marketing_resolve_customer_identities')
  } catch {
    // Attribution can still run with existing identities.
  }
  const { data, error } = await supabase.rpc('marketing_run_attribution_bridge', {
    p_days_after: Number.isFinite(daysAfter) ? daysAfter : 90,
  })
  if (error) throw error
  await logRun('attribution_bridge', 'success', body, data || {})
  return data || {}
}

async function handleResolveIdentities() {
  const { data, error } = await supabase.rpc('marketing_resolve_customer_identities')
  if (error) throw error
  await logRun('resolve_identities', 'success', {}, data || {})
  return data || {}
}

async function handleClassifyFanpageCustomers(body: Record<string, unknown> = {}) {
  const sinceDate = String(body.since_date || '2022-11-26')
  const { data, error } = await supabase.rpc('refresh_marketing_fanpage_customer_segments', {
    p_since: sinceDate,
  })
  if (error) throw error
  await logRun('classify_fanpage_customers', 'success', body, data || {})
  return data || {}
}

async function handleAnalyze() {
  const { data: performance, error } = await supabase
    .from('v_marketing_campaign_performance')
    .select('*')
  if (error) throw error

  const campaigns = performance || []
  const generated: any[] = []

  for (const c of campaigns) {
    const chi = Number(c.chi_phi_thuc_te || 0)
    const leads = Number(c.leads || 0)
    const revenue = Number(c.revenue || 0)
    const roi = c.roi == null ? null : Number(c.roi)
    const impressions = Number(c.impressions || 0)
    const clicks = Number(c.clicks || 0)
    const appointments = Number(c.appointments || 0)
    const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0
    const cpl = leads > 0 ? chi / leads : null

    let title = ''
    let recommendation = ''
    let risk: 'low' | 'medium' | 'high' = 'low'
    let actionType = 'observe_campaign'

    if (chi > 0 && leads === 0) {
      title = `Cần kiểm tra chiến dịch ${c.ten}`
      recommendation = `Chi ${money(chi)} nhưng chưa ghi nhận lead. Kiểm tra tracking, nội dung quảng cáo hoặc form/inbox.`
      risk = 'medium'
      actionType = 'review_tracking'
    } else if (roi !== null && roi < -30) {
      title = `Đề xuất giảm ngân sách ${c.ten}`
      recommendation = `ROI đang ${roi}%. Nên giảm/tạm dừng nhóm quảng cáo yếu và kiểm tra nội dung.`
      risk = 'high'
      actionType = 'reduce_budget'
    } else if (roi !== null && roi > 80 && leads >= 3) {
      title = `Đề xuất tăng ngân sách ${c.ten}`
      recommendation = `ROI đang ${roi}% với ${leads} lead và doanh thu ${money(revenue)}. Có thể tăng ngân sách trong giới hạn rule.`
      risk = 'medium'
      actionType = 'increase_budget'
    } else if (impressions >= 1000 && ctr < 0.8) {
      title = `Chat luong mau quang cao thap: ${c.ten}`
      recommendation = `CTR chi khoang ${ctr.toFixed(2)}%. Nen doi hinh anh, mo dau caption hoac nhom doi tuong truoc khi tang ngan sach.`
      risk = 'low'
      actionType = 'improve_creative'
    } else if (cpl !== null && cpl > 120000) {
      title = `Chi phi lead cao: ${c.ten}`
      recommendation = `Chi phi trung binh moi lead dang khoang ${money(Math.round(cpl))}. Nen tach nhom quang cao va uu tien noi dung co ty le inbox cao hon.`
      risk = 'medium'
      actionType = 'review_cpl'
    } else if (leads >= 3 && appointments / Math.max(leads, 1) < 0.25) {
      title = `Lead chua chuyen thanh lich hen: ${c.ten}`
      recommendation = `${leads} lead nhung moi co ${appointments} lich hen. Can uu tien kich ban cham soc va goi lai trong 24 gio.`
      risk = 'low'
      actionType = 'improve_followup'
    } else if (leads > 0 && Number(c.appointments || 0) === 0) {
      title = `Cần chốt lịch cho lead từ ${c.ten}`
      recommendation = `${leads} lead nhưng chưa có lịch hẹn. Nên ưu tiên gọi/chốt lịch trong ngày.`
      risk = 'low'
      actionType = 'follow_up_leads'
    }

    if (!title) continue

    const { data: existing } = await supabase.from('marketing_ai_actions')
      .select('id')
      .eq('chien_dich_id', c.id)
      .eq('action_type', actionType)
      .in('trang_thai', ['de_xuat', 'cho_duyet', 'dang_chay'])
      .limit(1)

    if (existing && existing.length > 0) continue

    const { data: action, error: actionError } = await supabase.from('marketing_ai_actions')
      .insert({
        action_type: actionType,
        scope: 'ads',
        title,
        recommendation,
        ly_do: `Tự động phân tích funnel: chi=${chi}, leads=${leads}, revenue=${revenue}, roi=${roi}`,
        risk_level: risk,
        requires_approval: risk !== 'low',
        trang_thai: risk === 'low' ? 'de_xuat' : 'cho_duyet',
        chien_dich_id: c.id,
        cost_impact: actionType === 'increase_budget' ? Math.round(chi * 0.2) : 0,
        proposed_payload: { campaign: c, action_type: actionType },
      })
      .select('*')
      .single()
    if (actionError) throw actionError
    generated.push(action)

    if (risk !== 'low') {
      await supabase.from('marketing_approval_queue').insert({
        ai_action_id: action.id,
        loai: actionType === 'increase_budget' || actionType === 'reduce_budget' ? 'budget_change' : 'ai_action',
        title,
        payload: { recommendation, campaign: c },
      })
    }
  }

  const [{ data: pagePosts }, { data: pageComments }, { data: inboxMessages }] = await Promise.all([
    supabase.from('marketing_page_posts')
      .select('id,page_id,platform_post_id,message,permalink_url,created_time,reactions_count,comments_count')
      .order('created_time', { ascending: false })
      .limit(50),
    supabase.from('marketing_page_comments')
      .select('id,page_id,platform_comment_id,platform_post_id,from_name,message,created_time')
      .order('created_time', { ascending: false })
      .limit(80),
    supabase.from('marketing_messages')
      .select('id,direction,sender_name,noi_dung,created_at,ai_suggested_reply,trang_thai,metadata')
      .eq('kenh', 'facebook')
      .order('created_at', { ascending: false })
      .limit(200),
  ])

  async function insertUniqueFanpageAction(payload: Record<string, any>) {
    const { data: existing } = await supabase.from('marketing_ai_actions')
      .select('id')
      .eq('action_type', payload.action_type)
      .eq('scope', payload.scope)
      .in('trang_thai', ['de_xuat', 'cho_duyet', 'dang_chay'])
      .limit(1)

    if (existing && existing.length > 0) return null
    const { data: action, error: actionError } = await supabase.from('marketing_ai_actions')
      .insert(payload)
      .select('*')
      .single()
    if (actionError) throw actionError
    generated.push(action)
    return action
  }

  const inboundNeedsCare = (inboxMessages || [])
    .filter((m: any) => m.direction === 'inbound' && !m.ai_suggested_reply)
    .slice(0, 20)

  if (inboundNeedsCare.length > 0) {
    await insertUniqueFanpageAction({
      action_type: 'triage_fanpage_inbox',
      scope: 'inbox',
      title: `Can phan loai ${inboundNeedsCare.length} tin nhan Fanpage moi`,
      recommendation: 'Dung AI de phan loai nhu cau, cham diem lead va tao cau tra loi nhap truoc khi cho phep auto-reply.',
      ly_do: 'Du lieu inbox da dong bo tu Fanpage nhung chua co ai_suggested_reply.',
      risk_level: 'low',
      requires_approval: false,
      trang_thai: 'de_xuat',
      proposed_payload: {
        message_ids: inboundNeedsCare.map((m: any) => m.id),
        sample_messages: inboundNeedsCare.slice(0, 5).map((m: any) => ({
          id: m.id,
          sender_name: m.sender_name,
          noi_dung: m.noi_dung,
          created_at: m.created_at,
        })),
      },
    })
  }

  const recentComments = (pageComments || [])
    .filter((c: any) => String(c.message || '').trim())
    .slice(0, 20)

  if (recentComments.length > 0) {
    await insertUniqueFanpageAction({
      action_type: 'triage_fanpage_comments',
      scope: 'inbox',
      title: `Can loc ${recentComments.length} binh luan Fanpage moi`,
      recommendation: 'Phan loai comment thanh hoi gia, dat lich, khieu nai, spam va tao goi y tra loi cho cac comment co kha nang thanh lead.',
      ly_do: 'Comment moi la nguon lead nong va can phan hoi nhanh de tang ty le chot lich.',
      risk_level: 'low',
      requires_approval: false,
      trang_thai: 'de_xuat',
      proposed_payload: {
        comment_ids: recentComments.map((c: any) => c.id),
        sample_comments: recentComments.slice(0, 6).map((c: any) => ({
          id: c.id,
          from_name: c.from_name,
          message: c.message,
          created_time: c.created_time,
        })),
      },
    })
  }

  const topPost = (pagePosts || [])
    .filter((p: any) => Number(p.comments_count || 0) + Number(p.reactions_count || 0) > 0)
    .sort((a: any, b: any) =>
      (Number(b.comments_count || 0) * 3 + Number(b.reactions_count || 0)) -
      (Number(a.comments_count || 0) * 3 + Number(a.reactions_count || 0)),
    )[0]

  if (topPost) {
    await insertUniqueFanpageAction({
      action_type: 'repurpose_fanpage_content',
      scope: 'content',
      title: 'Nhan ban noi dung Fanpage dang co tin hieu tot',
      recommendation: `Bai gan day co ${topPost.comments_count || 0} comment va ${topPost.reactions_count || 0} tuong tac. Nen bien thanh 2-3 bien the noi dung moi, uu tien CTA inbox/dat lich.`,
      ly_do: 'Dung du lieu Fanpage that de tao ke hoach noi dung thay vi doan cam tinh.',
      risk_level: 'low',
      requires_approval: false,
      trang_thai: 'de_xuat',
      proposed_payload: {
        post_id: topPost.id,
        platform_post_id: topPost.platform_post_id,
        permalink_url: topPost.permalink_url,
        message_preview: String(topPost.message || '').slice(0, 500),
        comments_count: topPost.comments_count || 0,
        reactions_count: topPost.reactions_count || 0,
      },
    })
  }

  return {
    campaigns: campaigns.length,
    fanpage: {
      posts: pagePosts?.length || 0,
      comments: pageComments?.length || 0,
      inbox_messages: inboxMessages?.length || 0,
      inbound_needs_care: inboundNeedsCare.length,
    },
    generated,
  }
}

async function handleContentPlan() {
  const { data: campaigns } = await supabase.from('chien_dich_marketing')
    .select('id, ten, kenh, mo_ta, khuyen_mai_id, trang_thai')
    .eq('trang_thai', 'active')
    .limit(20)

  const ai = await callAI(
    [
      'Bạn là AI Content Marketing cho Hannah Beauty & Spa.',
      'Tạo 5 ý tưởng nội dung sang trọng, ấm áp, phù hợp spa Cần Thơ.',
      'Không cam kết trị khỏi. Không dùng ngôn ngữ y khoa quá mức. Có CTA đặt lịch tư vấn.',
      'Chỉ trả về JSON array: [{tieu_de, kenh, loai_noi_dung, chu_de, noi_dung, ai_prompt, chien_dich_id}].',
    ].join('\n'),
    { campaigns: campaigns || [], today: todayISO() },
    'pro',
  )

  const fallback = (campaigns || []).slice(0, 5).map((c: any) => ({
    tieu_de: `Ý tưởng nội dung cho ${c.ten}`,
    kenh: c.kenh || 'facebook',
    loai_noi_dung: 'bai_viet',
    chu_de: 'Tư vấn chăm sóc da và đặt lịch',
    noi_dung: `Gợi ý nội dung giới thiệu ${c.ten}, nhấn mạnh trải nghiệm thư giãn và tư vấn cá nhân hóa tại Hannah Spa.`,
    ai_prompt: 'Viết caption giọng sang, ấm, không cam kết điều trị, có CTA đặt lịch.',
    chien_dich_id: c.id,
  }))

  const ideas = ai.ok ? safeJSON(ai.text, fallback as any) : fallback
  const rows = (Array.isArray(ideas) ? ideas : fallback).map((idea: any) => ({
    tieu_de: String(idea.tieu_de || 'Ý tưởng nội dung Hannah Spa').slice(0, 200),
    kenh: idea.kenh || 'facebook',
    loai_noi_dung: idea.loai_noi_dung || 'bai_viet',
    chu_de: idea.chu_de || null,
    noi_dung: idea.noi_dung || null,
    ai_prompt: idea.ai_prompt || null,
    chien_dich_id: idea.chien_dich_id || null,
    khuyen_mai_id: idea.khuyen_mai_id || null,
    trang_thai: 'y_tuong',
    ai_notes: ai.ok ? 'Tạo bởi AI Marketing' : 'Tạo bằng fallback vì chưa cấu hình AI',
  }))

  if (rows.length === 0) return { inserted: 0, note: 'khong_co_chien_dich_active' }
  const { data, error } = await supabase.from('marketing_content_calendar').insert(rows).select('*')
  if (error) throw error
  return { inserted: data?.length || 0, ai_configured: ai.ok, data }
}

function fallbackContentDraft(content: any) {
  const title = content.tieu_de || 'Noi dung Hannah Spa'
  return {
    caption: [
      title,
      '',
      'Hannah Spa moi minh dat lich tu van de duoc goi y lieu trinh phu hop voi tinh trang da va nhu cau cham soc cua rieng minh.',
      'Inbox fanpage hoac Zalo de Hannah giu lich cho minh nhe.',
    ].join('\n'),
    hashtags: ['#HannahSpa', '#SpaCanTho', '#ChamSocDa'],
    image_prompt: `Anh spa sang trong, am ap, phu hop chu de: ${title}. Khong chen chu len anh.`,
    review_notes: 'Ban nhap fallback vi chua cau hinh AI hoac AI khong tra ve JSON hop le.',
  }
}

async function handleDraftContent() {
  const { data: content, error } = await supabase.from('marketing_content_calendar')
    .select('*')
    .in('trang_thai', ['y_tuong', 'nhap'])
    .order('created_at', { ascending: true })
    .limit(10)
  if (error) throw error

  const drafted: any[] = []
  for (const item of content || []) {
    const ai = await callAI(
      [
        'Ban la AI Content Marketing cho Hannah Beauty & Spa tai Can Tho.',
        'Hay bien y tuong thanh ban nhap dang duyet: caption ngan gon, sang, am, co CTA dat lich.',
        'Khong cam ket dieu tri khoi benh. Khong tu y giam gia. Khong dung tu ngu y khoa qua muc.',
        'Chi tra ve JSON: caption, hashtags, image_prompt, review_notes.',
      ].join('\n'),
      item,
      'pro',
    )

    const draft = ai.ok ? safeJSON(ai.text, fallbackContentDraft(item)) : fallbackContentDraft(item)
    const caption = String((draft as any).caption || '').trim() || fallbackContentDraft(item).caption
    const hashtags = Array.isArray((draft as any).hashtags)
      ? (draft as any).hashtags.map((h: unknown) => String(h).trim()).filter(Boolean).slice(0, 12)
      : fallbackContentDraft(item).hashtags
    const imagePrompt = String((draft as any).image_prompt || item.ai_prompt || '').trim()
    const metadata = {
      ...(item.metadata || {}),
      ai_draft: {
        created_at: new Date().toISOString(),
        ai_configured: ai.ok,
        review_notes: (draft as any).review_notes || null,
      },
    }

    const { data: updated, error: updateError } = await supabase.from('marketing_content_calendar')
      .update({
        noi_dung: caption,
        hashtags,
        ai_prompt: imagePrompt || item.ai_prompt || null,
        ai_notes: ai.ok ? 'AI da soan ban nhap cho phe duyet.' : 'Ban nhap fallback vi chua cau hinh AI.',
        trang_thai: 'cho_duyet',
        metadata,
      })
      .eq('id', item.id)
      .select('*')
      .single()
    if (updateError) throw updateError

    const { data: existing } = await supabase.from('marketing_ai_actions')
      .select('id')
      .eq('content_id', item.id)
      .eq('action_type', 'publish_content')
      .in('trang_thai', ['de_xuat', 'cho_duyet', 'da_duyet', 'dang_chay'])
      .limit(1)

    if (!existing || existing.length === 0) {
      const { data: action, error: actionError } = await supabase.from('marketing_ai_actions')
        .insert({
          action_type: 'publish_content',
          scope: 'content',
          title: `Duyet dang noi dung: ${updated.tieu_de}`,
          recommendation: caption.slice(0, 600),
          ly_do: 'AI da soan caption va prompt hinh anh, can admin duyet truoc khi xuat ban.',
          risk_level: 'medium',
          requires_approval: true,
          trang_thai: 'cho_duyet',
          chien_dich_id: updated.chien_dich_id,
          content_id: updated.id,
          proposed_payload: {
            content_id: updated.id,
            kenh: updated.kenh,
            caption,
            hashtags,
            image_prompt: imagePrompt,
            scheduled_at: updated.scheduled_at,
          },
        })
        .select('*')
        .single()
      if (actionError) throw actionError

      await supabase.from('marketing_approval_queue').insert({
        ai_action_id: action.id,
        loai: 'content_publish',
        title: `Duyet dang noi dung: ${updated.tieu_de}`,
        payload: { content_id: updated.id, caption, hashtags, image_prompt: imagePrompt },
      })
    }

    drafted.push(updated)
  }

  return { drafted: drafted.length, data: drafted }
}

async function handleRunApproved() {
  const { data: actions, error } = await supabase.from('marketing_ai_actions')
    .select('*')
    .in('trang_thai', ['da_duyet', 'de_xuat'])
    .limit(20)
  if (error) throw error

  const executed: any[] = []
  for (const action of actions || []) {
    const payload = action.proposed_payload || {}
    if (action.requires_approval && action.trang_thai !== 'da_duyet') continue

    if (action.action_type === 'reply_message') {
      const reply = payload.reply || action.recommendation
      await supabase.from('marketing_messages').insert({
        lead_id: action.lead_id,
        kenh: payload.kenh || 'facebook',
        direction: 'outbound',
        sender_type: 'ai',
        noi_dung: reply,
        trang_thai: 'draft',
        ai_safety_level: action.risk_level === 'low' ? 'normal' : 'needs_review',
        metadata: { source_action_id: action.id, note: 'Draft tao boi AI. Ket noi API gui that o buoc sau.' },
      })
      await supabase.from('marketing_ai_actions').update({
        trang_thai: 'da_chay',
        executed_at: new Date().toISOString(),
        result_payload: { created_outbound_draft: true },
      }).eq('id', action.id)
      executed.push({ id: action.id, type: action.action_type })
    }

    if (action.action_type === 'publish_content') {
      const contentId = action.content_id || payload.content_id
      if (!contentId) {
        await supabase.from('marketing_ai_actions').update({
          trang_thai: 'loi',
          error_message: 'Thieu content_id',
        }).eq('id', action.id)
        continue
      }

      const { data: content, error: contentError } = await supabase.from('marketing_content_calendar')
        .select('*')
        .eq('id', contentId)
        .single()
      if (contentError) throw contentError

      const schedule = content.scheduled_at ? new Date(content.scheduled_at).getTime() : 0
      const shouldPublish = !schedule || schedule <= Date.now()
      if (!shouldPublish) continue

      await supabase.from('marketing_content_calendar').update({
        trang_thai: 'da_dang',
        published_at: new Date().toISOString(),
        metadata: {
          ...(content.metadata || {}),
          publish_result: {
            source_action_id: action.id,
            mode: 'connector_ready',
            note: 'Da danh dau da dang. Ket noi API Facebook/Zalo/TikTok that o buoc sau se dung proposed_payload nay.',
            published_at: new Date().toISOString(),
          },
        },
      }).eq('id', contentId)

      await supabase.from('marketing_ai_actions').update({
        trang_thai: 'da_chay',
        executed_at: new Date().toISOString(),
        result_payload: { marked_published: true, connector_ready: true },
      }).eq('id', action.id)

      executed.push({ id: action.id, type: action.action_type })
    }

    if (action.action_type === 'increase_budget' || action.action_type === 'reduce_budget') {
      if (!action.chien_dich_id) {
        await supabase.from('marketing_ai_actions').update({
          trang_thai: 'loi',
          error_message: 'Thieu chien_dich_id',
        }).eq('id', action.id)
        continue
      }

      const { data: campaign, error: campaignError } = await supabase.from('chien_dich_marketing')
        .select('id, ten, daily_budget, ngan_sach, auto_rules, ghi_chu')
        .eq('id', action.chien_dich_id)
        .single()
      if (campaignError) throw campaignError

      const current = Number(campaign.daily_budget || campaign.ngan_sach || 0)
      const delta = Math.max(Math.round(current * 0.2), 50000)
      const nextBudget = action.action_type === 'increase_budget'
        ? current + delta
        : Math.max(0, current - delta)

      await supabase.from('chien_dich_marketing').update({
        daily_budget: nextBudget,
        auto_rules: {
          ...(campaign.auto_rules || {}),
          last_ai_budget_action: {
            action_id: action.id,
            action_type: action.action_type,
            previous_daily_budget: current,
            next_daily_budget: nextBudget,
            updated_at: new Date().toISOString(),
            mode: 'local_connector_ready',
          },
        },
        ghi_chu: [
          campaign.ghi_chu || '',
          `AI ${action.action_type}: ${current} -> ${nextBudget}. Cho ket noi API quang cao that de day len nen tang.`,
        ].filter(Boolean).join('\n').slice(0, 2000),
      }).eq('id', action.chien_dich_id)

      await supabase.from('marketing_ai_actions').update({
        trang_thai: 'da_chay',
        executed_at: new Date().toISOString(),
        result_payload: {
          local_budget_updated: true,
          connector_ready: true,
          previous_daily_budget: current,
          next_daily_budget: nextBudget,
        },
      }).eq('id', action.id)

      executed.push({ id: action.id, type: action.action_type, previous_daily_budget: current, next_daily_budget: nextBudget })
    }
  }

  return { executed }
}

// Gợi ý câu trả lời BÁM CẢ HỘI THOẠI (không phân tích tin lẻ) — dùng cho Hộp Thư khi lễ tân mở 1 khách.
async function handleSuggestReply(body: Record<string, unknown>) {
  const rawMsgs = Array.isArray(body.messages) ? (body.messages as any[]) : []
  // Chỉ lấy 14 tin gần nhất, bỏ tin rỗng/tin lỗi sync.
  const msgs = rawMsgs
    .filter((m) => m && String(m.noi_dung || '').trim() && String(m.sender_type || '') !== 'system')
    .slice(-14)
  const phone = (body.phone as string) || (body.so_dien_thoai as string) || null
  const psid = (body.platform_user_id as string) || null
  const context = await buildCustomerContext(phone, psid)

  const thread = msgs
    .map((m) => `${m.direction === 'inbound' ? 'KHÁCH' : 'SPA'}: ${String(m.noi_dung || '').trim()}`)
    .join('\n')
  const lastInbound = [...msgs].reverse().find((m) => m.direction === 'inbound')

  if (!thread) return { reply: '', note: 'Chưa có nội dung hội thoại để gợi ý.', has_ai: false }

  const playbook = await getPlaybook()
  const promos = await getActivePromotions()
  const topic = detectTopic(lastInbound ? String(lastInbound.noi_dung || '') : thread)
  const golds = await getGoldExamples(topic)
  const ai = await callAI(
    [
      'Bạn là lễ tân Hannah Beauty & Spa (Cần Thơ) — thân thiện, chuyên nghiệp, xưng "em", gọi khách "chị/anh".',
      '── HIẾN PHÁP TƯ VẤN (bám sát tuyệt đối) ──',
      playbook,
      '── HẾT HIẾN PHÁP ──',
      promoBlock(promos),
      golds ? `VÍ DỤ CÁCH LỄ TÂN HANNAH ĐÃ TƯ VẤN TỐT TÌNH HUỐNG TƯƠNG TỰ (học PHONG CÁCH & cách dẫn dắt, KHÔNG copy nguyên văn, KHÔNG bịa thông tin từ đây):\n${golds}\n──` : '',
      'Đọc TOÀN BỘ đoạn hội thoại bên dưới (thứ tự thời gian) rồi soạn DUY NHẤT câu trả lời tiếp theo mà lễ tân nên gửi, BÁM SÁT tin cuối của khách và mạch hội thoại.',
      'Nguyên tắc: nếu khách đang chốt đến/đặt lịch → xác nhận + hỏi/đề xuất khung giờ + nhắc địa chỉ 39 Nam Kỳ Khởi Nghĩa. Nếu hỏi giá → hỏi rõ nhu cầu rồi xin SĐT/Zalo (KHÔNG bịa số tiền). Nếu cảm ơn/đồng ý ngắn ("ok", "dạ") → chốt bước tiếp theo cụ thể, đừng hỏi lại điều đã rõ.',
      'Khách cũ (khach_context.is_returning=true): chào theo tên, nhắc ĐÚNG thẻ/buổi còn lại (the_dang_co, tong_buoi_con) và gợi ý dùng tiếp/gia hạn; có thể upsell theo goi_y_upsell/muc_tieu_tu_van. TUYỆT ĐỐI không bịa số buổi/dịch vụ ngoài context.',
      'Viết NHƯ người thật: 1-3 câu tiếng Việt tự nhiên, ấm áp, KHÔNG lặp lời chào nếu hội thoại đã chào, KHÔNG sáo rỗng, KHÔNG hứa chữa khỏi bệnh, KHÔNG tự giảm giá.',
      'CHỈ trả về JSON: { "reply": "<câu trả lời>", "note": "<lý do ngắn gọn vì sao gợi ý vậy>" }.',
    ].join('\n'),
    {
      hoi_thoai: thread,
      tin_cuoi_cua_khach: lastInbound ? String(lastInbound.noi_dung || '') : '',
      khach_context: context,
    },
    'fast',
  )

  const parsed = ai.ok ? safeJSON(ai.text, {}) : {}
  return {
    reply: String(parsed.reply || '').trim(),
    note: String(parsed.note || '').trim(),
    khach_cu: !!context.is_returning,
    khach_context: context,
    has_ai: ai.ok,
    error: ai.ok ? null : (ai as any).error || (ai as any).note || null,
  }
}

// ── CHĂM SÓC SAU DỊCH VỤ ── soạn tin hỏi thăm + mời quay lại/đặt buổi tiếp + cross-sell, cá nhân hóa theo khách.
async function handleCareMessage(body: Record<string, unknown>) {
  const khId = (body.khach_hang_id as string) || null
  const tenKhach = (body.ten_khach as string) || null
  const dichVu = String(body.dich_vu_da_lam || '').trim()
  const laLieuTrinh = !!body.la_lieu_trinh

  // Hồ sơ giàu để tư vấn đúng (thẻ còn buổi, lịch sử, gợi ý upsell)
  let context: any = { is_returning: false }
  if (khId) {
    const { data } = await supabase.from('v_customer_pos_intelligence').select('*').eq('khach_hang_id', khId).limit(1).maybeSingle()
    if (data) context = {
      is_returning: true, ho_ten: data.ho_ten, lan_cuoi_den: data.lan_cuoi_den,
      so_the_active: Number(data.so_the_active || 0), tong_buoi_con: Number(data.tong_buoi_con || 0),
      the_dang_co: data.the_dang_co, dich_vu_da_dung: data.dich_vu_da_dung, goi_y_upsell: data.goi_y_upsell, muc_tieu_tu_van: data.muc_tieu_tu_van,
    }
  }

  const playbook = await getPlaybook()
  const promos = await getActivePromotions()
  const ai = await callAI(
    [
      'Bạn là lễ tân Hannah Beauty & Spa (Cần Thơ) — xưng "em", gọi khách "chị/anh".',
      '── HIẾN PHÁP TƯ VẤN ──', playbook, '── HẾT ──',
      promoBlock(promos),
      'Soạn MỘT tin nhắn CHĂM SÓC SAU DỊCH VỤ gửi khách (khoảng 1 ngày sau khi khách đến làm dịch vụ). Đây là tin CHỦ ĐỘNG nên phải mở đầu thân thiện, xưng tên spa.',
      'Mục tiêu: (1) hỏi thăm chân thành cảm nhận/tình trạng da sau khi làm "dich_vu_da_lam"; (2) thể hiện sự ân cần chuyên nghiệp của Hannah.',
      'Nếu là LIỆU TRÌNH (triệt lông / chăm sóc da / peel / tắm trắng nhiều buổi): sau khi hỏi thăm, NHẸ NHÀNG xin phép đặt lịch buổi kế tiếp đúng chu kỳ để liệu trình hiệu quả (giải thích ngắn lý do khoa học). Nếu khách còn buổi trong thẻ (the_dang_co) → nhắc dùng tiếp.',
      'Nếu là dịch vụ THƯ GIÃN (gội/massage): hỏi thăm + mời quay lại trải nghiệm đều đặn; có thể gợi 1 gói liên quan hoặc KM nếu phù hợp.',
      'Có thể cross-sell nhẹ 1 gợi ý theo goi_y_upsell/muc_tieu_tu_van nếu hợp, KHÔNG ép.',
      'Bám TÊN khách + dịch vụ vừa làm. 2–4 câu tiếng Việt ấm áp, tự nhiên, KHÔNG sáo rỗng, KHÔNG hứa khỏi bệnh, KHÔNG bịa số buổi ngoài context.',
      'CHỈ trả JSON: { "reply": "<tin nhắn>", "note": "<lý do ngắn>" }.',
    ].join('\n'),
    { ten_khach: tenKhach, dich_vu_da_lam: dichVu, la_lieu_trinh: laLieuTrinh, khach_context: context },
    'fast',
  )
  const parsed = ai.ok ? safeJSON(ai.text, {}) : {}
  return { reply: String(parsed.reply || '').trim(), note: String(parsed.note || '').trim(), has_ai: ai.ok, error: ai.ok ? null : (ai as any).error || null }
}

// ── PHÂN TÍCH KHÁCH TIỀM NĂNG (đọc tin THẬT, không gán nhãn bừa) ── dùng cho làm sạch 123k tin → CRM.
const VALID_LEAD_TT = ['moi', 'dang_tu_van', 'da_dat_hen', 'da_den', 'da_mua', 'mat_co_hoi', 'spam']
async function analyzeOneLead(seg: any) {
  const psid = seg.platform_user_id
  // Lấy tối đa 30 tin THẬT của khách (cả 2 chiều) để AI đọc đúng ngữ cảnh
  const { data: msgs } = await supabase.from('marketing_messages')
    .select('direction, sender_type, noi_dung, created_at')
    .eq('from_platform_user_id', psid)
    .order('created_at', { ascending: false }).limit(30)
  let thread = (msgs || [])
    .filter((m: any) => String(m.noi_dung || '').trim())
    .reverse()
    .map((m: any) => `${m.direction === 'inbound' ? 'KHÁCH' : 'SPA'}: ${String(m.noi_dung).trim().slice(0, 200)}`)
    .join('\n').slice(0, 4000)
  if (!thread && seg.raw_summary) thread = String(seg.raw_summary).slice(0, 2000)
  if (!thread) return null

  const context = await buildCustomerContext(seg.phone_norm || null, psid)
  const playbook = await getPlaybook()
  const promos = await getActivePromotions()
  const ai = await callAI(
    [
      'Bạn là trưởng nhóm CSKH của Hannah Beauty & Spa (Cần Thơ). Phân tích hội thoại Fanpage của MỘT khách để giao việc cho lễ tân.',
      '── HIẾN PHÁP ──', playbook, '── HẾT ──', promoBlock(promos),
      'ĐỌC KỸ hội thoại thật bên dưới. Tuyệt đối KHÔNG gán bừa — chỉ kết luận từ điều khách THỰC SỰ nhắn.',
      'khach_context.is_returning=true nghĩa khách ĐÃ là khách HSMS (đã từng đến/mua).',
      'Trả về JSON: {',
      '  "dich_vu_quan_tam": [tối đa 3 dịch vụ khách THẬT SỰ hỏi/quan tâm, [] nếu không rõ],',
      '  "diem_tiem_nang": 0-100 (cao = nóng/sắp chốt; thấp = hỏi vu vơ/spam/đã nguội),',
      '  "trang_thai": một trong [moi, dang_tu_van, da_dat_hen, da_den, da_mua, mat_co_hoi, spam],',
      '  "ly_do": "1 câu vì sao chấm điểm vậy",',
      '  "hanh_dong": "việc CỤ THỂ lễ tân nên làm tiếp (vd: gọi chốt lịch triệt lông, gửi bảng giá da mặt...)",',
      '  "script": "tin nhắn mẫu cá nhân hóa để lễ tân gửi lại khách này, bám hội thoại + KM nếu hợp, 2-4 câu",',
      '  "tom_tat": "1-2 câu tóm tắt khách này là ai, đã trao đổi gì"',
      '}. Nếu chỉ là spam/không có nhu cầu → diem_tiem_nang thấp, trang_thai spam/mat_co_hoi.',
    ].join('\n'),
    { hoi_thoai: thread, ten_khach: seg.display_name, khach_context: context },
    'fast',
  )
  if (!ai.ok) return null
  const p = safeJSON(ai.text, {})
  const tt = VALID_LEAD_TT.includes(String(p.trang_thai)) ? p.trang_thai : 'moi'
  let diem = Math.round(Number(p.diem_tiem_nang)); if (!Number.isFinite(diem)) diem = 0
  diem = Math.max(0, Math.min(100, diem))
  const dichVu = Array.isArray(p.dich_vu_quan_tam) ? p.dich_vu_quan_tam.slice(0, 3) : []
  // Phân loại để LỌC RÁC: spam / không nhu cầu / điểm quá thấp → loai_bo (ẩn khỏi danh sách remarketing)
  const isRac = tt === 'spam' || diem < 25
  const care = isRac ? 'loai_bo' : (diem >= 60 ? 'can_uu_tien' : 'chua_cham_soc')
  return {
    services_interest: dichVu,
    priority_score: diem,
    care_status: care,
    da_den_spa: !!context.is_returning,
    suggested_action: String(p.hanh_dong || '').slice(0, 300),
    suggested_script: String(p.script || '').slice(0, 600),
    ai_tom_tat: String(p.tom_tat || '').slice(0, 400),
    _trang_thai: tt,
  }
}

async function handleReclassifyLeads(body: Record<string, unknown>) {
  const limit = Math.min(Math.max(Number(body.limit || 10), 1), 40)
  const since = String(body.since || '2026-01-01')
  const onlyPhone = body.only_phone !== false   // mặc định chỉ khách có SĐT (liên hệ được)
  let q = supabase.from('marketing_fanpage_customer_segments')
    .select('id, platform_user_id, display_name, phone_norm, raw_summary')
    .gte('last_message_at', since)
    .is('ai_reanalyzed_at', null)
    .order('last_message_at', { ascending: false })
    .limit(limit)
  if (onlyPhone) q = q.eq('has_phone', true)
  const { data: segs } = await q
  let done = 0; const sample: any[] = []
  for (const seg of segs || []) {
    const r = await analyzeOneLead(seg)
    const patch: any = { ai_reanalyzed_at: new Date().toISOString() }
    if (r) {
      Object.assign(patch, {
        services_interest: r.services_interest, priority_score: r.priority_score,
        care_status: r.care_status, da_den_spa: r.da_den_spa, suggested_action: r.suggested_action,
        suggested_script: r.suggested_script, ai_tom_tat: r.ai_tom_tat,
      })
      done++
      if (sample.length < 3) sample.push({ ten: seg.display_name, diem: r.priority_score, dv: r.services_interest, hanh_dong: r.suggested_action })
    }
    await supabase.from('marketing_fanpage_customer_segments').update(patch).eq('id', seg.id)
  }
  return { analyzed: done, scanned: (segs || []).length, sample }
}

// ── HỌC TỪ LỄ TÂN GIỎI (RAG) ── quét hội thoại thật, trích cặp (khách hỏi → lễ tân trả lời tốt) làm mẫu vàng.
async function handleMineExamples(body: Record<string, unknown>) {
  const days = Math.min(Math.max(Number(body.days || 120), 7), 400)
  const since = new Date(Date.now() - days * 864e5).toISOString()
  // Lấy ~3000 tin GẦN NHẤT (3 trang × 1000 do PostgREST giới hạn) rồi sắp xếp tăng dần trong từng hội thoại.
  const all: any[] = []
  for (let page = 0; page < 3; page++) {
    const { data } = await supabase.from('marketing_messages')
      .select('conversation_id, from_platform_user_id, direction, sender_type, noi_dung, created_at')
      .eq('kenh', 'facebook')
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .range(page * 1000, page * 1000 + 999)
    if (!data || !data.length) break
    all.push(...data)
    if (data.length < 1000) break
  }
  const msgs = all

  const conv = new Map<string, any[]>()
  for (const m of msgs) {
    const cid = m.conversation_id || m.from_platform_user_id
    if (!cid) continue
    if (!conv.has(cid)) conv.set(cid, [])
    conv.get(cid)!.push(m)
  }
  for (const arr of conv.values()) arr.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())

  const junk = (t: string) => /unexpected error|meta sync|graph api|invalid oauth|token.*expired/i.test(t || '')
  const rows: any[] = []
  const seen = new Set<string>()
  for (const arr of conv.values()) {
    for (let i = 1; i < arr.length; i++) {
      const cur = arr[i], prev = arr[i - 1]
      if (!(cur.direction === 'outbound' && cur.sender_type === 'staff' && prev.direction === 'inbound')) continue
      const ans = String(cur.noi_dung || '').trim()
      const ask = String(prev.noi_dung || '').trim()
      if (ans.length < 40 || ask.length < 4 || junk(ans) || junk(ask)) continue
      const a = ans.toLowerCase()
      let diem = 0
      if (ans.length >= 80) diem += 2
      if (/\?/.test(ans)) diem += 2                                     // có hỏi lại nhu cầu
      if (/(dạ|nha|nhé|ạ)/.test(a)) diem += 1                            // giọng lễ tân
      if (/(giá|gói|combo|ưu đãi|liệu trình|đặt lịch|khung giờ|tư vấn)/.test(a)) diem += 2
      const next = arr[i + 1]
      if (next && next.direction === 'inbound') diem += 3               // khách phản hồi tiếp = hiệu quả
      if (diem < 4) continue
      const pair_hash = (ask.slice(0, 80) + '|' + ans.slice(0, 80)).slice(0, 180)
      if (seen.has(pair_hash)) continue
      seen.add(pair_hash)
      rows.push({
        chu_de: detectTopic(ask + ' ' + ans),
        khach_hoi: ask.slice(0, 500),
        le_tan_tra_loi: ans.slice(0, 800),
        nguon_conversation_id: String(cur.conversation_id || cur.from_platform_user_id || ''),
        diem,
        da_duyet: diem >= 7,
        pair_hash,
      })
    }
  }

  let saved = 0
  for (let i = 0; i < rows.length; i += 200) {
    const chunk = rows.slice(i, i + 200)
    const { error, data } = await supabase.from('marketing_ai_examples')
      .upsert(chunk, { onConflict: 'pair_hash', ignoreDuplicates: true })
      .select('id')
    if (!error && data) saved += data.length
  }

  // thống kê theo chủ đề
  const byTopic: Record<string, number> = {}
  for (const r of rows) byTopic[r.chu_de] = (byTopic[r.chu_de] || 0) + 1
  return { scanned_messages: msgs?.length || 0, candidates: rows.length, saved_new: saved, by_topic: byTopic }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  let mode = 'analyze'
  let body: Record<string, unknown> = {}
  try {
    body = await req.json().catch(() => ({}))
    mode = String(body.mode || 'analyze')

    let result: unknown

    if (mode === 'inbox_webhook') result = await handleInbox((body.message || body) as IncomingMessage)
    else if (mode === 'suggest_reply') result = await handleSuggestReply(body)
    else if (mode === 'care_message') result = await handleCareMessage(body)
    else if (mode === 'reclassify_leads') result = await handleReclassifyLeads(body)
    else if (mode === 'mine_examples') result = await handleMineExamples(body)
    else if (mode === 'analyze') result = await handleAnalyze()
    else if (mode === 'triage_fanpage') result = await handleFanpageTriage(body)
    else if (mode === 'cleanup_fanpage_leads') result = await handleFanpageLeadCleanup(body)
    else if (mode === 'fanpage_audience_stats') result = await handleFanpageAudienceStats(body)
    else if (mode === 'sync_fanpage_audience') result = await handleFanpageAudienceSync(body)
    else if (mode === 'resolve_conversation_phones') result = await handleResolveConversationPhones(body)
    else if (mode === 'resolve_identities') result = await handleResolveIdentities()
    else if (mode === 'classify_fanpage_customers') result = await handleClassifyFanpageCustomers(body)
    else if (mode === 'attribution_bridge') result = await handleAttributionBridge(body)
    else if (mode === 'content_plan') result = await handleContentPlan()
    else if (mode === 'draft_content') result = await handleDraftContent()
    else if (mode === 'run_approved') result = await handleRunApproved()
    else return json({
      error: 'mode_khong_ho_tro',
      modes: [
        'inbox_webhook',
        'suggest_reply',
        'care_message',
        'reclassify_leads',
        'mine_examples',
        'analyze',
        'triage_fanpage',
        'cleanup_fanpage_leads',
        'fanpage_audience_stats',
        'sync_fanpage_audience',
        'resolve_conversation_phones',
        'resolve_identities',
        'classify_fanpage_customers',
        'attribution_bridge',
        'content_plan',
        'draft_content',
        'run_approved',
      ],
    }, 400)

    await logRun(mode, 'success', body, result)
    return json(result)
  } catch (e: any) {
    // Lỗi Supabase là object (message/details/hint/code) — đừng để String() biến thành "[object Object]".
    const detail = e instanceof Error
      ? e.message
      : (e && typeof e === 'object')
        ? (e.message || e.details || e.hint || e.code || JSON.stringify(e))
        : String(e)
    console.error('marketing-ai error:', mode, detail, e?.code || '', e?.details || '')
    await logRun(mode, 'error', body, {}, String(detail)).catch(() => {})
    return json({ error: String(detail), code: e?.code || null, details: e?.details || null, hint: e?.hint || null }, 500)
  }
})
