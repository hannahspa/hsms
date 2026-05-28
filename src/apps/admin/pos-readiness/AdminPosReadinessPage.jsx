import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { formatCurrency, todayISO } from '../../../lib/utils'
import { C } from '../../../constants/colors'
import { HINH_THUC_THU_LABEL } from '../../../constants/enums'

const PAYMENT_KEYS = ['tien_mat', 'chuyen_khoan', 'quet_the', 'the_tra_truoc']

const PAYMENT_LABEL = {
  ...HINH_THUC_THU_LABEL,
  tien_mat: 'Tiền mặt',
  chuyen_khoan: 'MB Bank',
  quet_the: 'TP Bank',
  the_tra_truoc: 'Thẻ trả trước',
}

const MYSPA_FIELDS = [
  { key: 'orders', label: 'Số đơn', type: 'number' },
  { key: 'paid', label: 'Thực thu', type: 'money' },
  { key: 'cash', label: 'Tiền mặt', type: 'money' },
  { key: 'mb', label: 'MB Bank', type: 'money' },
  { key: 'tp', label: 'TP Bank', type: 'money' },
  { key: 'prepaid', label: 'Thẻ trả trước', type: 'money' },
  { key: 'tour', label: 'Tiền tour', type: 'money' },
  { key: 'commission', label: 'Hoa hồng', type: 'money' },
]

const TEST_SCENARIOS = [
  {
    id: 'service_cash',
    title: 'Bán dịch vụ thanh toán tiền mặt',
    note: 'Chọn khách, chọn dịch vụ, chọn KTV, chốt tiền mặt, kiểm tra doanh thu và tiền tour.',
  },
  {
    id: 'service_bank_card',
    title: 'Bán dịch vụ chuyển khoản/quẹt thẻ',
    note: 'MB Bank cho chuyển khoản, TP Bank cho quẹt thẻ, không lẫn phương thức.',
  },
  {
    id: 'multi_service_staff',
    title: 'Một đơn nhiều dịch vụ, nhiều KTV',
    note: 'Mỗi dòng dịch vụ gắn đúng nhân viên và tiền tour riêng.',
  },
  {
    id: 'line_discount',
    title: 'Giảm giá từng dịch vụ và tổng đơn',
    note: 'Kiểm tra giảm giá dòng, giảm giá tổng, tổng thanh toán không lệch.',
  },
  {
    id: 'use_treatment_card',
    title: 'Khách dùng thẻ liệu trình đã trả tiền',
    note: 'Không bắt chọn phương thức thanh toán, trừ buổi, ghi CRM, ghi tour KTV.',
  },
  {
    id: 'sell_new_card',
    title: 'Bán thẻ liệu trình mới',
    note: 'Tạo thẻ cho khách, ghi doanh thu, ghi hoa hồng nhân viên bán.',
  },
  {
    id: 'sell_combo',
    title: 'Bán combo liệu trình',
    note: 'Tạo combo đúng số lần/thời hạn, ghi commission, CRM thấy thẻ mới.',
  },
  {
    id: 'split_payment',
    title: 'Thanh toán nhiều phương thức',
    note: 'Một đơn có tiền mặt + MB/TP, đối soát ngày phải tách đúng từng nguồn.',
  },
  {
    id: 'partial_debt',
    title: 'Thanh toán thiếu/công nợ',
    note: 'Ghi công nợ khách hàng, đơn thể hiện còn nợ và CRM thấy công nợ.',
  },
  {
    id: 'void_order',
    title: 'Hủy đơn có lý do',
    note: 'Hoàn kho/thẻ nếu có, đánh dấu hủy, không làm rối doanh thu thật.',
  },
  {
    id: 'crm_history',
    title: 'CRM cập nhật sau chốt đơn',
    note: 'Khách hàng thấy dịch vụ đã dùng, thẻ đã mua, sản phẩm đã mua.',
  },
  {
    id: 'staff_income',
    title: 'Báo cáo nhân sự khớp tour/hoa hồng',
    note: 'Nhân viên xem được đúng tiền tour và commission theo ngày.',
  },
]

function num(value) {
  return Number(value || 0)
}

function fmtNumber(value) {
  return new Intl.NumberFormat('vi-VN').format(num(value))
}

function parseMoney(value) {
  return Number(String(value || '').replace(/[^\d-]/g, '')) || 0
}

function shortDate(date) {
  if (!date) return ''
  const [y, m, d] = String(date).split('-')
  return `${d}/${m}/${y}`
}

function moneyInput(value, onChange) {
  return (
    <input
      value={value ? fmtNumber(value) : ''}
      onChange={e => onChange(parseMoney(e.target.value))}
      placeholder="0"
      style={{
        width: '100%',
        boxSizing: 'border-box',
        border: `1px solid ${C.line}`,
        borderRadius: 8,
        padding: '8px 10px',
        background: C.surface2,
        color: C.text,
        fontWeight: 700,
        fontSize: 13,
        textAlign: 'right',
        outline: 'none',
      }}
    />
  )
}

function Card({ title, value, note, color = C.text, warn = false }) {
  return (
    <div style={{
      background: C.surface2,
      border: `1px solid ${warn ? 'rgba(230,126,34,.28)' : C.line}`,
      borderRadius: 8,
      padding: '14px 16px',
      boxShadow: C.shadowSm,
      minHeight: 74,
    }}>
      <div style={{ fontSize: 11, fontWeight: 800, color: C.textSub, textTransform: 'uppercase', letterSpacing: '.04em' }}>
        {title}
      </div>
      <div style={{ marginTop: 6, fontSize: 22, fontWeight: 900, color }}>{value}</div>
      {note && <div style={{ marginTop: 4, fontSize: 11, color: C.textMute }}>{note}</div>}
    </div>
  )
}

function Diff({ hsms, myspa, type = 'money' }) {
  const diff = num(hsms) - num(myspa)
  const ok = diff === 0
  const color = ok ? C.thu : Math.abs(diff) <= 1000 ? C.warn : C.chi
  if (!myspa && myspa !== 0) return <span style={{ color: C.textMute }}>Chưa nhập</span>
  return (
    <span style={{ color, fontWeight: 900 }}>
      {ok ? 'Khớp' : `${diff > 0 ? '+' : ''}${type === 'money' ? formatCurrency(diff) : fmtNumber(diff)}`}
    </span>
  )
}

function buildEmptyMyspa() {
  return Object.fromEntries(MYSPA_FIELDS.map(f => [f.key, '']))
}

export default function AdminPosReadinessPage() {
  const [date, setDate] = useState(todayISO())
  const [loading, setLoading] = useState(true)
  const [orders, setOrders] = useState([])
  const [payments, setPayments] = useState([])
  const [items, setItems] = useState([])
  const [error, setError] = useState('')
  const [myspa, setMyspa] = useState(buildEmptyMyspa)

  useEffect(() => {
    const saved = localStorage.getItem(`hsms-pos-reconcile-${date}`)
    setMyspa(saved ? { ...buildEmptyMyspa(), ...JSON.parse(saved) } : buildEmptyMyspa())
  }, [date])

  useEffect(() => {
    localStorage.setItem(`hsms-pos-reconcile-${date}`, JSON.stringify(myspa))
  }, [date, myspa])

  useEffect(() => {
    let alive = true
    async function load() {
      setLoading(true)
      setError('')
      setOrders([])
      setPayments([])
      setItems([])

      const orderRes = await supabase
        .from('don_hang')
        .select('id,ma_don,ngay,created_at,trang_thai,is_test,khach_hang_id,tong_tien_hang,giam_gia,vat,thuc_thu,con_no,khach_hang:khach_hang_id(ho_ten,so_dien_thoai)')
        .eq('ngay', date)
        .order('ngay', { ascending: false })
        .order('ma_don', { ascending: false })

      if (!alive) return
      if (orderRes.error) {
        setError(orderRes.error.message)
        setLoading(false)
        return
      }

      const loadedOrders = orderRes.data || []
      const ids = loadedOrders.map(o => o.id)
      if (!ids.length) {
        setOrders([])
        setPayments([])
        setItems([])
        setLoading(false)
        return
      }

      const [paymentRes, itemRes] = await Promise.all([
        supabase.from('thanh_toan').select('id,don_hang_id,hinh_thuc,so_tien,created_at').in('don_hang_id', ids),
        supabase
          .from('don_hang_chi_tiet')
          .select('id,don_hang_id,loai_item,dich_vu_id,san_pham_id,the_lieu_trinh_id,nhan_vien_id,so_luong,don_gia,thanh_tien,tien_tour,tien_commission,meta,nhan_vien:nhan_vien_id(ho_ten),dich_vu:dich_vu_id(ti_le_hoa_hong,promotion_config)')
          .in('don_hang_id', ids),
      ])

      if (!alive) return
      if (paymentRes.error || itemRes.error) {
        setError(paymentRes.error?.message || itemRes.error?.message || 'Không tải được dữ liệu POS')
      } else {
        setOrders(loadedOrders)
        setPayments(paymentRes.data || [])
        setItems(itemRes.data || [])
      }
      setLoading(false)
    }

    load()
    return () => { alive = false }
  }, [date])

  const summary = useMemo(() => {
    const validOrders = orders.filter(o => o.trang_thai !== 'huy')
    const paidOrders = validOrders.filter(o => o.trang_thai === 'da_thanh_toan' || o.trang_thai === 'no_mot_phan')
    const validOrderIds = new Set(validOrders.map(o => o.id))
    const validPayments = payments.filter(p => validOrderIds.has(p.don_hang_id))
    const validItems = items.filter(i => validOrderIds.has(i.don_hang_id))
    const paymentByType = Object.fromEntries(PAYMENT_KEYS.map(k => [k, 0]))
    validPayments.forEach(p => {
      paymentByType[p.hinh_thuc] = num(paymentByType[p.hinh_thuc]) + num(p.so_tien)
    })

    const byType = { dich_vu: 0, the_moi: 0, the_lieu_trinh: 0, san_pham: 0 }
    let tour = 0
    let commission = 0
    validItems.forEach(i => {
      byType[i.loai_item] = num(byType[i.loai_item]) + num(i.thanh_tien)
      const isCommission = i.loai_item === 'the_moi' || i.loai_item === 'san_pham'
      if (isCommission) commission += num(i.tien_commission || 0)
      else tour += num(i.tien_tour || 0)
    })

    const paidTotal = validPayments.reduce((s, p) => s + num(p.so_tien), 0)
    const orderPaidTotal = validOrders.reduce((s, o) => s + num(o.thuc_thu), 0)
    const gross = validOrders.reduce((s, o) => s + num(o.tong_tien_hang), 0)
    const discount = validOrders.reduce((s, o) => s + num(o.giam_gia), 0)
    const debt = validOrders.reduce((s, o) => s + num(o.con_no), 0)

    const paymentsByOrder = validPayments.reduce((acc, p) => {
      acc[p.don_hang_id] = num(acc[p.don_hang_id]) + num(p.so_tien)
      return acc
    }, {})
    const paymentTypesByOrder = validPayments.reduce((acc, p) => {
      if (!acc[p.don_hang_id]) acc[p.don_hang_id] = new Set()
      acc[p.don_hang_id].add(p.hinh_thuc)
      return acc
    }, {})
    const itemsByOrder = validItems.reduce((acc, i) => {
      if (!acc[i.don_hang_id]) acc[i.don_hang_id] = []
      acc[i.don_hang_id].push(i)
      return acc
    }, {})

    const issues = []
    validOrders.forEach(o => {
      const orderItems = itemsByOrder[o.id] || []
      const orderPayment = num(paymentsByOrder[o.id])
      const expectedPayment = Math.max(0, num(o.thuc_thu) - num(o.con_no))
      if (!o.khach_hang_id) issues.push({ level: 'warn', ma_don: o.ma_don, text: 'Đơn chưa gắn khách hàng' })
      if (o.trang_thai !== 'draft' && orderPayment !== expectedPayment) {
        issues.push({ level: 'danger', ma_don: o.ma_don, text: `Thanh toán lệch ${formatCurrency(orderPayment - num(o.thuc_thu))}` })
      }
      if (!orderItems.length) issues.push({ level: 'danger', ma_don: o.ma_don, text: 'Đơn chưa có dòng dịch vụ/sản phẩm' })
      orderItems.forEach(i => {
        const income = i.loai_item === 'the_moi' || i.loai_item === 'san_pham'
          ? num(i.tien_commission || 0)
          : num(i.tien_tour || 0)
        if (income > 0 && !i.nhan_vien_id && !i.meta?.myspaStaffDisplay) {
          issues.push({ level: 'danger', ma_don: o.ma_don, text: 'Có tour/hoa hồng nhưng thiếu nhân viên' })
        }
        const ktvRule = i.dich_vu?.promotion_config?.myspa?.commission_ktv
        const explicitZeroTour = i.loai_item === 'dich_vu'
          && ktvRule
          && ktvRule.raw != null
          && Number(ktvRule.amount || 0) === 0
          && Number(ktvRule.percent || 0) === 0
        if ((i.loai_item === 'dich_vu' || i.loai_item === 'the_lieu_trinh') && (i.nhan_vien_id || i.meta?.myspaStaffDisplay) && income === 0 && !explicitZeroTour) {
          issues.push({ level: 'warn', ma_don: o.ma_don, text: 'Dịch vụ có KTV nhưng tiền tour = 0đ, cần kiểm tra cấu hình' })
        }
        if ((i.loai_item === 'the_moi' || i.loai_item === 'san_pham') && (i.nhan_vien_id || i.meta?.myspaStaffDisplay) && income === 0) {
          issues.push({ level: 'warn', ma_don: o.ma_don, text: 'Bán hàng có nhân viên nhưng hoa hồng = 0đ, cần kiểm tra cấu hình' })
        }
        if (i.loai_item === 'san_pham' && !i.san_pham_id) {
          issues.push({ level: 'warn', ma_don: o.ma_don, text: 'Dòng sản phẩm chưa gắn mã kho' })
        }
      })
    })

    const hasOrder = (predicate) => validOrders.some(o => predicate(o, itemsByOrder[o.id] || [], paymentTypesByOrder[o.id] || new Set()))
    const coverage = {
      service_cash: hasOrder((o, its, payTypes) => its.some(i => i.loai_item === 'dich_vu') && payTypes.has('tien_mat')),
      service_bank_card: hasOrder((o, its, payTypes) => its.some(i => i.loai_item === 'dich_vu') && (payTypes.has('chuyen_khoan') || payTypes.has('quet_the'))),
      multi_service_staff: hasOrder((o, its) => {
        const serviceLines = its.filter(i => i.loai_item === 'dich_vu')
        const staff = new Set(serviceLines.map(i => i.nhan_vien_id || i.meta?.myspaStaffDisplay).filter(Boolean))
        return serviceLines.length >= 2 && staff.size >= 2
      }),
      line_discount: hasOrder((o, its) => num(o.giam_gia) > 0 || its.some(i => num(i.thanh_tien) < num(i.don_gia) * num(i.so_luong || 1))),
      use_treatment_card: hasOrder((o, its) => its.some(i => i.loai_item === 'the_lieu_trinh')),
      sell_new_card: hasOrder((o, its) => its.some(i => i.loai_item === 'the_moi' && i.meta?.loai !== 'combo_lieu_trinh')),
      sell_combo: hasOrder((o, its) => its.some(i => i.loai_item === 'the_moi' && i.meta?.loai === 'combo_lieu_trinh')),
      split_payment: hasOrder((o, its, payTypes) => payTypes.size >= 2),
      partial_debt: hasOrder(o => num(o.con_no) > 0),
      void_order: orders.some(o => o.trang_thai === 'huy'),
      crm_history: hasOrder((o, its) => !!o.khach_hang_id && its.length > 0 && o.trang_thai !== 'draft'),
      staff_income: hasOrder((o, its) => its.some(i => {
        const income = i.loai_item === 'the_moi' || i.loai_item === 'san_pham'
          ? num(i.tien_commission || 0)
          : num(i.tien_tour || 0)
        return income > 0 && (i.nhan_vien_id || i.meta?.myspaStaffDisplay)
      })),
    }
    const coverageOk = Object.values(coverage).filter(Boolean).length

    return {
      validOrders,
      paidOrders,
      orderCount: validOrders.length,
      paidOrderCount: paidOrders.length,
      canceledCount: orders.filter(o => o.trang_thai === 'huy').length,
      testCount: orders.filter(o => o.is_test).length,
      paymentByType,
      paidTotal,
      orderPaidTotal,
      gross,
      discount,
      debt,
      byType,
      tour,
      commission,
      issues,
      coverage,
      coverageOk,
    }
  }, [orders, payments, items])

  const myspaComparable = {
    orders: parseMoney(myspa.orders),
    paid: parseMoney(myspa.paid),
    cash: parseMoney(myspa.cash),
    mb: parseMoney(myspa.mb),
    tp: parseMoney(myspa.tp),
    prepaid: parseMoney(myspa.prepaid),
    tour: parseMoney(myspa.tour),
    commission: parseMoney(myspa.commission),
  }

  const hsmsComparable = {
    orders: summary.orderCount,
    paid: summary.paidTotal,
    cash: summary.paymentByType.tien_mat,
    mb: summary.paymentByType.chuyen_khoan,
    tp: summary.paymentByType.quet_the,
    prepaid: summary.paymentByType.the_tra_truoc,
    tour: summary.tour,
    commission: summary.commission,
  }

  return (
    <>
      <div className="mod-head" style={{ marginBottom: 18 }}>
        <div>
          <div className="ttl">Đối Soát POS Ngày</div>
          <div className="sub">Chạy song song MySpa ↔ HSMS · kiểm tiền, đơn, tour và hoa hồng trước khi vận hành chính thức</div>
        </div>
        <div className="acts">
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            style={{
              border: `1px solid ${C.line}`,
              borderRadius: 10,
              padding: '10px 12px',
              background: C.surface2,
              color: C.text,
              fontWeight: 800,
              fontFamily: 'inherit',
            }}
          />
          <button className="btn" onClick={() => window.location.href = '/pos/danh-sach'}>Danh sách đơn</button>
          <button className="btn gold" onClick={() => window.location.href = '/pos'}>+ Tạo đơn</button>
        </div>
      </div>

      <div style={{
        padding: '12px 14px',
        border: '1px solid rgba(201,169,110,.28)',
        background: 'rgba(201,169,110,.08)',
        borderRadius: 8,
        color: C.textSub,
        fontSize: 13,
        fontWeight: 700,
        marginBottom: 18,
      }}>
        Mốc vận hành đề xuất: 01/06/2026 bắt đầu chạy song song. Mỗi cuối ngày nhập tổng từ MySpa vào cột bên dưới, HSMS sẽ tự tính lệch.
      </div>

      {error && (
        <div style={{ padding: 14, borderRadius: 8, background: '#FDECEA', color: C.chi, fontWeight: 800, marginBottom: 16 }}>
          {error}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 18 }}>
        <Card title="Số đơn HSMS" value={loading ? '...' : fmtNumber(summary.orderCount)} note={`${summary.paidOrderCount} đã thanh toán · ${summary.canceledCount} hủy`} color={C.primary} />
        <Card title="Thực thu HSMS" value={loading ? '...' : formatCurrency(summary.paidTotal)} note={`Theo dòng thanh toán · ${shortDate(date)}`} color={C.thu} />
        <Card title="Tour / Hoa hồng" value={loading ? '...' : formatCurrency(summary.tour + summary.commission)} note={`Tour ${formatCurrency(summary.tour)} · Hoa Hồng ${formatCurrency(summary.commission)}`} color={C.gold} />
        <Card title="Độ phủ test thật" value={`${summary.coverageOk}/${TEST_SCENARIOS.length}`} note={`${summary.issues.length} cảnh báo data · tự đo từ đơn POS`} color={summary.coverageOk === TEST_SCENARIOS.length && !summary.issues.length ? C.thu : C.warn} warn={summary.issues.length > 0} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.15fr .85fr', gap: 16, alignItems: 'start' }}>
        <section style={{ background: C.surface2, border: `1px solid ${C.line}`, borderRadius: 8, boxShadow: C.shadowSm, overflow: 'hidden' }}>
          <div style={{ padding: '14px 16px', borderBottom: `1px solid ${C.line}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 900, color: C.text }}>Bảng So MySpa ↔ HSMS</div>
              <div style={{ fontSize: 12, color: C.textMute, marginTop: 2 }}>Nhập số tổng từ báo cáo MySpa, hệ thống tự tính chênh lệch</div>
            </div>
            <button
              onClick={() => setMyspa(buildEmptyMyspa())}
              style={{ border: `1px solid ${C.line}`, background: C.bg, borderRadius: 8, padding: '7px 10px', cursor: 'pointer', fontWeight: 800, color: C.textSub }}
            >
              Xóa số nhập
            </button>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 720 }}>
              <thead>
                <tr style={{ background: C.bg }}>
                  {['Chỉ tiêu', 'HSMS', 'MySpa', 'Chênh lệch'].map(h => (
                    <th key={h} style={{ padding: '10px 12px', textAlign: h === 'Chỉ tiêu' ? 'left' : 'right', fontSize: 11, color: C.textSub, textTransform: 'uppercase', letterSpacing: '.04em', borderBottom: `1px solid ${C.line}` }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {MYSPA_FIELDS.map(field => (
                  <tr key={field.key} style={{ borderBottom: `1px solid ${C.line}` }}>
                    <td style={{ padding: '10px 12px', fontWeight: 800, color: C.text }}>{field.label}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 900, color: C.primary }}>
                      {field.type === 'money' ? formatCurrency(hsmsComparable[field.key]) : fmtNumber(hsmsComparable[field.key])}
                    </td>
                    <td style={{ padding: '8px 12px', width: 170 }}>
                      {moneyInput(myspa[field.key], v => setMyspa(prev => ({ ...prev, [field.key]: v })))}
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', fontSize: 13 }}>
                      <Diff hsms={hsmsComparable[field.key]} myspa={myspaComparable[field.key]} type={field.type} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ background: C.surface2, border: `1px solid ${C.line}`, borderRadius: 8, boxShadow: C.shadowSm, padding: 16 }}>
            <div style={{ fontWeight: 900, marginBottom: 12 }}>Thanh toán HSMS</div>
            {PAYMENT_KEYS.map(k => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: `1px solid ${C.line}` }}>
                <span style={{ color: C.textSub, fontWeight: 800 }}>{PAYMENT_LABEL[k]}</span>
                <strong style={{ color: C.text }}>{formatCurrency(summary.paymentByType[k])}</strong>
              </div>
            ))}
          </div>

          <div style={{ background: C.surface2, border: `1px solid ${C.line}`, borderRadius: 8, boxShadow: C.shadowSm, padding: 16 }}>
            <div style={{ fontWeight: 900, marginBottom: 12 }}>Doanh thu theo loại</div>
            {[
              ['dich_vu', 'Dịch vụ'],
              ['the_moi', 'Bán thẻ/combo'],
              ['the_lieu_trinh', 'Dùng thẻ'],
              ['san_pham', 'Sản phẩm'],
            ].map(([k, label]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: `1px solid ${C.line}` }}>
                <span style={{ color: C.textSub, fontWeight: 800 }}>{label}</span>
                <strong style={{ color: k === 'the_lieu_trinh' ? C.textMute : C.text }}>{formatCurrency(summary.byType[k])}</strong>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 16 }}>
        <section style={{ background: C.surface2, border: `1px solid ${C.line}`, borderRadius: 8, boxShadow: C.shadowSm, padding: 16 }}>
          <div style={{ fontWeight: 900, marginBottom: 10 }}>Checklist chạy song song 01/06</div>
          {[
            'Mỗi đơn nhập trên MySpa thì nhập lại trên HSMS ngay trong ngày',
            'Cuối ngày đối chiếu tổng tiền mặt, MB Bank, TP Bank, thẻ trả trước',
            'Kiểm tra nhân viên nhận tour/hoa hồng trên từng đơn có đúng chưa',
            'Đơn sai chỉ hủy có lý do, không sửa trực tiếp đơn đã thanh toán',
            'Ghi lại lỗi phát sinh để fix trong tuần chạy song song',
          ].map((text, i) => (
            <div key={text} style={{ display: 'flex', gap: 10, padding: '8px 0', borderBottom: i < 4 ? `1px solid ${C.line}` : 'none' }}>
              <span style={{ color: C.thu, fontWeight: 900 }}>✓</span>
              <span style={{ color: C.textSub, fontWeight: 700, fontSize: 13 }}>{text}</span>
            </div>
          ))}
        </section>

        <section style={{ background: C.surface2, border: `1px solid ${C.line}`, borderRadius: 8, boxShadow: C.shadowSm, padding: 16 }}>
          <div style={{ fontWeight: 900, marginBottom: 10 }}>Cảnh báo trong ngày</div>
          {loading ? (
            <div style={{ color: C.textMute, fontSize: 13 }}>Đang tải...</div>
          ) : summary.issues.length === 0 ? (
            <div style={{ color: C.thu, fontWeight: 800, fontSize: 13 }}>Chưa thấy lỗi logic trong dữ liệu POS ngày này.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 260, overflowY: 'auto' }}>
              {summary.issues.slice(0, 30).map((issue, idx) => (
                <div key={`${issue.ma_don}-${idx}`} style={{ padding: '8px 10px', borderRadius: 8, background: issue.level === 'danger' ? '#FDECEA' : '#FEF5E7', color: issue.level === 'danger' ? C.chi : C.warn, fontWeight: 800, fontSize: 12 }}>
                  {issue.ma_don}: {issue.text}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <section style={{ background: C.surface2, border: `1px solid ${C.line}`, borderRadius: 8, boxShadow: C.shadowSm, marginTop: 16, overflow: 'hidden' }}>
        <div style={{ padding: '14px 16px', borderBottom: `1px solid ${C.line}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <div style={{ fontWeight: 900, color: C.text }}>Bộ Test POS Tự Đo Bằng Dữ Liệu Thật</div>
            <div style={{ fontSize: 12, color: C.textMute, marginTop: 2 }}>
              Không cần nhân viên nhập checklist. HSMS tự đánh dấu OK khi trong ngày đã có đơn thật đi qua đúng luồng dữ liệu.
            </div>
          </div>
          <div style={{ padding: '7px 10px', borderRadius: 999, background: C.bg, border: `1px solid ${C.line}`, color: C.textSub, fontSize: 12, fontWeight: 900 }}>
            {summary.coverageOk}/{TEST_SCENARIOS.length} luồng đã có dữ liệu
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 0 }}>
          {TEST_SCENARIOS.map((scenario, index) => {
            const passed = !!summary.coverage[scenario.id]
            const cfg = passed
              ? { label: 'Đã có dữ liệu', bg: 'rgba(45,122,79,.10)', color: C.thu, border: 'rgba(45,122,79,.24)' }
              : { label: 'Chưa có đơn test', bg: C.bg, color: C.textMute, border: C.line }
            return (
              <div key={scenario.id} style={{
                padding: 14,
                borderRight: index % 2 === 0 ? `1px solid ${C.line}` : 'none',
                borderBottom: index < TEST_SCENARIOS.length - 2 ? `1px solid ${C.line}` : 'none',
                minHeight: 104,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 900, color: C.text, fontSize: 13 }}>{scenario.title}</div>
                    <div style={{ color: C.textMute, fontSize: 12, marginTop: 5, lineHeight: 1.45 }}>{scenario.note}</div>
                  </div>
                  <span style={{
                    padding: '4px 8px',
                    borderRadius: 999,
                    background: cfg.bg,
                    color: cfg.color,
                    border: `1px solid ${cfg.border}`,
                    fontSize: 11,
                    fontWeight: 900,
                    whiteSpace: 'nowrap',
                  }}>
                    {cfg.label}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </section>
    </>
  )
}
