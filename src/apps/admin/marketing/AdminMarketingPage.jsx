import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../../lib/supabase'
import { COLORS } from '../../../constants/colors'

// ── Helpers ────────────────────────────────────────────────────────────────────
function fmt(n) {
  if (!n && n !== 0) return '—'
  return new Intl.NumberFormat('vi-VN').format(n) + 'đ'
}
function fmtShort(n) {
  if (!n) return '0'
  if (n >= 1e6) return (n / 1e6).toFixed(1).replace('.0', '') + 'M'
  if (n >= 1e3) return (n / 1e3).toFixed(0) + 'K'
  return String(n)
}
function fmtDate(iso) {
  if (!iso) return '—'
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
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

// ── Constants ──────────────────────────────────────────────────────────────────
const KENH = {
  facebook: { label: 'Facebook',  icon: '📘', color: '#1877F2', bg: '#E8F0FE' },
  zalo:     { label: 'Zalo',      icon: '💬', color: '#0068FF', bg: '#E6F0FF' },
  tiktok:   { label: 'TikTok',    icon: '🎵', color: '#010101', bg: '#F0F0F0' },
  google:   { label: 'Google',    icon: '🔍', color: '#EA4335', bg: '#FDECEA' },
  in_an:    { label: 'In Ấn',     icon: '🖨️', color: '#8E44AD', bg: '#F5F0FF' },
  khac:     { label: 'Khác',      icon: '📢', color: '#7F8C8D', bg: '#F0F4F8' },
}

const TRANG_THAI = {
  draft:   { label: 'Nháp',      color: '#B8A898', bg: '#F5F2EF' },
  active:  { label: 'Đang chạy', color: '#2D7A4F', bg: '#E8F5E9' },
  ended:   { label: 'Đã kết thúc', color: '#1A5276', bg: '#EBF5FB' },
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
// FORM CHIẾN DỊCH
// ══════════════════════════════════════════════════════════════════════════════
function FormChienDich({ initial, khuyenMaiList, onSave, onClose }) {
  const isEdit = !!initial?.id
  const [f, setF] = useState({
    ten:                initial?.ten || '',
    kenh:               initial?.kenh || 'facebook',
    ngan_sach:          initial?.ngan_sach || '',
    ngay_bat_dau:       initial?.ngay_bat_dau || todayISO(),
    ngay_ket_thuc:      initial?.ngay_ket_thuc || '',
    trang_thai:         initial?.trang_thai || 'active',
    mo_ta:              initial?.mo_ta || '',
    khuyen_mai_id:      initial?.khuyen_mai_id || '',
    so_luot_tiep_can:   initial?.so_luot_tiep_can || '',
    so_kh_moi:          initial?.so_kh_moi || '',
    doanh_thu_uoc_tinh: initial?.doanh_thu_uoc_tinh || '',
    ghi_chu:            initial?.ghi_chu || '',
  })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const set = (k, v) => setF(p => ({ ...p, [k]: v }))

  const handleSave = async () => {
    if (!f.ten.trim()) return setErr('Nhập tên chiến dịch')
    setSaving(true); setErr('')
    const payload = {
      ten: f.ten.trim(), kenh: f.kenh,
      ngan_sach: +f.ngan_sach || 0,
      ngay_bat_dau: f.ngay_bat_dau,
      ngay_ket_thuc: f.ngay_ket_thuc || null,
      trang_thai: f.trang_thai,
      mo_ta: f.mo_ta.trim(),
      khuyen_mai_id: f.khuyen_mai_id || null,
      so_luot_tiep_can: +f.so_luot_tiep_can || 0,
      so_kh_moi: +f.so_kh_moi || 0,
      doanh_thu_uoc_tinh: +f.doanh_thu_uoc_tinh || 0,
      ghi_chu: f.ghi_chu.trim(),
    }
    let error
    if (isEdit) {
      ;({ error } = await supabase.from('chien_dich_marketing').update(payload).eq('id', initial.id))
    } else {
      ;({ error } = await supabase.from('chien_dich_marketing').insert(payload))
    }
    setSaving(false)
    if (error) return setErr(error.message)
    onSave()
  }

  const selKenh = KENH[f.kenh]

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(26,18,9,0.6)', zIndex: 300,
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div style={{ background: 'white', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: '520px',
        maxHeight: '92vh', overflow: 'auto', boxShadow: '0 -8px 40px rgba(0,0,0,0.25)' }}>
        <div style={{ background: COLORS.grad, padding: '18px 20px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          borderRadius: '20px 20px 0 0', position: 'sticky', top: 0, zIndex: 1 }}>
          <div style={{ color: 'white', fontWeight: '800', fontSize: '16px' }}>
            {isEdit ? '✏️ Sửa chiến dịch' : '📣 Tạo chiến dịch'}
          </div>
          <button onClick={onClose}
            style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white',
              width: '30px', height: '30px', borderRadius: '50%', cursor: 'pointer', fontSize: '14px' }}>✕</button>
        </div>

        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Kênh */}
          <div>
            <label style={lbl}>KÊNH MARKETING</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
              {Object.entries(KENH).map(([k, v]) => (
                <button key={k} onClick={() => set('kenh', k)}
                  style={{ padding: '10px 6px', borderRadius: '10px', border: 'none',
                    cursor: 'pointer', fontWeight: '700', fontSize: '12px', textAlign: 'center',
                    background: f.kenh === k ? v.color : v.bg,
                    color: f.kenh === k ? 'white' : v.color }}>
                  {v.icon} {v.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label style={lbl}>TÊN CHIẾN DỊCH *</label>
            <input style={inp} value={f.ten} onChange={e => set('ten', e.target.value)}
              placeholder={`VD: ${selKenh.label} Ads tháng 5`} autoFocus />
          </div>

          {/* Trạng thái */}
          <div>
            <label style={lbl}>TRẠNG THÁI</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              {Object.entries(TRANG_THAI).map(([k, v]) => (
                <button key={k} onClick={() => set('trang_thai', k)}
                  style={{ flex: 1, padding: '9px', borderRadius: '9px', border: 'none',
                    cursor: 'pointer', fontWeight: '700', fontSize: '12px',
                    background: f.trang_thai === k ? v.color : v.bg,
                    color: f.trang_thai === k ? 'white' : v.color }}>
                  {v.label}
                </button>
              ))}
            </div>
          </div>

          {/* Ngân sách + link KM */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={lbl}>NGÂN SÁCH (đ)</label>
              <input style={inp} type="number" value={f.ngan_sach}
                onChange={e => set('ngan_sach', e.target.value)} placeholder="2,000,000" />
            </div>
            <div>
              <label style={lbl}>LINK KHUYẾN MÃI</label>
              <select style={inp} value={f.khuyen_mai_id} onChange={e => set('khuyen_mai_id', e.target.value)}>
                <option value="">— Không link —</option>
                {khuyenMaiList.map(km => (
                  <option key={km.id} value={km.id}>{km.ten}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Thời gian */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={lbl}>NGÀY BẮT ĐẦU</label>
              <input style={inp} type="date" value={f.ngay_bat_dau}
                onChange={e => set('ngay_bat_dau', e.target.value)} />
            </div>
            <div>
              <label style={lbl}>NGÀY KẾT THÚC</label>
              <input style={inp} type="date" value={f.ngay_ket_thuc}
                onChange={e => set('ngay_ket_thuc', e.target.value)} />
            </div>
          </div>

          <div>
            <label style={lbl}>MÔ TẢ / MỤC TIÊU</label>
            <textarea style={{ ...inp, height: '60px', resize: 'vertical' }}
              value={f.mo_ta} onChange={e => set('mo_ta', e.target.value)}
              placeholder="Mục tiêu, nội dung quảng cáo, target audience..." />
          </div>

          {/* KPIs */}
          <div style={{ background: '#F0F7FF', borderRadius: '12px', padding: '14px',
            border: '1px solid #BBDEFB' }}>
            <div style={{ fontWeight: '800', fontSize: '12px', color: '#1A5276', marginBottom: '10px' }}>
              📊 KPIs thực tế (cập nhật sau khi chạy)
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
              <div>
                <label style={{ ...lbl, color: '#1A5276' }}>REACH</label>
                <input style={inp} type="number" value={f.so_luot_tiep_can}
                  onChange={e => set('so_luot_tiep_can', e.target.value)} placeholder="0" />
              </div>
              <div>
                <label style={{ ...lbl, color: '#1A5276' }}>KH MỚI</label>
                <input style={inp} type="number" value={f.so_kh_moi}
                  onChange={e => set('so_kh_moi', e.target.value)} placeholder="0" />
              </div>
              <div>
                <label style={{ ...lbl, color: '#1A5276' }}>DT ƯỚC TÍNH</label>
                <input style={inp} type="number" value={f.doanh_thu_uoc_tinh}
                  onChange={e => set('doanh_thu_uoc_tinh', e.target.value)} placeholder="0" />
              </div>
            </div>
          </div>

          <div>
            <label style={lbl}>GHI CHÚ</label>
            <input style={inp} value={f.ghi_chu} onChange={e => set('ghi_chu', e.target.value)}
              placeholder="Ghi chú thêm..." />
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
              {saving ? 'Đang lưu...' : isEdit ? '💾 Lưu' : '📣 Tạo chiến dịch'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB 1: DASHBOARD
// ══════════════════════════════════════════════════════════════════════════════
function TabDashboard({ campaigns, chiPhiMarketing, danhMucMarketing }) {
  const nowVN = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }))
  const [month, setMonth] = useState(nowVN.getMonth() + 1)
  const [year,  setYear]  = useState(nowVN.getFullYear())

  const prevMonth = () => { if (month === 1) { setMonth(12); setYear(y => y - 1) } else setMonth(m => m - 1) }
  const nextMonth = () => { if (month === 12) { setMonth(1); setYear(y => y + 1) } else setMonth(m => m + 1) }

  const { from, to } = monthRange(year, month)

  // Chi phí marketing trong tháng từ chi_phi
  const chiThang = chiPhiMarketing.filter(c => c.ngay >= from && c.ngay <= to)
  const tongChi  = chiThang.reduce((s, c) => s + (c.so_tien || 0), 0)

  // Nhóm chi theo danh_muc
  const dmMap = Object.fromEntries((danhMucMarketing || []).map(d => [d.id, d]))
  const chiByDM = {}
  chiThang.forEach(c => {
    const k = c.danh_muc_id
    if (!chiByDM[k]) chiByDM[k] = 0
    chiByDM[k] += c.so_tien || 0
  })

  // Kênh → danh mục mapping (theo tên)
  const kenhDMMap = {}
  ;(danhMucMarketing || []).forEach(d => {
    const name = d.ten.toLowerCase()
    if (name.includes('facebook')) kenhDMMap.facebook = d.id
    else if (name.includes('zalo')) kenhDMMap.zalo = d.id
    else if (name.includes('tiktok') || name.includes('tik tok')) kenhDMMap.tiktok = d.id
    else if (name.includes('in ấn') || name.includes('in an')) kenhDMMap.in_an = d.id
    else if (name.includes('google')) kenhDMMap.google = d.id
  })

  // Chi theo kênh trong tháng
  const chiByKenh = {}
  Object.entries(kenhDMMap).forEach(([kenh, dmId]) => {
    chiByKenh[kenh] = chiByDM[dmId] || 0
  })
  const tongChiKhac = tongChi - Object.values(chiByKenh).reduce((s, v) => s + v, 0)
  if (tongChiKhac > 0) chiByKenh['khac'] = tongChiKhac

  // Chiến dịch trong tháng
  const cdThang = campaigns.filter(cd =>
    cd.ngay_bat_dau <= to && (!cd.ngay_ket_thuc || cd.ngay_ket_thuc >= from)
  )
  const tongDTUocTinh = cdThang.reduce((s, c) => s + (c.doanh_thu_uoc_tinh || 0), 0)
  const tongKHMoi = cdThang.reduce((s, c) => s + (c.so_kh_moi || 0), 0)
  const roi = tongChi > 0 ? Math.round(((tongDTUocTinh - tongChi) / tongChi) * 100) : null

  const maxChi = Math.max(...Object.values(chiByKenh), 1)

  // Lịch sử 6 tháng
  const last6 = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(year, month - 1 - i, 1)
    return { m: d.getMonth() + 1, y: d.getFullYear() }
  }).reverse()

  const chiByMonth = {}
  last6.forEach(({ m, y }) => {
    const { from: f, to: t } = monthRange(y, m)
    chiByMonth[`${y}-${m}`] = chiPhiMarketing
      .filter(c => c.ngay >= f && c.ngay <= t)
      .reduce((s, c) => s + (c.so_tien || 0), 0)
  })
  const maxMonthly = Math.max(...Object.values(chiByMonth), 1)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Month picker */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', justifyContent: 'center' }}>
        <button onClick={prevMonth}
          style={{ width: '36px', height: '36px', borderRadius: '50%', border: `1px solid ${COLORS.border}`,
            background: 'white', cursor: 'pointer', fontSize: '16px', color: COLORS.textSub }}>
          ‹
        </button>
        <div style={{ textAlign: 'center', minWidth: '130px' }}>
          <div style={{ fontWeight: '800', fontSize: '17px', color: COLORS.text }}>Tháng {month}/{year}</div>
        </div>
        <button onClick={nextMonth}
          style={{ width: '36px', height: '36px', borderRadius: '50%', border: `1px solid ${COLORS.border}`,
            background: 'white', cursor: 'pointer', fontSize: '16px', color: COLORS.textSub }}>
          ›
        </button>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
        {[
          { label: 'Chi marketing', val: fmt(tongChi), icon: '💸', color: '#C0392B', bg: '#FDECEA' },
          { label: 'DT ước tính', val: fmt(tongDTUocTinh), icon: '📈', color: '#2D7A4F', bg: '#E8F5E9' },
          { label: 'KH mới',  val: tongKHMoi + ' người', icon: '👥', color: '#1A5276', bg: '#EBF5FB' },
          { label: 'ROI ước tính', val: roi !== null ? `${roi > 0 ? '+' : ''}${roi}%` : '—',
            icon: '🎯', color: roi !== null && roi > 0 ? '#2D7A4F' : '#C0392B',
            bg: roi !== null && roi > 0 ? '#E8F5E9' : '#FDECEA' },
        ].map(s => (
          <div key={s.label} style={{ background: s.bg, borderRadius: '14px', padding: '14px 16px',
            border: `1px solid ${s.color}20` }}>
            <div style={{ fontSize: '18px', marginBottom: '4px' }}>{s.icon}</div>
            <div style={{ fontWeight: '800', fontSize: '20px', color: s.color }}>{s.val}</div>
            <div style={{ fontSize: '11px', color: COLORS.textMute, marginTop: '2px' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Chi theo kênh */}
      {tongChi > 0 && (
        <div style={{ background: 'white', borderRadius: '16px', padding: '16px',
          border: `1px solid ${COLORS.border}`, boxShadow: COLORS.shadow }}>
          <div style={{ fontWeight: '800', fontSize: '13px', color: COLORS.text, marginBottom: '14px' }}>
            Chi phí theo kênh — Tháng {month}/{year}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {Object.entries(chiByKenh)
              .filter(([, v]) => v > 0)
              .sort(([, a], [, b]) => b - a)
              .map(([kenh, val]) => {
                const k = KENH[kenh] || KENH.khac
                const pct = (val / maxChi) * 100
                return (
                  <div key={kenh}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                      <span style={{ fontSize: '13px', fontWeight: '700', color: COLORS.text }}>
                        {k.icon} {k.label}
                      </span>
                      <span style={{ fontSize: '13px', fontWeight: '800', color: k.color }}>
                        {fmt(val)}
                        <span style={{ fontWeight: '400', color: COLORS.textMute, fontSize: '11px',
                          marginLeft: '4px' }}>
                          ({Math.round((val / tongChi) * 100)}%)
                        </span>
                      </span>
                    </div>
                    <div style={{ height: '8px', background: '#F5F2EF', borderRadius: '4px' }}>
                      <div style={{ height: '100%', borderRadius: '4px', background: k.color,
                        width: `${pct}%`, transition: 'width .4s' }} />
                    </div>
                  </div>
                )
              })}
          </div>
        </div>
      )}

      {/* Biểu đồ 6 tháng */}
      <div style={{ background: 'white', borderRadius: '16px', padding: '16px',
        border: `1px solid ${COLORS.border}`, boxShadow: COLORS.shadow }}>
        <div style={{ fontWeight: '800', fontSize: '13px', color: COLORS.text, marginBottom: '14px' }}>
          Chi marketing 6 tháng gần đây
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', height: '100px' }}>
          {last6.map(({ m, y }) => {
            const key = `${y}-${m}`
            const val = chiByMonth[key] || 0
            const pct = maxMonthly > 0 ? (val / maxMonthly) * 100 : 0
            const isCurrentMonth = m === month && y === year
            return (
              <div key={key} style={{ flex: 1, display: 'flex', flexDirection: 'column',
                alignItems: 'center', gap: '4px' }}>
                <div style={{ fontSize: '10px', color: COLORS.textMute, fontWeight: '700' }}>
                  {val > 0 ? fmtShort(val) : ''}
                </div>
                <div style={{ width: '100%', background: isCurrentMonth ? COLORS.primary : `${COLORS.primary}40`,
                  borderRadius: '4px 4px 0 0', transition: 'height .4s',
                  height: `${Math.max(4, pct)}%` }} />
                <div style={{ fontSize: '10px', color: isCurrentMonth ? COLORS.primary : COLORS.textMute,
                  fontWeight: isCurrentMonth ? '800' : '600' }}>
                  {m}/{y.toString().slice(2)}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Chiến dịch trong tháng */}
      {cdThang.length > 0 && (
        <div>
          <div style={{ fontWeight: '800', fontSize: '13px', color: COLORS.text, marginBottom: '10px' }}>
            Chiến dịch trong tháng ({cdThang.length})
          </div>
          {cdThang.map(cd => {
            const k = KENH[cd.kenh] || KENH.khac
            const tt = TRANG_THAI[cd.trang_thai] || {}
            const roiCd = cd.ngan_sach > 0 && cd.doanh_thu_uoc_tinh > 0
              ? Math.round(((cd.doanh_thu_uoc_tinh - cd.ngan_sach) / cd.ngan_sach) * 100) : null
            return (
              <div key={cd.id} style={{ background: 'white', borderRadius: '12px', padding: '12px 14px',
                border: `1px solid ${COLORS.border}`, boxShadow: COLORS.shadow, marginBottom: '8px' }}>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '10px',
                    background: k.bg, display: 'flex', alignItems: 'center',
                    justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}>
                    {k.icon}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '800', fontSize: '13px', color: COLORS.text }}>{cd.ten}</div>
                    <div style={{ fontSize: '11px', color: COLORS.textMute }}>
                      {fmtDate(cd.ngay_bat_dau)} → {cd.ngay_ket_thuc ? fmtDate(cd.ngay_ket_thuc) : 'đang chạy'}
                    </div>
                  </div>
                  <span style={{ fontSize: '11px', fontWeight: '800', padding: '3px 8px',
                    borderRadius: '999px', background: tt.bg, color: tt.color, flexShrink: 0 }}>
                    {tt.label}
                  </span>
                </div>
                {(cd.ngan_sach > 0 || cd.so_kh_moi > 0) && (
                  <div style={{ display: 'flex', gap: '8px', marginTop: '8px', flexWrap: 'wrap' }}>
                    {cd.ngan_sach > 0 && (
                      <span style={{ fontSize: '11px', background: '#FDECEA', color: '#C0392B',
                        padding: '2px 8px', borderRadius: '999px', fontWeight: '700' }}>
                        💸 {fmt(cd.ngan_sach)}
                      </span>
                    )}
                    {cd.so_kh_moi > 0 && (
                      <span style={{ fontSize: '11px', background: '#EBF5FB', color: '#1A5276',
                        padding: '2px 8px', borderRadius: '999px', fontWeight: '700' }}>
                        👥 {cd.so_kh_moi} KH mới
                      </span>
                    )}
                    {roiCd !== null && (
                      <span style={{ fontSize: '11px', fontWeight: '700', padding: '2px 8px',
                        borderRadius: '999px',
                        background: roiCd >= 0 ? '#E8F5E9' : '#FDECEA',
                        color: roiCd >= 0 ? '#2D7A4F' : '#C0392B' }}>
                        ROI {roiCd >= 0 ? '+' : ''}{roiCd}%
                      </span>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB 2: CHIẾN DỊCH
// ══════════════════════════════════════════════════════════════════════════════
function TabChienDich({ campaigns, khuyenMaiList, onReload, showToast }) {
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing]   = useState(null)
  const [filterTT, setFilterTT] = useState('all')
  const [filterKenh, setFilterKenh] = useState('all')
  const [search, setSearch]     = useState('')

  const filtered = campaigns
    .filter(cd => {
      if (filterTT !== 'all' && cd.trang_thai !== filterTT) return false
      if (filterKenh !== 'all' && cd.kenh !== filterKenh) return false
      if (search && !cd.ten.toLowerCase().includes(search.toLowerCase())) return false
      return true
    })
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

  const handleDelete = async (cd) => {
    if (!window.confirm(`Xóa chiến dịch "${cd.ten}"?`)) return
    const { error } = await supabase.from('chien_dich_marketing').delete().eq('id', cd.id)
    if (error) return showToast('❌ ' + error.message)
    showToast('🗑 Đã xóa chiến dịch')
    onReload()
  }

  const kmMap = Object.fromEntries(khuyenMaiList.map(k => [k.id, k]))

  return (
    <div>
      {/* Toolbar */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
        <input style={{ ...inp, flex: 1, padding: '9px 14px' }}
          placeholder="🔍 Tìm chiến dịch..." value={search}
          onChange={e => setSearch(e.target.value)} />
        <button onClick={() => { setEditing(null); setShowForm(true) }}
          style={{ padding: '9px 18px', background: COLORS.grad, color: 'white', border: 'none',
            borderRadius: '10px', fontWeight: '800', fontSize: '13px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
          + Tạo
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '8px', flexWrap: 'wrap' }}>
        {[['all','Tất cả'], ...Object.entries(TRANG_THAI).map(([k,v]) => [k,v.label])].map(([k,l]) => (
          <button key={k} onClick={() => setFilterTT(k)}
            style={{ padding: '5px 12px', borderRadius: '999px', border: 'none', cursor: 'pointer',
              fontWeight: '700', fontSize: '12px', boxShadow: COLORS.shadow,
              background: filterTT === k ? COLORS.primary : 'white',
              color: filterTT === k ? 'white' : COLORS.textSub }}>
            {l}
          </button>
        ))}
      </div>
      <div style={{ display: 'flex', gap: '6px', marginBottom: '14px', flexWrap: 'wrap' }}>
        <button onClick={() => setFilterKenh('all')}
          style={{ padding: '4px 10px', borderRadius: '999px', border: 'none', cursor: 'pointer',
            fontWeight: '700', fontSize: '11px',
            background: filterKenh === 'all' ? COLORS.primary : 'white',
            color: filterKenh === 'all' ? 'white' : COLORS.textSub, boxShadow: COLORS.shadow }}>
          📢 Tất cả kênh
        </button>
        {Object.entries(KENH).map(([k, v]) => (
          <button key={k} onClick={() => setFilterKenh(k)}
            style={{ padding: '4px 10px', borderRadius: '999px', border: 'none', cursor: 'pointer',
              fontWeight: '700', fontSize: '11px',
              background: filterKenh === k ? v.color : v.bg,
              color: filterKenh === k ? 'white' : v.color, boxShadow: COLORS.shadow }}>
            {v.icon} {v.label}
          </button>
        ))}
      </div>

      <div style={{ fontSize: '12px', color: COLORS.textMute, marginBottom: '10px' }}>
        {filtered.length} chiến dịch
      </div>

      {/* List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: COLORS.textMute }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>📣</div>
            <div>Chưa có chiến dịch nào</div>
          </div>
        ) : filtered.map(cd => {
          const k  = KENH[cd.kenh] || KENH.khac
          const tt = TRANG_THAI[cd.trang_thai] || {}
          const km = cd.khuyen_mai_id ? kmMap[cd.khuyen_mai_id] : null
          const roiCd = cd.ngan_sach > 0 && cd.doanh_thu_uoc_tinh > 0
            ? Math.round(((cd.doanh_thu_uoc_tinh - cd.ngan_sach) / cd.ngan_sach) * 100) : null

          return (
            <div key={cd.id} style={{ background: 'white', borderRadius: '14px', padding: '16px',
              border: `1px solid ${cd.trang_thai === 'active' ? k.color + '40' : COLORS.border}`,
              boxShadow: COLORS.shadow }}>
              {/* Header */}
              <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                <div style={{ width: '42px', height: '42px', borderRadius: '12px', flexShrink: 0,
                  background: k.bg, display: 'flex', alignItems: 'center',
                  justifyContent: 'center', fontSize: '20px' }}>
                  {k.icon}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: '800', fontSize: '14px', color: COLORS.text }}>{cd.ten}</div>
                  <div style={{ fontSize: '11px', color: COLORS.textMute, marginTop: '2px' }}>
                    {k.label} · {fmtDate(cd.ngay_bat_dau)}
                    {cd.ngay_ket_thuc && ` → ${fmtDate(cd.ngay_ket_thuc)}`}
                  </div>
                  {km && (
                    <div style={{ fontSize: '11px', color: '#8E44AD', marginTop: '2px' }}>
                      🏷️ Link KM: {km.ten}
                    </div>
                  )}
                </div>
                <span style={{ fontSize: '11px', fontWeight: '800', padding: '3px 8px',
                  borderRadius: '999px', background: tt.bg, color: tt.color, flexShrink: 0 }}>
                  {tt.label}
                </span>
              </div>

              {/* KPIs */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginTop: '12px' }}>
                {[
                  { label: 'Ngân sách', val: cd.ngan_sach > 0 ? fmt(cd.ngan_sach) : '—', color: '#C0392B' },
                  { label: 'DT ước tính', val: cd.doanh_thu_uoc_tinh > 0 ? fmt(cd.doanh_thu_uoc_tinh) : '—', color: '#2D7A4F' },
                  { label: 'KH mới', val: cd.so_kh_moi || '—', color: '#1A5276' },
                  { label: 'ROI', val: roiCd !== null ? `${roiCd >= 0 ? '+' : ''}${roiCd}%` : '—',
                    color: roiCd !== null ? (roiCd >= 0 ? '#2D7A4F' : '#C0392B') : COLORS.textMute },
                ].map(s => (
                  <div key={s.label} style={{ background: COLORS.bg, borderRadius: '8px',
                    padding: '8px', textAlign: 'center' }}>
                    <div style={{ fontSize: '13px', fontWeight: '800', color: s.color }}>{s.val}</div>
                    <div style={{ fontSize: '10px', color: COLORS.textMute, marginTop: '1px' }}>{s.label}</div>
                  </div>
                ))}
              </div>

              {cd.mo_ta && (
                <div style={{ fontSize: '12px', color: COLORS.textMute, marginTop: '8px',
                  fontStyle: 'italic' }}>
                  📝 {cd.mo_ta}
                </div>
              )}

              {/* Actions */}
              <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                <button onClick={() => { setEditing(cd); setShowForm(true) }}
                  style={{ flex: 1, padding: '8px', background: COLORS.bg, border: `1px solid ${COLORS.border}`,
                    borderRadius: '8px', fontWeight: '700', fontSize: '12px', cursor: 'pointer', color: COLORS.text }}>
                  ✏️ Sửa
                </button>
                <button onClick={() => handleDelete(cd)}
                  style={{ padding: '8px 12px', background: '#FDECEA', border: '1px solid #FADBD8',
                    borderRadius: '8px', fontWeight: '700', fontSize: '12px', cursor: 'pointer', color: '#C0392B' }}>
                  🗑
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {showForm && (
        <FormChienDich
          initial={editing}
          khuyenMaiList={khuyenMaiList}
          onSave={() => { setShowForm(false); onReload(); showToast('✅ Đã lưu chiến dịch!') }}
          onClose={() => setShowForm(false)}
        />
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB 3: CHI PHÍ MARKETING
// ══════════════════════════════════════════════════════════════════════════════
function TabChiPhi({ chiPhiMarketing, danhMucMarketing }) {
  const nowVN = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }))
  const [month, setMonth] = useState(nowVN.getMonth() + 1)
  const [year,  setYear]  = useState(nowVN.getFullYear())

  const prevMonth = () => { if (month === 1) { setMonth(12); setYear(y => y - 1) } else setMonth(m => m - 1) }
  const nextMonth = () => { if (month === 12) { setMonth(1); setYear(y => y + 1) } else setMonth(m => m + 1) }

  const { from, to } = monthRange(year, month)
  const dmMap = Object.fromEntries((danhMucMarketing || []).map(d => [d.id, d]))

  const filtered = chiPhiMarketing
    .filter(c => c.ngay >= from && c.ngay <= to)
    .sort((a, b) => b.ngay.localeCompare(a.ngay) || new Date(b.created_at) - new Date(a.created_at))

  const tong = filtered.reduce((s, c) => s + (c.so_tien || 0), 0)

  const kenhLabel = (dmId) => {
    const dm = dmMap[dmId]
    if (!dm) return { label: 'Khác', icon: '📢', color: KENH.khac.color }
    const name = dm.ten.toLowerCase()
    if (name.includes('facebook')) return { label: 'Facebook', icon: '📘', color: '#1877F2' }
    if (name.includes('zalo'))     return { label: 'Zalo', icon: '💬', color: '#0068FF' }
    if (name.includes('tiktok'))   return { label: 'TikTok', icon: '🎵', color: '#010101' }
    if (name.includes('in ấn') || name.includes('in an')) return { label: 'In Ấn', icon: '🖨️', color: '#8E44AD' }
    if (name.includes('google'))   return { label: 'Google', icon: '🔍', color: '#EA4335' }
    return { label: dm.ten, icon: '📢', color: KENH.khac.color }
  }

  return (
    <div>
      {/* Month picker */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', justifyContent: 'center', marginBottom: '16px' }}>
        <button onClick={prevMonth}
          style={{ width: '36px', height: '36px', borderRadius: '50%', border: `1px solid ${COLORS.border}`,
            background: 'white', cursor: 'pointer', fontSize: '16px' }}>‹</button>
        <div style={{ fontWeight: '800', fontSize: '17px', color: COLORS.text, minWidth: '140px', textAlign: 'center' }}>
          Tháng {month}/{year}
        </div>
        <button onClick={nextMonth}
          style={{ width: '36px', height: '36px', borderRadius: '50%', border: `1px solid ${COLORS.border}`,
            background: 'white', cursor: 'pointer', fontSize: '16px' }}>›</button>
      </div>

      {/* Tổng */}
      <div style={{ background: '#FDECEA', borderRadius: '12px', padding: '14px 16px',
        border: '1px solid #FADBD8', marginBottom: '16px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontWeight: '700', fontSize: '13px', color: COLORS.text }}>
          Tổng chi marketing tháng {month}/{year}
        </span>
        <span style={{ fontWeight: '800', fontSize: '20px', color: '#C0392B' }}>{fmt(tong)}</span>
      </div>

      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: COLORS.textMute }}>
          <div style={{ fontSize: '32px', marginBottom: '8px' }}>💸</div>
          <div>Không có chi phí marketing nào trong tháng {month}/{year}</div>
          <div style={{ fontSize: '12px', marginTop: '8px' }}>
            Nhập chi phí marketing từ Tab Thu Chi → Nhập Chi Phí
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {filtered.map(c => {
            const kl = kenhLabel(c.danh_muc_id)
            return (
              <div key={c.id} style={{ background: 'white', borderRadius: '12px', padding: '12px 14px',
                border: `1px solid ${COLORS.border}`, display: 'flex', gap: '10px', alignItems: 'center' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '9px', flexShrink: 0,
                  background: kl.color + '15',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>
                  {kl.icon}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: '700', fontSize: '13px', color: COLORS.text }}>
                    {kl.label}
                  </div>
                  <div style={{ fontSize: '11px', color: COLORS.textMute }}>
                    {fmtDate(c.ngay)}
                    {c.dien_giai ? ` · ${c.dien_giai}` : ''}
                  </div>
                </div>
                <div style={{ fontWeight: '800', fontSize: '14px', color: '#C0392B', flexShrink: 0 }}>
                  {fmt(c.so_tien)}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════════════════════════════════════════
export default function AdminMarketingPage() {
  const [tab, setTab]                     = useState('dashboard')
  const [campaigns, setCampaigns]         = useState([])
  const [khuyenMaiList, setKhuyenMaiList] = useState([])
  const [chiPhiMarketing, setChiPhi]      = useState([])
  const [danhMucMarketing, setDanhMuc]    = useState([])
  const [loading, setLoading]             = useState(true)
  const [toast, setToast]                 = useState('')

  const showToast = useCallback((msg) => {
    setToast(msg); setTimeout(() => setToast(''), 2800)
  }, [])

  const load = useCallback(async () => {
    // Load danh_muc Marketing (parent có tên Marketing)
    const { data: allDM } = await supabase
      .from('danh_muc_chi_phi').select('id,ten,parent_id').eq('is_active', true)

    const marketingParent = allDM?.find(d => d.ten.toLowerCase().includes('marketing') && !d.parent_id)
    const mktDMIds = allDM?.filter(d => d.parent_id === marketingParent?.id).map(d => d.id) || []

    const [{ data: cd }, { data: km }, { data: cp }] = await Promise.all([
      supabase.from('chien_dich_marketing').select('*').order('created_at', { ascending: false }),
      supabase.from('khuyen_mai').select('id,ten').order('created_at', { ascending: false }),
      mktDMIds.length > 0
        ? supabase.from('chi_phi').select('id,ngay,danh_muc_id,so_tien,dien_giai,created_at')
            .in('danh_muc_id', mktDMIds).order('ngay', { ascending: false }).limit(500)
        : Promise.resolve({ data: [] }),
    ])

    setCampaigns(cd || [])
    setKhuyenMaiList(km || [])
    setChiPhi(cp || [])
    setDanhMuc(allDM?.filter(d => d.parent_id === marketingParent?.id) || [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  // Stats
  const activeCampaigns = campaigns.filter(c => c.trang_thai === 'active')
  const tongNganSach    = activeCampaigns.reduce((s, c) => s + (c.ngan_sach || 0), 0)
  const tongKHMoi       = campaigns.reduce((s, c) => s + (c.so_kh_moi || 0), 0)

  const nowVN = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }))
  const { from: mFrom, to: mTo } = monthRange(nowVN.getFullYear(), nowVN.getMonth() + 1)
  const chiThang = chiPhiMarketing.filter(c => c.ngay >= mFrom && c.ngay <= mTo)
    .reduce((s, c) => s + (c.so_tien || 0), 0)

  const TABS = [
    { key: 'dashboard',  icon: '📊', label: 'Dashboard' },
    { key: 'chien-dich', icon: '📣', label: 'Chiến Dịch' },
    { key: 'chi-phi',    icon: '💸', label: 'Chi Phí' },
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
        <div style={{ color: 'white', fontWeight: '800', fontSize: '22px' }}>📣 Marketing</div>
        <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '13px', marginTop: '4px' }}>
          Chiến dịch · Chi phí kênh · ROI ước tính
        </div>

        {/* Quick stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginTop: '16px' }}>
          {[
            { label: 'Đang chạy',   val: activeCampaigns.length, icon: '📣', color: '#C9A96E' },
            { label: 'Chi tháng',   val: fmtShort(chiThang) + 'đ', icon: '💸', color: '#F4A460' },
            { label: 'Ngân sách',   val: fmtShort(tongNganSach) + 'đ', icon: '🎯', color: '#7EB8D4' },
            { label: 'KH mới (tổng)', val: tongKHMoi, icon: '👥', color: '#6FCF8E' },
          ].map(s => (
            <div key={s.label} style={{ background: 'rgba(255,255,255,0.12)',
              borderRadius: '12px', padding: '10px 6px', textAlign: 'center' }}>
              <div style={{ fontSize: '14px' }}>{s.icon}</div>
              <div style={{ fontWeight: '800', fontSize: '13px', color: s.color, marginTop: '2px' }}>{s.val}</div>
              <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)', marginTop: '1px',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tab bar */}
      <div style={{ background: 'white', borderBottom: `1px solid ${COLORS.border}`,
        display: 'flex', padding: '0 16px' }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{ padding: '13px 18px', border: 'none', background: 'none', cursor: 'pointer',
              fontWeight: tab === t.key ? '800' : '600', fontSize: '13px', whiteSpace: 'nowrap',
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
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>📣</div>
            <div>Đang tải dữ liệu marketing...</div>
          </div>
        ) : (
          <>
            {tab === 'dashboard' && (
              <TabDashboard campaigns={campaigns}
                chiPhiMarketing={chiPhiMarketing} danhMucMarketing={danhMucMarketing} />
            )}
            {tab === 'chien-dich' && (
              <TabChienDich campaigns={campaigns} khuyenMaiList={khuyenMaiList}
                onReload={load} showToast={showToast} />
            )}
            {tab === 'chi-phi' && (
              <TabChiPhi chiPhiMarketing={chiPhiMarketing} danhMucMarketing={danhMucMarketing} />
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
