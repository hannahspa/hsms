import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabase'
import { COLORS } from '../../../constants/colors'

function fmt(n) {
  if (!n && n !== 0) return '—'
  return new Intl.NumberFormat('vi-VN').format(Math.round(n)) + '₫'
}
function fmtDate(d) {
  if (!d) return ''
  const [y, m, day] = d.split('-')
  return `${day}/${m}/${y}`
}
function daysBetween(a, b) {
  return Math.max(1, Math.round((new Date(b) - new Date(a)) / 86400000))
}
function shiftDate(d, days) {
  const dt = new Date(d)
  dt.setDate(dt.getDate() + days)
  return dt.toISOString().slice(0, 10)
}

// ── Phân tích 1 đợt KM ────────────────────────────────────────────────────────
function KMAnalytics({ km }) {
  const [data, setData]     = useState(null)
  const [loading, setLoading] = useState(false)
  const [open, setOpen]     = useState(false)

  const load = async () => {
    if (data) return
    setLoading(true)
    const days = daysBetween(km.ngay_bat_dau, km.ngay_ket_thuc)
    const prevStart = shiftDate(km.ngay_bat_dau, -days)
    const prevEnd   = shiftDate(km.ngay_bat_dau, -1)

    // Doanh thu trong đợt KM
    const [rDT, rDTPrev, rCP] = await Promise.all([
      supabase.from('doanh_thu').select('so_tien, hinh_thuc')
        .gte('ngay', km.ngay_bat_dau).lte('ngay', km.ngay_ket_thuc),
      supabase.from('doanh_thu').select('so_tien, hinh_thuc')
        .gte('ngay', prevStart).lte('ngay', prevEnd),
      // Chi phí marketing trong đợt (dùng danh_muc_chi_phi join)
      supabase.from('chi_phi').select('so_tien, danh_muc:danh_muc_chi_phi(ten, nhom_cha:danh_muc_chi_phi(ten))')
        .gte('ngay', km.ngay_bat_dau).lte('ngay', km.ngay_ket_thuc),
    ])

    const sumDT = (rows) => (rows || [])
      .filter(r => r.hinh_thuc !== 'the_tra_truoc')
      .reduce((s, r) => s + (r.so_tien || 0), 0)

    const marketing = (rCP.data || []).filter(r => {
      const nhom = r.danh_muc?.nhom_cha?.ten || r.danh_muc?.ten || ''
      return nhom.toLowerCase().includes('marketing')
    }).reduce((s, r) => s + (r.so_tien || 0), 0)

    const dt      = sumDT(rDT.data)
    const dtPrev  = sumDT(rDTPrev.data)
    const change  = dtPrev > 0 ? ((dt - dtPrev) / dtPrev * 100) : null
    const roi     = marketing > 0 ? ((dt - marketing) / marketing * 100) : null

    setData({ dt, dtPrev, marketing, change, roi, days, prevStart, prevEnd })
    setLoading(false)
  }

  const toggle = () => { if (!open) load(); setOpen(o => !o) }

  return (
    <div style={{ background: 'white', borderRadius: '14px', border: `1px solid ${COLORS.border}`,
      boxShadow: COLORS.shadow, overflow: 'hidden' }}>

      {/* Header */}
      <button onClick={toggle}
        style={{ width: '100%', padding: '16px 20px', background: 'none', border: 'none',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
        <div style={{ textAlign: 'left' }}>
          <div style={{ fontWeight: '800', fontSize: '14px', color: COLORS.text }}>{km.ten}</div>
          <div style={{ fontSize: '12px', color: COLORS.textMute, marginTop: '2px' }}>
            📅 {fmtDate(km.ngay_bat_dau)} → {fmtDate(km.ngay_ket_thuc)}
            &nbsp;·&nbsp; -{Math.round(km.phan_tram_giam)}% &nbsp;·&nbsp; {fmt(km.gia_goc)} → {fmt(km.gia_km)}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          <span style={{ background: km.trang_thai === 'active' ? '#E8F5E9' : '#F0E9E0',
            color: km.trang_thai === 'active' ? '#2D7A4F' : COLORS.textMute,
            padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '700' }}>
            {km.trang_thai === 'active' ? '✅ Đang chạy' : km.trang_thai === 'draft' ? '⏸ Nháp' : '⏹ Hết hạn'}
          </span>
          <span style={{ color: COLORS.textMute, fontSize: '18px', transition: 'transform .2s',
            transform: open ? 'rotate(90deg)' : 'none' }}>›</span>
        </div>
      </button>

      {/* Analytics */}
      {open && (
        <div style={{ borderTop: `1px solid ${COLORS.border}`, padding: '16px 20px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '20px', color: COLORS.textMute }}>Đang phân tích...</div>
          ) : data && (
            <>
              {/* Kỳ so sánh */}
              <div style={{ fontSize: '12px', color: COLORS.textMute, marginBottom: '12px', background: COLORS.bg,
                padding: '8px 12px', borderRadius: '8px' }}>
                📊 Kỳ đợt KM: <strong>{fmtDate(km.ngay_bat_dau)} – {fmtDate(km.ngay_ket_thuc)}</strong>
                &nbsp;({data.days} ngày)
                &nbsp;·&nbsp; Kỳ trước: {fmtDate(data.prevStart)} – {fmtDate(data.prevEnd)}
              </div>

              {/* 4 KPI cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginBottom: '12px' }}>
                {[
                  {
                    label: 'Doanh Thu Kỳ KM',
                    val: fmt(data.dt),
                    sub: `Kỳ trước: ${fmt(data.dtPrev)}`,
                    color: COLORS.primary,
                    icon: '💰',
                  },
                  {
                    label: 'Tăng Trưởng DT',
                    val: data.change !== null
                      ? `${data.change >= 0 ? '+' : ''}${data.change.toFixed(1)}%`
                      : 'Không có dữ liệu kỳ trước',
                    sub: data.change !== null
                      ? (data.change >= 0 ? '▲ Tốt hơn kỳ trước' : '▼ Thấp hơn kỳ trước')
                      : '',
                    color: data.change === null ? COLORS.textMute : data.change >= 0 ? '#2D7A4F' : '#C0392B',
                    icon: data.change === null ? '📊' : data.change >= 0 ? '📈' : '📉',
                  },
                  {
                    label: 'Chi Phí Marketing',
                    val: fmt(data.marketing),
                    sub: data.marketing === 0 ? 'Chưa nhập chi phí marketing kỳ này' : 'Tổng chi marketing cùng kỳ',
                    color: '#6C3483',
                    icon: '📣',
                  },
                  {
                    label: 'ROI Marketing',
                    val: data.roi !== null
                      ? `${data.roi >= 0 ? '+' : ''}${Math.round(data.roi)}%`
                      : 'Chưa có dữ liệu marketing',
                    sub: data.roi !== null
                      ? (data.roi >= 0 ? '🎉 Có lời' : '⚠️ Lỗ marketing')
                      : 'Nhập chi phí marketing để tính ROI',
                    color: data.roi === null ? COLORS.textMute : data.roi >= 0 ? '#2D7A4F' : '#C0392B',
                    icon: data.roi === null ? '🔢' : data.roi >= 100 ? '🚀' : data.roi >= 0 ? '✅' : '❌',
                  },
                ].map(kpi => (
                  <div key={kpi.label} style={{ background: COLORS.bg, borderRadius: '10px',
                    padding: '12px 14px', border: `1px solid ${COLORS.border}` }}>
                    <div style={{ fontSize: '11px', color: COLORS.textMute, marginBottom: '4px' }}>
                      {kpi.icon} {kpi.label}
                    </div>
                    <div style={{ fontWeight: '800', fontSize: '17px', color: kpi.color }}>{kpi.val}</div>
                    <div style={{ fontSize: '11px', color: COLORS.textMute, marginTop: '3px' }}>{kpi.sub}</div>
                  </div>
                ))}
              </div>

              {/* Hướng dẫn */}
              <div style={{ fontSize: '12px', color: COLORS.textMute, padding: '8px 12px',
                background: '#FFF8E1', borderRadius: '8px', border: '1px solid #FFE082' }}>
                💡 ROI = (Doanh thu kỳ KM − Chi phí Marketing) ÷ Chi phí Marketing × 100.
                Doanh thu so sánh: bỏ Thẻ Trả Trước. Nhập chi phí Facebook/Zalo/TikTok vào tab Thu Chi để ROI chính xác.
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ── ROI Tab (danh sách tất cả KM để phân tích) ────────────────────────────────
export default function ROITab({ list }) {
  const sorted = [...list].sort((a, b) => b.ngay_bat_dau.localeCompare(a.ngay_bat_dau))

  if (sorted.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '48px 20px', color: COLORS.textMute }}>
        <div style={{ fontSize: '40px', marginBottom: '12px' }}>📊</div>
        <div style={{ fontWeight: '700', fontSize: '15px' }}>Chưa có khuyến mãi nào</div>
        <div style={{ fontSize: '13px', marginTop: '6px' }}>
          Tạo khuyến mãi trong tab Danh Sách rồi quay lại đây để xem phân tích
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <div style={{ fontSize: '13px', color: COLORS.textMute, marginBottom: '4px' }}>
        Click vào từng đợt để xem phân tích doanh thu & ROI marketing
      </div>
      {sorted.map(km => <KMAnalytics key={km.id} km={km} />)}
    </div>
  )
}
