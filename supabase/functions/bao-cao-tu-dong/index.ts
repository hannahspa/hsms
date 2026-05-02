import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const RECIPIENTS = [
  'quocnam2201@gmail.com',
]

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('vi-VN').format(amount) + 'đ'
}

function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

async function getReportData(startDate: string, endDate: string) {
  const [dtRes, cpRes, ckRes, viRes] = await Promise.all([
    supabase.from('doanh_thu').select('*').gte('ngay', startDate).lte('ngay', endDate),
    supabase.from('chi_phi').select('*, danh_muc_chi_phi(ten, parent_id)').gte('ngay', startDate).lte('ngay', endDate),
    supabase.from('chuyen_khoan_noi_bo').select('*').gte('ngay', startDate).lte('ngay', endDate),
    supabase.from('so_du_vi_thuc_te').select('*').order('thu_tu'),
  ])

  const doanhThu = dtRes.data || []
  const chiPhi   = cpRes.data || []
  const vi       = viRes.data || []

  // Tổng doanh thu theo hình thức
  const tongTienMat     = doanhThu.filter(d => d.hinh_thuc === 'tien_mat').reduce((s, d) => s + d.so_tien, 0)
  const tongChuyenKhoan = doanhThu.filter(d => d.hinh_thuc === 'chuyen_khoan').reduce((s, d) => s + d.so_tien, 0)
  const tongQuetThe     = doanhThu.filter(d => d.hinh_thuc === 'quet_the').reduce((s, d) => s + d.so_tien, 0)
  const tongTheTraTruoc = doanhThu.filter(d => d.hinh_thuc === 'the_tra_truoc').reduce((s, d) => s + d.so_tien, 0)
  const tongDoanhThu    = doanhThu.reduce((s, d) => s + d.so_tien, 0)
  const thucThu         = tongDoanhThu - tongTheTraTruoc
  const tongChi         = chiPhi.reduce((s, c) => s + c.so_tien, 0)
  const loiNhuan        = thucThu - tongChi

  // Chi phí theo nhóm
  const nhomChi: Record<string, number> = {}
  chiPhi.forEach(cp => {
    const tenNhom = (cp.danh_muc_chi_phi as any)?.ten || 'Khác'
    nhomChi[tenNhom] = (nhomChi[tenNhom] || 0) + cp.so_tien
  })

  return { tongTienMat, tongChuyenKhoan, tongQuetThe, tongTheTraTruoc, tongDoanhThu, thucThu, tongChi, loiNhuan, nhomChi, vi }
}

function buildEmailHTML(title: string, period: string, data: any): string {
  const { tongTienMat, tongChuyenKhoan, tongQuetThe, tongTheTraTruoc, tongDoanhThu, thucThu, tongChi, loiNhuan, nhomChi, vi } = data

  const nhomChiRows = Object.entries(nhomChi)
    .sort(([,a], [,b]) => (b as number) - (a as number))
    .map(([ten, tong]) => `
      <tr>
        <td style="padding:8px 12px;color:#555;font-size:13px;">${ten}</td>
        <td style="padding:8px 12px;text-align:right;color:#C0392B;font-weight:600;font-size:13px;">${formatCurrency(tong as number)}</td>
      </tr>
    `).join('')

  const viRows = vi.map((v: any) => `
    <tr>
      <td style="padding:8px 12px;color:#555;font-size:13px;">${v.icon || ''} ${v.ten}</td>
      <td style="padding:8px 12px;text-align:right;color:#1A5276;font-weight:700;font-size:13px;">${formatCurrency(v.so_du_hien_tai)}</td>
    </tr>
  `).join('')

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#FAF7F4;font-family:'Segoe UI',sans-serif;">
  <div style="max-width:520px;margin:0 auto;padding:24px 16px;">

    <!-- Header -->
    <div style="background:linear-gradient(135deg,#C9A96E,#A0714F,#7D5A3C);border-radius:20px;padding:28px 24px;text-align:center;margin-bottom:20px;">
      <div style="font-size:28px;margin-bottom:8px;">🌸</div>
      <div style="color:white;font-size:22px;font-weight:800;margin-bottom:4px;">Hannah Beauty & Spa</div>
      <div style="color:rgba(255,255,255,0.85);font-size:14px;">${title}</div>
      <div style="color:rgba(255,255,255,0.7);font-size:12px;margin-top:4px;">${period}</div>
    </div>

    <!-- Doanh Thu -->
    <div style="background:white;border-radius:16px;padding:20px;margin-bottom:16px;box-shadow:0 2px 12px rgba(139,94,60,0.08);">
      <div style="font-weight:800;font-size:15px;color:#1A1209;margin-bottom:14px;padding-bottom:10px;border-bottom:1px solid #F0EBE6;">💰 Doanh Thu</div>
      <table style="width:100%;border-collapse:collapse;">
        <tr><td style="padding:6px 12px;color:#555;font-size:13px;">💵 Tiền Mặt</td><td style="padding:6px 12px;text-align:right;color:#2D7A4F;font-weight:600;font-size:13px;">${formatCurrency(tongTienMat)}</td></tr>
        <tr><td style="padding:6px 12px;color:#555;font-size:13px;">🏦 Chuyển Khoản</td><td style="padding:6px 12px;text-align:right;color:#2D7A4F;font-weight:600;font-size:13px;">${formatCurrency(tongChuyenKhoan)}</td></tr>
        <tr><td style="padding:6px 12px;color:#555;font-size:13px;">💳 Quẹt Thẻ</td><td style="padding:6px 12px;text-align:right;color:#2D7A4F;font-weight:600;font-size:13px;">${formatCurrency(tongQuetThe)}</td></tr>
        <tr><td style="padding:6px 12px;color:#555;font-size:13px;">🎫 Thẻ Trả Trước</td><td style="padding:6px 12px;text-align:right;color:#8B7355;font-weight:600;font-size:13px;">${formatCurrency(tongTheTraTruoc)}</td></tr>
        <tr style="border-top:2px solid #F0EBE6;">
          <td style="padding:10px 12px;color:#1A1209;font-weight:800;font-size:14px;">Tổng Doanh Thu</td>
          <td style="padding:10px 12px;text-align:right;color:#2D7A4F;font-weight:800;font-size:16px;">${formatCurrency(tongDoanhThu)}</td>
        </tr>
        <tr>
          <td style="padding:6px 12px;color:#1A1209;font-weight:700;font-size:13px;">Thực Thu</td>
          <td style="padding:6px 12px;text-align:right;color:#2D7A4F;font-weight:700;font-size:14px;">${formatCurrency(thucThu)}</td>
        </tr>
      </table>
    </div>

    <!-- Chi Phí -->
    <div style="background:white;border-radius:16px;padding:20px;margin-bottom:16px;box-shadow:0 2px 12px rgba(139,94,60,0.08);">
      <div style="font-weight:800;font-size:15px;color:#1A1209;margin-bottom:14px;padding-bottom:10px;border-bottom:1px solid #F0EBE6;">💸 Chi Phí</div>
      <table style="width:100%;border-collapse:collapse;">
        ${nhomChiRows}
        <tr style="border-top:2px solid #F0EBE6;">
          <td style="padding:10px 12px;color:#1A1209;font-weight:800;font-size:14px;">Tổng Chi Phí</td>
          <td style="padding:10px 12px;text-align:right;color:#C0392B;font-weight:800;font-size:16px;">${formatCurrency(tongChi)}</td>
        </tr>
      </table>
    </div>

    <!-- Lợi Nhuận -->
    <div style="background:${loiNhuan >= 0 ? 'linear-gradient(135deg,#F0FDF4,#DCFCE7)' : 'linear-gradient(135deg,#FFF5F5,#FFE4E4)'};border-radius:16px;padding:20px;margin-bottom:16px;border:1px solid ${loiNhuan >= 0 ? 'rgba(45,122,79,0.2)' : 'rgba(192,57,43,0.2)'};">
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <div style="font-weight:800;font-size:16px;color:#1A1209;">📊 Lợi Nhuận</div>
        <div style="font-weight:800;font-size:22px;color:${loiNhuan >= 0 ? '#2D7A4F' : '#C0392B'};">${loiNhuan >= 0 ? '+' : ''}${formatCurrency(loiNhuan)}</div>
      </div>
    </div>

    <!-- Số Dư Ví -->
    <div style="background:white;border-radius:16px;padding:20px;margin-bottom:16px;box-shadow:0 2px 12px rgba(139,94,60,0.08);">
      <div style="font-weight:800;font-size:15px;color:#1A1209;margin-bottom:14px;padding-bottom:10px;border-bottom:1px solid #F0EBE6;">🏦 Số Dư Ví</div>
      <table style="width:100%;border-collapse:collapse;">
        ${viRows}
        <tr style="border-top:2px solid #F0EBE6;">
          <td style="padding:10px 12px;color:#1A1209;font-weight:800;font-size:14px;">Tổng Tài Sản</td>
          <td style="padding:10px 12px;text-align:right;color:#1A5276;font-weight:800;font-size:16px;">${formatCurrency(vi.reduce((s: number, v: any) => s + v.so_du_hien_tai, 0))}</td>
        </tr>
      </table>
    </div>

    <!-- Footer -->
    <div style="text-align:center;color:#B8A898;font-size:11px;margin-top:16px;">
      Hannah Beauty & Spa • 39 Nam Kỳ Khởi Nghĩa, Cần Thơ<br>
      Email tự động từ HSMS • Không cần trả lời
    </div>
  </div>
</body>
</html>`
}

async function sendEmail(subject: string, html: string) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Hannah Spa <onboarding@resend.dev>',
      to: RECIPIENTS,
      subject,
      html,
    }),
  })
  return res.json()
}

serve(async (req) => {
  const { type } = await req.json().catch(() => ({ type: 'daily' }))

  const now = new Date()
  // UTC+7
  const vn = new Date(now.getTime() + 7 * 60 * 60 * 1000)
  const today = vn.toISOString().split('T')[0]

  let startDate: string, endDate: string, title: string, period: string

  if (type === 'daily') {
    startDate = today
    endDate   = today
    title     = '📋 Báo Cáo Ngày'
    period    = `Ngày ${formatDate(today)}`
  } else if (type === 'weekly') {
    const day = vn.getDay()
    const diffToMon = day === 0 ? -6 : 1 - day
    const mon = new Date(vn)
    mon.setDate(vn.getDate() + diffToMon)
    const sun = new Date(mon)
    sun.setDate(mon.getDate() + 6)
    startDate = mon.toISOString().split('T')[0]
    endDate   = sun.toISOString().split('T')[0]
    title     = '📊 Báo Cáo Tuần'
    period    = `${formatDate(startDate)} – ${formatDate(endDate)}`
  } else {
    // monthly
    startDate = `${vn.getFullYear()}-${String(vn.getMonth() + 1).padStart(2, '0')}-01`
    const lastDay = new Date(vn.getFullYear(), vn.getMonth() + 1, 0)
    endDate   = lastDay.toISOString().split('T')[0]
    title     = '📅 Báo Cáo Tháng'
    period    = `Tháng ${vn.getMonth() + 1}/${vn.getFullYear()}`
  }

  const data = await getReportData(startDate, endDate)
  const html = buildEmailHTML(title, period, data)
  const result = await sendEmail(`${title} — Hannah Spa (${period})`, html)

  return new Response(JSON.stringify({ ok: true, result }), {
    headers: { 'Content-Type': 'application/json' },
  })
})