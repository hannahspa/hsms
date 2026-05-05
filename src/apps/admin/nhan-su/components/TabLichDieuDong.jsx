import { useState, useEffect } from 'react'
import { supabase } from '../../../../lib/supabase'
import { LUX } from '../../../../constants/lux'
import { getNowVN, todayISO } from '../../../../lib/utils'

export default function TabLichDieuDong() {
  const now = getNowVN()
  const [calThang, setCalThang] = useState(now.getMonth() + 1)
  const [calNam,   setCalNam]   = useState(now.getFullYear())
  const [nvList,   setNvList]   = useState([])
  const [offList,  setOffList]  = useState([])
  const [loading,  setLoading]  = useState(false)

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

  return (
    <div style={{ paddingBottom: '40px' }}>
      <div style={{
        background: LUX.surface, borderRadius: LUX.radius,
        border: `1px solid ${LUX.line}`, boxShadow: LUX.shadow, overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{ padding: '14px 20px', borderBottom: `1px solid ${LUX.line}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: LUX.bg }}>
          <button onClick={prevMonth} style={{ background: 'none', border: 'none', fontSize: '22px', color: LUX.taupe, cursor: 'pointer', padding: '0 8px' }}>‹</button>
          <div style={{ fontFamily: LUX.fontSerif, fontWeight: 600, fontSize: '20px', color: LUX.espresso }}>
            Tháng {calThang} / {calNam}
          </div>
          <button onClick={nextMonth} style={{ background: 'none', border: 'none', fontSize: '22px', color: LUX.taupe, cursor: 'pointer', padding: '0 8px' }}>›</button>
        </div>

        {/* Matrix */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
            <thead>
              <tr>
                <th style={{
                  position: 'sticky', left: 0, background: LUX.bg, zIndex: 2,
                  padding: '10px 16px', borderBottom: `1px solid ${LUX.line}`,
                  borderRight: `1px solid ${LUX.line}`, textAlign: 'left',
                  fontFamily: LUX.fontSans, fontWeight: 700, color: LUX.ink2,
                  width: '140px', minWidth: '140px', fontSize: '12px',
                }}>
                  Nhân Viên
                </th>
                {days.map(d => {
                  const date = new Date(calNam, calThang - 1, d)
                  const isWeekend = date.getDay() === 0 || date.getDay() === 6
                  const isoDate   = `${calNam}-${String(calThang).padStart(2, '0')}-${String(d).padStart(2, '0')}`
                  const isToday   = isoDate === todayStr
                  return (
                    <th key={d} style={{
                      padding: '8px 4px', borderBottom: `1px solid ${LUX.line}`,
                      borderRight: d === daysInMonth ? 'none' : `1px dashed ${LUX.line}`,
                      textAlign: 'center', minWidth: '40px',
                      background: isToday ? '#f5e8d4' : (isWeekend ? '#f5ede8' : LUX.bg),
                      color: isToday ? LUX.taupe : (isWeekend ? LUX.rose : LUX.ink3),
                      fontWeight: isToday ? 700 : 600, fontSize: '12px',
                      fontFamily: LUX.fontSans,
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
                  <td colSpan={daysInMonth + 1} style={{ textAlign: 'center', padding: '40px', color: LUX.ink3, fontFamily: LUX.fontSans }}>
                    Đang tải dữ liệu...
                  </td>
                </tr>
              ) : nvList.length === 0 ? (
                <tr>
                  <td colSpan={daysInMonth + 1} style={{ textAlign: 'center', padding: '40px', color: LUX.ink3, fontFamily: LUX.fontSans }}>
                    Không có dữ liệu nhân viên
                  </td>
                </tr>
              ) : nvList.map(nv => {
                const parts = nv.ho_ten.trim().split(' ')
                const shortName = parts.length >= 2 ? `${parts[parts.length-2]} ${parts[parts.length-1]}` : parts[parts.length-1]
                return (
                  <tr key={nv.id}>
                    <td style={{
                      position: 'sticky', left: 0, background: LUX.surface2, zIndex: 1,
                      padding: '10px 16px', borderBottom: `1px solid ${LUX.line}`,
                      borderRight: `1px solid ${LUX.line}`, fontFamily: LUX.fontSans,
                      fontWeight: 600, color: LUX.ink, fontSize: '13px', whiteSpace: 'nowrap',
                    }}>
                      {shortName}
                      <div style={{ fontSize: '10px', color: LUX.ink3, marginTop: '1px', fontWeight: 500 }}>
                        {nv.vi_tri === 'le_tan' ? 'Lễ Tân' : 'KTV'}
                      </div>
                    </td>
                    {days.map(d => {
                      const date = new Date(calNam, calThang - 1, d)
                      const isWeekend = date.getDay() === 0 || date.getDay() === 6
                      const isoDate   = `${calNam}-${String(calThang).padStart(2, '0')}-${String(d).padStart(2, '0')}`
                      const isToday   = isoDate === todayStr
                      const off       = offList.find(o => o.nhan_vien_id === nv.id && o.ngay_off === isoDate)
                      const oc        = off ? offColor(off.trang_thai) : null
                      return (
                        <td key={d} style={{
                          padding: '4px', borderBottom: `1px solid ${LUX.line}`,
                          borderRight: d === daysInMonth ? 'none' : `1px dashed ${LUX.line}`,
                          textAlign: 'center',
                          background: isToday ? '#f5e8d4' : (isWeekend ? '#f5ede8' : 'transparent'),
                          height: '52px',
                        }}>
                          {off && oc && (
                            <div style={{
                              background: oc.bg, color: oc.color,
                              fontSize: '10px', fontWeight: 700,
                              padding: '3px 2px', borderRadius: '6px',
                              border: `1px solid ${oc.bd}`,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              height: '100%', boxSizing: 'border-box',
                              fontFamily: LUX.fontSans, cursor: 'help',
                            }} title={`${off.loai_off} — ${off.trang_thai}`}>
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

        {/* Legend */}
        <div style={{
          display: 'flex', flexWrap: 'wrap', gap: '14px', padding: '14px 20px',
          background: LUX.bg, borderTop: `1px solid ${LUX.line}`,
          fontFamily: LUX.fontSans, fontSize: '11px', color: LUX.ink2, fontWeight: 600,
        }}>
          {[
            { bg: '#eef2e7', bd: '#c0d4b0', label: 'Đã duyệt' },
            { bg: '#f5e8d4', bd: '#d4c090', label: 'Chờ duyệt' },
            { bg: '#f5e0da', bd: '#d4a090', label: 'Từ chối' },
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
        </div>
      </div>
    </div>
  )
}
