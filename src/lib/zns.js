// Helper gửi ZNS (Zalo Notification Service) qua edge function zalo-zns.
// Luôn bọc an toàn: lỗi/thiếu SĐT KHÔNG chặn luồng nghiệp vụ chính.
import { supabase } from './supabase'
import { todayISO } from './utils'

const SPA_ADDRESS = '39 Nam Kỳ Khởi Nghĩa, Ninh Kiều, Cần Thơ'

// Định dạng ngày yyyy-mm-dd → dd/mm/yyyy (Zalo ZNS date)
function dmy(ngayISO) {
  if (!ngayISO) return ''
  const [y, m, d] = String(ngayISO).slice(0, 10).split('-')
  return `${d}/${m}/${y}`
}

// Gửi ZNS theo template_key (zns_<key> trong marketing_ai_config). Không throw.
export async function guiZNS(templateKey, phone, params) {
  if (!phone) return { ok: false, skip: 'no_phone' }
  try {
    const { data, error } = await supabase.functions.invoke('zalo-zns', {
      body: { template_key: templateKey, phone, params },
    })
    if (error) throw error
    return data
  } catch (e) {
    console.warn('guiZNS lỗi (bỏ qua, không chặn luồng):', e?.message || e)
    return { ok: false, error: e?.message || String(e) }
  }
}

// ── Các helper theo nghiệp vụ — tham số khớp template đã duyệt của OA Hannah Spa ──

// Xác nhận đặt lịch (template 287035): customer_name, booking_code, schedule_time, services, address
export function znsXacNhanLich({ ten_khach, ma_lich, gio_hen, ngay_hen, dich_vu, sdt }) {
  return guiZNS('xac_nhan_lich', sdt, {
    customer_name: ten_khach || 'Quý khách',
    booking_code: ma_lich || '—',
    schedule_time: `${String(gio_hen || '').slice(0, 5)} ${dmy(ngay_hen)}`.trim(),
    services: dich_vu || 'Dịch vụ tại Hannah Spa',
    address: SPA_ADDRESS,
  })
}

// Nhắc lịch hẹn (template 287038): customer_name, booking_code, schedule_time, service, address
export function znsNhacLich({ ten_khach, ma_lich, gio_hen, ngay_hen, dich_vu, sdt }) {
  return guiZNS('nhac_lich', sdt, {
    customer_name: ten_khach || 'Quý khách',
    booking_code: ma_lich || '—',
    schedule_time: `${String(gio_hen || '').slice(0, 5)} ${dmy(ngay_hen)}`.trim(),
    service: dich_vu || 'Dịch vụ tại Hannah Spa',
    address: SPA_ADDRESS,
  })
}

// Hóa đơn / xác nhận đơn (template 596818): customer_name, order_code, payment_status, product_name, cost, date, staff_name
export function znsHoaDon({ ten_khach, ma_don, ngay, tong_tien, trang_thai, dich_vu, nhan_vien, sdt }) {
  return guiZNS('hoa_don', sdt, {
    order_code: ma_don || '—',
    date: dmy(ngay) || dmy(todayISO()),
    cost: String(tong_tien ?? 0),
    payment_status: trang_thai || 'Đã thanh toán',
    customer_name: ten_khach || 'Quý khách',
    product_name: dich_vu || 'Dịch vụ tại Hannah Spa',
    staff_name: nhan_vien || 'Hannah Spa',
  })
}

// Mua liệu trình (template 596824): customer_name, treatment_name, treatment_code, services, cost, expiry_date, date, order_code
export function znsMuaLieuTrinh({ ten_khach, ten_the, ma_the, dich_vu, gia_tri, ngay_het_han, ngay, ma_don, sdt }) {
  return guiZNS('mua_lieu_trinh', sdt, {
    customer_name: ten_khach || 'Quý khách',
    treatment_name: ten_the || 'Liệu trình tại Hannah Spa',
    treatment_code: ma_the || '—',
    services: dich_vu || ten_the || 'Dịch vụ tại Hannah Spa',
    cost: String(gia_tri ?? 0),
    expiry_date: ngay_het_han ? dmy(ngay_het_han) : 'Không giới hạn',
    date: dmy(ngay) || dmy(todayISO()),
    order_code: ma_don || '—',
  })
}

// Thẻ liệu trình (template 287029): customer_name, treatment_code, service, times, used_time, remain_time, date, order_code
export function znsTheLieuTrinh({ ten_khach, ma_the, dich_vu, tong_buoi, da_dung, con_lai, ngay, ma_don, sdt }) {
  return guiZNS('the_lieu_trinh', sdt, {
    customer_name: ten_khach || 'Quý khách',
    treatment_code: ma_the || '—',
    service: dich_vu || 'Liệu trình tại Hannah Spa',
    times: String(tong_buoi ?? ''),
    used_time: String(da_dung ?? ''),
    remain_time: String(con_lai ?? ''),
    date: dmy(ngay) || dmy(todayISO()),
    order_code: ma_don || '—',
  })
}
