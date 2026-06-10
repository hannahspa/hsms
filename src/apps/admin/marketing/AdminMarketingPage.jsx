import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../../lib/supabase'
import { COLORS } from '../../../constants/colors'
import DatePicker from '../../../components/shared/DatePicker'

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
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(26,18,9,0.6)', zIndex: 300 }}>
      <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: 'calc(100vw - var(--side-w, 248px))', maxWidth: '100vw', background: 'white',
        overflow: 'auto', boxShadow: '-6px 0 40px rgba(0,0,0,0.3)', animation: 'rpSlideIn .22s ease' }}>
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

  // Kênh → danh mục mapping (theo tên) — dùng mảng để không bị ghi đè
  const kenhDMMap = {}
  ;(danhMucMarketing || []).forEach(d => {
    const name = d.ten.toLowerCase()
    if (name.includes('facebook')) kenhDMMap.facebook = [...(kenhDMMap.facebook || []), d.id]
    else if (name.includes('zalo')) kenhDMMap.zalo = [...(kenhDMMap.zalo || []), d.id]
    else if (name.includes('tiktok') || name.includes('tik tok')) kenhDMMap.tiktok = [...(kenhDMMap.tiktok || []), d.id]
    else if (name.includes('in ấn') || name.includes('in an')) kenhDMMap.in_an = [...(kenhDMMap.in_an || []), d.id]
    else if (name.includes('google')) kenhDMMap.google = [...(kenhDMMap.google || []), d.id]
  })

  // Chi theo kênh trong tháng (hỗ trợ nhiều danh mục cùng kênh)
  const chiByKenh = {}
  Object.entries(kenhDMMap).forEach(([kenh, dmIds]) => {
    chiByKenh[kenh] = dmIds.reduce((s, id) => s + (chiByDM[id] || 0), 0)
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
// TAB 4-7: AI MARKETING FOUNDATION
// ══════════════════════════════════════════════════════════════════════════════
const STATUS_LEAD = {
  moi:          { label: 'Mới', color: '#1A5276', bg: '#EBF5FB' },
  dang_tu_van:  { label: 'Đang tư vấn', color: '#8E44AD', bg: '#F5F0FF' },
  da_dat_hen:   { label: 'Đã đặt hẹn', color: '#A0714F', bg: '#F8EFE8' },
  da_den:       { label: 'Đã đến', color: '#2D7A4F', bg: '#E8F5E9' },
  da_mua:       { label: 'Đã mua', color: '#2D7A4F', bg: '#E8F5E9' },
  mat_co_hoi:   { label: 'Mất cơ hội', color: '#C0392B', bg: '#FDECEA' },
  spam:         { label: 'Spam', color: '#7F8C8D', bg: '#F0F4F8' },
}

const STATUS_CONTENT = {
  y_tuong:   { label: 'Ý tưởng', color: '#1A5276', bg: '#EBF5FB' },
  nhap:      { label: 'Nháp', color: '#B8A898', bg: '#F5F2EF' },
  cho_duyet: { label: 'Chờ duyệt', color: '#A0714F', bg: '#F8EFE8' },
  da_duyet:  { label: 'Đã duyệt', color: '#2D7A4F', bg: '#E8F5E9' },
  da_dang:   { label: 'Đã đăng', color: '#2D7A4F', bg: '#E8F5E9' },
  that_bai:  { label: 'Thất bại', color: '#C0392B', bg: '#FDECEA' },
  huy:       { label: 'Hủy', color: '#7F8C8D', bg: '#F0F4F8' },
}

const STATUS_AI = {
  de_xuat:   { label: 'Đề xuất', color: '#1A5276', bg: '#EBF5FB' },
  cho_duyet: { label: 'Chờ duyệt', color: '#A0714F', bg: '#F8EFE8' },
  da_duyet:  { label: 'Đã duyệt', color: '#2D7A4F', bg: '#E8F5E9' },
  tu_choi:   { label: 'Từ chối', color: '#C0392B', bg: '#FDECEA' },
  dang_chay: { label: 'Đang chạy', color: '#8E44AD', bg: '#F5F0FF' },
  da_chay:   { label: 'Đã chạy', color: '#2D7A4F', bg: '#E8F5E9' },
  loi:       { label: 'Lỗi', color: '#C0392B', bg: '#FDECEA' },
  huy:       { label: 'Hủy', color: '#7F8C8D', bg: '#F0F4F8' },
}

function Badge({ map, value }) {
  const s = map[value] || { label: value || '—', color: COLORS.textMute, bg: '#F5F2EF' }
  return (
    <span style={{ fontSize: 11, fontWeight: 800, padding: '3px 8px',
      borderRadius: 999, background: s.bg, color: s.color, whiteSpace: 'nowrap' }}>
      {s.label}
    </span>
  )
}

function EmptyBlock({ title, sub }) {
  return (
    <div style={{ textAlign: 'center', padding: '42px 20px', color: COLORS.textMute,
      background: 'white', border: `1px solid ${COLORS.border}`, borderRadius: 14 }}>
      <div style={{ fontWeight: 800, color: COLORS.text, marginBottom: 6 }}>{title}</div>
      <div style={{ fontSize: 12 }}>{sub}</div>
    </div>
  )
}

function TableWrap({ children }) {
  return (
    <div style={{ background: 'white', borderRadius: 14, border: `1px solid ${COLORS.border}`,
      overflow: 'hidden', boxShadow: COLORS.shadow }}>
      {children}
    </div>
  )
}

function FormLead({ campaigns, onSave, onClose }) {
  const [f, setF] = useState({
    ho_ten: '',
    so_dien_thoai: '',
    kenh: 'facebook',
    chien_dich_id: '',
    nhu_cau: '',
    ai_next_best_action: '',
    ghi_chu: '',
  })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const set = (k, v) => setF(p => ({ ...p, [k]: v }))

  const handleSave = async () => {
    if (!f.ho_ten.trim() && !f.so_dien_thoai.trim()) return setErr('Nhập tên hoặc số điện thoại khách')
    setSaving(true); setErr('')
    const payload = {
      ho_ten: f.ho_ten.trim() || null,
      so_dien_thoai: f.so_dien_thoai.trim() || null,
      kenh: f.kenh,
      chien_dich_id: f.chien_dich_id || null,
      nhu_cau: f.nhu_cau.trim() || null,
      ai_next_best_action: f.ai_next_best_action.trim() || null,
      ghi_chu: f.ghi_chu.trim() || null,
      trang_thai: 'moi',
    }
    const { error } = await supabase.from('marketing_leads').insert(payload)
    setSaving(false)
    if (error) return setErr(error.message)
    onSave()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(26,18,9,0.6)', zIndex: 300 }}>
      <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: 'min(560px, 100vw)',
        background: 'white', overflow: 'auto', boxShadow: '-6px 0 40px rgba(0,0,0,0.3)' }}>
        <div style={{ background: COLORS.grad, padding: '18px 20px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ color: 'white', fontWeight: 800, fontSize: 16 }}>Thêm khách hàng tiềm năng</div>
          <button onClick={onClose}
            style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white',
              width: 30, height: 30, borderRadius: '50%', cursor: 'pointer' }}>×</button>
        </div>
        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={lbl}>TÊN KHÁCH</label>
              <input style={inp} value={f.ho_ten} onChange={e => set('ho_ten', e.target.value)} placeholder="VD: Chị Lan" />
            </div>
            <div>
              <label style={lbl}>SỐ ĐIỆN THOẠI</label>
              <input style={inp} value={f.so_dien_thoai} onChange={e => set('so_dien_thoai', e.target.value)} placeholder="090..." />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={lbl}>KÊNH</label>
              <select style={inp} value={f.kenh} onChange={e => set('kenh', e.target.value)}>
                <option value="facebook">Facebook</option>
                <option value="zalo">Zalo</option>
                <option value="tiktok">TikTok</option>
                <option value="google">Google</option>
                <option value="website">Website</option>
                <option value="walk_in">Khách tự đến</option>
                <option value="khac">Khác</option>
              </select>
            </div>
            <div>
              <label style={lbl}>CHIẾN DỊCH</label>
              <select style={inp} value={f.chien_dich_id} onChange={e => set('chien_dich_id', e.target.value)}>
                <option value="">— Chưa gắn —</option>
                {campaigns.map(c => <option key={c.id} value={c.id}>{c.ten}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label style={lbl}>NHU CẦU</label>
            <textarea style={{ ...inp, minHeight: 74, resize: 'vertical' }} value={f.nhu_cau}
              onChange={e => set('nhu_cau', e.target.value)} placeholder="Khách hỏi dịch vụ gì, tình trạng da, mong muốn..." />
          </div>
          <div>
            <label style={lbl}>BƯỚC TIẾP THEO</label>
            <input style={inp} value={f.ai_next_best_action} onChange={e => set('ai_next_best_action', e.target.value)}
              placeholder="VD: Gọi tư vấn và chốt lịch soi da" />
          </div>
          <div>
            <label style={lbl}>GHI CHÚ</label>
            <input style={inp} value={f.ghi_chu} onChange={e => set('ghi_chu', e.target.value)} placeholder="Ghi chú nội bộ..." />
          </div>
          {err && <div style={{ background: '#FDECEA', color: '#C0392B', padding: '10px 14px',
            borderRadius: 8, fontSize: 13, fontWeight: 700 }}>{err}</div>}
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={onClose} style={{ flex: 1, padding: 13, background: 'white',
              border: `1px solid ${COLORS.border}`, borderRadius: 12, fontWeight: 700, cursor: 'pointer' }}>Hủy</button>
            <button onClick={handleSave} disabled={saving} style={{ flex: 2, padding: 13,
              background: COLORS.grad, color: 'white', border: 'none', borderRadius: 12,
              fontWeight: 800, cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
              {saving ? 'Đang lưu...' : 'Lưu khách tiềm năng'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function FormUpdateLeadPhone({ lead, onSave, onClose }) {
  const [f, setF] = useState({
    ho_ten: lead.ho_ten || '',
    so_dien_thoai: lead.so_dien_thoai || '',
    nhu_cau: lead.nhu_cau || '',
    ai_next_best_action: lead.ai_next_best_action || '',
    ghi_chu: lead.ghi_chu || '',
  })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const set = (k, v) => setF(p => ({ ...p, [k]: v }))

  const handleSave = async () => {
    if (!f.so_dien_thoai.trim()) return setErr('Nhập số điện thoại để hệ thống nối khách hàng')
    setSaving(true); setErr('')
    const payload = {
      ho_ten: f.ho_ten.trim() || lead.ho_ten || null,
      so_dien_thoai: f.so_dien_thoai.trim(),
      nhu_cau: f.nhu_cau.trim() || null,
      ai_next_best_action: f.ai_next_best_action.trim() || 'Quét Facebook để nối khách hàng và đo doanh thu',
      ghi_chu: f.ghi_chu.trim() || null,
    }
    const { error } = await supabase.from('marketing_leads').update(payload).eq('id', lead.id)
    setSaving(false)
    if (error) return setErr(error.message)
    onSave()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(26,18,9,0.6)', zIndex: 300 }}>
      <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: 'min(560px, 100vw)',
        background: 'white', overflow: 'auto', boxShadow: '-6px 0 40px rgba(0,0,0,0.3)' }}>
        <div style={{ background: COLORS.grad, padding: '18px 20px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ color: 'white', fontWeight: 800, fontSize: 16 }}>Bổ sung thông tin khách tiềm năng</div>
          <button onClick={onClose}
            style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white',
              width: 30, height: 30, borderRadius: '50%', cursor: 'pointer' }}>×</button>
        </div>
        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ background: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: 12,
            color: COLORS.textSub, fontSize: 13, lineHeight: 1.55 }}>
            Bổ sung số điện thoại cho khách tiềm năng này để hệ thống có thể nối với khách hàng, lịch hẹn và đơn hàng.
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={lbl}>TÊN KHÁCH</label>
              <input style={inp} value={f.ho_ten} onChange={e => set('ho_ten', e.target.value)} placeholder="VD: Chị Lan" />
            </div>
            <div>
              <label style={lbl}>SỐ ĐIỆN THOẠI *</label>
              <input style={inp} value={f.so_dien_thoai} onChange={e => set('so_dien_thoai', e.target.value)} placeholder="090..." />
            </div>
          </div>
          <div>
            <label style={lbl}>NHU CẦU</label>
            <textarea style={{ ...inp, minHeight: 84, resize: 'vertical' }} value={f.nhu_cau}
              onChange={e => set('nhu_cau', e.target.value)} placeholder="Khách hỏi dịch vụ gì, tình trạng da, mong muốn..." />
          </div>
          <div>
            <label style={lbl}>BƯỚC TIẾP THEO</label>
            <input style={inp} value={f.ai_next_best_action} onChange={e => set('ai_next_best_action', e.target.value)}
              placeholder="VD: Gọi tư vấn và chốt lịch soi da" />
          </div>
          <div>
            <label style={lbl}>GHI CHÚ</label>
            <input style={inp} value={f.ghi_chu} onChange={e => set('ghi_chu', e.target.value)} placeholder="Ghi chú nội bộ..." />
          </div>
          {err && <div style={{ background: '#FDECEA', color: '#C0392B', padding: '10px 14px',
            borderRadius: 8, fontSize: 13, fontWeight: 700 }}>{err}</div>}
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={onClose} style={{ flex: 1, padding: 13, background: 'white',
              border: `1px solid ${COLORS.border}`, borderRadius: 12, fontWeight: 700, cursor: 'pointer' }}>Hủy</button>
            <button onClick={handleSave} disabled={saving} style={{ flex: 2, padding: 13,
              background: COLORS.grad, color: 'white', border: 'none', borderRadius: 12,
              fontWeight: 800, cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
              {saving ? 'Đang lưu...' : 'Lưu thông tin'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function FormContentIdea({ campaigns, khuyenMaiList, onSave, onClose }) {
  const [f, setF] = useState({
    tieu_de: '',
    kenh: 'facebook',
    loai_noi_dung: 'bai_viet',
    chien_dich_id: '',
    khuyen_mai_id: '',
    chu_de: '',
    noi_dung: '',
    ai_prompt: '',
  })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const set = (k, v) => setF(p => ({ ...p, [k]: v }))

  const handleSave = async () => {
    if (!f.tieu_de.trim()) return setErr('Nhập tiêu đề nội dung')
    setSaving(true); setErr('')
    const payload = {
      tieu_de: f.tieu_de.trim(),
      kenh: f.kenh,
      loai_noi_dung: f.loai_noi_dung,
      chien_dich_id: f.chien_dich_id || null,
      khuyen_mai_id: f.khuyen_mai_id || null,
      chu_de: f.chu_de.trim() || null,
      noi_dung: f.noi_dung.trim() || null,
      ai_prompt: f.ai_prompt.trim() || null,
      trang_thai: 'y_tuong',
    }
    const { error } = await supabase.from('marketing_content_calendar').insert(payload)
    setSaving(false)
    if (error) return setErr(error.message)
    onSave()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(26,18,9,0.6)', zIndex: 300 }}>
      <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: 'min(620px, 100vw)',
        background: 'white', overflow: 'auto', boxShadow: '-6px 0 40px rgba(0,0,0,0.3)' }}>
        <div style={{ background: COLORS.grad, padding: '18px 20px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ color: 'white', fontWeight: 800, fontSize: 16 }}>Tạo ý tưởng nội dung</div>
          <button onClick={onClose}
            style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white',
              width: 30, height: 30, borderRadius: '50%', cursor: 'pointer' }}>×</button>
        </div>
        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={lbl}>TIÊU ĐỀ *</label>
            <input style={inp} value={f.tieu_de} onChange={e => set('tieu_de', e.target.value)}
              placeholder="VD: Combo chăm da sau nắng tháng 6" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={lbl}>KÊNH</label>
              <select style={inp} value={f.kenh} onChange={e => set('kenh', e.target.value)}>
                <option value="facebook">Facebook</option>
                <option value="zalo">Zalo</option>
                <option value="tiktok">TikTok</option>
                <option value="website">Website</option>
                <option value="khac">Khác</option>
              </select>
            </div>
            <div>
              <label style={lbl}>LOẠI NỘI DUNG</label>
              <select style={inp} value={f.loai_noi_dung} onChange={e => set('loai_noi_dung', e.target.value)}>
                <option value="bai_viet">Bài viết</option>
                <option value="hinh_anh">Hình ảnh</option>
                <option value="video">Video</option>
                <option value="story">Story</option>
                <option value="reel">Reel</option>
                <option value="quang_cao">Quảng cáo</option>
              </select>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={lbl}>CHIẾN DỊCH</label>
              <select style={inp} value={f.chien_dich_id} onChange={e => set('chien_dich_id', e.target.value)}>
                <option value="">— Chưa gắn —</option>
                {campaigns.map(c => <option key={c.id} value={c.id}>{c.ten}</option>)}
              </select>
            </div>
            <div>
              <label style={lbl}>KHUYẾN MÃI</label>
              <select style={inp} value={f.khuyen_mai_id} onChange={e => set('khuyen_mai_id', e.target.value)}>
                <option value="">— Không gắn —</option>
                {khuyenMaiList.map(k => <option key={k.id} value={k.id}>{k.ten}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label style={lbl}>CHỦ ĐỀ</label>
            <input style={inp} value={f.chu_de} onChange={e => set('chu_de', e.target.value)}
              placeholder="VD: phục hồi da, mụn, thư giãn, quà tặng..." />
          </div>
          <div>
            <label style={lbl}>NỘI DUNG NHÁP</label>
            <textarea style={{ ...inp, minHeight: 90, resize: 'vertical' }} value={f.noi_dung}
              onChange={e => set('noi_dung', e.target.value)} placeholder="Caption hoặc ý chính..." />
          </div>
          <div>
            <label style={lbl}>YÊU CẦU CHO AI</label>
            <textarea style={{ ...inp, minHeight: 74, resize: 'vertical' }} value={f.ai_prompt}
              onChange={e => set('ai_prompt', e.target.value)} placeholder="VD: Viết giọng sang, ấm, không cam kết điều trị, có CTA đặt lịch Zalo" />
          </div>
          {err && <div style={{ background: '#FDECEA', color: '#C0392B', padding: '10px 14px',
            borderRadius: 8, fontSize: 13, fontWeight: 700 }}>{err}</div>}
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={onClose} style={{ flex: 1, padding: 13, background: 'white',
              border: `1px solid ${COLORS.border}`, borderRadius: 12, fontWeight: 700, cursor: 'pointer' }}>Hủy</button>
            <button onClick={handleSave} disabled={saving} style={{ flex: 2, padding: 13,
              background: COLORS.grad, color: 'white', border: 'none', borderRadius: 12,
              fontWeight: 800, cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
              {saving ? 'Đang lưu...' : 'Lưu ý tưởng'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

const GIO_HEN = Array.from({ length: 40 }, (_, i) => {
  const total = 9 * 60 + 30 + i * 15
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}).filter(g => g <= '19:30')

function FormDatHenLead({ lead, dichVuList, ktvList, onSave, onClose }) {
  const [f, setF] = useState({
    ten_khach: lead.ho_ten || '',
    sdt_khach: lead.so_dien_thoai || '',
    ngay_hen: todayISO(),
    gio_hen: '10:00',
    dich_vu_id: '',
    ten_dich_vu: lead.nhu_cau || '',
    nhan_vien_id: '',
    ghi_chu: lead.ai_next_best_action || lead.ghi_chu || '',
  })
  const [showNgay, setShowNgay] = useState(false)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const set = (k, v) => setF(p => ({ ...p, [k]: v }))

  const handleDichVu = (id) => {
    const dv = dichVuList.find(d => d.id === id)
    setF(p => ({ ...p, dich_vu_id: id, ten_dich_vu: dv?.ten || p.ten_dich_vu }))
  }

  const findOrCreateCustomer = async () => {
    const phone = f.sdt_khach.trim()
    if (!phone) return null

    const { data: existing } = await supabase.from('khach_hang')
      .select('id')
      .eq('so_dien_thoai', phone)
      .maybeSingle()

    const payload = {
      ho_ten: f.ten_khach.trim() || lead.ho_ten || 'Khách marketing',
      so_dien_thoai: phone,
      nguon: lead.kenh || 'marketing',
      marketing_lead_id: lead.id,
      chien_dich_marketing_id: lead.chien_dich_id || null,
    }

    if (existing?.id) {
      await supabase.from('khach_hang').update(payload).eq('id', existing.id)
      return existing.id
    }

    const { data, error } = await supabase.from('khach_hang').insert(payload).select('id').single()
    if (error) throw error
    return data.id
  }

  const handleSave = async () => {
    if (!f.ten_khach.trim()) return setErr('Nhập tên khách')
    if (!f.ten_dich_vu.trim() && !f.dich_vu_id) return setErr('Chọn hoặc nhập dịch vụ khách quan tâm')
    setSaving(true); setErr('')
    try {
      const khachHangId = await findOrCreateCustomer()
      const payload = {
        ten_khach: f.ten_khach.trim(),
        sdt_khach: f.sdt_khach.trim() || null,
        khach_hang_id: khachHangId,
        dich_vu_id: f.dich_vu_id || null,
        ten_dich_vu: f.ten_dich_vu.trim() || null,
        nhan_vien_id: f.nhan_vien_id || null,
        thoi_luong_phut: 60,
        ngay_hen: f.ngay_hen,
        gio_hen: f.gio_hen,
        ghi_chu: [
          f.ghi_chu?.trim(),
          lead.ai_summary ? `AI: ${lead.ai_summary}` : '',
          lead.ai_intent ? `Phân loại: ${intentLabel(lead.ai_intent)}` : '',
        ].filter(Boolean).join('\n') || null,
        trang_thai: 'cho_xac_nhan',
        nguoi_nhap: 'Marketing AI',
        marketing_lead_id: lead.id,
        chien_dich_marketing_id: lead.chien_dich_id || null,
      }
      const { error } = await supabase.from('lich_hen').insert(payload)
      if (error) throw error
      await supabase.from('marketing_leads').update({
        khach_hang_id: khachHangId,
        trang_thai: 'da_dat_hen',
        ai_next_best_action: 'Theo dõi khách đến spa và chốt đơn POS',
      }).eq('id', lead.id)
      onSave()
    } catch (e) {
      setErr(e.message || String(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(26,18,9,0.6)', zIndex: 300 }}>
      <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: 'min(620px, 100vw)',
        background: 'white', overflow: 'auto', boxShadow: '-6px 0 40px rgba(0,0,0,0.3)' }}>
        <DatePicker open={showNgay} selectedDate={f.ngay_hen} onClose={() => setShowNgay(false)}
          onConfirm={v => { set('ngay_hen', v); setShowNgay(false) }} />
        <div style={{ background: COLORS.grad, padding: '18px 20px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ color: 'white', fontWeight: 800, fontSize: 16 }}>Đặt lịch từ khách tiềm năng</div>
          <button onClick={onClose}
            style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white',
              width: 30, height: 30, borderRadius: '50%', cursor: 'pointer' }}>×</button>
        </div>
        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={lbl}>TÊN KHÁCH *</label>
              <input style={inp} value={f.ten_khach} onChange={e => set('ten_khach', e.target.value)} />
            </div>
            <div>
              <label style={lbl}>SỐ ĐIỆN THOẠI</label>
              <input style={inp} value={f.sdt_khach} onChange={e => set('sdt_khach', e.target.value)} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={lbl}>NGÀY HẸN</label>
              <button type="button" onClick={() => setShowNgay(true)}
                style={{ ...inp, textAlign: 'left', cursor: 'pointer' }}>{fmtDate(f.ngay_hen)}</button>
            </div>
            <div>
              <label style={lbl}>GIỜ HẸN</label>
              <select style={inp} value={f.gio_hen} onChange={e => set('gio_hen', e.target.value)}>
                {GIO_HEN.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={lbl}>DỊCH VỤ</label>
              <select style={inp} value={f.dich_vu_id} onChange={e => handleDichVu(e.target.value)}>
                <option value="">— Nhập tay bên cạnh —</option>
                {dichVuList.map(d => <option key={d.id} value={d.id}>{d.ten}</option>)}
              </select>
            </div>
            <div>
              <label style={lbl}>KTV</label>
              <select style={inp} value={f.nhan_vien_id} onChange={e => set('nhan_vien_id', e.target.value)}>
                <option value="">— Chưa gán —</option>
                {ktvList.map(k => <option key={k.id} value={k.id}>{k.ho_ten}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label style={lbl}>TÊN DỊCH VỤ / NHU CẦU</label>
            <input style={inp} value={f.ten_dich_vu} onChange={e => set('ten_dich_vu', e.target.value)}
              placeholder="VD: soi da, trị mụn, phục hồi da..." />
          </div>
          <div>
            <label style={lbl}>GHI CHÚ TƯ VẤN</label>
            <textarea style={{ ...inp, minHeight: 80, resize: 'vertical' }} value={f.ghi_chu}
              onChange={e => set('ghi_chu', e.target.value)} />
          </div>
          {err && <div style={{ background: '#FDECEA', color: '#C0392B', padding: '10px 14px',
            borderRadius: 8, fontSize: 13, fontWeight: 700 }}>{err}</div>}
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={onClose} style={{ flex: 1, padding: 13, background: 'white',
              border: `1px solid ${COLORS.border}`, borderRadius: 12, fontWeight: 700, cursor: 'pointer' }}>Hủy</button>
            <button onClick={handleSave} disabled={saving} style={{ flex: 2, padding: 13,
              background: COLORS.grad, color: 'white', border: 'none', borderRadius: 12,
              fontWeight: 800, cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
              {saving ? 'Đang tạo...' : 'Tạo lịch hẹn'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function segmentLabel(segment) {
  const map = {
    winback_365: 'Winback >365 ngày',
    winback_180: 'Winback 180 ngày',
    winback_90: 'Winback 90 ngày',
    nhac_quay_lai: 'Nhắc quay lại',
    sap_het_the: 'Sắp hết thẻ',
    khach_moi_can_cham: 'Khách mới cần chăm',
    dang_hoat_dong: 'Đang hoạt động',
    chua_co_don: 'Chưa có đơn',
  }
  return map[segment] || segment || 'Khác'
}

function intentLabel(intent) {
  const map = {
    dat_lich: 'Đặt lịch',
    hoi_gia: 'Hỏi giá',
    tu_van_da: 'Tư vấn da',
    hoi_the_lieu_trinh: 'Hỏi thẻ liệu trình',
    khieu_nai: 'Khiếu nại/cần xử lý',
    spam: 'Nhiễu/spam',
    remarketing: 'Chăm lại khách cũ',
    hoi_thong_tin: 'Hỏi thông tin',
    page_owned_content: 'Bài/tin của Hannah Spa',
  }
  return map[intent] || intent || 'Chưa phân loại'
}

function isActiveLead(lead) {
  return lead?.trang_thai !== 'spam' && lead?.ai_intent !== 'page_owned_content'
}

function TabLeads({ leads, campaigns, dichVuList, ktvList, attributionPipeline = [], unmatchedLeads = [], reactivationCustomers = [], fanpageHealth = [], audienceStats = null, customer360 = [], sourceQuality = [], onRunPipeline, onRunAttribution, onReload, showToast }) {
  const [showForm, setShowForm] = useState(false)
  const [bookingLead, setBookingLead] = useState(null)
  const [editingLead, setEditingLead] = useState(null)
  const activeLeads = leads.filter(isActiveLead)
  const cleanUnmatchedLeads = unmatchedLeads.filter(isActiveLead)
  const sorted = [...activeLeads].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
  const totalAttributedRevenue = attributionPipeline.reduce((s, p) => s + Number(p.revenue || 0), 0)
  const totalLinkedCustomers = attributionPipeline.reduce((s, p) => s + Number(p.linked_customers || 0), 0)
  const totalLeadOrders = attributionPipeline.reduce((s, p) => s + Number(p.orders || 0), 0)
  const health = fanpageHealth[0] || {}
  const audience = audienceStats || {}
  const hotUnmatched = cleanUnmatchedLeads.filter(l => Number(l.diem_tiem_nang || 0) >= 55).length
  const sourceStats = activeLeads.reduce((acc, lead) => {
    const key = `${lead.kenh || 'khac'}::${lead.nguon_chi_tiet || 'khong_ro'}`
    if (!acc[key]) acc[key] = { leads: 0, linked_customers: 0, hot_leads: 0 }
    acc[key].leads += 1
    if (lead.khach_hang_id) acc[key].linked_customers += 1
    if (Number(lead.diem_tiem_nang || 0) >= 55) acc[key].hot_leads += 1
    return acc
  }, {})
  const cleanSourceQuality = sourceQuality.map(source => {
    const key = `${source.kenh || 'khac'}::${source.nguon_chi_tiet || 'khong_ro'}`
    const stats = sourceStats[key]
    return stats ? { ...source, ...stats } : source
  }).filter(source => Number(source.leads || 0) > 0 || Number(source.orders || 0) > 0)
  const segmentSummary = customer360.reduce((acc, c) => {
    const key = c.marketing_segment || 'khac'
    if (!acc[key]) acc[key] = { segment: key, count: 0, revenue: 0, remaining: 0 }
    acc[key].count += 1
    acc[key].revenue += Number(c.total_revenue || 0)
    acc[key].remaining += Number(c.remaining_sessions || 0)
    return acc
  }, {})
  const topSegments = Object.values(segmentSummary)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 6)
  const priorityCustomers = [...customer360]
    .filter(c => ['sap_het_the', 'khach_moi_can_cham', 'nhac_quay_lai', 'winback_90', 'winback_180', 'winback_365'].includes(c.marketing_segment))
    .sort((a, b) => Number(b.total_revenue || 0) - Number(a.total_revenue || 0))
    .slice(0, 10)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <div style={{ fontWeight: 800, color: COLORS.text }}>Khách hàng tiềm năng đang đo chuyển đổi</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <button className="btn gold" onClick={onRunPipeline}>Quét Facebook</button>
          <button className="btn" onClick={onRunAttribution}>Chỉ nối dữ liệu</button>
          <button className="btn gold" onClick={() => setShowForm(true)}>+ KH tiềm năng</button>
        </div>
      </div>
      <div className="strip" style={{ gridTemplateColumns: 'repeat(5,1fr)' }}>
        <div className="it">
          <div className="l">Tất cả khách từng inbox</div>
          <div className="v">{audience.all_inbox_conversations ?? '...'}</div>
          <div className="d">từ 25/11/2025</div>
        </div>
        <div className="it">
          <div className="l">Có số điện thoại</div>
          <div className="v" style={{ color: COLORS.thu }}>{audience.conversations_with_phone ?? '...'}</div>
          <div className="d">ưu tiên chốt lịch</div>
        </div>
        <div className="it">
          <div className="l">Có nhu cầu dịch vụ</div>
          <div className="v">{audience.conversations_with_buying_signal ?? '...'}</div>
          <div className="d">hỏi giá/đặt lịch/tư vấn</div>
        </div>
        <div className="it">
          <div className="l">Từng inbox</div>
          <div className="v">{audience.previous_inbox_only ?? '...'}</div>
          <div className="d">chưa rõ nhu cầu</div>
        </div>
        <div className="it">
          <div className="l">Tin nhắn đã lưu</div>
          <div className="v">{audience.scanned_messages ?? '...'}</div>
          <div className="d">{audience.inbound_messages || 0} khách gửi · {audience.outbound_messages || 0} page trả</div>
        </div>
      </div>
      <div className="strip" style={{ gridTemplateColumns: 'repeat(6,1fr)' }}>
        <div className="it"><div className="l">KH tiềm năng Facebook</div><div className="v">{activeLeads.filter(l => l.kenh === 'facebook').length}</div></div>
        <div className="it"><div className="l">Đã nối khách</div><div className="v">{totalLinkedCustomers}</div></div>
        <div className="it"><div className="l">Chưa nối</div><div className="v">{cleanUnmatchedLeads.length}</div></div>
        <div className="it"><div className="l">KH ưu tiên</div><div className="v">{hotUnmatched}</div></div>
        <div className="it"><div className="l">Đơn từ KH tiềm năng</div><div className="v">{totalLeadOrders}</div></div>
        <div className="it"><div className="l">Doanh thu KH tiềm năng</div><div className="v">{fmtShort(totalAttributedRevenue)}</div></div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div style={{ background: 'white', border: `1px solid ${COLORS.border}`, borderRadius: 14, padding: 14, boxShadow: COLORS.shadow }}>
          <div style={{ fontWeight: 800, color: COLORS.text, marginBottom: 8 }}>Khoảng trống attribution</div>
          <div style={{ color: COLORS.textSub, fontSize: 13, lineHeight: 1.6 }}>
            Đơn 2026: <b style={{ color: COLORS.text }}>{health.orders_2026 || 0}</b> · Đã nối KH tiềm năng: <b style={{ color: COLORS.text }}>{health.orders_with_lead || 0}</b> · Đã nối chiến dịch: <b style={{ color: COLORS.text }}>{health.orders_with_campaign || 0}</b>
          </div>
        </div>
        <div style={{ background: 'white', border: `1px solid ${COLORS.border}`, borderRadius: 14, padding: 14, boxShadow: COLORS.shadow }}>
          <div style={{ fontWeight: 800, color: COLORS.text, marginBottom: 8 }}>Remarketing cần làm</div>
          <div style={{ color: COLORS.textSub, fontSize: 13, lineHeight: 1.6 }}>
            Khách lâu chưa quay lại: <b style={{ color: COLORS.text }}>{reactivationCustomers.length}</b> · Có thẻ/buổi còn lại: <b style={{ color: COLORS.text }}>{reactivationCustomers.filter(c => Number(c.remaining_sessions || 0) > 0 || Number(c.active_cards || 0) > 0).length}</b>
          </div>
        </div>
      </div>
      {cleanSourceQuality.length > 0 && (
        <TableWrap>
          <div style={{ padding: 12, fontWeight: 800, color: COLORS.text }}>Hiệu quả nguồn khách tiềm năng</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: COLORS.bg, color: COLORS.textSub, textAlign: 'left' }}>
                {['Nguồn', 'KH tiềm năng', 'Đã nối KH', 'KH ưu tiên', 'Đơn', 'Doanh thu', 'Tỷ lệ mua'].map(h => (
                  <th key={h} style={{ padding: '11px 12px', fontSize: 11, textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {cleanSourceQuality.slice(0, 8).map((s, idx) => (
                <tr key={`${s.kenh}-${s.nguon_chi_tiet}-${idx}`} style={{ borderTop: `1px solid ${COLORS.border}` }}>
                  <td style={{ padding: 12, fontWeight: 800, color: COLORS.text }}>
                    {KENH[s.kenh]?.label || s.kenh || 'Khác'}
                    <div style={{ fontSize: 11, fontWeight: 500, color: COLORS.textMute }}>{s.nguon_chi_tiet || 'không rõ'}</div>
                  </td>
                  <td style={{ padding: 12 }}>{s.leads || 0}</td>
                  <td style={{ padding: 12 }}>{s.linked_customers || 0}</td>
                  <td style={{ padding: 12 }}>{s.hot_leads || 0}</td>
                  <td style={{ padding: 12 }}>{s.orders || 0}</td>
                  <td style={{ padding: 12, fontWeight: 800, color: COLORS.text }}>{fmt(s.revenue || 0)}</td>
                  <td style={{ padding: 12, color: COLORS.textSub }}>{s.ty_le_mua == null ? '—' : `${s.ty_le_mua}%`}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
      )}
      {topSegments.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
          {topSegments.map(seg => (
            <div key={seg.segment} style={{ background: 'white', border: `1px solid ${COLORS.border}`, borderRadius: 14, padding: 14, boxShadow: COLORS.shadow }}>
              <div style={{ fontSize: 11, color: COLORS.textMute, fontWeight: 800, textTransform: 'uppercase' }}>{segmentLabel(seg.segment)}</div>
              <div style={{ fontSize: 22, color: COLORS.text, fontWeight: 900, marginTop: 4 }}>{seg.count}</div>
              <div style={{ fontSize: 12, color: COLORS.textSub, marginTop: 4 }}>
                {fmt(seg.revenue)} lịch sử · còn {seg.remaining || 0} buổi
              </div>
            </div>
          ))}
        </div>
      )}
      {priorityCustomers.length > 0 && (
        <TableWrap>
          <div style={{ padding: 12, fontWeight: 800, color: COLORS.text }}>Khách nên chăm lại trước</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: COLORS.bg, color: COLORS.textSub, textAlign: 'left' }}>
                {['Khách', 'Nhóm', 'Doanh thu lịch sử', 'Còn buổi', 'Gợi ý tiếp theo'].map(h => (
                  <th key={h} style={{ padding: '11px 12px', fontSize: 11, textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {priorityCustomers.map(c => (
                <tr key={c.khach_hang_id} style={{ borderTop: `1px solid ${COLORS.border}` }}>
                  <td style={{ padding: 12, fontWeight: 800, color: COLORS.text }}>
                    {c.ho_ten || 'Khách hàng'}
                    <div style={{ fontSize: 11, fontWeight: 500, color: COLORS.textMute }}>{c.so_dien_thoai || c.ma_kh || '—'}</div>
                  </td>
                  <td style={{ padding: 12 }}>{segmentLabel(c.marketing_segment)}</td>
                  <td style={{ padding: 12, fontWeight: 800, color: COLORS.text }}>{fmt(c.total_revenue || 0)}</td>
                  <td style={{ padding: 12 }}>{c.remaining_sessions || 0}</td>
                  <td style={{ padding: 12, color: COLORS.textSub }}>{c.ai_next_best_action || 'Theo dõi và chăm sóc định kỳ'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
      )}
      {cleanUnmatchedLeads.length > 0 && (
        <TableWrap>
          <div style={{ padding: 12, fontWeight: 800, color: COLORS.text }}>KH tiềm năng Fanpage chưa nối hồ sơ khách hàng</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: COLORS.bg, color: COLORS.textSub, textAlign: 'left' }}>
                {['Khách', 'Điểm', 'Phân loại', 'Nhu cầu', 'Gợi ý tiếp theo', ''].map(h => (
                  <th key={h} style={{ padding: '11px 12px', fontSize: 11, textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {cleanUnmatchedLeads.slice(0, 12).map(l => (
                <tr key={l.id} style={{ borderTop: `1px solid ${COLORS.border}` }}>
                  <td style={{ padding: 12, fontWeight: 800, color: COLORS.text }}>
                    {l.ho_ten || 'Khách Fanpage'}
                    <div style={{ fontSize: 11, fontWeight: 500, color: COLORS.textMute }}>{l.so_dien_thoai || 'Chưa có SĐT'}</div>
                  </td>
                  <td style={{ padding: 12 }}>{l.diem_tiem_nang || 0}</td>
                  <td style={{ padding: 12 }}>{intentLabel(l.ai_intent)}</td>
                  <td style={{ padding: 12, color: COLORS.textSub }}>{String(l.nhu_cau || '').slice(0, 90) || '—'}</td>
                  <td style={{ padding: 12, color: COLORS.textSub }}>{l.ai_next_best_action || 'Xin số điện thoại để nối khách hàng'}</td>
                  <td style={{ padding: 12, textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                      <button onClick={() => setEditingLead(l)}
                        style={{ padding: '7px 10px', borderRadius: 8, border: 'none',
                          background: '#EBF5FB', color: '#1A5276', fontWeight: 800, cursor: 'pointer' }}>
                        Bổ sung SĐT
                      </button>
                      <button onClick={() => setBookingLead(l)}
                        style={{ padding: '7px 10px', borderRadius: 8, border: 'none',
                          background: '#E8F5E9', color: '#2D7A4F', fontWeight: 800, cursor: 'pointer' }}>
                        Đặt hẹn
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
      )}
      {sorted.length === 0 ? (
        <EmptyBlock title="Chưa có khách hàng tiềm năng" sub="Sau khi nối Facebook/Zalo hoặc nhập thủ công, khách tiềm năng sẽ nằm ở đây để đo từ tư vấn đến doanh thu." />
      ) : (
        <TableWrap>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: COLORS.bg, color: COLORS.textSub, textAlign: 'left' }}>
                {['Khách', 'Kênh', 'Nhu cầu', 'Trạng thái', 'AI gợi ý', 'Ngày', ''].map(h => (
                  <th key={h} style={{ padding: '11px 12px', fontSize: 11, textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map(l => (
                <tr key={l.id} style={{ borderTop: `1px solid ${COLORS.border}` }}>
                  <td style={{ padding: 12, fontWeight: 800, color: COLORS.text }}>
                    {l.ho_ten || 'Khách chưa tên'}
                    <div style={{ fontSize: 11, fontWeight: 500, color: COLORS.textMute }}>{l.so_dien_thoai || 'Chưa có SĐT'}</div>
                  </td>
                  <td style={{ padding: 12 }}>{KENH[l.kenh]?.label || l.kenh || '—'}</td>
                  <td style={{ padding: 12, color: COLORS.textSub }}>{l.nhu_cau || intentLabel(l.ai_intent) || '—'}</td>
                  <td style={{ padding: 12 }}><Badge map={STATUS_LEAD} value={l.trang_thai} /></td>
                  <td style={{ padding: 12, color: COLORS.textSub, maxWidth: 260 }}>{l.ai_next_best_action || '—'}</td>
                  <td style={{ padding: 12, color: COLORS.textMute }}>{fmtDate(l.ngay_tao)}</td>
                  <td style={{ padding: 12, textAlign: 'right' }}>
                    <button onClick={() => setBookingLead(l)}
                      style={{ padding: '7px 10px', borderRadius: 8, border: 'none',
                        background: '#E8F5E9', color: '#2D7A4F', fontWeight: 800, cursor: 'pointer' }}>
                      Đặt hẹn
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
      )}
      {showForm && (
        <FormLead campaigns={campaigns}
          onSave={() => { setShowForm(false); onReload(); showToast('Đã thêm khách hàng tiềm năng') }}
          onClose={() => setShowForm(false)} />
      )}
      {editingLead && (
        <FormUpdateLeadPhone lead={editingLead}
          onSave={() => { setEditingLead(null); onReload(); showToast('Đã bổ sung thông tin khách tiềm năng. Bấm Quét Facebook để nối dữ liệu.') }}
          onClose={() => setEditingLead(null)} />
      )}
      {bookingLead && (
        <FormDatHenLead lead={bookingLead} dichVuList={dichVuList} ktvList={ktvList}
          onSave={() => { setBookingLead(null); onReload(); showToast('Đã tạo lịch hẹn từ khách tiềm năng') }}
          onClose={() => setBookingLead(null)} />
      )}
    </div>
  )
}

function TabInboxAI({ messages }) {
  const sorted = [...messages].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
  if (sorted.length === 0) {
    return <EmptyBlock title="Chưa có tin nhắn AI Inbox" sub="Webhook Facebook/Zalo sẽ đổ tin nhắn vào đây; AI sẽ phân loại và soạn câu trả lời chờ duyệt." />
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {sorted.map(m => (
        <div key={m.id} style={{ background: 'white', border: `1px solid ${COLORS.border}`,
          borderRadius: 14, padding: 14, boxShadow: COLORS.shadow }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 8 }}>
            <div style={{ fontWeight: 800, color: COLORS.text }}>
              {m.direction === 'inbound' ? 'Khách gửi' : m.sender_type === 'ai' ? 'AI soạn' : 'Tin gửi đi'}
              <span style={{ marginLeft: 8, fontSize: 11, color: COLORS.textMute, fontWeight: 600 }}>
                {KENH[m.kenh]?.label || m.kenh || '—'}
              </span>
            </div>
            <Badge map={{
              received: { label: 'Đã nhận', color: '#1A5276', bg: '#EBF5FB' },
              draft: { label: 'Nháp', color: '#B8A898', bg: '#F5F2EF' },
              cho_duyet: { label: 'Chờ duyệt', color: '#A0714F', bg: '#F8EFE8' },
              approved: { label: 'Đã duyệt', color: '#2D7A4F', bg: '#E8F5E9' },
              sent: { label: 'Đã gửi', color: '#2D7A4F', bg: '#E8F5E9' },
              failed: { label: 'Lỗi', color: '#C0392B', bg: '#FDECEA' },
              ignored: { label: 'Bỏ qua', color: '#7F8C8D', bg: '#F0F4F8' },
            }} value={m.trang_thai} />
          </div>
          <div style={{ fontSize: 13, color: COLORS.text, lineHeight: 1.55 }}>{m.noi_dung || '—'}</div>
          {m.ai_suggested_reply && (
            <div style={{ marginTop: 10, padding: 10, background: COLORS.bg, borderRadius: 10,
              fontSize: 13, color: COLORS.textSub }}>
              <b style={{ color: COLORS.text }}>AI gợi ý:</b> {m.ai_suggested_reply}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

function TabContentAI({ contentList, campaigns, khuyenMaiList, onReload, showToast }) {
  const [showForm, setShowForm] = useState(false)
  const sorted = [...contentList].sort((a, b) =>
    new Date(a.scheduled_at || a.created_at || 0) - new Date(b.scheduled_at || b.created_at || 0)
  )
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <div style={{ fontWeight: 800, color: COLORS.text }}>Lịch nội dung và ý tưởng</div>
        <button className="btn gold" onClick={() => setShowForm(true)}>+ Ý Tưởng</button>
      </div>
      {sorted.length === 0 ? (
        <EmptyBlock title="Chưa có lịch nội dung" sub="AI Content sẽ tạo ý tưởng, caption, hình ảnh và lịch đăng; bài đăng sẽ đi qua bước duyệt trước khi xuất bản." />
      ) : (
        <TableWrap>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: COLORS.bg, color: COLORS.textSub, textAlign: 'left' }}>
                {['Tiêu đề', 'Kênh', 'Loại', 'Lịch đăng', 'Trạng thái'].map(h => (
                  <th key={h} style={{ padding: '11px 12px', fontSize: 11, textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map(c => (
                <tr key={c.id} style={{ borderTop: `1px solid ${COLORS.border}` }}>
                  <td style={{ padding: 12, fontWeight: 800, color: COLORS.text }}>
                    {c.tieu_de}
                    <div style={{ fontSize: 11, fontWeight: 500, color: COLORS.textMute }}>{c.chu_de || c.noi_dung?.slice(0, 80) || '—'}</div>
                  </td>
                  <td style={{ padding: 12 }}>{KENH[c.kenh]?.label || c.kenh || '—'}</td>
                  <td style={{ padding: 12, color: COLORS.textSub }}>{c.loai_noi_dung || '—'}</td>
                  <td style={{ padding: 12, color: COLORS.textMute }}>
                    {c.scheduled_at ? new Date(c.scheduled_at).toLocaleString('vi-VN') : 'Chưa lên lịch'}
                  </td>
                  <td style={{ padding: 12 }}><Badge map={STATUS_CONTENT} value={c.trang_thai} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
      )}
      {showForm && (
        <FormContentIdea campaigns={campaigns} khuyenMaiList={khuyenMaiList}
          onSave={() => { setShowForm(false); onReload(); showToast('Đã lưu ý tưởng nội dung') }}
          onClose={() => setShowForm(false)} />
      )}
    </div>
  )
}

function TabAIActions({ aiActions, performance, automationRuns, onReload, showToast }) {
  const [running, setRunning] = useState('')
  const pending = aiActions.filter(a => ['de_xuat', 'cho_duyet'].includes(a.trang_thai))
  const bestCampaign = [...performance]
    .filter(p => (p.revenue || 0) > 0 || (p.leads || 0) > 0)
    .sort((a, b) => (b.roi ?? -999999) - (a.roi ?? -999999))[0]

  const runAI = async (mode, label) => {
    setRunning(mode)
    const { data, error } = await supabase.functions.invoke('marketing-ai', { body: { mode } })
    setRunning('')
    if (error) return showToast(`Lỗi ${label}: ${error.message || error}`)
    onReload()
    const count = data?.generated?.length ?? data?.inserted ?? data?.drafted ?? data?.executed?.length ?? 0
    showToast(`${label}: ${count} kết quả`)
  }

  const updateAction = async (action, nextStatus) => {
    setRunning(`${nextStatus}-${action.id}`)
    const approved = nextStatus === 'da_duyet'
    const updates = approved
      ? { trang_thai: 'da_duyet', approved_at: new Date().toISOString() }
      : { trang_thai: 'tu_choi' }

    const { error } = await supabase.from('marketing_ai_actions').update(updates).eq('id', action.id)
    if (error) {
      setRunning('')
      return showToast(`Lỗi cập nhật AI: ${error.message || error}`)
    }

    await supabase.from('marketing_approval_queue')
      .update({ trang_thai: approved ? 'da_duyet' : 'tu_choi' })
      .eq('ai_action_id', action.id)

    if (action.content_id) {
      await supabase.from('marketing_content_calendar')
        .update({ trang_thai: approved ? 'da_duyet' : 'huy' })
        .eq('id', action.content_id)
    }

    setRunning('')
    onReload()
    showToast(approved ? 'Đã duyệt hành động AI' : 'Đã từ chối hành động AI')
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center',
        background: 'white', border: `1px solid ${COLORS.border}`, borderRadius: 14, padding: 14,
        boxShadow: COLORS.shadow }}>
        <div>
          <div style={{ fontWeight: 800, color: COLORS.text }}>Trung tâm tự động hóa AI Marketing</div>
          <div style={{ fontSize: 12, color: COLORS.textMute, marginTop: 3 }}>
            Chạy cùng logic với cron: phân tích số liệu, tạo nội dung, xử lý hành động đã duyệt.
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <button className="btn gold" disabled={!!running} onClick={() => runAI('analyze', 'Phân tích AI')}>
            {running === 'analyze' ? 'Đang chạy...' : 'Phân Tích'}
          </button>
          <button className="btn" disabled={!!running} onClick={() => runAI('content_plan', 'Tạo lịch nội dung')}>
            {running === 'content_plan' ? 'Đang tạo...' : 'Tạo Nội Dung'}
          </button>
          <button className="btn" disabled={!!running} onClick={() => runAI('draft_content', 'Soạn nháp nội dung')}>
            {running === 'draft_content' ? 'Đang soạn...' : 'Soạn Nháp'}
          </button>
          <button className="btn" disabled={!!running} onClick={() => runAI('run_approved', 'Chạy hành động')}>
            {running === 'run_approved' ? 'Đang chạy...' : 'Chạy Đã Duyệt'}
          </button>
        </div>
      </div>

      <div className="strip" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
        <div className="it">
          <div className="l">Chờ AI xử lý</div>
          <div className="v">{pending.length}</div>
        </div>
        <div className="it">
          <div className="l">KH tiềm năng đo được</div>
          <div className="v">{performance.reduce((s, p) => s + (p.leads || 0), 0)}</div>
        </div>
        <div className="it">
          <div className="l">Doanh thu gắn nguồn</div>
          <div className="v">{fmtShort(performance.reduce((s, p) => s + (p.revenue || 0), 0))}<span className="cur">đ</span></div>
        </div>
        <div className="it">
          <div className="l">Chiến dịch tốt nhất</div>
          <div className="v" style={{ fontSize: 18 }}>{bestCampaign?.roi != null ? `${bestCampaign.roi}%` : '—'}</div>
        </div>
      </div>

      {aiActions.length === 0 ? (
        <EmptyBlock title="Chưa có đề xuất AI" sub="Khi có dữ liệu khách tiềm năng, tin nhắn và chi phí, AI sẽ tạo đề xuất trả lời khách, đăng bài hoặc tối ưu quảng cáo tại đây." />
      ) : (
        <TableWrap>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: COLORS.bg, color: COLORS.textSub, textAlign: 'left' }}>
                {['Đề xuất', 'Phạm vi', 'Rủi ro', 'Ảnh hưởng tiền', 'Trạng thái', 'Thao tác'].map(h => (
                  <th key={h} style={{ padding: '11px 12px', fontSize: 11, textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {aiActions.map(a => (
                <tr key={a.id} style={{ borderTop: `1px solid ${COLORS.border}` }}>
                  <td style={{ padding: 12, fontWeight: 800, color: COLORS.text }}>
                    {a.title}
                    <div style={{ fontSize: 11, fontWeight: 500, color: COLORS.textMute }}>{a.recommendation || a.ly_do || '—'}</div>
                  </td>
                  <td style={{ padding: 12 }}>{a.scope}</td>
                  <td style={{ padding: 12, color: a.risk_level === 'high' ? '#C0392B' : COLORS.textSub }}>{a.risk_level}</td>
                  <td style={{ padding: 12, color: COLORS.textSub }}>{a.cost_impact ? fmt(a.cost_impact) : '—'}</td>
                  <td style={{ padding: 12 }}><Badge map={STATUS_AI} value={a.trang_thai} /></td>
                  <td style={{ padding: 12 }}>
                    {['de_xuat', 'cho_duyet'].includes(a.trang_thai) ? (
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        <button className="btn" disabled={!!running} onClick={() => updateAction(a, 'da_duyet')}>Duyệt</button>
                        <button className="btn" disabled={!!running} onClick={() => updateAction(a, 'tu_choi')}>Từ chối</button>
                      </div>
                    ) : <span style={{ color: COLORS.textMute }}>—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
      )}

      <div>
        <div style={{ fontWeight: 800, color: COLORS.text, marginBottom: 10 }}>Lịch sử AI tự động chạy</div>
        {automationRuns.length === 0 ? (
          <EmptyBlock title="Chưa có lịch sử chạy AI" sub="Khi webhook, phân tích chiến dịch hoặc tạo nội dung chạy, nhật ký sẽ xuất hiện ở đây." />
        ) : (
          <TableWrap>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: COLORS.bg, color: COLORS.textSub, textAlign: 'left' }}>
                  {['Chế độ', 'Kết quả', 'Lúc chạy', 'Ghi chú'].map(h => (
                    <th key={h} style={{ padding: '11px 12px', fontSize: 11, textTransform: 'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {automationRuns.map(r => (
                  <tr key={r.id} style={{ borderTop: `1px solid ${COLORS.border}` }}>
                    <td style={{ padding: 12, fontWeight: 800, color: COLORS.text }}>{r.mode}</td>
                    <td style={{ padding: 12, color: r.status === 'error' ? '#C0392B' : '#2D7A4F', fontWeight: 800 }}>{r.status}</td>
                    <td style={{ padding: 12, color: COLORS.textMute }}>{new Date(r.created_at).toLocaleString('vi-VN')}</td>
                    <td style={{ padding: 12, color: COLORS.textSub }}>{r.error_message || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
        )}
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════════════════════════════════════════
function TabFanpage({ pageOverview, pagePosts, pageComments, messages = [], onReload, showToast }) {
  const [running, setRunning] = useState(false)
  const [showConnect, setShowConnect] = useState(false)
  const [connectForm, setConnectForm] = useState({ page_id: '', page_access_token: '' })
  const [connectErr, setConnectErr] = useState('')
  const syncFanpage = async () => {
    setRunning(true)
    const { data, error } = await supabase.functions.invoke('marketing-meta-page-sync', { body: { source: 'manual' } })
    setRunning(false)
    if (error) return showToast(`Lỗi đồng bộ Fanpage: ${error.message || error}`)
    onReload()
    showToast(`Đã đồng bộ ${data?.synced || 0} Fanpage`)
  }
  const backfillFanpage = async () => {
    setRunning(true)
    const { data, error } = await supabase.functions.invoke('marketing-meta-page-sync', {
      body: {
        mode: 'backfill_facebook',
        source: 'manual',
        since_date: '2025-11-26',
        conversation_limit: 100,
        message_limit: 50,
        message_pages_per_conversation: 5,
        max_messages_per_conversation: 500,
        max_pages: 3,
        max_rows: 1000,
        post_limit: 100,
        post_pages: 3,
        post_page_limit: 50,
        comment_limit: 50,
        comment_pages_per_post: 2,
        comment_post_limit: 100,
        max_comment_rows: 1000,
      },
    })
    setRunning(false)
    if (error) return showToast(`Lỗi backfill Fanpage: ${error.message || error}`)
    onReload()
    const first = data?.results?.[0] || {}
    showToast(`Đã backfill từ 26/11: ${first.posts || 0} bài, ${first.comments || 0} bình luận, ${first.messages || 0} tin nhắn`)
  }
  const connectFanpage = async () => {
    if (!connectForm.page_id.trim()) return setConnectErr('Nhập Page ID')
    if (!connectForm.page_access_token.trim()) return setConnectErr('Nhập Page Access Token')
    setRunning(true); setConnectErr('')
    const { data, error } = await supabase.functions.invoke('marketing-meta-page-sync', {
      body: {
        mode: 'connect_page',
        page_id: connectForm.page_id.trim(),
        page_access_token: connectForm.page_access_token.trim(),
      },
    })
    setRunning(false)
    if (error) return setConnectErr(error.message || String(error))
    setShowConnect(false)
    setConnectForm({ page_id: '', page_access_token: '' })
    onReload()
    showToast(`Đã kết nối ${data?.page?.name || 'Fanpage'}`)
  }

  const tongPost = pageOverview.reduce((s, p) => s + (p.so_bai_viet || 0), 0)
  const tongComment = pageOverview.reduce((s, p) => s + (p.so_binh_luan || 0), 0)
  const tongFollowers = pageOverview.reduce((s, p) => s + (p.followers_count || p.fan_count || 0), 0)
  const tongTalking = pageOverview.reduce((s, p) => s + (p.talking_about_count || 0), 0)
  const tongInteraction = pageOverview.reduce((s, p) => s + (p.tong_tuong_tac || 0), 0)
  const inboxCount = messages.filter(m => m.kenh === 'facebook').length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center',
        background: 'white', border: `1px solid ${COLORS.border}`, borderRadius: 14, padding: 14,
        boxShadow: COLORS.shadow }}>
        <div>
          <div style={{ fontWeight: 800, color: COLORS.text }}>Fanpage Intelligence</div>
          <div style={{ fontSize: 12, color: COLORS.textMute, marginTop: 3 }}>
            Đồng bộ thông tin Fanpage, bài viết, bình luận và insight. Tài khoản quảng cáo chưa bật ở giai đoạn này.
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <button className="btn" disabled={running} onClick={() => setShowConnect(v => !v)}>
            Kết Nối Fanpage
          </button>
          <button className="btn" disabled={running} onClick={backfillFanpage}>
            {running ? 'Đang lấy dữ liệu...' : 'Backfill 26/11 → nay'}
          </button>
          <button className="btn gold" disabled={running} onClick={syncFanpage}>
            {running ? 'Đang đồng bộ...' : 'Đồng Bộ Fanpage'}
          </button>
        </div>
      </div>

      {showConnect && (
        <div style={{ background: 'white', border: `1px solid ${COLORS.border}`, borderRadius: 14, padding: 14,
          boxShadow: COLORS.shadow, display: 'grid', gridTemplateColumns: '1fr 1.4fr auto', gap: 10, alignItems: 'end' }}>
          <div>
            <label style={lbl}>PAGE ID</label>
            <input style={inp} value={connectForm.page_id}
              onChange={e => setConnectForm(f => ({ ...f, page_id: e.target.value }))} placeholder="VD: 123456789" />
          </div>
          <div>
            <label style={lbl}>PAGE ACCESS TOKEN</label>
            <input style={inp} type="password" value={connectForm.page_access_token}
              onChange={e => setConnectForm(f => ({ ...f, page_access_token: e.target.value }))} placeholder="Token chỉ gửi vào backend, không lưu ở frontend" />
          </div>
          <button className="btn gold" disabled={running} onClick={connectFanpage}>
            {running ? 'Đang kết nối...' : 'Kết Nối'}
          </button>
          {connectErr && <div style={{ gridColumn: '1 / -1', color: '#C0392B', fontSize: 12, fontWeight: 700 }}>{connectErr}</div>}
        </div>
      )}

      <div className="strip" style={{ gridTemplateColumns: 'repeat(6,1fr)' }}>
        <div className="it"><div className="l">Fanpage</div><div className="v">{pageOverview.length}</div></div>
        <div className="it"><div className="l">Followers</div><div className="v">{fmtShort(tongFollowers)}</div></div>
        <div className="it"><div className="l">Đang nhắc đến</div><div className="v">{fmtShort(tongTalking)}</div></div>
        <div className="it"><div className="l">Bài viết</div><div className="v">{tongPost}</div></div>
        <div className="it"><div className="l">Tương tác</div><div className="v">{fmtShort(tongInteraction)}</div></div>
        <div className="it"><div className="l">Inbox</div><div className="v">{inboxCount}</div></div>
      </div>

      {pageOverview.length === 0 ? (
        <EmptyBlock title="Chưa có Fanpage kết nối" sub="Tạo Page record trong Supabase, lưu Page Access Token bằng Vault/env, rồi bấm Đồng Bộ Fanpage để kéo dữ liệu thật." />
      ) : (
        <TableWrap>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: COLORS.bg, color: COLORS.textSub, textAlign: 'left' }}>
                {['Fanpage', 'Followers', 'Đang nhắc', 'Bài viết', 'Tương tác', 'Comment', 'Đồng bộ cuối', 'Ads'].map(h => (
                  <th key={h} style={{ padding: '11px 12px', fontSize: 11, textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pageOverview.map(p => (
                <tr key={p.id} style={{ borderTop: `1px solid ${COLORS.border}` }}>
                  <td style={{ padding: 12, fontWeight: 800, color: COLORS.text }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      {p.avatar_url && <img src={p.avatar_url} alt="" style={{ width: 34, height: 34, borderRadius: '50%', objectFit: 'cover' }} />}
                      <div>
                        <div>{p.page_name}</div>
                        <div style={{ fontSize: 11, color: COLORS.textMute, fontWeight: 500 }}>{p.page_url || p.page_id}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: 12 }}>{fmtShort(p.followers_count || p.fan_count || 0)}</td>
                  <td style={{ padding: 12 }}>{fmtShort(p.talking_about_count || 0)}</td>
                  <td style={{ padding: 12 }}>{p.so_bai_viet || 0}</td>
                  <td style={{ padding: 12 }}>{fmtShort(p.tong_tuong_tac || 0)}</td>
                  <td style={{ padding: 12 }}>{p.so_binh_luan || 0}</td>
                  <td style={{ padding: 12, color: COLORS.textMute }}>{p.last_synced_at ? new Date(p.last_synced_at).toLocaleString('vi-VN') : '—'}</td>
                  <td style={{ padding: 12 }}>{p.ads_enabled ? 'Đã bật' : 'Chưa bật'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 16 }}>
        <div>
          <div style={{ fontWeight: 800, color: COLORS.text, marginBottom: 10 }}>Bài viết mới</div>
          {pagePosts.length === 0 ? (
            <EmptyBlock title="Chưa có bài viết đồng bộ" sub="Sau khi kết nối Page, bài viết mới nhất sẽ hiện ở đây để AI phân tích nội dung." />
          ) : (
            <TableWrap>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <tbody>
                  {pagePosts.slice(0, 12).map(p => (
                    <tr key={p.id} style={{ borderTop: `1px solid ${COLORS.border}` }}>
                      <td style={{ padding: 12 }}>
                        <div style={{ fontWeight: 800, color: COLORS.text }}>{p.message?.slice(0, 90) || p.story || 'Bài viết Fanpage'}</div>
                        <div style={{ fontSize: 11, color: COLORS.textMute, marginTop: 4 }}>
                          {p.created_time ? new Date(p.created_time).toLocaleString('vi-VN') : '—'} · {p.reactions_count || 0} tương tác · {p.comments_count || 0} comment
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableWrap>
          )}
        </div>

        <div>
          <div style={{ fontWeight: 800, color: COLORS.text, marginBottom: 10 }}>Bình luận mới</div>
          {pageComments.length === 0 ? (
            <EmptyBlock title="Chưa có bình luận đồng bộ" sub="Comment mới sẽ giúp AI nhận diện nhu cầu, khách ưu tiên và gợi ý trả lời." />
          ) : (
            <TableWrap>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <tbody>
                  {pageComments.slice(0, 12).map(c => (
                    <tr key={c.id} style={{ borderTop: `1px solid ${COLORS.border}` }}>
                      <td style={{ padding: 12 }}>
                        <div style={{ fontWeight: 800, color: COLORS.text }}>{c.from_name || 'Khách Fanpage'}</div>
                        <div style={{ fontSize: 12, color: COLORS.textSub, marginTop: 4 }}>{c.message || '—'}</div>
                        <div style={{ fontSize: 11, color: COLORS.textMute, marginTop: 4 }}>{c.created_time ? new Date(c.created_time).toLocaleString('vi-VN') : '—'}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableWrap>
          )}
        </div>
      </div>
    </div>
  )
}

const MKT_PATH_TAB = {
  '/admin/marketing':            'dashboard',
  '/admin/marketing/chien-dich': 'chien-dich',
  '/admin/marketing/leads':      'leads',
  '/admin/marketing/fanpage':    'fanpage',
  '/admin/marketing/inbox':      'inbox-ai',
  '/admin/marketing/noi-dung':   'noi-dung',
  '/admin/marketing/ai':         'ai',
  '/admin/marketing/chi-phi':    'chi-phi',
}

export default function AdminMarketingPage() {
  const [tab, setTab]                     = useState(() => MKT_PATH_TAB[window.location.pathname] || 'dashboard')
  const [campaigns, setCampaigns]         = useState([])
  const [khuyenMaiList, setKhuyenMaiList] = useState([])
  const [chiPhiMarketing, setChiPhi]      = useState([])
  const [danhMucMarketing, setDanhMuc]    = useState([])
  const [leads, setLeads]                 = useState([])
  const [messages, setMessages]           = useState([])
  const [pageOverview, setPageOverview]    = useState([])
  const [pagePosts, setPagePosts]          = useState([])
  const [pageComments, setPageComments]    = useState([])
  const [contentList, setContentList]      = useState([])
  const [aiActions, setAiActions]          = useState([])
  const [performance, setPerformance]      = useState([])
  const [automationRuns, setAutomationRuns] = useState([])
  const [attributionPipeline, setAttributionPipeline] = useState([])
  const [unmatchedLeads, setUnmatchedLeads] = useState([])
  const [reactivationCustomers, setReactivationCustomers] = useState([])
  const [fanpageHealth, setFanpageHealth] = useState([])
  const [audienceStats, setAudienceStats] = useState(null)
  const [customer360, setCustomer360] = useState([])
  const [sourceQuality, setSourceQuality] = useState([])
  const [dichVuList, setDichVuList]        = useState([])
  const [ktvList, setKtvList]              = useState([])
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

    const [{ data: cd }, { data: km }, { data: cp }, leadRes, msgRes, pageRes, postRes, commentRes, contentRes, actionRes, perfRes, runRes, attrRes, unmatchedRes, reactRes, healthRes, customer360Res, sourceQualityRes, dvRes, ktvRes] = await Promise.all([
      supabase.from('chien_dich_marketing').select('*').order('created_at', { ascending: false }),
      supabase.from('khuyen_mai').select('id,ten').order('created_at', { ascending: false }),
      mktDMIds.length > 0
        ? supabase.from('chi_phi').select('id,ngay,danh_muc_id,so_tien,dien_giai,created_at')
            .in('danh_muc_id', mktDMIds).order('ngay', { ascending: false }).limit(500)
        : Promise.resolve({ data: [] }),
      supabase.from('marketing_leads').select('*').neq('trang_thai', 'spam').order('created_at', { ascending: false }).limit(200),
      supabase.from('marketing_messages').select('*').order('created_at', { ascending: false }).limit(200),
      supabase.from('v_marketing_fanpage_overview').select('*'),
      supabase.from('marketing_page_posts').select('*').order('created_time', { ascending: false }).limit(100),
      supabase.from('marketing_page_comments').select('*').order('created_time', { ascending: false }).limit(100),
      supabase.from('marketing_content_calendar').select('*').order('created_at', { ascending: false }).limit(200),
      supabase.from('marketing_ai_actions').select('*').order('created_at', { ascending: false }).limit(200),
      supabase.from('v_marketing_campaign_performance').select('*'),
      supabase.from('marketing_automation_runs').select('*').order('created_at', { ascending: false }).limit(100),
      supabase.from('v_marketing_attribution_pipeline').select('*').order('thang', { ascending: false }),
      supabase.from('v_marketing_unmatched_leads').select('*').order('diem_tiem_nang', { ascending: false }).limit(100),
      supabase.from('v_marketing_reactivation_customers').select('*').limit(200),
      supabase.from('v_marketing_fanpage_health').select('*'),
      supabase.from('v_marketing_customer_360').select('*').order('total_revenue', { ascending: false }).limit(300),
      supabase.from('v_marketing_source_quality').select('*').order('revenue', { ascending: false }).limit(50),
      supabase.from('dich_vu').select('id,ten').eq('is_active', true).order('ten').limit(500),
      supabase.from('nhan_vien').select('id,ho_ten').eq('trang_thai', 'dang_lam').in('vi_tri', ['ktv', 'le_tan']).order('ho_ten'),
    ])

    setCampaigns(cd || [])
    setKhuyenMaiList(km || [])
    setChiPhi(cp || [])
    setDanhMuc(allDM?.filter(d => d.parent_id === marketingParent?.id) || [])
    setLeads(leadRes.data || [])
    setMessages(msgRes.data || [])
    setPageOverview(pageRes.data || [])
    setPagePosts(postRes.data || [])
    setPageComments(commentRes.data || [])
    setContentList(contentRes.data || [])
    setAiActions(actionRes.data || [])
    setPerformance(perfRes.data || [])
    setAutomationRuns(runRes.data || [])
    setAttributionPipeline(attrRes.data || [])
    setUnmatchedLeads((unmatchedRes.data || []).filter(isActiveLead))
    setReactivationCustomers(reactRes.data || [])
    setFanpageHealth(healthRes.data || [])
    setCustomer360(customer360Res.data || [])
    setSourceQuality(sourceQualityRes.data || [])
    setDichVuList(dvRes.data || [])
    setKtvList(ktvRes.data || [])
    setLoading(false)

    supabase.functions.invoke('marketing-ai', {
      body: {
        mode: 'fanpage_audience_stats',
        since_date: '2025-11-25',
        limit: 30000,
      },
    }).then(({ data }) => setAudienceStats(data || null)).catch(() => {})
  }, [])

  useEffect(() => { load() }, [load])

  const runAttributionBridge = async () => {
    showToast('Đang nối khách tiềm năng với khách hàng/đơn hàng...')
    const { data, error } = await supabase.functions.invoke('marketing-ai', {
      body: { mode: 'attribution_bridge', days_after: 90 },
    })
    if (error) return showToast(`Lỗi nối dữ liệu: ${error.message || error}`)
    await load()
    showToast(`Đã nối: ${data?.linked_customers || 0} khách, ${data?.linked_orders || 0} đơn`)
  }

  const runFacebookPipeline = async () => {
    showToast('Đang kéo thêm inbox Fanpage rồi lọc SĐT/phân loại khách...')
    const inboxBatch = await supabase.functions.invoke('marketing-meta-page-sync', {
      body: {
        mode: 'sync_conversations_batch',
        since_date: '2025-11-25',
        conversation_limit: 100,
        conversation_page_limit: 1,
        message_limit: 25,
        message_pages_per_conversation: 1,
        max_rows: 2000,
      },
    })
    if (inboxBatch.error) return showToast(`Lỗi kéo inbox Fanpage: ${inboxBatch.error.message || inboxBatch.error}`)

    const cleanup = await supabase.functions.invoke('marketing-ai', { body: { mode: 'cleanup_fanpage_leads', limit: 2000 } })
    if (cleanup.error) return showToast(`Lỗi lọc dữ liệu Fanpage: ${cleanup.error.message || cleanup.error}`)

    const triage = await supabase.functions.invoke('marketing-ai', { body: { mode: 'triage_fanpage', message_limit: 50, comment_limit: 50 } })
    if (triage.error) return showToast(`Lỗi phân loại Fanpage: ${triage.error.message || triage.error}`)

    const phoneScan = await supabase.functions.invoke('marketing-ai', { body: { mode: 'resolve_conversation_phones', limit: 5000 } })
    if (phoneScan.error) return showToast(`Lỗi quét SĐT trong hội thoại: ${phoneScan.error.message || phoneScan.error}`)

    const identities = await supabase.functions.invoke('marketing-ai', { body: { mode: 'resolve_identities' } })
    if (identities.error) return showToast(`Lỗi nhận diện khách: ${identities.error.message || identities.error}`)

    const attribution = await supabase.functions.invoke('marketing-ai', {
      body: { mode: 'attribution_bridge', days_after: 90 },
    })
    if (attribution.error) return showToast(`Lỗi nối doanh thu: ${attribution.error.message || attribution.error}`)

    await load()
    const msgCount = Number(triage.data?.messages || 0)
    const commentCount = Number(triage.data?.comments || 0)
    const batchResult = inboxBatch.data?.results?.[0] || {}
    const batchConversations = Number(batchResult.fetched_conversations || 0)
    const batchMessages = Number(batchResult.saved_messages || 0)
    const phoneCount = Number(phoneScan.data?.conversations_with_phone || 0)
    const customersCreated = Number(phoneScan.data?.customers_created || 0)
    const customersLinked = Number(phoneScan.data?.customers_linked || 0)
    const linkedLeads = Number(identities.data?.linked_leads || 0)
    const linkedOrders = Number(attribution.data?.linked_orders || 0)
    showToast(`Đã kéo ${batchConversations} hội thoại/${batchMessages} tin nhắn; phân loại ${msgCount} inbox, ${commentCount} comment, ${phoneCount} hội thoại có SĐT, nối ${customersLinked || linkedLeads} khách, tạo ${customersCreated} hồ sơ, ${linkedOrders} đơn`)
  }

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
    { key: 'leads',      icon: '👥', label: 'KH tiềm năng' },
    { key: 'inbox-ai',   icon: '💬', label: 'Inbox AI' },
    { key: 'noi-dung',   icon: '🗓️', label: 'Nội Dung' },
    { key: 'ai',         icon: '✨', label: 'AI Đề Xuất' },
    { key: 'chi-phi',    icon: '💸', label: 'Chi Phí' },
  ]

  return (
    <>
      {/* mod-head */}
      <div className="mod-head" style={{ marginBottom: 20 }}>
        <div>
          <div className="ttl">Marketing</div>
          <div className="sub">Chiến dịch · Khách hàng tiềm năng · Inbox AI · Nội dung · Tối ưu quảng cáo</div>
        </div>
        <div className="acts">
          <div className="subtabs">
            {TABS.map(t => (
              <div key={t.key} className={`st${tab === t.key ? ' active' : ''}`} onClick={() => setTab(t.key)}>
                {t.label}
              </div>
            ))}
            <div className={`st${tab === 'fanpage' ? ' active' : ''}`} onClick={() => setTab('fanpage')}>
              Fanpage
            </div>
          </div>
          {tab === 'chien-dich' && (
            <button className="btn gold" onClick={() => setTab('chien-dich')}>
              + Chiến Dịch
            </button>
          )}
        </div>
      </div>

      {/* Strip KPIs */}
      <div className="strip" style={{ gridTemplateColumns: 'repeat(4,1fr)', marginBottom: 20 }}>
        <div className="it">
          <div className="l">Đang Chạy</div>
          <div className="v" style={{ color: 'var(--thu)' }}>{activeCampaigns.length}</div>
          <div className="d">chiến dịch</div>
        </div>
        <div className="it">
          <div className="l">Chi Tháng Này</div>
          <div className="v">{fmtShort(chiThang)}<span className="cur">đ</span></div>
        </div>
        <div className="it">
          <div className="l">Tổng Ngân Sách</div>
          <div className="v">{fmtShort(tongNganSach)}<span className="cur">đ</span></div>
        </div>
        <div className="it">
          <div className="l">KH Tiềm Năng Đo Được</div>
          <div className="v">{leads.length || tongKHMoi}<span className="cur"> khách</span></div>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--ink3)' }}>
          <div style={{ width: 44, height: 72, margin: '0 auto 16px', background: 'var(--grad-arch)', borderRadius: '999px 999px 12px 12px', opacity: .3, animation: 'floatGlow 2.5s ease-in-out infinite alternate' }} />
          Đang tải dữ liệu marketing...
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
          {tab === 'leads' && (
            <TabLeads leads={leads} campaigns={campaigns} dichVuList={dichVuList} ktvList={ktvList}
              attributionPipeline={attributionPipeline} unmatchedLeads={unmatchedLeads}
              reactivationCustomers={reactivationCustomers} fanpageHealth={fanpageHealth}
              audienceStats={audienceStats} customer360={customer360} sourceQuality={sourceQuality}
              onRunPipeline={runFacebookPipeline} onRunAttribution={runAttributionBridge}
              onReload={load} showToast={showToast} />
          )}
          {tab === 'fanpage' && (
            <TabFanpage pageOverview={pageOverview} pagePosts={pagePosts} pageComments={pageComments} messages={messages}
              onReload={load} showToast={showToast} />
          )}
          {tab === 'inbox-ai' && (
            <TabInboxAI messages={messages} />
          )}
          {tab === 'noi-dung' && (
            <TabContentAI contentList={contentList} campaigns={campaigns} khuyenMaiList={khuyenMaiList}
              onReload={load} showToast={showToast} />
          )}
          {tab === 'ai' && (
            <TabAIActions aiActions={aiActions} performance={performance} automationRuns={automationRuns}
              onReload={load} showToast={showToast} />
          )}
          {tab === 'chi-phi' && (
            <TabChiPhi chiPhiMarketing={chiPhiMarketing} danhMucMarketing={danhMucMarketing} />
          )}
        </>
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
