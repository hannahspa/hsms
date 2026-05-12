import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabase'
import { LUX } from '../../../constants/lux'
import { formatCurrency, todayISO } from '../../../lib/utils'

export default function NopTienMat({ ngay, user, onDone }) {
  ngay = ngay || todayISO()
  const [viList, setViList] = useState([])
  const [todayDT, setTodayDT] = useState(0)
  const [todayCP, setTodayCP] = useState(0)
  const [yesterdayDeficit, setYesterdayDeficit] = useState(0)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [soDuTienMat, setSoDuTienMat] = useState(0)

  useEffect(() => {
    loadData()
  }, [ngay])

  const loadData = async () => {
    setLoading(true)
    try {
      const yesterday = new Date(ngay)
      yesterday.setDate(yesterday.getDate() - 1)
      const yesterdayISO = yesterday.toISOString().slice(0, 10)

      const [rVi, rDTAll, rCPAll, rCPNullAll, rCKAll, rDTToday, rCPToday, rCPNullToday, rCKToday] = await Promise.all([
        supabase.from('so_du_vi_thuc_te').select('id,ten,loai').order('thu_tu'),
        // Luỹ kế DT tiền mặt đến hôm nay
        supabase.from('doanh_thu').select('so_tien').lte('ngay', ngay).eq('hinh_thuc', 'tien_mat'),
        // Luỹ kế CP tiền mặt đến hôm nay (cả NULL — phòng khi FormChiPhi lỗi)
        supabase.from('chi_phi').select('so_tien').lte('ngay', ngay).or('hinh_thuc_thanh_toan.eq.tien_mat,hinh_thuc_thanh_toan.is.null'),
        // Luỹ kế CP NULL riêng (để hiển thị cảnh báo)
        supabase.from('chi_phi').select('so_tien').lte('ngay', ngay).is_('hinh_thuc_thanh_toan', null),
        // Luỹ kế đã nộp NH đến hôm nay
        supabase.from('chuyen_khoan_noi_bo').select('tu_vi_id,so_tien').lte('ngay', ngay),
        // DT tiền mặt hôm nay
        supabase.from('doanh_thu').select('so_tien').eq('ngay', ngay).eq('hinh_thuc', 'tien_mat'),
        // CP tiền mặt hôm nay (cả NULL)
        supabase.from('chi_phi').select('so_tien').eq('ngay', ngay).or('hinh_thuc_thanh_toan.eq.tien_mat,hinh_thuc_thanh_toan.is.null'),
        // CP NULL hôm nay (để cảnh báo)
        supabase.from('chi_phi').select('so_tien').eq('ngay', ngay).is_('hinh_thuc_thanh_toan', null),
        // Đã nộp hôm nay chưa
        supabase.from('chuyen_khoan_noi_bo').select('tu_vi_id,so_tien').eq('ngay', ngay),
      ])

      setViList(rVi.data || [])

      const cumDT = (rDTAll.data || []).reduce((s, d) => s + (d.so_tien || 0), 0)
      const cumCP = (rCPAll.data || []).reduce((s, d) => s + (d.so_tien || 0), 0)
      const cumCPNull = (rCPNullAll.data || []).reduce((s, d) => s + (d.so_tien || 0), 0)

      const tmVi = (rVi.data || []).find(v => v.loai === 'tien_mat')

      const cumDeposited = (rCKAll.data || [])
        .filter(ck => ck.tu_vi_id === tmVi?.id)
        .reduce((s, ck) => s + (ck.so_tien || 0), 0)

      const dtToday = (rDTToday.data || []).reduce((s, d) => s + (d.so_tien || 0), 0)
      const cpToday = (rCPToday.data || []).reduce((s, d) => s + (d.so_tien || 0), 0)
      const cpNullToday = (rCPNullToday.data || []).reduce((s, d) => s + (d.so_tien || 0), 0)

      const todayDeposited = (rCKToday.data || [])
        .filter(ck => ck.tu_vi_id === tmVi?.id)
        .reduce((s, ck) => s + (ck.so_tien || 0), 0)

      // Lũy kế đến hôm qua
      const cumDT_yesterday = cumDT - dtToday
      const cumCP_yesterday = cumCP - cpToday
      const cumDep_yesterday = cumDeposited - todayDeposited
      const yesterdayBalance = cumDT_yesterday - cumCP_yesterday - cumDep_yesterday

      setTodayDT(dtToday)
      setTodayCP(cpToday)
      setYesterdayDeficit(yesterdayBalance < 0 ? -yesterdayBalance : 0)
      setSoDuTienMat(yesterdayBalance + dtToday - cpToday)
      setDone(todayDeposited > 0)
      if (cpNullToday > 0 && !todayDeposited) {
        alert('Cảnh báo: Có ' + cpNullToday.toLocaleString('vi-VN') + 'đ chi phí chưa phân loại nguồn tiền. Vui lòng vào Chi Phí để sửa lại.')
      }
    } catch (e) {
      console.error('NopTienMat load error:', e)
    } finally {
      setLoading(false)
    }
  }
  const tienMatVi = viList.find(v => v.loai === 'tien_mat')
  const mbVi = viList.find(v => v.loai === 'chuyen_khoan')

  const handleSubmit = async () => {
    if (soDuTienMat <= 0) return
    const confirmMsg = `Xác nhận nộp ${formatCurrency(soDuTienMat)} vào MB Bank?`
    if (!window.confirm(confirmMsg)) return

    setSubmitting(true)
    try {
      const dienGiai = `Nộp tiền mặt ngày ${ngay.split('-').reverse().join('/')} (Thu ${(todayDT || 0).toLocaleString('vi-VN')} - Chi ${(todayCP || 0).toLocaleString('vi-VN')}${yesterdayDeficit > 0 ? ' - Am ' + yesterdayDeficit.toLocaleString('vi-VN') : ''} = ${soDuTienMat.toLocaleString('vi-VN')})`
      const { error } = await supabase.from('chuyen_khoan_noi_bo').insert({
        ngay,
        tu_vi_id: tienMatVi?.id,
        den_vi_id: mbVi?.id,
        so_tien: soDuTienMat,
        dien_giai: dienGiai,
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
          <div style={{ fontSize: '12px', color: '#4A8A5F', fontFamily: LUX.fontSans }}>{formatCurrency(soDuTienMat)} → MB Bank</div>
        </div>
      </div>
    )
  }

  if (soDuTienMat <= 0) {
    return (
      <div style={{ background: '#FFF8F0', borderRadius: '14px', padding: '14px 16px', border: '1px solid #FED7AA', display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
        <span style={{ fontSize: '20px' }}>💡</span>
        <div>
          <div style={{ fontWeight: '600', fontSize: '13px', color: '#9A3412', fontFamily: LUX.fontSans }}>Không có tiền mặt cần nộp</div>
          <div style={{ fontSize: '12px', color: '#B85C38', fontFamily: LUX.fontSans }}>
            Tổng Thu TM: {formatCurrency(todayDT)} — Tổng Chi TM: {formatCurrency(todayCP)}{yesterdayDeficit > 0 ? ' — Âm hôm qua: ' + formatCurrency(yesterdayDeficit) : ''}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ background: '#FFFBF0', borderRadius: '14px', padding: '14px 16px', border: '1px solid #FDE68A', marginBottom: '12px' }}>
      <div style={{ marginBottom: '10px' }}>
        <div style={{ fontWeight: '700', fontSize: '14px', color: LUX.ink, fontFamily: LUX.fontSans, marginBottom: '6px' }}>
          💵 Tiền Mặt Cần Nộp Vào MB Bank
        </div>
        <div style={{ fontSize: '13px', color: LUX.ink2, fontFamily: LUX.fontSans, lineHeight: '1.6' }}>
          <div>Tổng Thu TM: <span style={{ fontWeight: '600' }}>{formatCurrency(todayDT)}</span></div>
          <div>Tổng Chi TM: <span style={{ fontWeight: '600' }}>{formatCurrency(todayCP)}</span></div>
          {yesterdayDeficit > 0 && (
            <div style={{ color: '#C0392B' }}>Âm hôm qua: <span style={{ fontWeight: '600' }}>-{formatCurrency(yesterdayDeficit)}</span></div>
          )}
          <div style={{ borderTop: '1px solid ' + LUX.line, marginTop: '4px', paddingTop: '4px', fontWeight: '700', color: '#1A5276' }}>
            = Số tiền cần nộp: <span style={{ fontSize: '16px' }}>{formatCurrency(soDuTienMat)}</span>
          </div>
        </div>
      </div>

      <button
        onClick={handleSubmit}
        disabled={submitting}
        style={{
          width: '100%', padding: '16px', borderRadius: '12px',
          background: submitting ? '#94A3B8' : 'linear-gradient(135deg, #1A5276, #2C7AAD)',
          border: 'none', color: 'white', fontWeight: '700', fontSize: '16px',
          cursor: submitting ? 'not-allowed' : 'pointer',
          fontFamily: LUX.fontSans,
          boxShadow: '0 4px 16px rgba(26,82,118,0.25)',
          opacity: submitting ? 0.7 : 1,
        }}
      >
        {submitting ? '⏳ Đang xử lý...' : '🏦 Nộp ' + formatCurrency(soDuTienMat) + ' Vào MB Bank'}
      </button>
    </div>
  )
}
