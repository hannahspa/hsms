import { useState, useEffect, useCallback, Fragment } from 'react'
import { createPortal } from 'react-dom'
import { supabase } from '../../../lib/supabase'
import { todayISO, getNowVN } from '../../../lib/utils'
import DatePicker from '../../../components/shared/DatePicker'

// ── Hannah Luxury Palette ──
const C = {
  bg: '#FAF7F4', card: '#FFFFFF', line: 'rgba(160,113,79,0.14)', line2: 'rgba(160,113,79,0.22)',
  ink: '#1A1209', ink2: '#5a4a3e', ink3: '#8B7355', ink4: '#B8A898',
  gold: '#C9A96E', primary: '#A0714F', espresso: '#3d2c20',
  grad: 'linear-gradient(135deg, #C9A96E 0%, #A0714F 45%, #7D5A3C 100%)',
  shadow: '0 4px 24px rgba(139,94,60,0.10)', shadowLg: '0 8px 40px rgba(139,94,60,0.18)',
}

const TRANG_THAI = {
  cho_xac_nhan: { label: 'Chờ Xác Nhận', bg: '#FFF6E6', color: '#B8860B', bar: '#E0A82E' },
  da_xac_nhan:  { label: 'Đã Xác Nhận',  bg: '#EAF4EC', color: '#2D7A4F', bar: '#3FA968' },
  da_xong:      { label: 'Hoàn Thành',   bg: '#E8F0FE', color: '#1a4f96', bar: '#3b78d4' },
  huy:          { label: 'Đã Hủy',       bg: '#F7E7E3', color: '#C0392B', bar: '#d8654f' },
}

// Giờ làm việc spa: 9h – 20h, mỗi slot 30 phút
const HOUR_START = 9, HOUR_END = 20, SLOT_MIN = 30
const ROW_H = 38  // chiều cao mỗi slot 30 phút (px)
const SLOTS = []
for (let h = HOUR_START; h < HOUR_END; h++) { SLOTS.push(h * 60); SLOTS.push(h * 60 + 30) }

const GIO_LIST = (() => {
  const list = []
  for (let h = HOUR_START; h <= HOUR_END; h++) {
    list.push(`${String(h).padStart(2, '0')}:00`)
    if (h < HOUR_END) list.push(`${String(h).padStart(2, '0')}:30`)
  }
  return list
})()

const DOW = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7']
const fmtDate = iso => { if (!iso) return '—'; const [y, m, d] = iso.split('-'); return `${d}/${m}/${y}` }
const dayOfWeek = iso => { if (!iso) return ''; const [y, m, d] = iso.split('-').map(Number); return DOW[new Date(y, m - 1, d).getDay()] }
const gioToMin = g => { const [h, m] = String(g || '00:00').split(':').map(Number); return h * 60 + m }
const shortName = n => { if (!n) return ''; const p = String(n).trim().split(/\s+/); return p.slice(-2).join(' ') }
const getInitials = n => { if (!n) return '?'; const p = String(n).trim().split(' '); return (p[p.length - 1][0] || '').toUpperCase() }

function Avatar({ nv, size = 30 }) {
  if (nv?.avatar_url) return <img src={nv.avatar_url} alt="" style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: `1px solid ${C.line2}` }} />
  return <div style={{ width: size, height: size, borderRadius: '50%', flexShrink: 0, background: C.grad, color: '#2a1d14', fontSize: Math.round(size * 0.4), fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{getInitials(nv?.ho_ten)}</div>
}

// 7 ngày (T2→CN) của tuần chứa iso
function weekDaysOf(iso) {
  const [y, m, d] = iso.split('-').map(Number)
  const base = new Date(y, m - 1, d), dow = base.getDay()
  const mon = new Date(base); mon.setDate(base.getDate() - (dow === 0 ? 6 : dow - 1))
  return Array.from({ length: 7 }, (_, i) => { const x = new Date(mon); x.setDate(mon.getDate() + i); return x.toISOString().slice(0, 10) })
}
// Ma trận tháng (6 tuần × 7 ngày) chứa iso
function monthMatrixOf(iso) {
  const [y, m] = iso.split('-').map(Number)
  const first = new Date(y, m - 1, 1), lead = first.getDay() === 0 ? 6 : first.getDay() - 1
  const start = new Date(first); start.setDate(1 - lead)
  return Array.from({ length: 6 }, (_, w) => Array.from({ length: 7 }, (_, i) => {
    const x = new Date(start); x.setDate(start.getDate() + w * 7 + i); return x.toISOString().slice(0, 10)
  }))
}
const monthOf = iso => Number(iso.split('-')[1])
const VIEW_TABS = [{ k: 'day', l: 'Ngày' }, { k: 'week', l: 'Tuần' }, { k: 'month', l: 'Tháng' }]

// ══════════════════════════════════════════════════════════
// Modal đặt / sửa lịch hẹn
// ══════════════════════════════════════════════════════════
function ModalDatHen({ initial, ktvList, onSave, onClose, user }) {
  const [form, setForm] = useState(initial || {
    ten_khach: '', sdt_khach: '', ten_dich_vu: '', dich_vu_id: null, nhan_vien_id: null,
    thoi_luong_phut: 60, ngay_hen: todayISO(), gio_hen: '10:00', ghi_chu: '',
  })
  const [dichVuList, setDichVuList] = useState([])
  const [saving, setSaving] = useState(false)
  const [showNgay, setShowNgay] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  useEffect(() => {
    supabase.from('dich_vu').select('id, ten, thoi_luong_phut').eq('is_active', true).order('ten').then(({ data }) => setDichVuList(data || []))
  }, [])

  const handleSelectDV = e => {
    const dv = dichVuList.find(d => d.id === e.target.value)
    if (dv) { set('dich_vu_id', dv.id); set('ten_dich_vu', dv.ten); set('thoi_luong_phut', dv.thoi_luong_phut || 60) }
    else set('dich_vu_id', null)
  }

  const handleSave = async () => {
    if (!form.ten_khach.trim()) return alert('Vui lòng nhập tên khách')
    setSaving(true)
    try {
      const payload = {
        ten_khach: form.ten_khach.trim(), sdt_khach: form.sdt_khach?.trim() || null,
        dich_vu_id: form.dich_vu_id || null, ten_dich_vu: form.ten_dich_vu?.trim() || null,
        nhan_vien_id: form.nhan_vien_id || null,
        thoi_luong_phut: form.thoi_luong_phut || 60, ngay_hen: form.ngay_hen, gio_hen: form.gio_hen,
        ghi_chu: form.ghi_chu?.trim() || null, nguoi_nhap: user?.email || user?.ho_ten || 'Lễ Tân',
      }
      if (initial?.id) await supabase.from('lich_hen').update(payload).eq('id', initial.id)
      else { payload.trang_thai = 'cho_xac_nhan'; await supabase.from('lich_hen').insert(payload) }
      onSave()
    } catch (e) { alert('Lỗi lưu lịch hẹn: ' + e.message) } finally { setSaving(false) }
  }

  const INP = { width: '100%', height: 38, borderRadius: 9, border: `1px solid ${C.line2}`, padding: '0 11px', fontFamily: 'var(--sans)', fontSize: 13.5, outline: 'none', boxSizing: 'border-box', background: '#fdfcfb', color: C.ink }
  const LBL = { fontFamily: 'var(--sans)', fontSize: 11, fontWeight: 700, color: C.ink3, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 5 }

  return createPortal(
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(42,29,20,0.45)', backdropFilter: 'blur(3px)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: C.card, borderRadius: 16, width: 500, maxWidth: '95vw', maxHeight: '92vh', overflowY: 'auto', boxShadow: C.shadowLg }}>
        <DatePicker open={showNgay} selectedDate={form.ngay_hen} onClose={() => setShowNgay(false)} onConfirm={v => { set('ngay_hen', v); setShowNgay(false) }} />
        <div style={{ padding: '18px 24px 14px', borderBottom: `1px solid ${C.line}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontFamily: 'var(--serif)', fontSize: 20, fontWeight: 700, color: C.espresso }}>
            {initial?.id ? '✏️ Sửa Lịch Hẹn' : '📅 Đặt Lịch Hẹn Mới'}
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: C.ink3 }}>✕</button>
        </div>

        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div><div style={LBL}>Tên Khách *</div><input style={INP} value={form.ten_khach} onChange={e => set('ten_khach', e.target.value)} placeholder="Nguyễn Thị Lan" /></div>
            <div><div style={LBL}>Số Điện Thoại</div><input style={INP} value={form.sdt_khach || ''} onChange={e => set('sdt_khach', e.target.value)} placeholder="0901234567" /></div>
          </div>

          <div><div style={LBL}>Dịch Vụ</div>
            <select onChange={handleSelectDV} value={form.dich_vu_id || ''} style={INP}>
              <option value="">— Chọn từ danh mục —</option>
              {dichVuList.map(dv => <option key={dv.id} value={dv.id}>{dv.ten} ({dv.thoi_luong_phut || 60} phút)</option>)}
            </select>
            {!form.dich_vu_id && <input style={{ ...INP, marginTop: 7 }} value={form.ten_dich_vu || ''} onChange={e => set('ten_dich_vu', e.target.value)} placeholder="Hoặc nhập tên dịch vụ tự do..." />}
          </div>

          <div><div style={LBL}>Kỹ Thuật Viên Phụ Trách</div>
            <select value={form.nhan_vien_id || ''} onChange={e => set('nhan_vien_id', e.target.value || null)} style={INP}>
              <option value="">— Chưa phân KTV —</option>
              {ktvList.map(k => <option key={k.id} value={k.id}>{shortName(k.ho_ten)} ({k.vi_tri === 'ktv' ? 'KTV' : 'Lễ Tân'})</option>)}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr 1fr', gap: 14 }}>
            <div><div style={LBL}>Ngày Hẹn *</div>
              <button onClick={() => setShowNgay(true)} style={{ ...INP, textAlign: 'left', cursor: 'pointer' }}>
                {form.ngay_hen ? `${dayOfWeek(form.ngay_hen)}, ${fmtDate(form.ngay_hen)}` : 'Chọn ngày'}
              </button>
            </div>
            <div><div style={LBL}>Giờ Hẹn *</div>
              <select value={form.gio_hen} onChange={e => set('gio_hen', e.target.value)} style={INP}>{GIO_LIST.map(g => <option key={g} value={g}>{g}</option>)}</select>
            </div>
            <div><div style={LBL}>Thời Lượng</div>
              <select value={form.thoi_luong_phut} onChange={e => set('thoi_luong_phut', +e.target.value)} style={INP}>{[30, 45, 60, 90, 120, 150, 180].map(m => <option key={m} value={m}>{m} phút</option>)}</select>
            </div>
          </div>

          <div><div style={LBL}>Ghi Chú</div>
            <textarea value={form.ghi_chu || ''} onChange={e => set('ghi_chu', e.target.value)} placeholder="Yêu cầu đặc biệt, da liễu cần lưu ý..." style={{ ...INP, height: 60, paddingTop: 8, resize: 'vertical' }} />
          </div>
        </div>

        <div style={{ padding: '14px 24px', borderTop: `1px solid ${C.line}`, display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '10px 20px', borderRadius: 9, border: `1px solid ${C.line2}`, background: '#fff', fontSize: 13.5, cursor: 'pointer', color: C.ink2, fontFamily: 'var(--sans)' }}>Huỷ</button>
          <button onClick={handleSave} disabled={saving} style={{ padding: '10px 24px', borderRadius: 9, border: 'none', background: C.grad, color: '#fff', fontSize: 13.5, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1, fontFamily: 'var(--sans)' }}>
            {saving ? 'Đang lưu...' : (initial?.id ? 'Cập Nhật' : 'Đặt Lịch')}
          </button>
        </div>
      </div>
    </div>, document.body
  )
}

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
    else { const [y, m] = ngayXem.split('-'); const last = new Date(+y, +m, 0).getDate(); q = q.gte('ngay_hen', `${y}-${m}-01`).lte('ngay_hen', `${y}-${m}-${String(last).padStart(2, '0')}`) }
    const { data, error } = await q.order('gio_hen')
    if (error) showToast('Lỗi tải dữ liệu', 'error')
    setHenList(data || [])
    setLoading(false)
  }, [ngayXem, viewMode])
  useEffect(() => { fetchHen() }, [fetchHen])

  const handleSave = async () => { setModal(null); await fetchHen(); showToast('Đã lưu lịch hẹn ✓') }
  const handleStatus = async (id, tt) => {
    await supabase.from('lich_hen').update({ trang_thai: tt }).eq('id', id)
    await fetchHen()
    showToast(tt === 'da_xac_nhan' ? 'Đã xác nhận' : tt === 'da_xong' ? 'Đã hoàn thành' : 'Đã hủy hẹn')
  }
  const changePeriod = delta => {
    const d = new Date(ngayXem)
    if (viewMode === 'week') d.setDate(d.getDate() + delta * 7)
    else if (viewMode === 'month') d.setMonth(d.getMonth() + delta)
    else d.setDate(d.getDate() + delta)
    setNgayXem(d.toISOString().slice(0, 10))
  }
  const openPrefill = (gio, nvId, ngay) => setModal({ prefill: true, gio_hen: gio, nhan_vien_id: nvId, ngay_hen: ngay })

  const isToday = ngayXem === todayISO()
  const periodLabel = viewMode === 'week'
    ? (() => { const w = weekDaysOf(ngayXem); return `Tuần ${fmtDate(w[0]).slice(0, 5)} – ${fmtDate(w[6]).slice(0, 5)}` })()
    : viewMode === 'month' ? `Tháng ${monthOf(ngayXem)}/${ngayXem.split('-')[0]}`
    : `${dayOfWeek(ngayXem)}, ${fmtDate(ngayXem)}`
  const stats = henList.reduce((a, h) => { a[h.trang_thai] = (a[h.trang_thai] || 0) + 1; a.total++; return a }, { total: 0 })
  // Cột KTV: ưu tiên KTV; cộng thêm cột "Chưa phân" nếu có lịch chưa gán
  const ktvCols = ktvList.filter(k => k.vi_tri === 'ktv')
  const hasUnassigned = henList.some(h => !h.nhan_vien_id && h.trang_thai !== 'huy')
  const columns = [...ktvCols, ...(hasUnassigned ? [{ id: null, ho_ten: 'Chưa phân KTV', vi_tri: 'none' }] : [])]
  const henByCol = id => henList.filter(h => (h.nhan_vien_id || null) === id && h.trang_thai !== 'huy')

  const timelineH = SLOTS.length * ROW_H

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
              {SLOTS.map((m, i) => (
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
                  {/* Lưới slot + click để đặt lịch */}
                  {SLOTS.map((m, i) => (
                    <div key={m}
                      onClick={() => setModal({ prefill: true, gio_hen: `${String(Math.floor(m / 60)).padStart(2, '0')}:${m % 60 === 0 ? '00' : '30'}`, nhan_vien_id: col.id, ngay_hen: ngayXem })}
                      style={{ position: 'absolute', top: i * ROW_H, left: 0, right: 0, height: ROW_H, borderBottom: `1px solid ${m % 60 === 0 ? C.line : 'rgba(160,113,79,0.06)'}`, cursor: 'pointer' }}
                      title="Bấm để đặt lịch" />
                  ))}
                  {/* Block lịch hẹn */}
                  {items.map(h => {
                    const top = (gioToMin(h.gio_hen) - HOUR_START * 60) / SLOT_MIN * ROW_H
                    const height = Math.max(ROW_H - 2, (h.thoi_luong_phut || 60) / SLOT_MIN * ROW_H - 2)
                    const cfg = TRANG_THAI[h.trang_thai] || TRANG_THAI.cho_xac_nhan
                    return (
                      <div key={h.id} onClick={e => { e.stopPropagation(); setModal(h) }}
                        style={{ position: 'absolute', top: top + 1, left: 3, right: 3, height, background: cfg.bg, borderLeft: `3px solid ${cfg.bar}`, borderRadius: 6, padding: '4px 7px', cursor: 'pointer', overflow: 'hidden', boxShadow: '0 1px 4px rgba(139,94,60,0.12)' }}
                        title={`${h.gio_hen} ${h.ten_khach} — ${h.ten_dich_vu || ''}`}>
                        <div style={{ fontSize: 11, fontWeight: 800, color: cfg.color }}>{(h.gio_hen || '').slice(0, 5)} · {h.ten_khach}</div>
                        {h.ten_dich_vu && height > ROW_H && <div style={{ fontSize: 10, color: C.ink2, marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.ten_dich_vu}</div>}
                        {height > ROW_H * 1.6 && (
                          <div style={{ display: 'flex', gap: 4, marginTop: 3 }}>
                            {h.trang_thai === 'cho_xac_nhan' && <button onClick={e => { e.stopPropagation(); handleStatus(h.id, 'da_xac_nhan') }} style={miniBtn('#3FA968')}>✓</button>}
                            {(h.trang_thai === 'cho_xac_nhan' || h.trang_thai === 'da_xac_nhan') && <button onClick={e => { e.stopPropagation(); handleStatus(h.id, 'da_xong') }} style={miniBtn('#3b78d4')}>Xong</button>}
                            <button onClick={e => { e.stopPropagation(); if (confirm('Hủy lịch hẹn này?')) handleStatus(h.id, 'huy') }} style={miniBtn('#d8654f')}>✕</button>
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
          ktvList={ktvList} onSave={handleSave} onClose={() => setModal(null)} user={user}
        />
      )}
    </div>
  )
}

// ── VIEW TUẦN: 7 cột ngày × timeline giờ ──
function WeekView({ weekDays, henList, ktvList, onOpenBlock, onOpenSlot, onGoDay }) {
  const ktvMap = {}; ktvList.forEach(k => { ktvMap[k.id] = k })
  const timelineH = SLOTS.length * ROW_H
  const today = todayISO()
  const henByDay = d => henList.filter(h => h.ngay_hen === d && h.trang_thai !== 'huy')
  return (
    <div style={{ background: C.card, borderRadius: 12, border: `1px solid ${C.line}`, boxShadow: C.shadow, overflow: 'auto' }}>
      <div style={{ display: 'grid', gridTemplateColumns: `56px repeat(7, minmax(120px,1fr))`, minWidth: 56 + 7 * 120 }}>
        <div style={{ position: 'sticky', top: 0, zIndex: 3, background: C.bg, borderBottom: `1px solid ${C.line2}`, borderRight: `1px solid ${C.line}` }} />
        {weekDays.map(d => {
          const isTd = d === today
          return (
            <div key={d} onClick={() => onGoDay(d)} style={{ position: 'sticky', top: 0, zIndex: 3, background: isTd ? '#fdf3e0' : C.bg, borderBottom: `1px solid ${C.line2}`, borderRight: `1px solid ${C.line}`, padding: '7px 6px', textAlign: 'center', cursor: 'pointer' }}>
              <div style={{ fontSize: 11, color: C.ink3, fontWeight: 700 }}>{dayOfWeek(d)}</div>
              <div style={{ fontSize: 15, fontWeight: 800, color: isTd ? C.primary : C.ink, fontFamily: 'var(--serif)' }}>{d.split('-')[2]}</div>
            </div>
          )
        })}
        <div style={{ position: 'relative', borderRight: `1px solid ${C.line}`, height: timelineH }}>
          {SLOTS.map((m, i) => m % 60 === 0 && <div key={m} style={{ position: 'absolute', top: i * ROW_H, right: 5, fontSize: 10, color: C.ink3, fontWeight: 700, transform: 'translateY(-6px)' }}>{String(m / 60).padStart(2, '0')}:00</div>)}
        </div>
        {weekDays.map(d => (
          <div key={d} style={{ position: 'relative', borderRight: `1px solid ${C.line}`, height: timelineH }}>
            {SLOTS.map((m, i) => (
              <div key={m} onClick={() => onOpenSlot(`${String(Math.floor(m / 60)).padStart(2, '0')}:${m % 60 === 0 ? '00' : '30'}`, null, d)}
                style={{ position: 'absolute', top: i * ROW_H, left: 0, right: 0, height: ROW_H, borderBottom: `1px solid ${m % 60 === 0 ? C.line : 'rgba(160,113,79,0.06)'}`, cursor: 'pointer' }} />
            ))}
            {henByDay(d).map(h => {
              const top = (gioToMin(h.gio_hen) - HOUR_START * 60) / SLOT_MIN * ROW_H
              const height = Math.max(ROW_H - 2, (h.thoi_luong_phut || 60) / SLOT_MIN * ROW_H - 2)
              const cfg = TRANG_THAI[h.trang_thai] || TRANG_THAI.cho_xac_nhan
              const nv = ktvMap[h.nhan_vien_id]
              return (
                <div key={h.id} onClick={e => { e.stopPropagation(); onOpenBlock(h) }} title={`${h.gio_hen} ${h.ten_khach}`}
                  style={{ position: 'absolute', top: top + 1, left: 2, right: 2, height, background: cfg.bg, borderLeft: `3px solid ${cfg.bar}`, borderRadius: 5, padding: '3px 5px', cursor: 'pointer', overflow: 'hidden', boxShadow: '0 1px 3px rgba(139,94,60,0.1)' }}>
                  <div style={{ fontSize: 10.5, fontWeight: 800, color: cfg.color }}>{(h.gio_hen || '').slice(0, 5)} {h.ten_khach}</div>
                  {nv && height > ROW_H && <div style={{ fontSize: 9.5, color: C.ink2, marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{shortName(nv.ho_ten)}</div>}
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── VIEW THÁNG: lưới calendar ──
function MonthView({ matrix, curMonth, henList, onGoDay }) {
  const today = todayISO()
  const byDay = {}; henList.forEach(h => { if (h.trang_thai !== 'huy') (byDay[h.ngay_hen] = byDay[h.ngay_hen] || []).push(h) })
  return (
    <div style={{ background: C.card, borderRadius: 12, border: `1px solid ${C.line}`, boxShadow: C.shadow, overflow: 'hidden' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)' }}>
        {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map(d => (
          <div key={d} style={{ padding: '8px', textAlign: 'center', fontSize: 11, fontWeight: 800, color: C.ink3, background: C.bg, borderBottom: `1px solid ${C.line2}` }}>{d}</div>
        ))}
        {matrix.flat().map((d, i) => {
          const inMonth = monthOf(d) === curMonth
          const items = (byDay[d] || []).sort((a, b) => gioToMin(a.gio_hen) - gioToMin(b.gio_hen))
          const isTd = d === today
          return (
            <div key={i} onClick={() => onGoDay(d)} style={{ minHeight: 94, borderRight: `1px solid ${C.line}`, borderBottom: `1px solid ${C.line}`, padding: '5px 6px', cursor: 'pointer', background: isTd ? '#fdf3e0' : (inMonth ? '#fff' : '#faf8f5'), opacity: inMonth ? 1 : 0.5 }}>
              <div style={{ fontSize: 12.5, fontWeight: isTd ? 800 : 600, color: isTd ? C.primary : C.ink, marginBottom: 3 }}>{d.split('-')[2]}</div>
              {items.slice(0, 3).map(h => {
                const cfg = TRANG_THAI[h.trang_thai] || TRANG_THAI.cho_xac_nhan
                return <div key={h.id} style={{ fontSize: 9.5, color: cfg.color, background: cfg.bg, borderRadius: 3, padding: '1px 4px', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{(h.gio_hen || '').slice(0, 5)} {h.ten_khach}</div>
              })}
              {items.length > 3 && <div style={{ fontSize: 9, color: C.ink3, fontWeight: 700 }}>+{items.length - 3} lịch</div>}
            </div>
          )
        })}
      </div>
    </div>
  )
}

const navBtn = { width: 34, height: 34, borderRadius: 8, border: `1px solid ${C.line2}`, background: '#fdfcfb', cursor: 'pointer', fontSize: 16, color: C.ink3, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }
const miniBtn = (color) => ({ border: 'none', background: color, color: '#fff', borderRadius: 4, padding: '1px 6px', fontSize: 9.5, fontWeight: 700, cursor: 'pointer', lineHeight: 1.4 })
