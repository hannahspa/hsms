import { useRef, useState } from 'react'
import { formatCurrency } from '../../../lib/utils'
import { C, FONT } from '../../../constants/colors'
import { NvAvatar, shortName } from '../posShared'

export default function StaffCommissionPanel({
  ktvList,
  orderStaff,
  setOrderStaff,
  calcStaffPct,
  getRulesPct,
  orderKmRefPct,
  totalPaid,
  orderTotal,
}) {
  const inputRef = useRef(null)
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const [dropPos, setDropPos] = useState({ top: 0, left: 0, width: 0 })

  const filteredStaff = ktvList.filter(k => !search || k.ho_ten.toLowerCase().includes(search.toLowerCase()))

  const updateDropPosition = () => {
    if (!inputRef.current) return
    const rect = inputRef.current.getBoundingClientRect()
    const dropHeight = Math.min(ktvList.length, 6) * 44
    const goUp = rect.bottom + dropHeight + 8 > window.innerHeight
    setDropPos({
      bottom: goUp ? window.innerHeight - rect.top + 2 : undefined,
      top: goUp ? undefined : rect.bottom + 2,
      left: rect.left,
      width: rect.width,
    })
  }

  const addStaff = (staff) => {
    const newList = [...orderStaff, { nv: staff, role: 'tu_van', pct: 0 }]
    setOrderStaff(newList.map(row => ({ ...row, pct: calcStaffPct(row.nv.vi_tri, newList) })))
    setSearch('')
    setOpen(false)
  }

  const removeStaff = (staffId) => {
    const remaining = orderStaff.filter(row => row.nv.id !== staffId)
    setOrderStaff(remaining.map(row => ({ ...row, pct: calcStaffPct(row.nv.vi_tri, remaining) })))
  }

  return (
    <div style={{ paddingTop: 10, borderTop: '1px solid var(--line)' }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--ink2)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 6 }}>Hoa Hồng Nhân Viên Bán Hàng</div>

      {orderStaff.filter(r => r.nv.vi_tri === 'ktv').length >= 2 && (
        <div style={{ marginBottom: 8, fontSize: 10.5, color: '#8a6a35', background: 'rgba(201,169,110,.10)', border: '1px solid rgba(201,169,110,.35)', borderRadius: 6, padding: '4px 8px' }}>
          2 KTV cùng tư vấn — hoa hồng được chia đôi (mỗi người nửa %)
        </div>
      )}

      <div style={{ position: 'relative', marginBottom: 8 }}>
        <input
          ref={inputRef}
          value={search}
          onChange={event => {
            setSearch(event.target.value)
            updateDropPosition()
            setOpen(true)
          }}
          onFocus={() => {
            updateDropPosition()
            setOpen(true)
          }}
          placeholder="Chọn nhân viên bán hàng..."
          style={{ width: '100%', boxSizing: 'border-box', border: '1px solid var(--bord)', borderRadius: 7, padding: '6px 10px', fontSize: 12, outline: 'none', background: '#fff', fontFamily: 'var(--sans)' }}
        />

        {open && filteredStaff.length > 0 && (
          <>
            <div style={{ position: 'fixed', top: dropPos.top, bottom: dropPos.bottom, left: dropPos.left, width: dropPos.width, zIndex: 9000, background: C.surface2, border: `1px solid ${C.line}`, borderRadius: 8, boxShadow: C.shadow, overflow: 'hidden' }}>
              {filteredStaff.slice(0, 6).map(staff => {
                const alreadyIn = !!orderStaff.find(row => row.nv.id === staff.id)
                const sameRole = orderStaff.filter(row => row.nv.vi_tri === staff.vi_tri).length
                // Lễ Tân: tối đa 1 — KTV: tối đa 2 (2 KTV cùng tư vấn → chia đôi hoa hồng)
                const slotsBlocked = staff.vi_tri === 'le_tan' ? sameRole >= 1 : sameRole >= 2
                const blocked = alreadyIn || slotsBlocked
                const blockLabel = alreadyIn
                  ? 'Đã thêm'
                  : staff.vi_tri === 'ktv' ? 'Đã đủ 2 KTV' : 'Đã có Lễ Tân'

                return (
                  <button key={staff.id}
                    disabled={blocked}
                    onClick={() => {
                      if (!blocked) addStaff(staff)
                      else setOpen(false)
                    }}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 12px', border: 'none', background: blocked ? '#f8f6f3' : 'none', cursor: blocked ? 'not-allowed' : 'pointer', borderBottom: `1px solid ${C.line}`, fontFamily: FONT.sans, opacity: blocked ? 0.55 : 1 }}>
                    <NvAvatar nv={staff} size={26} />
                    <span style={{ fontSize: 12.5, color: blocked ? C.ink3 : C.ink }}>{shortName(staff.ho_ten)}</span>
                    <span style={{ fontSize: 10, color: C.ink3, marginLeft: 'auto' }}>
                      {blocked ? blockLabel : (staff.vi_tri === 'ktv' ? 'KTV' : 'Lễ Tân')}
                    </span>
                  </button>
                )
              })}
            </div>
            <div style={{ position: 'fixed', inset: 0, zIndex: 8999 }} onClick={() => setOpen(false)} />
          </>
        )}
      </div>

      {orderStaff.map(row => {
        const commAmt = Math.round(totalPaid * row.pct / 100)
        const rulesPct = getRulesPct(row.nv.vi_tri)
        const overRule = row.pct > rulesPct

        return (
          <div key={row.nv.id} style={{ padding: '7px 0', borderBottom: `1px solid ${C.line}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <NvAvatar nv={row.nv} size={28} />
              <span style={{ fontSize: 12.5, fontWeight: 600, color: C.ink, flex: 1 }}>{shortName(row.nv.ho_ten)}</span>

              <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <input
                  type="number" min={0} max={10} step={0.5}
                  value={row.pct}
                  onChange={event => {
                    const value = Math.min(10, Math.max(0, parseFloat(event.target.value) || 0))
                    setOrderStaff(prev => prev.map(item => item.nv.id === row.nv.id ? { ...item, pct: value } : item))
                  }}
                  style={{
                    width: 54, borderRadius: 5, padding: '3px 6px', fontSize: 12, fontWeight: 800,
                    textAlign: 'center', outline: 'none',
                    border: `1.5px solid ${overRule ? '#E67E22' : 'rgba(201,169,110,.5)'}`,
                    background: overRule ? '#fef3e2' : 'rgba(201,169,110,.08)',
                    color: overRule ? '#E67E22' : C.champagne,
                  }}
                />
                <span style={{ fontSize: 10, color: C.ink3 }}>%</span>
              </div>

              <div style={{ textAlign: 'right', minWidth: 78 }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: C.champagne, fontFamily: FONT.serif }}>{formatCurrency(commAmt)}</div>
                <div style={{ fontSize: 9, color: C.ink3 }}>
                  {totalPaid < orderTotal ? `${formatCurrency(totalPaid)} × ${row.pct}%` : `${row.pct}% hoa hồng`}
                </div>
              </div>

              <button onClick={() => removeStaff(row.nv.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.ink3, fontSize: 15, padding: 0, lineHeight: 1 }}>x</button>
            </div>

            {overRule && (
              <div style={{ marginTop: 4, fontSize: 10, color: '#E67E22', background: '#fef3e2', border: '1px solid #E67E2244', borderRadius: 5, padding: '3px 8px' }}>
                ⚠ KM {orderKmRefPct.toFixed(0)}% ≥ 30% — tối đa {rulesPct}% (đang tính {row.pct}%)
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
