import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabase'
import { LUX } from '../../../constants/lux'
import { formatCurrency } from '../../../lib/utils'
import DatePicker from '../../../components/shared/DatePicker'

export default function AdminLichSuNopTienMat() {
  const [data, setData] = useState([])
  const [viList, setViList] = useState([])
  const [loading, setLoading] = useState(true)
  const [tuNgay, setTuNgay] = useState('2025-11-26')
  const [denNgay, setDenNgay] = useState('2026-04-30')
  const [showTuNgay, setShowTuNgay] = useState(false)
  const [showDenNgay, setShowDenNgay] = useState(false)
  const [sortOrder, setSortOrder] = useState('desc')

  useEffect(() => {
    loadVi()
  }, [])

  useEffect(() => {
    if (viList.length > 0) loadData()
  }, [viList, tuNgay, denNgay])

  const loadVi = async () => {
    const { data } = await supabase.from('vi').select('id,ten,loai').eq('is_active', true)
    if (data) setViList(data)
  }

  const loadData = async () => {
    setLoading(true)
    const tmId = viList.find(v => v.loai === 'tien_mat')?.id
    const mbId = viList.find(v => v.loai === 'chuyen_khoan')?.id

    if (!tmId || !mbId) { setLoading(false); return }

    // Get CK noi bo TM -> MB
    const { data: ckData } = await supabase
      .from('chuyen_khoan_noi_bo')
      .select('*')
      .eq('tu_vi_id', tmId)
      .eq('den_vi_id', mbId)
      .gte('ngay', tuNgay)
      .lte('ngay', denNgay)
      .order('ngay', { ascending: sortOrder === 'asc' })

    // Get doanh thu + chi phi tien mat theo ngay
    const { data: dtData } = await supabase
      .from('doanh_thu')
      .select('ngay,so_tien')
      .eq('hinh_thuc', 'tien_mat')
      .gte('ngay', tuNgay)
      .lte('ngay', denNgay)

    const { data: cpData } = await supabase
      .from('chi_phi')
      .select('ngay,so_tien')
      .eq('hinh_thuc_thanh_toan', 'tien_mat')
      .gte('ngay', tuNgay)
      .lte('ngay', denNgay)

    // Group by day
    const dtByDay = {}
    const cpByDay = {}
    for (const d of (dtData || [])) {
      dtByDay[d.ngay] = (dtByDay[d.ngay] || 0) + (d.so_tien || 0)
    }
    for (const d of (cpData || [])) {
      cpByDay[d.ngay] = (cpByDay[d.ngay] || 0) + (d.so_tien || 0)
    }

    // Merge
    const ckByDay = {}
    for (const c of (ckData || [])) {
      const day = c.ngay
      if (!ckByDay[day]) ckByDay[day] = []
      ckByDay[day].push(c)
    }

    const allDays = new Set()
    for (const d of (ckData || [])) allDays.add(d.ngay)

    const rows = []
    for (const day of [...allDays].sort((a, b) => sortOrder === 'asc' ? a.localeCompare(b) : b.localeCompare(a))) {
      for (const c of (ckByDay[day] || [])) {
        rows.push({
          id: c.id,
          ngay: c.ngay,
          soTien: c.so_tien || 0,
          dienGiai: c.dien_giai || '',
          nguoiThucHien: c.nguoi_thuc_hien || '',
          dtTm: dtByDay[c.ngay] || 0,
          cpTm: cpByDay[c.ngay] || 0,
          phaiNop: (dtByDay[c.ngay] || 0) - (cpByDay[c.ngay] || 0),
        })
      }
    }

    setData(rows)
    setLoading(false)
  }

  const totalNop = data.reduce((s, r) => s + r.soTien, 0)
  const totalPhaiNop = [...new Set(data.map(r => r.ngay))].reduce((s, day) => {
    const r = data.find(d => d.ngay === day)
    return s + (r?.phaiNop || 0)
  }, 0)

  const formatDate = (iso) => {
    if (!iso) return ''
    const [y, m, d] = iso.split('-')
    const date = new Date(parseInt(y), parseInt(m) - 1, parseInt(d))
    const days = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7']
    return `${days[date.getDay()]}, ${d}/${m}/${y}`
  }

  return (
    <div style={{ minHeight: '100vh', background: LUX.bg, fontFamily: "'Inter', 'Segoe UI', sans-serif", paddingBottom: '60px' }}>
      <DatePicker open={showTuNgay} selectedDate={tuNgay} onClose={() => setShowTuNgay(false)} onConfirm={(d) => { setTuNgay(d); setShowTuNgay(false) }} />
      <DatePicker open={showDenNgay} selectedDate={denNgay} onClose={() => setShowDenNgay(false)} onConfirm={(d) => { setDenNgay(d); setShowDenNgay(false) }} />

      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #2C1810 0%, #A0714F 60%, #C9A96E 100%)', padding: '32px 20px 28px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '-30px', right: '-30px', width: '150px', height: '150px', borderRadius: '50%', background: 'rgba(201,169,110,0.1)' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
          <button onClick={() => window.location.href = '/admin'} style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px', color: 'white', padding: '6px 12px', cursor: 'pointer', fontSize: '13px' }}>← Admin</button>
          <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px' }}>Báo Cáo</span>
        </div>
        <div style={{ color: 'white', fontWeight: '800', fontSize: '22px', marginTop: '8px' }}>Lịch Sử Nộp Tiền Mặt Vào Ngân Hàng</div>
        <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', marginTop: '4px' }}>Chuyển khoản nội bộ: Tiền Mặt → MB Bank</div>
      </div>

      {/* Filters */}
      <div style={{ padding: '16px 20px', display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
        <button onClick={() => setShowTuNgay(true)} style={{ padding: '10px 14px', borderRadius: '12px', border: '1px solid rgba(160,113,79,0.2)', background: 'white', cursor: 'pointer', fontSize: '13px', fontWeight: '600', color: LUX.ink, fontFamily: "'Inter', sans-serif" }}>
          📅 Từ: {tuNgay ? tuNgay.split('-').reverse().join('/') : '...'}
        </button>
        <button onClick={() => setShowDenNgay(true)} style={{ padding: '10px 14px', borderRadius: '12px', border: '1px solid rgba(160,113,79,0.2)', background: 'white', cursor: 'pointer', fontSize: '13px', fontWeight: '600', color: LUX.ink, fontFamily: "'Inter', sans-serif" }}>
          📅 Đến: {denNgay ? denNgay.split('-').reverse().join('/') : '...'}
        </button>
        <button
          onClick={() => setSortOrder(s => s === 'asc' ? 'desc' : 'asc')}
          style={{ padding: '10px 14px', borderRadius: '12px', border: '1px solid rgba(160,113,79,0.2)', background: 'white', cursor: 'pointer', fontSize: '13px', fontWeight: '600', color: LUX.ink, fontFamily: "'Inter', sans-serif" }}
        >
          {sortOrder === 'desc' ? '🔽 Mới nhất' : '🔼 Cũ nhất'}
        </button>
      </div>

      {/* Summary cards */}
      <div style={{ padding: '0 20px 16px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
        {[
          { label: 'Số lần nộp', val: `${data.length}`, color: '#2D7A4F' },
          { label: 'Tổng đã nộp', val: formatCurrency(totalNop), color: '#1A5276' },
          { label: 'Trung bình/lần', val: formatCurrency(data.length > 0 ? Math.round(totalNop / data.length) : 0), color: '#A0714F' },
        ].map(s => (
          <div key={s.label} style={{ background: 'white', borderRadius: '14px', padding: '14px', border: '1px solid rgba(160,113,79,0.1)', textAlign: 'center' }}>
            <div style={{ fontSize: '18px', fontWeight: '800', color: s.color }}>{s.val}</div>
            <div style={{ fontSize: '11px', color: LUX.ink3, marginTop: '4px' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div style={{ padding: '0 20px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: LUX.ink3 }}>Đang tải...</div>
        ) : data.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: LUX.ink3, background: 'white', borderRadius: '16px' }}>
            Không có dữ liệu trong khoảng ngày này
          </div>
        ) : (
          <div style={{ background: 'white', borderRadius: '16px', border: '1px solid rgba(160,113,79,0.1)', overflow: 'hidden' }}>
            {/* Table header */}
            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr 120px 100px', padding: '12px 16px', background: '#FAF7F4', borderBottom: '1px solid rgba(160,113,79,0.1)', fontSize: '11px', fontWeight: '700', color: LUX.ink3, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              <div>Ngày</div>
              <div>Diễn Giải</div>
              <div style={{ textAlign: 'right' }}>Số Tiền Nộp</div>
              <div style={{ textAlign: 'right' }}>Phải Nộp*</div>
            </div>
            {data.map((row, i) => {
              const match = row.soTien === row.phaiNop
              return (
                <div key={row.id || i} style={{
                  display: 'grid', gridTemplateColumns: '120px 1fr 120px 100px',
                  padding: '12px 16px', alignItems: 'center',
                  borderBottom: i < data.length - 1 ? '1px solid rgba(160,113,79,0.05)' : 'none',
                  fontSize: '13px',
                }}>
                  <div>
                    <div style={{ fontWeight: '600', color: LUX.ink }}>{formatDate(row.ngay)}</div>
                  </div>
                  <div>
                    <div style={{ color: LUX.ink, fontWeight: '500' }}>{row.dienGiai || 'Nộp tiền mặt'}</div>
                    <div style={{ fontSize: '11px', color: LUX.ink3, marginTop: '2px' }}>
                      Thu TM: {formatCurrency(row.dtTm)} · Chi TM: {formatCurrency(row.cpTm)}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', fontWeight: '700', color: '#1A5276' }}>
                    {formatCurrency(row.soTien)}
                  </div>
                  <div style={{ textAlign: 'right', fontWeight: '600', color: match ? '#2D7A4F' : '#C0392B' }}>
                    {formatCurrency(row.phaiNop)}
                    {!match && <span style={{ fontSize: '10px', marginLeft: '4px' }}>⚠️</span>}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div style={{ padding: '16px 20px', fontSize: '11px', color: LUX.ink3 }}>
        * Phải Nộp = Doanh Thu Tiền Mặt trong ngày − Chi Phí Tiền Mặt trong ngày
      </div>
    </div>
  )
}
