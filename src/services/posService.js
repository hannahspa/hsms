import { supabase } from '../lib/supabase'
import { todayISO } from '../lib/utils'
import { addDurationISO } from '../lib/dateMath'
import { calcServiceCommission, getCommissionPercent } from '../lib/serviceCommission'
import { buildTreatmentPolicy, getTreatmentCardDisplayValue } from '../lib/treatmentCardPolicy'

const PAYMENT_METHODS = new Set(['tien_mat', 'chuyen_khoan', 'quet_the', 'the_tra_truoc'])
const safeSearchTerm = (value) => String(value || '')
  .replace(/[,%()]/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()
const TREATMENT_CARD_SELECT = `
  *,
  combo:combo_id(
    id,
    ma_combo,
    ten_combo,
    nhom_dich_vu,
    menh_gia,
    gia_ban,
    thoi_han_so,
    thoi_han_don_vi,
    dich_vu:combo_lieu_trinh_dich_vu(*)
  )
`
const LINE_TREATMENT_SELECT = `
  ten_dich_vu,
  so_buoi_con_lai,
  so_buoi_tong,
  so_buoi_da_dung,
  gia_tri_the,
  ngay_het_han,
  combo_id,
  loai_the,
  is_khong_gioi_han,
  meta,
  combo:combo_id(
    id,
    ma_combo,
    ten_combo,
    nhom_dich_vu,
    menh_gia,
    gia_ban,
    thoi_han_so,
    thoi_han_don_vi,
    dich_vu:combo_lieu_trinh_dich_vu(*)
  ),
  khach_hang:khach_hang_id(ho_ten)
`

function shortStaffName(name = '') {
  const isRetired = /\(\s*Nghỉ Việc\s*\)/i.test(String(name))
  const baseName = String(name).replace(/\(\s*Nghỉ Việc\s*\)/i, '').trim()
  const parts = baseName.split(/\s+/).filter(Boolean)
  if (parts.length <= 2) return parts.join(' ')
  const displayName = parts.slice(-2).join(' ')
  return isRetired ? `${displayName} (Nghỉ Việc)` : displayName
}

function normalizePhone(value = '') {
  const digits = String(value || '').replace(/\D/g, '')
  if (digits.startsWith('84') && digits.length === 11) return `0${digits.slice(2)}`
  return digits
}

function hasMissingColumnError(error) {
  const message = String(error?.message || '')
  return error?.code === '42703' || /column .* does not exist/i.test(message)
}

async function findCustomerByPhone(phone) {
  if (!phone) return null
  const { data, error } = await supabase
    .from('khach_hang')
    .select('*')
    .eq('so_dien_thoai', phone)
    .maybeSingle()
  if (error) throw error
  return data || null
}

async function ensureCustomerForAppointment(appointment = {}) {
  if (appointment.khach_hang_id) return appointment.khach_hang_id

  const phone = normalizePhone(appointment.sdt_khach || appointment.so_dien_thoai)
  const name = String(appointment.ten_khach || appointment.ho_ten_kh || '').trim()
  const existing = await findCustomerByPhone(phone)
  if (existing?.id) return existing.id

  const payload = {
    ho_ten: name || 'Khach dat hen',
    so_dien_thoai: phone || null,
    nguon: 'lich_hen',
  }

  const { data, error } = await supabase
    .from('khach_hang')
    .insert(payload)
    .select('*')
    .single()

  if (error) {
    const retry = await findCustomerByPhone(phone)
    if (retry?.id) return retry.id
    throw error
  }

  return data.id
}

async function findAppointmentService(appointment = {}) {
  if (appointment.dich_vu_id) {
    const { data, error } = await supabase
      .from('dich_vu')
      .select('id, ten, gia_co_ban, ti_le_hoa_hong, promotion_config')
      .eq('id', appointment.dich_vu_id)
      .maybeSingle()
    if (error) throw error
    if (data) return data
  }

  const serviceName = String(appointment.ten_dich_vu || '').trim()
  if (!serviceName) return null

  const { data, error } = await supabase
    .from('dich_vu')
    .select('id, ten, gia_co_ban, ti_le_hoa_hong, promotion_config')
    .ilike('ten', `%${serviceName}%`)
    .eq('is_active', true)
    .limit(1)
  if (error) throw error
  return data?.[0] || null
}

function withTreatmentDisplayValue(card = {}) {
  const displayValue = getTreatmentCardDisplayValue(card)
  return {
    ...card,
    gia_tri_the_goc: card.gia_tri_the,
    gia_tri_hien_thi: displayValue,
    gia_tri_the: displayValue,
  }
}

export const posService = {
  // ═══════════════════════════════════════════════════
  // ĐƠN HÀNG
  // ═══════════════════════════════════════════════════

  async createOrder({ khachHangId = null, ghiChu = '', nguoiTao }) {
    const { data, error } = await supabase
      .from('don_hang')
      .insert({
        khach_hang_id: khachHangId || null,
        nguoi_tao: nguoiTao,
        ngay: todayISO(),
        ghi_chu: ghiChu,
      })
      .select('*')
      .single()
    if (error) throw error
    return data
  },

  async createDraftOrderFromAppointment(appointment = {}, { nguoiTao } = {}) {
    if (!appointment?.id) {
      throw new Error('Can lich hen da luu truoc khi tao don POS.')
    }

    const { data: existing, error: existingError } = await supabase
      .from('don_hang')
      .select('id')
      .eq('lich_hen_id', appointment.id)
      .eq('trang_thai', 'draft')
      .maybeSingle()
    if (existingError && !hasMissingColumnError(existingError)) throw existingError
    if (existing?.id) return { orderId: existing.id, reused: true }

    const khachHangId = await ensureCustomerForAppointment(appointment)
    const noteParts = [
      'Tao tu lich hen',
      appointment.ngay_hen ? `ngay ${appointment.ngay_hen}` : null,
      appointment.gio_hen ? `luc ${String(appointment.gio_hen).slice(0, 5)}` : null,
      appointment.ten_dich_vu ? `dich vu: ${appointment.ten_dich_vu}` : null,
    ].filter(Boolean)

    const insertData = {
      khach_hang_id: khachHangId || null,
      nguoi_tao: nguoiTao || null,
      ngay: appointment.ngay_hen || todayISO(),
      ghi_chu: noteParts.join(' - '),
      lich_hen_id: appointment.id,
    }

    let order = null
    const inserted = await supabase
      .from('don_hang')
      .insert(insertData)
      .select('*')
      .single()

    if (inserted.error) {
      if (inserted.error.code === '23505') {
        const { data: duplicate, error: duplicateError } = await supabase
          .from('don_hang')
          .select('id')
          .eq('lich_hen_id', appointment.id)
          .eq('trang_thai', 'draft')
          .maybeSingle()
        if (!duplicateError && duplicate?.id) return { orderId: duplicate.id, reused: true }
      }
      if (!hasMissingColumnError(inserted.error)) throw inserted.error
      const { lich_hen_id, ...fallbackData } = insertData
      const fallback = await supabase
        .from('don_hang')
        .insert(fallbackData)
        .select('*')
        .single()
      if (fallback.error) throw fallback.error
      order = fallback.data
    } else {
      order = inserted.data
    }

    const service = await findAppointmentService(appointment)
    const serviceName = (service?.ten || appointment.ten_dich_vu || '').trim()
    const tiLe = service ? getCommissionPercent(service, 'ktv') : 0

    // ── Khách đến DÙNG THẺ đã mua? Tìm thẻ active khớp tên dịch vụ ──
    const norm = (s) => String(s || '').normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/đ/g, 'd').toLowerCase().replace(/\s+/g, ' ').trim()
    let matchedCard = null
    if (khachHangId && serviceName) {
      try {
        const { data: cards } = await supabase
          .from('the_lieu_trinh')
          .select('id, ten_dich_vu, so_buoi_con_lai, so_buoi_tong, gia_tri_the, trang_thai')
          .eq('khach_hang_id', khachHangId)
          .eq('trang_thai', 'active')
        const target = norm(serviceName)
        matchedCard = (cards || []).find((c) => {
          if ((c.so_buoi_con_lai || 0) <= 0) return false
          const cn = norm(c.ten_dich_vu)
          return cn && target && (cn === target || cn.includes(target) || target.includes(cn))
        }) || null
      } catch { matchedCard = null }
    }

    if (matchedCard) {
      // Dùng thẻ: 0đ với khách, tour KTV = (giá trị thẻ / số buổi) × % hoa hồng
      const perSession = Math.round((matchedCard.gia_tri_the || 0) / Math.max(1, matchedCard.so_buoi_tong || 1))
      const tienTourCard = Math.round(perSession * (tiLe || 0) / 100)
      await this.addLineItem(order.id, {
        loai_item: 'the_lieu_trinh',
        the_lieu_trinh_id: matchedCard.id,
        dich_vu_id: service?.id || appointment.dich_vu_id || null,
        nhan_vien_id: appointment.nhan_vien_id || null,
        so_luong: 1,
        don_gia: 0,
        thanh_tien: 0,
        ti_le_hoa_hong: tiLe || null,
        tien_tour: tienTourCard,
        tien_hoa_hong: 0,
        ghi_chu: `Dung the tu lich hen: ${matchedCard.ten_dich_vu}`,
        meta: { source: 'lich_hen', lichHenId: appointment.id, tenDichVu: matchedCard.ten_dich_vu, dungThe: true },
      })
    } else if (service || serviceName) {
      // Dịch vụ tính tiền bình thường
      const donGia = Number(service?.gia_co_ban || 0)
      const tienTour = service ? calcServiceCommission(service, donGia, 'ktv') : 0
      await this.addLineItem(order.id, {
        loai_item: 'dich_vu',
        dich_vu_id: service?.id || appointment.dich_vu_id || null,
        nhan_vien_id: appointment.nhan_vien_id || null,
        so_luong: 1,
        don_gia: donGia,
        thanh_tien: donGia,
        ti_le_hoa_hong: tiLe || null,
        tien_tour: tienTour,
        tien_hoa_hong: 0,
        ghi_chu: `Tu lich hen: ${serviceName || 'dich vu'}`,
        meta: {
          source: 'lich_hen',
          lichHenId: appointment.id,
          tenDichVu: serviceName || null,
          ngayHen: appointment.ngay_hen || null,
          gioHen: appointment.gio_hen || null,
        },
      })
    }
    // Không có dịch vụ lẫn tên DV → KHÔNG thêm dòng rác; Lễ Tân tự chọn trong POS

    const appointmentUpdate = { khach_hang_id: khachHangId || null }
    if (appointment.trang_thai === 'cho_xac_nhan') appointmentUpdate.trang_thai = 'da_xac_nhan'
    const { error: appointmentError } = await supabase
      .from('lich_hen')
      .update(appointmentUpdate)
      .eq('id', appointment.id)
    if (appointmentError) throw appointmentError

    return { orderId: order.id, customerId: khachHangId, reused: false }
  },

  async getOrder(id) {
    const { data, error } = await supabase
      .from('don_hang')
      .select('*, khach_hang:khach_hang_id(ho_ten, so_dien_thoai)')
      .eq('id', id)
      .single()
    if (error) throw error
    return data
  },

  summarizeOrder(order) {
    const items = order.items || []
    const payments = order.payments || []
    const tour = items.reduce((s, i) => {
      const isService = i.loai_item === 'dich_vu' || i.loai_item === 'the_lieu_trinh'
      if (!isService) return s
      return s + (i.tien_tour || i.tien_hoa_hong || 0)
    }, 0)
    const hoaHong = items.reduce((s, i) => {
      const isSaleItem = i.loai_item === 'san_pham' || i.loai_item === 'the_moi'
      if (!isSaleItem) return s
      return s + (i.tien_hoa_hong || 0)
    }, 0)
    const itemNames = items.map(i =>
      i.meta?.tenDichVu || i.the_lieu_trinh?.ten_dich_vu || i.dich_vu?.ten || i.san_pham?.ten || i.loai_item
    ).filter(Boolean)
    const subtotal = items.reduce((sum, item) => sum + ((item.don_gia || 0) * (item.so_luong || 1)), 0)
    const itemTotal = items.reduce((sum, item) => sum + (item.thanh_tien || 0), 0)
    const discountTotal = Math.max(0, subtotal - itemTotal)
    const paidTotal = payments.reduce((sum, payment) => sum + (payment.so_tien || 0), 0)
    const staffMap = {}
    items.forEach(i => {
      const staffName = i.nhan_vien?.ho_ten || i.meta?.myspaStaffDisplay
      if (!staffName && !i.nhan_vien_id) return
      const key = i.nhan_vien_id || staffName
      if (!staffMap[key]) {
        staffMap[key] = {
          id: i.nhan_vien_id || null,
          name: staffName || 'Nhân viên',
          short_name: shortStaffName(staffName || 'Nhân viên'),
          tour: 0,
          hoaHong: 0,
        }
      }
      // Dịch vụ + thẻ liệu trình → tiền KTV là TOUR
      // Sản phẩm + thẻ mới → tiền KTV là HOA HỒNG (tien_hoa_hong)
      const isServiceItem = i.loai_item === 'dich_vu' || i.loai_item === 'the_lieu_trinh'
      if (isServiceItem) {
        // tien_tour là cột chuẩn; fallback tien_hoa_hong cho data T5 import cũ ghi nhầm cột
        staffMap[key].tour += (i.tien_tour || i.tien_hoa_hong || 0)
      } else {
        // san_pham, the_moi → hoa hồng
        staffMap[key].hoaHong += (i.tien_hoa_hong || 0)
      }
    })
    const staffCompensations = Object.values(staffMap)
    const paymentLabels = payments.map(p => p.hinh_thuc).filter(Boolean)

    return {
      ...order,
      items,
      payments,
      item_summary: itemNames.join(', '),
      staff_summary: staffCompensations.map(s => s.short_name).join(', '),
      staff_compensations: staffCompensations,
      payment_summary: paymentLabels.join(' + '),
      don_gia_tong: subtotal,
      giam_gia_tong: discountTotal,
      da_thu_tong: paidTotal,
      vat_tong: order.vat || 0,
      nen_tang: 'Bán hàng',
      tien_tour_tong: tour,
      hoa_hong_tong: hoaHong,
    }
  },

  async enrichOrders(orders) {
    const list = orders || []
    if (list.length === 0) return []

    const orderIds = list.map(o => o.id).filter(Boolean)
    if (orderIds.length === 0) return list.map(order => this.summarizeOrder(order))

    try {
      const [itemsRes, paymentsRes] = await Promise.all([
        supabase
          .from('don_hang_chi_tiet')
          .select(`
            *,
            dich_vu:dich_vu_id(ten, danh_muc),
            san_pham:san_pham_id(ten, don_vi),
            the_lieu_trinh:the_lieu_trinh_id(${LINE_TREATMENT_SELECT}),
            nhan_vien:nhan_vien_id(ho_ten, avatar_url)
          `)
          .in('don_hang_id', orderIds)
          .order('created_at', { ascending: true }),
        supabase
          .from('thanh_toan')
          .select('*')
          .in('don_hang_id', orderIds)
          .order('created_at', { ascending: true }),
      ])
      if (itemsRes.error) throw itemsRes.error
      if (paymentsRes.error) throw paymentsRes.error

      const itemsByOrder = {}
      const paymentsByOrder = {}
      ;(itemsRes.data || []).forEach(item => {
        const key = item.don_hang_id
        if (!itemsByOrder[key]) itemsByOrder[key] = []
        itemsByOrder[key].push(item)
      })
      ;(paymentsRes.data || []).forEach(payment => {
        const key = payment.don_hang_id
        if (!paymentsByOrder[key]) paymentsByOrder[key] = []
        paymentsByOrder[key].push(payment)
      })

      return list.map(order => this.summarizeOrder({
        ...order,
        items: itemsByOrder[order.id] || [],
        payments: paymentsByOrder[order.id] || [],
      }))
    } catch {
      return list.map(order => this.summarizeOrder(order))
    }
  },

  async getOrdersByDate(date) {
    const { data, error } = await supabase
      .from('don_hang')
      .select('*, khach_hang:khach_hang_id(ho_ten, so_dien_thoai)')
      .eq('ngay', date)
      .order('ngay', { ascending: false })
      .order('ma_don', { ascending: false })
    if (error) throw error
    return this.enrichOrders(data || [])
  },

  async getOrdersByRange({ fromDate, toDate, limit = 500 }) {
    let query = supabase
      .from('don_hang')
      .select('*, khach_hang:khach_hang_id(ho_ten, so_dien_thoai)')
      .order('ngay', { ascending: false })
      .order('ma_don', { ascending: false })
      .limit(limit)

    if (fromDate) query = query.gte('ngay', fromDate)
    if (toDate) query = query.lte('ngay', toDate)

    const { data, error } = await query
    if (error) throw error
    return this.enrichOrders(data || [])
  },

  async getOrdersPage({ page = 1, pageSize = 50, fromDate = null, toDate = null, search = '' } = {}) {
    const from = Math.max(0, (page - 1) * pageSize)
    const to = from + pageSize - 1
    const keyword = safeSearchTerm(search)
    let query = supabase
      .from('don_hang')
      .select('*, khach_hang:khach_hang_id(ho_ten, so_dien_thoai)', { count: 'exact' })
      .order('ngay', { ascending: false })
      .order('ma_don', { ascending: false })
      .range(from, to)

    if (fromDate) query = query.gte('ngay', fromDate)
    if (toDate) query = query.lte('ngay', toDate)
    if (keyword.length >= 2) {
      const { data: customerMatches, error: customerError } = await supabase
        .from('khach_hang')
        .select('id')
        .or(`ho_ten.ilike.%${keyword}%,so_dien_thoai.ilike.%${keyword}%`)
        .limit(200)
      if (customerError) throw customerError

      const customerIds = (customerMatches || []).map(k => k.id).filter(Boolean)
      const orderFilters = [`ma_don.ilike.%${keyword}%`, `ghi_chu.ilike.%${keyword}%`]
      if (customerIds.length > 0) orderFilters.push(`khach_hang_id.in.(${customerIds.join(',')})`)
      query = query.or(orderFilters.join(','))
    }

    const { data, error, count } = await query
    if (error) throw error
    return { orders: await this.enrichOrders(data || []), total: count || 0 }
  },

  async searchOrders(query, limit = 50) {
    const result = await this.getOrdersPage({ page: 1, pageSize: limit, search: query })
    return result.orders
  },

  // ═══════════════════════════════════════════════════
  // DÒNG HÀNG
  // ═══════════════════════════════════════════════════

  async addLineItem(orderId, item) {
    const insertData = {
      don_hang_id: orderId,
      loai_item: item.loai_item,
      dich_vu_id: item.dich_vu_id || null,
      san_pham_id: item.san_pham_id || null,
      the_lieu_trinh_id: item.the_lieu_trinh_id || null,
      nhan_vien_id: item.nhan_vien_id || null,
      so_luong: item.so_luong || 1,
      don_gia: item.don_gia,
      thanh_tien: item.thanh_tien,
      ti_le_hoa_hong: item.ti_le_hoa_hong || null,
      tien_tour: item.tien_tour || 0,
      tien_hoa_hong: item.tien_hoa_hong || 0,
      ghi_chu: item.ghi_chu || '',
    }
    // Chỉ thêm meta nếu có (dùng cho the_moi — lưu thông tin tạo thẻ)
    if (item.meta) {
      insertData.meta = item.meta
    }
    const { data, error } = await supabase
      .from('don_hang_chi_tiet')
      .insert(insertData)
      .select('*')
      .single()
    if (error) throw error
    return data
  },

  async getLineItems(orderId) {
    const { data, error } = await supabase
      .from('don_hang_chi_tiet')
      .select(`
        *,
        dich_vu:dich_vu_id(ten, danh_muc),
        san_pham:san_pham_id(ten, don_vi),
        the_lieu_trinh:the_lieu_trinh_id(${LINE_TREATMENT_SELECT}),
        nhan_vien:nhan_vien_id(ho_ten, avatar_url)
      `)
      .eq('don_hang_id', orderId)
      .order('created_at', { ascending: true })
    if (error) throw error
    return data || []
  },

  async removeLineItem(lineItemId) {
    const { error } = await supabase
      .from('don_hang_chi_tiet')
      .delete()
      .eq('id', lineItemId)
    if (error) throw error
  },

  async updateLineItemQty(lineItemId, soLuong, donGia) {
    const thanhTien = soLuong * donGia
    const { data, error } = await supabase
      .from('don_hang_chi_tiet')
      .update({ so_luong: soLuong, thanh_tien: thanhTien })
      .eq('id', lineItemId)
      .select('*')
      .single()
    if (error) throw error
    return data
  },

  async updateLineItemDiscount(lineItemId, thanhTien) {
    const { error } = await supabase
      .from('don_hang_chi_tiet')
      .update({ thanh_tien: thanhTien })
      .eq('id', lineItemId)
    if (error) throw error
  },

  // ═══════════════════════════════════════════════════
  // THANH TOÁN
  // ═══════════════════════════════════════════════════

  async addPayment(orderId, { hinhThuc, soTien, ghiChu = '' }) {
    if (!PAYMENT_METHODS.has(hinhThuc)) {
      throw new Error('Phuong thuc thanh toan khong hop le.')
    }
    const { data, error } = await supabase
      .from('thanh_toan')
      .insert({
        don_hang_id: orderId,
        hinh_thuc: hinhThuc,
        so_tien: soTien,
        ghi_chu: ghiChu,
      })
      .select('*')
      .single()
    if (error) throw error
    return data
  },

  async removePayments(paymentIds = []) {
    const ids = paymentIds.filter(Boolean)
    if (ids.length === 0) return
    const { error } = await supabase
      .from('thanh_toan')
      .delete()
      .in('id', ids)
    if (error) throw error
  },

  async getPayments(orderId) {
    const { data, error } = await supabase
      .from('thanh_toan')
      .select('*')
      .eq('don_hang_id', orderId)
      .order('created_at', { ascending: true })
    if (error) throw error
    return data || []
  },

  async getOrderStaffLedger(orderId) {
    const { data, error } = await supabase
      .from('nhan_vien_thu_nhap')
      .select(`
        id, loai, so_tien, ti_le, doanh_so_tinh, trang_thai,
        nhan_vien:nhan_vien_id(ho_ten, vi_tri),
        line_item:don_hang_chi_tiet_id(loai_item)
      `)
      .eq('don_hang_id', orderId)
      .order('created_at', { ascending: true })
    if (error) return []
    return data || []
  },

  async getCustomerSnapshot(khachHangId, { cardLimit = 100, historyLimit = 500, debtLimit = 50 } = {}) {
    if (!khachHangId) return null

    const [customerRes, cardsRes, historyRes, debtRes] = await Promise.all([
      supabase
        .from('khach_hang')
        .select('*')
        .eq('id', khachHangId)
        .maybeSingle(),
      supabase
        .from('the_lieu_trinh')
        .select(TREATMENT_CARD_SELECT)
        .eq('khach_hang_id', khachHangId)
        .order('created_at', { ascending: false })
        .limit(cardLimit),
      supabase
        .from('lich_su_dich_vu_kh')
        .select('*')
        .eq('khach_hang_id', khachHangId)
        .order('ngay', { ascending: false })
        .limit(historyLimit),
      supabase
        .from('cong_no_khach_hang')
        .select('loai, so_tien, so_du_con_lai, ngay, ghi_chu')
        .eq('khach_hang_id', khachHangId)
        .order('created_at', { ascending: false })
        .limit(debtLimit),
    ])

    const debts = debtRes.data || []
    const debtBalance = debts[0]?.so_du_con_lai != null
      ? debts[0].so_du_con_lai
      : debts.reduce((sum, row) => {
          if (row.loai === 'phat_sinh') return sum + (row.so_tien || 0)
          return sum - (row.so_tien || 0)
        }, 0)

    const cards = (cardsRes.data || []).map(withTreatmentDisplayValue)
    const activeCards = cards.filter(c => c.trang_thai === 'active' && (c.so_buoi_con_lai || 0) > 0)

    return {
      customer: customerRes.data || null,
      cards,
      activeCards,
      history: historyRes.data || [],
      debtBalance,
      debtRows: debts,
      errors: {
        customer: customerRes.error?.message || null,
        cards: cardsRes.error?.message || null,
        history: historyRes.error?.message || null,
        debt: debtRes.error?.message || null,
      },
    }
  },

  async removePayment(paymentId) {
    const { error } = await supabase
      .from('thanh_toan')
      .delete()
      .eq('id', paymentId)
    if (error) throw error
  },

  // Đổi PTTT của đơn đã chốt — RPC atomic, đồng bộ luôn doanh_thu (Admin). Migration 065.
  async updatePaymentMethod(paymentId, newHinhThuc) {
    const { data, error } = await supabase
      .rpc('pos_update_payment_method', { p_payment_id: paymentId, p_new_hinh_thuc: newHinhThuc })
    if (error) throw error
    if (data?.success === false) throw new Error(data.error || 'Không đổi được hình thức thanh toán')
    return data
  },

  // ═══════════════════════════════════════════════════
  // CHỐT ĐƠN & HỦY ĐƠN (RPC)
  // ═══════════════════════════════════════════════════

  async finalizeOrder(orderId, { giamGia = 0, vat = 0, conNo = 0, ghiChu = '' } = {}) {
    // RPC bản 7 tham số (migration 049 + 055): CÓ p_vat.
    // Phải truyền p_vat để thuc_thu = tong_tien - giam_gia + vat khớp số tiền khách trả.
    const params = {
      p_don_hang_id: orderId,
      p_trang_thai:  'da_thanh_toan',
      p_giam_gia:    giamGia,
      p_vat:         vat,
      p_con_no:      conNo,
      p_ghi_chu:     ghiChu,
    }
    const { data, error } = await supabase.rpc('pos_finalize_order', params)
    if (error) throw error
    // CHUA_DU_BUOI: không throw — trả về data để UI hiện modal thu nợ rồi retry
    if (data?.success === false && data?.error_code !== 'CHUA_DU_BUOI') {
      throw new Error(data.error || 'Không thể chốt đơn')
    }
    return data
  },

  async voidOrder(orderId) {
    const { data, error } = await supabase
      .rpc('pos_void_order', { p_don_hang_id: orderId })
    if (error) throw error
    if (data?.success === false) throw new Error(data.error || 'Không thể hủy đơn')
    return data
  },

  // Admin: mở lại đơn để sửa (đảo ngược tác động → draft, giữ dòng hàng). Migration 071.
  async reopenOrder(orderId) {
    const { data, error } = await supabase
      .rpc('pos_reopen_order', { p_don_hang_id: orderId })
    if (error) throw error
    if (data?.success === false) throw new Error(data.error || 'Không thể mở lại đơn')
    return data
  },

  // Admin: xóa vĩnh viễn đơn đã hủy. Migration 071.
  async hardDeleteOrder(orderId) {
    const { data, error } = await supabase
      .rpc('pos_hard_delete_order', { p_don_hang_id: orderId })
    if (error) throw error
    if (data?.success === false) throw new Error(data.error || 'Không thể xóa đơn')
    return data
  },

  // Admin: sửa ngày + giờ tạo của 1 đơn (đồng bộ doanh_thu theo ngày đơn).
  async updateOrderDateTime(orderId, ngay, createdAtISO) {
    const { error } = await supabase
      .from('don_hang')
      .update({ ngay, created_at: createdAtISO })
      .eq('id', orderId)
    if (error) throw error
    // Đồng bộ ngày của doanh thu phát sinh từ đơn (nếu đã chốt) để báo cáo khớp.
    await supabase.from('doanh_thu').update({ ngay }).eq('don_hang_id', orderId)
    return true
  },

  // ═══════════════════════════════════════════════════
  // CATALOG — DỊCH VỤ & SẢN PHẨM
  // ═══════════════════════════════════════════════════

  async getService(id) {
    if (!id) return null
    const { data, error } = await supabase
      .from('dich_vu')
      .select('*')
      .eq('id', id)
      .maybeSingle()
    if (error) throw error
    return data || null
  },

  async getServices(search = '', category = '') {
    let q = supabase
      .from('dich_vu')
      .select('*')
      .eq('is_active', true)
      .eq('hien_tren_menu', true)
      .order('thu_tu', { ascending: true })
      .order('ten', { ascending: true })

    if (search) q = q.ilike('ten', `%${search}%`)
    if (category) q = q.eq('danh_muc', category)
    // nếu category === '' thì lấy tất cả

    const { data, error } = await q
    if (error) throw error
    return data || []
  },

  async getServiceCategories() {
    const { data, error } = await supabase
      .from('dich_vu')
      .select('danh_muc')
      .eq('is_active', true)
      .eq('hien_tren_menu', true)
      .not('danh_muc', 'is', null)
      .order('danh_muc')
    if (error) throw error
    return [...new Set((data || []).map(d => d.danh_muc))]
  },

  async getSellableProducts(search = '') {
    const { data, error } = await supabase
      .from('kho_san_pham')
      .select('*')
      .eq('is_active', true)
      .in('loai', ['ban_khach', 'tieu_hao'])
      .gt('ton_kho', 0)
      .order('created_at', { ascending: false })
    if (error) throw error
    const q = search.trim().toLowerCase()
    return (data || [])
      .filter(p => p.hien_tren_pos !== false)
      .filter(p => {
        if (!q) return true
        return [p.ten, p.ma_sp, p.sku, p.barcode, p.nhan_hieu, p.danh_muc]
          .filter(Boolean).join(' ').toLowerCase().includes(q)
      })
  },

  // ═══════════════════════════════════════════════════
  // KHÁCH HÀNG
  // ═══════════════════════════════════════════════════

  async searchCustomers(query, limit = 20) {
    const { data, error } = await supabase
      .from('khach_hang')
      .select('*')
      .eq('is_active', true)
      .or(`ho_ten.ilike.%${query}%,so_dien_thoai.ilike.%${query}%`)
      .order('lan_cuoi_den', { ascending: false })
      .limit(limit)
    if (error) throw error
    return data || []
  },

  async quickCreateCustomer({ hoTen, soDienThoai }) {
    const { data, error } = await supabase
      .from('khach_hang')
      .insert({
        ho_ten: hoTen,
        so_dien_thoai: soDienThoai,
        nguon: 'Walk-in',
      })
      .select('*')
      .single()
    if (error) throw error
    return data
  },

  async getCustomerCardsHistory(khachHangId) {
    const { data, error } = await supabase
      .from('the_lieu_trinh')
      .select(TREATMENT_CARD_SELECT)
      .eq('khach_hang_id', khachHangId)
      .neq('trang_thai', 'active')
      .order('ngay_mua', { ascending: false })
      .limit(20)
    if (error) throw error
    return (data || []).map(withTreatmentDisplayValue)
  },

  async getCustomerCards(khachHangId) {
    const { data, error } = await supabase
      .from('the_lieu_trinh')
      .select(TREATMENT_CARD_SELECT)
      .eq('khach_hang_id', khachHangId)
      .eq('trang_thai', 'active')
      .order('ngay_het_han', { ascending: true })
    if (error) throw error
    return data || []
  },

  // Lấy danh sách thẻ còn nợ (da_thanh_toan < gia_tri_the)
  async getCustomerDebt(khachHangId) {
    const { data, error } = await supabase
      .from('v_cong_no_tong_hop')
      .select('the_lieu_trinh_id, ten_dich_vu, gia_tri_the, da_thanh_toan, con_no, pct_da_tra, du_30_pct, trang_thai, ngay_mua, ma_don, don_hang_id')
      .eq('khach_hang_id', khachHangId)
      .order('con_no', { ascending: false })
    if (error) throw error
    return data || []
  },

  // Thu nợ thẻ liệu trình — gọi RPC pos_thu_no_the
  async thuNoThe({ theLieuTrinhId, soTien, hinhThuc, nguoiThu, ghiChu = null }) {
    const { data, error } = await supabase.rpc('pos_thu_no_the', {
      p_the_lieu_trinh_id: theLieuTrinhId,
      p_so_tien:           soTien,
      p_hinh_thuc:         hinhThuc,
      p_nguoi_thu:         nguoiThu,
      p_ghi_chu:           ghiChu,
    })
    if (error) throw error
    return data
  },

  // ═══════════════════════════════════════════════════
  // KTV
  // ═══════════════════════════════════════════════════

  async markCreatedComboCards(orderId, comboItems = []) {
    for (const item of comboItems) {
      const comboId = item.meta?.comboId
      const tenDichVu = item.meta?.tenDichVu
      if (!comboId || !tenDichVu) continue
      const { error } = await supabase
        .from('the_lieu_trinh')
        .update({
          combo_id: comboId,
          loai_the: 'combo_lieu_trinh',
          is_khong_gioi_han: !!item.meta?.khongGioiHan,
          source: 'pos_combo',
          meta: {
            combo_id: comboId,
            ma_combo: item.meta?.maCombo || null,
            ten_combo: tenDichVu,
            dich_vu: item.meta?.dichVuCombo || [],
          },
        })
        .eq('don_hang_id', orderId)
        .eq('ten_dich_vu', tenDichVu)
      if (error) throw error
    }
  },

  async getKTVs() {
    const { data, error } = await supabase
      .from('nhan_vien')
      .select('id, ho_ten, vi_tri, avatar_url')
      .eq('trang_thai', 'dang_lam')
      .in('vi_tri', ['ktv', 'le_tan'])
      .order('ho_ten')
    if (error) throw error
    return data || []
  },

  // ═══════════════════════════════════════════════════
  // THỐNG KÊ NHANH
  // ═══════════════════════════════════════════════════

  async getTodayStats() {
    const today = todayISO()
    const { data, error } = await supabase
      .from('don_hang')
      .select('id, thuc_thu, trang_thai')
      .eq('ngay', today)
      .neq('trang_thai', 'huy')
    if (error) throw error

    const orders = data || []
    return {
      soDon: orders.length,
      tongThu: orders.reduce((s, o) => s + (o.thuc_thu || 0), 0),
    }
  },

  // ═══════════════════════════════════════════════════
  // MUA THẺ LIỆU TRÌNH MỚI
  // ═══════════════════════════════════════════════════

  async getServicesForCards() {
    const { data, error } = await supabase
      .from('dich_vu')
      .select('id, ten, danh_muc, gia_co_ban, ti_le_hoa_hong, promotion_config')
      .eq('is_active', true)
      .order('danh_muc', { ascending: true })
      .order('ten', { ascending: true })
    if (error) throw error
    return data || []
  },

  async getTreatmentCombos() {
    const { data, error } = await supabase
      .from('combo_lieu_trinh')
      .select('*, dich_vu:combo_lieu_trinh_dich_vu(*)')
      .eq('trang_thai', 'active')
      .order('ten_combo', { ascending: true })
    if (error) throw error
    return (data || []).map(withTreatmentDisplayValue)
  },

  async getTreatmentCardTourPolicy(card) {
    if (!card?.id) return buildTreatmentPolicy(card)

    const { data: rows, error } = await supabase
      .from('don_hang_chi_tiet')
      .select(`
        id,
        nhan_vien_id,
        so_luong,
        tien_tour,
        created_at,
        nhan_vien:nhan_vien_id(ho_ten),
        don_hang:don_hang_id(ngay, trang_thai)
      `)
      .eq('the_lieu_trinh_id', card.id)
      .eq('loai_item', 'the_lieu_trinh')
      .order('created_at', { ascending: true })
    if (error) throw error

    const finalRows = (rows || []).filter(row => {
      const status = row.don_hang?.trang_thai
      return status && status !== 'draft' && status !== 'huy'
    })
    const paidRows = finalRows.filter(row => Number(row.tien_tour || 0) > 0)
    const allowedById = new Map()
    paidRows.forEach(row => {
      if (!row.nhan_vien_id) return
      allowedById.set(row.nhan_vien_id, row.nhan_vien?.ho_ten || 'Nhân viên')
    })
    const latestPaid = [...paidRows].reverse().find(row => Number(row.tien_tour || 0) > 0)
    const latestUse = [...finalRows]
      .map(row => row.don_hang?.ngay)
      .filter(Boolean)
      .sort()
      .pop()

    return buildTreatmentPolicy(card, {
      paidTourSessions: paidRows.reduce((sum, row) => sum + Number(row.so_luong || 1), 0) || paidRows.length,
      allowedStaffIds: [...allowedById.keys()],
      allowedStaffNames: [...allowedById.values()],
      suggestedTour: Number(latestPaid?.tien_tour || 0),
      lastUseDate: latestUse || null,
    })
  },

  async useTreatmentCard(theLieuTrinhId, soLuong = 1) {
    const { data: card, error: fetchErr } = await supabase
      .from('the_lieu_trinh')
      .select('so_buoi_da_dung, so_buoi_con_lai, so_buoi_tong')
      .eq('id', theLieuTrinhId)
      .single()
    if (fetchErr) throw fetchErr

    const daDung = (card.so_buoi_da_dung || 0) + soLuong
    // so_buoi_con_lai là GENERATED ALWAYS column → không update trực tiếp
    const trangThai = (card.so_buoi_tong - daDung) <= 0 ? 'het_buoi' : 'active'

    const { error } = await supabase
      .from('the_lieu_trinh')
      .update({ so_buoi_da_dung: daDung, trang_thai: trangThai })
      .eq('id', theLieuTrinhId)
    if (error) throw error
  },

  async createTreatmentCard({ khachHangId, donHangId, dichVuId, tenDichVu, soBuoiMua, soBuoiTang, giaTri, nhanVienBanId, ngayHetHan }) {
    const soBuoiTong = soBuoiMua + soBuoiTang
    const insertData = {
      khach_hang_id: khachHangId,
      don_hang_id: donHangId,
      dich_vu_id: dichVuId || null,
      nhan_vien_ban_id: nhanVienBanId || null,
      ten_dich_vu: tenDichVu,
      so_buoi_tong: soBuoiTong,
      so_buoi_da_dung: 0,
      // so_buoi_con_lai là GENERATED ALWAYS column → DB tự tính
      gia_tri_the: giaTri,
      ngay_mua: todayISO(),
      trang_thai: 'active',
    }
    if (ngayHetHan) insertData.ngay_het_han = ngayHetHan
    const { data, error } = await supabase
      .from('the_lieu_trinh')
      .insert(insertData)
      .select('*')
      .single()
    if (error) throw error
    return data
  },

  async createComboTreatmentCard({ khachHangId, donHangId, combo, nhanVienBanId }) {
    const primary = combo?.dich_vu?.[0] || null
    const today = todayISO()
    const ngayHetHan = addDurationISO(today, combo?.thoi_han_so || 1, combo?.thoi_han_don_vi || 'year')

    const soBuoiTong = primary?.khong_gioi_han ? 9999 : (primary?.so_lan || 1)
    const insertData = {
      khach_hang_id: khachHangId,
      don_hang_id: donHangId,
      combo_id: combo.id,
      dich_vu_id: primary?.dich_vu_id || null,
      nhan_vien_ban_id: nhanVienBanId || null,
      ten_dich_vu: combo.ten_combo,
      so_buoi_tong: soBuoiTong,
      so_buoi_da_dung: 0,
      gia_tri_the: combo.gia_ban || 0,
      ngay_mua: today,
      ngay_het_han: ngayHetHan,
      trang_thai: 'active',
      loai_the: 'combo_lieu_trinh',
      is_khong_gioi_han: !!primary?.khong_gioi_han,
      source: 'pos_combo',
      ghi_chu: combo.ghi_chu || '',
      meta: {
        combo_id: combo.id,
        ma_combo: combo.ma_combo,
        ten_combo: combo.ten_combo,
        dich_vu: combo.dich_vu || [],
      },
    }
    const { data, error } = await supabase
      .from('the_lieu_trinh')
      .insert(insertData)
      .select('*')
      .single()
    if (error) throw error
    return data
  },
}
