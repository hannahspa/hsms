import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../../lib/supabase'
import { posService } from '../../../services/posService'
import { todayISO, getNowVN } from '../../../lib/utils'
import { addDaysISO, addMonthsISO, daysInMonth } from '../../../lib/dateMath'
import DatePicker from '../../../components/shared/DatePicker'
import {
  C, TRANG_THAI, VIEW_TABS, SLOTS, ROW_H, HOUR_START, SLOT_MIN,
  weekDaysOf, monthMatrixOf, monthOf, dayOfWeek, fmtDate, gioToMin,
  Avatar, navBtn, miniBtn,
} from './lichHenShared'
import ModalDatHen from './ModalDatHen'
import { confirmDialog } from '../../../components/ui/notify'
import { WeekView, MonthView } from './LichHenViews'

// ══════════════════════════════════════════════════════════
// MAIN — Lịch biểu timeline cột theo KTV
// ══════════════════════════════════════════════════════════
export default function LichHenPage({ user }) {
  const [ngayXem, setNgayXem] = useState(todayISO())
  const [viewMode, setViewMode] = useState('day')   // day | week | month
  const [henList, setHenList] = useState([])
  const [ktvList, setKtvList] = useState([])
  const [loading, setLoading] = useState(true)
  const [showPicker, setShowPicker] = useState(false)
  const [modal, setModal] = useState(null)   // null | 'new' | {prefill} | {id,...}
  const [toast, setToast] = useState(null)
  const [offIds, setOffIds] = useState([])   // KTV nghỉ/off trong ngày đang xem
  const [creatingId, setCreatingId] = useState(null)  // lịch hẹn đang tạo đơn
  const [listSearch, setListSearch] = useState('')
  const [listStatus, setListStatus] = useState('all')
  const [nowTick, setNowTick] = useState(0)   // ép render lại Bảng Điều Phối mỗi 30s
  const [servingOrders, setServingOrders] = useState([])   // đơn POS đang phục vụ (chưa thanh toán) hôm nay
  const [dvDur, setDvDur] = useState({})                   // dich_vu_id → { ten, phut }

  const showToast = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 2800) }

  useEffect(() => {
    supabase.from('nhan_vien').select('id, ho_ten, vi_tri, avatar_url').eq('trang_thai', 'dang_lam').in('vi_tri', ['ktv', 'le_tan']).order('ho_ten')
      .then(({ data }) => setKtvList(data || []))
  }, [])

  const fetchHen = useCallback(async () => {
    setLoading(true)
    let q = supabase.from('lich_hen').select('*')
    if (viewMode === 'day') q = q.eq('ngay_hen', ngayXem)
    else if (viewMode === 'live') q = q.eq('ngay_hen', todayISO())
    else if (viewMode === 'week') { const w = weekDaysOf(ngayXem); q = q.gte('ngay_hen', w[0]).lte('ngay_hen', w[6]) }
    else if (viewMode === 'list') { q = q.gte('ngay_hen', todayISO()).lte('ngay_hen', addDaysISO(todayISO(), 60)) }
    else { const [y, m] = ngayXem.split('-').map(Number); const last = daysInMonth(y, m); q = q.gte('ngay_hen', `${y}-${String(m).padStart(2, '0')}-01`).lte('ngay_hen', `${y}-${String(m).padStart(2, '0')}-${String(last).padStart(2, '0')}`) }
    const { data, error } = await q.order('ngay_hen').order('gio_hen')
    if (error) showToast('Lỗi tải dữ liệu', 'error')
    setHenList(data || [])
    setLoading(false)
  }, [ngayXem, viewMode])
  useEffect(() => { fetchHen() }, [fetchHen])

  // KTV nghỉ trong NGÀY đang xem (đăng ký off đã duyệt + chấm công loại off) → ẩn cột
  useEffect(() => {
    if (viewMode !== 'day') { setOffIds([]); return }
    let alive = true
    Promise.all([
      supabase.from('dang_ky_off').select('nhan_vien_id').eq('ngay_off', ngayXem).eq('trang_thai', 'duoc_duyet'),
      supabase.from('cham_cong').select('nhan_vien_id, loai').eq('ngay', ngayXem).in('loai', ['off_phep', 'off_ov', 'off_t7', 'off_t7x']),
    ]).then(([offRes, ccRes]) => {
      if (!alive) return
      const ids = new Set()
      ;(offRes.data || []).forEach(r => r.nhan_vien_id && ids.add(r.nhan_vien_id))
      ;(ccRes.data || []).forEach(r => r.nhan_vien_id && ids.add(r.nhan_vien_id))
      setOffIds([...ids])
    }).catch(() => { if (alive) setOffIds([]) })
    return () => { alive = false }
  }, [ngayXem, viewMode])

  // Đơn POS đang phục vụ (chưa thanh toán) hôm nay — nguồn "đang làm" CHÍNH XÁC
  const fetchServing = useCallback(async () => {
    const { data } = await supabase.from('don_hang')
      .select('id, ma_don, created_at, khach_hang_id, khach_hang:khach_hang_id(ho_ten), lich_hen_id, don_hang_chi_tiet(nhan_vien_id, dich_vu_id, loai_item)')
      .eq('ngay', todayISO()).eq('is_test', false)
      .not('trang_thai', 'in', '(da_thanh_toan,huy)')
      .order('created_at')
    setServingOrders(data || [])
  }, [])

  useEffect(() => {
    if (viewMode !== 'live') return
    supabase.from('dich_vu').select('id, ten, thoi_gian_phut').then(({ data }) =>
      setDvDur(Object.fromEntries((data || []).map(d => [d.id, { ten: d.ten, phut: d.thoi_gian_phut || 0 }]))))
  }, [viewMode])

  // Bảng Điều Phối: tự cập nhật giờ + dữ liệu mỗi 30s
  useEffect(() => {
    if (viewMode !== 'live') return undefined
    fetchServing()
    const t = setInterval(() => { setNowTick(n => n + 1); fetchHen(); fetchServing() }, 30000)
    return () => clearInterval(t)
  }, [viewMode, fetchHen, fetchServing])

  const handleSave = async () => { setModal(null); await fetchHen(); showToast('Đã lưu lịch hẹn ✓') }

  // Khách đến → tạo đơn POS (gán sẵn khách + dịch vụ + KTV/tour) rồi sang POS thanh toán
  const handleCreateOrder = async (hen) => {
    setCreatingId(hen.id)
    try {
      const result = await posService.createDraftOrderFromAppointment(hen, { nguoiTao: user?.id })
      await supabase.from('lich_hen').update({ trang_thai: 'da_xong' }).eq('id', hen.id)
      window.location.href = `/pos?resume=${result.orderId}`
    } catch (e) {
      showToast('Lỗi tạo đơn: ' + e.message, 'error')
      setCreatingId(null)
    }
  }
  const handleStatus = async (id, tt) => {
    await supabase.from('lich_hen').update({ trang_thai: tt }).eq('id', id)
    await fetchHen()
    showToast(tt === 'da_xac_nhan' ? 'Đã xác nhận' : tt === 'da_xong' ? 'Đã hoàn thành' : 'Đã hủy hẹn')
  }
  const changePeriod = delta => {
    if (viewMode === 'week') setNgayXem(addDaysISO(ngayXem, delta * 7))
    else if (viewMode === 'month') setNgayXem(addMonthsISO(ngayXem, delta))
    else setNgayXem(addDaysISO(ngayXem, delta))
  }
  const openPrefill = (gio, nvId, ngay) => setModal({ prefill: true, gio_hen: gio, nhan_vien_id: nvId, ngay_hen: ngay })

  const isToday = ngayXem === todayISO()
  const periodLabel = viewMode === 'week'
    ? (() => { const w = weekDaysOf(ngayXem); return `Tuần ${fmtDate(w[0]).slice(0, 5)} – ${fmtDate(w[6]).slice(0, 5)}` })()
    : viewMode === 'month' ? `Tháng ${monthOf(ngayXem)}/${ngayXem.split('-')[0]}`
    : `${dayOfWeek(ngayXem)}, ${fmtDate(ngayXem)}`
  const stats = henList.reduce((a, h) => { a[h.trang_thai] = (a[h.trang_thai] || 0) + 1; a.total++; return a }, { total: 0 })
  // Cột KTV: chỉ KTV ĐI LÀM hôm đó (ẩn người nghỉ/off); cộng cột "Nhân viên bất kỳ" nếu có lịch chưa gán
  const workingKtv = ktvList.filter(k => k.vi_tri === 'ktv' && !offIds.includes(k.id))
  const hasUnassigned = henList.some(h => !h.nhan_vien_id && h.trang_thai !== 'huy')
  const _columns = [...workingKtv, ...(hasUnassigned ? [{ id: null, ho_ten: 'Nhân viên bất kỳ', vi_tri: 'none' }] : [])]
  const _henByCol = id => henList.filter(h => (h.nhan_vien_id || null) === id && h.trang_thai !== 'huy')

  // Chặn đặt lịch quá khứ: nếu xem hôm nay, các slot trước giờ hiện tại bị khoá
  const nowMin = (() => { const d = getNowVN(); return d.getHours() * 60 + d.getMinutes() })()
  const isPastSlot = (m) => isToday && m < nowMin

  // Cắt bớt phần giờ ĐÃ QUA khỏi lưới (timeline gọn): hôm nay bắt đầu từ đầu giờ
  // hiện tại — nhưng không trễ hơn lịch hẹn sớm nhất trong ngày (để không mất lịch cũ).
  const earliestHenMin = henList.filter(h => h.trang_thai !== 'huy').reduce((min, h) => Math.min(min, gioToMin(h.gio_hen)), Infinity)
  const visStartMin = isToday
    ? Math.max(HOUR_START * 60, Math.min(Math.floor(nowMin / 60) * 60, earliestHenMin))
    : HOUR_START * 60
  const visSlots = SLOTS.filter(m => m >= visStartMin)
  const timelineH = visSlots.length * ROW_H

  const _ktvMap = Object.fromEntries(ktvList.map(k => [k.id, k.ho_ten]))
  // Xếp tất cả lịch hẹn vào 1 timeline chung; trùng giờ → xếp ngang (lane theo cụm chồng giờ)
  const dayItems = henList.filter(h => h.trang_thai !== 'huy')
    .map(h => ({ h, start: gioToMin(h.gio_hen), end: gioToMin(h.gio_hen) + (h.thoi_luong_phut || 60) }))
    .sort((a, b) => a.start - b.start || a.end - b.end)
  { let i = 0
    while (i < dayItems.length) {
      let j = i, clusterEnd = dayItems[i].end
      while (j + 1 < dayItems.length && dayItems[j + 1].start < clusterEnd) { j++; clusterEnd = Math.max(clusterEnd, dayItems[j].end) }
      const grp = dayItems.slice(i, j + 1)
      const laneEnds = []
      grp.forEach(it => {
        let lane = laneEnds.findIndex(e => e <= it.start)
        if (lane === -1) { lane = laneEnds.length; laneEnds.push(it.end) } else laneEnds[lane] = it.end
        it.lane = lane
      })
      grp.forEach(it => { it.laneCount = laneEnds.length })
      i = j + 1
    }
  }
  // Nhiều khách trùng giờ (>3 làn) → mỗi block rộng cố định + cuộn ngang cho dễ đọc
  const globalMaxLane = dayItems.reduce((m, it) => Math.max(m, it.laneCount || 1), 1)
  const LANE_W = 210
  const wideDay = globalMaxLane > 3
  const apptColW = wideDay ? `${globalMaxLane * LANE_W}px` : '1fr'
  const twoWords = (t) => (t || '').trim().split(/\s+/).slice(-2).join(' ')

  return (
    <div style={{ padding: '20px 24px 40px', fontFamily: 'var(--sans)' }}>
      {toast && (
        <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 9999, background: toast.type === 'error' ? '#C0392B' : '#2D7A4F', color: '#fff', borderRadius: 10, padding: '11px 18px', fontSize: 13, fontWeight: 600, boxShadow: C.shadowLg }}>{toast.msg}</div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontFamily: 'var(--serif)', fontSize: 25, fontWeight: 700, color: C.espresso }}>📅 Lịch Hẹn</div>
          <div style={{ fontSize: 13, color: C.ink3, marginTop: 2 }}>{henList.length} lịch hẹn · {isToday ? 'Hôm nay' : `Ngày ${fmtDate(ngayXem)}`}</div>
        </div>
        <button onClick={() => setModal('new')} style={{ padding: '10px 22px', borderRadius: 10, border: 'none', background: C.grad, color: '#fff', fontSize: 13.5, fontWeight: 700, cursor: 'pointer', boxShadow: '0 2px 8px rgba(160,113,79,0.3)' }}>+ Đặt Lịch Mới</button>
      </div>

      {/* Navigator + view switcher + stats */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14, background: C.card, borderRadius: 12, padding: '10px 14px', boxShadow: C.shadow, border: `1px solid ${C.line}`, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 3, background: C.bg, borderRadius: 9, padding: 3 }}>
          {VIEW_TABS.map(v => (
            <button key={v.k} onClick={() => setViewMode(v.k)}
              style={{ padding: '6px 15px', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 12.5, fontWeight: 700, fontFamily: 'var(--sans)', background: viewMode === v.k ? C.espresso : 'transparent', color: viewMode === v.k ? '#f3e6d2' : C.ink2 }}>{v.l}</button>
          ))}
        </div>
        <div style={{ width: 1, height: 22, background: C.line }} />
        <button onClick={() => changePeriod(-1)} style={navBtn}>‹</button>
        <div style={{ position: 'relative' }}>
          <button onClick={() => setShowPicker(true)} style={{ ...navBtn, width: 'auto', padding: '0 16px', fontWeight: 700, fontSize: 15, color: isToday && viewMode === 'day' ? C.primary : C.ink, fontFamily: 'var(--serif)' }}>
            {periodLabel}
          </button>
          <DatePicker open={showPicker} selectedDate={ngayXem} onClose={() => setShowPicker(false)} onConfirm={v => { setNgayXem(v); setShowPicker(false) }} />
        </div>
        <button onClick={() => changePeriod(1)} style={navBtn}>›</button>
        {!isToday && <button onClick={() => setNgayXem(todayISO())} style={{ padding: '6px 13px', borderRadius: 8, border: `1px solid ${C.gold}`, background: '#fdf3e0', color: '#8a6a35', fontSize: 12, cursor: 'pointer', fontWeight: 700 }}>Hôm nay</button>}
        <div style={{ flex: 1 }} />
        {Object.entries(TRANG_THAI).filter(([k]) => k !== 'huy').map(([k, cfg]) => stats[k] ? (
          <span key={k} style={{ background: cfg.bg, color: cfg.color, padding: '4px 11px', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>{cfg.label}: {stats[k]}</span>
        ) : null)}
      </div>

      {/* ── BẢNG ĐIỀU PHỐI (realtime — ai đang làm, còn bao lâu, KTV rảnh) ── */}
      {!loading && viewMode === 'live' && (() => {
        void nowTick
        const dn = getNowVN(); const nowM = dn.getHours() * 60 + dn.getMinutes()
        const fmtM = (m) => `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
        // ĐANG PHỤC VỤ THẬT = đơn POS chưa thanh toán hôm nay (đã lên đơn khi khách đến)
        const serving = servingOrders.map(o => {
          const svc = (o.don_hang_chi_tiet || []).filter(it => it.loai_item === 'dich_vu' || it.dich_vu_id)
          const ktvIds = [...new Set(svc.map(it => it.nhan_vien_id).filter(Boolean))]
          const dvNames = [...new Set(svc.map(it => dvDur[it.dich_vu_id]?.ten).filter(Boolean))]
          const tongPhut = svc.reduce((s, it) => s + (dvDur[it.dich_vu_id]?.phut || 0), 0) || 60
          const cd = new Date(new Date(o.created_at).toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }))
          const startM = cd.getHours() * 60 + cd.getMinutes()
          return { o, ktvIds, dvNames, tongPhut, startM, endM: startM + tongPhut, tenKhach: o.khach_hang?.ho_ten || 'Khách lẻ' }
        }).sort((a, b) => a.endM - b.endM)
        const busyIds = new Set(serving.flatMap(s => s.ktvIds))
        const ktvRanh = workingKtv.filter(k => !busyIds.has(k.id))
        // Sắp tới = lịch hẹn chưa "khách đến" (chưa thành đơn), giờ tương lai
        const sapToi = henList.filter(h => h.trang_thai !== 'huy' && h.trang_thai !== 'da_xong')
          .map(h => ({ h, start: gioToMin(h.gio_hen) })).filter(x => x.start > nowM).sort((a, b) => a.start - b.start).slice(0, 6)
        const kpi = [
          { l: 'Bây giờ', v: fmtM(nowM), c: C.espresso },
          { l: 'Khách đang làm', v: serving.length, c: '#6C3483' },
          { l: 'KTV đang bận', v: busyIds.size, c: '#C0392B' },
          { l: 'KTV đang rảnh', v: ktvRanh.length, c: '#2D7A4F' },
        ]
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
              {kpi.map(s => (
                <div key={s.l} style={{ background: C.card, borderRadius: 12, border: `1px solid ${C.line}`, boxShadow: C.shadow, padding: '14px 16px' }}>
                  <div style={{ fontSize: 11.5, color: C.ink3, fontWeight: 600 }}>{s.l}</div>
                  <div style={{ fontSize: 26, fontWeight: 800, color: s.c, fontFamily: 'var(--serif)' }}>{s.v}</div>
                </div>
              ))}
            </div>

            {/* Đang phục vụ — từ đơn POS đang mở */}
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, color: C.espresso, marginBottom: 10 }}>🟣 Đang phục vụ ({serving.length}) · từ đơn hàng · cập nhật mỗi 30 giây</div>
              {serving.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 28, color: C.ink3, background: C.card, borderRadius: 12, border: `1px solid ${C.line}` }}>Hiện không có đơn nào đang mở (chưa có khách đang làm)</div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: 10 }}>
                  {serving.map(s => {
                    const total = s.tongPhut, doneMin = Math.max(0, nowM - s.startM), leftMin = s.endM - nowM
                    const pct = Math.max(2, Math.min(100, Math.round(doneMin / total * 100)))
                    const ktv0 = s.ktvIds[0] ? ktvList.find(k => k.id === s.ktvIds[0]) : null
                    const moreKtv = s.ktvIds.length - 1
                    const late = leftMin < 0, soon = !late && leftMin <= 10
                    const barCol = late ? '#C0392B' : soon ? '#E0A82E' : '#7E57C2'
                    return (
                      <div key={s.o.id} onClick={() => { window.location.href = `/pos?resume=${s.o.id}` }}
                        title="Mở đơn POS"
                        style={{ background: C.card, borderRadius: 12, border: `1px solid ${late ? '#F5C6C0' : soon ? '#F0D9A8' : C.line}`, boxShadow: C.shadow, padding: '12px 14px', cursor: 'pointer' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                          {ktv0 ? <Avatar nv={ktv0} size={30} /> : <span style={{ width: 30, height: 30, borderRadius: '50%', background: '#e8ddc9', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: '#8a6a35' }}>?</span>}
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ fontSize: 13.5, fontWeight: 800, color: C.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.tenKhach}</div>
                            <div style={{ fontSize: 11.5, color: ktv0 ? '#5B2C6F' : C.ink4, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {ktv0 ? twoWords(ktv0.ho_ten) : 'KTV bất kỳ'}{moreKtv > 0 ? ` +${moreKtv}` : ''} · {s.dvNames.join(', ') || 'Dịch vụ'}
                            </div>
                          </div>
                          <span style={{ flexShrink: 0, fontSize: 11.5, fontWeight: 800, color: late ? '#C0392B' : soon ? '#B8791F' : '#2D7A4F' }}>{late ? `⚠️ trễ ${-leftMin}'` : soon ? `⏰ còn ${leftMin}'` : `còn ${leftMin}'`}</span>
                        </div>
                        <div style={{ height: 8, background: '#EFE7DD', borderRadius: 6, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${pct}%`, background: barCol, borderRadius: 6, transition: 'width .4s' }} />
                        </div>
                        <div style={{ fontSize: 10.5, color: C.ink3, marginTop: 5 }}>Bắt đầu {fmtM(s.startM)} · đã làm {doneMin}' / {total}' · xong ~{fmtM(s.endM)} · {s.o.ma_don}</div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* KTV rảnh */}
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, color: C.espresso, marginBottom: 10 }}>🟢 KTV đang rảnh ({ktvRanh.length}) · sẵn sàng nhận khách</div>
              {ktvRanh.length === 0 ? (
                <div style={{ padding: '12px 14px', borderRadius: 10, background: '#FDECEA', border: '1px solid #F5C6C0', color: '#C0392B', fontWeight: 700, fontSize: 13 }}>⚠️ Tất cả KTV đang bận — chưa có người rảnh</div>
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {ktvRanh.map(k => (
                    <div key={k.id} style={{ display: 'flex', alignItems: 'center', gap: 7, background: '#EAF4EC', border: '1px solid #BCDCBC', borderRadius: 999, padding: '5px 12px 5px 5px' }}>
                      <Avatar nv={k} size={24} />
                      <span style={{ fontSize: 12.5, fontWeight: 700, color: '#2D7A4F' }}>{twoWords(k.ho_ten)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Sắp tới */}
            {sapToi.length > 0 && (
              <div>
                <div style={{ fontSize: 14, fontWeight: 800, color: C.espresso, marginBottom: 10 }}>⏳ Sắp tới</div>
                <div style={{ background: C.card, borderRadius: 12, border: `1px solid ${C.line}`, boxShadow: C.shadow, overflow: 'hidden' }}>
                  {sapToi.map(({ h, start }) => {
                    const ktvNv = h.nhan_vien_id ? ktvList.find(k => k.id === h.nhan_vien_id) : null
                    return (
                      <div key={h.id} onClick={() => setModal(h)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderBottom: `1px solid ${C.line}`, cursor: 'pointer' }}>
                        <span style={{ fontSize: 13, fontWeight: 800, color: C.ink, width: 48 }}>{fmtM(start)}</span>
                        <span style={{ fontSize: 11.5, color: C.primary, fontWeight: 700, width: 70 }}>còn {start - nowM}'</span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: C.ink, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.ten_khach}</span>
                        <span style={{ fontSize: 12, color: C.ink3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200 }}>{h.ten_dich_vu || 'Dịch vụ'} · {ktvNv ? twoWords(ktvNv.ho_ten) : 'KTV bất kỳ'}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )
      })()}

      {/* ── VIEW TUẦN ── */}
      {!loading && viewMode === 'week' && (
        <WeekView weekDays={weekDaysOf(ngayXem)} henList={henList} ktvList={ktvList} onOpenBlock={setModal}
          onOpenSlot={openPrefill} onGoDay={(d) => { setNgayXem(d); setViewMode('day') }} />
      )}

      {/* ── VIEW THÁNG ── */}
      {!loading && viewMode === 'month' && (
        <MonthView matrix={monthMatrixOf(ngayXem)} curMonth={monthOf(ngayXem)} henList={henList}
          onGoDay={(d) => { setNgayXem(d); setViewMode('day') }} />
      )}

      {/* ── VIEW DANH SÁCH (bảng — lọc/tìm, xem nhiều ngày sắp tới) ── */}
      {!loading && viewMode === 'list' && (() => {
        const rows = henList.filter(h => {
          if (listStatus === 'all' ? h.trang_thai === 'huy' : h.trang_thai !== listStatus) return false
          if (listSearch) { const q = listSearch.toLowerCase(); if (!`${h.ten_khach || ''} ${h.sdt_khach || ''}`.toLowerCase().includes(q)) return false }
          return true
        })
        return (
          <div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
              <input value={listSearch} onChange={e => setListSearch(e.target.value)} placeholder="🔍 Tìm khách / SĐT..."
                style={{ flex: '0 0 240px', padding: '9px 14px', borderRadius: 9, border: `1px solid ${C.line}`, fontSize: 13, background: C.card, color: C.ink, outline: 'none' }} />
              {[['all', 'Sắp tới'], ['cho_xac_nhan', 'Chờ XN'], ['da_xac_nhan', 'Đã XN'], ['da_xong', 'Hoàn thành'], ['huy', 'Đã hủy']].map(([k, l]) => (
                <button key={k} onClick={() => setListStatus(k)}
                  style={{ padding: '7px 14px', borderRadius: 999, border: 'none', cursor: 'pointer', fontSize: 12.5, fontWeight: 700,
                    background: listStatus === k ? C.espresso : C.card, color: listStatus === k ? '#f3e6d2' : C.ink2, boxShadow: C.shadow }}>{l}</button>
              ))}
              <div style={{ flex: 1 }} />
              <span style={{ fontSize: 13, color: C.ink3, fontWeight: 600 }}>{rows.length} lịch</span>
            </div>
            <div style={{ background: C.card, borderRadius: 12, border: `1px solid ${C.line}`, boxShadow: C.shadow, overflow: 'auto' }}>
              {rows.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 40, color: C.ink3 }}>Không có lịch hẹn</div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 760 }}>
                  <thead><tr style={{ background: C.bg }}>
                    {['Ngày', 'Giờ', 'Khách hàng', 'Dịch vụ', 'KTV', 'Trạng thái', ''].map((h, i) => (
                      <th key={h} style={{ padding: '10px 12px', textAlign: i >= 6 ? 'right' : 'left', fontSize: 11, color: C.ink3, textTransform: 'uppercase', letterSpacing: '.03em', borderBottom: `1px solid ${C.line2}`, whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {rows.map(h => {
                      const ktvNv = h.nhan_vien_id ? ktvList.find(k => k.id === h.nhan_vien_id) : null
                      const cfg = TRANG_THAI[h.trang_thai] || TRANG_THAI.cho_xac_nhan
                      const busy = creatingId === h.id
                      return (
                        <tr key={h.id} style={{ borderBottom: `1px solid ${C.line}`, cursor: 'pointer' }}
                          onClick={() => setModal(h)}
                          onMouseEnter={e => e.currentTarget.style.background = C.bg}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                          <td style={{ padding: '10px 12px', fontSize: 12.5, color: C.ink2, whiteSpace: 'nowrap' }}>{h.ngay_hen === todayISO() ? <b style={{ color: C.primary }}>Hôm nay</b> : fmtDate(h.ngay_hen)}</td>
                          <td style={{ padding: '10px 12px', fontSize: 13, fontWeight: 800, color: C.ink, whiteSpace: 'nowrap' }}>{(h.gio_hen || '').slice(0, 5)}</td>
                          <td style={{ padding: '10px 12px', minWidth: 150 }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: C.ink }}>{h.ten_khach}</div>
                            {h.sdt_khach && <div style={{ fontSize: 11.5, color: C.ink3 }}>{h.sdt_khach}</div>}
                          </td>
                          <td style={{ padding: '10px 12px', fontSize: 12.5, color: C.ink2, minWidth: 140 }}>{h.ten_dich_vu || '—'}{Array.isArray(h.dich_vu_list) && h.dich_vu_list.length > 0 ? ` +${h.dich_vu_list.length}` : ''}</td>
                          <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                              {ktvNv ? <Avatar nv={ktvNv} size={20} /> : <span style={{ width: 20, height: 20, borderRadius: '50%', background: '#e8ddc9', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#8a6a35' }}>?</span>}
                              <span style={{ fontSize: 12.5, fontWeight: 700, color: ktvNv ? '#5B2C6F' : C.ink4 }}>{ktvNv ? twoWords(ktvNv.ho_ten) : 'Bất kỳ'}</span>
                            </span>
                          </td>
                          <td style={{ padding: '10px 12px' }}><span style={{ background: cfg.bg, color: cfg.color, padding: '3px 10px', borderRadius: 999, fontSize: 11.5, fontWeight: 700, whiteSpace: 'nowrap' }}>{cfg.label}</span></td>
                          <td style={{ padding: '10px 12px', textAlign: 'right', whiteSpace: 'nowrap' }} onClick={e => e.stopPropagation()}>
                            {h.trang_thai !== 'da_xong' && h.trang_thai !== 'huy' && (
                              <button onClick={() => handleCreateOrder(h)} disabled={busy}
                                style={{ padding: '6px 11px', borderRadius: 7, border: 'none', background: '#2D7A4F', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', opacity: busy ? 0.6 : 1 }}>{busy ? '...' : '✓ Khách đến'}</button>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )
      })()}

      {/* ── VIEW NGÀY (1 timeline chung — lịch hẹn xếp theo giờ, trùng giờ xếp ngang) ── */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 50, color: C.ink3 }}>Đang tải...</div>
      ) : viewMode !== 'day' ? null : (
        <>
        {/* Cảnh báo sức chứa: số KTV đi làm vs cao điểm khách cùng lúc */}
        {(() => {
          const soKtv = workingKtv.length
          const peak = globalMaxLane
          const full = soKtv > 0 && peak >= soKtv
          const near = soKtv > 0 && peak === soKtv - 1
          return (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 12, padding: '10px 14px', borderRadius: 10,
              background: full ? '#FDECEA' : near ? '#FFF6E6' : '#EAF4EC', border: `1px solid ${full ? '#F5C6C0' : near ? '#F0D9A8' : '#BCDCBC'}` }}>
              <span style={{ fontSize: 13, fontWeight: 800, color: C.espresso }}>👥 {soKtv} KTV đi làm hôm nay</span>
              <span style={{ fontSize: 13, color: C.ink2 }}>· Cao điểm: <b>{peak}</b> khách cùng lúc</span>
              {full
                ? <span style={{ fontSize: 12.5, fontWeight: 800, color: '#C0392B' }}>⚠️ CÓ KHUNG GIỜ KÍN LỊCH — cân nhắc kỹ khi nhận thêm khách</span>
                : near
                  ? <span style={{ fontSize: 12.5, fontWeight: 700, color: '#B8791F' }}>⚡ Gần kín — còn rất ít chỗ ở khung cao điểm</span>
                  : <span style={{ fontSize: 12.5, fontWeight: 700, color: '#2D7A4F' }}>✓ Còn nhận thêm được khách</span>}
            </div>
          )
        })()}
        <div style={{ background: C.card, borderRadius: 12, border: `1px solid ${C.line}`, boxShadow: C.shadow, overflow: 'auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: `64px ${apptColW}`, minWidth: 480 }}>
            {/* Cột giờ */}
            <div style={{ position: 'relative', borderRight: `1px solid ${C.line}`, height: timelineH }}>
              {visSlots.map((m, i) => (
                <div key={m} style={{ position: 'absolute', top: i * ROW_H, right: 6, fontSize: 10.5, color: m % 60 === 0 ? C.ink2 : C.ink4, fontWeight: m % 60 === 0 ? 700 : 500, transform: 'translateY(-6px)' }}>
                  {m % 60 === 0 ? `${String(Math.floor(m / 60)).padStart(2, '0')}:00` : ''}
                </div>
              ))}
            </div>

            {/* Vùng lịch hẹn chung */}
            <div style={{ position: 'relative', height: timelineH }}>
              {/* Lưới slot + click để đặt lịch (slot quá khứ bị khoá) */}
              {visSlots.map((m, i) => {
                const past = isPastSlot(m)
                return (
                  <div key={m}
                    onClick={past ? undefined : () => setModal({ prefill: true, gio_hen: `${String(Math.floor(m / 60)).padStart(2, '0')}:${m % 60 === 0 ? '00' : '30'}`, nhan_vien_id: null, ngay_hen: ngayXem })}
                    style={{ position: 'absolute', top: i * ROW_H, left: 0, right: 0, height: ROW_H, borderBottom: `1px solid ${m % 60 === 0 ? C.line : 'rgba(160,113,79,0.06)'}`, cursor: past ? 'not-allowed' : 'pointer', background: past ? 'rgba(160,113,79,0.05)' : 'transparent' }}
                    title={past ? 'Đã qua giờ — không đặt được' : 'Bấm để đặt lịch'} />
                )
              })}
              {/* Block lịch hẹn — xếp ngang khi trùng giờ */}
              {dayItems.map(({ h, start, lane, laneCount }) => {
                const top = (start - visStartMin) / SLOT_MIN * ROW_H
                const height = Math.max(ROW_H - 2, (h.thoi_luong_phut || 60) / SLOT_MIN * ROW_H - 2)
                const done = h.trang_thai === 'da_xong'
                const busy = creatingId === h.id
                const ktvNv = h.nhan_vien_id ? ktvList.find(k => k.id === h.nhan_vien_id) : null
                // Màu phân biệt: CÓ chọn KTV (tím) ↔ KTV bất kỳ (nâu/vàng)
                const cfg = ktvNv
                  ? { bg: '#F0E9F7', bar: '#7E57C2', color: '#5B2C6F' }
                  : { bg: '#FBF1E2', bar: '#C9A96E', color: '#8a6a35' }
                // Vị trí: nhiều làn → px cố định + cuộn ngang; ít làn → chia % vừa màn
                const pos = wideDay
                  ? { left: `${lane * LANE_W + 3}px`, width: `${LANE_W - 6}px` }
                  : { left: `calc(${lane * (100 / laneCount)}% + 3px)`, width: `calc(${100 / laneCount}% - 6px)` }
                return (
                  <div key={h.id}
                    style={{ position: 'absolute', top: top + 1, ...pos, height, background: cfg.bg, borderLeft: `3px solid ${cfg.bar}`, borderRadius: 6, padding: '4px 7px', overflow: 'hidden', boxShadow: '0 1px 4px rgba(139,94,60,0.12)', display: 'flex', flexDirection: 'column', opacity: done ? 0.82 : 1 }}
                    title={`${h.gio_hen} ${h.ten_khach}${ktvNv ? ` (KTV: ${ktvNv.ho_ten})` : ' (KTV bất kỳ)'} — ${h.ten_dich_vu || ''}${h.ghi_chu ? `\n📝 ${h.ghi_chu}` : ''}`}>
                    <div onClick={e => { e.stopPropagation(); setModal(h) }} style={{ cursor: 'pointer' }}>
                      <div style={{ fontSize: 11, fontWeight: 800, color: cfg.color, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{(h.gio_hen || '').slice(0, 5)} · {h.ten_khach}</span>
                        {Array.isArray(h.dich_vu_list) && h.dich_vu_list.length > 0 && <span style={{ flexShrink: 0, fontSize: 8.5, fontWeight: 800, background: '#8a6a35', color: '#fff', borderRadius: 999, padding: '1px 5px' }}>+{h.dich_vu_list.length} DV</span>}
                      </div>
                      {/* KTV: avatar + tên 2 chữ (hoặc KTV bất kỳ) */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2, overflow: 'hidden' }}>
                        {ktvNv
                          ? <Avatar nv={ktvNv} size={16} />
                          : <span style={{ width: 16, height: 16, borderRadius: '50%', background: '#e8ddc9', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: '#8a6a35', flexShrink: 0 }}>?</span>}
                        <span style={{ fontSize: 10, fontWeight: 700, color: ktvNv ? '#5B2C6F' : C.ink4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {ktvNv ? twoWords(ktvNv.ho_ten) : 'KTV bất kỳ'}
                        </span>
                      </div>
                      {h.ten_dich_vu && height > ROW_H * 1.3 && <div style={{ fontSize: 9.5, color: C.ink2, marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.ten_dich_vu}</div>}
                      {h.ghi_chu && height > ROW_H * 1.3 && <div style={{ fontSize: 9.5, color: '#9a6a2f', marginTop: 1, fontStyle: 'italic', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>📝 {h.ghi_chu}</div>}
                    </div>
                    {done ? (
                      height > ROW_H && <div style={{ marginTop: 'auto', fontSize: 9.5, fontWeight: 800, color: '#1a4f96' }}>✓ Đã đến · đã tạo đơn</div>
                    ) : height > ROW_H * 1.5 && (
                      <div style={{ display: 'flex', gap: 3, marginTop: 'auto', flexWrap: 'wrap' }}>
                        <button onClick={e => { e.stopPropagation(); handleCreateOrder(h) }} disabled={busy} style={{ ...miniBtn('#2D7A4F'), opacity: busy ? 0.6 : 1 }}>{busy ? '...' : '✓ Khách đến'}</button>
                        <button onClick={e => { e.stopPropagation(); setModal(h) }} style={miniBtn('#8a6a35')}>Đổi lịch</button>
                        <button onClick={async e => { e.stopPropagation(); if (await confirmDialog({ title: 'Huỷ lịch hẹn', message: 'Khách huỷ lịch hẹn này?', danger: true, confirmLabel: 'Huỷ lịch' })) handleStatus(h.id, 'huy') }} style={miniBtn('#d8654f')}>Huỷ</button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
        </>
      )}

      {modal && (
        <ModalDatHen
          initial={modal === 'new' ? null : (modal.prefill ? { ten_khach: '', sdt_khach: '', ten_dich_vu: '', dich_vu_id: null, nhan_vien_id: modal.nhan_vien_id, thoi_luong_phut: 60, ngay_hen: modal.ngay_hen, gio_hen: modal.gio_hen, ghi_chu: '' } : modal)}
          ktvList={workingKtv} onSave={handleSave} onClose={() => setModal(null)} user={user}
        />
      )}
    </div>
  )
}
