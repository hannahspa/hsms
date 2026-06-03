import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../../lib/supabase'
import { posService } from '../../../services/posService'
import { todayISO, getNowVN } from '../../../lib/utils'
import { addDaysISO, addMonthsISO, daysInMonth } from '../../../lib/dateMath'
import DatePicker from '../../../components/shared/DatePicker'
import {
  C, TRANG_THAI, VIEW_TABS, SLOTS, ROW_H, HOUR_START, SLOT_MIN,
  weekDaysOf, monthMatrixOf, monthOf, dayOfWeek, fmtDate, shortName, gioToMin,
  Avatar, navBtn, miniBtn,
} from './lichHenShared'
import ModalDatHen from './ModalDatHen'
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

  const showToast = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 2800) }

  useEffect(() => {
    supabase.from('nhan_vien').select('id, ho_ten, vi_tri, avatar_url').eq('trang_thai', 'dang_lam').in('vi_tri', ['ktv', 'le_tan']).order('ho_ten')
      .then(({ data }) => setKtvList(data || []))
  }, [])

  const fetchHen = useCallback(async () => {
    setLoading(true)
    let q = supabase.from('lich_hen').select('*')
    if (viewMode === 'day') q = q.eq('ngay_hen', ngayXem)
    else if (viewMode === 'week') { const w = weekDaysOf(ngayXem); q = q.gte('ngay_hen', w[0]).lte('ngay_hen', w[6]) }
    else { const [y, m] = ngayXem.split('-').map(Number); const last = daysInMonth(y, m); q = q.gte('ngay_hen', `${y}-${String(m).padStart(2, '0')}-01`).lte('ngay_hen', `${y}-${String(m).padStart(2, '0')}-${String(last).padStart(2, '0')}`) }
    const { data, error } = await q.order('gio_hen')
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
  const columns = [...workingKtv, ...(hasUnassigned ? [{ id: null, ho_ten: 'Nhân viên bất kỳ', vi_tri: 'none' }] : [])]
  const henByCol = id => henList.filter(h => (h.nhan_vien_id || null) === id && h.trang_thai !== 'huy')

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

      {/* ── VIEW NGÀY (timeline cột KTV) ── */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 50, color: C.ink3 }}>Đang tải...</div>
      ) : viewMode !== 'day' ? null : columns.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 48, color: C.ink3, background: C.card, borderRadius: 12, border: `1px solid ${C.line}` }}>Chưa có KTV đang làm việc</div>
      ) : (
        <div style={{ background: C.card, borderRadius: 12, border: `1px solid ${C.line}`, boxShadow: C.shadow, overflow: 'auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: `64px repeat(${columns.length}, minmax(150px, 1fr))`, minWidth: 64 + columns.length * 150 }}>
            {/* Header hàng KTV */}
            <div style={{ position: 'sticky', top: 0, zIndex: 3, background: C.bg, borderBottom: `1px solid ${C.line2}`, borderRight: `1px solid ${C.line}` }} />
            {columns.map(col => (
              <div key={col.id || 'none'} style={{ position: 'sticky', top: 0, zIndex: 3, background: C.bg, borderBottom: `1px solid ${C.line2}`, borderRight: `1px solid ${C.line}`, padding: '8px 10px', display: 'flex', alignItems: 'center', gap: 8 }}>
                {col.vi_tri === 'none'
                  ? <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>?</div>
                  : <Avatar nv={col} size={30} />}
                <div style={{ fontSize: 12.5, fontWeight: 700, color: C.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{shortName(col.ho_ten)}</div>
              </div>
            ))}

            {/* Cột giờ */}
            <div style={{ position: 'relative', borderRight: `1px solid ${C.line}`, height: timelineH }}>
              {visSlots.map((m, i) => (
                <div key={m} style={{ position: 'absolute', top: i * ROW_H, right: 6, fontSize: 10.5, color: m % 60 === 0 ? C.ink2 : C.ink4, fontWeight: m % 60 === 0 ? 700 : 500, transform: 'translateY(-6px)' }}>
                  {m % 60 === 0 ? `${String(Math.floor(m / 60)).padStart(2, '0')}:00` : ''}
                </div>
              ))}
            </div>

            {/* Cột mỗi KTV */}
            {columns.map(col => {
              const items = henByCol(col.id)
              return (
                <div key={col.id || 'none'} style={{ position: 'relative', borderRight: `1px solid ${C.line}`, height: timelineH }}>
                  {/* Lưới slot + click để đặt lịch (slot quá khứ bị khoá) */}
                  {visSlots.map((m, i) => {
                    const past = isPastSlot(m)
                    return (
                      <div key={m}
                        onClick={past ? undefined : () => setModal({ prefill: true, gio_hen: `${String(Math.floor(m / 60)).padStart(2, '0')}:${m % 60 === 0 ? '00' : '30'}`, nhan_vien_id: col.id, ngay_hen: ngayXem })}
                        style={{ position: 'absolute', top: i * ROW_H, left: 0, right: 0, height: ROW_H, borderBottom: `1px solid ${m % 60 === 0 ? C.line : 'rgba(160,113,79,0.06)'}`, cursor: past ? 'not-allowed' : 'pointer', background: past ? 'rgba(160,113,79,0.05)' : 'transparent' }}
                        title={past ? 'Đã qua giờ — không đặt được' : 'Bấm để đặt lịch'} />
                    )
                  })}
                  {/* Block lịch hẹn */}
                  {items.map(h => {
                    const top = (gioToMin(h.gio_hen) - visStartMin) / SLOT_MIN * ROW_H
                    const height = Math.max(ROW_H - 2, (h.thoi_luong_phut || 60) / SLOT_MIN * ROW_H - 2)
                    const cfg = TRANG_THAI[h.trang_thai] || TRANG_THAI.cho_xac_nhan
                    const done = h.trang_thai === 'da_xong'
                    const busy = creatingId === h.id
                    return (
                      <div key={h.id}
                        style={{ position: 'absolute', top: top + 1, left: 3, right: 3, height, background: cfg.bg, borderLeft: `3px solid ${cfg.bar}`, borderRadius: 6, padding: '4px 7px', overflow: 'hidden', boxShadow: '0 1px 4px rgba(139,94,60,0.12)', display: 'flex', flexDirection: 'column' }}
                        title={`${h.gio_hen} ${h.ten_khach} — ${h.ten_dich_vu || ''}`}>
                        <div onClick={e => { e.stopPropagation(); setModal(h) }} style={{ cursor: 'pointer' }}>
                          <div style={{ fontSize: 11, fontWeight: 800, color: cfg.color }}>{(h.gio_hen || '').slice(0, 5)} · {h.ten_khach}</div>
                          {h.ten_dich_vu && height > ROW_H && <div style={{ fontSize: 10, color: C.ink2, marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.ten_dich_vu}</div>}
                        </div>
                        {done ? (
                          height > ROW_H && <div style={{ marginTop: 'auto', fontSize: 9.5, fontWeight: 800, color: '#1a4f96' }}>✓ Đã đến · đã tạo đơn</div>
                        ) : height > ROW_H * 1.5 && (
                          <div style={{ display: 'flex', gap: 3, marginTop: 'auto', flexWrap: 'wrap' }}>
                            <button onClick={e => { e.stopPropagation(); handleCreateOrder(h) }} disabled={busy} style={{ ...miniBtn('#2D7A4F'), opacity: busy ? 0.6 : 1 }}>{busy ? '...' : '✓ Khách đến'}</button>
                            <button onClick={e => { e.stopPropagation(); setModal(h) }} style={miniBtn('#8a6a35')}>Đổi lịch</button>
                            <button onClick={e => { e.stopPropagation(); if (confirm('Khách huỷ lịch hẹn này?')) handleStatus(h.id, 'huy') }} style={miniBtn('#d8654f')}>Huỷ</button>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
        </div>
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
