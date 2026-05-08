import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../context/AuthContext'
import { COLORS } from '../../../constants/colors'

// ── Helpers ────────────────────────────────────────────────────────────────────
function fmt(n) {
  if (!n && n !== 0) return '—'
  return new Intl.NumberFormat('vi-VN').format(n) + 'đ'
}
function fmtDate(iso) {
  if (!iso) return '—'
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}
function daysAgo(iso) {
  if (!iso) return null
  const diff = Date.now() - new Date(iso).getTime()
  return Math.floor(diff / 86400000)
}
function todayISO() {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }))
    .toISOString().slice(0, 10)
}
function daysUntil(iso) {
  if (!iso) return null
  const diff = new Date(iso).getTime() - Date.now()
  return Math.floor(diff / 86400000)
}
function initials(name) {
  if (!name) return '?'
  const parts = name.trim().split(' ')
  return parts[parts.length - 1].charAt(0).toUpperCase()
}

// Tồng chi tiêu tính từ thẻ liệu trình
function tongChiTieu(cards) {
  return cards.reduce((s, c) => s + (c.gia_tri_the || 0), 0)
}

// ── Styles ─────────────────────────────────────────────────────────────────────
const inp = {
  width: '100%', padding: '10px 14px', border: `1px solid ${COLORS.border}`,
  borderRadius: '10px', fontSize: '14px', background: COLORS.bg, color: COLORS.text,
  outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
}
const lbl = {
  fontSize: '11px', fontWeight: '700', color: COLORS.textSub, marginBottom: '5px',
  display: 'block', textTransform: 'uppercase', letterSpacing: '0.04em',
}

const NGUON_LIST = ['Facebook', 'Zalo', 'Bạn bè giới thiệu', 'Walk-in', 'TikTok', 'Google', 'Khác']
const DICH_VU_LIST = [
  'Chăm sóc da mặt', 'Triệt lông', 'Massage body', 'Tắm trắng', 'Giảm béo',
  'Gội đầu dưỡng sinh', 'Waxing', 'Nâng cơ RF', 'Trẻ hóa da', 'Khác'
]

// ══════════════════════════════════════════════════════════════════════════════
// FORM KHÁCH HÀNG (bottom sheet)
// ══════════════════════════════════════════════════════════════════════════════
function FormKhachHang({ initial, onSave, onClose }) {
  const isEdit = !!initial?.id
  const [f, setF] = useState({
    ho_ten:          initial?.ho_ten || '',
    so_dien_thoai:   initial?.so_dien_thoai || '',
    ngay_sinh:       initial?.ngay_sinh || '',
    gioi_tinh:       initial?.gioi_tinh || 'nu',
    dia_chi:         initial?.dia_chi || '',
    nguon:           initial?.nguon || '',
    ghi_chu_da_lieu: initial?.ghi_chu_da_lieu || '',
    lan_cuoi_den:    initial?.lan_cuoi_den || '',
  })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const set = (k, v) => setF(p => ({ ...p, [k]: v }))

  const handleSave = async () => {
    if (!f.ho_ten.trim()) return setErr('Nhập họ tên khách hàng')
    if (!f.so_dien_thoai.trim()) return setErr('Nhập số điện thoại')
    setSaving(true); setErr('')
    const payload = {
      ho_ten:          f.ho_ten.trim(),
      so_dien_thoai:   f.so_dien_thoai.trim(),
      ngay_sinh:       f.ngay_sinh || null,
      gioi_tinh:       f.gioi_tinh,
      dia_chi:         f.dia_chi.trim(),
      nguon:           f.nguon.trim(),
      ghi_chu_da_lieu: f.ghi_chu_da_lieu.trim(),
      lan_cuoi_den:    f.lan_cuoi_den || null,
    }
    let error
    if (isEdit) {
      ;({ error } = await supabase.from('khach_hang').update(payload).eq('id', initial.id))
    } else {
      ;({ error } = await supabase.from('khach_hang').insert(payload))
    }
    setSaving(false)
    if (error) {
      if (error.code === '23505') return setErr('Số điện thoại này đã tồn tại trong hệ thống')
      return setErr(error.message)
    }
    onSave()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(26,18,9,0.6)', zIndex: 300,
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div style={{ background: 'white', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: '520px',
        maxHeight: '92vh', overflow: 'auto', boxShadow: '0 -8px 40px rgba(0,0,0,0.25)' }}>
        <div style={{ background: COLORS.grad, padding: '18px 20px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          borderRadius: '20px 20px 0 0', position: 'sticky', top: 0, zIndex: 1 }}>
          <div style={{ color: 'white', fontWeight: '800', fontSize: '16px' }}>
            {isEdit ? '✏️ Sửa hồ sơ' : '➕ Thêm khách hàng'}
          </div>
          <button onClick={onClose}
            style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white',
              width: '30px', height: '30px', borderRadius: '50%', cursor: 'pointer', fontSize: '14px' }}>✕</button>
        </div>

        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Giới tính */}
          <div>
            <label style={lbl}>GIỚI TÍNH</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              {[['nu','👩 Nữ'],['nam','👨 Nam'],['khac','🧑 Khác']].map(([v, l]) => (
                <button key={v} onClick={() => set('gioi_tinh', v)}
                  style={{ flex: 1, padding: '10px', borderRadius: '10px', border: 'none',
                    cursor: 'pointer', fontWeight: '700', fontSize: '13px',
                    background: f.gioi_tinh === v ? COLORS.primary : COLORS.bg,
                    color: f.gioi_tinh === v ? 'white' : COLORS.textSub }}>
                  {l}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label style={lbl}>HỌ VÀ TÊN *</label>
            <input style={inp} value={f.ho_ten} onChange={e => set('ho_ten', e.target.value)}
              placeholder="Nguyễn Thị Hoa" autoFocus />
          </div>

          <div>
            <label style={lbl}>SỐ ĐIỆN THOẠI *</label>
            <input style={inp} type="tel" value={f.so_dien_thoai}
              onChange={e => set('so_dien_thoai', e.target.value)} placeholder="0909..." />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={lbl}>NGÀY SINH</label>
              <input style={inp} type="date" value={f.ngay_sinh}
                onChange={e => set('ngay_sinh', e.target.value)} />
            </div>
            <div>
              <label style={lbl}>LẦN CUỐI ĐẾN</label>
              <input style={inp} type="date" value={f.lan_cuoi_den}
                onChange={e => set('lan_cuoi_den', e.target.value)} />
            </div>
          </div>

          <div>
            <label style={lbl}>NGUỒN BIẾT ĐẾN</label>
            <select style={inp} value={f.nguon} onChange={e => set('nguon', e.target.value)}>
              <option value="">— Chọn —</option>
              {NGUON_LIST.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>

          <div>
            <label style={lbl}>ĐỊA CHỈ</label>
            <input style={inp} value={f.dia_chi} onChange={e => set('dia_chi', e.target.value)}
              placeholder="Quận, Phường..." />
          </div>

          <div>
            <label style={lbl}>GHI CHÚ DA LIỄU / DỊ ỨNG</label>
            <textarea style={{ ...inp, height: '80px', resize: 'vertical' }}
              value={f.ghi_chu_da_lieu} onChange={e => set('ghi_chu_da_lieu', e.target.value)}
              placeholder="Da nhạy cảm, dị ứng nickel, đang điều trị mụn..." />
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
              {saving ? 'Đang lưu...' : isEdit ? '💾 Lưu' : '✅ Thêm'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// FORM THẺ LIỆU TRÌNH
// ══════════════════════════════════════════════════════════════════════════════
function FormTheLieuTrinh({ khachHangId, initial, onSave, onClose }) {
  const isEdit = !!initial?.id
  const [f, setF] = useState({
    ten_dich_vu:  initial?.ten_dich_vu || '',
    ten_custom:   '',
    so_buoi_tong: initial?.so_buoi_tong || '',
    gia_tri_the:  initial?.gia_tri_the || '',
    ngay_mua:     initial?.ngay_mua || todayISO(),
    ngay_het_han: initial?.ngay_het_han || '',
    ghi_chu:      initial?.ghi_chu || '',
  })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const set = (k, v) => setF(p => ({ ...p, [k]: v }))

  const handleSave = async () => {
    const tenDV = f.ten_dich_vu === '__custom' ? f.ten_custom.trim() : f.ten_dich_vu
    if (!tenDV) return setErr('Chọn hoặc nhập tên dịch vụ')
    if (!f.so_buoi_tong || +f.so_buoi_tong <= 0) return setErr('Nhập số buổi hợp lệ')
    setSaving(true); setErr('')
    const payload = {
      khach_hang_id: khachHangId,
      ten_dich_vu:   tenDV,
      so_buoi_tong:  +f.so_buoi_tong,
      gia_tri_the:   +f.gia_tri_the || 0,
      ngay_mua:      f.ngay_mua,
      ngay_het_han:  f.ngay_het_han || null,
      ghi_chu:       f.ghi_chu.trim(),
    }
    let error
    if (isEdit) {
      ;({ error } = await supabase.from('the_lieu_trinh')
        .update({ ten_dich_vu: payload.ten_dich_vu, so_buoi_tong: payload.so_buoi_tong,
          gia_tri_the: payload.gia_tri_the, ngay_mua: payload.ngay_mua,
          ngay_het_han: payload.ngay_het_han, ghi_chu: payload.ghi_chu })
        .eq('id', initial.id))
    } else {
      ;({ error } = await supabase.from('the_lieu_trinh').insert(payload))
    }
    setSaving(false)
    if (error) return setErr(error.message)
    onSave()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(26,18,9,0.6)', zIndex: 400,
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div style={{ background: 'white', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: '520px',
        maxHeight: '88vh', overflow: 'auto', boxShadow: '0 -8px 40px rgba(0,0,0,0.25)' }}>
        <div style={{ background: 'linear-gradient(135deg,#1A5276,#2980B9)', padding: '18px 20px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          borderRadius: '20px 20px 0 0', position: 'sticky', top: 0, zIndex: 1 }}>
          <div style={{ color: 'white', fontWeight: '800', fontSize: '16px' }}>
            {isEdit ? '✏️ Sửa thẻ liệu trình' : '🎫 Thêm thẻ liệu trình'}
          </div>
          <button onClick={onClose}
            style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white',
              width: '30px', height: '30px', borderRadius: '50%', cursor: 'pointer', fontSize: '14px' }}>✕</button>
        </div>

        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={lbl}>DỊCH VỤ *</label>
            <select style={inp} value={f.ten_dich_vu} onChange={e => set('ten_dich_vu', e.target.value)}>
              <option value="">— Chọn dịch vụ —</option>
              {DICH_VU_LIST.map(d => <option key={d} value={d === 'Khác' ? '__custom' : d}>{d}</option>)}
            </select>
            {f.ten_dich_vu === '__custom' && (
              <input style={{ ...inp, marginTop: '8px' }} placeholder="Nhập tên dịch vụ..."
                value={f.ten_custom} onChange={e => set('ten_custom', e.target.value)} />
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={lbl}>SỐ BUỔI TỔNG *</label>
              <input style={inp} type="number" min="1" value={f.so_buoi_tong}
                onChange={e => set('so_buoi_tong', e.target.value)} placeholder="10" />
            </div>
            <div>
              <label style={lbl}>GIÁ TRỊ THẺ (đ)</label>
              <input style={inp} type="number" value={f.gia_tri_the}
                onChange={e => set('gia_tri_the', e.target.value)} placeholder="0" />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={lbl}>NGÀY MUA</label>
              <input style={inp} type="date" value={f.ngay_mua}
                onChange={e => set('ngay_mua', e.target.value)} />
            </div>
            <div>
              <label style={lbl}>HẠN SỬ DỤNG</label>
              <input style={inp} type="date" value={f.ngay_het_han}
                onChange={e => set('ngay_het_han', e.target.value)} />
            </div>
          </div>

          <div>
            <label style={lbl}>GHI CHÚ</label>
            <textarea style={{ ...inp, height: '60px', resize: 'vertical' }}
              value={f.ghi_chu} onChange={e => set('ghi_chu', e.target.value)}
              placeholder="Ghi chú về thẻ, ưu đãi đặc biệt..." />
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
              style={{ flex: 2, padding: '13px',
                background: 'linear-gradient(135deg,#1A5276,#2980B9)', color: 'white',
                border: 'none', borderRadius: '12px', fontWeight: '800', fontSize: '14px',
                cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
              {saving ? 'Đang lưu...' : isEdit ? '💾 Lưu' : '🎫 Thêm thẻ'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// THẺ LIỆU TRÌNH CARD (dùng chung)
// ══════════════════════════════════════════════════════════════════════════════
function TheLieuTrinhCard({ the, onDungBuoi, onEdit, onHuy, compact }) {
  const conLai = the.so_buoi_con_lai ?? (the.so_buoi_tong - the.so_buoi_da_dung)
  const pct    = Math.max(0, (conLai / the.so_buoi_tong) * 100)
  const han    = the.ngay_het_han ? daysUntil(the.ngay_het_han) : null

  const statusColor = the.trang_thai === 'active' ? '#2D7A4F'
    : the.trang_thai === 'het_buoi' ? '#1A5276'
    : the.trang_thai === 'het_han'  ? '#C0392B' : '#B8A898'

  const statusLabel = { active: 'Đang dùng', het_buoi: 'Hết buổi', het_han: 'Hết hạn', da_huy: 'Đã hủy' }

  return (
    <div style={{ background: 'white', borderRadius: '14px', padding: compact ? '12px' : '16px',
      border: `1px solid ${the.trang_thai === 'active' ? 'rgba(41,128,185,0.25)' : COLORS.border}`,
      boxShadow: COLORS.shadow }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: '800', fontSize: compact ? '13px' : '14px', color: COLORS.text }}>
            {the.ten_dich_vu}
          </div>
          <div style={{ fontSize: '11px', color: COLORS.textMute, marginTop: '2px' }}>
            Mua: {fmtDate(the.ngay_mua)}
            {the.ngay_het_han && ` · Hạn: ${fmtDate(the.ngay_het_han)}`}
            {the.gia_tri_the > 0 && ` · ${fmt(the.gia_tri_the)}`}
          </div>
        </div>
        <span style={{ fontSize: '11px', fontWeight: '800', padding: '3px 8px',
          borderRadius: '999px', background: `${statusColor}15`, color: statusColor, flexShrink: 0 }}>
          {statusLabel[the.trang_thai] || the.trang_thai}
        </span>
      </div>

      {/* Progress */}
      <div style={{ marginTop: '10px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
          <span style={{ fontSize: '12px', color: COLORS.textMute }}>
            Đã dùng {the.so_buoi_da_dung}/{the.so_buoi_tong} buổi
          </span>
          <span style={{ fontSize: '13px', fontWeight: '800',
            color: conLai === 0 ? '#C0392B' : conLai <= 2 ? '#E67E22' : '#2D7A4F' }}>
            Còn {conLai} buổi
          </span>
        </div>
        <div style={{ height: '6px', background: '#F0E9E0', borderRadius: '3px' }}>
          <div style={{ height: '100%', borderRadius: '3px', transition: 'width .4s',
            background: conLai === 0 ? '#C0392B' : conLai <= 2 ? '#E67E22' : '#2D7A4F',
            width: `${Math.max(2, 100 - pct)}%` }} />
        </div>
      </div>

      {/* Cảnh báo hết hạn */}
      {han !== null && han <= 30 && han >= 0 && the.trang_thai === 'active' && (
        <div style={{ marginTop: '8px', fontSize: '11px', background: '#FFF8E1',
          color: '#7B5800', padding: '5px 10px', borderRadius: '6px', fontWeight: '700' }}>
          ⏰ Còn {han} ngày sử dụng
        </div>
      )}
      {han !== null && han < 0 && the.trang_thai === 'active' && (
        <div style={{ marginTop: '8px', fontSize: '11px', background: '#FDECEA',
          color: '#C0392B', padding: '5px 10px', borderRadius: '6px', fontWeight: '700' }}>
          🚨 Đã hết hạn {Math.abs(han)} ngày
        </div>
      )}
      {the.ghi_chu && (
        <div style={{ marginTop: '6px', fontSize: '11px', color: COLORS.textMute, fontStyle: 'italic' }}>
          📝 {the.ghi_chu}
        </div>
      )}

      {/* Actions */}
      {!compact && (
        <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
          {the.trang_thai === 'active' && conLai > 0 && (
            <button onClick={() => onDungBuoi(the)}
              style={{ flex: 2, padding: '9px', background: '#2D7A4F', color: 'white',
                border: 'none', borderRadius: '9px', fontWeight: '800', fontSize: '12px', cursor: 'pointer' }}>
              ✅ Dùng 1 buổi
            </button>
          )}
          <button onClick={() => onEdit(the)}
            style={{ flex: 1, padding: '9px', background: COLORS.bg, border: `1px solid ${COLORS.border}`,
              borderRadius: '9px', fontWeight: '700', fontSize: '12px', cursor: 'pointer', color: COLORS.textSub }}>
            ✏️ Sửa
          </button>
          {the.trang_thai !== 'da_huy' && (
            <button onClick={() => onHuy(the)}
              style={{ padding: '9px 12px', background: '#FDECEA', border: '1px solid #FADBD8',
                borderRadius: '9px', fontWeight: '700', fontSize: '12px', cursor: 'pointer', color: '#C0392B' }}>
              🗑
            </button>
          )}
        </div>
      )}
      {compact && the.trang_thai === 'active' && conLai > 0 && (
        <button onClick={() => onDungBuoi(the)}
          style={{ width: '100%', marginTop: '10px', padding: '8px', background: '#2D7A4F', color: 'white',
            border: 'none', borderRadius: '9px', fontWeight: '800', fontSize: '12px', cursor: 'pointer' }}>
          ✅ Dùng 1 buổi
        </button>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// KHÁCH HÀNG MODAL (full screen detail)
// ══════════════════════════════════════════════════════════════════════════════
function KhachHangModal({ kh, allCards, onClose, onReload, showToast }) {
  const [showFormKH, setShowFormKH]   = useState(false)
  const [showFormTLT, setShowFormTLT] = useState(false)
  const [editTLT, setEditTLT]         = useState(null)

  const cards = allCards.filter(c => c.khach_hang_id === kh.id)
    .sort((a, b) => {
      const order = { active: 0, het_buoi: 1, het_han: 2, da_huy: 3 }
      return (order[a.trang_thai] ?? 9) - (order[b.trang_thai] ?? 9)
    })

  const activeCards = cards.filter(c => c.trang_thai === 'active')
  const da = daysAgo(kh.lan_cuoi_den)
  const chiTieu = tongChiTieu(cards)

  const handleDungBuoi = async (the) => {
    if (!window.confirm(`Xác nhận dùng 1 buổi "${the.ten_dich_vu}"?\nCòn lại: ${the.so_buoi_con_lai} → ${the.so_buoi_con_lai - 1} buổi`)) return
    const newDung = (the.so_buoi_da_dung || 0) + 1
    const newConLai = the.so_buoi_tong - newDung
    const trangThai = newConLai <= 0 ? 'het_buoi' : 'active'

    const { error } = await supabase.from('the_lieu_trinh')
      .update({ so_buoi_da_dung: newDung, trang_thai: trangThai })
      .eq('id', the.id)
    if (error) return showToast('❌ ' + error.message)

    await supabase.from('khach_hang')
      .update({ lan_cuoi_den: todayISO() }).eq('id', kh.id)

    if (newConLai <= 0) showToast(`✅ Hết buổi "${the.ten_dich_vu}"! Nhắc KH mua thêm.`)
    else if (newConLai <= 2) showToast(`✅ Đã dùng 1 buổi · Còn ${newConLai} buổi — sắp hết!`)
    else showToast(`✅ Đã dùng 1 buổi · Còn ${newConLai} buổi`)
    onReload()
  }

  const handleHuyThe = async (the) => {
    if (!window.confirm(`Hủy thẻ "${the.ten_dich_vu}"?`)) return
    const { error } = await supabase.from('the_lieu_trinh')
      .update({ trang_thai: 'da_huy' }).eq('id', the.id)
    if (error) return showToast('❌ ' + error.message)
    showToast('🗑 Đã hủy thẻ liệu trình')
    onReload()
  }

  const handleDeleteKH = async () => {
    if (!window.confirm(`Xóa khách hàng "${kh.ho_ten}"?\nTất cả thẻ liệu trình cũng sẽ bị xóa.`)) return
    const { error } = await supabase.from('khach_hang').update({ is_active: false }).eq('id', kh.id)
    if (error) return showToast('❌ ' + error.message)
    showToast('🗑 Đã ẩn khách hàng')
    onReload(); onClose()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'white', zIndex: 200,
      display: 'flex', flexDirection: 'column', fontFamily: 'inherit', overflowY: 'auto' }}>
      {/* Header */}
      <div style={{ background: COLORS.grad, padding: '44px 20px 24px', position: 'relative', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <button onClick={onClose}
            style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white',
              width: '34px', height: '34px', borderRadius: '50%', cursor: 'pointer', fontSize: '16px' }}>
            ←
          </button>
          <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '13px', fontWeight: '600' }}>
            Hồ Sơ Khách Hàng
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          {/* Avatar */}
          <div style={{ width: '60px', height: '60px', borderRadius: '50%',
            background: 'rgba(201,169,110,0.3)', border: '2.5px solid rgba(255,255,255,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '26px', fontWeight: '800', color: '#C9A96E', flexShrink: 0 }}>
            {initials(kh.ho_ten)}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ color: 'white', fontWeight: '800', fontSize: '22px', lineHeight: 1.2 }}>
              {kh.ho_ten}
            </div>
            <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: '14px', marginTop: '3px' }}>
              📞 {kh.so_dien_thoai}
            </div>
          </div>
          <button onClick={() => setShowFormKH(true)}
            style={{ background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)',
              color: 'white', padding: '7px 14px', borderRadius: '9px',
              cursor: 'pointer', fontSize: '12px', fontWeight: '700', flexShrink: 0 }}>
            ✏️ Sửa
          </button>
        </div>

        {/* Quick stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginTop: '16px' }}>
          {[
            { label: 'Thẻ active', val: activeCards.length, icon: '🎫' },
            { label: 'Chi tiêu', val: chiTieu > 0 ? `${(chiTieu/1e6).toFixed(1)}M` : '—', icon: '💰' },
            { label: 'Lần cuối', val: da !== null ? (da === 0 ? 'Hôm nay' : `${da} ngày`) : '—', icon: '📅' },
          ].map(s => (
            <div key={s.label} style={{ background: 'rgba(255,255,255,0.12)',
              borderRadius: '10px', padding: '10px 8px', textAlign: 'center' }}>
              <div style={{ fontSize: '14px' }}>{s.icon}</div>
              <div style={{ fontWeight: '800', fontSize: '15px', color: 'white', marginTop: '2px' }}>{s.val}</div>
              <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.55)', marginTop: '1px' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Info section */}
        <div style={{ background: 'white', borderRadius: '16px', padding: '16px',
          border: `1px solid ${COLORS.border}`, boxShadow: COLORS.shadow }}>
          <div style={{ fontWeight: '800', fontSize: '13px', color: COLORS.text, marginBottom: '12px' }}>
            📋 Thông tin
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            {[
              { label: 'Ngày sinh', val: kh.ngay_sinh ? fmtDate(kh.ngay_sinh) : '—' },
              { label: 'Giới tính', val: { nu: '👩 Nữ', nam: '👨 Nam', khac: '🧑 Khác' }[kh.gioi_tinh] || '—' },
              { label: 'Nguồn', val: kh.nguon || '—' },
              { label: 'Địa chỉ', val: kh.dia_chi || '—' },
            ].map(i => (
              <div key={i.label}>
                <div style={{ fontSize: '10px', color: COLORS.textMute, textTransform: 'uppercase',
                  letterSpacing: '0.05em', marginBottom: '2px' }}>{i.label}</div>
                <div style={{ fontSize: '13px', fontWeight: '700', color: COLORS.text }}>{i.val}</div>
              </div>
            ))}
          </div>
          {kh.ghi_chu_da_lieu && (
            <div style={{ marginTop: '12px', padding: '10px 12px', background: '#FFF9F0',
              borderRadius: '8px', border: '1px solid #FFE0B2' }}>
              <div style={{ fontSize: '10px', color: '#E67E22', fontWeight: '800',
                textTransform: 'uppercase', marginBottom: '4px' }}>🧴 Ghi chú da liễu</div>
              <div style={{ fontSize: '13px', color: COLORS.text, lineHeight: 1.5 }}>
                {kh.ghi_chu_da_lieu}
              </div>
            </div>
          )}
        </div>

        {/* Thẻ liệu trình */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div style={{ fontWeight: '800', fontSize: '13px', color: COLORS.text }}>
              🎫 Thẻ Liệu Trình ({cards.length})
            </div>
            <button onClick={() => { setEditTLT(null); setShowFormTLT(true) }}
              style={{ padding: '7px 14px', background: '#1A5276', color: 'white',
                border: 'none', borderRadius: '9px', fontWeight: '800', fontSize: '12px', cursor: 'pointer' }}>
              + Thêm thẻ
            </button>
          </div>

          {cards.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px', color: COLORS.textMute,
              background: COLORS.bg, borderRadius: '12px', border: `1px dashed ${COLORS.border}` }}>
              <div style={{ fontSize: '28px', marginBottom: '8px' }}>🎫</div>
              <div>Chưa có thẻ liệu trình nào</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {cards.map(c => (
                <TheLieuTrinhCard key={c.id} the={c}
                  onDungBuoi={handleDungBuoi}
                  onEdit={t => { setEditTLT(t); setShowFormTLT(true) }}
                  onHuy={handleHuyThe}
                />
              ))}
            </div>
          )}
        </div>

        {/* Danger zone */}
        <div style={{ textAlign: 'center', paddingTop: '8px' }}>
          <button onClick={handleDeleteKH}
            style={{ padding: '8px 20px', background: 'transparent', border: '1px solid #FADBD8',
              borderRadius: '9px', color: '#C0392B', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}>
            🗑 Ẩn khách hàng này
          </button>
        </div>
      </div>

      {/* Forms */}
      {showFormKH && (
        <FormKhachHang initial={kh}
          onSave={() => { setShowFormKH(false); onReload(); showToast('✅ Đã cập nhật hồ sơ') }}
          onClose={() => setShowFormKH(false)} />
      )}
      {showFormTLT && (
        <FormTheLieuTrinh khachHangId={kh.id} initial={editTLT}
          onSave={() => { setShowFormTLT(false); onReload(); showToast('✅ Đã lưu thẻ liệu trình') }}
          onClose={() => setShowFormTLT(false)} />
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB 1: KHÁCH HÀNG
// ══════════════════════════════════════════════════════════════════════════════
function TabKhachHang({ customers, allCards, onReload, showToast }) {
  const [search, setSearch]       = useState('')
  const [filter, setFilter]       = useState('all')
  const [sort, setSort]           = useState('recent')
  const [showForm, setShowForm]   = useState(false)
  const [selected, setSelected]   = useState(null)

  const cardsByKH = {}
  allCards.forEach(c => {
    if (!cardsByKH[c.khach_hang_id]) cardsByKH[c.khach_hang_id] = []
    cardsByKH[c.khach_hang_id].push(c)
  })

  let list = customers.filter(kh => {
    if (!kh.is_active) return false
    if (search) {
      const q = search.toLowerCase()
      if (!kh.ho_ten.toLowerCase().includes(q) && !kh.so_dien_thoai.includes(q)) return false
    }
    const cards = cardsByKH[kh.id] || []
    if (filter === 'co_the') return cards.some(c => c.trang_thai === 'active')
    if (filter === 'khong_the') return !cards.some(c => c.trang_thai === 'active')
    return true
  })

  list = [...list].sort((a, b) => {
    if (sort === 'recent')   return new Date(b.created_at) - new Date(a.created_at)
    if (sort === 'chi_tieu') return tongChiTieu(cardsByKH[b.id] || []) - tongChiTieu(cardsByKH[a.id] || [])
    if (sort === 'ten')      return a.ho_ten.localeCompare(b.ho_ten, 'vi')
    if (sort === 'lan_cuoi') {
      const da = kh => kh.lan_cuoi_den ? new Date(kh.lan_cuoi_den) : new Date(0)
      return da(a) - da(b)
    }
    return 0
  })

  const AVATAR_COLORS = ['#A0714F','#2D7A4F','#1A5276','#8E44AD','#C0392B','#E67E22']

  return (
    <div>
      {/* Toolbar */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
        <input style={{ ...inp, flex: 1, padding: '9px 14px' }}
          placeholder="🔍 Tên hoặc SĐT..." value={search}
          onChange={e => setSearch(e.target.value)} />
        <button onClick={() => setShowForm(true)}
          style={{ padding: '9px 18px', background: COLORS.grad, color: 'white', border: 'none',
            borderRadius: '10px', fontWeight: '800', fontSize: '13px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
          + Thêm
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '8px', flexWrap: 'wrap' }}>
        {[['all','👥 Tất cả'],['co_the','🎫 Có thẻ active'],['khong_the','Không thẻ']].map(([k,l]) => (
          <button key={k} onClick={() => setFilter(k)}
            style={{ padding: '5px 12px', borderRadius: '999px', border: 'none', cursor: 'pointer',
              fontWeight: '700', fontSize: '12px', boxShadow: COLORS.shadow,
              background: filter === k ? COLORS.primary : 'white',
              color: filter === k ? 'white' : COLORS.textSub }}>
            {l}
          </button>
        ))}
        <select style={{ ...inp, padding: '5px 10px', fontSize: '12px', width: 'auto', marginLeft: 'auto' }}
          value={sort} onChange={e => setSort(e.target.value)}>
          <option value="recent">Mới nhất</option>
          <option value="ten">Tên A-Z</option>
          <option value="chi_tieu">Chi tiêu cao</option>
          <option value="lan_cuoi">Chưa ghé lâu</option>
        </select>
      </div>

      <div style={{ fontSize: '12px', color: COLORS.textMute, marginBottom: '10px' }}>
        {list.length} khách hàng
      </div>

      {/* List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {list.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: COLORS.textMute }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>👥</div>
            <div>Chưa có khách hàng</div>
          </div>
        ) : list.map((kh, i) => {
          const cards = cardsByKH[kh.id] || []
          const active = cards.filter(c => c.trang_thai === 'active')
          const chi = tongChiTieu(cards)
          const da = daysAgo(kh.lan_cuoi_den)
          const avColor = AVATAR_COLORS[i % AVATAR_COLORS.length]
          return (
            <button key={kh.id} onClick={() => setSelected(kh)}
              style={{ background: 'white', borderRadius: '14px', padding: '14px 16px',
                border: `1px solid ${COLORS.border}`, boxShadow: COLORS.shadow,
                cursor: 'pointer', textAlign: 'left', display: 'flex', gap: '12px', alignItems: 'center',
                width: '100%' }}>
              {/* Avatar */}
              <div style={{ width: '44px', height: '44px', borderRadius: '50%', flexShrink: 0,
                background: `${avColor}20`, border: `2px solid ${avColor}30`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '18px', fontWeight: '800', color: avColor }}>
                {initials(kh.ho_ten)}
              </div>
              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: '800', fontSize: '14px', color: COLORS.text }}>{kh.ho_ten}</div>
                <div style={{ fontSize: '12px', color: COLORS.textMute, marginTop: '1px' }}>
                  {kh.so_dien_thoai}
                  {kh.nguon && ` · ${kh.nguon}`}
                </div>
                <div style={{ display: 'flex', gap: '8px', marginTop: '6px', flexWrap: 'wrap' }}>
                  {active.length > 0 && (
                    <span style={{ fontSize: '11px', background: '#EBF5FB', color: '#1A5276',
                      padding: '2px 8px', borderRadius: '999px', fontWeight: '700' }}>
                      🎫 {active.length} thẻ
                    </span>
                  )}
                  {chi > 0 && (
                    <span style={{ fontSize: '11px', background: '#E8F5E9', color: '#2D7A4F',
                      padding: '2px 8px', borderRadius: '999px', fontWeight: '700' }}>
                      💰 {chi >= 1e6 ? `${(chi/1e6).toFixed(1)}M` : fmt(chi)}
                    </span>
                  )}
                  {da !== null && (
                    <span style={{ fontSize: '11px',
                      background: da > 60 ? '#FDECEA' : da > 30 ? '#FFF8E1' : '#F0F4F8',
                      color: da > 60 ? '#C0392B' : da > 30 ? '#7B5800' : COLORS.textMute,
                      padding: '2px 8px', borderRadius: '999px', fontWeight: '700' }}>
                      {da === 0 ? '✓ Hôm nay' : `${da}d trước`}
                    </span>
                  )}
                </div>
              </div>
              <div style={{ color: COLORS.textMute, fontSize: '16px', flexShrink: 0 }}>›</div>
            </button>
          )
        })}
      </div>

      {showForm && (
        <FormKhachHang
          onSave={() => { setShowForm(false); onReload(); showToast('✅ Đã thêm khách hàng!') }}
          onClose={() => setShowForm(false)} />
      )}
      {selected && (
        <KhachHangModal kh={selected} allCards={allCards}
          onClose={() => setSelected(null)} onReload={onReload} showToast={showToast} />
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB 2: THẺ LIỆU TRÌNH (tất cả)
// ══════════════════════════════════════════════════════════════════════════════
function TabTheLieuTrinh({ allCards, customers, onReload, showToast }) {
  const [filterTT, setFilterTT] = useState('active')
  const khMap = Object.fromEntries(customers.map(k => [k.id, k]))
  const [selectedKH, setSelectedKH] = useState(null)

  const filtered = allCards
    .filter(c => filterTT === 'all' ? true : c.trang_thai === filterTT)
    .sort((a, b) => {
      if (filterTT === 'active') {
        const ha = a.ngay_het_han || '9999'
        const hb = b.ngay_het_han || '9999'
        return ha.localeCompare(hb)
      }
      return new Date(b.created_at) - new Date(a.created_at)
    })

  const counts = {
    active: allCards.filter(c => c.trang_thai === 'active').length,
    het_buoi: allCards.filter(c => c.trang_thai === 'het_buoi').length,
    het_han: allCards.filter(c => c.trang_thai === 'het_han').length,
  }

  const handleDungBuoi = async (the) => {
    const kh = khMap[the.khach_hang_id]
    if (!window.confirm(`Dùng 1 buổi "${the.ten_dich_vu}" cho ${kh?.ho_ten}?`)) return
    const newDung = (the.so_buoi_da_dung || 0) + 1
    const newConLai = the.so_buoi_tong - newDung
    const { error } = await supabase.from('the_lieu_trinh')
      .update({ so_buoi_da_dung: newDung, trang_thai: newConLai <= 0 ? 'het_buoi' : 'active' })
      .eq('id', the.id)
    if (error) return showToast('❌ ' + error.message)
    await supabase.from('khach_hang').update({ lan_cuoi_den: todayISO() }).eq('id', the.khach_hang_id)
    showToast(`✅ Đã dùng 1 buổi · Còn ${newConLai} buổi`)
    onReload()
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: '6px', marginBottom: '14px', flexWrap: 'wrap' }}>
        {[
          ['active', `🎫 Đang dùng (${counts.active})`],
          ['het_buoi', `✅ Hết buổi (${counts.het_buoi})`],
          ['het_han', `⏰ Hết hạn (${counts.het_han})`],
          ['all', '📋 Tất cả'],
        ].map(([k, l]) => (
          <button key={k} onClick={() => setFilterTT(k)}
            style={{ padding: '6px 14px', borderRadius: '999px', border: 'none', cursor: 'pointer',
              fontWeight: '700', fontSize: '12px', boxShadow: COLORS.shadow,
              background: filterTT === k ? COLORS.primary : 'white',
              color: filterTT === k ? 'white' : COLORS.textSub }}>
            {l}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: COLORS.textMute }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>🎫</div>
            <div>Không có thẻ nào</div>
          </div>
        ) : filtered.map(c => {
          const kh = khMap[c.khach_hang_id]
          return (
            <div key={c.id}>
              <button onClick={() => setSelectedKH(kh)}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px',
                  background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '50%',
                  background: `${COLORS.primary}20`, display: 'flex', alignItems: 'center',
                  justifyContent: 'center', fontSize: '13px', fontWeight: '800', color: COLORS.primary }}>
                  {initials(kh?.ho_ten)}
                </div>
                <span style={{ fontSize: '13px', fontWeight: '700', color: COLORS.primary }}>
                  {kh?.ho_ten || '—'} · {kh?.so_dien_thoai}
                </span>
              </button>
              <TheLieuTrinhCard the={c}
                onDungBuoi={handleDungBuoi}
                onEdit={() => {}}
                onHuy={() => {}}
                compact
              />
            </div>
          )
        })}
      </div>

      {selectedKH && (
        <KhachHangModal kh={selectedKH} allCards={allCards}
          onClose={() => setSelectedKH(null)} onReload={onReload} showToast={showToast} />
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB 3: TÁI KHÁM (nhắc nhở)
// ══════════════════════════════════════════════════════════════════════════════
function TabTaiKham({ customers, allCards, onReload, showToast }) {
  const [selectedKH, setSelectedKH] = useState(null)
  const today = todayISO()

  const cardsByKH = {}
  allCards.forEach(c => {
    if (!cardsByKH[c.khach_hang_id]) cardsByKH[c.khach_hang_id] = []
    cardsByKH[c.khach_hang_id].push(c)
  })

  const activeKH = customers.filter(k => k.is_active)

  // Sắp hết buổi (active cards còn 1-2 buổi)
  const sapHetBuoi = allCards.filter(c => c.trang_thai === 'active' && c.so_buoi_con_lai <= 2 && c.so_buoi_con_lai > 0)
  const sapHetBuoiKH = [...new Set(sapHetBuoi.map(c => c.khach_hang_id))]
    .map(id => ({ kh: customers.find(k => k.id === id), cards: sapHetBuoi.filter(c => c.khach_hang_id === id) }))
    .filter(r => r.kh)

  // Sắp hết hạn (30 ngày tới)
  const sapHetHan = allCards.filter(c => {
    if (c.trang_thai !== 'active' || !c.ngay_het_han) return false
    const d = daysUntil(c.ngay_het_han)
    return d !== null && d >= 0 && d <= 30
  })
  const sapHetHanKH = [...new Set(sapHetHan.map(c => c.khach_hang_id))]
    .map(id => ({ kh: customers.find(k => k.id === id), cards: sapHetHan.filter(c => c.khach_hang_id === id) }))
    .filter(r => r.kh)

  // Chưa ghé lâu (> 30 ngày)
  const chuaGhe = activeKH
    .filter(kh => {
      const da = daysAgo(kh.lan_cuoi_den)
      return da !== null && da > 30
    })
    .sort((a, b) => daysAgo(b.lan_cuoi_den) - daysAgo(a.lan_cuoi_den))
    .slice(0, 20)

  const Section = ({ title, color, children, count }) => (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
        <div style={{ fontWeight: '800', fontSize: '14px', color: COLORS.text }}>{title}</div>
        {count > 0 && (
          <span style={{ background: color + '20', color, padding: '2px 8px',
            borderRadius: '999px', fontSize: '11px', fontWeight: '800' }}>
            {count}
          </span>
        )}
      </div>
      {children}
    </div>
  )

  const ReminderCard = ({ kh, sub, color }) => (
    <button onClick={() => setSelectedKH(kh)}
      style={{ width: '100%', background: 'white', borderRadius: '12px', padding: '12px 14px',
        border: `1px solid ${color}30`, boxShadow: COLORS.shadow,
        cursor: 'pointer', textAlign: 'left', display: 'flex', gap: '10px', alignItems: 'center',
        marginBottom: '8px' }}>
      <div style={{ width: '38px', height: '38px', borderRadius: '50%', flexShrink: 0,
        background: `${color}15`, display: 'flex', alignItems: 'center',
        justifyContent: 'center', fontSize: '17px', fontWeight: '800', color }}>
        {initials(kh.ho_ten)}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: '800', fontSize: '13px', color: COLORS.text }}>{kh.ho_ten}</div>
        <div style={{ fontSize: '11px', color: COLORS.textMute }}>{kh.so_dien_thoai}</div>
        <div style={{ fontSize: '12px', fontWeight: '700', color, marginTop: '3px' }}>{sub}</div>
      </div>
      <div style={{ fontSize: '16px', color: COLORS.textMute }}>›</div>
    </button>
  )

  const total = sapHetBuoiKH.length + sapHetHanKH.length + chuaGhe.length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {total === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: COLORS.textMute }}>
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>✨</div>
          <div style={{ fontWeight: '700', fontSize: '15px', color: COLORS.text }}>Tất cả đang tốt!</div>
          <div style={{ fontSize: '13px', marginTop: '4px' }}>Không có nhắc nhở nào lúc này</div>
        </div>
      ) : (
        <>
          {sapHetBuoiKH.length > 0 && (
            <Section title="⚠️ Sắp hết buổi" color="#E67E22" count={sapHetBuoiKH.length}>
              {sapHetBuoiKH.map(({ kh, cards }) => (
                <ReminderCard key={kh.id} kh={kh} color="#E67E22"
                  sub={cards.map(c => `${c.ten_dich_vu}: còn ${c.so_buoi_con_lai} buổi`).join(' · ')} />
              ))}
            </Section>
          )}

          {sapHetHanKH.length > 0 && (
            <Section title="⏰ Thẻ sắp hết hạn" color="#C0392B" count={sapHetHanKH.length}>
              {sapHetHanKH.map(({ kh, cards }) => (
                <ReminderCard key={kh.id} kh={kh} color="#C0392B"
                  sub={cards.map(c => `${c.ten_dich_vu}: còn ${daysUntil(c.ngay_het_han)} ngày`).join(' · ')} />
              ))}
            </Section>
          )}

          {chuaGhe.length > 0 && (
            <Section title="💤 Chưa ghé lâu (>30 ngày)" color="#8E44AD" count={chuaGhe.length}>
              {chuaGhe.map(kh => (
                <ReminderCard key={kh.id} kh={kh} color="#8E44AD"
                  sub={`Lần cuối: ${fmtDate(kh.lan_cuoi_den)} (${daysAgo(kh.lan_cuoi_den)} ngày trước)`} />
              ))}
            </Section>
          )}
        </>
      )}

      {selectedKH && (
        <KhachHangModal kh={selectedKH} allCards={allCards}
          onClose={() => setSelectedKH(null)} onReload={onReload} showToast={showToast} />
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════════════════════════════════════════
export default function AdminCRMPage() {
  const { user } = useAuth()
  const [tab, setTab]             = useState('khach-hang')
  const [customers, setCustomers] = useState([])
  const [allCards, setAllCards]   = useState([])
  const [loading, setLoading]     = useState(true)
  const [toast, setToast]         = useState('')

  const showToast = useCallback((msg) => {
    setToast(msg); setTimeout(() => setToast(''), 2800)
  }, [])

  const load = useCallback(async () => {
    const [{ data: kh }, { data: tlt }] = await Promise.all([
      supabase.from('khach_hang').select('*').order('created_at', { ascending: false }),
      supabase.from('the_lieu_trinh').select('*').order('created_at', { ascending: false }),
    ])
    setCustomers(kh || [])
    setAllCards(tlt || [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  // Stats
  const activeKH    = customers.filter(k => k.is_active)
  const activeCards  = allCards.filter(c => c.trang_thai === 'active')
  const sapHetBuoi  = allCards.filter(c => c.trang_thai === 'active' && c.so_buoi_con_lai <= 2)
  const sapHetHan   = allCards.filter(c => {
    if (c.trang_thai !== 'active' || !c.ngay_het_han) return false
    return daysUntil(c.ngay_het_han) !== null && daysUntil(c.ngay_het_han) <= 14
  })

  const tongDoanhThuThe = allCards.reduce((s, c) => s + (c.gia_tri_the || 0), 0)

  const TABS = [
    { key: 'khach-hang', icon: '👥', label: 'Khách Hàng' },
    { key: 'the',        icon: '🎫', label: 'Thẻ Liệu Trình' },
    { key: 'tai-kham',   icon: '🔔', label: 'Tái Khám',
      badge: sapHetBuoi.length + sapHetHan.length },
  ]

  return (
    <div style={{ minHeight: '100vh', background: COLORS.bg,
      fontFamily: "'Inter','Segoe UI',sans-serif", paddingBottom: '48px' }}>
      {/* Header */}
      <div style={{ background: COLORS.grad, padding: '44px 20px 20px' }}>
        <button onClick={() => window.location.href = '/admin'}
          style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white',
            padding: '6px 14px', borderRadius: '8px', cursor: 'pointer',
            fontSize: '13px', fontWeight: '700', marginBottom: '12px' }}>
          ← Admin
        </button>
        <div style={{ color: 'white', fontWeight: '800', fontSize: '22px' }}>👥 CRM Khách Hàng</div>
        <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '13px', marginTop: '4px' }}>
          Hồ sơ · Thẻ liệu trình · Nhắc tái khám
        </div>

        {/* Quick stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginTop: '16px' }}>
          {[
            { label: 'Khách hàng', val: activeKH.length, icon: '👥', color: '#C9A96E' },
            { label: 'Thẻ active',  val: activeCards.length, icon: '🎫', color: '#7EB8D4' },
            { label: 'Sắp hết buổi', val: sapHetBuoi.length, icon: '⚠️', color: '#F4A460' },
            { label: 'GT thẻ', val: tongDoanhThuThe >= 1e6 ? `${(tongDoanhThuThe/1e6).toFixed(0)}M` : fmt(tongDoanhThuThe).replace('đ',''), icon: '💰', color: '#6FCF8E' },
          ].map(s => (
            <div key={s.label} style={{ background: 'rgba(255,255,255,0.12)',
              borderRadius: '12px', padding: '10px 6px', textAlign: 'center' }}>
              <div style={{ fontSize: '14px' }}>{s.icon}</div>
              <div style={{ fontWeight: '800', fontSize: '14px', color: s.color, marginTop: '2px' }}>{s.val}</div>
              <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)', marginTop: '1px',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tab bar */}
      <div style={{ background: 'white', borderBottom: `1px solid ${COLORS.border}`,
        display: 'flex', overflowX: 'auto', padding: '0 12px' }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{ padding: '13px 16px', border: 'none', background: 'none', cursor: 'pointer',
              fontWeight: tab === t.key ? '800' : '600', fontSize: '13px', whiteSpace: 'nowrap',
              color: tab === t.key ? COLORS.primary : COLORS.textMute,
              borderBottom: tab === t.key ? `2.5px solid ${COLORS.primary}` : '2.5px solid transparent',
              position: 'relative', transition: 'all .2s' }}>
            {t.icon} {t.label}
            {t.badge > 0 && (
              <span style={{ position: 'absolute', top: '8px', right: '4px',
                background: '#C0392B', color: 'white', borderRadius: '999px',
                fontSize: '10px', fontWeight: '800', padding: '1px 5px', minWidth: '16px' }}>
                {t.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ padding: '20px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px', color: COLORS.textMute }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>👥</div>
            <div>Đang tải dữ liệu...</div>
          </div>
        ) : (
          <>
            {tab === 'khach-hang' && (
              <TabKhachHang customers={customers} allCards={allCards}
                onReload={load} showToast={showToast} />
            )}
            {tab === 'the' && (
              <TabTheLieuTrinh allCards={allCards} customers={customers}
                onReload={load} showToast={showToast} />
            )}
            {tab === 'tai-kham' && (
              <TabTaiKham customers={customers} allCards={allCards}
                onReload={load} showToast={showToast} />
            )}
          </>
        )}
      </div>

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
