import { useState, useEffect } from 'react'
import { supabase } from '../../../../lib/supabase'
import { COLORS } from '../../../../constants/colors'
import { getNowVN, todayISO } from '../../../../lib/utils'

export default function TabLichDieuDong() {
  const now = getNowVN()
  const [calThang, setCalThang] = useState(now.getMonth() + 1)
  const [calNam, setCalNam] = useState(now.getFullYear())
  const [nvList, setNvList] = useState([])
  const [offList, setOffList] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => { loadData() }, [calThang, calNam])

  const loadData = async () => {
    setLoading(true)
    const startDate = `${calNam}-${String(calThang).padStart(2, '0')}-01`
    const lastDay = new Date(calNam, calThang, 0).getDate()
    const endDate = `${calNam}-${String(calThang).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

    try {
      const [resNv, resOff] = await Promise.all([
        supabase.from('nhan_vien').select('id, ho_ten, vi_tri').eq('trang_thai', 'dang_lam'),
        supabase.from('dang_ky_off').select('id, nhan_vien_id, ngay_off, loai_off, trang_thai')
          .gte('ngay_off', startDate)
          .lte('ngay_off', endDate)
      ])

      if (resNv.data) {
        setNvList(resNv.data)
      }
      if (resOff.data) {
        setOffList(resOff.data)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const prevMonth = () => {
    if (calThang === 1) { setCalThang(12); setCalNam(n => n - 1) }
    else setCalThang(t => t - 1)
  }
  const nextMonth = () => {
    if (calThang === 12) { setCalThang(1); setCalNam(n => n + 1) }
    else setCalThang(t => t + 1)
  }

  const daysInMonth = new Date(calNam, calThang, 0).getDate()
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)
  const todayStr = todayISO()

  return (
    <div style={{ paddingBottom: '40px' }}>
      <div style={{ background: COLORS.card, borderRadius: '24px', border: `1px solid ${COLORS.border}`, boxShadow: COLORS.shadow, overflow: 'hidden' }}>
        
        {/* Header Navigation */}
        <div style={{ padding: '16px 20px', borderBottom: `1px solid ${COLORS.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#FAFAFA' }}>
          <button onClick={prevMonth} style={{ background: 'none', border: 'none', fontSize: '24px', color: COLORS.textSub, cursor: 'pointer', padding: '0 8px' }}>‹</button>
          <div style={{ fontWeight: '800', fontSize: '16px', color: COLORS.text }}>Tháng {calThang} / {calNam}</div>
          <button onClick={nextMonth} style={{ background: 'none', border: 'none', fontSize: '24px', color: COLORS.textSub, cursor: 'pointer', padding: '0 8px' }}>›</button>
        </div>

        {/* Matrix Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
            <thead>
              <tr>
                <th style={{ position: 'sticky', left: 0, background: '#FAFAFA', zIndex: 2, padding: '12px 16px', borderBottom: `1px solid ${COLORS.border}`, borderRight: `1px solid ${COLORS.border}`, textAlign: 'left', fontWeight: '800', color: COLORS.text, width: '140px', minWidth: '140px' }}>
                  Nhân Viên
                </th>
                {days.map(d => {
                  const date = new Date(calNam, calThang - 1, d)
                  const isWeekend = date.getDay() === 0 || date.getDay() === 6
                  const isoDate = `${calNam}-${String(calThang).padStart(2, '0')}-${String(d).padStart(2, '0')}`
                  const isToday = isoDate === todayStr

                  return (
                    <th key={d} style={{ 
                      padding: '10px 4px', 
                      borderBottom: `1px solid ${COLORS.border}`, 
                      borderRight: d === daysInMonth ? 'none' : `1px dashed ${COLORS.border}`,
                      textAlign: 'center', 
                      minWidth: '42px', 
                      background: isToday ? '#FFF3E0' : (isWeekend ? '#FFF5F5' : '#FAFAFA'), 
                      color: isToday ? COLORS.primary : (isWeekend ? COLORS.chi : COLORS.textSub), 
                      fontWeight: isToday ? '800' : '700', 
                      fontSize: '13px' 
                    }}>
                      <div style={{ marginBottom: '2px', fontSize: '10px', fontWeight: '600', opacity: 0.7 }}>
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
                  <td colSpan={daysInMonth + 1} style={{ textAlign: 'center', padding: '40px', color: COLORS.textMute }}>
                    Đang tải dữ liệu...
                  </td>
                </tr>
              ) : nvList.length === 0 ? (
                <tr>
                  <td colSpan={daysInMonth + 1} style={{ textAlign: 'center', padding: '40px', color: COLORS.textMute }}>
                    Không có dữ liệu nhân viên
                  </td>
                </tr>
              ) : (
                nvList.map(nv => {
                  const parts = nv.ho_ten.trim().split(' ')
                  const shortName = parts.length >= 2 ? parts[parts.length - 2] + ' ' + parts[parts.length - 1] : parts[parts.length - 1]

                  return (
                    <tr key={nv.id}>
                      <td style={{ 
                        position: 'sticky', 
                        left: 0, 
                        background: COLORS.card, 
                        zIndex: 1, 
                        padding: '12px 16px', 
                        borderBottom: `1px solid ${COLORS.border}`, 
                        borderRight: `1px solid ${COLORS.border}`, 
                        fontWeight: '600', 
                        color: COLORS.text, 
                        fontSize: '14px',
                        whiteSpace: 'nowrap'
                      }}>
                        {shortName}
                        <div style={{ fontSize: '11px', color: COLORS.textMute, marginTop: '2px', fontWeight: '500' }}>
                          {nv.vi_tri === 'le_tan' ? 'Lễ Tân' : 'KTV'}
                        </div>
                      </td>
                      {days.map(d => {
                        const date = new Date(calNam, calThang - 1, d)
                        const isWeekend = date.getDay() === 0 || date.getDay() === 6
                        const isoDate = `${calNam}-${String(calThang).padStart(2, '0')}-${String(d).padStart(2, '0')}`
                        const isToday = isoDate === todayStr
                        
                        const off = offList.find(o => o.nhan_vien_id === nv.id && o.ngay_off === isoDate)
                        
                        return (
                          <td key={d} style={{ 
                            padding: '4px', 
                            borderBottom: `1px solid ${COLORS.border}`, 
                            borderRight: d === daysInMonth ? 'none' : `1px dashed ${COLORS.border}`, 
                            textAlign: 'center', 
                            background: isToday ? '#FFF3E0' : (isWeekend ? '#FFF5F5' : 'transparent'), 
                            height: '54px' 
                          }}>
                            {off && (
                              <div style={{
                                background: off.trang_thai === 'duoc_duyet' ? '#DCFCE7' : (off.trang_thai === 'tu_choi' ? '#FEE2E2' : '#FEF9E7'),
                                color: off.trang_thai === 'duoc_duyet' ? '#166534' : (off.trang_thai === 'tu_choi' ? '#991B1B' : '#8B6914'),
                                fontSize: '10px',
                                fontWeight: '800',
                                padding: '4px 2px',
                                borderRadius: '6px',
                                border: `1px solid ${off.trang_thai === 'duoc_duyet' ? '#86EFAC' : (off.trang_thai === 'tu_choi' ? '#FCA5A5' : '#FDE047')}`,
                                cursor: 'help',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                height: '100%',
                                boxSizing: 'border-box'
                              }} title={`Loại: ${off.loai_off} - Trạng thái: ${off.trang_thai}`}>
                                {off.loai_off === 'off_phep' ? 'P' : (off.loai_off === 'off_ov' ? 'OV' : (off.loai_off === 'off_t7' ? 'O7' : (off.loai_off === 'off_t7x' ? 'O7X' : 'OFF')))}
                              </div>
                            )}
                          </td>
                        )
                      })}
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', padding: '16px 20px', background: '#FAFAFA', borderTop: `1px solid ${COLORS.border}`, fontSize: '12px', color: COLORS.textSub, fontWeight: '600' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '14px', height: '14px', borderRadius: '4px', background: '#DCFCE7', border: '1px solid #86EFAC' }}></div> Đã duyệt
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '14px', height: '14px', borderRadius: '4px', background: '#FEF9E7', border: '1px solid #FDE047' }}></div> Chờ duyệt
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '14px', height: '14px', borderRadius: '4px', background: '#FEE2E2', border: '1px solid #FCA5A5' }}></div> Từ chối
          </div>
          <div style={{ width: '1px', height: '14px', background: COLORS.border, margin: '0 4px' }}></div>
          <div>P = Phép</div>
          <div>OV = Vượt/Không lương</div>
          <div>O7 = T7/CN có lý do</div>
          <div>O7X = T7/CN không phép</div>
        </div>

      </div>
    </div>
  )
}
