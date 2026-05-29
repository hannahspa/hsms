import { useState, useEffect } from 'react'
import { supabase } from '../../../../lib/supabase'
import { LUX } from '../../../../constants/lux'
import { getNowVN, todayISO } from '../../../../lib/utils'

const LOAI_OPTIONS = [
  { value: 'off_phep', label: 'P — OFF Phép (có lương)'        },
  { value: 'off_ov',   label: 'OV — OFF Vượt (không lương)'    },
  { value: 'off_t7',   label: 'O7 — T7/CN có lý do (×2 ngày)' },
  { value: 'off_t7x',  label: 'O7X — T7/CN không phép + phạt'  },
]

const TRANG_THAI_CFG = {
  cho_duyet:  { label: 'Chờ Duyệt', bg: '#FFF9F0', color: '#B8860B', bd: '#d4c090' },
  duoc_duyet: { label: 'Đã Duyệt',  bg: '#eef2e7', color: '#2D7A4F', bd: '#c0d4b0' },
  tu_choi:    { label: 'Từ Chối',   bg: '#f5e0da', color: '#C0392B', bd: '#d4a090' },
}

export default function TabLichDieuDong() {
  const now = getNowVN()
  const [calThang, setCalThang] = useState(now.getMonth() + 1)
  const [calNam,   setCalNam]   = useState(now.getFullYear())
  const [nvList,   setNvList]   = useState([])
  const [offList,  setOffList]  = useState([])
  const [loading,  setLoading]  = useState(false)

  // Selection state — không popup, không overlay
  const [sel,      setSel]      = useState(null)  // { off, nv }
  const [editLoai, setEditLoai] = useState('')
  const [saving,   setSaving]   = useState(false)
  const [toast,    setToast]    = useState(null)

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 2500)
  }

  useEffect(() => { loadData() }, [calThang, calNam])

  const loadData = async () => {
    setLoading(true)
    const startDate = `${calNam}-${String(calThang).padStart(2, '0')}-01`
    const lastDay   = new Date(calNam, calThang, 0).getDate()
    const endDate   = `${calNam}-${String(calThang).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
    try {
      const [resNv, resOff] = await Promise.all([
        supabase.from('nhan_vien').select('id, ho_ten, vi_tri').eq('trang_thai', 'dang_lam'),
        supabase.from('dang_ky_off').select('id, nhan_vien_id, ngay_off, loai_off, trang_thai')
          .gte('ngay_off', startDate).lte('ngay_off', endDate),
      ])
      if (resNv.data) setNvList(resNv.data)
      if (resOff.data) setOffList(resOff.data)
    } catch (e) { console.error('TabLichDieuDong:', e) }
    finally { setLoading(false) }
  }

  const prevMonth = () => { if (calThang === 1) { setCalThang(12); setCalNam(n => n-1) } else setCalThang(t => t-1) }
  const nextMonth = () => { if (calThang === 12) { setCalThang(1); setCalNam(n => n+1) } else setCalThang(t => t+1) }

  const selectOff = (off, nv) => {
    if (sel?.off?.id === off.id) { setSel(null); return }  // click lại → bỏ chọn
    setSel({ off, nv })
    setEditLoai(off.loai_off)
  }

  const handleDeleteOff = async () => {
    if (!sel) return
    setSaving(true)
    const { error } = await supabase.from('dang_ky_off').delete().eq('id', sel.off.id)
    if (error) { showToast('Lỗi xóa: ' + error.message, 'error') }
    else { showToast(`Đã xóa ngày OFF của ${sel.nv.ho_ten.split(' ').pop()} ✓`); setSel(null); loadData() }
    setSaving(false)
  }

  const handleSaveLoai = async () => {
    if (!sel) return
    if (editLoai === sel.off.loai_off) { showToast('Loại OFF không thay đổi', 'error'); return }
    setSaving(true)
    const { error } = await supabase.from('dang_ky_off').update({ loai_off: editLoai }).eq('id', sel.off.id)
    if (error) { showToast('Lỗi sửa: ' + error.message, 'error') }
    else { showToast('Đã cập nhật loại OFF ✓'); setSel(null); loadData() }
    setSaving(false)
  }

  const handleDuyet = async (trangThai) => {
    if (!sel) return
    setSaving(true)
    const { error } = await supabase.from('dang_ky_off').update({ trang_thai: trangThai }).eq('id', sel.off.id)
    if (error) { showToast('Lỗi: ' + error.message, 'error') }
    else {
      showToast(trangThai === 'duoc_duyet' ? 'Đã duyệt OFF ✓' : 'Đã từ chối OFF')
      setSel(null)
      loadData()
    }
    setSaving(false)
  }

  const daysInMonth = new Date(calNam, calThang, 0).getDate()
  const days        = Array.from({ length: daysInMonth }, (_, i) => i + 1)
  const todayStr    = todayISO()

  const offLabel = (loai) => {
    switch (loai) {
      case 'off_phep': return 'P'
      case 'off_ov':   return 'OV'
      case 'off_t7':   return 'O7'
      case 'off_t7x':  return 'O7X'
      default:         return 'OFF'
    }
  }

  const offColor = (trangThai) => {
    if (trangThai === 'duoc_duyet') return { bg: '#eef2e7', color: '#5a6a4a', bd: '#c0d4b0' }
    if (trangThai === 'tu_choi')   return { bg: '#f5e0da', color: LUX.danger, bd: '#d4a090' }
    return { bg: '#f5e8d4', color: LUX.champagne2, bd: '#d4c090' }
  }

  const ttCfg = sel ? (TRANG_THAI_CFG[sel.off.trang_thai] || TRANG_THAI_CFG.cho_duyet) : null
  const isChanged = sel && editLoai !== sel.off.loai_off

  return (
    <div style={{ paddingBottom: '40px' }}>

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 9999, background: toast.type === 'error' ? LUX.danger : LUX.sage, color: '#fff', borderRadius: 10, padding: '11px 18px', fontFamily: LUX.fontSans, fontSize: 13, fontWeight: 600, boxShadow: LUX.shadowLg }}>
          {toast.msg}
        </div>
      )}

      <div style={{ background: LUX.surface, borderRadius: LUX.radius, border: `1px solid ${LUX.line}`, boxShadow: LUX.shadow, overflow: 'hidden' }}>

        {/* ── Header tháng ── */}
        <div style={{ padding: '14px 20px', borderBottom: `1px solid ${LUX.line}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: LUX.bg }}>
          <button onClick={prevMonth} style={{ background: 'none', border: 'none', fontSize: '22px', color: LUX.taupe, cursor: 'pointer', padding: '0 8px' }}>‹</button>
          <div style={{ fontFamily: LUX.fontSerif, fontWeight: 600, fontSize: '20px', color: LUX.espresso }}>
            Tháng {calThang} / {calNam}
          </div>
          <button onClick={nextMonth} style={{ background: 'none', border: 'none', fontSize: '22px', color: LUX.taupe, cursor: 'pointer', padding: '0 8px' }}>›</button>
        </div>

        {/* ── Bảng lịch ── */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
            <thead>
              <tr>
                <th style={{ position: 'sticky', left: 0, background: LUX.bg, zIndex: 2, padding: '10px 16px', borderBottom: `1px solid ${LUX.line}`, borderRight: `1px solid ${LUX.line}`, textAlign: 'left', fontFamily: LUX.fontSans, fontWeight: 700, color: LUX.ink2, width: '140px', minWidth: '140px', fontSize: '12px' }}>
                  Nhân Viên
                </th>
                {days.map(d => {
                  const date      = new Date(calNam, calThang - 1, d)
                  const isWeekend = date.getDay() === 0 || date.getDay() === 6
                  const isoDate   = `${calNam}-${String(calThang).padStart(2,'0')}-${String(d).padStart(2,'0')}`
                  const isToday   = isoDate === todayStr
                  return (
                    <th key={d} style={{
                      padding: '8px 4px', borderBottom: `1px solid ${LUX.line}`,
                      borderRight: d === daysInMonth ? 'none' : `1px dashed ${LUX.line}`,
                      textAlign: 'center', minWidth: '40px',
                      background: isToday ? '#f5e8d4' : (isWeekend ? '#f5ede8' : LUX.bg),
                      color: isToday ? LUX.taupe : (isWeekend ? LUX.rose : LUX.ink3),
                      fontWeight: isToday ? 700 : 600, fontSize: '12px', fontFamily: LUX.fontSans,
                    }}>
                      <div style={{ marginBottom: '1px', fontSize: '9px', opacity: 0.7 }}>
                        {['CN','T2','T3','T4','T5','T6','T7'][date.getDay()]}
                      </div>
                      <div>{d}</div>
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={daysInMonth + 1} style={{ textAlign: 'center', padding: '40px', color: LUX.ink3, fontFamily: LUX.fontSans }}>Đang tải dữ liệu...</td>
                </tr>
              ) : nvList.length === 0 ? (
                <tr>
                  <td colSpan={daysInMonth + 1} style={{ textAlign: 'center', padding: '40px', color: LUX.ink3, fontFamily: LUX.fontSans }}>Không có dữ liệu nhân viên</td>
                </tr>
              ) : nvList.map(nv => {
                const parts     = nv.ho_ten.trim().split(' ')
                const shortName = parts.length >= 2 ? `${parts[parts.length-2]} ${parts[parts.length-1]}` : parts[parts.length-1]
                return (
                  <tr key={nv.id}>
                    <td style={{ position: 'sticky', left: 0, background: LUX.surface2, zIndex: 1, padding: '10px 16px', borderBottom: `1px solid ${LUX.line}`, borderRight: `1px solid ${LUX.line}`, fontFamily: LUX.fontSans, fontWeight: 600, color: LUX.ink, fontSize: '13px', whiteSpace: 'nowrap' }}>
                      {shortName}
                      <div style={{ fontSize: '10px', color: LUX.ink3, marginTop: '1px', fontWeight: 500 }}>
                        {nv.vi_tri === 'le_tan' ? 'Lễ Tân' : 'KTV'}
                      </div>
                    </td>
                    {days.map(d => {
                      const date      = new Date(calNam, calThang - 1, d)
                      const isWeekend = date.getDay() === 0 || date.getDay() === 6
                      const isoDate   = `${calNam}-${String(calThang).padStart(2,'0')}-${String(d).padStart(2,'0')}`
                      const isToday   = isoDate === todayStr
                      const off       = offList.find(o => o.nhan_vien_id === nv.id && o.ngay_off === isoDate)
                      const oc        = off ? offColor(off.trang_thai) : null
                      const isSelected = sel?.off?.id === off?.id
                      return (
                        <td key={d} style={{
                          padding: '4px', borderBottom: `1px solid ${LUX.line}`,
                          borderRight: d === daysInMonth ? 'none' : `1px dashed ${LUX.line}`,
                          textAlign: 'center', height: '52px',
                          background: isSelected ? '#fdf3e0' : (isToday ? '#f5e8d4' : (isWeekend ? '#f5ede8' : 'transparent')),
                        }}>
                          {off && oc && (
                            <div
                              onClick={() => selectOff(off, nv)}
                              style={{
                                background: isSelected ? 'linear-gradient(135deg,#fdf3e0,#f9ead0)' : oc.bg,
                                color: isSelected ? LUX.espresso : oc.color,
                                fontSize: '10px', fontWeight: 700,
                                padding: '3px 2px', borderRadius: '6px',
                                border: isSelected ? `2px solid ${LUX.champagne}` : `1px solid ${oc.bd}`,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                height: '100%', boxSizing: 'border-box',
                                fontFamily: LUX.fontSans, cursor: 'pointer',
                                boxShadow: isSelected ? `0 0 0 2px ${LUX.champagne}40` : 'none',
                              }}
                              title={isSelected ? 'Click để bỏ chọn' : 'Click để chỉnh sửa'}
                            >
                              {offLabel(off.loai_off)}
                            </div>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* ── Action Bar — hiện ngay khi chọn ô OFF ── */}
        {sel ? (
          <div style={{
            borderTop: `2px solid ${LUX.champagne}`,
            background: 'linear-gradient(to right, #fdf6ec, #faf3e8)',
            padding: '14px 20px',
            display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
          }}>
            {/* Thông tin ô đang chọn */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 200 }}>
              <div style={{ width: 3, height: 36, borderRadius: 2, background: LUX.champagne }} />
              <div>
                <div style={{ fontFamily: LUX.fontSans, fontWeight: 700, fontSize: 13, color: LUX.espresso }}>
                  {sel.nv.ho_ten.split(' ').slice(-2).join(' ')} · {sel.off.ngay_off?.split('-').reverse().join('/')}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                  <span style={{ fontFamily: LUX.fontSans, fontSize: 11, color: LUX.ink3 }}>Trạng thái:</span>
                  <span style={{ fontFamily: LUX.fontSans, fontWeight: 700, fontSize: 11, color: ttCfg?.color, background: ttCfg?.bg, padding: '1px 7px', borderRadius: 10, border: `1px solid ${ttCfg?.bd}` }}>
                    {ttCfg?.label}
                  </span>
                </div>
              </div>
            </div>

            {/* Phân cách */}
            <div style={{ width: 1, height: 36, background: LUX.line, flexShrink: 0 }} />

            {/* Dropdown đổi loại */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontFamily: LUX.fontSans, fontSize: 12, fontWeight: 700, color: LUX.ink3, whiteSpace: 'nowrap' }}>Loại OFF:</span>
              <select
                value={editLoai}
                onChange={e => setEditLoai(e.target.value)}
                style={{ height: 32, borderRadius: 7, border: `1px solid ${isChanged ? LUX.champagne : LUX.line}`, padding: '0 10px', fontFamily: LUX.fontSans, fontSize: 12, fontWeight: 600, outline: 'none', background: isChanged ? '#fdf3e0' : '#fdfcfb', color: LUX.espresso, cursor: 'pointer' }}
              >
                {LOAI_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>

            {/* Nút duyệt (chỉ khi chờ duyệt) */}
            {sel.off.trang_thai === 'cho_duyet' && (
              <>
                <button onClick={() => handleDuyet('duoc_duyet')} disabled={saving}
                  style={{ height: 32, padding: '0 14px', borderRadius: 7, border: '1px solid #c0d4b0', background: '#eef2e7', color: '#2D7A4F', fontFamily: LUX.fontSans, fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  ✓ Duyệt
                </button>
                <button onClick={() => handleDuyet('tu_choi')} disabled={saving}
                  style={{ height: 32, padding: '0 14px', borderRadius: 7, border: '1px solid #f5c6c6', background: '#fff5f5', color: LUX.danger, fontFamily: LUX.fontSans, fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  ✕ Từ chối
                </button>
              </>
            )}

            {/* Nút lưu loại mới */}
            {isChanged && (
              <button onClick={handleSaveLoai} disabled={saving}
                style={{ height: 32, padding: '0 16px', borderRadius: 7, border: `1px solid ${LUX.champagne}`, background: 'linear-gradient(135deg,#C9A96E,#A0714F)', color: '#fff', fontFamily: LUX.fontSans, fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', boxShadow: '0 2px 6px rgba(160,113,79,0.3)' }}>
                {saving ? '...' : '💾 Lưu Thay Đổi'}
              </button>
            )}

            {/* Spacer */}
            <div style={{ flex: 1 }} />

            {/* Nút xóa */}
            <button onClick={handleDeleteOff} disabled={saving}
              style={{ height: 32, padding: '0 14px', borderRadius: 7, border: '1px solid #f5c6c6', background: '#fff5f5', color: LUX.danger, fontFamily: LUX.fontSans, fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>
              🗑 Xóa OFF
            </button>

            {/* Bỏ chọn */}
            <button onClick={() => setSel(null)}
              style={{ height: 32, width: 32, borderRadius: 7, border: `1px solid ${LUX.line}`, background: '#fdfcfb', color: LUX.ink3, fontFamily: LUX.fontSans, fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              ✕
            </button>
          </div>
        ) : (
          /* ── Legend (khi không chọn gì) ── */
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', padding: '12px 20px', background: LUX.bg, borderTop: `1px solid ${LUX.line}`, fontFamily: LUX.fontSans, fontSize: '11px', color: LUX.ink2, fontWeight: 600 }}>
            {[
              { bg: '#eef2e7', bd: '#c0d4b0', label: 'Đã duyệt' },
              { bg: '#f5e8d4', bd: '#d4c090', label: 'Chờ duyệt' },
              { bg: '#f5e0da', bd: '#d4a090', label: 'Từ chối'   },
            ].map(item => (
              <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: '13px', height: '13px', borderRadius: '4px', background: item.bg, border: `1px solid ${item.bd}` }} />
                {item.label}
              </div>
            ))}
            <div style={{ width: '1px', background: LUX.line, margin: '0 2px' }} />
            <span>P = Phép</span>
            <span>OV = Vượt/Ko lương</span>
            <span>O7 = T7/CN có lý do</span>
            <span>O7X = T7/CN không phép</span>
            <div style={{ marginLeft: 'auto', color: LUX.ink3, fontWeight: 400, fontStyle: 'italic' }}>
              Click vào ô OFF để chỉnh sửa
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
