import { useState, useEffect } from 'react'
import { supabase } from '../../../../lib/supabase'
import { LUX } from '../../../../constants/lux'
import { formatCurrency } from '../../../../lib/utils'
import DatePicker from '../../../../components/shared/DatePicker'

export default function LichSuNopTienMat({ onBack }) {
  const [data, setData] = useState([])
  const [viList, setViList] = useState([])
  const [loading, setLoading] = useState(true)
  const [tuNgay, setTuNgay] = useState('2025-11-26')
  const [denNgay, setDenNgay] = useState('2026-04-30')
  const [showTuNgay, setShowTuNgay] = useState(false)
  const [showDenNgay, setShowDenNgay] = useState(false)

  useEffect(() => { loadVi() }, [])
  useEffect(() => { if (viList.length > 0) loadData() }, [viList, tuNgay, denNgay])

  const loadVi = async () => {
    const { data } = await supabase.from('vi').select('id,ten,loai').eq('is_active', true)
    if (data) setViList(data)
  }

  const loadData = async () => {
    setLoading(true)
    const tmId = viList.find(v => v.loai === 'tien_mat')?.id
    const mbId = viList.find(v => v.loai === 'chuyen_khoan')?.id
    if (!tmId || !mbId) { setLoading(false); return }

    const [{ data: ckData }, { data: dtData }, { data: cpData }] = await Promise.all([
      supabase.from('chuyen_khoan_noi_bo').select('*').eq('tu_vi_id', tmId).eq('den_vi_id', mbId).gte('ngay', tuNgay).lte('ngay', denNgay).order('ngay', { ascending: false }),
      supabase.from('doanh_thu').select('ngay,so_tien').eq('hinh_thuc', 'tien_mat').gte('ngay', tuNgay).lte('ngay', denNgay),
      supabase.from('chi_phi').select('ngay,so_tien').eq('hinh_thuc_thanh_toan', 'tien_mat').gte('ngay', tuNgay).lte('ngay', denNgay),
    ])

    const dtByDay = {}; const cpByDay = {}
    for (const d of (dtData || [])) dtByDay[d.ngay] = (dtByDay[d.ngay] || 0) + (d.so_tien || 0)
    for (const d of (cpData || [])) cpByDay[d.ngay] = (cpByDay[d.ngay] || 0) + (d.so_tien || 0)

    const rows = (ckData || []).map(c => ({
      id: c.id, ngay: c.ngay, soTien: c.so_tien || 0,
      dienGiai: c.dien_giai || '', nguoiThucHien: c.nguoi_thuc_hien || '',
      dtTm: dtByDay[c.ngay] || 0, cpTm: cpByDay[c.ngay] || 0,
      phaiNop: (dtByDay[c.ngay] || 0) - (cpByDay[c.ngay] || 0),
    }))

    setData(rows)
    setLoading(false)
  }

  const totalNop = data.reduce((s, r) => s + r.soTien, 0)
  const matchCount = data.filter(r => r.soTien === r.phaiNop).length
  const mismatchCount = data.filter(r => r.soTien !== r.phaiNop && r.phaiNop > 0).length

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
          <div style={{ fontSize: '11px', color: LUX.ink3, fontFamily: LUX.fontSans }}>Chuyển khoản nội bộ: Tiền Mặt → MB Bank</div>
        </div>
      </div>

      {/* Filters */}
      <div style={{ padding: '0 16px 16px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <button onClick={() => setShowTuNgay(true)} style={{ padding: '10px 14px', borderRadius: '12px', border: '1px solid rgba(160,113,79,0.2)', background: 'white', cursor: 'pointer', fontSize: '12px', fontWeight: '600', color: LUX.ink }}>
          📅 Từ: {tuNgay.split('-').reverse().join('/')}
        </button>
        <button onClick={() => setShowDenNgay(true)} style={{ padding: '10px 14px', borderRadius: '12px', border: '1px solid rgba(160,113,79,0.2)', background: 'white', cursor: 'pointer', fontSize: '12px', fontWeight: '600', color: LUX.ink }}>
          📅 Đến: {denNgay.split('-').reverse().join('/')}
        </button>
      </div>

      {/* Summary */}
      <div style={{ padding: '0 16px 16px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
        {[
          { label: 'Số lần nộp', val: data.length, color: '#2D7A4F' },
          { label: 'Tổng đã nộp', val: formatCurrency(totalNop), color: '#1A5276' },
          { label: 'Khớp / Lệch', val: `${matchCount} / ${mismatchCount}`, color: mismatchCount === 0 ? '#2D7A4F' : '#C0392B' },
        ].map(s => (
          <div key={s.label} style={{ background: 'white', borderRadius: '12px', padding: '12px', border: '1px solid rgba(160,113,79,0.1)', textAlign: 'center' }}>
            <div style={{ fontSize: '16px', fontWeight: '800', color: s.color }}>{s.val}</div>
            <div style={{ fontSize: '10px', color: LUX.ink3, marginTop: '3px' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div style={{ padding: '0 16px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: LUX.ink3 }}>Đang tải...</div>
        ) : data.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: LUX.ink3, background: 'white', borderRadius: '16px' }}>Không có dữ liệu</div>
        ) : (
          <div style={{ background: 'white', borderRadius: '16px', border: '1px solid rgba(160,113,79,0.1)', overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr 110px', padding: '10px 14px', background: '#FAF7F4', borderBottom: '1px solid rgba(160,113,79,0.1)', fontSize: '10px', fontWeight: '700', color: LUX.ink3, textTransform: 'uppercase' }}>
              <div>Ngày</div>
              <div>Diễn Giải / Thu-Chi TM</div>
              <div style={{ textAlign: 'right' }}>Nộp / Phải Nộp</div>
            </div>
            {data.map((row, i) => {
              const match = row.soTien === row.phaiNop
              return (
                <div key={row.id || i} style={{
                  display: 'grid', gridTemplateColumns: '110px 1fr 110px',
                  padding: '10px 14px', alignItems: 'center',
                  borderBottom: i < data.length - 1 ? '1px solid rgba(160,113,79,0.04)' : 'none',
                  fontSize: '12px',
                }}>
                  <div>
                    <div style={{ fontWeight: '600', color: LUX.ink, fontSize: '11px' }}>{formatDate(row.ngay)}</div>
                  </div>
                  <div>
                    <div style={{ color: LUX.ink, fontWeight: '500', fontSize: '12px' }}>{row.dienGiai || 'Nộp tiền mặt'}</div>
                    <div style={{ fontSize: '10px', color: LUX.ink3, marginTop: '1px' }}>
                      Thu {formatCurrency(row.dtTm)} · Chi {formatCurrency(row.cpTm)}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: '700', color: '#1A5276', fontSize: '12px' }}>{formatCurrency(row.soTien)}</div>
                    <div style={{ fontSize: '10px', color: match ? '#2D7A4F' : '#C0392B', fontWeight: match ? '500' : '600' }}>
                      {formatCurrency(row.phaiNop)}
                      {!match && <span style={{ marginLeft: '2px' }}>⚠️</span>}
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
