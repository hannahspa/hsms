import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../../lib/supabase'
import { COLORS } from '../../../constants/colors'
import { confirmDialog } from '../../../components/ui/notify'
import { kmBadge } from '../../../lib/utils'
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
function KMForm({ initial, dichVuList, comboList = [], onSave, onCancel }) {
  const isEdit = !!initial?.id
  const [form, setForm] = useState({
    ten:           initial?.ten           || '',
    mo_ta:         initial?.mo_ta         || '',
    dich_vu_id:    initial?.dich_vu_id    || '',
    nhom_ap_dung:  initial?.nhom_ap_dung  || '',
    combo_id:      initial?.combo_id      || '',
    loai_km:       initial?.loai_km       || 'giam_gia',
    gia_goc:       initial?.gia_goc       || '',
    gia_km:        initial?.gia_km        || '',
    mua_x:         initial?.mua_x         || '',
    tang_y:        initial?.tang_y        || '',
    pct_giam_lan:  initial?.pct_giam_lan  || '',
    gioi_han_suat: initial?.gioi_han_suat || '',
    ngay_bat_dau:  initial?.ngay_bat_dau  || todayISO(),
    ngay_ket_thuc: initial?.ngay_ket_thuc || '',
    trang_thai:    initial?.trang_thai    || 'active',
  })
  const [saving, setSaving] = useState(false)
  const [err, setErr]       = useState('')
  const [phamVi, setPhamVi] = useState(
    initial?.combo_id ? 'combo' : initial?.nhom_ap_dung ? 'nhom' : initial?.dich_vu_id ? 'dich_vu' : (initial ? 'none' : 'dich_vu')
  )

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  // Danh sách nhóm dịch vụ (nhom_hien_thi) duy nhất
  const nhomList = [...new Set(dichVuList.map(d => d.nhom_hien_thi).filter(Boolean))]

  const handleDichVu = (id) => {
    set('dich_vu_id', id)
    const dv = dichVuList.find(d => d.id === id)
    if (dv?.gia_co_ban) set('gia_goc', dv.gia_co_ban)
  }

  const handleCombo = (id) => {
    set('combo_id', id)
    const cb = comboList.find(c => c.id === id)
    if (cb?.gia_ban) set('gia_goc', cb.gia_ban)
  }

  // Tính gia_km hiệu dụng theo loại KM (để badge % hiển thị đúng)
  const giaGocN = +form.gia_goc || 0
  const giaKmTinh = () => {
    if (form.loai_km === 'mua_x_tang_y') {
      const x = +form.mua_x || 0, y = +form.tang_y || 0
      if (!giaGocN || !x || x + y === 0) return 0
      return Math.round(giaGocN * x / (x + y))         // giá hiệu dụng / buổi
    }
    if (form.loai_km === 'mua_n_giam_pct') {
      const p = +form.pct_giam_lan || 0
      return Math.round(giaGocN * (1 - p / 100))       // giá sau giảm mỗi lần
    }
    return +form.gia_km || 0
  }
  const giaKmFinal = giaKmTinh()
  const pct = giaGocN && giaKmFinal ? Math.round((giaGocN - giaKmFinal) / giaGocN * 100) : 0

  const handleSave = async () => {
    if (!form.ten.trim())  return setErr('Nhập tên khuyến mãi')
    if (!form.gia_goc)     return setErr('Nhập giá gốc / giá mỗi buổi')
    if (form.loai_km === 'giam_gia') {
      if (!form.gia_km)                  return setErr('Nhập giá khuyến mãi')
      if (+form.gia_km >= giaGocN)       return setErr('Giá KM phải nhỏ hơn giá gốc')
    } else if (form.loai_km === 'mua_x_tang_y') {
      if (!form.mua_x || !form.tang_y)   return setErr('Nhập số buổi Mua X và Tặng Y')
    } else if (form.loai_km === 'mua_n_giam_pct') {
      if (!form.mua_x)                   return setErr('Nhập số lần mua (N)')
      if (!form.pct_giam_lan || +form.pct_giam_lan <= 0 || +form.pct_giam_lan >= 100)
        return setErr('Nhập % giảm hợp lệ (1–99)')
    }
    if (!form.ngay_ket_thuc)  return setErr('Chọn ngày kết thúc')
    if (form.ngay_ket_thuc < form.ngay_bat_dau) return setErr('Ngày kết thúc phải sau ngày bắt đầu')
    setSaving(true); setErr('')
    if (phamVi === 'dich_vu' && !form.dich_vu_id) return setErr('Chọn dịch vụ áp dụng')
    if (phamVi === 'nhom' && !form.nhom_ap_dung)  return setErr('Chọn nhóm dịch vụ áp dụng')
    if (phamVi === 'combo' && !form.combo_id)     return setErr('Chọn combo áp dụng')
    const payload = {
      ten:           form.ten.trim(),
      mo_ta:         form.mo_ta.trim(),
      dich_vu_id:    phamVi === 'dich_vu' ? (form.dich_vu_id || null) : null,
      nhom_ap_dung:  phamVi === 'nhom' ? (form.nhom_ap_dung || null) : null,
      combo_id:      phamVi === 'combo' ? (form.combo_id || null) : null,
      loai_km:       form.loai_km,
      gia_goc:       giaGocN,
      gia_km:        giaKmFinal,
      mua_x:         form.loai_km === 'giam_gia' ? null : (+form.mua_x || null),
      tang_y:        form.loai_km === 'mua_x_tang_y' ? (+form.tang_y || null) : null,
      pct_giam_lan:  form.loai_km === 'mua_n_giam_pct' ? (+form.pct_giam_lan || null) : null,
      gioi_han_suat: +form.gioi_han_suat || null,
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

          {/* Phạm vi áp dụng */}
          <div>
            <label style={labelStyle}>ÁP DỤNG CHO *</label>
            <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
              {[
                ['dich_vu', '1 dịch vụ'],
                ['nhom', 'Cả nhóm dịch vụ'],
                ['combo', 'Combo liệu trình'],
                ['none', 'Không gắn'],
              ].map(([k, l]) => (
                <button key={k} type="button" onClick={() => setPhamVi(k)}
                  style={{ flex: 1, minWidth: 110, padding: '9px 8px', borderRadius: 10,
                    border: phamVi === k ? 'none' : `1px solid ${COLORS.border}`,
                    background: phamVi === k ? COLORS.grad : COLORS.bg,
                    color: phamVi === k ? 'white' : COLORS.textSub,
                    fontWeight: 800, fontSize: 12.5, cursor: 'pointer' }}>{l}</button>
              ))}
            </div>
            {phamVi === 'dich_vu' && (
              <select style={inputStyle} value={form.dich_vu_id} onChange={e => handleDichVu(e.target.value)}>
                <option value="">— Chọn dịch vụ —</option>
                {dichVuList.map(dv => (
                  <option key={dv.id} value={dv.id}>{dv.ten} ({fmt(dv.gia_co_ban)})</option>
                ))}
              </select>
            )}
            {phamVi === 'nhom' && (
              <>
                <select style={inputStyle} value={form.nhom_ap_dung} onChange={e => set('nhom_ap_dung', e.target.value)}>
                  <option value="">— Chọn nhóm dịch vụ —</option>
                  {nhomList.map(n => <option key={n} value={n}>{n}</option>)}
                </select>
                <div style={{ fontSize: 11, color: COLORS.textMute, marginTop: 4 }}>
                  KM sẽ gắn badge lên mọi dịch vụ trong nhóm này trên Menu iPad.
                </div>
              </>
            )}
            {phamVi === 'combo' && (
              <>
                <select style={inputStyle} value={form.combo_id} onChange={e => handleCombo(e.target.value)}>
                  <option value="">— Chọn combo liệu trình —</option>
                  {comboList.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.ten_combo} ({fmt(c.gia_ban)})
                    </option>
                  ))}
                </select>
                <div style={{ fontSize: 11, color: COLORS.textMute, marginTop: 4 }}>
                  KM gắn vào combo (gói bảo hành) — hiển thị giá ưu đãi ở trang Combo Liệu Trình, không lên Menu iPad.
                </div>
              </>
            )}
            {phamVi === 'none' && (
              <div style={{ fontSize: 11.5, color: COLORS.textMute }}>
                Không gắn dịch vụ — chỉ lưu để quản lý / tham khảo, không hiện badge trên Menu.
              </div>
            )}
          </div>

          {/* Loại khuyến mãi */}
          <div>
            <label style={labelStyle}>LOẠI KHUYẾN MÃI *</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {[
                ['giam_gia', '🏷️ Giảm giá đơn'],
                ['mua_x_tang_y', '🎁 Mua X tặng Y'],
                ['mua_n_giam_pct', '🔢 Mua N lần giảm %'],
              ].map(([k, l]) => (
                <button key={k} type="button" onClick={() => set('loai_km', k)}
                  style={{ flex: 1, minWidth: 120, padding: '10px 8px', borderRadius: 10,
                    border: form.loai_km === k ? 'none' : `1px solid ${COLORS.border}`,
                    background: form.loai_km === k ? COLORS.grad : COLORS.bg,
                    color: form.loai_km === k ? 'white' : COLORS.textSub,
                    fontWeight: 800, fontSize: 12.5, cursor: 'pointer' }}>{l}</button>
              ))}
            </div>
          </div>

          {/* Giá gốc (chung mọi loại) */}
          <div style={{ display: 'grid', gridTemplateColumns: form.loai_km === 'giam_gia' ? '1fr 1fr' : '1fr', gap: '12px' }}>
            <div>
              <label style={labelStyle}>
                {form.loai_km === 'giam_gia' ? 'GIÁ GỐC (đ) *' : 'GIÁ GỐC / BUỔI (đ) *'}
              </label>
              <input style={inputStyle} type="number" value={form.gia_goc}
                onChange={e => set('gia_goc', e.target.value)}
                placeholder="VD: 300000" />
            </div>
            {form.loai_km === 'giam_gia' && (
              <div>
                <label style={labelStyle}>GIÁ KHUYẾN MÃI (đ) *</label>
                <input style={inputStyle} type="number" value={form.gia_km}
                  onChange={e => set('gia_km', e.target.value)}
                  placeholder="VD: 199000" />
              </div>
            )}
          </div>

          {/* Mua X tặng Y */}
          {form.loai_km === 'mua_x_tang_y' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={labelStyle}>MUA (X buổi) *</label>
                <input style={inputStyle} type="number" value={form.mua_x}
                  onChange={e => set('mua_x', e.target.value)} placeholder="VD: 10" />
              </div>
              <div>
                <label style={labelStyle}>TẶNG (Y buổi) *</label>
                <input style={inputStyle} type="number" value={form.tang_y}
                  onChange={e => set('tang_y', e.target.value)} placeholder="VD: 4" />
              </div>
            </div>
          )}

          {/* Mua N lần giảm % */}
          {form.loai_km === 'mua_n_giam_pct' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={labelStyle}>SỐ LẦN MUA (N) *</label>
                <input style={inputStyle} type="number" value={form.mua_x}
                  onChange={e => set('mua_x', e.target.value)} placeholder="VD: 3" />
              </div>
              <div>
                <label style={labelStyle}>GIẢM (%) *</label>
                <input style={inputStyle} type="number" value={form.pct_giam_lan}
                  onChange={e => set('pct_giam_lan', e.target.value)} placeholder="VD: 30" />
              </div>
            </div>
          )}

          {/* Giới hạn suất/khách (tùy chọn, mọi loại) */}
          <div>
            <label style={labelStyle}>GIỚI HẠN SUẤT / KHÁCH (tùy chọn)</label>
            <input style={inputStyle} type="number" value={form.gioi_han_suat}
              onChange={e => set('gioi_han_suat', e.target.value)}
              placeholder="VD: 3 (để trống = không giới hạn)" />
          </div>

          {/* Phần trăm preview */}
          {pct > 0 && (
            <div style={{ background: '#FFF3E0', border: '1px solid #FFB74D', borderRadius: '10px',
              padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '20px' }}>🏷️</span>
              <span style={{ fontWeight: '700', color: '#E65100', fontSize: '15px' }}>
                {form.loai_km === 'giam_gia'
                  ? `Giảm ${pct}% — Tiết kiệm ${fmt(giaGocN - giaKmFinal)}`
                  : form.loai_km === 'mua_x_tang_y'
                    ? `Mua ${form.mua_x || '?'} tặng ${form.tang_y || '?'} — tương đương giảm ~${pct}% (giá hiệu dụng ${fmt(giaKmFinal)}/buổi)`
                    : `Mua ${form.mua_x || '?'} lần giảm ${form.pct_giam_lan || '?'}% — còn ${fmt(giaKmFinal)}/buổi`}
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
function KMRow({ km, dichVuMap, comboMap = {}, onEdit, onDelete, onToggle }) {
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
          fontSize: km.loai_km && km.loai_km !== 'giam_gia' ? 11.5 : 13,
          fontWeight: 800, letterSpacing: '.02em', whiteSpace: 'nowrap',
        }}>
          {kmBadge(km)}
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
        {km.nhom_ap_dung && (
          <div style={{ fontSize: 11.5, color: 'var(--ink3)' }}>
            📂 Cả nhóm: {km.nhom_ap_dung}
          </div>
        )}
        {km.combo_id && (
          <div style={{ fontSize: 11.5, color: 'var(--ink3)' }}>
            🎟 Combo: {comboMap[km.combo_id] || 'liệu trình'}
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
        {km.loai_km && km.loai_km !== 'giam_gia' && (
          <div style={{ fontSize: 11.5, fontWeight: 700, color: '#C0392B' }}>
            🎁 {kmBadge(km)}{km.loai_km === 'mua_x_tang_y' ? ` (≈ ${fmt(km.gia_km)}/buổi)` : ''}
          </div>
        )}
        {km.gioi_han_suat > 0 && (
          <div style={{ fontSize: 11, color: 'var(--ink3)' }}>
            Tối đa {km.gioi_han_suat} suất/khách
          </div>
        )}
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

// ── Máy Tính Khuyến Mãi (lời/lỗ + biên đóng góp) ───────────────────────────────
// % tiêu hao ước lượng theo nhóm (anh Nam chỉnh được). Spa dịch vụ biến phí thấp.
const TIEU_HAO_GOI_Y = [
  { k: 5,  l: 'Gội đầu / chăm sóc tóc (~5%)' },
  { k: 8,  l: 'Triệt lông / Body / Massage (~8%)' },
  { k: 10, l: 'Bio·Elight / công nghệ cao (~10%)' },
  { k: 12, l: 'Tắm trắng / dưỡng trắng (~12%)' },
  { k: 15, l: 'Chăm sóc da mặt (~15%)' },
]
function MayTinhKM({ dichVuList }) {
  const [dichVuId, setDichVuId] = useState('')
  const [giaGoc, setGiaGoc]     = useState('')
  const [kieu, setKieu]         = useState('percent')   // 'percent' | 'tang'
  const [pctGiam, setPctGiam]   = useState(40)
  const [muaX, setMuaX]         = useState(10)
  const [tangY, setTangY]       = useState(3)
  const [pctTieuHao, setPctTieuHao] = useState(10)

  const dv = dichVuList.find(d => d.id === dichVuId)
  const hhPct = Number(dv?.ti_le_hoa_hong) || 0
  const G = Number(giaGoc) || 0

  const handleDV = (id) => {
    setDichVuId(id)
    const d = dichVuList.find(x => x.id === id)
    if (d?.gia_co_ban) setGiaGoc(d.gia_co_ban)
  }

  // Tính toán
  const giamThuc = kieu === 'percent'
    ? (Number(pctGiam) || 0) / 100
    : (Number(tangY) || 0) / ((Number(muaX) || 0) + (Number(tangY) || 0) || 1)
  const giaThucThu = G * (1 - giamThuc)                       // mỗi buổi
  const bienPhi    = G * (hhPct + (Number(pctTieuHao) || 0)) / 100  // mỗi buổi
  const bienDongGop = giaThucThu - bienPhi
  const pctLai = giaThucThu > 0 ? (bienDongGop / giaThucThu) * 100 : 0
  const soBuoi = kieu === 'tang' ? (Number(muaX) || 0) + (Number(tangY) || 0) : 1
  const tienKhachTra = kieu === 'tang' ? G * (Number(muaX) || 0) : giaThucThu
  const laiThe = bienDongGop * soBuoi

  const verdict = !G ? null
    : bienDongGop <= 0 ? { t: '🔴 LỖ — giá sau giảm thấp hơn vốn', c: '#C0392B', bg: '#FDECEA' }
    : pctLai >= 45 ? { t: '🟢 LỜI TỐT — biên rộng, làm được', c: '#2D7A4F', bg: '#EAF4EA' }
    : pctLai >= 20 ? { t: '🟡 LỜI MỎNG — cân nhắc số lượng để bù định phí', c: '#B8791F', bg: '#FFF4E3' }
    : { t: '🟠 LỜI RẤT MỎNG — chỉ nên dùng để kéo khách mới', c: '#A8612A', bg: '#FBE9D6' }

  const lbl = { fontSize: 12, fontWeight: 700, color: COLORS.textSub, marginBottom: 6, display: 'block' }
  const inp = { width: '100%', padding: '10px 14px', border: `1px solid ${COLORS.border}`, borderRadius: 10, fontSize: 14, background: COLORS.bg, color: COLORS.text, outline: 'none', boxSizing: 'border-box' }
  const Row = ({ k, v, big, color }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '8px 0', borderBottom: `1px solid ${COLORS.border}` }}>
      <span style={{ fontSize: big ? 14 : 13, color: COLORS.textSub, fontWeight: big ? 800 : 600 }}>{k}</span>
      <span style={{ fontSize: big ? 18 : 14, fontWeight: 800, color: color || COLORS.text }}>{v}</span>
    </div>
  )

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, alignItems: 'start' }}>
      {/* INPUT */}
      <div style={{ background: 'white', borderRadius: 16, border: `1px solid ${COLORS.border}`, padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ fontWeight: 800, fontSize: 15, color: COLORS.text }}>⚙️ Thiết lập chương trình</div>
        <div>
          <label style={lbl}>DỊCH VỤ</label>
          <select style={inp} value={dichVuId} onChange={e => handleDV(e.target.value)}>
            <option value="">— Chọn dịch vụ (tự lấy giá + hoa hồng) —</option>
            {dichVuList.map(d => <option key={d.id} value={d.id}>{d.ten} ({fmt(d.gia_co_ban)})</option>)}
          </select>
          {dv && <div style={{ fontSize: 11, color: COLORS.textMute, marginTop: 4 }}>Hoa hồng KTV dịch vụ này: {hhPct.toFixed(1)}%</div>}
        </div>
        <div>
          <label style={lbl}>GIÁ GỐC / BUỔI (đ)</label>
          <input style={inp} type="number" value={giaGoc} onChange={e => setGiaGoc(e.target.value)} placeholder="VD: 700000" />
        </div>
        <div>
          <label style={lbl}>KIỂU KHUYẾN MÃI</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {[['percent', '% Giảm giá'], ['tang', 'Mua X tặng Y']].map(([k, l]) => (
              <button key={k} onClick={() => setKieu(k)} style={{ flex: 1, padding: '10px', borderRadius: 10, border: kieu === k ? 'none' : `1px solid ${COLORS.border}`, background: kieu === k ? COLORS.grad : COLORS.bg, color: kieu === k ? 'white' : COLORS.textSub, fontWeight: 800, fontSize: 13, cursor: 'pointer' }}>{l}</button>
            ))}
          </div>
        </div>
        {kieu === 'percent' ? (
          <div>
            <label style={lbl}>GIẢM (%)</label>
            <input style={inp} type="number" value={pctGiam} onChange={e => setPctGiam(e.target.value)} />
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div><label style={lbl}>MUA (X buổi)</label><input style={inp} type="number" value={muaX} onChange={e => setMuaX(e.target.value)} /></div>
            <div><label style={lbl}>TẶNG (Y buổi)</label><input style={inp} type="number" value={tangY} onChange={e => setTangY(e.target.value)} /></div>
          </div>
        )}
        <div>
          <label style={lbl}>% TIÊU HAO ƯỚC LƯỢNG</label>
          <select style={inp} value={pctTieuHao} onChange={e => setPctTieuHao(e.target.value)}>
            {TIEU_HAO_GOI_Y.map(t => <option key={t.k} value={t.k}>{t.l}</option>)}
          </select>
          <div style={{ fontSize: 11, color: COLORS.textMute, marginTop: 4 }}>Biến phí = hoa hồng KTV + tiêu hao (trên giá gốc). Điều chỉnh khi có data thật.</div>
        </div>
      </div>

      {/* KẾT QUẢ */}
      <div style={{ background: 'white', borderRadius: 16, border: `1px solid ${COLORS.border}`, padding: 20 }}>
        <div style={{ fontWeight: 800, fontSize: 15, color: COLORS.text, marginBottom: 10 }}>📊 Kết quả cân đối</div>
        {!G ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: COLORS.textMute, fontSize: 13 }}>Chọn dịch vụ / nhập giá gốc để tính</div>
        ) : (
          <>
            <Row k="Giảm thực tế" v={`${(giamThuc * 100).toFixed(1)}%`} color="#C0392B" />
            <Row k="Giá thực thu / buổi" v={fmt(Math.round(giaThucThu))} />
            <Row k="Biến phí / buổi (HH + tiêu hao)" v={fmt(Math.round(bienPhi))} color="#B8791F" />
            <Row k="Biên đóng góp / buổi" v={fmt(Math.round(bienDongGop))} color={bienDongGop > 0 ? '#2D7A4F' : '#C0392B'} big />
            <Row k="% Lãi biên / buổi" v={`${pctLai.toFixed(1)}%`} color={pctLai > 0 ? '#2D7A4F' : '#C0392B'} big />
            {kieu === 'tang' && (
              <>
                <Row k={`Khách trả (${muaX} buổi)`} v={fmt(Math.round(tienKhachTra))} />
                <Row k={`Lãi cả thẻ (${soBuoi} buổi)`} v={fmt(Math.round(laiThe))} color={laiThe > 0 ? '#2D7A4F' : '#C0392B'} big />
              </>
            )}
            {verdict && (
              <div style={{ marginTop: 14, padding: '12px 14px', borderRadius: 12, background: verdict.bg, color: verdict.c, fontWeight: 800, fontSize: 13.5, textAlign: 'center' }}>
                {verdict.t}
              </div>
            )}
            <div style={{ marginTop: 10, fontSize: 11, color: COLORS.textMute, lineHeight: 1.5 }}>
              * Biên đóng góp = phần "góp" để nuôi định phí (nhà/điện/lương cứng). Lãi ròng cuối tháng = tổng biên đóng góp − định phí. KM biên rộng → cần đủ lượt khách để có lãi ròng.
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────────
const KM_PATH_TAB = {
  '/admin/khuyen-mai':         'list',
  '/admin/khuyen-mai/may-tinh':'calc',
  '/admin/khuyen-mai/roi':     'roi',
}

export default function AdminKhuyenMaiPage() {
  const [list, setList]           = useState([])
  const [dichVuList, setDichVuList] = useState([])
  const [comboList, setComboList] = useState([])
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
      .select('id, ten, gia_co_ban, nhom_hien_thi, ti_le_hoa_hong, danh_muc')
      .eq('is_active', true)
      .order('nhom_hien_thi')
      .order('ten')
      .then(({ data }) => setDichVuList(data || []))
    supabase.from('combo_lieu_trinh')
      .select('id, ten_combo, gia_ban, thoi_han_so, thoi_han_don_vi')
      .eq('trang_thai', 'active')
      .order('ten_combo')
      .then(({ data }) => setComboList(data || []))
  }, [])

  const dichVuMap = Object.fromEntries(dichVuList.map(d => [d.id, d.ten]))
  const comboMap  = Object.fromEntries(comboList.map(c => [c.id, c.ten_combo]))

  const filtered = filter === 'all' ? list : list.filter(k => k.trang_thai === filter)

  const handleEdit   = (km) => { setEditing(km); setShowForm(true) }
  const handleCreate = ()   => { setEditing(null); setShowForm(true) }
  const handleSave   = ()   => { setShowForm(false); load(); showToast('✅ Lưu thành công!') }

  const handleDelete = async (km) => {
    if (!(await confirmDialog({ title: 'Xoá khuyến mãi', message: `Xóa khuyến mãi "${km.ten}"?`, danger: true, confirmLabel: 'Xoá' }))) return
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
            <div className={`st${tab === 'calc' ? ' active' : ''}`} onClick={() => setTab('calc')}>🧮 Máy Tính KM</div>
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

      {/* Máy tính KM */}
      {tab === 'calc' && <MayTinhKM dichVuList={dichVuList} />}

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
                <KMRow key={km.id} km={km} dichVuMap={dichVuMap} comboMap={comboMap}
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
          comboList={comboList}
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
