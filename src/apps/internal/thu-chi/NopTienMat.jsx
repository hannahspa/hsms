import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabase'
import { LUX } from '../../../constants/lux'
import { formatCurrency, todayISO } from '../../../lib/utils'

export default function NopTienMat({ ngay, user, onDone }) {
  ngay = ngay || todayISO()
  const [viList, setViList] = useState([])
  const [cashIn, setCashIn] = useState(0)
  const [cashOut, setCashOut] = useState(0)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    loadData()
  }, [ngay])

  const loadData = async () => {
    setLoading(true)
    try {
      const [rVi, rDT, rCP, rCK] = await Promise.all([
        supabase.from('vi').select('id,ten,loai').eq('is_active', true).order('thu_tu'),
        supabase.from('doanh_thu').select('hinh_thuc,so_tien').eq('ngay', ngay).eq('hinh_thuc', 'tien_mat'),
        supabase.from('chi_phi').select('hinh_thuc_thanh_toan,so_tien').eq('ngay', ngay).eq('hinh_thuc_thanh_toan', 'tien_mat'),
        supabase.from('chuyen_khoan_noi_bo').select('tu_vi_id,so_tien').eq('ngay', ngay),
      ])

      setViList(rVi.data || [])

      const dt = (rDT.data || []).reduce((s, d) => s + (d.so_tien || 0), 0)
      const cp = (rCP.data || []).reduce((s, d) => s + (d.so_tien || 0), 0)

      // Trừ đi tiền mặt đã nộp vào ngân hàng hôm nay
      const tmVi = (rVi.data || []).find(v => v.loai === 'tien_mat')
      const alreadyDeposited = (rCK.data || [])
        .filter(ck => ck.tu_vi_id === tmVi?.id)
        .reduce((s, ck) => s + (ck.so_tien || 0), 0)

      setCashIn(dt)
      setCashOut(cp + alreadyDeposited)
      setDone(alreadyDeposited > 0)
    } catch (e) {
      console.error('NopTienMat load error:', e)
    } finally {
      setLoading(false)
    }
  }

  const soDuTienMat = cashIn - cashOut
  const isToday = ngay === todayISO()
  const tienMatVi = viList.find(v => v.loai === 'tien_mat')
  const mbVi = viList.find(v => v.loai === 'chuyen_khoan')

  const handleSubmit = async () => {
    if (soDuTienMat <= 0) return
    if (!isToday) { alert('Chỉ được nộp tiền mặt cho ngày hôm nay.'); return }
    if (!window.confirm(`Xác nhận nộp ${formatCurrency(soDuTienMat)} vào MB Bank?`)) return

    setSubmitting(true)
    try {
      const { error } = await supabase.from('chuyen_khoan_noi_bo').insert({
        ngay,
        tu_vi_id: tienMatVi?.id,
        den_vi_id: mbVi?.id,
        so_tien: soDuTienMat,
        dien_giai: `Nộp tiền mặt cuối ngày ${ngay}`,
        nguoi_thuc_hien: user?.ho_ten || null,
      })
      if (error) throw error
      setDone(true)
      onDone?.()
    } catch (e) {
      alert('Lỗi: ' + e.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return null
  if (done) {
    return (
      <div style={{ background: '#F0FDF4', borderRadius: '14px', padding: '14px 16px', border: '1px solid #BBF7D0', display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px', opacity: 0.85 }}>
        <span style={{ fontSize: '20px' }}>✅</span>
        <div>
          <div style={{ fontWeight: '700', fontSize: '13px', color: '#2D7A4F', fontFamily: LUX.fontSans }}>Đã nộp tiền mặt — hoàn tất</div>
          <div style={{ fontSize: '12px', color: '#4A8A5F', fontFamily: LUX.fontSans }}>{formatCurrency(cashIn - cashOut + (viList.find(v => v.loai === 'tien_mat') ? 0 : 0))} → MB Bank</div>
        </div>
      </div>
    )
  }

  if (soDuTienMat <= 0 && isToday) {
    return (
      <div style={{ background: '#FFF8F0', borderRadius: '14px', padding: '14px 16px', border: '1px solid #FED7AA', display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
        <span style={{ fontSize: '20px' }}>💡</span>
        <div>
          <div style={{ fontWeight: '600', fontSize: '13px', color: '#9A3412', fontFamily: LUX.fontSans }}>Hôm nay không có tiền mặt cần nộp</div>
          <div style={{ fontSize: '12px', color: '#B85C38', fontFamily: LUX.fontSans }}>Thu: {formatCurrency(cashIn)} • Chi: {formatCurrency(cashOut)}</div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ background: '#FFFBF0', borderRadius: '14px', padding: '14px 16px', border: '1px solid #FDE68A', marginBottom: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
        <div>
          <div style={{ fontWeight: '700', fontSize: '13px', color: LUX.ink, fontFamily: LUX.fontSans, marginBottom: '2px' }}>
            💵 Tiền Mặt Cần Nộp Vào MB Bank
          </div>
          <div style={{ fontSize: '11px', color: LUX.ink3, fontFamily: LUX.fontSans }}>
            Thu tiền mặt: {formatCurrency(cashIn)} — Chi tiền mặt: {formatCurrency(cashOut)}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontWeight: '800', fontSize: '20px', color: '#1A5276', fontFamily: LUX.fontMono }}>
            {formatCurrency(soDuTienMat)}
          </div>
        </div>
      </div>

      <button
        onClick={handleSubmit}
        disabled={submitting}
        style={{
          width: '100%', padding: '14px', borderRadius: '12px',
          background: submitting ? '#94A3B8' : 'linear-gradient(135deg, #1A5276, #2C7AAD)',
          border: 'none', color: 'white', fontWeight: '700', fontSize: '15px',
          cursor: submitting ? 'not-allowed' : 'pointer',
          fontFamily: LUX.fontSans,
          boxShadow: '0 4px 16px rgba(26,82,118,0.25)',
          opacity: submitting ? 0.7 : 1,
        }}
      >
        {submitting ? '⏳ Đang xử lý...' : `🏦 Nộp ${formatCurrency(soDuTienMat)} Vào MB Bank`}
      </button>

      <div style={{ marginTop: '6px', textAlign: 'center', fontSize: '10px', color: LUX.ink3, fontFamily: LUX.fontSans }}>
        Hệ thống tự tính từ doanh thu & chi phí tiền mặt hôm nay
      </div>
    </div>
  )
}
