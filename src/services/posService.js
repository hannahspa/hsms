import { supabase } from '../lib/supabase'
import { todayISO, getNowVN } from '../lib/utils'

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

  async getOrder(id) {
    const { data, error } = await supabase
      .from('don_hang')
      .select('*, khach_hang:khach_hang_id(ho_ten, so_dien_thoai)')
      .eq('id', id)
      .single()
    if (error) throw error
    return data
  },

  async getOrdersByDate(date) {
    const { data, error } = await supabase
      .from('don_hang')
      .select('*, khach_hang:khach_hang_id(ho_ten, so_dien_thoai)')
      .eq('ngay', date)
      .neq('trang_thai', 'huy')
      .order('created_at', { ascending: false })
    if (error) throw error
    return data || []
  },

  async searchOrders(query, limit = 50) {
    const { data, error } = await supabase
      .from('don_hang')
      .select('*, khach_hang:khach_hang_id(ho_ten, so_dien_thoai)')
      .or(`ma_don.ilike.%${query}%,khach_hang.ho_ten.ilike.%${query}%`)
      .order('created_at', { ascending: false })
      .limit(limit)
    if (error) throw error
    return data || []
  },

  // ═══════════════════════════════════════════════════
  // DÒNG HÀNG
  // ═══════════════════════════════════════════════════

  async addLineItem(orderId, item) {
    const { data, error } = await supabase
      .from('don_hang_chi_tiet')
      .insert({
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
        tien_hoa_hong: item.tien_hoa_hong || 0,
        ghi_chu: item.ghi_chu || '',
      })
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
        the_lieu_trinh:the_lieu_trinh_id(ten_dich_vu, so_buoi_con_lai, khach_hang:khach_hang_id(ho_ten)),
        nhan_vien:nhan_vien_id(ho_ten)
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

  // ═══════════════════════════════════════════════════
  // THANH TOÁN
  // ═══════════════════════════════════════════════════

  async addPayment(orderId, { hinhThuc, soTien, ghiChu = '' }) {
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

  async getPayments(orderId) {
    const { data, error } = await supabase
      .from('thanh_toan')
      .select('*')
      .eq('don_hang_id', orderId)
      .order('created_at', { ascending: true })
    if (error) throw error
    return data || []
  },

  async removePayment(paymentId) {
    const { error } = await supabase
      .from('thanh_toan')
      .delete()
      .eq('id', paymentId)
    if (error) throw error
  },

  // ═══════════════════════════════════════════════════
  // CHỐT ĐƠN & HỦY ĐƠN (RPC)
  // ═══════════════════════════════════════════════════

  async finalizeOrder(orderId, { giamGia = 0, conNo = 0, ghiChu = '' } = {}) {
    const { data, error } = await supabase
      .rpc('pos_finalize_order', {
        p_don_hang_id: orderId,
        p_trang_thai: 'da_thanh_toan',
        p_giam_gia: giamGia,
        p_con_no: conNo,
        p_ghi_chu: ghiChu,
      })
    if (error) throw error
    return data
  },

  async voidOrder(orderId) {
    const { data, error } = await supabase
      .rpc('pos_void_order', { p_don_hang_id: orderId })
    if (error) throw error
    return data
  },

  // ═══════════════════════════════════════════════════
  // CATALOG — DỊCH VỤ & SẢN PHẨM
  // ═══════════════════════════════════════════════════

  async getServices(search = '', category = '') {
    let q = supabase
      .from('dich_vu')
      .select('*')
      .eq('is_active', true)
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
      .not('danh_muc', 'is', null)
      .order('danh_muc')
    if (error) throw error
    return [...new Set((data || []).map(d => d.danh_muc))]
  },

  async getSellableProducts(search = '') {
    let q = supabase
      .from('kho_san_pham')
      .select('*')
      .eq('is_active', true)
      .in('loai', ['ban_khach', 'tieu_hao'])
      .gt('ton_kho', 0)
      .order('ten', { ascending: true })

    if (search) q = q.ilike('ten', `%${search}%`)

    const { data, error } = await q
    if (error) throw error
    return data || []
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

  async getCustomerCards(khachHangId) {
    const { data, error } = await supabase
      .from('the_lieu_trinh')
      .select('*')
      .eq('khach_hang_id', khachHangId)
      .eq('trang_thai', 'active')
      .order('ngay_het_han', { ascending: true })
    if (error) throw error
    return data || []
  },

  // ═══════════════════════════════════════════════════
  // KTV
  // ═══════════════════════════════════════════════════

  async getKTVs() {
    const { data, error } = await supabase
      .from('nhan_vien')
      .select('id, ho_ten, vi_tri')
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
}
