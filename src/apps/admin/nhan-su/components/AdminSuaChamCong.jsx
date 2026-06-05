import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { supabase } from '../../../../lib/supabase'
import { LUX } from '../../../../constants/lux'
import { getNowVN } from '../../../../lib/utils'
import { leTanCaInfo } from '../../../../lib/luong'
import ConfirmDialog from '../../../../components/shared/ConfirmDialog'

const CA_VAO_CHUAN = { h: 9, m: 15 }
const CA_RA_CHUAN = { h: 20, m: 0 }
const PHUT_CA_CHUAN = (CA_RA_CHUAN.h * 60 + CA_RA_CHUAN.m) - (CA_VAO_CHUAN.h * 60 + CA_VAO_CHUAN.m)

function toPhut(timeStr) {
  const [h, m] = (timeStr || '0:0').split(':').map(Number)
  return h * 60 + m
}

function tinhHeSo(gioVao, gioRa) {
  const lam = Math.max(0, toPhut(gioRa) - toPhut(gioVao))
  const pct = Math.min(100, (lam / PHUT_CA_CHUAN) * 100)
  return Math.round(pct) / 100
}

function tinhTangCa(gioRa) {
  const diff = toPhut(gioRa) - (CA_RA_CHUAN.h * 60 + CA_RA_CHUAN.m)
  if (diff < 15) return 0
  return Math.round(diff / 60 * 100) / 100
}

function getDaysInMonth(year, month) {
  return new Date(year, month, 0).getDate()
}

function fmtNgay(iso) {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

function fmtDateLabel(y, m, d) {
  const date = new Date(y, m - 1, d)
  const days = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7']
  return { thu: days[date.getDay()], isWeekend: date.getDay() === 0 || date.getDay() === 6 }
}

const LOAI_OPTS = [
  { value: 'di_lam', label: 'Đi làm', icon: '💼' },
  { value: 'off_phep', label: 'OFF Phép', icon: '✅' },
  { value: 'off_ov', label: 'OFF Vượt', icon: '❌' },
  { value: 'off_t7', label: 'OFF T7/CN (có lý do)', icon: '📴' },
  { value: 'off_t7x', label: 'OFF T7/CN (vi phạm)', icon: '⚠️' },
]

// T7/CN chỉ hiện khi ngày đó thực sự là Thứ 7 / Chủ Nhật
function isWeekendDate(iso) {
  if (!iso) return false
  const [y, m, d] = String(iso).slice(0, 10).split('-').map(Number)
  const dow = new Date(y, m - 1, d).getDay()
  return dow === 0 || dow === 6
}

export default function AdminSuaChamCong({ nhanVien, onClose, onSaved, initialDate = null, initialThang, initialNam }) {
  const now = getNowVN()
  const [thang, setThang] = useState(initialThang || now.getMonth() + 1)
  const [nam, setNam] = useState(initialNam || now.getFullYear())
  const [ccList, setCcList] = useState([])
  const [offList, setOffList] = useState([])
  const [buNgayLe, setBuNgayLe] = useState(new Set())  // ngày được bù bằng quỹ ngày lễ (ISO)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editDay, setEditDay] = useState(null)
  const [toast, setToast] = useState(null)
  const [confirm, setConfirm] = useState(null)
  const [autoDone, setAutoDone] = useState(false)

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 2500)
  }

  useEffect(() => { fetchData() }, [thang, nam])

  // Click 1 ngày trong lịch lương → mở thẳng form sửa ngày đó (1 lần)
  useEffect(() => {
    if (loading || !initialDate || autoDone) return
    setAutoDone(true)
    const cc = ccList.find(r => r.ngay === initialDate)
    if (cc) openEditDay(cc)
    else openNewDay(initialDate)
  }, [loading, initialDate, autoDone])

  const fetchData = async () => {
    setLoading(true)
    try {
      const startDate = `${nam}-${String(thang).padStart(2, '0')}-01`
      const lastDay = getDaysInMonth(nam, thang)
      const endDate = `${nam}-${String(thang).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

      const [resCc, resOff, resQuy] = await Promise.all([
        supabase.from('cham_cong')
          .select('id, ngay, loai, gio_vao, gio_ra, he_so, tang_ca_gio')
          .eq('nhan_vien_id', nhanVien.id)
          .gte('ngay', startDate).lte('ngay', endDate)
          .order('ngay'),
        supabase.from('dang_ky_off')
          .select('ngay_off, loai_off, trang_thai')
          .eq('nhan_vien_id', nhanVien.id)
          .gte('ngay_off', startDate).lte('ngay_off', endDate)
          .eq('trang_thai', 'duoc_duyet'),
        supabase.from('quy_ngay_off')
          .select('lich_su_dung')
          .eq('nhan_vien_id', nhanVien.id).eq('nam', nam).maybeSingle(),
      ])
      setCcList(resCc.data || [])
      setOffList(resOff.data || [])
      // Các ngày được BÙ bằng quỹ ngày lễ trong tháng đang xem
      const buSet = new Set()
      const ls = Array.isArray(resQuy.data?.lich_su_dung) ? resQuy.data.lich_su_dung : []
      ls.filter(e => Number(e.nam) === nam && Number(e.thang) === thang)
        .forEach(e => (Array.isArray(e.cac_ngay_bu) ? e.cac_ngay_bu : []).forEach(d => {
          // chuẩn hoá về ISO yyyy-mm-dd (chấp nhận cả dd/mm/yyyy hoặc dd/mm)
          const s = String(d).trim()
          if (/^\d{4}-\d{2}-\d{2}/.test(s)) buSet.add(s.slice(0, 10))
          else {
            const p = s.split('/')
            if (p.length >= 2) buSet.add(`${p[2] || nam}-${String(p[1]).padStart(2, '0')}-${String(p[0]).padStart(2, '0')}`)
          }
        }))
      setBuNgayLe(buSet)
    } catch (e) { console.error('AdminSuaChamCong:', e) }
    finally { setLoading(false) }
  }

  // Build day map
  const lastDay = getDaysInMonth(nam, thang)
  const gioiHanOff = nhanVien.gioi_han_off_thang || 3

  const ccByDay = {}
  ccList.forEach(r => { ccByDay[r.ngay] = r })

  const offByDay = {}
  offList.forEach(r => { offByDay[r.ngay_off] = r })

  // Stats
  const offPhepList = offList.filter(r => r.loai_off === 'off_phep')
  const offOvList = offList.filter(r => r.loai_off === 'off_ov')
  // off_phep vượt giới hạn → tính vào OV
  const offPhepCoLuong = offPhepList.slice(0, gioiHanOff)
  const offPhepVuot = offPhepList.slice(gioiHanOff)

  // Also count OFF from cham_cong (admin manually added)
  const offFromCc = ccList.filter(r => r.loai !== 'di_lam')

  const ngayCong = ccList
    .filter(r => r.loai === 'di_lam')
    .reduce((sum, r) => sum + (r.he_so || 0), 0)

  const tongTangCa = ccList
    .filter(r => r.loai === 'di_lam')
    .reduce((sum, r) => sum + (r.tang_ca_gio || 0), 0)

  const offCoLuong = offPhepCoLuong.length
  const offKoLuong = offOvList.length + offPhepVuot.length
  const offT7Cn = offList.filter(r => r.loai_off === 'off_t7' || r.loai_off === 'off_t7x').length
    + offFromCc.filter(r => r.loai === 'off_t7' || r.loai === 'off_t7x').length
  const viPhamT7x = offList.filter(r => r.loai_off === 'off_t7x').length
    + offFromCc.filter(r => r.loai === 'off_t7x').length

  // Build day list
  const days = []
  for (let d = 1; d <= lastDay; d++) {
    const dateStr = `${nam}-${String(thang).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    const cc = ccByDay[dateStr]
    const off = offByDay[dateStr]
    const { thu, isWeekend } = fmtDateLabel(nam, thang, d)
    days.push({ d, dateStr, thu, isWeekend, cc, off })
  }

  const handleSaveDay = async () => {
    if (!editDay) return
    const { cc, isNew } = editDay
    setSaving(true)
    try {
      if (cc.loai === 'di_lam') {
        if (!cc.gio_vao) {
          showToast('Vui lòng nhập giờ vào', 'error')
          setSaving(false)
          return
        }
        const heSo = cc.gio_ra ? tinhHeSo(cc.gio_vao, cc.gio_ra) : 0
        const tangCaGio = cc.gio_ra ? tinhTangCa(cc.gio_ra) : 0
        const payload = {
          nhan_vien_id: nhanVien.id,
          ngay: cc.ngay,
          loai: 'di_lam',
          gio_vao: cc.gio_vao,
          gio_ra: cc.gio_ra || null,
          he_so: cc.he_so_override !== undefined ? cc.he_so_override : heSo,
          tang_ca_gio: cc.tang_ca_override !== undefined ? cc.tang_ca_override : tangCaGio,
          he_so_tam: heSo,
          nguoi_cham: 'Admin',
        }
        if (isNew) {
          const { error } = await supabase.from('cham_cong').insert(payload)
          if (error) throw error
        } else {
          const { error } = await supabase.from('cham_cong').update(payload).eq('id', cc.id)
          if (error) throw error
        }
      } else {
        // OFF type
        const payload = {
          nhan_vien_id: nhanVien.id,
          ngay: cc.ngay,
          loai: cc.loai,
          gio_vao: null,
          gio_ra: null,
          he_so: 0,
          tang_ca_gio: 0,
          he_so_tam: 0,
          nguoi_cham: 'Admin',
        }
        if (isNew) {
          const { error } = await supabase.from('cham_cong').insert(payload)
          if (error) throw error
        } else {
          const { error } = await supabase.from('cham_cong').update(payload).eq('id', cc.id)
          if (error) throw error
        }
      }
      showToast('✓ Đã lưu chấm công')
      setEditDay(null)
      await fetchData()
      if (onSaved) onSaved()
    } catch (e) { showToast('Lỗi: ' + e.message, 'error') }
    finally { setSaving(false) }
  }

  const handleDeleteDay = () => {
    if (!editDay || editDay.isNew) { setEditDay(null); return }
    setConfirm({
      title: 'Xoá Chấm Công',
      message: `Xoá bản ghi chấm công ngày ${fmtNgay(editDay.cc.ngay)}?`,
      confirmLabel: 'Xoá',
      danger: true,
      onConfirm: async () => {
        setConfirm(null)
        setSaving(true)
        try {
          const { error } = await supabase.from('cham_cong').delete().eq('id', editDay.cc.id)
          if (error) throw error
          showToast('✓ Đã xoá bản ghi')
          setEditDay(null)
          await fetchData()
          if (onSaved) onSaved()
        } catch (e) { showToast('Lỗi: ' + e.message, 'error') }
        finally { setSaving(false) }
      },
    })
  }

  const openNewDay = (dateStr) => {
    setEditDay({ cc: { ngay: dateStr, loai: 'di_lam', gio_vao: '09:15', gio_ra: '20:00', he_so_override: undefined, tang_ca_override: undefined }, isNew: true })
  }

  const openEditDay = (cc) => {
    setEditDay({ cc: { ...cc, he_so_override: cc.he_so, tang_ca_override: cc.tang_ca_gio }, isNew: false })
  }

  const prevMonth = () => {
    if (thang === 1) { setThang(12); setNam(n => n - 1) }
    else setThang(t => t - 1)
  }
  const nextMonth = () => {
    if (thang === 12) { setThang(1); setNam(n => n + 1) }
    else setThang(t => t + 1)
  }

  const updateEditCc = (field, value) => {
    setEditDay(s => ({ ...s, cc: { ...s.cc, [field]: value } }))
  }

  // ── Day Edit Form ──
  if (editDay) {
    const cc = editDay.cc
    const isDiLam = cc.loai === 'di_lam'
    const autoHeSo = isDiLam && cc.gio_vao && cc.gio_ra ? tinhHeSo(cc.gio_vao, cc.gio_ra) : 0
    const autoTangCa = isDiLam && cc.gio_ra ? tinhTangCa(cc.gio_ra) : 0
    const cuoiTuan = isWeekendDate(cc.ngay)
    const loaiOpts = LOAI_OPTS.filter(o => (o.value !== 'off_t7' && o.value !== 'off_t7x') || cuoiTuan)

    return createPortal(
      <>
      <style>{`@keyframes scSlideIn { from { transform: translateX(100%) } to { transform: translateX(0) } }`}</style>
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(42,32,26,0.45)', zIndex: 10030 }}
        onClick={() => setEditDay(null)}>
        <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: 'calc(100vw - var(--side-w, 248px))', maxWidth: '100vw', background: LUX.bg, display: 'flex', flexDirection: 'column', boxShadow: '-6px 0 40px rgba(42,32,26,0.28)', animation: 'scSlideIn .22s ease' }}
          onClick={e => e.stopPropagation()}>

          {/* Header — cố định */}
          <div style={{ flexShrink: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 24px 12px' }}>
              <div>
                <div style={{ fontFamily: LUX.fontSerif, fontWeight: 600, fontSize: '18px', color: LUX.espresso }}>
                  {editDay.isNew ? 'Thêm Chấm Công' : 'Sửa Chấm Công'}
                </div>
                <div style={{ fontFamily: LUX.fontSans, fontSize: '12px', color: LUX.ink3, marginTop: '2px' }}>
                  {fmtNgay(cc.ngay)} — {nhanVien.ho_ten}
                </div>
              </div>
              <button onClick={() => setEditDay(null)}
                style={{ background: LUX.line, border: 'none', borderRadius: '10px', padding: '6px 14px', fontSize: '13px', color: LUX.ink3, cursor: 'pointer', fontFamily: LUX.fontSans, fontWeight: 600 }}>
                Huỷ
              </button>
            </div>
          </div>

          {/* Toast trong edit form */}
          {toast && (
            <div style={{ margin: '0 20px', padding: '10px 14px', borderRadius: LUX.radiusSm, background: toast.type === 'error' ? '#FEF2F2' : '#F0FDF4', color: toast.type === 'error' ? '#C0392B' : '#2D7A4F', fontFamily: LUX.fontSans, fontSize: '13px', fontWeight: 600, flexShrink: 0 }}>
              {toast.msg}
            </div>
          )}

          {/* Nội dung — có thể cuộn, căn giữa cho dễ đọc */}
          <div style={{ padding: '4px 24px 8px', overflowY: 'auto', flex: 1, width: '100%', maxWidth: 760, margin: '0 auto', boxSizing: 'border-box' }}>
            {/* Loại */}
            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>Loại Chấm Công</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {loaiOpts.map(opt => (
                  <button key={opt.value}
                    onClick={() => updateEditCc('loai', opt.value)}
                    style={{
                      padding: '8px 12px', borderRadius: LUX.radiusSm,
                      border: `2px solid ${cc.loai === opt.value ? LUX.gold : LUX.line}`,
                      background: cc.loai === opt.value ? '#f5e8d4' : LUX.surface2,
                      fontFamily: LUX.fontSans, fontSize: '12px', fontWeight: 600,
                      color: cc.loai === opt.value ? LUX.taupe : LUX.ink3,
                      cursor: 'pointer',
                    }}>
                    {opt.icon} {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {isDiLam && (
              <>
                <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                  <div style={{ flex: 1 }}>
                    <label style={labelStyle}>Giờ Vào</label>
                    <input type="time" value={cc.gio_vao || ''}
                      onChange={e => updateEditCc('gio_vao', e.target.value)}
                      style={inputStyle} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={labelStyle}>Giờ Ra</label>
                    <input type="time" value={cc.gio_ra || ''}
                      onChange={e => updateEditCc('gio_ra', e.target.value)}
                      style={inputStyle} />
                  </div>
                </div>

                {/* Auto-computed preview */}
                <div style={{ background: LUX.surface2, borderRadius: LUX.radiusSm, padding: '12px 14px', marginBottom: '16px', border: `1px solid ${LUX.line}` }}>
                  <div style={{ fontFamily: LUX.fontSans, fontSize: '10px', color: LUX.ink3, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>Tự Động Tính</div>
                  <div style={{ display: 'flex', gap: '20px' }}>
                    <div>
                      <span style={{ fontFamily: LUX.fontSans, fontSize: '11px', color: LUX.ink3 }}>Hệ số: </span>
                      <span style={{ fontFamily: LUX.fontMono, fontSize: '15px', fontWeight: 700, color: LUX.taupe }}>{autoHeSo.toFixed(2)}</span>
                    </div>
                    <div>
                      <span style={{ fontFamily: LUX.fontSans, fontSize: '11px', color: LUX.ink3 }}>Tăng ca: </span>
                      <span style={{ fontFamily: LUX.fontMono, fontSize: '15px', fontWeight: 700, color: '#6a4a8a' }}>{autoTangCa.toFixed(2)}h</span>
                    </div>
                  </div>
                </div>

                {/* Manual override */}
                <div style={{ marginBottom: '8px' }}>
                  <label style={{ ...labelStyle, color: LUX.danger }}>Ghi Đè Thủ Công (bỏ trống = dùng tự động)</label>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <div style={{ flex: 1 }}>
                      <input type="number" step="0.01" min="0" max="2"
                        placeholder={`Hệ số (auto: ${autoHeSo.toFixed(2)})`}
                        value={cc.he_so_override !== undefined ? cc.he_so_override : ''}
                        onChange={e => updateEditCc('he_so_override', e.target.value === '' ? undefined : parseFloat(e.target.value))}
                        style={inputStyle} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <input type="number" step="0.01" min="0" max="12"
                        placeholder={`Tăng ca (auto: ${autoTangCa.toFixed(2)})`}
                        value={cc.tang_ca_override !== undefined ? cc.tang_ca_override : ''}
                        onChange={e => updateEditCc('tang_ca_override', e.target.value === '' ? undefined : parseFloat(e.target.value))}
                        style={inputStyle} />
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Nút Lưu — cố định ở dưới, luôn hiển thị */}
          <div style={{ padding: '14px 24px', flexShrink: 0, borderTop: `1px solid ${LUX.line}`, background: LUX.bg, borderRadius: `0 0 ${LUX.radiusLg} ${LUX.radiusLg}` }}>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={handleSaveDay} disabled={saving}
                style={{ flex: 1, background: saving ? LUX.champagne2 : LUX.goldGrad, color: 'white', border: 'none', borderRadius: LUX.radius, padding: '14px', fontFamily: LUX.fontSans, fontWeight: 700, fontSize: '15px', cursor: saving ? 'not-allowed' : 'pointer', boxShadow: `0 4px 16px ${LUX.gold}50` }}>
                {saving ? '⏳ Đang lưu...' : '💾 Lưu'}
              </button>
              {!editDay.isNew && (
                <button onClick={handleDeleteDay} disabled={saving}
                  style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: LUX.radius, padding: '14px 18px', color: '#C0392B', fontFamily: LUX.fontSans, fontWeight: 600, fontSize: '14px', cursor: 'pointer' }}>
                  🗑️
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
      </>
    , document.body)
  }

  // ── Main Sheet ──
  return createPortal(
    <>
    <style>{`@keyframes scSlideIn { from { transform: translateX(100%) } to { transform: translateX(0) } }`}</style>
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(42,32,26,0.4)', zIndex: 10020 }}
      onClick={() => { onClose(); if (onSaved) onSaved() }}>
      <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: 'calc(100vw - var(--side-w, 248px))', maxWidth: '100vw', background: LUX.bg, display: 'flex', flexDirection: 'column', boxShadow: '-6px 0 40px rgba(42,32,26,0.28)', animation: 'scSlideIn .22s ease' }}
        onClick={e => e.stopPropagation()}>

        {/* Confirm Dialog */}
        <ConfirmDialog open={!!confirm} {...(confirm || {})} onCancel={() => setConfirm(null)} />

        {/* Toast */}
        {toast && (
          <div style={{ position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)', zIndex: 10041, background: toast.type === 'error' ? LUX.danger : LUX.sage, color: 'white', padding: '10px 22px', borderRadius: LUX.radiusSm, fontFamily: LUX.fontSans, fontWeight: 700, fontSize: '13px', boxShadow: LUX.shadowLg, whiteSpace: 'nowrap' }}>
            {toast.msg}
          </div>
        )}

        {/* Header */}
        <div style={{ padding: '12px 20px', flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontFamily: LUX.fontSerif, fontWeight: 600, fontSize: '20px', color: LUX.espresso }}>
                {nhanVien.ho_ten}
              </div>
              <div style={{ fontFamily: LUX.fontSans, fontSize: '11px', color: LUX.ink3, marginTop: '2px' }}>
                Sửa Chấm Công Tháng
              </div>
            </div>
            <button onClick={() => { onClose(); if (onSaved) onSaved() }}
              style={{ background: LUX.line, border: 'none', borderRadius: '10px', padding: '6px 14px', fontSize: '13px', color: LUX.ink3, cursor: 'pointer', fontFamily: LUX.fontSans, fontWeight: 600 }}>
              Đóng
            </button>
          </div>

          {/* Month selector */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', marginTop: '12px' }}>
            <button onClick={prevMonth} style={navBtnStyle}>‹</button>
            <span style={{ fontFamily: LUX.fontSerif, fontSize: '18px', fontWeight: 700, color: LUX.espresso }}>
              Tháng {thang}/{nam}
            </span>
            <button onClick={nextMonth} style={navBtnStyle}>›</button>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: LUX.ink3, fontFamily: LUX.fontSans }}>Đang tải...</div>
        ) : (
          <>
            {/* Stats Card */}
            <div style={{ padding: '0 24px', flexShrink: 0 }}>
              <div style={{ background: LUX.heroGrad, borderRadius: LUX.radius, padding: '16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '10px', boxShadow: LUX.shadow }}>
                {[
                  { label: 'Ngày công', value: ngayCong.toFixed(1), color: '#86EFAC' },
                  { label: 'Tăng ca (h)', value: tongTangCa.toFixed(1), color: '#C4B5FD' },
                  { label: 'OFF Có Lương', value: offCoLuong, color: '#FDE68A' },
                  { label: 'OFF Ko Lương', value: offKoLuong, color: '#FCA5A5' },
                  { label: 'OFF T7/CN', value: offT7Cn, color: '#FDBA74' },
                  { label: 'Vi phạm T7X', value: viPhamT7x, color: '#F87171' },
                ].map((stat, i) => (
                  <div key={i} style={{ textAlign: 'center' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: stat.color, margin: '0 auto 6px' }} />
                    <div style={{ fontFamily: LUX.fontMono, fontSize: '20px', fontWeight: 700, color: 'white' }}>{stat.value}</div>
                    <div style={{ fontFamily: LUX.fontSans, fontSize: '9px', color: 'rgba(255,255,255,0.7)', marginTop: '2px', letterSpacing: '0.3px' }}>{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Day list */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px' }}>
              <div style={{ fontFamily: LUX.fontSans, fontSize: '10px', color: LUX.ink3, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px' }}>
                Chi Tiết Từng Ngày — {lastDay} ngày
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '6px' }}>
                {days.map(({ d, dateStr, thu, isWeekend, cc, off }) => {
                  const hasCc = !!cc
                  const isOff = !!off
                  const loaiLabel = cc ? (LOAI_OPTS.find(o => o.value === cc.loai) || LOAI_OPTS[0]) : null
                  const isDiLam = cc?.loai === 'di_lam'
                  const isBuNgayLe = buNgayLe.has(dateStr)   // ngày được bù bằng quỹ ngày lễ

                  let bg = LUX.surface2
                  let border = LUX.line
                  let statusIcon = '⚠️'
                  let statusColor = LUX.ink3

                  if (isDiLam) {
                    bg = '#f0fdf4'
                    border = '#bbf7d0'
                    statusIcon = '✅'
                    statusColor = '#16a34a'
                  } else if (cc?.loai?.startsWith('off')) {
                    bg = '#fef9e7'
                    border = '#fde68a'
                    statusIcon = loaiLabel?.icon || '📴'
                    statusColor = LUX.taupe
                  } else if (off) {
                    bg = '#fef2f2'
                    border = '#fecaca'
                    statusIcon = '📴'
                    statusColor = '#dc2626'
                  }

                  return (
                    <button key={d}
                      onClick={() => hasCc ? openEditDay(cc) : openNewDay(dateStr)}
                      style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '10px 14px', background: bg, border: `1px solid ${border}`, borderRadius: LUX.radiusSm, cursor: 'pointer', textAlign: 'left' }}>
                      {/* Day number */}
                      <div style={{ width: '36px', textAlign: 'center', flexShrink: 0 }}>
                        <div style={{ fontFamily: LUX.fontMono, fontSize: '16px', fontWeight: 700, color: isWeekend ? LUX.danger : LUX.ink }}>{d}</div>
                        <div style={{ fontFamily: LUX.fontSans, fontSize: '9px', color: isWeekend ? LUX.danger : LUX.ink3 }}>{thu}</div>
                      </div>
                      {/* Status */}
                      <div style={{ fontSize: '18px', flexShrink: 0 }}>{statusIcon}</div>
                      {/* Details */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontFamily: LUX.fontSans, fontSize: '12px', fontWeight: 600, color: statusColor, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          <span>{isDiLam ? ('Đi làm' + (() => { const lt = leTanCaInfo(nhanVien.vi_tri, cc.ngay, cc.gio_vao, cc.gio_ra); return lt ? ` · Ca ${lt.ca}` : '' })()) : (loaiLabel?.label || (off ? `OFF (${off.loai_off === 'off_phep' ? 'Phép' : off.loai_off === 'off_ov' ? 'Ko Lương' : 'T7/CN'})` : 'Chưa chấm công'))}</span>
                          {isBuNgayLe && (
                            <span style={{ fontFamily: LUX.fontSans, fontSize: '10px', fontWeight: 700, color: '#8a6a35', background: 'rgba(201,169,110,.16)', border: '1px solid rgba(201,169,110,.4)', borderRadius: 6, padding: '1px 7px' }}>
                              🎁 Bù Ngày Lễ
                            </span>
                          )}
                        </div>
                        {isDiLam && cc.gio_vao && cc.gio_ra && (
                          <div style={{ fontFamily: LUX.fontMono, fontSize: '10px', color: LUX.ink3, marginTop: '1px' }}>
                            {cc.gio_vao.slice(0, 5)} → {cc.gio_ra.slice(0, 5)}
                            <span style={{ marginLeft: '8px', color: LUX.taupe, fontWeight: 600 }}>HS: {cc.he_so?.toFixed(2)}</span>
                            {cc.tang_ca_gio > 0 && <span style={{ marginLeft: '6px', color: '#6a4a8a', fontWeight: 600 }}>+{cc.tang_ca_gio?.toFixed(2)}h</span>}
                          </div>
                        )}
                      </div>
                      <div style={{ color: LUX.line2, fontSize: '16px' }}>›</div>
                    </button>
                  )
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
    </>
  , document.body)
}

const labelStyle = {
  fontFamily: 'Inter, sans-serif', fontSize: '11px', color: '#8a7868', fontWeight: 600,
  display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px',
}

const inputStyle = {
  width: '100%', padding: '10px 12px', borderRadius: '10px',
  border: '1px solid rgba(160,113,79,0.15)',
  fontFamily: 'JetBrains Mono, monospace', fontSize: '14px', color: '#2a201a',
  background: '#fbf8f3', boxSizing: 'border-box', outline: 'none',
}

const navBtnStyle = {
  width: '36px', height: '36px', borderRadius: '50%',
  background: 'rgba(160,113,79,0.08)', border: '1px solid rgba(160,113,79,0.15)',
  fontSize: '18px', color: '#8a6a52', cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  fontFamily: 'Inter, sans-serif',
}
