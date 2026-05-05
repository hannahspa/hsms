import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../../../lib/supabase'
import { LUX } from '../../../../constants/lux'
import { getNowVN, todayISO } from '../../../../lib/utils'

const VI_TRI_LABEL = { ktv: 'KTV', le_tan: 'Lễ Tân', tap_vu: 'Tạp Vụ' }

const STATUS = {
  dang_lam:  { label: 'Đang làm',   bg: '#eef2e7', color: '#5a6a4a', dot: LUX.sage },
  da_ra:     { label: 'Đã về',      bg: '#ede9f8', color: '#5a4a8a', dot: '#8a7abf' },
  chua_vao:  { label: 'Chưa vào',   bg: '#f2ede8', color: LUX.ink3,  dot: '#c0b0a0' },
  nghi_phep: { label: 'Nghỉ phép',  bg: '#f5e8d4', color: LUX.taupe, dot: LUX.champagne },
  nghi_ov:   { label: 'Nghỉ (OV)',  bg: '#f5e0da', color: LUX.danger, dot: LUX.danger },
  nghi_t7:   { label: 'Nghỉ T7/CN', bg: '#ede9f8', color: '#6a4a8a', dot: '#9a7abf' },
}

function getInitials(name) {
  const parts = name.trim().split(' ')
  return parts[parts.length - 1].charAt(0).toUpperCase()
}
function getAvatarColor(name) {
  const palette = [LUX.taupe, LUX.champagne, LUX.rose, LUX.sage, '#6a5a4a']
  let h = 0; for (const c of name) h += c.charCodeAt(0)
  return palette[h % palette.length]
}
function fmtTime(t) { return t ? t.substring(0, 5) : '' }

function formatDisplayDate(iso) {
  const [y, m, d] = iso.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  const days = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7']
  return `${days[date.getDay()]}, ${String(d).padStart(2,'0')}/${String(m).padStart(2,'0')}/${y}`
}
function stepDate(iso, delta) {
  const [y, m, d] = iso.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  date.setDate(date.getDate() + delta)
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`
}

export default function TabTongQuan() {
  const today = todayISO()
  const [selectedDate, setSelectedDate] = useState(today)
  const [nvList,       setNvList]       = useState([])
  const [ccMap,        setCcMap]        = useState({})
  const [offMap,       setOffMap]       = useState({})
  const [loading,      setLoading]      = useState(true)
  const [lastUpdated,  setLastUpdated]  = useState(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [resNv, resCc, resOff] = await Promise.all([
        supabase.from('nhan_vien')
          .select('id, ho_ten, vi_tri, avatar_url')
          .eq('trang_thai', 'dang_lam')
          .order('vi_tri').order('ho_ten'),
        supabase.from('cham_cong')
          .select('nhan_vien_id, gio_vao, gio_ra, loai, he_so, tang_ca_gio')
          .eq('ngay', selectedDate),
        supabase.from('dang_ky_off')
          .select('nhan_vien_id, loai_off, trang_thai')
          .eq('ngay_off', selectedDate)
          .in('trang_thai', ['duoc_duyet', 'cho_duyet']),
      ])
      setNvList(resNv.data || [])
      const cm = {}; (resCc.data || []).forEach(r => { cm[r.nhan_vien_id] = r }); setCcMap(cm)
      const om = {}; (resOff.data || []).forEach(r => { om[r.nhan_vien_id] = r }); setOffMap(om)
      setLastUpdated(getNowVN())
    } catch (e) { console.error('TabTongQuan:', e) }
    finally { setLoading(false) }
  }, [selectedDate])

  useEffect(() => { fetchData() }, [fetchData])

  const getStatus = (nvId) => {
    const off = offMap[nvId]
    if (off?.trang_thai === 'duoc_duyet') {
      if (off.loai_off === 'off_phep') return STATUS.nghi_phep
      if (off.loai_off === 'off_ov')   return STATUS.nghi_ov
      return STATUS.nghi_t7
    }
    const cc = ccMap[nvId]
    if (!cc)                    return STATUS.chua_vao
    if (cc.gio_vao && !cc.gio_ra) return STATUS.dang_lam
    if (cc.gio_vao && cc.gio_ra)  return STATUS.da_ra
    return STATUS.chua_vao
  }

  const stats = nvList.reduce((a, nv) => {
    const s = getStatus(nv.id)
    if (s === STATUS.dang_lam)  a.dangLam++
    else if (s === STATUS.da_ra) a.daRa++
    else if (s === STATUS.chua_vao) a.chuaVao++
    else a.nghi++
    return a
  }, { dangLam: 0, daRa: 0, chuaVao: 0, nghi: 0 })

  const isToday = selectedDate === today

  return (
    <div>
      {/* ── Date navigator ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: LUX.surface, borderRadius: LUX.radius,
        padding: '10px 14px', marginBottom: '16px',
        border: `1px solid ${LUX.line}`, boxShadow: LUX.shadowSm,
      }}>
        <button
          onClick={() => setSelectedDate(d => stepDate(d, -1))}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 12px', fontSize: '22px', color: LUX.taupe, fontWeight: '600', borderRadius: '8px' }}>
          ‹
        </button>
        <div style={{ textAlign: 'center', flex: 1 }}>
          <div style={{ fontFamily: LUX.fontSerif, fontSize: '18px', fontWeight: 600, color: LUX.espresso, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            {formatDisplayDate(selectedDate)}
            {isToday && (
              <span style={{ fontFamily: LUX.fontSans, fontSize: '10px', background: LUX.gold, color: 'white', borderRadius: '6px', padding: '2px 8px', fontWeight: '600' }}>
                Hôm nay
              </span>
            )}
          </div>
          {lastUpdated && isToday && (
            <div style={{ fontFamily: LUX.fontMono, fontSize: '10px', color: LUX.ink3, marginTop: '2px' }}>
              {String(lastUpdated.getHours()).padStart(2,'0')}:{String(lastUpdated.getMinutes()).padStart(2,'0')} VN
            </div>
          )}
        </div>
        <button
          onClick={() => setSelectedDate(d => stepDate(d, 1))}
          disabled={isToday}
          style={{ background: 'none', border: 'none', cursor: isToday ? 'default' : 'pointer', padding: '4px 12px', fontSize: '22px', color: isToday ? LUX.line2 : LUX.taupe, fontWeight: '600', borderRadius: '8px' }}>
          ›
        </button>
      </div>

      {/* Nút về hôm nay + làm mới */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '14px', gap: '8px' }}>
        {!isToday && (
          <button onClick={() => setSelectedDate(today)}
            style={{ padding: '6px 14px', borderRadius: '10px', border: `1px solid ${LUX.line}`, background: LUX.surface, color: LUX.taupe, fontWeight: '600', fontSize: '12px', cursor: 'pointer', fontFamily: LUX.fontSans }}>
            Về hôm nay
          </button>
        )}
        <button onClick={fetchData} disabled={loading}
          style={{ padding: '6px 14px', borderRadius: '10px', border: `1px solid ${LUX.line}`, background: LUX.surface, color: LUX.taupe, fontWeight: '600', fontSize: '12px', cursor: 'pointer', fontFamily: LUX.fontSans, display: 'flex', alignItems: 'center', gap: '4px' }}>
          {loading ? '⏳' : '↻'} Làm mới
        </button>
      </div>

      {/* ── Stats strip ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '20px' }}>
        {[
          { label: 'Đang làm', value: stats.dangLam,  bg: '#eef2e7', color: '#5a6a4a' },
          { label: 'Đã về',    value: stats.daRa,     bg: '#ede9f8', color: '#5a4a8a' },
          { label: 'Chưa vào', value: stats.chuaVao,  bg: LUX.surface, color: LUX.ink3  },
          { label: 'Nghỉ',     value: stats.nghi,     bg: '#f5e8d4', color: LUX.taupe },
        ].map(item => (
          <div key={item.label} style={{
            background: item.bg, borderRadius: LUX.radiusSm,
            padding: '12px 6px', textAlign: 'center',
            border: `1px solid ${LUX.line}`,
          }}>
            <div style={{ fontFamily: LUX.fontSerif, fontSize: '26px', fontWeight: 600, color: item.color, lineHeight: 1 }}>
              {item.value}
            </div>
            <div style={{ fontFamily: LUX.fontSans, fontSize: '9px', color: item.color, fontWeight: 600, marginTop: '4px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
              {item.label}
            </div>
          </div>
        ))}
      </div>

      {/* ── Section label ── */}
      <div style={{ fontFamily: LUX.fontSans, fontWeight: 600, fontSize: '10px', color: LUX.ink3, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px' }}>
        {nvList.length} nhân viên
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: LUX.ink3, fontFamily: LUX.fontSans }}>Đang tải...</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {nvList.map(nv => {
            const st  = getStatus(nv.id)
            const cc  = ccMap[nv.id]
            const off = offMap[nv.id]
            const shortName = nv.ho_ten.trim().split(' ').slice(-2).join(' ')

            return (
              <div key={nv.id} style={{
                background: LUX.surface, borderRadius: LUX.radiusSm,
                padding: '12px 14px', border: `1px solid ${LUX.line}`,
                boxShadow: LUX.shadowSm, display: 'flex', alignItems: 'center', gap: '12px',
              }}>
                {/* Avatar */}
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <div style={{ width: '42px', height: '42px', borderRadius: '12px', overflow: 'hidden', border: `2px solid ${st.dot}40` }}>
                    {nv.avatar_url
                      ? <img src={nv.avatar_url} alt={nv.ho_ten} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <div style={{ width: '100%', height: '100%', background: getAvatarColor(nv.ho_ten), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '17px', fontWeight: '700', color: 'white', fontFamily: LUX.fontSans }}>{getInitials(nv.ho_ten)}</div>
                    }
                  </div>
                  <div style={{ position: 'absolute', bottom: '-2px', right: '-2px', width: '11px', height: '11px', borderRadius: '50%', background: st.dot, border: '2px solid white' }} />
                </div>

                {/* Tên + vị trí */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: LUX.fontSans, fontWeight: 600, fontSize: '13px', color: LUX.ink }}>{shortName}</div>
                  <div style={{ fontFamily: LUX.fontSans, fontSize: '11px', color: LUX.ink3, marginTop: '1px' }}>{VI_TRI_LABEL[nv.vi_tri] || nv.vi_tri}</div>
                </div>

                {/* Trạng thái + giờ */}
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ background: st.bg, color: st.color, padding: '3px 9px', borderRadius: '8px', fontSize: '11px', fontWeight: 600, marginBottom: '3px', display: 'inline-block', fontFamily: LUX.fontSans }}>
                    {st.label}
                  </div>
                  <div style={{ fontFamily: LUX.fontMono, fontSize: '10px', color: LUX.ink3 }}>
                    {cc?.gio_vao && <span>{fmtTime(cc.gio_vao)}{cc.gio_ra ? ` → ${fmtTime(cc.gio_ra)}` : ''}</span>}
                    {off?.trang_thai === 'duoc_duyet' && !cc && <span>Đã duyệt</span>}
                    {off?.trang_thai === 'cho_duyet'  && !cc && <span style={{ color: LUX.champagne }}>⏳ Chờ</span>}
                  </div>
                  {cc?.tang_ca_gio > 0 && (
                    <div style={{ fontFamily: LUX.fontMono, fontSize: '10px', color: '#6a4a8a', fontWeight: 600 }}>+{cc.tang_ca_gio}h TC</div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
