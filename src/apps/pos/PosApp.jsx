import { useState, useEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { posService } from '../../services/posService'
import { supabase } from '../../lib/supabase'
import { formatCurrency, getNowVN, todayISO } from '../../lib/utils'
import { addDurationISO } from '../../lib/dateMath'
import { calcCommissionRates } from '../../lib/serviceCommission'
import { getCardComboService, getTreatmentCardDisplayValue } from '../../lib/treatmentCardPolicy'
import { useAuth } from '../../context/AuthContext'
import { confirmDialog } from '../../components/ui/notify'
import I from '../../components/shared/Icons'
import PosOrderHistory from './PosOrderHistory'
import PosProductCatalog from './PosProductCatalog'
import KtvPopupComponent from './components/KtvPopup'
import CartLine from './components/CartLine'
import DebtPaymentModal from './components/DebtPaymentModal'
import NapTraTruocModal from './components/NapTraTruocModal'
import PaymentLines from './components/PaymentLines'
import StaffCommissionPanel from './components/StaffCommissionPanel'
import DatePicker from '../../components/shared/DatePicker'
import { parseVND, fmtDate, getInitials, LieuTrinhCard } from './posShared'
import { HINH_THUC_THU } from '../../constants/enums'
import { C, FONT } from '../../constants/colors'

const PTTT_OPTS = HINH_THUC_THU

// Phân dịch vụ → nhóm voucher (khớp hàm SQL voucher_nhom_dich_vu, migration 122)
function nhomDichVuVoucher(ten) {
  const t = (ten || '').toLowerCase()
  if (t.includes('triệt')) return 'triet_long'
  if (/(gội|massage|cổ vai gáy|body|dưỡng sinh)/.test(t)) return 'thu_gian'
  if (/(laser|công nghệ|béo|tắm|trắng|peel|collagen|mụn|điện di|tái tạo|da)/.test(t)) return 'cham_soc_da'
  return null
}

// ── PosCreateOrder ────────────────────────────────────────────────────────────
function PosCreateOrder({ resumeOrderId, editMode = false, ycId = null }) {
  const { user } = useAuth()
  const isLeTan = user?.vai_tro === 'le_tan'   // Lễ tân: sửa đơn = ĐỀ XUẤT (chờ Admin duyệt)

  // Order — local khi chưa lưu, DB mode khi đã lưu/resume
  const [lineItems, setLineItems]       = useState([])
  const [savedOrderId, setSavedOrderId] = useState(null)  // null = local, uuid = đã lưu DB
  // SỬA ĐƠN (editMode): id đơn gốc đang sửa. Giữ dòng hàng LOCAL, CHỉ áp khi bấm Cập Nhật
  // → bỏ dở giữa chừng KHÔNG đụng đơn gốc (an toàn, không mất thẻ).
  const [editOrderId, setEditOrderId]   = useState(null)
  const [maDonEdit, setMaDonEdit]       = useState('')      // mã đơn đang sửa (cho yêu cầu duyệt)
  // Đề xuất sửa (Lễ tân) + duyệt đề xuất (Admin mở từ ?yc=)
  const [showProposeModal, setShowProposeModal] = useState(false)
  const [proposeReason, setProposeReason]       = useState('')
  const [reviewYc, setReviewYc]                 = useState(null)   // yeu_cau_chinh_sua admin đang xem/duyệt
  const [showRejectModal, setShowRejectModal]   = useState(false)
  const [rejectReason, setRejectReason]         = useState('')
  // Toast đẹp thay notify() — theo ngôn ngữ thiết kế HSMS
  const [posToast, setPosToast] = useState(null)
  const notify = (msg, type) => {
    const t = type || (/Lỗi|⚠|Vui lòng|Vui long|phải|KHÔNG|không|chưa|chon|Số tiền/.test(String(msg)) ? 'error' : 'success')
    setPosToast({ msg: String(msg), type: t })
    window.clearTimeout(notify._t)
    notify._t = window.setTimeout(() => setPosToast(null), 4000)
  }

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
  const [customerPrepaid, setCustomerPrepaid]   = useState(0)   // số dư ví trả trước
  const [cardHistory, setCardHistory]           = useState([])
  const [showCardHistory, setShowCardHistory]   = useState(true)   // mặc định HIỆN hết thẻ hết hạn/đã dùng (anh Nam: show up hết)
  const [custSearch, setCustSearch]     = useState('')
  const [custResults, setCustResults]   = useState([])
  // Modal thu nợ
  const [debtModal, setDebtModal]       = useState(null)   // { the: <debt_row> }
  const [debtSoTien, setDebtSoTien]     = useState('')
  const [debtHinhThuc, setDebtHinhThuc] = useState('tien_mat')
  const [debtLoading, setDebtLoading]   = useState(false)
  // Modal nạp ví trả trước
  const [napModalOpen, setNapModalOpen] = useState(false)
  const [napSoTien, setNapSoTien]       = useState('')
  const [napHinhThuc, setNapHinhThuc]   = useState('tien_mat')
  const [napGhiChu, setNapGhiChu]       = useState('')
  const [napLoading, setNapLoading]     = useState(false)
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
  const [voucher, setVoucher]     = useState(null)   // {code, nhom, phan_tram, ten_nhom, khach_hang_id}
  const [voucherMsg, setVoucherMsg] = useState('')   // thông báo lỗi/ok khi áp mã
  const [voucherChecking, setVoucherChecking] = useState(false)
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

  // CTKM tự nhận biết: map dich_vu_id → km active khớp (gồm KM theo nhóm)
  const [kmByDichVu, setKmByDichVu] = useState({})

  // Gia hạn thẻ liệu trình (khách quay lại)
  const [giaHanCard, setGiaHanCard]   = useState(null)   // card đang gia hạn
  const [giaHanNgay, setGiaHanNgay]   = useState('')
  const [giaHanOpen, setGiaHanOpen]   = useState(false)  // DatePicker
  const [giaHanLoading, setGiaHanLoading] = useState(false)

  const openGiaHan = (card) => {
    setGiaHanCard(card)
    setGiaHanNgay(addDurationISO(todayISO(), 1, 'year'))  // mặc định +1 năm từ hôm nay
  }
  const doGiaHan = async () => {
    if (!giaHanCard || !giaHanNgay) return
    setGiaHanLoading(true)
    const ngayMoiVi = giaHanNgay.split('-').reverse().join('/')
    try {
      if (isLeTan) {
        // Lễ tân: gửi YÊU CẦU gia hạn → Admin duyệt mới có hiệu lực (thẻ vẫn hết hạn đến khi duyệt)
        const { error } = await supabase.from('yeu_cau_chinh_sua').insert({
          loai_yeu_cau: 'sua', loai_bang: 'the_lieu_trinh', ban_ghi_id: giaHanCard.id,
          du_lieu_cu: { ten_dich_vu: giaHanCard.ten_dich_vu, ngay_het_han: giaHanCard.ngay_het_han },
          du_lieu_moi: { ngay_het_han: giaHanNgay },
          ly_do: `Gia hạn thẻ "${giaHanCard.ten_dich_vu}" đến ${ngayMoiVi} (khách quay lại dùng tiếp)`,
          nguoi_yeu_cau: user?.ho_ten || user?.email || 'Lễ tân',
          trang_thai: 'cho_duyet',
        })
        if (error) throw error
        notify('✓ Đã gửi yêu cầu gia hạn — chờ Admin duyệt mới dùng được thẻ')
        setGiaHanCard(null)
      } else {
        // Admin: gia hạn áp luôn
        const { error } = await supabase.from('the_lieu_trinh')
          .update({ ngay_het_han: giaHanNgay }).eq('id', giaHanCard.id)
        if (error) throw error
        supabase.from('nhat_ky_hoat_dong').insert({
          nguoi_dung_id: user?.id || null, hanh_dong: 'gia_han_the', bang: 'the_lieu_trinh',
          du_lieu_cu: { id: giaHanCard.id, ten_dich_vu: giaHanCard.ten_dich_vu, ngay_het_han: giaHanCard.ngay_het_han },
          du_lieu_moi: { ngay_het_han: giaHanNgay },
        }).then(() => {}, () => {})
        notify('✓ Đã gia hạn thẻ đến ' + ngayMoiVi)
        setGiaHanCard(null)
        if (selectedCustomer?.id) {
          posService.getCustomerCards(selectedCustomer.id).then(c => setCustomerCards(c || [])).catch(() => {})
        }
      }
    } catch (err) { notify('Lỗi gia hạn: ' + err.message) }
    finally { setGiaHanLoading(false) }
  }

  // ── Load ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    posService.getTodayStats().then(s => setTodayStats(s))
    posService.getKTVs().then(d => setKtvList(d || []))
    // Khuyến mãi đang chạy (giảm giá đơn / mua X tặng Y / mua N lần) → gợi ý trong giỏ
    const today = todayISO()
    Promise.all([
      supabase.from('khuyen_mai').select('*')
        .eq('trang_thai', 'active').lte('ngay_bat_dau', today).gte('ngay_ket_thuc', today)
        .or('dich_vu_id.not.is.null,nhom_ap_dung.not.is.null'),
      supabase.from('dich_vu').select('id, nhom_hien_thi').eq('is_active', true),
    ]).then(([{ data: kms }, { data: dvs }]) => {
      const map = {}
      const better = (a, b) => !b || (a.phan_tram_giam ?? 0) > (b.phan_tram_giam ?? 0)
      // KM theo nhóm trước (áp mọi DV trong nhóm)
      ;(kms || []).forEach(km => {
        if (!km.nhom_ap_dung) return
        ;(dvs || []).forEach(d => { if (d.nhom_hien_thi === km.nhom_ap_dung && better(km, map[d.id])) map[d.id] = km })
      })
      // KM gắn dịch vụ cụ thể — ưu tiên hơn
      ;(kms || []).forEach(km => { if (km.dich_vu_id && better(km, map[km.dich_vu_id])) map[km.dich_vu_id] = km })
      setKmByDichVu(map)
    }).catch(() => {})
  }, [])

  // Resume đơn nháp từ danh sách
  useEffect(() => {
    if (!resumeOrderId) return
    if (ycId) return   // có ?yc= → luồng admin duyệt đề xuất xử lý riêng (useEffect bên dưới)
    // SỬA ĐƠN: giữ dòng hàng LOCAL (không set savedOrderId → không ghi DB khi mở).
    // Resume nháp bình thường: dùng savedOrderId như cũ (ghi thẳng DB).
    if (editMode) setEditOrderId(resumeOrderId)
    else setSavedOrderId(resumeOrderId)
    Promise.all([
      posService.getOrder(resumeOrderId),
      posService.getLineItems(resumeOrderId),
    ]).then(async ([order, items]) => {
      if (order?.ma_don) setMaDonEdit(order.ma_don)
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
      // ── Dùng chung cho RESUME (draft) và EDIT (sửa đơn đã chốt) ──
      const allItems = items || []
      // Dòng phụ "đồng tư vấn thẻ" (KTV thứ 2): san_pham giá 0, chỉ để ghi hoa hồng.
      // KHÔNG hiển thị như dòng hàng → khôi phục vào panel Hoa Hồng NV bán thay vì.
      const isDongTuVan = i => i.loai_item === 'san_pham'
        && (i.meta?.dongTuVanThe || (!i.san_pham_id && (i.thanh_tien || 0) === 0 && i.nhan_vien_id))
      const phuLines = allItems.filter(isDongTuVan)
      const visibleItems = allItems.filter(i => !isDongTuVan(i))

      if (editMode) {
        // Local: bỏ id DB để được xử lý như dòng mới khi ghi lại lúc Cập Nhật
        setLineItems(visibleItems.map(i => {
          const { id, don_hang_id, created_at, ...rest } = i
          return { ...rest, _lid: crypto.randomUUID() }
        }))
        // Khôi phục thanh toán cũ vào payLines để admin thấy/sửa
        posService.getPayments(resumeOrderId).then(pays => {
          if (pays && pays.length) {
            setPayLines(pays.map((p, idx) => ({ _id: idx + 1, soTien: p.so_tien || 0, hinhThuc: p.hinh_thuc })))
          }
        }).catch(() => {})
      } else {
        // Resume nháp: giữ id DB làm _lid để handlers ghi thẳng DB
        setLineItems(visibleItems.map(i => ({ ...i, _lid: i.id })))
      }

      // Khôi phục panel "Hoa Hồng NV bán" (orderStaff) cho đơn bán thẻ — CẢ resume + edit:
      // KTV bán (dòng the_moi) + Lễ tân tư vấn (meta) + KTV thứ 2 (dòng phụ đồng tư vấn).
      const theMoi = allItems.filter(i => i.loai_item === 'the_moi')
      if (theMoi.length > 0) {
        try {
          const kl = ktvList.length ? ktvList : (await posService.getKTVs() || [])
          const staff = []
          const addStaff = (nvId, pct) => {
            if (!nvId || staff.find(s => s.nv.id === nvId)) return
            const nv = kl.find(k => k.id === nvId)
            if (nv) staff.push({ nv, role: 'tu_van', pct: Number(pct || 0) })
          }
          const first = theMoi[0]
          addStaff(first.meta?.nhanVienBanId || first.nhan_vien_id, first.meta?.tiLeCommKtv || first.ti_le_hoa_hong)
          addStaff(first.meta?.nhanVienTuVanLtId, first.meta?.tiLeCommLt)
          phuLines.forEach(p => addStaff(p.nhan_vien_id, p.ti_le_hoa_hong))
          if (staff.length) setOrderStaff(staff)
        } catch (_) {}
      }
    }).catch(err => { notify('Lỗi tải đơn: ' + err.message) })
  }, [resumeOrderId, editMode, ycId])

  // ── Admin mở yêu cầu sửa đơn (?yc=) → nạp snapshot Lễ tân đề xuất để xem trước ──
  useEffect(() => {
    if (!ycId || !resumeOrderId) return
    setEditOrderId(resumeOrderId)  // áp vào đơn gốc khi Admin bấm Duyệt & Cập Nhật
    Promise.all([
      supabase.from('yeu_cau_chinh_sua').select('*').eq('id', ycId).single(),
      posService.getOrder(resumeOrderId),
    ]).then(([{ data: yc }, order]) => {
      if (!yc) { notify('Không tìm thấy yêu cầu sửa đơn'); return }
      setReviewYc(yc)
      if (order?.ma_don) setMaDonEdit(order.ma_don)
      const dm = yc.du_lieu_moi || {}
      if (Array.isArray(dm.lineItems)) setLineItems(dm.lineItems)
      if (dm.giamMode) setGiamMode(dm.giamMode)
      if (dm.giamDVPct != null) setGiamDVPct(dm.giamDVPct)
      if (dm.giamDVVnd != null) setGiamDVVnd(dm.giamDVVnd)
      if (dm.vatPct != null) setVatPct(dm.vatPct)
      if (Array.isArray(dm.payLines) && dm.payLines.length) setPayLines(dm.payLines)
      if (Array.isArray(dm.orderStaff)) setOrderStaff(dm.orderStaff)
      if (dm.ghiChuDon != null) setGhiChuDon(dm.ghiChuDon)
      if (dm.orderNgay) setOrderNgay(dm.orderNgay)
      if (dm.orderGio) setOrderGio(dm.orderGio)
      if (dm.khachHangId) {
        setSelectedCustomer({ id: dm.khachHangId, ho_ten: dm.khachHangTen || '', so_dien_thoai: dm.khachHangSdt || '' })
        setCustSearch(dm.khachHangTen || '')
        setIsGuest(false)
      }
    }).catch(err => { notify('Lỗi tải yêu cầu: ' + err.message) })
  }, [ycId, resumeOrderId])

  useEffect(() => {
    if (!selectedCustomer?.id) {
      setCustomerCards([])
      setCustomerDebt([])
      setCardHistory([])
      setShowCardHistory(false)
      setCustomerPrepaid(0)
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
    posService.getPrepaidBalance(selectedCustomer.id)
      .then(bal => setCustomerPrepaid(bal || 0))
      .catch(() => setCustomerPrepaid(0))
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
    setCustomerPrepaid(0)
    setCardHistory([])
    setDebtModal(null)
    setDebtSoTien('')
    setShowCardHistory(false)
  }

  // ── Item handlers — local hoặc DB nếu đã lưu ────────────────────────────────
  const handleAddCard = async (card) => {
    // Chặn dùng thẻ đã hết hạn — phải gia hạn (admin duyệt) trước khi dùng
    const expired = !card.is_khong_gioi_han && card.ngay_het_han && card.ngay_het_han < todayISO()
    if (expired) {
      notify('Thẻ đã hết hạn ' + String(card.ngay_het_han).split('-').reverse().join('/') + '. Vui lòng GIA HẠN (Admin duyệt) trước khi dùng.')
      return
    }
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
      } catch (err) { notify('Lỗi thêm dịch vụ: ' + err.message) }
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
        notify('Lỗi xoá dịch vụ: ' + err.message)
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
      ? { so_luong: qty, thanh_tien: nextThanhTien, tien_tour: nextTour, tien_hoa_hong: item?.meta?.upsale?.tien_upsale || 0 }
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
      ? { thanh_tien: newThanhTien, tien_tour: nextTour, tien_hoa_hong: item?.meta?.upsale?.tien_upsale || 0 }
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
    // Dịch vụ upsale: KTV vẫn nhận tour theo DV mới + HOA HỒNG = 10% chênh lệch
    const tienCommission = isSaleCommission ? incomeAmount : (item.meta?.upsale?.tien_upsale || 0)

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

  // ── Upsale: KTV nâng cấp lên dịch vụ cao hơn → KTV hưởng 10% chênh lệch ──
  const handleUpsale = (lid, dvB) => {
    setLineItems(prev => prev.map(i => {
      if (i._lid !== lid) return i
      const u = i.meta?.upsale || null
      let next
      if (!dvB) {
        // Bỏ upsale → khôi phục dịch vụ gốc
        if (!u) return i
        const qty = i.so_luong || 1
        const meta = { ...(i.meta || {}) }; delete meta.upsale
        next = {
          ...i, dich_vu_id: u.dich_vu_goc_id,
          dich_vu: { ...(i.dich_vu || {}), ten: u.ten_goc },
          don_gia: u.gia_goc, thanh_tien: u.gia_goc * qty,
          ti_le_hoa_hong: u.ti_le_goc ?? i.ti_le_hoa_hong,
          tien_hoa_hong: 0, meta,
        }
        next.tien_tour = i.nhan_vien_id ? calcNextTour(next, next.thanh_tien, qty) : 0
      } else {
        const giaGoc = u?.gia_goc ?? i.don_gia
        const tenGoc = u?.ten_goc ?? (i.dich_vu?.ten || '')
        const dvGocId = u?.dich_vu_goc_id ?? i.dich_vu_id
        const tiLeGoc = u?.ti_le_goc ?? i.ti_le_hoa_hong
        const giaB = dvB.gia_co_ban || 0
        const qty = i.so_luong || 1
        const chenh = Math.max(0, giaB - giaGoc)
        const tienUpsale = Math.round(chenh * 0.10)
        const upMeta = { dich_vu_goc_id: dvGocId, ten_goc: tenGoc, gia_goc: giaGoc, ti_le_goc: tiLeGoc, ten_moi: dvB.ten, gia_moi: giaB, chenh, tien_upsale: tienUpsale }
        next = {
          ...i, dich_vu_id: dvB.id,
          dich_vu: { ...(i.dich_vu || {}), ten: dvB.ten, danh_muc: dvB.danh_muc },
          don_gia: giaB, thanh_tien: giaB * qty,
          ti_le_hoa_hong: Number(dvB.ti_le_hoa_hong || 0),
          tien_hoa_hong: tienUpsale,
          meta: { ...(i.meta || {}), upsale: upMeta },
        }
        next.tien_tour = i.nhan_vien_id ? calcNextTour(next, next.thanh_tien, qty) : 0
      }
      if (savedOrderId && i.id) {
        supabase.from('don_hang_chi_tiet').update({
          dich_vu_id: next.dich_vu_id, don_gia: next.don_gia, thanh_tien: next.thanh_tien,
          ti_le_hoa_hong: next.ti_le_hoa_hong, tien_hoa_hong: next.tien_hoa_hong,
          tien_tour: next.tien_tour, meta: next.meta,
        }).eq('id', i.id).then(() => {}, () => {})
      }
      return next
    }))
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
    } catch (err) { notify('Lỗi tạo KH: ' + err.message) }
  }

  // Áp mã giảm giá (voucher): kiểm tra mã, hệ thống tự biết nhóm + % (nhân viên không cần biết)
  async function apDungVoucher() {
    const code = (maKM || '').trim()
    if (!code) { setVoucher(null); setVoucherMsg(''); return }
    setVoucherChecking(true); setVoucherMsg('')
    try {
      const { data, error } = await supabase.rpc('voucher_kiem_tra', { p_code: code })
      if (error) throw error
      if (!data?.hop_le) { setVoucher(null); setVoucherMsg(data?.ly_do || 'Mã không hợp lệ'); return }
      // Cảnh báo nếu mã gắn cho khách khác với khách đang chọn (không chặn cứng — admin quyết)
      if (data.khach_hang_id && selectedCustomer?.id && data.khach_hang_id !== selectedCustomer.id) {
        setVoucherMsg('⚠ Mã này thuộc khách khác — kiểm tra lại')
      }
      setVoucher(data)
    } catch (e) {
      setVoucher(null); setVoucherMsg('Lỗi kiểm tra mã: ' + (e.message || e))
    } finally { setVoucherChecking(false) }
  }

  const resetCreateForm = () => {
    setLineItems([])
    setGiamDVPct(''); setGiamDVVnd(''); setVatPct(''); setMaKM('')
    setVoucher(null); setVoucherMsg('')
    _payId.current = 1
    setPayLines([{ _id: 1, soTien: 0, hinhThuc: 'tien_mat' }])
    setGhiChuDon('')
    setOrderStaff([])
    paymentsInserted.current = false
    // reset ngày/giờ về hiện tại cho đơn mới
    const n = getNowVN()
    setOrderNgay(todayISO())
    setOrderGio(`${String(n.getHours()).padStart(2, '0')}:${String(n.getMinutes()).padStart(2, '0')}`)
    setEditOrderId(null)
    clearCustomer()
  }

  const handleVoidOrder = async () => {
    // Đang SỬA đơn: thoát KHÔNG đụng đơn gốc (chỉ rời chế độ sửa)
    if (editOrderId && !savedOrderId) {
      if (!(await confirmDialog({ title: 'Thoát sửa đơn', message: 'Thoát sửa đơn? Đơn gốc giữ nguyên, thay đổi chưa lưu sẽ bỏ qua.', confirmLabel: 'Thoát' }))) return
      setEditOrderId(null)
      resetCreateForm()
      window.location.href = '/pos/danh-sach'
      return
    }
    if (lineItems.length === 0 && !savedOrderId) return
    if (!(await confirmDialog({ title: 'Huỷ đơn', message: 'Hủy đơn hiện tại?', danger: true, confirmLabel: 'Huỷ đơn' }))) return
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
      notify('Lỗi thu nợ: ' + err.message)
    } finally {
      setDebtLoading(false)
    }
  }

  // Nạp tiền vào ví trả trước
  const handleNap = async () => {
    const soTien = parseVND(napSoTien)
    if (!selectedCustomer?.id || !soTien) return
    setNapLoading(true)
    try {
      const result = await posService.napTraTruoc({
        khachHangId: selectedCustomer.id,
        soTien,
        hinhThuc: napHinhThuc,
        nguoi: user?.ho_ten || 'Lễ Tân',
        ghiChu: napGhiChu || null,
      })
      const newBal = result?.so_du ?? (customerPrepaid + soTien)
      setCustomerPrepaid(newBal)
      setNapModalOpen(false)
      setNapSoTien('')
      setNapGhiChu('')
      setNapHinhThuc('tien_mat')
    } catch (err) {
      notify('Lỗi nạp ví: ' + err.message)
    } finally {
      setNapLoading(false)
    }
  }

  // QUY TẮC: 1 đơn KHÔNG được vừa BÁN THẺ MỚI vừa LÀM DỊCH VỤ / DÙNG THẺ.
  // → tách 2 đơn riêng cho số liệu tour & hoa hồng không chồng chéo. Trả false nếu vi phạm.
  const checkKhongGopBanTheVaDichVu = () => {
    const hasCardSale = lineItems.some(i => i.loai_item === 'the_moi')
    const hasService  = lineItems.some(i => i.loai_item === 'dich_vu' || i.loai_item === 'the_lieu_trinh')
    if (hasCardSale && hasService) {
      notify('⚠ KHÔNG gộp BÁN THẺ và LÀM DỊCH VỤ trong cùng 1 đơn hàng.\n\nVui lòng tách thành 2 đơn riêng:\n  • 1 đơn BÁN THẺ liệu trình\n  • 1 đơn LÀM DỊCH VỤ / dùng thẻ\n\n→ để tiền tour & hoa hồng không bị tính chồng chéo.')
      return false
    }
    return true
  }

  const handleSaveDraft = async () => {
    if (lineItems.length === 0) {
      notify('Thêm ít nhất 1 dịch vụ trước khi lưu đơn')
      return
    }
    if (!checkKhongGopBanTheVaDichVu()) return
    if (savedOrderId) {
      // Đã lưu rồi → cập nhật lại khách hàng (có thể vừa đổi/tạo mới) rồi về danh sách
      try {
        await supabase.from('don_hang')
          .update({ khach_hang_id: selectedCustomer?.id || null })
          .eq('id', savedOrderId)
      } catch (err) { notify('Lỗi cập nhật khách hàng: ' + err.message); return }
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
    } catch (err) { notify('Lỗi lưu đơn: ' + err.message) }
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
      notify('Vui lòng chọn khách hàng trước khi tạo thẻ liệu trình')
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
    // ── QUY TẮC: KHÔNG gộp BÁN THẺ MỚI và LÀM DỊCH VỤ/DÙNG THẺ trong cùng 1 đơn ──
    if (!checkKhongGopBanTheVaDichVu()) return
    if (!selectedCustomer?.id) {
      notify('Vui long chon khach hang truoc khi chot don de CRM va doi soat du lieu duoc ghi nhan day du.')
      return
    }
    const validPayments = payLines.filter(l => l.soTien > 0 && l.hinhThuc)
    if (isOverPaid) {
      notify('Số tiền nhận đang lớn hơn tổng đơn. Vui lòng chỉnh lại số tiền thanh toán trước khi chốt.')
      return
    }
    if (tongCuoi > 0 && validPayments.length === 0) {
      notify('Vui lòng nhập số tiền và chọn hình thức thanh toán')
      return
    }
    if (conNo > 0 && !selectedCustomer) {
      notify('Khách lẻ phải thanh toán đủ. Vui lòng chọn khách hàng để ghi nợ.')
      return
    }
    const theMoiItems = lineItems.filter(i => i.loai_item === 'the_moi')
    if (theMoiItems.length > 0 && !selectedCustomer?.id) {
      notify('Đơn có mua thẻ liệu trình — vui lòng chọn khách hàng để lưu thẻ.')
      return
    }
    let insertedPaymentIds = []
    setLoading(true)
    try {
      let oid = savedOrderId
      let preparedItems = await prepareLineItemsForCheckout(oid, lineItems)

      // ── SỬA ĐƠN: chỉ tới đây (admin bấm Cập Nhật) mới đảo ngược đơn gốc ──
      // → bỏ dở trước đó KHÔNG đụng đơn gốc. Đảo tác động cũ + dọn dòng/thanh toán cũ,
      //   rồi ghi lại từ dòng hàng local như tạo mới (vào chính đơn đó).
      if (!oid && editOrderId) {
        await posService.reopenOrder(editOrderId)   // hoàn thẻ/kho/doanh thu cũ + xoá ledger → draft (giữ chi_tiet/thanh_toan cũ)
        // PHẢI xoá sạch dòng cũ TRƯỚC khi ghi lại. Nếu xoá lỗi → THROW (KHÔNG insert)
        // → tránh bug nhân đôi: dòng cũ còn nguyên + insert mới = x2.
        const { error: eDelCt } = await supabase.from('don_hang_chi_tiet').delete().eq('don_hang_id', editOrderId)
        if (eDelCt) throw new Error('Không xoá được dòng hàng cũ, huỷ cập nhật để tránh nhân đôi: ' + eDelCt.message)
        const { error: eDelPay } = await supabase.from('thanh_toan').delete().eq('don_hang_id', editOrderId)
        if (eDelPay) throw new Error('Không xoá được thanh toán cũ: ' + eDelPay.message)
        oid = editOrderId
      }

      if (!savedOrderId) {
        // Tạo order mới (nếu chưa có), HOẶC ghi vào đơn đang sửa (oid = editOrderId)
        if (!oid) {
          const order = await posService.createOrder({ nguoiTao: user?.id, khachHangId: selectedCustomer?.id || null })
          oid = order.id
        }
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
        setEditOrderId(null)
        setLineItems(preparedItems)
        paymentsInserted.current = false  // order mới/sửa → ghi lại payments
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

      // Xoá dòng phụ "đồng tư vấn thẻ" cũ TRƯỚC finalize: nó là san_pham giá 0 (san_pham_id=null)
      // → RPC finalize tưởng là bán sản phẩm và báo "không đủ tồn kho". Sẽ được tạo lại từ
      //   orderStaff (2 KTV) sau finalize. Tránh lỗi chốt đơn bán thẻ có 2 KTV.
      try {
        await supabase.from('don_hang_chi_tiet').delete()
          .eq('don_hang_id', oid).contains('meta', { dongTuVanThe: true })
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

      // Đánh dấu voucher đã dùng (đơn đã chốt thành công) — ghi đơn + số tiền giảm để đo hiệu quả
      if (voucher?.code && voucherGiam > 0) {
        try { await supabase.rpc('voucher_ap_dung', { p_code: voucher.code, p_don_hang_id: oid, p_gia_tri_giam: voucherGiam }) } catch (_) {}
      }

      const comboItems = preparedItems.filter(i => i.loai_item === 'the_moi' && i.meta?.loai === 'combo_lieu_trinh')
      if (comboItems.length > 0) {
        await posService.markCreatedComboCards(oid, comboItems)
      }

      // ── 2 KTV cùng tư vấn 1 thẻ → ghi hoa hồng chia đôi cho KTV thứ 2 ──
      // Dòng "the_moi" (KTV1) đã giữ nửa hoa hồng; thêm 1 dòng phụ thanh_tien=0 cho KTV2
      // → doanh số (thanh_tien) chỉ đếm 1 lần, view v_nhan_vien_thu_nhap cộng hoa hồng cho cả 2.
      try {
        const dsKtv = orderStaff.filter(r => r.nv?.vi_tri === 'ktv')
        // Xoá dòng đồng tư vấn cũ (nếu thanh toán lại) để không nhân đôi
        await supabase.from('don_hang_chi_tiet').delete()
          .eq('don_hang_id', oid).contains('meta', { dongTuVanThe: true })
        if (dsKtv.length >= 2) {
          const ktv2 = dsKtv[1]
          const theLines = preparedItems.filter(i => i.loai_item === 'the_moi')
          const comm2 = theLines.reduce((s, i) => s + Math.round((i.thanh_tien || 0) * (ktv2.pct || 0) / 100), 0)
          if (comm2 > 0) {
            await supabase.from('don_hang_chi_tiet').insert({
              don_hang_id: oid,
              loai_item: 'san_pham',
              san_pham_id: null,
              nhan_vien_id: ktv2.nv.id,
              so_luong: 1, don_gia: 0, thanh_tien: 0,
              ti_le_hoa_hong: ktv2.pct || null,
              tien_tour: 0, tien_hoa_hong: comm2,
              ghi_chu: 'Hoa hồng đồng tư vấn thẻ (KTV thứ 2)',
              meta: { dongTuVanThe: true },
            })
          }
        }
      } catch (e) { console.warn('Đồng tư vấn thẻ:', e) }

      // Admin duyệt yêu cầu sửa đơn của Lễ tân → đánh dấu đã duyệt + về danh sách
      if (reviewYc) {
        try {
          await supabase.from('yeu_cau_chinh_sua')
            .update({ trang_thai: 'da_duyet', nguoi_duyet: user?.ho_ten || 'Admin' })
            .eq('id', reviewYc.id)
        } catch (_) {}
        setLoading(false)
        notify('Đã duyệt & cập nhật đơn ' + maDonEdit + ' theo đề xuất của Lễ tân.')
        window.location.href = '/pos/danh-sach'
        return
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
      notify('Lỗi thanh toán: ' + err.message)
    }
    finally { setLoading(false) }
  }

  // ── Đề xuất sửa đơn (Lễ tân) / Từ chối (Admin) ──────────────────────────────
  const buildEditSnapshot = () => ({
    lineItems, giamMode, giamDVPct, giamDVVnd, vatPct, payLines, orderStaff,
    ghiChuDon, orderNgay, orderGio,
    khachHangId:  selectedCustomer?.id || null,
    khachHangTen: selectedCustomer?.ho_ten || null,
    khachHangSdt: selectedCustomer?.so_dien_thoai || null,
  })

  const submitEditRequest = async () => {
    if (!proposeReason.trim()) { notify('Vui lòng nhập LÝ DO chỉnh sửa đơn.'); return }
    if (lineItems.length === 0) { notify('Đơn phải có ít nhất 1 dịch vụ.'); return }
    setLoading(true)
    try {
      const { error } = await supabase.from('yeu_cau_chinh_sua').insert({
        loai_yeu_cau: 'sua', loai_bang: 'don_hang', ban_ghi_id: editOrderId,
        du_lieu_cu:  { ma_don: maDonEdit },
        du_lieu_moi: buildEditSnapshot(),
        ly_do:       proposeReason.trim(),
        nguoi_yeu_cau: user?.ho_ten || 'Lễ Tân',
        trang_thai:  'cho_duyet',
      })
      if (error) throw error
      setShowProposeModal(false)
      notify(`Đã gửi yêu cầu sửa đơn ${maDonEdit}. Chờ Admin duyệt.`)
      window.location.href = '/pos/danh-sach'
    } catch (e) { notify('Lỗi gửi yêu cầu: ' + e.message) }
    finally { setLoading(false) }
  }

  const rejectEditRequest = async () => {
    if (!reviewYc) return
    setLoading(true)
    try {
      await supabase.from('yeu_cau_chinh_sua')
        .update({ trang_thai: 'tu_choi', nguoi_duyet: user?.ho_ten || 'Admin', ghi_chu_duyet: rejectReason.trim() || 'Không duyệt' })
        .eq('id', reviewYc.id)
      setShowRejectModal(false)
      notify('Đã từ chối yêu cầu sửa đơn. Đơn gốc giữ nguyên.')
      window.location.href = '/pos/danh-sach'
    } catch (e) { notify('Lỗi: ' + e.message) }
    finally { setLoading(false) }
  }

  // ── Computed ─────────────────────────────────────────────────────────────────
  // Có bán thẻ liệu trình trong đơn → hiện panel Hoa Hồng NV bán (ẩn với đơn dịch vụ/dùng thẻ)
  const coBanThe   = lineItems.some(i => i.loai_item === 'the_moi')
  const tongHang   = lineItems.reduce((s, i) => s + (i.thanh_tien || 0), 0)
  const giamDVThuCong = giamMode === 'vnd'
    ? Math.min(tongHang, parseVND(giamDVVnd))
    : Math.round(tongHang * (parseFloat(giamDVPct) || 0) / 100)
  // Voucher: CHỈ giảm % cho dòng DỊCH VỤ thuộc ĐÚNG nhóm của mã + CHƯA có KM khác (giá bán = giá gốc).
  const voucherGiam = (() => {
    if (!voucher) return 0
    return lineItems.reduce((s, i) => {
      if (i.loai_item !== 'dich_vu') return s
      const ten = i.dich_vu?.ten || i.ten_dich_vu || ''
      if (nhomDichVuVoucher(ten) !== voucher.nhom) return s            // sai nhóm → không giảm
      const giaGoc = (i.dich_vu?.gia_co_ban || 0) * (i.so_luong || 1)
      if (giaGoc > 0 && (i.thanh_tien || 0) < giaGoc) return s          // đã có KM → không áp 2 KM
      return s + Math.round((i.thanh_tien || 0) * (voucher.phan_tram || 0) / 100)
    }, 0)
  })()
  const giamDVAmt  = giamDVThuCong + voucherGiam
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
  // Ví trả trước: tổng tiền dùng PTTT thẻ trả trước không được vượt số dư khách
  const tongTraTruoc = payLines.reduce((s, l) => l.hinhThuc === 'the_tra_truoc' ? s + (l.soTien || 0) : s, 0)
  const traTruocVuot = tongTraTruoc > customerPrepaid

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
    const base = orderKmRefPct >= 30 ? 5 : (coLt ? 7 : 10)  // KM≥30%→5%, KTV+LT→7%, KTV đơn→10%
    const soKtv = staffList.filter(s => s.nv.vi_tri === 'ktv').length
    // 2 KTV cùng tư vấn 1 thẻ → chia đôi % cho mỗi người
    return soKtv >= 2 ? Math.round((base / soKtv) * 100) / 100 : base
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
    // BASE hoa hồng = SỐ TIỀN KHÁCH THỰC TRẢ cho dòng này (sau giảm giá toàn đơn),
    // KHÔNG dùng giá gốc (thanh_tien dòng). Phân bổ giảm giá đơn theo trọng số thành tiền dòng.
    // VAT không tính hoa hồng → base = thành tiền hàng sau giảm (chưa cộng VAT).
    const lineNet = tongHang > 0
      ? Math.round((item.thanh_tien || 0) * Math.max(0, tongHang - giamDVAmt) / tongHang)
      : (item.thanh_tien || 0)
    const tienComm = hasPanelSeller
      ? Math.round(lineNet * sellerPct / 100)
      : (item.tien_hoa_hong || Math.round(lineNet * staffPct / 100))
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

  const canConfirm = lineItems.length > 0 && !!selectedCustomer?.id && !isOverPaid && !traTruocVuot && (
    tongCuoi === 0
    || (payLines.some(l => l.soTien > 0 && l.hinhThuc) &&
        (tongNhan >= tongCuoi || (conNo > 0 && !!selectedCustomer)))
  )

  const disabledReason = lineItems.length === 0
    ? 'Thêm dịch vụ để bắt đầu'
    : !selectedCustomer?.id
      ? 'Vui lòng chọn khách hàng trước khi chốt đơn'
      : traTruocVuot
        ? `Số dư trả trước không đủ (còn ${formatCurrency(customerPrepaid)}, cần ${formatCurrency(tongTraTruoc)})`
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
      @keyframes posToastIn { from { opacity: 0 } to { opacity: 1 } }
    `}</style>
    {posToast && createPortal(
      <div style={{
        position: 'fixed', top: 22, left: '50%', transform: 'translateX(-50%)', zIndex: 100002,
        display: 'flex', alignItems: 'center', gap: 10, padding: '13px 22px', borderRadius: 14,
        background: posToast.type === 'error' ? 'linear-gradient(135deg,#C0392B,#9e2818)' : 'linear-gradient(135deg,#2D7A4F,#1f5c3a)',
        color: '#fff', fontFamily: FONT.sans, fontWeight: 600, fontSize: 13.5, maxWidth: '88vw',
        boxShadow: '0 12px 34px rgba(0,0,0,.28)', whiteSpace: 'pre-line', lineHeight: 1.5, animation: 'posToastIn .25s ease',
      }}>
        <span style={{ fontSize: 18, flexShrink: 0 }}>{posToast.type === 'error' ? '⚠️' : '✓'}</span>
        <span>{posToast.msg}</span>
      </div>, document.body)}
    <div style={{ display: 'flex', flex: 1, minHeight: 0, height: '100dvh', maxHeight: '100dvh', overflow: 'hidden', background: 'var(--bg)' }}>

      {/* ═══ LEFT PANEL (60%) ═══ */}
      <div style={{ flex: 3, minWidth: 0, display: 'flex', flexDirection: 'column', overflowY: 'auto', borderRight: '1px solid var(--line)' }}>

        {/* Left header */}
        <div style={{ padding: '10px 16px', borderBottom: `1px solid ${C.line}`, background: C.surface, flexShrink: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, fontFamily: FONT.serif, color: C.champagne }}>{editMode ? 'Sửa Đơn Hàng' : 'Tạo Đơn Hàng'}</div>
          <div style={{ fontSize: 11, color: C.ink3, marginTop: 1 }}>
            {user?.ho_ten} · {todayStats.soDon} đơn hôm nay · {formatCurrency(todayStats.tongThu)}
          </div>
        </div>

        {/* Banner: Admin xem đề xuất sửa từ Lễ tân (?yc=) */}
        {reviewYc && (
          <div style={{ padding: '9px 16px', background: 'rgba(108,52,131,.10)', borderBottom: '1px solid rgba(108,52,131,.28)', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <span style={{ fontSize: 15 }}>📝</span>
            <span style={{ fontSize: 11.5, color: '#6C3483', fontWeight: 600, lineHeight: 1.35 }}>
              Đề xuất sửa từ <b>{reviewYc.nguoi_yeu_cau || 'Lễ Tân'}</b> · Lý do: <b>{reviewYc.ly_do}</b> — xem rồi bấm <b>"Duyệt & Cập Nhật"</b> hoặc <b>"Từ chối"</b>.
            </span>
          </div>
        )}

        {/* Banner: Lễ tân đề xuất sửa (chưa áp, gửi duyệt) */}
        {!reviewYc && isLeTan && editOrderId && (
          <div style={{ padding: '9px 16px', background: 'rgba(160,113,79,.10)', borderBottom: '1px solid rgba(160,113,79,.25)', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <span style={{ fontSize: 15 }}>✏️</span>
            <span style={{ fontSize: 11.5, color: '#8a6335', fontWeight: 600, lineHeight: 1.35 }}>
              Đang đề xuất sửa đơn — chỉnh xong bấm <b>"Gửi Yêu Cầu Duyệt"</b> (nhập lý do). Đơn gốc <b>giữ nguyên</b> tới khi Admin duyệt.
            </span>
          </div>
        )}

        {/* Banner chế độ sửa đơn (Admin) — nhắc chốt lại để lưu */}
        {editMode && !reviewYc && !isLeTan && (
          <div style={{ padding: '9px 16px', background: 'rgba(160,113,79,.10)', borderBottom: '1px solid rgba(160,113,79,.25)', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <span style={{ fontSize: 15 }}>✎</span>
            <span style={{ fontSize: 11.5, color: '#8a6335', fontWeight: 600, lineHeight: 1.35 }}>
              Đang sửa đơn — chỉnh xong bấm <b>"Lưu Thay Đổi"</b> để lưu. Nếu thoát mà chưa lưu, <b>đơn gốc vẫn giữ nguyên</b> (an toàn).
            </span>
          </div>
        )}

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
                    <LieuTrinhCard key={card.id} card={card} onUse={handleAddCard} onGiaHan={openGiaHan} />
                  ))}
                </div>
              )}

              {/* ── VÍ TRẢ TRƯỚC ── */}
              <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(201,169,110,.08)', border: '1.5px solid rgba(201,169,110,.35)', borderRadius: 8, padding: '7px 12px' }}>
                <span style={{ fontSize: 16 }}>👛</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#8a6a35', textTransform: 'uppercase', letterSpacing: '.05em' }}>Số dư trả trước</div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: customerPrepaid > 0 ? '#8a6a35' : C.ink3, fontFamily: FONT.serif }}>
                    {formatCurrency(customerPrepaid)}
                  </div>
                </div>
                <button onClick={() => setNapModalOpen(true)}
                  style={{ background: '#fff', border: '1.5px solid var(--champagne)', color: 'var(--champagne)', borderRadius: 7, padding: '5px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                  + Nạp tiền
                </button>
              </div>

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
                    Thẻ hết hạn / đã dùng ({cardHistory.length})
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
                              {c.so_buoi_da_dung}/{c.so_buoi_tong} buổi
                              {c.so_buoi_con_lai > 0 && <span style={{ marginLeft: 5, color: '#C0392B', fontWeight: 700 }}>· Còn {c.so_buoi_con_lai} buổi</span>}
                              {' · '}{formatCurrency(c.gia_tri_the || 0)}
                              {c.ngay_het_han && <span style={{ marginLeft: 6 }}>HH: {fmtDate(c.ngay_het_han)}</span>}
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
                  onUpsale={handleUpsale}
                  kmGoiY={item.dich_vu_id ? kmByDichVu[item.dich_vu_id] : null}
                />
              ))}
            </div>

            {/* ── Summary + Payment ── */}
            {lineItems.length > 0 && (
            <div style={{ padding: '10px 14px' }}>

              {/* Mã KM / Voucher */}
              <div style={{ display: 'flex', gap: 6, marginBottom: voucher || voucherMsg ? 4 : 8 }}>
                <input value={maKM} onChange={e => { setMaKM(e.target.value); setVoucher(null); setVoucherMsg('') }}
                  onKeyDown={e => { if (e.key === 'Enter') apDungVoucher() }} placeholder="Nhập mã giảm giá của khách"
                  style={{ flex: 1, border: '1px solid var(--bord)', borderRadius: 6, padding: '5px 8px', fontSize: 12, background: '#fff', outline: 'none', fontFamily: 'var(--sans)', textTransform: 'uppercase' }} />
                <button onClick={apDungVoucher} disabled={voucherChecking} style={{ padding: '5px 12px', border: 'none', borderRadius: 6, background: 'var(--champagne)', color: '#2a1d14', fontWeight: 700, fontSize: 11, cursor: 'pointer', fontFamily: 'var(--sans)' }}>{voucherChecking ? '...' : 'ÁP DỤNG'}</button>
              </div>
              {voucher && (
                <div style={{ marginBottom: 8, padding: '5px 9px', borderRadius: 6, background: `${C.thu}14`, fontSize: 11.5, color: C.thu, fontWeight: 700, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>✓ {voucher.ten_nhom} −{voucher.phan_tram}%</span>
                  <span style={{ cursor: 'pointer', color: C.chi }} onClick={() => { setVoucher(null); setMaKM(''); setVoucherMsg('') }}>✕ bỏ</span>
                </div>
              )}
              {voucher && voucherGiam === 0 && (
                <div style={{ marginBottom: 8, fontSize: 11, color: C.chi }}>Đơn chưa có dịch vụ thuộc nhóm mã (hoặc DV đã có KM) → mã chưa giảm được.</div>
              )}
              {voucherMsg && <div style={{ marginBottom: 8, fontSize: 11, color: C.chi, fontWeight: 600 }}>{voucherMsg}</div>}

              {/* Tạm tính */}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 5 }}>
                <span style={{ color: 'var(--ink3)' }}>Tạm tính</span>
                <span style={{ fontWeight: 700, fontFamily: 'var(--serif)' }}>{formatCurrency(tongHang)}</span>
              </div>
              {voucherGiam > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 5 }}>
                  <span style={{ color: C.thu }}>− Voucher ({voucher.phan_tram}% {voucher.ten_nhom?.split(' (')[0]})</span>
                  <span style={{ fontWeight: 700, color: C.thu, fontFamily: 'var(--serif)' }}>−{formatCurrency(voucherGiam)}</span>
                </div>
              )}

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
                prepaidBalance={customerPrepaid}
                prepaidUsed={tongTraTruoc}
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


          {/* ── Bottom action bar — ĐÓNG BĂNG đáy khung hình (sticky) ── */}
          <div style={{ borderTop: `1px solid ${C.line2}`, padding: '10px 12px 14px', position: 'sticky', bottom: 0, zIndex: 50, background: C.bg, boxShadow: '0 -6px 16px rgba(0,0,0,.10)' }}>
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

              {/* ← Thoát (chế độ sửa: không lưu, đơn gốc giữ nguyên) / Hủy / Đơn mới */}
              {editOrderId ? (
                <button onClick={handleVoidOrder} title="Thoát — KHÔNG lưu thay đổi, đơn gốc giữ nguyên"
                  style={{
                    padding: '0 16px', height: 40, border: `1.5px solid ${C.line2}`, borderRadius: 999,
                    background: C.surface2, color: C.ink2, fontWeight: 700, fontSize: 13, fontFamily: FONT.sans,
                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, justifyContent: 'center', flexShrink: 0,
                  }}>← Thoát</button>
              ) : (
                <button onClick={handleVoidOrder} title="Hủy đơn / Đơn mới"
                  style={{
                    width: 44, height: 40, border: `1.5px solid ${C.line2}`, borderRadius: 999,
                    background: C.surface2, color: C.ink2,
                    cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>←</button>
              )}

              {/* Lưu nháp — chỉ khi tạo/nháp, KHÔNG hiện khi sửa đơn */}
              {!editOrderId && (
                <button onClick={handleSaveDraft} title="Lưu đơn nháp để khách thanh toán sau"
                  style={{
                    width: 60, height: 40, border: `1.5px solid ${C.line2}`, borderRadius: 999,
                    background: C.surface2, color: C.ink,
                    cursor: 'pointer', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontFamily: FONT.sans,
                  }}>Lưu</button>
              )}

              {/* Lễ tân sửa đơn → Từ chối ẩn; Admin xem đề xuất (reviewYc) → nút Từ Chối */}
              {reviewYc && (
                <button onClick={() => { setRejectReason(''); setShowRejectModal(true) }} disabled={loading}
                  style={{
                    padding: '0 14px', height: 40, border: '1.5px solid rgba(192,57,43,.4)', borderRadius: 999,
                    background: 'rgba(192,57,43,.06)', color: '#C0392B', fontWeight: 700, fontSize: 12.5, fontFamily: FONT.sans,
                    cursor: 'pointer', flexShrink: 0,
                  }}>✕ Từ chối</button>
              )}

              {/* Nút chính: Lễ tân→Gửi duyệt · Admin xem đề xuất→Duyệt&Cập nhật · Sửa→Lưu · Nháp→Thanh toán */}
              <button
                disabled={loading || ((isLeTan && editOrderId && !reviewYc) ? lineItems.length === 0 : !canConfirm)}
                onClick={() => {
                  if (isLeTan && editOrderId && !reviewYc) {
                    if (lineItems.length === 0) { notify('Đơn phải có ít nhất 1 dịch vụ'); return }
                    setProposeReason(''); setShowProposeModal(true); return
                  }
                  handleConfirmOrder(true)
                }}
                title={reviewYc ? 'Duyệt đề xuất & cập nhật đơn' : (isLeTan && editOrderId) ? 'Gửi yêu cầu sửa cho Admin duyệt' : editOrderId ? 'Lưu thay đổi vào đơn (không thanh toán lại)' : 'Thanh toán và in hoá đơn'}
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
                  reviewYc
                    ? '✓ Duyệt & Cập Nhật'
                  : (isLeTan && editOrderId)
                    ? '📤 Gửi Yêu Cầu Duyệt'
                  : editMode
                    ? '💾 Lưu Thay Đổi'
                    : tongCuoi === 0
                      ? 'Thanh Toán & In'
                      : conNo > 0 && selectedCustomer
                        ? 'Ghi Nợ & In'
                        : 'Thanh Toán & In'
                )}
              </button>

              {/* Thanh Toán — nút phụ (KHÔNG hiện khi sửa đơn: sửa chỉ Lưu/Thoát) */}
              {!editOrderId && (
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
              )}

            </div>
          </div>
          </div>{/* end scrollable */}
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

    <NapTraTruocModal
      open={napModalOpen}
      customer={selectedCustomer}
      currentBalance={customerPrepaid}
      amount={napSoTien}
      method={napHinhThuc}
      ghiChu={napGhiChu}
      loading={napLoading}
      onAmountChange={setNapSoTien}
      onMethodChange={setNapHinhThuc}
      onGhiChuChange={setNapGhiChu}
      onNap={handleNap}
      onClose={() => { setNapModalOpen(false); setNapSoTien(''); setNapGhiChu(''); setNapHinhThuc('tien_mat') }}
    />

    {/* Modal: Gia hạn thẻ liệu trình (khách quay lại) */}
    {giaHanCard && createPortal(
      <div onClick={() => setGiaHanCard(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <div onClick={e => e.stopPropagation()} style={{ width: 'min(420px,94vw)', background: '#fff', borderRadius: 14, padding: 22, boxShadow: '0 20px 60px rgba(0,0,0,.3)' }}>
          <div style={{ fontSize: 16, fontWeight: 800, fontFamily: FONT.serif, color: C.ink, marginBottom: 2 }}>Gia Hạn Thẻ Liệu Trình</div>
          <div style={{ fontSize: 13, color: C.ink2, fontWeight: 700, marginBottom: 2 }}>{giaHanCard.ten_dich_vu}</div>
          <div style={{ fontSize: 12, color: C.ink3, marginBottom: 14 }}>
            Hạn hiện tại: {giaHanCard.ngay_het_han ? String(giaHanCard.ngay_het_han).split('-').reverse().join('/') : 'Không giới hạn'}
            {giaHanCard.ngay_het_han && giaHanCard.ngay_het_han < todayISO() && <span style={{ color: C.chi, fontWeight: 700 }}> · đã hết hạn</span>}
          </div>

          <div style={{ fontSize: 11.5, color: C.ink3, fontWeight: 700, marginBottom: 6 }}>Gia hạn nhanh (tính từ hôm nay):</div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
            {[['+3 tháng', 3, 'month'], ['+6 tháng', 6, 'month'], ['+1 năm', 1, 'year'], ['+2 năm', 2, 'year']].map(([l, so, dv]) => {
              const ngay = addDurationISO(todayISO(), so, dv)
              const active = giaHanNgay === ngay
              return (
                <button key={l} type="button" onClick={() => setGiaHanNgay(ngay)} style={{
                  flex: '1 1 80px', padding: '8px 6px', borderRadius: 9,
                  border: active ? 'none' : `1px solid ${C.line2}`,
                  background: active ? C.grad : C.surface2, color: active ? '#fff' : C.ink2,
                  fontWeight: 800, fontSize: 12, cursor: 'pointer',
                }}>{l}</button>
              )
            })}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
            <span style={{ fontSize: 12, color: C.ink3 }}>Hạn mới:</span>
            <button onClick={() => setGiaHanOpen(true)} style={{
              flex: 1, border: `1px solid ${C.champagne}`, borderRadius: 8, padding: '8px 12px',
              fontSize: 13.5, fontWeight: 800, background: '#fff', color: C.champagne, cursor: 'pointer', textAlign: 'left',
            }}>
              {giaHanNgay ? String(giaHanNgay).split('-').reverse().join('/') : 'Chọn ngày...'}
            </button>
          </div>

          {isLeTan && (
            <div style={{ fontSize: 11.5, color: '#9C6A12', background: '#FFF6E9', border: '1px solid #F0C674', borderRadius: 8, padding: '7px 10px', marginBottom: 12, lineHeight: 1.4 }}>
              ⚠ Lễ tân gia hạn cần <b>Admin duyệt</b>. Yêu cầu sẽ gửi đi — thẻ chỉ dùng được sau khi Admin duyệt.
            </div>
          )}
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => setGiaHanCard(null)} style={{ flex: 1, padding: '11px', background: '#fff', border: `1px solid ${C.line2}`, borderRadius: 10, fontWeight: 700, fontSize: 13.5, cursor: 'pointer', color: C.ink2 }}>Huỷ</button>
            <button onClick={doGiaHan} disabled={giaHanLoading || !giaHanNgay} style={{ flex: 2, padding: '11px', background: C.grad, color: '#fff', border: 'none', borderRadius: 10, fontWeight: 800, fontSize: 13.5, cursor: 'pointer', opacity: giaHanLoading ? .7 : 1 }}>
              {giaHanLoading ? 'Đang lưu...' : isLeTan ? '📨 Gửi yêu cầu duyệt' : '✓ Xác nhận gia hạn'}
            </button>
          </div>

          <DatePicker open={giaHanOpen} selectedDate={giaHanNgay || null} onClose={() => setGiaHanOpen(false)} onConfirm={d => { setGiaHanNgay(d); setGiaHanOpen(false) }} />
        </div>
      </div>,
      document.body
    )}

    {/* Modal: Lễ tân nhập LÝ DO chỉnh sửa (bắt buộc) trước khi gửi duyệt */}
    {showProposeModal && (
      <div onClick={() => setShowProposeModal(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <div onClick={e => e.stopPropagation()} style={{ width: 'min(460px,94vw)', background: '#fff', borderRadius: 14, padding: 22, boxShadow: '0 20px 60px rgba(0,0,0,.3)' }}>
          <div style={{ fontSize: 16, fontWeight: 800, fontFamily: FONT.serif, color: C.ink, marginBottom: 4 }}>Gửi Yêu Cầu Sửa Đơn</div>
          <div style={{ fontSize: 12.5, color: C.ink3, marginBottom: 14 }}>Đơn <b style={{ color: C.champagne }}>{maDonEdit}</b> — Admin sẽ xem & duyệt thay đổi của bạn.</div>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.ink2, marginBottom: 6 }}>Lý do chỉnh sửa <span style={{ color: '#C0392B' }}>*</span></div>
          <textarea autoFocus value={proposeReason} onChange={e => setProposeReason(e.target.value)} rows={3}
            placeholder="VD: Khách đổi dịch vụ, ghi nhầm KTV, sai số tiền..."
            style={{ width: '100%', boxSizing: 'border-box', border: '1px solid var(--bord)', borderRadius: 9, padding: '9px 11px', fontSize: 13, outline: 'none', resize: 'none', fontFamily: FONT.sans, color: C.ink }} />
          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <button onClick={() => setShowProposeModal(false)} style={{ flex: 1, height: 42, borderRadius: 10, border: `1px solid ${C.line2}`, background: '#fff', color: C.ink2, fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: FONT.sans }}>Huỷ</button>
            <button onClick={submitEditRequest} disabled={loading || !proposeReason.trim()} style={{ flex: 2, height: 42, borderRadius: 10, border: 'none', background: proposeReason.trim() ? 'linear-gradient(135deg,#C9A96E,#A0714F)' : 'rgba(0,0,0,.1)', color: proposeReason.trim() ? '#fff' : C.ink3, fontWeight: 800, fontSize: 13, cursor: loading || !proposeReason.trim() ? 'not-allowed' : 'pointer', fontFamily: FONT.sans }}>
              {loading ? 'Đang gửi…' : '📤 Gửi Yêu Cầu'}
            </button>
          </div>
        </div>
      </div>
    )}

    {/* Modal: Admin nhập lý do TỪ CHỐI đề xuất sửa đơn */}
    {showRejectModal && (
      <div onClick={() => setShowRejectModal(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <div onClick={e => e.stopPropagation()} style={{ width: 'min(460px,94vw)', background: '#fff', borderRadius: 14, padding: 22, boxShadow: '0 20px 60px rgba(0,0,0,.3)' }}>
          <div style={{ fontSize: 16, fontWeight: 800, fontFamily: FONT.serif, color: C.ink, marginBottom: 4 }}>Từ Chối Yêu Cầu Sửa</div>
          <div style={{ fontSize: 12.5, color: C.ink3, marginBottom: 14 }}>Đơn <b>{maDonEdit}</b> giữ nguyên, không áp thay đổi.</div>
          <textarea autoFocus value={rejectReason} onChange={e => setRejectReason(e.target.value)} rows={3}
            placeholder="Lý do từ chối (tuỳ chọn)..."
            style={{ width: '100%', boxSizing: 'border-box', border: '1px solid var(--bord)', borderRadius: 9, padding: '9px 11px', fontSize: 13, outline: 'none', resize: 'none', fontFamily: FONT.sans, color: C.ink }} />
          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <button onClick={() => setShowRejectModal(false)} style={{ flex: 1, height: 42, borderRadius: 10, border: `1px solid ${C.line2}`, background: '#fff', color: C.ink2, fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: FONT.sans }}>Quay lại</button>
            <button onClick={rejectEditRequest} disabled={loading} style={{ flex: 2, height: 42, borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#C0392B,#8e2218)', color: '#fff', fontWeight: 800, fontSize: 13, cursor: loading ? 'not-allowed' : 'pointer', fontFamily: FONT.sans }}>
              {loading ? 'Đang xử lý…' : '✕ Từ Chối'}
            </button>
          </div>
        </div>
      </div>
    )}

    </>
  )
}

// ── Router ────────────────────────────────────────────────────────────────────
export default function PosApp() {
  const path   = window.location.pathname
  const params = new URLSearchParams(window.location.search)
  const resumeId = params.get('resume')
  const ycId     = params.get('yc')   // admin mở yêu cầu sửa đơn của Lễ tân
  const editMode = params.get('mode') === 'edit' || !!ycId
  if (path === '/pos/danh-sach') {
    return <PosOrderHistory onResumeOrder={(o) => { window.location.href = '/pos?resume=' + o.id }} />
  }
  return <PosCreateOrder resumeOrderId={resumeId} editMode={editMode} ycId={ycId} />
}
