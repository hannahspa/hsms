import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../../lib/supabase'
import { COLORS } from '../../../constants/colors'
import ROITab from './ROITab'

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
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(26,18,9,0.55)', zIndex: 200 }}>
      <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: 'calc(100vw - var(--side-w, 248px))', maxWidth: '100vw', background: 'white',
        overflow: 'auto', boxShadow: '-6px 0 40px rgba(0,0,0,0.28)', animation: 'rpSlideIn .22s ease' }}>

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

// ── Promo Card ────────────────────────────────────────────────────────────────
function KMRow({ km, dichVuMap, onEdit, onDelete, onToggle }) {
  const sc = STATUS_COLOR[km.trang_thai] || STATUS_COLOR.draft
  const today = todayISO()
  const isExpiredDate = km.ngay_ket_thuc < today && km.trang_thai === 'active'
  const status = isExpiredDate ? 'expired' : km.trang_thai
  const statusSc = STATUS_COLOR[status] || sc

  // Màu arch cover theo tên
  const coverColors = [
    'linear-gradient(135deg,#C9A96E,#A0714F)',
    'linear-gradient(135deg,#7D9EC0,#5A7A9A)',
    'linear-gradient(135deg,#7BB88F,#4E9467)',
    'linear-gradient(135deg,#C4998A,#A87366)',
    'linear-gradient(135deg,#9B8EA0,#7A6B80)',
    'linear-gradient(135deg,#D4A96E,#B07840)',
  ]
  const coverGrad = coverColors[(km.ten?.charCodeAt(0) || 0) % coverColors.length]

  return (
    <div className="promo" style={{ display: 'flex', flexDirection: 'column' }}>
      {/* Cover arch */}
      <div className="promo-cover" style={{ background: coverGrad, position: 'relative', overflow: 'hidden', borderRadius: 'var(--r) var(--r) 0 0' }}>
        {/* Discount badge */}
        <div style={{
          position: 'absolute', top: 10, right: 10,
          background: 'rgba(192,57,43,.9)', color: 'white',
          borderRadius: 6, padding: '4px 10px',
          fontSize: 13, fontWeight: 800, letterSpacing: '.02em',
        }}>
          -{km.phan_tram_giam}%
        </div>
        {/* Status badge */}
        <div style={{
          position: 'absolute', top: 10, left: 10,
          background: statusSc.bg, color: statusSc.color,
          borderRadius: 6, padding: '3px 8px',
          fontSize: 10.5, fontWeight: 700,
          display: 'flex', alignItems: 'center', gap: 4,
        }}>
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: statusSc.dot, display: 'inline-block' }} />
          {isExpiredDate ? 'Quá hạn' : STATUS_LABEL[km.trang_thai]}
        </div>
      </div>

      {/* Body */}
      <div className="promo-body" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ fontFamily: 'var(--serif)', fontSize: 15, fontWeight: 700, color: 'var(--ink)', lineHeight: 1.3 }}>
          {km.ten}
        </div>
        {km.dich_vu_id && dichVuMap[km.dich_vu_id] && (
          <div style={{ fontSize: 11.5, color: 'var(--ink3)' }}>
            {dichVuMap[km.dich_vu_id]}
          </div>
        )}
        {/* Price row */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 2 }}>
          <span style={{ fontFamily: 'var(--serif)', fontSize: 17, fontWeight: 700, color: 'var(--chi)' }}>
            {fmt(km.gia_km)}
          </span>
          <span style={{ fontSize: 12, color: 'var(--ink3)', textDecoration: 'line-through' }}>
            {fmt(km.gia_goc)}
          </span>
        </div>
        <div style={{ fontSize: 11, color: 'var(--ink3)' }}>
          {fmtDate(km.ngay_bat_dau)} → {fmtDate(km.ngay_ket_thuc)}
        </div>
        {km.mo_ta && (
          <div style={{ fontSize: 11.5, color: 'var(--ink3)', borderTop: '1px solid var(--line)', paddingTop: 6 }}>
            {km.mo_ta}
          </div>
        )}
        {/* Actions */}
        <div style={{ display: 'flex', gap: 6, marginTop: 'auto', paddingTop: 8 }}>
          <button className="btn" style={{ flex: 1, justifyContent: 'center', fontSize: 12, padding: '7px 8px' }}
            onClick={() => onEdit(km)}>
            Sửa
          </button>
          <button className="btn ghost" style={{ flex: 1, justifyContent: 'center', fontSize: 12, padding: '7px 8px' }}
            onClick={() => onToggle(km)}>
            {km.trang_thai === 'active' ? 'Tạm dừng' : 'Kích hoạt'}
          </button>
          <button className="icon-btn" style={{ width: 30, height: 30, color: 'var(--chi)' }}
            onClick={() => onDelete(km)}>
            ✕
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────────
const KM_PATH_TAB = {
  '/admin/khuyen-mai':      'list',
  '/admin/khuyen-mai/roi':  'roi',
}

export default function AdminKhuyenMaiPage() {
  const [list, setList]           = useState([])
  const [dichVuList, setDichVuList] = useState([])
  const [filter, setFilter]       = useState('all')
  const [loading, setLoading]     = useState(true)
  const [showForm, setShowForm]   = useState(false)
  const [editing, setEditing]     = useState(null)
  const [toast, setToast]         = useState('')
  const [tab, setTab]             = useState(() => KM_PATH_TAB[window.location.pathname] || 'list')

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
    <>
      {/* mod-head */}
      <div className="mod-head" style={{ marginBottom: 20 }}>
        <div>
          <div className="ttl">Khuyến Mãi</div>
          <div className="sub">
            Badge giảm giá · hiển thị trên Menu iPad + Landing Page
          </div>
        </div>
        <div className="acts">
          <div className="subtabs">
            <div className={`st${tab === 'list' ? ' active' : ''}`} onClick={() => setTab('list')}>Danh Sách</div>
            <div className={`st${tab === 'roi' ? ' active' : ''}`} onClick={() => setTab('roi')}>Phân Tích ROI</div>
          </div>
          <button className="btn gold" onClick={handleCreate}>
            + Tạo mới
          </button>
        </div>
      </div>

      {/* Strip KPIs */}
      <div className="strip" style={{ gridTemplateColumns: 'repeat(4,1fr)', marginBottom: 20 }}>
        <div className="it">
          <div className="l">Tổng Khuyến Mãi</div>
          <div className="v">{list.length}</div>
        </div>
        <div className="it">
          <div className="l">Đang Chạy</div>
          <div className="v" style={{ color: 'var(--thu)' }}>{stats.active}</div>
        </div>
        <div className="it">
          <div className="l">Nháp</div>
          <div className="v">{stats.draft}</div>
        </div>
        <div className="it">
          <div className="l">Hết Hạn</div>
          <div className="v" style={{ color: 'var(--ink3)' }}>{stats.expired}</div>
        </div>
      </div>

      {/* ROI Tab */}
      {tab === 'roi' && <ROITab list={list} />}

      {/* List tab */}
      {tab === 'list' && (
        <>
          {/* Filter chips */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
            {[['all', 'Tất Cả'], ['active', 'Đang chạy'], ['draft', 'Nháp'], ['expired', 'Hết hạn']].map(([k, l]) => (
              <button key={k} className={`chip${filter === k ? ' active' : ''}`}
                onClick={() => setFilter(k)} style={{ padding: '7px 14px', fontSize: 12.5 }}>
                {l}
                <span style={{ opacity: .6, marginLeft: 5 }}>
                  {k === 'all' ? list.length : list.filter(x => x.trang_thai === k).length}
                </span>
              </button>
            ))}
          </div>

          {/* Promo Grid */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px', color: 'var(--ink3)' }}>
              <div style={{ width: 44, height: 72, margin: '0 auto 16px', background: 'var(--grad-gold)', borderRadius: '999px 999px 12px 12px', opacity: .3, animation: 'floatGlow 2.5s ease-in-out infinite alternate' }} />
              Đang tải khuyến mãi...
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px', color: 'var(--ink3)' }}>
              <div style={{ fontFamily: 'var(--serif)', fontSize: 17, fontWeight: 600, color: 'var(--ink2)', marginBottom: 6 }}>Chưa có khuyến mãi nào</div>
              <div style={{ fontSize: 13 }}>Nhấn "+ Tạo mới" để bắt đầu</div>
            </div>
          ) : (
            <div className="promo-grid">
              {filtered.map(km => (
                <KMRow key={km.id} km={km} dichVuMap={dichVuMap}
                  onEdit={handleEdit} onDelete={handleDelete} onToggle={handleToggle} />
              ))}
            </div>
          )}
        </>
      )}

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
        <div style={{
          position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          background: 'var(--espresso)', color: '#f5ede0', padding: '12px 24px',
          borderRadius: 999, fontWeight: 700, fontSize: 14, zIndex: 999,
          boxShadow: 'var(--sh-3)', whiteSpace: 'nowrap', maxWidth: '90vw',
          animation: 'fadeUp .3s var(--ease-out) both',
        }}>
          {toast}
        </div>
      )}
    </>
  )
}
