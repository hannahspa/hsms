import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabase'
import { COLORS } from '../../../constants/colors'

const STATUS_LABEL = { active: 'Đang chạy', draft: 'Nháp', expired: 'Hết hạn' }
const STATUS_COLOR = {
  active:  { bg: '#E8F5E9', color: '#2D7A4F', dot: '#2D7A4F' },
  draft:   { bg: '#FFF8E1', color: '#B8860B', dot: '#F4D03F' },
  expired: { bg: '#FDECEA', color: '#C0392B', dot: '#E8796B' },
}

function fmt(n) {
  if (!n) return '—'
  return new Intl.NumberFormat('vi-VN').format(n) + 'đ'
}
function fmtDate(d) {
  if (!d) return ''
  const [y, m, day] = d.split('-')
  return `${day}/${m}/${y}`
}
function todayISO() {
  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }))
  return now.toISOString().slice(0, 10)
}

// ── Form tạo / sửa KM ─────────────────────────────────────────────────────────
function KMForm({ initial, dichVuList, onSave, onCancel }) {
  const isEdit = !!initial?.id
  const [form, setForm] = useState({
    ten:          initial?.ten          || '',
    mo_ta:        initial?.mo_ta        || '',
    dich_vu_id:   initial?.dich_vu_id   || '',
    gia_goc:      initial?.gia_goc      || '',
    gia_km:       initial?.gia_km       || '',
    ngay_bat_dau: initial?.ngay_bat_dau || todayISO(),
    ngay_ket_thuc:initial?.ngay_ket_thuc|| '',
    trang_thai:   initial?.trang_thai   || 'active',
  })
  const [saving, setSaving] = useState(false)
  const [err, setErr]       = useState('')

  const pct = form.gia_goc && form.gia_km
    ? Math.round((form.gia_goc - form.gia_km) / form.gia_goc * 100)
    : 0

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleDichVu = (id) => {
    set('dich_vu_id', id)
    const dv = dichVuList.find(d => d.id === id)
    if (dv?.gia_co_ban) set('gia_goc', dv.gia_co_ban)
  }

  const handleSave = async () => {
    if (!form.ten.trim())      return setErr('Nhập tên khuyến mãi')
    if (!form.gia_goc)         return setErr('Nhập giá gốc')
    if (!form.gia_km)          return setErr('Nhập giá khuyến mãi')
    if (+form.gia_km >= +form.gia_goc) return setErr('Giá KM phải nhỏ hơn giá gốc')
    if (!form.ngay_ket_thuc)   return setErr('Chọn ngày kết thúc')
    if (form.ngay_ket_thuc < form.ngay_bat_dau) return setErr('Ngày kết thúc phải sau ngày bắt đầu')
    setSaving(true); setErr('')
    const payload = {
      ten:           form.ten.trim(),
      mo_ta:         form.mo_ta.trim(),
      dich_vu_id:    form.dich_vu_id || null,
      gia_goc:       +form.gia_goc,
      gia_km:        +form.gia_km,
      ngay_bat_dau:  form.ngay_bat_dau,
      ngay_ket_thuc: form.ngay_ket_thuc,
      trang_thai:    form.trang_thai,
    }
    let error
    if (isEdit) {
      ;({ error } = await supabase.from('khuyen_mai').update(payload).eq('id', initial.id))
    } else {
      ;({ error } = await supabase.from('khuyen_mai').insert(payload))
    }
    setSaving(false)
    if (error) return setErr(error.message)
    onSave()
  }

  const inputStyle = {
    width: '100%', padding: '10px 14px', border: `1px solid ${COLORS.border}`,
    borderRadius: '10px', fontSize: '14px', background: COLORS.bg, color: COLORS.text,
    outline: 'none', boxSizing: 'border-box',
  }
  const labelStyle = { fontSize: '12px', fontWeight: '700', color: COLORS.textSub, marginBottom: '6px', display: 'block' }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(26,18,9,0.55)', zIndex: 200,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div style={{ background: 'white', borderRadius: '20px', width: '100%', maxWidth: '520px',
        maxHeight: '90vh', overflow: 'auto', boxShadow: '0 24px 80px rgba(0,0,0,0.25)' }}>

        {/* Header */}
        <div style={{ background: COLORS.grad, padding: '20px 24px', borderRadius: '20px 20px 0 0',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ color: 'white', fontWeight: '800', fontSize: '17px' }}>
            {isEdit ? '✏️ Sửa Khuyến Mãi' : '➕ Tạo Khuyến Mãi Mới'}
          </div>
          <button onClick={onCancel}
            style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white',
              width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer', fontSize: '14px' }}>
            ✕
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Tên KM */}
          <div>
            <label style={labelStyle}>TÊN KHUYẾN MÃI *</label>
            <input style={inputStyle} value={form.ten}
              onChange={e => set('ten', e.target.value)}
              placeholder="VD: Ưu đãi tháng 5 - Massage Body" />
          </div>

          {/* Chọn dịch vụ */}
          <div>
            <label style={labelStyle}>DỊCH VỤ ÁP DỤNG</label>
            <select style={inputStyle} value={form.dich_vu_id} onChange={e => handleDichVu(e.target.value)}>
              <option value="">— Không gắn dịch vụ cụ thể —</option>
              {dichVuList.map(dv => (
                <option key={dv.id} value={dv.id}>
                  {dv.ten} ({fmt(dv.gia_co_ban)})
                </option>
              ))}
            </select>
          </div>

          {/* Giá */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={labelStyle}>GIÁ GỐC (đ) *</label>
              <input style={inputStyle} type="number" value={form.gia_goc}
                onChange={e => set('gia_goc', e.target.value)}
                placeholder="VD: 300000" />
            </div>
            <div>
              <label style={labelStyle}>GIÁ KHUYẾN MÃI (đ) *</label>
              <input style={inputStyle} type="number" value={form.gia_km}
                onChange={e => set('gia_km', e.target.value)}
                placeholder="VD: 199000" />
            </div>
          </div>

          {/* Phần trăm preview */}
          {pct > 0 && (
            <div style={{ background: '#FFF3E0', border: '1px solid #FFB74D', borderRadius: '10px',
              padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '20px' }}>🏷️</span>
              <span style={{ fontWeight: '700', color: '#E65100', fontSize: '15px' }}>
                Giảm {pct}% — Tiết kiệm {fmt(form.gia_goc - form.gia_km)}
              </span>
            </div>
          )}

          {/* Ngày */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={labelStyle}>NGÀY BẮT ĐẦU *</label>
              <input style={inputStyle} type="date" value={form.ngay_bat_dau}
                onChange={e => set('ngay_bat_dau', e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>NGÀY KẾT THÚC *</label>
              <input style={inputStyle} type="date" value={form.ngay_ket_thuc}
                onChange={e => set('ngay_ket_thuc', e.target.value)} />
            </div>
          </div>

          {/* Mô tả */}
          <div>
            <label style={labelStyle}>MÔ TẢ (tùy chọn)</label>
            <textarea style={{ ...inputStyle, height: '72px', resize: 'vertical' }}
              value={form.mo_ta} onChange={e => set('mo_ta', e.target.value)}
              placeholder="Điều kiện áp dụng, ghi chú..." />
          </div>

          {/* Trạng thái */}
          <div>
            <label style={labelStyle}>TRẠNG THÁI</label>
            <select style={inputStyle} value={form.trang_thai}
              onChange={e => set('trang_thai', e.target.value)}>
              <option value="active">Đang chạy (active)</option>
              <option value="draft">Nháp (draft)</option>
              <option value="expired">Hết hạn (expired)</option>
            </select>
          </div>

          {err && (
            <div style={{ background: '#FDECEA', color: '#C0392B', padding: '10px 14px',
              borderRadius: '8px', fontSize: '13px', fontWeight: '600' }}>
              ⚠️ {err}
            </div>
          )}

          {/* Buttons */}
          <div style={{ display: 'flex', gap: '10px', paddingTop: '4px' }}>
            <button onClick={onCancel}
              style={{ flex: 1, padding: '13px', background: 'white', border: `1px solid ${COLORS.border}`,
                borderRadius: '12px', fontWeight: '700', fontSize: '14px', cursor: 'pointer', color: COLORS.textSub }}>
              Hủy
            </button>
            <button onClick={handleSave} disabled={saving}
              style={{ flex: 2, padding: '13px', background: COLORS.grad, color: 'white',
                border: 'none', borderRadius: '12px', fontWeight: '800', fontSize: '14px', cursor: 'pointer',
                opacity: saving ? 0.7 : 1 }}>
              {saving ? 'Đang lưu...' : isEdit ? '💾 Lưu thay đổi' : '✅ Tạo khuyến mãi'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Row item ───────────────────────────────────────────────────────────────────
function KMRow({ km, dichVuMap, onEdit, onDelete, onToggle }) {
  const sc = STATUS_COLOR[km.trang_thai] || STATUS_COLOR.draft
  const today = todayISO()
  const isExpiredDate = km.ngay_ket_thuc < today && km.trang_thai === 'active'

  return (
    <div style={{ background: 'white', borderRadius: '14px', padding: '16px 20px',
      border: `1px solid ${COLORS.border}`, boxShadow: COLORS.shadow,
      display: 'flex', flexDirection: 'column', gap: '10px' }}>

      {/* Row 1: Tên + badge */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', justifyContent: 'space-between' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: '800', fontSize: '15px', color: COLORS.text }}>
            {km.ten}
          </div>
          {km.dich_vu_id && dichVuMap[km.dich_vu_id] && (
            <div style={{ fontSize: '12px', color: COLORS.textMute, marginTop: '2px' }}>
              📌 {dichVuMap[km.dich_vu_id]}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
          {/* % giảm */}
          <span style={{ background: '#C0392B', color: 'white', borderRadius: '6px',
            padding: '3px 8px', fontSize: '12px', fontWeight: '800' }}>
            -{km.phan_tram_giam}%
          </span>
          {/* Status */}
          <span style={{ background: sc.bg, color: sc.color, borderRadius: '6px',
            padding: '3px 8px', fontSize: '12px', fontWeight: '700' }}>
            {isExpiredDate ? '⚠️ Quá hạn' : STATUS_LABEL[km.trang_thai]}
          </span>
        </div>
      </div>

      {/* Row 2: Giá */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span style={{ fontSize: '12px', color: COLORS.textMute, textDecoration: 'line-through' }}>
          {fmt(km.gia_goc)}
        </span>
        <span style={{ fontSize: '17px', fontWeight: '800', color: '#C0392B' }}>
          {fmt(km.gia_km)}
        </span>
        <span style={{ fontSize: '12px', color: COLORS.textMute }}>
          · Tiết kiệm {fmt(km.gia_goc - km.gia_km)}
        </span>
      </div>

      {/* Row 3: Ngày */}
      <div style={{ fontSize: '12px', color: COLORS.textMute }}>
        📅 {fmtDate(km.ngay_bat_dau)} → {fmtDate(km.ngay_ket_thuc)}
      </div>

      {/* Mô tả */}
      {km.mo_ta && (
        <div style={{ fontSize: '12px', color: COLORS.textSub, background: COLORS.bg,
          borderRadius: '8px', padding: '8px 10px' }}>
          {km.mo_ta}
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: '8px', paddingTop: '4px' }}>
        <button onClick={() => onEdit(km)}
          style={{ flex: 1, padding: '8px', background: COLORS.bg, border: `1px solid ${COLORS.border}`,
            borderRadius: '8px', fontWeight: '700', fontSize: '12px', cursor: 'pointer', color: COLORS.text }}>
          ✏️ Sửa
        </button>
        <button onClick={() => onToggle(km)}
          style={{ flex: 1, padding: '8px', background: COLORS.bg, border: `1px solid ${COLORS.border}`,
            borderRadius: '8px', fontWeight: '700', fontSize: '12px', cursor: 'pointer', color: COLORS.textSub }}>
          {km.trang_thai === 'active' ? '⏸ Tạm dừng' : '▶️ Kích hoạt'}
        </button>
        <button onClick={() => onDelete(km)}
          style={{ padding: '8px 12px', background: '#FDECEA', border: '1px solid #FADBD8',
            borderRadius: '8px', fontWeight: '700', fontSize: '12px', cursor: 'pointer', color: '#C0392B' }}>
          🗑
        </button>
      </div>
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function AdminKhuyenMaiPage() {
  const [list, setList]           = useState([])
  const [dichVuList, setDichVuList] = useState([])
  const [filter, setFilter]       = useState('all')
  const [loading, setLoading]     = useState(true)
  const [showForm, setShowForm]   = useState(false)
  const [editing, setEditing]     = useState(null)
  const [toast, setToast]         = useState('')

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 2500) }

  const load = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('khuyen_mai')
      .select('*')
      .order('created_at', { ascending: false })
    setList(data || [])
    setLoading(false)
  }

  useEffect(() => {
    load()
    supabase.from('dich_vu')
      .select('id, ten, gia_co_ban, nhom_hien_thi')
      .eq('is_active', true)
      .order('nhom_hien_thi')
      .order('ten')
      .then(({ data }) => setDichVuList(data || []))
  }, [])

  const dichVuMap = Object.fromEntries(dichVuList.map(d => [d.id, d.ten]))

  const filtered = filter === 'all' ? list : list.filter(k => k.trang_thai === filter)

  const handleEdit   = (km) => { setEditing(km); setShowForm(true) }
  const handleCreate = ()   => { setEditing(null); setShowForm(true) }
  const handleSave   = ()   => { setShowForm(false); load(); showToast('✅ Lưu thành công!') }

  const handleDelete = async (km) => {
    if (!window.confirm(`Xóa khuyến mãi "${km.ten}"?`)) return
    const { error } = await supabase.from('khuyen_mai').delete().eq('id', km.id)
    if (error) return showToast('❌ Lỗi: ' + error.message)
    showToast('🗑 Đã xóa!')
    load()
  }

  const handleToggle = async (km) => {
    const newStatus = km.trang_thai === 'active' ? 'draft' : 'active'
    const { error } = await supabase.from('khuyen_mai')
      .update({ trang_thai: newStatus }).eq('id', km.id)
    if (error) return showToast('❌ Lỗi: ' + error.message)
    showToast(newStatus === 'active' ? '✅ Đã kích hoạt!' : '⏸ Đã tạm dừng!')
    load()
  }

  // Thống kê
  const stats = {
    active:  list.filter(k => k.trang_thai === 'active').length,
    draft:   list.filter(k => k.trang_thai === 'draft').length,
    expired: list.filter(k => k.trang_thai === 'expired').length,
  }

  return (
    <div style={{ minHeight: '100vh', background: COLORS.bg, fontFamily: 'sans-serif', paddingBottom: '40px' }}>

      {/* Header */}
      <div style={{ background: COLORS.grad, padding: '40px 20px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
          <button onClick={() => window.location.href = '/admin'}
            style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white',
              padding: '6px 12px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' }}>
            ← Admin
          </button>
        </div>
        <div style={{ color: 'white', fontWeight: '800', fontSize: '22px', marginTop: '8px' }}>
          🏷️ Quản Lý Khuyến Mãi
        </div>
        <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '13px', marginTop: '4px' }}>
          Hiển thị badge giảm giá trên menu iPad + landing page
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
          {[
            { label: 'Đang chạy', val: stats.active, color: '#6FCF8E' },
            { label: 'Nháp',      val: stats.draft,  color: '#F4D03F' },
            { label: 'Hết hạn',   val: stats.expired,color: '#E8796B' },
          ].map(s => (
            <div key={s.label} style={{ flex: 1, background: 'rgba(255,255,255,0.15)',
              borderRadius: '12px', padding: '10px 14px', textAlign: 'center' }}>
              <div style={{ color: s.color, fontWeight: '800', fontSize: '22px' }}>{s.val}</div>
              <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '11px', marginTop: '2px' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Filter + Tạo mới */}
      <div style={{ padding: '16px 20px', display: 'flex', gap: '8px', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '6px', flex: 1, flexWrap: 'wrap' }}>
          {[['all', 'Tất Cả'], ['active', '✅ Đang chạy'], ['draft', '⏸ Nháp'], ['expired', '⏹ Hết hạn']].map(([k, l]) => (
            <button key={k} onClick={() => setFilter(k)}
              style={{ padding: '7px 14px', borderRadius: '999px', border: 'none', cursor: 'pointer',
                fontWeight: '700', fontSize: '12px',
                background: filter === k ? COLORS.primary : 'white',
                color: filter === k ? 'white' : COLORS.textSub,
                boxShadow: COLORS.shadow }}>
              {l}
            </button>
          ))}
        </div>
        <button onClick={handleCreate}
          style={{ padding: '10px 18px', background: COLORS.grad, color: 'white', border: 'none',
            borderRadius: '12px', fontWeight: '800', fontSize: '13px', cursor: 'pointer',
            whiteSpace: 'nowrap', boxShadow: COLORS.shadow }}>
          + Tạo mới
        </button>
      </div>

      {/* List */}
      <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: COLORS.textMute }}>Đang tải...</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: COLORS.textMute }}>
            <div style={{ fontSize: '36px', marginBottom: '12px' }}>🏷️</div>
            <div style={{ fontWeight: '700' }}>Chưa có khuyến mãi nào</div>
            <div style={{ fontSize: '13px', marginTop: '6px' }}>Nhấn "+ Tạo mới" để bắt đầu</div>
          </div>
        ) : (
          filtered.map(km => (
            <KMRow key={km.id} km={km} dichVuMap={dichVuMap}
              onEdit={handleEdit} onDelete={handleDelete} onToggle={handleToggle} />
          ))
        )}
      </div>

      {/* Form modal */}
      {showForm && (
        <KMForm
          initial={editing}
          dichVuList={dichVuList}
          onSave={handleSave}
          onCancel={() => setShowForm(false)}
        />
      )}

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', bottom: '24px', left: '50%', transform: 'translateX(-50%)',
          background: '#1A1209', color: 'white', padding: '12px 24px', borderRadius: '999px',
          fontWeight: '700', fontSize: '14px', zIndex: 999, boxShadow: '0 8px 32px rgba(0,0,0,0.25)' }}>
          {toast}
        </div>
      )}
    </div>
  )
}
