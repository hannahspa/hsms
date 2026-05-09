import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../../../lib/supabase'
import { LUX } from '../../../../constants/lux'
import { formatCurrency, todayISO } from '../../../../lib/utils'
import DatePicker from '../../../../components/shared/DatePicker'

const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }))
const thisMonthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`

export default function LichSuNopTienMat({ onBack }) {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [tuNgay, setTuNgay] = useState(thisMonthStart)
  const [denNgay, setDenNgay] = useState(todayISO())
  const [showTuNgay, setShowTuNgay] = useState(false)
  const [showDenNgay, setShowDenNgay] = useState(false)
  const [viReady, setViReady] = useState(false) // false=loading, true=ok, 'error'=fail
  const [viIds, setViIds] = useState({ tmId: null, mbId: null })
  const [loadStart, setLoadStart] = useState(Date.now())
  const [elapsed, setElapsed] = useState(0)

  // Load vi IDs — dùng so_du_vi_thuc_te (không bị RLS chặn như bảng vi)
  useEffect(() => {
    supabase.from('so_du_vi_thuc_te').select('id,ten,loai').order('thu_tu').then(({ data, error }) => {
      if (error || !data || data.length === 0) {
        console.error('LichSuNopTienMat: cannot load vi from view', error)
        setViReady('error')
        return
      }
      const tm = data.find(v => v.loai === 'tien_mat')
      const mb = data.find(v => v.loai === 'chuyen_khoan')
      if (tm && mb) {
        setViIds({ tmId: tm.id, mbId: mb.id })
        setViReady(true)
      } else {
        console.error('LichSuNopTienMat: cannot find wallets', { tm: !!tm, mb: !!mb, data })
        setViReady('error')
      }
    })
  }, [])

  // Elapsed timer
  useEffect(() => {
    if (!loading) return
    const t = setInterval(() => setElapsed(Math.round((Date.now() - loadStart) / 1000)), 500)
    return () => clearInterval(t)
  }, [loading, loadStart])

  // Load data when vi ready or dates change
  const loadData = useCallback(async () => {
    if (viReady !== true) return
    setLoading(true)
    setLoadStart(Date.now())
    setElapsed(0)
    const { tmId, mbId } = viIds

    const [{ data: ckData }, { data: dtData }, { data: cpData }] = await Promise.all([
      supabase.from('chuyen_khoan_noi_bo').select('*')
        .eq('tu_vi_id', tmId).eq('den_vi_id', mbId)
        .gte('ngay', tuNgay).lte('ngay', denNgay).order('ngay', { ascending: false }),
      supabase.from('doanh_thu').select('ngay,so_tien')
        .eq('hinh_thuc', 'tien_mat').gte('ngay', tuNgay).lte('ngay', denNgay),
      supabase.from('chi_phi').select('ngay,so_tien')
        .eq('hinh_thuc_thanh_toan', 'tien_mat').gte('ngay', tuNgay).lte('ngay', denNgay),
    ])

    // Group by day
    const dtByDay = {}; const cpByDay = {}
    for (const d of (dtData || [])) dtByDay[d.ngay] = (dtByDay[d.ngay] || 0) + (d.so_tien || 0)
    for (const d of (cpData || [])) cpByDay[d.ngay] = (cpByDay[d.ngay] || 0) + (d.so_tien || 0)

    // Build rows from CK noi bo
    const rows = (ckData || []).map(c => {
      const dt = dtByDay[c.ngay] || 0
      const cp = cpByDay[c.ngay] || 0
      const phaiNop = dt - cp
      return {
        id: c.id, ngay: c.ngay, soTien: c.so_tien || 0,
        dienGiai: c.dien_giai || 'Nộp tiền mặt',
        dtTm: dt, cpTm: cp, phaiNop,
        match: (c.so_tien || 0) === phaiNop,
        type: 'co-nop',
      }
    })

    // Find days with cash to deposit but NO CK noi bo record
    const ckDays = new Set((ckData || []).map(c => c.ngay))
    const allDays = new Set([...Object.keys(dtByDay), ...Object.keys(cpByDay)])
    for (const day of allDays) {
      if (ckDays.has(day)) continue
      const phaiNop = (dtByDay[day] || 0) - (cpByDay[day] || 0)
      if (phaiNop > 0) {
        rows.push({
          id: `missing-${day}`, ngay: day, soTien: 0,
          dienGiai: 'CHƯA NỘP — cần kiểm tra!',
          dtTm: dtByDay[day] || 0, cpTm: cpByDay[day] || 0, phaiNop,
          match: false, type: 'thieu-nop',
        })
      }
    }

    // Sort by date desc
    rows.sort((a, b) => b.ngay.localeCompare(a.ngay))
    setData(rows)
    setLoading(false)
  }, [viReady, viIds, tuNgay, denNgay])

  useEffect(() => { loadData() }, [loadData])

  // Stats
  const ckNop = data.filter(r => r.type === 'co-nop')
  const thieuNop = data.filter(r => r.type === 'thieu-nop')
  const totalNop = ckNop.reduce((s, r) => s + r.soTien, 0)
  const matchCount = ckNop.filter(r => r.match).length
  const mismatchCount = ckNop.filter(r => !r.match).length

  const formatDate = (iso) => {
    if (!iso) return ''
    const [y, m, d] = iso.split('-')
    const date = new Date(parseInt(y), parseInt(m) - 1, parseInt(d))
    const days = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7']
    return `${days[date.getDay()]}, ${d}/${m}/${y}`
  }

  return (
    <div style={{ paddingBottom: '100px' }}>
      <DatePicker open={showTuNgay} selectedDate={tuNgay} onClose={() => setShowTuNgay(false)} onConfirm={(d) => { setTuNgay(d); setShowTuNgay(false) }} />
      <DatePicker open={showDenNgay} selectedDate={denNgay} onClose={() => setShowDenNgay(false)} onConfirm={(d) => { setDenNgay(d); setShowDenNgay(false) }} />

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '6px 16px 20px' }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', fontSize: '22px', cursor: 'pointer', color: LUX.ink, padding: '4px' }}>←</button>
        <div>
          <div style={{ fontWeight: '700', fontSize: '20px', color: LUX.ink, fontFamily: LUX.fontSerif }}>Lịch Sử Nộp Tiền Mặt</div>
          <div style={{ fontSize: '11px', color: LUX.ink3, fontFamily: LUX.fontSans }}>CK nội bộ: Tiền Mặt → MB Bank · Đối chiếu Thu-Chi TM</div>
        </div>
      </div>

      {/* Quick date presets */}
      <div style={{ padding: '0 16px 6px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
        {[
          { label: 'Tháng này', tu: thisMonthStart, den: todayISO() },
          { label: '3 tháng', tu: `${now.getFullYear()}-${String(Math.max(1, now.getMonth() - 1)).padStart(2, '0')}-01`, den: todayISO() },
          { label: 'Tất cả', tu: '2025-11-01', den: todayISO() },
        ].map(p => (
          <button key={p.label} onClick={() => { setTuNgay(p.tu); setDenNgay(p.den) }}
            style={{
              padding: '8px 14px', borderRadius: '20px', cursor: 'pointer', fontSize: '12px', fontWeight: '600',
              border: tuNgay === p.tu && denNgay === p.den ? '2px solid #A0714F' : '1px solid rgba(160,113,79,0.2)',
              background: tuNgay === p.tu && denNgay === p.den ? '#A0714F12' : 'white',
              color: tuNgay === p.tu && denNgay === p.den ? '#A0714F' : LUX.ink3,
            }}
          >{p.label}</button>
        ))}
      </div>

      {/* Date pickers */}
      <div style={{ padding: '0 16px 14px', display: 'flex', gap: '8px' }}>
        <button onClick={() => setShowTuNgay(true)} style={{ padding: '10px 14px', borderRadius: '12px', border: '1px solid rgba(160,113,79,0.2)', background: 'white', cursor: 'pointer', fontSize: '12px', fontWeight: '600', color: LUX.ink }}>
          📅 Từ: {tuNgay.split('-').reverse().join('/')}
        </button>
        <button onClick={() => setShowDenNgay(true)} style={{ padding: '10px 14px', borderRadius: '12px', border: '1px solid rgba(160,113,79,0.2)', background: 'white', cursor: 'pointer', fontSize: '12px', fontWeight: '600', color: LUX.ink }}>
          📅 Đến: {denNgay.split('-').reverse().join('/')}
        </button>
      </div>

      {/* Summary cards */}
      <div style={{ padding: '0 16px 16px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '8px' }}>
        {[
          { label: 'Đã nộp', val: ckNop.length, sub: `${formatCurrency(totalNop)}`, color: '#1A5276' },
          { label: 'Khớp', val: matchCount, color: '#2D7A4F' },
          { label: 'Lệch', val: mismatchCount, color: mismatchCount > 0 ? '#C0392B' : '#2D7A4F' },
          { label: 'Thiếu', val: thieuNop.length, color: thieuNop.length > 0 ? '#E67E22' : '#2D7A4F' },
        ].map(s => (
          <div key={s.label} style={{ background: 'white', borderRadius: '12px', padding: '12px 8px', border: '1px solid rgba(160,113,79,0.1)', textAlign: 'center' }}>
            <div style={{ fontSize: '18px', fontWeight: '800', color: s.color }}>{s.val}</div>
            {s.sub && <div style={{ fontSize: '10px', color: LUX.ink3, marginTop: '1px' }}>{s.sub}</div>}
            <div style={{ fontSize: '10px', color: LUX.ink3, marginTop: s.sub ? '1px' : '4px' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Alert banner for thieu */}
      {thieuNop.length > 0 && (
        <div style={{ padding: '0 16px 12px' }}>
          <div style={{ background: '#FFF8F0', borderRadius: '12px', padding: '12px 16px', border: '1px solid #FED7AA', fontSize: '12px', color: '#9A3412', fontWeight: '600' }}>
            ⚠️ Có {thieuNop.length} ngày có tiền mặt phải nộp nhưng chưa có bút toán CK nội bộ!
          </div>
        </div>
      )}

      {/* Table */}
      <div style={{ padding: '0 16px' }}>
        {viReady === 'error' ? (
          <div style={{ textAlign: 'center', padding: '40px', background: '#FFF5F5', borderRadius: '16px', border: '1px solid #FECACA' }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>⚠️</div>
            <div style={{ fontWeight: '700', color: '#C0392B', marginBottom: '8px' }}>Không thể tải dữ liệu ví</div>
            <div style={{ fontSize: '12px', color: LUX.ink3, marginBottom: '16px' }}>Vui lòng kiểm tra bảng vi trong database</div>
            <button onClick={() => window.location.reload()} style={{ padding: '10px 20px', borderRadius: '10px', background: '#C0392B', color: 'white', border: 'none', cursor: 'pointer', fontWeight: '600' }}>Thử lại</button>
          </div>
        ) : loading ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', background: 'white', borderRadius: '16px', border: '1px solid rgba(160,113,79,0.08)' }}>
            <div style={{ width: '48px', height: '48px', margin: '0 auto 16px', borderRadius: '50%', border: '4px solid #EDE8E3', borderTopColor: '#A0714F', animation: 'spin 0.8s linear infinite' }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            <div style={{ fontWeight: '700', color: LUX.ink, marginBottom: '4px' }}>Đang tải dữ liệu...</div>
            <div style={{ fontSize: '12px', color: LUX.ink3 }}>
              {viReady !== true ? 'Đang kết nối...' : `Đã ${elapsed}s — đang truy vấn ${tuNgay.split('-').reverse().join('/')} → ${denNgay.split('-').reverse().join('/')}`}
            </div>
            {elapsed > 10 && (
              <div style={{ marginTop: '12px', fontSize: '11px', color: '#E67E22' }}>
                Đang tải hơi lâu... vui lòng đợi thêm giây lát
              </div>
            )}
          </div>
        ) : data.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: LUX.ink3, background: 'white', borderRadius: '16px' }}>Không có dữ liệu trong khoảng này</div>
        ) : (
          <div style={{ background: 'white', borderRadius: '16px', border: '1px solid rgba(160,113,79,0.1)', overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '105px 1fr 110px', padding: '10px 14px', background: '#FAF7F4', borderBottom: '1px solid rgba(160,113,79,0.1)', fontSize: '10px', fontWeight: '700', color: LUX.ink3, textTransform: 'uppercase' }}>
              <div>Ngày</div>
              <div>Diễn Giải / Thu-Chi TM</div>
              <div style={{ textAlign: 'right' }}>Đã Nộp / Phải Nộp</div>
            </div>
            {data.map((row, i) => {
              const isMissing = row.type === 'thieu-nop'
              const isMismatch = !row.match && !isMissing
              return (
                <div key={row.id} style={{
                  display: 'grid', gridTemplateColumns: '105px 1fr 110px', padding: '10px 14px', alignItems: 'center',
                  borderBottom: i < data.length - 1 ? '1px solid rgba(160,113,79,0.04)' : 'none',
                  fontSize: '12px',
                  background: isMissing ? '#FFF9F0' : isMismatch ? '#FFF5F5' : 'transparent',
                }}>
                  <div>
                    <div style={{ fontWeight: '600', color: LUX.ink, fontSize: '11px' }}>{formatDate(row.ngay)}</div>
                  </div>
                  <div>
                    <div style={{ color: isMissing ? '#E67E22' : LUX.ink, fontWeight: isMissing ? '700' : '500', fontSize: '12px' }}>
                      {isMissing ? '⚠️ ' : ''}{row.dienGiai}
                    </div>
                    <div style={{ fontSize: '10px', color: LUX.ink3, marginTop: '1px' }}>
                      Thu {formatCurrency(row.dtTm)} · Chi {formatCurrency(row.cpTm)}
                      {row.phaiNop > 0 && <span style={{ color: '#1A5276', fontWeight: '600' }}> → Phải nộp {formatCurrency(row.phaiNop)}</span>}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: '700', color: isMissing ? '#E67E22' : '#1A5276', fontSize: '12px' }}>
                      {isMissing ? '—' : formatCurrency(row.soTien)}
                    </div>
                    <div style={{
                      fontSize: '10px', fontWeight: '600',
                      color: row.match ? '#2D7A4F' : '#C0392B',
                    }}>
                      {isMissing ? 'THIẾU' : row.match ? 'OK' : `Lệch ${formatCurrency(Math.abs(row.soTien - row.phaiNop))}`}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div style={{ padding: '12px 16px', fontSize: '10px', color: LUX.ink3 }}>
        * Phải Nộp = Doanh Thu Tiền Mặt trong ngày − Chi Phí Tiền Mặt trong ngày
      </div>
    </div>
  )
}
