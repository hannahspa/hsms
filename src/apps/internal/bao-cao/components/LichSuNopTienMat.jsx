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

    // Get actual CK amounts by day
    const ckByDay = {}
    for (const c of (ckData || [])) {
      ckByDay[c.ngay] = (ckByDay[c.ngay] || 0) + (c.so_tien || 0)
    }

    // All days sorted chronologically
    const allDays = [...new Set([...Object.keys(dtByDay), ...Object.keys(cpByDay)])].sort()

    // Running balance logic
    const rows = []
    let luyKe = 0
    for (const day of allDays) {
      const thu = dtByDay[day] || 0
      const chi = cpByDay[day] || 0
      const net = thu - chi
      const luyKeTruoc = luyKe
      luyKe += net
      const daNop = luyKe > 0 ? luyKe : 0
      const luyKeSau = luyKe > 0 ? 0 : luyKe

      // Only show days with activity
      if (thu > 0 || chi > 0 || ckByDay[day]) {
        rows.push({
          id: day, ngay: day,
          thuTm: thu, chiTm: chi, net,
          luyKeTruoc, luyKeSau: luyKe > 0 ? 0 : luyKe,
          daNop,
          coNop: daNop > 0,
          canBao: luyKeTruoc < 0, // This day had to cover previous deficit
        })
      }
      if (luyKe > 0) luyKe = 0
    }

    // Sort descending
    rows.sort((a, b) => b.ngay.localeCompare(a.ngay))
    setData(rows)
    setLoading(false)
  }, [viReady, viIds, tuNgay, denNgay])

  useEffect(() => { loadData() }, [loadData])

  // Stats
  const ngayCoNop = data.filter(r => r.coNop)
  const ngayCanBao = data.filter(r => r.canBao)
  const totalNop = ngayCoNop.reduce((s, r) => s + r.daNop, 0)

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
      <div style={{ padding: '0 16px 16px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
        {[
          { label: 'Số ngày', val: data.length, color: '#1A5276' },
          { label: 'Tổng đã nộp NH', val: formatCurrency(totalNop), color: '#2D7A4F' },
          { label: 'Ngày bù âm', val: ngayCanBao.length, color: ngayCanBao.length > 0 ? '#E67E22' : '#2D7A4F' },
        ].map(s => (
          <div key={s.label} style={{ background: 'white', borderRadius: '12px', padding: '12px 8px', border: '1px solid rgba(160,113,79,0.1)', textAlign: 'center' }}>
            <div style={{ fontSize: '18px', fontWeight: '800', color: s.color }}>{s.val}</div>
            <div style={{ fontSize: '10px', color: LUX.ink3, marginTop: '4px' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Logic explanation */}
      <div style={{ padding: '0 16px 12px' }}>
        <div style={{ background: '#EFF6FF', borderRadius: '12px', padding: '12px 16px', border: '1px solid #BFDBFE', fontSize: '11px', color: '#1E40AF', lineHeight: 1.5 }}>
          <b>Logic lũy kế:</b> Mỗi ngày, Thu TM − Chi TM được cộng dồn. Khi số dư dương → nộp hết vào NH. Khi âm → giữ lại, ngày hôm sau bù tiếp.
          <span style={{ color: '#E67E22', fontWeight: '600' }}> 🟠 Ngày bù âm</span> = ngày có nộp ít hơn Thu-Chi vì phải trừ khoản âm ngày trước.
        </div>
      </div>

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
            <div style={{ display: 'grid', gridTemplateColumns: '85px 75px 75px 70px 1fr', padding: '10px 6px', background: '#FAF7F4', borderBottom: '1px solid rgba(160,113,79,0.1)', fontSize: '9px', fontWeight: '700', color: LUX.ink3, textTransform: 'uppercase' }}>
              <div>Ngày</div>
              <div style={{ textAlign: 'right' }}>Thu TM</div>
              <div style={{ textAlign: 'right' }}>Chi TM</div>
              <div style={{ textAlign: 'right' }}>Lũy kế</div>
              <div style={{ textAlign: 'right' }}>Đã Nộp NH</div>
            </div>
            {data.map((row, i) => {
              const isCanBao = row.canBao
              return (
                <div key={row.id} style={{
                  display: 'grid', gridTemplateColumns: '85px 75px 75px 70px 1fr', padding: '8px 6px', alignItems: 'center',
                  borderBottom: i < data.length - 1 ? '1px solid rgba(160,113,79,0.04)' : 'none',
                  fontSize: '11px',
                  background: isCanBao ? '#FFF8F0' : 'transparent',
                }}>
                  <div>
                    <div style={{ fontWeight: '600', color: LUX.ink, fontSize: '11px' }}>{formatDate(row.ngay)}</div>
                  </div>
                  <div style={{ textAlign: 'right', color: row.thuTm > 0 ? '#2D7A4F' : LUX.ink3 }}>
                    {row.thuTm > 0 ? formatCurrency(row.thuTm) : '—'}
                  </div>
                  <div style={{ textAlign: 'right', color: row.chiTm > 0 ? '#C0392B' : LUX.ink3 }}>
                    {row.chiTm > 0 ? formatCurrency(row.chiTm) : '—'}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    {row.luyKeTruoc < 0 && (
                      <span style={{ fontSize: '9px', color: '#E67E22', display: 'block' }}>
                        {formatCurrency(row.luyKeTruoc)}
                      </span>
                    )}
                    <span style={{ fontWeight: '600', color: row.net >= 0 ? '#2D7A4F' : '#C0392B', fontSize: '10px' }}>
                      {row.net >= 0 ? '+' : ''}{formatCurrency(row.net)}
                    </span>
                  </div>
                  <div style={{ textAlign: 'right', fontWeight: '700', color: row.daNop > 0 ? '#1A5276' : LUX.ink3 }}>
                    {row.daNop > 0 ? formatCurrency(row.daNop) : '—'}
                    {isCanBao && <span style={{ fontSize: '9px', color: '#E67E22', display: 'block' }}>🟠 bù âm</span>}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div style={{ padding: '12px 16px', fontSize: '10px', color: LUX.ink3 }}>
        * Lũy kế = số dư tiền mặt tích lũy. Khi dương → nộp hết vào NH, reset về 0. Khi âm → giữ lại chờ ngày sau bù.
      </div>
    </div>
  )
}
