import { useState, useEffect, useCallback, useRef } from 'react'
import { posService } from '../../services/posService'
import { supabase } from '../../lib/supabase'
import { formatCurrency, getNowVN, todayISO } from '../../lib/utils'
import { calcCommissionRates } from '../../lib/serviceCommission'
import { getCardComboService, getTreatmentCardDisplayValue } from '../../lib/treatmentCardPolicy'
import { useAuth } from '../../context/AuthContext'
import I from '../../components/shared/Icons'
import PosOrderHistory from './PosOrderHistory'
import PosProductCatalog from './PosProductCatalog'
import KtvPopupComponent from './components/KtvPopup'
import CartLine from './components/CartLine'
import DebtPaymentModal from './components/DebtPaymentModal'
import PaymentLines from './components/PaymentLines'
import StaffCommissionPanel from './components/StaffCommissionPanel'
import DatePicker from '../../components/shared/DatePicker'
import { parseVND, fmtDate, getInitials, LieuTrinhCard } from './posShared'
import { HINH_THUC_THU } from '../../constants/enums'
import { C, FONT } from '../../constants/colors'

const PTTT_OPTS = HINH_THUC_THU

// ── PosCreateOrder ────────────────────────────────────────────────────────────
function PosCreateOrder({ resumeOrderId }) {
  const { user } = useAuth()

  // Order — local khi chưa lưu, DB mode khi đã lưu/resume
  const [lineItems, setLineItems]       = useState([])
  const [savedOrderId, setSavedOrderId] = useState(null)  // null = local, uuid = đã lưu DB

  // Ngày + giờ tạo đơn (sửa được) — mặc định hiện tại, load từ đơn khi resume
  const [orderNgay, setOrderNgay] = useState(() => todayISO())
  const [orderGio, setOrderGio]   = useState(() => {
    const n = getNowVN()
    return `${String(n.getHours()).padStart(2, '0')}:${String(n.getMinutes()).padStart(2, '0')}`
  })
  const [showOrderDate, setShowOrderDate] = useState(false)

  // Customer
  const [isGuest, setIsGuest]           = useState(true)
  const [guestName, setGuestName]       = useState('')
  const [guestPhone, setGuestPhone]     = useState('')
  const [selectedCustomer, setSelectedCustomer] = useState(null)
  const [customerCards, setCustomerCards]       = useState([])
  const [customerDebt, setCustomerDebt]         = useState([])
  const [cardHistory, setCardHistory]           = useState([])
  const [showCardHistory, setShowCardHistory]   = useState(false)
  const [custSearch, setCustSearch]     = useState('')
  const [custResults, setCustResults]   = useState([])
  // Modal thu nợ
  const [debtModal, setDebtModal]       = useState(null)   // { the: <debt_row> }
  const [debtSoTien, setDebtSoTien]     = useState('')
  const [debtHinhThuc, setDebtHinhThuc] = useState('tien_mat')
  const [debtLoading, setDebtLoading]   = useState(false)
  const [custOpen, setCustOpen]         = useState(false)
  // Ref: payments đã insert cho order hiện tại (tránh insert 2 lần khi retry checkout)
  const paymentsInserted = useRef(false)
  const [custLoading, setCustLoading]   = useState(false)

  // Right panel
  const [rightTab, setRightTab]   = useState('don_hang')
  const [giamDVPct, setGiamDVPct] = useState('')
  const [giamDVVnd, setGiamDVVnd] = useState('')
  const [giamMode, setGiamMode]   = useState('pct')   // 'pct' | 'vnd'
  const [vatPct, setVatPct]       = useState('')
  const [maKM, setMaKM]           = useState('')
  const [todayStats, setTodayStats] = useState({ soDon: 0, tongThu: 0 })
  const [loading, setLoading]     = useState(false)

  // Nhân viên per-order
  const [orderStaff, setOrderStaff]   = useState([])

  // Payment inline
  const [payLines, setPayLines]     = useState([{ _id: 1, soTien: 0, hinhThuc: 'tien_mat' }])
  const [ghiChuDon, setGhiChuDon]   = useState('')
  const _payId = useRef(1)

  // KTV
  const [ktvList, setKtvList]   = useState([])
  const [ktvPopup, setKtvPopup] = useState(null)

  const custTimer = useRef(null)

  // ── Load ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    posService.getTodayStats().then(s => setTodayStats(s))
    posService.getKTVs().then(d => setKtvList(d || []))
  }, [])

  // Resume đơn nháp từ danh sách
  useEffect(() => {
    if (!resumeOrderId) return
    setSavedOrderId(resumeOrderId)
    Promise.all([
      posService.getOrder(resumeOrderId),
      posService.getLineItems(resumeOrderId),
    ]).then(([order, items]) => {
      // Restore customer
      if (order.khach_hang) {
        setSelectedCustomer({ id: order.khach_hang_id, ho_ten: order.khach_hang.ho_ten, so_dien_thoai: order.khach_hang.so_dien_thoai })
        setCustSearch(order.khach_hang.ho_ten)
        setIsGuest(false)
      }
      // Ngày + giờ của đơn (cho sửa)
      if (order.ngay) setOrderNgay(order.ngay)
      if (order.created_at) {
        const vn = new Date(new Date(order.created_at).toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }))
        setOrderGio(`${String(vn.getHours()).padStart(2, '0')}:${String(vn.getMinutes()).padStart(2, '0')}`)
      }
      // items từ DB dùng id làm _lid để handlers nhất quán
      setLineItems((items || []).map(i => ({ ...i, _lid: i.id })))
    }).catch(err => { alert('Lỗi tải đơn: ' + err.message) })
  }, [resumeOrderId])

  useEffect(() => {
    if (!selectedCustomer?.id) {
      setCustomerCards([])
      setCustomerDebt([])
      setCardHistory([])
      setShowCardHistory(false)
      return
    }
    posService.getCustomerCards(selectedCustomer.id)
      .then(cards => setCustomerCards(cards || []))
      .catch(() => setCustomerCards([]))
    posService.getCustomerCardsHistory(selectedCustomer.id)
      .then(hist => setCardHistory(hist || []))
      .catch(() => setCardHistory([]))
    posService.getCustomerDebt(selectedCustomer.id)
      .then(debt => setCustomerDebt(debt || []))
      .catch(() => setCustomerDebt([]))
  }, [selectedCustomer?.id])

  // Auto-fill ghi chú khi có thẻ liệu trình
  useEffect(() => {
    const theLTItems = lineItems.filter(i => i.loai_item === 'the_lieu_trinh' && i.the_lieu_trinh)
    if (theLTItems.length > 0) {
      const notes = theLTItems.map(i => {
        const c = i.the_lieu_trinh
        const conLai = Math.max(0, (c.so_buoi_con_lai || 0) - (i.so_luong || 1))
        return `${c.ten_dich_vu}: còn ${conLai}/${c.so_buoi_tong} buổi`
      })
      setGhiChuDon(notes.join('\n'))
    } else if (lineItems.length > 0) {
      setGhiChuDon('')
    }
  }, [lineItems])

  // ── Customer search ─────────────────────────────────────────────────────────
  const searchCustomers = useCallback(async (q) => {
    if (!q || q.length < 2) { setCustResults([]); return }
    setCustLoading(true)
    try { setCustResults(await posService.searchCustomers(q, 6)) }
    finally { setCustLoading(false) }
  }, [])

  const onCustChange = (v) => {
    setCustSearch(v)
    setCustOpen(true)
    clearTimeout(custTimer.current)
    custTimer.current = setTimeout(() => searchCustomers(v), 280)
  }

  const pickCustomer = (c) => {
    setSelectedCustomer(c)
    setIsGuest(false)
    setCustSearch(c.ho_ten)
    setCustOpen(false)
    setCustResults([])
  }

  const clearCustomer = () => {
    setSelectedCustomer(null)
    setCustSearch('')
    setCustResults([])
    setCustomerCards([])
    setCustomerDebt([])
    setCardHistory([])
    setDebtModal(null)
    setDebtSoTien('')
    setShowCardHistory(false)
  }

  // ── Item handlers — local hoặc DB nếu đã lưu ────────────────────────────────
  const handleAddCard = async (card) => {
    const comboService = getCardComboService(card)
    const displayValue = getTreatmentCardDisplayValue(card)
    let policy = null
    try {
      policy = await posService.getTreatmentCardTourPolicy(card)
    } catch (_) {}

    handleAddItem({
      loai_item:         'the_lieu_trinh',
      the_lieu_trinh_id: card.id,
      dich_vu_id:        card.dich_vu_id || comboService?.dich_vu_id || null,
      the_lieu_trinh:    {
        ten_dich_vu:        card.ten_dich_vu,
        so_buoi_con_lai:    card.so_buoi_con_lai,
        so_buoi_tong:       card.so_buoi_tong,
        so_buoi_da_dung:    card.so_buoi_da_dung,
        gia_tri_the:        displayValue,
        gia_tri_the_goc:    card.gia_tri_the_goc ?? card.gia_tri_the,
        gia_tri_hien_thi:   displayValue,
        ngay_het_han:       card.ngay_het_han,
        is_khong_gioi_han:  card.is_khong_gioi_han,
        combo_id:           card.combo_id,
        loai_the:           card.loai_the,
        meta:               card.meta || {},
        combo:              card.combo || null,
      },
      don_gia:    0,
      thanh_tien: 0,
      ti_le_hoa_hong: null,
      tien_tour:  policy?.suggestedTour || 0,
      tien_hoa_hong: 0,
      meta: {
        treatmentPolicy: policy,
        displayValue,
        originalCardValue: card.gia_tri_the_goc ?? card.gia_tri_the,
        comboService: comboService || null,
      },
    })
  }

  const handleAddItem = async (itemData) => {
    if (savedOrderId) {
      try {
        const inserted = await posService.addLineItem(savedOrderId, { so_luong: 1, ...itemData })
        setLineItems(prev => [...prev, { ...inserted, _lid: inserted.id, ...itemData }])
      } catch (err) { alert('Lỗi thêm dịch vụ: ' + err.message) }
    } else {
      const _lid = crypto.randomUUID()
      setLineItems(prev => [...prev, { _lid, so_luong: 1, ...itemData }])
    }
  }

  const calcNextTour = (item, nextThanhTien, qty) => {
    if (item?.meta?.tourMode === 'free_warranty') return 0
    if (item?.meta?.tourMode === 'amount' && item?.meta?.manualTourAmount != null) {
      return Math.round(Number(item.meta.manualTourAmount || 0))
    }
    const ktvRule = item?.meta?.myspaCommission?.ktv || null
    if (ktvRule?.type === 'absolute') return Math.round(Number(ktvRule.amount || 0) * qty)
    return Math.round(nextThanhTien * Number(item?.ti_le_hoa_hong || 0) / 100)
  }

  const handleRemoveItem = async (_lid) => {
    const item = lineItems.find(i => i._lid === _lid)
    if (savedOrderId && item?.id) {
      try {
        await posService.removeLineItem(item.id)
      } catch (err) {
        // KHÔNG nuốt lỗi: nếu xoá DB thất bại thì giữ nguyên dòng + báo để nhân viên biết
        alert('Lỗi xoá dịch vụ: ' + err.message)
        return
      }
    }
    setLineItems(prev => prev.filter(i => i._lid !== _lid))
  }

  const handleQtyChange = async (_lid, qty, donGia) => {
    const item = lineItems.find(i => i._lid === _lid)
    const nextThanhTien = qty * donGia
    const nextTour = item?.loai_item === 'dich_vu'
      ? calcNextTour(item, nextThanhTien, qty)
      : (item?.tien_tour || 0)
    const updatePayload = item?.loai_item === 'dich_vu'
      ? { so_luong: qty, thanh_tien: nextThanhTien, tien_tour: nextTour, tien_hoa_hong: 0 }
      : { so_luong: qty, thanh_tien: nextThanhTien }
    if (savedOrderId && item?.id) {
      try {
        await supabase.from('don_hang_chi_tiet').update(updatePayload).eq('id', item.id)
      } catch (_) {}
    }
    setLineItems(prev => prev.map(i => i._lid === _lid
      ? { ...i, ...updatePayload }
      : i))
  }

  const handleItemDiscount = async (_lid, newThanhTien) => {
    const item = lineItems.find(i => i._lid === _lid)
    const qty = Number(item?.so_luong || 1)
    const nextTour = item?.loai_item === 'dich_vu'
      ? calcNextTour(item, newThanhTien, qty)
      : (item?.tien_tour || 0)
    const updatePayload = item?.loai_item === 'dich_vu'
      ? { thanh_tien: newThanhTien, tien_tour: nextTour, tien_hoa_hong: 0 }
      : { thanh_tien: newThanhTien }
    if (savedOrderId && item?.id) {
      try {
        await supabase.from('don_hang_chi_tiet').update(updatePayload).eq('id', item.id)
      } catch (_) {}
    }
    setLineItems(prev => prev.map(i => i._lid === _lid
      ? { ...i, ...updatePayload }
      : i))
  }

  const handleAssignKTV = async (item, ktv, tiLe, tienTourFromPopup, tourMeta = null) => {
    const isSaleCommission = item.loai_item === 'the_moi' || item.loai_item === 'san_pham'
    const baseTT = item.loai_item === 'the_lieu_trinh' && item.the_lieu_trinh
      ? Math.round((item.the_lieu_trinh.gia_tri_the || 0) / Math.max(1, item.the_lieu_trinh.so_buoi_tong || 1)) * (item.so_luong || 1)
      : (item.thanh_tien || 0)
    const finalTiLe = tourMeta?.tourMode === 'free_warranty' ? 0 : tiLe
    const incomeAmount = tienTourFromPopup !== undefined ? Math.round(Number(tienTourFromPopup || 0)) : Math.round(baseTT * finalTiLe / 100)
    const tienTour       = isSaleCommission ? 0 : incomeAmount
    const tienCommission = isSaleCommission ? incomeAmount : 0

    // ── Với thẻ mới: tính lại hoa hồng theo rules và update meta ──
    // Cần thiết vì lễ tân có thể tick thẻ TRƯỚC khi chọn NV
    // → meta.tiLeCommKtv = 0 → migration 046 không ghi the_lieu_trinh_tu_van
    let updatedMeta = item.meta || null
    if (tourMeta) {
      updatedMeta = {
        ...(updatedMeta || {}),
        tourMode: tourMeta.tourMode || 'pct',
        manualTourAmount: tourMeta.manualTourAmount ?? null,
        pctTour: tourMeta.pctTour ?? null,
        baseTienTour: tourMeta.baseTienTour ?? null,
        treatmentPolicy: tourMeta.treatmentPolicy || updatedMeta?.treatmentPolicy || null,
      }
    }
    if (item.loai_item === 'the_moi' && item.meta) {
      const kmRef    = Number(item.meta.kmRefPct || 0)
      const coLt     = !!(item.meta.nhanVienTuVanLtId)
      const newRates = calcCommissionRates(kmRef, !!(ktv?.id), coLt)
      updatedMeta = {
        ...item.meta,
        nhanVienBanId: ktv?.id || null,
        tiLeCommKtv:   newRates.tiLeKtv,
        tiLeCommLt:    newRates.tiLeLt,
      }
    }

    if (savedOrderId && item?.id) {
      try {
        await supabase.from('don_hang_chi_tiet')
          .update({
            nhan_vien_id:    ktv?.id || null,
            ti_le_hoa_hong:  finalTiLe,
            tien_tour:       tienTour,
            tien_hoa_hong: tienCommission,
            ...(updatedMeta !== item.meta ? { meta: updatedMeta } : {}),
          })
          .eq('id', item.id)
      } catch (_) {}
    }
    setLineItems(prev => prev.map(i => i._lid === item._lid ? {
      ...i,
      nhan_vien_id:    ktv?.id || null,
      nhan_vien:       ktv || null,
      ti_le_hoa_hong:  finalTiLe,
      tien_tour:       tienTour,
      tien_hoa_hong: tienCommission,
      ...(updatedMeta !== item.meta ? { meta: updatedMeta } : {}),
    } : i))
    setKtvPopup(null)
  }

  const handleCreateGuest = async () => {
    if (!guestName.trim()) return
    try {
      const { data, error } = await supabase
        .from('khach_hang')
        .insert({ ho_ten: guestName.trim(), so_dien_thoai: guestPhone.trim() || null })
        .select().single()
      if (error) throw error
      setSelectedCustomer(data)
      setIsGuest(false)
      setCustSearch(data.ho_ten)
      setGuestName(''); setGuestPhone('')
    } catch (err) { alert('Lỗi tạo KH: ' + err.message) }
  }

  const resetCreateForm = () => {
    setLineItems([])
    setGiamDVPct(''); setGiamDVVnd(''); setVatPct(''); setMaKM('')
    _payId.current = 1
    setPayLines([{ _id: 1, soTien: 0, hinhThuc: 'tien_mat' }])
    setGhiChuDon('')
    setOrderStaff([])
    paymentsInserted.current = false
    // reset ngày/giờ về hiện tại cho đơn mới
    const n = getNowVN()
    setOrderNgay(todayISO())
    setOrderGio(`${String(n.getHours()).padStart(2, '0')}:${String(n.getMinutes()).padStart(2, '0')}`)
    clearCustomer()
  }

  const handleVoidOrder = async () => {
    if (lineItems.length === 0 && !savedOrderId) return
    if (!confirm('Hủy đơn hiện tại?')) return
    if (savedOrderId) {
      try { await posService.voidOrder(savedOrderId) } catch (_) {}
    }
    setSavedOrderId(null)
    resetCreateForm()
    window.location.href = '/pos'
  }

  // ── Thu nợ thẻ liệu trình ──────────────────────────────────────────────────
  const handleThuNo = async () => {
    if (!debtModal || !parseVND(debtSoTien)) return
    const isFromCheckout = !!debtModal.fromCheckout
    setDebtLoading(true)
    try {
      const result = await posService.thuNoThe({
        theLieuTrinhId: debtModal.the.the_lieu_trinh_id,
        soTien:         parseVND(debtSoTien),
        hinhThuc:       debtHinhThuc,
        nguoiThu:       user?.ho_ten || 'Lễ Tân',
      })
      if (!result?.success) throw new Error(result?.error || 'Lỗi thu nợ')

      // Refresh công nợ + thẻ
      const [debt, cards] = await Promise.all([
        posService.getCustomerDebt(selectedCustomer.id),
        posService.getCustomerCards(selectedCustomer.id),
      ])
      setCustomerDebt(debt || [])
      setCustomerCards(cards || [])
      setDebtModal(null)
      setDebtSoTien('')
      setDebtHinhThuc('tien_mat')

      // Nếu thu nợ để mở khoá checkout → tự động retry chốt đơn
      if (isFromCheckout) {
        setTimeout(() => handleConfirmOrder(), 200)
      }
    } catch (err) {
      alert('Lỗi thu nợ: ' + err.message)
    } finally {
      setDebtLoading(false)
    }
  }

  const handleSaveDraft = async () => {
    if (lineItems.length === 0) {
      alert('Thêm ít nhất 1 dịch vụ trước khi lưu đơn')
      return
    }
    if (savedOrderId) {
      // Đã lưu rồi → cập nhật lại khách hàng (có thể vừa đổi/tạo mới) rồi về danh sách
      try {
        await supabase.from('don_hang')
          .update({ khach_hang_id: selectedCustomer?.id || null })
          .eq('id', savedOrderId)
      } catch (err) { alert('Lỗi cập nhật khách hàng: ' + err.message); return }
      window.location.href = '/pos/danh-sach'
      return
    }
    setLoading(true)
    try {
      const order = await posService.createOrder({ nguoiTao: user?.id, khachHangId: selectedCustomer?.id || null })
      const oid = order.id
      const preparedItems = await prepareLineItemsForCheckout(null, lineItems)
      const inserted = await Promise.all(preparedItems.map(item => posService.addLineItem(oid, {
        loai_item:         item.loai_item,
        dich_vu_id:        item.dich_vu_id        || null,
        san_pham_id:       item.san_pham_id        || null,
        the_lieu_trinh_id: item.the_lieu_trinh_id  || null,
        nhan_vien_id:      item.nhan_vien_id        || null,
        so_luong:          item.so_luong || 1,
        don_gia:           item.don_gia  || 0,
        thanh_tien:        item.thanh_tien || 0,
        ti_le_hoa_hong:    item.ti_le_hoa_hong || null,
        tien_tour:         item.tien_tour || 0,
        tien_hoa_hong:   item.tien_hoa_hong || 0,
        ghi_chu:           item.ghi_chu || '',
        meta:              item.meta || undefined,
      })))
      setSavedOrderId(oid)
      // Gán DB id cho mỗi item (dùng làm _lid từ đây trở đi)
      setLineItems(preparedItems.map((item, i) => ({ ...item, ...inserted[i], _lid: inserted[i].id })))
      window.location.href = '/pos/danh-sach'
    } catch (err) { alert('Lỗi lưu đơn: ' + err.message) }
    finally { setLoading(false) }
  }

  // ── Payment line handlers ────────────────────────────────────────────────────
  const addPayLine = () => {
    _payId.current++
    const prevTotal = payLines.reduce((s, l) => s + l.soTien, 0)
    const conLai = Math.max(0, tongCuoi - prevTotal)
    setPayLines(p => [...p, { _id: _payId.current, soTien: conLai, hinhThuc: '' }])
  }
  const removePayLine = (id) => setPayLines(p => p.filter(l => l._id !== id))
  const updatePayLine = (id, field, val) => setPayLines(p => p.map(l => l._id === id ? { ...l, [field]: val } : l))

  // ── Toggle thẻ liệu trình inline ────────────────────────────────────────────
  const handleToggleCard = useCallback(async (_lid, toCard, {
    soBuoiMua, soBuoiTang, ngayHetHan, donGia, phanTramGiam = 0, giaBanBuoi,
    kmRefPct: kmRef,
  }) => {
    if (toCard && !selectedCustomer?.id) {
      alert('Vui lòng chọn khách hàng trước khi tạo thẻ liệu trình')
      return
    }
    const item = lineItems.find(i => i._lid === _lid)
    const soBuoiTong = soBuoiMua + soBuoiTang
    // Giá khách trả thật: ưu tiên giá bán/buổi (giá KM). Thành tiền = buổi mua × giá bán.
    const giaBan = (giaBanBuoi != null && giaBanBuoi > 0) ? Number(giaBanBuoi) : Math.round(donGia * (1 - Number(phanTramGiam) / 100))
    const thanhTien = Math.round(soBuoiMua * giaBan)

    const metaData = toCard ? {
      loai:        'the_moi',
      dichVuId:    item?.dich_vu_id  || null,
      tenDichVu:   item?.dich_vu?.ten || null,
      soBuoiMua, soBuoiTang, soBuoiTong,
      giaGocBuoi:  donGia,
      giaBanBuoi:  giaBan,
      phanTramGiam: Number(phanTramGiam),
      giaTriThe:   thanhTien,
      ngayHetHan:  ngayHetHan || null,
      kmRefPct:    kmRef || 0,
    } : null

    if (savedOrderId && item?.id) {
      try {
        await supabase.from('don_hang_chi_tiet')
          .update(toCard
            ? { loai_item: 'the_moi', so_luong: soBuoiMua, thanh_tien: thanhTien, tien_tour: 0, tien_hoa_hong: 0, meta: metaData }
            : { loai_item: 'dich_vu', so_luong: 1, thanh_tien: donGia, tien_tour: item?.tien_tour || 0, tien_hoa_hong: 0, meta: null })
          .eq('id', item.id)
      } catch (_) {}
    }
    setLineItems(prev => prev.map(i => i._lid === _lid ? {
      ...i,
      ...(toCard
        ? { loai_item: 'the_moi', so_luong: soBuoiMua, thanh_tien: thanhTien, tien_tour: 0, tien_hoa_hong: 0, meta: metaData }
        : { loai_item: 'dich_vu', so_luong: 1, thanh_tien: donGia, tien_tour: i.tien_tour || 0, tien_hoa_hong: 0, meta: null }),
    } : i))
  }, [selectedCustomer, lineItems, savedOrderId])

  // ── Chốt đơn — tạo DB record chỉ tại đây ───────────────────────────────────
  const handleConfirmOrder = async () => {
    if (lineItems.length === 0) return
    if (!selectedCustomer?.id) {
      alert('Vui long chon khach hang truoc khi chot don de CRM va doi soat du lieu duoc ghi nhan day du.')
      return
    }
    const validPayments = payLines.filter(l => l.soTien > 0 && l.hinhThuc)
    if (isOverPaid) {
      alert('Số tiền nhận đang lớn hơn tổng đơn. Vui lòng chỉnh lại số tiền thanh toán trước khi chốt.')
      return
    }
    if (tongCuoi > 0 && validPayments.length === 0) {
      alert('Vui lòng nhập số tiền và chọn hình thức thanh toán')
      return
    }
    if (conNo > 0 && !selectedCustomer) {
      alert('Khách lẻ phải thanh toán đủ. Vui lòng chọn khách hàng để ghi nợ.')
      return
    }
    const theMoiItems = lineItems.filter(i => i.loai_item === 'the_moi')
    if (theMoiItems.length > 0 && !selectedCustomer?.id) {
      alert('Đơn có mua thẻ liệu trình — vui lòng chọn khách hàng để lưu thẻ.')
      return
    }
    let insertedPaymentIds = []
    setLoading(true)
    try {
      let oid = savedOrderId
      let preparedItems = await prepareLineItemsForCheckout(oid, lineItems)

      if (!oid) {
        // Chưa lưu nháp → tạo order + items ngay
        const order = await posService.createOrder({ nguoiTao: user?.id, khachHangId: selectedCustomer?.id || null })
        oid = order.id
        const insertedItems = await Promise.all(preparedItems.map(item => posService.addLineItem(oid, {
          loai_item:         item.loai_item,
          dich_vu_id:        item.dich_vu_id        || null,
          san_pham_id:       item.san_pham_id        || null,
          the_lieu_trinh_id: item.the_lieu_trinh_id  || null,
          nhan_vien_id:      item.nhan_vien_id        || null,
          so_luong:          item.so_luong || 1,
          don_gia:           item.don_gia  || 0,
          thanh_tien:        item.thanh_tien || 0,
          ti_le_hoa_hong:    item.ti_le_hoa_hong || null,
          tien_tour:         item.tien_tour || 0,
          tien_hoa_hong:   item.tien_hoa_hong || 0,
          ghi_chu:           item.ghi_chu || '',
          meta:              item.meta || undefined,
        })))
        preparedItems = preparedItems.map((item, index) => ({ ...item, ...insertedItems[index], _lid: insertedItems[index].id }))
        setSavedOrderId(oid)
        setLineItems(preparedItems)
        paymentsInserted.current = false  // order mới → chưa có payments
      }

      // Đồng bộ thanh toán IDEMPOTENT: luôn xoá sạch payment cũ của đơn rồi ghi lại đúng payLines.
      // → Mỗi lần bấm lại (sau lỗi finalize hoặc CHUA_DU_BUOI) KHÔNG bao giờ cộng dồn payment.
      // Fix bug trùng 3×495k khi finalize lỗi liên tục.
      const existingPayments = await posService.getPayments(oid)
      if (existingPayments.length > 0) {
        await posService.removePayments(existingPayments.map(payment => payment.id))
      }
      if (tongCuoi > 0) {
        for (const p of validPayments) {
          const payment = await posService.addPayment(oid, { hinhThuc: p.hinhThuc, soTien: p.soTien, ghiChu: ghiChuDon })
          insertedPaymentIds.push(payment.id)
        }
      }
      paymentsInserted.current = true

      // Cập nhật khách hàng + ngày + giờ tạo đơn — TRƯỚC finalize.
      // khach_hang_id phải cập nhật ở đây vì đơn nháp có thể tạo lúc CHƯA chọn khách
      // (khách lẻ) rồi mới gán/tạo khách sau → nếu không update sẽ mất liên kết CRM.
      try {
        await supabase.from('don_hang')
          .update({ khach_hang_id: selectedCustomer?.id || null, ngay: orderNgay, created_at: `${orderNgay}T${(orderGio || '00:00')}:00+07:00` })
          .eq('id', oid)
      } catch (_) {}

      // 4. Finalize — RPC xử lý kho, thẻ LT dùng, thẻ mới, công nợ, doanh_thu
      const result = await posService.finalizeOrder(oid, { giamGia: giamDVAmt, vat: vatAmt, conNo, ghiChu: ghiChuDon })

      // ── Thẻ chưa đủ buổi được phép → yêu cầu KH thanh toán trước ──────────
      if (result?.error_code === 'CHUA_DU_BUOI') {
        setSavedOrderId(oid)  // giữ để retry sau khi thu nợ xong
        // Tìm tên thẻ từ customerCards hoặc customerDebt
        const theId   = result.the_lieu_trinh_id
        const theCard = customerCards.find(c => c.id === theId)
                     || customerDebt.find(d => d.the_lieu_trinh_id === theId)
        setDebtModal({
          the: {
            the_lieu_trinh_id: theId,
            ten_dich_vu: theCard?.ten_dich_vu || 'Thẻ liệu trình',
            con_no: result.can_tra_them,
          },
          fromCheckout: true,  // flag: sau khi thu → tự retry checkout
        })
        setDebtSoTien(String(result.can_tra_them))
        setDebtHinhThuc('tien_mat')
        return  // dừng, chờ KH thanh toán
      }

      const comboItems = preparedItems.filter(i => i.loai_item === 'the_moi' && i.meta?.loai === 'combo_lieu_trinh')
      if (comboItems.length > 0) {
        await posService.markCreatedComboCards(oid, comboItems)
      }

      // 5. Reset
      paymentsInserted.current = false
      setSavedOrderId(null)
      resetCreateForm()
      const stats = await posService.getTodayStats()
      setTodayStats(stats)
    } catch (err) {
      if (insertedPaymentIds.length > 0) {
        try {
          await posService.removePayments(insertedPaymentIds)
          paymentsInserted.current = false
        } catch (_) {}
      }
      alert('Lỗi thanh toán: ' + err.message)
    }
    finally { setLoading(false) }
  }

  // ── Computed ─────────────────────────────────────────────────────────────────
  // Có bán thẻ liệu trình trong đơn → hiện panel Hoa Hồng NV bán (ẩn với đơn dịch vụ/dùng thẻ)
  const coBanThe   = lineItems.some(i => i.loai_item === 'the_moi')
  const tongHang   = lineItems.reduce((s, i) => s + (i.thanh_tien || 0), 0)
  const giamDVAmt  = giamMode === 'vnd'
    ? Math.min(tongHang, parseVND(giamDVVnd))
    : Math.round(tongHang * (parseFloat(giamDVPct) || 0) / 100)
  const vatAmt     = Math.round((tongHang - giamDVAmt) * (parseFloat(vatPct) || 0) / 100)
  const tongCuoi   = Math.max(0, tongHang - giamDVAmt + vatAmt)

  // Khi chỉ có 1 pay line → luôn sync = tongCuoi (100% mặc định)
  // Khi có 2+ lines (khách cọc) → không override
  useEffect(() => {
    setPayLines(prev => {
      if (prev.length !== 1) return prev
      if (prev[0].soTien === tongCuoi) return prev
      return [{ ...prev[0], soTien: tongCuoi }]
    })
  }, [tongCuoi])

  const tongNhan   = payLines.reduce((s, l) => s + (l.hinhThuc ? (l.soTien || 0) : 0), 0)
  const tienThua   = Math.max(0, tongNhan - tongCuoi)
  const conNo      = Math.max(0, tongCuoi - tongNhan)
  const isOverPaid = tongNhan > tongCuoi

  // KM_ref% của toàn đơn: lấy từ thẻ mới (meta.kmRefPct) hoặc giảm giá DV tổng
  const orderKmRefPct = (() => {
    const theKm = lineItems
      .filter(i => i.loai_item === 'the_moi' && Number(i.meta?.kmRefPct) > 0)
      .reduce((mx, i) => Math.max(mx, Number(i.meta.kmRefPct)), 0)
    const giamKm = tongHang > 0 ? (giamDVAmt / tongHang * 100) : 0
    return Math.max(theKm, giamKm)
  })()

  // Tính % hoa hồng đúng rules theo vi_tri và KM của đơn
  // Khi add NV mới, truyền danh sách staff sẽ có để tính coLt
  const calcStaffPct = (viTri, staffList) => {
    if (viTri === 'le_tan') return 3
    const coLt = staffList.some(s => s.nv.vi_tri === 'le_tan')
    if (orderKmRefPct >= 30) return 5                // KM ≥ 30% → KTV 5%
    return coLt ? 7 : 10                             // KTV+LT → 7%, KTV đơn → 10%
  }
  // Rules pct của NV đang có trong orderStaff (để hiện cảnh báo)
  const coLtInStaff   = orderStaff.some(s => s.nv.vi_tri === 'le_tan')
  const getRulesPct   = (viTri) => {
    if (viTri === 'le_tan') return 3
    if (orderKmRefPct >= 30) return 5
    return coLtInStaff ? 7 : 10
  }

  const getPrimarySaleStaff = () => {
    const ktv = orderStaff.find(row => row.nv?.vi_tri === 'ktv')
    const leTan = orderStaff.find(row => row.nv?.vi_tri === 'le_tan')
    return {
      ktv: ktv || null,
      leTan: leTan || null,
      primary: ktv || leTan || null,
    }
  }

  const buildSaleStaffMeta = (item) => {
    if (item.loai_item !== 'the_moi') return item
    const { ktv, leTan, primary } = getPrimarySaleStaff()
    const currentMeta = item.meta || {}
    const staffId = currentMeta.nhanVienBanId || item.nhan_vien_id || primary?.nv?.id || null
    // % hoa hồng bán thẻ = % QUY TẮC KM của NV bán (panel), KHÔNG dùng ti_le_hoa_hong gốc của dịch vụ.
    // KM ≥ 30% → KTV 5%; KTV+LT → 7%; KTV đơn → 10%; LT → 3% (đã tính sẵn ở calcStaffPct/orderStaff).
    const sellerPct = Number(ktv?.pct ?? leTan?.pct ?? primary?.pct ?? 0)
    const hasPanelSeller = !!primary
    // Có NV bán ở panel → tính lại theo quy tắc. Không có (gán per-line qua KtvPopup) → giữ giá trị đã gán.
    const staffPct = hasPanelSeller ? sellerPct : Number(item.ti_le_hoa_hong || 0)
    const tienComm = hasPanelSeller
      ? Math.round((item.thanh_tien || 0) * sellerPct / 100)
      : (item.tien_hoa_hong || Math.round((item.thanh_tien || 0) * staffPct / 100))
    const nextMeta = {
      ...currentMeta,
      nhanVienBanId: staffId,
      nhanVienTuVanLtId: currentMeta.nhanVienTuVanLtId || leTan?.nv?.id || null,
      tiLeCommKtv: Number(ktv?.pct || (primary?.nv?.vi_tri === 'ktv' ? primary.pct : 0) || currentMeta.tiLeCommKtv || 0),
      tiLeCommLt: Number(leTan?.pct || (primary?.nv?.vi_tri === 'le_tan' ? primary.pct : 0) || currentMeta.tiLeCommLt || 0),
    }
    return {
      ...item,
      nhan_vien_id: staffId,
      nhan_vien: item.nhan_vien || primary?.nv || null,
      ti_le_hoa_hong: staffPct || null,
      tien_tour: 0,
      tien_hoa_hong: tienComm,
      meta: nextMeta,
    }
  }

  const prepareLineItemsForCheckout = async (oid, items) => {
    const prepared = items.map(buildSaleStaffMeta)
    const missingSaleStaff = prepared.find(item => item.loai_item === 'the_moi' && !item.meta?.nhanVienBanId && !item.nhan_vien_id)
    if (missingSaleStaff) {
      throw new Error('Vui lòng chọn nhân viên bán thẻ liệu trình trước khi thanh toán.')
    }

    if (oid) {
      await Promise.all(prepared
        .filter(item => item.id && item.loai_item === 'the_moi')
        .map(async item => {
          const { error } = await supabase
            .from('don_hang_chi_tiet')
            .update({
              nhan_vien_id: item.nhan_vien_id || null,
              ti_le_hoa_hong: item.ti_le_hoa_hong || null,
              tien_tour: 0,
              tien_hoa_hong: item.tien_hoa_hong || 0,
              meta: item.meta || {},
            })
            .eq('id', item.id)
          if (error) throw error
        }))
    }

    setLineItems(prepared)
    return prepared
  }

  const canConfirm = lineItems.length > 0 && !!selectedCustomer?.id && !isOverPaid && (
    tongCuoi === 0
    || (payLines.some(l => l.soTien > 0 && l.hinhThuc) &&
        (tongNhan >= tongCuoi || (conNo > 0 && !!selectedCustomer)))
  )

  const disabledReason = lineItems.length === 0
    ? 'Thêm dịch vụ để bắt đầu'
    : !selectedCustomer?.id
      ? 'Vui lòng chọn khách hàng trước khi chốt đơn'
      : isOverPaid
        ? 'Số tiền nhận đang lớn hơn tổng đơn'
        : 'Chưa đủ thanh toán'

  const nowVN  = getNowVN()
  const dateStr = nowVN.toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <>
    <style>{`
      .app { height: 100vh; overflow: hidden; }
      .main { height: 100%; display: flex; flex-direction: column; overflow: hidden; }
      .topbar { display: none !important; }
      .page { flex: 1 !important; min-height: 0; padding: 0 !important; gap: 0 !important; overflow: hidden !important; }
    `}</style>
    <div style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden', background: 'var(--bg)' }}>

      {/* ═══ LEFT PANEL (60%) ═══ */}
      <div style={{ flex: 3, minWidth: 0, display: 'flex', flexDirection: 'column', overflowY: 'auto', borderRight: '1px solid var(--line)' }}>

        {/* Left header */}
        <div style={{ padding: '10px 16px', borderBottom: `1px solid ${C.line}`, background: C.surface, flexShrink: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, fontFamily: FONT.serif, color: C.champagne }}>Tạo Đơn Hàng</div>
          <div style={{ fontSize: 11, color: C.ink3, marginTop: 1 }}>
            {user?.ho_ten} · {todayStats.soDon} đơn hôm nay · {formatCurrency(todayStats.tongThu)}
          </div>
        </div>

        {/* ── CUSTOMER SECTION ── */}
        <div style={{ padding: '10px 16px', borderBottom: `1px solid ${C.line}`, background: C.surface, flexShrink: 0 }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: selectedCustomer ? 10 : (isGuest && (guestName || guestPhone) ? 8 : 0), position: 'relative' }}>
            <div style={{ flex: 1, position: 'relative' }}>
              <input
                value={custSearch}
                onChange={e => { onCustChange(e.target.value); if (selectedCustomer) clearCustomer() }}
                onFocus={() => setCustOpen(true)}
                placeholder="🔍  Tìm khách hàng theo tên, số điện thoại…"
                style={{ width: '100%', boxSizing: 'border-box', border: '1.5px solid var(--bord)', borderRadius: 8, padding: '8px 12px', fontSize: 13, outline: 'none', background: '#fff', color: 'var(--ink)', fontFamily: 'var(--sans)' }}
              />
            </div>
            <button
              onClick={() => { clearCustomer(); setIsGuest(true); setGuestName(''); setGuestPhone('') }}
              style={{ flexShrink: 0, height: 38, padding: '0 14px', border: 'none', borderRadius: 8, background: isGuest && !selectedCustomer ? '#1a1209' : 'rgba(0,0,0,.08)', color: isGuest && !selectedCustomer ? '#fff' : 'var(--ink2)', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--sans)', transition: 'all .15s' }}>
              Khách lẻ
            </button>

            {custOpen && (custResults.length > 0 || (custSearch.length >= 2 && !custLoading)) && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 48, zIndex: 200, marginTop: 4, background: C.surface2, border: `1px solid ${C.line}`, borderRadius: 10, boxShadow: C.shadow, overflow: 'hidden' }}>
                {custResults.length === 0 ? (
                  <div style={{ padding: '14px', fontSize: 13, color: 'var(--ink3)', textAlign: 'center' }}>{custLoading ? 'Đang tìm…' : 'Không tìm thấy khách hàng'}</div>
                ) : custResults.map(c => (
                  <button key={c.id} onClick={() => { pickCustomer(c); setIsGuest(false) }}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '9px 14px', border: 'none', background: 'none', cursor: 'pointer', borderBottom: '1px solid var(--line)', fontFamily: 'var(--sans)' }}>
                    <div style={{ width: 34, height: 34, borderRadius: '50%', flexShrink: 0, background: 'linear-gradient(135deg,#C9A96E,#A0714F)', color: '#2a1d14', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{getInitials(c.ho_ten)}</div>
                    <div style={{ flex: 1, textAlign: 'left' }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>{c.ho_ten}</div>
                      <div style={{ fontSize: 11, color: 'var(--ink3)' }}>{c.so_dien_thoai}{c.ma_kh && <span style={{ marginLeft: 6, color: 'var(--champagne)', fontWeight: 600 }}>{c.ma_kh}</span>}</div>
                    </div>
                    <span style={{ fontSize: 10, background: 'linear-gradient(135deg,#C9A96E,#A0714F)', color: '#2a1d14', padding: '2px 8px', borderRadius: 999, fontWeight: 700 }}>Hannah Spa</span>
                  </button>
                ))}
              </div>
            )}
            {custOpen && <div style={{ position: 'fixed', inset: 0, zIndex: 199 }} onClick={() => setCustOpen(false)} />}
          </div>

          {selectedCustomer && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#fff', border: '1.5px solid var(--champagne)', borderRadius: 8, padding: '8px 12px', marginBottom: 8 }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', flexShrink: 0, background: 'linear-gradient(135deg,#C9A96E,#A0714F)', color: '#2a1d14', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{getInitials(selectedCustomer.ho_ten)}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--champagne)' }}>{selectedCustomer.ho_ten}</div>
                  <div style={{ fontSize: 11, color: 'var(--ink3)' }}>{selectedCustomer.so_dien_thoai}{selectedCustomer.ma_kh && <span style={{ marginLeft: 6, fontWeight: 600 }}>{selectedCustomer.ma_kh}</span>}</div>
                </div>
                <button onClick={clearCustomer} style={{ background: 'none', border: 'none', color: 'var(--ink3)', cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: 4 }}>✕</button>
              </div>
              {customerCards.filter(c => c.so_buoi_con_lai > 0).length > 0 && (
                <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 2 }}>
                  {customerCards.filter(c => c.so_buoi_con_lai > 0).map(card => (
                    <LieuTrinhCard key={card.id} card={card} onUse={handleAddCard} />
                  ))}
                </div>
              )}

              {/* ── CÔNG NỢ KHÁCH HÀNG ── */}
              {customerDebt.length > 0 && (
                <div style={{ marginTop: 8, borderRadius: 8, overflow: 'hidden', border: '1.5px solid rgba(192,57,43,.28)' }}>
                  {/* Header tổng nợ */}
                  <div style={{ background: 'rgba(192,57,43,.08)', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 11, fontWeight: 800, color: '#C0392B' }}>
                      ⚠ Còn nợ {formatCurrency(customerDebt.reduce((s, d) => s + (d.con_no || 0), 0))}
                    </span>
                    <span style={{ fontSize: 11, color: '#C0392B', opacity: .7 }}>
                      · {customerDebt.length} thẻ
                    </span>
                  </div>
                  {/* Từng khoản nợ */}
                  {customerDebt.map(d => {
                    const conNo   = d.con_no || 0
                    const pctTra  = d.pct_da_tra || 0
                    const du30    = d.du_30_pct
                    return (
                      <div key={d.the_lieu_trinh_id} style={{
                        padding: '7px 12px', borderTop: '1px solid rgba(192,57,43,.1)',
                        display: 'flex', alignItems: 'center', gap: 8, background: '#fff',
                      }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12.5, fontWeight: 700, color: C.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {d.ten_dich_vu}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                            <span style={{ fontSize: 11.5, fontWeight: 800, color: '#C0392B' }}>
                              {formatCurrency(conNo)}
                            </span>
                            <span style={{
                              fontSize: 9.5, fontWeight: 700, padding: '1px 6px', borderRadius: 4,
                              background: 'rgba(39,174,96,.12)', color: '#27AE60',
                            }}>
                              {pctTra}% đã trả
                            </span>
                            {d.ngay_mua && <span style={{ fontSize: 10, color: C.ink3 }}>{fmtDate(d.ngay_mua)}</span>}
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            setDebtModal({ the: d })
                            setDebtSoTien(String(conNo))
                            setDebtHinhThuc('tien_mat')
                          }}
                          style={{
                            flexShrink: 0, padding: '5px 12px', border: 'none', borderRadius: 6,
                            background: '#C0392B', color: '#fff',
                            fontSize: 11.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--sans)',
                          }}>
                          Thu Nợ
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Lịch sử thẻ đã hết / đã dùng */}
              {cardHistory.length > 0 && (
                <div style={{ marginTop: 6 }}>
                  <button onClick={() => setShowCardHistory(v => !v)} style={{
                    background: 'none', border: 'none', cursor: 'pointer', padding: '2px 0',
                    fontSize: 11, color: C.ink3, fontFamily: FONT.sans, display: 'flex', alignItems: 'center', gap: 4,
                  }}>
                    <span style={{ fontSize: 9, transform: showCardHistory ? 'rotate(90deg)' : 'none', display: 'inline-block', transition: 'transform .15s' }}>▶</span>
                    Lịch sử thẻ liệu trình ({cardHistory.length} thẻ đã hết)
                  </button>
                  {showCardHistory && (
                    <div style={{ marginTop: 4, display: 'flex', flexDirection: 'column', gap: 3 }}>
                      {cardHistory.map(c => (
                        <div key={c.id} style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          background: C.bg, border: `1px solid ${C.line}`, borderRadius: 6,
                          padding: '5px 10px', fontSize: 11,
                        }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 600, color: C.ink2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {c.ten_dich_vu}
                            </div>
                            <div style={{ color: C.ink3, marginTop: 1 }}>
                              {c.so_buoi_da_dung}/{c.so_buoi_tong} buổi · {formatCurrency(c.gia_tri_the || 0)}
                              {c.ngay_mua && <span style={{ marginLeft: 6 }}>Mua: {fmtDate(c.ngay_mua)}</span>}
                            </div>
                          </div>
                          <span style={{
                            flexShrink: 0, marginLeft: 8, fontSize: 10, fontWeight: 700,
                            color: c.trang_thai === 'het_buoi' ? C.ink3 : '#C0392B',
                            background: C.surface2, borderRadius: 4, padding: '2px 6px',
                          }}>
                            {c.trang_thai === 'het_buoi' ? 'Hết buổi' : c.trang_thai === 'het_han' ? 'Hết hạn' : c.trang_thai}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {isGuest && !selectedCustomer && (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input value={guestName} onChange={e => setGuestName(e.target.value)} placeholder="Tên khách (tùy chọn)…"
                style={{ flex: 1, border: '1px solid var(--bord)', borderRadius: 7, padding: '6px 10px', fontSize: 12.5, outline: 'none', background: '#fff', color: 'var(--ink)', fontFamily: 'var(--sans)' }} />
              <input value={guestPhone} onChange={e => setGuestPhone(e.target.value)} placeholder="SĐT (tùy chọn)…" type="tel"
                style={{ flex: 1, border: '1px solid var(--bord)', borderRadius: 7, padding: '6px 10px', fontSize: 12.5, outline: 'none', background: '#fff', color: 'var(--ink)', fontFamily: 'var(--sans)' }} />
              {guestName.trim() && (
                <button onClick={handleCreateGuest} style={{ flexShrink: 0, height: 32, padding: '0 10px', border: 'none', borderRadius: 7, background: 'var(--champagne)', color: '#2a1d14', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--sans)' }}>Lưu KH</button>
              )}
            </div>
          )}
        </div>

        {/* ── CATALOG ── */}
        <PosProductCatalog
          onAddItem={handleAddItem}
          selectedCustomer={selectedCustomer}
          isGuest={isGuest}
        />
      </div>

      {/* ═══ RIGHT PANEL (40%) ═══ */}
      <aside style={{ flex: 2, minWidth: 0, display: 'flex', flexDirection: 'column', background: C.surface2, overflow: 'hidden' }}>

        {/* Right header */}
        <div style={{ flexShrink: 0, borderBottom: `1px solid ${C.line}`, background: C.surface2 }}>
          <div style={{ height: 40, display: 'flex', alignItems: 'center', padding: '0 16px', background: C.grad, color: C.espresso, fontSize: 13, fontWeight: 700, letterSpacing: '.02em', fontFamily: FONT.serif }}>
            Thông tin đơn hàng
          </div>
          <div style={{ display: 'flex', borderBottom: `1px solid ${C.line}`, background: C.surface2 }}>
            {[['don_hang', 'Đơn hàng'], ['vat_tu', 'Vật tư tiêu hao']].map(([k, lbl]) => (
              <button key={k} onClick={() => setRightTab(k)} style={{
                flex: 1,
                height: 36,
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                fontSize: 12,
                fontWeight: rightTab === k ? 700 : 500,
                fontFamily: FONT.sans,
                color: rightTab === k ? C.champagne : C.ink3,
                borderBottom: rightTab === k ? `2px solid ${C.champagne}` : `2px solid transparent`,
                transition: 'all .15s',
              }}>{lbl}</button>
            ))}
          </div>
        </div>

        {rightTab === 'don_hang' && (<>
          {/* KH + ngày giờ */}
          <div style={{ padding: '10px 14px', borderBottom: `1px solid ${C.line}`, background: C.surface2, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
            <div>
              {selectedCustomer ? (
                <>
                  <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--ink)' }}>{selectedCustomer.ho_ten}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--ink3)', marginTop: 2 }}>
                    {selectedCustomer.so_dien_thoai}{selectedCustomer.ma_kh && <span style={{ marginLeft: 6 }}>{selectedCustomer.ma_kh}</span>}
                  </div>
                </>
              ) : (
                <div style={{ fontSize: 13, color: 'var(--ink)', fontWeight: 650 }}>Khách lẻ</div>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
              <button onClick={() => setShowOrderDate(true)} title="Sửa ngày tạo đơn"
                style={{ fontSize: 11.5, color: 'var(--ink2)', background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 6, padding: '3px 8px', cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'var(--sans)', fontWeight: 600 }}>
                📅 {orderNgay.split('-').reverse().join('/')}
              </button>
              <input type="time" value={orderGio} onChange={e => setOrderGio(e.target.value)} title="Sửa giờ tạo đơn"
                style={{ fontSize: 11.5, color: 'var(--ink2)', background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 6, padding: '2px 6px', outline: 'none', fontFamily: 'var(--sans)', fontWeight: 600 }} />
              <DatePicker open={showOrderDate} selectedDate={orderNgay} onClose={() => setShowOrderDate(false)} onConfirm={v => { setOrderNgay(v); setShowOrderDate(false) }} />
            </div>
          </div>

          {/* Cart header */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 46px 88px 96px', gap: 8, padding: '8px 14px', background: C.bg, borderBottom: `1px solid ${C.line}`, flexShrink: 0, fontSize: 10, fontWeight: 700, color: C.ink3, textTransform: 'uppercase', letterSpacing: '.08em' }}>
            <span>DV / SP</span>
            <span style={{ textAlign: 'center' }}>SL</span>
            <span style={{ textAlign: 'right' }}>Giảm giá</span>
            <span style={{ textAlign: 'right' }}>Thành tiền</span>
          </div>

          {/* ── Scrollable: items + summary + payment ── */}
          <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>

            {/* Cart items */}
            <div style={{ padding: lineItems.length === 0 ? '32px 14px' : '0 14px', borderBottom: '1px solid var(--line)', minHeight: 126 }}>
              {lineItems.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--ink3)', fontSize: 13 }}>
                  Chọn dịch vụ bên trái để thêm vào đơn
                </div>
              ) : lineItems.map(item => (
                <CartLine
                  key={item._lid}
                  item={item}
                  onRemove={handleRemoveItem}
                  onQtyChange={handleQtyChange}
                  onDiscountChange={handleItemDiscount}
                  onSelectKTV={setKtvPopup}
                  onToggleCard={handleToggleCard}
                />
              ))}
            </div>

            {/* ── Summary + Payment ── */}
            {lineItems.length > 0 && (
            <div style={{ padding: '10px 14px' }}>

              {/* Mã KM */}
              <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                <input value={maKM} onChange={e => setMaKM(e.target.value)} placeholder="Mã khuyến mại"
                  style={{ flex: 1, border: '1px solid var(--bord)', borderRadius: 6, padding: '5px 8px', fontSize: 12, background: '#fff', outline: 'none', fontFamily: 'var(--sans)' }} />
                <button style={{ padding: '5px 12px', border: 'none', borderRadius: 6, background: 'var(--champagne)', color: '#2a1d14', fontWeight: 700, fontSize: 11, cursor: 'pointer', fontFamily: 'var(--sans)' }}>ÁP DỤNG</button>
              </div>

              {/* Tạm tính */}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 5 }}>
                <span style={{ color: 'var(--ink3)' }}>Tạm tính</span>
                <span style={{ fontWeight: 700, fontFamily: 'var(--serif)' }}>{formatCurrency(tongHang)}</span>
              </div>

              {/* Giảm giá — toggle % / VNĐ */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 5, fontSize: 12 }}>
                <span style={{ color: 'var(--ink3)', flex: 1 }}>− Giảm giá DV</span>
                {giamMode === 'pct' ? (
                  <input value={giamDVPct} onChange={e => setGiamDVPct(e.target.value)} placeholder="0"
                    style={{ width: 40, border: '1px solid var(--bord)', borderRadius: '5px 0 0 5px', padding: '3px 5px', fontSize: 12, textAlign: 'center', outline: 'none', background: '#fff' }} />
                ) : (
                  <input value={giamDVVnd} onChange={e => setGiamDVVnd(e.target.value)} placeholder="0"
                    style={{ width: 72, border: '1px solid var(--bord)', borderRadius: '5px 0 0 5px', padding: '3px 5px', fontSize: 12, textAlign: 'right', outline: 'none', background: '#fff' }} />
                )}
                <button onClick={() => setGiamMode(m => m === 'pct' ? 'vnd' : 'pct')} style={{
                  padding: '3px 7px', border: '1px solid var(--bord)', borderLeft: 'none', borderRadius: '0 5px 5px 0',
                  background: C.bg, cursor: 'pointer', fontSize: 11, color: C.ink2, fontWeight: 700,
                }}>{giamMode === 'pct' ? '%' : 'đ'}</button>
                <span style={{ fontWeight: 700, color: C.chi, minWidth: 60, textAlign: 'right', fontFamily: FONT.serif, fontSize: 12 }}>
                  {giamDVAmt > 0 ? `−${formatCurrency(giamDVAmt)}` : '—'}
                </span>
              </div>

              {/* VAT */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 10, fontSize: 12 }}>
                <span style={{ color: 'var(--ink3)', flex: 1 }}>+ VAT</span>
                <input value={vatPct} onChange={e => setVatPct(e.target.value)} placeholder="0"
                  style={{ width: 40, border: '1px solid var(--bord)', borderRadius: '5px 0 0 5px', padding: '3px 5px', fontSize: 12, textAlign: 'center', outline: 'none', background: '#fff' }} />
                <span style={{ padding: '3px 7px', border: `1px solid ${C.line2}`, borderLeft: 'none', borderRadius: '0 5px 5px 0', background: C.bg, fontSize: 11, color: C.ink2, fontWeight: 700 }}>%</span>
                <span style={{ fontWeight: 700, color: C.thu, minWidth: 60, textAlign: 'right', fontFamily: FONT.serif, fontSize: 12 }}>
                  {vatAmt > 0 ? `+${formatCurrency(vatAmt)}` : '—'}
                </span>
              </div>

              {/* Tổng cộng */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', borderRadius: 8, background: C.bg, marginBottom: 12, border: `1px solid ${C.line2}` }}>
                <span style={{ fontSize: 14, fontWeight: 700, fontFamily: FONT.serif, color: C.ink }}>Tổng cộng</span>
                <span style={{ fontSize: 20, fontWeight: 800, color: C.thu, fontFamily: FONT.serif }}>{formatCurrency(tongCuoi)}</span>
              </div>

              <PaymentLines
                payLines={payLines}
                paymentOptions={PTTT_OPTS}
                total={tongCuoi}
                debt={conNo}
                hasCustomer={!!selectedCustomer}
                onAddLine={addPayLine}
                onRemoveLine={removePayLine}
                onUpdateLine={updatePayLine}
              />

              {/* Ghi chú */}
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--ink2)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 5 }}>Ghi chú</div>
                <textarea value={ghiChuDon} onChange={e => setGhiChuDon(e.target.value)}
                  placeholder="Ghi chú đơn hàng…" rows={2}
                  style={{ width: '100%', boxSizing: 'border-box', border: '1px solid var(--bord)', borderRadius: 7, padding: '6px 10px', fontSize: 12.5, outline: 'none', resize: 'none', background: '#fff', color: 'var(--ink)', fontFamily: 'var(--sans)' }}
                />
              </div>

              {/* Hoa Hồng NV bán thẻ — CHỈ hiện khi đơn có bán thẻ liệu trình. Đơn dịch vụ/dùng thẻ → ẩn (chỉ Tour). */}
              {coBanThe && (
                <StaffCommissionPanel
                  ktvList={ktvList}
                  orderStaff={orderStaff}
                  setOrderStaff={setOrderStaff}
                  calcStaffPct={calcStaffPct}
                  getRulesPct={getRulesPct}
                  orderKmRefPct={orderKmRefPct}
                  totalPaid={tongNhan}
                  orderTotal={tongCuoi}
                />
              )}

            </div>
            )}

          </div>{/* end scrollable */}

          {/* ── Bottom action bar — cố định ── */}
          <div style={{ borderTop: `1px solid ${C.line2}`, padding: '10px 12px 14px', flexShrink: 0, background: C.bg }}>
            <style>{`
              @keyframes goldPulse {
                0%,100% { box-shadow: 0 4px 16px rgba(160,113,79,.35); }
                50%      { box-shadow: 0 4px 24px rgba(160,113,79,.6); }
              }
              @keyframes redPulse {
                0%,100% { box-shadow: 0 4px 16px rgba(192,57,43,.35); }
                50%      { box-shadow: 0 4px 24px rgba(192,57,43,.6); }
              }
            `}</style>

            {/* Validation hint */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              {!canConfirm && lineItems.length > 0 && (
                <span style={{ fontSize: 10.5, color: '#A0714F', fontStyle: 'italic' }}>
                  ⚠ {disabledReason}
                </span>
              )}
            </div>

            {/* 4 nút chính */}
            <div style={{ display: 'flex', gap: 6, alignItems: 'stretch' }}>

              {/* ← Hủy / Đơn mới */}
              <button onClick={handleVoidOrder} title="Hủy đơn / Đơn mới"
                style={{
                  width: 44, height: 40, border: `1.5px solid ${C.line2}`, borderRadius: 999,
                  background: C.surface2, color: C.ink2,
                  cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>←</button>

              {/* Lưu nháp */}
              <button onClick={handleSaveDraft} title="Lưu đơn nháp để khách thanh toán sau"
                style={{
                  width: 60, height: 40, border: `1.5px solid ${C.line2}`, borderRadius: 999,
                  background: C.surface2, color: C.ink,
                  cursor: 'pointer', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontFamily: FONT.sans,
                }}>Lưu</button>

              {/* Thanh Toán & In — nút chính */}
              <button
                disabled={!canConfirm || loading}
                onClick={() => handleConfirmOrder(true)}
                title="Thanh toán và in hoá đơn"
                style={{
                  flex: 1, height: 40, border: 'none', borderRadius: 999, fontFamily: 'var(--sans)',
                  background: !canConfirm
                    ? 'rgba(0,0,0,.08)'
                    : conNo > 0 && selectedCustomer
                      ? 'linear-gradient(135deg,#C0392B 0%,#8e2218 100%)'
                      : 'linear-gradient(135deg,#C9A96E 0%,#A0714F 45%,#7D5A3C 100%)',
                  color: !canConfirm ? 'var(--ink3)' : '#fff',
                  cursor: !canConfirm || loading ? 'not-allowed' : 'pointer',
                  fontSize: 13, fontWeight: 800, letterSpacing: '.02em',
                  animation: canConfirm && !loading
                    ? conNo > 0 && selectedCustomer
                      ? 'redPulse 2.5s ease-in-out infinite'
                      : 'goldPulse 2.5s ease-in-out infinite'
                    : 'none',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}>
                {loading ? 'Đang xử lý…' : (
                  tongCuoi === 0
                    ? 'Thanh Toán & In'
                    : conNo > 0 && selectedCustomer
                      ? 'Ghi Nợ & In'
                      : 'Thanh Toán & In'
                )}
              </button>

              {/* Thanh Toán — nút phụ */}
              <button
                disabled={!canConfirm || loading}
                onClick={() => handleConfirmOrder(false)}
                title="Thanh toán không in hoá đơn"
                style={{
                  width: 100, height: 40, borderRadius: 999, fontFamily: FONT.sans, flexShrink: 0,
                  border: `1.5px solid ${canConfirm ? C.champagne : C.line2}`,
                  background: canConfirm ? C.surface2 : C.bg,
                  color: canConfirm ? C.ink : C.ink3,
                  cursor: !canConfirm || loading ? 'not-allowed' : 'pointer',
                  fontSize: 12, fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                Thanh Toán
              </button>

            </div>
          </div>
        </>)}

        {rightTab === 'vat_tu' && (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink3)' }}>
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <div style={{ fontSize: 36, marginBottom: 10 }}>🧴</div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>Vật tư tiêu hao</div>
              <div style={{ fontSize: 12, marginTop: 4 }}>Tính năng đang phát triển</div>
            </div>
          </div>
        )}
      </aside>
    </div>

    {/* KTV Popup */}
    {ktvPopup && (
      <KtvPopupComponent item={ktvPopup} ktvList={ktvList} onAssign={handleAssignKTV} onClose={() => setKtvPopup(null)} />
    )}

    <DebtPaymentModal
      modal={debtModal}
      amount={debtSoTien}
      method={debtHinhThuc}
      loading={debtLoading}
      onAmountChange={setDebtSoTien}
      onMethodChange={setDebtHinhThuc}
      onPay={handleThuNo}
      onClose={() => { setDebtModal(null); setDebtSoTien(''); setDebtHinhThuc('tien_mat') }}
    />

    </>
  )
}

// ── Router ────────────────────────────────────────────────────────────────────
export default function PosApp() {
  const path   = window.location.pathname
  const params = new URLSearchParams(window.location.search)
  const resumeId = params.get('resume')
  if (path === '/pos/danh-sach') {
    return <PosOrderHistory onResumeOrder={(o) => { window.location.href = '/pos?resume=' + o.id }} />
  }
  return <PosCreateOrder resumeOrderId={resumeId} />
}
