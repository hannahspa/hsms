import { todayISO } from '../../../lib/utils'
import { C, TRANG_THAI, SLOTS, ROW_H, HOUR_START, SLOT_MIN, dayOfWeek, gioToMin, shortName, monthOf } from './lichHenShared'

// ── VIEW TUẦN: 7 cột ngày × timeline giờ — tách từ LichHenPage.jsx (Phase 2) ──
export function WeekView({ weekDays, henList, ktvList, onOpenBlock, onOpenSlot, onGoDay }) {
  const ktvMap = {}; ktvList.forEach(k => { ktvMap[k.id] = k })
  const timelineH = SLOTS.length * ROW_H
  const today = todayISO()
  const henByDay = d => henList.filter(h => h.ngay_hen === d && h.trang_thai !== 'huy')
  return (
    <div style={{ background: C.card, borderRadius: 12, border: `1px solid ${C.line}`, boxShadow: C.shadow, overflow: 'auto' }}>
      <div style={{ display: 'grid', gridTemplateColumns: `56px repeat(7, minmax(120px,1fr))`, minWidth: 56 + 7 * 120 }}>
        <div style={{ position: 'sticky', top: 0, zIndex: 3, background: C.bg, borderBottom: `1px solid ${C.line2}`, borderRight: `1px solid ${C.line}` }} />
        {weekDays.map(d => {
          const isTd = d === today
          return (
            <div key={d} onClick={() => onGoDay(d)} style={{ position: 'sticky', top: 0, zIndex: 3, background: isTd ? '#fdf3e0' : C.bg, borderBottom: `1px solid ${C.line2}`, borderRight: `1px solid ${C.line}`, padding: '7px 6px', textAlign: 'center', cursor: 'pointer' }}>
              <div style={{ fontSize: 11, color: C.ink3, fontWeight: 700 }}>{dayOfWeek(d)}</div>
              <div style={{ fontSize: 15, fontWeight: 800, color: isTd ? C.primary : C.ink, fontFamily: 'var(--serif)' }}>{d.split('-')[2]}</div>
            </div>
          )
        })}
        <div style={{ position: 'relative', borderRight: `1px solid ${C.line}`, height: timelineH }}>
          {SLOTS.map((m, i) => m % 60 === 0 && <div key={m} style={{ position: 'absolute', top: i * ROW_H, right: 5, fontSize: 10, color: C.ink3, fontWeight: 700, transform: 'translateY(-6px)' }}>{String(m / 60).padStart(2, '0')}:00</div>)}
        </div>
        {weekDays.map(d => (
          <div key={d} style={{ position: 'relative', borderRight: `1px solid ${C.line}`, height: timelineH }}>
            {SLOTS.map((m, i) => (
              <div key={m} onClick={() => onOpenSlot(`${String(Math.floor(m / 60)).padStart(2, '0')}:${m % 60 === 0 ? '00' : '30'}`, null, d)}
                style={{ position: 'absolute', top: i * ROW_H, left: 0, right: 0, height: ROW_H, borderBottom: `1px solid ${m % 60 === 0 ? C.line : 'rgba(160,113,79,0.06)'}`, cursor: 'pointer' }} />
            ))}
            {henByDay(d).map(h => {
              const top = (gioToMin(h.gio_hen) - HOUR_START * 60) / SLOT_MIN * ROW_H
              const height = Math.max(ROW_H - 2, (h.thoi_luong_phut || 60) / SLOT_MIN * ROW_H - 2)
              const cfg = TRANG_THAI[h.trang_thai] || TRANG_THAI.cho_xac_nhan
              const nv = ktvMap[h.nhan_vien_id]
              return (
                <div key={h.id} onClick={e => { e.stopPropagation(); onOpenBlock(h) }} title={`${h.gio_hen} ${h.ten_khach}`}
                  style={{ position: 'absolute', top: top + 1, left: 2, right: 2, height, background: cfg.bg, borderLeft: `3px solid ${cfg.bar}`, borderRadius: 5, padding: '3px 5px', cursor: 'pointer', overflow: 'hidden', boxShadow: '0 1px 3px rgba(139,94,60,0.1)' }}>
                  <div style={{ fontSize: 10.5, fontWeight: 800, color: cfg.color }}>{(h.gio_hen || '').slice(0, 5)} {h.ten_khach}</div>
                  {nv && height > ROW_H && <div style={{ fontSize: 9.5, color: C.ink2, marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{shortName(nv.ho_ten)}</div>}
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── VIEW THÁNG: lưới calendar — tách từ LichHenPage.jsx (Phase 2) ──
export function MonthView({ matrix, curMonth, henList, onGoDay }) {
  const today = todayISO()
  const byDay = {}; henList.forEach(h => { if (h.trang_thai !== 'huy') (byDay[h.ngay_hen] = byDay[h.ngay_hen] || []).push(h) })
  return (
    <div style={{ background: C.card, borderRadius: 12, border: `1px solid ${C.line}`, boxShadow: C.shadow, overflow: 'hidden' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)' }}>
        {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map(d => (
          <div key={d} style={{ padding: '8px', textAlign: 'center', fontSize: 11, fontWeight: 800, color: C.ink3, background: C.bg, borderBottom: `1px solid ${C.line2}` }}>{d}</div>
        ))}
        {matrix.flat().map((d, i) => {
          const inMonth = monthOf(d) === curMonth
          const items = (byDay[d] || []).sort((a, b) => gioToMin(a.gio_hen) - gioToMin(b.gio_hen))
          const isTd = d === today
          return (
            <div key={i} onClick={() => onGoDay(d)} style={{ minHeight: 94, borderRight: `1px solid ${C.line}`, borderBottom: `1px solid ${C.line}`, padding: '5px 6px', cursor: 'pointer', background: isTd ? '#fdf3e0' : (inMonth ? '#fff' : '#faf8f5'), opacity: inMonth ? 1 : 0.5 }}>
              <div style={{ fontSize: 12.5, fontWeight: isTd ? 800 : 600, color: isTd ? C.primary : C.ink, marginBottom: 3 }}>{d.split('-')[2]}</div>
              {items.slice(0, 3).map(h => {
                const cfg = TRANG_THAI[h.trang_thai] || TRANG_THAI.cho_xac_nhan
                return <div key={h.id} style={{ fontSize: 9.5, color: cfg.color, background: cfg.bg, borderRadius: 3, padding: '1px 4px', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{(h.gio_hen || '').slice(0, 5)} {h.ten_khach}</div>
              })}
              {items.length > 3 && <div style={{ fontSize: 9, color: C.ink3, fontWeight: 700 }}>+{items.length - 3} lịch</div>}
            </div>
          )
        })}
      </div>
    </div>
  )
}
