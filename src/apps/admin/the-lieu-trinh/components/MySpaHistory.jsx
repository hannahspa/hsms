import { useState, useEffect } from 'react'
import { myspaHistoryService } from '../../../../services/myspaHistoryService'

// ─── Lịch sử MySpa (2019 → 16/07/2026) — CHỈ XEM, tham khảo ───────────────────
// Nguồn: bảng staging myspa_ban_hang_raw (không đụng dữ liệu HSMS). Trả lời:
//   • Thẻ này ai làm buổi nào, khi nào
//   • Khách này từng đến ngày nào, làm gì, ai làm

const fmtNgay = (d) => (d ? String(d).split('-').reverse().join('/') : '-')

const box = {
  border: '1px dashed var(--champagne)',
  borderRadius: 10,
  background: 'rgba(201,169,110,.05)',
  padding: 14,
  marginTop: 14,
}
const head = { fontSize: 12, fontWeight: 900, color: 'var(--champagne)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 2 }
const sub = { fontSize: 11, color: 'var(--ink3)', marginBottom: 10 }
const rowSt = { display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', borderBottom: '1px solid var(--line)', fontSize: 12.5 }

// ── Lịch sử 1 THẺ liệu trình: ai làm buổi nào ─────────────────────────────────
export function MySpaCardHistory({ card }) {
  const [rows, setRows] = useState(null)
  useEffect(() => {
    let alive = true
    if (!card?.ma_the) { setRows([]); return undefined }
    myspaHistoryService.getCardHistory(card.ma_the).then(r => { if (alive) setRows(r) })
    return () => { alive = false }
  }, [card?.ma_the])

  if (rows === null) return <div style={{ ...box, color: 'var(--ink3)', fontSize: 12 }}>Đang tra lịch sử MySpa…</div>
  if (!rows.length) return (
    <div style={box}>
      <div style={head}>🗂 Lịch sử buổi (MySpa)</div>
      <div style={{ fontSize: 12, color: 'var(--ink3)' }}>Chưa có buổi nào của thẻ này trong dữ liệu MySpa (buổi cũ có thể không ghi mã thẻ).</div>
    </div>
  )
  return (
    <div style={box}>
      <div style={head}>🗂 Lịch sử buổi (MySpa) · {rows.length} buổi</div>
      <div style={sub}>Ai làm cho khách, buổi nào — dữ liệu tham khảo từ MySpa, không tính vào HSMS.</div>
      <div>
        {rows.map((r, i) => (
          <div key={i} style={rowSt}>
            <span style={{ width: 78, color: 'var(--ink2)', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{fmtNgay(r.ngay)}</span>
            {r.buoi_so ? <span style={{ width: 52, fontSize: 11, color: 'var(--champagne)', fontWeight: 800 }}>buổi {r.buoi_so}{r.buoi_tong ? `/${r.buoi_tong}` : ''}</span> : <span style={{ width: 52 }} />}
            <span style={{ flex: 1, fontWeight: 700, color: 'var(--ink)' }}>{r.ktv || 'Chưa rõ KTV'}</span>
            <span style={{ fontSize: 11, color: 'var(--ink3)', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.ten_dv || ''}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Lịch sử 1 KHÁCH: đến ngày nào, làm gì, ai làm ─────────────────────────────
export function MySpaCustomerHistory({ sdt, compact = false }) {
  const [rows, setRows] = useState(null)
  useEffect(() => {
    let alive = true
    if (!sdt) { setRows([]); return undefined }
    myspaHistoryService.getCustomerHistory(sdt).then(r => { if (alive) setRows(r) })
    return () => { alive = false }
  }, [sdt])

  if (rows === null) return <div style={{ ...box, color: 'var(--ink3)', fontSize: 12 }}>Đang tra lịch sử MySpa…</div>
  if (!rows.length) return (
    <div style={box}>
      <div style={head}>🗂 Lịch sử đến spa (MySpa)</div>
      <div style={{ fontSize: 12, color: 'var(--ink3)' }}>Không có lịch sử MySpa cho số điện thoại này.</div>
    </div>
  )
  // Gom theo ngày → mỗi ngày liệt kê dịch vụ + KTV
  const byDay = []
  const map = new Map()
  rows.forEach(r => {
    if (!map.has(r.ngay)) { const o = { ngay: r.ngay, items: [] }; map.set(r.ngay, o); byDay.push(o) }
    map.get(r.ngay).items.push(r)
  })
  const shown = compact ? byDay.slice(0, 8) : byDay
  return (
    <div style={box}>
      <div style={head}>🗂 Lịch sử đến spa (MySpa) · {byDay.length} lần đến</div>
      <div style={sub}>Khách từng đến ngày nào, làm gì, ai làm — tham khảo từ MySpa (2019–07/2026).</div>
      <div>
        {shown.map((d, i) => (
          <div key={i} style={{ padding: '8px 0', borderBottom: '1px solid var(--line)' }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--ink2)', marginBottom: 4, fontVariantNumeric: 'tabular-nums' }}>{fmtNgay(d.ngay)}</div>
            {d.items.map((r, j) => (
              <div key={j} style={{ display: 'flex', gap: 8, fontSize: 12.5, padding: '2px 0' }}>
                <span style={{ flex: 1, color: 'var(--ink)' }}>{r.ten_dv}{r.la_dung_the ? ' 🎫' : ''}</span>
                <span style={{ color: 'var(--champagne)', fontWeight: 700, whiteSpace: 'nowrap' }}>{r.ktv || '—'}</span>
              </div>
            ))}
          </div>
        ))}
        {compact && byDay.length > 8 && (
          <div style={{ fontSize: 11.5, color: 'var(--ink3)', paddingTop: 8 }}>… và {byDay.length - 8} lần đến trước đó</div>
        )}
      </div>
    </div>
  )
}
