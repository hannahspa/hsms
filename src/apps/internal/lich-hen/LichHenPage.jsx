import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { supabase } from '../../../lib/supabase'
import { todayISO, getNowVN } from '../../../lib/utils'
import DatePicker from '../../../components/shared/DatePicker'

// ── Hannah Luxury Palette ──
const C = {
  bg:       '#FAF7F4',
  card:     '#FFFFFF',
  border:   'rgba(160,113,79,0.12)',
  text:     '#1A1209',
  textSub:  '#8B7355',
  textMute: '#B8A898',
  gold:     '#C9A96E',
  primary:  '#A0714F',
  grad:     'linear-gradient(135deg, #C9A96E 0%, #A0714F 45%, #7D5A3C 100%)',
  success:  '#2D7A4F',
  danger:   '#C0392B',
  shadow:   '0 4px 24px rgba(139,94,60,0.10)',
  shadowLg: '0 8px 40px rgba(139,94,60,0.18)',
}

const TRANG_THAI = {
  cho_xac_nhan: { label: 'Chờ Xác Nhận', bg: '#FFF9F0', color: '#B8860B' },
  da_xac_nhan:  { label: 'Đã Xác Nhận',  bg: '#eef2e7', color: '#2D7A4F' },
  da_xong:      { label: 'Hoàn Thành',   bg: '#e8f0fe', color: '#1a4f96' },
  huy:          { label: 'Đã Hủy',       bg: '#f5e0da', color: '#C0392B' },
}

const GIO_LIST = (() => {
  const list = []
  for (let h = 9; h <= 19; h++) {
    list.push(`${String(h).padStart(2,'0')}:00`)
    if (h < 19) list.push(`${String(h).padStart(2,'0')}:30`)
  }
  return list
})()

function fmtDate(iso) {
  if (!iso) return '—'
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}
function dayOfWeek(iso) {
  if (!iso) return ''
  const [y, m, d] = iso.split('-').map(Number)
  const DOW = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7']
  return DOW[new Date(y, m - 1, d).getDay()]
}

// ── Status Badge ──
function Badge({ tt }) {
  const cfg = TRANG_THAI[tt] || TRANG_THAI.cho_xac_nhan
  return (
    <span style={{ background: cfg.bg, color: cfg.color, padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' }}>
      {cfg.label}
    </span>
  )
}

// ── Modal Đặt/Sửa Lịch Hẹn ──
function ModalDatHen({ initial, onSave, onClose, user }) {
  const [form, setForm] = useState(initial || {
    ten_khach: '', sdt_khach: '', ten_dich_vu: '',
    thoi_luong_phut: 60, ngay_hen: todayISO(), gio_hen: '10:00', ghi_chu: '',
  })
  const [dichVuList, setDichVuList] = useState([])
  const [saving, setSaving] = useState(false)
  const [showNgayPicker, setShowNgayPicker] = useState(false)

  useEffect(() => {
    supabase.from('dich_vu').select('id, ten, thoi_luong_phut').eq('is_active', true).order('ten').then(({ data }) => setDichVuList(data || []))
  }, [])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSelectDV = (e) => {
    const id = e.target.value
    const dv = dichVuList.find(d => d.id === id)
    if (dv) {
      set('dich_vu_id', dv.id)
      set('ten_dich_vu', dv.ten)
      set('thoi_luong_phut', dv.thoi_luong_phut || 60)
    } else {
      set('dich_vu_id', null)
    }
  }

  const handleSave = async () => {
    if (!form.ten_khach.trim()) { alert('Vui lòng nhập tên khách'); return }
    if (!form.ngay_hen)         { alert('Vui lòng chọn ngày hẹn'); return }
    if (!form.gio_hen)          { alert('Vui lòng chọn giờ hẹn'); return }
    setSaving(true)
    try {
      const payload = {
        ten_khach:       form.ten_khach.trim(),
        sdt_khach:       form.sdt_khach?.trim() || null,
        dich_vu_id:      form.dich_vu_id || null,
        ten_dich_vu:     form.ten_dich_vu?.trim() || null,
        thoi_luong_phut: form.thoi_luong_phut || 60,
        ngay_hen:        form.ngay_hen,
        gio_hen:         form.gio_hen,
        ghi_chu:         form.ghi_chu?.trim() || null,
        nguoi_nhap:      user?.email || user?.ho_ten || 'Lễ Tân',
      }
      if (initial?.id) {
        await supabase.from('lich_hen').update(payload).eq('id', initial.id)
      } else {
        payload.trang_thai = 'cho_xac_nhan'
        await supabase.from('lich_hen').insert(payload)
      }
      onSave()
    } catch (e) {
      console.error(e)
      alert('Lỗi lưu lịch hẹn: ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  const INP = { width: '100%', height: 36, borderRadius: 8, border: `1px solid ${C.border}`, padding: '0 10px', fontFamily: 'var(--sans)', fontSize: 13, outline: 'none', boxSizing: 'border-box', background: '#fdfcfb' }
  const LBL = { fontFamily: 'var(--sans)', fontSize: 11, fontWeight: 700, color: C.textMute, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 5 }

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: C.card, borderRadius: 16, padding: 28, width: 480, maxWidth: '95vw', boxShadow: C.shadowLg, maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ fontFamily: 'Georgia, serif', fontSize: 20, fontWeight: 600, color: '#3d2c20', marginBottom: 20 }}>
          {initial?.id ? '✏️ Sửa Lịch Hẹn' : '📅 Đặt Lịch Hẹn Mới'}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
          <div>
            <div style={LBL}>Tên Khách *</div>
            <input style={INP} value={form.ten_khach} onChange={e => set('ten_khach', e.target.value)} placeholder="Nguyễn Thị Lan" />
          </div>
          <div>
            <div style={LBL}>Số Điện Thoại</div>
            <input style={INP} value={form.sdt_khach || ''} onChange={e => set('sdt_khach', e.target.value)} placeholder="0901234567" />
          </div>
        </div>

        <div style={{ marginBottom: 14 }}>
          <div style={LBL}>Dịch Vụ</div>
          <select onChange={handleSelectDV} defaultValue="" style={{ ...INP, height: 36 }}>
            <option value="">— Chọn từ danh mục —</option>
            {dichVuList.map(dv => (
              <option key={dv.id} value={dv.id}>{dv.ten} ({dv.thoi_luong_phut || 60} phút)</option>
            ))}
          </select>
          {!form.dich_vu_id && (
            <input style={{ ...INP, marginTop: 6 }} value={form.ten_dich_vu || ''} onChange={e => set('ten_dich_vu', e.target.value)} placeholder="Hoặc nhập tên dịch vụ tự do..." />
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 14 }}>
          <div>
            <div style={LBL}>Ngày Hẹn *</div>
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setShowNgayPicker(true)}
                style={{ ...INP, textAlign: 'left', cursor: 'pointer', background: '#fdfcfb', color: form.ngay_hen ? C.text : C.textMute }}
              >
                {form.ngay_hen ? `${dayOfWeek(form.ngay_hen)}, ${fmtDate(form.ngay_hen)}` : 'Chọn ngày'}
              </button>
              {showNgayPicker && (
                <DatePicker
                  value={form.ngay_hen}
                  onChange={v => { set('ngay_hen', v); setShowNgayPicker(false) }}
                  onClose={() => setShowNgayPicker(false)}
                />
              )}
            </div>
          </div>
          <div>
            <div style={LBL}>Giờ Hẹn *</div>
            <select value={form.gio_hen} onChange={e => set('gio_hen', e.target.value)} style={{ ...INP, height: 36 }}>
              {GIO_LIST.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
          <div>
            <div style={LBL}>Thời Lượng</div>
            <select value={form.thoi_luong_phut} onChange={e => set('thoi_luong_phut', +e.target.value)} style={{ ...INP, height: 36 }}>
              {[30, 45, 60, 90, 120, 150, 180].map(m => <option key={m} value={m}>{m} phút</option>)}
            </select>
          </div>
        </div>

        <div style={{ marginBottom: 20 }}>
          <div style={LBL}>Ghi Chú</div>
          <textarea value={form.ghi_chu || ''} onChange={e => set('ghi_chu', e.target.value)}
            placeholder="Yêu cầu đặc biệt, da liễu cần lưu ý..."
            style={{ ...INP, height: 64, resize: 'vertical', padding: '8px 10px', lineHeight: 1.5 }} />
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '9px 18px', borderRadius: 8, border: `1px solid ${C.border}`, background: '#fff', fontFamily: 'var(--sans)', fontSize: 13, cursor: 'pointer', color: C.textSub }}>Huỷ</button>
          <button onClick={handleSave} disabled={saving} style={{ padding: '9px 22px', borderRadius: 8, border: 'none', background: C.grad, color: '#fff', fontFamily: 'var(--sans)', fontSize: 13, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
            {saving ? 'Đang lưu...' : (initial?.id ? 'Cập Nhật' : 'Đặt Lịch')}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

// ── Thẻ lịch hẹn ──
function HenCard({ h, onEdit, onStatus }) {
  const cfg = TRANG_THAI[h.trang_thai] || TRANG_THAI.cho_xac_nhan
  const ketThuc = (() => {
    const [hh, mm] = h.gio_hen.split(':').map(Number)
    const total = hh * 60 + mm + (h.thoi_luong_phut || 60)
    return `${String(Math.floor(total/60)).padStart(2,'0')}:${String(total%60).padStart(2,'0')}`
  })()

  return (
    <div style={{ display: 'flex', gap: 0, borderLeft: `3px solid ${cfg.color}`, background: C.card, borderRadius: 10, boxShadow: C.shadow, overflow: 'hidden', transition: 'box-shadow 0.15s' }}>
      {/* Giờ */}
      <div style={{ minWidth: 72, background: '#faf6f2', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '12px 8px', borderRight: `1px solid ${C.border}` }}>
        <div style={{ fontFamily: 'var(--sans)', fontWeight: 800, fontSize: 18, color: C.primary, letterSpacing: '-0.5px' }}>{h.gio_hen}</div>
        <div style={{ fontFamily: 'var(--sans)', fontSize: 10, color: C.textMute, marginTop: 1 }}>→ {ketThuc}</div>
      </div>

      {/* Nội dung */}
      <div style={{ flex: 1, padding: '11px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
          <div>
            <div style={{ fontFamily: 'var(--sans)', fontWeight: 700, fontSize: 14, color: C.text }}>{h.ten_khach}</div>
            {h.sdt_khach && <div style={{ fontFamily: 'var(--sans)', fontSize: 12, color: C.textSub, marginTop: 1 }}>📞 {h.sdt_khach}</div>}
          </div>
          <Badge tt={h.trang_thai} />
        </div>

        {(h.ten_dich_vu) && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 6 }}>
            <span style={{ fontSize: 12, color: C.textMute }}>💆</span>
            <span style={{ fontFamily: 'var(--sans)', fontSize: 12, color: C.textSub }}>{h.ten_dich_vu} · {h.thoi_luong_phut} phút</span>
          </div>
        )}

        {h.ghi_chu && (
          <div style={{ marginTop: 5, fontFamily: 'var(--sans)', fontSize: 12, color: C.textMute, fontStyle: 'italic' }}>"{h.ghi_chu}"</div>
        )}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', flexDirection: 'column', padding: '6px', gap: 4, borderLeft: `1px solid ${C.border}`, justifyContent: 'center' }}>
        <button onClick={() => onEdit(h)} title="Sửa" style={{ width: 28, height: 28, borderRadius: 6, border: `1px solid ${C.border}`, background: '#fff', cursor: 'pointer', fontSize: 13 }}>✏️</button>
        {h.trang_thai === 'cho_xac_nhan' && (
          <button onClick={() => onStatus(h.id, 'da_xac_nhan')} title="Xác nhận" style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid #c8e8c8', background: '#eef2e7', cursor: 'pointer', fontSize: 13 }}>✓</button>
        )}
        {(h.trang_thai === 'cho_xac_nhan' || h.trang_thai === 'da_xac_nhan') && (
          <button onClick={() => onStatus(h.id, 'da_xong')} title="Hoàn thành" style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid #c8d8f0', background: '#e8f0fe', cursor: 'pointer', fontSize: 13 }}>✔</button>
        )}
        {h.trang_thai !== 'huy' && h.trang_thai !== 'da_xong' && (
          <button onClick={() => onStatus(h.id, 'huy')} title="Hủy hẹn" style={{ width: 28, height: 28, borderRadius: 6, border: `1px solid #f5c6c6`, background: '#fff5f5', cursor: 'pointer', fontSize: 13 }}>✕</button>
        )}
      </div>
    </div>
  )
}

// ══════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════
export default function LichHenPage({ user }) {
  const now  = getNowVN()
  const [ngayXem,   setNgayXem]   = useState(todayISO())
  const [henList,   setHenList]   = useState([])
  const [loading,   setLoading]   = useState(true)
  const [showPicker, setShowPicker] = useState(false)
  const [modal,     setModal]     = useState(null)   // null | 'new' | {id,...}
  const [toast,     setToast]     = useState(null)

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const fetchHen = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('lich_hen')
      .select('*')
      .eq('ngay_hen', ngayXem)
      .order('gio_hen')
    if (error) { console.error(error); showToast('Lỗi tải dữ liệu', 'error') }
    setHenList(data || [])
    setLoading(false)
  }, [ngayXem])

  useEffect(() => { fetchHen() }, [fetchHen])

  const handleSave = async () => {
    setModal(null)
    await fetchHen()
    showToast('Đã lưu lịch hẹn ✓')
  }

  const handleStatus = async (id, trangThai) => {
    await supabase.from('lich_hen').update({ trang_thai: trangThai }).eq('id', id)
    await fetchHen()
    const msg = trangThai === 'da_xac_nhan' ? 'Đã xác nhận hẹn' : trangThai === 'da_xong' ? 'Đã hoàn thành' : 'Đã hủy hẹn'
    showToast(msg)
  }

  const prevDay = () => {
    const d = new Date(ngayXem); d.setDate(d.getDate() - 1)
    setNgayXem(d.toISOString().slice(0, 10))
  }
  const nextDay = () => {
    const d = new Date(ngayXem); d.setDate(d.getDate() + 1)
    setNgayXem(d.toISOString().slice(0, 10))
  }

  // Thống kê nhanh
  const stats = henList.reduce((acc, h) => {
    acc[h.trang_thai] = (acc[h.trang_thai] || 0) + 1
    acc.total++
    return acc
  }, { total: 0 })

  const isToday = ngayXem === todayISO()

  return (
    <div style={{ padding: '24px 28px 48px', fontFamily: 'var(--sans)' }}>

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 9999, background: toast.type === 'error' ? C.danger : C.success, color: '#fff', borderRadius: 10, padding: '11px 18px', fontFamily: 'var(--sans)', fontSize: 13, fontWeight: 600, boxShadow: C.shadowLg }}>
          {toast.msg}
        </div>
      )}

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontFamily: 'Georgia, serif', fontSize: 24, fontWeight: 600, color: '#3d2c20', lineHeight: 1.2 }}>📅 Lịch Hẹn</div>
          <div style={{ fontFamily: 'var(--sans)', fontSize: 13, color: C.textSub, marginTop: 3 }}>
            {henList.length} lịch hẹn{isToday ? ' hôm nay' : ` ngày ${fmtDate(ngayXem)}`}
          </div>
        </div>
        <button
          onClick={() => setModal('new')}
          style={{ padding: '9px 20px', borderRadius: 10, border: 'none', background: C.grad, color: '#fff', fontFamily: 'var(--sans)', fontSize: 13, fontWeight: 600, cursor: 'pointer', boxShadow: '0 2px 8px rgba(160,113,79,0.3)' }}
        >
          + Đặt Lịch Mới
        </button>
      </div>

      {/* ── Day Navigator ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, background: C.card, borderRadius: 12, padding: '10px 14px', boxShadow: C.shadow, border: `1px solid ${C.border}` }}>
        <button onClick={prevDay} style={{ width: 32, height: 32, borderRadius: 8, border: `1px solid ${C.border}`, background: '#fdfcfb', cursor: 'pointer', fontSize: 16, color: C.textSub }}>‹</button>

        <div style={{ flex: 1, textAlign: 'center' }}>
          <span style={{ fontFamily: 'var(--sans)', fontWeight: 700, fontSize: 16, color: isToday ? C.primary : C.text }}>
            {isToday ? '📌 Hôm Nay — ' : ''}{dayOfWeek(ngayXem)}, {fmtDate(ngayXem)}
          </span>
        </div>

        <div style={{ position: 'relative' }}>
          <button onClick={() => setShowPicker(v => !v)} style={{ width: 32, height: 32, borderRadius: 8, border: `1px solid ${C.border}`, background: '#fdfcfb', cursor: 'pointer', fontSize: 14 }}>📅</button>
          {showPicker && (
            <div style={{ position: 'absolute', right: 0, top: 38, zIndex: 100 }}>
              <DatePicker value={ngayXem} onChange={v => { setNgayXem(v); setShowPicker(false) }} onClose={() => setShowPicker(false)} />
            </div>
          )}
        </div>

        <button onClick={nextDay} style={{ width: 32, height: 32, borderRadius: 8, border: `1px solid ${C.border}`, background: '#fdfcfb', cursor: 'pointer', fontSize: 16, color: C.textSub }}>›</button>

        {!isToday && (
          <button onClick={() => setNgayXem(todayISO())} style={{ padding: '5px 12px', borderRadius: 8, border: `1px solid ${C.gold}`, background: '#fdf3e0', color: '#8a6a35', fontFamily: 'var(--sans)', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>Về hôm nay</button>
        )}
      </div>

      {/* ── Stats nhanh ── */}
      {henList.length > 0 && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          {Object.entries(TRANG_THAI).map(([tt, cfg]) => {
            const n = stats[tt] || 0
            if (!n) return null
            return (
              <div key={tt} style={{ background: cfg.bg, color: cfg.color, padding: '4px 12px', borderRadius: 20, fontFamily: 'var(--sans)', fontSize: 12, fontWeight: 600 }}>
                {cfg.label}: {n}
              </div>
            )
          })}
        </div>
      )}

      {/* ── Danh sách lịch hẹn ── */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: C.textMute, fontSize: 14 }}>Đang tải...</div>
      ) : henList.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 0', color: C.textMute }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>📭</div>
          <div style={{ fontFamily: 'var(--sans)', fontSize: 14 }}>Chưa có lịch hẹn ngày này</div>
          <button onClick={() => setModal('new')} style={{ marginTop: 14, padding: '8px 20px', borderRadius: 8, border: `1px solid ${C.gold}`, background: '#fdf3e0', color: C.primary, fontFamily: 'var(--sans)', fontSize: 13, cursor: 'pointer', fontWeight: 600 }}>
            + Đặt lịch đầu tiên
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {henList.map(h => (
            <HenCard key={h.id} h={h} onEdit={hen => setModal(hen)} onStatus={handleStatus} />
          ))}
        </div>
      )}

      {/* ── Modal ── */}
      {modal && (
        <ModalDatHen
          initial={modal === 'new' ? null : modal}
          onSave={handleSave}
          onClose={() => setModal(null)}
          user={user}
        />
      )}
    </div>
  )
}
