// miniapp — Backend cho Zalo Mini App "Hannah Spa".
// 4 chức năng cho khách: xem thẻ liệu trình, xem voucher, đặt lịch hẹn, vòng quay may mắn.
//
// Auth: Mini App gọi getPhoneNumber() (zmp-sdk) → { token }. Backend đổi token lấy SĐT thật
//   qua Zalo Graph API (cần secret OA). Khi chưa cấu hình secret → cho phép truyền phone trực
//   tiếp (DEV) để demo. Mọi truy vấn data đều theo SĐT đã xác thực → không xem được của người khác.
//
// Actions (POST body.action):
//   - the_cua_toi      : danh sách thẻ còn buổi của khách
//   - voucher_cua_toi  : voucher chưa dùng còn hạn
//   - danh_sach_dich_vu: DV cho màn đặt lịch
//   - dat_lich         : tạo lịch hẹn (trang_thai cho_xac_nhan)
//   - vong_quay        : quay may mắn 1 lần/ngày → sinh voucher ngẫu nhiên
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' }
const json = (o: unknown, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } })

function todayVN() {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' })).toISOString().slice(0, 10)
}
function chuanHoaSdt(s: string) {
  let p = String(s || '').replace(/\D/g, '')
  if (p.startsWith('84')) p = '0' + p.slice(2)
  if (p && !p.startsWith('0')) p = '0' + p
  return p
}

// ── Đổi token getPhoneNumber → SĐT thật qua Zalo Graph API ──
async function resolvePhone(body: any): Promise<{ phone: string | null; err?: string }> {
  const token = body.phone_token || body.token
  const userAccessToken = body.access_token   // zmp getAccessToken()
  if (token && userAccessToken) {
    try {
      // Dùng App Secret của Zalo App HSMS (đã có sẵn trên VPS, dùng chung OAuth/ZNS);
      // fallback marketing_ai_config.zalo_miniapp_secret nếu cấu hình riêng.
      let secret = Deno.env.get('ZALO_APP_SECRET')
      if (!secret) {
        const { data: cfg } = await supabase.from('marketing_ai_config').select('value').eq('key', 'zalo_miniapp_secret').maybeSingle()
        secret = cfg?.value
      }
      if (secret) {
        const r = await fetch('https://graph.zalo.me/v2.0/me/info', {
          headers: { access_token: userAccessToken, code: token, secret_key: secret },
        })
        const j = await r.json()
        const num = j?.data?.number
        if (num) return { phone: chuanHoaSdt(num) }
        return { phone: null, err: 'Zalo không trả SĐT: ' + JSON.stringify(j?.error || j) }
      }
    } catch (e) { return { phone: null, err: 'Lỗi gọi Zalo: ' + String(e) } }
  }
  // DEV / fallback: nhận phone trực tiếp (khi chưa cấu hình secret)
  if (body.phone) return { phone: chuanHoaSdt(body.phone) }
  return { phone: null, err: 'Thiếu thông tin xác thực SĐT' }
}

async function timKhach(phone: string) {
  const { data } = await supabase.from('khach_hang').select('id, ho_ten, so_dien_thoai').eq('so_dien_thoai', phone).maybeSingle()
  return data
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  try {
    const body = await req.json().catch(() => ({}))
    const action = body.action || ''

    // danh sách dịch vụ — public, không cần SĐT
    if (action === 'danh_sach_dich_vu') {
      const { data } = await supabase.from('dich_vu')
        .select('id, ten, gia_co_ban, nhom_hien_thi, thoi_gian_phut')
        .eq('is_active', true).eq('hien_tren_menu', true)
        .order('nhom_hien_thi').order('ten')
      return json({ ok: true, dich_vu: data || [] })
    }

    // Ưu đãi (khuyến mãi đang chạy) — public
    if (action === 'uu_dai') {
      const today = todayVN()
      const { data } = await supabase.from('khuyen_mai')
        .select('id, ten, mo_ta, loai_km, gia_goc, gia_km, mua_x, tang_y, pct_giam_lan, ngay_bat_dau, ngay_ket_thuc')
        .eq('trang_thai', 'active').gte('ngay_ket_thuc', today)
        .order('ngay_bat_dau', { ascending: false }).limit(50)
      return json({ ok: true, uu_dai: data || [] })
    }

    // Các action còn lại cần xác thực SĐT
    const { phone, err } = await resolvePhone(body)
    if (!phone) return json({ ok: false, error: err || 'Không xác thực được SĐT' }, 401)
    const khach = await timKhach(phone)

    if (action === 'the_cua_toi') {
      if (!khach) return json({ ok: true, khach: null, the: [], message: 'Chưa tìm thấy hồ sơ khách với SĐT này' })
      const { data } = await supabase.from('the_lieu_trinh')
        .select('id, ma_the, ten_dich_vu, so_buoi_tong, so_buoi_da_dung, so_buoi_con_lai, gia_tri_the, trang_thai, ngay_het_han')
        .eq('khach_hang_id', khach.id)
        .order('trang_thai').order('ngay_het_han', { ascending: false })
      return json({ ok: true, khach: { id: khach.id, ho_ten: khach.ho_ten }, the: data || [] })
    }

    if (action === 'voucher_cua_toi') {
      const today = todayVN()
      const { data } = await supabase.from('voucher_ma')
        .select('code, nhom, phan_tram, han_dung, trang_thai')
        .eq('so_dien_thoai', phone).eq('trang_thai', 'chua_dung').gte('han_dung', today)
        .order('han_dung')
      const { data: cfg } = await supabase.from('voucher_nhom_config').select('nhom, ten_hien_thi')
      const tenNhom = Object.fromEntries((cfg || []).map((c: any) => [c.nhom, c.ten_hien_thi]))
      const list = (data || []).map((v: any) => ({ ...v, ten_nhom: tenNhom[v.nhom] || v.nhom }))
      return json({ ok: true, voucher: list })
    }

    if (action === 'dat_lich') {
      const { dich_vu_id, ten_dich_vu, ngay_hen, gio_hen, ghi_chu, thoi_luong_phut } = body
      if (!ngay_hen || !gio_hen) return json({ ok: false, error: 'Thiếu ngày/giờ hẹn' }, 400)
      if (ngay_hen < todayVN()) return json({ ok: false, error: 'Không đặt lịch trong quá khứ' }, 400)
      const { data, error } = await supabase.from('lich_hen').insert({
        ten_khach: khach?.ho_ten || body.ten_khach || 'Khách Zalo',
        sdt_khach: phone, khach_hang_id: khach?.id || null,
        dich_vu_id: dich_vu_id || null, ten_dich_vu: ten_dich_vu || null,
        thoi_luong_phut: thoi_luong_phut || 60,
        ngay_hen, gio_hen, ghi_chu: ghi_chu || null,
        trang_thai: 'cho_xac_nhan', nguoi_nhap: 'Zalo Mini App',
      }).select('id').single()
      if (error) return json({ ok: false, error: error.message }, 500)
      return json({ ok: true, lich_hen_id: data.id, message: 'Đã gửi yêu cầu đặt lịch, Hannah Spa sẽ xác nhận sớm!' })
    }

    if (action === 'lich_hen_cua_toi') {
      let q = supabase.from('lich_hen')
        .select('id, ten_dich_vu, dich_vu_list, ngay_hen, gio_hen, trang_thai, ghi_chu')
        .order('ngay_hen', { ascending: false }).limit(30)
      q = khach ? q.or(`khach_hang_id.eq.${khach.id},sdt_khach.eq.${phone}`) : q.eq('sdt_khach', phone)
      const { data } = await q
      return json({ ok: true, lich_hen: data || [] })
    }

    if (action === 'lich_su_dich_vu') {
      if (!khach) return json({ ok: true, lich_su: [] })
      const { data: dons } = await supabase.from('don_hang')
        .select('id, ma_don, ngay, thuc_thu, con_no, trang_thai')
        .eq('khach_hang_id', khach.id).eq('is_test', false)
        .order('ngay', { ascending: false }).limit(20)
      const ids = (dons || []).map((d: any) => d.id)
      const ctMap: Record<string, string[]> = {}
      if (ids.length) {
        const { data: cts } = await supabase.from('don_hang_chi_tiet')
          .select('don_hang_id, loai_item, so_luong, dich_vu:dich_vu_id(ten), the:the_lieu_trinh_id(ten_dich_vu)')
          .in('don_hang_id', ids)
        for (const c of (cts || [])) {
          const a = c as any
          const ten = a.dich_vu?.ten || a.the?.ten_dich_vu || (a.loai_item === 'san_pham' ? 'Sản phẩm' : null)
          if (ten) (ctMap[a.don_hang_id] = ctMap[a.don_hang_id] || []).push(ten)
        }
      }
      const list = (dons || []).map((d: any) => ({ ...d, dich_vu: ctMap[d.id] || [] }))
      return json({ ok: true, lich_su: list })
    }

    if (action === 'danh_gia') {
      const so_sao = parseInt(body.so_sao, 10)
      if (!(so_sao >= 1 && so_sao <= 5)) return json({ ok: false, error: 'Vui lòng chọn 1–5 sao' }, 400)
      const { error } = await supabase.from('danh_gia').insert({
        khach_hang_id: khach?.id || null, so_dien_thoai: phone,
        don_hang_id: body.don_hang_id || null, so_sao, noi_dung: body.noi_dung || null, nguon: 'miniapp',
      })
      if (error) return json({ ok: false, error: error.message }, 500)
      return json({ ok: true, message: 'Cảm ơn bạn đã đánh giá Hannah Spa!' })
    }

    if (action === 'vong_quay') {
      if (!khach) return json({ ok: false, error: 'Chưa có hồ sơ khách — vui lòng đến spa 1 lần để được tham gia' }, 403)
      // Giới hạn 1 lần/ngày: kiểm tra voucher nguồn 'vong_quay' tạo hôm nay
      const today = todayVN()
      const { data: daQuay } = await supabase.from('voucher_ma')
        .select('code, nhom, phan_tram, han_dung').eq('khach_hang_id', khach.id).eq('nguon', 'vong_quay')
        .gte('gui_luc', today + 'T00:00:00').limit(1)
      if (daQuay && daQuay.length) {
        return json({ ok: true, da_quay_hom_nay: true, voucher: daQuay[0], message: 'Hôm nay bạn đã quay rồi, hẹn gặp lại ngày mai nhé!' })
      }
      // Chọn ngẫu nhiên 1 nhóm voucher đang bật
      const { data: nhoms } = await supabase.from('voucher_nhom_config').select('nhom, ten_hien_thi, phan_tram').eq('is_active', true)
      if (!nhoms || !nhoms.length) return json({ ok: false, error: 'Chưa cấu hình voucher' }, 500)
      const pick = nhoms[Math.floor(Math.random() * nhoms.length)]
      const { data: code, error } = await supabase.rpc('voucher_sinh_ma', { p_khach_hang_id: khach.id, p_nhom: pick.nhom })
      if (error) return json({ ok: false, error: error.message }, 500)
      // đánh dấu nguồn vong_quay
      await supabase.from('voucher_ma').update({ nguon: 'vong_quay' }).eq('code', code)
      return json({ ok: true, trung: true, voucher: { code, nhom: pick.nhom, ten_nhom: pick.ten_hien_thi, phan_tram: pick.phan_tram } })
    }

    return json({ ok: false, error: 'action không hợp lệ' }, 400)
  } catch (e) {
    return json({ ok: false, error: String((e as any)?.message || e) }, 500)
  }
})
