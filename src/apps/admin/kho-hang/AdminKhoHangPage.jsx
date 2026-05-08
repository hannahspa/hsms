import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../context/AuthContext'
import { COLORS } from '../../../constants/colors'

// ── Constants ──────────────────────────────────────────────────────────────────
const DON_VI_LIST = ['cái', 'chai', 'lọ', 'hộp', 'gói', 'thùng', 'túi', 'cuộn',
                     'lít', 'ml', 'kg', 'g', 'đôi', 'bộ', 'tờ', 'miếng']

const LOAI_SP = {
  tieu_hao:  { label: 'Mỹ Phẩm Tiêu Hao', icon: '🧴', color: '#2D7A4F',  bg: '#E8F5E9' },
  ban_khach: { label: 'Hàng Bán Khách',    icon: '🛍️', color: '#A0714F',  bg: '#FDF3E9' },
  vat_tu:    { label: 'Vật Tư Tiêu Hao',   icon: '📦', color: '#1A5276',  bg: '#EBF5FB' },
}

const LOAI_GD = {
  nhap_kho:     { label: 'Nhập kho',         icon: '📥', sign: +1, color: '#2D7A4F' },
  xuat_su_dung: { label: 'Xuất dùng nội bộ', icon: '🔧', sign: -1, color: '#E67E22' },
  xuat_ban:     { label: 'Xuất bán khách',   icon: '💸', sign: -1, color: '#A0714F' },
  chiet_ra:     { label: 'Chiết rót (lấy)',  icon: '🧪', sign: -1, color: '#8E44AD' },
  chiet_vao:    { label: 'Chiết rót (vào)',  icon: '🧪', sign: +1, color: '#8E44AD' },
  dieu_chinh:   { label: 'Điều chỉnh kho',   icon: '⚖️', sign:  0, color: '#1A5276' },
  tra_nha_cc:   { label: 'Trả nhà cung cấp', icon: '↩️', sign: -1, color: '#C0392B' },
}

const HINH_THUC = [
  { val: 'tien_mat',     label: 'Tiền Mặt' },
  { val: 'chuyen_khoan', label: 'Chuyển Khoản' },
  { val: 'quet_the',     label: 'Quẹt Thẻ' },
]

function fmt(n) {
  if (!n && n !== 0) return '—'
  return new Intl.NumberFormat('vi-VN').format(n) + 'đ'
}
function fmtSL(n, dv) {
  if (n == null) return '—'
  const num = Number(n)
  return (Number.isInteger(num) ? num : +num.toFixed(2)) + ' ' + (dv || '')
}
function todayISO() {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }))
    .toISOString().slice(0, 10)
}
function monthRange(year, month) {
  const from = `${year}-${String(month).padStart(2, '0')}-01`
  const last  = new Date(year, month, 0).getDate()
  const to    = `${year}-${String(month).padStart(2, '0')}-${String(last).padStart(2, '0')}`
  return { from, to }
}

const inp = {
  width: '100%', padding: '10px 14px', border: `1px solid ${COLORS.border}`,
  borderRadius: '10px', fontSize: '14px', background: COLORS.bg, color: COLORS.text,
  outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
}
const lbl = {
  fontSize: '11px', fontWeight: '700', color: COLORS.textSub, marginBottom: '5px',
  display: 'block', textTransform: 'uppercase', letterSpacing: '0.04em',
}

// ══════════════════════════════════════════════════════════════════════════════
// KIỂM KHO MODAL
// ══════════════════════════════════════════════════════════════════════════════
function KiemKhoModal({ products, userId, onSave, onClose, showToast }) {
  const [counts, setCounts] = useState({})
  const [search, setSearch] = useState('')
  const [saving, setSaving] = useState(false)

  const active = products.filter(p => p.is_active)
  const filtered = active.filter(p =>
    !search || p.ten.toLowerCase().includes(search.toLowerCase())
  )

  const changed = active.filter(p =>
    counts[p.id] !== undefined && counts[p.id] !== '' &&
    +counts[p.id] !== Number(p.ton_kho)
  )

  const handleSubmit = async () => {
    if (changed.length === 0) { onClose(); return }
    setSaving(true)
    const kiemKhoId = crypto.randomUUID()

    const gds = changed.map(p => ({
      san_pham_id: p.id,
      loai: 'dieu_chinh',
      so_luong: Math.max(0.001, Math.abs(+counts[p.id] - Number(p.ton_kho))),
      gia_don_vi: 0,
      ghi_chu: `Kiểm kho ${todayISO()}: DB=${fmtSL(p.ton_kho, p.don_vi)} → Thực=${fmtSL(+counts[p.id], p.don_vi)}`,
      lien_quan_id: kiemKhoId,
      ngay: todayISO(),
      nguoi_thuc_hien: userId || null,
    }))

    const { error } = await supabase.from('kho_giao_dich').insert(gds)
    if (error) { setSaving(false); showToast('❌ ' + error.message); return }

    await Promise.all(changed.map(p =>
      supabase.from('kho_san_pham').update({ ton_kho: +counts[p.id] }).eq('id', p.id)
    ))
    setSaving(false)
    showToast(`✅ Đã cập nhật ${changed.length} sản phẩm`)
    onSave()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'white', zIndex: 300,
      display: 'flex', flexDirection: 'column', fontFamily: 'inherit' }}>
      {/* Header */}
      <div style={{ background: COLORS.grad, padding: '44px 20px 16px',
        display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
        <button onClick={onClose}
          style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white',
            width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer', fontSize: '14px' }}>
          ←
        </button>
        <div>
          <div style={{ color: 'white', fontWeight: '800', fontSize: '18px' }}>🔍 Kiểm Kho</div>
          <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '12px' }}>
            Nhập số thực tế → hệ thống tự điều chỉnh
          </div>
        </div>
        {changed.length > 0 && (
          <div style={{ marginLeft: 'auto', background: '#C0392B', color: 'white',
            padding: '4px 12px', borderRadius: '999px', fontSize: '12px', fontWeight: '800' }}>
            {changed.length} thay đổi
          </div>
        )}
      </div>

      {/* Search */}
      <div style={{ padding: '12px 16px', background: 'white', borderBottom: `1px solid ${COLORS.border}`, flexShrink: 0 }}>
        <input style={{ ...inp, padding: '9px 14px' }}
          placeholder="🔍 Tìm sản phẩm..." value={search}
          onChange={e => setSearch(e.target.value)} />
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px',
        display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {filtered.map(p => {
          const loai = LOAI_SP[p.loai] || {}
          const newVal = counts[p.id]
          const hasVal = newVal !== undefined && newVal !== ''
          const delta = hasVal ? +newVal - Number(p.ton_kho) : 0
          const changed = hasVal && delta !== 0
          return (
            <div key={p.id} style={{ background: changed ? '#FFF8E1' : 'white',
              border: `1px solid ${changed ? '#FFE082' : COLORS.border}`,
              borderRadius: '12px', padding: '12px 14px',
              display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '9px',
                background: loai.bg, display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}>
                {loai.icon}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: '700', fontSize: '13px', color: COLORS.text,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {p.ten}
                </div>
                <div style={{ fontSize: '11px', color: COLORS.textMute }}>
                  Hệ thống: <strong style={{ color: COLORS.primary }}>{fmtSL(p.ton_kho, p.don_vi)}</strong>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                {changed && (
                  <span style={{ fontSize: '12px', fontWeight: '800',
                    color: delta > 0 ? '#2D7A4F' : '#C0392B' }}>
                    {delta > 0 ? '+' : ''}{delta.toFixed(1)}
                  </span>
                )}
                <input
                  type="number" step="0.1" min="0"
                  style={{ ...inp, width: '90px', padding: '8px 10px',
                    background: changed ? 'white' : COLORS.bg,
                    borderColor: changed ? '#FFE082' : COLORS.border }}
                  placeholder={String(Number(p.ton_kho))}
                  value={counts[p.id] ?? ''}
                  onChange={e => setCounts(prev => ({ ...prev, [p.id]: e.target.value }))}
                />
              </div>
            </div>
          )
        })}
      </div>

      {/* Footer */}
      <div style={{ padding: '16px 20px', background: 'white',
        borderTop: `1px solid ${COLORS.border}`, flexShrink: 0,
        display: 'flex', gap: '10px' }}>
        <button onClick={onClose}
          style={{ flex: 1, padding: '13px', background: 'white',
            border: `1px solid ${COLORS.border}`, borderRadius: '12px',
            fontWeight: '700', fontSize: '14px', cursor: 'pointer', color: COLORS.textSub }}>
          Hủy
        </button>
        <button onClick={handleSubmit} disabled={saving || changed.length === 0}
          style={{ flex: 2, padding: '13px', background: changed.length ? COLORS.grad : '#EEE',
            color: changed.length ? 'white' : COLORS.textMute, border: 'none',
            borderRadius: '12px', fontWeight: '800', fontSize: '14px',
            cursor: changed.length && !saving ? 'pointer' : 'default' }}>
          {saving ? 'Đang lưu...' : changed.length
            ? `✅ Cập nhật ${changed.length} sản phẩm`
            : 'Chưa có thay đổi'}
        </button>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB 1: TỔNG QUAN
// ══════════════════════════════════════════════════════════════════════════════
function TabTongQuan({ products, transactions, onNavigate, onKiemKho }) {
  const active = products.filter(p => p.is_active)
  const sapHet  = active.filter(p => Number(p.ton_kho) <= Number(p.canh_bao_ton) && Number(p.canh_bao_ton) > 0)
  const hetHang = active.filter(p => Number(p.ton_kho) <= 0)
  const giaTriKho = active
    .filter(p => p.loai !== 'ban_khach')
    .reduce((s, p) => s + Number(p.ton_kho) * Number(p.gia_nhap || 0), 0)
  const spMap = Object.fromEntries(products.map(p => [p.id, p]))
  const recent = [...transactions]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 10)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
        {[
          { label: 'Tổng sản phẩm', val: active.length, icon: '📦', color: COLORS.primary },
          { label: 'Giá trị kho',   val: fmt(giaTriKho), icon: '💰', color: '#2D7A4F' },
          { label: 'Sắp hết hàng',  val: sapHet.length,  icon: '⚠️', color: '#E67E22',
            action: sapHet.length > 0, onClick: () => onNavigate('san-pham') },
          { label: 'Hết hàng',      val: hetHang.length, icon: '🚨', color: '#C0392B',
            action: hetHang.length > 0, onClick: () => onNavigate('san-pham') },
        ].map(s => (
          <div key={s.label} onClick={s.action ? s.onClick : undefined}
            style={{ background: 'white', borderRadius: '14px', padding: '16px',
              border: `1px solid ${COLORS.border}`, boxShadow: COLORS.shadow,
              cursor: s.action ? 'pointer' : 'default' }}>
            <div style={{ fontSize: '20px', marginBottom: '6px' }}>{s.icon}</div>
            <div style={{ fontSize: '22px', fontWeight: '800', color: s.color }}>{s.val}</div>
            <div style={{ fontSize: '12px', color: COLORS.textMute, marginTop: '2px' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Kiểm kho button */}
      <button onClick={onKiemKho}
        style={{ width: '100%', padding: '14px', background: 'white',
          border: `2px dashed ${COLORS.border}`, borderRadius: '14px',
          cursor: 'pointer', fontWeight: '800', fontSize: '14px', color: COLORS.primary,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
        🔍 Thực Hiện Kiểm Kho
        <span style={{ fontSize: '11px', fontWeight: '600', color: COLORS.textMute }}>
          Điều chỉnh số tồn thực tế
        </span>
      </button>

      {/* Cảnh báo sắp hết */}
      {sapHet.length > 0 && (
        <div style={{ background: '#FFF8E1', border: '1px solid #FFE082', borderRadius: '14px', padding: '16px' }}>
          <div style={{ fontWeight: '800', fontSize: '13px', color: '#7B5800', marginBottom: '10px' }}>
            ⚠️ {sapHet.length} sản phẩm cần nhập thêm
          </div>
          {sapHet.map(p => {
            const loai = LOAI_SP[p.loai] || {}
            const pct  = p.canh_bao_ton > 0
              ? Math.min(100, Math.max(0, (p.ton_kho / p.canh_bao_ton) * 100)) : 0
            return (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                <span style={{ fontSize: '14px' }}>{loai.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: COLORS.text }}>{p.ten}</div>
                  <div style={{ height: '4px', background: '#EEE', borderRadius: '2px', marginTop: '4px' }}>
                    <div style={{ height: '100%', borderRadius: '2px',
                      background: p.ton_kho <= 0 ? '#C0392B' : '#E67E22',
                      width: `${pct}%`, transition: 'width .3s' }} />
                  </div>
                </div>
                <span style={{ fontSize: '12px', fontWeight: '700',
                  color: p.ton_kho <= 0 ? '#C0392B' : '#E67E22', whiteSpace: 'nowrap' }}>
                  {fmtSL(p.ton_kho, p.don_vi)}
                </span>
              </div>
            )
          })}
        </div>
      )}

      {/* Giao dịch gần đây */}
      <div>
        <div style={{ fontWeight: '800', fontSize: '13px', color: COLORS.text, marginBottom: '10px' }}>
          Giao dịch gần đây
        </div>
        {recent.length === 0 ? (
          <div style={{ textAlign: 'center', color: COLORS.textMute, padding: '20px', fontSize: '13px' }}>
            Chưa có giao dịch nào
          </div>
        ) : recent.map(gd => {
          const sp = spMap[gd.san_pham_id]
          const loaiGD = LOAI_GD[gd.loai] || {}
          return (
            <div key={gd.id} style={{ background: 'white', borderRadius: '12px', padding: '12px 14px',
              border: `1px solid ${COLORS.border}`, display: 'flex', gap: '10px',
              alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '18px' }}>{loaiGD.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '13px', fontWeight: '700', color: COLORS.text }}>{sp?.ten || '—'}</div>
                <div style={{ fontSize: '11px', color: COLORS.textMute }}>{loaiGD.label} · {gd.ngay}</div>
              </div>
              <div style={{ fontSize: '13px', fontWeight: '800', textAlign: 'right',
                color: loaiGD.sign > 0 ? '#2D7A4F' : loaiGD.sign < 0 ? '#C0392B' : '#1A5276' }}>
                {loaiGD.sign > 0 ? '+' : loaiGD.sign < 0 ? '-' : '±'}{fmtSL(gd.so_luong, sp?.don_vi)}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// FORM SẢN PHẨM
// ══════════════════════════════════════════════════════════════════════════════
function FormSanPham({ initial, products, onSave, onClose }) {
  const isEdit = !!initial?.id
  const [f, setF] = useState({
    ten: initial?.ten || '',
    loai: initial?.loai || 'tieu_hao',
    don_vi: DON_VI_LIST.includes(initial?.don_vi) ? (initial?.don_vi || 'cái') : '__custom',
    don_vi_custom: DON_VI_LIST.includes(initial?.don_vi) ? '' : (initial?.don_vi || ''),
    mo_ta: initial?.mo_ta || '',
    gia_nhap: initial?.gia_nhap || '',
    gia_ban: initial?.gia_ban || '',
    ton_kho: initial?.ton_kho ?? '',
    canh_bao_ton: initial?.canh_bao_ton ?? 5,
    co_the_chiet: initial?.co_the_chiet || false,
    san_pham_chiet_id: initial?.san_pham_chiet_id || '',
    he_so_chiet: initial?.he_so_chiet || 1,
  })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const set = (k, v) => setF(prev => ({ ...prev, [k]: v }))

  const handleSave = async () => {
    if (!f.ten.trim()) return setErr('Nhập tên sản phẩm')
    const dv = f.don_vi === '__custom' ? f.don_vi_custom.trim() : f.don_vi
    if (!dv) return setErr('Chọn đơn vị tính')
    setSaving(true); setErr('')
    const payload = {
      ten: f.ten.trim(), loai: f.loai, don_vi: dv,
      mo_ta: f.mo_ta.trim(),
      gia_nhap: +f.gia_nhap || 0, gia_ban: +f.gia_ban || 0,
      canh_bao_ton: +f.canh_bao_ton || 0,
      co_the_chiet: f.co_the_chiet,
      san_pham_chiet_id: f.co_the_chiet && f.san_pham_chiet_id ? f.san_pham_chiet_id : null,
      he_so_chiet: f.co_the_chiet ? +f.he_so_chiet || 1 : 1,
    }
    if (!isEdit) payload.ton_kho = +f.ton_kho || 0

    let error
    if (isEdit) {
      ;({ error } = await supabase.from('kho_san_pham').update(payload).eq('id', initial.id))
    } else {
      ;({ error } = await supabase.from('kho_san_pham').insert(payload))
    }
    setSaving(false)
    if (error) return setErr(error.message)
    onSave()
  }

  const otherProducts = products.filter(p => p.id !== initial?.id)

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(26,18,9,0.55)', zIndex: 200,
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div style={{ background: 'white', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: '520px',
        maxHeight: '92vh', overflow: 'auto', boxShadow: '0 -8px 40px rgba(0,0,0,0.2)' }}>
        <div style={{ background: COLORS.grad, padding: '18px 20px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          borderRadius: '20px 20px 0 0', position: 'sticky', top: 0 }}>
          <div style={{ color: 'white', fontWeight: '800', fontSize: '16px' }}>
            {isEdit ? '✏️ Sửa sản phẩm' : '➕ Thêm sản phẩm'}
          </div>
          <button onClick={onClose}
            style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white',
              width: '30px', height: '30px', borderRadius: '50%', cursor: 'pointer', fontSize: '13px' }}>✕</button>
        </div>

        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={lbl}>LOẠI SẢN PHẨM</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              {Object.entries(LOAI_SP).map(([k, v]) => (
                <button key={k} onClick={() => set('loai', k)}
                  style={{ flex: 1, padding: '10px 6px', borderRadius: '10px', border: 'none',
                    cursor: 'pointer', fontSize: '11px', fontWeight: '700',
                    background: f.loai === k ? v.color : v.bg,
                    color: f.loai === k ? 'white' : v.color }}>
                  {v.icon}<br/>{v.label.split(' ')[0]}<br/>{v.label.split(' ').slice(1).join(' ')}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label style={lbl}>TÊN SẢN PHẨM *</label>
            <input style={inp} value={f.ten} onChange={e => set('ten', e.target.value)}
              placeholder="VD: Dầu massage Body, Bông tẩy trang..." />
          </div>

          <div>
            <label style={lbl}>ĐƠN VỊ TÍNH *</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <select style={{ ...inp, flex: 1 }} value={f.don_vi}
                onChange={e => { set('don_vi', e.target.value); if (e.target.value !== '__custom') set('don_vi_custom', '') }}>
                {DON_VI_LIST.map(u => <option key={u} value={u}>{u}</option>)}
                <option value="__custom">Nhập tùy chọn...</option>
              </select>
              {f.don_vi === '__custom' && (
                <input style={{ ...inp, flex: 1 }} placeholder="VD: viên, ống, set..."
                  value={f.don_vi_custom} onChange={e => set('don_vi_custom', e.target.value)} />
              )}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={lbl}>GIÁ NHẬP (đ)</label>
              <input style={inp} type="number" value={f.gia_nhap}
                onChange={e => set('gia_nhap', e.target.value)} placeholder="0" />
            </div>
            <div>
              <label style={lbl}>GIÁ BÁN (đ)</label>
              <input style={inp} type="number" value={f.gia_ban}
                onChange={e => set('gia_ban', e.target.value)} placeholder="0" />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={lbl}>TỒN KHO BAN ĐẦU</label>
              <input style={{ ...inp, opacity: isEdit ? 0.6 : 1 }} type="number" step="0.1"
                value={f.ton_kho} onChange={e => set('ton_kho', e.target.value)}
                placeholder="0" disabled={isEdit} />
              {isEdit && <div style={{ fontSize: '11px', color: COLORS.textMute, marginTop: '3px' }}>
                Dùng tab Nhập/Xuất để thay đổi
              </div>}
            </div>
            <div>
              <label style={lbl}>CẢNH BÁO KHI TỒN ≤</label>
              <input style={inp} type="number" step="0.1" value={f.canh_bao_ton}
                onChange={e => set('canh_bao_ton', e.target.value)} />
            </div>
          </div>

          <div>
            <label style={lbl}>MÔ TẢ (tùy chọn)</label>
            <textarea style={{ ...inp, height: '60px', resize: 'vertical' }}
              value={f.mo_ta} onChange={e => set('mo_ta', e.target.value)} />
          </div>

          <div style={{ background: '#F5F0FF', borderRadius: '12px', padding: '14px', border: '1px solid #D8C8FF' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
              <span style={{ fontSize: '16px' }}>🧪</span>
              <span style={{ fontWeight: '800', fontSize: '13px', color: '#6C3483' }}>Chiết Rót</span>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: 'auto',
                cursor: 'pointer', fontSize: '13px', color: '#6C3483', fontWeight: '700' }}>
                <input type="checkbox" checked={f.co_the_chiet}
                  onChange={e => set('co_the_chiet', e.target.checked)} />
                Bật chiết rót
              </label>
            </div>
            {f.co_the_chiet && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div>
                  <label style={lbl}>SẢN PHẨM CHIẾT NHỎ (đích)</label>
                  <select style={inp} value={f.san_pham_chiet_id}
                    onChange={e => set('san_pham_chiet_id', e.target.value)}>
                    <option value="">— Chọn sản phẩm —</option>
                    {otherProducts.map(p => (
                      <option key={p.id} value={p.id}>{p.ten} ({p.don_vi})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={lbl}>
                    HỆ SỐ: 1 {f.don_vi === '__custom' ? f.don_vi_custom || 'đv' : f.don_vi} lớn ={' '}
                    ? {otherProducts.find(p => p.id === f.san_pham_chiet_id)?.don_vi || 'đv'} nhỏ
                  </label>
                  <input style={inp} type="number" step="0.1" min="0.1"
                    value={f.he_so_chiet} onChange={e => set('he_so_chiet', e.target.value)} />
                </div>
              </div>
            )}
          </div>

          {err && (
            <div style={{ background: '#FDECEA', color: '#C0392B', padding: '10px 14px',
              borderRadius: '8px', fontSize: '13px', fontWeight: '600' }}>⚠️ {err}</div>
          )}

          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={onClose}
              style={{ flex: 1, padding: '13px', background: 'white', border: `1px solid ${COLORS.border}`,
                borderRadius: '12px', fontWeight: '700', fontSize: '14px', cursor: 'pointer', color: COLORS.textSub }}>
              Hủy
            </button>
            <button onClick={handleSave} disabled={saving}
              style={{ flex: 2, padding: '13px', background: COLORS.grad, color: 'white',
                border: 'none', borderRadius: '12px', fontWeight: '800', fontSize: '14px',
                cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
              {saving ? 'Đang lưu...' : isEdit ? '💾 Lưu' : '✅ Thêm'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB 2: SẢN PHẨM
// ══════════════════════════════════════════════════════════════════════════════
function TabSanPham({ products, onReload, showToast }) {
  const [filter, setFilter] = useState('all')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing]   = useState(null)
  const [search, setSearch]     = useState('')
  const spMap = Object.fromEntries(products.map(p => [p.id, p]))

  const filtered = products.filter(p => {
    if (!p.is_active) return false
    if (filter !== 'all' && p.loai !== filter) return false
    if (search && !p.ten.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const handleToggleActive = async (p) => {
    const { error } = await supabase.from('kho_san_pham').update({ is_active: false }).eq('id', p.id)
    if (error) return showToast('❌ ' + error.message)
    showToast('🗑 Đã ẩn sản phẩm')
    onReload()
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
        <input style={{ ...inp, flex: 1, padding: '9px 14px' }}
          placeholder="🔍 Tìm sản phẩm..." value={search}
          onChange={e => setSearch(e.target.value)} />
        <button onClick={() => { setEditing(null); setShowForm(true) }}
          style={{ padding: '9px 18px', background: COLORS.grad, color: 'white', border: 'none',
            borderRadius: '10px', fontWeight: '800', fontSize: '13px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
          + Thêm
        </button>
      </div>

      <div style={{ display: 'flex', gap: '6px', marginBottom: '14px', flexWrap: 'wrap' }}>
        {[['all', '📦 Tất cả'], ...Object.entries(LOAI_SP).map(([k, v]) => [k, `${v.icon} ${v.label}`])]
          .map(([k, l]) => (
            <button key={k} onClick={() => setFilter(k)}
              style={{ padding: '6px 14px', borderRadius: '999px', border: 'none', cursor: 'pointer',
                fontWeight: '700', fontSize: '12px',
                background: filter === k ? COLORS.primary : 'white',
                color: filter === k ? 'white' : COLORS.textSub,
                boxShadow: COLORS.shadow }}>
              {l} ({k === 'all' ? products.filter(p => p.is_active).length
                : products.filter(p => p.is_active && p.loai === k).length})
            </button>
          ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: COLORS.textMute }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>📦</div>
            <div>Chưa có sản phẩm nào</div>
          </div>
        ) : filtered.map(p => {
          const loai = LOAI_SP[p.loai] || {}
          const pct  = p.canh_bao_ton > 0
            ? Math.min(100, (Number(p.ton_kho) / Number(p.canh_bao_ton)) * 100) : 100
          const warn = Number(p.ton_kho) <= Number(p.canh_bao_ton) && Number(p.canh_bao_ton) > 0
          const chietSP = p.co_the_chiet && p.san_pham_chiet_id ? spMap[p.san_pham_chiet_id] : null
          return (
            <div key={p.id} style={{ background: 'white', borderRadius: '14px', padding: '14px 16px',
              border: warn ? '1px solid #FFB74D' : `1px solid ${COLORS.border}`,
              boxShadow: COLORS.shadow }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                <div style={{ width: '38px', height: '38px', borderRadius: '10px',
                  background: loai.bg, display: 'flex', alignItems: 'center',
                  justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}>
                  {loai.icon}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: '800', fontSize: '14px', color: COLORS.text }}>{p.ten}</div>
                  <div style={{ fontSize: '11px', color: COLORS.textMute, marginTop: '2px' }}>
                    {loai.label} · {p.don_vi}
                    {p.gia_nhap > 0 && ` · Nhập: ${fmt(p.gia_nhap)}`}
                    {p.gia_ban > 0 && ` · Bán: ${fmt(p.gia_ban)}`}
                  </div>
                  <div style={{ marginTop: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                      <span style={{ fontSize: '11px', color: COLORS.textMute }}>Tồn kho</span>
                      <span style={{ fontSize: '12px', fontWeight: '800',
                        color: Number(p.ton_kho) <= 0 ? '#C0392B' : warn ? '#E67E22' : '#2D7A4F' }}>
                        {fmtSL(p.ton_kho, p.don_vi)}
                      </span>
                    </div>
                    <div style={{ height: '5px', background: '#F0E9E0', borderRadius: '3px' }}>
                      <div style={{ height: '100%', borderRadius: '3px', transition: 'width .3s',
                        background: Number(p.ton_kho) <= 0 ? '#C0392B' : warn ? '#E67E22' : '#2D7A4F',
                        width: `${Math.max(2, Math.min(100, pct))}%` }} />
                    </div>
                    {p.canh_bao_ton > 0 && (
                      <div style={{ fontSize: '10px', color: COLORS.textMute, marginTop: '2px' }}>
                        Cảnh báo khi ≤ {fmtSL(p.canh_bao_ton, p.don_vi)}
                      </div>
                    )}
                  </div>
                  {p.co_the_chiet && chietSP && (
                    <div style={{ marginTop: '6px', fontSize: '11px', color: '#8E44AD',
                      background: '#F5F0FF', borderRadius: '6px', padding: '4px 8px', display: 'inline-block' }}>
                      🧪 1 {p.don_vi} → {p.he_so_chiet} {chietSP.don_vi} ({chietSP.ten})
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                  <button onClick={() => { setEditing(p); setShowForm(true) }}
                    style={{ padding: '6px 10px', background: COLORS.bg, border: `1px solid ${COLORS.border}`,
                      borderRadius: '8px', fontWeight: '700', fontSize: '11px', cursor: 'pointer' }}>
                    ✏️
                  </button>
                  <button onClick={() => handleToggleActive(p)}
                    style={{ padding: '6px 10px', background: '#FDECEA', border: '1px solid #FADBD8',
                      borderRadius: '8px', fontWeight: '700', fontSize: '11px', cursor: 'pointer', color: '#C0392B' }}>
                    🗑
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {showForm && (
        <FormSanPham
          initial={editing}
          products={products.filter(p => p.is_active)}
          onSave={() => { setShowForm(false); onReload(); showToast('✅ Đã lưu!') }}
          onClose={() => setShowForm(false)}
        />
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// FORM GIAO DỊCH (enhanced: fix dieu_chinh + auto chi_phi)
// ══════════════════════════════════════════════════════════════════════════════
function FormGiaoDich({ products, userId, danhMucKho, onSave, onClose }) {
  const [f, setF] = useState({
    loai: 'nhap_kho',
    san_pham_id: '',
    so_luong: '',
    gia_don_vi: '',
    ghi_chu: '',
    ngay: todayISO(),
    taoChi: true,
    hinh_thuc: 'tien_mat',
  })
  const [saving, setSaving] = useState(false)
  const [err, setErr]       = useState('')
  const set = (k, v) => setF(p => ({ ...p, [k]: v }))

  const loaiOptions = ['nhap_kho', 'xuat_su_dung', 'xuat_ban', 'dieu_chinh', 'tra_nha_cc']
  const sp = products.find(p => p.id === f.san_pham_id)
  const loaiGD = LOAI_GD[f.loai]

  // Tồn sau giao dịch (preview)
  let tonSau = null
  if (sp && f.so_luong) {
    const sl = +f.so_luong
    if (f.loai === 'dieu_chinh') tonSau = sl
    else tonSau = Math.max(0, Number(sp.ton_kho) + loaiGD.sign * sl)
  }

  const tongTien = (sp && f.so_luong && f.gia_don_vi)
    ? +f.so_luong * +f.gia_don_vi : 0

  // Tìm danh_muc phù hợp với loai SP
  const findDanhMuc = (loaiSP) => {
    const names = {
      tieu_hao:  ['MP Tiêu Hao', 'Mỹ Phẩm Tiêu Hao'],
      ban_khach: ['Mỹ Phẩm Bán Khách', 'Bán Khách'],
      vat_tu:    ['VT Tiêu Hao', 'Vật Tư Tiêu Hao', 'DC Tiêu Hao'],
    }
    const keywords = names[loaiSP] || []
    return danhMucKho.find(d => keywords.some(kw => d.ten.includes(kw)))
  }

  const handleSave = async () => {
    if (!f.san_pham_id) return setErr('Chọn sản phẩm')
    const sl = +f.so_luong
    if (!sl || sl <= 0) return setErr('Nhập số lượng hợp lệ (> 0)')

    if (f.loai === 'dieu_chinh' && sl === Number(sp.ton_kho))
      return setErr('Tồn kho không thay đổi')

    if (loaiGD.sign < 0) {
      if (Number(sp.ton_kho) < sl)
        return setErr(`Không đủ tồn! Hiện có: ${fmtSL(sp.ton_kho, sp.don_vi)}`)
    }

    setSaving(true); setErr('')

    // so_luong lưu DB:
    // - dieu_chinh: lưu |delta| (để thỏa CHECK > 0)
    // - các loại khác: lưu sl bình thường
    const soLuongDB = f.loai === 'dieu_chinh'
      ? Math.max(0.001, Math.abs(sl - Number(sp.ton_kho)))
      : sl

    const { error: e1 } = await supabase.from('kho_giao_dich').insert({
      san_pham_id: f.san_pham_id, loai: f.loai, so_luong: soLuongDB,
      gia_don_vi: +f.gia_don_vi || 0,
      ghi_chu: f.ghi_chu.trim() || (f.loai === 'dieu_chinh'
        ? `Điều chỉnh: ${fmtSL(sp.ton_kho, sp.don_vi)} → ${fmtSL(sl, sp.don_vi)}` : ''),
      ngay: f.ngay, nguoi_thuc_hien: userId || null,
    })
    if (e1) { setSaving(false); return setErr(e1.message) }

    // Cập nhật tồn kho
    const tonMoi = f.loai === 'dieu_chinh'
      ? sl
      : Number(sp.ton_kho) + loaiGD.sign * sl
    const { error: e2 } = await supabase.from('kho_san_pham')
      .update({ ton_kho: Math.max(0, tonMoi) }).eq('id', f.san_pham_id)
    if (e2) { setSaving(false); return setErr(e2.message) }

    // Auto tạo chi_phi khi nhập kho
    if (f.loai === 'nhap_kho' && f.taoChi && tongTien > 0) {
      const dm = findDanhMuc(sp.loai)
      if (dm) {
        await supabase.from('chi_phi').insert({
          ngay: f.ngay, danh_muc_id: dm.id,
          so_tien: tongTien,
          hinh_thuc_thanh_toan: f.hinh_thuc,
          dien_giai: `Nhập kho: ${sp.ten} (${sl} ${sp.don_vi} × ${fmt(+f.gia_don_vi)})`,
          nguoi_nhap: userId || null,
        })
      }
    }

    setSaving(false)
    onSave()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(26,18,9,0.55)', zIndex: 200,
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div style={{ background: 'white', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: '520px',
        maxHeight: '90vh', overflow: 'auto', boxShadow: '0 -8px 40px rgba(0,0,0,0.2)' }}>
        <div style={{ background: COLORS.grad, padding: '18px 20px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          borderRadius: '20px 20px 0 0', position: 'sticky', top: 0 }}>
          <div style={{ color: 'white', fontWeight: '800', fontSize: '16px' }}>📥 Nhập / Xuất Kho</div>
          <button onClick={onClose}
            style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white',
              width: '30px', height: '30px', borderRadius: '50%', cursor: 'pointer', fontSize: '13px' }}>✕</button>
        </div>

        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Loại GD */}
          <div>
            <label style={lbl}>LOẠI GIAO DỊCH</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
              {loaiOptions.map(k => {
                const gd = LOAI_GD[k]
                return (
                  <button key={k} onClick={() => set('loai', k)}
                    style={{ padding: '10px 12px', borderRadius: '10px', border: 'none',
                      cursor: 'pointer', textAlign: 'left', fontWeight: '700', fontSize: '12px',
                      background: f.loai === k ? gd.color : '#F5F2EF',
                      color: f.loai === k ? 'white' : COLORS.text }}>
                    {gd.icon} {gd.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Sản phẩm */}
          <div>
            <label style={lbl}>SẢN PHẨM *</label>
            <select style={inp} value={f.san_pham_id} onChange={e => {
              set('san_pham_id', e.target.value)
              const p = products.find(x => x.id === e.target.value)
              if (p?.gia_nhap && f.loai === 'nhap_kho') set('gia_don_vi', p.gia_nhap)
            }}>
              <option value="">— Chọn sản phẩm —</option>
              {Object.entries(LOAI_SP).map(([loai, lv]) => (
                <optgroup key={loai} label={`${lv.icon} ${lv.label}`}>
                  {products.filter(p => p.is_active && p.loai === loai).map(p => (
                    <option key={p.id} value={p.id}>
                      {p.ten} (tồn: {fmtSL(p.ton_kho, p.don_vi)})
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          {/* Số lượng + đơn giá */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={lbl}>
                {f.loai === 'dieu_chinh' ? 'TỒN KHO THỰC TẾ' : 'SỐ LƯỢNG'} {sp ? `(${sp.don_vi})` : ''}  *
              </label>
              <input style={inp} type="number" step="0.1" min="0"
                value={f.so_luong} onChange={e => set('so_luong', e.target.value)} />
              {f.loai === 'dieu_chinh' && sp && (
                <div style={{ fontSize: '11px', color: COLORS.textMute, marginTop: '3px' }}>
                  Hiện DB: {fmtSL(sp.ton_kho, sp.don_vi)}
                </div>
              )}
            </div>
            <div>
              <label style={lbl}>ĐƠN GIÁ (đ)</label>
              <input style={inp} type="number" value={f.gia_don_vi}
                onChange={e => set('gia_don_vi', e.target.value)} placeholder="0" />
            </div>
          </div>

          {/* Preview tồn sau */}
          {sp && f.so_luong && (
            <div style={{ background: COLORS.bg, borderRadius: '8px', padding: '10px 14px',
              fontSize: '13px', display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: COLORS.textSub }}>
                {f.loai === 'dieu_chinh' ? 'Thay đổi:' : 'Tồn sau giao dịch:'}
              </span>
              <strong style={{ color: COLORS.primary }}>
                {f.loai === 'dieu_chinh'
                  ? (() => {
                      const d = +f.so_luong - Number(sp.ton_kho)
                      return `${d >= 0 ? '+' : ''}${fmtSL(d, sp.don_vi)}`
                    })()
                  : fmtSL(tonSau, sp?.don_vi)}
              </strong>
            </div>
          )}

          {/* Auto chi_phi — chỉ khi nhập kho */}
          {f.loai === 'nhap_kho' && (
            <div style={{ background: '#E8F5E9', borderRadius: '12px', padding: '14px', border: '1px solid #A5D6A7' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                <input type="checkbox" checked={f.taoChi}
                  onChange={e => set('taoChi', e.target.checked)} />
                <div>
                  <div style={{ fontWeight: '800', fontSize: '13px', color: '#2D7A4F' }}>
                    💳 Ghi nhận chi phí mua hàng
                  </div>
                  {tongTien > 0 && (
                    <div style={{ fontSize: '12px', color: '#388E3C', marginTop: '2px' }}>
                      Tổng: {fmt(tongTien)}
                    </div>
                  )}
                </div>
              </label>
              {f.taoChi && (
                <div style={{ marginTop: '10px' }}>
                  <label style={lbl}>HÌNH THỨC THANH TOÁN</label>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {HINH_THUC.map(h => (
                      <button key={h.val} onClick={() => set('hinh_thuc', h.val)}
                        style={{ flex: 1, padding: '8px', borderRadius: '8px', border: 'none',
                          cursor: 'pointer', fontWeight: '700', fontSize: '12px',
                          background: f.hinh_thuc === h.val ? '#2D7A4F' : 'white',
                          color: f.hinh_thuc === h.val ? 'white' : COLORS.textSub }}>
                        {h.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div>
            <label style={lbl}>NGÀY</label>
            <input style={inp} type="date" value={f.ngay} onChange={e => set('ngay', e.target.value)} />
          </div>

          <div>
            <label style={lbl}>GHI CHÚ</label>
            <textarea style={{ ...inp, height: '60px', resize: 'vertical' }}
              value={f.ghi_chu} onChange={e => set('ghi_chu', e.target.value)}
              placeholder="Nhà cung cấp, lý do xuất..." />
          </div>

          {err && <div style={{ background: '#FDECEA', color: '#C0392B', padding: '10px 14px',
            borderRadius: '8px', fontSize: '13px', fontWeight: '600' }}>⚠️ {err}</div>}

          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={onClose}
              style={{ flex: 1, padding: '13px', background: 'white', border: `1px solid ${COLORS.border}`,
                borderRadius: '12px', fontWeight: '700', fontSize: '14px', cursor: 'pointer', color: COLORS.textSub }}>
              Hủy
            </button>
            <button onClick={handleSave} disabled={saving}
              style={{ flex: 2, padding: '13px', background: COLORS.grad, color: 'white',
                border: 'none', borderRadius: '12px', fontWeight: '800', fontSize: '14px',
                cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
              {saving ? 'Đang lưu...' : '✅ Xác nhận'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB 3: NHẬP / XUẤT (enhanced: date filter, search, delete)
// ══════════════════════════════════════════════════════════════════════════════
function TabGiaoDich({ transactions, products, userId, danhMucKho, onReload, showToast }) {
  const [showForm, setShowForm] = useState(false)
  const [filterLoai, setFilterLoai] = useState('all')
  const [filterDate, setFilterDate] = useState('month') // today/week/month/custom
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo]     = useState('')
  const [search, setSearch]         = useState('')
  const spMap = Object.fromEntries(products.map(p => [p.id, p]))

  const getDateRange = () => {
    const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }))
    const today = now.toISOString().slice(0, 10)
    if (filterDate === 'today')  return { from: today, to: today }
    if (filterDate === 'week') {
      const d = new Date(now); d.setDate(d.getDate() - 6)
      return { from: d.toISOString().slice(0, 10), to: today }
    }
    if (filterDate === 'month') {
      const { from, to } = monthRange(now.getFullYear(), now.getMonth() + 1)
      return { from, to }
    }
    if (filterDate === 'custom') return { from: customFrom, to: customTo }
    return { from: null, to: null }
  }

  const { from, to } = getDateRange()

  const filtered = transactions.filter(t => {
    if (filterLoai !== 'all' && t.loai !== filterLoai) return false
    if (from && t.ngay < from) return false
    if (to   && t.ngay > to)   return false
    if (search) {
      const sp = spMap[t.san_pham_id]
      if (!sp?.ten.toLowerCase().includes(search.toLowerCase())) return false
    }
    return true
  })
  const sorted = [...filtered].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

  const handleDelete = async (gd) => {
    const sp = spMap[gd.san_pham_id]
    if (['dieu_chinh'].includes(gd.loai)) {
      return showToast('⚠️ Không xóa được GD điều chỉnh. Hãy tạo điều chỉnh mới để sửa.')
    }
    if (['chiet_ra', 'chiet_vao'].includes(gd.loai)) {
      return showToast('⚠️ Dùng tab Chiết Rót để xóa cặp chiết rót.')
    }
    if (!window.confirm(`Xóa giao dịch này?\nTồn kho sẽ được hoàn lại.`)) return

    const loaiGD = LOAI_GD[gd.loai]
    const tonHoanLai = Number(sp?.ton_kho || 0) - loaiGD.sign * gd.so_luong

    const { error } = await supabase.from('kho_giao_dich').delete().eq('id', gd.id)
    if (error) return showToast('❌ ' + error.message)

    if (sp) {
      await supabase.from('kho_san_pham')
        .update({ ton_kho: Math.max(0, tonHoanLai) }).eq('id', gd.san_pham_id)
    }
    showToast('🗑 Đã xóa giao dịch')
    onReload()
  }

  return (
    <div>
      {/* Toolbar */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
        <input style={{ ...inp, flex: 1, padding: '9px 14px' }}
          placeholder="🔍 Tên sản phẩm..." value={search}
          onChange={e => setSearch(e.target.value)} />
        <button onClick={() => setShowForm(true)}
          style={{ padding: '9px 18px', background: COLORS.grad, color: 'white', border: 'none',
            borderRadius: '10px', fontWeight: '800', fontSize: '13px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
          + Giao dịch
        </button>
      </div>

      {/* Date filter */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '10px', flexWrap: 'wrap' }}>
        {[['today','Hôm nay'],['week','7 ngày'],['month','Tháng này'],['custom','Tùy chọn']].map(([k,l]) => (
          <button key={k} onClick={() => setFilterDate(k)}
            style={{ padding: '5px 12px', borderRadius: '999px', border: 'none', cursor: 'pointer',
              fontWeight: '700', fontSize: '12px',
              background: filterDate === k ? COLORS.primary : 'white',
              color: filterDate === k ? 'white' : COLORS.textSub, boxShadow: COLORS.shadow }}>
            {l}
          </button>
        ))}
      </div>
      {filterDate === 'custom' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '10px' }}>
          <input style={inp} type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)} />
          <input style={inp} type="date" value={customTo}   onChange={e => setCustomTo(e.target.value)} />
        </div>
      )}

      {/* Loại filter */}
      <div style={{ marginBottom: '14px' }}>
        <select style={{ ...inp, padding: '9px 14px' }}
          value={filterLoai} onChange={e => setFilterLoai(e.target.value)}>
          <option value="all">Tất cả loại ({sorted.length})</option>
          {Object.entries(LOAI_GD).map(([k, v]) => (
            <option key={k} value={k}>{v.icon} {v.label}</option>
          ))}
        </select>
      </div>

      {/* List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {sorted.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: COLORS.textMute }}>
            Chưa có giao dịch nào
          </div>
        ) : sorted.map(gd => {
          const sp = spMap[gd.san_pham_id]
          const loaiGD = LOAI_GD[gd.loai] || {}
          const canDelete = !['dieu_chinh', 'chiet_ra', 'chiet_vao'].includes(gd.loai)
          return (
            <div key={gd.id} style={{ background: 'white', borderRadius: '12px', padding: '12px 14px',
              border: `1px solid ${COLORS.border}`, display: 'flex', gap: '10px', alignItems: 'center' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '9px', flexShrink: 0,
                background: `${loaiGD.color}15`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>
                {loaiGD.icon}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: '700', fontSize: '13px', color: COLORS.text,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {sp?.ten || '—'}
                </div>
                <div style={{ fontSize: '11px', color: COLORS.textMute }}>
                  {loaiGD.label} · {gd.ngay}
                  {gd.ghi_chu ? ` · ${gd.ghi_chu}` : ''}
                </div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontSize: '13px', fontWeight: '800',
                  color: loaiGD.sign > 0 ? '#2D7A4F' : loaiGD.sign < 0 ? '#C0392B' : '#1A5276' }}>
                  {loaiGD.sign > 0 ? '+' : loaiGD.sign < 0 ? '-' : '±'}{fmtSL(gd.so_luong, sp?.don_vi)}
                </div>
                {gd.gia_don_vi > 0 && (
                  <div style={{ fontSize: '11px', color: COLORS.textMute }}>
                    {fmt(gd.gia_don_vi)}/{sp?.don_vi}
                  </div>
                )}
              </div>
              {canDelete && (
                <button onClick={() => handleDelete(gd)}
                  style={{ padding: '5px 8px', background: '#FDECEA', border: '1px solid #FADBD8',
                    borderRadius: '7px', cursor: 'pointer', fontSize: '11px', color: '#C0392B',
                    flexShrink: 0 }}>
                  🗑
                </button>
              )}
            </div>
          )
        })}
      </div>

      {showForm && (
        <FormGiaoDich
          products={products.filter(p => p.is_active)}
          userId={userId}
          danhMucKho={danhMucKho}
          onSave={() => { setShowForm(false); onReload(); showToast('✅ Đã ghi giao dịch!') }}
          onClose={() => setShowForm(false)}
        />
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB 4: CHIẾT RÓT (enhanced: xóa cặp)
// ══════════════════════════════════════════════════════════════════════════════
function TabChietRot({ products, transactions, userId, onReload, showToast }) {
  const chiList = products.filter(p => p.is_active && p.co_the_chiet && p.san_pham_chiet_id)
  const spMap   = Object.fromEntries(products.map(p => [p.id, p]))
  const [f, setF]         = useState({ sp_nguon: '', so_luong: '', ghi_chu: '', ngay: todayISO() })
  const [preview, setPreview] = useState(null)
  const [saving, setSaving]   = useState(false)
  const [err, setErr]         = useState('')
  const set = (k, v) => setF(p => ({ ...p, [k]: v }))

  useEffect(() => {
    if (!f.sp_nguon || !f.so_luong) { setPreview(null); return }
    const nguon = products.find(p => p.id === f.sp_nguon)
    if (!nguon) return
    const dich  = spMap[nguon.san_pham_chiet_id]
    const sl    = +f.so_luong
    const slDich = sl * Number(nguon.he_so_chiet)
    setPreview({ nguon, dich, sl, slDich })
    setErr('')
  }, [f.sp_nguon, f.so_luong])

  const handleChiet = async () => {
    if (!preview) return setErr('Điền đầy đủ thông tin')
    const { nguon, dich, sl, slDich } = preview
    if (sl > Number(nguon.ton_kho))
      return setErr(`Không đủ tồn! Còn: ${fmtSL(nguon.ton_kho, nguon.don_vi)}`)
    setSaving(true); setErr('')
    const lienQuanId = crypto.randomUUID()

    const [r1, r2] = await Promise.all([
      supabase.from('kho_giao_dich').insert({
        san_pham_id: nguon.id, loai: 'chiet_ra', so_luong: sl,
        ghi_chu: f.ghi_chu || `Chiết rót → ${dich.ten}`,
        lien_quan_id: lienQuanId, ngay: f.ngay, nguoi_thuc_hien: userId,
      }),
      supabase.from('kho_giao_dich').insert({
        san_pham_id: dich.id, loai: 'chiet_vao', so_luong: slDich,
        ghi_chu: f.ghi_chu || `Chiết rót từ ${nguon.ten}`,
        lien_quan_id: lienQuanId, ngay: f.ngay, nguoi_thuc_hien: userId,
      }),
    ])
    if (r1.error || r2.error) { setSaving(false); return setErr((r1.error||r2.error).message) }

    await Promise.all([
      supabase.from('kho_san_pham').update({ ton_kho: Number(nguon.ton_kho) - sl }).eq('id', nguon.id),
      supabase.from('kho_san_pham').update({ ton_kho: Number(dich.ton_kho) + slDich }).eq('id', dich.id),
    ])
    setSaving(false)
    setF({ sp_nguon: '', so_luong: '', ghi_chu: '', ngay: todayISO() }); setPreview(null)
    onReload()
    showToast(`✅ Chiết ${fmtSL(sl, nguon.don_vi)} → ${fmtSL(slDich, dich?.don_vi)} thành công!`)
  }

  const handleDeletePair = async (gd) => {
    if (!window.confirm('Xóa cặp chiết rót này? Tồn kho cả 2 sản phẩm sẽ được hoàn lại.')) return
    const linked = transactions.find(t => t.loai === 'chiet_vao' && t.lien_quan_id === gd.lien_quan_id)
    const nguon  = spMap[gd.san_pham_id]
    const dich   = linked ? spMap[linked.san_pham_id] : null

    const ids = [gd.id, linked?.id].filter(Boolean)
    const { error } = await supabase.from('kho_giao_dich').delete().in('id', ids)
    if (error) return showToast('❌ ' + error.message)

    const updates = []
    if (nguon) updates.push(supabase.from('kho_san_pham').update({ ton_kho: Number(nguon.ton_kho) + gd.so_luong }).eq('id', nguon.id))
    if (dich && linked) updates.push(supabase.from('kho_san_pham').update({ ton_kho: Math.max(0, Number(dich.ton_kho) - linked.so_luong) }).eq('id', dich.id))
    await Promise.all(updates)
    showToast('🗑 Đã xóa cặp chiết rót'); onReload()
  }

  const history = transactions.filter(t => t.loai === 'chiet_ra')
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 15)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ background: 'white', borderRadius: '16px', padding: '20px',
        border: `1px solid ${COLORS.border}`, boxShadow: COLORS.shadow }}>
        <div style={{ fontWeight: '800', fontSize: '15px', color: '#6C3483', marginBottom: '16px' }}>
          🧪 Thực Hiện Chiết Rót
        </div>
        {chiList.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '20px', color: COLORS.textMute, fontSize: '13px' }}>
            Chưa có sản phẩm nào được cấu hình chiết rót.<br/>
            Vào <strong>Sản Phẩm</strong> → bật "Chiết Rót" cho sản phẩm nguồn.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label style={lbl}>CHỌN SẢN PHẨM NGUỒN (chai lớn)</label>
              <select style={inp} value={f.sp_nguon} onChange={e => set('sp_nguon', e.target.value)}>
                <option value="">— Chọn —</option>
                {chiList.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.ten} · Tồn: {fmtSL(p.ton_kho, p.don_vi)} · 1 {p.don_vi} = {p.he_so_chiet} {spMap[p.san_pham_chiet_id]?.don_vi}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={lbl}>SỐ LƯỢNG MUỐN CHIẾT</label>
              <input style={inp} type="number" step="0.1" min="0.1"
                value={f.so_luong} onChange={e => set('so_luong', e.target.value)} placeholder="Nhập số lượng..." />
            </div>

            {preview && (
              <div style={{ background: '#F5F0FF', borderRadius: '12px', padding: '14px', border: '1px solid #D8C8FF' }}>
                <div style={{ fontSize: '13px', color: '#6C3483', fontWeight: '700', marginBottom: '8px' }}>
                  Kết quả chiết rót:
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '22px' }}>🧴</div>
                    <div style={{ fontWeight: '800', color: '#C0392B', fontSize: '15px' }}>
                      -{fmtSL(preview.sl, preview.nguon.don_vi)}
                    </div>
                    <div style={{ fontSize: '11px', color: COLORS.textMute }}>{preview.nguon.ten}</div>
                    <div style={{ fontSize: '11px', color: COLORS.textMute }}>
                      Còn: {fmtSL(Number(preview.nguon.ton_kho) - preview.sl, preview.nguon.don_vi)}
                    </div>
                  </div>
                  <div style={{ fontSize: '24px', color: '#8E44AD' }}>→</div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '22px' }}>🧪</div>
                    <div style={{ fontWeight: '800', color: '#2D7A4F', fontSize: '15px' }}>
                      +{fmtSL(preview.slDich, preview.dich?.don_vi)}
                    </div>
                    <div style={{ fontSize: '11px', color: COLORS.textMute }}>{preview.dich?.ten || '—'}</div>
                    <div style={{ fontSize: '11px', color: COLORS.textMute }}>
                      Sau: {fmtSL(Number(preview.dich?.ton_kho || 0) + preview.slDich, preview.dich?.don_vi)}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={lbl}>NGÀY</label>
                <input style={inp} type="date" value={f.ngay} onChange={e => set('ngay', e.target.value)} />
              </div>
              <div>
                <label style={lbl}>GHI CHÚ</label>
                <input style={inp} value={f.ghi_chu} onChange={e => set('ghi_chu', e.target.value)} />
              </div>
            </div>

            {err && <div style={{ background: '#FDECEA', color: '#C0392B', padding: '10px 14px',
              borderRadius: '8px', fontSize: '13px', fontWeight: '600' }}>⚠️ {err}</div>}

            <button onClick={handleChiet} disabled={saving || !preview}
              style={{ width: '100%', padding: '14px', background: '#6C3483', color: 'white',
                border: 'none', borderRadius: '12px', fontWeight: '800', fontSize: '14px',
                cursor: (saving || !preview) ? 'default' : 'pointer',
                opacity: (saving || !preview) ? 0.6 : 1 }}>
              {saving ? 'Đang xử lý...' : '🧪 Xác nhận chiết rót'}
            </button>
          </div>
        )}
      </div>

      {history.length > 0 && (
        <div>
          <div style={{ fontWeight: '800', fontSize: '13px', color: COLORS.text, marginBottom: '10px' }}>
            Lịch sử chiết rót gần đây
          </div>
          {history.map(gd => {
            const sp = spMap[gd.san_pham_id]
            const linked = transactions.find(t => t.loai === 'chiet_vao' && t.lien_quan_id === gd.lien_quan_id)
            const dichSP = linked ? spMap[linked.san_pham_id] : null
            return (
              <div key={gd.id} style={{ background: 'white', borderRadius: '12px', padding: '12px 14px',
                border: `1px solid ${COLORS.border}`, display: 'flex', gap: '10px',
                alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '18px' }}>🧪</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: COLORS.text }}>
                    {sp?.ten || '—'}
                    {dichSP && <span style={{ color: '#8E44AD' }}> → {dichSP.ten}</span>}
                  </div>
                  <div style={{ fontSize: '11px', color: COLORS.textMute }}>
                    {gd.ngay}{gd.ghi_chu ? ` · ${gd.ghi_chu}` : ''}
                  </div>
                </div>
                <div style={{ textAlign: 'right', fontSize: '13px', fontWeight: '800', color: '#8E44AD' }}>
                  -{fmtSL(gd.so_luong, sp?.don_vi)}
                  {linked && <div style={{ color: '#2D7A4F', fontSize: '12px' }}>+{fmtSL(linked.so_luong, dichSP?.don_vi)}</div>}
                </div>
                <button onClick={() => handleDeletePair(gd)}
                  style={{ padding: '5px 8px', background: '#FDECEA', border: '1px solid #FADBD8',
                    borderRadius: '7px', cursor: 'pointer', fontSize: '11px', color: '#C0392B', flexShrink: 0 }}>
                  🗑
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB 5: BÁO CÁO TIÊU THỤ
// ══════════════════════════════════════════════════════════════════════════════
function TabBaoCao({ products }) {
  const nowVN = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }))
  const [month, setMonth] = useState(nowVN.getMonth() + 1)
  const [year,  setYear]  = useState(nowVN.getFullYear())
  const [data,  setData]  = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const { from, to } = monthRange(year, month)
    const { data: gds } = await supabase.from('kho_giao_dich')
      .select('*').gte('ngay', from).lte('ngay', to)
    setData(gds || [])
    setLoading(false)
  }, [year, month])

  useEffect(() => { load() }, [load])

  const prevMonth = () => { if (month === 1) { setMonth(12); setYear(y => y - 1) } else setMonth(m => m - 1) }
  const nextMonth = () => { if (month === 12) { setMonth(1); setYear(y => y + 1) } else setMonth(m => m + 1) }

  const spMap = Object.fromEntries(products.map(p => [p.id, p]))

  // Aggregate by product
  const byProduct = {}
  data.forEach(gd => {
    if (!byProduct[gd.san_pham_id]) byProduct[gd.san_pham_id] = { nhap: 0, xuat_dung: 0, xuat_ban: 0, chiet: 0, gtNhap: 0 }
    const r = byProduct[gd.san_pham_id]
    if (gd.loai === 'nhap_kho')     { r.nhap += gd.so_luong; r.gtNhap += gd.so_luong * (gd.gia_don_vi || 0) }
    if (gd.loai === 'xuat_su_dung') r.xuat_dung += gd.so_luong
    if (gd.loai === 'xuat_ban')     r.xuat_ban  += gd.so_luong
    if (gd.loai === 'chiet_ra')     r.chiet     += gd.so_luong
  })

  const rows = Object.entries(byProduct)
    .map(([id, r]) => ({ sp: spMap[id], ...r, tongXuat: r.xuat_dung + r.xuat_ban + r.chiet }))
    .filter(r => r.sp)
    .sort((a, b) => b.tongXuat - a.tongXuat)

  const totNhap  = rows.reduce((s, r) => s + r.nhap, 0)
  const totXuat  = rows.reduce((s, r) => s + r.tongXuat, 0)
  const totGTNhap = rows.reduce((s, r) => s + r.gtNhap, 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Month picker */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', justifyContent: 'center' }}>
        <button onClick={prevMonth}
          style={{ width: '36px', height: '36px', borderRadius: '50%', border: `1px solid ${COLORS.border}`,
            background: 'white', cursor: 'pointer', fontSize: '16px', color: COLORS.textSub }}>
          ‹
        </button>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontWeight: '800', fontSize: '18px', color: COLORS.text }}>
            Tháng {month}/{year}
          </div>
          <div style={{ fontSize: '12px', color: COLORS.textMute }}>
            {monthRange(year, month).from} → {monthRange(year, month).to}
          </div>
        </div>
        <button onClick={nextMonth}
          style={{ width: '36px', height: '36px', borderRadius: '50%', border: `1px solid ${COLORS.border}`,
            background: 'white', cursor: 'pointer', fontSize: '16px', color: COLORS.textSub }}>
          ›
        </button>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
        {[
          { label: 'Tổng nhập', val: `${totNhap.toFixed(1)} đv`, icon: '📥', color: '#2D7A4F' },
          { label: 'Tổng xuất', val: `${totXuat.toFixed(1)} đv`, icon: '📤', color: '#C0392B' },
          { label: 'GT nhập hàng', val: fmt(totGTNhap), icon: '💰', color: '#1A5276' },
        ].map(s => (
          <div key={s.label} style={{ background: 'white', borderRadius: '12px', padding: '14px 10px',
            border: `1px solid ${COLORS.border}`, textAlign: 'center' }}>
            <div style={{ fontSize: '18px', marginBottom: '4px' }}>{s.icon}</div>
            <div style={{ fontSize: '14px', fontWeight: '800', color: s.color }}>{s.val}</div>
            <div style={{ fontSize: '10px', color: COLORS.textMute, marginTop: '2px' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: COLORS.textMute }}>Đang tải...</div>
      ) : rows.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: COLORS.textMute }}>
          <div style={{ fontSize: '32px', marginBottom: '8px' }}>📊</div>
          <div>Không có giao dịch trong tháng {month}/{year}</div>
        </div>
      ) : (
        <>
          <div style={{ fontWeight: '800', fontSize: '13px', color: COLORS.text }}>
            Chi tiết theo sản phẩm ({rows.length} SP có giao dịch)
          </div>
          {rows.map(r => {
            const loai = LOAI_SP[r.sp.loai] || {}
            const maxXuat = Math.max(...rows.map(x => x.tongXuat), 1)
            const pct = (r.tongXuat / maxXuat) * 100
            return (
              <div key={r.sp.id} style={{ background: 'white', borderRadius: '14px', padding: '14px 16px',
                border: `1px solid ${COLORS.border}`, boxShadow: COLORS.shadow }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                  <span style={{ fontSize: '18px' }}>{loai.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '700', fontSize: '13px', color: COLORS.text }}>{r.sp.ten}</div>
                    <div style={{ fontSize: '11px', color: COLORS.textMute }}>{loai.label}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '12px', fontWeight: '800', color: '#C0392B' }}>
                      -{fmtSL(r.tongXuat, r.sp.don_vi)}
                    </div>
                    {r.nhap > 0 && (
                      <div style={{ fontSize: '11px', color: '#2D7A4F' }}>+{fmtSL(r.nhap, r.sp.don_vi)}</div>
                    )}
                  </div>
                </div>

                {/* Bar */}
                <div style={{ height: '4px', background: '#F0E9E0', borderRadius: '2px', marginBottom: '10px' }}>
                  <div style={{ height: '100%', borderRadius: '2px', background: '#C0392B', width: `${pct}%` }} />
                </div>

                {/* Breakdown */}
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {r.xuat_dung > 0 && (
                    <span style={{ fontSize: '11px', background: '#FDF3E9', color: '#E67E22',
                      padding: '3px 8px', borderRadius: '999px', fontWeight: '700' }}>
                      🔧 Dùng nội bộ: {fmtSL(r.xuat_dung, r.sp.don_vi)}
                    </span>
                  )}
                  {r.xuat_ban > 0 && (
                    <span style={{ fontSize: '11px', background: '#FDF3E9', color: '#A0714F',
                      padding: '3px 8px', borderRadius: '999px', fontWeight: '700' }}>
                      💸 Bán khách: {fmtSL(r.xuat_ban, r.sp.don_vi)}
                    </span>
                  )}
                  {r.chiet > 0 && (
                    <span style={{ fontSize: '11px', background: '#F5F0FF', color: '#8E44AD',
                      padding: '3px 8px', borderRadius: '999px', fontWeight: '700' }}>
                      🧪 Chiết rót: {fmtSL(r.chiet, r.sp.don_vi)}
                    </span>
                  )}
                  {r.gtNhap > 0 && (
                    <span style={{ fontSize: '11px', background: '#E8F5E9', color: '#2D7A4F',
                      padding: '3px 8px', borderRadius: '999px', fontWeight: '700' }}>
                      💰 GT nhập: {fmt(r.gtNhap)}
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════════════════════════════════════════
export default function AdminKhoHangPage() {
  const { user } = useAuth()
  const [tab, setTab]                   = useState('tong-quan')
  const [products, setProducts]         = useState([])
  const [transactions, setTransactions] = useState([])
  const [danhMucKho, setDanhMucKho]     = useState([])
  const [loading, setLoading]           = useState(true)
  const [toast, setToast]               = useState('')
  const [showKiemKho, setShowKiemKho]   = useState(false)

  const showToast = useCallback((msg) => {
    setToast(msg); setTimeout(() => setToast(''), 2800)
  }, [])

  const load = useCallback(async () => {
    const [{ data: sp }, { data: gd }, { data: dm }] = await Promise.all([
      supabase.from('kho_san_pham').select('*').order('loai').order('ten'),
      supabase.from('kho_giao_dich').select('*').order('created_at', { ascending: false }).limit(500),
      supabase.from('danh_muc_chi_phi').select('id,ten,parent_id')
        .eq('is_active', true).not('parent_id', 'is', null),
    ])
    setProducts(sp || [])
    setTransactions(gd || [])
    setDanhMucKho(dm || [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const TABS = [
    { key: 'tong-quan', icon: '📊', label: 'Tổng Quan' },
    { key: 'san-pham',  icon: '📋', label: 'Sản Phẩm' },
    { key: 'giao-dich', icon: '📥', label: 'Nhập/Xuất' },
    { key: 'chiet-rot', icon: '🧪', label: 'Chiết Rót' },
    { key: 'bao-cao',   icon: '📈', label: 'Báo Cáo' },
  ]

  return (
    <div style={{ minHeight: '100vh', background: COLORS.bg, fontFamily: "'Inter','Segoe UI',sans-serif", paddingBottom: '48px' }}>
      {/* Header */}
      <div style={{ background: COLORS.grad, padding: '44px 20px 20px' }}>
        <button onClick={() => window.location.href = '/admin'}
          style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white',
            padding: '6px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px',
            fontWeight: '700', marginBottom: '12px' }}>
          ← Admin
        </button>
        <div style={{ color: 'white', fontWeight: '800', fontSize: '22px' }}>📦 Kho Hàng</div>
        <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '13px', marginTop: '4px' }}>
          {products.filter(p => p.is_active).length} sản phẩm · Mỹ phẩm · Vật tư · Chiết rót
        </div>
      </div>

      {/* Tab bar */}
      <div style={{ background: 'white', borderBottom: `1px solid ${COLORS.border}`,
        display: 'flex', overflowX: 'auto', padding: '0 12px' }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{ padding: '13px 14px', border: 'none', background: 'none', cursor: 'pointer',
              fontWeight: tab === t.key ? '800' : '600', fontSize: '12px', whiteSpace: 'nowrap',
              color: tab === t.key ? COLORS.primary : COLORS.textMute,
              borderBottom: tab === t.key ? `2.5px solid ${COLORS.primary}` : '2.5px solid transparent',
              transition: 'all .2s' }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ padding: '20px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px', color: COLORS.textMute }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>📦</div>
            <div>Đang tải kho hàng...</div>
          </div>
        ) : (
          <>
            {tab === 'tong-quan' && (
              <TabTongQuan products={products} transactions={transactions}
                onNavigate={setTab} onKiemKho={() => setShowKiemKho(true)} />
            )}
            {tab === 'san-pham' && (
              <TabSanPham products={products} onReload={load} showToast={showToast} />
            )}
            {tab === 'giao-dich' && (
              <TabGiaoDich products={products} transactions={transactions}
                userId={user?.id} danhMucKho={danhMucKho} onReload={load} showToast={showToast} />
            )}
            {tab === 'chiet-rot' && (
              <TabChietRot products={products} transactions={transactions}
                userId={user?.id} onReload={load} showToast={showToast} />
            )}
            {tab === 'bao-cao' && (
              <TabBaoCao products={products} />
            )}
          </>
        )}
      </div>

      {/* Kiểm kho modal */}
      {showKiemKho && (
        <KiemKhoModal
          products={products}
          userId={user?.id}
          onSave={() => { setShowKiemKho(false); load() }}
          onClose={() => setShowKiemKho(false)}
          showToast={showToast}
        />
      )}

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', bottom: '24px', left: '50%', transform: 'translateX(-50%)',
          background: '#1A1209', color: 'white', padding: '12px 24px', borderRadius: '999px',
          fontWeight: '700', fontSize: '14px', zIndex: 999, boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
          whiteSpace: 'nowrap', maxWidth: '90vw' }}>
          {toast}
        </div>
      )}
    </div>
  )
}
